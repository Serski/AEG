const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const factionProjects = require('../../shared/faction-projects');
const resources = require('../../resources.json');

const CATEGORY_ORDER = ['infrastructure', 'monuments', 'classified'];
const CATEGORY_LABELS = {
  infrastructure: 'Infrastructure',
  monuments: 'Monuments',
  classified: 'Classified'
};
const SAFE = process.env.AEG_SAFE_COMPONENTS !== 'false';

function hasNovaRole(member) {
  if (!member || !member.roles || !member.roles.cache) {
    return false;
  }
  const roleId = process.env.NOVA_ROLE_ID;
  if (roleId && member.roles.cache.has(roleId)) {
    return true;
  }
  const configuredName = (process.env.NOVA_ROLE_NAME || 'Nova').toLowerCase();
  return member.roles.cache.some((role) => role.name.toLowerCase() === configuredName);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function summarizeProject(project) {
  const segments = [];
  if (project.description) {
    segments.push(project.description);
  }
  const { percent, goal } = computeProgress(project);
  if (goal > 0) {
    segments.push(`**Progress:** ${percent}%`);
  }
  const resourceLines = Object.entries(project.resources || {})
    .map(([name, data]) => formatResourceLine(name, data))
    .filter(Boolean);
  if (resourceLines.length) {
    segments.push(resourceLines.join('\n'));
  }
  return segments.join('\n\n');
}

function computeProgress(project) {
  let contributed = 0;
  let goal = 0;
  for (const resource of Object.values(project.resources || {})) {
    const resourceGoal = Number(resource.goal || 0);
    if (resourceGoal <= 0) {
      continue;
    }
    goal += resourceGoal;
    const contributedValue = Number(resource.contributed || 0);
    contributed += Math.min(contributedValue, resourceGoal);
  }
  const percent = goal > 0 ? Math.min(100, Math.round((contributed / goal) * 100)) : 100;
  return { percent, goal, contributed };
}

function formatResourceLine(name, data) {
  const resourceInfo = resources[name];
  const emoji = resourceInfo && resourceInfo.emoji ? `${resourceInfo.emoji} ` : '';
  const goal = Number(data.goal || 0);
  const contributed = Number(data.contributed || 0);
  const progress = goal > 0 ? `${formatNumber(contributed)} / ${formatNumber(goal)}` : formatNumber(contributed);
  const percentage = goal > 0 ? ` (${Math.min(100, Math.round((Math.min(contributed, goal) / goal) * 100))}%)` : '';
  return `${emoji}${name}: ${progress}${percentage}`;
}

async function buildNovaView(categoryKey) {
  const faction = await factionProjects.getFaction('nova');
  if (!faction) {
    throw new Error('Nova faction data is not configured.');
  }
  const categories = faction.categories || {};
  const availableCategories = CATEGORY_ORDER.filter((key) => Array.isArray(categories[key]) && categories[key].length > 0);
  const fallbackCategory = availableCategories[0] || Object.keys(categories)[0];
  const activeCategory = categories[categoryKey] ? categoryKey : fallbackCategory;
  const projects = await factionProjects.getCategoryProjects('nova', activeCategory);

  const embed = new EmbedBuilder()
    .setTitle(`${faction.name || 'Nova Initiative'} — ${CATEGORY_LABELS[activeCategory] || 'Projects'}`)
    .setDescription(faction.intro || 'Faction projects currently accepting contributions.')
    .setColor(faction.color || 0x5865f2);
  if (faction.crest) {
    embed.setThumbnail(faction.crest);
  }
  if (Array.isArray(projects)) {
    for (const project of projects) {
      embed.addFields({
        name: project.name || 'Project',
        value: summarizeProject(project) || 'No details available.',
        inline: false
      });
    }
  }
  embed.setFooter({ text: 'Use the buttons below to review categories or contribute resources.' });

  const navRow = buildCategoryRow(activeCategory, availableCategories.length ? availableCategories : CATEGORY_ORDER.filter((key) => categories[key]));
  const donateRows = buildDonateRows(projects || [], activeCategory);

  return {
    category: activeCategory,
    embed,
    components: [navRow, ...donateRows]
  };
}

function buildCategoryRow(activeCategory, categories) {
  const row = new ActionRowBuilder();
  const unique = new Set(categories && categories.length ? categories : CATEGORY_ORDER);
  for (const category of CATEGORY_ORDER) {
    if (!unique.has(category)) continue;
    const label = CATEGORY_LABELS[category] || category;
    const button = new ButtonBuilder()
      .setCustomId(`nova:category:${category}`)
      .setLabel(label)
      .setStyle(category === activeCategory ? ButtonStyle.Primary : ButtonStyle.Secondary);
    row.addComponents(button);
  }
  return row;
}

function buildDonateRows(projects, categoryKey) {
  const rows = [];
  if (!Array.isArray(projects)) {
    return rows;
  }
  let currentRow = new ActionRowBuilder();
  for (const project of projects) {
    const labelBase = project.shortLabel || project.name || 'Donate';
    const truncated = labelBase.length > 18 ? `${labelBase.slice(0, 15)}…` : labelBase;
    const button = new ButtonBuilder()
      .setCustomId(`nova:donate:${categoryKey}:${project.id}`)
      .setLabel(`Donate · ${truncated}`)
      .setStyle(ButtonStyle.Success);
    if (currentRow.components.length === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    currentRow.addComponents(button);
  }
  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }
  return rows;
}

function buildDonateModal(categoryKey, project) {
  const resourceOptions = Object.keys(project.resources || {});
  const modal = new ModalBuilder()
    .setCustomId(`nova:donateModal:${categoryKey}:${project.id}`)
    .setTitle(`Donate — ${project.name}`);

  const resourceInput = new TextInputBuilder()
    .setCustomId('novaResource')
    .setLabel('Resource')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(resourceOptions.join(', ') || 'Wood')
    .setRequired(true);

  const amountInput = new TextInputBuilder()
    .setCustomId('novaAmount')
    .setLabel('Amount')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('100')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(resourceInput),
    new ActionRowBuilder().addComponents(amountInput)
  );

  return modal;
}

