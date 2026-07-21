/**
 * Registro de acessos / métricas de uso (Google Analytics 4)
 *
 * CONFIGURAÇÃO:
 * 1. Crie uma propriedade em https://analytics.google.com (GA4).
 * 2. Obtenha o ID de medição (formato G-XXXXXXXXXX).
 * 3. Substitua "G-XXXXXXXXXX" abaixo pelo seu ID.
 *
 * No painel do GA4 você verá: visitas, páginas mais acessadas,
 * duração das sessões, dispositivo e país dos visitantes.
 */
(function() {
  var MEASUREMENT_ID = 'G-KBE43K2PT0';

  if (!MEASUREMENT_ID || MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    return; // Não envia dados se não estiver configurado
  }

  // ===== Opt-out do dono — não contaminar as métricas com acessos próprios =====
  // Abra o site com ?notrack=1 UMA vez em cada navegador/dispositivo seu → para de contar ali.
  // Para voltar a contar naquele navegador: abra com ?notrack=0.
  var _ntMsg = '';
  try {
    var _qp = new URLSearchParams(location.search);
    if (_qp.get('notrack') === '1') { localStorage.setItem('hemo_notrack', '1'); _ntMsg = '🚫 Pronto! Este aparelho NÃO será mais contado nas métricas.'; }
    if (_qp.get('notrack') === '0') { localStorage.removeItem('hemo_notrack'); _ntMsg = '✓ Pronto! Este aparelho voltou a ser contado.'; }
  } catch (e) {}
  if (_ntMsg) {
    (function (m) {
      function go() {
        var d = document.createElement('div');
        d.textContent = m;
        d.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;background:#161e28;color:#e6edf3;border:1px solid #2ea043;border-radius:12px;padding:.85rem 1.15rem;font:600 14px/1.4 system-ui,-apple-system,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.55);max-width:92vw;text-align:center';
        document.body.appendChild(d);
        setTimeout(function () { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 500); }, 4000);
      }
      if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
    })(_ntMsg);
  }
  var NOTRACK = false;
  try { NOTRACK = localStorage.getItem('hemo_notrack') === '1'; } catch (e) {}
  if (NOTRACK) {
    window.hemoHit = function () {}; // no-op para os beacons do quiz
    window.gtag = function () {};    // no-op para eventos GA4 (guardados por if(window.gtag))
    return;                          // não inicializa GA4, não dispara pageview nem beacons
  }

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag; // expõe para eventos em outras páginas (ex.: quiz)
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    anonymize_ip: true,
    page_path: window.location.pathname || '/',
    page_title: document.title
  });

  // ===== Contador first-party (Vercel + Upstash) — alimenta admin.hemodinamica.org =====
  var HIT_URL = 'https://hemodinamica-simulado-api.vercel.app/api/hit';
  function hit(t, k) { try { navigator.sendBeacon(HIT_URL, JSON.stringify({ t: t, k: k })); } catch (e) {} }
  window.hemoHit = hit; // exposto p/ outras páginas (ex.: quiz)
  hit('pv', window.location.pathname || '/'); // visita de página

  // Conta cliques nos CTAs. Elementos marcados com data-cta.
  // Inscrição (checkout) -> evento "clique_inscricao"; ferramentas -> "clique_ferramentas".
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-cta]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var isInscricao = /anestreview-hemodinamica|anestreview\/hemodinamica|anest-review|\/medreview\/|inscricao\.html|selfcheckout|wa\.me\/5531985518005/.test(href);
    var cta = a.getAttribute('data-cta') || 'desconhecido';
    gtag('event', isInscricao ? 'clique_inscricao' : 'clique_ferramentas', {
      posicao: cta,
      destino: href,
      pagina: window.location.pathname || '/'
    });
    // contador first-party: ofertas (oferta-*), "conhecer o curso" (hub-curso)
    // e os demais CTAs, cada um no seu balde
    if (cta.indexOf('oferta-') === 0) hit('oferta', cta.slice(7));
    else if (cta === 'hub-curso' || cta.indexOf('curso-') === 0) hit('curso', cta);
    else hit('cta', cta);
  }, true);
})();
