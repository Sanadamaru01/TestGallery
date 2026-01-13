import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from "../firebaseInit.js";

const auth = getAuth(app);

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const googleBtn = document.getElementById("googleBtn");
const errorArea = document.getElementById("error");

const params = new URLSearchParams(location.search);
const returnUrl = params.get("returnUrl") || "/";

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    );
    location.href = returnUrl;
  } catch (e) {
    errorArea.textContent = e.message;
  }
});

googleBtn.addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    location.href = returnUrl;
  } catch (e) {
    errorArea.textContent = e.message;
  }
});
