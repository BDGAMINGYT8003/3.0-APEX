const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');
const { admin, db: firestore } = require('../lib/firebase.cjs');
const { COLORS, MARKET_ITEMS } = require('../utils/constants');
const { getProgressBar } = require('../utils/progressBar');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Open the Apex Market.'),

    async execute(interaction) {
        try {
            const user = await db.getUser(interaction.user.id);
            if (!user) return interaction.reply({ content: 'Profile not found.', ephemeral: true });

            const tokens = user.tokens || 0;
            const marketStock = user.market_stock || {};

            let description = `**Your Balance:** ${tokens} CI Tokens\n\nSelect an item below to purchase.\n\n**Available Items:**\n`;

            // Create Select Menu
            const select = new StringSelectMenuBuilder()
                .setCustomId('market:select')
                .setPlaceholder('Select an item...');

            MARKET_ITEMS.forEach(item => {
                // Check stock
                const bought = marketStock[item.id] || 0;
                const maxStock = item.maxStock || 10; // Default if missing
                const cost = item.cost || item.price || 0;
                const remaining = maxStock - bought;
                const isLottery = item.id === 'lottery_ticket';
                const stockDisplay = isLottery ? 'Stock: ∞' : `Stock: ${remaining}/${maxStock}`;

                let itemLine = '';
                if (isLottery) {
                    itemLine = `**${item.name}** - ${cost} CI\nStock: ∞\n\n`;
                } else {
                    itemLine = `**${item.name}** - ${cost} CI\nStock: ${remaining}/${maxStock}\n${getProgressBar(remaining, maxStock, 5)}\n\n`;
                }

                // Ensure we don't exceed Discord's embed description limit (4096 chars)
                if ((description + itemLine).length < 4000) {
                    description += itemLine;
                }

                select.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(item.name)
                        .setDescription(`Cost: ${cost} CI | ${stockDisplay}`)
                        .setValue(item.id)
                );
            });

            const embed = new EmbedBuilder()
                .setColor(COLORS.PRIMARY)
                .setTitle('Apex Market Store')
                .setDescription(description.trim());

            const row = new ActionRowBuilder().addComponents(select);

            await interaction.reply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(`Error in /market command for user ${interaction.user.id}:`, error);
            await interaction.reply({ content: 'An error occurred while fetching the market.', ephemeral: true });
        }
    },

    async handleComponent(interaction) {
        try {
            const user = await db.getUser(interaction.user.id);
            if (!user) return interaction.reply({ content: 'Profile not found.', ephemeral: true });

            const tokens = user.tokens || 0;
            const marketStock = user.market_stock || {};
            const level = user.level || 1;

            // 1. Select Menu
            if (interaction.isStringSelectMenu() && interaction.customId === 'market:select') {
                const itemId = interaction.values[0];
                const item = MARKET_ITEMS.find(i => i.id === itemId);
                if (!item) return interaction.reply({ content: 'Item not found.', ephemeral: true });

                const minLevel = item.minLevel || 1;
                const cost = item.cost || item.price || 0;
                const maxStock = item.maxStock || 10;

                // Level Check
                if (minLevel > level) {
                    return interaction.reply({
                        content: `Locked. You must be Level ${minLevel} to purchase this item. (Current: ${level})`,
                        ephemeral: true
                    });
                }

                // Balance Check (Pre-check for at least 1 unit)
                if (tokens < cost) {
                    return interaction.reply({
                        content: `Insufficient Funds. You need at least ${cost} CI to purchase this item. (Current: ${tokens} CI)`,
                        ephemeral: true
                    });
                }

                // Stock Check (Pre-check)
                if (item.id !== 'lottery_ticket') {
                    const bought = marketStock[item.id] || 0;
                    if (bought >= maxStock) {
                        return interaction.reply({
                            content: `Out of Stock. You have purchased the maximum amount (${maxStock}) for this month.`,
                            ephemeral: true
                        });
                    }
                }

                // Lockout Logic for Lottery
                if (item.id === 'lottery_ticket') {
                    const now = new Date();
                    const day = now.getUTCDate();
                    const lastDay = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();

                    // Block if Day 1 (Reset day) OR Last Day of Month (24h before reset)
                    if (day === 1 || day === lastDay) {
                        return interaction.reply({
                            content: `Lottery Ticket purchases are locked 24h before and after the monthly reset.`,
                            ephemeral: true
                        });
                    }
                }

                // Modal
                const modal = new ModalBuilder()
                    .setCustomId(`market:modal:${itemId}:${interaction.message.id}`)
                    .setTitle(`Purchase ${item.name.substring(0, 30)}`); // Trim title

                const isLottery = item.id === 'lottery_ticket';
                const remainingStock = maxStock - (marketStock[itemId] || 0);
                const maxAllowed = isLottery ? 9999 : remainingStock;

                const quantityInput = new TextInputBuilder()
                    .setCustomId('quantity')
                    .setLabel('Quantity')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`Max: ${isLottery ? 'Unlimited' : maxAllowed}`)
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(quantityInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }

            // 2. Modal Submit
            else if (interaction.isModalSubmit() && interaction.customId.startsWith('market:modal:')) {
                const parts = interaction.customId.split(':');
                const itemId = parts[2];
                const originalMsgId = parts[3];
                const item = MARKET_ITEMS.find(i => i.id === itemId);
                if (!item) return interaction.reply({ content: 'Item not found.', ephemeral: true });

                const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));

                if (isNaN(quantity) || quantity <= 0) {
                    return interaction.reply({ content: 'Invalid quantity.', ephemeral: true });
                }

                const minLevel = item.minLevel || 1;
                const cost = item.cost || item.price || 0;
                const maxStock = item.maxStock || 10;

                // Validation
                if (minLevel > level) {
                    return interaction.reply({ content: `Level requirement not met (Level ${minLevel}).`, ephemeral: true });
                }

                const isLottery = item.id === 'lottery_ticket';
                if (!isLottery) {
                    const bought = marketStock[itemId] || 0;
                    const remaining = maxStock - bought;
                    if (quantity > remaining) {
                        return interaction.reply({ content: `Insufficient stock. You only have ${remaining} left.`, ephemeral: true });
                    }
                }

                const totalCost = cost * quantity;
                if (tokens < totalCost) {
                    return interaction.reply({ content: `Insufficient funds. Cost: ${totalCost} CI. You have: ${tokens} CI.`, ephemeral: true });
                }

                // Confirmation Buttons
                const embed = new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setTitle('Confirm Purchase')
                    .setDescription(`Are you sure you want to buy **${quantity}x ${item.name.replace(/ x\d+$/, '')}** for **${totalCost} CI**?`);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`market:confirm:${itemId}:${quantity}:${originalMsgId}`)
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('market:cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

                await interaction.reply({ embeds: [embed], components: [row] });
            }

            // 3. Confirm Button
            else if (interaction.isButton() && interaction.customId.startsWith('market:confirm:')) {
                const parts = interaction.customId.split(':');
                const itemId = parts[2];
                const qtyStr = parts[3];
                const originalMsgId = parts[4];
                const quantity = parseInt(qtyStr);
                const item = MARKET_ITEMS.find(i => i.id === itemId);
                if (!item) return interaction.update({ content: 'Item not found.', embeds: [], components: [] });

                const minLevel = item.minLevel || 1;
                const cost = item.cost || item.price || 0;
                const maxStock = item.maxStock || 10;

                // Re-validate (race condition check)
                if (minLevel > level) {
                    return interaction.update({ content: 'Level requirement mismatch. Purchase failed.', embeds: [], components: [] });
                }
                const isLottery = item.id === 'lottery_ticket';
                const bought = marketStock[itemId] || 0;

                if (!isLottery && (bought + quantity) > maxStock) {
                    return interaction.update({ content: 'Stock changed. Purchase failed.', embeds: [], components: [] });
                }
                const totalCost = cost * quantity;
                if (tokens < totalCost) {
                     return interaction.update({ content: 'Balance changed. Purchase failed.', embeds: [], components: [] });
                }

                // Execute using Transaction for Database Integrity
                try {
                    await firestore.runTransaction(async (transaction) => {
                        const userRef = firestore.collection('users').doc(interaction.user.id);
                        const userDoc = await transaction.get(userRef);
                        
                        if (!userDoc.exists) {
                            throw new Error('User profile not found.');
                        }

                        const userData = userDoc.data();
                        const currentTokens = userData.tokens || 0;
                        const currentMarketStock = userData.market_stock || {};
                        const currentLevel = userData.level || 1;

                        if (minLevel > currentLevel) {
                            throw new Error(`Level requirement mismatch (Level ${minLevel}).`);
                        }

                        const currentBought = currentMarketStock[itemId] || 0;
                        if (!isLottery && (currentBought + quantity) > maxStock) {
                            throw new Error('Insufficient stock available.');
                        }

                        const currentTotalCost = cost * quantity;
                        if (currentTokens < currentTotalCost) {
                            throw new Error('Insufficient CI Tokens.');
                        }

                        const purchaseRecord = {
                            id: `APEX-${Date.now().toString(36).toUpperCase()}`,
                            itemName: item.name,
                            amount: quantity,
                            tokensUsed: currentTotalCost,
                            timestamp: new Date().toISOString()
                        };

                        const updates = {
                            tokens: admin.firestore.FieldValue.increment(-currentTotalCost),
                            purchase_history: admin.firestore.FieldValue.arrayUnion(purchaseRecord)
                        };

                        if (isLottery) {
                            updates['lottery.current_tickets'] = admin.firestore.FieldValue.increment(quantity);
                            updates['lottery.lifetime_tickets'] = admin.firestore.FieldValue.increment(quantity);
                        } else {
                            updates[`market_stock.${itemId}`] = admin.firestore.FieldValue.increment(quantity);
                        }

                        transaction.update(userRef, updates);
                    });
                } catch (error) {
                    console.error('Market Transaction Error:', error);
                    return interaction.update({ 
                        content: `Purchase failed: ${error.message}`, 
                        embeds: [], 
                        components: [] 
                    });
                }

                // Generate Codes
                const codes = [];
                for(let i=0; i<quantity; i++) {
                    codes.push(`APEX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`);
                }

                const codeString = codes.map(c => `\`${c}\``).join('\n');

                // Success Embed (Public Update)
                let successDescription = '';
                if (isLottery) {
                    successDescription = `You purchased **${quantity}x Lottery Ticket**. Use the \`/lottery\` command to check your entries and progress!`;
                } else {
                    successDescription = `You purchased **${quantity}x ${item.name.replace(/ x\d+$/, '')}**.\n\nCheck your DMs for your redemption codes.`;
                }

                const successEmbed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle('Purchase Successful')
                    .setDescription(successDescription);

                await interaction.update({ embeds: [successEmbed], components: [] });

                // DM User + Safe-Drop Fallback (Only for non-Lottery items)
                if (!isLottery) {
                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setColor(COLORS.SUCCESS)
                            .setTitle('Purchase Successful')
                            .setDescription(`You purchased **${quantity}x ${item.name.replace(/ x\d+$/, '')}**.\n\n**Redemption Codes:**\n${codeString}`);
                        await interaction.user.send({ embeds: [dmEmbed] });
                    } catch (err) {
                        // Safe-Drop: Ephemeral Follow-up
                        const safeDropEmbed = new EmbedBuilder()
                            .setColor(COLORS.WARNING)
                            .setTitle('DM Delivery Failed')
                            .setDescription(`Your privacy settings prevented DM delivery.\n\n**Here are your codes (Visible only to you):**\n${codeString}\n\n*Please copy these now.*`);

                        await interaction.followUp({ embeds: [safeDropEmbed], ephemeral: true });
                    }
                }

                // Update Original Menu (Dynamic Sync)
                if (originalMsgId) {
                    try {
                        const originalMsg = await interaction.channel.messages.fetch(originalMsgId);
                        if (originalMsg && originalMsg.editable) {
                            const updatedUser = await db.getUser(interaction.user.id);
                            const updatedTokens = updatedUser.tokens || 0;
                            const updatedMarketStock = updatedUser.market_stock || {};

                            let updatedDescription = `**Your Balance:** ${updatedTokens} CI Tokens\n\nSelect an item below to purchase.\n\n**Available Items:**\n`;

                            // Re-render Select Menu
                            const select = new StringSelectMenuBuilder()
                                .setCustomId('market:select')
                                .setPlaceholder('Select an item...');

                            MARKET_ITEMS.forEach(i => {
                                const bought = updatedMarketStock[i.id] || 0;
                                const iMaxStock = i.maxStock || 10;
                                const iCost = i.cost || i.price || 0;
                                const remaining = iMaxStock - bought;
                                const isLot = i.id === 'lottery_ticket';
                                const stockDisplay = isLot ? 'Stock: ∞' : `Stock: ${remaining}/${iMaxStock}`;

                                let itemLine = '';
                                if (isLot) {
                                    itemLine = `**${i.name}** - ${iCost} CI\nStock: ∞\n\n`;
                                } else {
                                    itemLine = `**${i.name}** - ${iCost} CI\nStock: ${remaining}/${iMaxStock}\n${getProgressBar(remaining, iMaxStock, 5)}\n\n`;
                                }

                                if ((updatedDescription + itemLine).length < 4000) {
                                    updatedDescription += itemLine;
                                }

                                select.addOptions(
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel(i.name)
                                        .setDescription(`Cost: ${iCost} CI | ${stockDisplay}`)
                                        .setValue(i.id)
                                );
                            });

                            const row = new ActionRowBuilder().addComponents(select);
                            const embed = new EmbedBuilder()
                                .setColor(COLORS.PRIMARY)
                                .setTitle('Apex Market Store')
                                .setDescription(updatedDescription.trim());

                            await originalMsg.edit({ embeds: [embed], components: [row] });
                        }
                    } catch (err) {
                        // Ignore if message deleted or fetch failed
                    }
                }
            }

            // 4. Cancel Button
            else if (interaction.isButton() && interaction.customId === 'market:cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle('Transaction Cancelled')
                    .setDescription('The purchase was cancelled.');

                await interaction.update({ embeds: [cancelEmbed], components: [] });
            }
        } catch (error) {
            console.error(`Error handling component in /market for user ${interaction.user.id}:`, error);
            // If the interaction hasn't been replied to or updated, we should try to reply
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true }).catch(() => {});
            }
        }
    }
};
