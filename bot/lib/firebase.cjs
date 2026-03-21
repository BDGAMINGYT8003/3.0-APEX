const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const firebaseConfig = require('../../firebase-applet-config.json');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK
const appConfig = {
  projectId: firebaseConfig.projectId
};

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    appConfig.credential = admin.credential.cert(serviceAccount);
    logger.success('Firebase Admin initialized with service account key.');
  } catch (error) {
    logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON.');
    console.error(error);
  }
} else {
  logger.warn('FIREBASE_SERVICE_ACCOUNT_KEY is missing!');
  logger.warn('The bot will likely encounter PERMISSION_DENIED errors when accessing Firestore.');
  logger.warn('Please generate a private key from Firebase Console -> Project Settings -> Service Accounts and add it as a secret.');
}

const app = admin.initializeApp(appConfig);

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

module.exports = { db, auth, admin };
