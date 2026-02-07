(() => {
  const termBody = document.getElementById("termBody");
  const input = document.getElementById("cmd");
  const suggest = document.getElementById("suggest");

  // Order changed: products before services
  const COMMANDS = ["menu", "about", "products", "services", "work", "contact", "help"];

  const isTouch =
    window.matchMedia?.("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  if (isTouch) {
    input.setAttribute("readonly", "");
    input.setAttribute("inputmode", "none");
  }

  let activeIndex = -1;
  let currentMatches = [];
  let closeTimer = null;

  const ASCII = {
    MENU: `██████╗ ███████╗███╗   ██╗██╗   ██╗
██╔══██╗██╔════╝████╗  ██║██║   ██║
██████╔╝█████╗  ██╔██╗ ██║██║   ██║
██╔══██╗██╔══╝  ██║╚██╗██║██║   ██║
██║  ██║███████╗██║ ╚████║╚██████╔╝
╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝`,
    ABOUT: ` █████╗ ██████╗  ██████╗ ██╗   ██╗████████╗
██╔══██╗██╔══██╗██╔═══██╗██║   ██║╚══██╔══╝
███████║██████╔╝██║   ██║██║   ██║   ██║
██╔══██║██╔══██╗██║   ██║██║   ██║   ██║
██║  ██║██████╔╝╚██████╔╝╚██████╔╝   ██║
╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚═════╝    ╚═╝`,
    PRODUCTS: `██████╗ ██████╗  ██████╗ ██████╗ ██╗   ██╗ ██████╗████████╗███████╗
██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██║   ██║██╔════╝╚══██╔══╝██╔════╝
██████╔╝██████╔╝██║   ██║██║  ██║██║   ██║██║        ██║   ███████╗
██╔═══╝ ██╔══██╗██║   ██║██║  ██║██║   ██║██║        ██║   ╚════██║
██║     ██║  ██║╚██████╔╝██████╔╝╚██████╔╝╚██████╗   ██║   ███████║
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝   ╚═╝   ╚══════╝`,
    SERVICES: `███████╗███████╗██████╗ ██╗   ██╗██╗ ██████╗███████╗███████╗
██╔════╝██╔════╝██╔══██╗██║   ██║██║██╔════╝██╔════╝██╔════╝
███████╗█████╗  ██████╔╝██║   ██║██║██║     █████╗  ███████╗
╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██║██║     ██╔══╝  ╚════██║
███████║███████╗██║  ██║ ╚████╔╝ ██║╚██████╗███████╗███████║
╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚═╝ ╚═════╝╚══════╝╚══════╝`,
    WORK: `██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗
██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝
██║ █╗ ██║██║   ██║██████╔╝█████╔╝
██║███╗██║██║   ██║██╔══██╗██╔═██╗
╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗
 ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝`,
    CONTACT: ` ██████╗ ██████╗ ███╗   ██╗████████╗ █████╗  ██████╗████████╗
██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗██╔════╝╚══██╔══╝
██║     ██║   ██║██╔██╗ ██║   ██║   ███████║██║        ██║
██║     ██║   ██║██║╚██╗██║   ██║   ██╔══██║██║        ██║
╚██████╗╚██████╔╝██║ ╚████║   ██║   ██║  ██║╚██████╗   ██║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝   ╚═╝`,
    HELP: `██╗  ██╗███████╗██╗     ██████╗
██║  ██║██╔════╝██║     ██╔══██╗
███████║█████╗  ██║     ██████╔╝
██╔══██║██╔══╝  ██║     ██╔═══╝
██║  ██║███████╗███████╗██║
╚═╝  ╚═╝╚══════╝╚══════╝╚═╝`,
    ERROR: `███████╗██████╗ ██████╗  ██████╗ ██████╗
██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
█████╗  ██████╔╝██████╔╝██║   ██║██████╔╝
██╔══╝  ██╔══██╗██╔══██╗██║   ██║██╔══██╗
███████╗██║  ██║██║  ██║╚██████╔╝██║  ██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝`,
  };

  function escapeHtml(s) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function scrollToBottom(){ termBody.scrollTop = termBody.scrollHeight; }

  function line(html, cls="line"){
    const el = document.createElement("div");
    el.className = cls;
    el.innerHTML = html;
    termBody.appendChild(el);
    scrollToBottom();
  }

  function block(html){
    const el = document.createElement("div");
    el.className = "block";
    el.innerHTML = html;
    termBody.appendChild(el);
    scrollToBottom();
  }

  function asciiTitle(name){
    const key = name.toUpperCase();
    const art = ASCII[key] || ASCII.ERROR;
    return `<pre class="section-ascii">${escapeHtml(art)}</pre>`;
  }

  function echoCommand(cmd){
    line(`<span class="accent">></span> ${escapeHtml(cmd)}`);
  }

  function openSuggest(matches){
    currentMatches = matches;
    activeIndex = matches.length ? 0 : -1;

    suggest.innerHTML = "";
    for(let i=0;i<matches.length;i++){
      const c = matches[i];
      const item = document.createElement("div");
      item.className = "item" + (i===activeIndex ? " active" : "");
      item.setAttribute("role","option");
      item.setAttribute("aria-selected", i===activeIndex ? "true" : "false");
      item.innerHTML = `<span>/${escapeHtml(c)}</span>`;
      item.addEventListener("pointerdown",(e)=>{
        e.preventDefault();
        submit(c);
      });
      suggest.appendChild(item);
    }

    if(matches.length) suggest.classList.add("open");
    else suggest.classList.remove("open");
  }

  function closeSuggestSoon(){
    clearTimeout(closeTimer);
    closeTimer = setTimeout(()=>suggest.classList.remove("open"), 120);
  }

  function setActive(i){
    if(!currentMatches.length) return;
    activeIndex = (i + currentMatches.length) % currentMatches.length;
    [...suggest.querySelectorAll(".item")].forEach((el,idx)=>{
      el.classList.toggle("active", idx===activeIndex);
      el.setAttribute("aria-selected", idx===activeIndex ? "true" : "false");
    });
  }

  function refreshSuggest(){
    const v = input.value.trim().toLowerCase();
    const matches = v ? COMMANDS.filter(c=>c.startsWith(v)) : [...COMMANDS];
    openSuggest(matches);
  }

  async function boot(){
    line(`<span class="dim">Booting OAXSUN TECHNOLOGIES...</span>`);
    await wait(220);
    line(`<span class="dim">Connection successfull</span>`);
    await wait(180);
    line(`<span class="dim">Program started</span>`);
    await wait(220);

    block(`<div class="line dim">Available commands:</div><div class="line"><span class="accent">/menu</span> <span class="accent">/about</span> <span class="accent">/products</span> <span class="accent">/services</span> <span class="accent">/work</span> <span class="accent">/contact</span> <span class="accent">/help</span></div>`);
  }

  function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

  function respond(cmdRaw){
    const cmd = cmdRaw.trim().toLowerCase();
    if(!cmd) return;

    if(!COMMANDS.includes(cmd)){
      block(`${asciiTitle("ERROR")}
        <div class="line"><span class="accent">Command not found:</span> <span class="dim">${escapeHtml(cmd)}</span></div>
        <div class="line dim">Try: <span class="accent">help</span> or <span class="accent">menu</span></div>
      `);
      return;
    }

    switch(cmd){
      case "menu":
        block(`${asciiTitle("MENU")}
          <div class="line"><span class="accent">/about</span>     — quiénes somos</div>
          <div class="line"><span class="accent">/products</span>  — sky map + downloads</div>
          <div class="line"><span class="accent">/services</span>  — web / apps / seo</div>
          <div class="line"><span class="accent">/work</span>      — proyectos y casos</div>
          <div class="line"><span class="accent">/contact</span>   — cotiza tu proyecto</div>
          <div class="line"><span class="accent">/help</span>      — lista de comandos</div>
        `);
        break;

      case "about":
        block(`${asciiTitle("ABOUT")}
          <div class="line">Somos <span class="accent">OAXSUN TECHNOLOGIES</span>.</div>
          <div class="line dim">Desarrollo web, apps y SEO técnico enfocado en performance y resultados.</div>
        `);
        break;

      case "products":
        block(`${asciiTitle("PRODUCTS")}
          <div class="line dim">Aquí conectaremos con <span class="accent">SkyMap</span>.</div>
          <div class="line">- Genera tu mapa</div>
          <div class="line">- Compra y descarga</div>
          <div class="line dim">(placeholder)</div>
        `);
        break;

      case "services":
        block(`${asciiTitle("SERVICES")}
          <div class="line"><span class="accent">Web</span>  — landing / e-commerce / web apps</div>
          <div class="line"><span class="accent">Apps</span> — iOS/Android + backend</div>
          <div class="line"><span class="accent">SEO</span>  — SEO técnico + contenido + CWV</div>
        `);
        break;

      case "work":
        block(`${asciiTitle("WORK")}
          <div class="line">/projects</div>
          <div class="line dim">Agrega aquí tus casos reales (1-3 bien explicados > 10 vacíos).</div>
        `);
        break;

      case "contact":
        block(`${asciiTitle("CONTACT")}
          <div class="line">Email: <span class="accent">hello@oaxsun.com</span> <span class="dim">(placeholder)</span></div>
          <div class="line dim">Podemos cambiar esto por un formulario tipo “ticket”.</div>
        `);
        break;

      case "help":
        block(`${asciiTitle("HELP")}
          <div class="line dim">Comandos:</div>
          <div class="line"><span class="accent">/menu</span> <span class="accent">/about</span> <span class="accent">/products</span> <span class="accent">/services</span> <span class="accent">/work</span> <span class="accent">/contact</span> <span class="accent">/help</span></div>
        `);
        break;
    }
  }

  function submit(valueOverride=null){
    const raw = valueOverride ?? input.value;
    const cmd = raw.trim().toLowerCase();
    if(!cmd) return;

    echoCommand(cmd);
    input.value = "";
    suggest.classList.remove("open");
    respond(cmd);
  }

  // Desktop: focus opens dropdown; allow typing
  input.addEventListener("focus", ()=>{ refreshSuggest(); });
  input.addEventListener("blur", ()=>closeSuggestSoon());
  input.addEventListener("input", ()=>{ refreshSuggest(); });

  input.addEventListener("keydown", (e)=>{
    if(isTouch) return;

    const isOpen = suggest.classList.contains("open") && currentMatches.length;

    if(e.key === "Enter"){
      e.preventDefault();
      if(isOpen && activeIndex >= 0){
        const typed = input.value.trim().toLowerCase();
        if(!typed || currentMatches[activeIndex].startsWith(typed)){
          submit(currentMatches[activeIndex]);
          return;
        }
      }
      submit();
      return;
    }

    if(e.key === "Tab"){
      e.preventDefault();
      const v = input.value.trim().toLowerCase();
      const matches = v ? COMMANDS.filter(c=>c.startsWith(v)) : [...COMMANDS];
      if(matches.length === 1) input.value = matches[0];
      openSuggest(matches);
      return;
    }

    if(e.key === "Escape"){
      suggest.classList.remove("open");
      return;
    }

    if(e.key === "ArrowDown"){
      e.preventDefault();
      if(isOpen) setActive(activeIndex + 1);
      return;
    }

    if(e.key === "ArrowUp"){
      e.preventDefault();
      if(isOpen) setActive(activeIndex - 1);
      return;
    }
  });

  // Space opens dropdown (desktop only)
  document.addEventListener("keydown", (e)=>{
    if(isTouch) return;
    if(e.code !== "Space") return;
    if(document.activeElement === input) return;
    e.preventDefault();
    input.focus();
    openSuggest([...COMMANDS]);
  }, { passive:false });

  // Mobile: tap on bar opens menu; no typing
  if(isTouch){
    input.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      input.focus();
      openSuggest([...COMMANDS]);
    });
  }

  // Click terminal focuses input (desktop)
  document.addEventListener("pointerdown", (e)=>{
    const t = e.target;
    if(t && t.closest(".terminal")) input.focus();
  });

  boot();
})();
