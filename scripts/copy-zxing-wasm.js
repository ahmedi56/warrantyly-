// Copies the web QR scanner's WebAssembly (zxing) into public/ so the web app serves it
// itself instead of downloading it from the jsDelivr CDN at runtime.
// Runs after every install, so the file always matches the installed zxing-wasm version.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'zxing-wasm', 'dist', 'reader', 'zxing_reader.wasm');
const destDir = path.join(__dirname, '..', 'public', 'zxing');

if (!fs.existsSync(src)) {
  console.warn(`[copy-zxing-wasm] ${src} not found; web QR scanning will not work until it is installed.`);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, path.join(destDir, 'zxing_reader.wasm'));
console.log('[copy-zxing-wasm] public/zxing/zxing_reader.wasm updated');
