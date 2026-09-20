/**
 * A value that took effect on a given date and stayed in effect until the next
 * entry supersedes it.
 *
 * Exchanges change their rules over time — NYSE opened at 10:00 until 1985 and
 * traded on Saturdays until 1952 — so a calendar that claims to cover history
 * has to resolve those properties per date rather than hold one fixed value.
 */
export interface Dated<T> {
  /** ISO date (YYYY-MM-DD) the value took effect; null means from the start. */
  from: string | null
  value: T
}

/** Order key for an effective date; null sorts before every real date. */
const rank = (from: string | null): string => from ?? ''

/**
 * Resolve the value in effect on a date.
 *
 * Entries may be given in any order; the latest one that has taken effect by
 * `isoDate` wins.
 *
 * @param history - Dated entries for a single property
 * @param isoDate - The date to resolve, as YYYY-MM-DD
 * @returns The value in effect, or undefined if none had taken effect yet
 */
export function valueOn<T>(
  history: Dated<T>[],
  isoDate: string,
): T | undefined {
  let current: Dated<T> | undefined

  for (const entry of history) {
    if (entry.from !== null && entry.from > isoDate) continue
    if (!current || rank(entry.from) >= rank(current.from)) current = entry
  }

  return current?.value
}

/**
 * The most recent value in a history, i.e. the one in effect today.
 *
 * @param history - Dated entries for a single property
 * @returns The latest value, or undefined if the history is empty
 */
export function latestValue<T>(history: Dated<T>[]): T | undefined {
  let current: Dated<T> | undefined

  for (const entry of history) {
    if (!current || rank(entry.from) >= rank(current.from)) current = entry
  }

  return current?.value
}
