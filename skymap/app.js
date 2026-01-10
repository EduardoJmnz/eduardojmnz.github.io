(() => {
  const POSTER_W = 900;
  const POSTER_H = 1200;

  const POSTER_FRAME_EDGE_GAP_PX = 0;
  const POSTER_MARGIN_EDGE_GAP_PX = 50;

  const POSTER_FRAME_PCT_MAX = 0.06;
  const POSTER_FRAME_PCT_DEFAULT = POSTER_FRAME_PCT_MAX;

  const POSTER_LINE_THICK_MAX = 12;

  const MAP_OUTLINE_PX = 8;
  const DEFAULT_POSTER_MARGIN_THICKNESS = 8;

  const state = {
    step: 0,

    visible: { title: true, subtitle: true, place: true, coords: true, datetime: true },

    text: {
      title: "NIGHT SKY",
      subtitle: "A moment to remember",
      place: "Mexico City, MX",
      coords: "19.4326, -99.1332",
      date: "25.12.1995",
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

      backgroundMode: "match",

      posterFrameEnabled: false,
      posterFramePct: POSTER_FRAME_PCT_DEFAULT,
      posterFrameInsetPx: Math.round(POSTER_W * POSTER_FRAME_PCT_DEFAULT),

      posterMarginEnabled: true,
      posterMarginThickness: DEFAULT_POSTER_MARGIN_THICKNESS,
      posterMarginThicknessMax: POSTER_LINE_THICK_MAX,

      // ✅ por default CLÁSICO sí trae contorno
      mapCircleMarginEnabled: true,
      mapCircleInsetPct: 0.10,
      mapCircleMarginThickness: DEFAULT_POSTER_MARGIN_THICKNESS,

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

  function isValidDDMMYYYY(v){
    const s = String(v || "").trim();
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return false;
    const [dd, mm, yyyy] = s.split(".").map(n => parseInt(n, 10));
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return false;
    if (yyyy < 1000 || yyyy > 9999) return false;
    if (mm < 1 || mm > 12) return false;
    if (dd < 1 || dd > 31) return false;
    const maxByMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
    let max = maxByMonth[mm-1] || 31;
    const leap = (yyyy % 4 === 0 && (yyyy % 100 !== 0 || yyyy % 400 === 0));
    if (mm === 2 && leap) max = 29;
    return dd <= max;
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
    return THEMES[theme] || THEMES.mono;
  }

  function isNeonTheme(){
    const id = String(state.map.colorTheme || "");
    return id.startsWith("neon");
  }

  function getThemeName(){
    const found = COLOR_THEMES.find(t => t.id === state.map.colorTheme);
    return found ? found.name : "Color";
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
    if (isNeonTheme()) return false;
    return state.map.backgroundMode === "white";
  }

  function mapOutlineAllowed(){
    return !isWhiteBackgroundMode() && !isPosterStyle();
  }

  // ✅ Token colors (retícula SIN opacidad)
  function computeRenderTokens(){
    const th = colorsFor(state.map.colorTheme);

    if (isNeonTheme()){
      const neon = th.star;
      const bg = "#000000";
      return {
        posterBg: bg,
        posterInk: neon,
        mapBg: bg,
        stars: neon,

        gridLine: rgbaFromHex(neon, 1.0),
        constLine: rgbaFromHex(neon, 1.0),
        constNode: rgbaFromHex(neon, 1.0),
        outline: rgbaFromHex(neon, 1.0),

        theme: th,
      };
    }

    if (isWhiteBackgroundMode()){
      return {
        posterBg: "#FFFFFF",
        posterInk: th.bg,

        mapBg: th.bg,
        stars: th.star,

        // ✅ sin opacidad
        gridLine: "rgba(255,255,255,1)",
        constLine: "rgba(255,255,255,1)",
        constNode: "#FFFFFF",
        outline: "rgba(255,255,255,1)",

        theme: th,
      };
    }

    return {
      posterBg: th.bg,
      posterInk: "#FFFFFF",

      mapBg: th.bg,
      stars: "#FFFFFF",

      // ✅ sin opacidad
      gridLine: "rgba(255,255,255,1)",
      constLine: "rgba(255,255,255,1)",
      constNode: "#FFFFFF",
      outline: "rgba(255,255,255,1)",

      theme: th,
    };
  }

  function syncOutlineThickness(){
    state.map.mapCircleMarginThickness = state.map.posterMarginThickness;
  }

  // --------------------------
  // CAPAS: marco(área) + papel + margen(línea)
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
    syncOutlineThickness();

    if (!mapOutlineAllowed()) state.map.mapCircleMarginEnabled = false;

    const frameEdge = POSTER_FRAME_EDGE_GAP_PX;
    const marginEdge = POSTER_MARGIN_EDGE_GAP_PX;

    const decorAllowed = isPosterDecorAllowed();
    const frameOn = decorAllowed && !!state.map.posterFrameEnabled;
    const marginOn = decorAllowed && !!state.map.posterMarginEnabled && !frameOn;

    const framePx = frameOn ? clamp(state.map.posterFrameInsetPx, 0, 160) : 0;

    $poster.style.background = tokens.posterBg;
    $poster.style.color = tokens.posterInk;

    if (frameOn){
      $posterFrameArea.style.opacity = "1";
      $posterFrameArea.style.background = tokens.posterInk;
      $posterFrameArea.style.inset = `${frameEdge}px`;
    } else {
      $posterFrameArea.style.opacity = "0";
      $posterFrameArea.style.background = "transparent";
      $posterFrameArea.style.inset = `${frameEdge}px`;
    }

    const innerInset = frameEdge + framePx;
    $posterPaper.style.background = tokens.posterBg;
    $posterPaper.style.inset = `${innerInset}px`;

    // ✅ margen fijo (usuario no lo edita)
    const thickness = clamp(
      DEFAULT_POSTER_MARGIN_THICKNESS,
      1,
      state.map.posterMarginThicknessMax || POSTER_LINE_THICK_MAX
    );
    state.map.posterMarginThickness = thickness;

    $posterMarginLine.style.inset = `${marginEdge}px`;
    $posterMarginLine.style.borderWidth = marginOn ? `${thickness}px` : "0px";
    $posterMarginLine.style.borderStyle = "solid";
    $posterMarginLine.style.borderColor = marginOn ? rgbaFromHex(tokens.posterInk, 1) : "transparent";

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

    if (st.id === "poster") state.map.mapCircleMarginEnabled = false;
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

  // ✅ Retícula anterior (curvas) pero SIN opacidad
  function drawCurvedGrid(ctx, w, h, gridLine){
    ctx.save();
    ctx.strokeStyle = gridLine;
    ctx.lineWidth = 1.15;
    ctx.globalAlpha = 1; // ✅ sin opacidad

    const meridians = 7;
    const parallels = 6;

    for (let i = 0; i < meridians; i++){
      const t = i / (meridians - 1);
      const x = w * (0.12 + t * 0.76);
      const bend = (Math.abs(t - 0.5) / 0.5);
      const curve = (1 - bend) * (w * 0.18);

      ctx.beginPath();
      ctx.moveTo(x, h * 0.06);
      ctx.quadraticCurveTo(x + curve * (t < 0.5 ? -1 : 1), h * 0.50, x, h * 0.94);
      ctx.stroke();
    }

    for (let j = 0; j < parallels; j++){
      const t = j / (parallels - 1);
      const y = h * (0.16 + t * 0.68);
      const bend = (Math.abs(t - 0.5) / 0.5);
      const curve = (1 - bend) * (h * 0.16);

      ctx.beginPath();
      ctx.moveTo(w * 0.06, y);
      ctx.quadraticCurveTo(w * 0.50, y + curve * (t < 0.5 ? 1 : -1), w * 0.94, y);
      ctx.stroke();
    }

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

    if (state.map.showGrid && isGridAllowedForCurrentStyle()) drawCurvedGrid(ctx, mapW, mapH, tokens.gridLine);

    drawStars(ctx, mapW, mapH, rand, tokens.stars);

    if (state.map.showConstellations) {
      drawConstellations(ctx, mapW, mapH, rand, tokens.constLine, tokens.constNode, conLineW, nodeR);
    }

    ctx.restore();

    if (showOutline){
      ctx.save();
      ctx.strokeStyle = tokens.posterInk;
      ctx.lineWidth = outlineW;
      ctx.globalAlpha = 1;
      const half = outlineW / 2;
      ctx.strokeRect(half, half, mapW - outlineW, mapH - outlineW);
      ctx.restore();
    }
  }

  function drawMap(){
    syncOutlineThickness();

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
    const outlineW = MAP_OUTLINE_PX;

    ctx.clearRect(0, 0, mapW, mapH);

    const shouldInsetLikeMapControl =
      outlineEnabled ||
      (isPosterDecorAllowed() && !!state.map.posterFrameEnabled) ||
      (isPosterDecorAllowed() && !!state.map.posterMarginEnabled);

    const insetPad = shouldInsetLikeMapControl
      ? Math.round(Math.min(mapW, mapH) * (state.map.mapCircleInsetPct || 0.10))
      : 0;

    const z = clamp(state.map.mapZoom || 1, 1.0, 1.6);

    if (st.shape === "circle"){
      const cx = mapW/2, cy = mapH/2;
      const rOuter = Math.min(mapW,mapH)/2;
      const rInner = rOuter - insetPad;

      if (showOutline){
        ctx.save();
        ctx.strokeStyle = tokens.posterInk;
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

      if (state.map.showGrid && isGridAllowedForCurrentStyle()) drawCurvedGrid(ctx, mapW, mapH, tokens.gridLine);

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
        ctx.strokeStyle = tokens.posterInk;
        ctx.lineWidth = outlineW;
        ctx.globalAlpha = 1;
        heartPath(ctx, cx, cy, size);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    if (st.shape === "rect"){
      if (insetPad > 0){
        ctx.save();
        ctx.translate(insetPad, insetPad);
        const w = Math.max(1, mapW - insetPad * 2);
        const h = Math.max(1, mapH - insetPad * 2);
        drawRectMap(ctx, w, h, tokens, rand, showOutline, outlineW, conLineW, nodeR);
        ctx.restore();
      } else {
        drawRectMap(ctx, mapW, mapH, tokens, rand, showOutline, outlineW, conLineW, nodeR);
      }
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
    state.map.posterMarginThickness = DEFAULT_POSTER_MARGIN_THICKNESS;

    if (isNeonTheme()) state.map.backgroundMode = "match";
    if (isPosterStyle()) state.map.mapCircleMarginEnabled = false;

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

    if (styleId === "classic"){
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
    }
    else if (styleId === "poster"){
      const titleW = Math.round(w * 0.52);
      const subW   = Math.round(w * 0.34);
      const x1 = Math.round((w - titleW)/2);
      const x2 = Math.round((w - subW)/2);

      const yTitle = h - bottomPad - 56;
      const ySub   = h - bottomPad - 42;
      const yMeta1 = h - bottomPad - 24;
      const yMeta2 = h - bottomPad - 14;
      const yMeta3 = h - bottomPad - 4;

      ctx.fillRect(x1, yTitle, titleW, 6);
      ctx.globalAlpha = 0.20;
      ctx.fillRect(x2, ySub, subW, 5);

      ctx.globalAlpha = 0.18;
      const metaW = Math.round(w * 0.44);
      const xm = Math.round((w - metaW)/2);
      ctx.fillRect(xm, yMeta1, metaW, 4);
      ctx.fillRect(xm, yMeta2, metaW * 0.88, 4);
      ctx.fillRect(xm, yMeta3, metaW * 0.76, 4);
    }
    else {
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

  function makeSwatchTile({ name, circleBg, starBg, active, onClick }){
    const tile = document.createElement("div");
    tile.className = "swatchTile" + (active ? " active" : "");

    const c = document.createElement("div");
    c.className = "swatchCircle";
    c.style.background = circleBg;

    const star = document.createElement("div");
    star.className = "swatchStar";
    star.style.background = starBg;

    c.appendChild(star);

    const label = document.createElement("div");
    label.className = "swatchName";
    label.textContent = name;

    tile.appendChild(c);
    tile.appendChild(label);
    tile.onclick = onClick;

    return tile;
  }

  function renderSectionDesign(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "Diseño";

    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Selecciona un estilo de poster, los colores y las opcines de personalizacion para tu mapa o genera un aleatorio. ¡Cada mapa es unico y diferente!";

    $section.appendChild(t);
    $section.appendChild(s);

    // --- Grupo 1: Aleatorio + estilos ---
    const group1 = document.createElement("div");
    group1.className = "groupBlock";

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

      if (isNeonTheme()) state.map.backgroundMode = "match";

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
        if (marco){
          state.map.posterFramePct = POSTER_FRAME_PCT_MAX;
          updatePosterFrameInsetPx();
        }
        state.map.posterMarginEnabled = !marco ? pickBool() : false;
      }

      // ✅ Defaults de contorno por estilo:
      if (state.map.styleId === "classic") state.map.mapCircleMarginEnabled = true;
      else if (state.map.styleId === "romantico") state.map.mapCircleMarginEnabled = true;
      else if (state.map.styleId === "moderno") state.map.mapCircleMarginEnabled = false;
      else state.map.mapCircleMarginEnabled = false; // poster

      if (!isGridAllowedForCurrentStyle()) state.map.showGrid = false;
      if (!mapOutlineAllowed()) state.map.mapCircleMarginEnabled = false;

      state.map.seed = (Math.random() * 1e9) | 0;

      renderPosterAndMap();
      renderAll();
    };
    randomRow.appendChild(randomBtn);

    const styleRow = document.createElement("div");
    styleRow.className = "formRow";
    styleRow.classList.add("stackGap");
    styleRow.innerHTML = `<div class="label">Estilos</div>`;

    const grid = document.createElement("div");
    grid.className = "styleGrid";

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

      // Clip forma
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

      // estrellas preview
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
      ctx.restore();

      // ✅ Mostrar contorno SOLO en Clásico y Romántico (preview)
      const showOutlinePreview = (st.id === "classic" || st.id === "romantico");
      if (showOutlinePreview){
        ctx.save();
        ctx.strokeStyle = tokens.posterInk;
        ctx.lineWidth = 5; // un “hint” visible en miniatura
        ctx.globalAlpha = 1;

        if (st.shape === "circle"){
          ctx.beginPath();
          ctx.arc(mx+mw/2, my+mw/2, mw/2 - 2.5, 0, Math.PI*2);
          ctx.stroke();
        } else if (st.shape === "heart"){
          const cx = mx + mw/2;
          const cy = my + mw/2 - 6;
          const size = mw * 0.50;
          heartPath(ctx, cx, cy, size);
          ctx.stroke();
        }
        ctx.restore();
      }

      drawStyleTextSkeleton(ctx, 180, 240, st.id, tokens.posterInk);

      poster.appendChild(c);

      const name = document.createElement("div");
      name.className = "styleNameLabel";
      name.textContent = st.name;

      tile.appendChild(poster);
      tile.appendChild(name);

      tile.onclick = () => {
        state.map.styleId = st.id;

        if (!isPosterDecorAllowed()){
          state.map.posterFrameEnabled = false;
          state.map.posterMarginEnabled = false;
        } else {
          if (st.id === "classic"){
            state.map.posterFrameEnabled = false;
            state.map.posterMarginEnabled = true;
          } else {
            state.map.posterMarginEnabled = false;
          }
        }

        // ✅ Defaults contorno por estilo (lo que pediste)
        if (st.id === "classic") state.map.mapCircleMarginEnabled = true;
        else if (st.id === "romantico") state.map.mapCircleMarginEnabled = true; // y puede togglear
        else if (st.id === "moderno") state.map.mapCircleMarginEnabled = false;  // default OFF
        else state.map.mapCircleMarginEnabled = false; // poster

        if (!isGridAllowedForCurrentStyle()) state.map.showGrid = false;
        if (!mapOutlineAllowed()) state.map.mapCircleMarginEnabled = false;

        renderPosterAndMap();
        renderAll();
      };

      grid.appendChild(tile);
    });

    styleRow.appendChild(grid);

    group1.appendChild(randomRow);
    group1.appendChild(styleRow);
    $section.appendChild(group1);

    // --- Grupo 2: Color mapa ---
    const group2 = document.createElement("div");
    group2.className = "groupBlock";

    const colorRow = document.createElement("div");
    colorRow.className = "formRow";
    colorRow.innerHTML = `<div class="label">Color del Mapa estelar</div>`;

    const swatchRow = document.createElement("div");
    swatchRow.className = "swatchRow";

    COLOR_THEMES.forEach(th => {
      const c = colorsFor(th.id);
      const circleBg = th.id.startsWith("neon") ? "#000000" : c.bg;
      const starBg = c.star;

      swatchRow.appendChild(
        makeSwatchTile({
          name: th.name,
          circleBg,
          starBg,
          active: state.map.colorTheme === th.id,
          onClick: () => {
            state.map.colorTheme = th.id;
            if (isNeonTheme()) state.map.backgroundMode = "match";
            renderPosterAndMap();
            renderAll();
          }
        })
      );
    });

    colorRow.appendChild(swatchRow);
    group2.appendChild(colorRow);
    $section.appendChild(group2);

    // --- Grupo 3: Fondo ---
    const group3 = document.createElement("div");
    group3.className = "groupBlock";

    const bgRow = document.createElement("div");
    bgRow.className = "formRow";
    bgRow.innerHTML = `<div class="label">Color de fondo</div>`;

    const bgSwatches = document.createElement("div");
    bgSwatches.className = "swatchRow";

    {
      const th = colorsFor(state.map.colorTheme);
      const circleBg = isNeonTheme() ? "#000000" : th.bg;
      const starBg = isNeonTheme() ? th.star : "#FFFFFF";

      bgSwatches.appendChild(
        makeSwatchTile({
          name: getThemeName(),
          circleBg,
          starBg,
          active: state.map.backgroundMode === "match" || isNeonTheme(),
          onClick: () => {
            state.map.backgroundMode = "match";
            renderPosterAndMap();
            renderAll();
          }
        })
      );
    }

    if (!isNeonTheme()){
      bgSwatches.appendChild(
        makeSwatchTile({
          name: "Blanco",
          circleBg: "#FFFFFF",
          starBg: "rgba(0,0,0,.25)",
          active: state.map.backgroundMode === "white",
          onClick: () => {
            state.map.backgroundMode = "white";
            if (!mapOutlineAllowed()) state.map.mapCircleMarginEnabled = false;
            renderPosterAndMap();
            renderAll();
          }
        })
      );
    } else {
      state.map.backgroundMode = "match";
    }

    bgRow.appendChild(bgSwatches);
    group3.appendChild(bgRow);
    $section.appendChild(group3);

    // --- Grupo 4: toggles ---
    const group4 = document.createElement("div");
    group4.className = "groupBlock";

    const showDecor = isPosterDecorAllowed();
    if (!showDecor){
      state.map.posterFrameEnabled = false;
      state.map.posterMarginEnabled = false;
    }

    const stack = document.createElement("div");
    stack.className = "toggleStack";

    if (showDecor){
      const frameRow = document.createElement("div");
      frameRow.className = "rowToggle";
      frameRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Marco del póster" }));
      frameRow.appendChild(toggleSwitch(!!state.map.posterFrameEnabled, (val) => {
        state.map.posterFrameEnabled = val;
        if (val) state.map.posterMarginEnabled = false;
        renderPosterAndMap();
        renderAll();
      }));
      stack.appendChild(frameRow);

      if (state.map.posterFrameEnabled){
        const frameSizeRow = document.createElement("div");
        frameSizeRow.className = "formRow";
        frameSizeRow.innerHTML = `<div class="label">Tamaño del marco</div>`;
        const frameRange = document.createElement("input");
        frameRange.type = "range";
        frameRange.min = "0.00";
        frameRange.max = String(POSTER_FRAME_PCT_MAX);
        frameRange.step = "0.005";
        frameRange.value = String(state.map.posterFramePct ?? POSTER_FRAME_PCT_DEFAULT);
        frameRange.oninput = () => {
          state.map.posterFramePct = Number(frameRange.value);
          updatePosterFrameInsetPx();
          renderPosterAndMap();
          renderAll();
        };
        frameSizeRow.appendChild(frameRange);
        stack.appendChild(frameSizeRow);
      }

      const marginRow = document.createElement("div");
      marginRow.className = "rowToggle";
      marginRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Margen del póster" }));
      marginRow.appendChild(toggleSwitch(!!state.map.posterMarginEnabled, (val) => {
        state.map.posterMarginEnabled = val;
        renderPosterAndMap();
        renderAll();
      }));
      stack.appendChild(marginRow);
    }

    // ✅ Contorno:
    // - NO aparece para poster (por mapOutlineAllowed)
    // - Moderno: existe, pero default OFF (ya lo manejamos al seleccionar estilo)
    // - Romántico: puede on/off
    if (mapOutlineAllowed()){
      const outlineRow = document.createElement("div");
      outlineRow.className = "rowToggle";
      outlineRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Contorno del mapa" }));
      outlineRow.appendChild(toggleSwitch(!!state.map.mapCircleMarginEnabled, (val) => {
        state.map.mapCircleMarginEnabled = val;
        if (!mapOutlineAllowed()) state.map.mapCircleMarginEnabled = false;
        drawMap();
        renderAll();
      }));
      stack.appendChild(outlineRow);
    }

    const conRow = document.createElement("div");
    conRow.className = "rowToggle";
    conRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Constelaciones" }));
    conRow.appendChild(toggleSwitch(!!state.map.showConstellations, (val) => {
      state.map.showConstellations = val;
      drawMap();
      renderAll();
    }));
    stack.appendChild(conRow);

    if (state.map.showConstellations){
      const csRow = document.createElement("div");
      csRow.className = "formRow";
      csRow.innerHTML = `<div class="label">Tamaño de constelaciones</div>`;
      const csRange = document.createElement("input");
      csRange.type = "range";
      csRange.min = "1";
      csRange.max = "4";
      csRange.step = "0.5";
      csRange.value = String(state.map.constellationSize);
      csRange.oninput = () => { state.map.constellationSize = Number(csRange.value); drawMap(); };
      csRow.appendChild(csRange);
      stack.appendChild(csRow);
    }

    const allowGrid = isGridAllowedForCurrentStyle();
    if (!allowGrid) state.map.showGrid = false;
    if (allowGrid){
      const gridRow = document.createElement("div");
      gridRow.className = "rowToggle";
      gridRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Retícula" }));
      gridRow.appendChild(toggleSwitch(!!state.map.showGrid, (val) => {
        state.map.showGrid = val;
        drawMap();
        renderAll();
      }));
      stack.appendChild(gridRow);
    }

    const seedRow = document.createElement("div");
    seedRow.className = "formRow";
    seedRow.innerHTML = `<div class="label">Variación del cielo</div>`;
    const seedBtn = document.createElement("button");
    seedBtn.type = "button";
    seedBtn.className = "btn ghost";
    seedBtn.textContent = "Generar nuevo cielo";
    seedBtn.onclick = () => { state.map.seed = (Math.random() * 1e9) | 0; drawMap(); };
    seedRow.appendChild(seedBtn);
    stack.appendChild(seedRow);

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
    stack.appendChild(mapZoomRow);

    group4.appendChild(stack);
    $section.appendChild(group4);

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

    function fieldCard(key, label, getter, setter, placeholder=""){
      const card = document.createElement("div");
      card.className = "fieldCard";

      const header = document.createElement("div");
      header.className = "fieldHeader";

      const lab = document.createElement("div");
      lab.className = "fieldLabel";
      lab.textContent = label;

      const toggle = toggleSwitch(!!state.visible[key], (val) => {
        state.visible[key] = val;
        renderPosterText();
        renderAll();
      });

      header.appendChild(lab);
      header.appendChild(toggle);
      card.appendChild(header);

      if (state.visible[key]) {
        const body = document.createElement("div");
        body.className = "fieldBody";

        const inp = document.createElement("input");
        inp.className = "fieldInput";
        inp.value = getter() ?? "";
        inp.placeholder = placeholder;
        inp.oninput = () => { setter(inp.value); renderPosterText(); };

        body.appendChild(inp);
        card.appendChild(body);
      }

      return card;
    }

    function dateTimeCard(){
      const card = document.createElement("div");
      card.className = "fieldCard";

      const header = document.createElement("div");
      header.className = "fieldHeader";

      const lab = document.createElement("div");
      lab.className = "fieldLabel";
      lab.textContent = "Fecha / hora";

      const toggle = toggleSwitch(!!state.visible.datetime, (val) => {
        state.visible.datetime = val;
        renderPosterText();
        renderAll();
      });

      header.appendChild(lab);
      header.appendChild(toggle);
      card.appendChild(header);

      if (state.visible.datetime){
        const body = document.createElement("div");
        body.className = "fieldBody";

        const dateInp = document.createElement("input");
        dateInp.className = "fieldInput";
        dateInp.type = "text";
        dateInp.inputMode = "numeric";
        dateInp.placeholder = "dd.mm.yyyy";
        dateInp.value = state.text.date || "";
        dateInp.oninput = () => {
          state.text.date = dateInp.value;
          updateSeedFromDateTime();
          renderPosterText();
          drawMap();

          if (dateInp.value.trim() && !isValidDDMMYYYY(dateInp.value)) {
            dateInp.style.borderColor = "rgba(255,90,90,.55)";
          } else {
            dateInp.style.borderColor = "";
          }
        };
        if (dateInp.value.trim() && !isValidDDMMYYYY(dateInp.value)) {
          dateInp.style.borderColor = "rgba(255,90,90,.55)";
        }
        body.appendChild(dateInp);

        const spacer = document.createElement("div");
        spacer.style.height = "10px";
        body.appendChild(spacer);

        const timeInp = document.createElement("input");
        timeInp.className = "fieldInput";
        timeInp.type = "time";
        timeInp.value = state.text.time || "";
        timeInp.oninput = () => {
          state.text.time = timeInp.value;
          updateSeedFromDateTime();
          renderPosterText();
          drawMap();
        };
        body.appendChild(timeInp);

        card.appendChild(body);
      }

      return card;
    }

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(fontRow);

    $section.appendChild(fieldCard("title", "Título", () => state.text.title, (v) => { state.text.title = v; }));
    $section.appendChild(fieldCard("subtitle", "Mensaje", () => state.text.subtitle, (v) => { state.text.subtitle = v; }));
    $section.appendChild(fieldCard("place", "Lugar", () => state.text.place, (v) => { state.text.place = v; }));
    $section.appendChild(fieldCard("coords", "Coordenadas", () => state.text.coords, (v) => {
      state.text.coords = v;
      updateSeedFromDateTime();
      drawMap();
    }));
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

    if (isNeonTheme()) state.map.backgroundMode = "match";
    state.map.posterMarginThickness = DEFAULT_POSTER_MARGIN_THICKNESS;

    const tokens = computeRenderTokens();

    updatePosterFrameInsetPx();
    syncOutlineThickness();

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
      const thick = DEFAULT_POSTER_MARGIN_THICKNESS;
      const thickScaled = Math.max(1, Math.round(thick * (W / POSTER_W)));
      ctx.save();
      ctx.strokeStyle = rgbaFromHex(tokens.posterInk, 1);
      ctx.lineWidth = thickScaled;
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
    sizeRow.classList.add("stackGap");
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
    renderTabs();
    renderSection();
    renderPosterFont();
    renderPosterText();
    renderPosterAndMap();
  }

  // Init
  updateSeedFromDateTime();

  // ✅ asegura defaults por estilo inicial (classic)
  if (state.map.styleId === "moderno") state.map.mapCircleMarginEnabled = false;
  if (state.map.styleId === "poster") state.map.mapCircleMarginEnabled = false;

  state.map.posterMarginThickness = DEFAULT_POSTER_MARGIN_THICKNESS;
  if (isNeonTheme()) state.map.backgroundMode = "match";
  if (isPosterStyle()) state.map.mapCircleMarginEnabled = false;

  ensurePosterLayers();
  applyPosterLayoutByStyle();
  applyPosterPaddingLayout();
  setMapSizeFromPosterPad();

  renderAll();
  window.addEventListener("resize", () => drawMap());
})();
