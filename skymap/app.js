(() => {
  const POSTER_W = 900;
  const POSTER_H = 1200;

  const POSTER_FRAME_EDGE_GAP_PX = 0;
  const POSTER_MARGIN_EDGE_GAP_PX = 50;

  const POSTER_FRAME_PCT_MAX = 0.06;
  const POSTER_FRAME_PCT_DEFAULT = POSTER_FRAME_PCT_MAX;

  const POSTER_LINE_THICK_MAX = 12;

  // ✅ fijo (sin slider)
  const POSTER_MARGIN_THICKNESS_FIXED = 6;
  const OUTLINE_THICKNESS_FIXED = POSTER_MARGIN_THICKNESS_FIXED;

  const state = {
    step: 0,

    visible: { title: true, subtitle: true, place: true, coords: true, datetime: true },

    text: {
      title: "NIGHT SKY",
      subtitle: "A moment to remember",
      place: "Mexico City, MX",
      coords: "19.4326, -99.1332",
      // ✅ para input[type="date"] debe ser ISO
      date: "1995-12-25",
      time: "19:30",
      fontKey: "system",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    },

    map: {
      styleId: "classic",

      showGrid: false,
      showConstellations: true,

      colorTheme: "mono",
      mapZoom: 1.0,

      // ✅ default: mismo color que el mapa
      backgroundMode: "match",

      posterFrameEnabled: false,
      posterFramePct: POSTER_FRAME_PCT_DEFAULT,
      posterFrameInsetPx: Math.round(POSTER_W * POSTER_FRAME_PCT_DEFAULT),

      // ✅ margen fijo
      posterMarginEnabled: true,
      posterMarginThickness: POSTER_MARGIN_THICKNESS_FIXED,
      posterMarginThicknessMax: POSTER_LINE_THICK_MAX,

      // ✅ contorno mapa
      mapCircleMarginEnabled: true,
      mapCircleInsetPct: 0.10,
      mapCircleMarginThickness: OUTLINE_THICKNESS_FIXED,

      constellationSize: 2.0,
      seed: 12345,
    },

    export: {
      sizeKey: "digital_900x1200",
      format: "png",
      dpi: 300,
    }
  };

  const STEPS = [
    { key: "design", label: "Diseño" },
    { key: "content", label: "Contenido" },
    { key: "export", label: "Exportar" },
  ];

  const MAP_STYLES = [
    { id: "classic",   name: "Clásico",   layout: "classic", shape: "circle" },
    { id: "moderno",   name: "Moderno",   layout: "minimal", shape: "circle" },
    { id: "poster",    name: "Poster",    layout: "classic", shape: "rect"   },
    { id: "romantico", name: "Romántico", layout: "classic", shape: "heart"  },
  ];

  const FONT_PRESETS = [
    { key: "system", name: "System (Default)", css: "system-ui, -apple-system, Segoe UI, Roboto, Arial" },
    { key: "inter", name: "Inter-like (Sans)", css: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" },
    { key: "georgia", name: "Georgia (Serif)", css: "Georgia, 'Times New Roman', Times, serif" },
    { key: "times", name: "Times New Roman (Serif)", css: "'Times New Roman', Times, serif" },
    { key: "mono", name: "Monospace", css: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
    { key: "rounded", name: "Rounded (Friendly)", css: "'Trebuchet MS', 'Verdana', system-ui, Arial" },
  ];

  // ✅ sin Carbon y ✅ sin Blanco en mapa
  const COLOR_THEMES = [
    { id: "mono",      name: "Mono" },
    { id: "marino",    name: "Marino" },
    { id: "ice",       name: "Hielo" },
    { id: "warm",      name: "Cálido" },
    { id: "forest",    name: "Bosque" },
    { id: "rose",      name: "Rosa" },
    { id: "neonBlue",  name: "Neón Azul" },
    { id: "neonGreen", name: "Neón Verde" },
    { id: "neonRose",  name: "Neón Rosa" },
  ];

  const EXPORT_SIZES = [
    { key: "digital_900x1200", title: "Digital (900×1200 px)", sub: "Ideal para pantalla / pruebas rápidas", type: "px", w: 900, h: 1200 },
    { key: "45x60cm_300dpi",   title: "45×60 cm (300 dpi)",    sub: "Impresión normal", type: "cm", w: 45, h: 60 },
    { key: "60x80cm_300dpi",   title: "60×80 cm (300 dpi)",    sub: "Impresión grande", type: "cm", w: 60, h: 80 },
    { key: "90x120cm_300dpi",  title: "90×120 cm (300 dpi)",   sub: "Impresión premium", type: "cm", w: 90, h: 120 },
  ];

  const $poster = document.getElementById("poster");
  const $canvas = document.getElementById("mapCanvas");

  const $pTitle = document.getElementById("pTitle");
  const $pSubtitle = document.getElementById("pSubtitle");
  const $pPlace = document.getElementById("pPlace");
  const $pCoords = document.getElementById("pCoords");
  const $pDatetime = document.getElementById("pDatetime");

  const $tabs = document.getElementById("tabs");
  const $section = document.getElementById("sectionContainer");

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function mulberry32(seed){
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash32(str){
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function isNeonThemeId(id){
    return String(id || "").startsWith("neon");
  }

  function getDateTimeString(){
    const d = (state.text.date || "").trim();
    const t = (state.text.time || "").trim();
    if (!d && !t) return "";
    if (d && t) return `${d} ${t}`;
    return d || t;
  }

  function updateSeedFromDateTime(){
    const key = `${(state.text.coords||"").trim()}|${(state.text.date||"").trim()}|${(state.text.time||"").trim()}`;
    state.map.seed = hash32(key);
  }

  function hexToRgb(hex){
    if (!hex) return { r:255, g:255, b:255 };
    let h = String(hex).trim();
    if (h.startsWith("#")) h = h.slice(1);
    if (h.length === 3) h = h.split("").map(ch => ch + ch).join("");
    const n = parseInt(h, 16);
    if (!Number.isFinite(n)) return { r:255, g:255, b:255 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbaFromHex(hex, a){
    const { r,g,b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  function colorsFor(theme){
    const THEMES = {
      mono:      { bg: "#0A0B0D", star: "#FFFFFF", line: "#FFFFFF" },
      marino:    { bg: "#0B0D12", star: "#FFFFFF", line: "#FFFFFF" },
      ice:       { bg: "#071016", star: "#E9F6FF", line: "#E9F6FF" },
      warm:      { bg: "#140E0A", star: "#F6E7C9", line: "#F6E7C9" },
      forest:    { bg: "#06130E", star: "#EAF7F1", line: "#EAF7F1" },
      rose:      { bg: "#16080C", star: "#FFE9EF", line: "#FFE9EF" },
      neonBlue:  { bg: "#05050A", star: "#4EA7FF", line: "#4EA7FF" },
      neonGreen: { bg: "#05050A", star: "#3CFF9B", line: "#3CFF9B" },
      neonRose:  { bg: "#05050A", star: "#FF4FD8", line: "#FF4FD8" },
    };
    return THEMES[theme] || THEMES.mono;
  }

  function getStyleDef(){
    return MAP_STYLES.find(s => s.id === state.map.styleId) || MAP_STYLES[0];
  }

  function isGridAllowedForCurrentStyle(){
    return (state.map.styleId === "classic" || state.map.styleId === "moderno");
  }

  function isPosterStyle(){
    return state.map.styleId === "poster";
  }

  function isPosterDecorAllowed(){
    return !isPosterStyle();
  }

  function isWhiteBackgroundMode(){
    return state.map.backgroundMode === "white";
  }

  function mapOutlineAllowed(){
    return !isWhiteBackgroundMode() && !isPosterStyle();
  }

  // ✅ solo romántico puede toggle
  function outlineToggleAllowedByStyle(){
    return state.map.styleId === "romantico";
  }

  function computeRenderTokens(){
    const th = colorsFor(state.map.colorTheme);
    const neon = isNeonThemeId(state.map.colorTheme);

    if (neon){
      return {
        posterBg: "#000000",
        posterInk: th.star,
        mapBg: "#000000",
        stars: th.star,
        gridLine: th.star,
        constLine: th.star,
        constNode: th.star,
        outline: th.star,
        theme: th,
        neon: true,
      };
    }

    if (isWhiteBackgroundMode()){
      return {
        posterBg: "#FFFFFF",
        posterInk: th.bg,
        mapBg: th.bg,
        stars: th.star,
        gridLine: "#FFFFFF",
        constLine: "#FFFFFF",
        constNode: "#FFFFFF",
        outline: "#FFFFFF",
        theme: th,
        neon: false,
      };
    }

    return {
      posterBg: th.bg,
      posterInk: "#FFFFFF",
      mapBg: th.bg,
      stars: "#FFFFFF",
      gridLine: "#FFFFFF",
      constLine: "#FFFFFF",
      constNode: "#FFFFFF",
      outline: "#FFFFFF",
      theme: th,
      neon: false,
    };
  }

  function syncThickness(){
    state.map.posterMarginThickness = POSTER_MARGIN_THICKNESS_FIXED;
    state.map.mapCircleMarginThickness = OUTLINE_THICKNESS_FIXED;
  }

  // --------------------------
  // CAPAS: marco + papel + margen
  // --------------------------
  let $posterFrameArea = null;
  let $posterPaper = null;
  let $posterMarginLine = null;

  function ensurePosterLayers(){
    if (!$posterFrameArea){
      $posterFrameArea = document.createElement("div");
      $posterFrameArea.id = "posterFrameArea";
      Object.assign($posterFrameArea.style, {
        position: "absolute",
        inset: "0px",
        borderRadius: "0px",
        zIndex: "0",
        pointerEvents: "none",
        background: "transparent",
        opacity: "0",
      });
      $poster.insertBefore($posterFrameArea, $poster.firstChild);
    }

    if (!$posterPaper){
      $posterPaper = document.createElement("div");
      $posterPaper.id = "posterPaper";
      Object.assign($posterPaper.style, {
        position: "absolute",
        inset: "0px",
        borderRadius: "0px",
        zIndex: "1",
        pointerEvents: "none",
        background: "transparent",
      });
      $poster.insertBefore($posterPaper, $poster.firstChild.nextSibling);
    }

    if (!$posterMarginLine){
      $posterMarginLine = document.createElement("div");
      $posterMarginLine.id = "posterMarginLine";
      Object.assign($posterMarginLine.style, {
        position: "absolute",
        inset: "0px",
        borderRadius: "0px",
        zIndex: "2",
        pointerEvents: "none",
        border: "0px solid transparent",
        boxSizing: "border-box",
      });
      $poster.insertBefore($posterMarginLine, $poster.firstChild.nextSibling.nextSibling);
    }

    const inner = $poster.querySelector(".posterInner");
    if (inner) inner.style.zIndex = "3";
  }

  function updatePosterFrameInsetPx(){
    const pct = clamp(state.map.posterFramePct ?? POSTER_FRAME_PCT_DEFAULT, 0, POSTER_FRAME_PCT_MAX);
    state.map.posterFramePct = pct;
    state.map.posterFrameInsetPx = Math.round(POSTER_W * pct);
  }

  function enforceDecorRules(){
    if (!isPosterDecorAllowed()){
      state.map.posterFrameEnabled = false;
      state.map.posterMarginEnabled = false;
      return;
    }
    if (state.map.posterFrameEnabled){
      state.map.posterMarginEnabled = false;
    }
  }

  function applyPosterFrameAndMargin(tokens){
    ensurePosterLayers();
    updatePosterFrameInsetPx();
    enforceDecorRules();
    syncThickness();

    const frameEdge = POSTER_FRAME_EDGE_GAP_PX;
    const marginEdge = POSTER_MARGIN_EDGE_GAP_PX;

    const decorAllowed = isPosterDecorAllowed();
    const frameOn = decorAllowed && !!state.map.posterFrameEnabled;
    const marginOn = decorAllowed && !!state.map.posterMarginEnabled && !frameOn;

    const framePx = frameOn ? clamp(state.map.posterFrameInsetPx, 0, 160) : 0;

    // Fondo general + tinta
    $poster.style.background = tokens.posterBg;
    $poster.style.color = tokens.posterInk;

    // Marco (área)
    if (frameOn){
      $posterFrameArea.style.opacity = "1";
      $posterFrameArea.style.background = tokens.posterInk;
      $posterFrameArea.style.inset = `${frameEdge}px`;
    } else {
      $posterFrameArea.style.opacity = "0";
      $posterFrameArea.style.background = "transparent";
      $posterFrameArea.style.inset = `${frameEdge}px`;
    }

    // Papel interior
    const innerInset = frameEdge + framePx;
    $posterPaper.style.background = tokens.posterBg;
    $posterPaper.style.inset = `${innerInset}px`;

    // Margen (línea) fijo
    const thickness = POSTER_MARGIN_THICKNESS_FIXED;
    $posterMarginLine.style.inset = `${marginEdge}px`;
    $posterMarginLine.style.borderWidth = marginOn ? `${thickness}px` : "0px";
    $posterMarginLine.style.borderStyle = "solid";
    $posterMarginLine.style.borderColor = marginOn ? rgbaFromHex(tokens.posterInk, 1) : "transparent";

    // Bottom spacing
    const baseBottom = isPosterStyle() ? 60 : 100;
    const safeBottomWhenMarginOn = marginEdge + thickness + 18;
    const finalBottom = marginOn ? Math.max(baseBottom, safeBottomWhenMarginOn) : baseBottom;
    $poster.style.setProperty("--bottomTextBottom", `${finalBottom}px`);
  }

  function applyPosterLayoutByStyle(){
    const st = getStyleDef();

    if (st.layout === "classic") $poster.classList.add("classic");
    else $poster.classList.remove("classic");

    $poster.classList.toggle("rectStyle", st.shape === "rect");

    if (st.shape === "rect") {
      $poster.style.setProperty("--mapW", "820px");
      $poster.style.setProperty("--mapH", "860px");
    } else {
      $poster.style.setProperty("--mapW", "780px");
      $poster.style.setProperty("--mapH", "780px");
    }
  }

  function applyPosterPaddingLayout(){
    const edge = POSTER_FRAME_EDGE_GAP_PX;
    const frame = (isPosterDecorAllowed() && state.map.posterFrameEnabled)
      ? clamp(state.map.posterFrameInsetPx, 0, 160)
      : 0;

    const pad = edge + frame;
    $poster.style.setProperty("--posterPad", `${pad}px`);
  }

  function setMapSizeFromPosterPad(){
    const st = getStyleDef();
    if (st.shape !== "circle") return;

    const base = 780;
    const frame = (isPosterDecorAllowed() && state.map.posterFrameEnabled)
      ? clamp(state.map.posterFrameInsetPx, 0, 160)
      : 0;

    const size = clamp(base - Math.round(frame * 0.6), 640, 780);
    $poster.style.setProperty("--mapW", `${size}px`);
    $poster.style.setProperty("--mapH", `${size}px`);
  }

  function heartPath(ctx, cx, cy, size){
    const s = size / 18;
    ctx.beginPath();
    const steps = 220;
    for (let i = 0; i <= steps; i++){
      const t = (i / steps) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
      const px = cx + x * s * 1.10;
      const py = cy - y * s * 1.15;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // ✅ Retícula globo “como ejemplo” (70% opacidad al frente)
  function drawGlobeGrid(ctx, w, h, gridLine){
    const cx = w / 2;
    const cy = h / 2;
    const R  = Math.min(w, h) * 0.48;

    const tiltX = 24 * Math.PI / 180;
    const rotY  = 0  * Math.PI / 180;

    const alphaFront = 0.70;
    const alphaBack  = 0.18;

    const lwFront = 1.35;
    const lwBack  = 1.00;

    const sinX = Math.sin(tiltX), cosX = Math.cos(tiltX);
    const sinY = Math.sin(rotY),  cosY = Math.cos(rotY);

    function projectSphere(lat, lon){
      let x = Math.cos(lat) * Math.cos(lon);
      let y = Math.sin(lat);
      let z = Math.cos(lat) * Math.sin(lon);

      { // rot Y
        const x2 = x * cosY + z * sinY;
        const z2 = -x * sinY + z * cosY;
        x = x2; z = z2;
      }

      { // rot X
        const y2 = y * cosX - z * sinX;
        const z2 = y * sinX + z * cosX;
        y = y2; z = z2;
      }

      return { sx: cx + x * R, sy: cy - y * R, z };
    }

    function strokePath(points, alpha, lw){
      if (points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = gridLine;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].sx, points[0].sy);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].sx, points[i].sy);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // Paralelos
    const latsDeg = [-60, -40, -20, 0, 20, 40, 60, 75];
    const lonSteps = 240;

    for (const latDeg of latsDeg){
      const lat = latDeg * Math.PI / 180;
      const frontPts = [];
      const backPts  = [];

      for (let i = 0; i <= lonSteps; i++){
        const lon = (i / lonSteps) * Math.PI * 2;
        const p = projectSphere(lat, lon);
        if (p.z >= 0) frontPts.push(p);
        else backPts.push(p);
      }

      const isPolarRing = (latDeg === 75);
      strokePath(backPts,  isPolarRing ? alphaBack * 0.9 : alphaBack,  isPolarRing ? lwBack  + 0.2 : lwBack);
      strokePath(frontPts, isPolarRing ? alphaFront : alphaFront,       isPolarRing ? lwFront + 1.0 : lwFront);
    }

    // Meridianos (derecha + izquierda)
    const baseLonsDeg = [];
    for (let d = -75; d <= 75; d += 15) baseLonsDeg.push(d);
    baseLonsDeg.push(-90, 90);

    const lonsDeg = [];
    for (const b of baseLonsDeg){
      lonsDeg.push(b);
      lonsDeg.push(b + 180);
    }

    const latSteps = 260;

    for (const lonDeg of lonsDeg){
      const lon = (lonDeg * Math.PI / 180) % (Math.PI * 2);

      const frontPts = [];
      const backPts  = [];

      for (let i = 0; i <= latSteps; i++){
        const lat = (-90 + (i / latSteps) * 180) * Math.PI / 180;
        const p = projectSphere(lat, lon);
        if (p.z >= 0) frontPts.push(p);
        else backPts.push(p);
      }

      strokePath(backPts,  alphaBack,  lwBack);
      strokePath(frontPts, alphaFront, lwFront);
    }

    ctx.restore();

    // aro exterior muy suave
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = gridLine;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawConstellations(ctx, w, h, rand, constLine, constNode, lineW, nodeR){
    const count = 6;
    ctx.save();
    ctx.lineWidth = lineW;
    ctx.strokeStyle = constLine;
    ctx.fillStyle = constNode;

    const safeMinX = 36, safeMaxX = w - 36;
    const safeMinY = 36, safeMaxY = h - 36;

    for (let c = 0; c < count; c++){
      const cx = safeMinX + rand() * (safeMaxX - safeMinX);
      const cy = safeMinY + rand() * (safeMaxY - safeMinY);

      const points = 4 + Math.floor(rand() * 4);
      const pts = [];

      const rx = 40 + rand() * 110;
      const ry = 40 + rand() * 110;

      for (let i = 0; i < points; i++){
        const a = rand() * Math.PI * 2;
        const r1 = 0.35 + rand() * 0.75;
        const x = clamp(cx + Math.cos(a) * rx * r1, safeMinX, safeMaxX);
        const y = clamp(cy + Math.sin(a) * ry * r1, safeMinY, safeMaxY);
        pts.push({ x, y });
      }

      const mx = pts.reduce((s,p)=>s+p.x,0)/pts.length;
      const my = pts.reduce((s,p)=>s+p.y,0)/pts.length;
      pts.sort((p1,p2)=>Math.atan2(p1.y-my,p1.x-mx)-Math.atan2(p2.y-my,p2.x-mx));

      ctx.globalAlpha = 1;
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      ctx.globalAlpha = 1;
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeR, 0, Math.PI*2);
        ctx.fill();
      });
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawStars(ctx, w, h, rand, starsColor){
    const N = Math.floor(680 + rand()*80);
    for (let i = 0; i < N; i++){
      const x = rand() * w;
      const y = rand() * h;

      const big = rand() > 0.92;
      const r = big ? (1.5 + rand() * 1.8) : (rand() * 1.2);
      const a = big ? (0.75 + rand() * 0.25) : (0.35 + rand() * 0.55);

      ctx.beginPath();
      ctx.globalAlpha = a;
      ctx.fillStyle = starsColor;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRectMap(ctx, mapW, mapH, tokens, rand, showOutline, outlineW, conLineW, nodeR){
    ctx.save();

    ctx.fillStyle = tokens.mapBg;
    ctx.fillRect(0,0,mapW,mapH);

    const z = clamp(state.map.mapZoom || 1, 1.0, 1.6);
    if (z !== 1){
      ctx.translate(mapW/2, mapH/2);
      ctx.scale(z, z);
      ctx.translate(-mapW/2, -mapH/2);
    }

    drawStars(ctx, mapW, mapH, rand, tokens.stars);

    if (state.map.showConstellations) {
      drawConstellations(ctx, mapW, mapH, rand, tokens.constLine, tokens.constNode, conLineW, nodeR);
    }

    ctx.restore();

    if (showOutline){
      ctx.save();
      ctx.strokeStyle = tokens.outline;
      ctx.lineWidth = outlineW;
      ctx.globalAlpha = 1;
      const half = outlineW / 2;
      ctx.strokeRect(half, half, mapW - outlineW, mapH - outlineW);
      ctx.restore();
    }
  }

  function enforceOutlineRulesByStyle(){
    if (state.map.styleId === "poster"){
      state.map.mapCircleMarginEnabled = false;
      return;
    }
    if (state.map.styleId === "classic"){
      state.map.mapCircleMarginEnabled = true;
      return;
    }
    if (state.map.styleId === "moderno"){
      state.map.mapCircleMarginEnabled = false;
      return;
    }
    // romantico: se respeta toggle
    if (!mapOutlineAllowed()) state.map.mapCircleMarginEnabled = false;
  }

  function drawMap(){
    syncThickness();
    enforceOutlineRulesByStyle();

    const mapW = Math.round(parseFloat(getComputedStyle($poster).getPropertyValue("--mapW")) || 780);
    const mapH = Math.round(parseFloat(getComputedStyle($poster).getPropertyValue("--mapH")) || 780);

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    $canvas.width = mapW * dpr;
    $canvas.height = mapH * dpr;
    $canvas.style.width = mapW + "px";
    $canvas.style.height = mapH + "px";

    const ctx = $canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const st = getStyleDef();
    const tokens = computeRenderTokens();
    const rand = mulberry32(state.map.seed);

    const cs = clamp(state.map.constellationSize, 1, 4);
    const conLineW = 0.9 + cs * 0.55;
    const nodeR = 1.6 + cs * 0.35;

    const outlineEnabled = !!state.map.mapCircleMarginEnabled && mapOutlineAllowed();
    const showOutline = outlineEnabled;
    const outlineW = OUTLINE_THICKNESS_FIXED;

    ctx.clearRect(0, 0, mapW, mapH);

    const insetPad = outlineEnabled ? Math.round(Math.min(mapW, mapH) * (state.map.mapCircleInsetPct || 0.10)) : 0;
    const z = clamp(state.map.mapZoom || 1, 1.0, 1.6);

    if (st.shape === "circle"){
      const cx = mapW/2, cy = mapH/2;
      const rOuter = Math.min(mapW,mapH)/2;
      const rInner = rOuter - insetPad;

      if (showOutline){
        ctx.save();
        ctx.strokeStyle = tokens.outline;
        ctx.lineWidth = outlineW;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, rInner, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rInner, 0, Math.PI*2);
      ctx.clip();

      ctx.fillStyle = tokens.mapBg;
      ctx.fillRect(0,0,mapW,mapH);

      if (z !== 1){
        ctx.translate(cx, cy);
        ctx.scale(z, z);
        ctx.translate(-cx, -cy);
      }

      if (state.map.showGrid && isGridAllowedForCurrentStyle()){
        drawGlobeGrid(ctx, mapW, mapH, tokens.gridLine);
      }

      drawStars(ctx, mapW, mapH, rand, tokens.stars);

      if (state.map.showConstellations){
        drawConstellations(ctx, mapW, mapH, rand, tokens.constLine, tokens.constNode, conLineW, nodeR);
      }

      ctx.restore();
      return;
    }

    if (st.shape === "heart"){
      const cx = mapW/2;
      const cy = mapH/2 - Math.round(mapH * 0.06);

      const baseSize = Math.min(mapW, mapH) * (0.5227 * 0.95);
      const size = clamp(baseSize - insetPad * 0.95, baseSize * 0.70, baseSize);

      ctx.save();
      heartPath(ctx, cx, cy, size);
      ctx.clip();

      ctx.fillStyle = tokens.mapBg;
      ctx.fillRect(0,0,mapW,mapH);

      if (z !== 1){
        ctx.translate(cx, cy);
        ctx.scale(z, z);
        ctx.translate(-cx, -cy);
      }

      drawStars(ctx, mapW, mapH, rand, tokens.stars);

      if (state.map.showConstellations){
        drawConstellations(ctx, mapW, mapH, rand, tokens.constLine, tokens.constNode, conLineW, nodeR);
      }

      ctx.restore();

      if (showOutline){
        ctx.save();
        ctx.strokeStyle = tokens.outline;
        ctx.lineWidth = outlineW;
        ctx.globalAlpha = 1;
        heartPath(ctx, cx, cy, size);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    if (st.shape === "rect"){
      drawRectMap(ctx, mapW, mapH, tokens, rand, showOutline, outlineW, conLineW, nodeR);
      return;
    }
  }

  function renderPosterFont(){
    $poster.style.fontFamily = state.text.fontFamily || "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  }

  function renderPosterText(){
    $pTitle.style.display = state.visible.title ? "block" : "none";
    $pSubtitle.style.display = state.visible.subtitle ? "block" : "none";
    $pPlace.style.display = state.visible.place ? "block" : "none";
    $pCoords.style.display = state.visible.coords ? "block" : "none";
    $pDatetime.style.display = state.visible.datetime ? "block" : "none";

    $pTitle.textContent = state.text.title || "";
    $pSubtitle.textContent = state.text.subtitle || "";
    $pPlace.textContent = state.text.place || "";
    $pCoords.textContent = state.text.coords || "";
    $pDatetime.textContent = getDateTimeString();
  }

  function renderPosterAndMap(){
    const tokens = computeRenderTokens();

    applyPosterLayoutByStyle();
    applyPosterFrameAndMargin(tokens);
    applyPosterPaddingLayout();
    setMapSizeFromPosterPad();

    drawMap();
  }

  function toggleSwitch(checked, onChange){
    const t = document.createElement("div");
    t.className = "toggle" + (checked ? " on" : "");
    t.role = "switch";
    t.tabIndex = 0;
    t.setAttribute("aria-checked", String(!!checked));

    function set(val){
      checked = !!val;
      t.className = "toggle" + (checked ? " on" : "");
      t.setAttribute("aria-checked", String(checked));
      onChange(checked);
    }

    t.onclick = () => set(!checked);
    t.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        set(!checked);
      }
    };
    return t;
  }

  function renderTabs(){
    $tabs.innerHTML = "";
    STEPS.forEach((s, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sheetTab" + (idx === state.step ? " active" : "");
      b.textContent = `${idx + 1}) ${s.label}`;
      b.onclick = () => { state.step = idx; renderAll(); };
      $tabs.appendChild(b);
    });
  }

  function drawStyleTextSkeleton(ctx, w, h, styleId, color){
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.28;

    const padX = 22;
    const bottomPad = 20;

    if (styleId === "classic" || styleId === "poster"){
      const titleW = Math.round(w * 0.58);
      const subW   = Math.round(w * 0.38);
      const x1 = Math.round((w - titleW)/2);
      const x2 = Math.round((w - subW)/2);

      const yTitle = h - bottomPad - 52;
      const ySub   = h - bottomPad - 38;
      const yMeta1 = h - bottomPad - 20;
      const yMeta2 = h - bottomPad - 10;
      const yMeta3 = h - bottomPad;

      ctx.fillRect(x1, yTitle, titleW, 6);
      ctx.globalAlpha = 0.20;
      ctx.fillRect(x2, ySub, subW, 5);

      ctx.globalAlpha = 0.18;
      const metaW = Math.round(w * 0.46);
      const xm = Math.round((w - metaW)/2);
      ctx.fillRect(xm, yMeta1, metaW, 4);
      ctx.fillRect(xm, yMeta2, metaW * 0.88, 4);
      ctx.fillRect(xm, yMeta3, metaW * 0.76, 4);
    } else {
      const x = padX;
      const titleW = Math.round(w * 0.55);
      const subW   = Math.round(w * 0.36);

      const yTitle = h - bottomPad - 52;
      const ySub   = h - bottomPad - 38;
      const yMeta1 = h - bottomPad - 20;
      const yMeta2 = h - bottomPad - 10;
      const yMeta3 = h - bottomPad;

      ctx.fillRect(x, yTitle, titleW, 6);
      ctx.globalAlpha = 0.20;
      ctx.fillRect(x, ySub, subW, 5);

      ctx.globalAlpha = 0.18;
      ctx.fillRect(x, yMeta1, Math.round(w * 0.46), 4);
      ctx.fillRect(x, yMeta2, Math.round(w * 0.40), 4);
      ctx.fillRect(x, yMeta3, Math.round(w * 0.32), 4);
    }

    ctx.restore();
  }

  function makeFourPointStarSvg(colorHexOrCss){
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 14 14");
    svg.style.opacity = "0.95";

    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", "M7 0 L8.8 5.2 L14 7 L8.8 8.8 L7 14 L5.2 8.8 L0 7 L5.2 5.2 Z");
    p.setAttribute("fill", colorHexOrCss || "rgba(255,255,255,0.92)");
    svg.appendChild(p);
    return svg;
  }

  function renderColorSwatches({ title, items, activeId, onPick, dotColorFn, starColorFn }){
    const wrap = document.createElement("div");
    wrap.className = "formRow";
    wrap.innerHTML = `<div class="label">${title}</div>`;

    const grid = document.createElement("div");
    grid.className = "swatchGrid";

    items.forEach(it => {
      const tile = document.createElement("div");
      tile.className = "swatchTile" + (activeId === it.id ? " active" : "");

      const dot = document.createElement("div");
      dot.className = "swatchDot";
      dot.style.background = dotColorFn(it);

      dot.appendChild(makeFourPointStarSvg(starColorFn(it)));

      const name = document.createElement("div");
      name.className = "swatchName";
      name.textContent = it.name;

      tile.appendChild(dot);
      tile.appendChild(name);

      tile.onclick = () => onPick(it.id);

      grid.appendChild(tile);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  function renderSectionDesign(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "Diseño";

    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Selecciona un estilo de poster, los colores y las opcines de personalizacion para tu mapa o genera un aleatorio. ¡Cada mapa es unico y diferente!";

    // 1) Aleatorio
    const randomRow = document.createElement("div");
    randomRow.className = "formRow";
    const randomBtn = document.createElement("button");
    randomBtn.type = "button";
    randomBtn.className = "btn primary";
    randomBtn.textContent = "Poster Aleatorio";
    randomBtn.onclick = () => {
      const r = Math.random;
      const pick = (arr) => arr[Math.floor(r() * arr.length)];
      const pickBool = () => r() > 0.5;
      const pickRange = (min, max) => min + r() * (max - min);

      state.map.styleId = pick(MAP_STYLES).id;
      state.map.colorTheme = pick(COLOR_THEMES).id;

      // neon => fondo match forzado
      if (isNeonThemeId(state.map.colorTheme)) state.map.backgroundMode = "match";

      const allowG = isGridAllowedForCurrentStyle();
      state.map.showGrid = allowG ? pickBool() : false;

      state.map.showConstellations = pickBool();
      state.map.constellationSize = Math.round(pickRange(1, 4) * 2) / 2;
      state.map.mapZoom = Math.round(pickRange(1.0, 1.6) * 20) / 20;

      if (!isPosterDecorAllowed()){
        state.map.posterFrameEnabled = false;
        state.map.posterMarginEnabled = false;
      } else {
        const marco = pickBool();
        state.map.posterFrameEnabled = marco;
        state.map.posterFramePct = marco ? POSTER_FRAME_PCT_MAX : state.map.posterFramePct;
        updatePosterFrameInsetPx();

        state.map.posterMarginEnabled = !marco ? true : false;
        syncThickness();
      }

      // contorno por estilo
      if (state.map.styleId === "poster") state.map.mapCircleMarginEnabled = false;
      else if (state.map.styleId === "moderno") state.map.mapCircleMarginEnabled = false;
      else state.map.mapCircleMarginEnabled = true;

      state.map.seed = (Math.random() * 1e9) | 0;

      renderPosterAndMap();
      renderAll();
    };
    randomRow.appendChild(randomBtn);

    const gap1 = document.createElement("div"); gap1.className = "groupGap";

    // 2) Estilos
    const styleRow = document.createElement("div");
    styleRow.className = "formRow";
    styleRow.innerHTML = `<div class="label">Estilos</div>`;

    const grid = document.createElement("div");
    grid.className = "styleGrid";

    function previewOutlineByStyle(styleId){
      return (styleId === "classic" || styleId === "romantico");
    }

    MAP_STYLES.forEach(st => {
      const tile = document.createElement("div");
      tile.className = "styleTile" + (state.map.styleId === st.id ? " active" : "");

      const poster = document.createElement("div");
      poster.className = "stylePoster";

      const c = document.createElement("canvas");
      c.width = 180; c.height = 240;
      const ctx = c.getContext("2d");

      const tokens = computeRenderTokens();

      ctx.clearRect(0,0,180,240);
      ctx.fillStyle = tokens.posterBg;
      ctx.fillRect(0,0,180,240);

      ctx.save();
      const mx = 22, my = 18, mw = 136, mh = (st.shape === "rect") ? 140 : 136;

      if (st.shape === "circle"){
        ctx.beginPath();
        ctx.arc(mx+mw/2, my+mw/2, mw/2, 0, Math.PI*2);
        ctx.clip();
      } else if (st.shape === "heart"){
        const cx = mx + mw/2;
        const cy = my + mw/2 - 6;
        const size = mw * 0.50;
        heartPath(ctx, cx, cy, size);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(mx, my, mw, mh);
        ctx.clip();
      }

      ctx.fillStyle = tokens.mapBg;
      ctx.fillRect(mx,my,mw,mh);

      const r = mulberry32(
        st.id === "romantico" ? 202603 :
        st.id === "poster" ? 202604 :
        st.id === "moderno" ? 202605 : 202602
      );
      for (let i=0;i<160;i++){
        const x = mx + r()*mw;
        const y = my + r()*mh;
        ctx.globalAlpha = 0.22 + r()*0.55;
        ctx.fillStyle = tokens.stars;
        ctx.beginPath();
        ctx.arc(x,y,r()*0.9,0,Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ✅ contorno preview más delgado
      if (previewOutlineByStyle(st.id)){
        ctx.save();
        ctx.strokeStyle = tokens.outline;
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.5;
        if (st.shape === "circle"){
          ctx.beginPath();
          ctx.arc(mx+mw/2, my+mw/2, (mw/2) - 4, 0, Math.PI*2);
          ctx.stroke();
        } else if (st.shape === "heart"){
          const cx = mx + mw/2;
          const cy = my + mw/2 - 6;
          const size = mw * 0.50 - 2;
          heartPath(ctx, cx, cy, size);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();

      drawStyleTextSkeleton(ctx, 180, 240, st.id, tokens.posterInk);

      poster.appendChild(c);

      const name = document.createElement("div");
      name.className = "styleNameLabel";
      name.textContent = st.name;

      tile.appendChild(poster);
      tile.appendChild(name);

      tile.onclick = () => {
        state.map.styleId = st.id;

        // decor
        if (!isPosterDecorAllowed()){
          state.map.posterFrameEnabled = false;
          state.map.posterMarginEnabled = false;
        } else {
          if (st.id === "classic"){
            state.map.posterFrameEnabled = false;
            state.map.posterMarginEnabled = true;
            syncThickness();
          } else {
            state.map.posterMarginEnabled = false;
          }
        }

        // contorno reglas
        if (st.id === "poster") state.map.mapCircleMarginEnabled = false;
        else if (st.id === "moderno") state.map.mapCircleMarginEnabled = false;
        else if (st.id === "classic") state.map.mapCircleMarginEnabled = true;
        // romantico: se mantiene el valor actual (toggle)

        if (!isGridAllowedForCurrentStyle()) state.map.showGrid = false;

        renderPosterAndMap();
        renderAll();
      };

      grid.appendChild(tile);
    });

    styleRow.appendChild(grid);

    const gap2 = document.createElement("div"); gap2.className = "groupGap";

    // 3) Color del mapa (swatches)
    const mapColorRow = renderColorSwatches({
      title: "Color del Mapa estelar",
      items: COLOR_THEMES,
      activeId: state.map.colorTheme,
      onPick: (id) => {
        state.map.colorTheme = id;

        // neon => fondo match
        if (isNeonThemeId(id)) state.map.backgroundMode = "match";

        renderPosterAndMap();
        renderAll();
      },
      dotColorFn: (it) => {
        if (isNeonThemeId(it.id)) return "#000000";
        return colorsFor(it.id).bg;
      },
      starColorFn: (it) => {
        if (isNeonThemeId(it.id)) return colorsFor(it.id).star;
        return "rgba(255,255,255,0.92)";
      }
    });

    const gap3 = document.createElement("div"); gap3.className = "groupGap";

    // 4) Color de fondo (swatches) — neon sin blanco
    const bgItems = (() => {
      const mapThemeName = (COLOR_THEMES.find(x => x.id === state.map.colorTheme)?.name) || "Mapa";
      const base = [{ id: "match", name: mapThemeName }];
      const neon = isNeonThemeId(state.map.colorTheme);
      if (!neon) base.push({ id: "white", name: "Blanco" });
      return base;
    })();

    const bgRow = renderColorSwatches({
      title: "Color de fondo",
      items: bgItems,
      activeId: state.map.backgroundMode,
      onPick: (id) => {
        if (isNeonThemeId(state.map.colorTheme) && id === "white") return;
        state.map.backgroundMode = id;
        renderPosterAndMap();
        renderAll();
      },
      dotColorFn: (it) => {
        if (it.id === "white") return "#FFFFFF";
        if (isNeonThemeId(state.map.colorTheme)) return "#000000";
        return colorsFor(state.map.colorTheme).bg;
      },
      starColorFn: (it) => {
        if (it.id === "white") return "#000000"; // ✅ estrella negra
        if (isNeonThemeId(state.map.colorTheme)) return colorsFor(state.map.colorTheme).star;
        return "rgba(255,255,255,0.92)";
      }
    });

    const gap4 = document.createElement("div"); gap4.className = "groupGap";

    // 5) Marco del póster
    const frameRow = document.createElement("div");
    frameRow.className = "rowToggle";
    frameRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Marco del póster" }));
    frameRow.appendChild(toggleSwitch(!!state.map.posterFrameEnabled, (val) => {
      state.map.posterFrameEnabled = val;
      if (val) state.map.posterMarginEnabled = false;
      renderPosterAndMap();
      renderAll();
    }));

    const gap4b = document.createElement("div"); gap4b.className = "groupGap";

    // 6) Margen del póster (sin slider)
    const marginRow = document.createElement("div");
    marginRow.className = "rowToggle";
    marginRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Margen del póster" }));
    marginRow.appendChild(toggleSwitch(!!state.map.posterMarginEnabled, (val) => {
      state.map.posterMarginEnabled = val;
      renderPosterAndMap();
      renderAll();
    }));

    const gap5 = document.createElement("div"); gap5.className = "groupGap";

    // 7) Contorno del mapa (solo romantico toggle)
    const outlineRow = document.createElement("div");
    outlineRow.className = "rowToggle";
    outlineRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Contorno del mapa" }));

    const outlineToggle = toggleSwitch(!!state.map.mapCircleMarginEnabled, (val) => {
      if (!outlineToggleAllowedByStyle()) return; // solo romantico
      state.map.mapCircleMarginEnabled = val;
      drawMap();
      renderAll();
    });

    // disable si no aplica
    const disabled = (!mapOutlineAllowed() || !outlineToggleAllowedByStyle());
    if (disabled){
      outlineToggle.style.opacity = "0.55";
      outlineToggle.style.pointerEvents = "none";
    }
    outlineRow.appendChild(outlineToggle);

    const gap6 = document.createElement("div"); gap6.className = "groupGap";

    // 8) Constelaciones
    const conRow = document.createElement("div");
    conRow.className = "rowToggle";
    conRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Constelaciones" }));
    conRow.appendChild(toggleSwitch(!!state.map.showConstellations, (val) => {
      state.map.showConstellations = val;
      drawMap();
      renderAll();
    }));

    const gap7 = document.createElement("div"); gap7.className = "groupGap";

    // 9) Retícula
    const gridRow = document.createElement("div");
    gridRow.className = "rowToggle";
    gridRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Retícula" }));

    const allowGrid = isGridAllowedForCurrentStyle();
    if (!allowGrid) state.map.showGrid = false;

    const gridToggle = toggleSwitch(!!state.map.showGrid, (val) => {
      if (!allowGrid) return;
      state.map.showGrid = val;
      drawMap();
      renderAll();
    });
    if (!allowGrid){
      gridToggle.style.opacity = "0.55";
      gridToggle.style.pointerEvents = "none";
    }
    gridRow.appendChild(gridToggle);

    const gap8 = document.createElement("div"); gap8.className = "groupGap";

    // 10) Nuevo cielo
    const seedRow = document.createElement("div");
    seedRow.className = "formRow";
    seedRow.innerHTML = `<div class="label">Nuevo cielo</div>`;
    const seedBtn = document.createElement("button");
    seedBtn.type = "button";
    seedBtn.className = "btn ghost";
    seedBtn.textContent = "Generar nuevo cielo";
    seedBtn.onclick = () => { state.map.seed = (Math.random() * 1e9) | 0; drawMap(); };
    seedRow.appendChild(seedBtn);

    const gap9 = document.createElement("div"); gap9.className = "groupGap";

    // 11) Zoom de Estrellas
    const mapZoomRow = document.createElement("div");
    mapZoomRow.className = "formRow";
    mapZoomRow.innerHTML = `<div class="label">Zoom de Estrellas</div>`;
    const mapZoomRange = document.createElement("input");
    mapZoomRange.type = "range";
    mapZoomRange.min = "1.00";
    mapZoomRange.max = "1.60";
    mapZoomRange.step = "0.05";
    mapZoomRange.value = String(state.map.mapZoom);
    mapZoomRange.oninput = () => {
      state.map.mapZoom = Number(mapZoomRange.value);
      drawMap();
    };
    mapZoomRow.appendChild(mapZoomRange);

    $section.appendChild(t);
    $section.appendChild(s);

    $section.appendChild(randomRow);
    $section.appendChild(gap1);

    $section.appendChild(styleRow);
    $section.appendChild(gap2);

    $section.appendChild(mapColorRow);
    $section.appendChild(gap3);

    $section.appendChild(bgRow);
    $section.appendChild(gap4);

    if (isPosterDecorAllowed()){
      $section.appendChild(frameRow);
      $section.appendChild(gap4b);
      $section.appendChild(marginRow);
      $section.appendChild(gap5);
    } else {
      state.map.posterFrameEnabled = false;
      state.map.posterMarginEnabled = false;
      $section.appendChild(gap5);
    }

    if (mapOutlineAllowed()){
      $section.appendChild(outlineRow);
      $section.appendChild(gap6);
    }

    $section.appendChild(conRow);
    $section.appendChild(gap7);

    $section.appendChild(gridRow);
    $section.appendChild(gap8);

    $section.appendChild(seedRow);
    $section.appendChild(gap9);

    $section.appendChild(mapZoomRow);

    const btns = document.createElement("div");
    btns.className = "btnRow";
    const left = document.createElement("div");
    const right = document.createElement("div");

    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn primary";
    next.textContent = "Siguiente →";
    next.onclick = () => { state.step = 1; renderAll(); };

    right.appendChild(next);
    btns.appendChild(left);
    btns.appendChild(right);
    $section.appendChild(btns);
  }

  function renderSectionContent(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "Contenido";
    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Activa cada campo y escribe su contenido.";

    const fontRow = document.createElement("div");
    fontRow.className = "formRow";
    fontRow.innerHTML = `<div class="label">Fuente</div>`;
    const fontSel = document.createElement("select");
    fontSel.className = "select";
    FONT_PRESETS.forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.key;
      opt.textContent = f.name;
      fontSel.appendChild(opt);
    });
    fontSel.value = state.text.fontKey;
    fontSel.onchange = () => {
      const key = fontSel.value;
      state.text.fontKey = key;
      const found = FONT_PRESETS.find(f => f.key === key) || FONT_PRESETS[0];
      state.text.fontFamily = found.css;
      renderPosterFont();
    };
    fontRow.appendChild(fontSel);

    // ✅ Inputs regresados al estilo original: .input
    function fieldCard(key, label, getter, setter, placeholder=""){
      const card = document.createElement("div");
      card.className = "formRow"; // ✅ simple como antes

      const row = document.createElement("div");
      row.className = "rowToggle";
      row.appendChild(Object.assign(document.createElement("span"), { textContent: label }));
      row.appendChild(toggleSwitch(!!state.visible[key], (val) => {
        state.visible[key] = val;
        renderPosterText();
        renderAll();
      }));

      card.appendChild(row);

      if (state.visible[key]) {
        const inp = document.createElement("input");
        inp.className = "input";
        inp.value = getter() ?? "";
        inp.placeholder = placeholder;
        inp.oninput = () => { setter(inp.value); renderPosterText(); };
        const gap = document.createElement("div"); gap.style.height = "8px";
        card.appendChild(gap);
        card.appendChild(inp);
      }

      return card;
    }

    function dateTimeCard(){
      const card = document.createElement("div");
      card.className = "formRow";

      const row = document.createElement("div");
      row.className = "rowToggle";
      row.appendChild(Object.assign(document.createElement("span"), { textContent: "Fecha / hora" }));
      row.appendChild(toggleSwitch(!!state.visible.datetime, (val) => {
        state.visible.datetime = val;
        renderPosterText();
        renderAll();
      }));

      card.appendChild(row);

      if (state.visible.datetime){
        const gap = document.createElement("div"); gap.style.height = "8px";
        card.appendChild(gap);

        const dateInp = document.createElement("input");
        dateInp.className = "input";
        dateInp.type = "date";
        dateInp.value = state.text.date || "";
        dateInp.oninput = () => {
          state.text.date = dateInp.value;
          updateSeedFromDateTime();
          renderPosterText();
          drawMap();
        };
        card.appendChild(dateInp);

        const spacer = document.createElement("div");
        spacer.style.height = "10px";
        card.appendChild(spacer);

        const timeInp = document.createElement("input");
        timeInp.className = "input";
        timeInp.type = "time";
        timeInp.value = state.text.time || "";
        timeInp.oninput = () => {
          state.text.time = timeInp.value;
          updateSeedFromDateTime();
          renderPosterText();
          drawMap();
        };
        card.appendChild(timeInp);
      }

      return card;
    }

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(fontRow);

    $section.appendChild(fieldCard("title", "Título", () => state.text.title, (v) => { state.text.title = v; }));
    $section.appendChild(document.createElement("div")).className = "groupGap";

    $section.appendChild(fieldCard("subtitle", "Mensaje", () => state.text.subtitle, (v) => { state.text.subtitle = v; }));
    $section.appendChild(document.createElement("div")).className = "groupGap";

    $section.appendChild(fieldCard("place", "Lugar", () => state.text.place, (v) => { state.text.place = v; }));
    $section.appendChild(document.createElement("div")).className = "groupGap";

    $section.appendChild(fieldCard("coords", "Coordenadas", () => state.text.coords, (v) => {
      state.text.coords = v;
      updateSeedFromDateTime();
      drawMap();
    }));
    $section.appendChild(document.createElement("div")).className = "groupGap";

    $section.appendChild(dateTimeCard());

    const btns = document.createElement("div");
    btns.className = "btnRow";
    const left = document.createElement("div");
    const right = document.createElement("div");

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn ghost";
    prev.textContent = "← Anterior";
    prev.onclick = () => { state.step = 0; renderAll(); };

    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn primary";
    next.textContent = "Siguiente →";
    next.onclick = () => { state.step = 2; renderAll(); };

    left.appendChild(prev);
    right.appendChild(next);
    btns.appendChild(left);
    btns.appendChild(right);
    $section.appendChild(btns);
  }

  function cmToPx(cm, dpi){
    const inches = cm / 2.54;
    return Math.round(inches * dpi);
  }

  function downloadDataURL(dataURL, filename){
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportPoster(format, sizeKey){
    const sz = EXPORT_SIZES.find(x => x.key === sizeKey) || EXPORT_SIZES[0];
    const dpi = state.export.dpi || 300;

    let W, H;
    if (sz.type === "px"){
      W = sz.w; H = sz.h;
    } else {
      W = cmToPx(sz.w, dpi);
      H = cmToPx(sz.h, dpi);
    }

    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;

    const ctx = out.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const tokens = computeRenderTokens();
    updatePosterFrameInsetPx();
    syncThickness();

    const st = getStyleDef();
    const decorAllowed = (st.id !== "poster");
    const frameOn = decorAllowed && !!state.map.posterFrameEnabled;
    const marginOn = decorAllowed && !!state.map.posterMarginEnabled && !frameOn;

    const edgeFrameX = Math.round(POSTER_FRAME_EDGE_GAP_PX * (W / POSTER_W));
    const edgeFrameY = Math.round(POSTER_FRAME_EDGE_GAP_PX * (H / POSTER_H));
    const edgeMarginX = Math.round(POSTER_MARGIN_EDGE_GAP_PX * (W / POSTER_W));
    const edgeMarginY = Math.round(POSTER_MARGIN_EDGE_GAP_PX * (H / POSTER_H));

    const framePx = frameOn ? clamp(state.map.posterFrameInsetPx, 0, 160) : 0;
    const frameX = Math.round(framePx * (W / POSTER_W));
    const frameY = Math.round(framePx * (H / POSTER_H));

    ctx.fillStyle = tokens.posterBg;
    ctx.fillRect(0, 0, W, H);

    if (frameOn){
      ctx.fillStyle = tokens.posterInk;
      ctx.fillRect(edgeFrameX, edgeFrameY, W - edgeFrameX*2, H - edgeFrameY*2);
    }

    const innerX = edgeFrameX + frameX;
    const innerY = edgeFrameY + frameY;

    ctx.fillStyle = tokens.posterBg;
    ctx.fillRect(innerX, innerY, W - innerX*2, H - innerY*2);

    if (marginOn){
      const thick = POSTER_MARGIN_THICKNESS_FIXED;
      const thickScaled = Math.max(1, Math.round(thick * (W / POSTER_W)));
      ctx.save();
      ctx.strokeStyle = rgbaFromHex(tokens.posterInk, 1);
      ctx.lineWidth = thickScaled;
      ctx.globalAlpha = 1;
      const half = thickScaled / 2;
      ctx.strokeRect(
        edgeMarginX + half,
        edgeMarginY + half,
        W - (edgeMarginX * 2) - thickScaled,
        H - (edgeMarginY * 2) - thickScaled
      );
      ctx.restore();
    }

    const sx = W / POSTER_W;
    const sy = H / POSTER_H;

    const mapW = Math.round(780 * sx);
    const mapH = mapW;

    const mapX = Math.round((W - mapW) / 2);
    const mapY = Math.round(innerY + (70 * sy));
    ctx.drawImage($canvas, mapX, mapY, mapW, mapH);

    const fontFamily = state.text.fontFamily;
    ctx.fillStyle = tokens.posterInk;

    function drawText(text, x, y, sizePx, weight=800, align="left", alpha=1){
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.font = `${weight} ${Math.round(sizePx)}px ${fontFamily}`;
      ctx.fillText(text, Math.round(x), Math.round(y));
      ctx.restore();
    }

    const show = state.visible;
    const centerX = W / 2;

    const yTitle    = Math.round(1085 * sy);
    const ySubtitle = Math.round(1122 * sy);
    const yPlace    = Math.round(1162 * sy);
    const yCoords   = Math.round(1180 * sy);
    const yDT       = Math.round(1196 * sy);

    if (show.title)    drawText(state.text.title, centerX, yTitle, 54 * sy, 900, "center", 1);
    if (show.subtitle) drawText(state.text.subtitle, centerX, ySubtitle, 18 * sy, 650, "center", 0.85);
    if (show.place)    drawText(state.text.place, centerX, yPlace, 14 * sy, 650, "center", 0.82);
    if (show.coords)   drawText(state.text.coords, centerX, yCoords, 14 * sy, 650, "center", 0.82);
    if (show.datetime) drawText(getDateTimeString(), centerX, yDT, 14 * sy, 650, "center", 0.82);

    if (format === "png" || format === "jpg"){
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const quality = format === "jpg" ? 0.95 : undefined;
      const url = out.toDataURL(mime, quality);
      downloadDataURL(url, `poster_${sizeKey}.${format}`);
      return;
    }

    const url = out.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) {
      alert("Bloqueaste popups. Permite ventanas emergentes para exportar PDF.");
      return;
    }
    w.document.write(`
      <html><head><title>Poster PDF</title>
      <style>html,body{margin:0;padding:0;} img{width:100%;height:auto;display:block;}</style>
      </head><body>
        <img src="${url}" />
        <script>
          window.onload = () => { window.focus(); window.print(); };
        </script>
      </body></html>
    `);
    w.document.close();
  }

  function renderSectionExport(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "Exportar";

    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Selecciona formato y exporta tu póster.";

    const sizeRow = document.createElement("div");
    sizeRow.className = "formRow";
    sizeRow.innerHTML = `<div class="label">Medidas</div>`;

    const sizeSel = document.createElement("select");
    sizeSel.className = "select";
    EXPORT_SIZES.forEach(sz => {
      const opt = document.createElement("option");
      opt.value = sz.key;
      opt.textContent = `${sz.title} — ${sz.sub}`;
      sizeSel.appendChild(opt);
    });
    sizeSel.value = state.export.sizeKey;
    sizeSel.onchange = () => { state.export.sizeKey = sizeSel.value; };
    sizeRow.appendChild(sizeSel);

    const formatRow = document.createElement("div");
    formatRow.className = "formRow";
    formatRow.innerHTML = `<div class="label">Formato</div>`;

    const formatSel = document.createElement("select");
    formatSel.className = "select";
    [
      ["png","PNG · Mejor calidad"],
      ["jpg","JPG · Archivo más ligero"],
      ["pdf","PDF · Perfecto para imprimir"]
    ].forEach(([v,n]) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = n;
      formatSel.appendChild(opt);
    });
    formatSel.value = state.export.format;
    formatSel.onchange = () => { state.export.format = formatSel.value; };
    formatRow.appendChild(formatSel);

    const btns = document.createElement("div");
    btns.className = "btnRow";
    const left = document.createElement("div");
    const right = document.createElement("div");

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn ghost";
    prev.textContent = "← Anterior";
    prev.onclick = () => { state.step = 1; renderAll(); };

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "btn primary";
    exportBtn.textContent = "Exportar";
    exportBtn.onclick = () => exportPoster(state.export.format, state.export.sizeKey);

    left.appendChild(prev);
    right.appendChild(exportBtn);
    btns.appendChild(left);
    btns.appendChild(right);

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(sizeRow);
    $section.appendChild(formatRow);
    $section.appendChild(btns);
  }

  function renderSection(){
    if (state.step === 0) return renderSectionDesign();
    if (state.step === 1) return renderSectionContent();
    return renderSectionExport();
  }

  function renderAll(){
    // enforce neon background option
    if (isNeonThemeId(state.map.colorTheme)) state.map.backgroundMode = "match";

    renderTabs();
    renderSection();
    renderPosterFont();
    renderPosterText();
    renderPosterAndMap();
  }

  // Init
  updateSeedFromDateTime();
  ensurePosterLayers();
  applyPosterLayoutByStyle();
  applyPosterPaddingLayout();
  setMapSizeFromPosterPad();

  // defaults por estilo
  if (state.map.styleId === "moderno") state.map.mapCircleMarginEnabled = false;
  if (state.map.styleId === "poster") state.map.mapCircleMarginEnabled = false;
  if (state.map.styleId === "classic") state.map.mapCircleMarginEnabled = true;

  renderAll();
  window.addEventListener("resize", () => drawMap());
})();
