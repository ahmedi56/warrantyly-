// Tells the page what kind of device is looking at it, so it can show the right download option.
// Kept as its own file because the site's security headers don't allow inline scripts.
// Without JavaScript the page still works: it just shows both buttons.
(function () {
  var ua = navigator.userAgent || '';
  // iPads in desktop mode report themselves as a Mac, but only they have a touch screen.
  var ipadAsMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  var device = /iPhone|iPad|iPod/.test(ua) || ipadAsMac ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop';
  document.documentElement.setAttribute('data-device', device);
})();
