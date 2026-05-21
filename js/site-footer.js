/* =============================================================================
 * site-footer.js — script GLOBAL (carregado em todas as páginas)
 *
 * Apesar do nome historico, hoje ele faz tres coisas:
 *   1. Monta o rodape compartilhado (.footer-buttons)
 *   2. Expoe a API window.HemoFav e injeta a estrelinha de favoritos
 *      em todas as calculadoras (auto, sem precisar editar 40 HTMLs)
 *   3. Cria o FAB do menu lateral (drawer) + o proprio drawer
 * =============================================================================
 */

/* ─────────────────────────────────────────────────────────────
 * Bloco 1 — Rodape compartilhado (comportamento original)
 * ───────────────────────────────────────────────────────────── */
(function() {
  var FOOTER_CONFIG = {
    homeHref: 'index.html',
    homeLabel: 'Página Inicial',
    showContact: true,
    contactUrl: 'https://grupomedreview.com.br/anestreview/hemodinamica/?utm_source=instagram&utm_medium=social&utm_campaign=anestreview_hemodinamica_ongoing&utm_term=linkbio&utm_content',
    instagramUrl: 'https://www.instagram.com/hemodinamicareview/',
    instagramIcon: 'ico-instagram.png'
  };

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

  function bindShareHandler(footer) {
    var shareLink = footer.querySelector('.footer-link-share');
    if (!shareLink || shareLink.dataset.shareBound === 'true') return;
    shareLink.dataset.shareBound = 'true';
    shareLink.addEventListener('click', function(event) {
      event.preventDefault();
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

  function initFooter(footer) {
    if (!footer || footer.dataset.footerReady === 'true') return;
    footer.innerHTML = buildFooterHtml();
    footer.dataset.footerReady = 'true';
    bindShareHandler(footer);
  }

  function initAllFooters() {
    var footers = document.querySelectorAll('.footer-buttons');
    footers.forEach(initFooter);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllFooters);
  } else {
    initAllFooters();
  }
})();


/* ─────────────────────────────────────────────────────────────
 * Bloco 2 — API HemoFav e estrelinha de favoritos
 * Estado em localStorage. Auto-injeta a estrela nas calculadoras
 * (todas as paginas EXCETO index.html e a janela de evolucao).
 * ───────────────────────────────────────────────────────────── */
(function () {
  var STORAGE_KEY = 'hemodinamica.favoritos.v1';
  var listeners = [];

  function safeRead() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (it) { return it && it.url && it.label; });
    } catch (e) { return []; }
  }

  function safeWrite(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) { /* quota / privacy mode */ }
  }

  function emit() {
    var list = safeRead();
    listeners.forEach(function (cb) {
      try { cb(list); } catch (e) {}
    });
  }

  var HemoFav = {
    get: function () { return safeRead(); },
    isFav: function (url) {
      var list = safeRead();
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === url) return true;
      }
      return false;
    },
    toggle: function (url, label) {
      var list = safeRead();
      var idx = -1;
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === url) { idx = i; break; }
      }
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        list.push({ url: url, label: label, addedAt: new Date().toISOString() });
      }
      safeWrite(list);
      emit();
      return idx < 0; // true = agora é favorito; false = removido
    },
    onChange: function (cb) {
      if (typeof cb === 'function') listeners.push(cb);
    }
  };

  // Detecta o que é "página de calculadora" (NÃO index/raiz)
  function getPageInfo() {
    var path = (window.location.pathname || '').toLowerCase();
    // Pega só o nome do arquivo
    var match = path.match(/[^\/]+$/);
    var file = match ? match[0] : '';
    if (!file || file === 'index.html' || file === '') return null;

    // Label: usa <h1> se houver, senão document.title antes de qualquer separador
    var h1 = document.querySelector('h1');
    var label = '';
    if (h1) {
      label = (h1.textContent || '').trim().replace(/\s+/g, ' ');
    }
    if (!label) {
      label = (document.title || '').split(/[–·|]/)[0].trim();
    }
    if (!label) return null;
    return { url: file, label: label };
  }

  function starSvg(filled) {
    if (filled) {
      return '<svg class="star-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M12 2.5l2.95 6.02 6.64.97-4.8 4.68 1.13 6.6L12 17.65l-5.92 3.12 1.13-6.6-4.8-4.68 6.64-.97L12 2.5z"/>' +
        '</svg>';
    }
    return '<svg class="star-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 2.5l2.95 6.02 6.64.97-4.8 4.68 1.13 6.6L12 17.65l-5.92 3.12 1.13-6.6-4.8-4.68 6.64-.97L12 2.5z"/>' +
      '</svg>';
  }

  function injectFavButton() {
    var info = getPageInfo();
    if (!info) return; // index ou página sem h1

    // Evita duplicar
    if (document.querySelector('.fav-button')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fav-button';
    btn.setAttribute('aria-pressed', 'false');

    function refresh() {
      var fav = HemoFav.isFav(info.url);
      btn.classList.toggle('is-fav', fav);
      btn.setAttribute('aria-pressed', fav ? 'true' : 'false');
      btn.setAttribute('aria-label', fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
      btn.setAttribute('title', fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
      btn.innerHTML = starSvg(fav);
    }

    btn.addEventListener('click', function () {
      HemoFav.toggle(info.url, info.label);
      btn.classList.remove('just-toggled');
      // Force reflow para reiniciar animacao
      void btn.offsetWidth;
      btn.classList.add('just-toggled');
      refresh();
    });

    HemoFav.onChange(refresh);
    refresh();
    document.body.appendChild(btn);
  }

  // Expõe a API e inicializa o botão
  window.HemoFav = HemoFav;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFavButton);
  } else {
    injectFavButton();
  }
})();


