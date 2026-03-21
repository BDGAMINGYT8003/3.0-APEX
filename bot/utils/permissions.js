const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { COLORS } = require('./constants');

const STAFF_GUILD_ID = '1301072065880915991';

function isStaff(member) {
    if (!member || !member.guild) return false;
    
    // Check if it's the correct guild
    if (member.guild.id !== STAFF_GUILD_ID) return false;

    // Check for Administrator permission
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

    // Check for Moderator role
    return member.roles.cache.some(role => role.name.toLowerCase() === 'moderator');
}

async function sendUnauthorizedError(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('Permission Denied')
        .setDescription('You do not have the required permissions to use this command.\n\nThis command is restricted to **Administrators** and **Moderators** of the official staff server.')
        .setFooter({ text: 'Access Restricted' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { isStaff, sendUnauthorizedError, STAFF_GUILD_ID };
