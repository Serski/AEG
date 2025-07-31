const dbm = require('./database-manager'); // Importing the database manager
const Discord = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const clientManager = require('./clientManager');
const dataGetters = require('./dataGetters');

class shop {
  //Declare constants for class 
  static infoOptions = ['Name', 'Icon', 'Category', 'Image', 'Description', 'Transferrable (Y/N)'];
  static shopOptions = ['Price (#)', 'Need Role', 'Give Role', 'Take Role', 'Quantity (#)', 'Channels'];
  static usageOptions = [
      'Is Usable (Y/N)', 'Removed on Use (Y/N)', 'Can Use Multiple (Y/N)', 'Need Any Of Roles', 'Need All Of Roles', 'Need None Of Roles', 'Give Role', 'Take Role',
      'Show Image', 'Show Message', 'Give/Take Money (#)', 'Cooldown in Hours (#)',
      'Give Item', 'Give Item 2', 'Give Item 3', 'Give Item 4', 'Give Item 5',
      'Take Item', 'Take Item 2', 'Take Item 3', 'Take Item 4', 'Take Item 5',
      'Change Legitimacy (#)', 'Change Prestige (#)', 'Change Martial (#)', 'Change Intrigue (#)', 'Change Devotion (#)', 'Revive (Y/N)', 'Durability (#)'
    ];
  static recipeOptions = [
      'Name', 'Icon', 'Show Image', 'Show Message',
      'Ingredient 1', 'Ingredient 2', 'Ingredient 3', 'Ingredient 4', 'Ingredient 5', 'Ingredient 6', 'Ingredient 7', 'Ingredient 8', 'Ingredient 9', 'Ingredient 10',
      'Result 1', 'Result 2', 'Result 3', 'Result 4', 'Result 5',
      'Craft Time in Hours (#)', 'Need None Of Roles', 'Need All Of Roles', 'Need Any Of Roles', 'Is Public (Y/N)'
    ];

  // Function to find an item by name in the shop
  //THIS IS INEFFICIENT BECAUSE IT MEANS CALLING IT MEANS TWO CALLS TO THE DATABASE- FIX LATER
  static async findItemName(itemName, data) {
    let dataKeys = Object.keys(data);
    for (let i = 0; i < dataKeys.length; i++) {
      if (dataKeys[i].toLowerCase() == itemName.toLowerCase()) {
        return dataKeys[i];
      }
    }
    return "ERROR";
  }

  static async convertToShopMap(rawShopLayoutData) {
    const arrayShopLayoutData = rawShopLayoutData.shopArray;
    //Turn shopArray, an array of fields of arrays, into map of category to items

    let shopLayoutData = {};
    // Iterate over the shopArray which is an array of objects
    for (let categoryObject of arrayShopLayoutData) {
      // Each object has keys which are the category names, and the values are arrays of items
      for (let [category, items] of Object.entries(categoryObject)) {
        // Assign the array of items to the corresponding category in the shopLayoutData map
        shopLayoutData[category] = items;
      }
    }

    return shopLayoutData;
  }

  // Function to add items to the shop
  static async addItem(itemName, givenData) {
    //Items include 4 arrays of maps, each map for a category of options. Make these 4, and make each value blank
    let itemData = {
      "infoOptions": this.infoOptions.reduce((acc, option) => {
        acc[option] = "";
        return acc;
      }
      , {}),
      "shopOptions": this.shopOptions.reduce((acc, option) => {
        acc[option] = "";
        return acc;
      }
      , {}),
      "usageOptions": this.usageOptions.reduce((acc, option) => {
        acc[option] = "";
        return acc;
      }
      , {}),
    };
    itemData.infoOptions.Name = itemName;
    //Given data is a map of some elements that have been set, though its unknown which option they are for. Iterate through and set the values
    for (let [key, value] of Object.entries(givenData)) {
      if (this.infoOptions.includes(key)) {
        itemData.infoOptions[key] = value;
      } else if (this.shopOptions.includes(key)) {
        itemData.shopOptions[key] = value;
      } else if (this.usageOptions.includes(key)) {
        itemData.usageOptions[key] = value;
      }
    }
    await dbm.saveFile('shop', itemName, itemData);
  }

  static async addRecipe(recipeName) {
    //Go into the recipes file. First check if another copy of this recipe exists. If it does, add a space and number to recipe name and check again
    let data = await dbm.loadCollection('recipes');
    let shopData = await dbm.loadCollection('shop');
    let recipeNames = Object.keys(data);
    let i = 1;
    let newRecipeName = recipeName;
    while (recipeNames.includes(newRecipeName)) {
      newRecipeName = recipeName + " " + i;
      i++;
    }
    //Create a new recipe object with all fields blank
    let recipeData = {
      "recipeOptions": this.recipeOptions.reduce((acc, option) => {
        acc[option] = "";
        return acc;
      }
      , {}),
    };

    //Set option "Is Public (Y/N)" to No

    recipeData.recipeOptions["Is Public (Y/N)"] = "No";
    let itemName = await this.findItemName(newRecipeName, shopData);
    if (itemName != "ERROR") {
      let itemData = shopData[itemName];
      newRecipeName = itemName;
      recipeData.recipeOptions.Name = itemName;
      recipeData.recipeOptions.Icon = itemData.infoOptions.Icon;
      recipeData.recipeOptions["Result 1"] = "1 " + itemName;
    } else {
      recipeData.recipeOptions.Name = newRecipeName;
      recipeData.recipeOptions.Icon = ":hammer:";
    }
    recipeData.recipeOptions["Craft Time in Hours (#)"] = 1;
    await dbm.saveFile('recipes', newRecipeName, recipeData); 

    return newRecipeName;
  }

  static async recipesEmbed(isPublic, page) {
    const itemsPerPage = 1000; // Number of recipes per page
    let data = await dbm.loadCollection('recipes');
    let shopData = await dbm.loadCollection('shop');
    let publicRecipes = [];
    let privateRecipes = [];
  
    //Loop through data 
    for (let [key, value] of Object.entries(data)) {
      if (value.recipeOptions["Is Public (Y/N)"] == "Yes") {
        publicRecipes.push(value);
      } else {
        privateRecipes.push(value);
      }
    }


    let recipesToShow = isPublic ? publicRecipes : publicRecipes.concat(privateRecipes);

    let categorizedRecipes = {};
    let itemNamesLower = Object.keys(shopData).map(name => name.toLowerCase());
    for (let recipe of recipesToShow) {
      let category = "Uncategorized";
      if (shopData[recipe.recipeOptions.Name]) {
        category = shopData[recipe.recipeOptions.Name].infoOptions.Category || category;
      } else {
        // Search for comparison lower case
        let recipeName = recipe.recipeOptions.Name.toLowerCase();
        let index = itemNamesLower.indexOf(recipeName);
        if (index != -1) {
          category = shopData[Object.keys(shopData)[index]].infoOptions.Category || category
        }
      }
      if (category == "") {
        category = "Uncategorized";
      }
      if (!categorizedRecipes[category]) {
        categorizedRecipes[category] = [];
      }
      categorizedRecipes[category].push(recipe);
    }
  
    // Pagination calculation
    const pageStart = (page - 1) * itemsPerPage;
    const pageEnd = pageStart + itemsPerPage;
    const totalPages = Math.ceil(recipesToShow.length / itemsPerPage);
  
    let returnEmbed = new Discord.EmbedBuilder()
      .setTitle(':hammer: Recipes')
      .setColor(0x36393e)
      .setFooter({ text: `Page ${page} of ${totalPages}` });

    let descriptionText = '';

    const addRecipesToDescription = (recipes, startIndex, endIndex, category, isPublic) => {
      if (recipes.length > 0) {
        descriptionText += `**${category}**\n`;
        for (let i = startIndex; i < endIndex && i < recipes.length; i++) {
          let recipeName = recipes[i].recipeOptions.Name;
          if (!isPublic && privateRecipes.includes(recipes[i])) {
            recipeName += " :warning:";
          }
          descriptionText += (recipes[i].recipeOptions.Icon ? recipes[i].recipeOptions.Icon + " " : ":hammer: ") + recipeName + "\n";
        }
      }
    };

    let count = 0;

    for (let [category, recipes] of Object.entries(categorizedRecipes)) {
      if (count >= pageStart && count < pageEnd) {
        let startIndex = Math.max(pageStart - count, 0);
        let endIndex = Math.min(pageEnd - count, recipes.length);
        addRecipesToDescription(recipes, startIndex, endIndex, category, isPublic);
      }
      count += recipes.length;
    }

    if (descriptionText === '') {
      descriptionText = 'No recipes found!';
    }

    returnEmbed.setDescription(descriptionText);
  
    // Buttons for navigation
    const prevButton = new ButtonBuilder()
      .setCustomId('prev_page')
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 1);
  
