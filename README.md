# Calculadora de Gasometria Aplicada à Monitorização Hemodinâmica

Calculadora web para parâmetros de gasometria e hemodinâmica: BSA, CaO2, CvO2, DO2, DO2i, VO2, VO2i, taxa de extração, gap de CO2 e quociente respiratório modificado.

## Acesso

**Site publicado:** [https://anesterminador.github.io/calculadora-gasometria-hemodinamica/](https://anesterminador.github.io/calculadora-gasometria-hemodinamica/)

## Uso

1. Abra o site (link acima ou abra `index.html` localmente).
2. Preencha os dados de entrada (Hb, saturações, pressões, CO, altura, peso).
3. Os parâmetros são calculados automaticamente.

## Fórmulas

- **BSA (DuBois & DuBois):** 0,007184 × Peso^0,425 × Altura^0,725  
- **CaO2:** (Hb × 1,34 × SaO2/100) + (0,0031 × PaO2)  
- **CvO2:** (Hb × 1,34 × SvO2/100) + (0,0031 × PvO2)  
- **DO2:** CaO2 × CO × 10  
- **DO2i:** DO2 / BSA  
- **VO2:** (CaO2 − CvO2) × CO × 10  
- **VO2i:** VO2 / BSA  
- **Taxa de extração:** VO2 / DO2  
- **Gap CO2:** PvCO2 − PaCO2  
- **Quociente respiratório modificado:** (PvCO2 − PaCO2) / (CaO2 − CvO2)

## GitHub Pages

O site é servido via [GitHub Pages](https://pages.github.com/). Para ativar: **Settings → Pages → Source: Deploy from a branch → Branch: main → / (root)**.
