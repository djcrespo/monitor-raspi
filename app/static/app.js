const CLIMA_INTERVAL = 15 * 60 * 1000;
const GALERIA_INTERVAL = 30 * 1000;
const CALENDARIO_INTERVAL = 60 * 60 * 1000;
const SLIDESHOW_INTERVAL = 8 * 1000;

let currentImageIndex = 0;
let imagenes = [];

async function fetchClima() {
    try {
        const resp = await fetch("/api/weather");
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();
        renderClima(data);
        document.getElementById("error-banner").style.display = "none";
    } catch (e) {
        console.warn("Error consultando clima:", e);
    }
}

function renderClima(data) {
    const climaEl = document.getElementById("clima-actual");
    climaEl.innerHTML = `
        <div class="icono-grande">${getIcon(data.icono)}</div>
        <div class="temp-principal">${data.temp}<span>°C</span></div>
        <div class="sensacion">Sensación: <span>${data.sensacion}°C</span></div>
    `;

    const pronosticoEl = document.getElementById("pronostico");
    pronosticoEl.innerHTML = data.pronostico.slice(0, 5).map(d => `
        <div class="dia-pronostico">
            <span class="dia-nombre">${formatDia(d.fecha)}</span>
            <span class="icono-chico">${getIcon(d.icono)}</span>
            <span class="temp-max">${d.max}°</span>
            <span class="temp-min">${d.min}°</span>
        </div>
    `).join("");

    document.getElementById("ciudad-display").textContent = data.ciudad || "";
}

function formatDia(fecha) {
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const d = new Date(fecha + "T12:00:00");
    return dias[d.getDay()];
}

function getIcon(codigo) {
    const icons = {
        "soleado": "☀️",
        "mayormente_soleado": "🌤️",
        "parcialmente_nublado": "⛅",
        "nublado": "☁️",
        "niebla": "🌫️",
        "llovizna": "🌦️",
        "lluvia": "🌧️",
        "lluvia_congelante": "🌨️",
        "nieve": "❄️",
        "chubascos": "🌧️",
        "chubascos_nieve": "🌨️",
        "tormenta": "⛈️",
        "desconocido": "❓",
    };
    return icons[codigo] || "❓";
}

async function fetchGaleria() {
    try {
        const resp = await fetch("/api/gallery");
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();
        imagenes = data.imagenes || [];
        currentImageIndex = 0;
        renderGaleria();
    } catch (e) {
        console.warn("Error consultando galería:", e);
    }
}

function renderGaleria() {
    const container = document.getElementById("slideshow-container");

    if (imagenes.length === 0) {
        container.innerHTML = `
            <div class="sin-imagenes">
                <div class="sin-imagenes-icono">🖼️</div>
                <div class="sin-imagenes-texto">No hay fotos disponibles</div>
                <div class="sin-imagenes-ruta">~/Pictures/kiosk-gallery/</div>
            </div>
        `;
        return;
    }

    container.innerHTML = imagenes.map((src, i) =>
        `<img src="${src}" class="${i === 0 ? "active" : ""}" />`
    ).join("");

    document.getElementById("galeria-count").textContent = `${imagenes.length} foto${imagenes.length !== 1 ? "s" : ""}`;
}

async function fetchCalendario() {
    try {
        const resp = await fetch("/api/calendar");
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();
        renderCalendario(data);
    } catch (e) {
        console.warn("Error consultando calendario:", e);
    }
}

function renderCalendario(data) {
    const seccion = document.getElementById("calendario-seccion");
    const contenedor = document.getElementById("calendario-eventos");

    if (!data.enabled) {
        seccion.style.display = "none";
        return;
    }

    seccion.style.display = "";
    const eventos = data.eventos || [];

    if (eventos.length === 0) {
        contenedor.innerHTML = `
            <div class="sin-eventos">
                <span>📅</span>
                <span>Sin eventos próximos</span>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = eventos.map(e => {
        const hoy = esHoy(e.fecha_dia);
        const horaHtml = e.hora ? `<span class="evento-hora">${e.hora}</span>` : "";
        return `
            <div class="evento-item ${hoy ? "evento-hoy" : ""}">
                <div class="evento-fecha">
                    <span class="evento-dia-nombre">${e.dia_semana}</span>
                    <span class="evento-dia-numero">${e.fecha_dia.split("-")[2]}</span>
                </div>
                <div class="evento-info">
                    <div class="evento-titulo">${e.titulo}</div>
                    ${horaHtml}
                </div>
            </div>
        `;
    }).join("");
}

function esHoy(fechaDia) {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    return fechaDia === `${yyyy}-${mm}-${dd}`;
}

function nextImage() {
    if (imagenes.length <= 1) return;

    const slides = document.querySelectorAll("#slideshow-container img");
    if (slides.length === 0) return;

    slides[currentImageIndex].classList.remove("active");
    currentImageIndex = (currentImageIndex + 1) % imagenes.length;
    slides[currentImageIndex].classList.add("active");
}

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    document.getElementById("reloj").textContent = `${h}:${m}`;

    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                   "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const diaSemana = dias[now.getDay()];
    const dia = now.getDate();
    const mes = meses[now.getMonth()];
    document.getElementById("fecha").textContent = `${diaSemana}, ${dia} de ${mes}`;
}

function init() {
    updateClock();
    setInterval(updateClock, 1000);

    fetchClima();
    setInterval(fetchClima, CLIMA_INTERVAL);

    fetchGaleria();
    setInterval(fetchGaleria, GALERIA_INTERVAL);

    fetchCalendario();
    setInterval(fetchCalendario, CALENDARIO_INTERVAL);

    setInterval(nextImage, SLIDESHOW_INTERVAL);
}

document.addEventListener("DOMContentLoaded", init);