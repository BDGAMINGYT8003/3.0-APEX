const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { COLORS, MARKET_ITEMS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market')
    .setDescription('Access the in-game market and purchase items.'),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const user = await db.getUser(userId);

      if (!user) {
        return await interaction.reply({ content: 'You do not have a profile yet. Start chatting to earn XP!', ephemeral: true });
      }

      const tokens = user.tokens || 0;
      const marketStock = user.market_stock || {};

      const embed = new EmbedBuilder()
        .setTitle('In-Game Market')
        .setDescription(`You currently have \`${tokens} Tokens\`. Here are the items available for purchase.`)
        .setColor(COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({ text: 'Discord Bot Integration' });

      MARKET_ITEMS.forEach(item => {
        const stock = marketStock[item.id] || 0;
        embed.addFields({ name: `${item.name} - ${item.price} Tokens`, value: `${item.description}\nStock: \`${stock}\``, inline: false });
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(`Error in /market command for user ${interaction.user.id}:`, error);
      await interaction.reply({ content: 'An error occurred while fetching the market status.', ephemeral: true });
    }
  }
};
