import * as Leaflet from "https://unpkg.com/leaflet@1.6.0/dist/leaflet-src.esm.js";

const TILES_API_KEY = "62412d12c2504cd495cd67d7f063bf1f";

/**
 * @return {App}
 */
function createApp() {
  let params = new URLSearchParams(location.search);
  let start = params.get("start") || "-3";
  let stepIndex = parseInt(start);

  let map = Leaflet.map("map", {
    zoomControl: false
  });

  let tiles = Leaflet.tileLayer(`https://tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=${TILES_API_KEY}`, {
    apikey: TILES_API_KEY,
    maxZoom: 7
  });

  let line = Leaflet.polyline([], {
    color: "red",
    weight: 6,
    opacity: 0.6,
    lineCap: "butt"
  });

  tiles.addTo(map);
  line.addTo(map);
  map.setView([55, 37], 4);

  let music = new Audio("theme.mp3");

  return {
    steps: [],
    stepIndex,
    map,
    tiles,
    line,
    music,
  }
}

function Start() {
  let app = createApp();
  return Load(app);
}

// --- States ---

/**
 * @param {App} app
 */
async function Load(app) {
  try {
    let { stepIndex } = app;

    let response = await fetch("journey.json");
    let steps = await response.json();

    // Remove steps from the future
    steps = steps.filter(step => {
      return new Date(step.date) <= new Date();
    });

    if (stepIndex < 0) {
      stepIndex = steps.length + stepIndex;
    }

    if (stepIndex < 1) {
      stepIndex = 1;
    }

    return Ready({ ...app, steps, stepIndex });
  } catch (error) {
    return LoadError({ ...app, error });
  }
}

/**
 * @param {App} app
 */
function LoadError(app) {
  $("#error-overlay").classList.add("visible");

  function retry(event) {
    $("#error-overlay").classList.remove("visible");
    return Load(app);
  }

  $("#retry-button").addEventListener("click", retry, { once: true });
}

/**
 * @param {App} app
 */
function Ready(app) {
  let { steps, stepIndex, map, music } = app;

  $("#ready-overlay").classList.add("visible");

  let step = steps[stepIndex];
  map.setView(step);

  function start() {
    $("#ready-overlay").classList.remove("visible");

    music.play();

    music.addEventListener("ended", () => {
      music.play();
    });

    return PlayStep(app);
  }

  $("#start-button").addEventListener("click", start, { once: true });
}

/**
 * @param {App} app
 */
async function PlayStep(app) {
  let { steps, stepIndex, map, line } = app;

  let currentStep = steps[stepIndex];
  let previousStep = steps[stepIndex - 1];
  let existingSteps = steps.slice(0, stepIndex);
  let distance = dist(previousStep, currentStep);

  let duration = distance / 200;
  let elapsed = 0;

  for (let step of existingSteps) {
    if (step.zoom) {
      map.setZoom(step.zoom);
    }
  }

  while (elapsed < duration) {
    elapsed += await requestAnimationFrameAsync();

    let percent = clamp(0, elapsed / duration, 1);
    let lat = lerp(previousStep.lat, currentStep.lat, percent);
    let lng = lerp(previousStep.lng, currentStep.lng, percent);

    line.setLatLngs([...existingSteps, { lat, lng }]);
    map.setView([lat, lng]);
  }

  line.setLatLngs([...existingSteps, currentStep]);
  map.setView(currentStep, currentStep.zoom);

  await setTimeoutAsync(500);

  return NextStep(app);
}

/**
 * @param {App} app
 */
function NextStep(app) {
  let { steps, stepIndex } = app;

  if (stepIndex + 1 >= steps.length) {
    return Finished(app);
  }

  return PlayStep({ ...app, stepIndex: stepIndex + 1 });
}

/**
 * @param {App} app
 */
function Finished(app) {
  let currentLocation = null;

  for (let step of app.steps) {
    if (step.label) {
      currentLocation = step.label;
    }
  }

  $("#current-location").textContent = currentLocation;
  $("#end-overlay").classList.add("visible");
  $("#restart-button").addEventListener("click", restart, { once: true });

  function restart() {
    $("#end-overlay").classList.remove("visible");
    return Restart(app);
  }
}

/**
 * @param {App} app
 */
function Restart(app) {
  return PlayStep({ ...app, stepIndex: 1 });
}

// --- Utils ---

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t Between 0 and 1
 */
function lerp(a, b, t) {
  let d = b - a;
  return a + d * t;
}

/**
 * @param {number} min
 * @param {number} value
 * @param {number} max
 */
function clamp(min, value, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {LatLng} a
 * @param {LatLng} b
 */
function dist(a, b) {
  return Leaflet.latLng(a).distanceTo(Leaflet.latLng(b));
}

/**
 * @return {Promise<number>}
 */
async function requestAnimationFrameAsync() {
  let startTime = performance.now();

  return new Promise(resolve => {
    requestAnimationFrame(endTime => {
      let delta = endTime - startTime;
      resolve(delta);
    })
  });
}

/**
 * @param {number} ms
 */
async function setTimeoutAsync(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {string} selector
 */
function $(selector) {
  return document.querySelector(selector);
}

Start();