    const nextButton = new ButtonBuilder()
      .setCustomId('next_page')
      .setLabel('>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages);
  
    let actionRow = new ActionRowBuilder().addComponents(prevButton, nextButton);
  
    return [returnEmbed, actionRow];
  }
  


  static async updateAllItemVersions() {
    //Update all item versions
    let data = await dbm.loadCollection('shop');
    let itemNames = Object.keys(data);
    for (let i = 0; i < itemNames.length; i++) {
      await this.updateItemVersion(itemNames[i]);
    }
    return "All items updated to the new version";
  }

  static async updateItemVersion(itemName) {
    // Convert all item data to the new options. Carry over whatever new options it has
    let itemData = await dbm.loadFile('shop', itemName);

    // Create a new itemData object with the new options
    let newItemData = {
      "infoOptions": this.infoOptions.reduce((acc, option) => {
        acc[option] = itemData.infoOptions[option] || "";
        return acc;
      }
      , {}),
      "shopOptions": this.shopOptions.reduce((acc, option) => {
        acc[option] = itemData.shopOptions[option] || "";
        return acc;
      }
      , {}),
      "usageOptions": this.usageOptions.reduce((acc, option) => {
        acc[option] = itemData.usageOptions[option] || "";
        return acc;
      }
      , {}),
    };

    await dbm.saveFile('shop', itemName, newItemData);

    //If no errors, return a success message
    if (newItemData != undefined) {
      return `Item \`${itemName}\` updated to the new version`;
    } else {
      return "Error updating item!";
    }
  }

  static async createShopEmbed(page, interaction) {
    const channelID = interaction.channelId;
    page = Number(page);
    const itemsPerPage = 25;
    // Load data from shop.json and shoplayout.json
    const shopData = await dbm.loadCollection('shop');
    // Convert the shop data to a an array of maps of category to items
    let shopLayoutData = {};
    for (let [key, value] of Object.entries(shopData)) {
      let price = value.shopOptions["Price (#)"];
      //Turn price into number
      price = parseInt(price);
      if (!(price == undefined || price == "" || price == null || isNaN(price) || price == 0)) {
        let channels = value.shopOptions.Channels;
        console.log(channels);
        if (channels.includes("#")) {
          if (!channels.includes(channelID)) {
            continue;
          }
        }
        if (!shopLayoutData[value.infoOptions.Category]) {
          shopLayoutData[value.infoOptions.Category] = [];
        }
        shopLayoutData[value.infoOptions.Category].push(key);
      }
    }

    let startIndices = [];
    startIndices[0] = 0;
    const shopCategories = Object.keys(shopLayoutData);
    //Sort categories alphabetically
    shopCategories.sort();

    let currIndice = 0;
    let currPageLength = 0;
    let i = 0;
    for (const category of shopCategories) {
      let length = shopLayoutData[category].length;
      currPageLength += length;
      if (currPageLength > itemsPerPage) {
        currPageLength = length;
        currIndice++;
        startIndices[currIndice] = i;
      }
      i++;
    }

    const pages = Math.ceil(startIndices.length);

    const pageItems = shopCategories.slice(
      startIndices[page-1],
      startIndices[page] ? startIndices[page] : undefined
    );

    const embed = new Discord.EmbedBuilder()
      .setTitle(clientManager.getEmoji("Gold") + ' Shop')
      .setColor(0x36393e);

    //If there are no items in the shop, set description as "No items have prices!" and return
    if (pageItems.length == 0) {
      embed.setDescription("No items have prices!");
      return [embed, []];
    }

    let descriptionText = '';
    for (const category of pageItems) {
      let endSpaces = "-";
      if ((20 - category.length - 2) > 0) {
        endSpaces = "-".repeat(20 - category.length - 2);
      }
      descriptionText += `**\`--${category}${endSpaces}\`**\n`;
      descriptionText += shopLayoutData[category]
        .map((item) => {
          const icon = shopData[item].infoOptions.Icon;
          const price = shopData[item].shopOptions["Price (#)"];

          let alignSpaces = ' '
          if ((30 - item.length - ("" + price).length) > 0) {
            alignSpaces = ' '.repeat(30 - item.length - ("" + price).length);
          }
          // Create the formatted line
          return `${icon} \`${item}${alignSpaces}${price}\` ${clientManager.getEmoji("Gold")}`;
        })
        .join('\n');
      descriptionText += '\n';
    }
    // Set the accumulated description
    embed.setDescription(descriptionText);

    if (pages > 1) {
      embed.setFooter({text: `Page ${page} of ${pages}`});
    }

    const rows = [];

    // Create a "Previous Page" button
    const prevButton = new ButtonBuilder()
      .setCustomId('switch_page' + (page-1))
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary); // You can change the style to your preference

    // Disable the button on the first page
    if (page == 1) {
      prevButton.setDisabled(true);
    }

    const nextButton = new ButtonBuilder()
          .setCustomId('switch_page' + (page+1))
          .setLabel('>')
          .setStyle(ButtonStyle.Secondary); // You can change the style to your preference

    // Create a "Next Page" button if not on the last page
    if (page == pages) {
      nextButton.setDisabled(true);
    }
    rows.push(new ActionRowBuilder().addComponents(prevButton, nextButton));

