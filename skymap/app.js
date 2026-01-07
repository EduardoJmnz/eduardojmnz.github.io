const $ = (id) => document.getElementById(id);
const canvas = $("c");
const ctx = canvas.getContext("2d", { alpha: false });

const state = {
  styleKey: "classic_dark",
  mapBgKey: "black",
  stars: null,
  _seed: 0,
  spotifyCodeBitmap: null
};

/* ---------------- Fonts ---------------- */
const FONT_PRESETS = {
  inter: {
    title: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    body: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  montserrat: {
    title: "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    body: "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  playfair: {
    title: "'Playfair Display', Georgia, 'Times New Roman', Times, serif",
    body: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  cormorant: {
    title: "'Cormorant Garamond', Georgia, 'Times New Roman', Times, serif",
    body: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
  },
  mono: {
    title: "'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    body: "'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
  }
};
function getFonts() {
  const k = $("fontPreset")?.value || "inter";
  return FONT_PRESETS[k] || FONT_PRESETS.inter;
}

/* ---------------- Map color palette ---------------- */
const MAP_COLORS = [
  { key: "black",  name: "Negro",   bg: "#050608" },
  { key: "gray",   name: "Gris",    bg: "#2f3137" },
  { key: "navy",   name: "Azul",    bg: "#0b1020" },
  { key: "teal",   name: "Chatham", bg: "#12384a" },
  { key: "red",    name: "Rojo",    bg: "#4a0f14" },
  { key: "purple", name: "Morado",  bg: "#3a1b4f" },
  { key: "olive",  name: "Oliva",   bg: "#3a3f1f" },
  { key: "tan",    name: "Arena",   bg: "#7a543d" },
  { key: "cream",  name: "Crema",   bg: "#fbf2df" }
];
function getMapBg() {
  const m = MAP_COLORS.find(x => x.key === state.mapBgKey) || MAP_COLORS[0];
  return m.bg;
}

/* ---------------- Style presets ---------------- */
const STYLE_PRESETS = {
  classic_dark: {
    name: "Classic Dark",
    desc: "Premium oscuro",
    fg: "#ffffff",
    faint: "rgba(255,255,255,.58)",
    faint2: "rgba(255,255,255,.16)",
    border: "rgba(255,255,255,.18)",
    cardShadow: "rgba(0,0,0,.40)",
    borderRadius: 18,
    gridDash: [8, 12],
    gridAlpha: 0.42,
    ringAlts: [15, 30, 45, 60, 75],
    glowAlphaMul: 0.22,
    glowMul: 2.8,
    skyStrokeWidth: 1.7,
    constellationsAlpha: 0.42,
    constellationsWidth: 1.35,

    // text panel look
    panelFill: "rgba(0,0,0,.25)",
    panelStroke: "rgba(255,255,255,.10)"
  },
  blueprint: {
    name: "Blueprint",
    desc: "Técnico",
    fg: "#dbeafe",
    faint: "rgba(219,234,254,.62)",
    faint2: "rgba(219,234,254,.20)",
    border: "rgba(219,234,254,.22)",
    cardShadow: "rgba(0,0,0,.35)",
    borderRadius: 16,
    gridDash: [4, 10],
    gridAlpha: 0.50,
    ringAlts: [10, 25, 40, 55, 70, 85],
    glowAlphaMul: 0.18,
    glowMul: 2.4,
    skyStrokeWidth: 1.9,
    constellationsAlpha: 0.50,
    constellationsWidth: 1.45,
    panelFill: "rgba(0,0,0,.22)",
    panelStroke: "rgba(219,234,254,.16)"
  },
  minimal: {
    name: "Minimal",
    desc: "Limpio",
    fg: "#ffffff",
    faint: "rgba(255,255,255,.50)",
    faint2: "rgba(255,255,255,.10)",
    border: "rgba(255,255,255,.14)",
    cardShadow: "rgba(0,0,0,.40)",
    borderRadius: 22,
    gridDash: [9999, 0],
    gridAlpha: 0.22,
    ringAlts: [30, 60],
    glowAlphaMul: 0.0,
    glowMul: 0.0,
    skyStrokeWidth: 1.3,
    constellationsAlpha: 0.28,
    constellationsWidth: 1.1,
    panelFill: "rgba(0,0,0,.18)",
    panelStroke: "rgba(255,255,255,.08)"
  }
};
function getStyle() {
  return STYLE_PRESETS[state.styleKey] || STYLE_PRESETS.classic_dark;
}

/* ---------------- Constellations (subset) ---------------- */
const BRIGHT_STARS = {
  Betelgeuse: { ra: 88.7929, dec: 7.4071, mag: 0.50 },
  Bellatrix:  { ra: 81.2828, dec: 6.3497, mag: 1.64 },
  Alnilam:    { ra: 84.0534, dec: -1.2019, mag: 1.69 },
  Mintaka:    { ra: 83.0017, dec: -0.2991, mag: 2.25 },
  Alnitak:    { ra: 85.1897, dec: -1.9426, mag: 1.74 },
  Rigel:      { ra: 78.6345, dec: -8.2016, mag: 0.12 },
  Saiph:      { ra: 86.9391, dec: -9.6696, mag: 2.06 },

  Dubhe:      { ra: 165.9320, dec: 61.7510, mag: 1.79 },
  Merak:      { ra: 165.4603, dec: 56.3824, mag: 2.37 },
  Phecda:     { ra: 178.4577, dec: 53.6948, mag: 2.44 },
  Megrez:     { ra: 183.8565, dec: 57.0326, mag: 3.32 },
  Alioth:     { ra: 193.5073, dec: 55.9598, mag: 1.76 },
  Mizar:      { ra: 200.9814, dec: 54.9254, mag: 2.23 },
  Alkaid:     { ra: 206.8856, dec: 49.3133, mag: 1.86 },

  Schedar:    { ra: 10.1260,  dec: 56.5373, mag: 2.24 },
  Caph:       { ra: 2.2945,   dec: 59.1498, mag: 2.28 },
  GammaCas:   { ra: 14.1771,  dec: 60.7167, mag: 2.47 },
  Ruchbah:    { ra: 21.4540,  dec: 60.2353, mag: 2.68 },
  Segin:      { ra: 28.5989,  dec: 63.6701, mag: 3.35 }
};
const CONSTELLATIONS = [
  { segments: [
    ["Betelgeuse","Bellatrix"],
    ["Bellatrix","Alnilam"],
    ["Alnilam","Mintaka"],
    ["Alnilam","Alnitak"],
    ["Alnitak","Saiph"],
    ["Saiph","Rigel"],
    ["Rigel","Mintaka"]
  ]},
  { segments: [
    ["Dubhe","Merak"],
    ["Merak","Phecda"],
    ["Phecda","Megrez"],
    ["Megrez","Alioth"],
    ["Alioth","Mizar"],
    ["Mizar","Alkaid"]
  ]},
  { segments: [
    ["Caph","Schedar"],
    ["Schedar","GammaCas"],
    ["GammaCas","Ruchbah"],
    ["Ruchbah","Segin"]
  ]}
];

/* ---------------- UI helpers ---------------- */
function showError(e) {
  const box = $("err");
  box.style.display = "block";
  box.textContent = "Error: " + (e?.message || String(e));
  console.error(e);
}
function clearError() {
  const box = $("err");
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
  const local = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  $("dt").value = local;
}
function fmtDateTime(date) {
  // similar to your screenshot: "07 ene 2026, 01:08 p.m."
  return date.toLocaleString(undefined, { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

/* ---------------- Astro ---------------- */
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

/* ---------------- Crisp canvas (avoid pixelation) ---------------- */
function setCanvasCrisp(cssPx, style) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  canvas.style.width = cssPx + "px";
  canvas.style.height = "auto";
  canvas.style.borderRadius = (style.borderRadius || 18) + "px";
  canvas.style.boxShadow = `0 18px 60px ${style.cardShadow || "rgba(0,0,0,.35)"}`;

  const W = Math.round(cssPx * dpr);
  const H = Math.round(cssPx * 1.33 * dpr);

  canvas.width = W;
  canvas.height = H;

  // draw in CSS coordinates
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ---------------- Stars as real points ---------------- */
function starRadiusFromMag(mag, scale) {
  const t = clamp((3.2 - mag) / 7.0, 0, 1);
  return (0.9 + t * 3.2) * scale; // bigger points
}
function starAlphaFromMag(mag) {
  return clamp((7.4 - mag) / 7.4, 0.09, 1);
}
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
    const r = rand();
    const mag = 0.6 + Math.pow(r, 0.22) * 9.4;
    stars.push({ raDeg, decDeg, mag });
  }
  return stars;
}

/* ---------------- Colors for grid/constellations ---------------- */
function resolveLineColor(choice, style) {
  if (choice === "white") return "rgba(255,255,255,.55)";
  if (choice === "gray")  return "rgba(255,255,255,.30)";
  if (choice === "gold")  return "rgba(224,186,96,.60)";
  if (choice === "blue")  return "rgba(120,190,255,.55)";
  if (choice === "red")   return "rgba(255,120,120,.55)";
  return style.faint; // auto
}
function resolveGridColor(choice, style) {
  if (choice === "white") return "rgba(255,255,255,.18)";
  if (choice === "gray")  return "rgba(255,255,255,.10)";
  if (choice === "gold")  return "rgba(224,186,96,.18)";
  if (choice === "blue")  return "rgba(120,190,255,.18)";
  if (choice === "red")   return "rgba(255,120,120,.18)";
  return style.faint2; // auto
}

/* ---------------- Drawing helpers ---------------- */
function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
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

/* ---------------- Config ---------------- */
function getConfig() {
  const style = getStyle();
  const fonts = getFonts();

  const title = $("title").value.trim();
  const subtitle = $("subtitle").value.trim();
  const place = $("place").value.trim();
  const note = $("note").value.trim();

  const lat = Number($("lat").value);
  const lon = Number($("lon").value);

  const dtLocal = $("dt").value;
  const date = new Date(dtLocal);
  if (Number.isNaN(date.getTime())) throw new Error("Fecha inválida.");

  const maxMag = Number($("maxMag")?.value ?? 8.6);
  const previewSize = clampInt(Number($("previewSize")?.value ?? 1100), 700, 2800);
  const exportSize = clampInt(Number($("exportSize")?.value ?? 8000), 1600, 24000);
  const fallbackCount = clampInt(Number($("fallbackCount")?.value ?? 42000), 5000, 140000);

  const flags = {
    showBorder: $("showBorder").checked,
    showTextPanel: $("showTextPanel").checked,

    showTitle: $("showTitle").checked,
    showSubtitle: $("showSubtitle").checked,
    showDate: $("showDate").checked,
    showPlace: $("showPlace").checked,
    showCoords: $("showCoords").checked,
    showSpotify: $("showSpotify").checked,
    showNote: $("showNote").checked,

    showGrid: $("showGrid").checked,
    showGlow: $("showGlow").checked,
    showConstellations: $("showConstellations").checked,
    showCardinals: $("showCardinals").checked
  };

  const gridColorChoice = $("gridColor")?.value ?? "auto";
  const constColorChoice = $("constellationColor")?.value ?? "auto";

  return {
    style, fonts, title, subtitle, place, note,
    lat, lon, date, maxMag,
    previewSize, exportSize, fallbackCount,
    flags, gridColorChoice, constColorChoice
  };
}

/* ---------------- Constellations draw ---------------- */
function drawConstellations(cfg, cx, cy, R, scale) {
  const { style, lat, lon, date, constColorChoice } = cfg;
  const lst = localSiderealTimeDeg(date, lon);
  const latRad = deg2rad(lat);

  ctx.save();
  ctx.globalAlpha = style.constellationsAlpha ?? 0.42;
  ctx.strokeStyle = resolveLineColor(constColorChoice, style);
  ctx.lineWidth = Math.max(1, (style.constellationsWidth ?? 1.3) * scale);
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

/* ---------------- Poster layout like your image ----------------
   - big circle map near top (red zone)
   - text panel rectangle at bottom (green zone)
*/
function drawPoster(cfg, cssW) {
  const { style, fonts, title, subtitle, place, note, lat, lon, date, maxMag, fallbackCount, flags, gridColorChoice } = cfg;

  const W = cssW;
  const H = Math.round(cssW * 1.33);
  const scale = W / 1100;

  // Outer frame + vignette
  const MARGIN = Math.round(70 * scale);
  const CORNER_R = Math.round(26 * scale);

  // Map placement (more space at top)
  const TOP_GAP = Math.round(140 * scale);      // << more breathing room (like your screenshot)
  const MAP_AREA_H = Math.round(H * 0.66);      // leave enough space for bottom panel
  const diameter = Math.min(W - MARGIN * 2, MAP_AREA_H - TOP_GAP);
  const R = diameter / 2;
  const cx = W / 2;
  const cy = TOP_GAP + R;

  // Bottom text panel geometry (green zone)
  const PANEL_W = Math.round(W * 0.72);
  const PANEL_H = Math.round(H * 0.26);
  const PANEL_X = Math.round(W / 2 - PANEL_W / 2);
  const PANEL_Y = Math.round(H - MARGIN - PANEL_H);
  const PANEL_R = Math.round(18 * scale);
  const PANEL_PAD_X = Math.round(34 * scale);
  const PANEL_PAD_Y = Math.round(26 * scale);

  const bg = getMapBg();

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // soft vignette
  const grad = ctx.createRadialGradient(W/2, H*0.4, Math.max(10, W*0.15), W/2, H*0.5, W*0.9);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // Outer border frame
  if (flags.showBorder) {
    ctx.strokeStyle = style.border;
    ctx.lineWidth = Math.max(1, 2 * scale);
    roundRect(MARGIN * 0.60, MARGIN * 0.60, W - MARGIN * 1.20, H - MARGIN * 1.20, CORNER_R);
    ctx.stroke();
  }

  // --- MAP CLIP ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // grid / retícula
  if (flags.showGrid) {
    ctx.strokeStyle = resolveGridColor(gridColorChoice, style);
    ctx.lineWidth = Math.max(1, 1.15 * scale);

    const dash = style.gridDash || [8, 12];
    if (dash[0] !== 9999) ctx.setLineDash(dash.map(v => v * scale));
    else ctx.setLineDash([]);

    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = style.gridAlpha ?? 0.42;
    const ringAlts = style.ringAlts || [15, 30, 45, 60, 75];
    for (const alt of ringAlts) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * (90 - alt)) / 90, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // stars (generated)
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
  visible.sort((a, b) => b.mag - a.mag);

  const doGlow = flags.showGlow && (style.glowAlphaMul ?? 0) > 0;

  // draw stars as points (NO image)
  for (const s of visible) {
    const p = projectAzAlt(s.azDeg, s.altDeg, cx, cy, R);
    const r = starRadiusFromMag(s.mag, scale);
    const a = starAlphaFromMag(s.mag);

    if (doGlow) {
      ctx.globalAlpha = a * (style.glowAlphaMul ?? 0.20);
      ctx.fillStyle = style.fg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * (style.glowMul ?? 2.8), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = a;
    ctx.fillStyle = style.fg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // constellations
  if (flags.showConstellations) {
    drawConstellations(cfg, cx, cy, R, scale);
  }

  ctx.restore(); // end map clip

  // map outline
  ctx.strokeStyle = style.faint2;
  ctx.lineWidth = Math.max(1, (style.skyStrokeWidth ?? 1.7) * scale);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // cardinals on map edge
  if (flags.showCardinals) {
    ctx.save();
    ctx.fillStyle = style.faint;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(14 * scale)}px ${fonts.body}`;
    const card = [["N",0],["E",90],["S",180],["O",270]];
    for (const [lab, azDeg] of card) {
      const p = projectAzAlt(azDeg, 0, cx, cy, R);
      ctx.fillText(lab, p.x, p.y - Math.round(14 * scale));
    }
    ctx.restore();
  }

  // --- TEXT PANEL (green zone) ---
  if (flags.showTextPanel) {
    ctx.save();
    ctx.fillStyle = style.panelFill || "rgba(0,0,0,.22)";
    ctx.strokeStyle = style.panelStroke || style.faint2;
    ctx.lineWidth = Math.max(1, 1.6 * scale);
    roundRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_R);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Panel content layout
  const contentX = PANEL_X + PANEL_W / 2;
  let y = PANEL_Y + PANEL_PAD_Y;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (flags.showTitle && title) {
    ctx.fillStyle = style.fg;
    ctx.font = `800 ${Math.round(40 * scale)}px ${fonts.title}`;
    ctx.fillText(title, contentX, y + Math.round(18 * scale));
    y += Math.round(52 * scale);
  }

  if (flags.showSubtitle && subtitle) {
    ctx.fillStyle = style.faint;
    ctx.font = `700 ${Math.round(18 * scale)}px ${fonts.body}`;
    ctx.fillText(subtitle, contentX, y);
    y += Math.round(30 * scale);
  } else {
    y += Math.round(10 * scale);
  }

  ctx.fillStyle = style.faint;
  ctx.font = `650 ${Math.round(16 * scale)}px ${fonts.body}`;

  if (flags.showDate) {
    ctx.fillText(fmtDateTime(date), contentX, y);
    y += Math.round(22 * scale);
  }
  if (flags.showPlace && place) {
    ctx.fillText(place, contentX, y);
    y += Math.round(22 * scale);
  }
  if (flags.showCoords) {
    const coordsLine = `lat ${lat.toFixed(4)}°, lon ${lon.toFixed(4)}°`;
    ctx.fillText(coordsLine, contentX, y);
    y += Math.round(22 * scale);
  }

  if (flags.showNote && note) {
    y += Math.round(10 * scale);
    ctx.fillStyle = style.fg;
    ctx.font = `800 ${Math.round(18 * scale)}px ${fonts.body}`;
    ctx.fillText(note, contentX, y);
    y += Math.round(26 * scale);
    ctx.fillStyle = style.faint;
    ctx.font = `650 ${Math.round(16 * scale)}px ${fonts.body}`;
  }

  // Spotify code centered near bottom of panel
  if (flags.showSpotify && state.spotifyCodeBitmap) {
    const bmp = state.spotifyCodeBitmap;

    const box = Math.round(Math.min(PANEL_W * 0.40, 220 * scale));
    const pad = Math.round(12 * scale);

    const bx = Math.round(contentX - box / 2);
    const by = Math.round(PANEL_Y + PANEL_H - PANEL_PAD_Y - box);

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.strokeStyle = style.faint2;
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    roundRect(bx - pad, by - pad, box + pad * 2, box + pad * 2, Math.round(16 * scale));
    ctx.fill();
    ctx.stroke();

    const { dw, dh, dx, dy } = fitContain(bmp.width, bmp.height, box, box);
    ctx.drawImage(bmp, bx + dx, by + dy, dw, dh);
    ctx.restore();
  }
}

/* ---------------- Render / Export ---------------- */
function renderPreview() {
  clearError();
  const cfg = getConfig();
  const style = cfg.style;

  const cssW = cfg.previewSize;
  setCanvasCrisp(cssW, style);

  ctx.clearRect(0, 0, cssW, Math.round(cssW * 1.33));
  drawPoster(cfg, cssW);
}

function exportPNG() {
  clearError();
  const cfg = getConfig();

  const W = cfg.exportSize;
  const H = Math.round(W * 1.33);

  // export at true resolution
  canvas.style.width = W + "px";
  canvas.width = W;
  canvas.height = H;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  drawPoster(cfg, W);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "mapa-estelar-pro.png";
  a.click();

  setTimeout(() => { try { renderPreview(); } catch (e) { showError(e); } }, 60);
}

/* ---------------- Spotify ---------------- */
async function spotifySearch(q) {
  const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}
function isLightColor(hex) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return (0.2126*r + 0.7152*g + 0.0722*b) > 170;
}
async function loadSpotifyCodeBitmap(uri) {
  const bg = getMapBg();
  const isLight = isLightColor(bg);
  const bgHex = isLight ? "FFFFFF" : "000000";
  const code = isLight ? "black" : "white";
  const size = "720";
  const fmt = "svg";

  const r = await fetch(`/api/spotify/code?uri=${encodeURIComponent(uri)}&bg=${bgHex}&code=${code}&size=${size}&fmt=${fmt}`);
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

      state.spotifyCodeBitmap = await loadSpotifyCodeBitmap(uri);
      $("showSpotify").checked = true;
      renderPreview();
    } catch (e) { showError(e); }
  });
}

/* ---------------- Style previews ---------------- */
function drawStyleThumb(canvasEl, style, bg) {
  const tctx = canvasEl.getContext("2d");
  const W = canvasEl.width = 52;
  const H = canvasEl.height = 52;

  tctx.fillStyle = bg;
  tctx.fillRect(0,0,W,H);

  tctx.strokeStyle = style.faint2;
  tctx.lineWidth = 1;
  tctx.beginPath();
  tctx.arc(W/2,H/2,18,0,Math.PI*2);
  tctx.stroke();

  tctx.fillStyle = style.fg;
  for (let i=0;i<22;i++){
    const x = 8 + Math.random()*(W-16);
    const y = 8 + Math.random()*(H-16);
    const r = 0.6 + Math.random()*1.6;
    tctx.globalAlpha = 0.5 + Math.random()*0.5;
    tctx.beginPath(); tctx.arc(x,y,r,0,Math.PI*2); tctx.fill();
  }
  tctx.globalAlpha = 1;
}
function buildStyleGrid() {
  const grid = $("styleGrid");
  if (!grid) return;
  grid.innerHTML = "";

  for (const [key, style] of Object.entries(STYLE_PRESETS)) {
    const btn = document.createElement("div");
    btn.className = "styleBtn";
    btn.dataset.style = key;
    btn.dataset.active = (key === state.styleKey) ? "true" : "false";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "thumb";
    const tcan = document.createElement("canvas");
    thumbWrap.appendChild(tcan);
    drawStyleThumb(tcan, style, getMapBg());

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
      for (const el of grid.querySelectorAll(".styleBtn")) {
        el.dataset.active = (el.dataset.style === key) ? "true" : "false";
      }
      renderPreview();
    });

    grid.appendChild(btn);
  }
}

/* ---------------- Map color palette UI ---------------- */
function buildMapPalette() {
  const pal = $("mapColorPalette");
  if (!pal) return;
  pal.innerHTML = "";

  for (const c of MAP_COLORS) {
    const wrap = document.createElement("div");
    wrap.className = "swatchWrap";

    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = c.bg;
    sw.dataset.active = (c.key === state.mapBgKey) ? "true" : "false";

    const lab = document.createElement("div");
    lab.className = "swatchLabel";
    lab.textContent = c.name;

    sw.addEventListener("click", () => {
      state.mapBgKey = c.key;
      for (const node of pal.querySelectorAll(".swatch")) node.dataset.active = "false";
      sw.dataset.active = "true";

      // thumbnails depend on bg
      buildStyleGrid();
      renderPreview();
    });

    wrap.appendChild(sw);
    wrap.appendChild(lab);
    pal.appendChild(wrap);
  }
}

/* ---------------- Tabs UX ---------------- */
function wireTabs() {
  const btns = Array.from(document.querySelectorAll(".tabBtn"));
  const panels = {
    fields: $("tab-fields"),
    map: $("tab-map"),
    text: $("tab-text"),
    export: $("tab-export")
  };

  function setTab(tab) {
    for (const b of btns) b.dataset.active = (b.dataset.tab === tab) ? "true" : "false";
    for (const [k, p] of Object.entries(panels)) p.dataset.active = (k === tab) ? "true" : "false";
  }

  for (const b of btns) {
    b.addEventListener("click", () => setTab(b.dataset.tab));
  }
}

/* ---------------- Wiring ---------------- */
function safeRender() {
  try { renderPreview(); } catch (e) { showError(e); }
}

function wire() {
  setDefaultDatetime();
  $("maxMagVal").textContent = $("maxMag").value;

  wireTabs();
  buildMapPalette();
  buildStyleGrid();
  wireSpotifyUI();

  // auto re-render on changes
  const rerenderIds = [
    // fields
    "showBorder","showTextPanel",
    "showTitle","showSubtitle","showDate","showPlace","showCoords","showSpotify","showNote",
    "showConstellations","showGrid","showGlow","showCardinals",

    // map
    "maxMag","fallbackCount","gridColor","constellationColor",

    // text
    "fontPreset","title","subtitle","place","lat","lon","dt","note",

    // export
    "previewSize"
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
    state.mapBgKey = "black";
    state.spotifyCodeBitmap = null;
    state.stars = null;

    buildMapPalette();
    buildStyleGrid();

    $("fontPreset").value = "inter";
    $("title").value = "♥ ESTRELLAS DE LA SUERTE ♥";
    $("subtitle").value = "";
    $("place").value = "Ciudad de México, México";
    $("lat").value = "19.4194";
    $("lon").value = "-99.1455";
    $("note").value = "";

    setDefaultDatetime();

    $("maxMag").value = "8.6";
    $("fallbackCount").value = "42000";
    $("previewSize").value = "1100";
    $("exportSize").value = "8000";
    $("maxMagVal").textContent = $("maxMag").value;

    $("gridColor").value = "auto";
    $("constellationColor").value = "auto";

    // fields
    $("showBorder").checked = true;
    $("showTextPanel").checked = true;

    $("showTitle").checked = true;
    $("showSubtitle").checked = true;
    $("showDate").checked = true;
    $("showPlace").checked = true;
    $("showCoords").checked = true;
    $("showSpotify").checked = true;
    $("showNote").checked = true;

    $("showGrid").checked = true;
    $("showGlow").checked = true;
    $("showConstellations").checked = true;
    $("showCardinals").checked = true;

    $("spotifyQuery").value = "";
    $("spotifyResults").innerHTML = "";

    safeRender();
  });

  safeRender();
}

window.addEventListener("DOMContentLoaded", wire);
