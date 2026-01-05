/* Star Map Pro
   - estilos con thumbnails
   - fuentes (5)
   - estrellas más grandes
   - constelaciones
   - textos debajo del mapa, centrados
   - spotify code vía backend
   - NO modules (compatible con servers con MIME raros)
*/

const $ = (id) => document.getElementById(id);
const canvas = $("c");
const ctx = canvas.getContext("2d", { alpha: false });

const state = {
  styleKey: "classic_dark",
  stars: null,              // generated fallback stars
  spotifyCodeBitmap: null,  // ImageBitmap
  spotifyLabel: ""          // opcional: texto track (no mostramos por defecto)
};

/* -------------------- Fonts (5 presets) -------------------- */
const FONT_PRESETS = {
  inter: {
    name: "Inter",
    title: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    body: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  montserrat: {
    name: "Montserrat",
    title: "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    body: "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  playfair: {
    name: "Playfair Display",
    title: "'Playfair Display', Georgia, 'Times New Roman', Times, serif",
    body: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  cormorant: {
    name: "Cormorant Garamond",
    title: "'Cormorant Garamond', Georgia, 'Times New Roman', Times, serif",
    body: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  mono: {
    name: "Space Mono",
    title: "'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    body: "'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
  }
};

/* -------------------- Style presets (para thumbnails + render) -------------------- */
const STYLE_PRESETS = {
  classic_dark: {
    name: "Classic Dark",
    desc: "Premium oscuro, glow suave",
    bg: "#0b1020",
    fg: "#e8ecff",
    faint: "rgba(232,236,255,.55)",
    faint2: "rgba(232,236,255,.18)",
    border: "rgba(232,236,255,.18)",
    cardShadow: "rgba(0,0,0,.35)",
    borderRadius: 18,
    gridDash: [8, 12],
    gridAlpha: 0.40,
    ringAlts: [15, 30, 45, 60, 75],
    starGlowAlphaMul: 0.30,
    starGlowMul: 2.6,
    skyStrokeWidth: 1.6,
    constellationsAlpha: 0.38,
    constellationsWidth: 1.25
  },
  classic_black: {
    name: "Classic Black",
    desc: "Negro profundo, alto contraste",
    bg: "#050608",
    fg: "#ffffff",
    faint: "rgba(255,255,255,.55)",
    faint2: "rgba(255,255,255,.16)",
    border: "rgba(255,255,255,.12)",
    cardShadow: "rgba(0,0,0,.45)",
    borderRadius: 18,
    gridDash: [6, 12],
    gridAlpha: 0.34,
    ringAlts: [15, 30, 45, 60, 75],
    starGlowAlphaMul: 0.24,
    starGlowMul: 2.8,
    skyStrokeWidth: 1.75,
    constellationsAlpha: 0.34,
    constellationsWidth: 1.2
  },
  blueprint: {
    name: "Blueprint",
    desc: "Azul técnico, detalle extra",
    bg: "#081a3a",
    fg: "#dbeafe",
    faint: "rgba(219,234,254,.62)",
    faint2: "rgba(219,234,254,.20)",
    border: "rgba(219,234,254,.22)",
    cardShadow: "rgba(0,0,0,.35)",
    borderRadius: 16,
    gridDash: [4, 10],
    gridAlpha: 0.48,
    ringAlts: [10, 25, 40, 55, 70, 85],
    starGlowAlphaMul: 0.22,
    starGlowMul: 2.3,
    skyStrokeWidth: 1.8,
    constellationsAlpha: 0.42,
    constellationsWidth: 1.35
  },
  paper_cream: {
    name: "Paper Cream",
    desc: "Fondo claro, elegante",
    bg: "#fbf2df",
    fg: "#141414",
    faint: "rgba(20,20,20,.60)",
    faint2: "rgba(20,20,20,.15)",
    border: "rgba(20,20,20,.16)",
    cardShadow: "rgba(0,0,0,.18)",
    borderRadius: 18,
    gridDash: [8, 12],
    gridAlpha: 0.40,
    ringAlts: [15, 30, 45, 60, 75],
    starGlowAlphaMul: 0.14,
    starGlowMul: 1.8,
    skyStrokeWidth: 1.5,
    constellationsAlpha: 0.34,
    constellationsWidth: 1.25
  },
  modern_mono: {
    name: "Modern Mono",
    desc: "Mono/tech, minimal premium",
    bg: "#0b0b0c",
    fg: "#f5f5f5",
    faint: "rgba(245,245,245,.52)",
    faint2: "rgba(245,245,245,.14)",
    border: "rgba(245,245,245,.12)",
    cardShadow: "rgba(0,0,0,.45)",
    borderRadius: 18,
    gridDash: [10, 16],
    gridAlpha: 0.26,
    ringAlts: [15, 35, 55, 75],
    starGlowAlphaMul: 0.18,
    starGlowMul: 2.2,
    skyStrokeWidth: 1.4,
    constellationsAlpha: 0.28,
    constellationsWidth: 1.1
  },
  minimal_black: {
    name: "Minimal Black",
    desc: "Limpio, casi sin grid",
    bg: "#07080a",
    fg: "#f3f4f6",
    faint: "rgba(243,244,246,.45)",
    faint2: "rgba(243,244,246,.10)",
    border: "rgba(243,244,246,.10)",
    cardShadow: "rgba(0,0,0,.40)",
    borderRadius: 22,
    gridDash: [9999, 0], // sin dash
    gridAlpha: 0.18,
    ringAlts: [30, 60],
    starGlowAlphaMul: 0.0,
    starGlowMul: 0.0,
    skyStrokeWidth: 1.2,
    constellationsAlpha: 0.20,
    constellationsWidth: 1.0
  }
};

function getStyle() {
  return STYLE_PRESETS[state.styleKey] || STYLE_PRESETS.classic_dark;
}

/* -------------------- Constellations (subset, looks premium) --------------------
   RA/Dec degrees + magnitude (roughly)
*/
const BRIGHT_STARS = {
  // Orion
  Betelgeuse: { ra: 88.7929, dec: 7.4071, mag: 0.50 },
  Bellatrix:  { ra: 81.2828, dec: 6.3497, mag: 1.64 },
  Alnilam:    { ra: 84.0534, dec: -1.2019, mag: 1.69 },
  Mintaka:    { ra: 83.0017, dec: -0.2991, mag: 2.25 },
  Alnitak:    { ra: 85.1897, dec: -1.9426, mag: 1.74 },
  Rigel:      { ra: 78.6345, dec: -8.2016, mag: 0.12 },
  Saiph:      { ra: 86.9391, dec: -9.6696, mag: 2.06 },

  // Ursa Major (Big Dipper part)
  Dubhe:      { ra: 165.9320, dec: 61.7510, mag: 1.79 },
  Merak:      { ra: 165.4603, dec: 56.3824, mag: 2.37 },
  Phecda:     { ra: 178.4577, dec: 53.6948, mag: 2.44 },
  Megrez:     { ra: 183.8565, dec: 57.0326, mag: 3.32 },
  Alioth:     { ra: 193.5073, dec: 55.9598, mag: 1.76 },
  Mizar:      { ra: 200.9814, dec: 54.9254, mag: 2.23 },
  Alkaid:     { ra: 206.8856, dec: 49.3133, mag: 1.86 },

  // Cassiopeia (W)
  Schedar:    { ra: 10.1260,  dec: 56.5373, mag: 2.24 },
  Caph:       { ra: 2.2945,   dec: 59.1498, mag: 2.28 },
  GammaCas:   { ra: 14.1771,  dec: 60.7167, mag: 2.47 },
  Ruchbah:    { ra: 21.4540,  dec: 60.2353, mag: 2.68 },
  Segin:      { ra: 28.5989,  dec: 63.6701, mag: 3.35 },

  // Scorpius (partial)
  Antares:    { ra: 247.3519, dec: -26.4320, mag: 1.06 },
  Shaula:     { ra: 263.4022, dec: -37.1038, mag: 1.62 },
  Sargas:     { ra: 263.7333, dec: -42.9978, mag: 1.86 },

  // Lyra
  Vega:       { ra: 279.2347, dec: 38.7837, mag: 0.03 },
  Sheliak:    { ra: 281.4156, dec: 33.3627, mag: 3.45 },
  Sulafat:    { ra: 284.7359, dec: 32.6896, mag: 3.25 },

  // Cygnus (partial)
  Deneb:      { ra: 310.3579, dec: 45.2803, mag: 1.25 },
  Sadr:       { ra: 305.5571, dec: 40.2567, mag: 2.23 },
  Albireo:    { ra: 292.6803, dec: 27.9597, mag: 3.05 }
};

const CONSTELLATIONS = [
  {
    name: "Orion",
    segments: [
      ["Betelgeuse","Bellatrix"],
      ["Bellatrix","Alnilam"],
      ["Alnilam","Mintaka"],
      ["Alnilam","Alnitak"],
      ["Alnitak","Saiph"],
      ["Saiph","Rigel"],
      ["Rigel","Mintaka"],
      ["Mintaka","Bellatrix"],
      ["Betelgeuse","Alnitak"],
      ["Betelgeuse","Saiph"]
    ]
  },
  {
    name: "Ursa Major",
    segments: [
      ["Dubhe","Merak"],
      ["Merak","Phecda"],
      ["Phecda","Megrez"],
      ["Megrez","Alioth"],
      ["Alioth","Mizar"],
      ["Mizar","Alkaid"]
    ]
  },
  {
    name: "Cassiopeia",
    segments: [
      ["Caph","Schedar"],
      ["Schedar","GammaCas"],
      ["GammaCas","Ruchbah"],
      ["Ruchbah","Segin"]
    ]
  },
  {
    name: "Scorpius",
    segments: [
      ["Antares","Shaula"],
      ["Shaula","Sargas"]
    ]
  },
  {
    name: "Lyra",
    segments: [
      ["Vega","Sheliak"],
      ["Sheliak","Sulafat"],
      ["Sulafat","Vega"]
    ]
  },
  {
    name: "Cygnus",
    segments: [
      ["Deneb","Sadr"],
      ["Sadr","Albireo"]
    ]
  }
];

/* -------------------- UI helpers -------------------- */
function showError(e) {
  const box = $("err");
  if (!box) return;
  box.style.display = "block";
  box.textContent = "Error: " + (e?.message || String(e));
  console.error(e);
}
function clearError() {
  const box = $("err");
  if (!box) return;
  box.style.display = "none";
  box.textContent = "";
}
function pad2(n) { return String(n).padStart(2, "0"); }
function clampInt(v, a, b) {
  v = Number.isFinite(v) ? Math.round(v) : a;
  return Math.max(a, Math.min(b, v));
}
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function setDefaultDatetime() {
  const now = new Date();
  const local = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  $("dt").value = local;
}
function fmtDate(date) {
  return date.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* -------------------- Config -------------------- */
function getFontPreset() {
  const k = $("fontPreset")?.value || "inter";
  return FONT_PRESETS[k] || FONT_PRESETS.inter;
}

function getConfig() {
  const style = getStyle();
  const fonts = getFontPreset();

  const title = $("title").value.trim();
  const subtitle = $("subtitle").value.trim();
  const place = $("place").value.trim();
  const note = $("note").value.trim();

  const lat = Number($("lat").value);
  const lon = Number($("lon").value);

  const dtLocal = $("dt").value;
  const date = new Date(dtLocal);
  if (Number.isNaN(date.getTime())) throw new Error("Fecha inválida.");

  const maxMag = Number($("maxMag").value);
  const previewSize = clampInt(Number($("previewSize").value), 700, 2800);
  const exportSize = clampInt(Number($("exportSize").value), 1600, 24000);

  const flags = {
    showTitle: $("showTitle").checked,
    showSubtitle: $("showSubtitle").checked,
    showDate: $("showDate").checked,
    showPlace: $("showPlace").checked,
    showCoords: $("showCoords").checked,
    showBorder: $("showBorder").checked,
    showSpotify: $("showSpotify").checked,
    showNote: $("showNote").checked,
    showGrid: $("showGrid").checked,
    showGlow: $("showGlow").checked,
    showConstellations: $("showConstellations").checked,
    showCardinals: $("showCardinals").checked
  };

  const fallbackCount = clampInt(Number($("fallbackCount").value), 3000, 120000);

  return { style, fonts, title, subtitle, place, note, lat, lon, date, maxMag, previewSize, exportSize, fallbackCount, flags };
}

/* -------------------- Astro math -------------------- */
function deg2rad(d) { return d * Math.PI / 180; }
function rad2deg(r) { return r * 180 / Math.PI; }
function wrapDeg(d) { d %= 360; return d < 0 ? d + 360 : d; }
function toJulianDate(date) { return date.getTime() / 86400000 + 2440587.5; }
function localSiderealTimeDeg(date, lonDeg) {
  const jd = toJulianDate(date);
  const d = jd - 2451545.0;
  const gmst = wrapDeg(280.46061837 + 360.98564736629 * d);
  return wrapDeg(gmst + lonDeg);
}
function raDecToAzAlt(raDeg, decDeg, latRad, lstDeg) {
  let H = deg2rad(wrapDeg(lstDeg - raDeg));
  const dec = deg2rad(decDeg);

  const sinAlt = Math.sin(dec) * Math.sin(latRad) + Math.cos(dec) * Math.cos(latRad) * Math.cos(H);
  const alt = Math.asin(clamp(sinAlt, -1, 1));

  const y = -Math.sin(H);
  const x = Math.tan(dec) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(H);
  let az = Math.atan2(y, x);
  if (az < 0) az += 2 * Math.PI;

  return { azDeg: rad2deg(az), altDeg: rad2deg(alt) };
}
function projectAzAlt(azDeg, altDeg, cx, cy, R) {
  const r = (R * (90 - altDeg)) / 90;
  const a = deg2rad(azDeg);
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

/* ⭐ estrellas más grandes */
function starRadiusFromMag(mag, scale) {
  // más grande que antes:
  // base 0.85 + brillo hasta ~3.8 px en preview base (1100)
  const t = clamp((3.2 - mag) / 7.0, 0, 1);
  return (0.85 + t * 3.0) * scale;
}
function starAlphaFromMag(mag) {
  return clamp((7.2 - mag) / 7.2, 0.08, 1);
}

/* -------------------- Fallback stars (dense & pretty) -------------------- */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function generateFallbackStars(n, seed = 1337) {
  const rand = mulberry32(seed);
  const stars = [];
  for (let i = 0; i < n; i++) {
    const raDeg = rand() * 360;
    const u = rand() * 2 - 1;
    const decDeg = rad2deg(Math.asin(u));
    // muchas estrellas débiles -> look pro
    const r = rand();
    const mag = 0.6 + Math.pow(r, 0.22) * 9.4; // ~0.6..10
    stars.push({ raDeg, decDeg, mag });
  }
  return stars;
}

/* -------------------- Drawing helpers -------------------- */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function setCanvasSize(px, style) {
  canvas.width = px;
  canvas.height = Math.round(px * 1.30); // un poco más alto para el texto centrado debajo
  canvas.style.width = px + "px";
  canvas.style.height = "auto";
  canvas.style.borderRadius = (style.borderRadius || 18) + "px";
  canvas.style.boxShadow = `0 18px 60px ${style.cardShadow || "rgba(0,0,0,.35)"}`;
}

function isLightColor(hex) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 170;
}

function fitContain(sw, sh, bw, bh) {
  const sr = sw / sh;
  const br = bw / bh;
  let dw = bw, dh = bh;
  if (sr > br) dh = Math.round(bw / sr);
  else dw = Math.round(bh * sr);
  const dx = Math.round((bw - dw) / 2);
  const dy = Math.round((bh - dh) / 2);
  return { dw, dh, dx, dy };
}

/* -------------------- Constellations rendering -------------------- */
function drawConstellations(cfg, cx, cy, R, scale) {
  const { style, lat, lon, date } = cfg;
  const lst = localSiderealTimeDeg(date, lon);
  const latRad = deg2rad(lat);

  ctx.save();
  ctx.strokeStyle = style.faint;
  ctx.globalAlpha = style.constellationsAlpha ?? 0.35;
  ctx.lineWidth = Math.max(1, (style.constellationsWidth ?? 1.2) * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const cons of CONSTELLATIONS) {
    for (const [aName, bName] of cons.segments) {
      const A = BRIGHT_STARS[aName];
      const B = BRIGHT_STARS[bName];
      if (!A || !B) continue;

      const aa = raDecToAzAlt(A.ra, A.dec, latRad, lst);
      const bb = raDecToAzAlt(B.ra, B.dec, latRad, lst);
      if (aa.altDeg <= 0 || bb.altDeg <= 0) continue;

      const p1 = projectAzAlt(aa.azDeg, aa.altDeg, cx, cy, R);
      const p2 = projectAzAlt(bb.azDeg, bb.altDeg, cx, cy, R);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* -------------------- Poster render (map top, text centered below) -------------------- */
function drawPoster(cfg, outPx) {
  const { style, fonts, title, subtitle, place, note, lat, lon, date, maxMag, fallbackCount, flags } = cfg;

  const W = outPx;
  const H = Math.round(outPx * 1.30);
  const scale = W / 1100;

  const margin = Math.round(70 * scale);
  const topPad = Math.round(70 * scale);
  const bottomPad = Math.round(70 * scale);

  // Área del mapa (círculo)
  const mapAreaH = Math.round(H * 0.62);
  const diameter = Math.min(W - margin * 2, mapAreaH - topPad);
  const R = diameter / 2;
  const cx = W / 2;
  const cy = topPad + R;

  // Fondo
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, W, H);

  // Borde
  if (flags.showBorder) {
    ctx.strokeStyle = style.border;
    ctx.lineWidth = Math.max(1, 2 * scale);
    roundRect(ctx, margin * 0.60, margin * 0.60, W - margin * 1.20, H - margin * 1.20, 26 * scale);
    ctx.stroke();
  }

  // Clip al círculo del mapa
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Grid/anillos
  if (flags.showGrid) {
    ctx.strokeStyle = style.faint2;
    ctx.lineWidth = Math.max(1, 1.15 * scale);

    const dash = style.gridDash || [8, 12];
    if (dash[0] !== 9999) ctx.setLineDash(dash.map(v => v * scale));
    else ctx.setLineDash([]);

    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = style.gridAlpha ?? 0.38;
    const ringAlts = style.ringAlts || [15, 30, 45, 60, 75];
    for (const alt of ringAlts) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * (90 - alt)) / 90, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Estrellas fallback (seed dependiente de fecha/lugar para consistencia)
  const seed = (Math.floor(date.getTime() / 60000) ^ Math.floor((lat + 90) * 1000) ^ Math.floor((lon + 180) * 1000)) >>> 0;
  if (!state.stars || state.stars.length !== fallbackCount || state._seed !== seed) {
    state.stars = generateFallbackStars(fallbackCount, seed);
    state._seed = seed;
  }

  const lst = localSiderealTimeDeg(date, lon);
  const latRad = deg2rad(lat);

  const visible = [];
  for (const s of state.stars) {
    if (s.mag > maxMag) continue;
    const { azDeg, altDeg } = raDecToAzAlt(s.raDeg, s.decDeg, latRad, lst);
    if (altDeg <= 0) continue;
    visible.push({ azDeg, altDeg, mag: s.mag });
  }
  visible.sort((a, b) => b.mag - a.mag); // débiles primero

  const doGlow = flags.showGlow && (style.starGlowAlphaMul ?? 0) > 0;

  for (const s of visible) {
    const p = projectAzAlt(s.azDeg, s.altDeg, cx, cy, R);
    const r = starRadiusFromMag(s.mag, scale);
    const a = starAlphaFromMag(s.mag);

    if (doGlow) {
      ctx.globalAlpha = a * (style.starGlowAlphaMul ?? 0.25);
      ctx.fillStyle = style.fg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * (style.starGlowMul ?? 2.4), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = a;
    ctx.fillStyle = style.fg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Constelaciones por encima (se ven pro)
  if (flags.showConstellations) {
    drawConstellations(cfg, cx, cy, R, scale);
  }

  ctx.restore();

  // Contorno del mapa
  ctx.strokeStyle = style.faint2;
  ctx.lineWidth = Math.max(1, (style.skyStrokeWidth ?? 1.6) * scale);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Cardinales N/E/S/O
  if (flags.showCardinals) {
    ctx.save();
    ctx.fillStyle = style.faint;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(14 * scale)}px ${fonts.body}`;

    const card = [
      ["N", 0], ["E", 90], ["S", 180], ["O", 270]
    ];
    for (const [lab, azDeg] of card) {
      const p = projectAzAlt(azDeg, 0, cx, cy, R);
      ctx.fillText(lab, p.x, p.y - Math.round(14 * scale));
    }
    ctx.restore();
  }

  /* ----- Texto centrado debajo ----- */
  const textTop = cy + R + Math.round(45 * scale);
  let y = textTop;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (flags.showTitle && title) {
    ctx.fillStyle = style.fg;
    ctx.font = `800 ${Math.round(44 * scale)}px ${fonts.title}`;
    ctx.fillText(title, W / 2, y);
    y += Math.round(44 * scale);
  }

  if (flags.showSubtitle && subtitle) {
    ctx.fillStyle = style.faint;
    ctx.font = `700 ${Math.round(18 * scale)}px ${fonts.body}`;
    ctx.fillText(subtitle, W / 2, y);
    y += Math.round(34 * scale);
  } else {
    y += Math.round(10 * scale);
  }

  // Meta lines (fecha/lugar/coords)
  ctx.fillStyle = style.faint;
  ctx.font = `650 ${Math.round(18 * scale)}px ${fonts.body}`;

  const metaLines = [];
  if (flags.showDate) metaLines.push(fmtDate(date));
  if (flags.showPlace && place) metaLines.push(place);
  if (flags.showCoords) metaLines.push(`lat ${lat.toFixed(4)}°, lon ${lon.toFixed(4)}°`);

  for (const line of metaLines) {
    ctx.fillText(line, W / 2, y);
    y += Math.round(30 * scale);
  }

  // Nota (más fuerte)
  if (flags.showNote && note) {
    y += Math.round(8 * scale);
    ctx.fillStyle = style.fg;
    ctx.font = `800 ${Math.round(20 * scale)}px ${fonts.body}`;
    ctx.fillText(note, W / 2, y);
    y += Math.round(38 * scale);
  } else {
    y += Math.round(14 * scale);
  }

  // Spotify code centrado abajo
  if (flags.showSpotify && state.spotifyCodeBitmap) {
    const bmp = state.spotifyCodeBitmap;
    const box = Math.round(190 * scale);
    const pad = Math.round(14 * scale);

    const bx = Math.round(W / 2 - box / 2);
    const by = Math.min(H - bottomPad - box - pad * 2, y + Math.round(8 * scale));

    // frame
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.strokeStyle = style.faint2;
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    roundRect(ctx, bx - pad, by - pad, box + pad * 2, box + pad * 2, 18 * scale);
    ctx.fill();
    ctx.stroke();

    const { dw, dh, dx, dy } = fitContain(bmp.width, bmp.height, box, box);
    ctx.drawImage(bmp, bx + dx, by + dy, dw, dh);
    ctx.restore();
  }
}

/* -------------------- Render/export -------------------- */
function renderPreview() {
  clearError();
  const cfg = getConfig();
  setCanvasSize(cfg.previewSize, cfg.style);
  drawPoster(cfg, cfg.previewSize);
}

function exportPNG() {
  clearError();
  const cfg = getConfig();

  const outW = cfg.exportSize;
  canvas.width = outW;
  canvas.height = Math.round(outW * 1.30);

  drawPoster(cfg, outW);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "mapa-estelar-pro.png";
  a.click();

  setTimeout(() => { try { renderPreview(); } catch (e) { showError(e); } }, 60);
}

/* -------------------- Spotify integration -------------------- */
async function spotifySearch(q) {
  const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

async function loadSpotifyCodeBitmap(uri, style) {
  const bgIsLight = isLightColor(style.bg);
  const bg = bgIsLight ? "FFFFFF" : "000000";
  const code = bgIsLight ? "black" : "white";
  const size = "720"; // más nítido
  const fmt = "svg";

  const r = await fetch(`/api/spotify/code?uri=${encodeURIComponent(uri)}&bg=${bg}&code=${code}&size=${size}&fmt=${fmt}`);
  if (!r.ok) throw new Error(await r.text());

  const svgText = await r.text();
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  return await createImageBitmap(blob);
}

function wireSpotifyUI() {
  $("spotifySearch").addEventListener("click", async () => {
    try {
      clearError();
      const q = $("spotifyQuery").value.trim();
      if (!q) return;

      const data = await spotifySearch(q);
      const sel = $("spotifyResults");
      sel.innerHTML = "";

      for (const item of data.items) {
        const opt = document.createElement("option");
        opt.value = item.uri;
        opt.textContent = `${item.name} — ${item.artists}`;
        sel.appendChild(opt);
      }

      if (!sel.options.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Sin resultados";
        sel.appendChild(opt);
      }
    } catch (e) { showError(e); }
  });

  $("spotifyUse").addEventListener("click", async () => {
    try {
      clearError();
      const uri = $("spotifyResults").value;
      if (!uri) return;

      const style = getStyle();
      state.spotifyCodeBitmap = await loadSpotifyCodeBitmap(uri, style);

      $("showSpotify").checked = true;
      renderPreview();
    } catch (e) { showError(e); }
  });
}

/* -------------------- Style thumbnails -------------------- */
function drawStyleThumb(canvasEl, style) {
  const c = canvasEl;
  const tctx = c.getContext("2d");
  const W = c.width = 52;
  const H = c.height = 52;

  tctx.fillStyle = style.bg;
  tctx.fillRect(0, 0, W, H);

  // circle
  tctx.strokeStyle = style.faint2;
  tctx.lineWidth = 1;
  tctx.beginPath();
  tctx.arc(W/2, H/2, 18, 0, Math.PI*2);
  tctx.stroke();

  // stars
  tctx.fillStyle = style.fg;
  for (let i = 0; i < 22; i++) {
    const x = 8 + Math.random() * (W - 16);
    const y = 8 + Math.random() * (H - 16);
    const r = 0.6 + Math.random() * 1.4;
    tctx.globalAlpha = 0.5 + Math.random() * 0.5;
    tctx.beginPath();
    tctx.arc(x, y, r, 0, Math.PI*2);
    tctx.fill();
  }
  tctx.globalAlpha = 1;
}

function buildStyleGrid() {
  const grid = $("styleGrid");
  grid.innerHTML = "";

  for (const [key, style] of Object.entries(STYLE_PRESETS)) {
    const btn = document.createElement("div");
    btn.className = "styleBtn";
    btn.dataset.style = key;
    btn.dataset.active = (key === state.styleKey) ? "true" : "false";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "thumb";
    const tcan = document.createElement("canvas");
    tcan.style.width = "52px";
    tcan.style.height = "52px";
    thumbWrap.appendChild(tcan);
    drawStyleThumb(tcan, style);

    const meta = document.createElement("div");
    meta.className = "styleMeta";
    const name = document.createElement("div");
    name.className = "styleName";
    name.textContent = style.name;
    const desc = document.createElement("div");
    desc.className = "styleDesc";
    desc.textContent = style.desc || "";
    meta.appendChild(name);
    meta.appendChild(desc);

    btn.appendChild(thumbWrap);
    btn.appendChild(meta);

    btn.addEventListener("click", () => {
      state.styleKey = key;
      // refrescar activo
      for (const el of grid.querySelectorAll(".styleBtn")) {
        el.dataset.active = (el.dataset.style === key) ? "true" : "false";
      }
      renderPreview();
    });

    grid.appendChild(btn);
  }
}

/* -------------------- Wiring -------------------- */
function wire() {
  setDefaultDatetime();
  $("maxMagVal").textContent = $("maxMag").value;

  buildStyleGrid();
  wireSpotifyUI();

  const rerenderIds = [
    "fontPreset",
    "title","subtitle","place","lat","lon","dt","note",
    "maxMag","fallbackCount","previewSize",
    "showTitle","showSubtitle","showDate","showPlace","showCoords","showBorder",
    "showSpotify","showNote","showGrid","showGlow","showConstellations","showCardinals"
  ];

  for (const id of rerenderIds) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener("input", () => {
      if (id === "maxMag") $("maxMagVal").textContent = $("maxMag").value;
      safeRender();
    });
    el.addEventListener("change", safeRender);
  }

  $("render").addEventListener("click", safeRender);
  $("exportPng").addEventListener("click", () => { try { exportPNG(); } catch (e) { showError(e); } });

  $("reset").addEventListener("click", () => {
    state.styleKey = "classic_dark";
    buildStyleGrid();

    $("fontPreset").value = "inter";
    $("title").value = "Nuestra noche";
    $("subtitle").value = "Bajo el mismo cielo";
    $("place").value = "Ciudad de México";
    $("lat").value = "19.4326";
    $("lon").value = "-99.1332";
    $("note").value = "";

    $("maxMag").value = "8.4";
    $("fallbackCount").value = "36000";
    $("previewSize").value = "1100";
    $("exportSize").value = "8000";
    $("spotifyQuery").value = "";
    $("spotifyResults").innerHTML = "";

    $("showTitle").checked = true;
    $("showSubtitle").checked = true;
    $("showDate").checked = true;
    $("showPlace").checked = true;
    $("showCoords").checked = true;
    $("showBorder").checked = true;
    $("showSpotify").checked = true;
    $("showNote").checked = true;
    $("showGrid").checked = true;
    $("showGlow").checked = true;
    $("showConstellations").checked = true;
    $("showCardinals").checked = true;

    setDefaultDatetime();
    $("maxMagVal").textContent = $("maxMag").value;

    state.spotifyCodeBitmap = null;
    state.spotifyLabel = "";
    state.stars = null;

    safeRender();
  });

  safeRender(); // preview al abrir
}

function safeRender() {
  try { renderPreview(); } catch (e) { showError(e); }
}

window.addEventListener("DOMContentLoaded", wire);
