// firebaseApp.js
// Firebase 初期化モジュール
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";

let app;

export function initFirebase() {
    if (!getApps().length) {
        const firebaseConfig = {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_PROJECT_ID.appspot.com",
            messagingSenderId: "YOUR_SENDER_ID",
            appId: "YOUR_APP_ID"
        };
        app = initializeApp(firebaseConfig);
        console.log("[firebaseApp] Firebase initialized");
    } else {
        app = getApp();
        console.log("[firebaseApp] Firebase already initialized");
    }
}

export function getFirestoreDB() {
    if (!app) initFirebase();
    return getFirestore(app);
}

export function getFirebaseStorage() {
    if (!app) initFirebase();
    return getStorage(app);
}

export function getFirebaseAuth() {
    if (!app) initFirebase();
    return getAuth(app);
}
