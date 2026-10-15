const escapeCalendarText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");

// Fold by UTF-8 octets, keeping code points intact and counting the continuation space.
const foldCalendarLine = (line: string): string => {
  const encoder = new TextEncoder();
  let result = "";
  let octets = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (octets + size > 75) {
      result += "\r\n ";
      octets = 1;
    }
    result += character;
    octets += size;
  }
  return result;
};

interface CalendarTimelineItem {
  readonly time: string;
  readonly title: string;
}

const createWeddingCalendar = (timeline: readonly CalendarTimelineItem[], now = new Date()): string => {
  const description = timeline.map(({ time, title }) => `${time} — ${title}`).join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kevin and Cherelynn//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:kevin-cherelynn-wedding-20270904@cherelynnandkevin.com",
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    // Australia/Sydney is UTC+10 on 4 September 2027 (before daylight saving).
    "DTSTART:20270904T033000Z",
    "DTEND:20270904T103000Z",
    `SUMMARY:${escapeCalendarText("Kevin & Cherelynn’s Wedding")}`,
    `LOCATION:${escapeCalendarText("Ravensthorpe Estate")}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    "URL:https://ravensthorpe.com.au/",
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(foldCalendarLine).join("\r\n") + "\r\n";
};

const downloadWeddingCalendar = (timeline: readonly CalendarTimelineItem[]): void => {
  const url = URL.createObjectURL(new Blob([createWeddingCalendar(timeline)], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "kevin-and-cherelynn-wedding.ics";
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Allow the browser to consume the download before releasing its backing data.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
};

export { createWeddingCalendar, downloadWeddingCalendar };
