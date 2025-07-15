import { setDoc, doc } from "firebase/firestore";

async function registerUser(uid, role, rooms, displayName, email) {
  await setDoc(doc(db, "users", uid), {
    uid,
    role,
    rooms,
    displayName,
    email
  });
}
