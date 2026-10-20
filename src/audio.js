// Optional background music: one quiet, self-hosted loop. Nothing is downloaded until the visitor turns sound on,
// and browsers only allow sound after a click or key press, so a refused play() waits for the next one.
const KEY = 'portfolio-sound';
const VOLUME = 0.35;
const FADE_IN_MS = 2000;
const FADE_OUT_MS = 1000;
const STEP_MS = 50;

export function readSoundPref(storage) {
  try {
    return storage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeSoundPref(storage, on) {
  try {
    storage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable: the choice lasts for this visit only */
  }
}

export function createMusic({ src, createAudio = () => new Audio(), doc = document }) {
  let audio = null;
  let on = false;
  let fade = 0;

  // Ramp the volume to `to` over `ms`, then run `done`.
  function fadeTo(to, ms, done) {
    clearInterval(fade);
    const from = audio.volume;
    const steps = Math.max(1, Math.round(ms / STEP_MS));
    let i = 0;
    fade = setInterval(() => {
      i++;
      audio.volume = from + ((to - from) * i) / steps;
      if (i >= steps) {
        clearInterval(fade);
        done?.();
      }
    }, STEP_MS);
  }

  // Only a click or key press counts as a user gesture everywhere (a touch pointerdown doesn't on phones).
  // At most one retry waits at a time.
  let waiting = false;
  function retryOnInput() {
    if (waiting) return;
    waiting = true;
    const retry = () => {
      waiting = false;
      doc.removeEventListener('click', retry);
      doc.removeEventListener('keydown', retry);
      if (on) start();
    };
    doc.addEventListener('click', retry);
    doc.addEventListener('keydown', retry);
  }

  function start() {
    if (!audio) {
      audio = createAudio();
      audio.loop = true;
      audio.volume = 0;
      audio.src = src;
    }
    Promise.resolve(audio.play()).then(
      () => on && fadeTo(VOLUME, FADE_IN_MS),
      () => retryOnInput(),
    );
  }

  const onVisibility = () => {
    if (!audio || !on) return;
    if (doc.hidden) {
      clearInterval(fade);
      audio.pause();
    } else start();
  };
  doc.addEventListener('visibilitychange', onVisibility);

  return {
    get on() {
      return on;
    },
    setOn(next) {
      if (next === on) return;
      on = next;
      if (on) start();
      else if (audio) fadeTo(0, FADE_OUT_MS, () => audio.pause());
    },
    dispose() {
      clearInterval(fade);
      audio?.pause();
      doc.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
