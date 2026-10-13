import { onAuthReady } from "./authentication.js";

function showName() {
    onAuthReady(function(user) {
        if (user) {
            const name = user.displayName || user.email;
            document.getElementById("name-goes-here").textContent = name + "!";
        } else {
            location.href = "index.html";
        }
    });
}

showName();