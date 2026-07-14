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
    var isInscricao = /anestreview-hemodinamica|\/medreview\/|inscricao\.html|selfcheckout|wa\.me\/5531985518005/.test(href);
    var cta = a.getAttribute('data-cta') || 'desconhecido';
    gtag('event', isInscricao ? 'clique_inscricao' : 'clique_ferramentas', {
      posicao: cta,
      destino: href,
      pagina: window.location.pathname || '/'
    });
    // contador first-party: ofertas (oferta-*) separadas dos demais CTAs
    if (cta.indexOf('oferta-') === 0) hit('oferta', cta.slice(7));
    else hit('cta', cta);
  }, true);
})();
