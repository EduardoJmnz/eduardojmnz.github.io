(() => {
  const POSTER_W = 900;
  const POSTER_MARGIN_INSET_DEFAULT = Math.round(POSTER_W * 0.05);

  const state = {
    step: 0,
    ui: { zoom: 0.75, minZoom: 0.35, maxZoom: 1.25, step: 0.1 },

    visible: { title: true, subtitle: true, place: true, coords: true, datetime: true },

    text: {
      title: "NIGHT SKY",
      subtitle: "A moment to remember",
      place: "Mexico City, MX",
      coords: "19.4326, -99.1332",
      datetime: "2026-01-07 19:30",
      fontKey: "system",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    },

    map: {
      styleId: "classic",
      showConstellations: true,
      colorTheme: "mono",

      invertMapColors: false,

      posterMarginEnabled: false,
      posterMarginInsetPx: POSTER_MARGIN_INSET_DEFAULT,
      posterMarginThickness: 2,

      // map "outline"
      mapCircleMarginEnabled: false,
      mapCircleInsetPct: 0.10,
      mapCircleMarginThickness: 2,

      constellationSize: 2.0,
      seed: 12345,
    },
  };

  const STEPS = [
    { key: "design", label: "Diseño" },
    { key: "content", label: "Contenido" },
    { key: "export", label: "Export" },
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
    { id: "white",     name: "Blanco" },
    { id: "marino",    name: "Marino" },
    { id: "carbon",    name: "Carbón" },
    { id: "ice",       name: "Hielo" },
    { id: "warm",      name: "Cálido" },
    { id: "forest",    name: "Bosque" },
    { id: "rose",      name: "Rosa" },
    { id: "neonBlue",  name: "Neón Azul" },
    { id: "neonGreen", name: "Neón Verde" },
    { id: "neonRose",  name: "Neón Rosa" },
  ];

  const $tabs = document.getElementById("tabs");
  const $section = document.getElementById("sectionContainer");

  const $poster = document.getElementById("poster");
  const $canvas = document.getElementById("mapCanvas");

  const $pTitle = document.getElementById("pTitle");
  const $pSubtitle = document.getElementById("pSubtitle");
  const $pPlace = document.getElementById("pPlace");
  const $pCoords = document.getElementById("pCoords");
  const $pDatetime = document.getElementById("pDatetime");

  const $previewScale = document.getElementById("previewScale");
  const $zoomIn = document.getElementById("zoomIn");
  const $zoomOut = document.getElementById("zoomOut");
  const $zoomLabel = document.getElementById("zoomLabel");

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
      mono:      { bg: "#0A0B0D", star: "#FFFFFF", line: "rgba(255,255,255,0.16)" },
      white:     { bg: "#F5F5F2", star: "#111111", line: "rgba(17,17,17,0.20)" },
      marino:    { bg: "#0B0D12", star: "#FFFFFF", line: "rgba(255,255,255,0.22)" },
      carbon:    { bg: "#0A0B0D", star: "#E8DCC8", line: "rgba(232,220,200,0.20)" },
      ice:       { bg: "#071016", star: "#E9F6FF", line: "rgba(233,246,255,0.18)" },
      warm:      { bg: "#140E0A", star: "#F6E7C9", line: "rgba(246,231,201,0.20)" },
      forest:    { bg: "#06130E", star: "#EAF7F1", line: "rgba(234,247,241,0.18)" },
      rose:      { bg: "#16080C", star: "#FFE9EF", line: "rgba(255,233,239,0.18)" },
      neonBlue:  { bg: "#05050A", star: "#4EA7FF", line: "rgba(78,167,255,0.20)" },
      neonGreen: { bg: "#05050A", star: "#3CFF9B", line: "rgba(60,255,155,0.20)" },
      neonRose:  { bg: "#05050A", star: "#FF4FD8", line: "rgba(255,79,216,0.20)" },
    };
    return THEMES[theme] || THEMES.mono;
  }

  function getStyleDef(){
    return MAP_STYLES.find(s => s.id === state.map.styleId) || MAP_STYLES[0];
  }

  function applyZoom(){
    if (!$previewScale) return;
    $previewScale.style.transform = `scale(${state.ui.zoom})`;
    if ($zoomLabel) $zoomLabel.textContent = `${Math.round(state.ui.zoom * 100)}%`;
  }

  if ($zoomIn) $zoomIn.addEventListener("click", () => {
    state.ui.zoom = clamp(state.ui.zoom + state.ui.step, state.ui.minZoom, state.ui.maxZoom);
    applyZoom();
  });
  if ($zoomOut) $zoomOut.addEventListener("click", () => {
    state.ui.zoom = clamp(state.ui.zoom - state.ui.step, state.ui.minZoom, state.ui.maxZoom);
    applyZoom();
  });

  function applyPosterLayoutByStyle(){
    const st = getStyleDef();

    if (st.layout === "classic") $poster.classList.add("classic");
    else $poster.classList.remove("classic");

    if (st.id === "poster") $poster.classList.add("posterStylePoster");
    else $poster.classList.remove("posterStylePoster");

    $poster.classList.remove("shape-circle","shape-rect","shape-heart");
    $poster.classList.add(`shape-${st.shape}`);

    // map dims per style
    if (st.shape === "rect") {
      $poster.style.setProperty("--mapW", "820px");
      $poster.style.setProperty("--mapH", "860px");
    } else {
      $poster.style.setProperty("--mapW", "780px");
      $poster.style.setProperty("--mapH", "780px");
    }
  }

  function setMapSizeFromPosterPad(){
    const st = getStyleDef();
    if (st.shape !== "circle") return;

    const base = 780;
    const pad = state.map.posterMarginEnabled ? clamp(state.map.posterMarginInsetPx, 0, 140) : 0;
    const size = clamp(base - Math.round(pad * 0.6), 640, 780);

    $poster.style.setProperty("--mapW", `${size}px`);
    $poster.style.setProperty("--mapH", `${size}px`);
  }

  function applyPosterMarginLine(){
    const inset = state.map.posterMarginEnabled ? state.map.posterMarginInsetPx : POSTER_MARGIN_INSET_DEFAULT;
    const thick = clamp(state.map.posterMarginThickness, 1, 10);

    $poster.style.setProperty("--posterMarginInset", `${inset}px`);
    $poster.style.setProperty("--posterMarginThickness", `${thick}px`);

    if (state.map.posterMarginEnabled) $poster.classList.add("showPosterMargin");
    else $poster.classList.remove("showPosterMargin");
  }

  function applyPosterPaddingLayout(){
    const pad = state.map.posterMarginEnabled ? clamp(state.map.posterMarginInsetPx, 0, 140) : 0;
    $poster.style.setProperty("--posterPad", `${pad}px`);
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

  function navButtons({ showPrev, showNext, prevText="← Anterior", nextText="Siguiente →", onPrev, onNext }){
    const wrap = document.createElement("div");
    wrap.className = "navBtns";

    const left = document.createElement("div");
    const right = document.createElement("div");

    if (showPrev) {
      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "btn ghost";
      prev.textContent = prevText;
      prev.onclick = onPrev;
      left.appendChild(prev);
    }

    if (showNext) {
      const next = document.createElement("button");
      next.type = "button";
      next.className = "btn primary";
      next.textContent = nextText;
      next.onclick = onNext;
      right.appendChild(next);
    }

    wrap.appendChild(left);
    wrap.appendChild(right);
    return wrap;
  }

  function renderTabs(){
    $tabs.innerHTML = "";
    STEPS.forEach((s, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tab" + (idx === state.step ? " active" : "");
      b.textContent = s.label;
      b.onclick = () => { state.step = idx; renderAll(); };
      $tabs.appendChild(b);
    });
  }

  // ✅ Geometric heart (bigger, fewer curves)
  function heartGeometricPath(ctx, cx, cy, size){
    // size is roughly the "radius" of heart
    const topY = cy - size * 0.50;
    const bottomY = cy + size * 0.65;

    const leftX = cx - size * 0.80;
    const rightX = cx + size * 0.80;

    const lobeTopY = cy - size * 0.30;

    ctx.beginPath();
    ctx.moveTo(cx, bottomY);

    // left side up
    ctx.quadraticCurveTo(cx - size * 0.95, cy + size * 0.15, leftX, cy - size * 0.05);
    // left lobe to top center
    ctx.quadraticCurveTo(cx - size * 0.60, topY, cx, lobeTopY);
    // right lobe
    ctx.quadraticCurveTo(cx + size * 0.60, topY, rightX, cy - size * 0.05);
    // right side down
    ctx.quadraticCurveTo(cx + size * 0.95, cy + size * 0.15, cx, bottomY);

    ctx.closePath();
  }

  function drawConstellations(ctx, w, h, rand, colors, lineW, nodeR){
    const count = 6;
    ctx.save();
    ctx.lineWidth = lineW;
    ctx.strokeStyle = colors.line;
    ctx.fillStyle = colors.star;

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

      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      ctx.globalAlpha = 0.95;
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeR, 0, Math.PI*2);
        ctx.fill();
      });
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawStars(ctx, w, h, rand, colors){
    const N = Math.floor(680 + rand()*80);
    for (let i = 0; i < N; i++){
      const x = rand() * w;
      const y = rand() * h;

      const big = rand() > 0.92;
      const r = big ? (1.5 + rand() * 1.8) : (rand() * 1.2);
      const a = big ? (0.75 + rand() * 0.25) : (0.35 + rand() * 0.55);

      ctx.beginPath();
      ctx.globalAlpha = a;
      ctx.fillStyle = colors.star;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMap(){
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
    const posterColors = colorsFor(state.map.colorTheme);
    const rand = mulberry32(state.map.seed);

    // map palette maybe inverted
    let mapColors = { ...posterColors };
    if (state.map.invertMapColors){
      mapColors = {
        bg: posterColors.star,
        star: posterColors.bg,
        line: rgbaFromHex(posterColors.bg, 0.22),
      };
    }

    const cs = clamp(state.map.constellationSize, 1, 4);
    const conLineW = 0.9 + cs * 0.55;
    const nodeR = 1.6 + cs * 0.35;

    // ✅ "Contorno del mapa" only when not inverted (toggle hidden when invert on)
    const showOutline = state.map.mapCircleMarginEnabled && !state.map.invertMapColors;
    const outlineW = clamp(state.map.mapCircleMarginThickness, 1, 10);

    // background always poster bg
    ctx.clearRect(0, 0, mapW, mapH);
    ctx.fillStyle = posterColors.bg;
    ctx.fillRect(0, 0, mapW, mapH);

    ctx.save();

    // CIRCLE
    if (st.shape === "circle"){
      const shouldInsetLikeMapMargin = state.map.mapCircleMarginEnabled || state.map.posterMarginEnabled;
      const insetPad = shouldInsetLikeMapMargin ? Math.round(Math.min(mapW,mapH) * state.map.mapCircleInsetPct) : 0;

      const cx = mapW/2, cy = mapH/2;
      const rOuter = Math.min(mapW,mapH)/2;
      const rInner = rOuter - insetPad;

      // outline ring
      if (showOutline){
        ctx.save();
        ctx.strokeStyle = mapColors.line;
        ctx.lineWidth = outlineW;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(cx, cy, rInner, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, rInner, 0, Math.PI*2);
      ctx.clip();

      ctx.fillStyle = mapColors.bg;
      ctx.fillRect(0,0,mapW,mapH);

      drawStars(ctx, mapW, mapH, rand, mapColors);
      if (state.map.showConstellations) drawConstellations(ctx, mapW, mapH, rand, mapColors, conLineW, nodeR);

      ctx.restore();
      return;
    }

    // HEART
    if (st.shape === "heart"){
      const cx = mapW/2, cy = mapH/2;
      const size = Math.min(mapW,mapH) * 0.56; // ✅ bigger heart

      heartGeometricPath(ctx, cx, cy, size);
      ctx.clip();

      ctx.fillStyle = mapColors.bg;
      ctx.fillRect(0,0,mapW,mapH);

      drawStars(ctx, mapW, mapH, rand, mapColors);
      if (state.map.showConstellations) drawConstellations(ctx, mapW, mapH, rand, mapColors, conLineW, nodeR);

      ctx.restore();

      // ✅ NO outline unless Contorno is enabled
      if (showOutline){
        ctx.save();
        ctx.strokeStyle = mapColors.line;
        ctx.lineWidth = outlineW;
        ctx.globalAlpha = 0.85;
        heartGeometricPath(ctx, cx, cy, size);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    // RECT (Poster)
    if (st.shape === "rect"){
      // ✅ Poster: DO NOT shrink / DO NOT inset clip (only draw outline around)
      ctx.fillStyle = mapColors.bg;
      ctx.fillRect(0,0,mapW,mapH);

      drawStars(ctx, mapW, mapH, rand, mapColors);
      if (state.map.showConstellations) drawConstellations(ctx, mapW, mapH, rand, mapColors, conLineW, nodeR);

      // ✅ Outline around the rectangle (not inside shrinking)
      if (showOutline){
        ctx.save();
        ctx.strokeStyle = mapColors.line;
        ctx.lineWidth = outlineW;
        ctx.globalAlpha = 0.75;

        // align stroke inside canvas nicely
        const half = outlineW / 2;
        ctx.strokeRect(half, half, mapW - outlineW, mapH - outlineW);

        ctx.restore();
      }

      ctx.restore();
      return;
    }

    // fallback
    ctx.fillStyle = mapColors.bg;
    ctx.fillRect(0,0,mapW,mapH);
    drawStars(ctx, mapW, mapH, rand, mapColors);
    if (state.map.showConstellations) drawConstellations(ctx, mapW, mapH, rand, mapColors, conLineW, nodeR);
    ctx.restore();
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
    $pDatetime.textContent = state.text.datetime || "";
  }

  function renderPosterAndMap(){
    const posterColors = colorsFor(state.map.colorTheme);

    $poster.style.background = posterColors.bg;
    $poster.style.color = posterColors.star;

    // poster margin line = same color as text
    $poster.style.setProperty("--posterMarginColor", rgbaFromHex(posterColors.star, 0.28));

    applyPosterLayoutByStyle();
    applyPosterMarginLine();
    applyPosterPaddingLayout();
    setMapSizeFromPosterPad();

    drawMap();
  }

  // --------- thumbnails (kept as-is from your last version) ----------
  function drawStyleThumbnail(ctx, w, h, styleId, colorTheme, invert){
    const st = MAP_STYLES.find(x => x.id === styleId) || MAP_STYLES[0];
    const posterColors = colorsFor(colorTheme);

    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = posterColors.bg;
    ctx.fillRect(0,0,w,h);

    let mapColors = { ...posterColors };
    if (invert){
      mapColors = { bg: posterColors.star, star: posterColors.bg, line: rgbaFromHex(posterColors.bg, 0.22) };
    }

    const rand = mulberry32(
      styleId === "romantico" ? 202603 :
      styleId === "poster" ? 202604 :
      styleId === "moderno" ? 202605 : 202602
    );

    let mx, my, mw, mh;
    if (st.shape === "rect"){
      mw = w * 0.78;
      mh = h * 0.64;
      mx = (w - mw) / 2;
      my = h * 0.10;
    } else {
      mw = w * 0.78;
      mh = w * 0.78;
      mx = (w - mw) / 2;
      my = h * 0.10;
    }

    ctx.save();
    if (st.shape === "circle"){
      const cx = mx + mw/2;
      const cy = my + mh/2;
      const r = Math.min(mw,mh)/2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.clip();
    } else if (st.shape === "heart"){
      const cx = mx + mw/2;
      const cy = my + mh/2;
      const size = Math.min(mw,mh) * 0.58;
      heartGeometricPath(ctx, cx, cy, size);
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(mx, my, mw, mh);
      ctx.clip();
    }

    ctx.fillStyle = mapColors.bg;
    ctx.fillRect(mx, my, mw, mh);

    const N = 180;
    for (let i=0;i<N;i++){
      const x = mx + rand()*mw;
      const y = my + rand()*mh;
      ctx.globalAlpha = 0.22 + rand()*0.55;
      ctx.fillStyle = mapColors.star;
      ctx.beginPath();
      ctx.arc(x, y, rand()*0.9, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // outline just for preview clarity (not the real "contorno")
    ctx.save();
    ctx.strokeStyle = mapColors.line;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.2;
    if (st.shape === "circle"){
      ctx.beginPath();
      ctx.arc(mx + mw/2, my + mh/2, Math.min(mw,mh)/2, 0, Math.PI*2);
      ctx.stroke();
    } else if (st.shape === "heart"){
      const cx = mx + mw/2;
      const cy = my + mh/2;
      const size = Math.min(mw,mh) * 0.58;
      heartGeometricPath(ctx, cx, cy, size);
      ctx.stroke();
    } else {
      ctx.strokeRect(mx, my, mw, mh);
    }
    ctx.restore();

    // skeleton text blocks
    const sk = rgbaFromHex(posterColors.star, 0.55);
    const sk2 = rgbaFromHex(posterColors.star, 0.32);

    ctx.save();
    ctx.fillStyle = sk;

    if (st.layout === "minimal"){
      const left = w * 0.12;
      const baseY = h * 0.84;
      ctx.globalAlpha = 0.95;
      ctx.fillRect(left, baseY-22, w*0.46, 5);
      ctx.globalAlpha = 0.70;
      ctx.fillStyle = sk2;
      ctx.fillRect(left, baseY-8,  w*0.60, 3);
      ctx.fillRect(left, baseY+2,  w*0.52, 3);
      ctx.fillRect(left, baseY+12, w*0.40, 3);
    } else {
      const center = w * 0.50;
      const baseY = h * 0.86;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = sk;
      ctx.fillRect(center - w*0.22, baseY-24, w*0.44, 5);

      ctx.globalAlpha = 0.70;
      ctx.fillStyle = sk2;
      ctx.fillRect(center - w*0.26, baseY-8,  w*0.52, 3);
      ctx.fillRect(center - w*0.24, baseY+2,  w*0.48, 3);
      ctx.fillRect(center - w*0.16, baseY+12, w*0.32, 3);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // --------------------------
  // SECTIONS
  // --------------------------
  function renderSectionDesign(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "Diseño";

    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Selecciona un estilo, color y opciones del mapa.";

    // style grid
    const styleRow = document.createElement("div");
    styleRow.className = "formRow";
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
      drawStyleThumbnail(c.getContext("2d"), c.width, c.height, st.id, state.map.colorTheme, state.map.invertMapColors);
      poster.appendChild(c);

      const name = document.createElement("div");
      name.className = "styleNameLabel";
      name.textContent = st.name;

      tile.appendChild(poster);
      tile.appendChild(name);

      tile.onclick = () => {
        state.map.styleId = st.id;
        if (st.id === "poster") state.map.posterMarginEnabled = false;

        applyPosterLayoutByStyle();
        setMapSizeFromPosterPad();

        renderPosterAndMap();
        renderAll();
      };

      grid.appendChild(tile);
    });

    styleRow.appendChild(grid);

    // color picker
    const colorRow = document.createElement("div");
    colorRow.className = "formRow";
    colorRow.innerHTML = `<div class="label">Color del póster</div>`;

    const colorSel = document.createElement("select");
    colorSel.className = "select";
    COLOR_THEMES.forEach(th => {
      const opt = document.createElement("option");
      opt.value = th.id;
      opt.textContent = th.name;
      colorSel.appendChild(opt);
    });
    colorSel.value = state.map.colorTheme;

    colorSel.onchange = () => {
      state.map.colorTheme = colorSel.value;

      if (state.map.colorTheme === "white") {
        state.map.invertMapColors = true;
        state.map.mapCircleMarginEnabled = false;
      }
      renderPosterAndMap();
      renderAll();
    };

    colorRow.appendChild(colorSel);

    // invert
    const invertRow = document.createElement("div");
    invertRow.className = "rowToggle";
    invertRow.classList.add("stackGap");
    invertRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Invertir color" }));
    invertRow.appendChild(toggleSwitch(!!state.map.invertMapColors, (val) => {
      state.map.invertMapColors = val;
      if (val) state.map.mapCircleMarginEnabled = false;
      drawMap();
      renderAll();
    }));

    // constellations
    const conRow = document.createElement("div");
    conRow.className = "rowToggle";
    conRow.classList.add("stackGap");
    conRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Constelaciones" }));
    conRow.appendChild(toggleSwitch(!!state.map.showConstellations, (val) => {
      state.map.showConstellations = val;
      drawMap();
      renderAll();
    }));

    const csRow = document.createElement("div");
    csRow.className = "formRow";
    csRow.classList.add("stackGap");
    csRow.innerHTML = `<div class="label">Tamaño de constelaciones</div>`;
    const csRange = document.createElement("input");
    csRange.type = "range";
    csRange.min = "1";
    csRange.max = "4";
    csRange.step = "0.5";
    csRange.value = String(state.map.constellationSize);
    csRange.oninput = () => { state.map.constellationSize = Number(csRange.value); drawMap(); };
    csRow.appendChild(csRange);

    // Poster margin (hidden for Poster style)
    const stNow = getStyleDef();
    const allowPosterMargin = stNow.id !== "poster";

    let posterRow = null;
    let posterThickRow = null;

    if (allowPosterMargin) {
      posterRow = document.createElement("div");
      posterRow.className = "rowToggle";
      posterRow.classList.add("stackGap");
      posterRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Margen del póster" }));
      posterRow.appendChild(toggleSwitch(!!state.map.posterMarginEnabled, (val) => {
        state.map.posterMarginEnabled = val;
        renderPosterAndMap();
        renderAll();
      }));

      if (state.map.posterMarginEnabled) {
        posterThickRow = document.createElement("div");
        posterThickRow.className = "formRow";
        posterThickRow.classList.add("stackGap");
        posterThickRow.innerHTML = `<div class="label">Grosor de la línea (póster)</div>`;
        const posterThick = document.createElement("input");
        posterThick.type = "range";
        posterThick.min = "1";
        posterThick.max = "10";
        posterThick.step = "1";
        posterThick.value = String(state.map.posterMarginThickness);
        posterThick.oninput = () => {
          state.map.posterMarginThickness = Number(posterThick.value);
          applyPosterMarginLine();
        };
        posterThickRow.appendChild(posterThick);
      }
    } else {
      state.map.posterMarginEnabled = false;
    }

    // Map outline (hidden if invert on)
    let mapRow = null;
    let mapThickRow = null;

    if (!state.map.invertMapColors) {
      mapRow = document.createElement("div");
      mapRow.className = "rowToggle";
      mapRow.classList.add("stackGap");
      mapRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Contorno del mapa" }));
      mapRow.appendChild(toggleSwitch(!!state.map.mapCircleMarginEnabled, (val) => {
        state.map.mapCircleMarginEnabled = val;
        drawMap();
        renderAll();
      }));

      if (state.map.mapCircleMarginEnabled) {
        mapThickRow = document.createElement("div");
        mapThickRow.className = "formRow";
        mapThickRow.classList.add("stackGap");
        mapThickRow.innerHTML = `<div class="label">Grosor del contorno</div>`;
        const mapThick = document.createElement("input");
        mapThick.type = "range";
        mapThick.min = "1";
        mapThick.max = "10";
        mapThick.step = "1";
        mapThick.value = String(state.map.mapCircleMarginThickness);
        mapThick.oninput = () => {
          state.map.mapCircleMarginThickness = Number(mapThick.value);
          drawMap();
        };
        mapThickRow.appendChild(mapThick);
      }
    }

    // Seed
    const seedRow = document.createElement("div");
    seedRow.className = "formRow";
    seedRow.classList.add("stackGap");
    seedRow.innerHTML = `<div class="label">Variación del cielo</div>`;
    const seedBtn = document.createElement("button");
    seedBtn.type = "button";
    seedBtn.className = "btn ghost";
    seedBtn.textContent = "Generar nuevo cielo";
    seedBtn.onclick = () => { state.map.seed = (Math.random() * 1e9) | 0; drawMap(); };
    seedRow.appendChild(seedBtn);

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(styleRow);
    $section.appendChild(colorRow);
    $section.appendChild(invertRow);

    $section.appendChild(conRow);
    if (state.map.showConstellations) $section.appendChild(csRow);

    if (posterRow) $section.appendChild(posterRow);
    if (posterThickRow) $section.appendChild(posterThickRow);

    if (mapRow) $section.appendChild(mapRow);
    if (mapThickRow) $section.appendChild(mapThickRow);

    $section.appendChild(seedRow);

    $section.appendChild(navButtons({
      showPrev: false,
      showNext: true,
      onNext: () => { state.step = 1; renderAll(); }
    }));
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

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(fontRow);

    $section.appendChild(fieldCard("title", "Título", () => state.text.title, (v) => state.text.title = v));
    $section.appendChild(fieldCard("subtitle", "Subtítulo", () => state.text.subtitle, (v) => state.text.subtitle = v));
    $section.appendChild(fieldCard("place", "Lugar", () => state.text.place, (v) => state.text.place = v));
    $section.appendChild(fieldCard("coords", "Coordenadas", () => state.text.coords, (v) => state.text.coords = v));
    $section.appendChild(fieldCard("datetime", "Fecha / hora", () => state.text.datetime, (v) => state.text.datetime = v, "YYYY-MM-DD HH:mm"));

    $section.appendChild(navButtons({
      showPrev: true,
      showNext: true,
      onPrev: () => { state.step = 0; renderAll(); },
      onNext: () => { state.step = 2; renderAll(); }
    }));
  }

  function renderSectionExport(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "Export";

    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Selecciona formato y exporta tu póster.";

    const formatRow = document.createElement("div");
    formatRow.className = "formRow";
    formatRow.innerHTML = `<div class="label">Formato</div>`;
    const formatSel = document.createElement("select");
    formatSel.className = "select";
    [["png","PNG"],["jpg","JPG"],["pdf","PDF"]].forEach(([v,n]) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = n;
      formatSel.appendChild(opt);
    });
    formatRow.appendChild(formatSel);

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "btn primary";
    exportBtn.textContent = "Exportar";
    exportBtn.onclick = () => exportPoster(formatSel.value);

    const actions = document.createElement("div");
    actions.className = "navBtns";

    const left = document.createElement("div");
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn ghost";
    prev.textContent = "← Anterior";
    prev.onclick = () => { state.step = 1; renderAll(); };
    left.appendChild(prev);

    const right = document.createElement("div");
    right.appendChild(exportBtn);

    actions.appendChild(left);
    actions.appendChild(right);

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(formatRow);
    $section.appendChild(actions);
  }

  function exportPoster(format){
    // (se mantiene igual que tu versión previa)
    // Si quieres también aplico "contorno" rect/heart en export exactamente igual que en preview.
    alert("Export: usa tu versión previa aquí (no lo toqué en este ajuste).");
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

  function renderPosterAndMap(){
    const posterColors = colorsFor(state.map.colorTheme);

    $poster.style.background = posterColors.bg;
    $poster.style.color = posterColors.star;
    $poster.style.setProperty("--posterMarginColor", rgbaFromHex(posterColors.star, 0.28));

    applyPosterLayoutByStyle();
    applyPosterMarginLine();
    applyPosterPaddingLayout();
    setMapSizeFromPosterPad();

    drawMap();
  }

  // Init
  applyPosterLayoutByStyle();
  applyPosterMarginLine();
  applyPosterPaddingLayout();
  setMapSizeFromPosterPad();
  applyZoom();

  renderAll();
  window.addEventListener("resize", () => drawMap());
})();
