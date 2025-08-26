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

