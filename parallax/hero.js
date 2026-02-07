(() => {
  const termBody = document.getElementById("termBody");
  const input = document.getElementById("cmd");
  const suggest = document.getElementById("suggest");

  const COMMANDS = ["menu", "about", "process", "services", "work", "contact", "help"];

  const history = [];
  let historyIndex = 0;

  let activeIndex = -1;
  let currentMatches = [...COMMANDS];
  let closeTimer = null;

  function escapeHtml(s) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function scrollToBottom() {
    termBody.scrollTop = termBody.scrollHeight;
  }

  function line(html, cls = "line") {
    const el = document.createElement("div");
    el.className = cls;
    el.innerHTML = html;
    termBody.appendChild(el);
    scrollToBottom();
  }

  function block(html) {
    const el = document.createElement("div");
    el.className = "block";
    el.innerHTML = html;
    termBody.appendChild(el);
    scrollToBottom();
  }

  function echoCommand(cmd) {
    line(`<span class="accent">></span> ${escapeHtml(cmd)}`);
  }

  function renderSuggest(matches, open = true) {
    currentMatches = matches;
    activeIndex = matches.length ? 0 : -1;

    suggest.innerHTML = "";
    for (let i = 0; i < matches.length; i++) {
      const c = matches[i];
      const item = document.createElement("div");
      item.className = "item" + (i === activeIndex ? " active" : "");
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
      item.innerHTML = `<span>/${escapeHtml(c)}</span>`;

      // IMPORTANT: click executes immediately (no Enter needed)
      item.addEventListener("pointerdown", (e) => {
        e.preventDefault(); // prevent blur
        executeFromDropdown(i);
      });

      suggest.appendChild(item);
    }

    if (open && matches.length) suggest.classList.add("open");
    else suggest.classList.remove("open");
  }

  function updateSuggestFromInput() {
    const v = input.value.trim().toLowerCase();
    const matches = v ? COMMANDS.filter(c => c.startsWith(v)) : [...COMMANDS];
    renderSuggest(matches, true);
  }

  function setActive(i) {
    if (!currentMatches.length) return;
    activeIndex = (i + currentMatches.length) % currentMatches.length;
    [...suggest.querySelectorAll(".item")].forEach((el, idx) => {
      el.classList.toggle("active", idx === activeIndex);
      el.setAttribute("aria-selected", idx === activeIndex ? "true" : "false");
    });
  }

  function closeSuggestSoon() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => suggest.classList.remove("open"), 120);
  }

  // Boot lines
  const bootLines = [
    `<span class="dim">Booting OAXSUN TECHNOLOGIES...</span>`,
    `<span class="dim">Mode: retro terminal • Commands enabled</span>`,
    `<span class="dim">Hint: escribe</span> <span class="accent">menu</span> <span class="dim">para ver los comandos.</span>`
  ];

  async function boot() {
    for (const l of bootLines) {
      line(l);
      await new Promise(r => setTimeout(r, 230));
    }
    block(`
      <div class="line dim">Available commands:</div>
      <div class="line"><span class="accent">/${COMMANDS.join("</span> <span class=\"accent\">/")}</span></div>
    `);
    input.focus();
  }

  function respond(cmdRaw) {
    const cmd = cmdRaw.trim().toLowerCase();
    if (!cmd) return;

    if (!COMMANDS.includes(cmd)) {
      block(`
        <div class="line"><span class="accent">Command not found:</span> <span class="dim">${escapeHtml(cmd)}</span></div>
        <div class="line dim">Try: <span class="accent">help</span> or <span class="accent">menu</span></div>
      `);
      return;
    }

    switch (cmd) {
      case "menu":
        block(`
          <div class="line dim">MENU</div>
          <div class="line"><span class="accent">/about</span>     — quiénes somos</div>
          <div class="line"><span class="accent">/services</span>  — web / apps / seo</div>
          <div class="line"><span class="accent">/process</span>   — cómo trabajamos</div>
          <div class="line"><span class="accent">/work</span>      — proyectos y casos</div>
          <div class="line"><span class="accent">/contact</span>   — cotiza tu proyecto</div>
          <div class="line"><span class="accent">/help</span>      — lista de comandos</div>
        `);
        break;

      case "about":
        block(`
          <div class="line dim">ABOUT</div>
          <div class="line">Somos <span class="accent">OAXSUN TECHNOLOGIES</span>.</div>
          <div class="line dim">Desarrollo web, apps y SEO técnico enfocado en performance y resultados.</div>
        `);
        break;

      case "process":
        block(`
          <div class="line dim">PROCESS</div>
          <div class="line">[01] Discovery & objetivos</div>
          <div class="line">[02] UX/UI</div>
          <div class="line">[03] Desarrollo</div>
          <div class="line">[04] QA & performance</div>
          <div class="line">[05] Lanzamiento & crecimiento</div>
        `);
        break;

      case "services":
        block(`
          <div class="line dim">SERVICES</div>
          <div class="line"><span class="accent">Web</span>  — landing / e-commerce / web apps</div>
          <div class="line"><span class="accent">Apps</span> — iOS/Android + backend</div>
          <div class="line"><span class="accent">SEO</span>  — SEO técnico + contenido + CWV</div>
        `);
        break;

      case "work":
        block(`
          <div class="line dim">WORK</div>
          <div class="line">/projects</div>
          <div class="line dim">Agrega aquí tus casos reales (1-3 bien explicados > 10 vacíos).</div>
        `);
        break;

      case "contact":
        block(`
          <div class="line dim">CONTACT</div>
          <div class="line">Email: <span class="accent">hello@oaxsun.com</span> <span class="dim">(placeholder)</span></div>
          <div class="line dim">Podemos cambiar esto por un formulario tipo “ticket”.</div>
        `);
        break;

      case "help":
        block(`
          <div class="line dim">HELP</div>
          <div class="line dim">Comandos:</div>
          <div class="line"><span class="accent">/${COMMANDS.join("</span> <span class=\"accent\">/")}</span></div>
          <div class="line dim">Atajos: Tab autocompleta • ↑/↓ navega sugerencias • Enter ejecuta</div>
        `);
        break;
    }
  }

  function submit(valueOverride = null) {
    const raw = valueOverride ?? input.value;
    const cmd = raw.trim();
    if (!cmd) return;

    echoCommand(cmd);
    history.push(cmd);
    historyIndex = history.length;

    input.value = "";
    suggest.classList.remove("open");
    respond(cmd);
  }

  function executeFromDropdown(i) {
    if (!currentMatches.length) return;
    const cmd = currentMatches[i];
    input.value = cmd;
    // Execute immediately:
    submit(cmd);
    input.focus();
  }

  function autocompleteTab() {
    const v = input.value.trim().toLowerCase();
    const matches = v ? COMMANDS.filter(c => c.startsWith(v)) : [...COMMANDS];
    if (matches.length === 1) input.value = matches[0];
    renderSuggest(matches, true);
  }

  function historyNav(dir) {
    if (!history.length) return;
    historyIndex = Math.max(0, Math.min(history.length, historyIndex + dir));
    input.value = historyIndex === history.length ? "" : history[historyIndex];
    requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
    updateSuggestFromInput();
  }

  // Events
  input.addEventListener("focus", () => {
    updateSuggestFromInput();
    suggest.classList.add("open");
  });

  input.addEventListener("blur", () => closeSuggestSoon());
  input.addEventListener("input", () => updateSuggestFromInput());

  input.addEventListener("keydown", (e) => {
    const isOpen = suggest.classList.contains("open") && currentMatches.length;

    if (e.key === "Enter") {
      e.preventDefault();
      // If dropdown open, execute the highlighted item if the typed value is empty or prefix
      if (isOpen && activeIndex >= 0) {
        const typed = input.value.trim().toLowerCase();
        if (!typed || currentMatches[activeIndex].startsWith(typed)) {
          submit(currentMatches[activeIndex]);
          return;
        }
      }
      submit();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      autocompleteTab();
      return;
    }

    if (e.key === "Escape") {
      suggest.classList.remove("open");
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (isOpen) setActive(activeIndex + 1);
      else historyNav(1);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) setActive(activeIndex - 1);
      else historyNav(-1);
      return;
    }
  });

  // Click terminal focuses input
  document.addEventListener("pointerdown", (e) => {
    const t = e.target;
    if (t && t.closest(".terminal")) input.focus();
  });

  boot();
})();
