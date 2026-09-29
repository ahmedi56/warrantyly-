let prepared: Promise<void> | undefined;

/**
 * Points the web QR scanner (zxing WebAssembly) at our own copy in `public/zxing/`
 * instead of its jsDelivr CDN default. Uses the same `barcode-detector` specifier that
 * expo-camera loads, so both share one module instance and therefore this setting.
 * Resolve before enabling barcode scanning so the override is in place first.
 */
export function prepareBarcodeScanner() {
  prepared ??= import('barcode-detector').then(({ prepareZXingModule }) => {
    prepareZXingModule({
      overrides: {
        locateFile: (file: string, prefix: string) => (file.endsWith('.wasm') ? `/zxing/${file}` : prefix + file),
      },
    });
  });
  return prepared;
}
