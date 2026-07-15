/* ============================================================
   views/social.js — Portal de la Asistenta Social
   ============================================================
   Vistas:
   - renderDashboard     → Resumen operativo con gráficos
   - renderBeneficiarios → Tabla CRUD de beneficiarios
   - renderPostulantes   → Evaluación de postulaciones
   - renderListaEspera   → Cola de espera ordenada
   - renderAsistencias   → Control de asistencias del día
   - renderJustificaciones → Resolución de FUT
   - renderReportesSocial → Generación de reportes
   - renderConfiguracion → Parámetros del sistema
   ============================================================ */

const SocialViews = {

  /* ----------------------------------------------------------
     renderDashboard — Resumen operativo con gráficos
  ---------------------------------------------------------- */
  renderDashboard(container) {
    const beneficiarios   = DB.get('beneficiarios') || [];
    const asistencias     = DB.get('asistencias')   || [];
    const listaEspera     = DB.get('lista_espera')  || [];
    const users           = DB.get('users')         || [];
    const estadisticas    = DB.get('estadisticas_mensuales') || [];

    const activos      = beneficiarios.filter(b => b.estado === 'activo').length;
    const suspendidos  = beneficiarios.filter(b => b.estado === 'suspendido').length;
    const hoy          = getToday();
    const asistHoy     = asistencias.filter(a => a.fecha === hoy).length;
    const enEspera     = listaEspera.length;

    // Carreras para donut
    const carreraMap = {};
    beneficiarios.filter(b => b.estado === 'activo').forEach(b => {
      const u = users.find(u => u.id === b.userId);
      if (u) carreraMap[u.carrera] = (carreraMap[u.carrera] || 0) + 1;
    });
    const carreras = Object.entries(carreraMap).map(([nombre, cantidad]) => ({ nombre, cantidad }));

    // Últimas asistencias del día
    const ultAsist = asistencias
      .filter(a => a.fecha === hoy)
      .sort((a, b) => b.hora.localeCompare(a.hora))
      .slice(0, 6);

    const asistListHTML = ultAsist.length === 0
      ? '<p class="empty-state">No hay asistencias registradas hoy.</p>'
      : ultAsist.map(a => {
          const u = users.find(u => u.id === a.userId) || {};
          return `
            <div class="asist-row">
              <div class="mini-avatar">${(u.nombre || '?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
              <div class="asist-info">
                <span class="asist-nombre">${u.nombre || '—'}</span>
                <span class="asist-carrera">${u.carrera || '—'}</span>
              </div>
              <span class="asist-hora">${a.hora}</span>
            </div>`;
        }).join('');

    const pendientesItems = [
      { icon: '📝', label: 'Postulaciones pendientes', sub: `${(DB.get('postulantes')||[]).filter(p=>p.estado==='pendiente').length} por revisar`, nav: 'postulantes-social' },
      { icon: '📋', label: 'Justificaciones FUT',       sub: `${(DB.get('justificaciones')||[]).filter(j=>j.estado==='pendiente').length} por resolver`, nav: 'justificaciones-social' },
      { icon: '⏳', label: 'Lista de espera',           sub: `${enEspera} estudiantes en cola`, nav: 'lista-espera-social' },
      { icon: '⛔', label: 'Beneficiarios suspendidos', sub: `${suspendidos} requieren atención`, nav: 'beneficiarios-social' }
    ];

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">📊 Dashboard Operativo</h1>
          <p class="view-subtitle">Resumen general del comedor universitario · ${getTodayDisplay()}</p>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="stats-grid stats-grid-4">
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--emerald-light);color:var(--emerald)">👥</div>
          <div class="stat-body">
            <div class="stat-value">${activos}</div>
            <div class="stat-label">Beneficiarios activos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--sky-light);color:var(--sky)">🍽️</div>
          <div class="stat-body">
            <div class="stat-value">${asistHoy}</div>
            <div class="stat-label">Asistencias hoy</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--amber-light);color:var(--amber)">⏳</div>
          <div class="stat-body">
            <div class="stat-value">${enEspera}</div>
            <div class="stat-label">En lista de espera</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--rose-light);color:var(--rose)">⛔</div>
          <div class="stat-body">
            <div class="stat-value">${suspendidos}</div>
            <div class="stat-label">Suspendidos</div>
          </div>
        </div>
      </div>

      <!-- Gráfico de barras + Pendientes -->
      <div class="grid-2" style="margin-top:1.5rem;">
        <div class="card">
          <div class="card-header"><h3 class="card-title">📈 Asistencias Mensuales</h3></div>
          <div class="card-body">
            <canvas id="dash-chart" height="200"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">🔔 Pendientes de Atención</h3></div>
          <div class="card-body">
            <div class="pendientes-list">
              ${pendientesItems.map(p => `
                <div class="pendiente-item" onclick="navigateTo('${p.nav}')">
                  <span class="pendiente-icon">${p.icon}</span>
                  <div class="pendiente-info">
                    <span class="pendiente-label">${p.label}</span>
                    <span class="pendiente-sub">${p.sub}</span>
                  </div>
                  <span class="pendiente-arrow">›</span>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Asistencias hoy + Donut por carrera -->
      <div class="grid-2" style="margin-top:1.5rem;">
        <div class="card">
          <div class="card-header"><h3 class="card-title">🕐 Últimas Asistencias de Hoy</h3></div>
          <div class="card-body">
            ${asistListHTML}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">🎓 Distribución por Carrera</h3></div>
          <div class="card-body" style="display:flex;gap:1rem;align-items:center;">
            <svg id="donut-svg" width="140" height="140" viewBox="0 0 140 140"></svg>
            <div id="donut-legend" style="flex:1;"></div>
          </div>
        </div>
      </div>
    `;

    // Renderizar gráficos
    const labels = estadisticas.map(e => e.mes || e.label || '');
    const values = estadisticas.map(e => e.asistencias || e.value || 0);
    ChartsComponent.renderBar('dash-chart', labels, values, 'Asistencias');
    ChartsComponent.renderDonut('donut-svg', 'donut-legend', carreras);
  },

  /* ----------------------------------------------------------
     renderBeneficiarios — Tabla CRUD de beneficiarios
  ---------------------------------------------------------- */
  renderBeneficiarios(container) {
    const allBen  = DB.get('beneficiarios') || [];
    const users   = DB.get('users') || [];

    // Función de construcción de tabla
    function buildTable(filtroEstado, busqueda) {
      let lista = allBen.map(b => {
        const u = users.find(u => u.id === b.userId) || {};
        return { ...b, user: u };
      });
      if (filtroEstado && filtroEstado !== 'todos') {
        lista = lista.filter(b => b.estado === filtroEstado);
      }
      if (busqueda) {
        const q = busqueda.toLowerCase();
        lista = lista.filter(b =>
          (b.user.nombre || '').toLowerCase().includes(q) ||
          (b.user.codigo || '').toLowerCase().includes(q) ||
          (b.user.dni    || '').toLowerCase().includes(q)
        );
      }
      if (lista.length === 0) {
        return '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No se encontraron beneficiarios.</td></tr>';
      }
      return lista.map(b => {
        const pct = Math.min(b.score || 0, 100);
        const ring = `<svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" stroke-width="3"/>
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--violet)" stroke-width="3"
            stroke-dasharray="${(pct/100)*94.25} 94.25" stroke-linecap="round"
            transform="rotate(-90 18 18)"/>
          <text x="18" y="22" text-anchor="middle" font-size="9" fill="var(--text)">${pct}</text>
        </svg>`;
        const acConsec = b.ausencias_consecutivas || 0;
        return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:.75rem;">
                <div class="mini-avatar">${(b.user.nombre||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                <div>
                  <div style="font-weight:600;">${b.user.nombre || '—'}</div>
                  <div style="font-size:.75rem;color:var(--text-muted);">${b.user.codigo || '—'}</div>
                </div>
              </div>
            </td>
            <td>
              <div>${b.user.carrera || '—'}</div>
              <div style="font-size:.75rem;color:var(--text-muted);">${b.user.ciclo || '—'}° ciclo</div>
            </td>
            <td>${statusBadge(b.estado)}</td>
            <td>${ring}</td>
            <td>
              <span class="${acConsec >= 3 ? 'badge badge-danger' : acConsec >= 2 ? 'badge badge-warning' : 'badge badge-success'}">${acConsec}</span>
            </td>
            <td style="font-size:.85rem;">${fmt(b.fecha_fin)}</td>
            <td>
              <div style="display:flex;gap:.5rem;">
                <button class="btn btn-sm btn-outline" onclick="window.showBeneficiarioDetail('${b.id}')">👁 Ver</button>
                ${b.estado === 'activo'
                  ? `<button class="btn btn-sm btn-danger-outline" onclick="window.suspenderBen('${b.id}')">⛔ Suspender</button>`
                  : `<button class="btn btn-sm btn-success-outline" onclick="window.reactivarBen('${b.id}')">✅ Reactivar</button>`}
              </div>
            </td>
          </tr>`;
      }).join('');
    }

    window.filterBen = function(v) {
      window._benFiltro = v;
      $('ben-tbody').innerHTML = buildTable(v, window._benBusqueda || '');
    };
    window.searchBen = function(v) {
      window._benBusqueda = v;
      $('ben-tbody').innerHTML = buildTable(window._benFiltro || 'todos', v);
    };
    window.showBeneficiarioDetail = function(benId) {
      const b = allBen.find(b => b.id === benId);
      if (!b) return;
      const u = users.find(u => u.id === b.userId) || {};
      const qr = generateQRSvg(b.codigo_qr || u.codigo, 100);
      openModal('modal-ben', `
        <div class="modal-profile">
          <div class="avatar-xl">${(u.nombre||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
          <h2 class="modal-title">${u.nombre || '—'}</h2>
          <p class="modal-sub">${u.carrera || '—'} · ${u.ciclo || '—'}° ciclo</p>
          <div style="margin:.5rem 0;">${statusBadge(b.estado)}</div>
        </div>
        <div class="qr-container qr-md" style="text-align:center;margin:1rem 0;">${qr}<p class="qr-code">${b.codigo_qr || u.codigo}</p></div>
        <div class="info-table">
          <div class="info-row"><span class="info-label">DNI</span><span class="info-val">${u.dni||'—'}</span></div>
          <div class="info-row"><span class="info-label">Código</span><span class="info-val">${u.codigo||'—'}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span class="info-val">${u.email||'—'}</span></div>
          <div class="info-row"><span class="info-label">Periodo</span><span class="info-val">${b.periodo||'—'}</span></div>
          <div class="info-row"><span class="info-label">Turno</span><span class="info-val">${b.turno||'—'}</span></div>
          <div class="info-row"><span class="info-label">Score</span><span class="info-val score-badge">${b.score}/100</span></div>
          <div class="info-row"><span class="info-label">Vigencia</span><span class="info-val">${fmt(b.fecha_inicio)} — ${fmt(b.fecha_fin)}</span></div>
        </div>
        <div style="display:flex;gap:.75rem;margin-top:1.5rem;">
          ${b.estado === 'activo'
            ? `<button class="btn btn-danger btn-full" onclick="window.suspenderBen('${b.id}');closeModal('modal-ben')">⛔ Suspender Beneficio</button>`
            : `<button class="btn btn-success btn-full" onclick="window.reactivarBen('${b.id}');closeModal('modal-ben')">✅ Reactivar Beneficio</button>`}
          <button class="btn btn-outline" onclick="closeModal('modal-ben')">Cerrar</button>
        </div>
      `);
    };
    window.suspenderBen = function(benId) {
      const list = DB.get('beneficiarios') || [];
      const idx = list.findIndex(b => b.id === benId);
      if (idx > -1) { list[idx].estado = 'suspendido'; DB.set('beneficiarios', list); }
      showToast('⛔ Beneficiario suspendido.', 'warning');
      SocialViews.renderBeneficiarios(container);
    };
    window.reactivarBen = function(benId) {
      const list = DB.get('beneficiarios') || [];
      const idx = list.findIndex(b => b.id === benId);
      if (idx > -1) { list[idx].estado = 'activo'; list[idx].ausencias_consecutivas = 0; DB.set('beneficiarios', list); }
      showToast('✅ Beneficiario reactivado correctamente.', 'success');
      SocialViews.renderBeneficiarios(container);
    };

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">👥 Beneficiarios</h1>
          <p class="view-subtitle">Gestión completa del padrón de beneficiarios</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <select class="form-select filter-select" onchange="window.filterBen(this.value)">
          <option value="todos">Todos los estados</option>
          <option value="activo">✅ Activos</option>
          <option value="suspendido">⛔ Suspendidos</option>
          <option value="inactivo">⬜ Inactivos</option>
        </select>
        <input class="form-input search-input" type="text" placeholder="🔍 Buscar por nombre, código o DNI…"
               oninput="window.searchBen(this.value)">
      </div>

      <!-- Tabla -->
      <div class="card" style="margin-top:1rem;">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Carrera / Ciclo</th>
                <th>Estado</th>
                <th>Score</th>
                <th>Ause. Consec.</th>
                <th>Vigencia</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="ben-tbody">
              ${buildTable('todos', '')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal detalle -->
      <div id="modal-ben" class="modal-overlay" style="display:none;" onclick="if(event.target===this)closeModal('modal-ben')">
        <div class="modal-box">
          <button class="modal-close" onclick="closeModal('modal-ben')">✕</button>
          <div id="modal-ben-content"></div>
        </div>
      </div>
    `;
  },

  /* ----------------------------------------------------------
     renderPostulantes — Evaluación de postulaciones
  ---------------------------------------------------------- */
  renderPostulantes(container) {
    const postulantes = DB.get('postulantes') || [];
    const users       = DB.get('users')       || [];

    window.verPostulante = function(id) {
      const p = postulantes.find(p => p.id === id);
      if (!p) return;
      const u = users.find(u => u.id === p.userId) || {};
      const docsHTML = (p.documentos || []).map(d =>
        `<span class="doc-tag">${d}</span>`).join('');
      openModal('modal-post', `
        <h2 class="modal-title">📋 Detalle de Postulación</h2>
        <div class="profile-header" style="margin-bottom:1rem;">
          <div class="mini-avatar" style="width:48px;height:48px;font-size:1.1rem;">${(u.nombre||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
          <div>
            <div style="font-weight:700;">${u.nombre||'—'}</div>
            <div style="font-size:.85rem;color:var(--text-muted);">${u.carrera||'—'} · ${u.ciclo||'—'}° ciclo</div>
          </div>
          <div>${statusBadge(p.estado)}</div>
        </div>
        <div class="info-table">
          <div class="info-row"><span class="info-label">DNI</span><span class="info-val">${u.dni||'—'}</span></div>
          <div class="info-row"><span class="info-label">Código</span><span class="info-val">${u.codigo||'—'}</span></div>
          <div class="info-row"><span class="info-label">Score</span><span class="info-val score-badge">${p.score}/100</span></div>
          <div class="info-row"><span class="info-label">Fecha solicitud</span><span class="info-val">${fmt(p.fecha)}</span></div>
          <div class="info-row"><span class="info-label">Motivo</span><span class="info-val">${p.motivo||'—'}</span></div>
          <div class="info-row"><span class="info-label">Turno</span><span class="info-val">${p.turno||'—'}</span></div>
        </div>
        <div style="margin-top:1rem;">
          <p style="font-weight:600;margin-bottom:.5rem;">📎 Documentos adjuntos:</p>
          <div class="docs-tags">${docsHTML || '<span style="color:var(--text-muted)">Sin documentos</span>'}</div>
        </div>
        ${p.estado === 'pendiente' ? `
          <div style="display:flex;gap:.75rem;margin-top:1.5rem;">
            <button class="btn btn-success btn-full" onclick="window.aprobarPost('${p.id}');closeModal('modal-post')">✅ Aprobar</button>
            <button class="btn btn-danger btn-full" onclick="window.rechazarPost('${p.id}');closeModal('modal-post')">❌ Rechazar</button>
          </div>` : ''}
        <button class="btn btn-outline btn-full" style="margin-top:.5rem;" onclick="closeModal('modal-post')">Cerrar</button>
      `);
    };

    window.aprobarPost = function(id) {
      PostulantesService.aprobar(id);
      showToast('✅ Postulación aprobada. El estudiante será notificado.', 'success');
      SocialViews.renderPostulantes(container);
    };

    window.rechazarPost = function(id) {
      PostulantesService.rechazar(id);
      showToast('❌ Postulación rechazada.', 'warning');
      SocialViews.renderPostulantes(container);
    };

    const rowsHTML = postulantes.length === 0
      ? '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No hay postulantes.</td></tr>'
      : postulantes.sort((a,b) => (b.score||0)-(a.score||0)).map(p => {
          const u = users.find(u => u.id === p.userId) || {};
          const pct = Math.min(p.score || 0, 100);
          const progHTML = `<div style="display:flex;align-items:center;gap:.5rem;">
            <div class="progress-track" style="flex:1;height:6px;">
              <div class="progress-bar" style="width:${pct}%;background:var(--violet);height:6px;"></div>
            </div>
            <span style="font-size:.8rem;font-weight:600;">${pct}</span>
          </div>`;
          const docsCount = (p.documentos || []).length;
          return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:.75rem;">
                  <div class="mini-avatar">${(u.nombre||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                  <div>
                    <div style="font-weight:600;">${u.nombre||'—'}</div>
                    <div style="font-size:.75rem;color:var(--text-muted);">${u.codigo||'—'}</div>
                  </div>
                </div>
              </td>
              <td>${u.carrera||'—'}</td>
              <td style="min-width:120px;">${progHTML}</td>
              <td><span class="badge badge-info">${docsCount} docs</span></td>
              <td style="font-size:.85rem;">${fmt(p.fecha)}</td>
              <td>${statusBadge(p.estado)}</td>
              <td>
                <div style="display:flex;gap:.5rem;">
                  <button class="btn btn-sm btn-outline" onclick="window.verPostulante('${p.id}')">👁 Ver</button>
                  ${p.estado === 'pendiente' ? `
                    <button class="btn btn-sm btn-success-outline" onclick="window.aprobarPost('${p.id}')">✅</button>
                    <button class="btn btn-sm btn-danger-outline" onclick="window.rechazarPost('${p.id}')">❌</button>` : ''}
                </div>
              </td>
            </tr>`;
        }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">📝 Postulantes</h1>
          <p class="view-subtitle">Evaluación y resolución de postulaciones 2026-II</p>
        </div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Postulante</th><th>Carrera</th><th>Score</th>
                <th>Documentos</th><th>Fecha</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      </div>
      <div id="modal-post" class="modal-overlay" style="display:none;" onclick="if(event.target===this)closeModal('modal-post')">
        <div class="modal-box"><button class="modal-close" onclick="closeModal('modal-post')">✕</button>
          <div id="modal-post-content"></div></div>
      </div>
    `;
  },

  /* ----------------------------------------------------------
     renderListaEspera — Cola de espera ordenada
  ---------------------------------------------------------- */
  renderListaEspera(container) {
    const listaEspera = (DB.get('lista_espera') || []).sort((a,b) => (b.score||0)-(a.score||0));
    const users       = DB.get('users') || [];
    const config      = DB.get('config') || {};
    const capacidad   = config.capacidad || 80;
    const activos     = (DB.get('beneficiarios')||[]).filter(b=>b.estado==='activo').length;
    const cuposDisp   = Math.max(capacidad - activos, 0);

    window.promoverEstudiante = function(id) {
      ListaEsperaService.promover(id);
      showToast('✅ Estudiante promovido a beneficiario activo.', 'success');
      SocialViews.renderListaEspera(container);
    };

    window.promoverPrimero = function() {
      if (listaEspera.length === 0) { showToast('⚠️ La lista de espera está vacía.', 'warning'); return; }
      ListaEsperaService.promover(listaEspera[0].id);
      showToast('✅ Primer estudiante promovido exitosamente.', 'success');
      SocialViews.renderListaEspera(container);
    };

    const rowsHTML = listaEspera.length === 0
      ? '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">La lista de espera está vacía.</td></tr>'
      : listaEspera.map((item, idx) => {
          const u = users.find(u => u.id === item.userId) || {};
          const pos = idx + 1;
          const pct = Math.min(item.score || 0, 100);
          return `
            <tr>
              <td>
                <div class="position-badge ${pos === 1 ? 'pos-gold' : pos === 2 ? 'pos-silver' : pos === 3 ? 'pos-bronze' : ''}">${pos}</div>
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:.75rem;">
                  <div class="mini-avatar">${(u.nombre||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                  <div>
                    <div style="font-weight:600;">${u.nombre||'—'}</div>
                    <div style="font-size:.75rem;color:var(--text-muted);">${u.codigo||'—'}</div>
                  </div>
                </div>
              </td>
              <td>${u.carrera||'—'}</td>
              <td style="min-width:130px;">
                <div style="display:flex;align-items:center;gap:.5rem;">
                  <div class="progress-track" style="flex:1;height:6px;">
                    <div class="progress-bar" style="width:${pct}%;background:var(--violet);height:6px;"></div>
                  </div>
                  <span style="font-size:.8rem;font-weight:600;">${pct}</span>
                </div>
              </td>
              <td style="font-size:.85rem;">${fmt(item.fecha_registro)}</td>
              <td>
                <button class="btn btn-sm btn-primary" onclick="window.promoverEstudiante('${item.id}')">
                  ⬆️ Promover
                </button>
              </td>
            </tr>`;
        }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">⏳ Lista de Espera</h1>
          <p class="view-subtitle">Cola de postulantes ordenada por score socioeconómico</p>
        </div>
        <div class="view-actions">
          <button class="btn btn-primary" onclick="window.promoverPrimero()">⬆️ Promover al #1</button>
        </div>
      </div>

      ${cuposDisp > 0
        ? `<div class="alert alert-success">
            <span class="alert-icon">✅</span>
            <div><strong>${cuposDisp} cupo${cuposDisp>1?'s':''} disponible${cuposDisp>1?'s':''}</strong>
            <p>Hay cupos libres en el comedor. Puedes promover estudiantes de la lista de espera.</p></div>
           </div>`
        : `<div class="alert alert-warning">
            <span class="alert-icon">⚠️</span>
            <div><strong>Capacidad completa</strong>
            <p>El comedor ha alcanzado su capacidad máxima de ${capacidad} beneficiarios activos.</p></div>
           </div>`}

      <div class="card" style="margin-top:1rem;">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>#</th><th>Estudiante</th><th>Carrera</th><th>Score</th><th>Registro</th><th>Acción</th></tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* ----------------------------------------------------------
     renderAsistencias — Control de asistencias del día
  ---------------------------------------------------------- */
  renderAsistencias(container) {
    const beneficiarios = (DB.get('beneficiarios')||[]).filter(b => b.estado === 'activo');
    const users         = DB.get('users') || [];
    const asistencias   = DB.get('asistencias') || [];
    const hoy           = getToday();

    const asistHoy    = asistencias.filter(a => a.fecha === hoy);
    const presentes   = asistHoy.length;
    const total       = beneficiarios.length;
    const sinRegistrar= Math.max(total - presentes, 0);
    const pctDia      = total > 0 ? Math.round((presentes / total) * 100) : 0;

    const rowsHTML = beneficiarios.length === 0
      ? '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">No hay beneficiarios activos.</td></tr>'
      : beneficiarios.map(b => {
          const u = users.find(u => u.id === b.userId) || {};
          const reg = asistHoy.find(a => a.userId === b.userId || a.beneficiarioId === b.id);
          const presente = !!reg;
          return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:.75rem;">
                  <div class="mini-avatar">${(u.nombre||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                  <div>
                    <div style="font-weight:600;">${u.nombre||'—'}</div>
                    <div style="font-size:.75rem;color:var(--text-muted);">${u.codigo||'—'}</div>
                  </div>
                </div>
              </td>
              <td>${u.carrera||'—'}</td>
              <td style="font-size:.85rem;">${presente ? reg.hora : '—'}</td>
              <td style="font-size:.85rem;">${presente ? (reg.metodo || 'QR') : '—'}</td>
              <td>
                ${presente
                  ? '<span class="badge badge-success">✅ Presente</span>'
                  : '<span class="badge badge-danger">❌ Ausente</span>'}
              </td>
            </tr>`;
        }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">🍽️ Control de Asistencias</h1>
          <p class="view-subtitle">Registro del día · ${getTodayDisplay()}</p>
        </div>
      </div>

      <div class="stats-grid stats-grid-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--emerald-light);color:var(--emerald)">✅</div>
          <div class="stat-body">
            <div class="stat-value">${presentes}</div>
            <div class="stat-label">Registrados hoy</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--rose-light);color:var(--rose)">❌</div>
          <div class="stat-body">
            <div class="stat-value">${sinRegistrar}</div>
            <div class="stat-label">Sin registrar</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--sky-light);color:var(--sky)">📊</div>
          <div class="stat-body">
            <div class="stat-value">${pctDia}%</div>
            <div class="stat-label">Porcentaje del día</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:1.5rem;">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Estudiante</th><th>Carrera</th><th>Hora</th><th>Método</th><th>Estado</th></tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* ----------------------------------------------------------
     renderJustificaciones — Resolución de FUT
  ---------------------------------------------------------- */
  renderJustificaciones(container) {
    const justs  = DB.get('justificaciones') || [];
    const users  = DB.get('users') || [];

    window.resolverJus = function(id, decision) {
      JustificacionesService.resolver(id, decision);
      const msg = decision === 'aprobado'
        ? '✅ Justificación aprobada. La ausencia ha sido justificada.'
        : '❌ Justificación rechazada.';
      showToast(msg, decision === 'aprobado' ? 'success' : 'warning');
      SocialViews.renderJustificaciones(container);
    };

    const rowsHTML = justs.length === 0
      ? '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No hay justificaciones registradas.</td></tr>'
      : justs.sort((a,b) => new Date(b.fecha_solicitud)-new Date(a.fecha_solicitud)).map(j => {
          const u = users.find(u => u.id === j.userId || u.id === j.beneficiarioId) || {};
          const docTag = j.documento
            ? `<span class="doc-tag">📎 ${j.documento}</span>`
            : '<span style="color:var(--text-muted);font-size:.8rem;">Sin documento</span>';
          return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:.75rem;">
                  <div class="mini-avatar">${(u.nombre||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                  <div>
                    <div style="font-weight:600;">${u.nombre||'—'}</div>
                    <div style="font-size:.75rem;color:var(--text-muted);">${u.codigo||'—'}</div>
                  </div>
                </div>
              </td>
              <td style="font-size:.85rem;">${fmt(j.fecha_ausencia)}</td>
              <td style="font-size:.85rem;">${j.tipo||'—'}</td>
              <td>${docTag}</td>
              <td style="font-size:.85rem;">${fmtRelative(j.fecha_solicitud)}</td>
              <td>${statusBadge(j.estado)}</td>
              <td>
                ${j.estado === 'pendiente' ? `
                  <div style="display:flex;gap:.5rem;">
                    <button class="btn btn-sm btn-success-outline" onclick="window.resolverJus('${j.id}','aprobado')">✅ Aprobar</button>
                    <button class="btn btn-sm btn-danger-outline"  onclick="window.resolverJus('${j.id}','rechazado')">❌ Rechazar</button>
                  </div>` : '<span style="color:var(--text-muted);font-size:.85rem;">—</span>'}
              </td>
            </tr>`;
        }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">📋 Justificaciones FUT</h1>
          <p class="view-subtitle">Resolución de formularios de justificación de ausencias</p>
        </div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Estudiante</th><th>F. Ausencia</th><th>Motivo</th>
                <th>Documento</th><th>Solicitado</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* ----------------------------------------------------------
     renderReportesSocial — Generación de reportes
  ---------------------------------------------------------- */
  renderReportesSocial(container) {
    const reportes = [
      {
        icon: '📊',
        titulo: 'Reporte de Asistencias Mensual',
        desc: 'Estadísticas detalladas de asistencia de todos los beneficiarios del mes en curso.',
        formato: 'XLSX',
        color: 'var(--emerald)'
      },
      {
        icon: '👥',
        titulo: 'Padrón de Beneficiarios',
        desc: 'Lista completa de beneficiarios activos, suspendidos e inactivos con datos académicos.',
        formato: 'PDF',
        color: 'var(--sky)'
      },
      {
        icon: '📝',
        titulo: 'Informe de Postulaciones',
        desc: 'Resultados del proceso de selección con scores y documentos evaluados.',
        formato: 'PDF',
        color: 'var(--violet)'
      },
      {
        icon: '⚠️',
        titulo: 'Reporte de Ausencias e Incidencias',
        desc: 'Detalle de ausencias consecutivas, suspensiones y justificaciones del periodo.',
        formato: 'XLSX',
        color: 'var(--amber)'
      }
    ];

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">📄 Reportes</h1>
          <p class="view-subtitle">Generación y descarga de reportes del comedor universitario</p>
        </div>
      </div>

      <div class="reportes-grid">
        ${reportes.map(r => `
          <div class="reporte-card">
            <div class="reporte-icon" style="color:${r.color}">${r.icon}</div>
            <h3 class="reporte-title">${r.titulo}</h3>
            <p class="reporte-desc">${r.desc}</p>
            <div class="reporte-footer">
              <span class="reporte-formato">${r.formato}</span>
              <button class="btn btn-primary btn-sm" onclick="simulateDownload('${r.titulo}','${r.formato}')">
                ⬇️ Descargar
              </button>
            </div>
          </div>`).join('')}
      </div>
    `;
  },

  /* ----------------------------------------------------------
     renderConfiguracion — Parámetros del sistema
  ---------------------------------------------------------- */
  renderConfiguracion(container) {
    const config = DB.get('config') || {};

    window.guardarConfigGeneral = function() {
      const periodo    = document.getElementById('cfg-periodo').value;
      const capacidad  = parseInt(document.getElementById('cfg-capacidad').value, 10);
      const turnoMan   = document.getElementById('cfg-turno-man').value;
      const turnoTar   = document.getElementById('cfg-turno-tar').value;
      if (!periodo || !capacidad) {
        showToast('⚠️ Completa todos los campos obligatorios.', 'warning');
        return;
      }
      const current = DB.get('config') || {};
      DB.set('config', { ...current, periodo, capacidad, turno_manana: turnoMan, turno_tarde: turnoTar });
      showToast('✅ Configuración general guardada correctamente.', 'success');
    };

    window.guardarReglas = function() {
      const ausConsec  = parseInt(document.getElementById('cfg-aus-consec').value, 10);
      const ausMes     = parseInt(document.getElementById('cfg-aus-mes').value, 10);
      if (isNaN(ausConsec) || isNaN(ausMes)) {
        showToast('⚠️ Ingresa valores numéricos válidos.', 'warning');
        return;
      }
      const current = DB.get('config') || {};
      DB.set('config', { ...current, max_ausencias_consecutivas: ausConsec, max_ausencias_mes: ausMes });
      showToast('✅ Reglas de suspensión actualizadas.', 'success');
    };

    window.toggleNotifAuto = function(input) {
      const current = DB.get('config') || {};
      DB.set('config', { ...current, notificaciones_automaticas: input.checked });
      showToast(input.checked ? '🔔 Notificaciones automáticas activadas.' : '🔕 Notificaciones automáticas desactivadas.', 'info');
    };

    const notifAuto = config.notificaciones_automaticas !== false;

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">⚙️ Configuración</h1>
          <p class="view-subtitle">Parámetros generales del sistema del comedor universitario</p>
        </div>
      </div>

      <div class="grid-2">

        <!-- Parámetros generales -->
        <div class="card">
          <div class="card-header"><h3 class="card-title">📋 Parámetros Generales</h3></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Periodo activo</label>
              <input class="form-input" type="text" id="cfg-periodo" placeholder="Ej: 2026-II"
                     value="${config.periodo || '2026-I'}">
            </div>
            <div class="form-group">
              <label class="form-label">Capacidad máxima (beneficiarios)</label>
              <input class="form-input" type="number" id="cfg-capacidad" min="1" max="999"
                     value="${config.capacidad || 80}">
            </div>
            <div class="form-group">
              <label class="form-label">Turno mañana</label>
              <input class="form-input" type="text" id="cfg-turno-man" placeholder="Ej: 07:00 – 09:00"
                     value="${config.turno_manana || '07:00 – 09:00'}">
            </div>
            <div class="form-group">
              <label class="form-label">Turno tarde</label>
              <input class="form-input" type="text" id="cfg-turno-tar" placeholder="Ej: 12:00 – 14:00"
                     value="${config.turno_tarde || '12:00 – 14:00'}">
            </div>

            <!-- Switch notificaciones -->
            <div class="form-group switch-group">
              <span class="form-label">Notificaciones automáticas</span>
              <label class="switch">
                <input type="checkbox" id="cfg-notif" ${notifAuto ? 'checked' : ''}
                       onchange="window.toggleNotifAuto(this)">
                <span class="switch-slider"></span>
              </label>
            </div>

            <button class="btn btn-primary btn-full" style="margin-top:1rem;"
                    onclick="window.guardarConfigGeneral()">
              💾 Guardar Configuración
            </button>
          </div>
        </div>

        <!-- Reglas de suspensión -->
        <div class="card">
          <div class="card-header"><h3 class="card-title">⚠️ Reglas de Suspensión</h3></div>
          <div class="card-body">
            <p style="color:var(--text-muted);margin-bottom:1.25rem;">
              Define los umbrales que desencadenan la suspensión automática del beneficio.
            </p>
            <div class="form-group">
              <label class="form-label">Máx. ausencias consecutivas para suspensión</label>
              <input class="form-input" type="number" id="cfg-aus-consec" min="1" max="10"
                     value="${config.max_ausencias_consecutivas || 3}">
              <span class="form-hint">Actualmente: ${config.max_ausencias_consecutivas || 3} ausencias consecutivas.</span>
            </div>
            <div class="form-group">
              <label class="form-label">Máx. ausencias por mes para suspensión</label>
              <input class="form-input" type="number" id="cfg-aus-mes" min="1" max="30"
                     value="${config.max_ausencias_mes || 5}">
              <span class="form-hint">Actualmente: ${config.max_ausencias_mes || 5} ausencias mensuales.</span>
            </div>
            <div class="alert alert-warning" style="margin-top:1rem;">
              <span class="alert-icon">⚠️</span>
              <div>
                <strong>Atención</strong>
                <p>Cambiar estos valores afectará la evaluación de todos los beneficiarios activos a partir de la siguiente verificación nocturna.</p>
              </div>
            </div>
            <button class="btn btn-primary btn-full" style="margin-top:1rem;"
                    onclick="window.guardarReglas()">
              💾 Guardar Reglas
            </button>
          </div>
        </div>
      </div>
    `;
  }

};
