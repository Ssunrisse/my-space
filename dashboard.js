
// ======================================
// MY SPACE — DASHBOARD
// Clock, date and greeting
// ======================================

const greeting = document.getElementById("dashboard-greeting");
const todayLabel = document.getElementById("today-label");

if (localStorage.getItem("tema") === "claro") {
    document.body.classList.add("modo-claro");
}

// PERSONALIZED GREETING

function updateGreeting() {
    const hour = new Date().getHours();
    const name = localStorage.getItem("nombreUsuario") || "";

    let message = "Good evening";

    if (hour >= 5 && hour < 12) {
        message = "Good morning";
    } else if (hour >= 12 && hour < 20) {
        message = "Good afternoon";
    }

    greeting.textContent =
        message + (name ? ", " + name : "") + "! 👋";
}

// ANALOG CLOCK

const hourHand = document.getElementById("hour-hand");
const minuteHand = document.getElementById("minute-hand");
const secondHand = document.getElementById("second-hand");

const digitalClock = document.getElementById("digital-clock");
const clockDate = document.getElementById("clock-date");
const clockMarks = document.getElementById("clock-marks");

for (let i = 0; i < 60; i++) {
    const mark = document.createElement("div");

    mark.className = "clock-mark";

    if (i % 5 === 0) {
        mark.classList.add("major");
    }

    const angle = i * Math.PI / 30;

    mark.style.left = (50 + Math.sin(angle) * 43) + "%";
    mark.style.top = (50 - Math.cos(angle) * 43) + "%";
    mark.style.transform =
        `translate(-50%, -50%) rotate(${i * 6}deg)`;

    clockMarks.appendChild(mark);
}

let previousSecond = -1;

function animateClock() {
    const now = new Date();

    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    secondHand.style.transform = `rotate(${seconds * 6}deg)`;
    minuteHand.style.transform = `rotate(${minutes * 6}deg)`;
    hourHand.style.transform = `rotate(${hours * 30}deg)`;

    if (now.getSeconds() !== previousSecond) {
        previousSecond = now.getSeconds();

        digitalClock.textContent =
            now.toLocaleTimeString("en-GB");

        clockDate.textContent =
            now.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            });

        todayLabel.textContent =
            now.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric"
            });

        updateGreeting();
    }

    requestAnimationFrame(animateClock);
}

updateGreeting();
animateClock();
