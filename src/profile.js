import { db } from "./firebaseConfig.js";
import { onAuthReady } from "./authentication.js";
import {
    doc, getDoc, updateDoc,
    collection, getDocs, query, where, documentId,
    setDoc, arrayUnion, arrayRemove
} from "firebase/firestore";


const fields = ["name", "country", "school", "bio"];
let currentUser = null;
let savedProfile = {};
let favourites = [];

onAuthReady(async function (user) {
    if (!user) {
        location.href = "index.html";
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data() || {};
        currentUser = user;
        savedProfile = data;


        showHeader(data.name || user.displayName || user.email || "My profile", user.email);

        fields.forEach(function (field) {
            document.getElementById(field + "Input").value = data[field] || "";
        });

        favourites = data.favourites || [];
        await displayFavourites();

    } catch (error) {
        console.error("Error loading profile:", error);
    }
});

function showHeader(name, email) {
    document.getElementById("avatar").textContent = name.charAt(0).toUpperCase();
    document.getElementById("profileName").textContent = name;
    document.getElementById("profileEmail").textContent = email || "";
}

const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");
const profileAlert = document.getElementById("profileAlert");

function setEditing(isEditing) {
    fields.forEach(function (field) {
        document.getElementById(field + "Input").disabled = !isEditing;
    });
    saveBtn.disabled = !isEditing;
}

editBtn.addEventListener("click", function () {
    if (!currentUser) return;

    profileAlert.classList.add("d-none");
    setEditing(true);
    document.getElementById("nameInput").focus();
});

document.getElementById("profileForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!currentUser || saveBtn.disabled) return;

    const updates = {};

    fields.forEach(function (field) {
        const value = document.getElementById(field + "Input").value;
        if (value !== (savedProfile[field] || "")) {
            updates[field] = value;
        }
    });

    setEditing(false);
    editBtn.disabled = true;

    try {
        if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "users", currentUser.uid), updates);
            Object.assign(savedProfile, updates);
        }

        const name = savedProfile.name || currentUser.displayName
            || currentUser.email || "My profile";
        showHeader(name, currentUser.email);

        profileAlert.textContent = "Profile saved!";
        profileAlert.classList.remove("d-none");
    } catch (error) {
        setEditing(true);
        alert(`Error saving profile: ${error.message}`);
    } finally {
        editBtn.disabled = false;
    }
});

async function displayFavourites() {
    const container = document.getElementById("hikes-go-here");
    const template = document.getElementById("hikeCardTemplate");
    container.replaceChildren();

    if (favourites.length === 0) {
        container.textContent = "You haven't favourited any hikes yet.";
        return;
    }

    try {
        const favouritesQuery = query(
            collection(db, "hikes"),
            where(documentId(), "in", favourites)
        );
        const snapshot = await getDocs(favouritesQuery);

        snapshot.forEach(function (hikeDoc) {
            const hike = hikeDoc.data();
            const card = template.content.cloneNode(true);

            card.querySelector(".card-title").textContent = hike.name;
            card.querySelector(".card-text").textContent =
                hike.details || `Located in ${hike.city}.`;
            card.querySelector(".card-length").textContent = hike.length;
            card.querySelector(".card-image").src = `/images/${hike.code}.jpg`;
            card.querySelector(".read-more").href =
                `eachHike.html?docID=${hikeDoc.id}`;

            setupHeart(card, hikeDoc.id);
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading favourite hikes:", error);
        container.textContent = "Could not load favourite hikes.";
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