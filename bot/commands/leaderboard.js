const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Display the top 10 users by level.'),
  async execute(interaction) {
    try {
      const users = await db.getAllUsers();
      const sortedUsers = Object.entries(users)
        .sort(([, a], [, b]) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0))
        .slice(0, 10);

      if (sortedUsers.length === 0) {
        return await interaction.reply({ content: 'No users found on the leaderboard yet.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('Top 10 Users')
        .setDescription('Here are the top 10 users by level.')
        .setColor(COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({ text: 'Discord Bot Integration' });

      sortedUsers.forEach(([userId, user], index) => {
        const username = user.username || 'Unknown User';
        const level = user.level || 1;
        const xp = user.xp || 0;
        embed.addFields({ name: `${index + 1}. ${username}`, value: `Level: \`${level}\` | XP: \`${xp}\``, inline: false });
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(`Error in /leaderboard command for user ${interaction.user.id}:`, error);
      await interaction.reply({ content: 'An error occurred while fetching the leaderboard.', ephemeral: true });
    }
  }
};
