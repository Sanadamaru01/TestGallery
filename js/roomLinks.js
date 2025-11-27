// roomLinks.js
import { db } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';

/**
 * 現在の roomId から前後の部屋情報を取得
 */
export async function getPrevNextRoom(currentRoomId) {
  const snapshot = await getDocs(collection(db, "rooms"));
  const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  rooms.sort((a, b) => {
    const ai = parseInt(a.id.replace("room", ""), 10);
    const bi = parseInt(b.id.replace("room", ""), 10);
    return ai - bi;
  });

  const currentIndex = rooms.findIndex(r => r.id === currentRoomId);
  const now = new Date();

  const prevRoom = currentIndex > 0 ? rooms[currentIndex - 1] : null;
  const nextRoom = currentIndex < rooms.length - 1 ? rooms[currentIndex + 1] : null;

  return {
    prevRoom: prevRoom ? {
      id: prevRoom.id,
      title: prevRoom.roomTitle || 'Untitled',
      available: now >= prevRoom.startDate?.toDate() && now <= prevRoom.endDate?.toDate()
    } : { id: null, title: 'なし', available: false },
    nextRoom: nextRoom ? {
      id: nextRoom.id,
      title: nextRoom.roomTitle || 'Untitled',
      available: now >= nextRoom.startDate?.toDate() && now <= nextRoom.endDate?.toDate()
    } : { id: null, title: 'なし', available: false }
  };
}

/**
 * ボタンに反映
 */
export async function updateRoomLinksUI(currentRoomId) {
  const { prevRoom, nextRoom } = await getPrevNextRoom(currentRoomId);

  const prevLink = document.getElementById("prevRoom");
  const nextLink = document.getElementById("nextRoom");

  if (prevLink) {
    prevLink.textContent = `< ${prevRoom.title}`;
    if (prevRoom.available) {
      prevLink.href = `../${prevRoom.id}/index.html`;
      prevLink.style.opacity = "1";
      prevLink.style.pointerEvents = "auto";
    } else {
      prevLink.href = "javascript:void(0)";
      prevLink.style.opacity = "0.3";
      prevLink.style.pointerEvents = "none";
    }
  }

  if (nextLink) {
    nextLink.textContent = `${nextRoom.title} >`;
    if (nextRoom.available) {
      nextLink.href = `../${nextRoom.id}/index.html`;
      nextLink.style.opacity = "1";
      nextLink.style.pointerEvents = "auto";
    } else {
      nextLink.href = "javascript:void(0)";
      nextLink.style.opacity = "0.3";
      nextLink.style.pointerEvents = "none";
    }
  }
}
