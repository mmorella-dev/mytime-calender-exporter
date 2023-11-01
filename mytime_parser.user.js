// ==UserScript==
// @name        Target myTime schedule parser
// @description Generates Calendar files from Target's schedule app
// @namespace   Violentmonkey Scripts
// @match       https://mytime.target.com/*
// @grant       GM.registerMenuCommand
// @grant       GM.unregisterMenuCommand
// @version     1.1
// @author      -
// @require https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @require https://raw.githubusercontent.com/zachbornheimer/ics.js/zachbornheimer-uid-manipulation/ics.js
// ==/UserScript==



//////////////////////////
// USER INTERFACE
//////////////////////////

const promptICSFile = () => {
  try {
    // parse the week
    let shifts = getWeekSchedule();
    if (shifts.length <= 0) {
      return; // fail silently
    }
    const message = `Download ICS file for ${shifts.length} shifts?`;
    const shiftList = shifts
      .map((s) => ` • ${s.displayDate} at ${s.displayTime}`)
      .join("\n");
    if (!window.confirm(`${message}\n\n${shiftList}`)) {
      return;
    }
    const filename = `Target Shifts week of ${shifts[0]?.displayDate}`;
    makeICSFile(filename, shifts);
  } catch (e) {
    console.error(e);
    alert(e);
  }
};

// Observe changes to the DOM and enable or disable the command
const observeChanges = () => {
  const rootEl = document.querySelector("#root");
  if (!rootEl) {
    throw new Error("#root is undefined");
  }
  const callback = (mutations) => {
    // check if the change was to replace the week view
    // (avoids duplicate prompts)
    if (
      mutations.some((r) =>
        [...r.addedNodes.values()].map(e => e.id).includes("scrollableContainer")
      && document.getElementById("0")
        )
    ) {
      setTimeout(promptICSFile); // invoke in a closure so we don't block render
    }
  };
  const observer = new MutationObserver(callback);
  const observerOptions = {
    subtree: true,
    childList: true,
  };
  observer.observe(rootEl, observerOptions);
};

observeChanges();

/** @typedef {{ job: string, location: string, startDate: Date, endDate: Date, displayDate: string, displayTime: string }} Shift */
/** @typedef {[year: number, monthIndex: number, day: number ]} DateComponents */
/** @typedef {[hour: number, minute: number ]} TimeComponents */

/**
 * @returns {Shift[]}
 */
const getWeekSchedule = () => {
  const shifts = [];
  for (let i = 0; i < 7; i++) {
    // there's a numeric ID for each day of the week. weird but helpful.
    /** <div id="0" aria-label="schedule for 2023-12-31 with 1 shifts"> */
    const scheduleEl = document.getElementById(`${i}`);
    if (scheduleEl === null) {
      throw new Error(
        "No schedule elements found. Make sure you're on the weekly view!"
      );
    }
    const scheduleLabel = scheduleEl.getAttribute("aria-label") ?? "!";
    // <a aria-label="Tech shift from 05:00PM to 10:00PM on Monday October 12. Click to view daily view">
    const shiftEls = scheduleEl.querySelectorAll(`a[aria-label*="shift from"]`);
    for (const shiftEl of shiftEls) {
      const shiftLabel = shiftEl.getAttribute("aria-label") ?? "!";
      const shift = parseShift(scheduleLabel, shiftLabel);
      shifts.push(shift);
    }
  }
  return shifts;
};

/**
 * @param {string} scheduleLabel aria-label
 * @param {string} shiftLabel aria-label
 * @returns {Shift} */
const parseShift = (scheduleLabel, shiftLabel) => {
  const date = parseDate(scheduleLabel);
  const { job, startTime, endTime, displayDate, location, displayTime } =
    parseShiftLabel(shiftLabel);
  const startDate = new Date(...date, ...startTime);
  const endDate = new Date(...date, ...endTime);
  if (!startDate.valueOf() || !endDate.valueOf()) {
    console.error([...date, ...startTime]);
    console.error([...date, ...endTime]);
    throw new Error(`Error parsing dates.`);
  }
  return { job, location, startDate, endDate, displayDate, displayTime };
};

/**
 * @param {string} label string containing a date YYYY-MM-DD
 * @returns {DateComponents} [y, m, d] */
const parseDate = (label) => {
  // takes the aria-label from a given day, and parses it into components for the Date constructor
  const matches = label.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matches?.length !== 4) {
    throw new Error(`Could not parse date from ${label}`);
  }
  const year = parseInt(matches[1]);
  const month = parseInt(matches[2]) - 1;
  const day = parseInt(matches[3]);
  return [year, month, day];
};

/**
 * @param {string} time String of the form "12:34PM"
 * @returns {TimeComponents} 24 hour time components */
const parseTime = (time) => {
  const parts = time.match(/(\d{2}):(\d{2})(AM|PM)/);
  if (parts?.length !== 4) {
    throw new Error(`Could not parse ${time} as time.`);
  }
  const hour = parseInt(parts[1]);
  const minute = parseInt(parts[2]);
  const isPM = parts[3] === "PM";
  // convert to 24hrs
  const hour24 = isPM && hour < 12 ? hour + 12 : hour;
  return [hour24, minute];
};

/**
 * @param {string} label aria-label value of the form "Tech shift from 05:00PM to 10:00PM on Monday October 12. Click to view daily view"
 */
const parseShiftLabel = (label) => {
  const SHIFT_LABEL_REGEX =
    /^(.+) shift from (.+) to (.+) at location (.+) on (.+)\. Click to view daily view/;
  const matches = label.match(SHIFT_LABEL_REGEX);
  if (matches?.length !== 6) {
    console.error(matches);
    throw new Error(`Couldn't parse shift info from \`${label}\``);
  }
  const [, job, start, end, location, displayDate] = matches;
  const displayTime = `${start}–${end}`;
  const startTime = parseTime(start);
  const endTime = parseTime(end);
  return { job, location, startTime, endTime, displayDate, displayTime };
};

///////////////////////////////////////////////////////////////////
// ICS file creation
///////////////////////////////////////////////////////////////////

/** @param {Shift[]} shifts
 * @param {string} filename The name of the ICS file to output (no suffix)
 */
const makeICSFile = (filename, shifts) => {
  if (!shifts?.length) {
    throw new Error("No shifts found for this week. Maybe a parse error?");
  }
  let weekStart = shifts[0]?.displayDate;
  // generate a hash for the given week and use it as the UID.
  // annoying hack to circumvent the ICS library's weird UID generation
  const uidDomain = getUIDDomain(shifts);
  // @ts-ignore
  const calendar = ics(uidDomain);
  for (const s of shifts) {
    calendar.addEvent(
      `${s.job} shift`,
      ``,
      `Target #${s.location}`,
      s.startDate,
      s.endDate
    );
  }
  console.debug(calendar);
  calendar.download(filename);
};

/**
 * Returns a hash code from a string
 * @param  {String} str The string to hash.
 * @return {Number}    A 32bit integer
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
const hashCode = (str) => {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

/**
 * Returns a consistent hash for a whole week of shifts.
 * If any shift changes, this will produce a new, unique set of shifts.
 */
const getUIDDomain = (shifts) => {
  let obj = shifts.map((o) => JSON.stringify(o)).join(',');
  return hashCode(obj);
};