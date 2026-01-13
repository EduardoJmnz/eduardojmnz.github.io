// backend/src/renderMapSvg.js
// Generador de mapa en SVG (server-side) sin exponer la lógica en frontend.
// - Fondo TRANSPARENTE fuera de la forma (para que no salga "cuadrado" cuando el poster es blanco)
// - Constellations tipo "figura" con nodos
// - Grid tipo globo (lat/lon con frente/atrás) parecido al original
// - Contorno sin opacidad y grosor configurable (default 4)

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

function isNeonThemeId(id) {
  return String(id || "").startsWith("neon");
}

function colorsFor(theme) {
  const THEMES = {
    mono:      { bg: "#0A0B0D", star: "#FFFFFF" },
    marino:    { bg: "#0B0D12", star: "#FFFFFF" },
    ice:       { bg: "#071016", star: "#E9F6FF" },
    warm:      { bg: "#140E0A", star: "#F6E7C9" },
    forest:    { bg: "#06130E", star: "#EAF7F1" },
    rose:      { bg: "#16080C", star: "#FFE9EF" },
    neonBlue:  { bg: "#05050A", star: "#4EA7FF" },
    neonGreen: { bg: "#05050A", star: "#3CFF9B" },
    neonRose:  { bg: "#05050A", star: "#FF4FD8" },
  };
  return THEMES[String(theme || "")] || THEMES.mono;
}

// Tokens equivalentes a computeRenderTokens() del frontend
function computeTokens({ colorTheme, backgroundMode }) {
  const th = colorsFor(colorTheme);
  const neon = isNeonThemeId(colorTheme);

  if (neon) {
    return {
      // Importante: el SVG fuera del clip será TRANSPARENTE siempre.
      mapBg: "#000000",
      stars: th.star,
      gridLine: th.star,
      constLine: th.star,
      constNode: th.star,
      outline: th.star,
      neon: true,
    };
  }

  if (String(backgroundMode || "match") === "white") {
    return {
      // mapa oscuro dentro del clip, poster es blanco (lo maneja el DOM/canvas)
      mapBg: th.bg,
      stars: th.star,
      gridLine: "#FFFFFF",
      constLine: "#FFFFFF",
      constNode: "#FFFFFF",
      outline: "#FFFFFF",
      neon: false,
    };
  }

  // match
  return {
    mapBg: th.bg,
    stars: "#FFFFFF",
    gridLine: "#FFFFFF",
    constLine: "#FFFFFF",
    constNode: "#FFFFFF",
    outline: "#FFFFFF",
    neon: false,
  };
}

function circlePathD(cx, cy, r) {
  return `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 -${2 * r},0`;
}

// Corazón similar al canvas (lo suficientemente cercano visualmente)
function heartPathD(cx, cy, size) {
  const s = size;
  const x = cx, y = cy;
  const top = y - s * 0.15;
  const left = x - s * 0.5;
  const right = x + s * 0.5;
  const bottom = y + s * 0.55;

  return [
    `M ${x} ${bottom}`,
    `C ${x - s * 0.55} ${y + s * 0.25}, ${left} ${y - s * 0.05}, ${x - s * 0.25} ${top}`,
    `C ${x - s * 0.05} ${y - s * 0.28}, ${x - s * 0.02} ${y - s * 0.28}, ${x} ${top}`,
    `C ${x + s * 0.02} ${y - s * 0.28}, ${x + s * 0.05} ${y - s * 0.28}, ${x + s * 0.25} ${top}`,
    `C ${right} ${y - s * 0.05}, ${x + s * 0.55} ${y + s * 0.25}, ${x} ${bottom}`,
    "Z"
  ].join(" ");
}