/* ─────────────────────────────────────────────────────────────
 * Bloco 3 — Drawer lateral (FAB + painel)
 * Aparece em TODAS as páginas, lê favoritos da API HemoFav.
 * ───────────────────────────────────────────────────────────── */
(function () {
  // Calculadoras de uso crítico que aparecem como atalho fixo no drawer.
  // Nao duplica o index inteiro — só os atalhos mais quentes.
  var CRITICAL = [
    { url: 'anafilaxia.html',                       label: 'Anafilaxia' },
    { url: 'intoxicacao-anestesico-local.html',     label: 'LAST (Intox. Anest. Local)' }
  ];

  // Evita injetar duas vezes
  if (document.querySelector('.drawer-fab')) return;

  // FAB
  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'drawer-fab';
  fab.setAttribute('aria-label', 'Menu rápido');
  fab.setAttribute('aria-controls', 'site-drawer');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<line x1="4" y1="7" x2="20" y2="7"/>' +
      '<line x1="4" y1="12" x2="20" y2="12"/>' +
      '<line x1="4" y1="17" x2="20" y2="17"/>' +
    '</svg>';

  // Backdrop
  var backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';

  // Painel
  var panel = document.createElement('aside');
  panel.id = 'site-drawer';
  panel.className = 'drawer-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Menu rápido');
  panel.innerHTML =
    '<header class="drawer-header">' +
      '<span class="drawer-title">Menu</span>' +
      '<button type="button" class="drawer-close" aria-label="Fechar menu">×</button>' +
    '</header>' +
    '<div class="drawer-body">' +
      '<a class="drawer-item" href="index.html">' +
        '<svg class="di-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>' +
        '</svg>' +
        '<span>Início</span>' +
      '</a>' +
      '<a class="drawer-item hero" href="avaliacao-perioperatoria-integrada.html">' +
        '<svg class="di-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4Z"/>' +
          '<path d="m9 12 2 2 4-4"/>' +
        '</svg>' +
        '<span>Avaliação Perioperatória Integrada<span class="di-sub">Quadro completo · gases + hemo + histórico</span></span>' +
      '</a>' +
      '<a class="drawer-item hero-cardio" href="avaliacao-pre-anestesica-interativa.html">' +
        '<svg class="di-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
        '</svg>' +
        '<span>Avaliação Pré-anestésica<span class="di-sub">AHA 2024 · fluxograma stepwise interativo</span></span>' +
      '</a>' +
      '<div class="drawer-section-title">Favoritos</div>' +
      '<div class="drawer-favs"></div>' +
      '<div class="drawer-section-title">Conduta em emergência</div>' +
      '<div class="drawer-criticals"></div>' +
      '<div class="drawer-section-title">Tudo</div>' +
      '<a class="drawer-item" href="index.html">' +
        '<svg class="di-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>' +
          '<rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' +
        '</svg>' +
        '<span>Ver todas as calculadoras</span>' +
      '</a>' +
    '</div>' +
    '<footer class="drawer-footer">' +
      '<span class="drawer-offline-chip">Disponível offline</span>' +
      '<a href="https://www.instagram.com/hemodinamicareview/" target="_blank" rel="noopener noreferrer" style="color:#8b9cad;font-size:0.78rem;text-decoration:none;">@hemodinamicareview</a>' +
    '</footer>';

  // ----- Renderização dinâmica dos blocos "Favoritos" e "Emergências" -----

  function renderCriticals() {
    var container = panel.querySelector('.drawer-criticals');
    if (!container) return;
    var html = '';
    CRITICAL.forEach(function (c) {
      html += '<a class="drawer-item danger" href="' + c.url + '">' +
        '<svg class="di-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 9v4"/><path d="M12 17h.01"/>' +
          '<path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>' +
        '</svg>' +
        '<span>' + escapeHtml(c.label) + '</span>' +
      '</a>';
    });
    container.innerHTML = html;
  }

  function renderFavs() {
    var container = panel.querySelector('.drawer-favs');
    if (!container || !window.HemoFav) return;
    var list = window.HemoFav.get();
    if (!list.length) {
      container.innerHTML =
        '<div class="drawer-fav-empty">' +
          'Toque na ⭐ no canto superior de qualquer calculadora para salvá-la aqui.' +
        '</div>';
      return;
    }
    var html = '';
    list.forEach(function (f) {
      html += '<a class="drawer-item" href="' + encodeURI(f.url) + '">' +
        '<svg class="di-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color:#f1c40f;">' +
          '<path d="M12 2.5l2.95 6.02 6.64.97-4.8 4.68 1.13 6.6L12 17.65l-5.92 3.12 1.13-6.6-4.8-4.68 6.64-.97L12 2.5z"/>' +
        '</svg>' +
        '<span>' + escapeHtml(f.label) + '</span>' +
      '</a>';
    });
    container.innerHTML = html;
  }

  function escapeHtml(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // ----- Abre/fecha -----
  var isOpen = false;

  function open() {
    if (isOpen) return;
    renderFavs();
    panel.classList.add('open');
    backdrop.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    isOpen = true;
  }
  function close() {
    if (!isOpen) return;
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    isOpen = false;
  }

  fab.addEventListener('click', function () {
    isOpen ? close() : open();
  });
  backdrop.addEventListener('click', close);
  panel.querySelector('.drawer-close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) close();
  });

  // Anexa após DOM pronto
  function mount() {
    document.body.appendChild(fab);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    renderCriticals();
    renderFavs();
    // Re-renderiza favs quando mudar (estrela toggla em outra parte do site)
    if (window.HemoFav && typeof window.HemoFav.onChange === 'function') {
      window.HemoFav.onChange(function () {
        if (isOpen) renderFavs();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
