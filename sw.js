const CACHE_NAME = 'hemodinamica-v67';

const ASSETS = [
  '/',
  '/index.html',
  '/analytics.js',
  '/calculadora.html',
  '/gasometria-acido-base.html',
  '/obesidade.html',
  '/apfel.html',
  '/apfel-alta.html',
  '/risco-asa.html',
  '/risco-rcri.html',
  '/risco-aub-has2.html',
  '/risco-ariscat.html',
  '/risco-dasi.html',
  '/risco-caprini.html',
  '/risco-fragilidade.html',
  '/funcao-renal.html',
  '/funcao-renal-aguda.html',
  '/fluidos-abc-score.html',
  '/fluidos-holliday-segar.html',
  '/choque-maximal-allowable-blood-loss.html',
  '/choque-delta-pp.html',
  '/delta-pp-foto.html',
  '/pocus-diafragma.html',
  '/pocus-gastrico.html',
  '/pocus-vesical.html',
  '/via-aerea-diffmask.html',
  '/via-aerea-el-ganzouri.html',
  '/via-aerea-lemon.html',
  '/via-aerea-morbido.html',
  '/ventilacao-peso-predito.html',
  '/ventilacao-mp-vcv.html',
  '/ventilacao-mp-pcv.html',
  '/alta-rpa-aldrete.html',
  '/alta-rpa-padss.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('hemodinamica-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

// Estratégia: rede primeiro, cache como fallback
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const accept = request.headers.get('accept') || '';

  if (accept.includes('text/html') || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || fetch(request)))
  );
});













































