/* Testes do parser de gasometria (node js/gaso-ocr.test.js) */
const { parseText } = require('./gaso-ocr.js');

let pass = 0, fail = 0;
function chk(nome, texto, esperado) {
  const p = parseText(texto);
  const got = {};
  Object.keys(p).forEach(k => { got[k] = { v: p[k].value, lvl: p[k].level }; });
  let ok = true, det = [];
  Object.keys(esperado).forEach(k => {
    const e = esperado[k], g = got[k];
    if (e === null) { if (g) { ok = false; det.push(`${k}: NÃO devia existir, veio ${JSON.stringify(g)}`); } return; }
    if (!g) { ok = false; det.push(`${k}: faltou (esperava ${JSON.stringify(e)})`); return; }
    if (Math.abs(g.v - e.v) > 0.02) { ok = false; det.push(`${k}.v: ${g.v} ≠ ${e.v}`); }
    if (e.lvl && g.lvl !== e.lvl) { ok = false; det.push(`${k}.lvl: ${g.lvl} ≠ ${e.lvl}`); }
  });
  if (ok) { pass++; console.log('  OK  ' + nome); }
  else { fail++; console.log('  XX  ' + nome + '\n        ' + det.join('\n        ') + '\n        got=' + JSON.stringify(got)); }
}

// 1) Caso simples
chk('simples pH/PaCO2/HCO3', 'pH 7,32\nPaCO2 48\nHCO3 24',
  { pH: { v: 7.32, lvl: 'alta' }, PaCO2: { v: 48, lvl: 'alta' }, HCO3: { v: 24, lvl: 'alta' } });

// 2) ARMADILHA: valor + faixa de referência entre parênteses → pega o medido, não o 7.35
chk('faixa entre parênteses', 'pH 7.21 (7.35-7.45)\nHCO3 12 (22-26)',
  { pH: { v: 7.21 }, HCO3: { v: 12 } });

// 3) ARMADILHA: faixa "a - b" solta (estilo ABL800)
chk('faixa solta a-b', 'Na+ 138 136 - 145\nK+ 4.1 3.5 - 5.1',
  { Na: { v: 138 }, K: { v: 4.1 } });

// 4) ARMADILHA: Cl vs Ca iônico — não confundir; Ca não é campo
chk('Cl vs Ca', 'cCl- 102 mmol/L\ncCa2+ 1.18 mmol/L',
  { Cl: { v: 102 }, });
chk('só Ca (Cl deve ficar vazio)', 'cCa2+ 1.2 mmol/L',
  { Cl: null });

// 5) ARMADILHA: pH sem vírgula (735 → 7,35), marcado confira
chk('pH sem separador', 'pH 735',
  { pH: { v: 7.35, lvl: 'confira' } });

// 6) ARMADILHA: unidade kPa no PaCO2 → converte p/ mmHg
chk('PaCO2 em kPa', 'pCO2 5,3 kPa',
  { PaCO2: { v: 39.75, lvl: 'confira' } });

// 7) ARMADILHA: albumina em g/L → g/dL
chk('Albumina g/L', 'ctAlb 40 g/L',
  { Albumina: { v: 4.0, lvl: 'confira' } });

// 8) Rótulos Radiometer com prefixo c e sufixos
chk('rótulos Radiometer', 'cHCO3(P,st)c 18,5 mmol/L\ncLac 2,3 mmol/L\ncK+ 5,0',
  { HCO3: { v: 18.5 }, Lactato: { v: 2.3 }, K: { v: 5.0 } });

// 9) Valor fora da faixa possível → não preenche (level nao)
chk('lixo fora de faixa', 'pH 99',
  { pH: { v: 99, lvl: 'nao' } });

// 10) Bloco realista ABL800 achatado
chk('bloco ABL800', [
  'Radiometer ABL800 FLEX',
  'pH 7,29 (7,35 - 7,45)',
  'pCO2 52 mmHg (35 - 45)',
  'pO2 88 mmHg (80 - 100)',
  'cHCO3(P,st)c 22,1 mmol/L',
  'cNa+ 141 mmol/L',
  'cK+ 3,8 mmol/L',
  'cCl- 108 mmol/L',
  'cCa2+ 1,15 mmol/L',
  'cLac 1,4 mmol/L'
].join('\n'), {
  pH: { v: 7.29 }, PaCO2: { v: 52 }, HCO3: { v: 22.1 },
  Na: { v: 141 }, K: { v: 3.8 }, Cl: { v: 108 }, Lactato: { v: 1.4 }
});

// 11) K de letra única não deve casar lixo (ex.: linha de outro parâmetro)
chk('não inventar K', 'BE -3.2 mmol/L\nSO2 97 %',
  { K: null, pH: null });

console.log('\n' + pass + ' passaram, ' + fail + ' falharam.');
process.exit(fail ? 1 : 0);
