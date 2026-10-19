// Twinkling starfield drawn on a full-size canvas.
export function startSky(canvas, { reducedMotion }) {
  const ctx = canvas.getContext('2d');
  let stars = [];
  let w = 0;
  let h = 0;
  let raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round((w * h) / 2600);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      // Denser near the top, thinning toward the horizon.
      y: Math.pow(Math.random(), 1.6) * h * 0.85,
      r: Math.random() < 0.08 ? 1.2 + Math.random() * 0.8 : 0.3 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.4,
      tint: Math.random() < 0.15 ? 'pink' : Math.random() < 0.5 ? 'blue' : 'white',
    }));
    if (reducedMotion) draw(0);
  }

  const tints = {
    white: '235, 238, 255',
    blue: '150, 190, 255',
    pink: '255, 170, 200',
  };

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    const t = time / 1000;
    for (const s of stars) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.phase + t * s.speed));
      ctx.fillStyle = `rgba(${tints[s.tint]}, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.r > 1.2) {
        ctx.fillStyle = `rgba(${tints[s.tint]}, ${a * 0.15})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function loop(time) {
    draw(time);
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reducedMotion) raf = requestAnimationFrame(loop);

  return () => cancelAnimationFrame(raf);
}
