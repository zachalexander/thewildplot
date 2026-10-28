import { hummingbird } from './hummingbird.js';

export const stories = [hummingbird];
export const featured = stories.filter((s) => s.featured);
