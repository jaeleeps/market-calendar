# market-calendar

Exchange trading calendars for JavaScript: sessions, holidays, early closes and
bar timestamps for 36 markets.

A JavaScript port of
[`pandas_market_calendars`](https://github.com/rsheftel/pandas_market_calendars)
by [Ryan Sheftel](https://github.com/rsheftel). The exchange data and the
behaviour are that project's work; see
[Credits](#credits-and-attribution).

```bash
npm install market-calendar
```

## Usage

```ts
import { getCalendar } from 'market-calendar'

const nyse = getCalendar('NYSE')

nyse.validDays('2024-07-01', '2024-07-08')
// the trading days, with Independence Day and the weekend left out

nyse.schedule('2024-07-03', '2024-07-03')
// [{ date, pre: 04:00, market_open: 09:30, market_close: 13:00, post: 17:00 }]
//   the half-day before Independence Day, and its shortened post session

nyse.openAtTime(
  DateTime.fromISO('2024-07-03T15:00', { zone: 'America/New_York' }),
)
// true — regular hours have ended but the post session runs to 17:00
```

### Bar timestamps

```ts
import { dateRange, dateRangeHTF } from 'market-calendar'

dateRange(nyse.schedule('2024-07-01', '2024-07-01'), '1h', { closed: 'left' })
// 09:30  10:30  11:30  12:30  13:30  14:30  15:30

dateRangeHTF(nyse.validDays('2024-01-01', '2024-12-31'), 'ME')
// the last trading day of each month, which is rarely the last of the month
```

### Early closes and late opens

```ts
const year = nyse.schedule('2024-01-01', '2024-12-31')
nyse.earlyCloses(year).map((d) => d.date.toISODate())
// ['2024-07-03', '2024-11-29', '2024-12-24']
```

## Calendars

Thirty-six calendars, 152 names. `calendarNames()` lists them all.

| Region       | Exchanges                                                                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Americas     | NYSE, IEX, CFE, CBOE equity and index options, CME equity / bond / agriculture / trade dates, CME Globex equities / fixed income / FX / energy and metals / crypto / livestock / grains, ICE, SIFMA US, TSX, BMF |
| EMEA         | LSE, EUREX, EUREX pre/post, EUREX bond, SIX, OSE, SIFMA UK, TASE                                                                                                                                                 |
| Asia Pacific | JPX, HKEX, SSE, ASX, BSE, NSE, SIFMA JP                                                                                                                                                                          |
| Other        | FOREX                                                                                                                                                                                                            |

Exchanges answer to their aliases too, so `NASDAQ`, `DOW` and `BATS` all reach
the NYSE calendar, and `CL`, `NG` and `GC` reach CME Globex energy and metals.

## History

Calendars carry their own history rather than only their current rules. NYSE
opened at 10:00 until 1985 and traded on Saturdays until 1952; CME's equity
session moved twice; JPX moved its close in November 2024. Ask for a schedule
in 1970 and you get 1970's hours.

## Credits and attribution

This library is a JavaScript port of
**[`pandas_market_calendars`](https://github.com/rsheftel/pandas_market_calendars)**,
created and maintained by **[Ryan Sheftel](https://github.com/rsheftel)** and
its contributors, and released under the MIT License.

Nearly everything of substance here originates in that project. Its exchange
rules, holiday data and the semantics of the schedule and date-range functions
were followed deliberately and closely, so that answers agree with it. Where
this port departs — a renamed function, a generalised structure, a rule
corrected — the reason is recorded in the [changelog](CHANGELOG.md) and in the
code.

`pandas_market_calendars` itself builds on earlier work by Quantopian, and some
of its calendars carry that lineage.

This project is an independent port. It is not affiliated with, endorsed by, or
supported by the authors of `pandas_market_calendars`; please raise issues with
this port here rather than with them.

Both projects are MIT licensed. See [LICENSE](LICENSE) for this one, and the
upstream repository for theirs.
