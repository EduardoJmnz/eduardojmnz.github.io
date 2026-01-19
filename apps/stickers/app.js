// app.js
// Genera etiquetas 20x10 cm y exporta PDF Carta con 2 etiquetas por hoja, rotadas.

const $ = (id) => document.getElementById(id);

const statusEl = $("status");
const pagesEl = $("pages");
const exportArea = $("exportArea");

const btnGenerate = $("btnGenerate");
const btnPDF = $("btnPDF");

let lastLabels = []; // [{boxNo, qtyInBox}]

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function clampInt(n, min = 0) {
  n = Number.isFinite(n) ? Math.trunc(n) : 0;
  return Math.max(min, n);
}

/**
 * Calcula distribución de cajas/etiquetas:
 * totalPiezas, piezasPorCaja => N cajas completas + posible remanente.
 * Si el usuario forzó numCajas, se respeta y se reparte lo más parejo posible.
 */
function computeBoxes({ totalPiezas, piezasPorCaja, forcedBoxes }) {
  totalPiezas = clampInt(totalPiezas, 0);
  piezasPorCaja = clampInt(piezasPorCaja, 1);

  if (totalPiezas === 0) return [];

  // Caso normal: calcular por división
  if (!forcedBoxes || forcedBoxes <= 0) {
    const full = Math.floor(totalPiezas / piezasPorCaja);
    const rem = totalPiezas % piezasPorCaja;

    const labels = [];
    for (let i = 1; i <= full; i++) labels.push({ boxNo: i, qtyInBox: piezasPorCaja });
    if (rem > 0) labels.push({ boxNo: full + 1, qtyInBox: rem });
    return labels;
  }

  // Caso: usuario fuerza número de cajas.
  // Repartimos totalPiezas en forcedBoxes, llenando hasta piezasPorCaja,
  // y si sobra, sigue repartiendo (aunque exceda piezasPorCaja si fuera necesario).
  const boxes = clampInt(forcedBoxes, 1);
  const labels = [];
  let remaining = totalPiezas;

  for (let i = 1; i <= boxes; i++) {
    if (remaining <= 0) break;

    const take = Math.min(remaining, piezasPorCaja);
    labels.push({ boxNo: i, qtyInBox: take });
    remaining -= take;
  }

  // Si aún queda remanente (porque forcedBoxes era demasiado bajo),
  // seguimos creando cajas extra para no perder piezas.
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
  // Si contiene "/", usar lo de la derecha; si no, usar todo.
  const parts = e.split("/");
  return (parts[1] || parts[0] || "").trim();
}

