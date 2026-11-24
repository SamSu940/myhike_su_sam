import { db } from "./firebaseConfig.js";
import { onAuthReady } from "./authentication.js";
import {
  doc, getDoc, updateDoc, increment,
  collection, addDoc, getDocs, serverTimestamp,
  query, where, orderBy, limit
} from "firebase/firestore";

let currentUser = null;

onAuthReady(function (user) {
  if (!user) {
    location.href = "index.html";
  } else {
    currentUser = user;
    displayReviews();
  }
});

// Read the selected hike's document ID from the URL.
const params = new URLSearchParams(window.location.search);
const hikeId = params.get("docID");

async function displayHikeInfo() {
  const nameElement = document.getElementById("hikeName");

  if (!hikeId) {
    nameElement.textContent = "No hike selected.";
    return;
  }

  try {
    const hikeRef = doc(db, "hikes", hikeId);
    const hikeSnap = await getDoc(hikeRef);

    if (!hikeSnap.exists()) {
      nameElement.textContent = "Hike not found.";
      return;
    }

    const hike = hikeSnap.data();

    nameElement.textContent = hike.name;

    const image = document.getElementById("hikeImage");
    image.src = `/images/${hike.code}.jpg`;
    image.alt = hike.name;
    // Increase this hike's view count by 1.
    await updateDoc(hikeRef, {
      views: increment(1)
    });

    // Display the updated count.
    document.getElementById("viewCount").textContent =
      (hike.views || 0) + 1;
  } catch (error) {
    console.error("Error loading hike:", error);
    nameElement.textContent = "Error loading hike.";
  }
}

displayHikeInfo();

async function displayReviews() {
  if (!hikeId) return;

  const container = document.getElementById("reviews-go-here");
  const template = document.getElementById("reviewTemplate");

  const reviewsQuery = query(
    collection(db, "reviews"),
    where("hikeDocID", "==", hikeId),
    orderBy("timestamp", "desc"),
    limit(5)
  );

  try {
    const snapshot = await getDocs(reviewsQuery);
    container.replaceChildren();

    if (snapshot.empty) {
      container.textContent = "No reviews yet. Be the first!";
      return;
    }

    snapshot.forEach((reviewDoc) => {
      const review = reviewDoc.data();
      const card = template.content.cloneNode(true);
      const date = review.timestamp
        ? review.timestamp.toDate().toLocaleDateString()
        : "just now";

      card.querySelector(".review-title").textContent =
        `${review.title} ${"★".repeat(review.rating)}`;
      card.querySelector(".review-meta").textContent =
        `${review.userName} · ${date}`;
      card.querySelector(".review-text").textContent = review.text;

      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading reviews:", error);
    container.textContent = "Could not load reviews.";
  }
}

const reviewForm = document.getElementById("reviewForm");

async function submitReview(event) {
  event.preventDefault();

  if (!currentUser || !hikeId) {
    alert("Please sign in and open a hike before posting a review.");
    return;
  }

  const newReview = {
    hikeDocID: hikeId,
    userID: currentUser.uid,
    userName: currentUser.displayName || currentUser.email,
    title: document.getElementById("reviewTitle").value,
    rating: Number(document.getElementById("reviewRating").value),
    text: document.getElementById("reviewText").value,
    timestamp: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "reviews"), newReview);
    reviewForm.reset();
    displayReviews();
  } catch (error) {
    alert(`Error saving review:\n${error.code || ""}\n${error.message}`);
  }
}

reviewForm.addEventListener("submit", submitReview);