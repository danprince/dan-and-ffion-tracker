import * as Leaflet from "https://unpkg.com/leaflet@1.6.0/dist/leaflet-src.esm.js";

let theme = new Audio("/theme.mp3");

let params = new URLSearchParams(window.location.search);
let steps = params.get("steps");

if (steps === "all") {
  steps = Infinity;
} else {
  steps = parseInt(steps) || 3;
}

class AnimatedPolyline extends Leaflet.Polyline {
  constructor(latlngs, options) {
    options.speed = options.speed || 200;
    super(latlngs, options);
  }

  async addAnimatedLatLng({ lat, lng }) {
    let latLngs = this.getLatLngs();
    let startLatLng = latLngs[latLngs.length - 1];
    let endLatLng = Leaflet.latLng(lat, lng);
    let animatedLatLng = Leaflet.latLng(startLatLng.lat, startLatLng.lng);
    let offsetLat = endLatLng.lat - startLatLng.lat;
    let offsetLng = endLatLng.lng - startLatLng.lng;

    // Add the animated lat lng to the line
    this.addLatLng(animatedLatLng);

    let distance = startLatLng.distanceTo(endLatLng);
    let elapsed = 0;
    let duration = distance / this.options.speed;

    while (elapsed < duration) {
      let delta = await waitForAnimationFrame();
      elapsed += delta;

      // Move the animated point along the line
      let percent = Math.min(elapsed / duration, 1);
      animatedLatLng.lat = startLatLng.lat + (offsetLat * percent);
      animatedLatLng.lng = startLatLng.lng + (offsetLng * percent);

      this._map.setView(animatedLatLng);

      // Refresh the line now that we've mutated the points
      this.refresh();
    }

    animatedLatLng.lat = endLatLng.lat;
    animatedLatLng.lng = endLatLng.lng;
    this.refresh();
  }

  refresh() {
    let latLngs = this.getLatLngs();
    this.setLatLngs(latLngs);
  }
}

let map = Leaflet.map("map", {
  zoomControl: false
});

map.setView([51.505, -0.09], 5);

let tileLayer = Leaflet.tileLayer("https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=62412d12c2504cd495cd67d7f063bf1f", {
  apikey: "62412d12c2504cd495cd67d7f063bf1f",
  maxZoom: 22
});

tileLayer.addTo(map);

let polyline = new AnimatedPolyline([], {
  color: "red",
  weight: 6,
  opacity: 0.6,
  lineCap: "butt"
});

polyline.addTo(map);

fetch("/journey.json")
  .then(res => res.json())
  .then(play);

map.on("click", event => {
  console.log(event.latlng);
});

window.addEventListener("keydown", () => {
  theme.play();
});

async function play(journey) {
  let firstStep = journey.shift();

  polyline.addLatLng(firstStep);

  let point = Leaflet.circle(firstStep, {
    radius: 10000,
    color: "red",
    fillOpacity: 1,
  });

  point.addTo(map);

  let presetSteps = journey.slice(0, -steps);
  let animatedSteps = journey.slice(-steps);

  // Add the initial leg of the journey to the line

  for (let step of presetSteps) {
    polyline.addLatLng(step);

    let point = Leaflet.circle(step, {
      radius: 10000,
      color: "red",
      fillOpacity: 1,
    });

    point.addTo(map);
  }

  // Animate the final 3 steps (so people don't have to watch it all)

  for (let step of animatedSteps) {
    await polyline.addAnimatedLatLng(step);

    let point = Leaflet.circle(step, {
      radius: 10000,
      color: "red",
      fillOpacity: 1,
    });

    point.addTo(map);
  }
}

async function waitForAnimationFrame() {
  let startTime = performance.now();

  return new Promise(resolve => {
    requestAnimationFrame(endTime => {
      let delta = endTime - startTime;
      resolve(delta);
    })
  });
}
