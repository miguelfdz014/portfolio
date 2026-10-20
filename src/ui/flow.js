// Scene controls sit over the paintings only when the paintings can show them: the browser must support WebGL,
// and the screen wide enough (3:2 or wider, over 760px) that no hotspot is cropped away. Otherwise every section's
// controls drop into the normal page flow, under its text (html.stage-flow, styled in scene.css).
export function useFlowLayout({ width, height, worldReady }) {
  return !worldReady || width <= 760 || width / height < 1.5;
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