    return [embed, rows];
  }

  static async renameCategory(oldCategory, newCategory) {
    let data = await dbm.loadCollection('shop');
    let itemNames = Object.keys(data);
    for (let i = 0; i < itemNames.length; i++) {
      if (data[itemNames[i]].infoOptions.Category == oldCategory) {
        data[itemNames[i]].infoOptions.Category = newCategory;
      }
    }
    await dbm.saveCollection('shop', data);
    return "Category renamed!";
  }

  static async createAllItemsEmbed(page) {
    page = Number(page);
    const itemsPerPage = 25;
    // Load data from shop.json and shoplayout.json
    const shopData = await dbm.loadCollection('shop');
    //Turn shopData into an array of keys
    let itemArray = Object.keys(shopData);
    //Put the array into an array of categories each containing all items in the category, alphabetically
    let itemCategories = {};
    for (let i = 0; i < itemArray.length; i++) {
      let category = shopData[itemArray[i]].infoOptions.Category;
      if (!itemCategories[category]) {
        itemCategories[category] = [];
      }
      itemCategories[category].push(itemArray[i]);
    }

    //Sort categories alphabetically
    itemCategories = Object.keys(itemCategories).sort().reduce((acc, key) => { 
      acc[key] = itemCategories[key];
      return acc;
    }, {});



    let startIndices = [];
    startIndices[0] = 0;

    let currIndice = 0;
    let currPageLength = 0;
    let i = 0;
    for (const category in itemCategories) {
      let length = itemCategories[category].length;
      currPageLength += length;
      if (currPageLength > itemsPerPage) {
        currPageLength = length;
        currIndice++;
        startIndices[currIndice] = i;
      }
      i++;
    }

    const pages = Math.ceil(startIndices.length);

    //Can't use slice because it's an object
    const pageItems = Object.keys(itemCategories).slice(
      startIndices[page-1],
      startIndices[page] ? startIndices[page] : undefined
    );

    const embed = new Discord.EmbedBuilder()
      .setTitle(':package: Items')
      .setColor(0x36393e);

    let descriptionText = '';

    for (const category of pageItems) {
      let endSpaces = "-";
      if ((20 - category.length - 2) > 0) {
        endSpaces = "-".repeat(20 - category.length - 2);
      }
      descriptionText += `**\`--${category}${endSpaces}\`**\n`;
      descriptionText += itemCategories[category]
        .map((item) => {
          const icon = shopData[item].infoOptions.Icon;
  
          // Create the formatted line
          return `${icon} ${item}`;
        })
        .join('\n');
      descriptionText += '\n';
    }
    // Set the accumulated description
    embed.setDescription(descriptionText);

    if (pages > 1) {
      embed.setFooter({text: `Page ${page} of ${pages}`});
    }

    const rows = [];

    // Create a "Previous Page" button
    const prevButton = new ButtonBuilder()
      .setCustomId('switch_alit' + (page-1))
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary); // You can change the style to your preference

    // Disable the button on the first page
    if (page == 1) {
      prevButton.setDisabled(true);
    }

    const nextButton = new ButtonBuilder()
          .setCustomId('switch_alit' + (page+1))
          .setLabel('>')
          .setStyle(ButtonStyle.Secondary); // You can change the style to your preference

    // Create a "Next Page" button if not on the last page
    if (page == pages) {
      nextButton.setDisabled(true);
    }
    rows.push(new ActionRowBuilder().addComponents(prevButton, nextButton));

    return [embed, rows];
  }

  //function to create an embed of player inventory
  static async createInventoryEmbed(charID) {
    charID = await dataGetters.getCharFromNumericID(charID);
    // load data from characters.json and shop.json
    const charData = await dbm.loadCollection('characters');
    const shopData = await dbm.loadCollection('shop');

    // create a 2d of items in the player's inventory sorted by category. Remove items with 0 quantity or that don't exist in the shop
    let deleted = false;
    let inventory = [];
    for (const item in charData[charID].inventory) {
      if (charData[charID].inventory[item] == 0) {
        deleted = true;
        delete charData[charID].inventory[item];
        continue;
      }
      if (!shopData[item]) {
        deleted = true;
        delete charData[charID].inventory[item];
        continue;
      }
      const category = shopData[item].infoOptions.Category;
      if (!inventory[category]) {
        inventory[category] = [];
      }
      inventory[category].push(item);
    }
    if (deleted) {
      await dbm.saveCollection('characters', charData);
    }
    // let inventory = [];
    // for (const item in charData[charID].inventory) {
    //   const category = shopData[item].category;
    //   if (!inventory[category]) {
    //     inventory[category] = [];
    //   }
    //   inventory[category].push(item);
    // }

    //create description text from the 2d array
    let descriptionText = '';
    for (const category in inventory) {
      let endSpaces = "-"
      if ((20 - category.length - 2)> 0) {
        endSpaces = "-".repeat(20 - category.length - 2);
      }
      descriptionText += `**\`--${category}${endSpaces}\`**\n`;
      descriptionText += inventory[category]
        .map((item) => {
          const icon = shopData[item].infoOptions.Icon;
          const quantity = charData[charID].inventory[item];

          let alignSpaces = ' ' 
          if ((30 - item.length - ("" + quantity).length) > 0){
            alignSpaces = ' '.repeat(30 - item.length - ("" + quantity).length);
          }
  
          // Create the formatted line
          return `${icon} \`${item}${alignSpaces}${quantity}\``;
        })
        .join('\n');
      descriptionText += '\n';
    }

    // create an embed
    const embed = new Discord.EmbedBuilder()
      .setTitle('Inventory')
      .setColor(0x36393e)
      .setDescription('**Items:** \n' + descriptionText);

    return embed;
  }

  static async storage(charID) {
    charID = await dataGetters.getCharFromNumericID(charID);
    // load data from characters.json and shop.json
    const charData = await dbm.loadCollection('characters');
    const shopData = await dbm.loadCollection('shop');

    // create a 2d of items in the player's storage sorted by category. Remove items with 0 quantity or that don't exist in the shop
    let deleted = false;
    let storage = [];
    for (const item in charData[charID].storage) {
      if (charData[charID].storage[item] == 0) {
        deleted = true;
        delete charData[charID].storage[item];
        continue;
      }
      if (!shopData[item]) {
        deleted = true;
        delete charData[charID].storage[item];
        continue;
      }
      const category = shopData[item].infoOptions.Category;
      if (!storage[category]) {
        storage[category] = [];
      }
      storage[category].push(item);
    }
    if (deleted) {
      await dbm.saveCollection('characters', charData);
    }
    // let inventory = [];
    // for (const item in charData[charID].inventory) {
    //   const category = shopData[item].category;
    //   if (!inventory[category]) {
    //     inventory[category] = [];
    //   }
    //   inventory[category].push(item);
    // }

    //create description text from the 2d array
    let descriptionText = '';
    for (const category in storage) {
      let endSpaces = "-"
      if ((20 - category.length - 2)> 0) {
        endSpaces = "-".repeat(20 - category.length - 2);
      }
      descriptionText += `**\`--${category}${endSpaces}\`**\n`;
      descriptionText += storage[category]
        .map((item) => {
          const icon = shopData[item].infoOptions.Icon;
          const quantity = charData[charID].storage[item];

          let alignSpaces = ' ' 
          if ((30 - item.length - ("" + quantity).length) > 0){
            alignSpaces = ' '.repeat(30 - item.length - ("" + quantity).length);
          }
  
          // Create the formatted line
          return `${icon} \`${item}${alignSpaces}${quantity}\``;
        })
        .join('\n');
      descriptionText += '\n';
    }

    // create an embed
    const embed = new Discord.EmbedBuilder()
      .setTitle('Storage')
      .setColor(0x36393e)
      .setDescription('**Items:** \n' + descriptionText);

    return embed;
  }

  // Function to print item list
  // static async shop() {
  //   // Load the data
  //   let data = await dbm.loadCollection('shop');
  //   let superstring = ""
  //   for (let [key, value] of Object.entries(data)) {
  //     superstring = superstring + (String(value["icon"]) + " " + key + " : " + String(value["price"]) + "\n");
  //   }
  //   return superstring;
  // }

  // Function to remove items - removeItem(name)
  static async removeItem(itemName) {
    // Set the database name
    let fileName = 'shop';
    let shopData = await dbm.loadCollection(fileName);
    itemName = await this.findItemName(itemName, shopData);
    if (itemName == "ERROR") {
      return "Error! Item not found! Make sure to include spaces and not include the emoji.";
    }
    // Try to remove the item, and if it doesn't exist, catch the error
    try {
      await dbm.docDelete(fileName, itemName);
    } catch (error) {
      console.log(error);
      // Handle the error or do nothing
      // In JavaScript, you might want to handle errors differently
    }
  }

  static async removeRecipe(recipeName) {
    let recipes = await dbm.loadCollection('recipes');
    if (!recipes[recipeName]) {
      return "Recipe not found! You must retype the recipe name exactly as it appears to delete it.";
    }
    await dbm.docDelete('recipes', recipeName);
  }

  static async removeIncome(incomeName) {
    let incomes = await dbm.loadFile('keys', 'incomeList');
    if (!incomes[incomeName]) {
      return "Income not found! You must retype the income name exactly as it appears to delete it.";
    }
    delete incomes[incomeName];
    await dbm.saveFile('keys', 'incomeList', incomes);
  }

  static async getItemPrice(itemName) {
    let data = await dbm.loadCollection('shop');
    var price;
    if (data[itemName]) {
      if (data[itemName].shopOptions["Price (#)"] == undefined) {
        return "No Price Item!";
      }
      price = data[itemName].shopOptions["Price (#)"];
    } else {
      return "ERROR";
    }
    return price;
  }

  static async getItemCategory(itemName) {
    let data = await dbm.loadCollection('shop');
    var category;
    if (data[itemName]) {
      category = data[itemName].infoOptions.Category;
    } else {
      return "ERROR";
    }
    return category;
  }

  static async getItemIcon(itemName, shopData) {
    let data = shopData;
    var icon;
    if (data[itemName]) {
      icon = data[itemName].infoOptions.Icon;
    } else {
      return "ERROR";
    }
    return icon;
  }

  static async inspect(itemName) {
    let shopData = await dbm.loadCollection('shop');
    itemName = await this.findItemName(itemName, shopData);

    if (itemName == "ERROR") {
      return "Item not found!";
    }

    console.log(itemName);
    console.log(shopData[itemName]);

    let data = shopData;
    let itemData = data[itemName];
    
    const inspectEmbed = new Discord.EmbedBuilder()
      .setTitle('**__Item:__ ' +  itemData.infoOptions.Icon + " " + itemName + "**")
      .setColor(0x36393e);

    if (itemData) {
      let aboutString = "";
      if (itemData.shopOptions["Price (#)"] != "") {
        aboutString = "Price: " + clientManager.getEmoji("Gold") + " " + itemData.shopOptions["Price (#)"] + "\n";
      }
      let descriptionString = "**Description:\n**" + itemData.infoOptions.Description;
      console.log(itemData.usageOptions["Is Usable (Y/N)"] == "Yes");
      if (itemData.usageOptions["Is Usable (Y/N)"] == "Yes") {
        aboutString += "\n**On Usage:**\nGives:";
        //Iterate through usageOptions to find any key that starts with "Give Item". If any exist, add them to the aboutString. The value will be a string "Number Name" that will have to be split (Name may contain spaces, such as Iron Spear)
        //Also search for anything starting with Change, which will be a change in prestige, Martial, or intrigue. If they're positive, add this. This value will just be an integer in string form
        for (let key in itemData.usageOptions) {
          //Check if value is blank
          if (itemData.usageOptions[key] == "") {
            continue;
          }
          if (key == "Give/Take Money (#)") {
            if (itemData.usageOptions[key] > 0) {
              aboutString += ("\n- " + clientManager.getEmoji("Gold") + " " + itemData.usageOptions[key]);
            }
          }
          if (key.startsWith("Give Item")) {
            let splitString = itemData.usageOptions[key].split(" ");
            let quantity = splitString[0];
            let name = splitString.slice(1).join(" ");
            let icon = data[name].infoOptions.Icon;
            aboutString += ("\n- " + icon + " " + name + ": " + quantity);
          }
          if (key.startsWith("Change")) {
            let quantity = itemData.usageOptions[key];
            if (quantity > 0) {
              let icon = clientManager.getEmoji(key.split(" ")[1]);
              aboutString += ("\n- " + icon + " " + key.split(" ")[1] + ": " + quantity);
            }
          }
          if (key == "Give Role") {
            let role = itemData.usageOptions[key];
            aboutString += ("\n" + role);
          }
        }

        aboutString += "\nTakes:";
        for (let key in itemData.usageOptions) {
          if (itemData.usageOptions[key] == "") {
            continue;
          }
          if (key == "Give/Take Money (#)") {
            if (itemData.usageOptions[key] < 0) {
              aboutString += ("\n- " + clientManager.getEmoji("Gold") + " " + itemData.usageOptions[key]);
            }
          }
          if (key.startsWith("Take Item")) {
            let splitString = itemData.usageOptions[key].split(" ");
            let quantity = splitString[0];
            let name = splitString.slice(1).join(" ");
            let icon = data[name].infoOptions.Icon;
            aboutString += ("\n- " + icon + " " + name + ": " + quantity);
          }
          if (key.startsWith("Change")) {
            let quantity = itemData.usageOptions[key];
            if (quantity < 0) {
              let icon = clientManager.getEmoji(key.split(" ")[1]);
              aboutString += ("\n- " + icon + " " + key.split(" ")[1] + ": " + quantity);
            }
          }
          if (key == "Take Role") {
            let role = itemData.usageOptions[key];
            aboutString += ("\n" + role);
          }
        }

        //Add 'Need Any Of Roles', 'Need All Of Roles', 'Need None Of Roles',
        if (itemData.usageOptions["Need Any Of Roles"] != "") {
          aboutString += "\nNeed Any Of Roles: " + itemData.usageOptions["Need Any Of Roles"];
        }

        if (itemData.usageOptions["Need All Of Roles"] != "") {
          aboutString += "\nNeed All Of Roles: " + itemData.usageOptions["Need All Of Roles"];
        }

        if (itemData.usageOptions["Need None Of Roles"] != "") {
          aboutString += "\nNeed None Of Roles: " + itemData.usageOptions["Need None Of Roles"];
        }
      }

      let recipeEmbed = await this.inspectRecipe(itemName);
      let recipeString = ""
      if (recipeEmbed != "Recipe not found!") {
        recipeString += recipeEmbed.data.fields[0].value;
      }
      

      inspectEmbed.setDescription(descriptionString);
      
      if (aboutString.length > 0)
      {
        inspectEmbed.addFields({ name: '**About**', value: aboutString });
      }
      if (recipeString) { 
        inspectEmbed.addFields({ name: '**Recipe**', value: recipeString });
      }
      return inspectEmbed;
    } else {
      return "This is not an item in the shop! Make sure to include spaces and not include the emoji.";
    }
  }

  static async inspectRecipe(recipeName) {
    let recipeData = await dbm.loadCollection('recipes');
    let shopData = await dbm.loadCollection('shop');
    if (!recipeData[recipeName]) {
      //Check if lower case version of recipeName exists
      let recipeNames = Object.keys(recipeData);
      for (let i = 0; i < recipeNames.length; i++) {
        if (recipeNames[i].toLowerCase() == recipeName.toLowerCase()) {
          recipeName = recipeNames[i];
          break;
        }
      }
      if (!recipeData[recipeName]) {
        return "Recipe not found!";
      }
    }

    const inspectEmbed = new Discord.EmbedBuilder()
      .setTitle('**__Recipe:__ ' + recipeData[recipeName].recipeOptions.Icon + " " + recipeName + "**")
      .setColor(0x36393e);

    let aboutString = "";

    //If its a private recipe, say so
    if (recipeData[recipeName].recipeOptions["Is Public (Y/N)"] == "No") {
      aboutString += "\n:warning: Private Recipe! Will not be craftable :warning:\n";
    }
    if (recipeData[recipeName].recipeOptions["Craft Time in Hours (#)"]) {
      aboutString = "\nCraft Time: :clock9:" + recipeData[recipeName].recipeOptions["Craft Time in Hours (#)"] + " hours\n";
    }
    aboutString += "\nIngredients:\n";
    for (let i = 1; i <= 10; i++) {
      let ingredient = recipeData[recipeName].recipeOptions["Ingredient " + i];
      if (ingredient) {
        let splitString = ingredient.split(" ");
        let quantity = splitString[0];
        let name = splitString.slice(1).join(" ");
        let icon = await shop.getItemIcon(name, shopData);
        if (icon == "ERROR") {
          icon = "";
        }
        aboutString += ("- " + icon + " " + name + ": " + quantity + "\n");
      }
    }
    aboutString += "\nResults:\n";
    for (let i = 1; i <= 5; i++) {
      let result = recipeData[recipeName].recipeOptions["Result " + i];
      if (result) {
        let splitString = result.split(" ");
        let quantity = splitString[0];
        let name = splitString.slice(1).join(" ");
        let icon = await shop.getItemIcon(name, shopData);
        if (icon == "ERROR") {
          icon = "";
        }
        aboutString += ("- " + icon + " " + name + ": " + quantity + "\n");
      }
    }

    if (recipeData[recipeName].recipeOptions["Show Message"] != "") {
      inspectEmbed.setDescription(recipeData[recipeName].recipeOptions["Show Message"]);
    }

    //Check role requirements
    if (recipeData[recipeName].recipeOptions["Need Any Of Roles"] != "") {
      aboutString += "\nNeed Any Of Roles: " + recipeData[recipeName].recipeOptions["Need Any Of Roles"];
    }

    if (recipeData[recipeName].recipeOptions["Need All Of Roles"] != "") {
      aboutString += "\nNeed All Of Roles: " + recipeData[recipeName].recipeOptions["Need All Of Roles"];
    }

    if (recipeData[recipeName].recipeOptions["Need None Of Roles"] != "") {
      aboutString += "\nNeed None Of Roles: " + recipeData[recipeName].recipeOptions["Need None Of Roles"];
    }

    inspectEmbed.addFields({ name: '**About: **', value: aboutString });
    if (recipeData[recipeName].recipeOptions["Show Image"] != "") {
      console.log(recipeData[recipeName]);
      inspectEmbed.setImage(recipeData[recipeName].recipeOptions["Show Image"]);
    }

    return inspectEmbed;
  }

  /**edititemmenu: Essentially, this returns a large embed with various fields describing aspects of the item. 
    The title of the embed will be the item icon and name
    At the bottom of each page will be a description describing what to do and the command to use (/editfield <field number> <new value>)
    The footer will tell you what page you are on
    Buttons will exist at the bottom to click to switch to the two other pages you are not currently on.
    Each field will have a number to the left of it that the user will be able to use in a separate command to edit that field.
    Below are all the pages and fields that exist
    Two pages, one for Info and Shop Options, one for Usage Options
    Page 1: Info and Shop Options- split between Info Options and Shop Options.
    Info Options: Name, Icon, Category, Image, Description
    Shop Options: Price, Need Role, Give Role, Take Role
    Page 2: Usage Options
    Usage Options: Is Usable, Removed on Use, Need Role, Give Role, Take Role, Show an Image, Show a Message, Give/Take Money, Cooldown, Give Item, Give Item 2, Give Item 3, Take Item, Take Item 2, Take Item 3, Give Item, Give Item 2, Give Item 3, Change Prestige, Change Martial, Change Intrigue
    */
  static async editItemMenu(itemName, pageNumber, tag) {
    pageNumber = Number(pageNumber);
    let shopData = await dbm.loadCollection('shop');
    itemName = await this.findItemName(itemName, shopData);
    if (itemName == "ERROR") {
      return "Item not found!";
    }

    //Load user data, check if user has attribute "Item Edited" and if so change the value to the item name. If not, create the attribute
    let userData = await dbm.loadCollection('characters');
    if (!userData[tag].editingFields) {
      userData[tag].editingFields = {};
    }
    userData[tag].editingFields["Item Edited"] = itemName;
    await dbm.saveCollection('characters', userData);

    //Loatd item data
    let itemData = shopData[itemName];

    const infoOptions = this.infoOptions;
    const shopOptions = this.shopOptions;
    const usageOptions = this.usageOptions;

    const infoOptionsStartingIndex = 0;
    const shopOptionsStartingIndex = infoOptions.length;
    const usageOptionsStartingIndex = shopOptionsStartingIndex + shopOptions.length;

    // Get item icon
    const itemIcon = itemData.infoOptions.Icon;
    // Construct the edit menu embed
    const embed = new Discord.EmbedBuilder()
      .setTitle("**" + itemIcon + " " + itemName + "**")
      .setDescription('Edit the fields using the command /edititemfield <field number> <new value>');
    
    console.log("Page number: " + pageNumber);
    switch (pageNumber) {
      case 1:
        // Add fields for Info Options and Shop Options
        embed.addFields({ name: '❓ Info Options', value: infoOptions.map((option, index) => `\`[${index + 1}] ${option}:\` ` + itemData.infoOptions[option]).join('\n') }, 
                        { name: '🪙 Shop Options', value: shopOptions.map((option, index) => `\`[${index + 1 + shopOptionsStartingIndex}] ${option}:\` ` + itemData.shopOptions[option]).join('\n') });
        embed.setFooter({text : 'Page 1 of 2, Info and Shop Options'});
        break;
      case 2:
        // Add fields for Usage Options
        //The total length of value must be less than 1024 characters, so make sure it is less than that. If it is not, loop and create more fields that have names of (`` ``), with only the first field having the name of Usage Options
        let usageOptionsString = usageOptions.map((option, index) => `\`[${index + 1 + usageOptionsStartingIndex}] ${option}:\` ` + itemData.usageOptions[option]).join('\n');
        let lines = usageOptionsString.split('\n');
        let usageOptionsArray = [];
        let currentString = "";
        for (let i = 0; i < lines.length; i++) {
          let currLine = lines[i];
          if (currLine > 400) {
            currLine = currLine.substring(0, 400) + "...";
          }

          if (currentString.length + currLine.length < 1024) {
            currentString += currLine + "\n";
          } else {
            usageOptionsArray.push(currentString);
            currentString = currLine + "\n";
          }
        }
        usageOptionsArray.push(currentString);
        console.log("Length " + usageOptionsArray.length)
        for (let i = 0; i < usageOptionsArray.length; i++) {
          console.log(usageOptionsArray[i]);
          if (i == 0) {
            embed.addFields({ name : '💥 Usage Options', value: usageOptionsArray[i]})
          } else {
            embed.addFields({ name : '...', value: usageOptionsArray[i]});
          }
        }
        embed.setFooter({text : 'Page 2 of 2, Usage Options'});
        break;
      default:
        return "Invalid page number!";
    }

    //Create the buttons for the bottom of the embed
    const rows = new Discord.ActionRowBuilder();
    rows.addComponents(
      new Discord.ButtonBuilder()
        .setCustomId('switch_item1' + itemName)
        .setLabel('Info and Shop Options')
        .setStyle('Primary')
        .setDisabled(pageNumber === 1),
      new Discord.ButtonBuilder()
        .setCustomId('switch_item2' + itemName)
        .setLabel('Usage Options')
        .setStyle('Primary')
        .setDisabled(pageNumber === 2),
    );



    //Return an array including the embed and the buttons to put at the bottom 
    return [embed, rows];
  }

  static async editRecipeMenu(recipeName, tag) {
    // Load the recipe data
    let recipeData = await dbm.loadCollection('recipes', recipeName);

    if (recipeData[recipeName] == undefined) {
      for (let key in recipeData) {
        if (key.toLowerCase() == recipeName.toLowerCase()) {
          recipeName = key;
          break;
        }
      }
      if (recipeData[recipeName] == undefined) {
        return "Recipe not found!";
      }
    }

    recipeData = recipeData[recipeName];

    let userData = await dbm.loadCollection('characters');
    if (!userData[tag].editingFields) {
      userData[tag].editingFields = {};
    }
    userData[tag].editingFields["Recipe Edited"] = recipeName;
    await dbm.saveCollection('characters', userData);

    const recipeOptions = this.recipeOptions;

    // Construct the edit menu embed
    const embed = new Discord.EmbedBuilder()
      .setTitle("**" + recipeName + "**")
      .setDescription('Edit the fields using the command /editrecipefield <field number> <new value>');

    // Add fields for Recipe Options
    embed.addFields({ name: '📜 Recipe Options', value: recipeOptions.map((option, index) => `\`[${index + 1}] ${option}:\` ` + recipeData.recipeOptions[option]).join('\n') });
    embed.setFooter({text : 'Page 1 of 1, Recipe Options'});

    //Return an array including the embed
    return embed;
  }

  static async editItemField(userTag, fieldNumber, newValue) {
    let shopData = await dbm.loadCollection('shop');
    // Load user data
    let userData = await dbm.loadCollection('characters');
    let itemName;
    if (!userData[userTag].editingFields["Item Edited"]) {
      return "You are not currently editing any items!";
    } else {
      itemName = userData[userTag].editingFields["Item Edited"];
    }
    itemName = await this.findItemName(itemName, shopData);
    if (itemName == "ERROR") {
      return "Item not found!";
    }

    // Load the item data
    let itemData = shopData[itemName];

    const infoOptions = this.infoOptions;
    const shopOptions = this.shopOptions;
    const usageOptions = this.usageOptions;

    const infoOptionsStartingIndex = 0;
    const shopOptionsStartingIndex = infoOptions.length;
    const usageOptionsStartingIndex = shopOptionsStartingIndex + shopOptions.length;

    // Determine which category the field number belongs to
    let category;
    if (fieldNumber >= 1 && fieldNumber <= infoOptions.length) {
      category = 'infoOptions';
    } else if (fieldNumber >= shopOptionsStartingIndex + 1 && fieldNumber <= shopOptionsStartingIndex + shopOptions.length) {
      category = 'shopOptions';
      fieldNumber -= shopOptionsStartingIndex;
    } else if (fieldNumber >= usageOptionsStartingIndex + 1 && fieldNumber <= usageOptionsStartingIndex + usageOptions.length) {
      category = 'usageOptions';
      fieldNumber -= usageOptionsStartingIndex;
    } else {
      return "Invalid field number!";
    }

    // Get the field name
    let fieldName;
    switch (category) {
      case 'infoOptions':
        fieldName = infoOptions[fieldNumber - 1];
        break;
      case 'shopOptions':
        fieldName = shopOptions[fieldNumber - 1];
        break;
      case 'usageOptions':
        fieldName = usageOptions[fieldNumber - 1];
        break;
    }

    let nullValue = false;
    if (newValue == null) {
      newValue = "";
      nullValue = true;
    }

    if (!nullValue) {
      //If category contains #, convert newValue to number- if it's not a number, return an error
      if (fieldName.includes("#")) {
        let num = parseInt(newValue);
        if (isNaN(num)) {
          return "Invalid value for a number field!";
        }
        newValue = num;
      }

      if (fieldName.includes("Y/N")) {
        if (newValue.toLowerCase() == "y" || newValue.toLowerCase() == "yes" || newValue.toLowerCase() == "true") {
          newValue = "Yes";
        } else if (newValue.toLowerCase() == "n" || newValue.toLowerCase() == "no" || newValue.toLowerCase() == "false") {
          newValue = "No";
        } else {
          return "Invalid value for a Y/N field!";
        }
      }

      if (fieldName.includes("Give Item") || fieldName.includes("Take Item")) {
        //Should be in the form NUMBER ITEM NAME
        let splitString = newValue.split(" ");
        let num = parseInt(splitString[0]);
        if (isNaN(num)) {
          return "Invalid value for number! This should be given in the form <Number> <Item Name>";
        }
        //Check if item name is valid
        let itemName = splitString.slice(1).join(" ");
        itemName = await this.findItemName(itemName, shopData);
        if (itemName == "ERROR") {
          return "Invalid value for item name! This should be given in the form <Number> <Item Name>";
        }
        newValue = num + " " + itemName;
      }
      
      //Roles are enclosed in <@& and >, and there may be multiple roles. They may not be comma separated but commas and spaces may exist. Make sure at least one role is valid
      if (fieldName.includes("Role")) {
        let roles = newValue.split(" ");
        let roleString = "";
        for (let i = 0; i < roles.length; i++) {
          if (roles[i].startsWith("<@&") && roles[i].endsWith(">")) {
            roleString += roles[i] + " ";
          }
        }
        if (roleString == "") {
          return "Invalid value for roles! These should be given in the form @RoleName, @RoleName2, etc., and they should be a valid roles.";
        }
      }
    }

    // Update the item data
    itemData[category][fieldName] = newValue;

    // If the item name has changed, save the new item and delete the old one
    if (fieldName == "Name") {
      if (nullValue) {
        return "Field Name cannot be blank!";
      }
      //Save new item
      await dbm.saveFile('shop', newValue, itemData);

      //Go into every character and change the item name in their inventory
      for (let charID in userData) {
        if (userData[charID].inventory[itemName]) {
          userData[charID].inventory[newValue] = userData[charID].inventory[itemName];
          delete userData[charID].inventory[itemName];
        }
        if (userData[charID].storage && userData[charID].storage[itemName]) {
          userData[charID].storage[newValue] = userData[charID].storage[itemName];
          delete userData[charID].storage[itemName];
        }
      }
      //Delete old item
      await dbm.docDelete('shop', itemName);

      //Change the item name in the user's editingFields
      userData[userTag].editingFields["Item Edited"] = newValue;
      await dbm.saveCollection('characters', userData);

      return `Item name changed to ${newValue}`;
    } else {
      // Save the updated item data
      await dbm.saveFile('shop', itemName, itemData);
    }

    // Save the updated item data
    await dbm.saveFile('shop', itemName, itemData);

    if (nullValue) {
      return `Field ${fieldName} reset to blank for item ${itemName}`;
    }
    return `Field ${fieldName} updated to ${newValue} for item ${itemName}`;
  }

  static async editRecipeField(userTag, fieldNumber, newValue) {
    // Load user data
    let userData = await dbm.loadCollection('characters');
    let recipeName;
    if (!userData[userTag].editingFields["Recipe Edited"]) {
      return "You are not currently editing any recipes!";
    } else {
      recipeName = userData[userTag].editingFields["Recipe Edited"];
    }

    // Load the recipe data
    let recipeData = await dbm.loadFile('recipes', recipeName);

    let shopData = await dbm.loadCollection('shop');

    const recipeOptions = this.recipeOptions;

    // Determine which category the field number belongs to
    let category;
    if (fieldNumber >= 1 && fieldNumber <= recipeOptions.length) {
      category = 'recipeOptions';
    } else {
      return "Invalid field number!";
    }

    // Get the field name
    let fieldName;
    switch (category) {
      case 'recipeOptions':
        fieldName = recipeOptions[fieldNumber - 1];
        break;
    }

    let nullValue = false;
    if (newValue == null) {
      newValue = "";
      nullValue = true;
    }

    if (nullValue) {
      recipeData[category][fieldName] = newValue;
      await dbm.saveFile('recipes', recipeName, recipeData);
      return `Field ${fieldName} reset to blank for recipe ${recipeName}`;
    }

    //If category contains #, convert newValue to number- if it's not a number, return an error
    if (fieldName.includes("#")) {
      if (fieldName == "Craft Time in Hours (#)") {
        //Check if its just a single number at first
        let num = parseInt(newValue);
        if (isNaN(num)) {
          //Check if its in the format "<#> <Unit>"
          let splitString = newValue.split(" ");
          num = parseInt(splitString[0]);
          if (isNaN(num)) {
            return "Invalid value for number! This should be given in the form <Number> <Unit>";
          }
          //Check if unit is valid- should start with h, d, w, or m though can be upper or lower case
          let unit = splitString[1].toLowerCase();
          unit = unit.charAt(0);
          if (unit != "h" && unit != "d" && unit != "w" && unit != "m") {
            return "Invalid value for unit! This should be given in the form <Number> <Unit>";
          } else {
            //Convert to hours
            switch (unit) {
              case "d":
                newValue = num * 24;
                break;
              case "w":
                newValue = num * 24 * 7;
                break;
              case "m":
                newValue = num * 24 * 30;
                break;
              case "h":
                newValue = num;
                break;
              default:
                return "Invalid value for unit! This should be given in the form <Number> <Unit>";
            }
          }
        } else {
          newValue = num;
        }
      } else { 
        let num = parseInt(newValue);
        if (isNaN(num)) {
          return "Invalid value for a number field!";
        }
        newValue = num;
      }
    }


    if (fieldName.includes("Y/N")) {
      if (newValue.toLowerCase() == "y" || newValue.toLowerCase() == "yes" || newValue.toLowerCase() == "true") {
        newValue = "Yes";
      } else if (newValue.toLowerCase() == "n" || newValue.toLowerCase() == "no" || newValue.toLowerCase() == "false") {
        newValue = "No";
      } else {
        return "Invalid value for a Y/N field!";
      }
    }

    if (fieldName.includes("Ingredient") || fieldName.includes("Result")) {
      //Should be in the form NUMBER ITEM NAME
      let splitString = newValue.split(" ");
      let num = parseInt(splitString[0]);
      if (isNaN(num)) {
        return "Invalid value for number! This should be given in the form <Number> <Item Name>";
      }
      //Check if item name is valid
      let itemName = splitString.slice(1).join(" ");
      let foundItemName = await this.findItemName(itemName, shopData);
      if (foundItemName == "ERROR") {
        return "Invalid value for item name! This should be given in the form <Number> <Item Name>";
      } else {
        newValue = num + " " + foundItemName;
      } 
    }

    console.log(recipeData)

    // Update the recipe data
    recipeData[category][fieldName] = newValue;

    // If there is now only one result (Result 1), and no other recipes exist with the name of that result, change the recipe name and icon to that result
    if (fieldName == "Result 1" && recipeName.includes("New Recipe") && recipeData.recipeOptions["Result 2"] == "" && recipeData.recipeOptions["Result 3"] == "" && recipeData.recipeOptions["Result 4"] == "" && recipeData.recipeOptions["Result 5"] == "") {
      let result = newValue.split(" ").slice(1).join(" ");

      if (!recipeData[result]) {
        let data = await dbm.loadCollection('shop');
        if (data[result]) {
          recipeData.recipeOptions["Name"] = result;
          recipeData.recipeOptions["Icon"] = data[result].infoOptions.Icon;
          
          //Save new recipe
          await dbm.saveFile('recipes', result, recipeData);
          //Delete old recipe
          await dbm.docDelete('recipes', recipeName);

          //Return
          return `This is now a recipe to craft ${result}, name and icon have been changed accordingly.`;
        }   
      }
    }

    // If the recipe name has changed, save the new recipe and delete the old one
    if (fieldName == "Name") {
      //Save new recipe
      await dbm.saveFile('recipes', newValue, recipeData);
      //Delete old recipe
      await dbm.docDelete('recipes', recipeName);

      //Change the recipe name in the user's editingFields
      userData[userTag].editingFields["Recipe Edited"] = newValue;

      //For each character in the userdata, in their cooldowns.craftSlots fields, replace the old name with the new name if it exists
      let characters = Object.keys(userData);
      for (let i = 0; i < characters.length; i++) {
        if (userData[characters[i]].cooldowns && userData[characters[i]].cooldowns.craftSlots && characters[i] == "thegreatferret") {
          let slots = userData[characters[i]].cooldowns.craftSlots;
          console.log(slots);
          //Slots is a json, not an array
          let slotsKeys = Object.keys(slots);
          console.log(slotsKeys);
          for (let j = 0; j < slotsKeys.length; j++) {
            let key = slotsKeys[j];
            //Will either be recipeName or REPEAT_1_recipeName (repeat 2, etc), but you can't just check for inclusion because REPEAT_1_Woolen Tunic will include Wool
            if (key == recipeName) {
              slots[newValue] = slots[key];
              delete slots[key];
            }
            //Check if first 7 characters are REPEAT_ and if its followed by a number and underscore
            if (key.slice(0, 7) == "REPEAT_" && !isNaN(key.slice(7, 8)) && key.slice(8, 9) == "_" && key.slice(9) == recipeName) {
              let newKey = "REPEAT_" + key.slice(7, 8) + "_" + newValue;
              slots[newKey] = slots[key];
              delete slots[key];
            }
          }
          console.log(userData[characters[i]].cooldowns.craftSlots);
          userData[characters[i]].cooldowns.craftSlots = slots;
          console.log(userData[characters[i]].cooldowns.craftSlots);
        }
      }

      await dbm.saveCollection('characters', userData);

      return `Recipe name changed to ${newValue}`;
    } else {
      // Save the updated recipe data
      await dbm.saveFile('recipes', recipeName, recipeData);
    }
    
    
    return `Field ${fieldName} updated to ${newValue} for recipe ${recipeName}`;
  } 

  static async buyItem(itemName, charID, numToBuy, channelId) {
    let shopData = await dbm.loadCollection('shop');
    itemName = await this.findItemName(itemName, shopData);
    if (itemName == "ERROR") {
      return "Item not found!";
    }
    let itemData = shopData[itemName];
    let price = itemData.shopOptions["Price (#)"];

    if (price === "ERROR" || price === "No Price Item!" || price === undefined || price === null || price === NaN || !(price > 0) || price == "") {
      return "Not a valid item to purchase!";
    }
    
    let channels = itemData.shopOptions.Channels;
    if (channels.includes("#") && !channels.includes(channelId)) {
      return "This item is not available in this channel!";
    }

    let charCollection = 'characters';
    let charData = await dbm.loadFile(charCollection, charID);

    //Get user object from clientmanager
    let user = await clientManager.getUser(charData.numericID);

    let returnString;
    if (charData.balance < (price * numToBuy)) {
      returnString = "You do not have enough gold!";
      await dbm.saveFile(charCollection, charID, charData);
      return returnString;
    } else if (itemData.shopOptions["Need Role"]) {
      //Need Role is a string that may include several roles. Roles are enclosed in <@& and >, and there may be multiple roles. They may not be comma separated but commas and spaces may exist (though not always! Sometimes it will just be six roles one after another). Make sure at least one role is valid
      let roles = itemData.shopOptions["Need Role"].split("<@&");
      roles = roles.map(role => role.replace(">", ""));
      roles = roles.map(role => role.replace(",", ""));
      roles = roles.map(role => role.replace(/\s+/g, ""));
      roles = roles.filter(role => role.length > 0);

      //Check if the user has the role
      let hasRole = false;
      for (let i = 0; i < roles.length; i++) {
        if (user.roles.cache.some(role => role.id === roles[i])) {
          console.log(roles[i]);
          hasRole = true;
          break;
        }
      }
      console.log(hasRole)
      if (!hasRole) {
        return "You do not have the required role to buy this item! You must have one of the following role(s): " + itemData.shopOptions["Need Role"];
      }
    }
    charData.balance -= (price * numToBuy);

    if (!charData.inventory[itemName]) {
      charData.inventory[itemName] = 0;
    }
    charData.inventory[itemName] += numToBuy;

    returnString = "Succesfully bought " + numToBuy + " " + itemName;

    let roles = itemData.shopOptions["Give Role"].split("<@&");
    roles = roles.map(role => role.replace(">", ""));
    roles = roles.map(role => role.replace(",", ""));
    roles = roles.map(role => role.replace(/\s+/g, ""));
    roles = roles.filter(role => role.length > 0);
    for (let i = 0; i < roles.length; i++) {
      user.roles.add(roles[i]);
    }

    if (itemData.shopOptions["Give Role"] != "") {
      returnString += "\nAdded the following role(s): " + itemData.shopOptions["Give Role"];
    }

    await dbm.saveFile(charCollection, charID, charData);
    return returnString;
  }

  static async shopLayout(categoryToEdit, layoutString) {
    let shopData = await dbm.loadCollection("shop");
    if (categoryToEdit === "GENERAL") {
      let shopMap = {};
      let currCategory = null;
      const lines = layoutString.split('\n');
    
      for (let line of lines) {
        line = line.trim(); // Remove leading/trailing whitespace
    
        if (line.startsWith("**")) {
          // This is a category line
          const categoryName = line.substring(2, line.length - 2); // Remove leading/trailing **
    
          if (shopMap[categoryName]) {
            return ("ERROR: Duplicate category " + categoryName + "\n\nSubmitted layout string: \n " + layoutString);
          }
          currCategory = categoryName;
          shopMap[categoryName] = [];
        } else if (line.endsWith(";")) {
          if (currCategory === null) {
            return ("ERROR: Item outside a category." + "\n\nSubmitted layout string: \n " + layoutString);
          }

          let item = line.slice(0, -1); // Remove the trailing semicolon
          item = await this.findItemName(item, shopData);

          if (await this.getItemPrice(item) == "ERROR") {
            return ("ERROR! Item " + item + " is not in shop" + "\n\nSubmitted layout string: \n " + layoutString);
          } else if (await this.getItemPrice(item) == "No Price Item!") {
            return ("ERROR! Item " + item + " has no price" + "\n\nSubmitted layout string: \n " + layoutString);
          }
    
          for (const category in shopMap) {
            if (shopMap[category].includes(item)) {
              return ("ERROR: Duplicate item " + item + " in category " + category + "\n\nSubmitted layout string: \n " + layoutString);
            }
          }
          shopMap[currCategory].push(item);
        } else if (line !== "") {
          return ("ERROR: Invalid line: " + line + "\n\nSubmitted layout string: \n " + layoutString);
        }
      }
      for (const category in shopMap) {
        for (const item of shopMap[category]) {
          if (!shopData[item]) {
            return ("ERROR! Item " + item + " is not in shop" + "\n\nSubmitted layout string: \n " + layoutString);
          } else {
            shopData[item].category = category;
          }
        }
      }
      await dbm.saveCollection("shop", shopData);
      //Convert shopMap into an ordered array of its elements with a key to avoid alphabetizing
      let shopMapInMap = {};

      let shopArray = [];
      let key = 0;
      for (const category in shopMap) {
        shopArray[key] = {};
        shopArray[key][category] = shopMap[category];
        key++;
      }
      shopMapInMap.shopArray = shopArray;
      await dbm.saveFile("shoplayout", "shopLayout", shopMapInMap);

      let result = "Shop layout updated successfully. Categories and items added:\n";
      for (const category in shopMap) {
        result += `Category: ${category}\n`;
        for (const item of shopMap[category]) {
          result += `- ${item}\n`;
        }
      }
      return result;
    } else {
      let catMap = [];
      let onCategory = true;
    
      const lines = layoutString.split('\n');
    
      for (let line of lines) {
        line = line.trim();
    
        if (line.startsWith("**")) {
          // This is a category line
          const categoryMatch = line.match(/\*\*(.*?)\*\*/); // Extract the category name
          if (!categoryMatch) {
            return ("ERROR: Invalid category format." + "\n\nSubmitted layout string: \n " + layoutString);
          }
          const categoryName = categoryMatch[1];
    
          if (categoryName === categoryToEdit) {
            onCategory = true;
            catMap = [];
          } else {
            return ("ERROR: The provided category does not match the layout." + "\n\nSubmitted layout string: \n " + layoutString);
          }
        } else if (line.endsWith(";")) {
          // This is an item line
          if (!onCategory) {
            return ("ERROR: Items can only be within a category." + "\n\nSubmitted layout string: \n " + layoutString);
          }

          let item = line.slice(0, -1); // Remove the trailing semicolon
          item = await this.findItemName(item, shopData);

          if (await this.getItemPrice(item) == "ERROR") {
            return ("ERROR! Item " + item + " is not in shop" + "\n\nSubmitted layout string: \n " + layoutString);
          }

          catMap.push(item);
        } else if (line !== "") {
          return ("ERROR: Invalid line: " + line + "\n\nSubmitted layout string: \n " + layoutString);
        }
      }
      for (const item of catMap) {
        if (!shopData[item]) {
          return ("ERROR! Item " + item + " is not in shop" + "\n\nSubmitted layout string: \n " + layoutString);
        } else {
          shopData[item].infoOptions.Category = categoryToEdit;
        }
      }
      await dbm.saveCollection("shop", shopData);

      let layoutData = await dbm.loadFile("shoplayout", "shopLayout");
      // if (!layoutData.organizedLayout) {
      //   layoutData.organizedLayout = {};
      // }

      // layoutData.organizedLayout[categoryToEdit] = catMap;
      let shopArray = layoutData.shopArray;
      
      for (let i = 0; i < shopArray.length; i++) {
        if (shopArray[i].hasOwnProperty(categoryToEdit)) {
          shopArray[i][categoryToEdit] = catMap;
        }
      }

      layoutData = {};
      layoutData.shopArray = shopArray;

      await dbm.saveFile("shoplayout", "shopLayout", layoutData);

      let result = `Category "${categoryToEdit}" updated successfully. Items added:\n`;
      for (const item of catMap) {
        result += `- ${item}\n`;
      }
      return result;
    }
  }

  static async editShopLayoutPlaceholders(categoryToEdit) {
    if (categoryToEdit == "GENERAL") {
      let layoutData = await dbm.loadFile("shoplayout", "shopLayout");
      
      layoutData = await this.convertToShopMap(layoutData);

      let returnArray = [];
      returnArray[0] = categoryToEdit;
      let returnString = "";
      for (const category in layoutData) {
        returnString += "**" + category + "**\n";
        for (const item of layoutData[category]) {
          returnString += item + ";\n";
        }
        returnString += "\n";
      }
      returnArray[1] = returnString;
      return returnArray;
    } else {
      let layoutData = await dbm.loadFile("shoplayout", "shopLayout");
      layoutData = await this.convertToShopMap(layoutData);
      if (!layoutData[categoryToEdit]) {
        return "ERROR";
      }
      let returnArray = [];
      returnArray[0] = categoryToEdit;
      let returnString = "";
      returnString += "**" + categoryToEdit + "**\n";
      for (const item of layoutData[categoryToEdit]) {
        returnString += item + ";\n";
      }
      returnArray[1] = returnString;
      return returnArray;
    }
  }
}

module.exports = shop;
