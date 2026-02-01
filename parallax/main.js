// ----- Helpers
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// ----- Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// ----- Accent color control
const accent = document.getElementById("accent");
accent.addEventListener("input", (e) => {
  document.documentElement.style.setProperty("--accent", e.target.value);
});

// ----- Parallax layers driven by scroll
const layers = [...document.querySelectorAll(".layer")];
let latestScrollY = 0;

function onScroll(){
  latestScrollY = window.scrollY || 0;
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

function renderParallax(){
  const y = latestScrollY;
  for (const el of layers){
    const speed = Number(el.dataset.speed || 0.2);
    // translate less than scroll => parallax depth
    const ty = -y * speed;
    el.style.transform = `translate3d(0, ${ty}px, 0)`;
  }
  requestAnimationFrame(renderParallax);
}
requestAnimationFrame(renderParallax);

// ----- Canvas starfield (lightweight)
const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d", { alpha: true });

let W = 0, H = 0, DPR = 1;
let stars = [];
let t = 0;

function resize(){
  DPR = clamp(window.devicePixelRatio || 1, 1, 2);
  W = Math.floor(window.innerWidth * DPR);
  H = Math.floor(window.innerHeight * DPR);
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  initStars();
}
window.addEventListener("resize", resize);

function initStars(){
  const count = clamp(Math.floor((W * H) / 90000), 180, 800);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    z: Math.random(),           // depth
    r: 0.6 + Math.random() * 1.6,
    tw: Math.random() * 1.0,    // twinkle seed
  }));
}

function getAccentRGBA(alpha){
  // read CSS var --accent (#RRGGBB)
  const hex = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent").trim();
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(124,92,255,${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function draw(){
  t += 0.01;

  // subtle fade to create trailing feel
  ctx.clearRect(0, 0, W, H);

  const scrollN = clamp((latestScrollY / (document.body.scrollHeight - window.innerHeight || 1)), 0, 1);

  // draw stars
  for (const s of stars){
    const drift = (0.12 + s.z * 0.55) * DPR;
    s.y += drift * (0.6 + scrollN * 2.2);
    if (s.y > H + 10){
      s.y = -10;
      s.x = Math.random() * W;
    }

    const tw = 0.55 + 0.45 * Math.sin(t + s.tw * 6.283);
    const alpha = (0.18 + s.z * 0.55) * tw;

    // some stars get accent tint
    const tint = s.z > 0.78 ? getAccentRGBA(alpha) : `rgba(255,255,255,${alpha})`;

    ctx.beginPath();
    ctx.fillStyle = tint;
    ctx.arc(s.x, s.y, s.r * (0.6 + s.z * 1.1) * DPR, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

resize();
requestAnimationFrame(draw);
