# Molde do bloco "Sobre" (texto explicativo por calculadora) — Onda 2 / SEO

Padrão aprovado pelo Davi em 2026-07-20, calibrado na `risco-rcri.html`.
Objetivo: dar ao Google (e a quem quiser) o texto que faz a página rankear para
"como calcular X" / "interpretar Y", sem poluir o beira-leito. Vai **abaixo** da
calculadora, antes do `<footer class="footer-buttons">`.

## Regras de conteúdo
- **Autoridade médica primeiro:** o texto é revisado/aprovado pelo Davi antes de subir. Nada de número inventado.
- **Espelhar a própria calculadora:** critérios, fórmulas e valores de risco têm que bater exatamente com o que o JS da página calcula/mostra (não introduzir número diferente).
- **Estrutura:** intro ("o que é") → `Como calcular` → `Como interpretar` (+ tabela quando fizer sentido) → `Quando usar e limitações` → `Referência` (diretriz/paper).
- **Destaques (`<strong>`) com moderação:** ~6–8 por bloco. Destacar só o termo que a pessoa busca + os números que mudam conduta. Se tudo é destaque, nada é.
- **Tom sóbrio, médico-para-médico.** Sem "o melhor", "nº 1", nada salesy.

## CSS (colar no `<style>` da página, antes de `</style>`)
Cores são hex fixos → funcionam nas duas paletas do site (calculadoras #0f1419 e hub #0b1117).
O `.sobre h2` herda o `section h2` da página (dourado #ffd139, centralizado) — vale pro template das calculadoras.

```css
/* Bloco explicativo (SEO + apoio) */
.sobre { text-align: left; }
.sobre h2 { text-align: center; }
.sobre h3 { font-size: 0.98rem; font-weight: 700; color: #c3aef2; margin: 1.1rem 0 0.35rem; } /* lavanda */
.sobre p { font-size: 0.9rem; color: #c9d4de; margin-bottom: 0.7rem; line-height: 1.6; text-align: justify; } /* corpo */
.sobre strong { color: #e4dcc4; font-weight: 700; } /* destaque: negrito + calor sutil */
.sobre .tab { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin: 0.2rem 0 0.7rem; }
.sobre .tab td, .sobre .tab th { padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); text-align: left; }
.sobre .tab th { color: var(--text); font-weight: 700; }
.sobre .tab td:last-child, .sobre .tab th:last-child { text-align: right; font-variant-numeric: tabular-nums; }
.sobre .ref { font-size: 0.8rem; color: #c9d4de; border-top: 1px solid var(--border); padding-top: 0.7rem; margin-top: 0.3rem; }
.sobre .ref em { font-style: italic; }
```

## Hierarquia de cor (resultado)
dourado (#ffd139, título) → lavanda (#c3aef2, subtítulos) → cinza-claro (#c9d4de, corpo+referência) → negrito quente (#e4dcc4, destaques).

## HTML (esqueleto — inserir antes do `<footer class="footer-buttons">`)
```html
<section class="sobre">
  <h2>Sobre o [NOME] ([sigla])</h2>
  <p>Parágrafo de abertura: o que é, o que estima, em que contexto. Destacar o termo-chave e o desfecho.</p>

  <h3>Como calcular</h3>
  <p>Como pontua / a fórmula, espelhando os itens da calculadora.</p>

  <h3>Como interpretar a pontuação</h3>
  <table class="tab">
    <tr><th>[Faixa]</th><th>[Significado / risco]</th></tr>
    <!-- linhas com os MESMOS valores que o JS mostra -->
  </table>
  <p>Nota de conduta (ex.: ponto de corte de diretriz), se houver.</p>

  <h3>Quando usar e limitações</h3>
  <p>Público/cenário, o que NÃO substitui, limitações conhecidas.</p>

  <p class="ref">Referência: [autor, título em <em>itálico</em>, periódico ano; volume:páginas]. · [diretriz].</p>
</section>
```

## Ordem de prioridade das próximas (rever quando o Search Console tiver dados)
Palpite inicial do painel: gasometria → RCRI (feita) → ΔPP → ASA → LAST. Ajustar pelos termos reais do relatório Desempenho.

## Pendência conhecida (separada deste molde)
Bug do logo nas ~33 páginas de calculadora: `.logo { transform: translateX(-3.2rem); clip-path: inset(0 0 25 0); }` — o `25` sem unidade torna o `clip-path` inválido (ignorado), e o `translateX` empurra o logo pra fora em telas ≥769px, gerando scroll horizontal. Correção mecânica (find/replace) a fazer em lote, com QA visual. Ver [[project-plano-crescimento-calculadoras]].
