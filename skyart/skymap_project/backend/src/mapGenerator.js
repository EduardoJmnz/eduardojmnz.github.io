// backend/src/mapGenerator.js
// Genera el mapa como SVG para que el frontend solo lo pinte (no expone la lógica).

import { STARS, CONSTELLATIONS } from "./catalog.js";

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function mulberry32(seed){
  let t = seed >>> 0;
  return function(){
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function colorsFor(theme){
  const THEMES = {
    mono:      { mapBg: "#0A0B0D", stars: "#FFFFFF" },
    marino:    { mapBg: "#0B0D12", stars: "#FFFFFF" },
    ice:       { mapBg: "#071016", stars: "#E9F6FF" },
    warm:      { mapBg: "#140E0A", stars: "#F6E7C9" },
    forest:    { mapBg: "#06130E", stars: "#EAF7F1" },
    rose:      { mapBg: "#16080C", stars: "#FFE9EF" },
    neonBlue:  { mapBg: "#05050A", stars: "#4EA7FF" },
    neonGreen: { mapBg: "#05050A", stars: "#3CFF9B" },
    neonRose:  { mapBg: "#05050A", stars: "#FF4FD8" },
  };
  return THEMES[theme] || THEMES.mono;
}

function heartPathD(cx, cy, size){
  // Aproximación de la misma forma de corazón que en canvas.
  const s = size;
  // Control points “bonitos” para un corazón simétrico.
  const topY = cy - s * 0.25;
  const leftX = cx - s * 0.5;
  const rightX = cx + s * 0.5;
  const bottomY = cy + s * 0.55;

  const c1x = cx - s * 0.35;
  const c1y = cy - s * 0.55;
  const c2x = cx - s * 0.85;
  const c2y = cy + s * 0.10;

  const c3x = cx - s * 0.35;
  const c3y = cy + s * 0.55;
  const c4x = cx;
  const c4y = cy + s * 0.85;

  const c5x = cx + s * 0.35;
  const c5y = cy + s * 0.55;
  const c6x = cx + s * 0.85;
  const c6y = cy + s * 0.10;

  const c7x = cx + s * 0.35;
  const c7y = cy - s * 0.55;

  return [
    `M ${cx} ${topY}`,
    `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${leftX} ${cy}`,
    `C ${leftX} ${cy + s * 0.40}, ${c3x} ${c3y}, ${cx} ${bottomY}`,
    `C ${c5x} ${c5y}, ${rightX} ${cy + s * 0.40}, ${rightX} ${cy}`,
    `C ${c6x} ${c6y}, ${c7x} ${c7y}, ${cx} ${topY}`,
    `Z`
  ].join(" ");
}

function gridLines(cx, cy, r){
  // Retorna elementos SVG de una retícula tipo globo: círculos concéntricos + meridianos.
  const els = [];
  const circles = 6;
  for (let i=1;i<=circles;i++){
    const rr = (r * i) / circles;
    els.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" />`);
  }
  const spokes = 12;
  for (let i=0;i<spokes;i++){
    const ang = (Math.PI * 2 * i) / spokes;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    els.push(`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" />`);
  }
  return els;
}

function starField(w, h, rand){
  // Genera estrellas "bonitas" deterministas.
  const stars = [];
  const N = Math.floor(700 + rand()*450); // ~700-1150
  for (let i=0;i<N;i++){
    const x = rand()*w;
    const y = rand()*h;
    // muchas pequeñas, pocas grandes
    const t = rand();
    const r = t < 0.85 ? (0.45 + rand()*0.85) : (1.3 + rand()*1.9);
    const a = t < 0.85 ? (0.28 + rand()*0.5) : (0.55 + rand()*0.45);
    stars.push({x,y,r,a});
  }
  return stars;
}

function constellationSegments(stars, rand){
  // Segmentos "random" + un mini set "real" (Orion/UMA) basado en catálogo.
  const segs = [];

  // 1) algunos segmentos aleatorios conectando estrellas cercanas
  const K = 38;
  for (let i=0;i<K;i++){
    const a = stars[(rand()*stars.length)|0];
    const b = stars[(rand()*stars.length)|0];
    segs.push({x1:a.x,y1:a.y,x2:b.x,y2:b.y});
  }

  // 2) mini constelaciones "reales": usamos el catálogo como semilla para anclarlas al campo
  // Para no exponer el catálogo en el frontend, las trazamos aquí usando posiciones pseudo-astronómicas.
  // Mapeamos RA/Dec a un plano simple (no es exacto; sirve visualmente).
  const anchor = {};
  for (let i=0;i<STARS.length;i++){
    const [name, ra, dec] = STARS[i];
    // normaliza ra (0..360) y dec (-90..90) a 0..1
    const u = (ra % 360) / 360;
    const v = (dec + 90) / 180;
    anchor[i] = { x: u, y: 1 - v };
  }
  for (const segList of Object.values(CONSTELLATIONS)){
    for (const [ia, ib] of segList){
      const A = anchor[ia];
      const B = anchor[ib];
      if (!A || !B) continue;
      segs.push({
        x1: A.x, y1: A.y, x2: B.x, y2: B.y,
        __normalized: true
      });
    }
  }

  return segs;
}

export function renderMapSVG(params){
  const {
    w=780,
    h=780,
    styleId="classic",
    seed=12345,
    showGrid=false,
    showConstellations=true,
    colorTheme="mono",
    mapZoom=1.0,
    // Estos vienen del frontend (para que el resultado sea idéntico a la UI)
    isPoster=false,
    posterFrameEnabled=false,
    posterMarginEnabled=true,
    mapCircleMarginEnabled=true,
    mapCircleInsetPct=0.10,
    outlineThickness=4,
    constellationSize=2.0,
  } = params || {};

  const rand = mulberry32(seed);
  const tokens = colorsFor(colorTheme);

  // Derivados
  const z = clamp(mapZoom || 1, 1.0, 1.6);
  const outlineEnabled = !!mapCircleMarginEnabled;
  const outlineW = outlineThickness;

  const frameOn = (!isPoster) && !!posterFrameEnabled;
  const marginOn = (!isPoster) && !!posterMarginEnabled && !frameOn;
  const shouldInset = frameOn || marginOn;
  const insetPad = shouldInset ? Math.round(Math.min(w, h) * (mapCircleInsetPct || 0.10)) : 0;

  // Estilos
  const faint = "rgba(255,255,255,0.35)";
  const faint2 = "rgba(255,255,255,0.16)";
  const constLine = "rgba(255,255,255,0.22)";
  const constNode = "rgba(255,255,255,0.55)";
  const gridLine = "rgba(255,255,255,0.12)";
  const outline = "rgba(255,255,255,0.28)";

  const stars = starField(w, h, rand);
  const segs = showConstellations ? constellationSegments(stars, rand) : [];

  const cs = clamp(constellationSize, 1, 4);
  const conLineW = 0.9 + cs * 0.55;
  const nodeR = 1.6 + cs * 0.35;

  const cx = w/2;
  const cy = h/2;

  let clip = "";
  let outlineEl = "";

  // shape defs
  if (styleId === "poster"){
    // rect
    clip = `<clipPath id="clip"><rect x="0" y="0" width="${w}" height="${h}" rx="0" ry="0"/></clipPath>`;
    if (outlineEnabled){
      const half = outlineW/2;
      outlineEl = `<rect x="${half}" y="${half}" width="${w-outlineW}" height="${h-outlineW}" fill="none" stroke="${outline}" stroke-width="${outlineW}" />`;
    }
  } else if (styleId === "romantico"){
    const baseSize = Math.min(w,h) * (0.5227 * 0.95);
    const size = clamp(baseSize - insetPad * 0.95, baseSize * 0.70, baseSize);
    const cyHeart = cy - Math.round(h * 0.06);
    const d = heartPathD(cx, cyHeart, size);
    clip = `<clipPath id="clip"><path d="${d}"/></clipPath>`;
    if (outlineEnabled){
      outlineEl = `<path d="${d}" fill="none" stroke="${outline}" stroke-width="${outlineW}" />`;
    }
  } else {
    // circle (classic/moderno)
    const rOuter = Math.min(w,h)/2;
    const rContent = rOuter - insetPad;
    clip = `<clipPath id="clip"><circle cx="${cx}" cy="${cy}" r="${rContent}"/></clipPath>`;
    if (outlineEnabled){
      outlineEl = `<circle cx="${cx}" cy="${cy}" r="${Math.max(0, rContent - outlineW/2)}" fill="none" stroke="${outline}" stroke-width="${outlineW}" />`;
    }
  }

  // grid
  let grid = "";
  if (showGrid && (styleId === "classic" || styleId === "moderno")){
    const rOuter = Math.min(w,h)/2;
    const rContent = rOuter - insetPad;
    grid = `<g stroke="${gridLine}" stroke-width="1" fill="none">${gridLines(cx,cy,rContent).join("")}</g>`;
  }

  // stars (apply zoom around center)
  const starEls = stars.map(s => {
    const x = cx + (s.x - cx) * z;
    const y = cy + (s.y - cy) * z;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${s.r.toFixed(2)}" fill="${tokens.stars}" opacity="${s.a.toFixed(3)}"/>`;
  }).join("");

  const segEls = segs.map(seg => {
    // si es normalized, expandimos a canvas; también aplicamos zoom
    let x1 = seg.__normalized ? seg.x1 * w : seg.x1;
    let y1 = seg.__normalized ? seg.y1 * h : seg.y1;
    let x2 = seg.__normalized ? seg.x2 * w : seg.x2;
    let y2 = seg.__normalized ? seg.y2 * h : seg.y2;

    x1 = cx + (x1 - cx) * z;
    y1 = cy + (y1 - cy) * z;
    x2 = cx + (x2 - cx) * z;
    y2 = cy + (y2 - cy) * z;

    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${constLine}" stroke-width="${conLineW.toFixed(2)}" stroke-linecap="round"/>`;
  }).join("");

  // constellation nodes (a few)
  const nodeEls = showConstellations ? stars
    .filter((_, i) => i % 35 === 0)
    .map(s => {
      const x = cx + (s.x - cx) * z;
      const y = cy + (s.y - cy) * z;
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${nodeR.toFixed(2)}" fill="${constNode}" opacity="0.55"/>`;
    }).join("") : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    ${clip}
  </defs>
  <g clip-path="url(#clip)">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${tokens.mapBg}"/>
    ${grid}
    <g>
      ${starEls}
    </g>
    ${showConstellations ? `<g>${segEls}${nodeEls}</g>` : ""}
  </g>
  ${outlineEl}
</svg>`;

  return svg;
}
