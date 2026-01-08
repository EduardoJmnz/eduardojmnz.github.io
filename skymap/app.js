(() => {
  // ======================
  // State
  // ======================
  const state = {
    step: 0,

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
      // only two styles
      styleId: "minimal", // minimal | classic

      showConstellations: true,
      showGrid: false,
      colorTheme: "mono",

      // poster margin (global)
      posterMarginEnabled: false,
      posterMargin: 0, // px

      // map circle margin (inner padding inside the circle)
      mapCircleMarginEnabled: false,
      mapCircleMargin: 0, // px

      // line width
      lineWidth: 1.5,

      seed: 12345,
    },
  };

  const STEPS = [
    { key: "a", label: "a) Campos" },
    { key: "b", label: "b) Mapa" },
    { key: "c", label: "c) Texto" },
    { key: "d", label: "d) Export" },
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
      muted: "rgba(255,255,255,0.78)",
      line: "rgba(255,255,255,0.22)",
    };

    if (theme === "blue") return { ...base, bg: "#071225", line: "rgba(255,255,255,0.18)" };
    if (theme === "warm") return { ...base, bg: "#140E0A", star: "#F6E7C9", muted: "rgba(246,231,201,0.78)", line: "rgba(246,231,201,0.20)" };
    if (theme === "neon") return { ...base, bg: "#05050A", star: "#7CFFFA", muted: "rgba(124,255,250,0.75)", line: "rgba(124,255,250,0.18)" };
    return base; // mono
  }

  // ======================
  // Layout setters
  // ======================
  function setPosterLayout(){
    if (state.map.styleId === "classic") $poster.classList.add("classic");
    else $poster.classList.remove("classic");
  }

  function applyPosterMargin(){
    const pad = state.map.posterMarginEnabled ? clamp(state.map.posterMargin, 0, 140) : 0;
    $poster.style.setProperty("--posterPad", `${pad}px`);
  }

  function setDefaultsByStyle(styleId){
    // Requirement:
    // - Classic: poster margin enabled by default
    // - Minimal: poster margin disabled by default
    if (styleId === "classic") {
      state.map.posterMarginEnabled = true;
      state.map.posterMargin = state.map.posterMargin || 80;
    } else {
      state.map.posterMarginEnabled = false;
      state.map.posterMargin = 0;
    }
  }

  function setMapSizeFromPosterPad(){
    // we keep map size constant, but if pad is big we can slightly reduce to avoid tightness
    const base = 780;
    const pad = state.map.posterMarginEnabled ? clamp(state.map.posterMargin, 0, 140) : 0;
    const size = clamp(base - Math.round(pad * 0.6), 640, 780);
    $poster.style.setProperty("--mapSize", `${size}px`);
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

  // ======================
  // Section A
  // ======================
  function renderSectionA(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "a) Selector de campos visibles";
    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Activa/desactiva lo que aparecerá en el póster.";

    const grid = document.createElement("div");
    grid.className = "grid2";

    const toggles = [
      ["title", "Título"],
      ["subtitle", "Subtítulo"],
      ["place", "Lugar"],
      ["coords", "Coordenadas"],
      ["datetime", "Fecha / hora"],
    ];

    toggles.forEach(([key, label]) => {
      const row = document.createElement("label");
      row.className = "rowToggle";
      const span = document.createElement("span");
      span.textContent = label;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!state.visible[key];
      input.onchange = () => {
        state.visible[key] = input.checked;
        renderPosterText();
      };
      row.appendChild(span);
      row.appendChild(input);
      grid.appendChild(row);
    });

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(grid);

    $section.appendChild(navButtons({
      showPrev: false,
      showNext: true,
      onNext: () => { state.step = 1; renderAll(); }
    }));
  }

  // ======================
  // Section B
  // ======================
  function renderSectionB(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "b) Edición del mapa";

    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Minimalista o Clásico, color, overlays, margen del póster, margen del mapa y tamaño de línea.";

    // style (2)
    const styleRow = document.createElement("div");
    styleRow.className = "formRow";
    styleRow.innerHTML = `<div class="label">Estilo</div>`;

    const styleSel = document.createElement("select");
    styleSel.className = "select";
    MAP_STYLES.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st.id;
      opt.textContent = st.name;
      styleSel.appendChild(opt);
    });
    styleSel.value = state.map.styleId;
    styleSel.onchange = () => {
      state.map.styleId = styleSel.value;
      setDefaultsByStyle(state.map.styleId);
      setPosterLayout();
      renderPosterAndMap();
      renderAll(); // refresh UI toggles/slider enabled states
    };
    styleRow.appendChild(styleSel);

    // color (below style)
    const colorRow = document.createElement("div");
    colorRow.className = "formRow";
    colorRow.innerHTML = `<div class="label">Color del mapa</div>`;

    const colorSel = document.createElement("select");
    colorSel.className = "select";
    [
      ["mono","Mono"],
      ["blue","Azul"],
      ["warm","Cálido"],
      ["neon","Neón"],
    ].forEach(([val, name]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = name;
      colorSel.appendChild(opt);
    });
    colorSel.value = state.map.colorTheme;
    colorSel.onchange = () => {
      state.map.colorTheme = colorSel.value;
      renderPosterAndMap();
    };
    colorRow.appendChild(colorSel);

    // overlays
    const grid = document.createElement("div");
    grid.className = "grid2";

    const conRow = document.createElement("label");
    conRow.className = "rowToggle";
    conRow.innerHTML = `<span>Constelaciones</span>`;
    const conInput = document.createElement("input");
    conInput.type = "checkbox";
    conInput.checked = !!state.map.showConstellations;
    conInput.onchange = () => {
      state.map.showConstellations = conInput.checked;
      drawMap();
    };
    conRow.appendChild(conInput);

    const gridRow = document.createElement("label");
    gridRow.className = "rowToggle";
    gridRow.innerHTML = `<span>Retícula</span>`;
    const gridInput = document.createElement("input");
    gridInput.type = "checkbox";
    gridInput.checked = !!state.map.showGrid;
    gridInput.onchange = () => {
      state.map.showGrid = gridInput.checked;
      drawMap();
    };
    gridRow.appendChild(gridInput);

    grid.appendChild(conRow);
    grid.appendChild(gridRow);

    // poster margin (global)
    const posterMarginToggle = document.createElement("label");
    posterMarginToggle.className = "rowToggle";
    posterMarginToggle.style.marginTop = "10px";
    posterMarginToggle.innerHTML = `<span>Margen del póster</span>`;
    const posterMarginChk = document.createElement("input");
    posterMarginChk.type = "checkbox";
    posterMarginChk.checked = !!state.map.posterMarginEnabled;
    posterMarginChk.onchange = () => {
      state.map.posterMarginEnabled = posterMarginChk.checked;
      if (!state.map.posterMarginEnabled) state.map.posterMargin = 0;
      renderPosterAndMap();
      renderAll();
    };
    posterMarginToggle.appendChild(posterMarginChk);

    const posterMarginRow = document.createElement("div");
    posterMarginRow.className = "formRow";
    posterMarginRow.innerHTML = `<div class="label">Tamaño del margen del póster</div>`;
    const posterMarginRange = document.createElement("input");
    posterMarginRange.type = "range";
    posterMarginRange.min = "0";
    posterMarginRange.max = "140";
    posterMarginRange.value = String(state.map.posterMargin);
    posterMarginRange.disabled = !state.map.posterMarginEnabled;
    posterMarginRange.oninput = () => {
      state.map.posterMargin = Number(posterMarginRange.value);
      renderPosterAndMap();
    };
    posterMarginRow.appendChild(posterMarginRange);

    // map circle margin (inner padding)
    const mapMarginToggle = document.createElement("label");
    mapMarginToggle.className = "rowToggle";
    mapMarginToggle.style.marginTop = "10px";
    mapMarginToggle.innerHTML = `<span>Margen alrededor del mapa (círculo)</span>`;
    const mapMarginChk = document.createElement("input");
    mapMarginChk.type = "checkbox";
    mapMarginChk.checked = !!state.map.mapCircleMarginEnabled;
    mapMarginChk.onchange = () => {
      state.map.mapCircleMarginEnabled = mapMarginChk.checked;
      if (!state.map.mapCircleMarginEnabled) state.map.mapCircleMargin = 0;
      drawMap();
      renderAll();
    };
    mapMarginToggle.appendChild(mapMarginChk);

    const mapMarginRow = document.createElement("div");
    mapMarginRow.className = "formRow";
    mapMarginRow.innerHTML = `<div class="label">Tamaño del margen del mapa</div>`;
    const mapMarginRange = document.createElement("input");
    mapMarginRange.type = "range";
    mapMarginRange.min = "0";
    mapMarginRange.max = "90";
    mapMarginRange.value = String(state.map.mapCircleMargin);
    mapMarginRange.disabled = !state.map.mapCircleMarginEnabled;
    mapMarginRange.oninput = () => {
      state.map.mapCircleMargin = Number(mapMarginRange.value);
      drawMap();
    };
    mapMarginRow.appendChild(mapMarginRange);

    // line width
    const lwRow = document.createElement("div");
    lwRow.className = "formRow";
    lwRow.innerHTML = `<div class="label">Tamaño de línea</div>`;
    const lwRange = document.createElement("input");
    lwRange.type = "range";
    lwRange.min = "1";
    lwRange.max = "4";
    lwRange.step = "0.5";
    lwRange.value = String(state.map.lineWidth);
    lwRange.oninput = () => {
      state.map.lineWidth = Number(lwRange.value);
      drawMap();
    };
    lwRow.appendChild(lwRange);

    // new sky
    const seedRow = document.createElement("div");
    seedRow.className = "formRow";
    seedRow.innerHTML = `<div class="label">Variación del cielo</div>`;
    const seedBtn = document.createElement("button");
    seedBtn.type = "button";
    seedBtn.className = "btn ghost";
    seedBtn.textContent = "Generar nuevo cielo";
    seedBtn.onclick = () => {
      state.map.seed = (Math.random() * 1e9) | 0;
      drawMap();
    };
    seedRow.appendChild(seedBtn);

    // mount
    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(styleRow);
    $section.appendChild(colorRow);
    $section.appendChild(grid);

    $section.appendChild(posterMarginToggle);
    $section.appendChild(posterMarginRow);

    $section.appendChild(mapMarginToggle);
    $section.appendChild(mapMarginRow);

    $section.appendChild(lwRow);
    $section.appendChild(seedRow);

    $section.appendChild(navButtons({
      showPrev: true,
      showNext: true,
      onPrev: () => { state.step = 0; renderAll(); },
      onNext: () => { state.step = 2; renderAll(); }
    }));
  }

  // ======================
  // Section C
  // ======================
  function renderSectionC(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "c) Editor de texto";
    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = "Edita contenido y tipografía.";

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

    // font selector
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

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(fontRow);

    $section.appendChild(inputRow("Título", state.text.title, (v) => { state.text.title = v; renderPosterText(); }));
    $section.appendChild(inputRow("Subtítulo", state.text.subtitle, (v) => { state.text.subtitle = v; renderPosterText(); }));
    $section.appendChild(inputRow("Lugar", state.text.place, (v) => { state.text.place = v; renderPosterText(); }));
    $section.appendChild(inputRow("Coordenadas", state.text.coords, (v) => { state.text.coords = v; renderPosterText(); }));
    $section.appendChild(inputRow("Fecha / hora", state.text.datetime, (v) => { state.text.datetime = v; renderPosterText(); }, "YYYY-MM-DD HH:mm"));

    $section.appendChild(navButtons({
      showPrev: true,
      showNext: true,
      onPrev: () => { state.step = 1; renderAll(); },
      onNext: () => { state.step = 3; renderAll(); }
    }));
  }

  // ======================
  // Export
  // ======================
  function renderSectionD(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "d) Exportar";

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

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(formatRow);

    // ✅ sin botón "volver a a)"
    $section.appendChild(navButtons({
      showPrev: true,
      showNext: false,
      onPrev: () => { state.step = 2; renderAll(); }
    }));

    const bottom = document.createElement("div");
    bottom.className = "navBtns";
    bottom.appendChild(document.createElement("div"));
    const right = document.createElement("div");
    right.appendChild(exportBtn);
    bottom.appendChild(right);
    $section.appendChild(bottom);
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
    applyPosterMargin();
    setMapSizeFromPosterPad();

    drawMap();
  }

  // ======================
  // Constellations (simple + clean)
  // ======================
  function drawConstellations(ctx, size, rand, colors, lw, innerPad){
    // generate constellations within inner circle bounds (avoid margin ring)
    const count = 6;
    ctx.save();
    ctx.lineWidth = lw;
    ctx.strokeStyle = colors.line;
    ctx.fillStyle = colors.star;

    const safeMin = innerPad + 36;
    const safeMax = size - innerPad - 36;

    for (let c = 0; c < count; c++){
      const cx = safeMin + rand() * (safeMax - safeMin);
      const cy = safeMin + rand() * (safeMax - safeMin);

      const points = 4 + Math.floor(rand() * 4); // 4..7
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

      // sort around centroid for clean chain
      const mx = pts.reduce((s,p)=>s+p.x,0)/pts.length;
      const my = pts.reduce((s,p)=>s+p.y,0)/pts.length;
      pts.sort((p1,p2)=>Math.atan2(p1.y-my,p1.x-mx)-Math.atan2(p2.y-my,p2.x-mx));

      // polyline
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      // nodes
      ctx.globalAlpha = 0.95;
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2);
        ctx.fill();
      });

      // optional single branch
      if (pts.length >= 5 && rand() > 0.55){
        const base = pts[Math.floor(rand()*pts.length)];
        const bx = clamp(base.x + (rand()-0.5)*140, safeMin, safeMax);
        const by = clamp(base.y + (rand()-0.5)*140, safeMin, safeMax);

        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.lineTo(bx, by);
        ctx.stroke();

        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(bx, by, 2.0, 0, Math.PI*2);
        ctx.fill();
      }
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

    // inner padding inside circle (map circle margin)
    const innerPad = state.map.mapCircleMarginEnabled ? clamp(state.map.mapCircleMargin, 0, 90) : 0;

    // background
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, size, size);

    // If map circle margin enabled, we "reserve" a ring by clipping to inner circle
    if (innerPad > 0){
      ctx.save();
      const r = (size / 2) - innerPad;
      ctx.beginPath();
      ctx.arc(size/2, size/2, r, 0, Math.PI*2);
      ctx.clip();

      drawStars(ctx, size, rand, colors, innerPad);

      // overlays inside clip
      if (state.map.showGrid) drawGrid(ctx, size, colors, state.map.lineWidth);
      if (state.map.showConstellations) drawConstellations(ctx, size, rand, colors, state.map.lineWidth, innerPad);

      ctx.restore();

      // redraw ring background (clean edge already bg), optional subtle ring line:
      // ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(size/2,size/2,(size/2)-innerPad,0,Math.PI*2); ctx.stroke();
      return;
    }

    // no inner margin
    drawStars(ctx, size, rand, colors, 0);
    if (state.map.showGrid) drawGrid(ctx, size, colors, state.map.lineWidth);
    if (state.map.showConstellations) drawConstellations(ctx, size, rand, colors, state.map.lineWidth, 0);
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

  function drawGrid(ctx, size, colors, lw){
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = lw;
    const step = Math.max(26, Math.floor(size / 10));
    for (let x = step; x < size; x += step){
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = step; y < size; y += step){
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
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

    // bg
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);

    // poster pad influences positions (matches preview)
    const pad = state.map.posterMarginEnabled ? clamp(state.map.posterMargin, 0, 140) : 0;

    // map size from pad
    const mapSize = clamp(780 - Math.round(pad * 0.6), 640, 780);
    const mapX = (W - mapSize) / 2;
    const mapY = pad + 70;
    const r = mapSize / 2;

    // clip circle and draw current map canvas scaled to mapSize
    ctx.save();
    ctx.beginPath();
    ctx.arc(mapX + r, mapY + r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage($canvas, mapX, mapY, mapSize, mapSize);
    ctx.restore();

    // font
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
      const left = pad + 80, right = W - (pad + 80);

      // place text block near bottom (consistent with preview)
      let top = H - (pad + 64) - 120;
      top = Math.max(top, mapY + mapSize + 40);
      let ty = top;

      if (show.title) { drawText(state.text.title, left, ty + 54, 54, 900, "left", 1); ty += 54 + 10; }
      if (show.subtitle) { drawText(state.text.subtitle, left, ty + 18, 18, 600, "left", 0.85); ty += 18 + 22; }

      const metaY1 = ty + 14;
      const metaY2 = metaY1 + 20;

      if (show.place) metaText(state.text.place, left, metaY1, "left");
      if (show.coords) metaText(state.text.coords, left, metaY2, "left");

      if (show.datetime) metaText(state.text.datetime, right, metaY1, "right");
    } else {
      const centerX = W / 2;
      let ty = H - (pad + 90) - 60;
      if (show.subtitle) ty -= 24;

      if (show.title) { drawText(state.text.title, centerX, ty, 54, 900, "center", 1); ty += 36; }
      if (show.subtitle) { drawText(state.text.subtitle, centerX, ty, 18, 650, "center", 0.85); ty += 36; }

      const gap = 170;
      const leftX = centerX - gap;
      const rightX = centerX + gap;

      const metaY1 = ty + 30;
      const metaY2 = metaY1 + 22;

      if (show.place) metaText(state.text.place, leftX, metaY1, "center");
      if (show.coords) metaText(state.text.coords, leftX, metaY2, "center");

      if (show.datetime) metaText(state.text.datetime, rightX, metaY1, "center");
    }

    if (format === "png" || format === "jpg"){
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const quality = format === "jpg" ? 0.95 : undefined;
      const url = out.toDataURL(mime, quality);
      downloadDataURL(url, `poster.${format}`);
      return;
    }

    // pdf via print
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
  // Section Router
  // ======================
  function renderSection(){
    if (state.step === 0) return renderSectionA();
    if (state.step === 1) return renderSectionB();
    if (state.step === 2) return renderSectionC();
    return renderSectionD();
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
  // enforce defaults on load
  setDefaultsByStyle(state.map.styleId);
  setPosterLayout();
  applyPosterMargin();
  setMapSizeFromPosterPad();

  renderAll();
  window.addEventListener("resize", () => drawMap());
})();
