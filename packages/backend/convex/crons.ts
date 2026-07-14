import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval('expire stale jobs', { hours: 1 }, internal.jobs.watchdog.expireStaleJobs, {});

export default crons;
