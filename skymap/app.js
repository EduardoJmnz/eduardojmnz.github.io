<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Sky Art Creator</title>
  <style>
    :root{
      --bg:#07080c;
      --panel:#0f121a;
      --panel2:#0c0f15;
      --text:#e9eefc;
      --muted: rgba(233,238,252,.70);
      --stroke: rgba(233,238,252,.10);
      --accent: rgba(124,255,250,.45);
      --accentFill: rgba(124,255,250,.12);
      --accentSolid: #7CFFFA;

      --desktopPreviewScale: 0.60; /* ✅ escritorio 60% */
      --mobilePreviewScale: 0.45;  /* ✅ móvil (no tocar) */
    }

    *{ box-sizing:border-box; }
    html,body{ height:100%; margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; background:var(--bg); color:var(--text); }

    #app{
      height:100%;
      display:grid;
      grid-template-columns: 420px 1fr;
    }

    .left{
      border-right:1px solid var(--stroke);
      background: linear-gradient(180deg, var(--panel), var(--panel2));
      display:flex;
      flex-direction:column;
      min-width:320px;
    }

    .header{ padding:16px 16px 8px 16px; }
    .brand{ display:flex; align-items:center; gap:10px; }
    .dot{
      width:12px;height:12px;border-radius:999px;background:#7CFFFA;
      box-shadow:0 0 24px rgba(124,255,250,.35);
    }
    .brandTitle{ font-weight:800; letter-spacing:.3px; }
    .brandSub{ font-size:12px; color:var(--muted); margin-top:2px; }

    /* Tabs */
    .tabs{
      display:flex;
      gap:0;
      padding: 8px 16px 0 16px;
    }
    .sheetTab{
      flex: 1 1 0;
      border:0;
      background: transparent;
      color: rgba(233,238,252,.55);
      padding: 12px 10px 16px 10px;
      cursor:pointer;
      font-size:13px;
      user-select:none;
      position:relative;
      font-weight: 500;
      text-align:center;
    }
    .sheetTab::after{
      content:"";
      position:absolute;
      left:0; right:0;
      bottom: 2px;
      height:4px;
      background: transparent;
      border-radius: 999px;
    }
    .sheetTab.active{
      color: var(--text);
      font-weight: 800;
    }
    .sheetTab.active::after{
      background: var(--accentSolid);
      box-shadow: 0 0 18px rgba(124,255,250,.25);
    }

    .panel{
      padding: 12px 16px 16px 16px;
      overflow:auto;
    }

    .title{ font-weight:800; margin-bottom:4px; }
    .sub{ font-size:12px; color:var(--muted); margin-bottom:12px; }

    .rowToggle{
      display:flex; justify-content:space-between; align-items:center;
      padding:10px 10px;
      border:1px solid var(--stroke);
      border-radius:12px;
      background: rgba(255,255,255,.02);
      gap: 12px;
    }
    .formRow{ display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
    .label{ font-size:12px; color:var(--muted); }
    .select{
      border:1px solid var(--stroke);
      background: rgba(255,255,255,.02);
      color:var(--text);
      padding:10px 10px;
      border-radius:12px;
      outline:none;
    }
    input[type="range"]{ width:100%; }

    .btnRow{
      display:flex;
      justify-content:space-between;
      gap:10px;
      margin-top:12px;
      align-items:center;
    }
    .btn{
      border-radius:14px;
      padding:10px 12px;
      cursor:pointer;
      font-weight:750;
      user-select:none;
      white-space:nowrap;
      min-height:44px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      line-height:1;
    }
    .btn.ghost{
      border:1px solid var(--stroke);
      background: rgba(255,255,255,.02);
      color:var(--text);
    }
    .btn.primary{
      border:1px solid var(--accent);
      background: var(--accentFill);
      color:var(--text);
    }

    .toggle{
      width: 44px;
      height: 24px;
      border-radius: 999px;
      border: 1px solid var(--stroke);
      background: rgba(255,255,255,.06);
      position: relative;
      cursor: pointer;
      flex: 0 0 auto;
      transition: 160ms ease;
    }
    .toggle::after{
      content:"";
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: rgba(233,238,252,.92);
      position:absolute;
      top: 50%;
      left: 3px;
      transform: translateY(-50%);
      transition: 160ms ease;
      box-shadow: 0 6px 18px rgba(0,0,0,.25);
    }
    .toggle.on{
      border-color: var(--accent);
      background: rgba(124,255,250,.18);
      box-shadow: 0 0 0 3px rgba(124,255,250,.10);
    }
    .toggle.on::after{
      left: 23px;
      background: rgba(124,255,250,.95);
    }

    .stackGap{ margin-top: 12px; }

    .fieldCard{
      border:1px solid var(--stroke);
      border-radius:16px;
      background: rgba(255,255,255,.02);
      overflow:hidden;
      margin-bottom: 10px;
    }
    .fieldHeader{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding: 14px 14px;
    }
    .fieldHeader .fieldLabel{
      font-weight: 800;
      font-size: 18px;
    }
    .fieldBody{
      padding: 0 14px 14px 14px;
    }
    .fieldInput{
      width:100%;
      border:1px solid var(--stroke);
      background: rgba(0,0,0,.18);
      color: var(--text);
      padding: 16px 14px;
      border-radius: 14px;
      outline:none;
      font-size: 18px;
    }

    .styleGrid{
      display:grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-top: 8px;
    }
    .styleTile{ cursor:pointer; user-select:none; }
    .stylePoster{
      width:100%;
      aspect-ratio: 3 / 4;
      border-radius: 8px;
      background: rgba(0,0,0,.18);
      border: 2px solid rgba(0,0,0,0);
      overflow:hidden;
      position:relative;
      box-shadow: 0 10px 24px rgba(0,0,0,.28);
    }
    .styleTile.active .stylePoster{
      border-color: var(--accentSolid);
      box-shadow: 0 0 0 2px rgba(124,255,250,.25), 0 10px 24px rgba(0,0,0,.28);
    }
    .stylePoster canvas{ width:100%; height:100%; display:block; }
    .styleNameLabel{
      margin-top: 8px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      opacity: .92;
    }

    /* ----------- Preview ----------- */
    .right{
      display:flex;
      align-items:flex-start;
      justify-content:center; /* ✅ centra mejor */
      padding:18px;
      overflow:hidden;
      position:relative;
    }
    .previewWrap{
      width:100%;
      height:100%;
      display:flex;
      align-items:flex-start;
      justify-content:center; /* ✅ centra */
      position:relative;
    }
    .previewScale{
      transform-origin: top center;
      transform: scale(var(--desktopPreviewScale)); /* ✅ escritorio 60% */
    }

    .poster{
      width: 900px;
      height: 1200px;
      border-radius: 26px;
      box-shadow: 0 24px 90px rgba(0,0,0,.55);
      position:relative;
      overflow:hidden;

      --posterPad: 0px;
      --mapW: 780px;
      --mapH: 780px;
      --bottomTextBottom: 100px; /* ✅ JS lo actualiza */
    }

    .posterInner{
      position:absolute;
      inset:0;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:flex-start;
      padding-top: calc(var(--posterPad) + 70px);
    }

    .mapFrame{
      width: var(--mapW);
      height: var(--mapH);
      display:flex;
      align-items:center;
      justify-content:center;
    }
    canvas#mapCanvas{
      width: var(--mapW);
      height: var(--mapH);
      display:block;
    }

    .bottomText{
      position:absolute;
      left: calc(var(--posterPad) + 80px);
      right: calc(var(--posterPad) + 80px);
      bottom: var(--bottomTextBottom);
      padding:0;
    }
    .tTitle{
      font-size:54px;
      letter-spacing:2px;
      font-weight:900;
      margin-bottom:10px;
    }
    .tSub{
      font-size:18px;
      opacity:.85;
      margin-bottom:22px;
    }
    .meta{
      display:flex;
      justify-content:flex-start;
      gap:20px;
      font-size:14px;
      opacity:.82;
    }
    .metaCol{ display:flex; flex-direction:column; gap:6px; }
    .metaRow{
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .poster.classic .bottomText{
      left: calc(var(--posterPad) + 110px);
      right: calc(var(--posterPad) + 110px);
      text-align:center;
    }
    .poster.classic .meta{ justify-content:center; }
    .poster.classic .metaCol{ align-items:center; text-align:center; }
    .poster.classic .tTitle{ letter-spacing:1.6px; }

    .poster.rectStyle .bottomText{
      left: calc(var(--posterPad) + 110px);
      right: calc(var(--posterPad) + 110px);
      text-align:center;
    }

    /* ----------- Mobile ----------- */
    @media (max-width: 980px){
      #app{
        grid-template-columns: 1fr;
        grid-template-rows: auto auto;
      }

      .right{
        display:flex;          /* ✅ vuelve el preview */
        padding: 16px 0 10px 0;
        justify-content:center;
      }

      .previewWrap{
        width: 100%;
        justify-content:center;
      }

      .previewScale{
        transform: scale(var(--mobilePreviewScale)); /* ✅ móvil se queda igual */
        transform-origin: top center;
      }

      /* ✅ modal “como antes”: centrado y NO full width */
      .left{
        border-right: 0;
        border-top: 1px solid var(--stroke);
        background: transparent;
        padding: 0 0 18px 0;
      }

      .header{
        padding: 14px 16px 10px 16px;
        background: linear-gradient(180deg, var(--panel), var(--panel2));
        border-bottom: 1px solid var(--stroke);
      }

      .tabs{
        padding: 10px 16px 0 16px;
      }

      .panel{
        padding: 14px 12px 18px 12px;
        overflow: visible; /* ✅ scroll en página, no en modal */
      }

      /* “modal” real: el contenedor interior */
      #sectionContainer{
        max-width: 520px;         /* ✅ vuelve a “modal”, no pantalla completa */
        margin: 0 auto;
        border: 1px solid var(--stroke);
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(15,18,26,.92), rgba(12,15,21,.92));
        box-shadow: 0 24px 80px rgba(0,0,0,.45);
        padding: 14px;
      }

      .styleGrid{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <div id="app">
    <aside class="left">
      <div class="header">
        <div class="brand">
          <div class="dot"></div>
          <div>
            <div class="brandTitle">Sky Art Creator</div>
            <div class="brandSub">v2.090126.5</div>
          </div>
        </div>
      </div>

      <div class="tabs" id="tabs"></div>

      <div class="panel">
        <div id="sectionContainer"></div>
      </div>
    </aside>

    <main class="right">
      <div class="previewWrap">
        <div class="previewScale" id="previewScale">
          <div class="poster" id="poster">
            <div class="posterInner">
              <div class="mapFrame">
                <canvas id="mapCanvas"></canvas>
              </div>

              <div class="bottomText" id="bottomText">
                <div class="tTitle" id="pTitle"></div>
                <div class="tSub" id="pSubtitle"></div>

                <div class="meta">
                  <div class="metaCol">
                    <div class="metaRow" id="pPlace"></div>
                    <div class="metaRow" id="pCoords"></div>
                    <div class="metaRow" id="pDatetime"></div>
                  </div>
                </div>
              </div>
            </div>
          </div><!-- /poster -->
        </div><!-- /previewScale -->
      </div>
    </main>
  </div>

  <script src="./app.js"></script>
</body>
</html>