// --------------------- GRID tipo globo (lat/lon) ---------------------
function globeGridSvg({ cx, cy, R, stroke }) {
  const tiltX = 24 * Math.PI / 180;
  const sinX = Math.sin(tiltX), cosX = Math.cos(tiltX);

  const alphaFront = 0.70;
  const alphaBack = 0.18;

  const lwFront = 1.35;
  const lwBack = 1.0;

  function project(lat, lon) {
    let x = Math.cos(lat) * Math.cos(lon);
    let y = Math.sin(lat);
    let z = Math.cos(lat) * Math.sin(lon);

    const y2 = y * cosX - z * sinX;
    const z2 = y * sinX + z * cosX;
    y = y2; z = z2;

    return { sx: cx + x * R, sy: cy - y * R, z };
  }

  function shouldSkipLine(points) {
    if (!points || points.length < 6) return false;

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of points) {
      if (p.sx < xMin) xMin = p.sx;
      if (p.sx > xMax) xMax = p.sx;
      if (p.sy < yMin) yMin = p.sy;
      if (p.sy > yMax) yMax = p.sy;
    }
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    const a = points[0];
    const b = points[points.length - 1];
    const dx = b.sx - a.sx;
    const dy = b.sy - a.sy;

    // Protege verticales fuertes
    if (Math.abs(dx) < 1.0 && Math.abs(dy) > 22) return false;

    // Mata segmentos casi perfectamente horizontales
    if (yRange < 1.6 && xRange > 18) return true;

    // Extra: muy horizontal y muy recta
    if (Math.abs(dy) < 1.0 && Math.abs(dx) > 30) {
      const denom = Math.hypot(dx, dy) || 1;
      let maxDev = 0;
      for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const dev = Math.abs(dy * p.sx - dx * p.sy + b.sx * a.sy - b.sy * a.sx) / denom;
        if (dev > maxDev) maxDev = dev;
      }
      if (maxDev < 1.2) return true;
    }

    return false;
  }

  function polyline(points, alpha, lw) {
    if (!points || points.length < 2) return "";
    if (shouldSkipLine(points)) return "";
    const pts = points.map(p => `${p.sx.toFixed(2)},${p.sy.toFixed(2)}`).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${lw}" opacity="${alpha}" stroke-linecap="round" stroke-linejoin="round" />`;
  }

  const els = [];

  // Paralelos
  const latsDeg = [-60, -40, -20, 0, 20, 40, 60];
  const lonSteps = 240;

  for (const latDeg of latsDeg) {
    const lat = latDeg * Math.PI / 180;
    const frontPts = [];
    const backPts = [];

    for (let i = 0; i <= lonSteps; i++) {
      const lon = (i / lonSteps) * Math.PI * 2;
      const p = project(lat, lon);
      if (p.z >= 0) frontPts.push(p);
      else backPts.push(p);
    }

    els.push(polyline(backPts, alphaBack, lwBack));
    els.push(polyline(frontPts, alphaFront, lwFront));
  }

  // Meridianos
  const baseLonsDeg = [];
  for (let d = -75; d <= 75; d += 15) baseLonsDeg.push(d);
  baseLonsDeg.push(-90, 90);

  const lonsDeg = [];
  for (const b of baseLonsDeg) {
    lonsDeg.push(b);
    lonsDeg.push(b + 180);
  }

  const latSteps = 260;

  for (const lonDeg of lonsDeg) {
    const lon = ((lonDeg * Math.PI / 180) % (Math.PI * 2));
    const frontPts = [];
    const backPts = [];

    for (let i = 0; i <= latSteps; i++) {
      const lat = (-90 + (i / latSteps) * 180) * Math.PI / 180;
      const p = project(lat, lon);
      if (p.z >= 0) frontPts.push(p);
      else backPts.push(p);
    }

    els.push(polyline(backPts, alphaBack, lwBack));
    els.push(polyline(frontPts, alphaFront, lwFront));
  }

  // Borde del globo
  els.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${stroke}" stroke-width="1.1" opacity="0.14"/>`);

  return els.filter(Boolean).join("\n");
}

// --------------------- CONSTELLATIONS (figuras con nodos) ---------------------
function constellationsSvg({ w, h, rand, lineColor, nodeColor, size }) {
  const count = 6;

  // parecido a frontend
  const lineW = 1.25 * size;
  const nodeR = 1.8 * size;

  const safeMinX = 36, safeMaxX = w - 36;
  const safeMinY = 36, safeMaxY = h - 36;

  const els = [];

  for (let c = 0; c < count; c++) {
    const cx = safeMinX + rand() * (safeMaxX - safeMinX);
    const cy = safeMinY + rand() * (safeMaxY - safeMinY);

    const points = 4 + Math.floor(rand() * 4); // 4..7
    const pts = [];
    const rx = 40 + rand() * 110;
    const ry = 40 + rand() * 110;

    for (let i = 0; i < points; i++) {
      const a = rand() * Math.PI * 2;
      const r1 = 0.35 + rand() * 0.75;
      const x = clamp(cx + Math.cos(a) * rx * r1, safeMinX, safeMaxX);
      const y = clamp(cy + Math.sin(a) * ry * r1, safeMinY, safeMaxY);
      pts.push({ x, y });
    }

    // ordenar por ángulo alrededor del centro (para formar figura)
    const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    pts.sort((p1, p2) => Math.atan2(p1.y - my, p1.x - mx) - Math.atan2(p2.y - my, p2.x - mx));

    // líneas
    const polyPts = pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    els.push(
      `<polyline points="${polyPts}" fill="none" stroke="${lineColor}" stroke-width="${lineW.toFixed(2)}" opacity="0.60" stroke-linecap="round" stroke-linejoin="round" />`
    );

    // nodos
    for (const p of pts) {
      els.push(
        `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${nodeR.toFixed(2)}" fill="${nodeColor}" opacity="0.90" />`
      );
    }
  }

  return els.join("\n");
}

