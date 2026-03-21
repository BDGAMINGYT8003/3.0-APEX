const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');
const { isStaff, sendUnauthorizedError } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('grant')
        .setDescription('Grant items or tokens to a user.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to grant.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount to grant.')
                .setRequired(true)
                .setMinValue(1)
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to receive the grant.')
                .setRequired(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = ['CI Tokens'];
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice }))
        );
    },

    async execute(interaction) {
        // Staff Check
        if (!isStaff(interaction.member)) {
            return sendUnauthorizedError(interaction);
        }

        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        try {
            if (item === 'CI Tokens') {
                const userData = await db.getUser(targetUser.id);
                const currentTokens = userData ? (userData.tokens || 0) : 0;
                const newTokens = currentTokens + amount;

                if (userData) {
                    await db.updateUser(targetUser.id, {
                        tokens: newTokens
                    });
                } else {
                    await db.createUser(targetUser.id, {
                        tokens: newTokens,
                        xp: 0,
                        level: 1,
                        total_xp: 0,
                        market_stock: {},
                        purchase_history: []
                    });
                }

                await db.addActivityLog(targetUser.id, {
                    reason: 'Granted by Admin',
                    amount: amount
                });

                const embed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle('Grant Successful')
                    .setDescription(`Successfully granted **${amount} CI Tokens** to ${targetUser}.`)
                    .addFields(
                        { name: 'New Balance', value: `${newTokens} CI Tokens`, inline: true },
                        { name: 'Staff Member', value: `${interaction.user}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Administrative Action' });

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: 'Invalid item selected.', ephemeral: true });
            }
        } catch (error) {
            console.error(`Error in /grant command:`, error);
            await interaction.reply({ content: 'An error occurred while processing the grant.', ephemeral: true });
        }
    }
};
