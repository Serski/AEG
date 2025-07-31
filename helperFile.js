const dbm = require('./database-manager');
const clientManager = require('./clientManager');

// Load the shop collection, add the "Need None Of Roles" field to each document's usageOptions, and save the collection back to the database
// This is a one-time script to add the "Need None Of Roles" field to each document's usageOptions
// Usage: node addNeedNoneOfRolesToShop.js
async function addNeedNoneOfRolesToShop() {
    // Load the shop collection
    const shopCollection = await dbm.loadCollection('shop');

    // Add the "Need None Of Roles" field to each document's usageOptions
    for (let shopItem in shopCollection) {
        shopItem = shopCollection[shopItem];
        shopItem.usageOptions["Need None Of Roles"] = "";
    }

    // Save the shop collection back to the database
    await dbm.saveCollection('shop', shopCollection);
}

async function loadResourcesJSON() {
    const resources = await dbm.loadFile('keys', 'resources');
    
    //Save as json
    const fs = require('fs');
    fs.writeFileSync('resources.json', JSON.stringify(resources, null, 2));

    console.log("Resources saved to resources.json");
}

async function saveResourcesJSON() {
    const fs = require('fs');
    const resources = JSON.parse(fs.readFileSync('resources.json'));

    await dbm.saveFile('keys', 'resources', resources);
    console.log("Resources saved to database");
}

async function getResourceEmojis() {
    const resources = await dbm.loadFile('keys', 'resources');
    
    for (let resource in resources) {
        let emoji = clientManager.getEmoji(resource);
        if (!emoji || emoji == null) {
            console.log(`Resource ${resource} does not have an emoji`);
            continue;
        }
        resources[resource].emoji = emoji;
    }

    await dbm.saveFile('keys', 'resources', resources);
}

async function healthToLegitimacy() {
    const characters = await dbm.loadCollection('characters');

    //in stats map, remove Health option and add Legitimacy option for all characters
    for (let character in characters) {
        character = characters[character];
        character.stats.Legitimacy = character.stats.Health;
        delete character.stats.Health;
    }

    await dbm.saveCollection('characters', characters);
}

//export getResourceEmojis;

async function addShireToShireNames() {
    const kingdoms = await dbm.loadFile('keys', 'kingdoms');

    //Each kingdom has a shires field, which is a map of shire names to shire objects. Shire objects have a name field that should add "shire" to the shire name
    for (let kingdom in kingdoms) {
        kingdom = kingdoms[kingdom];
        for (let shire in kingdom.shires) {
            shire = kingdom.shires[shire];
            shire.name = shire.name + " Shire";
        }
    }

    console.log(kingdoms.Jorvik.shires);

    await dbm.saveFile('keys', 'kingdoms', kingdoms);
}

async function addTo10RecipeIngredients() {
    const recipes = await dbm.loadCollection('recipes');

    //For every recipe, in recipeOptions, there should be Ingredient 1 ... Ingredient 5 fields. Add Ingredient 6 ... Ingredient 10 fields. Empty with "" as value
    for (let recipe in recipes) {
        recipe = recipes[recipe];
        recipe.recipeOptions["Ingredient 6"] = "";
        recipe.recipeOptions["Ingredient 7"] = "";
        recipe.recipeOptions["Ingredient 8"] = "";
        recipe.recipeOptions["Ingredient 9"] = "";
        recipe.recipeOptions["Ingredient 10"] = "";
    }

    await dbm.saveCollection('recipes', recipes);
}

async function resetIncomeCD() {
    let collectionName = 'characters';
    let data = await dbm.loadCollection(collectionName);
    //Set date to midnight, february 13
    let now = new Date();
    now = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0));
    let nextResetTimes = new Map();

    // Define the start date
    let startDate = new Date(0); // Unix epoch start date: January 1, 1970

    for (let [_, charData] of Object.entries(data)) {
      // Always reset the primary incomeAvailable field
      //charData.incomeAvailable = true;
      
      // Reset additional incomeAvailable fields based on their intervals
      for (let key in charData) {
        if (key.startsWith('incomeAvailable') && key !== 'incomeAvailable') {
          let delay = key.replace('incomeAvailable', '');

          if (!nextResetTimes.has(delay)) {
            let delayAmount = parseInt(delay.slice(0, -1));
            let delayUnit = delay.slice(-1);
            let nextCycleTime = new Date(startDate);

            while (nextCycleTime < now) {
                console.log(nextCycleTime, now)
                switch (delayUnit) {
                    case 'D':
                        nextCycleTime.setUTCDate(nextCycleTime.getUTCDate() + delayAmount);
                        break;
                    case 'W':
                        nextCycleTime.setUTCDate(nextCycleTime.getUTCDate() + 7 * delayAmount);
                        break;
                    case 'M':
                        nextCycleTime.setUTCMonth(nextCycleTime.getUTCMonth() + delayAmount);
                        break;
                    case 'Y':
                        nextCycleTime.setUTCFullYear(nextCycleTime.getUTCFullYear() + delayAmount);
                        break;
                }
            }

            console.log(nextCycleTime);
            console.log(nextResetTimes);
            console.log(delay);
            console.log(nextResetTimes.get(delay));
            console.log("Next Cycle Day" + nextCycleTime.getUTCDate() + " Next Cycle Month" + nextCycleTime.getUTCMonth() + " Next Cycle Year" + nextCycleTime.getUTCFullYear());
            console.log("Now Day" + now.getUTCDate() + " Now Month" + now.getUTCMonth() + " Now Year" + now.getUTCFullYear());

            nextResetTimes.set(delay, nextCycleTime.getUTCDate() === now.getUTCDate() &&
                                      nextCycleTime.getUTCMonth() === now.getUTCMonth() &&
                                      nextCycleTime.getUTCFullYear() === now.getUTCFullYear());

            console.log(nextResetTimes.get(delay));
          }
          if (nextResetTimes.get(delay)) {
            charData[key] = true;
          }
        }
      }
    }
    
    await dbm.saveCollection(collectionName, data);
  }

resetIncomeCD();

// addTo10RecipeIngredients();

module.exports = {
    addNeedNoneOfRolesToShop,
    loadResourcesJSON,
    saveResourcesJSON,
    getResourceEmojis
}