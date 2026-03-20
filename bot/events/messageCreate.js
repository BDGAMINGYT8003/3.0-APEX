const { Events, EmbedBuilder } = require('discord.js');
const xpSystem = require('../utils/xpSystem');
const { COLORS } = require('../utils/constants');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const result = await xpSystem.processMessage(message.author.id, message.guildId);

    if (result && result.leveledUp) {
      const embed = new EmbedBuilder()
        .setTitle('Level Up!')
        .setDescription(`Congratulations ${message.author}! You have reached **Level ${result.newLevel}**!`)
        .addFields({ name: 'Reward', value: `\`${result.tokensGain} Tokens\``, inline: true })
        .setColor(COLORS.SUCCESS)
        .setTimestamp()
        .setFooter({ text: 'Discord Bot Integration' });

      await message.channel.send({ embeds: [embed] });
    }
  }
};
