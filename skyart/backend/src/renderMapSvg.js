// backend/src/renderMapSvg.js
// FIXES:
// - Contorno sólido (sin opacidad) y grosor configurable (default 4) + stroke-linecap round
// - Constelaciones con forma (Orion y Ursa Major) usando catálogo real (no líneas random)
// - clipPath con ID único por render (evita “cuadrados”/recortes raros)
// - Permite que el FRONT mande renderTokens para que el fondo del poster y el mapa coincidan

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (t >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash32(str) {
  str = String(str ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function svgEscape(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Catálogo mínimo (mismo set del front original, índices 0..33)
 * name, raDeg, decDeg, mag
 */
const STARS = [
  ["Sirius", 101.2875, -16.7161, -1.46],
  ["Canopus", 95.9879, -52.6957, -0.74],
  ["Arcturus", 213.9154, 19.1825, -0.05],
  ["Vega", 279.2347, 38.7837, 0.03],
  ["Capella", 79.1723, 45.9979, 0.08],
  ["Rigel", 78.6345, -8.2016, 0.12],
  ["Procyon", 114.8255, 5.2250, 0.38],
  ["Betelgeuse", 88.7929, 7.4071, 0.50],
  ["Achernar", 24.4286, -57.2368, 0.46],
  ["Hadar", 210.9558, -60.3730, 0.61],
  ["Altair", 297.6958, 8.8683, 0.76],
  ["Acrux", 186.6496, -63.0991, 0.77],
  ["Aldebaran", 68.9800, 16.5093, 0.85],
  ["Spica", 201.2983, -11.1614, 0.98],
  ["Antares", 247.3519, -26.4320, 1.06],
  ["Pollux", 116.3297, 28.0262, 1.14],
  ["Fomalhaut", 344.4128, -29.6222, 1.16],
  ["Deneb", 310.3579, 45.2803, 1.25],
  ["Mimosa", 191.9303, -59.6888, 1.25],
  ["Regulus", 152.0929, 11.9672, 1.35],
  ["Castor", 113.6494, 31.8883, 1.58],
  ["Bellatrix", 81.2828, 6.3497, 1.64],
  ["Elnath", 81.5729, 28.6074, 1.65],
  ["Miaplacidus", 138.3000, -69.7172, 1.67],
  ["Alnilam", 84.0534, -1.2019, 1.69],
  ["Alnair", 332.0583, -46.9611, 1.74],
  ["Alioth", 193.5073, 55.9598, 1.76],
  ["Dubhe", 165.9320, 61.7510, 1.79],
  ["Mirfak", 51.0807, 49.8612, 1.79],
  ["Wezen", 104.6564, -26.3932, 1.83],
  ["Sadr", 305.5571, 40.2567, 2.23],
  ["Alpheratz", 2.0969, 29.0904, 2.06],
  ["Almach", 30.9748, 42.3297, 2.10],
  ["Mizar", 200.9814, 54.9254, 2.23],
  ["Polaris", 37.9546, 89.2641, 1.98],
];

/**
 * Constellations (mismo estilo del front original)
 */
const CONSTELLATIONS = {
  Orion: [
    [7, 20], [20, 24], [24, 5],
    [7, 24],
  ],
  "Ursa Major": [
    [27, 33], [33, 26],
  ],
};

// Proyección simple (ortográfica) para que caigan dentro del círculo
function projectRaDec(raDeg, decDeg) {
  const lon = (raDeg * Math.PI) / 180;
  const lat = (decDeg * Math.PI) / 180;

  // ortographic-ish on unit disc
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);

  return { x, y };
}

function gridElements({ cx, cy, r, stroke }) {
  const els = [];
  // Círculos concéntricos
  for (let i = 1; i <= 4; i++) {
    const rr = (r * i) / 4;
    els.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${stroke}" stroke-width="1" opacity="0.65"/>`);
  }
  // Meridianos (radiales)
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    const x2 = cx + Math.cos(rad) * r;
    const y2 = cy + Math.sin(rad) * r;
    els.push(`<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="1" opacity="0.45"/>`);
  }
  return els.join("\n");
}

// Clip paths
function circleClipD(cx, cy, r) {
  return `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 -${2 * r},0`;
}
function heartPath(cx, cy, size) {
  const s = size / 16;
  const x0 = cx, y0 = cy + size * 0.10;
  return `
    M ${x0} ${y0}
    C ${x0 - 10 * s} ${y0 - 10 * s}, ${x0 - 22 * s} ${y0 + 4 * s}, ${x0} ${y0 + 20 * s}
    C ${x0 + 22 * s} ${y0 + 4 * s}, ${x0 + 10 * s} ${y0 - 10 * s}, ${x0} ${y0}
    Z
  `.trim().replace(/\s+/g, " ");
}
function rectClipD(w, h, inset) {
  const x = inset, y = inset;
  const ww = w - inset * 2;
  const hh = h - inset * 2;
  const rx = Math.round(Math.min(w, h) * 0.03);
  return `M ${x + rx} ${y}
          H ${x + ww - rx}
          Q ${x + ww} ${y} ${x + ww} ${y + rx}
          V ${y + hh - rx}
          Q ${x + ww} ${y + hh} ${x + ww - rx} ${y + hh}
          H ${x + rx}
          Q ${x} ${y + hh} ${x} ${y + hh - rx}
          V ${y + rx}
          Q ${x} ${y} ${x + rx} ${y}
          Z`.replace(/\s+/g, " ");
}

function colorsFor(theme) {
  // fallback si no llega renderTokens
  const THEMES = {
    mono: { bg: "#0A0B0D", star: "#FFFFFF", faint: "rgba(255,255,255,.18)", faint2: "rgba(255,255,255,.10)" },
    marino: { bg: "#0B0D12", star: "#FFFFFF", faint: "rgba(255,255,255,.18)", faint2: "rgba(255,255,255,.10)" },
    ice: { bg: "#071016", star: "#E9F6FF", faint: "rgba(233,246,255,.18)", faint2: "rgba(233,246,255,.10)" },
    warm: { bg: "#140E0A", star: "#F6E7C9", faint: "rgba(246,231,201,.18)", faint2: "rgba(246,231,201,.10)" },
    neonblue: { bg: "#000000", star: "#00E5FF", faint: "rgba(0,229,255,.25)", faint2: "rgba(0,229,255,.14)" },
    neonpink: { bg: "#000000", star: "#FF2BD6", faint: "rgba(255,43,214,.25)", faint2: "rgba(255,43,214,.14)" },
    neongreen: { bg: "#000000", star: "#32FF6A", faint: "rgba(50,255,106,.25)", faint2: "rgba(50,255,106,.14)" },
  };
  return THEMES[String(theme || "mono")] || THEMES.mono;
}

function renderMapSvg(opts) {
  const w = clamp(Number(opts.w || 780), 200, 2000);
  const h = clamp(Number(opts.h || 780), 200, 2000);

  const shape = String(opts.shape || "circle"); // circle | rect | heart
  const seed = hash32(opts.seed || "seed");
  const rand = mulberry32(seed);

  // tokens desde el FRONT (para que el poster y el mapa coincidan)
  const rt = opts.renderTokens || null;
  const fallbackTheme = colorsFor(opts.colorTheme);

  const posterBg = (rt && rt.posterBg) ? rt.posterBg : fallbackTheme.bg;
  const mapBg = (rt && rt.mapBg) ? rt.mapBg : fallbackTheme.bg;

  const starsColor = (rt && rt.stars) ? rt.stars : fallbackTheme.star;
  const gridLine = (rt && rt.gridLine) ? rt.gridLine : fallbackTheme.faint2;
  const constLine = (rt && rt.constLine) ? rt.constLine : fallbackTheme.faint;
  const constNode = (rt && rt.constNode) ? rt.constNode : fallbackTheme.star;

  // ✅ contorno sólido (sin opacidad)
  const outline = (rt && rt.outline) ? rt.outline : fallbackTheme.star;
  const outlineW = clamp(Number(opts.outlineThickness || 4), 0, 20);
  const outlineEnabled = !!opts.mapCircleMarginEnabled;

  // zoom
  const z = clamp(Number(opts.mapZoom || 1), 0.7, 1.6);

  // geometría base
  const cx = w / 2;
  const cyCircle = h / 2;

  // inset para círculo (para “margin” interior)
  const insetPad = (shape === "circle")
    ? Math.round(Math.min(w, h) * clamp(Number(opts.mapCircleInsetPct || 0.10), 0.02, 0.25))
    : 0;

  const rOuter = Math.min(w, h) / 2;
  const rContent = rOuter - insetPad;

  const cyHeart = (h / 2) - Math.round(h * 0.06);
  const baseSize = Math.min(w, h) * (0.5227 * 0.95);
  const heartSize = clamp(baseSize - insetPad * 0.95, baseSize * 0.70, baseSize);

  // ✅ clipPath único
  const clipId = `clipShape_${seed}`;

  let clipD = "";
  let outlineEl = "";

  if (shape === "circle") {
    clipD = circleClipD(cx, cyCircle, rContent);

    if (outlineEnabled && outlineW > 0) {
      // contorno a radio exacto (sin quitar grosor)
      outlineEl = `<path d="${circleClipD(cx, cyCircle, rContent)}" fill="none" stroke="${outline}" stroke-width="${outlineW}" stroke-linecap="round" opacity="1"/>`;
    }
  } else if (shape === "heart") {
    clipD = heartPath(cx, cyHeart, heartSize);

    if (outlineEnabled && outlineW > 0) {
      outlineEl = `<path d="${clipD}" fill="none" stroke="${outline}" stroke-width="${outlineW}" stroke-linecap="round" opacity="1"/>`;
    }
  } else {
    // rect
    clipD = rectClipD(w, h, insetPad);

    if (outlineEnabled && outlineW > 0) {
      const half = outlineW / 2;
      outlineEl = `<rect x="${half}" y="${half}" width="${w - outlineW}" height="${h - outlineW}" rx="${Math.round(Math.min(w, h) * 0.03)}" ry="${Math.round(Math.min(w, h) * 0.03)}" fill="none" stroke="${outline}" stroke-width="${outlineW}" stroke-linecap="round" opacity="1"/>`;
    }
  }

  const showGrid = !!opts.showGrid;
  const showConst = !!opts.showConstellations;

  // Transform (zoom)
  const tx = cx, ty = (shape === "heart") ? cyHeart : cyCircle;
  const transform = (z !== 1) ? `translate(${tx} ${ty}) scale(${z}) translate(${-tx} ${-ty})` : "";

  // Grid
  const mapR = (shape === "circle") ? rContent : Math.min(w, h) * 0.48;
  const grid = showGrid ? gridElements({ cx: tx, cy: ty, r: mapR, stroke: gridLine }) : "";

  // Stars:
  // - base estrellas “reales” (34) proyectadas
  // - + estrellas random para densidad (igual que antes)
  const stars = [];

  for (let i = 0; i < STARS.length; i++) {
    const [, ra, dec, mag] = STARS[i];
    const p = projectRaDec(ra, dec);

    // escala para que no pegue en el borde
    const scale = mapR * 0.92;
    const x = tx + p.x * scale;
    const y = ty - p.y * scale;

    // radio según magnitud (brillantes más grandes)
    const r = clamp(2.8 - (Number(mag) * 0.55), 0.9, 2.8);
    const a = clamp(0.85 - (Number(mag) * 0.08), 0.35, 0.92);

    stars.push({ x, y, r, a, catalogIndex: i });
  }

  // estrellas random extra
  const Nextra = Math.round(520 + (Math.min(w, h) / 780) * 380);
  for (let i = 0; i < Nextra; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = Math.max(0.55, Math.pow(rand(), 3) * 2.35);
    const a = clamp(0.18 + rand() * 0.65, 0.12, 0.85);
    stars.push({ x, y, r, a, catalogIndex: null });
  }

  // Constellation lines (✅ sin “rayas random”)
  const lines = [];
  if (showConst) {
    for (const key of Object.keys(CONSTELLATIONS)) {
      for (const [ia, ib] of CONSTELLATIONS[key]) {
        const A = stars.find(s => s.catalogIndex === ia);
        const B = stars.find(s => s.catalogIndex === ib);
        if (!A || !B) continue;
        lines.push({ x1: A.x, y1: A.y, x2: B.x, y2: B.y });
      }
    }
  }

  const lineEls = lines.map(l =>
    `<line x1="${l.x1.toFixed(2)}" y1="${l.y1.toFixed(2)}" x2="${l.x2.toFixed(2)}" y2="${l.y2.toFixed(2)}" stroke="${constLine}" stroke-width="1.5" stroke-linecap="round" opacity="1"/>`
  ).join("\n");

  // Nodos en extremos (se ven “como constelación”, no solo líneas)
  const nodeIdx = new Set();
  for (const l of lines) {
    // no tenemos id, así que pintamos nodos sobre las estrellas del catálogo
  }
  // Simple: nodos para todas las estrellas “de catálogo” cuando hay constelaciones
  const nodeEls = showConst
    ? stars
        .filter(s => s.catalogIndex !== null)
        .map(s => `<circle cx="${s.x.toFixed(2)}" cy="${s.y.toFixed(2)}" r="2.1" fill="${constNode}" opacity="0.9"/>`)
        .join("\n")
    : "";

  const starEls = stars.map(s =>
    `<circle cx="${s.x.toFixed(2)}" cy="${s.y.toFixed(2)}" r="${s.r.toFixed(2)}" fill="${starsColor}" opacity="${s.a.toFixed(3)}"/>`
  ).join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <clipPath id="${clipId}">
      <path d="${clipD}"/>
    </clipPath>
  </defs>

  <!-- Poster background -->
  <rect x="0" y="0" width="${w}" height="${h}" fill="${posterBg}"/>

  <!-- Map clipped area -->
  <g clip-path="url(#${clipId})">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${mapBg}"/>
    <g ${transform ? `transform="${transform}"` : ""}>
      ${grid}
      ${lineEls}
      ${nodeEls}
      ${starEls}
    </g>
  </g>

  ${outlineEl}
</svg>`;

  return svg;
}

module.exports = { renderMapSvg };
