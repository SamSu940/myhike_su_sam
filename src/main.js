import { onAuthReady } from "./authentication.js";
import { db } from "./firebaseConfig.js";
import {
  doc,
  onSnapshot,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
let currentUser = null;
let favourites = [];

function showName() {
  onAuthReady(function (user) {
    if (user) {
      const name = user.displayName || user.email;
      document.getElementById("name-goes-here").textContent = name + "!";
    } else {
      location.href = "index.html";
    }
  });
} function readQuote(day) {
  const quoteRef = doc(db, "quotes", day);

  onSnapshot(quoteRef, (snapshot) => {
    if (snapshot.exists()) {
      document.getElementById("quote-goes-here").textContent =
        snapshot.data().quote;
    } else {
      console.log("No such quote document!");
    }
  }, (error) => {
    console.error("Error reading quote:", error);
  });
}
async function seedHikes() {
  try {
    const hikesRef = collection(db, "hikes");
    const snapshot = await getDocs(hikesRef);

    // Only add sample data when the collection is empty.
    if (!snapshot.empty) {
      console.log("Hikes already exist. Skipping seed.");
      return;
    }

    await addDoc(hikesRef, {
      code: "BBY01",
      name: "Burnaby Lake Park Trail",
      city: "Burnaby",
      level: "easy",
      details: "A lovely place for a lunch walk.",
      length: 10,
      hike_time: 60,
      lat: 49.2467097082573,
      lng: -122.9187029619698,
      last_updated: serverTimestamp()
    });

    await addDoc(hikesRef, {
      code: "AM01",
      name: "Buntzen Lake Trail",
      city: "Anmore",
      level: "moderate",
      details: "Close to town, and relaxing.",
      length: 10.5,
      hike_time: 80,
      lat: 49.3399431028579,
      lng: -122.85908496766939,
      last_updated: serverTimestamp()
    });

    await addDoc(hikesRef, {
      code: "NV01",
      name: "Mount Seymour Trail",
      city: "North Vancouver",
      level: "hard",
      details: "Amazing ski slope views.",
      length: 8.2,
      hike_time: 120,
      lat: 49.38847101455571,
      lng: -122.94092543551031,
      last_updated: serverTimestamp()
    });

    console.log("Sample hikes added successfully.");
  } catch (error) {
    console.error("Error seeding hikes:", error);
  }
}
async function displayCardsDynamically() {
  const cardTemplate = document.getElementById("hikeCardTemplate");
  const container = document.getElementById("hikes-go-here");

  try {
    const snapshot = await getDocs(collection(db, "hikes"));

    container.replaceChildren();

    snapshot.forEach((hikeDoc) => {
      const hike = hikeDoc.data();
      const newCard = cardTemplate.content.cloneNode(true);

      newCard.querySelector(".card-title").textContent = hike.name;
      newCard.querySelector(".card-text").textContent = hike.details;
      newCard.querySelector(".card-length").textContent = hike.length;

      const image = newCard.querySelector(".card-image");
      image.src = `/images/${hike.code}.jpg`;
      image.alt = hike.name;

      newCard.querySelector(".read-more").href =
        `eachHike.html?docID=${hikeDoc.id}`;
      setupHeart(newCard, hikeDoc.id);
      container.appendChild(newCard);
    });
  } catch (error) {
    console.error("Error loading hike cards:", error);
  }
}
function setupHeart(card, hikeID) {
  const heart = card.querySelector(".fav-btn");

  if (favourites.includes(hikeID)) {
    heart.classList.replace("bi-heart", "bi-heart-fill");
  }

  heart.addEventListener("click", function () {
    toggleFavourite(heart, hikeID);
  });
}

async function toggleFavourite(heart, hikeID) {
  const userRef = doc(db, "users", currentUser.uid);

  try {
    if (heart.classList.contains("bi-heart-fill")) {
      await setDoc(
        userRef,
        { favourites: arrayRemove(hikeID) },
        { merge: true }
      );

      heart.classList.replace("bi-heart-fill", "bi-heart");
    } else {
      await setDoc(
        userRef,
        { favourites: arrayUnion(hikeID) },
        { merge: true }
      );

      heart.classList.replace("bi-heart", "bi-heart-fill");
    }
  } catch (error) {
    console.error("Error updating favourites:", error);
    alert(`Error updating favourites:\n${error.message}`);
  }
}


showName();
readQuote("tuesday");

onAuthReady(async function (user) {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  try {
    // Read this user's saved favourites.
    const userDoc = await getDoc(doc(db, "users", user.uid));
    favourites = userDoc.data()?.favourites || [];

    // Keep your original sample-data setup.
    await seedHikes();

    // Display the cards after favourites have loaded.
    await displayCardsDynamically();
  } catch (error) {
    console.error("Error loading the main page:", error);
    alert(`Error loading the main page:\n${error.message}`);
  }
});