const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');
const { isStaff, sendUnauthorizedError } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set')
        .setDescription('Configure bot settings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category of announcements.')
                .setRequired(true)
                .addChoices(
                    { name: 'Level Up Notifications', value: 'level_up_channel' },
                    { name: 'Lottery Announcements', value: 'lottery_channel' }
                )
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to use.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),
    async execute(interaction) {
        // Staff Check
        if (!isStaff(interaction.member)) {
            return sendUnauthorizedError(interaction);
        }

        try {
            const categoryKey = interaction.options.getString('category');
            const channel = interaction.options.getChannel('channel');
            const categoryName = categoryKey === 'level_up_channel' ? 'Level Up Notifications' : 'Lottery Announcements';

            // Check permissions
            const permissions = channel.permissionsFor(interaction.client.user);
            if (!permissions.has(PermissionFlagsBits.ViewChannel) || !permissions.has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({
                    content: `I do not have permission to view or send messages in ${channel}.`,
                    ephemeral: true
                });
            }

            // Save setting
            await db.updateGuildSettings(interaction.guildId, {
                [categoryKey]: channel.id
            });

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('Configuration Updated')
                .setDescription(`Successfully set **${categoryName}** to ${channel}.`)
                .setFooter({ text: 'Settings saved.' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(`Error in /set command for guild ${interaction.guildId}:`, error);
            await interaction.reply({ content: 'An error occurred while updating the configuration.', ephemeral: true });
        }
    }
};
