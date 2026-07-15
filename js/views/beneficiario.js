/* ============================================================
   views/beneficiario.js — Portal del Beneficiario
   ============================================================
   Contiene todas las vistas del portal estudiantil.
   Cada método recibe `container` (HTMLElement) e inyecta HTML.

   Vistas:
   - renderInicio         → Inicio / resumen
   - renderMiBeneficio    → Detalle del beneficio y QR
   - renderMisAsistencias → Historial con calendario
   - renderPostulacion    → Formulario de postulación
   - renderJustificacion  → FUT — Formulario de justificación
   - renderNotificaciones → Bandeja de notificaciones
   ============================================================ */

const BeneficiarioViews = {

  // ─── Inicio ─────────────────────────────────────────────────
  renderInicio(container) {
    const fd   = getUserFullData('USR001');
    const user = fd.user;
    const ben  = fd.beneficiario;
    const asis = fd.asistencias;
    const aus  = fd.ausencias;
    const notif = fd.notificaciones.filter(n => !n.leido);

    const mesAsis  = asis.filter(a => a.fecha.startsWith('2026-07')).length;
    const mesAus   = aus.filter(a => a.fecha.startsWith('2026-07') && !a.justificado).length;
    const tasa     = mesAsis + mesAus > 0 ? Math.round((mesAsis / (mesAsis + mesAus)) * 100) : 100;
    const consec   = ben?.ausencias_consecutivas ?? 0;

    // Timeline: mezcla asistencias y ausencias, ordena por fecha desc
    const timeline = [
      ...asis.slice(-6).map(a => ({ tipo: 'asistencia', fecha: a.fecha, hora: a.hora, metodo: a.metodo })),
      ...aus.slice(-3).map(a => ({ tipo: a.justificado ? 'justificada' : 'ausencia', fecha: a.fecha })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6);

    const alertaBen = ben?.estado === 'suspendido'
      ? `<div class="alert alert-danger"><span class="alert-icon">⊘</span><div class="alert-body"><strong>Beneficio suspendido</strong>${ben.suspension_razon || 'Supera límite de ausencias.'}</div></div>`
      : '';
    const alertaNotif = notif.length > 0
      ? `<div class="alert alert-info"><span class="alert-icon">🔔</span><div class="alert-body"><strong>Tienes ${notif.length} notificación(es) sin leer</strong></div></div>`
      : '';

    container.innerHTML = `
      <div class="page-view">
        <div class="page-header">
          <h1>👋 Hola, ${user.nombre.split(' ')[0]}!</h1>
          <p>${getTodayDisplay()}</p>
        </div>
        ${alertaBen}${alertaNotif}

        <!-- Stats -->
        <div class="stats-grid" style="margin-bottom:1.5rem">
          <div class="stat-card green"><div class="stat-icon green">✅</div><div class="stat-body"><div class="stat-label">Asistencias en Julio</div><div class="stat-value">${mesAsis}</div></div></div>
          <div class="stat-card amber"><div class="stat-icon amber">📅</div><div class="stat-body"><div class="stat-label">Ausencias del Mes</div><div class="stat-value">${mesAus}</div></div></div>
          <div class="stat-card blue"><div class="stat-icon blue">📊</div><div class="stat-body"><div class="stat-label">Tasa de Asistencia</div><div class="stat-value">${tasa}%</div></div></div>
          <div class="stat-card ${consec >= 3 ? 'rose' : consec >= 2 ? 'amber' : 'green'}"><div class="stat-icon ${consec >= 3 ? 'rose' : consec >= 2 ? 'amber' : 'green'}">⚡</div><div class="stat-body"><div class="stat-label">Ausencias Consecutivas</div><div class="stat-value">${consec}/3</div></div></div>
        </div>

        <!-- Grid: Beneficio + Calendario -->
        <div class="grid-2" style="margin-bottom:1.5rem">
          <div class="card">
            <div class="card-title">🎓 Mi Beneficio</div>
            <div style="display:flex;gap:1.25rem;align-items:flex-start">
              <div class="qr-display" style="width:100px;height:100px;flex-shrink:0">${generateQRSvg(ben?.qr_code || 'QR-DEMO', 92)}</div>
              <div style="flex:1">
                ${[
                  ['Estado', statusBadge(ben?.estado || 'activo')],
                  ['Carrera', user.carrera],
                  ['Ciclo', `${user.ciclo}°`],
                  ['Turno', 'Almuerzo 12:00–14:00'],
                  ['Vigencia', `${fmt(ben?.fecha_inicio)} — ${fmt(ben?.fecha_fin)}`],
                ].map(([l,v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join('')}
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">📅 Calendario — Julio 2026</div>
            <div id="mini-cal"></div>
            <div class="cal-legend" style="margin-top:0.75rem">
              <div class="cal-legend-item"><div class="cal-legend-dot attended"></div>Asistencia</div>
              <div class="cal-legend-item"><div class="cal-legend-dot absent"></div>Ausencia</div>
              <div class="cal-legend-item"><div class="cal-legend-dot justified"></div>Justificada</div>
            </div>
          </div>
        </div>

        <!-- Timeline de actividad -->
        <div class="card">
          <div class="card-title">⚡ Actividad Reciente</div>
          <div class="timeline">
            ${timeline.map((ev, i) => {
              const isLast = i === timeline.length - 1;
              let dot = 'success', icon = '✅', label = `Asistencia registrada — ${ev.metodo?.toUpperCase() || ''}`;
              if (ev.tipo === 'ausencia')    { dot = 'danger';  icon = '❌'; label = 'Ausencia no justificada'; }
              if (ev.tipo === 'justificada') { dot = 'warning'; icon = '⚠️'; label = 'Ausencia justificada'; }
              return `
                <div class="timeline-item">
                  <div class="timeline-line">
                    <div class="timeline-dot ${dot}"></div>
                    ${!isLast ? '<div class="timeline-connector"></div>' : ''}
                  </div>
                  <div class="timeline-body">
                    <div class="timeline-title">${icon} ${label}</div>
                    <div class="timeline-sub">${fmt(ev.fecha)} ${ev.hora ? '· ' + ev.hora : ''}</div>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;

    CalendarComponent.render('mini-cal', 7, 2026, asis, aus, false);
  },

  // ─── Mi Beneficio ────────────────────────────────────────────
  renderMiBeneficio(container) {
    const fd   = getUserFullData('USR001');
    const user = fd.user;
    const ben  = fd.beneficiario;
    const consec = ben?.ausencias_consecutivas ?? 0;
    const mesMes = ben?.ausencias_mes ?? 0;
    const consecPct = Math.min(100, Math.round((consec / 3) * 100));
    const mesPct    = Math.min(100, Math.round((mesMes / 5) * 100));
    const consecColor = consec >= 3 ? 'rose' : consec >= 2 ? 'amber' : 'green';
    const mesColor    = mesMes >= 5 ? 'rose' : mesMes >= 3 ? 'amber' : 'green';

    container.innerHTML = `
      <div class="page-view">
        <!-- Cabecera con avatar y QR -->
        <div class="card" style="margin-bottom:1.5rem">
          <div style="display:flex;align-items:flex-start;gap:1.5rem;flex-wrap:wrap">
            <div class="avatar xl">${user.avatar}</div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.5rem">
                <h2 style="font-family:var(--font-display);font-size:1.4rem;font-weight:800">${user.nombre}</h2>
                ${statusBadge(ben?.estado || 'activo')}
              </div>
              <div style="color:var(--text-muted);font-size:0.85rem">DNI: <strong style="color:var(--text-secondary)">${user.dni}</strong> &nbsp;·&nbsp; Código: <strong style="color:var(--text-secondary)">${user.codigo}</strong></div>
            </div>
            <div style="text-align:center">
              <div class="qr-display">${generateQRSvg(ben?.qr_code || 'QR-DEMO', 120)}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.4rem;font-family:monospace">${ben?.qr_code || 'QR-2026-001'}</div>
            </div>
          </div>
        </div>

        <!-- Datos académicos + beneficio -->
        <div class="grid-2" style="margin-bottom:1.5rem">
          <div class="card">
            <div class="card-title">📚 Datos Académicos</div>
            ${[
              ['Carrera',   user.carrera],
              ['Ciclo',     `${user.ciclo}° Ciclo`],
              ['Código',    user.codigo],
              ['Email',     user.email],
              ['DNI',       user.dni],
            ].map(([l,v])=>`<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join('')}
          </div>
          <div class="card">
            <div class="card-title">🍽️ Datos del Beneficio</div>
            ${[
              ['Período',   '2026-I'],
              ['Turno',     'Almuerzo (12:00–14:00)'],
              ['Inicio',    fmt(ben?.fecha_inicio)],
              ['Fin',       fmt(ben?.fecha_fin)],
              ['Score SE',  `${ben?.score_socioeconomico ?? '—'}/100`],
              ['Estado',    statusBadge(ben?.estado || 'activo')],
            ].map(([l,v])=>`<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join('')}
          </div>
        </div>

        <!-- Indicadores de ausencias -->
        <div class="grid-2" style="margin-bottom:1.5rem">
          <div class="card">
            <div class="card-title" style="margin-bottom:0.75rem">⚡ Ausencias Consecutivas</div>
            <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-muted);margin-bottom:0.5rem">
              <span>Límite: 3 días</span><span style="font-weight:700;color:var(--text-primary)">${consec} / 3</span>
            </div>
            <div class="progress-bar"><div class="progress-fill ${consecColor}" style="width:${consecPct}%"></div></div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem">Al superar 3 el beneficio se suspende automáticamente.</div>
          </div>
          <div class="card">
            <div class="card-title" style="margin-bottom:0.75rem">📅 Ausencias del Mes</div>
            <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-muted);margin-bottom:0.5rem">
              <span>Límite: 5 días</span><span style="font-weight:700;color:var(--text-primary)">${mesMes} / 5</span>
            </div>
            <div class="progress-bar"><div class="progress-fill ${mesColor}" style="width:${mesPct}%"></div></div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem">Ausencias acumuladas en el mes en curso.</div>
          </div>
        </div>

        <!-- Reglamento + Constancia -->
        <div class="grid-2">
          <div class="card">
            <div class="card-title">📋 Reglamento del Comedor</div>
            ${['Presentar QR o DNI al ingresar al comedor.',
               'El beneficio es personal e intransferible.',
               'Justificar ausencias en un plazo máximo de 48 horas.',
               'Respetar los horarios establecidos por turno.',
               '3 ausencias consecutivas generan suspensión automática.']
              .map(r=>`<div style="display:flex;gap:0.6rem;padding:0.4rem 0;font-size:0.83rem;color:var(--text-secondary);border-bottom:1px solid rgba(255,255,255,0.04)"><span style="color:var(--gold-400);flex-shrink:0">›</span>${r}</div>`).join('')}
          </div>
          <div class="card" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:1rem">
            <div style="font-size:3rem">📄</div>
            <div>
              <div style="font-family:var(--font-display);font-weight:700;margin-bottom:0.35rem">Constancia de Beneficiario</div>
              <div style="font-size:0.82rem;color:var(--text-muted)">Descarga tu constancia oficial del beneficio del comedor universitario.</div>
            </div>
            <button class="btn btn-primary" onclick="simulateDownload('Constancia_Beneficiario_${user.dni}','PDF')">📥 Descargar Constancia PDF</button>
          </div>
        </div>
      </div>`;
  },

  // ─── Mis Asistencias ─────────────────────────────────────────
  renderMisAsistencias(container) {
    const fd   = getUserFullData('USR001');
    const asis = fd.asistencias;
    const aus  = fd.ausencias;

    const mesAsis = asis.filter(a => a.fecha.startsWith('2026-07')).length;
    const sinJus  = aus.filter(a => !a.justificado).length;
    const justif  = aus.filter(a => a.justificado).length;
    const total   = mesAsis + aus.length;
    const pct     = total > 0 ? Math.round((mesAsis / total) * 100) : 100;

    // Lista combinada para el historial
    const historial = [
      ...asis.map(a => ({ tipo: 'asistencia', fecha: a.fecha, hora: a.hora, metodo: a.metodo })),
      ...aus.map(a => ({ tipo: a.justificado ? 'justificada' : 'ausencia', fecha: a.fecha })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));

    const metodoIcon = { qr: '📷 QR', barcode: '▦ Barras', dni: '🔢 DNI' };

    container.innerHTML = `
      <div class="page-view">
        <div class="page-header">
          <h1>Mis Asistencias</h1>
          <p>Historial completo de asistencias y ausencias</p>
        </div>

        <div class="stats-grid" style="margin-bottom:1.5rem">
          <div class="stat-card green"><div class="stat-icon green">✅</div><div class="stat-body"><div class="stat-label">Asistencias Julio</div><div class="stat-value">${mesAsis}</div></div></div>
          <div class="stat-card rose"><div class="stat-icon rose">❌</div><div class="stat-body"><div class="stat-label">Sin Justificar</div><div class="stat-value">${sinJus}</div></div></div>
          <div class="stat-card amber"><div class="stat-icon amber">📄</div><div class="stat-body"><div class="stat-label">Justificadas</div><div class="stat-value">${justif}</div></div></div>
          <div class="stat-card blue"><div class="stat-icon blue">📊</div><div class="stat-body"><div class="stat-label">% del Mes</div><div class="stat-value">${pct}%</div></div></div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title">📅 Calendario</div>
            <div id="cal-main"></div>
            <div class="cal-legend">
              <div class="cal-legend-item"><div class="cal-legend-dot attended"></div>Asistencia</div>
              <div class="cal-legend-item"><div class="cal-legend-dot absent"></div>Ausencia</div>
              <div class="cal-legend-item"><div class="cal-legend-dot justified"></div>Justificada</div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">📋 Historial</div>
            <div style="max-height:380px;overflow-y:auto;padding-right:0.25rem">
              ${historial.map(ev => {
                let icon='✅', cls='badge-success', label='Asistencia', sub=metodoIcon[ev.metodo]||'';
                if (ev.tipo==='ausencia')    { icon='❌'; cls='badge-danger';  label='Ausente'; sub='Sin justificar'; }
                if (ev.tipo==='justificada') { icon='⚠️'; cls='badge-warning'; label='Ausente'; sub='Justificada'; }
                return `
                  <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
                    <span style="font-size:1.2rem">${icon}</span>
                    <div style="flex:1">
                      <div style="font-size:0.83rem;font-weight:600;color:var(--text-primary)">${fmt(ev.fecha)}</div>
                      <div style="font-size:0.73rem;color:var(--text-muted)">${sub}</div>
                    </div>
                    <span class="badge ${cls}">${label}</span>
                  </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>`;

    CalendarComponent.render('cal-main', 7, 2026, asis, aus, true);
  },

  // ─── Postulación ─────────────────────────────────────────────
  renderPostulacion(container) {
    const fd   = getUserFullData('USR001');
    const user = fd.user;

    container.innerHTML = `
      <div class="page-view">
        <div class="page-header">
          <h1>Postulación al Comedor</h1>
          <p>Convocatoria Semestre 2026-II</p>
        </div>

        <div class="alert alert-info" style="margin-bottom:1.5rem">
          <span class="alert-icon">📢</span>
          <div class="alert-body"><strong>Convocatoria abierta — 2026-II</strong>
          Las postulaciones se reciben hasta el 31 de julio de 2026. Adjunta todos los documentos requeridos.</div>
        </div>

        <div class="grid-2" style="margin-bottom:1.5rem">
          <!-- Formulario -->
          <div class="card">
            <div class="card-title">📋 Formulario de Postulación</div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Apellidos y Nombres</label><input class="form-control" value="${user.nombre}" readonly></div>
              <div class="form-group"><label class="form-label">DNI</label><input class="form-control" value="${user.dni}" readonly></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Código de Estudiante</label><input class="form-control" value="${user.codigo}" readonly></div>
              <div class="form-group"><label class="form-label">Carrera</label><input class="form-control" value="${user.carrera}" readonly></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Ciclo</label><input class="form-control" value="${user.ciclo}°" readonly></div>
              <div class="form-group"><label class="form-label">Email</label><input class="form-control" value="${user.email}" readonly></div>
            </div>
            <div class="form-group">
              <label class="form-label">Motivo de Postulación <span style="color:var(--rose)">*</span></label>
              <textarea id="motivo-post" class="form-control" rows="4" placeholder="Describe brevemente tu situación socioeconómica y por qué necesitas el beneficio del comedor universitario (mínimo 20 caracteres)..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Turno Preferido</label>
              <select class="form-control">
                <option>Almuerzo (12:00 - 14:00)</option>
                <option>Desayuno (07:00 - 08:30)</option>
                <option>Cena (18:00 - 19:30)</option>
              </select>
            </div>
            <button class="btn btn-primary btn-block" onclick="window.submitPostulacion()">📤 Enviar Postulación</button>
          </div>

          <!-- Documentos requeridos -->
          <div class="card">
            <div class="card-title">📎 Documentos Requeridos</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">Sube cada documento en formato PDF o imagen (máx. 5 MB).</div>
            ${[
              ['doc-1', 'Partida de Nacimiento',      'partida_nac'],
              ['doc-2', 'Recibo de Servicio (Agua/Luz)', 'recibo_serv'],
              ['doc-3', 'Ficha Socioeconómica',        'ficha_socio'],
              ['doc-4', 'Declaración Jurada',          'decl_jurada'],
              ['doc-5', 'Constancia de Trabajo (Padres)', 'const_trab'],
            ].map(([id, label, name]) => `
              <div class="form-group">
                <label class="form-label">${label} <span style="color:var(--rose)">*</span></label>
                <div class="dropzone" onclick="this.querySelector('input').click()">
                  <input type="file" accept=".pdf,.jpg,.png" onchange="window.handleFileUpload(this,'${id}-text')">
                  <div class="dropzone-icon">📄</div>
                  <div class="dropzone-text" id="${id}-text">Haz clic para subir o arrastra aquí<br><span style="color:var(--text-muted);font-size:0.72rem">PDF, JPG, PNG — máx 5 MB</span></div>
                </div>
              </div>`).join('')}
            </div>
        </div>

        <!-- Criterios de evaluación -->
        <div class="card">
          <div class="card-title">📊 Criterios de Evaluación</div>
          <div class="grid-2">
            ${[
              ['Situación Socioeconómica', 40, 'gold'],
              ['Rendimiento Académico',    30, 'blue'],
              ['Distancia al Campus',      20, 'green'],
              ['Composición Familiar',     10, 'violet'],
            ].map(([label, pct, color]) => `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:0.4rem">
                  <span style="color:var(--text-secondary)">${label}</span>
                  <span style="font-weight:700;color:var(--text-primary)">${pct}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill ${color}" style="width:${pct}%"></div></div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;

    window.submitPostulacion = function() {
      const motivo = $('motivo-post')?.value.trim() || '';
      if (motivo.length < 20) { showToast('warning', 'Motivo requerido', 'El motivo debe tener al menos 20 caracteres.'); return; }
      showToast('success', '✅ Postulación enviada', 'Tu postulación fue registrada. Espera resolución de la Asistenta Social.');
    };

    window.handleFileUpload = function(input, textId) {
      const el = $(textId);
      if (el && input.files?.[0]) el.innerHTML = `<strong style="color:var(--gold-400)">✔ ${input.files[0].name}</strong>`;
    };
  },

  // ─── Justificación (FUT) ─────────────────────────────────────
  renderJustificacion(container) {
    const fd       = getUserFullData('USR001');
    const ben      = fd.beneficiario;
    const aus      = fd.ausencias.filter(a => !a.justificado);
    const jusList  = fd.justificaciones.sort((a,b) => b.fecha_solicitud.localeCompare(a.fecha_solicitud));

    container.innerHTML = `
      <div class="page-view">
        <div class="page-header"><h1>Justificación (FUT)</h1><p>Formulario Único de Trámite para ausencias</p></div>

        <div class="alert alert-warning" style="margin-bottom:1.5rem">
          <span class="alert-icon">⏰</span>
          <div class="alert-body"><strong>Plazo máximo: 48 horas</strong> — Debes presentar la justificación dentro de las 48 horas posteriores a la ausencia.</div>
        </div>

        <div class="grid-2">
          <!-- Formulario FUT -->
          <div class="card">
            <div class="card-title">📄 Nueva Justificación</div>
            ${aus.length === 0
              ? `<div class="empty-state"><div class="empty-state-icon">✅</div><h4>Sin ausencias pendientes</h4><p>No tienes ausencias sin justificar.</p></div>`
              : `
                <div class="form-group">
                  <label class="form-label">Fecha de Ausencia <span style="color:var(--rose)">*</span></label>
                  <select id="jus-fecha" class="form-control">
                    ${aus.map(a => `<option value="${a.id}">${fmt(a.fecha)}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo de Justificación</label>
                  <select id="jus-tipo" class="form-control">
                    <option>Cita Médica</option>
                    <option>Emergencia Familiar</option>
                    <option>Examen Académico</option>
                    <option>Comisión Universitaria</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Motivo Detallado <span style="color:var(--rose)">*</span></label>
                  <textarea id="jus-motivo" class="form-control" rows="4" placeholder="Describe el motivo de tu ausencia..."></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">Documento de Sustento</label>
                  <div class="dropzone" onclick="this.querySelector('input').click()">
                    <input type="file" accept=".pdf,.jpg,.png" onchange="window.handleJusFile(this)">
                    <div class="dropzone-icon">📎</div>
                    <div class="dropzone-text" id="jus-file-text">Sube el documento de sustento</div>
                  </div>
                </div>
                <button class="btn btn-primary btn-block" onclick="window.submitJustificacion()">📤 Enviar Justificación</button>`}
          </div>

          <!-- Historial de justificaciones -->
          <div class="card">
            <div class="card-title">📋 Mis Justificaciones</div>
            ${jusList.length === 0
              ? `<div class="empty-state"><div class="empty-state-icon">📄</div><h4>Sin justificaciones</h4></div>`
              : jusList.map(j => `
                  <div style="padding:0.85rem 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem">
                      <span style="font-weight:600;font-size:0.85rem">${fmt(j.fecha_ausencia)}</span>
                      ${statusBadge(j.estado)}
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted)">${j.motivo}</div>
                    ${j.observaciones ? `<div style="font-size:0.75rem;color:var(--sky);margin-top:0.25rem">💬 ${j.observaciones}</div>` : ''}
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem">Solicitado: ${fmt(j.fecha_solicitud)}</div>
                  </div>`).join('')}
          </div>
        </div>
      </div>`;

    window.submitJustificacion = async function() {
      const motivo = $('jus-motivo')?.value.trim() || '';
      if (!motivo) { showToast('warning', 'Motivo requerido', 'Describe el motivo de la ausencia.'); return; }
      const ausId = $('jus-fecha')?.value;
      if (!ausId) return;
      const aus = DB.getOne('ausencias', ausId);
      if (!aus) return;
      await JustificacionesService.create({ beneficiario_id: aus.beneficiario_id, fecha_ausencia: aus.fecha, motivo, documento: 'documento_adjunto.pdf', estado: 'pendiente', fecha_solicitud: getToday(), fecha_resolucion: null, aprobado_por: null, observaciones: '' });
      showToast('success', '✅ FUT enviado', 'Tu justificación fue registrada y está en revisión.');
      BeneficiarioViews.renderJustificacion(container);
    };

    window.handleJusFile = function(input) {
      const el = $('jus-file-text');
      if (el && input.files?.[0]) el.innerHTML = `<strong style="color:var(--gold-400)">✔ ${input.files[0].name}</strong>`;
    };
  },

  // ─── Notificaciones ──────────────────────────────────────────
  renderNotificaciones(container) {
    const { data: notifs } = NotificacionesService.getByUsuario
      ? { data: DB.get('notificaciones').filter(n => n.usuario_id === 'USR001').sort((a,b) => b.fecha.localeCompare(a.fecha)) }
      : { data: [] };

    const unreadCount = notifs.filter(n => !n.leido).length;

    const tipoConfig = {
      info:    { icon: 'ℹ️', bg: 'rgba(14,165,233,0.15)'  },
      warning: { icon: '⚠️', bg: 'rgba(245,158,11,0.15)' },
      success: { icon: '✅', bg: 'rgba(16,185,129,0.15)'  },
      danger:  { icon: '❗', bg: 'rgba(244,63,94,0.15)'   },
    };

    container.innerHTML = `
      <div class="page-view">
        <div class="page-header-row" style="margin-bottom:1.5rem">
          <div class="page-header" style="margin-bottom:0">
            <h1>Notificaciones</h1>
            <p>${unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}</p>
          </div>
          ${unreadCount > 0
            ? `<button class="btn btn-secondary" onclick="window.markAllRead()">✓ Marcar todas como leídas</button>`
            : ''}
        </div>

        <div class="card">
          ${notifs.length === 0
            ? `<div class="empty-state"><div class="empty-state-icon">🔔</div><h4>Sin notificaciones</h4></div>`
            : notifs.map(n => {
                const cfg = tipoConfig[n.tipo] || tipoConfig.info;
                return `
                  <div class="notif-item ${n.leido ? '' : 'unread'}" onclick="window.markRead('${n.id}')">
                    <div class="notif-icon-wrap" style="background:${cfg.bg}">${cfg.icon}</div>
                    <div class="notif-body">
                      <div class="notif-title" style="${n.leido ? '' : 'color:var(--text-primary)'}">${n.titulo}</div>
                      <div class="notif-msg">${n.mensaje}</div>
                      <div class="notif-date">${fmtRelative(n.fecha)}</div>
                    </div>
                    ${!n.leido ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--gold-500);flex-shrink:0;margin-top:0.3rem"></div>` : ''}
                  </div>`;
              }).join('')}
        </div>
      </div>`;

    window.markRead = async function(id) {
      await NotificacionesService.marcarLeido(id);
      BeneficiarioViews.renderNotificaciones(container);
    };

    window.markAllRead = async function() {
      await NotificacionesService.marcarTodasLeidas('USR001');
      showToast('success', 'Listo', 'Todas las notificaciones marcadas como leídas.');
      BeneficiarioViews.renderNotificaciones(container);
    };
  },
};
