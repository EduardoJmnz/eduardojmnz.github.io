(() => {
  // ======================
  // Constants
  // ======================
  const POSTER_W = 900;
  const POSTER_H = 1200;
  const POSTER_MARGIN_INSET_DEFAULT = Math.round(POSTER_W * 0.05); // 5% => 45px

  // ======================
  // State
  // ======================
  const state = {
    step: 0,

    ui: {
      zoom: 0.75,     // default 75%
      minZoom: 0.35,
      maxZoom: 1.25,
      step: 0.1
    },

    visible: {
      title: true,
      subtitle: true,
      place: true,
      coords: true,
      datetime: true,
    },

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
      styleId: "minimal", // minimal | classic

      showConstellations: true,
      colorTheme: "mono",

      // Poster margin (rectangle): inset fixed 5%, slider = thickness
      posterMarginEnabled: false,
      posterMarginInsetPx: POSTER_MARGIN_INSET_DEFAULT,
      posterMarginThickness: 2,

      // Map margin (circle): inset fixed 10% of map size, slider = thickness
      mapCircleMarginEnabled: false,
      mapCircleInsetPct: 0.10,     // 10%
      mapCircleMarginThickness: 2,

      // affects constellation stroke + nodes
      constellationSize: 2.0,

      seed: 12345,
    },
  };

  // ✅ Sections renamed
  const STEPS = [
    { key: "design", label: "Diseño" },
    { key: "content", label: "Contenido" },
    { key: "export", label: "Export" },
  ];

  const MAP_STYLES = [
    { id: "minimal", name: "Minimalista" },
    { id: "classic", name: "Clásico" },
  ];

  const FONT_PRESETS = [
    { key: "system", name: "System (Default)", css: "system-ui, -apple-system, Segoe UI, Roboto, Arial" },
    { key: "inter", name: "Inter-like (Sans)", css: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" },
    { key: "georgia", name: "Georgia (Serif)", css: "Georgia, 'Times New Roman', Times, serif" },
    { key: "times", name: "Times New Roman (Serif)", css: "'Times New Roman', Times, serif" },
    { key: "mono", name: "Monospace", css: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
    { key: "rounded", name: "Rounded (Friendly)", css: "'Trebuchet MS', 'Verdana', system-ui, Arial" },
  ];

  // ======================
  // DOM
  // ======================
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

  // ======================
  // Utils
  // ======================
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

  function colorsFor(theme){
    const base = {
      bg: "#0B0D12",
      star: "#FFFFFF",
      line: "rgba(255,255,255,0.22)",
    };
    if (theme === "blue") return { ...base, bg: "#071225", line: "rgba(255,255,255,0.18)" };
    if (theme === "warm") return { ...base, bg: "#140E0A", star: "#F6E7C9", line: "rgba(246,231,201,0.20)" };
    if (theme === "neon") return { ...base, bg: "#05050A", star: "#7CFFFA", line: "rgba(124,255,250,0.18)" };
    return base; // mono
  }

  const COLOR_THEMES = [
    // ✅ circle matches poster background color exactly
    { id: "mono", name: "Mono" },
    { id: "blue", name: "Azul" },
    { id: "warm", name: "Cálido" },
    { id: "neon", name: "Neón" },
  ];

  // ======================
  // Zoom
  // ======================
  function applyZoom(){
    if (!$previewScale) return;
    $previewScale.style.transform = `scale(${state.ui.zoom})`;
    if ($zoomLabel) $zoomLabel.textContent = `${Math.round(state.ui.zoom * 100)}%`;
  }

  if ($zoomIn) {
    $zoomIn.addEventListener("click", () => {
      state.ui.zoom = clamp(state.ui.zoom + state.ui.step, state.ui.minZoom, state.ui.maxZoom);
      applyZoom();
    });
  }
  if ($zoomOut) {
    $zoomOut.addEventListener("click", () => {
      state.ui.zoom = clamp(state.ui.zoom - state.ui.step, state.ui.minZoom, state.ui.maxZoom);
      applyZoom();
    });
  }

  // ======================
  // Layout + defaults
  // ======================
  function setPosterLayout(){
    if (state.map.styleId === "classic") $poster.classList.add("classic");
    else $poster.classList.remove("classic");
  }

  function setDefaultsByStyle(styleId){
    // Classic: poster margin ON by default
    if (styleId === "classic") {
      state.map.posterMarginEnabled = true;
      state.map.posterMarginInsetPx = POSTER_MARGIN_INSET_DEFAULT;
    } else {
      state.map.posterMarginEnabled = false;
      state.map.posterMarginInsetPx = POSTER_MARGIN_INSET_DEFAULT;
    }
  }

  function setMapSizeFromPosterPad(){
    // keep your compact layout logic
    const base = 780;
    const pad = state.map.posterMarginEnabled ? clamp(state.map.posterMarginInsetPx, 0, 140) : 0;
    const size = clamp(base - Math.round(pad * 0.6), 640, 780);
    $poster.style.setProperty("--mapSize", `${size}px`);
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

  // ======================
  // UI helpers
  // ======================
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

  function toggleRow(label, checked, onChange){
    const row = document.createElement("div");
    row.className = "rowToggle";

    const left = document.createElement("span");
    left.textContent = label;

    const t = document.createElement("div");
    t.className = "toggle" + (checked ? " on" : "");
    t.role = "switch";
    t.tabIndex = 0;
    t.ariaChecked = String(!!checked);

    function set(val){
      checked = !!val;
      t.className = "toggle" + (checked ? " on" : "");
      t.ariaChecked = String(checked);
      onChange(checked);
    }

    t.onclick = () => set(!checked);
    t.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        set(!checked);
      }
    };

    row.appendChild(left);
    row.appendChild(t);
    return { row, get checked(){ return checked; }, set };
  }

  function colorCirclesRow(){
    const wrap = document.createElement("div");
    wrap.className = "colorRow";

    COLOR_THEMES.forEach(th => {
      const c = colorsFor(th.id);

      const dot = document.createElement("div");
      dot.className = "colorDot" + (state.map.colorTheme === th.id ? " active" : "");
      dot.title = th.name;
      dot.style.background = c.bg; // ✅ poster bg

      dot.onclick = () => {
        state.map.colorTheme = th.id;
        renderPosterAndMap();
        renderAll();
      };

      wrap.appendChild(dot);
    });

    return wrap;
  }

  // ======================
  // Thumbnail drawing (poster-like)
  // ======================
  function drawPosterThumbnail(ctx, w, h, styleId, colorTheme){
    const colors = colorsFor(colorTheme);

    // background
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0,0,w,h);

    // border
    ctx.save();
    ctx.strokeStyle = "rgba(233,238,252,.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5,0.5,w-1,h-1);
    ctx.restore();

    // map circle area
    const cx = w * 0.5;
    const cy = h * 0.40;
    const r = Math.min(w,h) * 0.26;

    // circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.clip();

    // stars
    const rand = mulberry32(styleId === "classic" ? 1337 : 7331);
    const N = 160;
    for (let i=0;i<N;i++){
      const x = cx - r + rand() * (2*r);
      const y = cy - r + rand() * (2*r);
      // keep inside circle (rough)
      const dx = x - cx, dy = y - cy;
      if ((dx*dx + dy*dy) > (r*r)) { i--; continue; }

      const big = rand() > 0.92;
      const rad = big ? (1.1 + rand()*0.9) : (rand()*0.8);
      const a = big ? (0.75 + rand()*0.25) : (0.25 + rand()*0.55);

      ctx.beginPath();
      ctx.globalAlpha = a;
      ctx.fillStyle = colors.star;
      ctx.arc(x, y, rad, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // small constellation strokes hint
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx - r*0.5, cy - r*0.1);
    ctx.lineTo(cx - r*0.05, cy - r*0.35);
    ctx.lineTo(cx + r*0.35, cy - r*0.05);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();

    // circle outline
    ctx.save();
    ctx.strokeStyle = "rgba(233,238,252,.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();

    // text block differs by style
    ctx.save();
    ctx.fillStyle = colors.star;

    if (styleId === "minimal"){
      // left aligned block
      const left = w*0.14;
      const baseY = h*0.78;

      ctx.globalAlpha = 0.95;
      ctx.fillRect(left, baseY-10, w*0.38, 3);

      ctx.globalAlpha = 0.7;
      ctx.fillRect(left, baseY+4, w*0.55, 2);
      ctx.fillRect(left, baseY+12, w*0.48, 2);
    } else {
      // centered block
      const center = w*0.5;
      const baseY = h*0.78;

      ctx.globalAlpha = 0.95;
      ctx.fillRect(center - w*0.18, baseY-10, w*0.36, 3);

      ctx.globalAlpha = 0.7;
      ctx.fillRect(center - w*0.22, baseY+4, w*0.44, 2);
      ctx.fillRect(center - w*0.20, baseY+12, w*0.40, 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function stylePreviewGrid(){
    const grid = document.createElement("div");
    grid.className = "styleGrid";

    MAP_STYLES.forEach(st => {
      const card = document.createElement("div");
      card.className = "styleCard" + (state.map.styleId === st.id ? " active" : "");

      const top = document.createElement("div");
      top.className = "styleTop";

      const name = document.createElement("div");
      name.className = "styleName";
      name.textContent = st.name;

      const tag = document.createElement("div");
      tag.className = "styleTag";
      tag.textContent = (state.map.styleId === st.id) ? "Seleccionado" : "";

      top.appendChild(name);
      top.appendChild(tag);

      const canvas = document.createElement("canvas");
      canvas.className = "thumb";
      canvas.width = 220;
      canvas.height = 120;

      const ctx = canvas.getContext("2d");
      drawPosterThumbnail(ctx, canvas.width, canvas.height, st.id, state.map.colorTheme);

      card.appendChild(top);
      card.appendChild(canvas);

      card.onclick = () => {
        state.map.styleId = st.id;
        setDefaultsByStyle(state.map.styleId);
        setPosterLayout();
        renderPosterAndMap();
        renderAll();
      };

      grid.appendChild(card);
    });

    return grid;
  }

  // ======================
  // Section: Diseño
  // ======================
  function renderSectionDesign(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "Diseño";

    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Estilo, color, constelaciones y márgenes.";

    // style preview
    const styleRow = document.createElement("div");
    styleRow.className = "formRow";
    styleRow.innerHTML = `<div class="label">Estilo</div>`;
    styleRow.appendChild(stylePreviewGrid());

    // color circles
    const colorRow = document.createElement("div");
    colorRow.className = "formRow";
    colorRow.innerHTML = `<div class="label">Color del póster</div>`;
    colorRow.appendChild(colorCirclesRow());

    // constellations toggle
    const con = toggleRow("Constelaciones", !!state.map.showConstellations, (val) => {
      state.map.showConstellations = val;
      drawMap();
      renderAll();
    });

    // constellation size (only visible when toggle ON)
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

    // poster margin
    const posterToggle = toggleRow("Margen del póster", !!state.map.posterMarginEnabled, (val) => {
      state.map.posterMarginEnabled = val;
      renderPosterAndMap();
      renderAll();
    });

    const posterThickRow = document.createElement("div");
    posterThickRow.className = "formRow";
    posterThickRow.innerHTML = `<div class="label">Grosor de la línea (póster)</div>`;
    const posterThick = document.createElement("input");
    posterThick.type = "range";
    posterThick.min = "1";
    posterThick.max = "10";
    posterThick.step = "1";
    posterThick.value = String(state.map.posterMarginThickness);
    posterThick.disabled = !state.map.posterMarginEnabled;
    posterThick.oninput = () => {
      state.map.posterMarginThickness = Number(posterThick.value);
      applyPosterMarginLine();
    };
    posterThickRow.appendChild(posterThick);

    // map margin
    const mapToggle = toggleRow("Margen del mapa", !!state.map.mapCircleMarginEnabled, (val) => {
      state.map.mapCircleMarginEnabled = val;
      drawMap();
      renderAll();
    });

    const mapThickRow = document.createElement("div");
    mapThickRow.className = "formRow";
    mapThickRow.innerHTML = `<div class="label">Grosor de la línea (mapa)</div>`;
    const mapThick = document.createElement("input");
    mapThick.type = "range";
    mapThick.min = "1";
    mapThick.max = "10";
    mapThick.step = "1";
    mapThick.value = String(state.map.mapCircleMarginThickness);
    mapThick.disabled = !state.map.mapCircleMarginEnabled;
    mapThick.oninput = () => {
      state.map.mapCircleMarginThickness = Number(mapThick.value);
      drawMap();
    };
    mapThickRow.appendChild(mapThick);

    // new sky
    const seedRow = document.createElement("div");
    seedRow.className = "formRow";
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

    $section.appendChild(con.row);
    if (state.map.showConstellations) $section.appendChild(csRow);

    $section.appendChild(posterToggle.row);
    $section.appendChild(posterThickRow);

    $section.appendChild(mapToggle.row);
    $section.appendChild(mapThickRow);

    $section.appendChild(seedRow);

    $section.appendChild(navButtons({
      showPrev: false,
      showNext: true,
      onNext: () => { state.step = 1; renderAll(); }
    }));
  }

  // ======================
  // Section: Contenido
  // ======================
  function renderSectionContent(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "Contenido";
    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Activa cada campo y escribe su contenido.";

    function inputRow(label, value, onChange, placeholder=""){
      const row = document.createElement("div");
      row.className = "formRow";
      const lab = document.createElement("div");
      lab.className = "label";
      lab.textContent = label;
      const inp = document.createElement("input");
      inp.className = "input";
      inp.value = value ?? "";
      inp.placeholder = placeholder;
      inp.oninput = () => onChange(inp.value);
      row.appendChild(lab);
      row.appendChild(inp);
      return row;
    }

    // Font
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

    // Helper: toggle + input directly underneath (if enabled)
    function toggleWithInput(key, label, valueGetter, valueSetter, placeholder=""){
      const tg = toggleRow(label, !!state.visible[key], (val) => {
        state.visible[key] = val;
        renderPosterText();
        renderAll();
      });
      $section.appendChild(tg.row);

      if (state.visible[key]) {
        $section.appendChild(inputRow(label, valueGetter(), (v) => { valueSetter(v); renderPosterText(); }, placeholder));
      }
    }

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(fontRow);

    toggleWithInput("title", "Título", () => state.text.title, (v) => state.text.title = v);
    toggleWithInput("subtitle", "Subtítulo", () => state.text.subtitle, (v) => state.text.subtitle = v);
    toggleWithInput("place", "Lugar", () => state.text.place, (v) => state.text.place = v);
    toggleWithInput("coords", "Coordenadas", () => state.text.coords, (v) => state.text.coords = v);
    toggleWithInput("datetime", "Fecha / hora", () => state.text.datetime, (v) => state.text.datetime = v, "YYYY-MM-DD HH:mm");

    $section.appendChild(navButtons({
      showPrev: true,
      showNext: true,
      onPrev: () => { state.step = 0; renderAll(); },
      onNext: () => { state.step = 2; renderAll(); }
    }));
  }

  // ======================
  // Export
  // ======================
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

  // ======================
  // Poster render
  // ======================
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
    const c = colorsFor(state.map.colorTheme);
    $poster.style.background = c.bg;
    $poster.style.color = c.star;

    setPosterLayout();
    applyPosterMarginLine();
    applyPosterPaddingLayout();
    setMapSizeFromPosterPad();

    drawMap();
  }

  // ======================
  // Constellations
  // ======================
  function drawConstellations(ctx, size, rand, colors, lineW, nodeR, innerPad){
    const count = 6;
    ctx.save();
    ctx.lineWidth = lineW;
    ctx.strokeStyle = colors.line;
    ctx.fillStyle = colors.star;

    const safeMin = innerPad + 36;
    const safeMax = size - innerPad - 36;

    for (let c = 0; c < count; c++){
      const cx = safeMin + rand() * (safeMax - safeMin);
      const cy = safeMin + rand() * (safeMax - safeMin);

      const points = 4 + Math.floor(rand() * 4);
      const pts = [];

      const rx = 40 + rand() * 110;
      const ry = 40 + rand() * 110;

      for (let i = 0; i < points; i++){
        const a = rand() * Math.PI * 2;
        const r1 = 0.35 + rand() * 0.75;
        const x = clamp(cx + Math.cos(a) * rx * r1, safeMin, safeMax);
        const y = clamp(cy + Math.sin(a) * ry * r1, safeMin, safeMax);
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

  // ======================
  // Map drawing
  // ======================
  function drawMap(){
    const cssSize = parseFloat(getComputedStyle($poster).getPropertyValue("--mapSize")) || 780;
    const size = Math.round(cssSize);

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    $canvas.width = size * dpr;
    $canvas.height = size * dpr;
    $canvas.style.width = size + "px";
    $canvas.style.height = size + "px";

    const ctx = $canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = colorsFor(state.map.colorTheme);
    const rand = mulberry32(state.map.seed);

    // ✅ same inset behavior when poster margin is ON
    const shouldInsetLikeMapMargin = state.map.mapCircleMarginEnabled || state.map.posterMarginEnabled;
    const innerPad = shouldInsetLikeMapMargin ? Math.round(size * state.map.mapCircleInsetPct) : 0;

    // constellation styling
    const cs = clamp(state.map.constellationSize, 1, 4);
    const conLineW = 0.9 + cs * 0.55;
    const nodeR = 1.6 + cs * 0.35;

    // margin line thickness slider
    const circleLineW = clamp(state.map.mapCircleMarginThickness, 1, 10);

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, size, size);

    if (innerPad > 0){
      const innerR = (size / 2) - innerPad;

      // draw ring only if map margin enabled
      if (state.map.mapCircleMarginEnabled){
        ctx.save();
        ctx.strokeStyle = colors.line;
        ctx.lineWidth = circleLineW;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(size/2, size/2, innerR, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // clip inside
      ctx.save();
      ctx.beginPath();
      ctx.arc(size/2, size/2, innerR, 0, Math.PI*2);
      ctx.clip();

      drawStars(ctx, size, rand, colors, innerPad);
      if (state.map.showConstellations) drawConstellations(ctx, size, rand, colors, conLineW, nodeR, innerPad);

      ctx.restore();
      return;
    }

    drawStars(ctx, size, rand, colors, 0);
    if (state.map.showConstellations) drawConstellations(ctx, size, rand, colors, conLineW, nodeR, 0);
  }

  function drawStars(ctx, size, rand, colors, innerPad){
    const N = Math.floor(680 + rand()*80);
    const safeMin = innerPad + 2;
    const safeMax = size - innerPad - 2;

    for (let i = 0; i < N; i++){
      const x = safeMin + rand() * (safeMax - safeMin);
      const y = safeMin + rand() * (safeMax - safeMin);

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

  // ======================
  // Export
  // ======================
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

    const mapSize = clamp(780 - Math.round(pad * 0.6), 640, 780);
    const mapX = (W - mapSize) / 2;
    const mapY = pad + 70;
    const r = mapSize / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(mapX + r, mapY + r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage($canvas, mapX, mapY, mapSize, mapSize);
    ctx.restore();

    const fontFamily = state.text.fontFamily;
    ctx.fillStyle = colors.star;
    ctx.globalAlpha = 1;

    function drawText(text, x, y, sizePx, weight=800, align="left", alpha=1){
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.font = `${weight} ${sizePx}px ${fontFamily}`;
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function metaText(text, x, y, align){
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.font = `650 14px ${fontFamily}`;
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    const show = state.visible;

    if (state.map.styleId === "minimal"){
      const left = pad + 80;

      let top = H - (pad + 64) - 160;
      top = Math.max(top, mapY + mapSize + 40);
      let ty = top;

      if (show.title) { drawText(state.text.title, left, ty + 54, 54, 900, "left", 1); ty += 54 + 10; }
      if (show.subtitle) { drawText(state.text.subtitle, left, ty + 18, 18, 600, "left", 0.85); ty += 18 + 22; }

      const metaY1 = ty + 14;
      const metaY2 = metaY1 + 20;
      const metaY3 = metaY2 + 20;

      if (show.place) metaText(state.text.place, left, metaY1, "left");
      if (show.coords) metaText(state.text.coords, left, metaY2, "left");
      if (show.datetime) metaText(state.text.datetime, left, metaY3, "left");
    } else {
      const centerX = W / 2;
      let ty = H - (pad + 90) - 80;
      if (show.subtitle) ty -= 24;

      if (show.title) { drawText(state.text.title, centerX, ty, 54, 900, "center", 1); ty += 36; }
      if (show.subtitle) { drawText(state.text.subtitle, centerX, ty, 18, 650, "center", 0.85); ty += 36; }

      const metaY1 = ty + 34;
      const metaY2 = metaY1 + 22;
      const metaY3 = metaY2 + 22;

      if (show.place) metaText(state.text.place, centerX, metaY1, "center");
      if (show.coords) metaText(state.text.coords, centerX, metaY2, "center");
      if (show.datetime) metaText(state.text.datetime, centerX, metaY3, "center");
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

  // ======================
  // Router
  // ======================
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

  // ======================
  // Init
  // ======================
  setDefaultsByStyle(state.map.styleId);
  setPosterLayout();
  applyPosterMarginLine();
  applyPosterPaddingLayout();
  setMapSizeFromPosterPad();
  applyZoom();

  renderAll();
  window.addEventListener("resize", () => drawMap());
})();
