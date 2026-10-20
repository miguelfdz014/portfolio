// Runs texture generators off the main thread and transfers the bytes back.
import { jobs } from './gen.js';

const makeCanvas = (w, h) => new OffscreenCanvas(w, h);

self.onmessage = ({ data: { id, job, size } }) => {
  try {
    const out = job === 'moon' ? jobs.moon(size, makeCanvas) : jobs[job](size);
    const buffers = [out.color, out.normal, out.data].filter(Boolean).map((a) => a.buffer);
    self.postMessage({ id, out }, buffers);
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
