function actualizarReloj(){

// Obtener la fecha y hora actuales
const ahora = new Date();

// Convertir la hora a texto
const hora = ahora.toLocaleTimeString("es-Es", {
    hour12: false
})

// Buscar el reloj en nuestro HTML
const reloj = document.getElementById("Hora-actual")

// Cambiar el texto del reloj
reloj.textContent = hora;
}

// Mostrar la hora al cargar la pagina
actualizarReloj();

// Actualizar la hora cada segundo
setInterval(actualizarReloj, 1000);

// ================================================
// Lista de Tareas
// ================================================

// 1. Buscar nuestros elementos HTML
const formulario = document.getElementById("formulario-tarea");
const campoTarea = document.getElementById("nueva-tarea");
const listaTareas = document.getElementById("lista-tareas");
const contadorTareas = document.getElementById("contador-tareas"); 

// 2. Crear un array para guardar las tareas
let tareas = [];

// 3. Dibujar las tareas en pantalla
function mostrarTareas(){

    // Vaciar la lista antes de volver a dibujarla
    listaTareas.innerHTML = "";
    
    tareas.forEach(function(tarea, indice) {

        // Crea un elemento de lista
        const elemento = document.createElement("li");

        // Crea una casilla para completar la tarea
        const casilla = document.createElement("input");
        casilla.type = "checkbox";
        casilla.checked = tarea.completada;

        casilla.addEventListener("change", function(){
            tareas[indice].completada = casilla.checked;
            guardarTareas();
            mostrarTareas();
        });

        // Creare el texto de la tarea
        const texto = document.createElement("span");
        texto.textContent = tarea.texto;

        if (tarea.completada){
            texto.classList.add("completada");
        }

        // Crear boton para eliminar
        const botonEliminar = document.createElement("button");
        botonEliminar.textContent = "Eliminar";
        botonEliminar.type = "button";

        botonEliminar.addEventListener("click", function(){
            tareas.splice(indice, 1);
            guardarTareas()
            mostrarTareas()
        });

        // Añadir todos los elementos
        elemento.appendChild(casilla);
        elemento.appendChild(texto);
        elemento.appendChild(botonEliminar);

        listaTareas.appendChild(elemento);
    });

    // Actualizar el contador
    const completadas = tareas.filter(function(tarea){
        return tarea.completada;
    }).length;

    contadorTareas.textContent = 
        completadas + " de " + tareas.length + " completadas";
}

// 4. Guardar las tareas en el navegador
function guardarTareas(){
    localStorage.setItem("misTareas", JSON.stringify(tareas));
}

// 5. Recuperar tareas guardadas
const tareasGuardadas = localStorage.getItem("misTareas");

if (tareasGuardadas !== null) {
    tareas = JSON.parse(tareasGuardadas);
}

// 6. Detectar el envio del formulario
formulario.addEventListener("submit", function(evento){

    evento.preventDefault();

    const texto = campoTarea.value.trim();

    if (texto === "") {
        return;
    }

    // Crear un objeto que represente la tarea
    const nuevaTarea = {
        texto: texto,
        completada: false
    };

    // Añadirlo al array
    tareas.push(nuevaTarea);

    // Guardar y actualizar pantalla
    guardarTareas();
    mostrarTareas();

    // Vaciar el campo y volver a enforcarlo
    campoTarea.value = "";
    campoTarea.focus();
});

// 7. Mostrar las tareas al abrir la pagina
mostrarTareas();

// ======================================
// FECHA ACTUAL
// ======================================

function actualizarFecha() {

    const ahora = new Date();

    const fecha = ahora.toLocaleDateString("es-Es", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    const elementoFecha = document.getElementById("fecha-actual");

    elementoFecha.textContent = fecha;
}

actualizarFecha();
setInterval(actualizarFecha, 60000);


// ======================================
// SALUDO Y NOMBRE DEL USUARIO
// ======================================

// 1. Buscar elementos HTML
const elementoSaludo = document.getElementById("saludo");
const formularioNombre = document.getElementById("formulario-nombre");
const campoNombre = document.getElementById("nombre-usuario");

// 2. Recuperar el nombre guardado
let nombreUsuario = localStorage.getItem("nombreUsuario") || "";

// 3. Mostrarlo en el campo de texto
campoNombre.value = nombreUsuario;

// 4. Crear el saludo automático
function actualizarSaludo() {

    const hora = new Date().getHours();

    let saludo = "";

    if (hora >= 5 && hora < 12) {
        saludo = "¡Buenos días";
    } else if (hora >= 12 && hora < 20) {
        saludo = "¡Buenas tardes";
    } else {
        saludo = "¡Buenas noches";
    }

    if (nombreUsuario !== "") {
        saludo += ", " + nombreUsuario;
    }

    elementoSaludo.textContent = saludo + "! 👋";
}

// 5. Guardar el nombre al enviar el formulario
formularioNombre.addEventListener("submit", function(evento) {

    evento.preventDefault();

    nombreUsuario = campoNombre.value.trim();

    localStorage.setItem("nombreUsuario", nombreUsuario);

    actualizarSaludo();
});

// 6. Mostrar el saludo al abrir la página
actualizarSaludo();

// 7. Actualizar el saludo cada minuto
setInterval(actualizarSaludo, 60000);


// ======================================
// MODO CLARO Y OSCURO
// ======================================

const botonTema = document.getElementById("boton-tema");

// Recuperar el tema guardado
const temaGuardado = localStorage.getItem("tema");

// Aplicar el modo claro si estaba guardado
if(temaGuardado === "claro"){
    document.body.classList.add("modo-claro");
}

// Cambiar el texto del boton
function actualizarBotonTema(){
    const modoClaro = document.body.classList.contains("modo-claro");

    if(modoClaro){
        botonTema.textContent = "🌙 Modo oscuro";
    } else{
        botonTema.textContent = "☀️ Modo claro";
    }
}


// Detectar clic en el boton
botonTema.addEventListener("click", function(){
    document.body.classList.toggle("modo-claro");

    const modoClaro = document.body.classList.contains("modo-claro");

    if(modoClaro) {
        localStorage.setItem("tema", "claro");
    } else{
        localStorage.setItem("tema", "oscuro");
    }
    actualizarBotonTema();
});

actualizarBotonTema();