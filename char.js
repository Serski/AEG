const dbm = require('./database-manager'); // Importing the database manager
const shop = require('./shop');
const clientManager = require('./clientManager');
const axios = require('axios');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, createWebhook } = require('discord.js');
const { clientId, guildId } = require('./config.json');

class char {
  static async warn(playerID) {
    console.log(playerID);
    let collectionName = 'characters';
    let charData = await dbm.loadFile(collectionName, playerID);
    if (charData) {
      if (!charData.warns) {
        charData.warns = 0;
      }
      charData.warns++;
      await dbm.saveFile(collectionName, playerID, charData);
      return "Player has been warned. They now have " + charData.warns + " warnings.";
    } else {
      return "Player not found";
    }
  }

  static async checkWarns(playerID) {
    let collectionName = 'characters';
    let charData = await dbm.loadFile(collectionName, playerID);
    if (charData) {
      if (!charData.warns) {
        charData.warns = 0;
      }
      return "Player has " + charData.warns + " warnings.";
    } else {
      return "Player not found";
    }
  }

  // Function to add items
  static async newChar(playerID, charName, charBio, numericID) {
    // Set the collection name
    let collectionName = 'characters';

    // Load the player's character data (if it exists)
    let charData = await dbm.loadFile(collectionName, playerID);

    if (charData) {
      // If the character already exists, update the fields
      charData.name = charName;
      charData.bio = charBio;
    } else {
      // If the character does not exist, create a new character
      charData = {
        name: charName,
        bio: charBio,
        balance: 200,
        inventory: {
          "Adventure Token": 1
        },
        incomeList: {},
        incomeAvailable: true,
        stats: {
          Martial: 0,
          Intrigue: 0,
          Prestige: 0,
          Devotion: 0,
          Legitimacy: 0
        },
        cooldowns: {
          craftSlots: {},
          usageCooldowns: {}
        },
        shireID: 0,
        numericID: numericID,
      };
    }

    // Save the character data
    await dbm.saveFile(collectionName, playerID, charData);
  }

  //returns player name and bio from playerID
  static async editCharPlaceholders(playerID) {
    let collectionName = 'characters';
    let charData = await dbm.loadFile(collectionName, playerID);
    if (charData) {
      return [charData.name, charData.bio];
    } else {
      return "ERROR";
    }
  }  

  //Setavatar using new saveFile and loadFile
  static async setAvatar(avatarURL, userID) {
    try {
      // Make a HEAD request to check if the URL leads to a valid image
      const response = await axios.head(avatarURL, { maxRedirects: 5 });
  
      // Check if the response status code indicates success (e.g., 200)
      if (response.status === 200) {
        let collectionName = 'characters';
        let charData = await dbm.loadFile(collectionName, userID);
  
        charData.icon = avatarURL;
  
        await dbm.saveFile(collectionName, userID, charData);
  
        return "Avatar has been set";
      } else {
        return "Error: Avatar URL is not valid (HTTP status code " + response.status + ").";
      }
    } catch (error) {
      return "Unable to check the Avatar URL. " + error.message;
    }
  }

  //New commands using saveFile, saveCollection, loadFile and loadCollection
  static async balance(userID) {
    let collectionName = 'characters';
    let charData = await dbm.loadFile(collectionName, userID);
    if (charData) {
      const charEmbed = {
        color: 0x36393e,
        author: {
          name: charData.name,
          icon_url: charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&',
        },
        description: clientManager.getEmoji("Gold") + " **" + charData.balance + "**",
      };
      return charEmbed;
    } else {
      return "You haven't made a character! Use /newchar first";
    }
  }

  static async stats(userID) {
    let collectionName = 'characters';
    let charData;
    try {
      charData = await dbm.loadFile(collectionName, userID);
    } catch (error) {
      console.error(error);
      return "Character not found- use /newchar first";
    }
    if (charData) {
      const charEmbed = {
        color: 0x36393e,
        author: {
          name: charData.name,
          icon_url: charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&',
        },
        description: await this.getStatsBlock(charData, userID),
      };

      return charEmbed;
    } else {
      return "You haven't made a character! Use /newchar first";
    }
  }

  static async balanceAll(pageNumber) {
    //Balance of all characters in descending order- should be done as a multiple page embed
    pageNumber = parseInt(pageNumber);
    const maxPerPage = 25;

    let collectionName = 'characters';
    let charData = await dbm.loadCollection(collectionName);
    let charArray = [];
    for (let [key, value] of Object.entries(charData)) {
      charArray.push({ key, value });
    }
    charArray.sort((a, b) => b.value.balance - a.value.balance);

    let totalPages = Math.ceil(charArray.length / maxPerPage);
    if (pageNumber > totalPages) {
      return "Page number exceeds total pages!";
    }

    let start = (pageNumber - 1) * maxPerPage;
    let end = Math.min(pageNumber * maxPerPage, charArray.length);

    let superstring = "";
    for (let i = start; i < end; i++) {
      let char = charArray[i];
      superstring += "** <@" + char.value.numericID + "> **: " + char.value.balance + "\n";
    }

    const balanceEmbed = {
      color: 0x36393e,
      title: "**__Balance__**",
      description: superstring,
    };

    //Make buttons for pages
    let rows = [];
    let buttonRow = new ActionRowBuilder();
    buttonRow.addComponents(new ButtonBuilder().setCustomId('switch_bala' + (pageNumber - 1)).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(pageNumber === 1));
    buttonRow.addComponents(new ButtonBuilder().setCustomId('switch_bala' + (pageNumber + 1)).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(pageNumber === totalPages));

    rows.push(buttonRow);

    return [balanceEmbed, rows];
  }

