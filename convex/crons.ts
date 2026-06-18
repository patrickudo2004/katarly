import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Auto-expire borrow assignments and requests every day at midnight UTC
crons.daily(
  "auto-expire-borrows",
  { hourUTC: 0, minuteUTC: 0 },
  api.borrow.autoExpire
);

export default crons;
