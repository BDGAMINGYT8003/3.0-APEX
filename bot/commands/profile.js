const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');
const progressBar = require('../utils/progressBar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Display your profile statistics.'),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const user = await db.getUser(userId);

      if (!user) {
        return await interaction.reply({ content: 'You do not have a profile yet. Start chatting to earn XP!', ephemeral: true });
      }

      const level = user.level || 1;
      const xp = user.xp || 0;
      const tokens = user.tokens || 0;
      const nextLevelXp = Math.floor(100 * Math.pow(1.5, level - 1));

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Profile`)
        .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 512 }))
        .addFields(
          { name: 'Level', value: `\`${level}\``, inline: true },
          { name: 'XP', value: `\`${xp} / ${nextLevelXp}\``, inline: true },
          { name: 'Tokens', value: `\`${tokens}\``, inline: true },
          { name: 'Progress', value: progressBar.create(xp, nextLevelXp), inline: false }
        )
        .setColor(COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({ text: 'Discord Bot Integration' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(`Error in /profile command for user ${interaction.user.id}:`, error);
      await interaction.reply({ content: 'An error occurred while fetching your profile.', ephemeral: true });
    }
  }
};
