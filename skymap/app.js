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

      // toggles
      showGrid: false,          // ✅ Retícula (solo Clásico / Moderno)
      gridSize: 2,              // ✅ Slider tamaño retícula (grosor)
      showConstellations: true,
      invertMapColors: false,

      colorTheme: "mono",

      posterMarginEnabled: false,
      posterMarginInsetPx: POSTER_MARGIN_INSET_DEFAULT,
      posterMarginThickness: 2,

      // Contorno del mapa
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

  function isGridAllowedForCurrentStyle(){
    return (state.map.styleId === "classic" || state.map.styleId === "moderno");
  }

  // ✅ Heart path (tu versión previa: cubics)
  function heartPath(ctx, cx, cy, size){
    const w = size;
    const h = size * 1.18;

    const topY = cy - h * 0.62;
    const bottomY = cy + h * 0.62;

    const leftX = cx - w * 0.78;
    const rightX = cx + w * 0.78;

    ctx.beginPath();
    ctx.moveTo(cx, bottomY);

    ctx.bezierCurveTo(
      cx - w * 0.92, cy + h * 0.30,
      leftX,         cy - h * 0.08,
      cx - w * 0.44, cy - h * 0.12
    );

    ctx.bezierCurveTo(
      cx - w * 0.10, cy - h * 0.60,
      cx - w * 0.55, topY,
      cx,            cy - h * 0.28
    );

    ctx.bezierCurveTo(
      cx + w * 0.55, topY,
      cx + w * 0.10, cy - h * 0.60,
      cx + w * 0.44, cy - h * 0.12
    );

    ctx.bezierCurveTo(
      rightX,        cy - h * 0.08,
      cx + w * 0.92, cy + h * 0.30,
      cx,            bottomY
    );

    ctx.closePath();
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

    $poster.classList.toggle("rectStyle", st.shape === "rect");

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

  // ✅ Retícula (VERSIÓN ANTERIOR) – la que tenías antes de la “mundial”
  // Nota: ahora el slider gridSize controla el grosor.
  function drawCurvedGrid(ctx, w, h, colors){
    ctx.save();
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 0.6 + clamp(state.map.gridSize, 1, 6) * 0.35;
    ctx.globalAlpha = 0.22;

    const meridians = 7; // incluye centro
    const parallels = 6;

    // Meridianos (curvas verticales)
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

    // Paralelos (curvas horizontales)
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

    const showOutline = state.map.mapCircleMarginEnabled && !state.map.invertMapColors;
    const outlineW = clamp(state.map.mapCircleMarginThickness, 1, 10);

    // fondo del canvas = fondo del póster
    ctx.clearRect(0, 0, mapW, mapH);
    ctx.fillStyle = posterColors.bg;
    ctx.fillRect(0, 0, mapW, mapH);

    // ----- CIRCLE -----
    if (st.shape === "circle"){
      const shouldInsetLikeMapMargin = state.map.mapCircleMarginEnabled || state.map.posterMarginEnabled;
      const insetPad = shouldInsetLikeMapMargin ? Math.round(Math.min(mapW,mapH) * state.map.mapCircleInsetPct) : 0;

      const cx = mapW/2, cy = mapH/2;
      const rOuter = Math.min(mapW,mapH)/2;
      const rInner = rOuter - insetPad;

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

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rInner, 0, Math.PI*2);
      ctx.clip();

      ctx.fillStyle = mapColors.bg;
      ctx.fillRect(0,0,mapW,mapH);

      // ✅ retícula solo si permitido
      if (state.map.showGrid && isGridAllowedForCurrentStyle()) drawCurvedGrid(ctx, mapW, mapH, mapColors);

      drawStars(ctx, mapW, mapH, rand, mapColors);
      if (state.map.showConstellations) drawConstellations(ctx, mapW, mapH, rand, mapColors, conLineW, nodeR);

      ctx.restore();
      return;
    }

    // ----- HEART -----
    if (st.shape === "heart"){
      const cx = mapW/2;

      // ✅ MÁS ABAJO para que no se corte (antes estaba alto)
      const cy = mapH/2 + Math.round(mapH * 0.12);

      // ✅ tamaño ligeramente ajustado para evitar cortes por arriba
      const size = Math.min(mapW,mapH) * 0.68;

      ctx.save();
      heartPath(ctx, cx, cy, size);
      ctx.clip();

      ctx.fillStyle = mapColors.bg;
      ctx.fillRect(0,0,mapW,mapH);

      // Romántico NO muestra retícula (y se oculta en UI), pero por seguridad:
      if (state.map.showGrid && isGridAllowedForCurrentStyle()) drawCurvedGrid(ctx, mapW, mapH, mapColors);

      drawStars(ctx, mapW, mapH, rand, mapColors);
      if (state.map.showConstellations) drawConstellations(ctx, mapW, mapH, rand, mapColors, conLineW, nodeR);

      ctx.restore();

      if (showOutline){
        ctx.save();
        ctx.strokeStyle = mapColors.line;
        ctx.lineWidth = outlineW;
        ctx.globalAlpha = 0.85;
        heartPath(ctx, cx, cy, size);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    // ----- RECT (Poster) -----
    if (st.shape === "rect"){
      ctx.save();

      ctx.fillStyle = mapColors.bg;
      ctx.fillRect(0,0,mapW,mapH);

      // ✅ retícula NO para Poster
      if (state.map.showGrid && isGridAllowedForCurrentStyle()) drawCurvedGrid(ctx, mapW, mapH, mapColors);

      drawStars(ctx, mapW, mapH, rand, mapColors);
      if (state.map.showConstellations) drawConstellations(ctx, mapW, mapH, rand, mapColors, conLineW, nodeR);

      if (showOutline){
        ctx.save();
        ctx.strokeStyle = mapColors.line;
        ctx.lineWidth = outlineW;
        ctx.globalAlpha = 0.75;
        const half = outlineW / 2;
        ctx.strokeRect(half, half, mapW - outlineW, mapH - outlineW);
        ctx.restore();
      }

      ctx.restore();
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
    $pDatetime.textContent = state.text.datetime || "";
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

  // --------------------------
  // UI: Secciones
  // --------------------------
  function renderSectionDesign(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "Diseño";

    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Selecciona un estilo, color y opciones del mapa.";

    // Estilos
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

      const ctx = c.getContext("2d");
      const pc = colorsFor(state.map.colorTheme);

      ctx.clearRect(0,0,180,240);
      ctx.fillStyle = pc.bg;
      ctx.fillRect(0,0,180,240);

      ctx.save();
      const mx = 22, my = 18, mw = 136, mh = (st.shape === "rect") ? 140 : 136;

      if (st.shape === "circle"){
        ctx.beginPath();
        ctx.arc(mx+mw/2, my+mw/2, mw/2, 0, Math.PI*2);
        ctx.clip();
      } else if (st.shape === "heart"){
        const cx = mx+mw/2;
        const cy = my+mw/2 + 10; // mini preview offset hacia abajo
        const size = mw*0.60;
        heartPath(ctx, cx, cy, size);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(mx, my, mw, mh);
        ctx.clip();
      }

      const mc = state.map.invertMapColors
        ? { bg: pc.star, star: pc.bg, line: rgbaFromHex(pc.bg, 0.22) }
        : { ...pc };

      ctx.fillStyle = mc.bg;
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
        ctx.fillStyle = mc.star;
        ctx.beginPath();
        ctx.arc(x,y,r()*0.9,0,Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.save();
      ctx.fillStyle = rgbaFromHex(pc.star, 0.45);
      if (st.layout === "minimal"){
        ctx.fillRect(24, 192, 92, 4);
        ctx.fillRect(24, 204, 120, 3);
        ctx.fillRect(24, 214, 108, 3);
      } else {
        ctx.fillRect(46, 196, 88, 4);
        ctx.fillRect(36, 208, 108, 3);
        ctx.fillRect(54, 218, 72, 3);
      }
      ctx.restore();

      poster.appendChild(c);

      const name = document.createElement("div");
      name.className = "styleNameLabel";
      name.textContent = st.name;

      tile.appendChild(poster);
      tile.appendChild(name);

      tile.onclick = () => {
        state.map.styleId = st.id;

        // reglas: Poster y Romántico sin margen del póster
        if (st.id === "poster" || st.id === "romantico") state.map.posterMarginEnabled = false;

        // ✅ retícula solo Classic / Modern
        if (!isGridAllowedForCurrentStyle()) state.map.showGrid = false;

        renderPosterAndMap();
        renderAll();
      };

      grid.appendChild(tile);
    });

    styleRow.appendChild(grid);

    // Color picker
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

    // Invert
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

    // ✅ Retícula SOLO si estilo permite
    const allowGrid = isGridAllowedForCurrentStyle();
    if (!allowGrid) state.map.showGrid = false;

    const gridRow = document.createElement("div");
    gridRow.className = "rowToggle";
    gridRow.classList.add("stackGap");
    gridRow.appendChild(Object.assign(document.createElement("span"), { textContent: "Retícula" }));
    gridRow.appendChild(toggleSwitch(!!state.map.showGrid, (val) => {
      state.map.showGrid = val;
      drawMap();
      renderAll();
    }));

    const gridSizeRow = document.createElement("div");
    gridSizeRow.className = "formRow";
    gridSizeRow.classList.add("stackGap");
    gridSizeRow.innerHTML = `<div class="label">Tamaño de retícula</div>`;
    const gridRange = document.createElement("input");
    gridRange.type = "range";
    gridRange.min = "1";
    gridRange.max = "6";
    gridRange.step = "1";
    gridRange.value = String(state.map.gridSize);
    gridRange.oninput = () => { state.map.gridSize = Number(gridRange.value); drawMap(); };
    gridSizeRow.appendChild(gridRange);

    // Constellations toggle
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

    // Contorno del mapa (oculto si invertir ON)
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

    // Margen del póster (oculto en Poster y Romántico)
    const stNow = getStyleDef();
    const allowPosterMargin = (stNow.id !== "poster" && stNow.id !== "romantico");

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

    // Poster aleatorio
    const randomRow = document.createElement("div");
    randomRow.className = "formRow";
    randomRow.classList.add("stackGap");

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

      // ✅ retícula solo si el estilo lo permite
      const allowG = isGridAllowedForCurrentStyle();
      state.map.showGrid = allowG ? pickBool() : false;

      state.map.gridSize = Math.round(pickRange(1, 6));
      state.map.showConstellations = pickBool();

      const cs = Math.round(pickRange(1, 4) * 2) / 2;
      state.map.constellationSize = cs;

      state.map.posterMarginThickness = Math.round(pickRange(1, 10));
      state.map.mapCircleMarginThickness = Math.round(pickRange(1, 10));

      state.map.invertMapColors = pickBool();

      if (state.map.colorTheme === "white") {
        state.map.invertMapColors = true;
      }
      if (state.map.invertMapColors) {
        state.map.mapCircleMarginEnabled = false;
      } else {
        state.map.mapCircleMarginEnabled = pickBool();
      }

      const st = getStyleDef();
      const allowPM = (st.id !== "poster" && st.id !== "romantico");
      state.map.posterMarginEnabled = allowPM ? pickBool() : false;

      state.map.seed = (Math.random() * 1e9) | 0;

      renderPosterAndMap();
      renderAll();
    };

    randomRow.appendChild(randomBtn);

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(styleRow);
    $section.appendChild(colorRow);

    $section.appendChild(invertRow);

    // ✅ solo mostrar retícula si estilo permite
    if (allowGrid) {
      $section.appendChild(gridRow);
      if (state.map.showGrid) $section.appendChild(gridSizeRow);
    }

    $section.appendChild(conRow);
    if (state.map.showConstellations) $section.appendChild(csRow);

    if (mapRow) $section.appendChild(mapRow);
    if (mapThickRow) $section.appendChild(mapThickRow);

    if (posterRow) $section.appendChild(posterRow);
    if (posterThickRow) $section.appendChild(posterThickRow);

    $section.appendChild(seedRow);
    $section.appendChild(randomRow);

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
    const W = 900, H = 1200;
    const scale = 2;

    const out = document.createElement("canvas");
    out.width = W * scale;
    out.height = H * scale;

    const ctx = out.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const colors = colorsFor(state.map.colorTheme);

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);

    const pad = state.map.posterMarginEnabled ? clamp(state.map.posterMarginInsetPx, 0, 140) : 0;

    const st = getStyleDef();

    let mapW, mapH;
    if (st.shape === "rect"){
      mapW = 820;
      mapH = 860;
    } else {
      mapW = clamp(780 - Math.round(pad * 0.6), 640, 780);
      mapH = mapW;
    }

    const mapX = (W - mapW) / 2;
    const mapY = pad + 70;

    ctx.drawImage($canvas, mapX, mapY, mapW, mapH);

    if (state.map.posterMarginEnabled){
      ctx.save();
      ctx.strokeStyle = rgbaFromHex(colors.star, 0.28);
      ctx.lineWidth = clamp(state.map.posterMarginThickness, 1, 10);
      ctx.strokeRect(
        state.map.posterMarginInsetPx,
        state.map.posterMarginInsetPx,
        W - state.map.posterMarginInsetPx * 2,
        H - state.map.posterMarginInsetPx * 2
      );
      ctx.restore();
    }

    const fontFamily = state.text.fontFamily;
    ctx.fillStyle = colors.star;

    function drawText(text, x, y, sizePx, weight=800, align="left", alpha=1){
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.font = `${weight} ${sizePx}px ${fontFamily}`;
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function metaText(text, x, y, sizePx, align){
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.font = `650 ${sizePx}px ${fontFamily}`;
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    const show = state.visible;

    if (st.layout === "minimal"){
      const left = pad + 80;

      let top = H - (pad + 64) - 160;
      top = Math.max(top, mapY + mapH + 40);
      let ty = top;

      if (show.title) { drawText(state.text.title, left, ty + 54, 54, 900, "left", 1); ty += 54 + 10; }
      if (show.subtitle) { drawText(state.text.subtitle, left, ty + 18, 18, 600, "left", 0.85); ty += 18 + 22; }

      const metaY1 = ty + 14;
      const metaY2 = metaY1 + 20;
      const metaY3 = metaY2 + 20;

      if (show.place) metaText(state.text.place, left, metaY1, 14, "left");
      if (show.coords) metaText(state.text.coords, left, metaY2, 14, "left");
      if (show.datetime) metaText(state.text.datetime, left, metaY3, 14, "left");
    } else {
      const centerX = W / 2;

      // ✅ Para Poster (rect): texto más pequeño y no tan pegado al bottom
      const isPosterRect = (st.shape === "rect" && state.map.styleId === "poster");

      const titleSize = isPosterRect ? 44 : 54;
      const subSize   = isPosterRect ? 16 : 18;
      const metaSize  = isPosterRect ? 12 : 14;

      let ty = isPosterRect
        ? (H - (pad + 70))   // más aire abajo
        : (H - (pad + 90) - 80);

      if (show.subtitle) ty -= isPosterRect ? 18 : 24;

      if (show.title) { drawText(state.text.title, centerX, ty, titleSize, 900, "center", 1); ty += isPosterRect ? 30 : 36; }
      if (show.subtitle) { drawText(state.text.subtitle, centerX, ty, subSize, 650, "center", 0.85); ty += isPosterRect ? 26 : 36; }

      const metaY1 = ty + (isPosterRect ? 22 : 34);
      const metaY2 = metaY1 + (isPosterRect ? 18 : 22);
      const metaY3 = metaY2 + (isPosterRect ? 18 : 22);

      if (show.place) metaText(state.text.place, centerX, metaY1, metaSize, "center");
      if (show.coords) metaText(state.text.coords, centerX, metaY2, metaSize, "center");
      if (show.datetime) metaText(state.text.datetime, centerX, metaY3, metaSize, "center");
    }

    if (format === "png" || format === "jpg"){
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const quality = format === "jpg" ? 0.95 : undefined;
      const url = out.toDataURL(mime, quality);
      downloadDataURL(url, `poster.${format}`);
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

  function downloadDataURL(dataURL, filename){
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
  applyPosterLayoutByStyle();
  applyPosterMarginLine();
  applyPosterPaddingLayout();
  setMapSizeFromPosterPad();
  applyZoom();

  renderAll();
  window.addEventListener("resize", () => drawMap());
})();
