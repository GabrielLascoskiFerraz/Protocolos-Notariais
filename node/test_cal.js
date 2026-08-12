import { createCalendarService } from "./src/calendar.js";
import { loadConfig } from "./src/config.js";
const config = loadConfig();
const service = createCalendarService(() => config);
service(true).then(res => {
  if (res.events && res.events.length > 0) {
    console.log("EVENTS FOUND:", res.events.length);
    console.log(JSON.stringify(res.events[0], null, 2));
  } else {
    console.log("NO EVENTS:", res);
  }
}).catch(console.error);
