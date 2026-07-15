/* ============================================================
   components/charts.js — Componentes de Gráficos (SVG puro)
   ============================================================
   Gráficos sin dependencias externas usando SVG nativo.
   Tres tipos disponibles: barras, donut y línea.
   
   Uso:
     ChartsComponent.renderBar('mi-div', stats)
     ChartsComponent.renderDonut('mi-svg', 'mi-legend', data)
     ChartsComponent.renderLine('mi-svg', stats)
   ============================================================ */

const ChartsComponent = {

  // ─── Colores de paleta ─────────────────────────────────────
  COLORS: ['#e0a830','#10b981','#0ea5e9','#7c3aed','#f43f5e','#f59e0b'],

  /**
   * Gráfico de barras verticales.
   * @param {string} containerId — ID del div .chart-bars
   * @param {Array}  data        — [{mes:string, asistencias:number}]
   * @param {string} color       — CSS gradient string (opcional)
   */
  renderBar(containerId, data, color = 'linear-gradient(180deg,var(--gold-400),var(--gold-600))') {
    const el = $(containerId);
    if (!el || !data?.length) return;

    const maxVal = Math.max(...data.map(d => d.asistencias));

    el.innerHTML = data.map(d => `
      <div class="chart-bar-group">
        <div class="chart-bar"
             style="height:${(d.asistencias / maxVal) * 100}%; background:${color}"
             title="${d.mes}: ${d.asistencias} asistencias">
          <div class="chart-bar-label">${d.mes.slice(0, 3)}</div>
        </div>
      </div>`).join('');
  },

  /**
   * Gráfico donut (anillo) con leyenda.
   * @param {string} svgId    — ID del elemento <svg>
   * @param {string} legendId — ID del div que recibirá la leyenda
   * @param {Object} data     — { 'Carrera A': 3, 'Carrera B': 5, ... }
   * @param {number} r        — radio del anillo (default: 45)
   * @param {number} stroke   — grosor del anillo (default: 22)
   */
  renderDonut(svgId, legendId, data, r = 45, stroke = 22) {
    const svgEl    = $(svgId);
    const legendEl = $(legendId);
    if (!svgEl || !legendEl) return;

    const total     = Object.values(data).reduce((s, v) => s + v, 0);
    if (total === 0) return;

    const cx        = svgEl.viewBox?.baseVal?.width  / 2 || 60;
    const cy        = svgEl.viewBox?.baseVal?.height / 2 || 60;
    const circum    = 2 * Math.PI * r;
    let   offset    = 0;
    let   paths     = '';
    let   legend    = '';

    Object.entries(data).forEach(([name, val], i) => {
      const color   = this.COLORS[i % this.COLORS.length];
      const pct     = val / total;
      const dashArr = `${pct * circum} ${circum}`;

      paths += `
        <circle cx="${cx}" cy="${cy}" r="${r}"
                fill="none"
                stroke="${color}"
                stroke-width="${stroke}"
                stroke-dasharray="${dashArr}"
                stroke-dashoffset="${-offset * circum}"
                transform="rotate(-90 ${cx} ${cy})"
                opacity="0.85">
          <title>${name}: ${val} (${Math.round(pct * 100)}%)</title>
        </circle>`;

      legend += `
        <div class="donut-legend-item">
          <div class="donut-legend-dot" style="background:${color}"></div>
          <span>${name} (${val})</span>
        </div>`;

      offset += pct;
    });

    svgEl.innerHTML    = paths;
    legendEl.innerHTML = legend;
  },

  /**
   * Gráfico de línea con área rellena.
   * @param {string} svgId — ID del <svg>
   * @param {Array}  data  — [{mes:string, tasa:number}]
   */
  renderLine(svgId, data) {
    const svgEl = $(svgId);
    if (!svgEl || !data?.length) return;

    const W      = 500;
    const H      = 100;
    const padX   = 40;
    const padY   = 12;
    const rates  = data.map(d => d.tasa);
    const minR   = Math.min(...rates) - 3;
    const maxR   = Math.max(...rates) + 3;

    // Coordenadas de cada punto
    const xs = data.map((_, i) => padX + (i / (data.length - 1)) * (W - padX * 2));
    const ys = rates.map(r => padY + (1 - (r - minR) / (maxR - minR)) * (H - padY * 2));

    const linePath  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
    const areaPath  = `${linePath} L${xs[xs.length-1]},${H} L${padX},${H} Z`;

    const points = xs.map((x, i) => `
      <circle cx="${x}" cy="${ys[i]}" r="5"
              fill="${this.COLORS[0]}" stroke="#0b1329" stroke-width="2">
        <title>${data[i].mes}: ${rates[i]}%</title>
      </circle>
      <text x="${x}" y="${H + 16}" text-anchor="middle"
            font-size="10" fill="#64748b">${data[i].mes.slice(0, 3)}</text>
      <text x="${x}" y="${ys[i] - 10}" text-anchor="middle"
            font-size="10" fill="${this.COLORS[0]}" font-weight="bold">${rates[i]}%</text>
    `).join('');

    svgEl.innerHTML = `
      <defs>
        <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${this.COLORS[0]}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${this.COLORS[0]}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#line-grad)"/>
      <path d="${linePath}" fill="none"
            stroke="${this.COLORS[0]}" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"/>
      ${points}`;
  },

  /**
   * Gráfico de barras apiladas horizontal (para comparación).
   * @param {string} containerId — ID del contenedor
   * @param {Array}  data — [{label, asistencias, ausencias}]
   */
  renderStackedBar(containerId, data) {
    const el = $(containerId);
    if (!el) return;

    el.innerHTML = data.map(d => {
      const total = d.asistencias + d.ausencias;
      const pctA  = total > 0 ? (d.asistencias / total) * 100 : 0;
      const pctB  = 100 - pctA;
      return `
        <div style="margin-bottom:0.75rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;font-size:0.78rem">
            <span style="color:var(--text-secondary);font-weight:600">${d.mes}</span>
            <span style="color:var(--text-muted)">${d.asistencias} asist. · ${d.ausencias} aus.</span>
          </div>
          <div style="display:flex;height:14px;border-radius:var(--radius-full);overflow:hidden;gap:2px">
            <div style="background:var(--emerald);border-radius:var(--radius-full) 0 0 var(--radius-full);width:${pctA}%;transition:width 1s ease"></div>
            <div style="background:var(--rose);flex:1;border-radius:0 var(--radius-full) var(--radius-full) 0"></div>
          </div>
        </div>`;
    }).join('');
  },
};
