const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { COLORS } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('View the current lottery status.'),
    async execute(interaction) {
        try {
            const user = await db.getUser(interaction.user.id);
            if (!user) return interaction.reply({ content: 'Profile not found.', ephemeral: true });

            const allUsers = await db.getAllUsers();
            const users = Object.values(allUsers);

            // Calculate Global Stats
            let totalTickets = 0;
            let totalUnique = 0;
            let totalPoolWeight = 0;

            users.forEach(u => {
                const t = u.lottery?.current_tickets || 0;
                if (t > 0) {
                    totalTickets += t;
                    totalUnique++;
                    totalPoolWeight += Math.log10(t + 1) + 1;
                }
            });

            // User Stats
            const userTickets = user.lottery?.current_tickets || 0;
            const userLifetime = user.lottery?.lifetime_tickets || 0;
            const wins = user.lottery?.wins || { first: 0, second: 0, third: 0 };
            const joined = user.lottery?.joined || 0;

            let winChance = '0.00';
            if (userTickets > 0 && totalPoolWeight > 0) {
                const userWeight = Math.log10(userTickets + 1) + 1;
                winChance = ((userWeight / totalPoolWeight) * 100).toFixed(2);
            }

            // End Timestamp (End of current month)
            const now = new Date();
            const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
            const timestamp = Math.floor(endOfMonth.getTime() / 1000);

            const embed = new EmbedBuilder()
                .setColor(COLORS.PRIMARY)
                .setTitle('Apex Monthly Lottery')
                .setDescription(
                    `- Purchase more lottery tickets to increase your winning odds!\n` +
                    `- Ticket buying is blocked **1 day before & after** the lottery ends.\n\n` +
                    `:ticket: **Cost**: 150 CI (Use \`/market\` to buy)\n\n` +
                    `:bar_chart: **Your Lottery Stats**\n` +
                    `:first_place: :second_place: :third_place: Wins: \`${wins.first}/${wins.second}/${wins.third}\`\n` +
                    `Lotteries Joined: \`${joined}\`\n` +
                    `:ticket: Lifetime Tickets Bought: \`${userLifetime}\``
                )
                .addFields(
                    { name: 'Current Rewards', value: '**1st winner:** `[Ultra Rare Apex Girls In-Game Item]`\n**2nd winner:** `[Rare Apex Girls In-Game Item]`\n**3rd winner:** `[Uncommon Apex Girls In-Game Item]`', inline: false },
                    { name: 'This Lottery Ends', value: `:alarm_clock: <t:${timestamp}:R>`, inline: true },
                    { name: 'Total Participants', value: `:busts_in_silhouette: ${totalUnique}`, inline: true },
                    { name: 'Your Lottery Entries', value: `:ticket: ${userTickets}`, inline: true },
                    { name: 'Your Win Percentage', value: `:chart_with_upwards_trend: ${winChance}%`, inline: true },
                    { name: 'Total Tickets in this Lottery', value: `:bar_chart: ${totalTickets}`, inline: true }
                )
                .setFooter({ text: 'Winners are randomly picked at the end of every month.' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(`Error in /lottery command for user ${interaction.user.id}:`, error);
            await interaction.reply({ content: 'An error occurred while fetching the lottery status.', ephemeral: true });
        }
    }
};
