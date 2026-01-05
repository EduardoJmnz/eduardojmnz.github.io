const $ = (id) => document.getElementById(id);
const canvas = $("c");
const ctx = canvas.getContext("2d", { alpha: false });

const state = {
  stars: null,            // Array<{raDeg, decDeg, mag}>
  spotifyCodeBitmap: null // ImageBitmap
};

const THEMES = {
  classic: {
    bg: "#0b1020",
    fg: "#e8ecff",
    faint: "rgba(232,236,255,.55)",
    faint2: "rgba(232,236,255,.20)",
    border: "rgba(232,236,255,.18)"
  },
  inverted: {
    bg: "#f7f8ff",
    fg: "#0b1020",
    faint: "rgba(11,16,32,.55)",
    faint2: "rgba(11,16,32,.18)",
    border: "rgba(11,16,32,.18)"
  }
};

function showError(e) {
  const box = $("err");
  box.style.display = "block";
  box.textContent = "Error: " + (e?.message || String(e));
  console.error(e);
}
function clearError() {
  const box = $("err");
  box.style.display = "none";
  box.textContent = "";
}

function pad2(n) { return String(n).padStart(2, "0"); }

function setDefaultDatetime() {
  const now = new Date();
  const local = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  $("dt").value = local;
}

function fmtDate(date) {
  return date.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function clampInt(v, a, b) {
  v = Number.isFinite(v) ? Math.round(v) : a;
  return Math.max(a, Math.min(b, v));
}
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

function getConfig() {
  const title = $("title").value.trim();
  const subtitle = $("subtitle").value.trim();
  const place = $("place").value.trim();
  const note = $("note").value.trim();

  const lat = Number($("lat").value);
  const lon = Number($("lon").value);

  const dtLocal = $("dt").value;
  const date = new Date(dtLocal);
  if (Number.isNaN(date.getTime())) throw new Error("Fecha inválida.");

  const themeName = $("theme").value;
  const theme = THEMES[themeName] ?? THEMES.classic;

  const maxMag = Number($("maxMag").value);
  const previewSize = clampInt(Number($("previewSize").value), 600, 2400);
  const exportSize = clampInt(Number($("exportSize").value), 1200, 20000);

  const flags = {
    showTitle: $("showTitle").checked,
    showSubtitle: $("showSubtitle").checked,
    showDate: $("showDate").checked,
    showPlace: $("showPlace").checked,
    showCoords: $("showCoords").checked,
    showBorder: $("showBorder").checked,
    showSpotify: $("showSpotify").checked,
    showNote: $("showNote").checked
  };

  return { title, subtitle, place, note, lat, lon, date, theme, maxMag, previewSize, exportSize, flags };
}

/* --- Astronomía básica (suficiente para un póster) --- */
function deg2rad(d) { return d * Math.PI / 180; }
function rad2deg(r) { return r * 180 / Math.PI; }
function wrapDeg(d) { d %= 360; return d < 0 ? d + 360 : d; }
function toJulianDate(date) { return date.getTime() / 86400000 + 2440587.5; }

// LST aproximado
function localSiderealTimeDeg(date, lonDeg) {
  const jd = toJulianDate(date);
  const d = jd - 2451545.0;
  const gmst = wrapDeg(280.46061837 + 360.98564736629 * d);
  return wrapDeg(gmst + lonDeg);
}

function raDecToAzAlt(raDeg, decDeg, latRad, lstDeg) {
  let H = deg2rad(wrapDeg(lstDeg - raDeg));
  const dec = deg2rad(decDeg);

  const sinAlt = Math.sin(dec) * Math.sin(latRad) + Math.cos(dec) * Math.cos(latRad) * Math.cos(H);
  const alt = Math.asin(clamp(sinAlt, -1, 1));

  const y = -Math.sin(H);
  const x = Math.tan(dec) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(H);
  let az = Math.atan2(y, x);
  if (az < 0) az += 2 * Math.PI;

  return { azDeg: rad2deg(az), altDeg: rad2deg(alt) };
}

function projectAzAlt(azDeg, altDeg, cx, cy, R) {
  const r = (R * (90 - altDeg)) / 90;
  const a = deg2rad(azDeg);
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

function starRadiusFromMag(mag, scale) {
  const t = clamp((3.0 - mag) / 7.0, 0, 1);
  return (0.35 + t * 1.9) * scale;
}
function starAlphaFromMag(mag) {
  return clamp((6.8 - mag) / 6.8, 0.06, 1);
}

/* --- Catálogo --- */
async function loadCatalogFile(file) {
  const text = await file.text();

  if (file.name.toLowerCase().endsWith(".json")) {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : data.stars;
    if (!Array.isArray(arr)) throw new Error("JSON inválido. Se espera un arreglo de estrellas.");
    return arr.map(s => ({
      raDeg: Number(s.raDeg ?? s.ra ?? s.ra_deg),
      decDeg: Number(s.decDeg ?? s.dec ?? s.dec_deg),
      mag: Number(s.mag ?? s.vmag ?? s.magnitude ?? 6)
    })).filter(s => Number.isFinite(s.raDeg) && Number.isFinite(s.decDeg) && Number.isFinite(s.mag));
  }

  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV vacío.");

  const header = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const iRa = header.indexOf("ra");
  const iDec = header.indexOf("dec");
  const iMag = header.indexOf("mag");
  if (iRa === -1 || iDec === -1 || iMag === -1) {
    throw new Error("CSV no tiene columnas ra, dec, mag.");
  }

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const raDeg = Number(cols[iRa]);
    const decDeg = Number(cols[iDec]);
    const mag = Number(cols[iMag]);
    if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg) || !Number.isFinite(mag)) continue;
    out.push({ raDeg, decDeg, mag });
  }
  return out;
}