  static async me(userID) {
    let collectionName = 'characters';
    let charData = await dbm.loadFile(collectionName, userID);
    if (charData) {
      let bioString = charData.bio;

      const charEmbed = new EmbedBuilder()
        .setColor(0x36393e)
        .setAuthor({ name: charData.name, iconURL: charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&' })
        .setDescription(bioString)
        .setImage(charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&');
      return charEmbed;
    } else {
      return "You haven't made a character! Use /newchar first";
    }
  }

  static async char(userID) {
    let collectionName = 'characters';
    let charData = await dbm.loadFile(collectionName, userID);
    if (charData) {
      let bioString = charData.bio;

      let iconUrl = charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&'
      const charEmbed = {
        color: 0x36393e,
        author: {
          name: charData.name,
          icon_url: iconUrl,
        },
        description: bioString,
        fields: [
          {
            name: clientManager.getEmoji("Gold") + " Balance: " + (charData.balance ? charData.balance : 0),
            value: await this.getStatsBlock(charData, userID),
          },
        ],
      };
      return charEmbed;
    } else {
      return "You haven't made a character! Use /newchar first";
    }
  }

  static async getStatsBlock(charData, userID) {
    const PrestigeEmoji = clientManager.getEmoji("Prestige");
    const MartialEmoji = clientManager.getEmoji("Martial");
    const IntrigueEmoji = clientManager.getEmoji("Intrigue");
    const DevotionEmoji = clientManager.getEmoji("Devotion");
    console.log(DevotionEmoji);
    const LegitimacyEmoji = clientManager.getEmoji("Legitimacy");

    let prestige = charData.stats.Prestige;
    let martial = charData.stats.Martial;
    let intrigue = charData.stats.Intrigue;
    let devotion = charData.stats.Devotion;
    let legitimacy = charData.stats.Legitimacy;

    //If any are > 100, set them to 100
    let valChanged = false;
    if (prestige > 100) {
      prestige = 100;
      valChanged = true;
    }
    if (martial > 100) {
      martial = 100;
      valChanged = true;
    }
    if (intrigue > 100) {
      intrigue = 100;
      valChanged = true;
    }
    if (devotion > 100) {
      devotion = 100;
      valChanged = true;
    }
    if (legitimacy > 100) {
      legitimacy = 100;
      valChanged = true;
    }

    if (valChanged) {
      charData.stats.Prestige = prestige;
      charData.stats.Martial = martial;
      charData.stats.Intrigue = intrigue;
      charData.stats.Devotion = devotion;
      charData.stats.Legitimacy = legitimacy;
      console.log(userID);
      await dbm.saveFile('characters', userID, charData);
    }

    return "**`━━━━━━━Stats━━━━━━━`**\n"+ 
            "**" + LegitimacyEmoji + " Legitimacy: " + legitimacy + "**/100\n" +
            "**" + PrestigeEmoji + " Prestige: " + prestige + "**/100\n" +
            "**" + MartialEmoji + " Martial: " + martial + "**/100\n" +
            "**" + IntrigueEmoji + " Intrigue: " + intrigue + "**/100\n" +
            "**" + DevotionEmoji + " Devotion: " + devotion + "**/100\n" +
            "**`━━━━━━━━━━━━━━━━━━━`**";
  }

  static async say(userID, message, channelID) {
    let charData = await dbm.loadFile('characters', userID);
    if (charData) {
      let webhookName = charData.name;
      //if charData.icon is undefined, set it to the default avatar
      let webhookAvatar = charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&';
      let webhookMessage = message;

      (async () => {
        // Create a webhook
        let webhook = await channelID.createWebhook({name: webhookName, avatar: webhookAvatar });
        
        // Send a message using the webhook
        await webhook.send({
            content: webhookMessage,
            username: webhookName,
            avatarURL: webhookAvatar
        });

        // Delete the webhook after sending the message
        await webhook.delete();
      })()

      return "Message sent!";
    } else {
      return "You haven't made a character! Use /newchar first";
    }
  }

  static async incomes(userID, numericID) {
    let collectionName = 'characters';

    // Load the data
    let charData = await dbm.loadFile(collectionName, userID);
    let incomeListFromRoles = await dbm.loadFile('keys', 'incomeList');

    var now = new Date();

    let charIncomeData = [];

    //Add on incomes from roles. role.id is a number that corresponds to the role's ID. Meanwhile, incomeList data is a list of incomes- within each income from that list, there is a "roles" array that contains the ids of roles that match that income
    let user = await clientManager.getUser(numericID);
    let roles = user.roles.cache;

    let incomeAvailableKey = "incomeAvailable";
    for (let [income, incomeData] of Object.entries(incomeListFromRoles)) {
      let incomeRoles = incomeData.roles;
      for (let i = 0; i < incomeRoles.length; i++) {
        if (roles.some(role => role.id === incomeRoles[i])) {
          charIncomeData.push({ income, data: incomeData });
          let delay = incomeData.delay || "1D";
          if (delay !== "1D") {
            incomeAvailableKey = `incomeAvailable${delay}`;
            if (charData[incomeAvailableKey] === undefined) {
              charData[incomeAvailableKey] = true;
            }
          }
          break;
        }
      }
    }


    let superstring = "";
    let afterString = "";
    let total = 0;
    //Declare a resourcemap
    let resourceMap = {}
    let incomesCollectedArray = [];
    for (let [key, value] of Object.entries(charIncomeData)) {
      console.log(value);

      //Each value will include an emoji, goldGiven, itemGiven, and itemAmount field
      //Should add goldGiven to total, and if itemGiven is not "" and itemAmount is not 0, add itemAmount to the resourceMap. 
      //Should also add to the superString the icon and name of the command in bold, followed by enter and a tab, followed by the goldGiven (if greater than zero) and the itemGiven and itemAmount (if greater than zero)
      let delay = value.data.delay || "1D";
      let incomeAvailableKey = delay === "1D" ? "incomeAvailable" : `incomeAvailable${delay}`;

      console.log(incomeAvailableKey);

      let goldGiven = value.data.goldGiven;
      let itemGiven = value.data.itemGiven;
      let itemAmount = value.data.itemAmount;
      console.log(goldGiven);
      let emoji = value.data.emoji;
      let tempString = "";
      tempString += emoji + " **__" + value.income + "__**\n"; 
      if (goldGiven > 0 || goldGiven < 0) {
        tempString += clientManager.getEmoji("Gold") + " Gold : `" + goldGiven + "`\n";
      }
      if (itemGiven != "" && (itemAmount > 0 || itemAmount < 0)) {
        tempString += clientManager.getEmoji(itemGiven) + " " + itemGiven + " : `" + itemAmount + "`\n";
      }
      
      //Check if the income is available
      if (charData[incomeAvailableKey] === true) {
        afterString += tempString;
        afterString += "\n";
        total += goldGiven;
        console.log(total);
        if (itemGiven != "" && itemAmount != 0) {
          if (resourceMap[itemGiven]) {
            resourceMap[itemGiven] += itemAmount;
          } else {
            resourceMap[itemGiven] = itemAmount;
          }
        }
        //Push to incomescollectedarray just the income name
        incomesCollectedArray.push(incomeAvailableKey);
      } else {
        if (delay !== "1D") {
          let startDate = new Date(0); // Unix epoch start date: January 1, 1970
          let nextCycleTime = new Date(startDate);
          let delayAmount = parseInt(delay.slice(0, -1));
          let delayUnit = delay.slice(-1);

          while (nextCycleTime <= now) {
              switch (delayUnit) {
                  case 'D':
                      nextCycleTime.setDate(nextCycleTime.getDate() + delayAmount);
                      break;
                  case 'W':
                      nextCycleTime.setDate(nextCycleTime.getDate() + 7 * delayAmount);
                      break;
                  case 'M':
                      nextCycleTime.setMonth(nextCycleTime.getMonth() + delayAmount);
                      break;
                  case 'Y':
                      nextCycleTime.setFullYear(nextCycleTime.getFullYear() + delayAmount);
                      break;
              }
          }

          tempString += "Income already collected for " + delay + " cycle. Next cycle <t:" + Math.floor(nextCycleTime.getTime() / 1000) + ":R>\n";
        }
      }
      superstring += tempString;
      superstring += "\n";
    }

    charData.balance += total;
    superstring +=  clientManager.getEmoji("Gold") + " **__Total Gold :__** `" + total + "`\n";

    for (let [resource, amount] of Object.entries(resourceMap)) {
      if (charData.inventory[resource]) {
        charData.inventory[resource] += amount;
      } else {
        charData.inventory[resource] = amount;
      }
      superstring += clientManager.getEmoji(resource) + " **__Total " + resource + " :__** `" + amount + "`\n";
    }

    superstring += "\n";
    if (charData.incomeAvailable === false) {
      superstring += "You have already used income this income cycle!";
    } else {
      superstring += "Successfully collected!";
    }

    for (let incomeAvailableKey of incomesCollectedArray) {
      charData[incomeAvailableKey] = false;
    }

    //Cast now.getTime()/1000 to int
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    superstring += "\nNext cycle  <t:" + Math.floor(tomorrow.getTime() / 1000) + ":R>";
    
    charData.incomeAvailable = false;

    await dbm.saveFile(collectionName, userID, charData);
    
    const incomeEmbed = {
      color: 0x36393e,
      title: "**__Incomes__**",
      description: `<@${numericID}>\n\n${superstring}`,
    };
  
    return [incomeEmbed, afterString];
  }

  static async resetIncomeCD() {
    let collectionName = 'characters';
    let data = await dbm.loadCollection(collectionName);
    let now = new Date();
    now = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    let nextResetTimes = new Map();

    // Define the start date
    let startDate = new Date(0); // Unix epoch start date: January 1, 1970

    for (let [_, charData] of Object.entries(data)) {
      // Always reset the primary incomeAvailable field
      charData.incomeAvailable = true;
      
      // Reset additional incomeAvailable fields based on their intervals
      for (let key in charData) {
        if (key.startsWith('incomeAvailable') && key !== 'incomeAvailable') {
          let delay = key.replace('incomeAvailable', '');

          if (!nextResetTimes.has(delay)) {
            let delayAmount = parseInt(delay.slice(0, -1));
            let delayUnit = delay.slice(-1);
            let nextCycleTime = new Date(startDate);

            while (nextCycleTime < now) {
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


  static async useItem(itemName, charID, numToUse) {
    let takeRoles;
    let giveRoles;
    //static usageOptions = [
    //   'Is Usable (Y/N)', 'Removed on Use (Y/N)', 'Need Role', 'Give Role', 'Take Role',
    //   'Show Image', 'Show Message', 'Give/Take Money (#)', 'Cooldown in Hours (#)',
    //   'Give Item', 'Give Item 2', 'Give Item 3', 'Give Item 4', 'Give Item 5',
    //   'Take Item', 'Take Item 2', 'Take Item 3', 'Take Item 4', 'Take Item 5',
    //   'Change Legitimacy (#)', 'Change Prestige (#)', 'Change Martial (#)', 'Change Intrigue (#)', 'Change Devotion (#)', 'Revive (Y/N)', 'Durability (#)'
    // ];
    let shopData = await dbm.loadCollection('shop');
    itemName = await shop.findItemName(itemName, shopData);

    if (!numToUse) {
      numToUse = 1;
    } else if (numToUse < 1) {
      return "Must use at least 1";
    }

    let returnEmbed = new EmbedBuilder();
    const charactersCollection = 'characters';
    let charData = await dbm.loadFile(charactersCollection, charID);
    const shopCollection = 'shop';
    let itemData = await dbm.loadFile(shopCollection, itemName);

    let user = await clientManager.getUser(charData.numericID);

    //Check if user has item

    if (!charData.inventory[itemName] || charData.inventory[itemName] < numToUse) {
      return "You do not have enough of this item!";
    }

    if (itemData.usageOptions["Can Use Multiple (Y/N)"] != "Yes" && numToUse > 1) {
      return "You can only use one of this item!";
    }

    if (itemData.usageOptions["Is Usable (Y/N)"] != "Yes") {
      return "Item is not usable!";
    }

    if (itemData.usageOptions["Removed on Use (Y/N)"] == "Yes") {
      charData.inventory[itemName] -= numToUse;
    }


    //There are multiple role options, either Need Any Of Roles or Need All Of Roles. If Need Any Of Roles, check if user has any of the roles. If Need All Of Roles, check if user has all of the roles
    if (itemData.usageOptions["Need Any Of Roles"]) {
      //Roles are enclosed in <@& and >, and there may be multiple roles. They may not be comma separated but commas and spaces may exist
      let roles = itemData.usageOptions["Need Any Of Roles"].split("<@&");
      roles = roles.map(role => role.replace(">", ""));
      roles = roles.map(role => role.replace(",", ""));
      roles = roles.map(role => role.replace(/\s+/g, ""));
      roles = roles.filter(role => role.length > 0);
      let hasRole = false;

      console.log(roles);
      for (let i = 0; i < roles.length; i++) {
        if (user.roles.cache.some(role => role.id === roles[i])) {
          hasRole = true;
          break;
        }
      }
      if (!hasRole) {
        return "You do not have the required role to use this item! You must have one of " + itemData.usageOptions["Need Any Of Roles"];
      }
    }

    if (itemData.usageOptions["Need All Of Roles"]) {
      let roles = itemData.usageOptions["Need All Of Roles"].split("<@&");
      roles = roles.map(role => role.replace(">", ""));
      roles = roles.map(role => role.replace(",", ""));
      roles = roles.map(role => role.replace(/\s+/g, ""));
      roles = roles.filter(role => role.length > 0);
      let hasRole = true;
      for (let i = 0; i < roles.length; i++) {
        if (!user.roles.cache.some(role => role.id === roles[i])) {
          hasRole = false;
          break;
        }
      }
      if (!hasRole) {
        return "You do not have all the required roles to use this item! You must have all of " + itemData.usageOptions["Need All Of Roles"];
      }
    }

    if (itemData.usageOptions["Need None Of Roles"]) {
      let roles = itemData.usageOptions["Need None Of Roles"].split("<@&");
      roles = roles.map(role => role.replace(">", ""));
      roles = roles.map(role => role.replace(",", ""));
      roles = roles.map(role => role.replace(/\s+/g, ""));
      roles = roles.filter(role => role.length > 0);
      let hasRole = false;
      for (let i = 0; i < roles.length; i++) {
        if (user.roles.cache.some(role => role.id === roles[i])) {
          hasRole = true;
          break;
        }
      }
      if (hasRole) {
        return "You have a role that prevents you from using this item! You must not have any from " + itemData.usageOptions["Need None Of Roles"];
      }
    }

    if (itemData.usageOptions["Cooldown in Hours (#)"]) {
      if (charData.cooldowns.usageCooldowns[itemName] <= Math.round(Date.now() / 1000) || !charData.cooldowns.usageCooldowns[itemName]) {
        charData.cooldowns.usageCooldowns[itemName] = Math.round(Date.now() / 1000) + (itemData.usageOptions["Cooldown in Hours (#)"] * 3600);
      } else {
        return "You have used this item recently! Can be used again <t:" + charData.cooldowns.usageCooldowns[itemName] + ":R>";
      }
    }

    returnEmbed.setTitle("**__Used:__ " + (numToUse > 1 ? numToUse + " " : "") + itemData.infoOptions.Icon + " " + itemName + "**");

    if (itemData.usageOptions["Show Image"].length > 0) {
      returnEmbed.setImage(itemData.usageOptions["Show Image"]);
    }
    if (itemData.usageOptions["Show Message"].length > 0) {
      returnEmbed.setDescription(itemData.usageOptions["Show Message"]);
    }

    if (itemData.usageOptions["Give/Take Money (#)"] && itemData.usageOptions["Give/Take Money (#)"] != 0 && itemData.usageOptions["Give/Take Money (#)"] != "") {
      //If they are taking money, make sure they have enough
      let totalGold = parseInt(itemData.usageOptions["Give/Take Money (#)"]) * numToUse;
      if (charData.balance + totalGold < 0 && totalGold < 0) {
        return "You do not have enough money to use this item!";
      }
      charData.balance += totalGold;
      //Add field for money loss/gain, with Gold emoji
      returnEmbed.addFields({ 
        name: '**Gold:**', 
        value: clientManager.getEmoji("Gold") + " " + (totalGold < 0 ? totalGold : "+" + totalGold)
      })
    }

    //Cycle through options that begin with "Change"
    let statChanged = false;
    let statString = "";
    let itemChanged = false;
    let itemString = "";
    for (let [key, value] of Object.entries(itemData.usageOptions)) {
      if (value == 0 || value == "" || !value) {
        continue;
      }
      if (key.startsWith("Change")) {
        let stat = key.split(" ")[1];
        value = parseInt(value) * numToUse;
        charData.stats[stat] += parseInt(value);
        if (charData.stats[stat] < 0) {
          charData.stats[stat] = 0;
        }
        statChanged = true;
        statString += stat + ": " + clientManager.getEmoji(stat) + (parseInt(value) < 0 ? parseInt(value) : "+" + parseInt(value)) +  "\n";
      }

      if (key.startsWith("Give Item")) {
        let item = value.split(" ").slice(1).join(" ");
        let num = value.split(" ")[0];
        num = parseInt(num) * numToUse;
        if (!charData.inventory[item]) {
          charData.inventory[item] = 0;
        }
        charData.inventory[item] += num;
        itemChanged = true;
        itemString = item + ": " +  shopData[item].infoOptions.Icon + "+" + parseInt(num) + "\n" + itemString;
      }

      if (key.startsWith("Take Item")) {
        let item = value.split(" ").slice(1).join(" ");
        let num = value.split(" ")[0];
        num = parseInt(num) * numToUse;
        if (!charData.inventory[item] || charData.inventory[item] < num) {
          return "You do not have " + shopData[item].infoOptions.Icon + " " + num + " " + item;
        }
        charData.inventory[item] -= num;
        itemChanged = true;
        itemString += item + ": " + shopData[item].infoOptions.Icon + "-" + parseInt(num) + "\n";
      }
    }

    if (itemData.usageOptions["Give Role"]) {
      giveRoles = itemData.usageOptions["Give Role"].split("<@&");
      giveRoles = giveRoles.map(role => role.replace(">", ""));
      giveRoles = giveRoles.map(role => role.replace(",", ""));
      giveRoles = giveRoles.map(role => role.replace(/\s+/g, ""));
      giveRoles = giveRoles.filter(role => role.length > 0);

      returnEmbed.addFields({ name: '**Added Roles:**', value: itemData.usageOptions["Give Role"] });
    }

    if (itemData.usageOptions["Take Role"]) {
      takeRoles = itemData.usageOptions["Take Role"].split("<@&");
      takeRoles = takeRoles.map(role => role.replace(">", ""));
      takeRoles = takeRoles.map(role => role.replace(",", ""));
      takeRoles = takeRoles.map(role => role.replace(/\s+/g, ""));
      takeRoles = takeRoles.filter(role => role.length > 0);

      returnEmbed.addFields({ name: '**Removed Roles:**', value: itemData.usageOptions["Take Role"] });
    }

    if (statChanged) {
      returnEmbed.addFields({ name: '**Stats:**', value: statString });
    } 
    if (itemChanged) {
      returnEmbed.addFields({ name: '**Items:**', value: itemString });
    }

    await dbm.saveFile(charactersCollection, charID, charData);

      //If theres an error, give 
    if (takeRoles) {
      for (let i = 0; i < takeRoles.length; i++) {
        await user.roles.remove(takeRoles[i]);
      }
    }

    if (giveRoles) {
      try {
        for (let i = 0; i < giveRoles.length; i++) {
          await user.roles.add(giveRoles[i]);
        }
      } catch (error) {
        for (let i = 0; i < takeRoles.length; i++) {
          await user.roles.add(takeRoles[i]);
        }
        return "Error adding roles!";
      }
    }
    
    return returnEmbed;
  }

  static async craft(userPassed, recipe, guild) {
    let charID = userPassed.tag;
    let user = await guild.members.fetch(userPassed.id);

    let allRecipes = await dbm.loadCollection('recipes');
    let recipeData = allRecipes[recipe];

    if (!recipeData) {
      for (let [key, value] of Object.entries(allRecipes)) {
        if (value.recipeOptions.Name.toLowerCase() == recipe.toLowerCase()) {
          recipeData = value;
          recipe = key;
          break;
        }
      }
      if (!recipeData) {
        return "Recipe not found!";
      }
    }

    recipe = recipeData.recipeOptions.Name;

    let charData = await dbm.loadCollection('characters');

    // Check if the recipe exists
    if (!recipeData) {
      return "Recipe not found!";
    }

    // Check if the character exists
    if (!charData[charID]) {
      return "Character not found!";
    }

    if (recipeData.recipeOptions["Is Public (Y/N)"] == "No") {
      return "This recipe is not public!";
    }

    // Check if the character has the required items
    for (let i = 1; i <= 5; i++) {
      let ingredient = recipeData.recipeOptions["Ingredient " + i];
      if (ingredient) {
        let ingredientName = ingredient.split(" ").slice(1).join(" ");
        let ingredientQuantity = parseInt(ingredient.split(" ")[0]);
        if (!charData[charID].inventory[ingredientName] || charData[charID].inventory[ingredientName] < ingredientQuantity) {
          return "You do not have enough of the required items! You need " + ingredientQuantity + " " + ingredientName + " to craft this recipe.";
        }
        //Remove the ingredients from the character's inventory
        charData[charID].inventory[ingredientName] -= ingredientQuantity;
      }
    }

    console.log(recipeData);

    //There are multiple role options, either Need Any Of Roles or Need All Of Roles. If Need Any Of Roles, check if user has any of the roles. If Need All Of Roles, check if user has all of the roles
    if (recipeData.recipeOptions["Need Any Of Roles"]) {
      //Roles are enclosed in <@& and >, and there may be multiple roles. They may not be comma separated but commas and spaces may exist
      console.log(recipeData.recipeOptions["Need Any Of Roles"]);
      let roles = recipeData.recipeOptions["Need Any Of Roles"].split("<@&");
      console.log(roles);
      roles = roles.map(role => role.replace(">", ""));
      roles = roles.map(role => role.replace(",", ""));
      roles = roles.map(role => role.replace(/\s+/g, ""));
      roles = roles.filter(role => role.length > 0);
      console.log(roles);
      let hasRole = false;
      for (let i = 0; i < roles.length; i++) {
        if (user.roles.cache.some(role => role.id === roles[i])) {
          hasRole = true;
          break;
        }
      }
      if (!hasRole) {
        return "You do not have the required role to craft this recipe! You must have one role from " + recipeData.recipeOptions["Need Any Of Roles"];
      }
    }

    if (recipeData.recipeOptions["Need All Of Roles"]) {
      let roles = recipeData.recipeOptions["Need All Of Roles"].split("<@&");
      roles = roles.map(role => role.replace(">", ""));
      roles = roles.map(role => role.replace(",", ""));
      roles = roles.map(role => role.replace(/\s+/g, ""));
      roles = roles.filter(role => role.length > 0);
      let hasRole = true;
      for (let i = 0; i < roles.length; i++) {
        if (!user.roles.cache.some(role => role.id === roles[i])) {
          hasRole = false;
          break;
        }
      }
      if (!hasRole) {
        return "You do not have all the required roles to craft this recipe! You must have all roles from " + recipeData.recipeOptions["Need All Of Roles"];
      }
    }

    if (recipeData.recipeOptions["Need None Of Roles"]) {
      let roles = recipeData.recipeOptions["Need None Of Roles"].split("<@&");
      roles = roles.map(role => role.replace(">", ""));
      roles = roles.map(role => role.replace(",", ""));
      roles = roles.map(role => role.replace(/\s+/g, ""));
      roles = roles.filter(role => role.length > 0);
      let hasRole = false;
      for (let i = 0; i < roles.length; i++) {
        if (user.roles.cache.some(role => role.id === roles[i])) {
          hasRole = true;
          break;
        }
      }
      if (hasRole) {
        return "You have a role that is not allowed to craft this recipe! You must have none of the roles from " + recipeData.recipeOptions["Need None Of Roles"];
      }
    }

    let repeatNum = 0;
    if (charData[charID].cooldowns.craftSlots) {
      if (Object.keys(charData[charID].cooldowns.craftSlots).length >= 3) {
        let returnEmbed = await this.craftingCooldowns(charID);
        returnEmbed.setDescription(":warning: You have no open crafting slots! :warning:");
        return returnEmbed;
      }
      if (charData[charID].cooldowns.craftSlots[recipe]) {
        //Check if REPEAT_#_ exists
        repeatNum = 1;
        while (charData[charID].cooldowns.craftSlots["REPEAT_" + repeatNum + "_" + recipe]) {
          repeatNum++;
        }
      }
    }

    // Add the recipe to the character's crafting slots
    let finishTime = Math.round(Date.now() / 1000) + recipeData.recipeOptions["Craft Time in Hours (#)"] * 3600;
    if (repeatNum > 0) {
      charData[charID].cooldowns.craftSlots["REPEAT_" + repeatNum + "_" + recipe] = finishTime;
    } else {
      charData[charID].cooldowns.craftSlots[recipe] = finishTime;
    }

    await dbm.saveCollection('characters', charData);

    let returnEmbed = await this.craftingCooldowns(charID);
    if (typeof(returnEmbed) == 'string') {
      return returnEmbed;
    }

    returnEmbed.setDescription("Began crafting " + recipeData.recipeOptions.Icon + " " + recipe);
    console.log(returnEmbed);
    return returnEmbed;
  }

  //Creates cooldowns embed, followed by a return string if any recipes are completed
  static async craftingCooldowns(charID) {
    let charData = await dbm.loadCollection('characters');
    let shopData = await dbm.loadCollection('shop');
    let recipeData = await dbm.loadCollection('recipes');
    let finishedCrafts = [];

    if (!charData[charID].cooldowns.craftSlots) {
      return "No crafting ongoing";
    }

    let returnEmbed = new EmbedBuilder();
    returnEmbed.setTitle("**:clipboard: Crafting Slots**");

    let numSlots = 0;
    for (let key in charData[charID].cooldowns.craftSlots) {
      //Key may start with: REPEAT_1_, REPEAT_2_, REPEAT_3_, etc. Remove this, i.e. REPEAT_1_Blah = Blah
      let oldKey = key;
      let val = charData[charID].cooldowns.craftSlots[key];
      //If more than 4 exist, delete the newest one and send an error message
      if (Object.keys(charData[charID].cooldowns.craftSlots).length > 3) {
        delete charData[charID].cooldowns.craftSlots[key];
        await dbm.saveCollection('characters', charData);
        return "ERROR: Too many crafting slots. Contact Alex immediately.";
      }
      if (key.startsWith("REPEAT_")) {
        key = key.slice(9);
        //Check if recipe still exists- if it doesn't, return an error
      }
      if (!recipeData[key]) {
        //Remove the key from the character's cooldowns
        delete charData[charID].cooldowns.craftSlots[oldKey];
        await dbm.saveCollection('characters', charData);
        return "ERROR: The following recipe was not found and has been removed: " + key + ". Contact Alex";
      }
      //If any recipes are finished, add them to the finishedCrafts array and remove them from the character's cooldowns. Skip the rest of the loop
      if (val < Math.round(Date.now() / 1000)) {
        finishedCrafts.push(key);

        //Remove the key from the character's cooldowns
        delete charData[charID].cooldowns.craftSlots[oldKey];
        await dbm.saveCollection('characters', charData);

        continue;
      }
      //Return embed naturally includes the recipe icon, name, and time remaining
      let icon = recipeData[key].recipeOptions.Icon;
      numSlots++;
      returnEmbed.addFields({ name: '**`' + numSlots + ': `' + icon + " " + key + ":**", value: 'Finishes: <t:' + val + ':R>' });
    }

    while (numSlots < 3) {
      numSlots++;
      returnEmbed.addFields({ name: '**`' + numSlots + ': `**', value: 'Empty' });
    }

    if (finishedCrafts.length > 0) {
      for (let i = 0; i < finishedCrafts.length; i++) {
        let key = finishedCrafts[i];
        let recipe = recipeData[key];

        let valueString = "";

        if (!recipe) {
          return "The following recipe was not found and the error arrived later than expected: " + key + ". Contact Alex";
        }

        //Go through the recipe's results and add them to the character's inventory, as well as to value string
        for (let i = 1; i <= 5; i++) {
          let reward = recipe.recipeOptions["Result " + i];
          if (reward) {
            let rewardName = reward.split(" ").slice(1).join(" ");
            let rewardQuantity = parseInt(reward.split(" ")[0]);
            if (!charData[charID].inventory[rewardName]) {
              charData[charID].inventory[rewardName] = 0;
            }
            charData[charID].inventory[rewardName] += rewardQuantity;

            valueString += rewardName + ": " + shopData[rewardName].infoOptions.Icon + "+" + rewardQuantity + "\n";
          }
        }
        if (valueString.length == 0) {
          returnEmbed.addFields({ name: '**`Finished Crafting: `' + recipe.recipeOptions.Icon + " " + key + "**", value: "No results" });
        } else {
          returnEmbed.addFields({ name: '**`Finished Crafting: `' + recipe.recipeOptions.Icon + " " + key + "**", value: valueString });
        }
      }
    }

    await dbm.saveCollection('characters', charData);
    return returnEmbed;
  }





  /*static async craft(charID, itemName) {
    itemName = await shop.findItemName(itemName);
    if (itemName === "ERROR") {
      return "Not a valid item";
    }
    const numToUse = 1;

    let returnEmbed = new EmbedBuilder();
    const charactersCollection = 'characters';
    let charData = await dbm.loadFile(charactersCollection, charID);
    const shopCollection = 'shop';
    let shopData = await dbm.loadCollection(shopCollection);

    if (!shopData[itemName].recipe) {
      return "No recipe";
    } else {
      returnEmbed.setTitle("**__Started Crafting:__" + shopData[itemName].icon + itemName + "**");
      if (shopData[itemName].recipe.countdown) {
        if (shopData[itemName].recipe.takes) {
          // Check crafting slots in charData.cooldowns
          const craftSlots = charData.cooldowns.craftSlots || {};

          if (Object.keys(craftSlots).length >= 3) {
              return "All crafting slots are in use.";
          }

          let takeString = "";

          // Remove items in recipe.takes
          for (let key in shopData[itemName].recipe.takes) {
            const val = shopData[itemName].recipe.takes[key] * numToUse;
            if (!charData.inventory[key] || charData.inventory[key] < val) {
                if (!charData.inventory[key]) {
                  charData.inventory[key] = 0;
                }
                return "Not enough **" + shopData[key].icon + key + "**! You need " + val + " and only have " + charData.inventory[key] + ".";
            } else {
                charData.inventory[key] -= val;
                takeString += "`   -" + val + "` " + shopData[key].icon + " " + key + "\n";
            }
          }

          // Find an available slot for crafting
          let slotKey = itemName;
          let slotCount = 1;
          while (craftSlots[slotKey]) {
              slotCount++;
              slotKey = `REPEAT_${slotCount}_${itemName}`;
          }

          // Set the crafting slot with the item and expiration time
          const expirationTime = Math.round(Date.now() / 1000) + shopData[itemName].recipe.countdown;
          craftSlots[slotKey] = expirationTime;

          // Update craftSlots in charactersData
          charData.cooldowns.craftSlots = craftSlots;

          returnEmbed.addFields(
            { name: '**Took:**', value: takeString },
            { name: '**Done:**', value: '<t:' + expirationTime + ':R>'}
          );
        } else {
          return "Item does not take an item. Likely an error in setup, ping Alex or Serski";
        }
      } else {
        return "Item does not have a crafting time. Likely an error in setup, ping Alex or Serski";
      }
    }
    dbm.saveFile(charactersCollection, charID, charData);
    return returnEmbed;
  }

  //Creates cooldowns embed
  static async craftingCooldowns(charID) {
    let returnEmbed = new EmbedBuilder();
    const charactersCollection = 'characters';
    let charData = await dbm.loadFile(charactersCollection, charID);
    const shopCollection = 'shop';
    let shopData = await dbm.loadCollection(shopCollection);
    let finishedCrafts = [];
    let finishedSlotKeys = [];
    let finishedField = "";

    if (!charData.cooldowns.craftSlots) {
      return "No crafting ongoing";
    } else {
      returnEmbed.setTitle("**__Crafting Timers**");
      let returnString = "";
      for (let key in charData.cooldowns.craftSlots) {
        //Key may start with: REPEAT_1_, REPEAT_2_, REPEAT_3_, etc. Remove this, i.e. REPEAT_1_Blah = Blah
        let oldKey = key;
        let val = charData.cooldowns.craftSlots[key];
        if (key.startsWith("REPEAT_")) {
          key = key.slice(9);
        }
        let icon = shopData[key].icon;
        returnString += "**" + icon + key + "**: <t:" + val + ":R>\n";
        if (val < Math.round(Date.now() / 1000)) {
          finishedCrafts.push(key);
          finishedSlotKeys.push(oldKey);
          finishedField += "**" + icon + key + "**\n";
        }
      }
      returnEmbed.setDescription(returnString);
    }

    if (finishedCrafts.length > 0) {
      returnEmbed.addFields(
        { name: '**Finished Crafting:**', value: finishedField}
      );

      for (let i = 0; i < finishedCrafts.length; i++) {
        let key = finishedCrafts[i];
        key = await shop.findItemName(key);

        if (key === "ERROR") {
          return "Somehow, this isn't a valid item. This is a problem. Contact Alex";
        }

        //Give the player the item, than delete it from the crafting slots
        if (!charData.inventory[key]) {
          charData.inventory[key] = 0;
        }
        charData.inventory[key] += 1;

        delete charData.cooldowns.craftSlots[finishedSlotKeys[i]];

        await dbm.saveFile(charactersCollection, charID, charData);
      }
    }

    return returnEmbed;
  }

  static async useItem(itemName, charID, numToUse) {
    if (!numToUse) {
      numToUse = 1;
    } else if (numToUse < 1) {
      return "Must use at least 1";
    }
    itemName = await shop.findItemName(itemName);
    if (itemName === "ERROR") {
      return "Not a valid item";
    }

    let returnEmbed = new EmbedBuilder();
    const charactersCollection = 'characters';
    let charData = await dbm.loadFile(charactersCollection, charID);
    const shopCollection = 'shop';
    let shopData = await dbm.loadCollection(shopCollection);

    if (!shopData[itemName].usageCase) {
      return "No usage case";
    } else {
      if (shopData[itemName].usageCase.countdown) {
        if (charData.cooldowns[itemName]) {
          if (charData.cooldowns[itemName] > Math.round(Date.now() / 1000)) {
            return "You have used this item recently! Can be used again <t:" + charData.cooldowns[itemName] + ":R>";
          }
        } else if (!charData.cooldowns) {
          charData.cooldowns = {};
        }
        charData.cooldowns[itemName] = Math.round(Date.now() / 1000) + shopData[itemName].usageCase.countdown;
        returnEmbed.addFields(
          { name: '**Can be used again:**', value: '<t:' + charData.cooldowns[itemName] + ':R>'}
        );
      }

      returnEmbed.setTitle("**__Used:__" + shopData[itemName].icon + "`" + numToUse + "` " + itemName + "**");
      if (shopData[itemName].usageCase.description) {
        returnEmbed.setDescription(shopData[itemName].usageCase.description);
      }
      switch (shopData[itemName].usageCase.useType) {
        case "STATBOOST":
          if (numToUse > 1) {
            return "You can only use one of this item! You will not get more stats by using more.";
          }
          if (!shopData[itemName].usageCase.countdown) {
            return "This item does not have a countdown. Likely an error in setup, ping Alex or Serski";
          }

          const PrestigeEmoji = '<:Prestige:1165722839228354610>';
          const MartialEmoji = '<:Martial:1165722873248354425>';
          const IntrigueEmoji = '<:Intrigue:1165722896522563715>';

          if (shopData[itemName].usageCase.gives) {
            let takeString = "";
            if (!charData.inventory[itemName] || charData.inventory[itemName] < numToUse) {
              if (!charData.inventory[itemName]) {
                charData.inventory[itemName] = 0;
              }
              return "Not enough **" + shopData[itemName].icon + itemName + "**! You need " + numToUse + " and only have " + charData.inventory[itemName] + ".";
            } else {
              charData.inventory[itemName] -= numToUse;
              takeString += "`   -" + numToUse + "` " + shopData[itemName].icon + " " + itemName + "\n";
            }
            if (shopData[itemName].usageCase.takes) {
              for (let key in shopData[itemName].usageCase.takes) {
                let val = shopData[itemName].usageCase.takes[key];
                let icon;
                switch (key) {
                  case "Prestige":
                    icon = PrestigeEmoji;
                    break;
                  case "Martial":
                    icon = MartialEmoji;
                    break;
                  case "Intrigue":
                    icon = IntrigueEmoji;
                    break;
                  default:
                    return "This use case includes an invalid stat name. Likely an error in setup, contact Alex or Serski";
                }
                if (!charData.stats[key]) {
                  charData.stats[key] = 0;
                }
                charData.stats[key] -= val;
                takeString += "`   -" + val + "` " + icon + " " + key + "\n";
              }
            }
            let giveString = "";
            for (let key in shopData[itemName].usageCase.gives) {
              let val = shopData[itemName].usageCase.gives[key];
              let icon;
              switch (key) {
                case "Prestige":
                  icon = PrestigeEmoji;
                  break;
                case "Martial":
                  icon = MartialEmoji;
                  break;
                case "Intrigue":
                  icon = IntrigueEmoji;
                  break;
                default:
                  return "This use case includes an invalid stat name. Likely an error in setup, contact Alex or Serski";
              }
              if (!charData.stats[key]) {
                charData.stats[key] = 0;
              }
              charData.stats[key] += val;
              giveString += "`   +" + val + "` " + icon + " " + key + "\n";
            }
            if (giveString && takeString) {
              returnEmbed.addFields(
                { name: '**Gave:**', value: giveString }, 
                { name: '**Took:**', value: takeString }
              );
            } else if (giveString) {
              returnEmbed.addFields(
                { name: '**Gave:**', value: giveString }
              );
            } else if (takeString) {
              returnEmbed.addFields(
                { name: '**Took:**', value: takeString }
              );
            }
          } else {
            return "Item does not give stats. Likely an error in setup, ping Alex or Serski";
          }
          break;
        case "INCOMEROLE":
          if (numToUse > 1) {
            return "You can only use one of this item! You will not get more income roles by using more.";
          }
          if (shopData[itemName].usageCase.gives) {
            let takeString = "";
            if (!charData.inventory[itemName] || charData.inventory[itemName] < numToUse) {
              if (!charData.inventory[itemName]) {
                charData.inventory[itemName] = 0;
              }
              return "Not enough **" + shopData[itemName].icon + itemName + "**! You need " + numToUse + " and only have " + charData.inventory[itemName] + ".";
            } else {
              charData.inventory[itemName] -= numToUse;
              takeString += "`   -" + numToUse + "` " + shopData[itemName].icon + " " + itemName + "\n";
            }
            for (let key in shopData[itemName].usageCase.takes) {
              let val = shopData[itemName].usageCase.takes[key];
              if (!charData.inventory[key] || charData.inventory[key] < val) {
                if (!charData.inventory[key]) {
                  charData.inventory[key] = 0;
                }
                return "Not enough **" + shopData[key].icon + key + "**! You need " + val + " and only have " + charData.inventory[key] + ".";
              } else {
                charData.inventory[key] -= val;
                takeString += "`   -" + val + "` " + shopData[key].icon + " " + key + "\n";
              }
            }
            let giveString = "";
            for (let key in shopData[itemName].usageCase.gives) {
              let val = shopData[itemName].usageCase.gives[key];
              charData.incomeList[key] = val;
              giveString += "`   +" + val + "` <:Gold:1232097113089904710> " + key + " per day\n";
            }
            if (giveString && takeString) {
              returnEmbed.addFields(
                { name: '**Gave:**', value: giveString }, 
                { name: '**Took:**', value: takeString }
              );
            } else if (giveString) {
              returnEmbed.addFields(
                { name: '**Gave:**', value: giveString }
              );
            } else if (takeString) {
              returnEmbed.addFields(
                { name: '**Took:**', value: takeString }
              );
            }
          }
          else {
            return "Item does not both give an income role and take an item. Likely an error in setup, ping Alex or Serski";
          }
          break;
        default:
          return "Incorrect usage case. Likely an error in setup, contact Alex or Serski";
      }
    }
    if (shopData[itemName].usageCase.countdown) {
      if (!charData.cooldowns) {
        charData.cooldowns = {};
      }
      if (!charData.cooldowns[itemName]) {
        charData.cooldowns[itemName] = 0;
      }
      charData.cooldowns[itemName] = Math.round(Date.now() / 1000) + shopData[itemName].usageCase.countdown;
      returnEmbed.addFields(
        { name: '**Can be used again:**', value: '<t:' + charData.cooldowns[itemName] + ':R>'}
      );
    }
    dbm.saveFile(charactersCollection, charID, charData);
    return returnEmbed;
  }*/

  static async addPlayerGold(player, gold) {
    let collectionName = 'characters';
    let charData;
    [player, charData] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }
    if (charData) {
      charData.balance += gold;
      await dbm.saveFile(collectionName, player, charData);
      return true;
    } else {
      return false;
    }
  }

  static async setPlayerGold(player, gold) {
    let collectionName = 'characters';
    let charData;
    [player, charData] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }
    if (charData) {
      charData.balance = gold;
      await dbm.saveFile(collectionName, player, charData);
      return true;
    } else {
      return false;
    }
  }

  static async changePlayerStats(player, stat, amount) {
    let collectionName = 'characters';
    let charData;
    [player, charData] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }

    stat = stat.charAt(0).toUpperCase() + stat.slice(1).toLowerCase();
    switch (stat) {
      case "Prestige":
      case "Martial":
      case "Intrigue":
      case "Devotion":
      case "Legitimacy":
        break;
      default:
        return "Invalid stat";
    }

    if (charData) {
      charData.stats[stat] += amount;
      if (charData.stats[stat] < 0) {
        charData.stats[stat] = 0;
      }
      if (charData.stats[stat] > 100) {
        charData.stats[stat] = 100;
      }
      await dbm.saveFile(collectionName, player, charData);
      return stat;
    }
  }

  static async addItemToPlayer(player, item, amount) {
    let collectionName = 'characters';
    let shopData = await dbm.loadCollection('shop');
    item = await shop.findItemName(item, shopData);
    let charData;
    [player, charData] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }
    if (item === "ERROR") {
      return "Not a valid item";
    }
    if (charData) {
      //If amount is positive, add items to player or set to amount if they have none of the item already. If amount is negative, remove items from player or set to 0 if they have none of the item already, or less than the amount.
      if (amount > 0) {
        if (charData.inventory[item]) {
          charData.inventory[item] += amount;
        } else {
          charData.inventory[item] = amount;
        }
      } else if (amount < 0) {
        if (charData.inventory[item]) {
          if (charData.inventory[item] + amount > 0) {
            charData.inventory[item] += amount;
          } else {
            charData.inventory[item] = 0;
          }
        } else {
          charData.inventory[item] = 0;
        }
      }
      await dbm.saveFile(collectionName, player, charData);
      return true;
    } else {
      return false;
    }
  }

  static async addItemToRole(role, item, amount) {
    let collectionName = 'characters';
    let charData = await dbm.loadCollection(collectionName);
  
    let members = await role.guild.members.fetch();
    members = members.filter(member => member.roles.cache.has(role.id));
    console.log(members.length);
  
    let errorMembers = [];
  
    for (let [id, member] of members) {
  
      // Check if the member has a character
      let charID = member.user.username;
      console.log("ID" + charID);
      console.log(id);
      console.log(member);
      console.log(charData[charID]);
      if (!charData[charID]) {
        errorMembers.push(charID);
        continue;
      }
  
      // Add the item to the member's inventory
      if (!charData[charID].inventory) {
        charData[charID].inventory = {};
      }
  
      if (amount > 0) {
        charData[charID].inventory[item] = (charData[charID].inventory[item] || 0) + amount;
      } else if (amount < 0) {
        charData[charID].inventory[item] = Math.max((charData[charID].inventory[item] || 0) + amount, 0);
        if (charData[charID].inventory[item] === 0) {
          delete charData[charID].inventory[item]; // Optional: Remove if amount is 0
        }
      }
    }
  
    await dbm.saveCollection(collectionName, charData);
    console.log(errorMembers);
  
    return errorMembers;
  }

  static async store(player, item, amount) {
    let collectionName = 'characters';
    let shopData = await dbm.loadCollection('shop');
    item = await shop.findItemName(item, shopData);
    let charData;
    [player, charData] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }
    if (item === "ERROR") {
      return "Not a valid item";
    }

    if (charData) {
      if (!charData.inventory) {
        charData.inventory = {};
      }
      if (!charData.storage) {
        charData.storage = {};
      }
      if (charData.inventory[item] && charData.inventory[item] >= amount) {
        if (charData.storage[item]) {
          charData.storage[item] += amount;
        } else {
          charData.storage[item] = amount;
        }
        charData.inventory[item] -= amount;
        await dbm.saveFile(collectionName, player, charData);
        return true;
      } else {
        return "You don't have enough of that item!";
      }
    }
  }

  static async grab(player, item, amount) {
    let collectionName = 'characters';
    let shopData = await dbm.loadCollection('shop');
    item = await shop.findItemName(item, shopData);
    let charData;
    [player, charData] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }
    if (item === "ERROR") {
      return "Not a valid item";
    }

    if (charData) {
      if (!charData.inventory) {
        charData.inventory = {};
      }
      if (!charData.storage) {
        charData.storage = {};
      }
      if (!charData.storage[item]) {
        charData.storage[item] = 0;
      }
      if (charData.storage[item] && charData.storage[item] >= amount) {
        if (charData.inventory[item]) {
          charData.inventory[item] += amount;
        } else {
          charData.inventory[item] = amount;
        }
        charData.storage[item] -= amount;
        await dbm.saveFile(collectionName, player, charData);
        return true;
      } else {
        return "You don't have enough of that item!";
      }
    }
  }

  static async deposit(player, gold) {
    let collectionName = 'characters';
    let charData;
    [player, charData] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }
    if (!charData.bank) {
      charData.bank = 0;
    }
    if (charData) {
      if (charData.balance >= gold) {
        charData.balance -= gold;
        charData.bank += gold;
        await dbm.saveFile(collectionName, player, charData);
        return true;
      } else {
        return "You don't have enough gold!";
      }
    }
  }

  static async withdraw(player, gold) {
    let collectionName = 'characters';
    let charData;
    [player, charData] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }
    if (!charData.bank) {
      charData.bank = 0;
    }
    if (charData) {
      if (charData.bank >= gold) {
        charData.balance += gold;
        charData.bank -= gold;
        await dbm.saveFile(collectionName, player, charData);
        return true;
      } else {
        return "You don't have enough gold!";
      }
    }
  }

  static async bank(userID) {
    let collectionName = 'characters';
    let charData = await dbm.loadFile(collectionName, userID);
    if (charData) {
      if (!charData.bank) {
        charData.bank = 0;
      }
      const charEmbed = {
        color: 0x36393e,
        author: {
          name: charData.name,
          icon_url: charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&',
        },
        description: clientManager.getEmoji("Gold") + " **" + charData.bank + "**",
      };
      return charEmbed;
    } else {
      return "You haven't made a character! Use /newchar first";
    }
  }

  static async giveItemToPlayer(playerGiving, player, item, amount) {
    console.log("start");
    if (playerGiving === player) {
      return "You can't give items to yourself!";
    }

    if (amount < 1) {
      return "Amount must be greater than 0";
    }

    //Check if player has item, if they do, remove it and give it to player
    let collectionName = 'characters';
    let shopData = await dbm.loadCollection('shop');

    item = await shop.findItemName(item, shopData);
    if (item === "ERROR") {
      return "Not a valid item";
    }

    if (shopData[item].infoOptions["Transferrable (Y/N)"] == "No") {
      return "This item cannot be transferred!";
    }
    let charData;
    [playerGiving, charData] = await this.findPlayerData(playerGiving);
    if (!playerGiving) {
      return "Error: Player not found";
    }

    console.log("playerGiving: " + playerGiving);

    let charData2;
    [player, charData2] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }

    console.log("player: " + player);

    if (charData && charData2) {
      if (charData.inventory[item] && charData.inventory[item] >= amount) {
        charData.inventory[item] -= amount;
        if (charData2.inventory[item]) {
          charData2.inventory[item] += amount;
        } else {
          charData2.inventory[item] = amount;
        }
        await dbm.saveFile(collectionName, playerGiving, charData);
        await dbm.saveFile(collectionName, player, charData2);
        return true;
      } else {
        return "You don't have enough of that item!";
      }
    }
  }

