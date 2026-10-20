// Real HTML controls laid over the painted art. Each `[data-art="layerIndex,u,v"]` child of `root` is placed on
// that point of the stage's layer. When the stage is off screen the controls are hidden but stay in the tab
// order: focusing one glides the page to its section, so keyboard focus never lands on something invisible.
import { artToScreen } from '../scene/layout.js';

export function mountOverlay(root, stageId, getRect, glideTo) {
  const section = root.closest('section');
  const spots = () => [...root.querySelectorAll('[data-art]')];
  let active = true;

  // In the flow layout the controls live in their section, and the browser has already scrolled to them.
  const onFocus = () => {
    if (!active && section && !document.documentElement.classList.contains('stage-flow')) glideTo(section);
  };
  let last = null;
  root.addEventListener('focusin', onFocus);
  root.dataset.stage = stageId;

  const api = {
    place(W, viewport) {
      last = { W, viewport };
      // On-screen width of the base painting, so CSS can size text to the art (e.g. the book's pages).
      const base = getRect(0);
      if (base?.w) root.style.setProperty('--art-w', `${Math.round((base.w / W) * viewport.width)}px`);
      for (const el of spots()) {
        const [layer, u, v] = el.dataset.art.split(',').map(Number);
        // Before the stage has been laid out, assume a 16:9 painting covering the view (every stage starts so).
        const laidOut = getRect(layer);
        const rect = laidOut?.w ? laidOut : { x: 0, y: 0, w: Math.max(W, 32 / 9), h: Math.max(W, 32 / 9) * (9 / 16) };
        const { left, top } = artToScreen(u, v, rect, W, viewport);
        el.style.left = `${Math.round(left)}px`;
        el.style.top = `${Math.round(top)}px`;
      }
    },
    setActive(on) {
      // Controls that open things (a quest scroll) close themselves when their stage leaves the screen.
      if (active && !on) root.dispatchEvent(new Event('stage:hidden'));
      active = on;
      for (const el of spots()) el.classList.toggle('is-hidden', !on);
    },
    // After the controls are re-rendered (a language switch), give the new nodes their place and visibility.
    refresh() {
      if (last) api.place(last.W, last.viewport);
      for (const el of spots()) el.classList.toggle('is-hidden', !active);
    },
    dispose() {
      root.removeEventListener('focusin', onFocus);
    },
  };
  return api;
}
