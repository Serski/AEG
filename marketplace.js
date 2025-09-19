const dbm = require('./database-manager'); // Importing the database manager
const shop = require('./shop'); // Importing the shop module
const { getCharModule } = require('./charModule');
const char = getCharModule(); // Importing the character manager
const clientManager = require('./clientManager'); // Importing the client manager
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
class marketplace {
  static marketplaceCache = null;
  // Maps sale IDs to { category, itemName } to avoid O(n) scans when locating a sale
  static saleIndex = {};

  /**
   * Loads marketplace data from the flat database format and rebuilds the in-memory
   * cache and sale index. Each sale is stored as an individual row keyed by sale ID
   * with its category and item name, so this method reconstructs a nested
   * {category -> itemName -> saleID} structure and populates an index mapping sale IDs
   * to their locations. Subsequent calls will return the cached data unless a refresh is requested.
   * @param {boolean} refresh - force reload even if cache exists
   * @returns {Promise<{idfile: object, marketplace: object}>}
  */
  static async loadMarketplace(refresh = false) {
    if (marketplace.marketplaceCache && !refresh) {
      return marketplace.marketplaceCache;
    }
    console.log('Loading marketplace data from DB…');
    const rows = await dbm.loadCollection('marketplace');
    const { idfile = {}, ...salesRows } = rows;
    const mktData = { idfile, marketplace: {} };
    let index = idfile.saleIndex ? idfile.saleIndex : {};
    const hasPersistedIndex = Boolean(idfile.saleIndex);
    for (const [id, row] of Object.entries(salesRows)) {
      const { category, itemName, ...sale } = row;
      mktData.marketplace[category] = mktData.marketplace[category] || {};
      mktData.marketplace[category][itemName] = mktData.marketplace[category][itemName] || {};
      mktData.marketplace[category][itemName][id] = sale;
      if (!hasPersistedIndex) {
        index[id] = { category, itemName };
      }
    }
    if (!hasPersistedIndex) {
      mktData.idfile.saleIndex = index;
      await dbm.updateCollectionRecord('marketplace', 'idfile', mktData.idfile);
    }
    marketplace.marketplaceCache = mktData;
    marketplace.saleIndex = index;
    console.log('Marketplace data loaded and cached');
    return mktData;
  }

  /**Function for a player to post a sale.
   * Will take the number of items, the item name, and the price they want to sell it for.
   * Will also be passed their user ID
   * Will load the character.json file and check if they have enough of the item
   * If they do, it will take the items from their inventory and add them to the marketplace under a created unique ID
   * Items will be added to the marketplace according to their item name and category- i.e. all iron swords will be next to each other, and the iron swords will be next to steel swords
   * */ 
  static async postSale(numberItems, itemName, price, sellerID) {
    if (!Number.isInteger(numberItems) || numberItems <= 0 || !Number.isInteger(price) || price <= 0) {
      return "Number of items and price must be positive integers.";
    }
    // Ensure marketplace cache and lastID are current
    await marketplace.loadMarketplace();
    const shopData = await shop.getShopData();

    // Load the character file
    const [sellerIDStr, charData] = await char.findPlayerData(sellerID);
    const mktData = marketplace.marketplaceCache;
    // Find the item name using shop.findItemName
    itemName = await shop.findItemName(itemName, shopData);
    if (itemName == "ERROR") {
      return "That item doesn't exist!";
    }

    if (shopData[itemName].infoOptions["Transferrable (Y/N)"] == "No") {
      return "That item is not transferrable!";
    }

    // Check if they have enough of the item
    if (!charData.inventory[itemName] || charData.inventory[itemName] < numberItems) {
      return "You don't have enough of that item to sell it!";
    }
    // Take the items from their inventory
    charData.inventory[itemName] -= numberItems;
    // Add them to the marketplace under a created unique ID, one greater than the last. The last will be under lastID in marketplace.json
    mktData.idfile = mktData.idfile || {};
    mktData.idfile.lastID = mktData.idfile.lastID || 1000;
    const saleID = mktData.idfile.lastID + 1;
    mktData.idfile.lastID = saleID;
    // Add the item to the marketplace according to its item name and category. Category can be found in shop.getItemCategory
    const itemCategory = await shop.getItemCategory(itemName, shopData);
    mktData.idfile.saleIndex = mktData.idfile.saleIndex || {};
    mktData.idfile.saleIndex[saleID] = { category: itemCategory, itemName };
    mktData.marketplace = mktData.marketplace || {};
    mktData.marketplace[itemCategory] = mktData.marketplace[itemCategory] || {};
    mktData.marketplace[itemCategory][itemName] = mktData.marketplace[itemCategory][itemName] || {};

    const saleRecord = {
      sellerID: String(sellerID),
      price,
      number: numberItems
    };
    mktData.marketplace[itemCategory][itemName][saleID] = saleRecord;
    // Save the character.json file and update marketplace data in parallel.
    // Single-row updates avoid rewriting the entire collection, reducing I/O and contention.
    await Promise.all([
      char.updatePlayer(sellerIDStr, charData),
      dbm.updateCollectionRecord('marketplace', 'idfile', mktData.idfile), // persist new lastID only
      dbm.updateCollectionRecord('marketplace', String(saleID), { category: itemCategory, itemName, ...saleRecord }) // write just the new sale
    ]);
    // Update cache and index without reloading the whole table
    marketplace.marketplaceCache = mktData;
    marketplace.saleIndex[saleID] = { category: itemCategory, itemName };
    // Create an embed to return on success. Will just say @user listed **numberItems :itemIcon: itemName** to the **/sales** page for <:Gold:1232097113089904710>**price**.
    let embed = new EmbedBuilder();
    embed.setDescription(`<@${sellerID}> listed **${numberItems} ${await shop.getItemIcon(itemName, shopData)} ${itemName}** to the **/sales** page for ${clientManager.getEmoji("Gold")}**${price}**.`);
    return embed;
  }

