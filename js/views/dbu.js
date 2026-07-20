/* ============================================================
   views/dbu.js — Portal de la Dirección de Bienestar Universitario
   ============================================================
   Este módulo permite a la DBU:
   1. Ver el dashboard con métricas de postulaciones.
   2. Listar y buscar postulantes con sus expedientes.
   3. Evaluar (aprobar/rechazar/lista de espera) cada postulación
      con un comentario obligatorio de admisión.
   4. Ver y gestionar la lista de espera.
   5. Consultar el padrón de beneficiarios activos.
   6. Generar reportes del proceso de admisión.
   ============================================================ */

const DBUViews = {

  /* ──────────────────────────────────────────────────────────
     Tabs del módulo DBU
  ────────────────────────────────────────────────────────── */
  _tabsHTML(active) {
    const tabs = [
      { id: 'dbu-dashboard',    label: '📊 Dashboard' },
      { id: 'dbu-postulantes',  label: '📋 Postulantes' },
      { id: 'dbu-evaluar',      label: '⚖️ Evaluar' },
      { id: 'dbu-lista-espera', label: '⏳ Lista de Espera' },
      { id: 'dbu-beneficiarios',label: '👥 Beneficiarios' },
      { id: 'dbu-reportes',     label: '📈 Reportes' },
    ];
    return `<div class="tabs-bar">${tabs.map(t =>
      `<button class="tab-btn ${t.id === active ? 'active' : ''}" onclick="navigateTo('${t.id}')">${t.label}</button>`
    ).join('')}</div>`;
  },

  /* ──────────────────────────────────────────────────────────
     1. Dashboard — métricas del proceso de admisión
  ────────────────────────────────────────────────────────── */
  async renderDashboard(container) {
    // Obtener estadísticas de postulaciones desde Supabase
    let stats = { pendiente: 0, evaluacion: 0, aprobado: 0, rechazado: 0, espera: 0, total: 0 };

    if (USE_SUPABASE && _supabaseClient) {
      try {
        const { data } = await _supabaseClient
          .from('postulacion')
          .select('id_estado_postulacion');

        if (data) {
          data.forEach(p => {
            stats.total++;
            if (p.id_estado_postulacion === 1) stats.pendiente++;
            else if (p.id_estado_postulacion === 2) stats.evaluacion++;
            else if (p.id_estado_postulacion === 3) stats.aprobado++;
            else if (p.id_estado_postulacion === 4) stats.rechazado++;
            else if (p.id_estado_postulacion === 5) stats.espera++;
          });
        }
      } catch (e) {
        console.warn('[DBU Dashboard]', e);
      }
    } else {
      const posts = DB.get('postulantes') || [];
      stats.total      = posts.length;
      stats.pendiente  = posts.filter(p => p.estado === 'pendiente').length;
      stats.evaluacion = posts.filter(p => p.estado === 'en_evaluacion').length;
      stats.aprobado   = posts.filter(p => p.estado === 'aprobado').length;
      stats.rechazado  = posts.filter(p => p.estado === 'rechazado').length;
      stats.espera     = posts.filter(p => p.estado === 'lista_espera').length;
    }

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">📊 Dashboard — Bienestar Universitario</h2>
          <p class="view-subtitle">Resumen del proceso de admisión al comedor universitario · Semestre ${INSTITUCION.periodo}</p>
        </div>
        <button class="btn btn-primary" onclick="navigateTo('dbu-evaluar')">
          ⚖️ Evaluar Expedientes
        </button>
      </div>

      ${this._tabsHTML('dbu-dashboard')}

      <!-- Métricas principales -->
      <div class="stats-grid mt-4" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));">
        <div class="stat-card">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Postulantes</div>
          <div class="stat-icon">📋</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--amber)">
          <div class="stat-value">${stats.pendiente}</div>
          <div class="stat-label">Pendientes</div>
          <div class="stat-icon">⏰</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--sky)">
          <div class="stat-value">${stats.evaluacion}</div>
          <div class="stat-label">En Evaluación</div>
          <div class="stat-icon">🔍</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--emerald)">
          <div class="stat-value">${stats.aprobado}</div>
          <div class="stat-label">Aprobados</div>
          <div class="stat-icon">✅</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--rose)">
          <div class="stat-value">${stats.rechazado}</div>
          <div class="stat-label">Rechazados</div>
          <div class="stat-icon">❌</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--violet)">
          <div class="stat-value">${stats.espera}</div>
          <div class="stat-label">Lista de Espera</div>
          <div class="stat-icon">⏳</div>
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div class="grid-2 mt-4">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚡ Acciones Rápidas</h3>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:0.75rem;">
            <button class="btn btn-primary w-full" onclick="navigateTo('dbu-evaluar')">
              ⚖️ Evaluar expedientes pendientes (${stats.pendiente + stats.evaluacion})
            </button>
            <button class="btn btn-secondary-light w-full" onclick="navigateTo('dbu-lista-espera')">
              ⏳ Gestionar lista de espera (${stats.espera})
            </button>
            <button class="btn btn-ghost w-full" onclick="navigateTo('dbu-reportes')">
              📈 Generar reporte de admisión
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📌 Información del Período</h3>
          </div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.875rem;">
              <div style="display:flex;justify-content:space-between;">
                <span style="color:var(--text-muted)">Institución</span>
                <strong>${INSTITUCION.nombre}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span style="color:var(--text-muted)">Filial</span>
                <strong>${INSTITUCION.filial}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span style="color:var(--text-muted)">Período</span>
                <strong>${INSTITUCION.periodo}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span style="color:var(--text-muted)">Capacidad comedor</span>
                <strong>${REGLAS.capacidad_comedor} cupos</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span style="color:var(--text-muted)">Cupos disponibles</span>
                <strong style="color:var(--emerald)">${Math.max(0, REGLAS.capacidad_comedor - stats.aprobado)} cupos</strong>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     2. Postulantes — Lista completa con documentos
  ────────────────────────────────────────────────────────── */
  async renderPostulantes(container) {
    let postulantes = [];

    if (USE_SUPABASE && _supabaseClient) {
      try {
        const { data } = await _supabaseClient
          .from('postulacion')
          .select(`
            id_postulacion, fecha_postulacion, observacion,
            documentos_completos, entrevista_realizada,
            id_estado_postulacion,
            url_fut, url_ficha_socioeconomica, url_constancia_matricula,
            estado_postulacion(nombre_estado),
            estudiante(
              id_estudiante, codigo_universitario, dni,
              nombres, apellidos, correo, ciclo,
              escuela_profesional(nombre_escuela)
            )
          `)
          .order('fecha_postulacion', { ascending: false });

        if (data) postulantes = data;
      } catch (e) {
        console.warn('[DBU Postulantes]', e);
        postulantes = DB.get('postulantes') || [];
      }
    } else {
      postulantes = DB.get('postulantes') || [];
    }

    const ESTADO_BADGES = {
      1: '<span class="badge badge-warning">Pendiente</span>',
      2: '<span class="badge badge-info">En Evaluación</span>',
      3: '<span class="badge badge-success">Aprobado</span>',
      4: '<span class="badge badge-danger">Rechazado</span>',
      5: '<span class="badge badge-purple">Lista de Espera</span>',
    };

    const filas = postulantes.map(p => {
      const est   = p.estudiante || p;
      const nombre = est ? `${est.nombres || ''} ${est.apellidos || ''}`.trim() : (p.nombre || '—');
      const dni    = est?.dni || p.dni || '—';
      const carrera = est?.escuela_profesional?.nombre_escuela || p.carrera || '—';
      const fecha  = p.fecha_postulacion || p.fecha || '—';
      const estadoId = p.id_estado_postulacion || 1;
      const estadoBadge = ESTADO_BADGES[estadoId] || '<span class="badge">—</span>';
      const postId = p.id_postulacion || p.id;

      const docsHTML = [
        p.url_fut ? `<a href="${p.url_fut}" target="_blank" class="btn btn-sm btn-ghost" title="Ver FUT">📄 FUT</a>` : '<span class="text-muted text-sm">Sin FUT</span>',
        p.url_ficha_socioeconomica ? `<a href="${p.url_ficha_socioeconomica}" target="_blank" class="btn btn-sm btn-ghost" title="Ver Ficha">📊 Ficha</a>` : '',
        p.url_constancia_matricula ? `<a href="${p.url_constancia_matricula}" target="_blank" class="btn btn-sm btn-ghost" title="Ver Constancia">🎓 Constancia</a>` : '',
      ].join(' ');

      const acciones = (estadoId === 1 || estadoId === 2) ? `
        <button class="btn btn-sm btn-primary" onclick="DBUViews.abrirModalEvaluacion(${postId}, '${nombre.replace(/'/g, "\\'")}', ${estadoId})" title="Evaluar postulación">⚖️ Evaluar</button>
      ` : `<span class="text-muted text-sm">Ya evaluado</span>`;

      return `
        <tr>
          <td><strong>${nombre}</strong><br><span class="text-muted text-sm">${dni}</span></td>
          <td class="text-sm">${carrera}</td>
          <td class="text-sm">${fecha}</td>
          <td>${estadoBadge}</td>
          <td><div style="display:flex;gap:0.35rem;flex-wrap:wrap;">${docsHTML}</div></td>
          <td>${acciones}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">📋 Postulantes — ${postulantes.length} expedientes</h2>
          <p class="view-subtitle">Revisión de solicitudes de beca alimentaria recibidas</p>
        </div>
      </div>

      ${this._tabsHTML('dbu-postulantes')}

      <div class="card mt-4">
        <div class="card-header">
          <h3 class="card-title">Expedientes Recibidos</h3>
          <input type="text" id="dbu-search" class="form-control" style="width:260px"
                 placeholder="🔍 Buscar por nombre o DNI..."
                 oninput="DBUViews.filtrarTabla(this.value)">
        </div>
        <div class="table-wrapper">
          <table class="data-table" id="dbu-table-postulantes">
            <thead>
              <tr>
                <th>Nombre / DNI</th>
                <th>Carrera</th>
                <th>Fecha Postulación</th>
                <th>Estado</th>
                <th>Documentos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="dbu-tbody">
              ${filas || '<tr><td colspan="6" class="text-center text-muted py-4">No hay postulaciones registradas.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Evaluación (se controla con abrirModalEvaluacion) -->
      <div id="modal-dbu-eval" style="display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.7);align-items:center;justify-content:center;">
        <div style="background:var(--surface);border-radius:var(--radius-lg);padding:2rem;max-width:520px;width:90%;box-shadow:var(--shadow-xl);position:relative;">
          <button onclick="document.getElementById('modal-dbu-eval').style.display='none'" 
                  style="position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-muted)">✕</button>
          <h3 style="margin:0 0 0.25rem;">⚖️ Evaluar Postulación</h3>
          <p id="modal-dbu-nombre" style="font-weight:600;margin-bottom:1.25rem;color:var(--text-secondary)"></p>
          
          <div class="form-group">
            <label class="form-label">Decisión de Admisión *</label>
            <select id="modal-dbu-decision" class="form-control">
              <option value="3">✅ Aprobado — Admitir como Beneficiario</option>
              <option value="5">⏳ Lista de Espera — Admisión pendiente de vacante</option>
              <option value="4">❌ Rechazado — No cumple los requisitos</option>
              <option value="2">🔍 Marcar como En Evaluación</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Comentario de Admisión * <span style="color:var(--text-muted);font-size:0.78rem">(obligatorio · visible para el postulante)</span></label>
            <textarea id="modal-dbu-comentario" class="form-control" rows="4"
                      placeholder="Ej: Tu expediente fue evaluado satisfactoriamente. El puntaje socioeconómico obtenido cumple los criterios establecidos para el semestre 2026-I..."></textarea>
          </div>
          <input type="hidden" id="modal-dbu-id-postulacion">
          <div style="display:flex;gap:0.75rem;margin-top:1.25rem;">
            <button class="btn btn-primary flex-1" onclick="DBUViews.submitEvaluacion()">
              💾 Guardar Evaluación
            </button>
            <button class="btn btn-ghost" onclick="document.getElementById('modal-dbu-eval').style.display='none'">
              Cancelar
            </button>
          </div>
        </div>
      </div>`;
  },

  /** Filtra la tabla de postulantes */
  filtrarTabla(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#dbu-tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  /** Abre el modal de evaluación para un postulante */
  abrirModalEvaluacion(idPostulacion, nombre, estadoActual) {
    $('modal-dbu-id-postulacion').value = idPostulacion;
    $('modal-dbu-nombre').textContent   = nombre;
    $('modal-dbu-decision').value       = estadoActual === 1 ? '3' : String(estadoActual);
    $('modal-dbu-comentario').value     = '';
    $('modal-dbu-eval').style.display   = 'flex';
  },

  /** Envía la evaluación al servidor */
  async submitEvaluacion() {
    const idPostulacion = parseInt($('modal-dbu-id-postulacion').value);
    const idEstado      = parseInt($('modal-dbu-decision').value);
    const comentario    = $('modal-dbu-comentario').value.trim();

    if (!comentario) {
      showToast('warning', 'Comentario requerido', 'Debes ingresar un comentario explicando la decisión tomada.');
      return;
    }

    showToast('info', 'Guardando evaluación...', 'Procesando en el servidor.');

    try {
      let result;
      if (USE_SUPABASE && _supabaseClient) {
        const { data, error } = await _supabaseClient.rpc('fn_evaluar_postulante', {
          p_id_postulacion:        idPostulacion,
          p_id_estado_postulacion: idEstado,
          p_observacion:           comentario,
        });
        if (error) throw error;
        result = data;
      } else {
        // Modo offline
        const posts = DB.get('postulantes') || [];
        const idx   = posts.findIndex(p => p.id === String(idPostulacion) || p.id_postulacion === idPostulacion);
        if (idx > -1) {
          const estadoMap = { 2: 'en_evaluacion', 3: 'aprobado', 4: 'rechazado', 5: 'lista_espera' };
          posts[idx].estado       = estadoMap[idEstado] || 'pendiente';
          posts[idx].observacion  = comentario;
          DB._save();
        }
        result = { ok: true };
      }

      if (result?.ok === false) {
        showToast('error', 'Error al evaluar', result.error || 'Revisa los datos e intenta nuevamente.');
        return;
      }

      $('modal-dbu-eval').style.display = 'none';

      const LABELS = { 2: 'marcado como En Evaluación', 3: 'APROBADO ✅', 4: 'RECHAZADO ❌', 5: 'agregado a Lista de Espera ⏳' };
      showToast('success', 'Evaluación guardada', `Postulante ${LABELS[idEstado] || 'actualizado'}.`);

      // Recargar la vista
      await navigateTo('dbu-evaluar');

    } catch (err) {
      showToast('error', 'Error del servidor', err.message);
    }
  },

  /* ──────────────────────────────────────────────────────────
     3. Evaluar — Filtrado: solo pendientes y en evaluación
  ────────────────────────────────────────────────────────── */
  async renderEvaluar(container) {
    let postulantes = [];

    if (USE_SUPABASE && _supabaseClient) {
      try {
        const { data } = await _supabaseClient
          .from('postulacion')
          .select(`
            id_postulacion, fecha_postulacion, observacion,
            documentos_completos, entrevista_realizada,
            id_estado_postulacion,
            url_fut, url_ficha_socioeconomica, url_constancia_matricula,
            estado_postulacion(nombre_estado),
            estudiante(id_estudiante, codigo_universitario, dni, nombres, apellidos, ciclo, escuela_profesional(nombre_escuela))
          `)
          .in('id_estado_postulacion', [1, 2])
          .order('fecha_postulacion', { ascending: true });

        if (data) postulantes = data;
      } catch (e) {
        console.warn('[DBU Evaluar]', e);
        postulantes = (DB.get('postulantes') || []).filter(p => ['pendiente','en_evaluacion'].includes(p.estado));
      }
    } else {
      postulantes = (DB.get('postulantes') || []).filter(p => ['pendiente','en_evaluacion'].includes(p.estado));
    }

    const ESTADO_BADGES = {
      1: '<span class="badge badge-warning">Pendiente</span>',
      2: '<span class="badge badge-info">En Evaluación</span>',
    };

    const cards = postulantes.map(p => {
      const est   = p.estudiante || p;
      const nombre = est ? `${est.nombres || ''} ${est.apellidos || ''}`.trim() : (p.nombre || '—');
      const dni    = est?.dni || p.dni || '—';
      const carrera = est?.escuela_profesional?.nombre_escuela || p.carrera || '—';
      const fecha   = p.fecha_postulacion || p.fecha || '—';
      const estadoId = p.id_estado_postulacion || 1;
      const postId   = p.id_postulacion || p.id;
      const docsOK  = p.documentos_completos;

      return `
        <div class="card" style="border-left:4px solid ${estadoId === 1 ? 'var(--amber)' : 'var(--sky)'}">
          <div class="card-header">
            <div>
              <h4 style="margin:0;font-size:1rem;">${nombre}</h4>
              <span style="font-size:0.78rem;color:var(--text-muted)">DNI: ${dni} · ${carrera}</span>
            </div>
            ${ESTADO_BADGES[estadoId] || ''}
          </div>
          <div class="card-body" style="padding-top:0.75rem;">
            <div style="display:flex;gap:1.5rem;font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem;">
              <span>📅 ${fecha}</span>
              <span>${docsOK ? '✅ Docs completos' : '⚠️ Docs incompletos'}</span>
              <span>🎓 Ciclo ${est?.ciclo || '—'}</span>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
              ${p.url_fut ? `<a href="${p.url_fut}" target="_blank" class="btn btn-sm btn-ghost">📄 Ver FUT</a>` : '<span class="badge badge-danger text-sm">Sin FUT</span>'}
              ${p.url_ficha_socioeconomica ? `<a href="${p.url_ficha_socioeconomica}" target="_blank" class="btn btn-sm btn-ghost">📊 Ficha Socioeconómica</a>` : '<span class="badge badge-warning text-sm">Sin Ficha</span>'}
              ${p.url_constancia_matricula ? `<a href="${p.url_constancia_matricula}" target="_blank" class="btn btn-sm btn-ghost">🎓 Constancia Matrícula</a>` : '<span class="badge badge-warning text-sm">Sin Constancia</span>'}
            </div>
            <button class="btn btn-primary w-full" 
                    onclick="DBUViews.abrirModalEvaluacion(${postId}, '${nombre.replace(/'/g, "\\'")}', ${estadoId})">
              ⚖️ Registrar Decisión de Admisión
            </button>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">⚖️ Evaluar Expedientes (${postulantes.length} pendientes)</h2>
          <p class="view-subtitle">Revisa cada expediente y registra la decisión de admisión con un comentario</p>
        </div>
      </div>

      ${this._tabsHTML('dbu-evaluar')}

      ${postulantes.length === 0
        ? `<div class="empty-state mt-4"><div class="empty-state-icon">✅</div><h4>Sin expedientes pendientes</h4><p>Todos los postulantes han sido evaluados.</p></div>`
        : `<div class="grid-2 mt-4">${cards}</div>`
      }

      <!-- Modal de Evaluación -->
      <div id="modal-dbu-eval" style="display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.7);align-items:center;justify-content:center;">
        <div style="background:var(--surface);border-radius:var(--radius-lg);padding:2rem;max-width:520px;width:90%;box-shadow:var(--shadow-xl);position:relative;">
          <button onclick="document.getElementById('modal-dbu-eval').style.display='none'"
                  style="position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-muted)">✕</button>
          <h3 style="margin:0 0 0.25rem;">⚖️ Evaluar Postulación</h3>
          <p id="modal-dbu-nombre" style="font-weight:600;margin-bottom:1.25rem;color:var(--text-secondary)"></p>

          <div class="form-group">
            <label class="form-label">Decisión de Admisión *</label>
            <select id="modal-dbu-decision" class="form-control">
              <option value="3">✅ Aprobado — Admitir como Beneficiario</option>
              <option value="5">⏳ Lista de Espera — Admisión pendiente de vacante</option>
              <option value="4">❌ Rechazado — No cumple los requisitos</option>
              <option value="2">🔍 Marcar como En Evaluación</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Comentario de Admisión * <span style="color:var(--text-muted);font-size:0.78rem">(obligatorio · visible para el postulante)</span></label>
            <textarea id="modal-dbu-comentario" class="form-control" rows="4"
                      placeholder="Ej: Tu expediente fue evaluado satisfactoriamente..."></textarea>
          </div>
          <input type="hidden" id="modal-dbu-id-postulacion">
          <div style="display:flex;gap:0.75rem;margin-top:1.25rem;">
            <button class="btn btn-primary flex-1" onclick="DBUViews.submitEvaluacion()">
              💾 Guardar Evaluación
            </button>
            <button class="btn btn-ghost" onclick="document.getElementById('modal-dbu-eval').style.display='none'">
              Cancelar
            </button>
          </div>
        </div>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     4. Lista de Espera
  ────────────────────────────────────────────────────────── */
  async renderListaEspera(container) {
    let enEspera = [];

    if (USE_SUPABASE && _supabaseClient) {
      try {
        const { data } = await _supabaseClient
          .from('postulacion')
          .select(`
            id_postulacion, fecha_postulacion,
            estudiante(nombres, apellidos, dni, ciclo, escuela_profesional(nombre_escuela, id_escuela))
          `)
          .eq('id_estado_postulacion', 5)
          .order('fecha_postulacion', { ascending: true });
        if (data) enEspera = data;
      } catch (e) {
        console.warn('[DBU Lista Espera]', e);
      }
    }

    const filas = enEspera.map((p, i) => {
      const est   = p.estudiante || {};
      const nombre = `${est.nombres || ''} ${est.apellidos || ''}`.trim() || '—';
      const carrera = est.escuela_profesional?.nombre_escuela || '—';
      return `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td><strong>${nombre}</strong></td>
          <td>${est.dni || '—'}</td>
          <td class="text-sm">${carrera}</td>
          <td class="text-sm">${p.fecha_postulacion || '—'}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="DBUViews.promoverLista(${p.id_postulacion}, '${nombre.replace(/'/g, "\\'")}', ${est.escuela_profesional?.id_escuela || 0})">
              ⬆ Promover
            </button>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">⏳ Lista de Espera</h2>
          <p class="view-subtitle">Candidatos aprobados en espera de vacante disponible</p>
        </div>
        <button class="btn btn-primary" onclick="DBUViews.promoverAutoLista()">
          ⬆ Promover Siguiente Automáticamente
        </button>
      </div>

      ${this._tabsHTML('dbu-lista-espera')}

      <div class="card mt-4">
        <div class="card-header">
          <h3 class="card-title">Candidatos en Cola (${enEspera.length})</h3>
          <span class="text-muted text-sm">Orden: por fecha de postulación más antigua</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:48px">#</th>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Carrera</th>
                <th>Fecha Postulación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filas || '<tr><td colspan="6" class="text-center text-muted py-4">No hay candidatos en lista de espera.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  /** Promueve manualmente un candidato específico */
  async promoverLista(idPostulacion, nombre, idEscuela) {
    if (!confirm(`¿Promover a "${nombre}" de la lista de espera a Beneficiario?\n\nSe le asignará el rol de Beneficiario automáticamente.`)) return;

    showToast('info', 'Procesando...', 'Promoviendo candidato.');

    try {
      let ok = false;
      if (USE_SUPABASE && _supabaseClient) {
        const { data } = await _supabaseClient.rpc('fn_evaluar_postulante', {
          p_id_postulacion: idPostulacion,
          p_id_estado_postulacion: 3,
          p_observacion: 'Promovido desde lista de espera por vacante disponible.',
        });
        ok = data?.ok;
      } else {
        ok = true;
      }
      if (ok) {
        showToast('success', '¡Candidato promovido!', `${nombre} ahora es Beneficiario.`);
        await navigateTo('dbu-lista-espera');
      } else {
        showToast('error', 'Error', 'No se pudo promover el candidato.');
      }
    } catch (e) {
      showToast('error', 'Error del servidor', e.message);
    }
  },

  /** Promueve automáticamente al siguiente en la lista */
  async promoverAutoLista() {
    showToast('info', 'Procesando...', 'Promoviendo el siguiente candidato en la cola.');
    try {
      if (USE_SUPABASE && _supabaseClient) {
        const { data } = await _supabaseClient.rpc('fn_promover_lista_espera', { p_id_escuela_saliente: 0 });
        if (data?.ok) {
          showToast('success', 'Candidato promovido', 'El siguiente de la lista ya es Beneficiario.');
          await navigateTo('dbu-lista-espera');
        } else {
          showToast('warning', 'Sin candidatos', data?.error || 'No hay candidatos en lista de espera.');
        }
      } else {
        showToast('info', 'Modo offline', 'Esta acción requiere conexión con Supabase.');
      }
    } catch (e) {
      showToast('error', 'Error', e.message);
    }
  },

  /* ──────────────────────────────────────────────────────────
     5. Beneficiarios activos (solo lectura para DBU)
  ────────────────────────────────────────────────────────── */
  async renderBeneficiarios(container) {
    const { data: bens } = await BeneficiariosService.getAll();
    const activos = (bens || []).filter(b => b.estado === 'activo' || b.activo);

    const filas = activos.map(b => {
      const usr = b.usuario || {};
      return `
        <tr>
          <td><strong>${usr.nombre || '—'}</strong></td>
          <td>${usr.dni || '—'}</td>
          <td class="text-sm">${usr.carrera || '—'}</td>
          <td>${b.fecha_inicio || '—'}</td>
          <td><span class="badge badge-success">Activo</span></td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">👥 Beneficiarios Activos (${activos.length})</h2>
          <p class="view-subtitle">Lista de estudiantes con beca alimentaria vigente — solo lectura</p>
        </div>
        <button class="btn btn-ghost" onclick="simulateDownload('beneficiarios_dbu.xlsx')">📥 Exportar</button>
      </div>

      ${this._tabsHTML('dbu-beneficiarios')}

      <div class="alert alert-info mt-3" style="margin-bottom:1rem;">
        <span class="alert-icon">ℹ️</span>
        <div class="alert-body"><strong>Solo lectura:</strong> La DBU puede consultar el padrón. Para suspender o modificar, contacta con el Administrador del sistema.</div>
      </div>

      <div class="card mt-2">
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Nombre</th><th>DNI</th><th>Carrera</th><th>Desde</th><th>Estado</th></tr></thead>
            <tbody>${filas || '<tr><td colspan="5" class="text-center text-muted py-4">No hay beneficiarios activos.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     6. Reportes — Estadísticas del proceso de admisión
  ────────────────────────────────────────────────────────── */
  async renderReportes(container) {
    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">📈 Reportes de Admisión</h2>
          <p class="view-subtitle">Estadísticas e informes del proceso de selección de becas</p>
        </div>
      </div>

      ${this._tabsHTML('dbu-reportes')}

      <div class="grid-2 mt-4">
        <div class="card">
          <div class="card-header"><h3 class="card-title">📄 Exportar Informes</h3></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:0.75rem;">
            <button class="btn btn-primary w-full" onclick="simulateDownload('reporte_postulaciones.pdf')">
              📕 Reporte de Postulaciones (PDF)
            </button>
            <button class="btn btn-primary w-full" onclick="simulateDownload('reporte_admision.xlsx')">
              📗 Estadísticas de Admisión (Excel)
            </button>
            <button class="btn btn-ghost w-full" onclick="simulateDownload('padron_beneficiarios.pdf')">
              📋 Padrón de Beneficiarios Aprobados
            </button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">ℹ️ Información del Proceso</h3></div>
          <div class="card-body" style="font-size:0.875rem;color:var(--text-secondary);line-height:1.7;">
            <p>📌 Los reportes incluyen todas las postulaciones del período <strong>${INSTITUCION.periodo}</strong>.</p>
            <p>📌 Los datos se extraen en tiempo real desde Supabase.</p>
            <p>📌 Solo la DBU tiene acceso a los reportes de admisión.</p>
          </div>
        </div>
      </div>`;
  },

};
