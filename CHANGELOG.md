# Changelog

## 2.0.0

The first real release. Version 1.0.0 was a placeholder that exported a single
`add(a, b)` function, so nothing here can break an existing user — but the
package surface is entirely different, which is why this is a major version.

A JavaScript port of
[`pandas_market_calendars`](https://github.com/rsheftel/pandas_market_calendars),
with API parity and every one of its exchange calendars.

### Exchanges

Thirty-six calendars answering to 152 names, each verified against the
published holiday lists of the exchange:

- **Americas** — NYSE, IEX, CBOE (futures and both options markets), CME
  (equity, bond, agriculture, trade dates), CME Globex (equities, fixed
  income, FX, energy and metals, crypto, livestock, grains), ICE, SIFMA US,
  TSX, B3
- **Europe, Middle East and Africa** — LSE, EUREX (and its pre/post and fixed
  income variants), SIX, OSE, SIFMA UK, TASE
- **Asia Pacific** — JPX, HKEX, SSE, ASX, BSE, NSE, SIFMA JP
- **Other** — FOREX

### Sessions and schedules

- `MarketCalendar.schedule()` with per-day market times, a `tz`, a choice of
  columns, and control over how special times apply
- Market times that change over an exchange's history, that sit off the
  session date (a session opening the evening before), or that have been
  discontinued
- Lunch breaks, pre and post sessions, special opens and closes on any column
- Trading halts
- A weekmask that changes over time, for the Saturdays NYSE traded until 1952
  and the Sunday-to-Thursday week TASE keeps
- `openAtTime`, `isOpenNow`, `earlyCloses`, `lateOpens`, `isDifferent`

### Bar timestamps

- `dateRange()` — interpolates a schedule at any frequency below a day, across
  RTH, ETH, pre, post, break and the gaps between sessions, with `closed`,
  `forceClose`, `mergeAdjacent`, `start`, `end` and `periods`
- `dateRangeHTF()` — one trading day per week, month, quarter or year, with
  anchors for fiscal periods
- `markSession()`, `mergeSchedules()`, `convertFreq()`
- Warnings for missing, disappearing and overlapping sessions, and for a
  schedule too short for what was asked; filterable by class

### Known gaps

- CME Globex FX special closes stop at 2022, as they do upstream.
- NYSE Saturday sessions before 1952 exclude the summer shutdowns from 1945.
- The dozens of one-off historical early closes in upstream's NYSE module
  beyond the rule-driven and adhoc groups are not modelled.

## 1.0.0

Placeholder release.
