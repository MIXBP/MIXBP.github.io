/* MIXBP 博客 Service Worker
   策略: HTML 导航=网络优先(失败回退缓存); 静态资源=缓存优先+后台更新
   效果: 回访时 CSS/JS/图片全部秒开, 新内容始终从网络取 */
const VERSION = 'v1';
const CACHE = 'mixbp-' + VERSION;

const PRECACHE = [
  '/',
  '/css/style.css',
  '/js/custom/effects.js',
  '/img/nyan-cat.webp'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const STATIC_RE = /\.(css|js|xml|png|jpe?g|gif|webp|svg|woff2?|ttf|ico)(\?|$)/i;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* 第三方(giscus/统计/天气)不缓存 */

  /* HTML/数据: 永远走网络(页面内容必须最新), SW 只负责静态资源 */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1) {
    return;
  }

  /* 静态资源: 缓存优先 + 后台更新 */
  if (STATIC_RE.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const update = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || update;
      })
    );
  }
});
