// Which painting a stage shows: the tall one on upright screens, the 16:9 one on square and wide ones.
export const orientation = ({ width, height }) => (width / height < 1 ? 'portrait' : 'landscape');
