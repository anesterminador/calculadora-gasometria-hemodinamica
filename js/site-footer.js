(function() {
  // Configuração central do rodapé: alterando aqui, reflete em todas as páginas.
  var FOOTER_CONFIG = {
    homeHref: 'index.html',
    homeLabel: 'Página Inicial',
    showContact: true,
    contactUrl: 'https://grupomedreview.com.br/anestreview/hemodinamica/?utm_source=instagram&utm_medium=social&utm_campaign=anestreview_hemodinamica_ongoing&utm_term=linkbio&utm_content',
    instagramUrl: 'https://www.instagram.com/hemodinamicareview/',
    instagramIcon: 'ico-instagram.png'
  };

  // Monta o HTML do rodapé de forma centralizada.
  function buildFooterHtml() {
    var parts = [
      '<a href="' + FOOTER_CONFIG.homeHref + '" class="footer-link">' + FOOTER_CONFIG.homeLabel + '</a>'
    ];

    if (FOOTER_CONFIG.showContact) {
      parts.push(
        '<a href="' + FOOTER_CONFIG.contactUrl + '" target="_blank" rel="noopener noreferrer" class="footer-link">Contato</a>'
      );
    }

    parts.push('<a href="#" class="footer-link footer-link-share">Compartilhar</a>');
    parts.push(
      '<a href="' + FOOTER_CONFIG.instagramUrl + '" target="_blank" rel="noopener noreferrer" class="footer-link footer-link-instagram" aria-label="Instagram Hemodinâmica Review" title="Instagram Hemodinâmica Review"><img src="' + FOOTER_CONFIG.instagramIcon + '" alt="Instagram"></a>'
    );

    return parts.join('\n');
  }

  // Liga o botão de compartilhar ao rodapé já renderizado.
  function bindShareHandler(footer) {
    var shareLink = footer.querySelector('.footer-link-share');
    if (!shareLink || shareLink.dataset.shareBound === 'true') return;

    shareLink.dataset.shareBound = 'true';
    shareLink.addEventListener('click', function(event) {
      event.preventDefault();

      // Compartilha pela API nativa quando disponível; caso contrário, copia o link.
      var shareUrl = window.location.href;
      var shareTitle = document.title || 'Hemodinamica - Anest Review';

      if (navigator.share) {
        navigator.share({ title: shareTitle, url: shareUrl }).catch(function() {});
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(function() {
          alert('Link copiado para a area de transferencia.');
        }, function() {
          alert('Copie este link:\n' + shareUrl);
        });
        return;
      }

      alert('Copie este link:\n' + shareUrl);
    });
  }

  // Preenche um placeholder de rodapé e evita renderização duplicada.
  function initFooter(footer) {
    if (!footer || footer.dataset.footerReady === 'true') return;

    footer.innerHTML = buildFooterHtml();
    footer.dataset.footerReady = 'true';
    bindShareHandler(footer);
  }

  // Procura todos os rodapés da página para inicializar automaticamente.
  function initAllFooters() {
    var footers = document.querySelectorAll('.footer-buttons');
    footers.forEach(initFooter);
  }

  // Garante que o rodapé só seja montado depois que o DOM estiver disponível.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllFooters);
  } else {
    initAllFooters();
  }
})();
