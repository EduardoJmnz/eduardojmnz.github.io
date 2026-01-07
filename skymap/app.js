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
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    },
    map: {
      styleId: "classic",
      showConstellations: true,
      showGrid: false,
      colorTheme: "mono",
      magnitude: 4, // ✅ fijo
      seed: 12345,  // para que el render sea estable
    },
  };

  const STEPS = [
    { key: "a", label: "a) Campos" },
    { key: "b", label: "b) Mapa" },
    { key: "c", label: "c) Texto" },
    { key: "d", label: "d) Export" },
  ];

  // ✅ “otros estilos” (no solo 3)
  const MAP_STYLES = [
    { id: "classic", name: "Classic (Negro)" },
    { id: "midnight", name: "Midnight Blue" },
    { id: "sepia", name: "Sepia" },
    { id: "aurora", name: "Aurora" },
    { id: "dusk", name: "Dusk" },
    { id: "paper", name: "Paper" },
    { id: "neon", name: "Neon" },
    { id: "monoLight", name: "Mono Light" },
  ];

  // ======================
  // DOM
  // ======================
  const $tabs = document.getElementById("tabs");
  const $section = document.getElementById("sectionContainer");

  const $poster = document.getElementById("poster");
  const $canvas = document.getElementById("mapCanvas");

  const $bottomText = document.getElementById("bottomText");
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

  // Simple deterministic PRNG (mulberry32)
  function mulberry32(seed){
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function colorsFor(styleId, theme){
    const base = {
      bg: "#0B0D12",
      star: "#FFFFFF",
      muted: "rgba(255,255,255,0.75)",
      line: "rgba(255,255,255,0.20)",
    };

    const variants = {
      classic: base,
      midnight: { ...base, bg: "#071225", line: "rgba(255,255,255,0.18)" },
      sepia: { ...base, bg: "#16120C", star: "#F6E7C9", muted: "rgba(246,231,201,0.78)", line: "rgba(246,231,201,0.20)" },
      aurora: { ...base, bg: "#071018", line: "rgba(255,255,255,0.16)" },
      dusk: { ...base, bg: "#120A16", line: "rgba(255,255,255,0.18)" },
      paper: { bg: "#F4F1EA", star: "#111", muted: "rgba(0,0,0,0.72)", line: "rgba(0,0,0,0.18)" },
      neon: { ...base, bg: "#06060B", star: "#E9FF3A", muted: "rgba(233,255,58,0.78)", line: "rgba(233,255,58,0.18)" },
      monoLight: { bg: "#F7F7F7", star: "#111", muted: "rgba(0,0,0,0.72)", line: "rgba(0,0,0,0.18)" },
    };

    let c = variants[styleId] || base;

    // Theme override
    if (theme === "blue") c = { ...c, bg: "#071225" };
    if (theme === "warm") c = { ...c, bg: "#140E0A" };
    if (theme === "neon") c = { ...c, bg: "#05050A", star: "#7CFFFA", muted: "rgba(124,255,250,0.75)", line: "rgba(124,255,250,0.18)" };

    return c;
  }

  // ======================
  // Render Tabs
  // ======================
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

    // ✅ botón siguiente
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
    s.innerHTML = `Estilo, overlays y color. Magnitud fija en <b>4</b>.`;

    // style select
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
      renderPosterAndMap();
    };
    styleRow.appendChild(styleSel);

    // magnitude fixed
    const magRow = document.createElement("div");
    magRow.className = "formRow";
    magRow.innerHTML = `<div class="label">Magnitud estrellas</div>`;
    const magPill = document.createElement("div");
    magPill.className = "pill";
    magPill.textContent = "4 (fijo)";
    magRow.appendChild(magPill);

    // toggles + theme
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

    const themeRow = document.createElement("div");
    themeRow.className = "formRow";
    themeRow.style.gridColumn = "1 / -1";
    themeRow.innerHTML = `<div class="label">Tema de color</div>`;
    const themeSel = document.createElement("select");
    themeSel.className = "select";
    [
      ["mono","Mono"],
      ["blue","Azul"],
      ["warm","Cálido"],
      ["neon","Neón"],
    ].forEach(([val, name]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = name;
      themeSel.appendChild(opt);
    });
    themeSel.value = state.map.colorTheme;
    themeSel.onchange = () => {
      state.map.colorTheme = themeSel.value;
      renderPosterAndMap();
    };
    themeRow.appendChild(themeSel);
    grid.appendChild(themeRow);

    // seed button for new sky
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

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(styleRow);
    $section.appendChild(magRow);
    $section.appendChild(grid);
    $section.appendChild(seedRow);

    // ✅ botón siguiente al final
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

    $section.appendChild(t);
    $section.appendChild(s);

    $section.appendChild(inputRow("Fuente (CSS font-family)", state.text.fontFamily, (v) => {
      state.text.fontFamily = v;
      renderPosterFont();
    }));

    $section.appendChild(inputRow("Título", state.text.title, (v) => {
      state.text.title = v;
      renderPosterText();
    }));

    $section.appendChild(inputRow("Subtítulo", state.text.subtitle, (v) => {
      state.text.subtitle = v;
      renderPosterText();
    }));

    $section.appendChild(inputRow("Lugar", state.text.place, (v) => {
      state.text.place = v;
      renderPosterText();
    }));

    $section.appendChild(inputRow("Coordenadas", state.text.coords, (v) => {
      state.text.coords = v;
      renderPosterText();
    }));

    $section.appendChild(inputRow("Fecha / hora", state.text.datetime, (v) => {
      state.text.datetime = v;
      renderPosterText();
    }, "YYYY-MM-DD HH:mm"));

    $section.appendChild(inputRow("Spotify", state.text.spotify, (v) => {
      state.text.spotify = v;
      renderPosterText();
    }, "spotify:track:..."));

    // ✅ botón siguiente al final
    $section.appendChild(navButtons({
      showPrev: true,
      showNext: true,
      onPrev: () => { state.step = 1; renderAll(); },
      onNext: () => { state.step = 3; renderAll(); }
    }));
  }

  // ======================
  // Section D
  // ======================
  function renderSectionD(){
    $section.innerHTML = "";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = "d) Export";
    const s = document.createElement("div");
    s.className = "sub";
    s.innerHTML = `Preview final reducido al <b>50%</b> para que quepa en toda la pantalla.`;

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.innerHTML = `
      Aquí puedes conectar tu export real (PNG/PDF).
      <br/>Si quieres, te lo dejo con un botón que exporte el canvas + póster a PNG.
    `;

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "btn primary";
    exportBtn.textContent = "Exportar (placeholder)";
    exportBtn.onclick = () => alert("Export placeholder (conecto PNG si me lo pides).");

    const btnRow = document.createElement("div");
    btnRow.className = "navBtns";
    btnRow.appendChild(document.createElement("div"));
    const right = document.createElement("div");
    right.appendChild(exportBtn);
    btnRow.appendChild(right);

    $section.appendChild(t);
    $section.appendChild(s);
    $section.appendChild(hint);

    // ✅ botón siguiente al final (aquí lo hacemos “volver al inicio”)
    $section.appendChild(navButtons({
      showPrev: true,
      showNext: true,
      prevText: "← Anterior",
      nextText: "Volver a a) →",
      onPrev: () => { state.step = 2; renderAll(); },
      onNext: () => { state.step = 0; renderAll(); }
    }));

    $section.appendChild(btnRow);
  }

  // ======================
  // Poster render
  // ======================
  function renderPosterFont(){
    $poster.style.fontFamily = state.text.fontFamily || "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  }

  function renderPosterText(){
    // visibility
    $pTitle.style.display = state.visible.title ? "block" : "none";
    $pSubtitle.style.display = state.visible.subtitle ? "block" : "none";
    $pPlace.style.display = state.visible.place ? "block" : "none";
    $pCoords.style.display = state.visible.coords ? "block" : "none";
    $pDatetime.style.display = state.visible.datetime ? "block" : "none";
    $pSpotify.style.display = state.visible.spotify ? "block" : "none";

    // content
    $pTitle.textContent = state.text.title || "";
    $pSubtitle.textContent = state.text.subtitle || "";
    $pPlace.textContent = state.text.place || "";
    $pCoords.textContent = state.text.coords || "";
    $pDatetime.textContent = state.text.datetime || "";
    $pSpotify.textContent = state.text.spotify || "";
  }

  function renderPosterAndMap(){
    const c = colorsFor(state.map.styleId, state.map.colorTheme);
    $poster.style.background = c.bg;
    $poster.style.color = c.star;
    drawMap();
  }

  // ======================
  // Map drawing (Canvas, no pixelated image)
  // ======================
  function drawMap(){
    const size = 780;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    $canvas.width = size * dpr;
    $canvas.height = size * dpr;
    $canvas.style.width = size + "px";
    $canvas.style.height = size + "px";

    const ctx = $canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = colorsFor(state.map.styleId, state.map.colorTheme);

    // background
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, size, size);

    const rand = mulberry32(state.map.seed);

    // Stars (stable & crisp)
    const N = 700;
    for (let i = 0; i < N; i++){
      const x = rand() * size;
      const y = rand() * size;

      // sizes
      const r = (rand() < 0.92) ? (rand() * 1.2) : (1.2 + rand() * 1.6);
      const a = 0.35 + rand() * 0.65;

      ctx.beginPath();
      ctx.globalAlpha = a;
      ctx.fillStyle = colors.star;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Grid
    if (state.map.showGrid){
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      const step = Math.max(24, Math.floor(size / 10));
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

    // Constellations
    if (state.map.showConstellations){
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.9;

      const paths = 8;
      for (let p = 0; p < paths; p++){
        const points = 4 + Math.floor(rand() * 5);
        ctx.beginPath();
        for (let i = 0; i < points; i++){
          const x = (0.1 + rand() * 0.8) * size;
          const y = (0.1 + rand() * 0.8) * size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ======================
  // Main render
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

  // initial
  renderAll();

  // keep crisp on resize
  window.addEventListener("resize", () => drawMap());
})();
