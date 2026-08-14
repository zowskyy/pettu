import type { CompanionEngineState, Meters } from './types';
import {
  DAILY_DECAY_ENERGY,
  DAILY_DECAY_FLOOR,
  DAILY_DECAY_JOY,
  DAILY_RESET_HOUR,
} from './types';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function getLocalDateParts(date: Date, timezone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
  };
}

function addDays(year: number, month: number, day: number, delta: number): string {
  const utc = new Date(Date.UTC(year, month - 1, day + delta));
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

/** Returns the YYYY-MM-DD key for the active 4 AM local care period. */
export function getLocalPeriodKey(date: Date, timezone: string): string {
  const { year, month, day, hour } = getLocalDateParts(date, timezone);

  if (hour < DAILY_RESET_HOUR) {
    return addDays(year, month, day, -1);
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}

export function applyDailyDecay(meters: Meters): Meters {
  return {
    joy: Math.max(DAILY_DECAY_FLOOR, meters.joy - DAILY_DECAY_JOY),
    energy: Math.max(DAILY_DECAY_FLOOR, meters.energy - DAILY_DECAY_ENERGY),
    bond: meters.bond,
  };
}

function comparePeriodKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export function countMissedPeriods(
  lastProcessedPeriod: string | null,
  now: Date,
  timezone: string,
): number {
  const currentPeriod = getLocalPeriodKey(now, timezone);

  if (lastProcessedPeriod === null) {
    return 0;
  }

  if (comparePeriodKeys(lastProcessedPeriod, currentPeriod) >= 0) {
    return 0;
  }

  const [lastYear, lastMonth, lastDay] = lastProcessedPeriod.split('-').map(Number);
  const [currentYear, currentMonth, currentDay] = currentPeriod.split('-').map(Number);
  const lastDate = Date.UTC(lastYear, lastMonth - 1, lastDay);
  const currentDate = Date.UTC(currentYear, currentMonth - 1, currentDay);
  const dayDiff = Math.round((currentDate - lastDate) / (24 * 60 * 60 * 1000));

  return Math.max(0, dayDiff);
}

export function applyMissedDailyDecay(
  meters: Meters,
  missedPeriods: number,
): Meters {
  let next = meters;

  for (let index = 0; index < missedPeriods; index += 1) {
    next = applyDailyDecay(next);
  }

  return next;
}

export function processDailyReset(
  state: CompanionEngineState,
  now: Date,
  timezone: string,
): CompanionEngineState {
  const currentPeriod = getLocalPeriodKey(now, timezone);
  const missedPeriods = countMissedPeriods(state.lastProcessedPeriod, now, timezone);

  if (missedPeriods === 0) {
    return state;
  }

  const stats = {
    ...state.stats,
    ...applyMissedDailyDecay(state.stats, missedPeriods),
  };

  const daily =
    state.daily.periodKey === currentPeriod
      ? state.daily
      : {
          periodKey: currentPeriod,
          completedActions: [],
          pawPointsEarnedToday: 0,
        };

  return {
    ...state,
    stats,
    daily,
    lastProcessedPeriod: currentPeriod,
  };
}
