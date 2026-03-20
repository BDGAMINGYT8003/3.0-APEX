const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uid')
    .setDescription('Link your In-Game UID to your account.')
    .addStringOption(option => 
      option.setName('uid')
        .setDescription('Your In-Game UID.')
        .setRequired(true)),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const uid = interaction.options.getString('uid');

      // Check if user exists in Firestore
      const user = await db.getUser(userId);
      
      if (!user) {
        // If user doesn't exist, we might need to create a profile or tell them to chat first
        // For now, let's allow linking even if they haven't chatted
        await db.updateUser(userId, {
          discord_id: userId,
          game_uid: uid,
          username: interaction.user.username
        });
      } else {
        await db.updateUser(userId, {
          game_uid: uid
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('In-Game UID Linked')
        .setDescription(`Your In-Game UID has been successfully linked to your account.`)
        .addFields({ name: 'UID', value: `\`${uid}\``, inline: true })
        .setColor(COLORS.SUCCESS)
        .setTimestamp()
        .setFooter({ text: 'Discord Bot Integration' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error(`Error in /uid command for user ${interaction.user.id}:`, error);
      await interaction.reply({ content: 'An error occurred while linking your UID.', ephemeral: true });
    }
  }
};
