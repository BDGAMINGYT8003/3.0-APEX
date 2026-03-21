const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../utils/database');
const { COLORS, LEVEL_CONSTANTS } = require('../utils/constants');
const { getProgressBar } = require('../utils/progressBar');

const EMOJIS = {
    first: '<:DoubleArrowLeft:1458212845161283677>',
    back: '<:SingleArrowLeft:1458212849305387069>',
    refresh: '<:Refresh:1458212851637420224>',
    next: '<:SingleArrowRight:1458212847157903565>',
    last: '<:DoubleArrowRight:1446611400251281542>',
    replyCont: '<:ReplyCont:1457839483541127208>',
    reply: '<:Reply:1457839486011445391>',
    // IDs for Buttons
    ids: {
        first: '1458212845161283677',
        back: '1458212849305387069',
        refresh: '1458212851637420224',
        next: '1458212847157903565',
        last: '1446611400251281542'
    }
};

const USERS_PER_PAGE = 5;

const getXpForNextLevel = (level) => LEVEL_CONSTANTS.BASE + ((level || 1) - 1) * LEVEL_CONSTANTS.INCREMENT;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the monthly leaderboard.'),

    async execute(interaction) {
        await this.renderLeaderboard(interaction, 1);
    },

    async handleComponent(interaction) {
        // Handle Navigation Buttons
        if (interaction.isButton() && interaction.customId.startsWith('leaderboard:')) {
            const parts = interaction.customId.split(':');
            const action = parts[1];
            const currentPage = parseInt(parts[2] || '1');

            // Re-fetch total pages to be safe
            const allUsers = await db.getAllUsers();
            const sorted = Object.entries(allUsers)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => {
                    if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1);
                    if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
                    return (a.displayName || a.discord_username || '').localeCompare(b.displayName || b.discord_username || '');
                });
            const totalPages = Math.ceil(sorted.length / USERS_PER_PAGE) || 1;

            let newPage = currentPage;

            switch (action) {
                case 'first': newPage = 1; break;
                case 'back': newPage = Math.max(1, currentPage - 1); break;
                case 'next': newPage = Math.min(totalPages, currentPage + 1); break;
                case 'last': newPage = totalPages; break;
                case 'refresh': newPage = currentPage; break; // Just re-render
                case 'jump':
                    // Open Modal
                    const modal = new ModalBuilder()
                        .setCustomId('leaderboard:modal:jump')
                        .setTitle('Jump to Page');

                    const input = new TextInputBuilder()
                        .setCustomId('page_num')
                        .setLabel(`Page Number (1-${totalPages})`)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return interaction.showModal(modal);
            }

            await this.renderLeaderboard(interaction, newPage, true);
        }

        // Handle Jump Modal
        else if (interaction.isModalSubmit() && interaction.customId === 'leaderboard:modal:jump') {
            const input = parseInt(interaction.fields.getTextInputValue('page_num'));

            const allUsers = await db.getAllUsers();
            const sorted = Object.entries(allUsers)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => {
                    if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1);
                    if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
                    return (a.displayName || a.discord_username || '').localeCompare(b.displayName || b.discord_username || '');
                });
            const totalPages = Math.ceil(sorted.length / USERS_PER_PAGE) || 1;

            if (isNaN(input) || input < 1 || input > totalPages) {
                return interaction.reply({ content: `Invalid page. Please enter a number between 1 and ${totalPages}.`, ephemeral: true });
            }

            await this.renderLeaderboard(interaction, input, true);
        }
    },

    async renderLeaderboard(interaction, page, isUpdate = false) {
        const allUsers = await db.getAllUsers();
        const sorted = Object.entries(allUsers)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => {
                if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1);
                if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
                return (a.displayName || a.discord_username || '').localeCompare(b.displayName || b.discord_username || '');
            });
        const totalPages = Math.ceil(sorted.length / USERS_PER_PAGE) || 1;

        // Clamp Page
        page = Math.max(1, Math.min(totalPages, page));

        const start = (page - 1) * USERS_PER_PAGE;
        const end = start + USERS_PER_PAGE;
        const pageUsers = sorted.slice(start, end);

        const description = pageUsers.map((u, i) => {
            const globalRank = start + i + 1;
            const level = u.level || 1;
            const xp = u.xp || 0;
            const nextXp = getXpForNextLevel(level);
            const progressBarStr = getProgressBar(xp, nextXp, 5);

            return `**#${globalRank}** <@${u.id}> — **(${u.id})**\n` +
                   `${EMOJIS.replyCont} Level: \`${level}\`\n` +
                   `${EMOJIS.reply} ${progressBarStr} (${xp}/${nextXp})`;
        }).join('\n\n');

        // User's Rank
        const userRank = sorted.findIndex(u => u.id === interaction.user.id) + 1;
        const footerText = `Your position: #${userRank > 0 ? userRank : 'N/A'} ─ Page ${page} of ${totalPages}`;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('Monthly Leaderboard')
            .setDescription(description || 'No data available.')
            .setFooter({ text: footerText });

        // Components
        const navRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard:first:${page}`)
                .setEmoji(EMOJIS.ids.first)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1),
            new ButtonBuilder()
                .setCustomId(`leaderboard:back:${page}`)
                .setEmoji(EMOJIS.ids.back)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1),
            new ButtonBuilder()
                .setCustomId(`leaderboard:refresh:${page}`)
                .setEmoji(EMOJIS.ids.refresh)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`leaderboard:next:${page}`)
                .setEmoji(EMOJIS.ids.next)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages),
            new ButtonBuilder()
                .setCustomId(`leaderboard:last:${page}`)
                .setEmoji(EMOJIS.ids.last)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages)
        );

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard:jump')
                .setLabel('Jump to Page')
                .setStyle(ButtonStyle.Secondary)
        );

        // Special Condition: Single Page
        if (totalPages === 1) {
            navRow.components[0].setDisabled(true); // First
            navRow.components[1].setDisabled(true); // Back
            navRow.components[3].setDisabled(true); // Next
            navRow.components[4].setDisabled(true); // Last
        }

        const payload = { embeds: [embed], components: [navRow, actionRow] };

        if (isUpdate) {
            await interaction.update(payload);
        } else {
            await interaction.reply(payload);
        }
    }
};
