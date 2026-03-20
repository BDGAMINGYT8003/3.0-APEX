const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Configure the announcement channel for the bot.')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to use for announcements.')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      const channel = interaction.options.getChannel('channel');
      const guildId = interaction.guildId;

      await db.updateGuildSettings(guildId, {
        announcementChannel: channel.id
      });

      await interaction.reply({ content: `Announcement channel has been set to ${channel}.`, ephemeral: true });
    } catch (error) {
      console.error(`Error in /setchannel command for guild ${interaction.guildId}:`, error);
      await interaction.reply({ content: 'An error occurred while setting the announcement channel.', ephemeral: true });
    }
  }
};