function createBarcodeDataUrl(value, widthPx = 460, heightPx = 90) {
  // Crea un SVG con JsBarcode y lo convierte a dataURL (base64) para incrustarlo.
  // Nota: En algunos navegadores, el canvas/SVG se rasteriza perfecto con html2canvas.
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(widthPx));
  svg.setAttribute("height", String(heightPx));

  if (!value) {
    // Código vacío: solo devuelve SVG en blanco
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

/**
 * Crea el DOM de UNA etiqueta (sin rotación). La rotación se aplica en el contenedor de hoja.
 */
function buildLabelElement(data) {
  const {
    estilo,
    cliente,
    color,
    talla,
    qty,       // cantidad en esta caja
    boxNo,
    sku
  } = data;

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
              <div>COLOR</div>
              <div>TALLA</div>
              <div>CANTIDAD</div>
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

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Renderiza páginas (2 etiquetas por hoja).
 * En preview: hoja y etiquetas ya rotadas.
 */
function renderPreview(labels, baseData) {
  pagesEl.innerHTML = "";

  if (!labels.length) {
    pagesEl.innerHTML = `<div style="color:rgba(255,255,255,.6); font-size:13px; padding:8px;">
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

    if (A) {
      const elA = buildLabelElement({
        ...baseData,
        qty: A.qtyInBox,
        boxNo: A.boxNo,
      });
      topSlot.appendChild(elA);
    }

    if (B) {
      const elB = buildLabelElement({
        ...baseData,
        qty: B.qtyInBox,
        boxNo: B.boxNo,
      });
      bottomSlot.appendChild(elB);
    }

    sheet.appendChild(topSlot);
    sheet.appendChild(bottomSlot);

    pagesEl.appendChild(sheet);
  }
}

/**
 * Para PDF: generamos hojas a tamaño real usando un contenedor oculto
 * y html2canvas para rasterizar cada hoja.
 */
async function exportPDF(labels, baseData) {
  if (!labels.length) return;

  setStatus("Generando PDF…");
  btnPDF.disabled = true;

  // Import jsPDF desde UMD
  const { jsPDF } = window.jspdf;

  // Carta en puntos: 612 x 792
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });

  // Construye cada hoja “real” en el DOM (oculto), la captura con html2canvas y la pega al PDF.
  const perSheet = 2;
  const sheetCount = Math.ceil(labels.length / perSheet);

  // Limpia exportArea
  exportArea.innerHTML = "";

  for (let s = 0; s < sheetCount; s++) {
    const sheetEl = buildExportSheet(labels, baseData, s, perSheet);
    exportArea.appendChild(sheetEl);

    // Espera un tick para que carguen imágenes/barcodes
    await new Promise((r) => setTimeout(r, 30));

    const canvas = await html2canvas(sheetEl, {
      backgroundColor: "#ffffff",
      scale: 2, // calidad
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    if (s > 0) doc.addPage("letter", "portrait");
    doc.addImage(imgData, "JPEG", 0, 0, 612, 792, undefined, "FAST");
  }

  exportArea.innerHTML = "";

  const fileName = makeFileName(baseData.estilo);
  doc.save(fileName);

  btnPDF.disabled = false;
  setStatus("PDF descargado.");
}

function makeFileName(estilo) {
  const safe = (estilo || "etiquetas")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .slice(0, 50);
  return `${safe}_etiquetas_carta.pdf`;
}

/**
 * Construye una hoja carta REAL a 612x792pt (en px usando CSS).
 * Rotamos cada etiqueta 90° dentro de su slot para que salgan 2 por hoja.
 */
function buildExportSheet(labels, baseData, sheetIndex, perSheet) {
  // Medidas carta a 96dpi aprox para DOM:
  // 8.5in*96=816px, 11in*96=1056px
  // No dependemos perfecto del “dpi”, porque al final se mapea a 612x792pt en PDF.
  const sheet = document.createElement("div");
  sheet.style.width = "816px";
  sheet.style.height = "1056px";
  sheet.style.background = "#fff";
  sheet.style.position = "relative";
  sheet.style.overflow = "hidden";

  // Slots centrados (como preview) con márgenes razonables
  const slotCommon = (pos) => {
    const slot = document.createElement("div");
    slot.style.position = "absolute";
    slot.style.left = "50%";
    slot.style.transform = "translateX(-50%)";
    slot.style.width = "380px";  // al rotar, slot aloja la etiqueta
    slot.style.height = "760px";
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

  if (A) {
    const elA = buildExportLabel({
      ...baseData,
      qty: A.qtyInBox,
      boxNo: A.boxNo,
    });
    topSlot.appendChild(elA);
  }
  if (B) {
    const elB = buildExportLabel({
      ...baseData,
      qty: B.qtyInBox,
      boxNo: B.boxNo,
    });
    bottomSlot.appendChild(elB);
  }

  sheet.appendChild(topSlot);
  sheet.appendChild(bottomSlot);
  return sheet;
}

/**
 * Etiqueta “real” para export: 20x10cm -> la hacemos en px con una escala alta,
 * y la rotamos 90°.
 */
function buildExportLabel(data) {
  // 20cm x 10cm a 300dpi:
  // 20cm = 7.874in -> 2362px
  // 10cm = 3.937in -> 1181px
  const W = 2362;
  const H = 1181;

  // contenedor rotado
  const outer = document.createElement("div");
  outer.style.width = `${W}px`;
  outer.style.height = `${H}px`;
  outer.style.transform = "rotate(90deg)";
  outer.style.transformOrigin = "center";
  outer.style.background = "#fff";
  outer.style.color = "#000";
  outer.style.border = "6px solid #000";

  // Reusamos la misma estructura, pero con estilos inline para que sea consistente en canvas
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
  const cantidad = clampInt(parseInt($("cantidad").value || "0", 10), 0);
  const piezasPorCaja = clampInt(parseInt($("ppc").value || "1", 10), 1);
  const totalPiezas = clampInt(parseInt($("totalPiezas").value || "0", 10), 0);

  const forcedBoxesRaw = $("numCajas").value.trim();
  const forcedBoxes = forcedBoxesRaw ? clampInt(parseInt(forcedBoxesRaw, 10), 1) : 0;

  const color = $("color").value.trim();
  const talla = $("talla").value.trim();
  const cliente = $("cliente").value.trim();

  const sku = deriveSku(estilo, $("sku").value);

  return {
    estilo,
    cantidad,
    piezasPorCaja,
    totalPiezas,
    forcedBoxes,
    color,
    talla,
    cliente,
    sku
  };
}

function generate() {
  const form = readForm();

  const labels = computeBoxes({
    totalPiezas: form.totalPiezas,
    piezasPorCaja: form.piezasPorCaja,
    forcedBoxes: form.forcedBoxes
  });

  // Si el usuario puso "Cantidad" y NO puso totalPiezas, podríamos usar cantidad como total.
  // Pero tú pediste ambos; aquí priorizamos totalPiezas.
  lastLabels = labels;

  renderPreview(labels, {
    estilo: form.estilo,
    cliente: form.cliente,
    color: form.color,
    talla: form.talla,
    sku: form.sku
  });

  btnPDF.disabled = labels.length === 0;

  const totalEtiquetas = labels.length;
  const totalSum = labels.reduce((a, b) => a + b.qtyInBox, 0);
  setStatus(totalEtiquetas
    ? `${totalEtiquetas} etiqueta(s) · ${Math.ceil(totalEtiquetas / 2)} hoja(s) · total piezas: ${totalSum}`
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
      cliente: form.cliente,
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
