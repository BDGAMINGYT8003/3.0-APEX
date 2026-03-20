const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lottery')
    .setDescription('Display the current lottery status.'),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const user = await db.getUser(userId);
      const guildSettings = await db.getGuildSettings(interaction.guildId);

      const lotteryData = guildSettings.lottery || { jackpot: 1000, participants: 0, endsAt: Date.now() + 24 * 60 * 60 * 1000 };
      const userTickets = user?.lottery_tickets || 0;

      const embed = new EmbedBuilder()
        .setTitle('Lottery Status')
        .setDescription('Here is the current status of the lottery.')
        .addFields(
          { name: 'Jackpot', value: `\`${lotteryData.jackpot} Tokens\``, inline: true },
          { name: 'Participants', value: `\`${lotteryData.participants}\``, inline: true },
          { name: 'Ends At', value: `<t:${Math.floor(lotteryData.endsAt / 1000)}:R>`, inline: true },
          { name: 'Your Tickets', value: `\`${userTickets}\``, inline: false }
        )
        .setColor(COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({ text: 'Discord Bot Integration' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(`Error in /lottery command for user ${interaction.user.id}:`, error);
      await interaction.reply({ content: 'An error occurred while fetching the lottery status.', ephemeral: true });
    }
  }
};
