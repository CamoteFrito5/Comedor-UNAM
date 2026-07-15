/* ============================================================
   views/reportes.js — Portal de Reportes y Estadísticas
   ============================================================
   Vistas:
   - renderPDF         → Listado de reportes PDF con descarga
   - renderExcel       → Exportación de datos a Excel
   - renderEstadisticas→ KPIs y tabla de asistencia mensual
   - renderGraficos    → Gráficos interactivos SVG
   ============================================================ */

const ReportesViews = {

  /* ──────────────────────────────────────────────────────────
     SHARED: Tabs de navegación de reportes
  ────────────────────────────────────────────────────────── */
  _tabsHTML(active) {
    const tabs = [
      { key: 'pdf',          label: '📄 PDF',          route: 'reportes-pdf' },
      { key: 'excel',        label: '📊 Excel',         route: 'reportes-excel' },
      { key: 'estadisticas', label: '📈 Estadísticas',  route: 'reportes-estadisticas' },
      { key: 'graficos',     label: '📉 Gráficos',      route: 'reportes-graficos' },
    ];
    return `
      <div class="report-tabs">
        ${tabs.map(t => `
          <button
            class="report-tab${active === t.key ? ' active' : ''}"
            onclick="navigateTo('${t.route}')"
          >${t.label}</button>
        `).join('')}
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     1. renderPDF — Listado y descarga de reportes PDF
  ────────────────────────────────────────────────────────── */
  renderPDF(container) {
    const reportes = [
      {
        nombre: 'Reporte Mensual de Asistencias',
        periodo: 'Junio 2026',
        tipo: 'Asistencia',
        tipoCls: 'tag-blue',
        estado: 'listo',
        archivo: 'reporte-asistencias-jun2026.pdf',
      },
      {
        nombre: 'Padrón de Beneficiarios',
        periodo: 'Julio 2026',
        tipo: 'Padrón',
        tipoCls: 'tag-green',
        estado: 'listo',
        archivo: 'padron-beneficiarios-jul2026.pdf',
      },
      {
        nombre: 'Informe de Justificaciones',
        periodo: 'Junio 2026',
        tipo: 'Justificación',
        tipoCls: 'tag-yellow',
        estado: 'listo',
        archivo: 'informe-justificaciones-jun2026.pdf',
      },
      {
        nombre: 'Informe de Suspensiones',
        periodo: 'Julio 2026',
        tipo: 'Suspensión',
        tipoCls: 'tag-red',
        estado: 'generando',
        archivo: 'informe-suspensiones-jul2026.pdf',
      },
    ];

    const filas = reportes.map(r => {
      const estadoBadge = r.estado === 'listo'
        ? `<span class="badge badge-success">✅ Listo</span>`
        : `<span class="badge badge-warning">⏳ Generando…</span>`;

      const acciones = r.estado === 'listo'
        ? `
          <button class="btn btn-sm btn-primary" onclick="simulateDownload('${r.archivo}')">
            ⬇ Descargar
          </button>
          <button class="btn btn-sm btn-ghost" onclick="simulateDownload('${r.archivo}')">
            👁 Previsualizar
          </button>`
        : `<button class="btn btn-sm btn-ghost" disabled>⏳ Pendiente</button>`;

      return `
        <tr>
          <td><span class="report-name">${r.nombre}</span></td>
          <td>${r.periodo}</td>
          <td><span class="tag ${r.tipoCls}">${r.tipo}</span></td>
          <td>${estadoBadge}</td>
          <td>
            <div class="action-buttons">${acciones}</div>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">📄 Reportes PDF</h2>
          <p class="view-subtitle">Descarga y gestiona los reportes institucionales del comedor</p>
        </div>
        <button class="btn btn-primary" id="btn-generar-reporte" onclick="
          showToast('⏳ Generando reporte…', 'info');
          setTimeout(() => showToast('✅ Reporte generado exitosamente', 'success'), 2800);
        ">
          ➕ Generar Nuevo Reporte
        </button>
      </div>

      ${this._tabsHTML('pdf')}

      <div class="card mt-4">
        <div class="card-header">
          <h3 class="card-title">📑 Reportes Disponibles</h3>
          <span class="badge badge-info">${reportes.length} reportes</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre del Reporte</th>
                <th>Período</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     2. renderExcel — Exportación de datos a Excel
  ────────────────────────────────────────────────────────── */
  renderExcel(container) {
    const exports = [
      {
        icon: '📗',
        title: 'Asistencias',
        desc: 'Historial completo de registros de asistencia al comedor universitario.',
        collection: 'asistencias',
        archivo: 'asistencias.xlsx',
      },
      {
        icon: '📗',
        title: 'Beneficiarios',
        desc: 'Padrón activo de estudiantes beneficiarios con datos académicos y de contacto.',
        collection: 'beneficiarios',
        archivo: 'beneficiarios.xlsx',
      },
      {
        icon: '📗',
        title: 'Postulantes',
        desc: 'Lista de postulantes en proceso de evaluación para acceder al beneficio.',
        collection: 'postulantes',
        archivo: 'postulantes.xlsx',
      },
      {
        icon: '📗',
        title: 'Auditoría',
        desc: 'Registro de actividades del sistema: accesos, modificaciones y eventos.',
        collection: 'auditoria',
        archivo: 'auditoria.xlsx',
      },
    ];

    const cards = exports.map(exp => {
      const count = (DB.get(exp.collection) || []).length;
      return `
        <div class="export-card">
          <div class="export-card__icon">${exp.icon}</div>
          <div class="export-card__body">
            <h4 class="export-card__title">${exp.title}</h4>
            <p class="export-card__desc">${exp.desc}</p>
            <div class="export-card__meta">
              <span class="export-count">${count.toLocaleString()} registros</span>
              <button
                class="btn btn-success btn-sm"
                onclick="simulateDownload('${exp.archivo}')"
              >
                📥 Exportar .xlsx
              </button>
            </div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">📊 Exportar a Excel</h2>
          <p class="view-subtitle">Descarga los datos del sistema en formato compatible con Excel</p>
        </div>
      </div>

      ${this._tabsHTML('excel')}

      <div class="export-grid mt-4">
        ${cards}
      </div>

      <div class="card mt-4 export-tip-card">
        <div class="export-tip-icon">💡</div>
        <div>
          <strong>Consejo de exportación</strong>
          <p class="text-muted text-sm mt-1">
            Los archivos Excel incluyen todas las columnas disponibles. Para filtrar por período,
            usa las funciones de filtro de Excel o solicita un reporte PDF personalizado.
          </p>
        </div>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     3. renderEstadisticas — KPIs y tabla de asistencia mensual
  ────────────────────────────────────────────────────────── */
  renderEstadisticas(container) {
    const beneficiarios  = DB.get('beneficiarios') || [];
    const asistencias    = DB.get('asistencias')   || [];
    const postulantes    = DB.get('postulantes')   || [];
    const estadMensuales = DB.get('estadisticas_mensuales') || [];

    const activos   = beneficiarios.filter(b => b.estado === 'activo').length;
    const totalAsis = asistencias.length;
    const totalBenef = activos || 1;

    /* Tasa promedio: media de tasas mensuales o cálculo simple */
    const tasaPromedio = estadMensuales.length > 0
      ? (estadMensuales.reduce((s, m) => s + (m.tasa || 0), 0) / estadMensuales.length).toFixed(1)
      : ((totalAsis / (totalBenef * 30)) * 100).toFixed(1);

    /* Filas tabla mensual */
    const filasMensuales = estadMensuales.map(m => {
      const tasa = m.tasa || 0;
      const barColor = tasa >= 80 ? '#22c55e' : tasa >= 60 ? '#f59e0b' : '#ef4444';
      return `
        <tr>
          <td>${m.mes || m.month || '—'}</td>
          <td class="text-center">${(m.registros || m.total || 0).toLocaleString()}</td>
          <td class="text-center">${(m.beneficiarios || activos).toLocaleString()}</td>
          <td>
            <div class="progress-cell">
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width:${tasa}%;background:${barColor};"></div>
              </div>
              <span class="progress-label">${tasa}%</span>
            </div>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">📈 Estadísticas</h2>
          <p class="view-subtitle">Indicadores clave de desempeño del Comedor Universitario UNAM Ilo</p>
        </div>
      </div>

      ${this._tabsHTML('estadisticas')}

      <!-- KPI Cards -->
      <div class="stats-grid stats-grid--4 mt-4">
        <div class="stat-card stat-card--green">
          <div class="stat-icon">🎓</div>
          <div class="stat-value">${activos.toLocaleString()}</div>
          <div class="stat-label">Beneficiarios Activos</div>
        </div>
        <div class="stat-card stat-card--blue">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${totalAsis.toLocaleString()}</div>
          <div class="stat-label">Asistencias Totales</div>
        </div>
        <div class="stat-card stat-card--purple">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${tasaPromedio}%</div>
          <div class="stat-label">Tasa Promedio</div>
        </div>
        <div class="stat-card stat-card--yellow">
          <div class="stat-icon">📝</div>
          <div class="stat-value">${postulantes.length.toLocaleString()}</div>
          <div class="stat-label">Postulantes</div>
        </div>
      </div>

      <!-- Gráfico + Tabla mensual -->
      <div class="grid-2 mt-4">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Asistencias por Mes</h3>
          </div>
          <div class="card-body">
            <div id="stat-chart" class="chart-container"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📅 Detalle Mensual</h3>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th class="text-center">Registros</th>
                  <th class="text-center">Beneficiarios</th>
                  <th>Tasa</th>
                </tr>
              </thead>
              <tbody>
                ${filasMensuales || `
                  <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                      Sin datos mensuales disponibles.
                    </td>
                  </tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    /* ── Post-render: renderizar gráfico de barras ── */
    ChartsComponent.renderBar('stat-chart', DB.get('estadisticas_mensuales'));
  },

  /* ──────────────────────────────────────────────────────────
     4. renderGraficos — Gráficos interactivos SVG
  ────────────────────────────────────────────────────────── */
  renderGraficos(container) {
    /* Construir objeto { carrera: count } desde beneficiarios + users */
    const beneficiarios = DB.get('beneficiarios') || [];
    const users         = DB.get('users')         || [];

    const carrerasObj = {};
    beneficiarios.forEach(b => {
      let carrera = b.carrera || '—';
      /* Intentar enriquecer con users si el beneficiario no tiene carrera */
      if (!b.carrera) {
        const u = users.find(u => u.dni === b.dni || u.id === b.userId);
        carrera = u ? (u.carrera || '—') : '—';
      }
      carrerasObj[carrera] = (carrerasObj[carrera] || 0) + 1;
    });

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">📉 Gráficos Interactivos</h2>
          <p class="view-subtitle">Visualizaciones SVG de asistencia y distribución académica</p>
        </div>
      </div>

      ${this._tabsHTML('graficos')}

      <!-- Grid 2: barras apiladas + donut por carrera -->
      <div class="grid-2 mt-4">
        <!-- Barras apiladas -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Asistencias Apiladas por Mes</h3>
          </div>
          <div class="card-body">
            <div id="stacked-chart" class="chart-container"></div>
          </div>
        </div>

        <!-- Donut por carrera -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🎓 Distribución por Carrera</h3>
          </div>
          <div class="card-body donut-layout">
            <svg id="carrera-svg" viewBox="0 0 100 100" class="donut-svg"></svg>
            <div id="carrera-legend" class="donut-legend"></div>
          </div>
        </div>
      </div>

      <!-- Card full-width: línea de tendencia -->
      <div class="card mt-4">
        <div class="card-header">
          <h3 class="card-title">📈 Tendencia de Tasa de Asistencia</h3>
          <span class="badge badge-info">Últimos meses</span>
        </div>
        <div class="card-body">
          <div id="line-chart" class="chart-container chart-container--wide"></div>
        </div>
      </div>`;

    /* ── Post-render: renderizar todos los gráficos ── */
    const estadMensuales = DB.get('estadisticas_mensuales');

    ChartsComponent.renderStackedBar('stacked-chart', estadMensuales);
    ChartsComponent.renderDonut('carrera-svg', 'carrera-legend', carrerasObj, 50, 24);
    ChartsComponent.renderLine('line-chart', estadMensuales);
  },
};
