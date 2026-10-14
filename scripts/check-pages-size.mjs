import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('../', import.meta.url).pathname;
let bytes = 0;
async function scan(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.DS_Store', '__pycache__'].includes(item.name)) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) await scan(path);
    else { const info = await stat(path); bytes += info.size; }
  }
}
await scan(root);
console.log(`Site size: ${(bytes / 1024 ** 3).toFixed(2)} GiB`);
if (bytes > 1000 * 1000 * 1000) {
  console.error('Pages preparation blocked: reduce the deployed assets below 1 GB. Git LFS is for source storage and does not solve the Pages size limit.');
  process.exitCode = 1;
}
