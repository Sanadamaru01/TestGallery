// firebaseApp.js
// Firebase 初期化専用ファイル（他の初期化は絶対にここ以外で行わない）

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// あなたの Firebase 設定値をそのまま書く
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.firebasestorage.app",
};

// initializeApp は一度だけ
export const app = initializeApp(firebaseConfig);
