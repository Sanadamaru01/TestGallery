import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from "../firebaseInit.js";

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * ログイン必須ガード
 * @returns {Promise<{user, role}>}
 */
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        const path = location.pathname;
        location.href =
          `/auth/login.html?returnUrl=${encodeURIComponent(path)}`;
        return;
      }

      let role = "user";
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        role = snap.data().role ?? "user";
      }

      resolve({ user, role });
    });
  });
}
