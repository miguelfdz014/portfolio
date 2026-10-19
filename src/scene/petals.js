// Glowing rose petals drifting down across the viewport.
export function startPetals(canvas, { reducedMotion }) {
  if (reducedMotion) return () => {};

  const ctx = canvas.getContext('2d');
  let petals = [];
  let w = 0;
  let h = 0;
  let raf = 0;
  let last = performance.now();

  function spawn(initial = false) {
    const size = 5 + Math.random() * 9;
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : -20 - Math.random() * 100,
      size,
      vy: 18 + Math.random() * 30,
      sway: 20 + Math.random() * 40,
      swaySpeed: 0.4 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 1.6,
      flip: Math.random() * Math.PI * 2,
      alpha: 0.55 + Math.random() * 0.4,
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(10, Math.min(34, Math.round(w / 45)));
    petals = Array.from({ length: count }, () => spawn(true));
  }

  function drawPetal(p, t) {
    ctx.save();
    ctx.translate(p.x + Math.sin(p.phase + t * p.swaySpeed) * p.sway, p.y);
    ctx.rotate(p.rot);
    // Fake 3D tumble by squashing one axis.
    ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(p.flip + t)));
    ctx.globalAlpha = p.alpha;
    ctx.shadowColor = 'rgba(255, 111, 156, 0.9)';
    ctx.shadowBlur = p.size * 1.6;
    const s = p.size;
    const grad = ctx.createLinearGradient(0, -s, 0, s);
    grad.addColorStop(0, '#ffc2d4');
    grad.addColorStop(0.5, '#ff6f9c');
    grad.addColorStop(1, '#c23b6a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.6, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.6, -s * 0.9, -s * 0.6, 0, -s);
    ctx.fill();
    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 30) petals[i] = spawn();
      drawPetal(p, t);
    }
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(loop);

  return () => cancelAnimationFrame(raf);
}
