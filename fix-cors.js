// fix-cors.js - Sätter CORS för Firebase Storage
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.log('FEL: serviceAccountKey.json saknas!');
  console.log('');
  console.log('1. Gå till: https://console.firebase.google.com/project/skarpkontrollv2-9e81f/settings/serviceaccounts/adminsdk');
  console.log('2. Klicka "Generate new private key"');
  console.log('3. Spara filen som "serviceAccountKey.json" här:', __dirname);
  console.log('4. Kör igen: node fix-cors.js');
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'skarpkontrollv2-9e81f.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function setCors() {
  try {
    await bucket.setCorsConfiguration([
      {
        origin: ['*'],
        method: ['GET', 'HEAD'],
        maxAgeSeconds: 3600,
        responseHeader: ['Content-Type', 'Access-Control-Allow-Origin']
      }
    ]);
    console.log('CORS konfigurerat!');
    console.log('Bilder kommer nu visas i PDF!');
  } catch (error) {
    console.error('Fel:', error.message);
  }
}

setCors();
