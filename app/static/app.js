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
    const grid = document.getElementById("calendario-grid");
    const eventosHoy = document.getElementById("calendario-eventos-hoy");
    const mesAno = document.getElementById("cal-mes-ano");

    if (!data.enabled) {
        seccion.style.display = "none";
        return;
    }

    seccion.style.display = "";
    const eventos = data.eventos || [];
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth();

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                   "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    mesAno.textContent = `${meses[mes]} ${anio}`;

    const primerDia = new Date(anio, mes, 1).getDay();
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    let html = diasSemana.map(d => `<div class="cal-dia-header">${d}</div>`).join("");

    for (let i = 0; i < primerDia; i++) {
        html += `<div class="cal-dia cal-dia-vacio"></div>`;
    }

    const eventosPorDia = {};
    eventos.forEach(e => {
        const dia = parseInt(e.fecha_dia.split("-")[2]);
        if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
        eventosPorDia[dia].push(e);
    });

    for (let d = 1; d <= diasEnMes; d++) {
        const esHoy = d === hoy.getDate();
        const tieneEvento = eventosPorDia[d];
        let clase = "cal-dia";
        if (esHoy) clase += " cal-dia-hoy";
        if (tieneEvento) clase += " cal-dia-evento";
        html += `<div class="${clase}">${d}</div>`;
    }

    grid.innerHTML = html;

    const eventosHoyLista = eventosPorDia[hoy.getDate()] || [];
    if (eventosHoyLista.length > 0) {
        eventosHoy.innerHTML = eventosHoyLista.map(e => {
            const horaHtml = e.hora ? `<span class="cal-evento-hora">${e.hora}</span>` : "";
            return `
                <div class="cal-evento-item cal-evento-item-hoy">
                    <span class="cal-evento-titulo">${e.titulo}</span>
                    ${horaHtml}
                </div>
            `;
        }).join("");
    } else {
        eventosHoy.innerHTML = "";
    }
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