function splitCsvLine(line) {
  const res = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { q = !q; continue; }
    if (ch === "," && !q) { res.push(cur); cur = ""; continue; }
    cur += ch;
  }
  res.push(cur);
  return res;
}

/* --- Fallback denso (bonito) --- */
function generateFallbackStars(n) {
  const stars = [];
  for (let i = 0; i < n; i++) {
    const raDeg = Math.random() * 360;
    const u = Math.random() * 2 - 1;
    const decDeg = rad2deg(Math.asin(u));
    const r = Math.random();
    const mag = 0.8 + Math.pow(r, 0.23) * 9.0; // más débiles = muchas
    stars.push({ raDeg, decDeg, mag });
  }
  return stars;
}

/* --- Render póster --- */
function setCanvasSize(px) {
  canvas.width = px;
  canvas.height = Math.round(px * 1.25);
  canvas.style.width = px + "px";
  canvas.style.height = "auto";
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitContain(sw, sh, bw, bh) {
  const sr = sw / sh;
  const br = bw / bh;
  let dw = bw, dh = bh;
  if (sr > br) dh = Math.round(bw / sr);
  else dw = Math.round(bh * sr);
  const dx = Math.round((bw - dw) / 2);
  const dy = Math.round((bh - dh) / 2);
  return { dw, dh, dx, dy };
}

function drawPoster(cfg, outPx) {
  const { title, subtitle, place, note, lat, lon, date, theme, maxMag, flags } = cfg;

  const W = outPx;
  const H = Math.round(outPx * 1.25);
  const scale = W / 1100;

  const margin = Math.round(80 * scale);
  const headerH = Math.round(200 * scale);
  const footerH = Math.round(250 * scale);

  const skyTop = margin + headerH;
  const skyBottom = H - margin - footerH;
  const skyH = skyBottom - skyTop;

  const diameter = Math.min(W - margin * 2, skyH);
  const R = diameter / 2;
  const cx = W / 2;
  const cy = skyTop + skyH / 2;

  // Fondo
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  // Borde/margen
  if (flags.showBorder) {
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = Math.max(1, 2 * scale);
    roundRect(ctx, margin * 0.65, margin * 0.65, W - margin * 1.3, H - margin * 1.3, 24 * scale);
    ctx.stroke();
  }

  // Clip círculo cielo
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Grid
  ctx.strokeStyle = theme.faint2;
  ctx.lineWidth = Math.max(1, 1.15 * scale);
  ctx.setLineDash([8 * scale, 10 * scale]);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.55;
  for (const alt of [15, 30, 45, 60, 75]) {
    ctx.beginPath();
    ctx.arc(cx, cy, (R * (90 - alt)) / 90, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Estrellas visibles
  const stars = state.stars ?? generateFallbackStars(Number($("fallbackCount").value) || 18000);
  const lst = localSiderealTimeDeg(date, lon);
  const latRad = deg2rad(lat);

  const visible = [];
  for (const s of stars) {
    if (s.mag > maxMag) continue;
    const { azDeg, altDeg } = raDecToAzAlt(s.raDeg, s.decDeg, latRad, lst);
    if (altDeg <= 0) continue;
    visible.push({ azDeg, altDeg, mag: s.mag });
  }
  visible.sort((a, b) => b.mag - a.mag);

  // Dibujo (halo + punto)
  for (const s of visible) {
    const p = projectAzAlt(s.azDeg, s.altDeg, cx, cy, R);
    const r = starRadiusFromMag(s.mag, scale);
    const a = starAlphaFromMag(s.mag);

    ctx.globalAlpha = a * 0.32;
    ctx.fillStyle = theme.fg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();

  // Contorno del círculo
  ctx.strokeStyle = theme.faint2;
  ctx.lineWidth = Math.max(1, 1.6 * scale);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Header: título/subtítulo
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (flags.showTitle && title) {
    ctx.fillStyle = theme.fg;
    ctx.font = `800 ${Math.round(46 * scale)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.fillText(title, W / 2, margin + Math.round(70 * scale));
  }
  if (flags.showSubtitle && subtitle) {
    ctx.fillStyle = theme.faint;
    ctx.font = `650 ${Math.round(18 * scale)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.fillText(subtitle, W / 2, margin + Math.round(120 * scale));
  }

  // Footer: fecha/lugar/coordenadas/nota
  const footerTop = H - margin - footerH;
  const leftX = margin + Math.round(20 * scale);
  const rightX = W - margin - Math.round(20 * scale);
  let lineY = footerTop + Math.round(70 * scale);

  ctx.textAlign = "left";
  ctx.fillStyle = theme.faint;
  ctx.font = `650 ${Math.round(18 * scale)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;

  if (flags.showDate) {
    ctx.fillText(fmtDate(date), leftX, lineY);
    lineY += Math.round(30 * scale);
  }
  if (flags.showPlace && place) {
    ctx.fillText(place, leftX, lineY);
    lineY += Math.round(30 * scale);
  }
  if (flags.showCoords) {
    ctx.fillText(`lat ${lat.toFixed(4)}°, lon ${lon.toFixed(4)}°`, leftX, lineY);
    lineY += Math.round(30 * scale);
  }
  if (flags.showNote && note) {
    ctx.fillStyle = theme.fg;
    ctx.font = `800 ${Math.round(20 * scale)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.fillText(note, leftX, lineY + Math.round(10 * scale));
  }

  // Spotify code (derecha)
  if (flags.showSpotify && state.spotifyCodeBitmap) {
    const bmp = state.spotifyCodeBitmap;
    const box = Math.round(175 * scale);
    const pad = Math.round(12 * scale);
    const bx = rightX - box;
    const by = footerTop + Math.round(50 * scale);

    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.strokeStyle = theme.faint2;
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    roundRect(ctx, bx - pad, by - pad, box + pad * 2, box + pad * 2, 18 * scale);
    ctx.fill();
    ctx.stroke();

    const { dw, dh, dx, dy } = fitContain(bmp.width, bmp.height, box, box);
    ctx.drawImage(bmp, bx + dx, by + dy, dw, dh);
  }
}

function renderPreview() {
  clearError();
  const cfg = getConfig();
  setCanvasSize(cfg.previewSize);
  drawPoster(cfg, cfg.previewSize);
}

function exportPNG() {
  clearError();
  const cfg = getConfig();

  // render grande
  const outW = cfg.exportSize;
  canvas.width = outW;
  canvas.height = Math.round(outW * 1.25);

  drawPoster(cfg, outW);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "mapa-estelar-pro.png";
  a.click();

  // volver a preview
  setTimeout(() => { try { renderPreview(); } catch (e) { showError(e); } }, 60);
}

/* --- Spotify UI --- */
async function spotifySearch(q) {
  const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

async function loadSpotifyCodeBitmap(uri, themeName) {
  // Queremos un SVG y lo convertimos a ImageBitmap
  const bg = themeName === "inverted" ? "FFFFFF" : "000000";
  const code = themeName === "inverted" ? "black" : "white";
  const size = "640";
  const fmt = "svg";

  const r = await fetch(`/api/spotify/code?uri=${encodeURIComponent(uri)}&bg=${bg}&code=${code}&size=${size}&fmt=${fmt}`);
  if (!r.ok) throw new Error(await r.text());

  const svgText = await r.text();
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const bmp = await createImageBitmap(blob);
  return bmp;
}

function wireSpotifyUI() {
  $("spotifySearch").addEventListener("click", async () => {
    try {
      clearError();
      const q = $("spotifyQuery").value.trim();
      if (!q) return;

      const data = await spotifySearch(q);
      const sel = $("spotifyResults");
      sel.innerHTML = "";

      for (const item of data.items) {
        const opt = document.createElement("option");
        opt.value = item.uri;
        opt.textContent = `${item.name} — ${item.artists}`;
        sel.appendChild(opt);
      }

      if (!sel.options.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Sin resultados";
        sel.appendChild(opt);
      }
    } catch (e) {
      showError(e);
    }
  });

  $("spotifyUse").addEventListener("click", async () => {
    try {
      clearError();
      const uri = $("spotifyResults").value;
      if (!uri) return;

      const themeName = $("theme").value;
      state.spotifyCodeBitmap = await loadSpotifyCodeBitmap(uri, themeName);

      $("showSpotify").checked = true;
      renderPreview();
    } catch (e) {
      showError(e);
    }
  });
}

/* --- Eventos --- */
function wire() {
  setDefaultDatetime();
  $("maxMagVal").textContent = $("maxMag").value;

  // re-render on change
  const rerenderIds = [
    "title","subtitle","place","lat","lon","dt","note",
    "maxMag","fallbackCount","theme","previewSize",
    "showTitle","showSubtitle","showDate","showPlace","showCoords","showBorder","showSpotify","showNote"
  ];
  for (const id of rerenderIds) {
    $(id).addEventListener("input", () => {
      if (id === "maxMag") $("maxMagVal").textContent = $("maxMag").value;
      safeRender();
    });
    $(id).addEventListener("change", () => safeRender());
  }

  $("render").addEventListener("click", safeRender);
  $("exportPng").addEventListener("click", () => { try { exportPNG(); } catch (e) { showError(e); } });

  $("reset").addEventListener("click", () => {
    $("title").value = "Nuestra noche";
    $("subtitle").value = "Bajo el mismo cielo";
    $("place").value = "Ciudad de México";
    $("lat").value = "19.4326";
    $("lon").value = "-99.1332";
    $("note").value = "";
    $("theme").value = "classic";
    $("maxMag").value = "7.8";
    $("fallbackCount").value = "18000";
    $("previewSize").value = "1100";
    $("exportSize").value = "7000";
    $("spotifyQuery").value = "";
    $("spotifyResults").innerHTML = "";

    $("showTitle").checked = true;
    $("showSubtitle").checked = true;
    $("showDate").checked = true;
    $("showPlace").checked = true;
    $("showCoords").checked = true;
    $("showBorder").checked = true;
    $("showSpotify").checked = true;
    $("showNote").checked = true;

    setDefaultDatetime();
    $("maxMagVal").textContent = $("maxMag").value;

    state.stars = null;
    state.spotifyCodeBitmap = null;
    $("catalog").value = "";

    safeRender();
  });

  $("catalog").addEventListener("change", async (ev) => {
