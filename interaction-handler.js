const shop = require('./shop');
const char = require('./char');
const marketplace = require('./marketplace');
const admin = require('./admin');

// MODALS
addItem = async (interaction) => {
  // Get the data entered by the user
  const itemName = interaction.fields.getTextInputValue('itemname');
  let itemIcon = interaction.fields.getTextInputValue('itemicon');
  const itemPrice = interaction.fields.getTextInputValue('itemprice') || undefined;
  const itemDescription = interaction.fields.getTextInputValue('itemdescription');
  const itemCategory = interaction.fields.getTextInputValue('itemcategory');
  
  colonCounter = 0;
  for (let i = 0; i < itemIcon.length; i++) {
    if (itemIcon[i] == ":") {
      colonCounter++;
      if (colonCounter >= 3) {
        await interaction.reply({content: `Item creation failed. Invalid icon format.`, ephemeral: true});
        return;
      }
    }
  }

  // Call the addItem function from the Shop class with the collected information
  if (itemName && parseInt(itemPrice)) {
    shop.addItem(itemName, { Icon: itemIcon, Price: parseInt(itemPrice), Description: itemDescription, Category: itemCategory });
    await interaction.reply(`Item '${itemName}' has been added to the item list. Use /shoplayout or ping Alex to add to shop.`);
  } else {
    // Handle missing information
    await interaction.reply({content: 'Item creation failed. Please provide a name and integer price.', ephemeral: true});
  }
};
// {
// // addUseCase = async (interaction) => {
// //   // Get the data entered by the user
// //   const itemName = interaction.fields.getTextInputValue('itemname');
// //   const itemUseType = interaction.fields.getTextInputValue('itemusetype');
// //   let itemGives;
// //   if (interaction.fields.getField("itemgives").value) {
// //     itemGives = interaction.fields.getTextInputValue('itemgives');
// //   } else {
// //     itemGives = "Empty Field";
// //   }
// //   let itemTakes;
// //   if (interaction.fields.getField("itemtakes").value) {
// //     itemTakes = interaction.fields.getTextInputValue('itemtakes');
// //   } else {
// //     itemTakes = "Empty Field";
// //   }
// //   let itemCountdown;
// //   if (interaction.fields.getField("itemcountdown").value) {
// //     itemCountdown = interaction.fields.getTextInputValue('itemcountdown');
// //   } else {
// //     itemCountdown = "Empty Field";
// //   }

// //   // Call the addItem function from the Shop class with the collected information
// //   if (itemName && itemUseType && itemGives) {
// //     let toReturn;
// //     if (itemTakes != "Empty Field") {
// //       if (itemCountdown != "Empty Field") {
// //         toReturn = await shop.addUseCaseWithPriceAndCountdown(itemName, itemUseType, itemGives, itemTakes, itemCountdown);
// //       } else {
// //         toReturn = await shop.addUseCaseWithPrice(itemName, itemUseType, itemGives, itemTakes);
// //       }
// //     } else {
// //       if (itemCountdown != "Empty Field") {
// //         toReturn = await shop.addUseCaseWithCountdown(itemName, itemUseType, itemGives, itemCountdown);
// //       } else {
// //         toReturn = await shop.addUseCase(itemName, itemUseType, itemGives);
// //       }
// //     }
// //     interaction.reply(toReturn);
// //   } else {
// //     // Handle missing information
// //     await interaction.reply('Item use creation failed. Please give a name, use type and record what using the item gives.');
// //   }
// // };

// // addRecipe = async (interaction) => {
// //   // Get the data entered by the user
// //   const itemName = interaction.fields.getTextInputValue('itemname');
// //   const itemTakes = interaction.fields.getTextInputValue('itemtakes');
// //   const itemCrafttime = interaction.fields.getTextInputValue('itemcrafttime');

// //   // Call the addItem function from the Shop class with the collected information
// //   if (itemName && itemTakes && itemCrafttime) {
// //     toReturn = await shop.addRecipe(itemName, itemTakes, itemCrafttime);
// //     interaction.reply(toReturn);
// //   } else {
// //     // Handle missing information
// //     await interaction.reply('Item use creation failed. Please give a name, what the item takes, and enter a craft time.');
// //   }
// // };

// // addUseDescription = async (interaction) => {
// //   const itemName = interaction.fields.getTextInputValue('itemname');
// //   const itemDescription = interaction.fields.getTextInputValue('itemdescription');

// //   // Call the addItem function from the Shop class with the collected information
// //   if (itemName && itemDescription) {
// //     let toReturn;
// //     toReturn = await shop.addUseDescription(itemName, itemDescription);
// //     interaction.reply(toReturn);
// //   } else {
// //     // Handle missing information
// //     await interaction.reply('Item description creation failed. Please give a name and description.');
// //   }
// // }
// }

