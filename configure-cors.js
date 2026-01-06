// configure-cors.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'skarpkontrollv2-9e81f.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function configureCors() {
  try {
    // Definiera CORS-konfigurationen
    const corsConfiguration = [
      {
        origin: ['http://localhost:3000', 'https://skarpkontrollv2-9e81f.web.app', 'https://skarpkontrollv2-9e81f.firebaseapp.com'],
        method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        maxAgeSeconds: 3600
      }
    ];

    // Uppdatera CORS-konfigurationen
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log('CORS configuration updated successfully!');
  } catch (error) {
    console.error('Error updating CORS configuration:', error);
  }
}

configureCors();