// Fails if the deploy bundle would carry the local DEV_EMAIL bypass or expose workers.dev/preview URLs.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const out = execFileSync('npx', ['wrangler', 'deploy', '--dry-run', '--outdir', '.wrangler/dry-run'], {
  encoding: 'utf8',
  env: { ...process.env, CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' },
});
const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const problems = [];
if (/DEV_EMAIL/.test(out)) problems.push('DEV_EMAIL appears in deploy bindings');
if (!/"workers_dev":\s*false/.test(config)) problems.push('workers_dev must be false');
if (!/"preview_urls":\s*false/.test(config)) problems.push('preview_urls must be false');
if (!/"ALLOWED_SERVICE_TOKENS":\s*""/.test(config)) problems.push('ALLOWED_SERVICE_TOKENS must be empty');
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(out.split('\n').filter((l) => /env\.|Binding|Resource/.test(l)).join('\n'));
console.log('deploy config OK: no DEV_EMAIL, workers.dev/preview off, no service-token allowlist');
