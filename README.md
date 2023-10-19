# myTime Calendar exporter

![Calendar screenshot](https://user-images.githubusercontent.com/4561733/276445296-27d35c11-f49d-46df-8c05-7067836a6c38.png)

If you're a burnt out TM like me, you cannot stand the thought of wasting precious minutes every week manually typing all your shifts into your calendar. It would be much faster to spend 3 hours writing and debugging a program to do it for you. Well, look no further.

This is a [userscript](https://en.wikipedia.org/wiki/Userscript) for Target's myTime portal. It converts your shift schedule to an [ICS file](https://en.wikipedia.org/wiki/ICalendar) containing all your scheduled shifts in a given week, which you can quickly import to your Calendar.

## How to use

You need to be on a **desktop computer** running a modern browser like Chrome, Firefox, or Edge.

1. Install the [ViolentMonkey](https://violentmonkey.github.io/get-it/) browser extension
2. Install [mytime_parser.user.js](https://gist.github.com/morellam-dev/eafe2c23cea634f390c35aeacc92ada5/raw/mytime_parser.user.js)
3. Log into <https://mytime.target.com/schedule>
   * ‼️ You need to be on the **Weekly Schedule** view for it to work. Open the **☰ Sidebar** and then press **Schedule**.
4. Use the left and right arrows at the top to scroll through all the weeks you want to download.
5. Click on TamperMonkey's icon in your browser's toolbar, and then click Export ICS file
6. Import the file to your calendar app of choice.
   * [How to import events to Google Calendar](https://support.google.com/calendar/answer/37118?hl=en&co=GENIE.Platform%3DDesktop)
   * [Import or export calendars on Mac](https://support.apple.com/guide/calendar/import-or-export-calendars-icl1023/mac)

## Safety

### It doesn't work?

I made this for my own benefit, and although I've done the bare minimum to test that it works, it will probably randomly break at some point. If you need help, try posting at [this Reddit thread](https://www.reddit.com/r/Target/comments/17bmpwu/quickly_add_your_shifts_to_your_calendar/)

### Is this a virus?
  
Installing untrusted userscripts can endanger your data, and give hackers control over your browser. I promise that my code isn't malicious, but I'm not responsible for anything that happens as a result of your using it. If you don't trust me (and you're not able to read through my spaghetti code and verify that it's safe), then don't use it.

### Will I get in trouble for using this?

Probably not. It's just reading data from your browser, and doesn't interact with the backend whatsoever.

## Legalese

This project is unaffiliated and unsupported by Target Corporation.

This software is provided as-is, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, or non-infringement.
  
!["Automation" from XKCD](https://imgs.xkcd.com/comics/automation.png)