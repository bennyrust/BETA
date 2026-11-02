import { existsSync, readFileSync } from 'node:fs';
const blocker = new URL('../PUBLISH-BLOCKED.md', import.meta.url);
if (existsSync(blocker)) {
  console.error(readFileSync(blocker, 'utf8'));
  process.exitCode = 1;
} else {
  console.log('Publishing blocker cleared.');
}
