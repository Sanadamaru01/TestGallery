// firebaseInit.js - 分割版独立動作
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 元コードと同じ設定値を使用
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",  // <- 自分の値に置き換える
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.appspot.com",
};

console.log("firebaseInit loaded");

// Firebase 初期化
export const app = initializeApp(firebaseConfig);
console.log("initializeApp done");

// Firestore / Storage も同時にエクスポートして分割モジュールで利用可能にする
export const db = getFirestore(app);
export const storage = getStorage(app);
console.log("Firestore & Storage initialized");
