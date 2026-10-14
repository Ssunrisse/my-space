
// =====================================
// MY SPACE — SHARED NAVIGATION
// =====================================

const currentPage =
    window.location.pathname.split("/").pop() || "index.html";

const navigationLinks =
    document.querySelectorAll(".site-nav a");

navigationLinks.forEach(function(link) {
    const destination = link.getAttribute("href");

    if (destination === currentPage) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
    }
});
