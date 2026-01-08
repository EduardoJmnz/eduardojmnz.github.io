(() => {
  // ======================
  // State
  // ======================
  const state = {
    step: 0,

    ui: {
      zoom: 0.75,     // ✅ default 75%
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
      showGrid: false,
      colorTheme: "mono",

      // Layout padding (opcional) + visible margin line (lo que tú llamas “margen”)
      posterMarginEnabled: false,
      posterMargin: 80, // slider value; for classic default

      // Map circle margin line
      mapCircleMarginEnabled: false,
      mapCircleMargin: 24,

      // ✅ rename: affects constellation thickness + nodes + grid thickness
      constellationSize: 2.0,

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

  // ======================
  // Zoom (✅ working)
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
  // Layout + “margen” (líneas)
  // ======================
  function setPosterLayout(){
    if (state.map.styleId === "classic") $poster.classList.add("classic");
    else $poster.classList.remove("classic");
  }

  function setDefaultsByStyle(styleId){
    // Classic: margin line ON by default
    // Minimal: margin line OFF by default
    if (styleId === "classic") {
      state.map.posterMarginEnabled = true;
      if (!state.map.posterMargin || state.map.posterMargin < 20) state.map.posterMargin = 80;
    } else {
      state.map.posterMarginEnabled = false;
    }
  }

  function applyPosterMarginLine(){
    // ✅ línea rectangular del margen (esto es el “margen” que pediste)
    const inset = state.map.posterMarginEnabled ? clamp(state.map.posterMargin, 0, 140) : 0;
    $poster.style.setProperty("--posterMarginLine", `${inset}px`);
    if (state.map.posterMarginEnabled && inset > 0) $poster.classList.add("showPosterMargin");
    else $poster.classList.remove("showPosterMargin");
  }

  function applyPosterPaddingLayout(){
    // (Esto es opcional; lo dejo igual que antes porque comentaste que está bien que se junten)
    const pad = state.map.posterMarginEnabled ? clamp(state.map.posterMargin, 0, 140) : 0;
    $poster.style.setProperty("--posterPad", `${pad}px`);
  }

  function setMapSizeFromPosterPad(){
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
    s.textContent = "Estilo, color, constelaciones, retícula tipo globo y márgenes con línea.";

    // style
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
      renderAll();
    };
    styleRow.appendChild(styleSel);

    // color
    const colorRow = document.createElement("div");
    colorRow.className = "formRow";
    colorRow.innerHTML = `<div class="label">Color del mapa</div>`;
    const colorSel = document.createElement("select");
    colorSel.className = "select";
    [["mono","Mono"],["blue","Azul"],["warm","Cálido"],["neon","Neón"]].forEach(([val, name]) => {
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

    // toggles
    const grid = document.createElement("div");
    grid.className = "grid2";

    const conRow = document.createElement("label");
    conRow.className = "rowToggle";
    conRow.innerHTML = `<span>Constelaciones</span>`;
    const conInput = document.createElement("input");
    conInput.type = "checkbox";
    conInput.checked = !!state.map.showConstellations;
    conInput.onchange = () => { state.map.showConstellations = conInput.checked; drawMap(); };
    conRow.appendChild(conInput);

    const gridRow = document.createElement("label");
    gridRow.className = "rowToggle";
    gridRow.innerHTML = `<span>Retícula (globo)</span>`;
    const gridInput = document.createElement("input");
    gridInput.type = "checkbox";
    gridInput.checked = !!state.map.showGrid;
    gridInput.onchange = () => { state.map.showGrid = gridInput.checked; drawMap(); };
    gridRow.appendChild(gridInput);

    grid.appendChild(conRow);
    grid.appendChild(gridRow);

    // poster margin (LINE)
    const posterMarginToggle = document.createElement("label");
    posterMarginToggle.className = "rowToggle";
    posterMarginToggle.style.marginTop = "10px";
    posterMarginToggle.innerHTML = `<span>Margen del póster (línea)</span>`;
    const posterMarginChk = document.createElement("input");
    posterMarginChk.type = "checkbox";
    posterMarginChk.checked = !!state.map.posterMarginEnabled;
    posterMarginChk.onchange = () => {
      state.map.posterMarginEnabled = posterMarginChk.checked;
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

    // map circle margin (LINE)
    const mapMarginToggle = document.createElement("label");
    mapMarginToggle.className = "rowToggle";
    mapMarginToggle.style.marginTop = "10px";
    mapMarginToggle.innerHTML = `<span>Margen del mapa (línea circular)</span>`;
    const mapMarginChk = document.createElement("input");
    mapMarginChk.type = "checkbox";
    mapMarginChk.checked = !!state.map.mapCircleMarginEnabled;
    mapMarginChk.onchange = () => { state.map.mapCircleMarginEnabled = mapMarginChk.checked; drawMap(); renderAll(); };
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
    mapMarginRange.oninput = () => { state.map.mapCircleMargin = Number(mapMarginRange.value); drawMap(); };
    mapMarginRow.appendChild(mapMarginRange);

    // ✅ constellation size
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

    $section.appendChild(csRow);
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
  // Export (✅ aligned same row)
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

    const actions = document.createElement("div");
    actions.className = "navBtns";

    const left = document.createElement("div");
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn ghost";
    prev.textContent = "← Anterior";
    prev.onclick = () => { state.step = 2; renderAll(); };
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

    // ✅ “margen” = línea
    applyPosterMarginLine();

    // layout interno (si quieres que NO mueva layout, lo quitas aquí)
    applyPosterPaddingLayout();
    setMapSizeFromPosterPad();

    drawMap();
  }

  // ======================
  // Globe grid
  // ======================
  function drawGlobeGrid(ctx, size, colors, lineW, innerPad){
    const cx = size / 2;
    const cy = size / 2;
    const r = (size / 2) - innerPad - 2;

    ctx.save();
    ctx.strokeStyle = colors.line;

    function strokeEllipse(x, y, rx, ry, lw, alpha){
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const latDegs = [-66.5, -23.5, 0, 23.5, 66.5];
    latDegs.forEach((deg) => {
      const a = (deg * Math.PI) / 180;
      const y = cy + Math.sin(a) * r * 0.72;
      const rx = Math.cos(a) * r;
      const ry = Math.max(10, rx * 0.18);
      const isEquator = Math.abs(deg) < 0.001;
      strokeEllipse(cx, y, rx, ry, isEquator ? (lineW + 0.7) : lineW, isEquator ? 0.55 : 0.35);
    });

    const meridians = 8;
    for (let i = 0; i < meridians; i++){
      const deg = (i * 180) / meridians;
      const a = (deg * Math.PI) / 180;
      const x = cx + Math.sin(a) * r * 0.72;
      const ry = r;
      const rx = Math.max(10, ry * 0.18);
      const isPrime = i === 0;
      strokeEllipse(x, cy, rx, ry, isPrime ? (lineW + 0.3) : lineW, isPrime ? 0.42 : 0.28);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
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
  // Map drawing (with visible circle margin line)
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

    const innerPad = state.map.mapCircleMarginEnabled ? clamp(state.map.mapCircleMargin, 0, 90) : 0;

    const cs = clamp(state.map.constellationSize, 1, 4);
    const lineW = 0.9 + cs * 0.55;
    const nodeR = 1.6 + cs * 0.35;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, size, size);

    // ✅ visible “margen” circular: línea
    if (innerPad > 0){
      const innerR = (size / 2) - innerPad;

      ctx.save();
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = Math.max(1, lineW * 0.9);
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(size/2, size/2, innerR, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.beginPath();
      ctx.arc(size/2, size/2, innerR, 0, Math.PI*2);
      ctx.clip();

      drawStars(ctx, size, rand, colors, innerPad);

      if (state.map.showGrid) drawGlobeGrid(ctx, size, colors, Math.max(1, lineW * 0.85), innerPad);
      if (state.map.showConstellations) drawConstellations(ctx, size, rand, colors, lineW, nodeR, innerPad);

      ctx.restore();
      return;
    }

    drawStars(ctx, size, rand, colors, 0);
    if (state.map.showGrid) drawGlobeGrid(ctx, size, colors, Math.max(1, lineW * 0.85), 0);
    if (state.map.showConstellations) drawConstellations(ctx, size, rand, colors, lineW, nodeR, 0);
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

    const pad = state.map.posterMarginEnabled ? clamp(state.map.posterMargin, 0, 140) : 0;

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
  setDefaultsByStyle(state.map.styleId);
  setPosterLayout();
  applyPosterMarginLine();
  applyPosterPaddingLayout();
  setMapSizeFromPosterPad();
  applyZoom(); // ✅ sets 75% and updates label

  renderAll();
  window.addEventListener("resize", () => drawMap());
})();
