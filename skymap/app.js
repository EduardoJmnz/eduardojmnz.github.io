(() => {
  // ======================
  // State
  // ======================
  const state = {
    step: 0, // 0..3

    visible: {
      title: true,
      subtitle: true,
      place: true,
      coords: true,
      datetime: true,
      spotify: true,
    },

    text: {
      title: "NIGHT SKY",
      subtitle: "A moment to remember",
      place: "Mexico City, MX",
      coords: "19.4326, -99.1332",
      datetime: "2026-01-07 19:30",
      spotify: "spotify:track:xxxx",
      fontKey: "system",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    },

    map: {
      // ✅ Solo 2 estilos
      styleId: "minimal", // minimal | classic
      // overlays
      showConstellations: true,
      showGrid: false,
      // color theme (se mantiene como lo tenías)
      colorTheme: "mono",
      // ✅ quitar magnitud (implícito 4)
      // ✅ margen del mapa
      mapMarginEnabled: false,
      mapMargin: 0, // px
      // ✅ tamaño de línea
      lineWidth: 1.5,
      // estable
      seed: 12345,
    },
  };

  const STEPS = [
    { key: "a", label: "a) Campos" },
    { key: "b", label: "b) Mapa" },
    { key: "c", label: "c) Texto" },
    { key: "d", label: "d) Export" },
  ];

  // ✅ Estilos (2)
  const MAP_STYLES = [
    { id: "minimal", name: "Minimalista" },
    { id: "classic", name: "Clásico" },
  ];

  // ✅ Fuentes (selector)
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
  const $pSpotify = document.getElementById("pSpotify");

  // ======================
  // Utils
  // ======================
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  // deterministic PRNG (mulberry32)
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

  function setPosterLayout(){
    // ✅ estilo "clásico" = textos centrados
    if (state.map.styleId === "classic") $poster.classList.add("classic");
    else $poster.classList.remove("classic");
  }

  function setMapSizeFromMargin(){
    // base map size 780, margin reduce circle size
    const base = 780;
    const margin = state.map.mapMarginEnabled ? clamp(state.map.mapMargin, 0, 120) : 0;
    const size = clamp(base - margin * 2, 520, 780);
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
      ["spotify", "Spotify"],
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
    s.textContent = "Minimalista o Clásico, overlays, margen del mapa y tamaño de línea.";

    // Estilo (solo 2)
    const styleRow = document.createElement("div");
    styleRow.className = "formRow";
    styleRow.innerHTML = `<div class="label">Estilo de mapa</div>`;

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
      setPosterLayout();
      renderPosterAndMap();
    };
    styleRow.appendChild(styleSel);

    // ✅ debajo del preview (aquí: debajo del estilo), selector de color
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

    // ✅ margen mapa: toggle + slider
    const marginRow = document.createElement("div");
    marginRow.className = "formRow";
    marginRow.innerHTML = `<div class="label">Margen del mapa estelar</div>`;

    const marginToggle = document.createElement("label");
    marginToggle.className = "rowToggle";
    marginToggle.style.marginBottom = "10px";
    marginToggle.innerHTML = `<span>Activar margen</span>`;
    const marginChk = document.createElement("input");
    marginChk.type = "checkbox";
    marginChk.checked = !!state.map.mapMarginEnabled;
    marginChk.onchange = () => {
      state.map.mapMarginEnabled = marginChk.checked;
      if (!state.map.mapMarginEnabled) state.map.mapMargin = 0;
      setMapSizeFromMargin();
      drawMap();
    };
    marginToggle.appendChild(marginChk);

    const marginRange = document.createElement("input");
    marginRange.type = "range";
    marginRange.min = "0";
    marginRange.max = "120";
    marginRange.value = String(state.map.mapMargin);
    marginRange.disabled = !state.map.mapMarginEnabled;
    marginRange.oninput = () => {
      state.map.mapMargin = Number(marginRange.value);
      setMapSizeFromMargin();
      drawMap();
    };

    // helper text
    const marginHint = document.createElement("div");
    marginHint.className = "sub";
    marginHint.style.marginTop = "6px";
    marginHint.textContent = "A mayor margen, el círculo del mapa se hace más pequeño.";

    // ✅ tamaño de línea
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

    $section.appendChild(marginToggle);
    $section.appendChild(marginRow);
    marginRow.appendChild(marginRange);
    marginRow.appendChild(marginHint);

    $section.appendChild(lwRow);
    $section.appendChild(seedRow);

    // next
    $section.appendChild(navButtons({
      showPrev: true,
      showNext: true,
      onPrev: () => { state.step = 0; renderAll(); },
      onNext: () => { state.step = 2; renderAll(); }
    }));

    // refresh enable state for slider
    marginRange.disabled = !state.map.mapMarginEnabled;
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

    // ✅ selector de fuente
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
    $section.appendChild(inputRow("Spotify", state.text.spotify, (v) => { state.text.spotify = v; renderPosterText(); }, "spotify:track:..."));

    $section.appendChild(navButtons({
      showPrev: true,
      showNext: true,
      onPrev: () => { state.step = 1; renderAll(); },
      onNext: () => { state.step = 3; renderAll(); }
    }));
  }

  // ======================
  // Section D (Export)
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

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "btn primary";
    exportBtn.textContent = "Exportar";
    exportBtn.onclick = () => exportPoster(formatSel.value);

    formatRow.appendChild(formatSel);

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(formatRow);

    // Botones
    $section.appendChild(navButtons({
      showPrev: true,
      showNext: true,
      nextText: "Volver a a) →",
      onPrev: () => { state.step = 2; renderAll(); },
      onNext: () => { state.step = 0; renderAll(); }
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
    $pSpotify.style.display = state.visible.spotify ? "block" : "none";

    $pTitle.textContent = state.text.title || "";
    $pSubtitle.textContent = state.text.subtitle || "";
    $pPlace.textContent = state.text.place || "";
    $pCoords.textContent = state.text.coords || "";
    $pDatetime.textContent = state.text.datetime || "";
    $pSpotify.textContent = state.text.spotify || "";
  }

  function renderPosterAndMap(){
    const c = colorsFor(state.map.colorTheme);
    $poster.style.background = c.bg;
    $poster.style.color = c.star;
    setPosterLayout();
    setMapSizeFromMargin();
    drawMap();
  }

  // ======================
  // Constellations (simple + clean, no scribbles)
  // ======================
  function drawConstellations(ctx, size, rand, colors, lw){
    // constellations as: clusters of points + polyline connections in a sorted order
    const count = 6; // number of constellations
    ctx.save();
    ctx.lineWidth = lw;
    ctx.strokeStyle = colors.line;
    ctx.fillStyle = colors.star;

    for (let c = 0; c < count; c++){
      const cx = (0.15 + rand() * 0.7) * size;
      const cy = (0.15 + rand() * 0.7) * size;

      const points = 4 + Math.floor(rand() * 4); // 4..7
      const pts = [];

      // generate points around a center (elliptical)
      const rx = 40 + rand() * 120;
      const ry = 40 + rand() * 120;

      for (let i = 0; i < points; i++){
        const a = rand() * Math.PI * 2;
        const r1 = 0.35 + rand() * 0.75;
        const x = clamp(cx + Math.cos(a) * rx * r1, 40, size - 40);
        const y = clamp(cy + Math.sin(a) * ry * r1, 40, size - 40);
        pts.push({ x, y });
      }

      // sort points by angle around centroid for clean polygon-like chain
      const mx = pts.reduce((s,p)=>s+p.x,0)/pts.length;
      const my = pts.reduce((s,p)=>s+p.y,0)/pts.length;
      pts.sort((p1,p2)=>Math.atan2(p1.y-my,p1.x-mx)-Math.atan2(p2.y-my,p2.x-mx));

      // draw connections (polyline)
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // draw brighter constellation stars at nodes
      ctx.globalAlpha = 0.95;
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2);
        ctx.fill();
      });

      // optional: a short branch from one node (simple, not scribble)
      if (pts.length >= 5 && rand() > 0.55){
        const base = pts[Math.floor(rand()*pts.length)];
        const bx = clamp(base.x + (rand()-0.5)*140, 30, size-30);
        const by = clamp(base.y + (rand()-0.5)*140, 30, size-30);
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
  // Map drawing (Canvas)
  // ======================
  function drawMap(){
    // The canvas should match CSS variable size
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

    // background
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, size, size);

    // stars (crisp)
    const N = Math.floor(680 + rand()*80);
    for (let i = 0; i < N; i++){
      const x = rand() * size;
      const y = rand() * size;

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

    // grid
    if (state.map.showGrid){
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = state.map.lineWidth;
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

    // constellations (simple + clean)
    if (state.map.showConstellations){
      drawConstellations(ctx, size, rand, colors, state.map.lineWidth);
    }

    ctx.globalAlpha = 1;
  }

  // ======================
  // Export (PNG/JPG direct, PDF via print)
  // ======================
  function exportPoster(format){
    // Render to offscreen canvas at poster size
    const W = 900, H = 1200;
    const scale = 2; // export sharper
    const out = document.createElement("canvas");
    out.width = W * scale;
    out.height = H * scale;

    const ctx = out.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const colors = colorsFor(state.map.colorTheme);

    // background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);

    // map circle
    const mapSize = parseFloat(getComputedStyle($poster).getPropertyValue("--mapSize")) || 780;
    const mapX = (W - mapSize) / 2;
    const mapY = 70; // like posterInner padding-top
    const r = mapSize / 2;

    // clip circle and draw current map canvas
    ctx.save();
    ctx.beginPath();
    ctx.arc(mapX + r, mapY + r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage($canvas, mapX, mapY, mapSize, mapSize);
    ctx.restore();

    // text styles
    ctx.fillStyle = colors.star;
    ctx.globalAlpha = 1;

    const fontFamily = state.text.fontFamily;
    const show = state.visible;

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

    if (state.map.styleId === "minimal"){
      // bottom aligned, like UI
      const left = 80, right = W - 80;
      let y = H - 64;

      // meta rows start from bottom upwards? We'll keep same spacing top-down inside block
      const blockBottom = y;
      // draw from top of block
      let top = blockBottom - 22 - 14*2 - 6 - 10 - 18 - 10; // approx; doesn't need perfect
      top = Math.max(top, mapY + mapSize + 40);

      let ty = top;

      if (show.title) { drawText(state.text.title, left, ty + 54, 54, 900, "left", 1); ty += 54 + 10; }
      if (show.subtitle) { drawText(state.text.subtitle, left, ty + 18, 18, 600, "left", 0.85); ty += 18 + 22; }

      // meta lines
      const metaY1 = ty + 14;
      const metaY2 = metaY1 + 20;

      if (show.place) metaText(state.text.place, left, metaY1, "left");
      if (show.coords) metaText(state.text.coords, left, metaY2, "left");

      if (show.datetime) metaText(state.text.datetime, right, metaY1, "right");
      if (show.spotify) metaText(state.text.spotify, right, metaY2, "right");
    } else {
      // classic centered with margin
      const centerX = W / 2;
      const marginLR = 110;
      let y = H - 90; // like CSS

      // title/subtitle above meta
      let ty = y - 60; // move up
      if (show.subtitle) ty -= 24;

      if (show.title) { drawText(state.text.title, centerX, ty, 54, 900, "center", 1); ty += 36; }
      if (show.subtitle) { drawText(state.text.subtitle, centerX, ty, 18, 650, "center", 0.85); ty += 36; }

      // meta in two columns but centered
      const gap = 170;
      const leftX = centerX - gap;
      const rightX = centerX + gap;

      const metaY1 = ty + 30;
      const metaY2 = metaY1 + 22;

      if (show.place) metaText(state.text.place, leftX, metaY1, "center");
      if (show.coords) metaText(state.text.coords, leftX, metaY2, "center");

      if (show.datetime) metaText(state.text.datetime, rightX, metaY1, "center");
      if (show.spotify) metaText(state.text.spotify, rightX, metaY2, "center");
    }

    // output
    if (format === "png" || format === "jpg"){
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const quality = format === "jpg" ? 0.95 : undefined;
      const url = out.toDataURL(mime, quality);
      downloadDataURL(url, `poster.${format}`);
      return;
    }

    // pdf: open printable window (user: Save as PDF)
    const url = out.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) {
      alert("Bloqueaste popups. Permite ventanas emergentes para exportar PDF.");
      return;
    }
    w.document.write(`
      <html><head><title>Poster PDF</title>
      <style>
        html,body{margin:0;padding:0;}
        img{width:100%;height:auto;display:block;}
      </style>
      </head><body>
        <img src="${url}" />
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
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
  renderAll();
  window.addEventListener("resize", () => drawMap());
})();
