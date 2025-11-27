// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSy...", // 実際のキーに置き換え
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.appspot.com",
  messagingSenderId: "748123",
  appId: "1:748123:web:xxxx"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
