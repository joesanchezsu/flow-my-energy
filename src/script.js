import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createNoise3D } from "simplex-noise";

let stopped = false;

const noise3D = createNoise3D();

// /**
//  * Sizes
//  */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const lerpSpeedBase = 0.0025;
let lerpSpeed = (sizes.width * lerpSpeedBase) / 1000; // organization speed

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
const particleTexture = textureLoader.load("textures/particles/1.png");

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 30;

const particleCount = 50000;
const particles = new THREE.BufferGeometry();

const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const speeds = new Float32Array(particleCount);

const R = 8; // Major radius
const r = 7.8; // Minor radius

const uValues = new Float32Array(particleCount);
const vValues = new Float32Array(particleCount);
const uGoals = new Float32Array(particleCount);
const vGoals = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  const u = Math.random() * 2 * Math.PI;
  const v = 1;

  const z = (R + r * Math.cos(v)) * Math.cos(u);
  const x = (R + r * Math.cos(v)) * Math.sin(u);
  const y = r * Math.sin(v);

  positions[i * 3] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = z;

  uValues[i] = u; // Store base u (big circle angle)
  vValues[i] = v; // Store base v (small circle angle)

  const divisions = 12;
  const snappedU = (Math.floor(Math.random() * divisions) / divisions) * 2 * Math.PI;
  const snappedV = (Math.floor(Math.random() * divisions) / divisions) * 2 * Math.PI;

  uGoals[i] = snappedU;
  vGoals[i] = snappedV;

  colors[i * 3] = Math.random(); // R
  colors[i * 3 + 1] = Math.random() - 0.5; // G
  colors[i * 3 + 2] = Math.random() * 0.5; // B

  speeds[i] = 0.08 + Math.random() * 0.08; // Breathing speed
}

particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));

// Material
const particlesMaterial = new THREE.PointsMaterial();
particlesMaterial.size = 0.1;
particlesMaterial.sizeAttenuation = true;
particlesMaterial.depthBias = 1000; // This is to avoid z-fighting
particlesMaterial.transparent = true;
particlesMaterial.alphaMap = particleTexture;
particlesMaterial.alphaTest = 0.001; // Sometimes it's better to use alphaTest, because there are bugs related to the order of drawing the particles
particlesMaterial.depthTest = false; // Works but doesnt really respect the depth, if we put an object in front of the particles, the particles will still be visible
particlesMaterial.depthWrite = false;
particlesMaterial.blending = THREE.AdditiveBlending;
particlesMaterial.vertexColors = true;

const pointCloud = new THREE.Points(particles, particlesMaterial);
scene.add(pointCloud);

/**
 * Resizing config
 */
window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  lerpSpeed = (sizes.width * lerpSpeedBase) / 1000;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Audio
 */
const audio = new Audio("audio/Cosmic Reflection.mp3");
audio.loop = true;
audio.volume = 0.8;

const playBtn = document.getElementById("togglePlay");
const volumeBtn = document.getElementById("toggleVolume");
const restartBtn = document.getElementById("restart");

// playBtn.style.display = "none";
// restartBtn.style.display = "none";
// volumeBtn.style.opacity = "0";
let isMuted = true;

playBtn.addEventListener("click", () => {
  if (!stopped) {
    // Stop manually before 65s
    stopped = true;
    playBtn.textContent = "▶️ Play";
    fadeOutAudio(audio, 1500);
  } else {
    // Restart everything
    location.reload();
  }
});

volumeBtn.addEventListener("click", () => {
  if (isMuted) {
    fadeInAudio(audio, 0.8);
    audio.muted = false;
    volumeBtn.textContent = "🔊 On";
  } else {
    audio.muted = true;
    volumeBtn.textContent = "🔇 Off";
  }
  isMuted = !isMuted;
});

restartBtn.addEventListener("click", () => {
  // Reload page to restart everything
  fadeOutAudio(audio, 1500, () => {
    location.reload();
  });
});

function fadeInAudio(audio, targetVolume = 0.8, duration = 500) {
  audio.volume = 0;
  audio.play().catch((e) => console.warn("Autoplay blocked until user interaction"));
  const step = 0.05;
  const interval = duration / (targetVolume / step);

  const fade = setInterval(() => {
    if (audio.volume < targetVolume - step) {
      audio.volume += step;
    } else {
      audio.volume = targetVolume;
      clearInterval(fade);
    }
  }, interval);
}

function fadeOutAudio(audio, duration = 1500, callback) {
  const step = 0.05;
  const interval = duration / (audio.volume / step);

  const fade = setInterval(() => {
    if (audio.volume > step) {
      audio.volume -= step;
    } else {
      audio.volume = 0;
      audio.pause();
      clearInterval(fade);
      if (callback) callback();
    }
  }, interval);
}

/**
 * Camera Animation
 */
let transitionStartTime = null;
let transitionStartPos = null;

let zoomInStartTime = null;
let zoomInStartPos = null;

const duration = 60; // total duration in seconds
const transitionStart = 46; // when the final phase begins
const zoomInStart = 52; // when the zoom-in starts

const startFocus = new THREE.Vector3(10, 10, 10); // Close to a random particle

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Animate camera
 */
