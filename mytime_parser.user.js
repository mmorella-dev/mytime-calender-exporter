// ==UserScript==
// @name        Target myTime schedule parser
// @description Generates Calendar files from Target's schedule app
// @namespace   Violentmonkey Scripts
// @match       https://mytime.target.com/schedule
// @grant       GM_registerMenuCommand
// @version     1.0
// @author      -
// @require https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @require https://raw.githubusercontent.com/nwcell/ics.js/master/ics.deps.min.js
// ==/UserScript==

const allShifts = new Map();

// scan the current week of shifts.
const scanSchedule = () => {
  for (let i = 0; i < 7; i++) {
    const dayEl = document.getElementById(`${i}`); // there's a numeric ID for each day of the week. weird but helpful.
    if (!dayEl) {
      break;
    }
    const dayLabel = dayEl.getAttribute("aria-label");
    // scan for children with shifts
    const shiftEls = dayEl.querySelectorAll(`a[aria-label*="shift from"]`);
    for (const shiftEl of shiftEls) {
      const shiftLabel = shiftEl.getAttribute("aria-label");
      if (!allShifts.has(shiftLabel)) {
        const shift = parseShift(dayLabel, shiftLabel);
        allShifts.set(shiftLabel, shift);
      }
    }
  }
};

const parseShift = (dayLabel, shiftLabel) => {
  const date = parseDayLabel(dayLabel);
  const { job, start, end, naiveDate, location } = parseShiftLabel(shiftLabel);
  const startDate = formatDateTime(date, start);
  const endDate = formatDateTime(date, end);
  return { job, location, startDate, endDate, naiveDate };
}

// first param is the result of
// date: [y, m, d];
// time: "05:00PM"
const formatDateTime = (date, time) => {
  const [hours, mins] = parseTime(time);
  const [year, month, day] = date;
  return new Date(year, month, day, hours, mins);
}

const parseDayLabel = (label) => {
  // takes the aria-label from a given day, and parses it into components for the Date constructor
  const LABEL_REGEX = /^schedule for (?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
  const { year, month, day } = LABEL_REGEX.exec(label)?.groups; // YYYY-MM-DD
  return [
    parseInt(year),
    parseInt(month) - 1, // months are 0-indexed
    parseInt(day)
  ];
}

const parseTime = (time) => {
  var parts = time.split(":");
  var hour = parseInt(parts[0]);
  var minute = parseInt(parts[1]);
  // Adjust the hour if it's in the afternoon (PM)
  if (parts[1].includes("PM") && hour < 12) {
    hour += 12;
  }
  return [hour, minute];
}

const parseShiftLabel = (label) => {
  // This is gonna break if Target modifies the frontend. Should probably build a more lenient parser.
  // (JOB) shift from (HH:MMAM) to (HH:MMPM) to
  const LABEL_REGEX = /^(?<job>\w+) shift from (?<start>\d{2}:\d{2}.{2}) to (?<end>\d{2}:\d{2}.{2}) at location (?<location>\d+?) on (?<naiveDate>.*)\. Click to view daily view/;
  return LABEL_REGEX.exec(label)?.groups;
}

let currentDay0 = document.getElementById("0");
let currentCount = allShifts.size;

// Watch for changes
const disconnect = VM.observe(document.querySelector('#root'), () => {
  // check that the week has been replaced
  if (currentDay0 != document.getElementById("0")) {
    currentDay0 = document.getElementById("0");
    scanSchedule();
    if (currentCount != allShifts.size) {
      currentCount = allShifts.size;
      setTimeout(promptICSFile); // do prompt in a timeout so it doesn't block rendering
    }
  }
});

const makeICSFile = (shifts) => {
  if (!shifts || shifts.length == 0) {
    window.alert("No shifts found for this week. Maybe a parse error?");
    return;
  }
  const cal = ics();
  let lastDate;
  for (const s of shifts) {
    lastDate = s.naiveDate;
    cal.addEvent(`${s.job} shift`, ``, `Target #${s.location}`, s.startDate, s.endDate);
  }
  cal.download(`Target Shifts as of ${lastDate}`);
  // alert("Not implemented yet!");
}

const promptICSFile = () => {
    if (!window.confirm(`Download ICS file for ${allShifts.size} shifts?`)) {
      return;
    }
    makeICSFile(allShifts.values());
}

const cmdID = GM_registerMenuCommand("Export ICS file", promptICSFile);

scanSchedule();
