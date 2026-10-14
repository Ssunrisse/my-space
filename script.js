
// ======================================
// MY SPACE — SHARED PAGE SETTINGS
// ======================================

// THEME

const savedTheme = localStorage.getItem("tema");

if (savedTheme === "claro") {
    document.body.classList.add("modo-claro");
}

const themeButton = document.getElementById("boton-tema");

function updateThemeButton() {
    if (!themeButton) return;

    const isLight =
        document.body.classList.contains("modo-claro");

    themeButton.textContent = isLight
        ? "🌙 Dark Mode"
        : "☀️ Light Mode";
}

if (themeButton) {
    themeButton.addEventListener("click", function() {
        document.body.classList.toggle("modo-claro");

        const isLight =
            document.body.classList.contains("modo-claro");

        localStorage.setItem(
            "tema",
            isLight ? "claro" : "oscuro"
        );

        updateThemeButton();
    });

    updateThemeButton();
}

// USER NAME

const nameForm = document.getElementById("formulario-nombre");
const nameInput = document.getElementById("nombre-usuario");

if (nameForm && nameInput) {
    nameInput.value =
        localStorage.getItem("nombreUsuario") || "";

    nameForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const name = nameInput.value.trim();

        localStorage.setItem("nombreUsuario", name);
    });
}