// --------------------- STARS ---------------------
function starsSvg({ w, h, rand, color }) {
  const N = Math.round(680 + rand() * 80);
  const els = [];

  for (let i = 0; i < N; i++) {
    const x = rand() * w;
    const y = rand() * h;

    const big = rand() > 0.92;
    const r = big ? (1.5 + rand() * 1.8) : (rand() * 1.2);
    const a = big ? (0.75 + rand() * 0.25) : (0.35 + rand() * 0.55);

    els.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${color}" opacity="${a.toFixed(3)}" />`);
  }

  return els.join("\n");
}

export function renderMapSvg(opts) {
  const w = clamp(Number(opts.w || 780), 200, 2000);
  const h = clamp(Number(opts.h || 780), 200, 2000);

  const shape = String(opts.shape || "circle");
  const seed = (Number(opts.seed || 0) >>> 0);

  const z = clamp(Number(opts.mapZoom || 1), 1.0, 1.6);

  const colorTheme = String(opts.colorTheme || "mono");
  const backgroundMode = String(opts.backgroundMode || "match"); // << IMPORTANTE

  const tokens = computeTokens({ colorTheme, backgroundMode });

  const showGrid = !!opts.showGrid;
  const showConst = !!opts.showConstellations;

  const constellationSize = clamp(Number(opts.constellationSize || 2.0), 1.0, 4.0);

  // Si hay marco/margen del poster, el frontend hacía inset; aquí lo conservamos por compat
  const frameOn = !!opts.posterFrameEnabled;
  const marginOn = !!opts.posterMarginEnabled && !frameOn;
  const shouldInset = frameOn || marginOn;
  const insetPct = clamp(Number(opts.mapCircleInsetPct || 0.10), 0.02, 0.25);
  const insetPad = shouldInset ? Math.round(Math.min(w, h) * insetPct) : 0;

  // Contorno
  const outlineEnabled = !!opts.mapCircleMarginEnabled;
  const outlineW = clamp(Number(opts.outlineThickness ?? 4), 0, 24);

  // Geometría
  const cx = w / 2;

  const cyCircle = h / 2;
  const rOuter = Math.min(w, h) / 2;
  const rContent = Math.max(0, rOuter - insetPad);

  const cyHeart = (h / 2) - Math.round(h * 0.06);
  const baseSize = Math.min(w, h) * (0.5227 * 0.95);
  const heartSize = clamp(baseSize - insetPad * 0.95, baseSize * 0.70, baseSize);

  // Clip path (forma real)
  let clipD = "";
  let outlineEl = "";

  if (shape === "circle") {
    clipD = circlePathD(cx, cyCircle, rContent);

    if (outlineEnabled && outlineW > 0) {
      // contorno de grosor real, sin opacidad
      outlineEl = `<path d="${circlePathD(cx, cyCircle, Math.max(0, rContent - outlineW / 2))}" fill="none" stroke="${tokens.outline}" stroke-width="${outlineW}" opacity="1" />`;
    }
  } else if (shape === "heart") {
    clipD = heartPathD(cx, cyHeart, heartSize);

    if (outlineEnabled && outlineW > 0) {
      outlineEl = `<path d="${clipD}" fill="none" stroke="${tokens.outline}" stroke-width="${outlineW}" opacity="1" />`;
    }
  } else {
    // rect
    clipD = `M 0 0 H ${w} V ${h} H 0 Z`;
    if (outlineEnabled && outlineW > 0) {
      const half = outlineW / 2;
      outlineEl = `<rect x="${half}" y="${half}" width="${w - outlineW}" height="${h - outlineW}" fill="none" stroke="${tokens.outline}" stroke-width="${outlineW}" opacity="1" />`;
    }
  }

  const rand = mulberry32(seed);

  // Zoom: SOLO sobre capas internas (grid/stars/const) alrededor del centro visual
  const ty = (shape === "heart") ? cyHeart : cyCircle;
  const transform = (z !== 1) ? `translate(${cx} ${ty}) scale(${z}) translate(${-cx} ${-ty})` : "";

  // Capas
  const gridR = (shape === "circle")
    ? Math.max(0, rContent)
    : Math.min(w, h) * 0.48;

  const gridEls = (showGrid)
    ? globeGridSvg({ cx, cy: ty, R: gridR, stroke: tokens.gridLine })
    : "";

  const constEls = (showConst)
    ? constellationsSvg({ w, h, rand, lineColor: tokens.constLine, nodeColor: tokens.constNode, size: constellationSize })
    : "";

  const starEls = starsSvg({ w, h, rand, color: tokens.stars });

  // IMPORTANTE:
  // - NO ponemos rect de fondo a todo el SVG (eso causaba el cuadrado en fondo blanco).
  // - Solo pintamos el rect DENTRO del clip.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <clipPath id="clipShape">
      <path d="${clipD}"/>
    </clipPath>
  </defs>

  <g clip-path="url(#clipShape)">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${tokens.mapBg}"/>
    <g ${transform ? `transform="${transform}"` : ""}>
      ${gridEls}
      ${constEls}
      ${starEls}
    </g>
  </g>

  ${outlineEl}
</svg>`;

  return svg;
}
