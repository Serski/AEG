const dbm = require('../database-manager');

const KEY_MAP = {
  'Change Legitimacy (#)': 'Change HP (#)',
  'Change Strength (#)': 'Change STR (#)',
  'Change Dexterity (#)': 'Change DEX (#)',
  'Change Intelligence (#)': 'Change INT (#)',
  'Change Charisma (#)': 'Change CHA (#)'
};

async function migrateStatKeys() {
  const shopData = await dbm.loadCollection('shop');
  let changes = 0;

  for (const [itemName, itemData] of Object.entries(shopData)) {
    if (!itemData || !itemData.usageOptions) continue;

    for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
      if (Object.prototype.hasOwnProperty.call(itemData.usageOptions, oldKey)) {
        itemData.usageOptions[newKey] = itemData.usageOptions[oldKey];
        delete itemData.usageOptions[oldKey];
        changes++;
      }
    }
  }

  await dbm.saveCollection('shop', shopData);
  console.log(`Migration complete. Updated ${changes} fields.`);
}

migrateStatKeys().catch((err) => {
  console.error('Migration failed:', err);
});
