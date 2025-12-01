// firebaseApp.js
import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Firebase 初期化（1回だけ）
let app;
try {
    app = getApp();
} catch {
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "gallery-us-ebe6e.firebaseapp.com",
        projectId: "gallery-us-ebe6e",
        storageBucket: "gallery-us-ebe6e.firebasestorage.app",
    };
    app = initializeApp(firebaseConfig);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
