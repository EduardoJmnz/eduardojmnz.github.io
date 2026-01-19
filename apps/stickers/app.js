// app.js

const $ = (id) => document.getElementById(id);

const statusEl = $("status");
const pagesEl = $("pages");
const exportArea = $("exportArea");

const btnGenerate = $("btnGenerate");
const btnPDF = $("btnPDF");

// Cliente/Dirección fijo (NO editable)
const FIXED_CLIENTE = [
  "BC MEXICO SA DE CV",
  "C. MIGUEL ALEMAN 411 18",
  "SANTA CRUZ ATZCAPOTZALCO",
  "AZCAPOTZALCO, CDMX 02000"
].join("\n");

let lastLabels = []; // [{boxNo, qtyInBox}]

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function clampInt(n, min = 0) {
  n = Number.isFinite(n) ? Math.trunc(n) : 0;
  return Math.max(min, n);
}

function computeBoxes({ totalPiezas, piezasPorCaja, forcedBoxes }) {
  totalPiezas = clampInt(totalPiezas, 0);
  piezasPorCaja = clampInt(piezasPorCaja, 1);
  if (totalPiezas === 0) return [];

  if (!forcedBoxes || forcedBoxes <= 0) {
    const full = Math.floor(totalPiezas / piezasPorCaja);
    const rem = totalPiezas % piezasPorCaja;
    const labels = [];
    for (let i = 1; i <= full; i++) labels.push({ boxNo: i, qtyInBox: piezasPorCaja });
    if (rem > 0) labels.push({ boxNo: full + 1, qtyInBox: rem });
    return labels;
  }

  // Si el usuario fuerza cajas
  const boxes = clampInt(forcedBoxes, 1);
  const labels = [];
  let remaining = totalPiezas;

  for (let i = 1; i <= boxes; i++) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, piezasPorCaja);
    labels.push({ boxNo: i, qtyInBox: take });
    remaining -= take;
  }

  // Si faltaron piezas, crea cajas extra
  let boxNo = labels.length;
  while (remaining > 0) {
    boxNo += 1;
    const take = Math.min(remaining, piezasPorCaja);
    labels.push({ boxNo, qtyInBox: take });
    remaining -= take;
  }

  return labels;
}

function deriveSku(estilo, skuInput) {
  const s = (skuInput || "").trim();
  if (s) return s;
  const e = (estilo || "").trim();
  if (!e) return "";
  const parts = e.split("/");
  return (parts[1] || parts[0] || "").trim();
}