newChar = async (interaction) => {
  // Get the data entered by the user
  const userID = interaction.user.tag;
  const numericID = interaction.user.id;
  const charName = interaction.fields.getTextInputValue('charname');
  const charBio = interaction.fields.getTextInputValue('charbio');

  // const eastAngliaRole = interaction.guild.roles.cache.find(role => role.name === "East Anglia");
  // const eastAngliaID = eastAngliaRole.id;
  // const gwyneddRole = interaction.guild.roles.cache.find(role => role.name === "Gwynedd");
  // const gwyneddID = gwyneddRole.id;
  // const wessexRole = interaction.guild.roles.cache.find(role => role.name === "Wessex");
  // const wessexID = wessexRole.id;

  //var userKingdom = "Error";

  // Check the user's roles
  // const userRoles = interaction.member.roles.cache;
  // if (userRoles.has(eastAngliaID)) {
  //   userKingdom = "East Anglia";
  // }
  // if (userRoles.has(gwyneddID)) {
  //   if (userKingdom != "Error") {
  //     userKingdom = "WHY DO YOU HAVE TWO KINGDOMS? SERSKI THIS IS A PROBLEM WE DO NOT ALLOW DUAL CITIZENS HERE";
  //   } else {
  //     userKingdom = "Gwynedd";
  //   }
  // } else if (userRoles.has(wessexID)) {
  //   if (userKingdom != "Error") {
  //     userKingdom = "WHY DO YOU HAVE TWO KINGDOMS? SERSKI THIS IS A PROBLEM WE DO NOT ALLOW DUAL CITIZENS HERE";
  //   } else {
  //     userKingdom = "Wessex";
  //   }
  // }

  // Call the newChar function from the char class with the info
  if (charName && charBio) {
    char.newChar(userID, charName, charBio, numericID);
    await interaction.reply(`Character '${charName}' has been created.`);
  } else {
    // Handle missing information
    await interaction.reply({content: 'Character creation failed. Please provide a name and bio.', ephemeral: true});
  }
};

shopLayout = async (interaction) => {
  const categoryToEdit = interaction.fields.getTextInputValue('categorytoedit');
  const layoutString = interaction.fields.getTextInputValue('layoutstring');

  await interaction.reply(await shop.shopLayout(categoryToEdit, layoutString));
}

//BUTTONS
shopSwitch = async (interaction) => {
  let [edittedEmbed, rows] = await shop.createShopEmbed(interaction.customId.slice(11), interaction);
  console.log(interaction);
  await interaction.update({ embeds: [edittedEmbed], components: rows});
}
incomeSwitch = async (interaction) => {
  interaction.deferUpdate();
  let [edittedEmbed, rows] = await admin.allIncomes(interaction.customId.slice(11));
  await interaction.editReply({ embeds: [edittedEmbed], components: rows});
}
salesSwitch = async (interaction) => {
  let [edittedEmbed, rows] = await marketplace.createSalesEmbed(interaction.customId.slice(11));
  await interaction.update({ embeds: [edittedEmbed], components: rows});
}
allItemSwitch = async (interaction) => {
  let [edittedEmbed, rows] = await shop.createAllItemsEmbed(interaction.customId.slice(11), interaction);
  await interaction.update({ embeds: [edittedEmbed], components: rows});
}
itemSwitch = async (interaction) => {
  let [edittedEmbed, rows] = await shop.editItemMenu(interaction.customId.substring(12), interaction.customId[11], interaction.user.tag);
  await interaction.update({ embeds: [edittedEmbed], components: [rows]});
}
balaSwitch = async (interaction) => {
  let [edittedEmbed, rows] = await char.balanceAll(interaction.customId[11])
  await interaction.update({ embeds: [edittedEmbed], components: rows});
}
helpSwitch = async (interaction) => {
  //This one is odder, will either have the 11th character be "A" or "R" for admin or regular help. The 12th character will be the page number.
  let isAdmin = false;
  if (interaction.customId[11] == "A") {
    isAdmin = true;
  } else if (interaction.customId[11] == "R") {
    isAdmin = false;
  } else {
    await interaction.reply("Error in helpSwitch");
  }
  let [edittedEmbed, rows] = await admin.generalHelpMenu(interaction.customId[12], isAdmin);
  await interaction.update({ embeds: [edittedEmbed], components: rows});
}

exports.handle = async (interaction) => {
  console.log(interaction.customId);
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'additemmodal') {
      addItem(interaction);
    }
    if (interaction.customId === 'newcharmodal') {
      newChar(interaction);
    }
    // if (interaction.customId === 'addusecasemodal') {
    //   addUseCase(interaction);
    // }
    // if (interaction.customId === 'addrecipemodal') {
    //   addRecipe(interaction);
    // }
    if (interaction.customId === 'shoplayoutmodal') {
      shopLayout(interaction);
    }
    //Check if it starts with editmapaboutmodal
    if (interaction.customId.substring(0, 17) === 'editmapaboutmodal') {
      admin.editMapAbout(interaction);
    }
    // if (interaction.customId === 'addusedescriptionmodal') {
    //   addUseDescription(interaction);
    // }
  } else if (interaction.isButton()) {
    if (interaction.customId.substring(0, 11) == 'switch_page') {
      shopSwitch(interaction);
    } else if (interaction.customId.substring(0, 11) == 'switch_sale') {
      salesSwitch(interaction);
    } else if (interaction.customId.substring(0, 11) == 'switch_item') {
      itemSwitch(interaction);
    } else if (interaction.customId.substring(0, 11) == 'switch_help') {
      helpSwitch(interaction);
    } else if (interaction.customId.substring(0, 11) == 'switch_inco') {
      incomeSwitch(interaction);
    } else if (interaction.customId.substring(0, 11) === 'switch_alit') {
      allItemSwitch(interaction);
    } else if (interaction.customId.substring(0, 11) === 'switch_bala') {
      balaSwitch(interaction);
    } else if (interaction.customId.substring(0, 11) === 'partySelect') {
      await admin.selectParty(interaction);
    }
  } else if (interaction.isSelectMenu()) {
    if (interaction.customId === 'shireSelect') {
      await admin.selectShire(interaction);
    }
    if (interaction.customId === 'resourceSelect') {
      await admin.selectResource(interaction);
    }
    if (interaction.customId === 'tradeNodeSelect') {
      await admin.selectTradeNode(interaction);
    }
    if (interaction.customId === 'classSelect') {
      await admin.selectClass(interaction);
    }
  }
}

