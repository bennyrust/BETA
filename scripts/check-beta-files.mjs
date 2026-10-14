import { existsSync, readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const list = new URL('MISSING-ICLOUD-FILES.md', root);
const report = new URL('MEDIA-COMPRESSION.json', root);
const archives = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')).archives : {};
const entries = existsSync(list) ? [...readFileSync(list, 'utf8').matchAll(/^- `(.+)`$/gm)].map(match => match[1]) : [];
const missing = entries.filter(path => !existsSync(new URL((archives[path] || path).split('/').map(encodeURIComponent).join('/'), root)));
if (missing.length) {
 console.error(`${missing.length} source files still need downloading from iCloud and copying into BETA. See MISSING-ICLOUD-FILES.md.`);
 process.exitCode = 1;
} else console.log('All deferred iCloud files restored, including archived source downloads.');
