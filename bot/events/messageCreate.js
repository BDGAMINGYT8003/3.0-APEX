const { Events, EmbedBuilder } = require('discord.js');
const xpSystem = require('../utils/xpSystem');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const result = await xpSystem.processMessage(message.author.id, message.guildId, message.content);

    if (result && result.leveledUp && result.notify) {
      const embed = new EmbedBuilder()
        .setTitle('Level Up!')
        .setDescription(`Congratulations ${message.author}! You have reached **Level ${result.newLevel}**!`)
        .addFields({ name: 'Reward', value: `\`${result.tokensGain} Tokens\``, inline: true })
        .setColor(COLORS.SUCCESS)
        .setTimestamp()
        .setFooter({ text: 'Discord Bot Integration' });

      try {
        const settings = await db.getGuildSettings(message.guild.id);
        if (settings && settings.level_up_channel) {
          const channel = await message.guild.channels.fetch(settings.level_up_channel);
          if (channel) {
            await channel.send({ content: `${message.author}`, embeds: [embed] });
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching level up channel:', error);
      }

      // Fallback to the channel where the message was sent
      await message.channel.send({ embeds: [embed] });
    }
  }
};
