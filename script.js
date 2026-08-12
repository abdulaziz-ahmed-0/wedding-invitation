import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
    getDatabase,
    ref,
    push,
    onValue,
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

// User's Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDSIjzFg12W6G1d4gkyBC06nvjURT0enks",
    authDomain: "invetation-21d9b.firebaseapp.com",
    projectId: "invetation-21d9b",
    storageBucket: "invetation-21d9b.firebasestorage.app",
    messagingSenderId: "552974787469",
    appId: "1:552974787469:web:f5dfd1fb1fb6aa7fe093c4",
    measurementId: "G-YB2V159HQT",
    databaseURL: "https://invetation-21d9b-default-rtdb.firebaseio.com", // Added for Realtime Database
};

let db = null;
try {
    if (firebaseConfig.apiKey) {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
    }
} catch (e) {
    console.log("Firebase not setup yet.");
}

document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const coverScreen = document.getElementById("cover");
    const mainContent = document.getElementById("main-content");
    const openBtn = document.getElementById("open-btn");
    const audio = document.getElementById("bg-music");
    const musicBtn = document.getElementById("music-btn");
    const musicIcon = musicBtn.querySelector("i");

    // 1. Open Invitation Logic
    openBtn.addEventListener("click", () => {
        // Fade out cover
        coverScreen.classList.remove("active");
        coverScreen.classList.add("hidden-state");

        // Show main content
        setTimeout(() => {
            coverScreen.style.display = "none";
            mainContent.classList.remove("hidden");
            musicBtn.style.display = "flex"; // Show music button

            // 1. Jump to the top of main content first
            window.scrollTo(0, 0);

            // 2. Start auto-scroll - total duration = 3.6 seconds
            let scrollInterval;
            function startAutoScroll() {
                const totalHeight = document.body.scrollHeight - window.innerHeight;
                const durationMs = 36000; // 3.6 seconds
                const intervalMs = 30; // tick every 30ms
                const steps = durationMs / intervalMs; // = 1000 steps
                const scrollPerStep = totalHeight / steps; // px per tick

                scrollInterval = setInterval(() => {
                    window.scrollBy(0, scrollPerStep);
                    if (
                        window.innerHeight + window.scrollY >=
                        document.body.offsetHeight - 2
                    ) {
                        clearInterval(scrollInterval);
                    }
                }, intervalMs);
            }

            // Stop auto-scroll if user interacts
            function stopAutoScroll() {
                if (scrollInterval) clearInterval(scrollInterval);
            }
            window.addEventListener("wheel", stopAutoScroll);
            window.addEventListener("touchstart", stopAutoScroll);
            window.addEventListener("mousedown", stopAutoScroll);

            setTimeout(startAutoScroll, 1000); // Start after 1 second

            // Try to play audio (some browsers might still block it if not user-initiated enough, but 'click' usually works)
            playAudio();
        }, 1000); // Wait for fade transition
    });

    // 2. Audio Control Logic
    let isPlaying = false;

    function playAudio() {
        audio
            .play()
            .then(() => {
                isPlaying = true;
                musicIcon.classList.remove("fa-music");
                musicIcon.classList.add("fa-pause");
                musicBtn.classList.add("playing");
            })
            .catch((err) => {
                console.log(
                    "Audio playback failed (usually due to browser autoplay policies):",
                    err,
                );
                isPlaying = false;
            });
    }

    function pauseAudio() {
        audio.pause();
        isPlaying = false;
        musicIcon.classList.remove("fa-pause");
        musicIcon.classList.add("fa-play");
        musicBtn.classList.remove("playing");
    }

    musicBtn.addEventListener("click", () => {
        if (isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    });

    // 3. Countdown Timer Logic
    // Wedding Date: Sep 12, 2026, 21:00:00 (9 PM)
    const weddingDate = new Date("September 12, 2026 21:00:00").getTime();

    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = weddingDate - now;

        if (distance < 0) {
            // Wedding has passed
            document.getElementById("countdown").innerHTML =
                "The wedding has already happened! 🎉";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
            (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.textContent = days.toString().padStart(2, "0");
        hoursEl.textContent = hours.toString().padStart(2, "0");
        minutesEl.textContent = minutes.toString().padStart(2, "0");
        secondsEl.textContent = seconds.toString().padStart(2, "0");
    }

    // Update countdown every second
    setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    // 4. Guestbook Form Logic
    const guestbookForm = document.getElementById("guestbook-form");
    const wishesList = document.getElementById("wishes-list");

    function addWishToDOM(name, text, time) {
        const wishCard = document.createElement("div");
        wishCard.classList.add("wish-card");
        wishCard.innerHTML = `
            <div class="wish-header">
                <span class="wish-name">${escapeHTML(name)}</span>
                <span class="wish-time">${time}</span>
            </div>
            <div class="wish-body">${escapeHTML(text)}</div>
        `;
        wishesList.prepend(wishCard);
    }

    function escapeHTML(str) {
        return str.replace(
            /[&<>'"]/g,
            (tag) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    "'": "&#39;",
                    '"': "&quot;",
                })[tag] || tag,
        );
    }

    function renderWishesLocal(wishes) {
        wishesList.innerHTML = "";
        wishes.forEach((wish) => {
            addWishToDOM(wish.name, wish.text, wish.time);
        });
    }

    if (db) {
        // --- FIREBASE MODE ---
        const wishesRef = ref(db, "wishes");

        // Listen for new wishes live
        onValue(wishesRef, (snapshot) => {
            wishesList.innerHTML = "";
            snapshot.forEach((childSnapshot) => {
                const wish = childSnapshot.val();
                addWishToDOM(wish.name, wish.text, wish.time);
            });
        });

        guestbookForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("guest-name").value.trim();
            const text = document.getElementById("guest-wishes").value.trim();

            if (name && text) {
                const timeString = new Date().toLocaleString();
                push(wishesRef, { name, text, time: timeString });

                document.getElementById("guest-name").value = "";
                document.getElementById("guest-wishes").value = "";
            }
        });
    } else {
        // --- LOCAL STORAGE MODE (Fallback until user adds config) ---
        const savedWishes = JSON.parse(localStorage.getItem("weddingWishes")) || [];

        if (savedWishes.length > 0) {
            renderWishesLocal(savedWishes);
        }

        guestbookForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("guest-name").value.trim();
            const text = document.getElementById("guest-wishes").value.trim();

            if (name && text) {
                const timeString = new Date().toLocaleString();
                addWishToDOM(name, text, timeString);

                savedWishes.push({ name, text, time: timeString });
                localStorage.setItem("weddingWishes", JSON.stringify(savedWishes));

                document.getElementById("guest-name").value = "";
                document.getElementById("guest-wishes").value = "";
            }
        });
    }

    // Load saved wishes on startup if not using Firebase
    if (!db) {
        const savedWishesInit =
            JSON.parse(localStorage.getItem("weddingWishes")) || [];
        if (savedWishesInit.length > 0) renderWishesLocal(savedWishesInit);
    }
});