function updateCamera(elapsedTime) {
  // Camera position — parametric spiral out + rise
  if (elapsedTime < transitionStart) {
    const t = elapsedTime / duration;
    const curve = easeInOutCubic(Math.min(t, 1));

    const angle = curve * Math.PI * 3.4; // 0 → 2π
    const radius = curve * 20;
    const height = curve * 20 * Math.sin(curve * Math.PI);

    const camX = startFocus.x + Math.cos(angle) * radius + height;
    const camZ = startFocus.z + Math.cos(angle) * radius;
    const camY = startFocus.y + Math.sin(angle) * radius + height;

    camera.position.set(camX, camY, camZ);

    // Look at interpolation: start near particle → center
    const lookTarget = new THREE.Vector3().lerpVectors(
      startFocus,
      new THREE.Vector3(0, 0, 0),
      curve
    );
    camera.lookAt(lookTarget);
  } else if (elapsedTime < zoomInStart) {
    const finalTarget = new THREE.Vector3(0, -30, 0);
    if (transitionStartTime === null) {
      transitionStartTime = elapsedTime;
      transitionStartPos = camera.position.clone();
    }

    const t = Math.min(
      (elapsedTime - transitionStartTime) / (zoomInStart - transitionStart),
      1
    );
    const easedT = easeInOutCubic(t);

    const newPos = new THREE.Vector3().lerpVectors(
      transitionStartPos,
      finalTarget,
      easedT
    );
    camera.position.copy(newPos);
    camera.lookAt(0, 0, 0);
  } else {
    const finalTarget = new THREE.Vector3(0, -1, 0);
    if (zoomInStartTime === null) {
      zoomInStartTime = elapsedTime;
      zoomInStartPos = camera.position.clone();
    }

    const t = Math.min((elapsedTime - zoomInStartTime) / (duration - zoomInStart), 1);
    const easedT = easeInOutCubic(t);

    const newPos = new THREE.Vector3().lerpVectors(zoomInStartPos, finalTarget, easedT);
    camera.position.copy(newPos);
    camera.lookAt(finalTarget);
  }
  camera.matrixWorldNeedsUpdate = true;
}

/**
 * Overlay Texts
 */
const messageText = document.getElementById("messageText");
let lastMessageIndex = -1;

const messages = [
  { time: 1.0, text: "It feels like chaos and turbulence", top: "80%" },
  { time: 14.0, text: "But let’s connect", top: "10%" },
  { time: 25.0, text: "Let’s see the big picture", top: "15%" },
  { time: 32.0, text: "Let’s align our energy", top: "90%" },
  { time: 40.0, text: "We are all part of this eternal flow", top: "80%" },
  { time: 54.0, text: "This<br>Eternal<br>Bridge!", top: "50%" },
];

/**
 * Screenshot
 */
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "s") {
    takeScreenshot();
  }
});

function takeScreenshot() {
  renderer.domElement.toBlob((blob) => {
    const link = document.createElement("a");
    link.download = `screenshot-${Date.now()}.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
  });
}

/**
 * Animate
 */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  if (stopped) return;

  const elapsedTime = clock.getElapsedTime();

  if (elapsedTime >= 67 && !stopped) {
    stopped = true;
    fadeOutAudio(audio, 1500);
  }

  const positions = particles.attributes.position.array;

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;

    const angle = speeds[i];

    // Current u and v
    let u = uValues[i];
    let v = vValues[i];

    // Slowly lerp towards goal
    u += (uGoals[i] - u) * lerpSpeed;
    v += (vGoals[i] - v) * lerpSpeed;

    uValues[i] = u; // Update stored u
    vValues[i] = v; // Update stored v

    // Apply breathing/motion
    let dynamicU = u + elapsedTime * angle;
    let dynamicV = v - elapsedTime * angle;

    const z = (R + r * Math.cos(dynamicV)) * Math.cos(dynamicU);
    const x = (R + r * Math.cos(dynamicV)) * Math.sin(dynamicU);
    const y = r * Math.sin(dynamicV);

    // Alignment progress
    const alignmentU = Math.abs(uGoals[i] - u);
    const alignmentV = Math.abs(vGoals[i] - v);
    const alignment = 1.0 - Math.min(1.0, (alignmentU + alignmentV) / (Math.PI * 2)); // 0 = chaotic, 1 = aligned

    // Organic turbulence strength
    const baseNoise = noise3D(x * 0.08, y * 0.08, z * 0.08 + elapsedTime);
    const turbulence = baseNoise * (1.0 - alignment) * 0.5; // stronger when unaligned

    positions[idx] = x + turbulence;
    positions[idx + 1] = y + turbulence;
    positions[idx + 2] = z + turbulence;
  }

  let newMessageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (elapsedTime >= messages[i].time) {
      newMessageIndex = i;
      break;
    }
  }

  if (newMessageIndex !== lastMessageIndex) {
    lastMessageIndex = newMessageIndex;

    messageText.style.opacity = 0;

    setTimeout(() => {
      messageText.innerHTML = messages[newMessageIndex]?.text || "";
      messageText.style.top = messages[newMessageIndex]?.top || "10%";
      messageText.style.opacity = 1;

      if (newMessageIndex === messages.length - 1) {
        messageText.style.fontSize = "1.5rem";
      }
    }, 3000); // wait for fade out
  }

  updateCamera(elapsedTime);
  particles.attributes.position.needsUpdate = true;
  controls.update();
  renderer.render(scene, camera);
}

animate();
