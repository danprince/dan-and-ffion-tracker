declare type LatLng =
  | { lat: number, lng: number }
  | [number, number];

declare type Step = {
  id: string,
  label?: string,
  lat: number,
  lng: number,
  zoom?: number,
}

declare type App = {
  steps: Step[],
  stepIndex: number,
  map: any,
  line: any,
  tiles: any,
  music: HTMLAudioElement,
}
