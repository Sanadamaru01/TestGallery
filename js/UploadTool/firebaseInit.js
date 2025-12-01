// firebaseInit.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // <- 自分の値に置き換えてください
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.appspot.com",
};

console.log("firebaseInit loaded");
  export const app = initializeApp(firebaseConfig);
console.log("initializeApp done");

