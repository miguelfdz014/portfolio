// Scene controls sit over the paintings only when the paintings can show them whole: the browser must support
// WebGL, and the screen must be either a phone held upright (aspect 0.7 or less, which shows the tall portrait
// painting) or wide (3:2 or wider, over 760px, for the 16:9 painting). In between (tablets, squarish windows,
// landscape phones) a painting would crop hotspots away, so every section's controls drop into the normal page
// flow, under its text (html.stage-flow, styled in scene.css).
export function useFlowLayout({ width, height, worldReady }) {
  const a = width / height;
  return !worldReady || !(a <= 0.7 || (a >= 1.5 && width > 760));
}

export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function applyFlow(worldReady) {
  const flow = useFlowLayout({ width: window.innerWidth, height: window.innerHeight, worldReady });
  document.documentElement.classList.toggle('stage-flow', flow);
  return flow;
}
