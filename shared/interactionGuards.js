const { PermissionFlagsBits } = require('discord.js');

// List of Discord user IDs allowed to run admin commands
const adminUsers = ['378219232577716226'];

async function replyOrFollowUp(interaction, payload) {
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
    } else {
        await interaction.reply(payload);
    }
}

async function ensureGuildContext(interaction) {
    if (interaction.inGuild && interaction.inGuild()) {
        return true;
    }
    if (interaction.guild) {
        return true;
    }
    await replyOrFollowUp(interaction, {
        content: 'This command can only be used within a server.',
        ephemeral: true,
    });
    return false;
}

async function ensureAdminInteraction(interaction) {
    if (!(await ensureGuildContext(interaction))) {
        return false;
    }
    if (!adminUsers.includes(interaction.user.id)) {
        await replyOrFollowUp(interaction, {
            content: 'You are not authorised to use this command.',
            ephemeral: true,
        });
        return false;
    }
    if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return true;
    }
    await replyOrFollowUp(interaction, {
        content: 'You do not have permission to use this command.',
        ephemeral: true,
    });
    return false;
}

async function ensureRoleInteraction(interaction, roleName) {
    if (!(await ensureGuildContext(interaction))) {
        return false;
    }
    const member = interaction.member;
    const hasRole = member?.roles?.cache?.some(role => role.name === roleName || role.id === roleName);
    if (hasRole) {
        return true;
    }
    await replyOrFollowUp(interaction, {
        content: `You must have the ${roleName} role to use this command.`,
        ephemeral: true,
    });
    return false;
}

module.exports = {
    ensureAdminInteraction,
    ensureRoleInteraction,
    ensureGuildContext,
};
