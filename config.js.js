// 1) Paste your Firebase web app config here (Firebase console → Project settings → Your apps → Web app).
// These values are not secret; access is controlled by firestore.rules.
window.VIVA_CONFIG = {
  firebase: {
    apiKey: "PASTE_API_KEY",
    authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
    projectId: "PASTE_PROJECT_ID",
    storageBucket: "PASTE_PROJECT_ID.appspot.com",
    messagingSenderId: "PASTE_SENDER_ID",
    appId: "PASTE_APP_ID"
  },
  // Who may sign in and view. Keep in step with the domain check in firestore.rules.
  allowedDomains: ["usm.my", "student.usm.my"]
};
