# Merlin Serski

## Ship Catalog

Ship definitions for the game are stored in `jsonStorage/shipCatalog.json` and
loaded into the database via `initShipCatalog.js`. After deploying, run:

```
node initShipCatalog.js
```

This will save the `shipCatalog` collection to your Railway database so other
modules can query ship stats. To update ship balance, edit
`shipCatalog.json` and rerun the script.

Game logic should reference ship stats through the catalog using
`dbm.loadCollection('shipCatalog')` rather than duplicating attack, defense,
speed or HP on individual inventory entries.

## Raid Command

The `/raid` command lets players send ships from their personal fleet to attack
one of several predefined targets. Raid target templates live in
`jsonStorage/raidTargets.json` and define enemy power, loot ranges and casualty
scaling. Adjust these numbers to tune difficulty or rewards.

Raid resolution uses `raidUtils.js`, which in turn pulls ship stats from the
shared `shipCatalog` via `shipUtils.loadShipCatalog()`. Tuning constants like
stat weights and roll variance are collected at the top of `raidUtils.js` so
they can be tweaked without touching simulation logic.

After every raid the player's ship inventory is updated with losses, loot is
granted, and a log entry is written to the `raidLog` collection for later
analysis. A short cooldown prevents spamming the command. Session state is kept
in-memory but can be swapped for Redis in production.

## Trade Command

The `/trade` command sends Bridgers and Freighters on regional trade runs for
Gold.

* **Regions** – Sector, Federation Area, and Dominion Area routes offer
  progressively higher earnings.
* **Ships** – Freighters generate income while Bridgers add bonus Gold per run
  (10/20/30 in the Sector/Federation/Dominion respectively).
* **Risk** – Every trade can lose a portion of profits; Dominion trades may also
  destroy ships.
* **Compensation** – When Gold is lost, a random item is granted as
  compensation.
* **Cooldown** – Trades share a 3-minute cooldown between uses.

## Shared Shop/Char Utilities

Common helpers for item lookup and character persistence are located in
`shared/shop-char-utils.js`. These functions are used by both `shop.js` and
`char.js` and are kept in a standalone module to avoid circular dependencies.
Future features that need shop or character data should import from this shared
file rather than referencing `shop.js` or `char.js` directly.

## Development

Character-related helpers must require `char` within function bodies.
This lazy `require('./char')` pattern prevents circular dependencies
with `char.js`.

## Environment Flags

* `AEG_SAFE_COMPONENTS=true|false` (default `true`) - Enables safer handling of Discord component interactions to avoid expired updates.
* `AEG_GLOBAL_GUARDS=true|false` (default `true`) - Installs global handlers for unhandled rejections and uncaught exceptions.
* `AEG_WARMUP_TICK=true|false` (default `false`) - Periodically refreshes marketplace and shop caches while the bot runs.
* `AEG_WARMUP_INTERVAL_MS=600000` - Interval in milliseconds for the warmup tick when enabled.
* `AEG_PG_KEEPALIVE=true|false` (default `false`) - Keeps PostgreSQL connections alive with periodic packets.

