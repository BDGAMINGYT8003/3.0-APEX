const { db, admin } = require('../lib/firebase.cjs');

const USERS_COLLECTION = 'users';
const INCOMPLETE_USERS_COLLECTION = 'incomplete_users';
const SETTINGS_COLLECTION = 'guild_settings';

const database = {
  // --- Complete Users ---
  async getUser(userId) {
    try {
      // First, check if there's a verified web account linked to this discord_id
      const querySnapshot = await db.collection(USERS_COLLECTION)
        .where('discord_id', '==', userId)
        .where('isDiscordVerified', '==', true)
        .limit(1)
        .get();
        
      if (!querySnapshot.empty) {
        const webDoc = querySnapshot.docs[0];
        const webData = webDoc.data();

        // Check if there's a legacy document that needs to be merged
        const legacyDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        if (legacyDoc.exists) {
          const legacyData = legacyDoc.data();
          
          // Merge legacy data into web account
          // Prioritize legacy stats (xp, level, tokens) if they are higher
          const mergedData = {
            xp: Math.max(webData.xp || 0, legacyData.xp || 0),
            level: Math.max(webData.level || 1, legacyData.level || 1),
            total_xp: Math.max(webData.total_xp || 0, legacyData.total_xp || 0),
            tokens: Math.max(webData.tokens || 0, legacyData.tokens || 0),
            // Keep web account's ID and verification status
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          // Update web document
          await webDoc.ref.update(mergedData);
          
          // Delete legacy document
          await legacyDoc.ref.delete();

          return { ...webData, ...mergedData };
        }

        return webData;
      }

      // Fallback: check if there's a legacy document with the discordId as the document ID
      const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
      return userDoc.exists ? userDoc.data() : null;
    } catch (error) {
      console.error(`Error getting user ${userId}:`, error);
      return null;
    }
  },

  async createUser(userId, userData) {
    try {
      // Check if a verified web account exists
      const querySnapshot = await db.collection(USERS_COLLECTION)
        .where('discord_id', '==', userId)
        .where('isDiscordVerified', '==', true)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        // Update the verified web account instead of creating a new one
        await querySnapshot.docs[0].ref.update({
          ...userData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return true;
      }

      // Create new legacy document
      await db.collection(USERS_COLLECTION).doc(userId).set({
        ...userData,
        discord_id: userId, // Ensure discord_id is set
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Error creating user ${userId}:`, error);
      return false;
    }
  },

  async updateUser(userId, userData) {
    try {
      // Check if a verified web account exists
      const querySnapshot = await db.collection(USERS_COLLECTION)
        .where('discord_id', '==', userId)
        .where('isDiscordVerified', '==', true)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        // Update the verified web account
        await querySnapshot.docs[0].ref.update({
          ...userData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return true;
      }

      // Update legacy document
      await db.collection(USERS_COLLECTION).doc(userId).update({
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      return false;
    }
  },

  async getAllUsers() {
    try {
      const querySnapshot = await db.collection(USERS_COLLECTION).get();
      const users = {};
      querySnapshot.forEach((doc) => {
        users[doc.id] = doc.data();
      });
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      return {};
    }
  },

  // --- Incomplete Users ---
  async getIncompleteUser(userId) {
    try {
      const userDoc = await db.collection(INCOMPLETE_USERS_COLLECTION).doc(userId).get();
      return userDoc.exists ? userDoc.data() : null;
    } catch (error) {
      console.error(`Error getting incomplete user ${userId}:`, error);
      return null;
    }
  },

  async createIncompleteUser(userId, userData) {
    try {
      await db.collection(INCOMPLETE_USERS_COLLECTION).doc(userId).set({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Error creating incomplete user ${userId}:`, error);
      return false;
    }
  },

  async updateIncompleteUser(userId, userData) {
    try {
      await db.collection(INCOMPLETE_USERS_COLLECTION).doc(userId).update({
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Error updating incomplete user ${userId}:`, error);
      return false;
    }
  },

  async deleteIncompleteUser(userId) {
    try {
      await db.collection(INCOMPLETE_USERS_COLLECTION).doc(userId).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting incomplete user ${userId}:`, error);
      return false;
    }
  },

  async getAllIncompleteUsers() {
    try {
      const querySnapshot = await db.collection(INCOMPLETE_USERS_COLLECTION).get();
      const users = {};
      querySnapshot.forEach((doc) => {
        users[doc.id] = doc.data();
      });
      return users;
    } catch (error) {
      console.error('Error getting all incomplete users:', error);
      return {};
    }
  },

  // --- Guild Settings ---
  async getGuildSettings(guildId) {
    try {
      const settingsDoc = await db.collection(SETTINGS_COLLECTION).doc(guildId).get();
      return settingsDoc.exists ? settingsDoc.data() : { announcementChannel: null };
    } catch (error) {
      console.error(`Error getting guild settings ${guildId}:`, error);
      return { announcementChannel: null };
    }
  },

  async updateGuildSettings(guildId, settingsData) {
    try {
      await db.collection(SETTINGS_COLLECTION).doc(guildId).set({
        ...settingsData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error(`Error updating guild settings ${guildId}:`, error);
      return false;
    }
  },

  // --- Migration ---
  async migrateToComplete(userId, finalData) {
    try {
      const incompleteData = await this.getIncompleteUser(userId);
      if (!incompleteData) return false;

      const completeData = {
        ...incompleteData,
        ...finalData,
        migratedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const success = await this.createUser(userId, completeData);
      if (success) {
        await this.deleteIncompleteUser(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error migrating user ${userId}:`, error);
      return false;
    }
  },

  async addActivityLog(userId, activityData) {
    try {
      const activityRecord = {
        id: Math.random().toString(36).substring(2, 15),
        ...activityData,
        timestamp: new Date().toISOString()
      };

      // Check if a verified web account exists
      const querySnapshot = await db.collection(USERS_COLLECTION)
        .where('discord_id', '==', userId)
        .where('isDiscordVerified', '==', true)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        await querySnapshot.docs[0].ref.update({
          activity_log: admin.firestore.FieldValue.arrayUnion(activityRecord)
        });
        return true;
      }

      // Update legacy document
      const userRef = db.collection(USERS_COLLECTION).doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        await userRef.update({
          activity_log: admin.firestore.FieldValue.arrayUnion(activityRecord)
        });
      } else {
        await userRef.set({
          discord_id: userId,
          activity_log: [activityRecord],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      return true;
    } catch (error) {
      console.error(`Error adding activity log for user ${userId}:`, error);
      return false;
    }
  }
};

module.exports = database;
