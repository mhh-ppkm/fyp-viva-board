// 1) Paste your Firebase web app config here (Firebase console → Project settings → Your apps → Web app).
// These values are not secret; access is controlled by firestore.rules.
window.VIVA_CONFIG = {
  firebase: {
     apiKey: "AIzaSyCCuzbFjJ3SAoW2v8Q4uP16qeHgc8w_-qU",
     authDomain: "fyp-viva-board.firebaseapp.com",
     projectId: "fyp-viva-board",
     storageBucket: "fyp-viva-board.firebasestorage.app",
     messagingSenderId: "600844751187",
     appId: "1:600844751187:web:dbe2bc3b280cef5f3e11a6"
  },
  // Who may sign in and view. Keep in step with the domain check in firestore.rules.
  allowedDomains: ["usm.my", "student.usm.my"]
};
