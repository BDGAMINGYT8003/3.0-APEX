const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { getProgressBar } = require('../utils/progressBar');
const { COLORS, LEVEL_CONSTANTS } = require('../utils/constants');

const getXpForNextLevel = (level) => LEVEL_CONSTANTS.BASE + ((level || 1) - 1) * LEVEL_CONSTANTS.INCREMENT;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your Apex Grid stats.')
        .addUserOption(option => option.setName('user').setDescription('The user to view')),
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const user = await db.getUser(targetUser.id);

            if (!user) {
                // Check Incomplete
                const incompleteUser = await db.getIncompleteUser(targetUser.id);
                if (incompleteUser) {
                    return interaction.reply({ content: 'This user exists in the database but has not onboarded yet.', ephemeral: true });
                }
                return interaction.reply({ content: 'User not found in the database.', ephemeral: true });
            }

            const level = user.level || 1;
            const xp = user.xp || 0;
            const tokens = user.tokens || 0;
            const nextXp = getXpForNextLevel(level);
            const progressBar = getProgressBar(xp, nextXp, 5);

            // Calculate Rank
            const allUsers = await db.getAllUsers();
            const sorted = Object.entries(allUsers)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => {
                    if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1);
                    if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
                    return (a.displayName || a.discord_username || '').localeCompare(b.displayName || b.discord_username || '');
                });
            
            const rankIndex = sorted.findIndex(u => u.id === targetUser.id);
            const rank = rankIndex !== -1 ? rankIndex + 1 : 'N/A';

            const embed = new EmbedBuilder()
                .setColor(COLORS.PRIMARY)
                .setTitle(`Agent Profile: ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: 'Level', value: `Level: ${level}\nExperience: ${xp}/${nextXp}\n${progressBar}`, inline: false },
                    { name: 'CI Tokens', value: `${tokens}`, inline: true },
                    { name: 'Rank', value: `#${rank}`, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(`Error in /profile command for user ${interaction.user?.id}:`, error);
            await interaction.reply({ content: 'An error occurred while fetching the profile.', ephemeral: true });
        }
    }
};
