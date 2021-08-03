const ua = navigator.userAgent.toLowerCase();

export const isIOS = ['iphone', 'ipad', 'macintosh'].some(
  (el) => ua.indexOf(el) > -1
);

export const isAndroid = ua.indexOf('android') > -1;
