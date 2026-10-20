// Pure layout math for the painted stages. View space: height 2 units (-1..1), width W = 2 * aspect.

// Offset of a layer with parallax factor p: before scrolling (s = 0) it sits p * travel lower, and the mouse
// (mx, my in -1..1) tilts it slightly. Nearer layers (higher p) move more.
export function parallax({ p, travel, s, mx, my }) {
  return { dx: -mx * p * 0.06, dy: -p * travel * (1 - s) + my * p * 0.03 };
}

// Wraps x into [-w/2, w/2), for tiled layers that drift forever (clouds).
export function wrap(x, w) {
  return ((((x + w / 2) % w) + w) % w) - w / 2;
}

// Size of a layer that must span the view: a share of the view width, never narrower than minWidth.
export function coverLayout(imgAspect, W, { minWidth = 0, widthFactor = 1 } = {}) {
  const w = Math.max(W * widthFactor, minWidth);
  return { w, h: w / imgAspect };
}

// CSS pixel position of a point on a layer image. u, v in 0..1 (v from the top of the image);
// rect is the layer's centre and size in view units.
export function artToScreen(u, v, rect, W, viewport) {
  const x = rect.x + (u - 0.5) * rect.w;
  const y = rect.y + (0.5 - v) * rect.h;
  return { left: ((x + W / 2) / W) * viewport.width, top: ((1 - y) / 2) * viewport.height };
}
