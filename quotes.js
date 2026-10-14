
// ==========================================
// MY SPACE — DAILY INSPIRATION
// ==========================================

(() => {
    "use strict";

    const ROTATION_TIME = 15000;

    const quotes = [
        {text: "Every small step brings you closer to your dreams.", category: "Dreams"},
        {text: "Your story is still being written. Make the next chapter count.", category: "Growth"},
        {text: "Even the longest journey begins with one brave decision.", category: "Courage"},
        {text: "Rest is not giving up. It is preparing to begin again.", category: "Peace"},
        {text: "You don't need to be perfect to make progress.", category: "Motivation"},
        {text: "The stars are brightest when the sky is dark.", category: "Hope"},
        {text: "Believe in the person you are becoming.", category: "Growth"},
        {text: "Some beautiful things need time to bloom.", category: "Patience"},
        {text: "A quiet heart can hold the biggest dreams.", category: "Dreams"},
        {text: "The courage to try is already a victory.", category: "Courage"},
        {text: "Your pace is your own. Keep moving forward.", category: "Motivation"},
        {text: "Tomorrow is another chance to create something wonderful.", category: "Hope"},
        {text: "You are allowed to start over as many times as you need.", category: "Growth"},
        {text: "Sometimes the smallest moments become the best memories.", category: "Life"},
        {text: "Find beauty in the journey, not only the destination.", category: "Peace"},
        {text: "A little progress every day can change everything.", category: "Motivation"},
        {text: "Let your dreams be bigger than your fears.", category: "Courage"},
        {text: "Even on cloudy days, the sky is still there.", category: "Hope"},
        {text: "Create a life filled with moments worth remembering.", category: "Life"},
        {text: "You can be both a work in progress and something beautiful.", category: "Growth"},
        {text: "Don't forget to enjoy the world while chasing your goals.", category: "Peace"},
        {text: "Great things often begin as quiet ideas.", category: "Dreams"},
        {text: "A setback is a moment, not the end of your story.", category: "Resilience"},
        {text: "Be proud of the distance you've already traveled.", category: "Motivation"},
        {text: "Your next adventure might begin with a single step.", category: "Adventure"}
    ];

    const quoteText = document.getElementById("quote-text");
    const quoteCategory = document.getElementById("quote-category");
    const quoteCounter = document.getElementById("quote-counter");
    const quoteContent = document.querySelector(".quote-content");
    const progressFill = document.getElementById("quote-progress-fill");

    const previousButton = document.getElementById("quote-previous");
    const nextButton = document.getElementById("quote-next");
    const playButton = document.getElementById("quote-play");
    const copyButton = document.getElementById("quote-copy");

    let currentIndex = Math.floor(Math.random() * quotes.length);
    let playing = true;
    let elapsed = 0;
    let lastTick = performance.now();

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    function showQuote() {
        const quote = quotes[currentIndex];

        quoteText.textContent = quote.text;
        quoteCategory.textContent = quote.category;

        quoteCounter.textContent =
            String(currentIndex + 1).padStart(2, "0") +
            " / " + quotes.length;

        if (!reduceMotion.matches) {
            quoteContent.style.animation = "none";
            void quoteContent.offsetWidth;
            quoteContent.style.animation = "";
        }

        elapsed = 0;
        updateProgress();
    }

    function updateProgress() {
        const percentage = Math.min(elapsed / ROTATION_TIME * 100, 100);
        progressFill.style.width = percentage + "%";
    }

    function changeQuote(direction) {
        currentIndex =
            (currentIndex + direction + quotes.length) % quotes.length;

        showQuote();
    }

    previousButton.addEventListener("click", () => {
        changeQuote(-1);
    });

    nextButton.addEventListener("click", () => {
        changeQuote(1);
    });

    playButton.addEventListener("click", () => {
        playing = !playing;

        playButton.textContent = playing ? "Pause" : "Resume";
        playButton.setAttribute("aria-pressed", String(!playing));

        lastTick = performance.now();
    });

    copyButton.addEventListener("click", async () => {
        const text = quotes[currentIndex].text;

        try {
            await navigator.clipboard.writeText(text);
            copyButton.textContent = "Copied! ✓";
        } catch (error) {
            copyButton.textContent = "Copy unavailable";
        }

        setTimeout(() => {
            copyButton.textContent = "Copy Quote";
        }, 1800);
    });

    // Automatic rotation and visual progress.
    function tick(now) {
        const delta = Math.min(now - lastTick, 1000);
        lastTick = now;

        if (playing && !document.hidden) {
            elapsed += delta;

            if (elapsed >= ROTATION_TIME) {
                changeQuote(1);
            } else {
                updateProgress();
            }
        }

        requestAnimationFrame(tick);
    }

    // Avoid jumping forward after switching browser tabs.
    document.addEventListener("visibilitychange", () => {
        lastTick = performance.now();
    });

    // Hide missing or unavailable image.
    const animeGif = document.getElementById("anime-gif");

    animeGif.addEventListener("error", () => {
        animeGif.hidden = true;
    });

    showQuote();
    requestAnimationFrame(tick);
})();