  /**
   * Create a embed list of sales. Will take page number and return embed and action rows
   */
  static async createSalesEmbed(page) {
    page = Number(page);
    // Load cached marketplace and shop data in parallel
    const [marketData, shopData] = await Promise.all([
      marketplace.loadMarketplace(),
      shop.getShopData()
    ]);

    // Max items allowed per page
    const maxItemsPerPage = 25;
    let currentPage = {};
    let allPages = [];
    let currentPageLength = 0;
    
    for (const category in marketData.marketplace) {
        const categoryItems = marketData.marketplace[category];
        for (const itemName in categoryItems) {
            const sales = categoryItems[itemName];
            const numberOfSales = Object.keys(sales).length;
            let salesProcessed = 0;
    
            // If this item has more sales than can fit on a single page, split it
            while (salesProcessed < numberOfSales) {
                // Calculate how many sales can fit on the current page
                const remainingSpaceOnPage = maxItemsPerPage - currentPageLength;
                const salesToAdd = Math.min(remainingSpaceOnPage, numberOfSales - salesProcessed);
                
                // Add a portion of sales to the current page
                const salesSlice = Object.fromEntries(
                    Object.entries(sales).slice(salesProcessed, salesProcessed + salesToAdd)
                );
    
                currentPage[itemName] = currentPage[itemName] || {};
                Object.assign(currentPage[itemName], salesSlice);
                currentPageLength += salesToAdd;
                salesProcessed += salesToAdd;
    
                // If the current page is full, move to the next page
                if (currentPageLength === maxItemsPerPage) {
                    allPages.push(currentPage);
                    currentPage = {};
                    currentPageLength = 0;
                }
            }
        }
    }
    
    // Add any remaining items to the pages
    if (currentPageLength > 0) {
        allPages.push(currentPage);
    }
    
    const totalPages = allPages.length;
    const sales = allPages[page - 1];

    //Create embed
    let embed = new EmbedBuilder();
    embed.setTitle(clientManager.getEmoji("Gold") + 'Sales');
    embed.setColor(0x36393e);

    let descriptionText = '';

    // Create the formatted line. `ID` :icon: **`Number ItemName [ALIGNSPACES]`**`Price`**<:Gold:1232097113089904710>, with coin and price aligned to right side (alignSpaces used to separate them and ensure all the coins and prices are aligned )
    for (const itemName in sales) {
      const salesList = sales[itemName];
      for (const saleID in salesList) {
        const sale = salesList[saleID];
        const number = sale.number;
        const item = itemName;
        const icon = await shop.getItemIcon(itemName, shopData);
        const price = sale.price;
        let alignSpaces = ' '
        if ((20 - item.length - ("" + price + "" + number).length) > 0) {
          alignSpaces = ' '.repeat(20 - item.length - ("" + price + "" + number).length);
        }
        descriptionText += `\`${saleID}\` ${icon} **\`${number} ${item}${alignSpaces}${price}\`**${clientManager.getEmoji("Gold")}\n`;
      }
    }
    
    descriptionText += '\n';
    // Set the accumulated description
    embed.setDescription(descriptionText);

    if (totalPages > 1) {
      embed.setFooter({text: `/buysale \nPage ${page} of ${totalPages}`});
    } else {
      embed.setFooter({text: `/buysale`});
    }

    const rows = [];

    // Create a "Previous Page" button
    const prevButton = new ButtonBuilder()
      .setCustomId('switch_sale' + (page-1))
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary);

