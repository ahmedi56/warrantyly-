/** Native scanning is built into the camera module; only web needs setup (see barcode.web.ts). */
export function prepareBarcodeScanner() {
  return Promise.resolve();
}
