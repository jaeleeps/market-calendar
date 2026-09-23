# Changelog

## 1.1.1

Package metadata only; the library is unchanged from 1.1.0.

- Keywords that match what people search for — trading hours, market
  holidays, early closes, trading days, backtesting, the exchanges covered
  outside the US, and the Python package this ports — in place of generic
  terms that indexed the package alongside calendar widgets
- An `author`, which the npm page had been showing blank

## 1.1.0

The first release with a working library. Version 1.0.0 was a placeholder that
exported a single `add(a, b)` function.

A JavaScript port of
[`pandas_market_calendars`](https://github.com/rsheftel/pandas_market_calendars)
by Ryan Sheftel, carrying over its exchange calendars and its behaviour.

### Exchanges

Thirty-six calendars answering to 152 names, each checked against the
exchange's published holiday list:

- **Americas** — NYSE, IEX, CBOE (futures and both options markets), CME
  (equity, bond, agriculture, trade dates), CME Globex (equities, fixed
  income, FX, energy and metals, crypto, livestock, grains), ICE, SIFMA US,
  TSX, B3
- **Europe, Middle East and Africa** — LSE, EUREX (and its pre/post and fixed
  income variants), SIX, OSE, SIFMA UK, TASE
- **Asia Pacific** — JPX, HKEX, SSE, ASX, BSE, NSE, SIFMA JP
- **Other** — FOREX

### Sessions and schedules

- `schedule()` with per-day market times, a timezone, a choice of columns, and
  control over how special times apply
- Market times that change over an exchange's history, that sit off the
  session date, or that have been discontinued
- Lunch breaks, pre and post sessions, special opens and closes on any column
- Trading halts
- A weekmask that changes over time, for the Saturdays NYSE traded until 1952
  and the Sunday-to-Thursday week TASE keeps
- `openAtTime`, `isOpenNow`, `earlyCloses`, `lateOpens`, `isDifferent`,
  `openTime`/`closeTime`/`breakStart`/`breakEnd` and their `...On(date)` forms

### Bar timestamps

- `dateRange()` — interpolates a schedule at any frequency below a day, across
  RTH, ETH, pre, post, break and the gaps between sessions, with `closed`,
  `forceClose`, `mergeAdjacent`, `start`, `end` and `periods`
- `dateRangeHTF()` — one trading day per week, month, quarter or year, with
  anchors for fiscal periods
- `markSession()`, `mergeSchedules()`, `convertFreq()`
- Warnings for missing, disappearing and overlapping sessions, and for a
  schedule too short for what was asked; filterable by class

### Differences from the Python package

Some things are reachable under a different shape:

- `calendar_names()` and `factory()` are `calendarNames()` and `getCalendar()`,
  exported from the package rather than as statics on the calendar.
- `special_opens` and `special_closes` are one `specialTimes` map keyed by the
  market time they override, so any column can have them, not only the open
  and the close.
- `date_range_htf()` is `dateRangeHTF()`, a function taking trading days, to
  match how `dateRange()` takes a schedule.
- `interruptions_df` is the `interruptions` option on `schedule()`.
- `mirror.py` is not ported: it wraps the `exchange_calendars` Python package
  at runtime and has no JavaScript equivalent.

Not ported: `is_custom`/`has_custom`, `sources`, `clean_dates`, `days_at_time`,
`get_offset`, `get_special_times`, `special_dates`.

### Known gaps

- CME Globex FX special closes stop at 2022, as they do upstream, which marks
  the years after that as unknown.

## 1.0.0

Placeholder release.
