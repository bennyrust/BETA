import { reportFatal } from './errors.js';

// Keep startup reporting independent of the CDN and WebGL initialization.
import('./app.js').then(({ start }) => start()).catch(error => { reportFatal(error); window.siteLoading?.fail('The scene could not finish loading. Please retry.'); });
