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
  var MEASUREMENT_ID = 'G-XXXXXXXXXX'; // <-- Substitua pelo seu ID do GA4

  if (!MEASUREMENT_ID || MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    return; // Não envia dados se não estiver configurado
  }

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    anonymize_ip: true,
    page_path: window.location.pathname || '/',
    page_title: document.title
  });
})();
