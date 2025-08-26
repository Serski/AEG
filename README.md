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

