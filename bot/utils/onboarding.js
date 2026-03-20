const db = require('./database');

const onboarding = {
  async completeOnboarding(userId, finalData) {
    try {
      const success = await db.migrateToComplete(userId, finalData);
      if (success) {
        return { success: true, message: 'Onboarding completed successfully.' };
      }
      return { success: false, message: 'Failed to complete onboarding.' };
    } catch (error) {
      console.error(`Error completing onboarding for user ${userId}:`, error);
      return { success: false, message: 'An error occurred during onboarding.' };
    }
  }
};

module.exports = onboarding;
