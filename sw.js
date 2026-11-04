/*!
 * sw.js — 离线缓存（PWA）
 * 只缓存本应用的静态资源；不缓存任何训练/饮食数据（数据都在 localStorage）
 */
'use strict';

var CACHE_NAME = 'fitdaily-shell-20261105';
var PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/shell.css',
  './css/views.css',
  './js/data.js',
  './js/nutrition.js',
  './js/core.js',
  './js/training.js',
  './js/diet.js',
  './js/weight.js',
  './js/settings.js',
  './js/dashboard.js',
  './js/app.js',
  './img/icon-192.png',
  './img/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // 单个资源失败不应阻止安装
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(url).catch(function () { /* 忽略缺失资源 */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 导航请求：网络优先，离线回退到缓存的 index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match('./index.html').then(function (res) {
          return res || caches.match('./');
        });
      })
    );
    return;
  }

  // 其它静态资源：缓存优先 + 后台更新（stale-while-revalidate）
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});