async function updateViewFromButton(interaction, categoryKey) {
  const view = await buildNovaView(categoryKey);
  const payload = { embeds: [view.embed], components: view.components };
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }
  await interaction.editReply(payload).catch(() => {});
}

async function updateViewFromModal(interaction, categoryKey) {
  const view = await buildNovaView(categoryKey);
  const payload = { embeds: [view.embed], components: view.components };
  if (SAFE) {
    if (interaction.message?.interaction) {
      await interaction.message.interaction.editReply(payload).catch(async () => {
        await interaction.message.edit(payload).catch(() => {});
      });
      return;
    }
  }
  if (interaction.message) {
    await interaction.message.edit(payload).catch(() => {});
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nova')
    .setDescription('Review Nova faction projects and contribute resources.'),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used inside a guild.', flags: 64 });
      return;
    }
    if (!hasNovaRole(interaction.member)) {
      await interaction.reply({ content: 'You must hold the Nova role to view faction projects.', flags: 64 });
      return;
    }
    await interaction.deferReply({ flags: 64 });
    try {
      const view = await buildNovaView('infrastructure');
      await interaction.editReply({ embeds: [view.embed], components: view.components });
    } catch (err) {
      console.error('Failed to render Nova projects:', err);
      await interaction.editReply({ content: 'Unable to load Nova projects right now. Please try again later.' });
    }
  },
  async handleCategory(interaction) {
    const [, , categoryKey] = interaction.customId.split(':');
    await updateViewFromButton(interaction, categoryKey);
  },
  async handleDonate(interaction) {
    const [, , categoryKey, projectId] = interaction.customId.split(':');
    const projects = await factionProjects.getCategoryProjects('nova', categoryKey);
    const project = Array.isArray(projects) ? projects.find((entry) => entry.id === projectId) : null;
    if (!project) {
      await interaction.reply({ content: 'That project is no longer available.', flags: 64 });
      return;
    }
    const modal = buildDonateModal(categoryKey, project);
    await interaction.showModal(modal).catch(() => {});
  },
  async handleDonationModal(interaction) {
    const [, , categoryKey, projectId] = interaction.customId.split(':');
    const resource = interaction.fields.getTextInputValue('novaResource') || '';
    const amount = interaction.fields.getTextInputValue('novaAmount') || '';
    try {
      const result = await factionProjects.donate('nova', categoryKey, projectId, resource, amount, {
        userId: interaction.user.id
      });
      await updateViewFromModal(interaction, categoryKey);
      const resourceLabel = result.resourceKey;
      const amountLabel = formatNumber(result.amount);
      await interaction.reply({
        content: `Recorded donation of ${amountLabel} ${resourceLabel} to ${result.project.name}.`,
        flags: 64
      });
    } catch (err) {
      await interaction.reply({ content: `Donation failed: ${err.message}`, flags: 64 });
    }
  }
};