  static async giveGoldToPlayer(playerGiving, player, gold) {
    if (playerGiving === player) {
      return "You can't give gold to yourself!";
    }
    if (gold < 1) {
      return "Amount must be greater than 0";
    }

    //Check if player has gold, if they do, remove it and give it to player
    let collectionName = 'characters';
    let charData;
    [playerGiving, charData] = await this.findPlayerData(playerGiving);
    if (!playerGiving) {
      return "Error: Player not found";
    }

    let charData2;
    [player, charData2] = await this.findPlayerData(player);
    if (!player) {
      return "Error: Player not found";
    }

    console.log(charData.balance);
    console.log(gold);
    console.log(charData.balance >= gold);
    if (charData && charData2) {
      if (charData.balance >= gold) {
        charData.balance -= gold;
        charData2.balance += gold;
        await dbm.saveFile(collectionName, playerGiving, charData);
        await dbm.saveFile(collectionName, player, charData2);
        return true;
      } else {
        return "You don't have enough gold!";
      }
    }
  }



  static async findPlayerData(player) {
    let collectionName = 'characters';
    //Load collection
    let data = await dbm.loadCollection(collectionName);
    //Find if player can be found easily, if yes return player and charData
    if (data[player]) {
      return [player, data[player]];
    } else {
      //If not, try to find player by numeric ID
      //Player ID that would be passed is surrounded by <@{ID}>, so need to remove those to find id
      player = player.replace("<@", "");
      player = player.replace(">", "");
      for (let [key, value] of Object.entries(data)) {
        if (value.numericID === player) {
          return [key, value];
        }
      }
    }
    //If player cannot be found, return false
    return [false, false];
  }
}

module.exports = char;