function createBarcodeDataUrl(value, widthPx = 460, heightPx = 90) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(widthPx));
  svg.setAttribute("height", String(heightPx));

  if (!value) {
    const empty = new XMLSerializer().serializeToString(svg);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(empty)}`;
  }

  JsBarcode(svg, value, {
    format: "CODE128",
    displayValue: false,
    margin: 0,
    width: 2,
    height: Math.max(40, Math.floor(heightPx * 0.75)),
  });

  const xml = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildLabelElement(data) {
  const { estilo, cliente, color, talla, qty, boxNo, sku } = data;

  const label = document.createElement("div");
  label.className = "labelRot";
  label.innerHTML = `
    <div class="labelInner">
      <div class="L">
        <div class="Ltop">
          <div class="estiloLbl">Estilo:</div>
          <div class="estiloVal">${escapeHtml(estilo || "")}</div>
          <div class="cliente">${escapeHtml(cliente || "").replace(/\n/g, "<br/>")}</div>
        </div>

        <div class="Lbot">
          <div class="tbl">
            <div class="tblHead">
              <div>COLOR</div><div>TALLA</div><div>CANTIDAD</div>
            </div>
            <div class="tblRow">
              <div>${escapeHtml(color || "")}</div>
              <div>${escapeHtml(talla || "")}</div>
              <div>${escapeHtml(String(qty))}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="R">
        <div class="rtop">
          <div class="kv"><span>TOTAL:</span><span>${escapeHtml(String(qty))}</span></div>
          <div class="kv"><span>CAJA:</span><span>${escapeHtml(String(boxNo))}</span></div>
        </div>

        <div class="rbottom">
          <div class="barcodeBox">
            <img alt="barcode" style="max-width:100%; height:auto;"
                 src="${createBarcodeDataUrl(sku)}" />
          </div>
          <div class="barcodeTxt">${escapeHtml(sku || "")}</div>
        </div>
      </div>
    </div>
  `;
  return label;
}

function renderPreview(labels, baseData) {
  pagesEl.innerHTML = "";

  if (!labels.length) {
    pagesEl.innerHTML = `<div style="color:rgba(255,255,255,.65); font-size:13px; padding:8px;">
      No hay etiquetas todavía. Llena los campos y presiona <b>Generar</b>.
    </div>`;
    return;
  }

  const perSheet = 2;
  const sheetCount = Math.ceil(labels.length / perSheet);

  for (let s = 0; s < sheetCount; s++) {
    const sheet = document.createElement("div");
    sheet.className = "sheet";

    const topSlot = document.createElement("div");
    topSlot.className = "slot top";
    const bottomSlot = document.createElement("div");
    bottomSlot.className = "slot bottom";

    const idxA = s * perSheet;
    const idxB = idxA + 1;

    const A = labels[idxA];
    const B = labels[idxB];

    if (A) topSlot.appendChild(buildLabelElement({ ...baseData, qty: A.qtyInBox, boxNo: A.boxNo }));
    if (B) bottomSlot.appendChild(buildLabelElement({ ...baseData, qty: B.qtyInBox, boxNo: B.boxNo }));

    sheet.appendChild(topSlot);
    sheet.appendChild(bottomSlot);
    pagesEl.appendChild(sheet);
  }
}

async function exportPDF(labels, baseData) {
  if (!labels.length) return;

  setStatus("Generando PDF…");
  btnPDF.disabled = true;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });

  const perSheet = 2;
  const sheetCount = Math.ceil(labels.length / perSheet);

  exportArea.innerHTML = "";

  for (let s = 0; s < sheetCount; s++) {
    const sheetEl = buildExportSheet(labels, baseData, s, perSheet);
    exportArea.appendChild(sheetEl);

    await new Promise((r) => setTimeout(r, 40));

    const canvas = await html2canvas(sheetEl, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    if (s > 0) doc.addPage("letter", "portrait");
    doc.addImage(imgData, "JPEG", 0, 0, 612, 792, undefined, "FAST");
  }

  exportArea.innerHTML = "";
  doc.save(makeFileName(baseData.estilo));

  btnPDF.disabled = false;
  setStatus("PDF descargado.");
}

function makeFileName(estilo) {
  const safe = (estilo || "etiquetas").trim().replace(/[^\w\-]+/g, "_").slice(0, 50);
  return `${safe}_etiquetas_carta.pdf`;
}

function buildExportSheet(labels, baseData, sheetIndex, perSheet) {
  // carta aproximada en DOM
  const sheet = document.createElement("div");
  sheet.style.width = "816px";
  sheet.style.height = "1056px";
  sheet.style.background = "#fff";
  sheet.style.position = "relative";
  sheet.style.overflow = "hidden";

  const slotCommon = (pos) => {
    const slot = document.createElement("div");
    slot.style.position = "absolute";
    slot.style.left = "50%";
    slot.style.transform = "translateX(-50%)";
    slot.style.width = "420px";
    slot.style.height = "780px";
    slot.style.display = "flex";
    slot.style.alignItems = "center";
    slot.style.justifyContent = "center";
    slot.style.top = pos === "top" ? "28px" : "auto";
    slot.style.bottom = pos === "bottom" ? "28px" : "auto";
    return slot;
  };

  const topSlot = slotCommon("top");
  const bottomSlot = slotCommon("bottom");

  const idxA = sheetIndex * perSheet;
  const idxB = idxA + 1;

  const A = labels[idxA];
  const B = labels[idxB];

  if (A) topSlot.appendChild(buildExportLabel({ ...baseData, qty: A.qtyInBox, boxNo: A.boxNo }));
  if (B) bottomSlot.appendChild(buildExportLabel({ ...baseData, qty: B.qtyInBox, boxNo: B.boxNo }));

  sheet.appendChild(topSlot);
  sheet.appendChild(bottomSlot);
  return sheet;
}

function buildExportLabel(data) {
  // 20cm x 10cm a 300dpi (alta fidelidad)
  const W = 2362;
  const H = 1181;

  const outer = document.createElement("div");
  outer.style.width = `${W}px`;
  outer.style.height = `${H}px`;
  outer.style.transform = "rotate(90deg)";
  outer.style.transformOrigin = "center";
  outer.style.background = "#fff";
  outer.style.color = "#000";
  outer.style.border = "6px solid #000";

  outer.innerHTML = `
    <div style="width:100%;height:100%;display:grid;grid-template-columns: 1fr 520px;">
      <div style="border-right:6px solid #000;display:grid;grid-template-rows: 52% 48%;">
        <div style="padding:60px 70px 40px;border-bottom:6px solid #000;display:flex;flex-direction:column;gap:18px;">
          <div style="font-weight:900;font-size:72px;line-height:1;">Estilo:</div>
          <div style="font-weight:850;font-size:62px;line-height:1.05;word-break:break-word;">${escapeHtml(data.estilo || "")}</div>
          <div style="margin-top:10px;font-weight:800;text-align:center;font-size:44px;line-height:1.12;padding:0 24px;">
            ${escapeHtml(data.cliente || "").replace(/\n/g, "<br/>")}
          </div>
        </div>

        <div style="display:grid;grid-template-rows: 120px 1fr;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:6px solid #000;font-weight:950;font-size:44px;">
            <div style="display:flex;align-items:center;justify-content:center;border-right:6px solid #000;">COLOR</div>
            <div style="display:flex;align-items:center;justify-content:center;border-right:6px solid #000;">TALLA</div>
            <div style="display:flex;align-items:center;justify-content:center;">CANTIDAD</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;font-weight:900;font-size:62px;">
            <div style="display:flex;align-items:center;justify-content:center;border-right:6px solid #000;">${escapeHtml(data.color || "")}</div>
            <div style="display:flex;align-items:center;justify-content:center;border-right:6px solid #000;">${escapeHtml(data.talla || "")}</div>
            <div style="display:flex;align-items:center;justify-content:center;">${escapeHtml(String(data.qty))}</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-rows: 42% 58%;">
        <div style="padding:70px 70px;display:flex;flex-direction:column;gap:80px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;font-weight:950;font-size:64px;line-height:1;">
            <span>TOTAL:</span><span style="font-size:90px;">${escapeHtml(String(data.qty))}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;font-weight:950;font-size:64px;line-height:1;">
            <span>CAJA:</span><span style="font-size:90px;">${escapeHtml(String(data.boxNo))}</span>
          </div>
        </div>

        <div style="border-top:6px solid #000;padding:70px 60px 40px;display:flex;flex-direction:column;gap:36px;">
          <div style="display:flex;align-items:center;justify-content:center;min-height:220px;">
            <img alt="barcode" style="max-width:100%;height:auto;"
              src="${createBarcodeDataUrl(data.sku, 1100, 260)}" />
          </div>
          <div style="text-align:center;font-size:44px;font-weight:900;letter-spacing:2px;">${escapeHtml(data.sku || "")}</div>
        </div>
      </div>
    </div>
  `;

  return outer;
}

function readForm() {
  const estilo = $("estilo").value.trim();
  const piezasPorCaja = clampInt(parseInt($("ppc").value || "1", 10), 1);
  const totalPiezas = clampInt(parseInt($("totalPiezas").value || "0", 10), 0);

  const forcedBoxesRaw = $("numCajas").value.trim();
  const forcedBoxes = forcedBoxesRaw ? clampInt(parseInt(forcedBoxesRaw, 10), 1) : 0;

  const color = $("color").value.trim();
  const talla = $("talla").value.trim();
  const sku = deriveSku(estilo, $("sku").value);

  return { estilo, piezasPorCaja, totalPiezas, forcedBoxes, color, talla, sku };
}

function generate() {
  const form = readForm();

  const labels = computeBoxes({
    totalPiezas: form.totalPiezas,
    piezasPorCaja: form.piezasPorCaja,
    forcedBoxes: form.forcedBoxes
  });

  lastLabels = labels;

  renderPreview(labels, {
    estilo: form.estilo,
    cliente: FIXED_CLIENTE,
    color: form.color,
    talla: form.talla,
    sku: form.sku
  });

  btnPDF.disabled = labels.length === 0;

  const totalSum = labels.reduce((a, b) => a + b.qtyInBox, 0);
  setStatus(labels.length
    ? `${labels.length} etiqueta(s) · ${Math.ceil(labels.length / 2)} hoja(s) · total piezas: ${totalSum}`
    : "Sin etiquetas"
  );
}

btnGenerate.addEventListener("click", () => {
  try { generate(); } catch (e) { console.error(e); setStatus("Error al generar."); }
});

btnPDF.addEventListener("click", async () => {
  try {
    const form = readForm();
    await exportPDF(lastLabels, {
      estilo: form.estilo,
      cliente: FIXED_CLIENTE,
      color: form.color,
      talla: form.talla,
      sku: form.sku
    });
  } catch (e) {
    console.error(e);
    setStatus("Error al exportar PDF.");
    btnPDF.disabled = false;
  }
});

// Autogenerar al cargar
generate();
