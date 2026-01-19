// app.js - Lógica Principal y Renderizado

// --- CONSTANTES ---
export const POSTER_W = 900;
export const POSTER_H = 1200;
const POSTER_FRAME_PCT_MAX = 0.06;
const POSTER_FRAME_PCT_DEFAULT = POSTER_FRAME_PCT_MAX;
const POSTER_MARGIN_THICKNESS_FIXED = 4;
const OUTLINE_THICKNESS_FIXED = 4;

// --- ESTADO GLOBAL ---
export const state = {
    visible: { title: true, subtitle: true, place: true, coords: true, datetime: true },
    text: {
        title: "NIGHT SKY",
        subtitle: "A moment to remember",
        place: "Mexico City, MX",
        coords: "19.4326, -99.1332",
        date: "1995-12-25",
        time: "19:30",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    },
    map: {
        styleId: "classic",
        showGrid: false,
        gridOpacity: 0.60,
        showConstellations: true,
        colorTheme: "mono",
        mapZoom: 1.0,
        backgroundMode: "match",
        posterFrameEnabled: false,
        posterFramePct: POSTER_FRAME_PCT_DEFAULT,
        posterMarginEnabled: true,
        mapCircleMarginEnabled: true,
        seed: 12345,
    },
    export: { sizeKey: "digital_900x1200", format: "png", dpi: 300 }
};

// --- SELECTORES ---
export const $poster = document.getElementById("poster");
const $canvas = document.getElementById("mapCanvas");
const $pTitle = document.getElementById("pTitle");
const $pSubtitle = document.getElementById("pSubtitle");
const $pPlace = document.getElementById("pPlace");
const $pCoords = document.getElementById("pCoords");
const $pDatetime = document.getElementById("pDatetime");

// --- UTILIDADES (Matemáticas y Colores) ---
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function mulberry32(seed) {
    let t = seed >>> 0;
    return function() {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

// ... (Aquí incluirías el resto de tus funciones auxiliares como hexToRgb, colorsFor, etc.)

// --- LÓGICA DE DIBUJO ---
export function drawMap() {
    const ctx = $canvas.getContext("2d");
    const rand = mulberry32(state.map.seed);
    // ... (Aquí va todo tu código de drawStars, drawConstellations, etc.)
    console.log("Mapa dibujado con seed:", state.map.seed);
}

export function renderPosterAndMap() {
    // 1. Aplicar estilos CSS al poster (Layout, colores)
    // 2. Dibujar el mapa en el canvas
    drawMap();
    // 3. Actualizar textos
    $pTitle.textContent = state.text.title;
    // ... rest of rendering logic
}

// Inicialización básica
document.addEventListener("DOMContentLoaded", () => {
    renderPosterAndMap();
});
