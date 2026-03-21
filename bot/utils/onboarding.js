const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('./database');
const { COLORS } = require('./constants');

const STEPS = {
    START: 0,
    CURRENCY: 1,
    MARKET: 2,
    LOTTERY: 3,
    FEATURES: 4,
    COMPLETE: 5
};

async function handle(interaction) {
    let step = STEPS.START;

    if (interaction.isButton() && interaction.customId.startsWith('onboard_')) {
        const parts = interaction.customId.split('_');
        step = parseInt(parts[2]);
    }

    if (interaction.isChatInputCommand()) {
        step = STEPS.START;
    }

    switch (step) {
        case STEPS.START:
            await sendWelcome(interaction);
            break;
        case STEPS.CURRENCY:
            await sendCurrencyInfo(interaction);
            break;
        case STEPS.MARKET:
            await sendMarketInfo(interaction);
            break;
        case STEPS.LOTTERY:
            await sendLotteryInfo(interaction);
            break;
        case STEPS.FEATURES:
            await sendFeaturesInfo(interaction);
            break;
        case STEPS.COMPLETE:
            await completeOnboarding(interaction);
            break;
    }
}

async function sendWelcome(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Welcome to Apex Girls')
        .setDescription('Before you can access the system, you must complete a brief tutorial.\n\nLearn how to earn rewards, climb the leaderboard, and dominate the Apex Grid.');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('onboard_step_1')
            .setLabel('Start Tutorial')
            .setStyle(ButtonStyle.Primary)
    );

    const payload = { embeds: [embed], components: [row], ephemeral: true };
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(payload);
    } else {
        await interaction.reply(payload);
    }
}

async function sendCurrencyInfo(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('The Dual Currency System')
        .addFields(
            { name: 'Server XP', value: 'Earned by chatting. Resets monthly. Determines your Rank.', inline: true },
            { name: 'CI Tokens', value: 'Earned by leveling up. Capped at 1400/month. Used in the Market.', inline: true }
        )
        .setFooter({ text: 'Step 1 of 5' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('onboard_step_2')
            .setLabel('Next: The Market')
            .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

async function sendMarketInfo(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('The Apex Market & Monthly Reset')
        .setDescription('**Monthly Reset:** On the 1st of every month, XP, Levels, and Tokens reset. Use them or lose them!\n\n**The Market:** Spend CI Tokens on items. Each item has a limited stock per user that also resets monthly.')
        .setFooter({ text: 'Step 2 of 5' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('onboard_step_3')
            .setLabel('Next: The Lottery')
            .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

async function sendLotteryInfo(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('The Monthly Lottery')
        .setDescription('Participate in the monthly lottery to win exclusive prizes!\n\n- Buy tickets in the Market.\n- 3 Winners are picked randomly at the end of the month.\n- Purchases are locked 24h before/after the reset.')
        .setFooter({ text: 'Step 3 of 5' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('onboard_step_4')
            .setLabel('Next: New Features')
            .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

async function sendFeaturesInfo(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('New Features & Commands')
        .setDescription('We have recently added several new features to enhance your experience!')
        .addFields(
            { name: '`/dashboard`', value: 'Access the web dashboard and link your Discord account.', inline: true },
            { name: '`/uid`', value: 'Link your in-game UID to receive rewards directly.', inline: true },
            { name: '`/leaderboard`', value: 'View the server leaderboard and your current rank.', inline: true },
            { name: '`/profile`', value: 'Check your stats, level, XP, and CI Tokens.', inline: true }
        )
        .setFooter({ text: 'Step 4 of 5' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('onboard_step_5')
            .setLabel('Complete Setup')
            .setStyle(ButtonStyle.Success)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

async function completeOnboarding(interaction) {
    const userId = interaction.user.id;
    const finalData = {
        xp: 0,
        level: 1,
        total_xp: 0,
        tokens: 0,
        market_stock: {},
        purchase_history: []
    };

    const incompleteData = await db.getIncompleteUser(userId);
    if (incompleteData) {
        await db.migrateToComplete(userId, finalData);
    } else {
        await db.createUser(userId, {
            discord_id: userId,
            ...finalData
        });
    }

    const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('Setup Complete')
        .setDescription('You are now registered in the Apex Grid. Good luck, Agent.');

    await interaction.update({ embeds: [embed], components: [] });
}

module.exports = { handle, completeOnboarding };
