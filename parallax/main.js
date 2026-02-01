import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";

/**
 * Galaxy vortex style (Astrarise-like):
 * - Positions generated in spiral arms (branches)
 * - Randomness offset (power curve)
 * - Animated rotation in vertex shader: each star rotates faster near the core
 */

const app = document.getElementById("app");

// --- Scene / Camera / Renderer
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(2.4, 1.2, 6.8);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05060c, 1);
app.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.2;
controls.maxDistance = 16;
controls.enablePan = false;

// --- Params (similares a los del ejemplo)
const params = {
  count: 200000,
  radius: 6,
  branches: 4,
  randomness: 0.6,
  randomnessPower: 4,
  size: 0.018,
  spin: 1.2,
  rotationSpeed: 0.7,
  insideColor: "#ffffff",
  outsideColor: "#7c5cff",
};

// --- Galaxy resources
let geometry = null;
let material = null;
let points = null;

function disposeGalaxy() {
  if (points) scene.remove(points);
  if (geometry) geometry.dispose();
  if (material) material.dispose();
  geometry = material = points = null;
}

// Vertex shader: aplica rotación animada por distancia
const vertexShader = `
  uniform float uTime;
  uniform float uSize;
  uniform float uRotationSpeed;

  attribute float aScale;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;

    // Distancia al centro (en XZ)
    float dist = length(p.xz);

    // Rotación: más rápido cerca del centro
    float angle = atan(p.x, p.z);
    float speed = uRotationSpeed / (dist + 0.25);
    angle += uTime * speed;

    float x = sin(angle) * dist;
    float z = cos(angle) * dist;
    p.x = x;
    p.z = z;

    // Proyección
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Tamaño del punto (con atenuación por distancia)
    gl_PointSize = uSize * aScale;
    gl_PointSize *= (1.0 / -mv.z);

    vColor = aColor;

    // Un poco de alpha extra hacia el core (para "vórtice" más denso)
    vAlpha = smoothstep(1.0, 0.0, dist / 6.0);
  }
`;

// Fragment shader: puntos redondos + brillo suave (additive blending)
const fragmentShader = `
  precision highp float;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Coord del punto (0..1)
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);

    // Disco suave
    float core = smoothstep(0.5, 0.0, d);
    float glow = smoothstep(0.5, 0.15, d);

    float alpha = (core * 0.9 + glow * 0.55) * vAlpha;

    // Recorta bordes duros
    if(alpha < 0.02) discard;

    gl_FragColor = vec4(vColor, alpha);
  }
`;

function generateGalaxy() {
  disposeGalaxy();

  geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(params.count * 3);
  const colors = new Float32Array(params.count * 3);
  const scales = new Float32Array(params.count);

  const inside = new THREE.Color(params.insideColor);
  const outside = new THREE.Color(params.outsideColor);

  for (let i = 0; i < params.count; i++) {
    const i3 = i * 3;

    // Radius & branch
    const r = Math.random() * params.radius;
    const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2;

    // Spiral "spin"
    const spinAngle = r * params.spin;

    // Randomness (power curve)
    const rand = () => {
      const sign = Math.random() < 0.5 ? -1 : 1;
      return Math.pow(Math.random(), params.randomnessPower) * sign * params.randomness * r;
    };

    const randomX = rand();
    const randomY = rand() * 0.35; // menos en Y para aplanar tipo galaxia
    const randomZ = rand();

    // Position (XZ)
    positions[i3 + 0] = Math.cos(branchAngle + spinAngle) * r + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

    // Color gradient (inside -> outside)
    const mixed = inside.clone();
    mixed.lerp(outside, r / params.radius);
    colors[i3 + 0] = mixed.r;
    colors[i3 + 1] = mixed.g;
    colors[i3 + 2] = mixed.b;

    // Star size variance
    scales[i] = 0.6 + Math.random() * 1.8;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: params.size * renderer.getPixelRatio() },
      uRotationSpeed: { value: params.rotationSpeed },
    },
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);
}

generateGalaxy();

// --- GUI (controles tipo Astrarise)
const gui = new GUI({ width: 320 });
gui.title("Galaxy Controls");

gui.addColor(params, "outsideColor").name("Galaxy Color").onFinishChange(generateGalaxy);
gui.add(params, "count", 20000, 260000, 1000).name("Particle Count").onFinishChange(generateGalaxy);
gui.add(params, "radius", 1, 12, 0.1).name("Radius").onFinishChange(generateGalaxy);
gui.add(params, "branches", 2, 10, 1).name("No. of Branches").onFinishChange(generateGalaxy);
gui.add(params, "randomness", 0, 2, 0.01).name("Particle Randomness").onFinishChange(generateGalaxy);
gui.add(params, "randomnessPower", 1, 10, 0.1).name("Randomness Power").onFinishChange(generateGalaxy);

const f = gui.addFolder("Motion");
f.add(params, "spin", 0, 6, 0.01).name("Spiral Tightness").onFinishChange(generateGalaxy);
f.add(params, "rotationSpeed", 0, 2.5, 0.01).name("Rotation Speed").onChange((v) => {
  if (material) material.uniforms.uRotationSpeed.value = v;
});
f.open();

const a = gui.addFolder("Appearance");
a.add(params, "size", 0.003, 0.06, 0.001).name("Particle Size").onChange((v) => {
  if (material) material.uniforms.uSize.value = v * renderer.getPixelRatio();
});
a.addColor(params, "insideColor").name("Core Color").onFinishChange(generateGalaxy);
a.open();

// --- Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (material) material.uniforms.uSize.value = params.size * renderer.getPixelRatio();
});

// --- Animate
const clock = new THREE.Clock();

function tick() {
  const t = clock.getElapsedTime();
  controls.update();

  if (material) material.uniforms.uTime.value = t;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
