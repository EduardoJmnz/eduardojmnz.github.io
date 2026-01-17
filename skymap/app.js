(() => {
  const POSTER_W = 900;
  const POSTER_H = 1200;

  const POSTER_FRAME_EDGE_GAP_PX = 0;
  const POSTER_MARGIN_EDGE_GAP_PX = 50;

  const POSTER_FRAME_PCT_MAX = 0.06;
  const POSTER_FRAME_PCT_DEFAULT = POSTER_FRAME_PCT_MAX;

  const POSTER_MARGIN_THICKNESS_FIXED = 4;
  const OUTLINE_THICKNESS_FIXED = 4;

  const TITLE_MAX = 120;
  const SUB_MAX = 240;

  const state = {
    step: 0,
    visible: { title: true, subtitle: true, place: true, coords: true, datetime: true },

    text: {
      title: "NIGHT SKY",
      subtitle: "A moment to remember",
      place: "Mexico City, MX",
      coords: "19.4326, -99.1332",
      date: "1995-12-25",
      time: "19:30",
      fontKey: "system",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    },

    map: {
      styleId: "classic",
      showGrid: false,
      gridOpacity: 0.6,
      showConstellations: true,
      colorTheme: "mono",
      mapZoom: 1,
      backgroundMode: "match",

      posterFrameEnabled: false,
      posterFramePct: POSTER_FRAME_PCT_DEFAULT,
      posterFrameInsetPx: Math.round(POSTER_W * POSTER_FRAME_PCT_DEFAULT),

      posterMarginEnabled: true,
      posterMarginThickness: POSTER_MARGIN_THICKNESS_FIXED,

      mapCircleMarginEnabled: true,
      mapCircleInsetPct: 0.1,
      mapCircleMarginThickness: OUTLINE_THICKNESS_FIXED,

      constellationSize: 2,
      seed: 12345,

      stylePrefs: {
        classic: { frame: false, margin: true, outline: true },
        moderno: { frame: false, margin: false, outline: false },
        poster: { frame: false, margin: false, outline: false },
        romantico: { frame: false, margin: false, outline: true },
      }
    },

    export: {
      sizeKey: "digital_900x1200",
      format: "png",
      dpi: 300,
    }
  };

  /* ------------------------------------------------------------------ */
  /* --------------------- UTILIDADES GENERALES ------------------------ */
  /* ------------------------------------------------------------------ */

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

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

  /* ------------------------------------------------------------------ */
  /* --------------------- DOM REFERENCES ------------------------------ */
  /* ------------------------------------------------------------------ */

  const $poster = document.getElementById("poster");
  const $canvas = document.getElementById("mapCanvas");

  const $pTitle = document.getElementById("pTitle");
  const $pSubtitle = document.getElementById("pSubtitle");
  const $pPlace = document.getElementById("pPlace");
  const $pCoords = document.getElementById("pCoords");
  const $pDatetime = document.getElementById("pDatetime");

  /* ------------------------------------------------------------------ */
  /* --------------------- ESTILOS ------------------------------------- */
  /* ------------------------------------------------------------------ */

  function isModern(){ return state.map.styleId === "moderno"; }
  function isPoster(){ return state.map.styleId === "poster"; }

  function renderPosterText(){
    const show = state.visible;

    [$pTitle, $pSubtitle, $pPlace, $pCoords, $pDatetime].forEach(el => {
      el.style.fontFamily = state.text.fontFamily;
    });

    $pTitle.textContent = state.text.title;
    $pSubtitle.textContent = state.text.subtitle;
    $pPlace.textContent = state.text.place;
    $pCoords.textContent = state.text.coords;
    $pDatetime.textContent = `${state.text.date} ${state.text.time}`;

    $pTitle.style.display = show.title ? "block" : "none";
    $pSubtitle.style.display = show.subtitle ? "block" : "none";
    $pPlace.style.display = show.place ? "block" : "none";
    $pCoords.style.display = show.coords ? "block" : "none";
    $pDatetime.style.display = show.datetime ? "block" : "none";
  }

  /* ------------------------------------------------------------------ */
  /* --------------------- EXPORT 1:1 CON PREVIEW ---------------------- */
  /* ------------------------------------------------------------------ */

  function cmToPx(cm, dpi){
    return Math.round((cm / 2.54) * dpi);
  }

  function downloadDataURL(url, name){
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function loadJsPDF(){
    if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;

    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      s.onload = () => res(window.jspdf.jsPDF);
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function downloadPDFfromCanvas(canvas, W, H, dpi, filename){
    const jsPDF = await loadJsPDF();

    const imgURL = canvas.toDataURL("image/jpeg", 0.98);
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = imgURL; });

    const pdf = new jsPDF({
      unit: "px",
      format: [W, H],
      orientation: W > H ? "l" : "p",
      hotfixes: ["px_scaling"]
    });

    pdf.addImage(img, "JPEG", 0, 0, W, H, undefined, "FAST");
    pdf.save(filename);
  }

  /* ------------------------------------------------------------------ */
  /* --------------------- EXPORT PRINCIPAL ---------------------------- */
  /* ------------------------------------------------------------------ */

  async function exportPoster(format, sizeKey){
    const sizes = {
      digital_900x1200: { w: 900, h: 1200, type: "px" },
      "45x60cm_300dpi": { w: 45, h: 60, type: "cm" },
      "60x80cm_300dpi": { w: 60, h: 80, type: "cm" },
      "90x120cm_300dpi": { w: 90, h: 120, type: "cm" }
    };

    const dpi = state.export.dpi;
    const sz = sizes[sizeKey];

    const W = sz.type === "px" ? sz.w : cmToPx(sz.w, dpi);
    const H = sz.type === "px" ? sz.h : cmToPx(sz.h, dpi);

    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d");

    /* fondo */
    ctx.drawImage($poster, 0, 0, W, H);

    /* mapa */
    const mapRect = $canvas.getBoundingClientRect();
    const posterRect = $poster.getBoundingClientRect();

    const sx = W / posterRect.width;
    const sy = H / posterRect.height;

    ctx.drawImage(
      $canvas,
      (mapRect.left - posterRect.left) * sx,
      (mapRect.top - posterRect.top) * sy,
      mapRect.width * sx,
      mapRect.height * sy
    );

    /* ---------------- TEXTO (FIX CLAVE) ---------------- */
    function drawTextFromDOM(el){
      if (!el || el.style.display === "none") return;

      const box = el.getBoundingClientRect();
      const cs = getComputedStyle(el);

      let align = cs.textAlign.toLowerCase();
      if (align === "start") align = "left";
      if (align === "end") align = "right";
      if (!["left","right","center"].includes(align)) align = "left";

      ctx.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * sy}px ${cs.fontFamily}`;
      ctx.fillStyle = cs.color;
      ctx.globalAlpha = parseFloat(cs.opacity || 1);

      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";

      let x = (box.left - posterRect.left) * sx;
      if (align === "center") x += (box.width * sx) / 2;
      if (align === "right") x += box.width * sx;

      const y = (box.top - posterRect.top + box.height) * sy;

      ctx.fillText(el.textContent, x, y);
      ctx.globalAlpha = 1;
    }

    [$pTitle, $pSubtitle, $pPlace, $pCoords, $pDatetime].forEach(drawTextFromDOM);

    /* ---------------- SALIDA ---------------- */
    if (format === "png"){
      downloadDataURL(out.toDataURL("image/png"), "poster.png");
    }
    else if (format === "jpg"){
      downloadDataURL(out.toDataURL("image/jpeg", 0.95), "poster.jpg");
    }
    else {
      await downloadPDFfromCanvas(out, W, H, dpi, "poster.pdf");
    }
  }

  /* ------------------------------------------------------------------ */
  /* --------------------- INIT ---------------------------------------- */
  /* ------------------------------------------------------------------ */

  renderPosterText();

  window.exportPoster = exportPoster;
})();
