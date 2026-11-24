import { db } from "./firebaseConfig.js";
import { onAuthReady } from "./authentication.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

let currentUser = null;

// Wait until Firebase knows who is logged in.
onAuthReady(function (user) {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;
});

async function saveHike(event) {
  event.preventDefault();

  // The user may submit before Firebase finishes checking.
  if (!currentUser) {
    alert("Please wait until you are logged in.");
    return;
  }

  const newHike = {
    name: document.getElementById("hikeNameInput").value.trim(),
    city: document.getElementById("cityInput").value.trim(),
    level: document.getElementById("levelInput").value,
    length: Number(document.getElementById("lengthInput").value),
    details: document.getElementById("detailsInput").value.trim(),
    owner: currentUser.uid,
    ownerName: currentUser.displayName || currentUser.email,
    last_updated: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "hikes"), newHike);
    location.href = "main.html";
  } catch (error) {
    console.error("Error saving hike:", error);
    alert(`Error saving hike:\n${error.message}`);
  }
}

document
  .getElementById("addHikeForm")
  .addEventListener("submit", saveHike);