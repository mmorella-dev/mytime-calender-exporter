// ==UserScript==
// @name        Target myTime schedule parser
// @description Generates Calendar files from Target's schedule app
// @namespace   Violentmonkey Scripts
// @match       https://mytime.target.com/*
// @grant       GM_registerMenuCommand
// @version     1.1
// @author      -
// @require https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @require https://raw.githubusercontent.com/nwcell/ics.js/dfec67f37a3c267b3f97dd229c9b6a3521222794/ics.deps.min.js
// ==/UserScript==

/** @typedef {{ job: string, location: string, startDate: Date, endDate: Date, naiveDate: string }} Shift */
/** @typedef {[year: number, monthIndex: number, day: number ]} DateComponents */
/** @typedef {[hour: number, minute: number ]} TimeComponents */

/** The expression used to parse shift labels. This is gonna break if Target modifies the frontend. */
const SHIFT_LABEL_REGEX =
  /^(.+) shift from (.+) to (.+) at location (.+) on (.+)\. Click to view daily view/;

/** @type {Map<string, Shift>} */
const allShifts = new Map();

/** Populates allShifts with values from the DOM */
const scanSchedule = () => {
  for (let i = 0; i < 7; i++) {
    // <div id="0" aria-label="schedule for 2023-12-31 with 1 shifts">
    const scheduleEl = document.getElementById(`${i}`);
    // there's a numeric ID for each day of the week. weird but helpful.
    if (!scheduleEl) {
      break;
    }
    const dayLabel = scheduleEl.getAttribute("aria-label");
    // <a aria-label="Tech shift from 05:00PM to 10:00PM on Monday October 12. Click to view daily view">
    const shiftEls = scheduleEl.querySelectorAll(`a[aria-label*="shift from"]`);
    for (const shiftEl of shiftEls) {
      const shiftLabel = shiftEl.getAttribute("aria-label");
      if (shiftLabel && !allShifts.has(shiftLabel)) {
        // @ts-ignore
        const shift = parseShift(dayLabel, shiftLabel);
        allShifts.set(shiftLabel, shift);
      }
    }
  }
  console.debug(allShifts);
};

/**
 * @param {string} scheduleLabel aria-label
 * @param {string} shiftLabel aria-label
 * @returns {Shift} */
const parseShift = (scheduleLabel, shiftLabel) => {
  const date = parseDate(scheduleLabel);
  const { job, startTime, endTime, naiveDate, location } =
    parseShiftLabel(shiftLabel);
  const startDate = new Date(...date, ...startTime);
  const endDate = new Date(...date, ...endTime);
  if (startDate.toString() === "Invalid Date" || endDate.toString() === "Invalid Date") {
    console.error([...date, ...startTime]);
    console.error([...date, ...endTime]);
    throw new Error(`Error parsing dates`);
  }
  return { job, location, startDate, endDate, naiveDate };
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
 * @returns {{ job: string, location: string, startTime: TimeComponents, endTime: TimeComponents, naiveDate: string }}
 */
const parseShiftLabel = (label) => {
  const matches = label.match(SHIFT_LABEL_REGEX);
  if (matches?.length !== 6) {
    console.error(matches);
    throw new Error(`Couldn't parse shift info from \`${label}\``);
  }
  const [, job, start, end, location, naiveDate ] = matches;
  const startTime = parseTime(start);
  const endTime = parseTime(end);
  return { job, location, startTime, endTime, naiveDate };
};

let currentDay0 = document.getElementById("0");
let currentCount = allShifts.size;

// Watch the DOM for changes
// @ts-ignore
const disconnect = VM.observe(document.querySelector("#root"), () => {
  // check that the week has been replaced
  if (currentDay0 != document.getElementById("0")) {
    currentDay0 = document.getElementById("0");
    try {
      scanSchedule();
    } catch (e) {
      alert(e);
    }
  }
});

/** @param {Iterable<Shift>} shifts */
const makeICSFile = (shifts) => {
  if (!shifts) {
    window.alert("No shifts found for this week. Maybe a parse error?");
    return;
  }
  // @ts-ignore
  const cal = ics();
  let lastDate;
  for (const s of shifts) {
    lastDate = s.naiveDate;
    cal.addEvent(
      `${s.job} shift`,
      ``,
      `Target #${s.location}`,
      s.startDate,
      s.endDate
    );
  }
  cal.download(`Target Shifts as of ${lastDate}`);
  // alert("Not implemented yet!");
};

const promptICSFile = () => {
  if (!window.confirm(`Download ICS file for ${allShifts.size} shifts?`)) {
    return;
  }
  try {
    makeICSFile(allShifts.values());
  } catch (e) {
    alert(e);
  }
};

// @ts-ignore
GM_registerMenuCommand("Export ICS file", promptICSFile);

scanSchedule();
