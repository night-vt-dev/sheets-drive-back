const { Firestore } = require('@google-cloud/firestore');
const db = new Firestore();   // uses Application Default Credentials on Cloud Run
module.exports = { db };
