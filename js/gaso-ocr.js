/**
 * gaso-ocr.js — Preenchimento da gasometria por FOTO ou por TEXTO COLADO/ESCANEADO.
 *
 * Filosofia (decidida em painel de UX/CV/parsing):
 *  - O ganho real NÃO está em espremer o OCR da foto, e sim num PARSER esperto
 *    que serve os dois caminhos: (a) texto colado do OCR nativo do celular
 *    (iPhone Live Text / Android Lens — mais preciso) e (b) Tesseract.js sob a foto.
 *  - Segurança clínica: valida por faixa fisiológica, separa valor da faixa de
 *    referência, nunca preenche silenciosamente valor fora de faixa, e sempre
 *    deixa em modo "rascunho, confira".
 *
 * Núcleo (parseText) é JS puro e testável no node (ver js/gaso-ocr.test.js).
 * A parte de UI/foto só roda no navegador.
 */
(function (root) {
  'use strict';

  // ===== Configuração dos 8 campos-alvo desta página =====
  // hard = faixa possível de medição (fora disso é lixo de OCR); typ = faixa típica (alta confiança).
  var FIELDS = [
    { id: 'pH',       label: /(^|[^a-z0-9])p\s*h(?![a-z(])/i,                 hard: [6.0, 8.0],  typ: [6.8, 7.8],  isPH: true },
    { id: 'PaCO2',    label: /(^|[^a-z0-9])p?\s*a?\s*c\s*o\s*2(?![a-z])/i,    hard: [5, 160],    typ: [10, 120] },
    { id: 'HCO3',     label: /(^|[^a-z0-9])(c?\s*hco\s*3|hco3act|sbc|bic\w*)/i, hard: [3, 60],   typ: [3, 45] },
    { id: 'Na',       label: /(^|[^a-z0-9])c?\s*na\b\+?/i,                     hard: [100, 185],  typ: [100, 180] },
    { id: 'K',        label: /(^|[^a-z0-9])c?\s*k\s*\+?(?![a-z])/i,            hard: [1.0, 9.5],  typ: [1.5, 8] },
    { id: 'Cl',       label: /(^|[^a-z0-9])c?\s*c[li1]\s*\-?(?![a-z])/i,       hard: [55, 150],   typ: [60, 140] },
    { id: 'Lactato',  label: /(^|[^a-z0-9])(c?\s*lac|lactat[eo])/i,            hard: [0, 30],     typ: [0, 25] },
    { id: 'Albumina', label: /(^|[^a-z0-9])(c?\s*t?\s*alb|album\w*)/i,         hard: [0.4, 6.5],  typ: [0.5, 6] }
  ];
  var BYID = {};
  FIELDS.forEach(function (f) { BYID[f.id] = f; });

  // Faixa iônica do Ca (NÃO é campo-alvo) — usada só para não confundir Cl com Ca.
  var CA_RANGE = [0.7, 1.7];

  // ===== normalização de um trecho de texto =====
  function norm(s) {
    if (s == null) return '';
    s = String(s);
    try { s = s.normalize('NFKC'); } catch (e) {}
    // subscritos → dígitos normais
    s = s.replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 0x2080); });
    // setas / marcadores de anormalidade
    s = s.replace(/[↑↓▲▼⬆⬇]/g, ' ');
    return s;
  }

  // Corrige confusões de glifo SÓ no token numérico já isolado (nunca no rótulo).
  function numFix(s) {
    return String(s)
      .replace(/[OoＯ°]/g, '0')
      .replace(/[lI|]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8');
  }

  // Extrai o valor medido de uma linha, já sem o texto do rótulo.
  // Remove faixas de referência antes de pegar o primeiro número.
  function extractValue(after) {
    var s = ' ' + after + ' ';
    // 1) faixa entre parênteses/colchetes: (7.35-7.45) [22 - 26]
    s = s.replace(/[\(\[]\s*-?\d+(?:[.,]\d+)?\s*[-–—a]\s*-?\d+(?:[.,]\d+)?\s*[\)\]]/gi, ' ');
    // 2) par "a - b" solto (faixa sem parêntese, comum no ABL800)
    s = s.replace(/(?:^|\s)-?\d+(?:[.,]\d+)?\s*[-–—]\s*-?\d+(?:[.,]\d+)?(?=\s|$)/g, ' ');
    // 3) marcadores de anormalidade colados
    s = s.replace(/[HL*!]/g, ' ');
    // 4) primeiro número que sobrou
    var m = s.match(/-?\d+(?:[.,]\d+)?/);
    if (!m) return { value: NaN, raw: '' };
    var raw = m[0];
    var v = parseFloat(numFix(raw).replace(',', '.'));
    return { value: v, raw: raw.trim() };
  }

  function detectUnit(line) {
    var m = norm(line).toLowerCase().match(/kpa|mmhg|mmol\s*\/\s*l|meq\s*\/\s*l|g\s*\/\s*dl|g\s*\/\s*l/);
    return m ? m[0].replace(/\s+/g, '') : '';
  }

  // Conversão de unidade quando o laudo diverge do input. Retorna {value, converted}.
  function convertUnit(id, value, unit) {
    if (id === 'PaCO2' && /kpa/.test(unit)) return { value: value * 7.50062, converted: true };
    if (id === 'Albumina' && (/g\/l/.test(unit) || value >= 10)) return { value: value / 10, converted: true };
    return { value: value, converted: false };
  }

  var inRange = function (v, r) { return v >= r[0] && v <= r[1]; };

  // Tenta consertar ponto decimal perdido (pH "735"→7.35, K "58"→5.8) — só quando
  // o valor cru está FORA da faixa dura e alguma escala o traz para dentro.
  function fixScale(v, hard) {
    if (inRange(v, hard)) return { value: v, scaled: false };
    var factors = [0.1, 0.01, 10, 100];
    for (var i = 0; i < factors.length; i++) {
      var t = v * factors[i];
      if (inRange(t, hard)) return { value: t, scaled: true };
    }
    return { value: v, scaled: false };
  }

  /**
   * parseLines(lines) — lines: array de strings (uma "linha" do laudo cada).
   * Para OCR, reconstrua as linhas por bounding box antes de chamar.
   * Retorna { fields: { <id>: {value, raw, level, unit, converted, scaled, lineText, lineIndex} }, unmatched: [...] }
   *   level: 'alta' | 'confira' | 'nao'
   */
  function parseLines(lines) {
    var out = {};
    (lines || []).forEach(function (rawLine, li) {
      var line = norm(rawLine);
      if (!/\d/.test(line)) return; // sem número, não interessa

      // Quais campos "batem" o rótulo nesta linha?
      var candidates = [];
      FIELDS.forEach(function (f) {
        var m = f.label.exec(line);
        if (m) candidates.push({ f: f, idx: m.index, len: m[0].length, matchEnd: m.index + m[0].length });
      });
      if (!candidates.length) return;

      // rótulo mais à esquerda (o valor vem depois dele); desempate pelo match mais longo
      candidates.sort(function (a, b) { return a.idx - b.idx || b.len - a.len; });

      var unit = detectUnit(line);

      // avalia candidatos em ordem; aceita o primeiro cujo valor faz sentido
      for (var c = 0; c < candidates.length; c++) {
        var f = candidates[c].f;
        var after = line.slice(candidates[c].matchEnd);
        var ev = extractValue(after);
        if (isNaN(ev.value)) continue;

        // Cl x Ca: se o valor cai na faixa do Ca iônico, NÃO é Cl — pula.
        if (f.id === 'Cl' && inRange(ev.value, CA_RANGE) && !inRange(ev.value, f.hard)) continue;

        var conv = convertUnit(f.id, ev.value, unit);
        var value = conv.value;
        var sc = fixScale(value, f.hard);
        value = sc.value;

        var level;
        if (!inRange(value, f.hard)) {
          level = 'nao'; // fora da faixa possível → não preenche, só reporta
        } else if (inRange(value, f.typ) && !sc.scaled && !conv.converted) {
          level = 'alta';
        } else {
          level = 'confira'; // dentro do possível mas atípico, escalado ou convertido
        }

        var rec = {
          value: Math.round(value * 1000) / 1000,
          raw: ev.raw, unit: unit, converted: conv.converted, scaled: sc.scaled,
          level: level, lineText: String(rawLine).trim(), lineIndex: li
        };

        // mantém o melhor achado por campo (alta > confira > nao)
        var rank = { alta: 3, confira: 2, nao: 1 };
        if (!out[f.id] || rank[level] > rank[out[f.id].level]) out[f.id] = rec;
        break;
      }
    });
    return out;
  }

  function parseText(text) {
    return parseLines(String(text == null ? '' : text).split(/\r?\n/));
  }

  // ================= núcleo exportável (testável no node) =================
  var core = {
    FIELDS: FIELDS, parseText: parseText, parseLines: parseLines,
    extractValue: extractValue, convertUnit: convertUnit, fixScale: fixScale, numFix: numFix
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.GasoOCR = core;

  // ================= UI (só no navegador) =================
  if (typeof document === 'undefined') return;

  var TESS_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  var applying = false;         // guarda p/ não marcar "dirty" durante preenchimento automático
  var dirty = {};               // campos editados à mão
  var lastSnapshot = null;      // p/ desfazer

  function el(id) { return document.getElementById(id); }

  function injectStyles() {
    var css = ''
      + '.gaso-ai-actions{display:flex;gap:.5rem;margin:.2rem 0 1rem}'
      + '.gaso-ai-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.6rem .5rem;border-radius:8px;border:1px dashed var(--border);background:#1c242e;color:var(--text);font-size:.85rem;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s,background .15s}'
      + '.gaso-ai-btn:hover{border-color:var(--accent);background:#212b35}'
      + '.gaso-ai-btn svg{width:16px;height:16px}'
      + 'input.gaso-alta{box-shadow:0 0 0 2px rgba(63,185,80,.55)!important;border-color:#3fb950!important}'
      + 'input.gaso-confira{box-shadow:0 0 0 2px rgba(255,209,57,.6)!important;border-color:#ffd139!important}'
      + '.gaso-banner{margin:0 0 1rem;padding:.7rem .85rem;border-radius:8px;border:1px solid var(--accent);background:rgba(88,166,255,.08);font-size:.82rem;line-height:1.45}'
      + '.gaso-banner b{color:var(--text)}'
      + '.gaso-banner .gaso-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.4rem}'
      + '.gaso-banner .gaso-undo{margin-left:auto;padding:.3rem .7rem;border-radius:7px;border:1px solid var(--border);background:#222a33;color:var(--text);font-size:.78rem;font-weight:600;cursor:pointer}'
      + '.gaso-banner ul{margin:.3rem 0 0;padding-left:1.1rem;color:var(--text-muted)}'
      + '.gaso-banner li{margin:.15rem 0}'
      + '.gaso-banner code{color:#ffd139;font-family:ui-monospace,monospace}'
      + '.gaso-ta{width:100%;min-height:150px;padding:.6rem;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-family:inherit;font-size:.95rem;resize:vertical}'
      + '.gaso-hint{font-size:.8rem;color:var(--text-muted);margin:.55rem 0 0;line-height:1.45}'
      + '.gaso-prog{font-size:.85rem;color:var(--text-muted);margin-top:.6rem;min-height:1.2em}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function snapshot() {
    var s = {};
    FIELDS.forEach(function (f) { var e = el(f.id); if (e) s[f.id] = e.value; });
    return s;
  }
  function restore(s) {
    if (!s) return;
    applying = true;
    FIELDS.forEach(function (f) {
      var e = el(f.id); if (!e) return;
      e.value = s[f.id] || '';
      e.classList.remove('gaso-alta', 'gaso-confira');
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    applying = false;
    dirty = {};
  }

  function setField(id, value) {
    var e = el(id); if (!e || value == null || isNaN(value)) return;
    applying = true;
    e.value = (id === 'pH') ? String(value).replace('.', ',') : String(value);
    e.dispatchEvent(new Event('input', { bubbles: true })); // dispara a máscara do pH + recálculo da página
    applying = false;
  }

  function clearHighlights() {
    FIELDS.forEach(function (f) { var e = el(f.id); if (e) e.classList.remove('gaso-alta', 'gaso-confira'); });
    var b = el('gaso-banner'); if (b) b.remove();
  }

  function applyParsed(parsed, origem) {
    lastSnapshot = snapshot();
    clearHighlights();

    var preenchidos = 0, confira = [], naoLidos = [];
    FIELDS.forEach(function (f) {
      var r = parsed[f.id];
      if (!r) return;
      if (r.level === 'nao') { naoLidos.push({ f: f, r: r }); return; }
      // não sobrescreve silenciosamente um campo que o médico editou à mão
      var e = el(f.id);
      if (dirty[f.id] && e && e.value && e.value !== '') {
        confira.push({ f: f, r: r, conflito: true });
        return;
      }
      setField(f.id, r.value);
      if (e) e.classList.add(r.level === 'alta' ? 'gaso-alta' : 'gaso-confira');
      preenchidos++;
      if (r.level === 'confira') confira.push({ f: f, r: r });
    });

    renderBanner(origem, preenchidos, confira, naoLidos);
    return preenchidos;
  }

  function renderBanner(origem, preenchidos, confira, naoLidos) {
    var host = document.querySelector('.inputs-section');
    if (!host) return;
    var old = el('gaso-banner'); if (old) old.remove();

    var div = document.createElement('div');
    div.className = 'gaso-banner';
    div.id = 'gaso-banner';
    div.setAttribute('role', 'status');

    var esc = function (s) { return String(s).replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); };
    var html = '<div class="gaso-row"><b>Preenchido por ' + (origem === 'foto' ? 'foto' : 'texto') + ' — confira antes de usar.</b>'
      + '<button type="button" class="gaso-undo" id="gaso-undo">Desfazer</button></div>';

    if (preenchidos === 0) {
      html += 'Não consegui identificar nenhum valor. Tente colar o texto do laudo, ou uma foto mais nítida.';
    } else {
      html += preenchidos + ' campo(s) preenchido(s). ';
    }

    var itens = [];
    confira.forEach(function (x) {
      if (x.conflito) itens.push(esc(x.f.id) + ': você já tinha digitado — mantive o seu (li <code>' + esc(x.r.raw) + '</code>)');
      else if (x.r.converted) itens.push(esc(x.f.id) + ': converti unidade → <code>' + esc(String(x.r.value)) + '</code> (li <code>' + esc(x.r.raw) + '</code> ' + esc(x.r.unit) + ')');
      else if (x.r.scaled) itens.push(esc(x.f.id) + ': ajustei a vírgula → <code>' + esc(String(x.r.value)) + '</code> (li <code>' + esc(x.r.raw) + '</code>)');
      else itens.push(esc(x.f.id) + ': valor atípico, confira (<code>' + esc(String(x.r.value)) + '</code>)');
    });
    naoLidos.forEach(function (x) {
      itens.push(esc(x.f.id) + ': li <code>' + esc(x.r.raw) + '</code>, fora da faixa — não preenchi');
    });
    if (itens.length) html += '<ul><li>' + itens.join('</li><li>') + '</li></ul>';

    div.innerHTML = html;
    host.insertBefore(div, host.firstChild);
    var undo = el('gaso-undo');
    if (undo) undo.addEventListener('click', function () { restore(lastSnapshot); var b = el('gaso-banner'); if (b) b.remove(); });
  }

  // ---------- caminho: colar / escanear texto ----------
  function openPasteModal() {
    var bg = document.createElement('div');
    bg.className = 'modal-backdrop';
    bg.style.display = 'flex';
    bg.innerHTML =
      '<div class="modal">'
      + '<div class="modal-title">Colar ou escanear o laudo</div>'
      + '<textarea class="gaso-ta" id="gaso-ta" placeholder="Cole aqui o texto do laudo…"></textarea>'
      + '<p class="gaso-hint"><b>iPhone:</b> toque no campo acima e escolha <b>“Escanear texto”</b> (Live Text) para apontar a câmera. '
      + '<b>Android:</b> use o Google Lens/foto, copie e cole. Também funciona colar texto recebido por mensagem.</p>'
      + '<div class="modal-footer">'
      + '<button type="button" id="gaso-ta-cancel">Cancelar</button>'
      + '<button type="button" class="primary" id="gaso-ta-ok">Preencher</button>'
      + '</div></div>';
    document.body.appendChild(bg);
    var close = function () { bg.remove(); };
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    el('gaso-ta-cancel').addEventListener('click', close);
    var ta = el('gaso-ta'); ta.focus();
    el('gaso-ta-ok').addEventListener('click', function () {
      var parsed = parseText(ta.value);
      applyParsed(parsed, 'texto');
      close();
      var host = document.querySelector('.inputs-section');
      if (host) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ---------- caminho: foto (Tesseract.js, sob demanda, via CDN) ----------
  var tessLib = null;
  function loadTesseract(onProgress) {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (tessLib) return tessLib;
    onProgress && onProgress('Preparando leitor…');
    tessLib = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = TESS_CDN;
      s.onload = function () { window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Tesseract não carregou')); };
      s.onerror = function () { reject(new Error('offline')); };
      document.head.appendChild(s);
    });
    return tessLib;
  }

  // Pré-processamento MÍNIMO (o painel vetou flat-field/Sauvola/deskew nesta fase):
  // grayscale por luminância + esticamento de contraste por percentis + upscale.
  function preprocess(img) {
    var maxW = 1600;
    var scale = Math.min(1, maxW / img.naturalWidth);
    var w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    // upscale leve se a imagem for pequena (texto minúsculo)
    var up = w < 1000 ? Math.min(2.5, 1200 / w) : 1;
    var cw = Math.round(w * up), ch = Math.round(h * up);
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, cw, ch);
    var d = ctx.getImageData(0, 0, cw, ch), px = d.data, hist = new Array(256).fill(0), i, g;
    for (i = 0; i < px.length; i += 4) {
      g = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
      px[i] = px[i + 1] = px[i + 2] = g; hist[g]++;
    }
    var total = cw * ch, acc = 0, p2 = 0, p98 = 255;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * 0.02) { p2 = i; break; } }
    acc = 0;
    for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= total * 0.02) { p98 = i; break; } }
    var span = Math.max(1, p98 - p2);
    for (i = 0; i < px.length; i += 4) {
      g = Math.max(0, Math.min(255, ((px[i] - p2) * 255 / span) | 0));
      px[i] = px[i + 1] = px[i + 2] = g;
    }
    ctx.putImageData(d, 0, 0);
    return cv;
  }

  function collectWords(data) {
    if (data && data.words && data.words.length) return data.words;
    var words = [];
    if (data && data.blocks) {
      data.blocks.forEach(function (b) {
        (b.paragraphs || []).forEach(function (p) {
          (p.lines || []).forEach(function (l) {
            (l.words || []).forEach(function (w) { words.push(w); });
          });
        });
      });
    }
    return words;
  }

  // Reconstrói linhas por coordenada Y (rótulo → valor na mesma linha).
  function linesFromWords(words) {
    if (!words.length) return [];
    var ws = words.slice().sort(function (a, b) { return a.bbox.y0 - b.bbox.y0; });
    var lines = [], cur = null;
    ws.forEach(function (w) {
      var cy = (w.bbox.y0 + w.bbox.y1) / 2, hgt = w.bbox.y1 - w.bbox.y0;
      if (cur && Math.abs(cy - cur.cy) < 0.6 * hgt) {
        cur.words.push(w);
      } else {
        cur = { cy: cy, words: [w] }; lines.push(cur);
      }
    });
    return lines.map(function (ln) {
      ln.words.sort(function (a, b) { return a.bbox.x0 - b.bbox.x0; });
      return ln.words.map(function (w) { return w.text; }).join(' ');
    });
  }

  function meanConf(words) {
    if (!words.length) return 100;
    var s = 0, n = 0;
    words.forEach(function (w) { if (typeof w.confidence === 'number') { s += w.confidence; n++; } });
    return n ? s / n : 100;
  }

  function handlePhoto(file) {
    var prog = el('gaso-prog');
    var setP = function (t) { if (prog) prog.textContent = t; };
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(img.src);
      setP('Lendo imagem…');
      var canvas;
      try { canvas = preprocess(img); } catch (e) { canvas = null; }
      loadTesseract(setP).then(function (T) {
        setP('Reconhecendo texto…');
        return T.recognize(canvas || img, 'eng', {
          logger: function (m) { if (m.status === 'recognizing text') setP('Reconhecendo texto… ' + Math.round(m.progress * 100) + '%'); }
        });
      }).then(function (res) {
        var data = res.data || {};
        var words = collectWords(data);
        var lines = words.length ? linesFromWords(words) : String(data.text || '').split(/\r?\n/);
        var parsed = parseLines(lines);
        // rebaixa confiança geral se o OCR veio ruim
        if (meanConf(words) < 62) {
          Object.keys(parsed).forEach(function (k) { if (parsed[k].level === 'alta') parsed[k].level = 'confira'; });
        }
        var n = applyParsed(parsed, 'foto');
        setP('');
        var modal = el('gaso-foto-modal'); if (modal) modal.remove();
        if (!n) alert('Não consegui ler valores da foto. Tente colar/escanear o texto (costuma ser mais preciso), ou uma foto mais nítida e reta.');
        var host = document.querySelector('.inputs-section'); if (host) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }).catch(function (err) {
        setP('');
        var modal = el('gaso-foto-modal'); if (modal) modal.remove();
        if (err && err.message === 'offline') alert('Sem internet para carregar o leitor de foto. Use “Colar / escanear laudo” — funciona offline.');
        else alert('Falha ao ler a foto. Tente colar/escanear o texto do laudo.');
      });
    };
    img.onerror = function () { setP(''); alert('Não consegui abrir essa imagem.'); };
    img.src = URL.createObjectURL(file);
  }

  function openPhoto() {
    // mini-modal só com o progresso + input de arquivo
    var bg = document.createElement('div');
    bg.className = 'modal-backdrop'; bg.style.display = 'flex'; bg.id = 'gaso-foto-modal';
    bg.innerHTML = '<div class="modal"><div class="modal-title">Preencher por foto</div>'
      + '<p class="gaso-hint">Fotografe o laudo (papel ou tela). O reconhecimento acontece <b>no seu aparelho</b> — a foto não é enviada a lugar nenhum. Precisão imperfeita: sempre confira.</p>'
      + '<div class="gaso-prog" id="gaso-prog"></div>'
      + '<div class="modal-footer"><button type="button" id="gaso-foto-cancel">Cancelar</button>'
      + '<button type="button" class="primary" id="gaso-foto-pick">Escolher foto</button></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
    el('gaso-foto-cancel').addEventListener('click', function () { bg.remove(); });
    el('gaso-foto-pick').addEventListener('click', function () {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');
      inp.addEventListener('change', function () { if (inp.files && inp.files[0]) handlePhoto(inp.files[0]); });
      inp.click();
    });
  }

  function init() {
    var section = document.querySelector('.inputs-section');
    if (!section) return;
    var h2 = section.querySelector('h2');
    if (!h2) return;
    injectStyles();

    var bar = document.createElement('div');
    bar.className = 'gaso-ai-actions';
    bar.innerHTML =
      '<button type="button" class="gaso-ai-btn" id="gaso-foto-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Foto</button>'
      + '<button type="button" class="gaso-ai-btn" id="gaso-paste-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>Colar / escanear laudo</button>';
    h2.parentNode.insertBefore(bar, h2.nextSibling);

    el('gaso-foto-btn').addEventListener('click', openPhoto);
    el('gaso-paste-btn').addEventListener('click', openPasteModal);

    // marca campos editados à mão (p/ não sobrescrever numa nova leitura)
    FIELDS.forEach(function (f) {
      var e = el(f.id); if (!e) return;
      e.addEventListener('input', function () {
        if (!applying) { dirty[f.id] = true; e.classList.remove('gaso-alta', 'gaso-confira'); }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(typeof self !== 'undefined' ? self : this);
