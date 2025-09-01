const dbm = require('./database-manager');
const fs = require('fs');
const path = require('path');

async function initRaidTargets() {
  // Read the JSON file you created under jsonStorage
  const filePath = path.join(__dirname, 'jsonStorage', 'raidTargets.json');
  const targets = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Save the entire object to the 'raidTargets' collection
  await dbm.saveCollection('raidTargets', targets);
  if (process.env.DEBUG) console.log('raidTargets saved to DB');
}

initRaidTargets().catch((err) => {
  console.error(err);
});
