const admin = require('firebase-admin');
const firebaseConfig = require('../../firebase-applet-config.json');

// Initialize Firebase Admin SDK
// If running in Cloud Run, it should automatically use the default service account
admin.initializeApp({
  projectId: firebaseConfig.projectId
});

const db = admin.firestore(firebaseConfig.firestoreDatabaseId);
const auth = admin.auth();

module.exports = { db, auth, admin };
