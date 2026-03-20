const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db, admin } = require('../lib/firebase');
const crypto = require('crypto');
const { COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Access the web dashboard and link your account.'),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const username = interaction.user.username;
      const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 512 });

      // Generate a secure, temporary verification code (6 characters)
      const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now

      // Store the code in a dedicated verification_codes collection for easy lookup by the web app
      await db.collection('verification_codes').doc(verificationCode).set({
        discord_id: userId,
        username: username,
        avatar: avatarURL,
        expiresAt: expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Also update the user's discord profile info in a discord_users collection
      await db.collection('discord_users').doc(userId).set({
        username: username,
        avatar: avatarURL,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const embed = new EmbedBuilder()
        .setTitle('Web Dashboard Access')
        .setDescription('Use the code below to link your Discord account on the web dashboard.')
        .addFields(
          { name: 'Verification Code', value: `\`${verificationCode}\``, inline: true },
          { name: 'Expires In', value: '5 minutes', inline: true }
        )
        .setColor(COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({ text: 'Discord Bot Integration' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error(`Error in /dashboard command for user ${interaction.user.id}:`, error);
      await interaction.reply({ content: 'An error occurred while generating your verification code.', ephemeral: true });
    }
  }
};
