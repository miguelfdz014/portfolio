// Hotspot coordinates (u, v from the painting's top-left) for each stage's 16:9 and portrait paintings.
import hotspots from '../art/hotspots.json';

export const hotspotsFor = (stage, orient = 'landscape') => hotspots[stage][orient === 'portrait' ? 'portrait' : 'landscape'];
