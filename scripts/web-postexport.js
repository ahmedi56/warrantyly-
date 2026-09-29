// Runs after `expo export --platform web` to make dist/ deployable on static hosts.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(dist)) {
  console.error('[web-postexport] dist/ not found; run `expo export --platform web` first.');
  process.exit(1);
}

// 1. 404 page. Expo exports the not-found screen as +not-found.html, but Cloudflare Pages and
//    Netlify serve 404.html (with a real 404 status) for unknown URLs. Without it, Cloudflare
//    Pages assumes a single-page app and returns the home page with 200.
const notFound = path.join(dist, '+not-found.html');
if (!fs.existsSync(notFound)) {
  console.error('[web-postexport] dist/+not-found.html missing.');
  process.exit(1);
}
fs.copyFileSync(notFound, path.join(dist, '404.html'));
console.log('[web-postexport] dist/404.html created');

// 2. Assets from packages. Expo places them in dist/assets/node_modules/, but Cloudflare's
//    uploader (wrangler pages deploy) skips every "node_modules" folder, so fonts and icons
//    would 404 (and the app waits for its fonts before drawing anything). Move them to
//    dist/assets/vendor/ and point the exported files at the new location.
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'vendor');
if (fs.existsSync(from)) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.renameSync(from, to);

  let rewritten = 0;
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(js|html|css|json)$/.test(entry.name)) {
        const text = fs.readFileSync(file, 'utf8');
        if (text.includes('/assets/node_modules/')) {
          fs.writeFileSync(file, text.split('/assets/node_modules/').join('/assets/vendor/'));
          rewritten++;
        }
      }
    }
  })(dist);
  console.log(`[web-postexport] moved assets/node_modules -> assets/vendor (${rewritten} file(s) updated)`);
}
