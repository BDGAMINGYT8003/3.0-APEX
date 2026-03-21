import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { db, auth } = require('./bot/lib/firebase.cjs');
import { MARKET_ITEMS } from './src/lib/constants.js';
import { FieldValue } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_EMAIL = 'xdjameherobrine@gmail.com';

async function isAdmin(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken.email === ADMIN_EMAIL;
  } catch (error) {
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  // Account Deletion API
  app.post('/api/account/delete', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ error: 'Email not found in token.' });
      }

      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      const userData = userDoc.data();
      const discordId = userData.discord_id;

      // 1. Add to deleted_accounts collection for re-registration lock
      await db.collection('deleted_accounts').doc(email).set({
        email,
        discord_id: discordId || null,
        deletedAt: Date.now()
      });

      // 2. Wipe all user data
      // In a real app, you might want to delete other related data too
      await userRef.delete();

      // 3. Delete the Firebase Auth user
      await auth.deleteUser(uid);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Account deletion error:', error);
      res.status(500).json({ error: error.message || 'An error occurred during account deletion.' });
    }
  });

  app.post('/api/market/purchase', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const { itemId, quantity } = req.body;

      if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid request parameters.' });
      }

      const item = MARKET_ITEMS.find(i => i.id === itemId);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const userRef = db.collection('users').doc(uid);

      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error('User profile not found.');
        }

        const userData = userDoc.data();
        const totalCost = item.cost * quantity;

        if (userData.tokens < totalCost) {
          throw new Error('Insufficient CI Tokens.');
        }

        if (userData.level < item.minLevel) {
          throw new Error(`Requires Level ${item.minLevel}.`);
        }

        const isLottery = itemId === 'lottery_ticket';
        if (!isLottery) {
          const bought = (userData.market_stock && userData.market_stock[itemId]) || 0;
          if (bought + quantity > item.maxStock) {
            throw new Error('Insufficient stock available.');
          }
        }

        const purchaseRecord = {
          id: crypto.randomUUID(),
          itemName: item.name,
          amount: quantity,
          tokensUsed: totalCost,
          timestamp: new Date().toISOString()
        };

        const updates: any = {
          tokens: FieldValue.increment(-totalCost),
          purchase_history: FieldValue.arrayUnion(purchaseRecord)
        };

        if (isLottery) {
          updates['lottery.current_tickets'] = FieldValue.increment(quantity);
          updates['lottery.lifetime_tickets'] = FieldValue.increment(quantity);
        } else {
          updates[`market_stock.${itemId}`] = FieldValue.increment(quantity);
        }

        transaction.update(userRef, updates);
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Purchase error:', error);
      const message = error.message || 'An error occurred during purchase.';
      if (message === 'Insufficient stock available.') {
        return res.status(400).json({ error: message });
      }
      res.status(500).json({ error: message });
    }
  });

  // Admin Routes
  app.get('/api/admin/search', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!(await isAdmin(idToken))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { query: searchQuery } = req.query;
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    try {
      const q = (searchQuery as string).toLowerCase();
      const results: any[] = [];
      
      // Fetch all users and filter in memory for partial, case-insensitive matching
      // This is efficient for a reasonable number of users and provides the best search experience
      const snapshot = await db.collection('users').get();
      
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        const email = (data.email || '').toLowerCase();
        const displayName = (data.displayName || '').toLowerCase();
        const discordUsername = (data.discord_username || '').toLowerCase();
        const discordId = (data.discord_id || '').toLowerCase();
        
        if (
          email.includes(q) ||
          displayName.includes(q) ||
          discordUsername.includes(q) ||
          discordId.includes(q)
        ) {
          results.push({ id: doc.id, ...data });
        }
      });

      // If no results, try fetching from Discord if it looks like a Discord ID
      if (results.length === 0 && /^\d{17,19}$/.test(searchQuery as string)) {
        try {
          const response = await fetch(`https://discord.com/api/v10/users/${searchQuery}`, {
            headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
          });
          if (response.ok) {
            const discordUser: any = await response.json();
            results.push({
              id: `discord_${discordUser.id}`,
              discord_id: discordUser.id,
              displayName: discordUser.username,
              photoURL: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
              discord_avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
              discord_banner: discordUser.banner ? `https://cdn.discordapp.com/banners/${discordUser.id}/${discordUser.banner}.png` : null,
              isDiscordVerified: false,
              tokens: 0,
              level: 1,
              xp: 0,
              total_xp: 0,
              not_in_db: true
            });
          }
        } catch (discordError) {
          console.error('Discord fetch error:', discordError);
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error('Admin search error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/user/:userId', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!(await isAdmin(idToken))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { userId } = req.params;
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.json({ id: userDoc.id, ...userDoc.data() });
    } catch (error: any) {
      console.error('Admin user fetch error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/ban', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!(await isAdmin(idToken))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { targetUid, reason, staffName } = req.body;
    if (!targetUid || !reason) {
      return res.status(400).json({ error: 'Target UID and reason are required.' });
    }

    try {
      const userRef = db.collection('users').doc(targetUid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        // If it's a discord user not in DB yet, we might need to create a record or just handle it
        if (targetUid.startsWith('discord_')) {
          const discordId = targetUid.replace('discord_', '');
          await userRef.set({
            discord_id: discordId,
            isBanned: true,
            banReason: reason,
            bannedBy: staffName,
            bannedAt: Date.now()
          });
        } else {
          return res.status(404).json({ error: 'User not found.' });
        }
      } else {
        await userRef.update({
          isBanned: true,
          banReason: reason,
          bannedBy: staffName,
          bannedAt: Date.now()
        });
      }

      // In a real app, you'd also disable their Firebase Auth account
      try {
        if (!targetUid.startsWith('discord_')) {
          await auth.updateUser(targetUid, { disabled: true });
        }
      } catch (authError) {
        console.error('Auth disable error:', authError);
      }

      // Trigger Discord message (Simulated)
      const userData = userDoc.exists ? userDoc.data() : { discord_id: targetUid.replace('discord_', '') };
      if (userData.discord_id) {
        try {
          // Send DM to user via Discord API
          // 1. Create DM channel
          const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: {
              Authorization: `Bot ${process.env.BOT_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipient_id: userData.discord_id })
          });
          
          if (dmChannelResponse.ok) {
            const dmChannel: any = await dmChannelResponse.json();
            // 2. Send message
            await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
              method: 'POST',
              headers: {
                Authorization: `Bot ${process.env.BOT_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                embeds: [{
                  title: 'Account Banned',
                  color: 0xFF0000,
                  fields: [
                    { name: 'Reason', value: reason },
                    { name: 'Staff Name', value: staffName || 'Administrator' }
                  ],
                  footer: { text: `Banned at ${new Date().toLocaleString()}` },
                  timestamp: new Date().toISOString()
                }]
              })
            });
          }
        } catch (discordError) {
          console.error('Discord DM error:', discordError);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Admin ban error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/grant-rewards', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminRef = db.collection('users').doc(decodedToken.uid);
    const adminDoc = await adminRef.get();
    const adminData = adminDoc.data();

    if (!adminDoc.exists || (adminData?.role !== 'admin' && decodedToken.email !== 'xdjameherobrine@gmail.com')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const staffName = adminData?.displayName || 'Administrator';

    const { targetUid, rewardType, amount } = req.body;
    if (!targetUid || !rewardType || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Target UID, reward type, and positive amount are required.' });
    }

    try {
      const userRef = db.collection('users').doc(targetUid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const userData = userDoc.data();
      if (!userData.discord_id) {
        return res.status(400).json({ error: 'User has not linked their Discord ID.' });
      }

      let rewardName = '';
      let giftCode = `APEX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      if (rewardType === 'tokens') {
        rewardName = 'CI Tokens';
        await userRef.update({
          tokens: (userData.tokens || 0) + amount,
          activity_log: FieldValue.arrayUnion({
            id: Math.random().toString(36).substring(2, 15),
            reason: `Granted by ${staffName}`,
            amount: amount,
            timestamp: Date.now()
          })
        });
      } else {
        const item = MARKET_ITEMS.find(i => i.id === rewardType);
        if (!item) return res.status(400).json({ error: 'Invalid reward type.' });
        rewardName = item.name;
        
        await userRef.update({
          purchase_history: FieldValue.arrayUnion({
            id: Math.random().toString(36).substring(2, 15),
            itemName: item.id,
            amount: amount,
            tokensUsed: 0,
            timestamp: Date.now(),
            grantedBy: staffName
          })
        });
      }

      // Trigger Discord message
      try {
        const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
          method: 'POST',
          headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ recipient_id: userData.discord_id })
        });
        
        if (dmChannelResponse.ok) {
          const dmChannel: any = await dmChannelResponse.json();
          await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bot ${process.env.BOT_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              embeds: [{
                title: '🎁 Rewards Received',
                color: 0x6366F1, // Indigo
                description: `You have been granted rewards by the administrative staff.`,
                fields: [
                  { name: 'Item Granted', value: rewardName, inline: true },
                  { name: 'Quantity', value: amount.toString(), inline: true },
                  { name: 'Granted By', value: staffName, inline: true },
                  { name: 'In-Game Gift Code', value: `\`${giftCode}\`` }
                ],
                footer: { text: 'Apex Girls Administrative Team' },
                timestamp: new Date().toISOString()
              }]
            })
          });
        }
      } catch (discordError) {
        console.error('Discord DM error:', discordError);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Admin grant error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
