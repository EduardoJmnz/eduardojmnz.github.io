// Generador de mapa en SVG (server-side) para evitar exponer la lógica en el frontend.
// Replica el estilo general (círculo/rectángulo/corazón, grid, estrellas, constelaciones).

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function mulberry32(seed){
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (t >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function colorsFor(theme){
  const THEMES = {
    mono:      { bg: "#0A0B0D", star: "#FFFFFF", faint: "rgba(255,255,255,.18)", faint2: "rgba(255,255,255,.10)" },
    marino:    { bg: "#0B0D12", star: "#FFFFFF", faint: "rgba(255,255,255,.18)", faint2: "rgba(255,255,255,.10)" },
    ice:       { bg: "#071016", star: "#E9F6FF", faint: "rgba(233,246,255,.18)", faint2: "rgba(233,246,255,.10)" },
    warm:      { bg: "#140E0A", star: "#F6E7C9", faint: "rgba(246,231,201,.18)", faint2: "rgba(246,231,201,.10)" },
    forest:    { bg: "#06130E", star: "#EAF7F1", faint: "rgba(234,247,241,.18)", faint2: "rgba(234,247,241,.10)" },
    rose:      { bg: "#16080C", star: "#FFE9EF", faint: "rgba(255,233,239,.18)", faint2: "rgba(255,233,239,.10)" },
    neonBlue:  { bg: "#05050A", star: "#4EA7FF", faint: "rgba(78,167,255,.20)", faint2: "rgba(78,167,255,.12)" },
    neonGreen: { bg: "#05050A", star: "#3CFF9B", faint: "rgba(60,255,155,.20)", faint2: "rgba(60,255,155,.12)" },
    neonRose:  { bg: "#05050A", star: "#FF4FD8", faint: "rgba(255,79,216,.20)", faint2: "rgba(255,79,216,.12)" },
  };
  return THEMES[String(theme||"")] || THEMES.mono;
}

function heartPathD(cx, cy, size){
  // Corazón SVG aproximado (coincidente visualmente con el canvas)
  const s = size;
  const x = cx, y = cy;
  const top = y - s * 0.15;
  const left = x - s * 0.5;
  const right = x + s * 0.5;
  const bottom = y + s * 0.55;

  // Dos lóbulos + punta
  // Usamos curvas cúbicas para una silueta suave
  return [
    `M ${x} ${bottom}`,
    `C ${x - s*0.55} ${y + s*0.25}, ${left} ${y - s*0.05}, ${x - s*0.25} ${top}`,
    `C ${x - s*0.05} ${y - s*0.28}, ${x - s*0.02} ${y - s*0.28}, ${x} ${top}`,
    `C ${x + s*0.02} ${y - s*0.28}, ${x + s*0.05} ${y - s*0.28}, ${x + s*0.25} ${top}`,
    `C ${right} ${y - s*0.05}, ${x + s*0.55} ${y + s*0.25}, ${x} ${bottom}`,
    "Z"
  ].join(" ");
}

function circleClipD(cx, cy, r){ return `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,0 ${2*r},0 a ${r},${r} 0 1,0 -${2*r},0`; }

function svgEscape(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll("\"","&quot;")
    .replaceAll("'","&#39;");
}

function gridElements({cx, cy, r, stroke}){
  const els = [];
  // Círculos concéntricos
  for (let i = 1; i <= 4; i++){
    const rr = (r * i) / 4;
    els.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${stroke}" stroke-width="1" opacity="0.65"/>`);
  }
  // Meridianos (radiales)
  for (let a = 0; a < 360; a += 30){
    const rad = (a * Math.PI) / 180;
    const x2 = cx + Math.cos(rad) * r;
    const y2 = cy + Math.sin(rad) * r;
    els.push(`<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="1" opacity="0.45"/>`);
  }
  return els.join("\n");
}

export function renderMapSvg(opts){
  const w = clamp(Number(opts.w || 780), 200, 2000);
  const h = clamp(Number(opts.h || 780), 200, 2000);

  const shape = String(opts.shape || "circle");
  const seed = Number(opts.seed || 0) >>> 0;
  const z = clamp(Number(opts.mapZoom || 1), 1.0, 1.6);

  const theme = colorsFor(opts.colorTheme);
  const showGrid = !!opts.showGrid;
  const showConst = !!opts.showConstellations;

  // Inset (margen/marco): mismo criterio de frontend
  const frameOn = !!opts.posterFrameEnabled;
  const marginOn = !!opts.posterMarginEnabled && !frameOn;
  const shouldInset = frameOn || marginOn;
  const insetPad = shouldInset ? Math.round(Math.min(w, h) * clamp(Number(opts.mapCircleInsetPct || 0.10), 0.02, 0.25)) : 0;

  const outlineEnabled = !!opts.mapCircleMarginEnabled;
  const outlineW = clamp(Number(opts.outlineThickness || 4), 0, 20);

  // Geometría shape
  const cx = w/2;
  const cyCircle = h/2;
  const rOuter = Math.min(w,h)/2;
  const rContent = rOuter - insetPad;

  const cyHeart = (h/2) - Math.round(h * 0.06);
  const baseSize = Math.min(w, h) * (0.5227 * 0.95);
  const heartSize = clamp(baseSize - insetPad * 0.95, baseSize * 0.70, baseSize);

  // Clip path
  let clipD = "";
  let outlineEl = "";
  if (shape === "circle"){
    clipD = circleClipD(cx, cyCircle, rContent);
    if (outlineEnabled && outlineW > 0){
      outlineEl = `<path d="${circleClipD(cx, cyCircle, Math.max(0, rContent - outlineW/2))}" fill="none" stroke="${theme.faint}" stroke-width="${outlineW}" opacity="0.95"/>`;
    }
  } else if (shape === "heart"){
    clipD = heartPathD(cx, cyHeart, heartSize);
    if (outlineEnabled && outlineW > 0){
      outlineEl = `<path d="${clipD}" fill="none" stroke="${theme.faint}" stroke-width="${outlineW}" opacity="0.95"/>`;
    }
  } else {
    // rect
    clipD = `M 0 0 H ${w} V ${h} H 0 Z`;
    if (outlineEnabled && outlineW > 0){
      const half = outlineW/2;
      outlineEl = `<rect x="${half}" y="${half}" width="${w - outlineW}" height="${h - outlineW}" fill="none" stroke="${theme.faint}" stroke-width="${outlineW}" opacity="0.95"/>`;
    }
  }

  const rand = mulberry32(seed);

  // Stars
  const N = Math.round(520 + (Math.min(w,h) / 780) * 380); // escala con tamaño
  const stars = [];
  for (let i = 0; i < N; i++){
    const x = rand() * w;
    const y = rand() * h;
    // peso hacia estrellas pequeñas
    const r = Math.max(0.55, Math.pow(rand(), 3) * 2.35);
    const a = 0.35 + Math.pow(rand(), 2) * 0.65;
    stars.push({x, y, r, a});
  }

  // Constellations: conectamos puntos aleatorios para look & feel
  const lines = [];
  if (showConst){
    const L = 18;
    for (let i = 0; i < L; i++){
      const a = stars[Math.floor(rand() * stars.length)];
      const b = stars[Math.floor(rand() * stars.length)];
      if (!a || !b) continue;
      lines.push({x1:a.x, y1:a.y, x2:b.x, y2:b.y, a: 0.25 + rand()*0.25});
    }
  }

  // Transform (zoom) alrededor del centro visual
  const tx = cx, ty = (shape === "heart") ? cyHeart : cyCircle;
  const transform = (z !== 1) ? `translate(${tx} ${ty}) scale(${z}) translate(${-tx} ${-ty})` : "";

  const starEls = stars.map(s => `<circle cx="${s.x.toFixed(2)}" cy="${s.y.toFixed(2)}" r="${s.r.toFixed(2)}" fill="${theme.star}" opacity="${s.a.toFixed(3)}"/>`).join("\n");
  const lineEls = lines.map(l => `<line x1="${l.x1.toFixed(2)}" y1="${l.y1.toFixed(2)}" x2="${l.x2.toFixed(2)}" y2="${l.y2.toFixed(2)}" stroke="${theme.faint2}" stroke-width="1.2" opacity="${l.a.toFixed(3)}"/>`).join("\n");

  // Grid (solo círculo): si es rect, también se ve ok dentro del clip
  const grid = showGrid ? gridElements({cx: tx, cy: ty, r: (shape === "circle") ? rContent : Math.min(w,h)*0.45, stroke: theme.faint2}) : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <clipPath id="clipShape">
      <path d="${clipD}"/>
    </clipPath>
  </defs>

  <rect x="0" y="0" width="${w}" height="${h}" fill="${theme.bg}"/>

  <g clip-path="url(#clipShape)">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${theme.bg}"/>
    <g ${transform ? `transform="${transform}"` : ""}>
      ${grid}
      ${lineEls}
      ${starEls}
    </g>
  </g>

  ${outlineEl}
</svg>`;

  return svg;
}