    // Disable the button on the first page
    if (page == 1) {
      prevButton.setDisabled(true);
    }

    const nextButton = new ButtonBuilder()
          .setCustomId('switch_sale' + (page+1))
          .setLabel('>')
          .setStyle(ButtonStyle.Secondary);

    // Create a "Next Page" button if not on the last page
    if (page == totalPages) {
      nextButton.setDisabled(true);
    }
    
    rows.push(new ActionRowBuilder().addComponents(prevButton, nextButton));

    return [embed, rows];
  }
 

  //Create a one page sales embed of just the sales for one player
  static async showSales(sellerID, page) {
    // Load cached marketplace and shop data in parallel
    const [marketData, shopData] = await Promise.all([
      marketplace.loadMarketplace(),
      shop.getShopData()
    ]);
    // Create an embed to return on success. Will just say @user has listed **numberItems :itemIcon: itemName** for <:Gold:1232097113089904710>**price**.
    let embed = new EmbedBuilder();
    const playerUser = await clientManager.getUser(sellerID);
    const playerTag = playerUser ? playerUser.user.tag : sellerID;
    embed.setTitle(`${playerTag}'s Sales`);
    embed.setColor(0x36393e);
    let descriptionText = '';
    let n = 1;
    for (const category in marketData.marketplace) {
      const categoryItems = marketData.marketplace[category];
      for (const itemName in categoryItems) {
        const sales = categoryItems[itemName];
        for (const saleID in sales) {
          const sale = sales[saleID];
          if (sale.sellerID == sellerID) {
            const number = sale.number;
            const item = itemName;
            const icon = await shop.getItemIcon(itemName, shopData);
            const price = sale.price;
            let alignSpaces = ' '
            if ((30 - item.length - ("" + price + "" + number).length) > 0) {
              alignSpaces = ' '.repeat(30 - item.length - ("" + price + "" + number).length);
            }
            descriptionText += `\`${saleID}\` ${icon} **\`${number} ${item}${alignSpaces}${price}\`**${clientManager.getEmoji("Gold")}\n`;
            if (descriptionText.length > 3000) {
              if (page == n) {
                descriptionText += '\n';
                embed.setDescription(descriptionText);
                embed.setFooter({text: `Page ${n}`});
                return embed;
              } else {
                n++;
                descriptionText = '';
              }
            }
          }
        }
      }
    }
    descriptionText += '\n';
    embed.setDescription(descriptionText);
    embed.setFooter({text: `Page ${n}`});
    return embed;
  }

  //Buy a sale. Send the money from the buyer to the seller, and give the buyer the items.
  //If the seller is buying their own sale, merely give them back their items; no need to check their money.
  static async buySale(saleID, buyerID) {
    const marketData = await marketplace.loadMarketplace();
    const shopData = await shop.getShopData();

    // Locate the sale using the index
    const indexEntry = marketplace.saleIndex[saleID];
    if (!indexEntry) {
      return "That sale doesn't exist!";
    }
    const { category: foundCategory, itemName: foundItemName } = indexEntry;
    const sale = marketData.marketplace?.[foundCategory]?.[foundItemName]?.[saleID];
    if (!sale) {
      return "That sale doesn't exist!";
    }

    // Load buyer and seller characters in parallel
    const [[buyerIDStr, buyerChar], [sellerIDStr, sellerChar]] = await Promise.all([
      char.findPlayerData(buyerID),
      char.findPlayerData(sale.sellerID)
    ]);

    // If the buyer is the seller, give them back the items
    if (sale.sellerID == buyerID) {
      buyerChar.inventory[foundItemName] = buyerChar.inventory[foundItemName] || 0;
      buyerChar.inventory[foundItemName] += sale.number;
      delete marketData.marketplace[foundCategory][foundItemName][saleID];
      delete marketplace.saleIndex[saleID];
      if (marketData.idfile && marketData.idfile.saleIndex) {
        delete marketData.idfile.saleIndex[saleID];
      }
      // Persist buyer file and drop the single sale record instead of rewriting
      // the entire marketplace collection.
      await Promise.all([
        char.updatePlayer(buyerIDStr, buyerChar),
        dbm.removeCollectionRecord('marketplace', String(saleID)),
        dbm.updateCollectionRecord('marketplace', 'idfile', marketData.idfile)
      ]);
      marketplace.marketplaceCache = marketData;
      let embed = new EmbedBuilder();
      embed.setDescription(`<@${buyerID}> bought **${sale.number} ${await shop.getItemIcon(foundItemName, shopData)} ${foundItemName}** back from themselves. It was listed for ${clientManager.getEmoji("Gold")}**${sale.price}**.`);
      return embed;
    }

    // Ensure the buyer has enough money
    if (buyerChar.balance < sale.price) {
      return "You don't have enough money to buy that!";
    }

    // Exchange currency
    buyerChar.balance -= sale.price;
    sellerChar.balance += sale.price;

    // Transfer items
    buyerChar.inventory[foundItemName] = buyerChar.inventory[foundItemName] || 0;
    buyerChar.inventory[foundItemName] += Number(sale.number);

    // Remove the sale from the marketplace and index
    delete marketData.marketplace[foundCategory][foundItemName][saleID];
    delete marketplace.saleIndex[saleID];
    if (marketData.idfile && marketData.idfile.saleIndex) {
      delete marketData.idfile.saleIndex[saleID];
    }

    // Incrementally persist changes: update both character files and delete just
    // the sold listing record from storage.
    await Promise.all([
      char.updatePlayer(buyerIDStr, buyerChar),
      char.updatePlayer(sellerIDStr, sellerChar),
      dbm.removeCollectionRecord('marketplace', String(saleID)),
      dbm.updateCollectionRecord('marketplace', 'idfile', marketData.idfile)
    ]);
    // Update in-memory cache after targeted deletion
    marketplace.marketplaceCache = marketData;

    let embed = new EmbedBuilder();
    embed.setDescription(`<@${buyerID}> bought **${sale.number} ${await shop.getItemIcon(foundItemName, shopData)} ${foundItemName}** from <@${sale.sellerID}> for ${clientManager.getEmoji("Gold")}**${sale.price}**.`);
    return embed;
  }

  //Inspect a sale. Will take the saleID and return an embed with the sale information
  static async inspectSale(saleID) {
    const shopData = await shop.getShopData();
    // Search through marketData for the saleID
    const [itemCategory, itemName, sale] = await marketplace.getSale(saleID);
    // If the saleID doesn't exist, return an error
    if (!sale) {
      return "That sale doesn't exist!";
    }
    // Create an embed to return on success.
    let embed = new EmbedBuilder();
    embed.setTitle(`Sale ${saleID}`);
    embed.setColor(0x36393e);
    embed.setDescription(`**${sale.number} ${await shop.getItemIcon(itemName, shopData)} ${itemName}** for ${clientManager.getEmoji("Gold")}**${sale.price}**.`);
    const sellerUser = await clientManager.getUser(sale.sellerID);
    const sellerTag = sellerUser ? sellerUser.user.tag : sale.sellerID;
    embed.setFooter({text: `Seller: ${sellerTag}`});
    return embed;
  }

  //Get itemcategory, itemname and sale from saleID
  static async getSale(saleID, marketData = null) {
    // Ensure marketplace cache and index are loaded
    await marketplace.loadMarketplace();
    const data = marketData ?? marketplace.marketplaceCache;

    const entry = marketplace.saleIndex[saleID];
    if (!entry) {
      return "That sale doesn't exist!";
    }

    const sale = data.marketplace?.[entry.category]?.[entry.itemName]?.[saleID];
    if (!sale) {
      return "That sale doesn't exist!";
    }

    return [entry.category, entry.itemName, sale];
  }

  //Invalidate cached collections
  static invalidateCaches() {
    marketplace.marketplaceCache = null;
    marketplace.saleIndex = {};
  }
}

module.exports = marketplace;
