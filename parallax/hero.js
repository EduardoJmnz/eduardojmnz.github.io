(() => {
  const termBody = document.getElementById("termBody");
  const input = document.getElementById("cmd");
  const suggest = document.getElementById("suggest");

  const COMMANDS = ["about", "skymap", "solutions", "work", "contact", "help"];

  const isTouch =
    window.matchMedia?.("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  const DESKTOP_HINT = "Press [space] to see commands.";
  const MOBILE_HINT = "Select a command";

  // Set hint per device
  input.placeholder = isTouch ? MOBILE_HINT : DESKTOP_HINT;

  if (isTouch) {
    input.setAttribute("readonly", "");
    input.setAttribute("inputmode", "none");
  }

  let activeIndex = -1;
  let currentMatches = [];
  let closeTimer = null;
  let busy = false;

  const ASCII = {
        ABOUT: ` █████╗ ██████╗  ██████╗ ██╗   ██╗████████╗
██╔══██╗██╔══██╗██╔═══██╗██║   ██║╚══██╔══╝
███████║██████╔╝██║   ██║██║   ██║   ██║
██╔══██║██╔══██╗██║   ██║██║   ██║   ██║
██║  ██║██████╔╝╚██████╔╝╚██████╔╝   ██║
╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚═════╝    ╚═╝`,
    SKYMAP: `███████╗██╗  ██╗██╗   ██╗███╗   ███╗ █████╗ ██████╗
██╔════╝██║ ██╔╝╚██╗ ██╔╝████╗ ████║██╔══██╗██╔══██╗
███████╗█████╔╝  ╚████╔╝ ██╔████╔██║███████║██████╔╝
╚════██║██╔═██╗   ╚██╔╝  ██║╚██╔╝██║██╔══██║██╔═══╝
███████║██║  ██╗   ██║   ██║ ╚═╝ ██║██║  ██║██║
╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝`,
    SOLUTIONS: `███████╗ ██████╗ ██╗     ██╗   ██╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
██╔════╝██╔═══██╗██║     ██║   ██║╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
███████╗██║   ██║██║     ██║   ██║   ██║   ██║██║   ██║██╔██╗ ██║███████╗
╚════██║██║   ██║██║     ██║   ██║   ██║   ██║██║   ██║██║╚██╗██║╚════██║
███████║╚██████╔╝███████╗╚██████╔╝   ██║   ██║╚██████╔╝██║ ╚████║███████║
╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝    ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝`,
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
    return el;
  }

  function blockContainer(){
    const el = document.createElement("div");
    el.className = "block fax";
    termBody.appendChild(el);
    scrollToBottom();
    return el;
  }

  function echoCommand(cmd){
    line(`<span class="accent">></span> ${escapeHtml(cmd)}`);
  }

  function asciiTitle(name){
    const key = name.toUpperCase();
    const art = ASCII[key] || ASCII.ERROR;
    return `<pre class="section-ascii">${escapeHtml(art)}</pre>`;
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

  function disableInput(disabled){
    busy = disabled;
    input.disabled = disabled;
    if(disabled) input.blur();
  }

  function renderBar(pct, width){
    const filled = Math.round((pct/100)*width);
    const empty = Math.max(0, width - filled);
    return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
  }

  function loaderBarWidth(){
    // Smaller on mobile to avoid overflow
    return isTouch ? 10 : 18;
  }

  function showRetroLoader(taskLabel){
    const wrap = document.createElement("div");
    wrap.className = "loader";
    wrap.innerHTML = `
      <span class="label dim">·</span>
      <span class="label">hvv</span>
      <span class="label"> ${escapeHtml(taskLabel)} </span>
      <span class="bar">${renderBar(0, loaderBarWidth())}</span>
      <span class="pct dim">0%</span>
    `;
    termBody.appendChild(wrap);
    scrollToBottom();
    return {
      wrap,
      barEl: wrap.querySelector(".bar"),
      pctEl: wrap.querySelector(".pct"),
    };
  }

  async function runWithLoader(taskLabel, ms=900){
    disableInput(true);

    const { wrap, barEl, pctEl } = showRetroLoader(taskLabel);
    let pct = 0;

    const tick = 55;
    const steps = Math.max(8, Math.floor(ms / tick));
    let i = 0;

    const timer = setInterval(()=>{
      i++;
      pct = Math.min(100, Math.round((i/steps)*100));
      barEl.textContent = renderBar(pct, loaderBarWidth());
      pctEl.textContent = pct + "%";
      scrollToBottom();
      if(pct >= 100) clearInterval(timer);
    }, tick);

    await new Promise(r=>setTimeout(r, ms));
    clearInterval(timer);
    barEl.textContent = renderBar(100, loaderBarWidth());
    pctEl.textContent = "100%";

    await new Promise(r=>setTimeout(r, 220));
    wrap.remove();

    disableInput(false);
  }

  async function faxPrint(cmd, titleKey, linesArr){
    await runWithLoader(`switch ${cmd} app`, 950);

    const box = blockContainer();
    box.insertAdjacentHTML("beforeend", asciiTitle(titleKey));

    let delay = 60;
    for(const l of linesArr){
      const ln = document.createElement("div");
      ln.className = "line fax-line";
      ln.style.animationDelay = delay + "ms";
      ln.innerHTML = l;
      box.appendChild(ln);
      delay += 90;
    }
    scrollToBottom();
  }

  async function boot(){
    line(`<span class="dim">Booting OAXSUN TECHNOLOGIES...</span>`);
    await wait(900);

    line(`<span class="dim">Connecting to port 0000...</span>`);
    await wait(900);

    line(`<span class="dim">Connection successfull</span>`);
    await wait(500);

    line(`<span class="dim">App started</span>`);
    await wait(400);

    const box = blockContainer();
    box.innerHTML = `<div class="line">Welcome to <span class="accent">Oaxsun Technologies</span>. Here you can discover who we are and what we have to offer you.</div><div class="line">&nbsp;</div><div class="line dim">Available commands:</div><div class="line"><span class="accent">/about</span> <span class="accent">/skymap</span> <span class="accent">/solutions</span> <span class="accent">/work</span> <span class="accent">/contact</span> <span class="accent">/help</span></div>`;
  }

  function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

  async function respond(cmdRaw){
    const cmd = cmdRaw.trim().toLowerCase();
    if(!cmd) return;

    if(!COMMANDS.includes(cmd)){
      await faxPrint(cmd, "ERROR", [
        `<span class="accent">Command not found:</span> <span class="dim">${escapeHtml(cmd)}</span>`,
        `<span class="dim">Try:</span> <span class="accent">help</span> <span class="dim">or</span> <span class="accent">help</span>`
      ]);
      return;
    }

    switch(cmd){
      
      case "about":
        await faxPrint("about", "ABOUT", [
          `<span class="dim">We are</span> <span class="accent">Oaxsun Technologies</span><span class="dim">, proudly founded in</span> <span class="accent">Toronto, Canada</span><span class="dim">.</span>`,
          `<span class="accent">Mission:</span> <span class="dim">Build reliable software that helps businesses grow through speed, clarity, and measurable results.</span>`,
          `<span class="accent">Vision:</span> <span class="dim">Become a trusted global partner for modern web, mobile, and SEO solutions—crafted with care and performance-first thinking.</span>`
        ]);
        break;

      
      
      case "skymap":
        await faxPrint("skymap", "SKYMAP", [
          `<span class="dim">A personalized</span> <span class="accent">star map</span> <span class="dim">generated from your date, location and story.</span>`,
          `<span class="dim">Perfect for gifts, anniversaries, milestones, and memories.</span>`,
          `<a class="btn" href="https://eduardojmnz.github.io/skymap" target="_blank" rel="noopener noreferrer">Open SkyMap</a>`
        ]);
        break;

case "solutions":
        await faxPrint("solutions", "SOLUTIONS", [
          `<span class="dim">We design and build end-to-end digital products—fast, scalable, and performance-first.</span>`,
          `<span class="accent">Web Development</span> <span class="dim">— landing pages, websites, e-commerce, web apps, APIs, integrations</span>`,
          `<span class="accent">App Development</span> <span class="dim">— iOS, Android, cross-platform, backend, dashboards</span>`,
          `<span class="accent">SEO</span> <span class="dim">— technical SEO, Core Web Vitals, on-page, content structure, analytics</span>`
        ]);
        break;

case "work":
        await faxPrint("work", "WORK", [
          `<span class="dim">Selected projects and case studies.</span>`,
          `<span class="dim">(placeholder)</span>`
        ]);
        break;

      case "contact":
        await faxPrint("contact", "CONTACT", [
          `<span class="dim">Email:</span> <a class="accent-link" href="mailto:hello@oaxsun.tech">hello@oaxsun.tech</a>`,
          `<span class="dim">Tell us what you are building and we will reply with the next steps.</span>`
        ]);
        break;

      case "help":
        await faxPrint("help", "HELP", [
          `<span class="dim">Commands:</span>`,
          `<span class="accent">/about</span> <span class="accent">/skymap</span> <span class="accent">/solutions</span> <span class="accent">/work</span> <span class="accent">/contact</span> <span class="accent">/help</span>`
        ]);
        break;
    }
  }

  function niceLabel(cmd){
    if(cmd === "skymap") return "SkyMap";
    return cmd.charAt(0).toUpperCase() + cmd.slice(1);
  }

  async function submit(valueOverride=null){
    if (busy) return;

    const raw = valueOverride ?? input.value;
    const cmd = raw.trim().toLowerCase();
    if(!cmd) return;

    // Replace the hint with the selected command in BOTH desktop + mobile
    input.value = niceLabel(cmd);

    echoCommand(cmd);
    suggest.classList.remove("open");

    await respond(cmd);

    // Desktop clears after run (so user can type again)
    if (!isTouch) input.value = "";
  }

  // Desktop: focus opens dropdown; allow typing
  input.addEventListener("focus", ()=>{ refreshSuggest(); });
  input.addEventListener("blur", ()=>closeSuggestSoon());
  input.addEventListener("input", ()=>{ refreshSuggest(); });

  input.addEventListener("keydown", (e)=>{
    if(isTouch) return;
    if (busy) { e.preventDefault(); return; }

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
    if (busy) return;
    if(e.code !== "Space") return;
    if(document.activeElement === input) return;
    e.preventDefault();
    input.focus();
    openSuggest([...COMMANDS]);
  }, { passive:false });

  // Mobile: tap on bar opens menu; clears selection to show hint again
  if(isTouch){
    input.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      if (busy) return;

      input.value = "";
      input.placeholder = MOBILE_HINT;

      input.focus();
      openSuggest([...COMMANDS]);
    });
  }

  boot();
})();
