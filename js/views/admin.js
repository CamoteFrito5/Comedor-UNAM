/* ============================================================
   views/admin.js — Portal del Administrador
   ============================================================
   Vistas:
   - renderUsuarios  → CRUD de usuarios del sistema
   - renderRoles     → Configuración de roles y permisos
   - renderPermisos  → Matriz de permisos por módulo
   - renderRespaldos → Gestión de backups
   - renderAuditoria → Log de actividades
   - renderConfig    → Parámetros del sistema + zona de peligro
   ============================================================ */

const AdminViews = {

  /* ──────────────────────────────────────────────────────────
     SHARED: Tabs de navegación de administración
  ────────────────────────────────────────────────────────── */
  _tabsHTML(active) {
    const tabs = [
      { key: 'usuarios',  label: '👥 Usuarios',  route: 'admin-usuarios' },
      { key: 'roles',     label: '🛡 Roles',      route: 'admin-roles' },
      { key: 'permisos',  label: '🔑 Permisos',   route: 'admin-permisos' },
      { key: 'respaldos', label: '💾 Respaldos',  route: 'admin-respaldos' },
      { key: 'auditoria', label: '📋 Auditoría',  route: 'admin-auditoria' },
      { key: 'config',    label: '⚙️ Config',     route: 'admin-config' },
    ];
    return `
      <div class="admin-tabs">
        ${tabs.map(t => `
          <button
            class="admin-tab${active === t.key ? ' active' : ''}"
            onclick="navigateTo('${t.route}')"
          >${t.label}</button>
        `).join('')}
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     1. renderUsuarios — CRUD de usuarios del sistema
  ────────────────────────────────────────────────────────── */
  renderUsuarios(container) {
    const users = DB.get('users') || [];

    const rolLabel = {
      admin:    'Administrador',
      social:   'Asistenta Social',
      terminal: 'Terminal',
      benef:    'Beneficiario',
    };
    const rolBadgeCls = {
      admin:    'badge-danger',
      social:   'badge-blue',
      terminal: 'badge-warning',
      benef:    'badge-success',
    };

    const filas = users.map(u => {
      const initials = (u.nombre || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const rol      = u.rol || 'benef';
      const activo   = u.activo !== false;
      const estadoBadge = activo
        ? `<span class="badge badge-success">Activo</span>`
        : `<span class="badge badge-secondary">Inactivo</span>`;
      const toggleLabel = activo ? '🚫 Desactivar' : '✅ Activar';
      const toggleCls   = activo ? 'btn-ghost' : 'btn-success';

      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="avatar avatar--sm">${initials}</div>
              <div>
                <div class="user-name">${u.nombre || '—'}</div>
                <div class="text-muted text-sm">${u.correo || '—'}</div>
              </div>
            </div>
          </td>
          <td>${statusBadge(rolLabel[rol] || rol, rolBadgeCls[rol] || 'badge-info')}</td>
          <td><code>${u.dni || '—'}</code></td>
          <td class="text-sm text-muted">${u.correo || '—'}</td>
          <td>${estadoBadge}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-sm btn-primary" onclick="window._editarUsuario('${u.id}')">
                ✏️ Editar
              </button>
              <button class="btn btn-sm ${toggleCls}" onclick="window.toggleUserActive('${u.id}', ${activo})">
                ${toggleLabel}
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">👥 Usuarios del Sistema</h2>
          <p class="view-subtitle">Gestión de cuentas y accesos al Comedor Universitario</p>
        </div>
        <button class="btn btn-primary" onclick="openModal('modal-new-user')">
          ➕ Nuevo Usuario
        </button>
      </div>

      ${this._tabsHTML('usuarios')}

      <div class="card mt-4">
        <div class="card-header">
          <h3 class="card-title">Lista de Usuarios</h3>
          <span class="badge badge-info">${users.length} usuarios</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Rol</th>
                <th>DNI</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filas || `
                <tr>
                  <td colspan="6" class="text-center text-muted py-4">
                    No hay usuarios registrados.
                  </td>
                </tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal: Nuevo Usuario -->
      <div id="modal-new-user" class="modal" style="display:none;">
        <div class="modal-backdrop" onclick="closeModal('modal-new-user')"></div>
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">➕ Nuevo Usuario</h3>
            <button class="modal-close" onclick="closeModal('modal-new-user')">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nombre completo *</label>
              <input id="nu-nombre" type="text" class="form-input" placeholder="Ej: María López Torres" />
            </div>
            <div class="form-group">
              <label class="form-label">DNI *</label>
              <input id="nu-dni" type="text" class="form-input" placeholder="8 dígitos" maxlength="8" />
            </div>
            <div class="form-group">
              <label class="form-label">Rol *</label>
              <select id="nu-rol" class="form-select">
                <option value="">Seleccionar rol…</option>
                <option value="admin">Administrador</option>
                <option value="social">Asistenta Social</option>
                <option value="terminal">Terminal</option>
                <option value="benef">Beneficiario</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Correo electrónico</label>
              <input id="nu-correo" type="email" class="form-input" placeholder="usuario@unajma.edu.pe" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="closeModal('modal-new-user')">Cancelar</button>
            <button class="btn btn-primary" onclick="window.crearUsuario()">✅ Crear Usuario</button>
          </div>
        </div>
      </div>`;

    /* ────── Funciones window ────── */

    window.toggleUserActive = function(id, currentlyActive) {
      const users = DB.get('users') || [];
      const idx   = users.findIndex(u => u.id === id);
      if (idx === -1) return;
      users[idx].activo = !currentlyActive;
      DB.update('users', users);
      const action = !currentlyActive ? 'activó' : 'desactivó';
      showToast(`✅ Usuario ${action} correctamente`, 'success');
      AdminViews.renderUsuarios(container);
    };

    window._editarUsuario = function(id) {
      showToast(`✏️ Edición de usuario (ID: ${id}) — próximamente`, 'info');
    };

    window.crearUsuario = function() {
      const nombre = ($('nu-nombre') || {}).value?.trim();
      const dni    = ($('nu-dni')    || {}).value?.trim();
      const rol    = ($('nu-rol')    || {}).value;
      const correo = ($('nu-correo') || {}).value?.trim();

      if (!nombre) { showToast('⚠️ El nombre es obligatorio', 'warning'); return; }
      if (!dni || dni.length !== 8 || isNaN(dni)) { showToast('⚠️ DNI inválido (8 dígitos)', 'warning'); return; }
      if (!rol)  { showToast('⚠️ Selecciona un rol', 'warning'); return; }

      const nuevoUsuario = {
        id:     'USR-' + Date.now(),
        nombre,
        dni,
        rol,
        correo,
        activo: true,
        creadoEn: new Date().toISOString(),
      };

      DB.add('users', nuevoUsuario);
      AuditoriaService.log('Crear usuario', `Nuevo usuario: ${nombre} (${rol})`);
      showToast(`✅ Usuario "${nombre}" creado correctamente`, 'success');
      closeModal('modal-new-user');
      AdminViews.renderUsuarios(container);
    };
  },

  /* ──────────────────────────────────────────────────────────
     2. renderRoles — Configuración de roles y permisos
  ────────────────────────────────────────────────────────── */
  renderRoles(container) {
    const roles = DB.get('roles') || [
      {
        id: 'admin',
        nombre: 'Administrador',
        descripcion: 'Acceso total al sistema. Gestiona usuarios, roles, configuración y respaldos.',
        permisos: ['usuarios.ver','usuarios.crear','usuarios.editar','roles.gestionar','config.editar','auditoria.ver','reportes.todos','respaldos.gestionar'],
      },
      {
        id: 'social',
        nombre: 'Asistenta Social',
        descripcion: 'Gestiona beneficiarios, postulantes, justificaciones y reportes.',
        permisos: ['beneficiarios.ver','beneficiarios.editar','postulantes.gestionar','justificaciones.gestionar','reportes.ver'],
      },
      {
        id: 'terminal',
        nombre: 'Terminal',
        descripcion: 'Acceso exclusivo al módulo de escaneo y registro de asistencia.',
        permisos: ['asistencias.registrar','asistencias.ver'],
      },
      {
        id: 'benef',
        nombre: 'Beneficiario',
        descripcion: 'Acceso de solo lectura a su perfil y estado de beneficio.',
        permisos: ['perfil.ver'],
      },
    ];

    const cards = roles.map(r => {
      const chips = r.permisos.map(p =>
        `<span class="tag tag-sm tag-gray">${p}</span>`
      ).join('');

      return `
        <div class="role-card">
          <div class="role-card__header">
            <span class="role-card__name">${r.nombre}</span>
            <span class="badge badge-blue">${r.permisos.length} permisos</span>
          </div>
          <p class="role-card__desc">${r.descripcion}</p>
          <div class="role-card__chips">${chips}</div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">🛡 Roles del Sistema</h2>
          <p class="view-subtitle">Definición de roles y sus permisos asociados</p>
        </div>
      </div>

      ${this._tabsHTML('roles')}

      <div class="roles-grid mt-4">
        ${cards}
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     3. renderPermisos — Matriz de permisos por módulo
  ────────────────────────────────────────────────────────── */
  renderPermisos(container) {
    const modulos = [
      'Usuarios',
      'Beneficiarios',
      'Postulantes',
      'Asistencias',
      'Justificaciones',
      'Reportes',
      'Configuración',
      'Auditoría',
    ];

    const rolesCol = ['Administrador', 'Asistenta Social', 'Beneficiario', 'Terminal'];

    /* Matriz de accesos: [modulo][rol] = true/false */
    const matrix = {
      'Usuarios':        [true,  false, false, false],
      'Beneficiarios':   [true,  true,  false, false],
      'Postulantes':     [true,  true,  false, false],
      'Asistencias':     [true,  true,  true,  true ],
      'Justificaciones': [true,  true,  true,  false],
      'Reportes':        [true,  true,  false, false],
      'Configuración':   [true,  false, false, false],
      'Auditoría':       [true,  false, false, false],
    };

    const filas = modulos.map(mod => {
      const celdas = rolesCol.map((_, i) => {
        const tiene = matrix[mod][i];
        return `<td class="text-center">${tiene
          ? '<span class="perm-check">✔</span>'
          : '<span class="perm-cross">✖</span>'
        }</td>`;
      }).join('');
      return `<tr><td><strong>${mod}</strong></td>${celdas}</tr>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">🔑 Matriz de Permisos</h2>
          <p class="view-subtitle">Accesos por módulo según el rol del usuario</p>
        </div>
      </div>

      ${this._tabsHTML('permisos')}

      <div class="card mt-4">
        <div class="card-header">
          <h3 class="card-title">Permisos por Módulo</h3>
          <div class="perm-legend">
            <span><span class="perm-check">✔</span> Permitido</span>
            <span><span class="perm-cross">✖</span> Denegado</span>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table perm-table">
            <thead>
              <tr>
                <th>Módulo</th>
                ${rolesCol.map(r => `<th class="text-center">${r}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     4. renderRespaldos — Gestión de backups
  ────────────────────────────────────────────────────────── */
  renderRespaldos(container) {
    const backups = [
      { nombre: 'backup-2026-07-13.zip', tamaño: '4.2 MB', fecha: '13 Jul 2026, 02:00', archivo: 'backup-2026-07-13.zip' },
      { nombre: 'backup-2026-07-06.zip', tamaño: '4.0 MB', fecha: '06 Jul 2026, 02:00', archivo: 'backup-2026-07-06.zip' },
      { nombre: 'backup-2026-06-29.zip', tamaño: '3.8 MB', fecha: '29 Jun 2026, 02:00', archivo: 'backup-2026-06-29.zip' },
    ];

    const listaBackups = backups.map(b => `
      <div class="backup-item">
        <div class="backup-item__info">
          <span class="backup-item__icon">💾</span>
          <div>
            <div class="backup-item__name">${b.nombre}</div>
            <div class="text-muted text-sm">${b.tamaño} — ${b.fecha}</div>
          </div>
        </div>
        <div class="action-buttons">
          <button class="btn btn-sm btn-primary" onclick="simulateDownload('${b.archivo}')">⬇ Descargar</button>
          <button class="btn btn-sm btn-ghost" onclick="window.restaurarBackup('${b.nombre}')">🔄 Restaurar</button>
        </div>
      </div>`).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">💾 Gestión de Respaldos</h2>
          <p class="view-subtitle">Configuración y historial de copias de seguridad</p>
        </div>
        <button class="btn btn-primary" onclick="window.generarRespaldo()">
          ➕ Generar Respaldo Ahora
        </button>
      </div>

      ${this._tabsHTML('respaldos')}

      <div class="grid-2 mt-4">
        <!-- Configuración de respaldos -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚙️ Configuración de Respaldos</h3>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Frecuencia de respaldo</label>
              <select id="backup-freq" class="form-select">
                <option value="daily" selected>Diaria (02:00 am)</option>
                <option value="weekly">Semanal (Domingos)</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Retención de respaldos</label>
              <select id="backup-retention" class="form-select">
                <option value="7">7 días</option>
                <option value="14">14 días</option>
                <option value="30" selected>30 días</option>
                <option value="90">90 días</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Destino del respaldo</label>
              <input id="backup-dest" type="text" class="form-input" value="/backups/comedor-unam-ilo/" />
            </div>
            <div class="form-group form-group--row">
              <label class="form-label">Respaldo automático activo</label>
              <label class="toggle-switch">
                <input type="checkbox" id="backup-auto" checked />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <button class="btn btn-primary w-full mt-2" onclick="
              showToast('✅ Configuración de respaldos guardada', 'success')
            ">💾 Guardar Configuración</button>
          </div>
        </div>

        <!-- Historial de backups -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📋 Historial de Respaldos</h3>
            <span class="badge badge-info">${backups.length} backups</span>
          </div>
          <div class="card-body backup-list">
            ${listaBackups}
          </div>
        </div>
      </div>`;

    /* ────── Funciones window ────── */

    window.generarRespaldo = function() {
      showToast('⏳ Generando respaldo del sistema…', 'info');
      setTimeout(() => {
        AuditoriaService.log('Generar respaldo', 'Respaldo manual generado por el administrador');
        showToast('✅ Respaldo generado y almacenado correctamente', 'success');
      }, 2500);
    };

    window.restaurarBackup = function(nombre) {
      if (confirm(`¿Restaurar el sistema desde el respaldo "${nombre}"? Esta acción reemplazará los datos actuales.`)) {
        showToast('⏳ Restaurando respaldo…', 'info');
        setTimeout(() => {
          AuditoriaService.log('Restaurar respaldo', `Restauración desde: ${nombre}`);
          showToast('✅ Sistema restaurado correctamente', 'success');
        }, 3000);
      }
    };
  },

  /* ──────────────────────────────────────────────────────────
     5. renderAuditoria — Log de actividades del sistema
  ────────────────────────────────────────────────────────── */
  renderAuditoria(container) {
    const logs = (DB.get('auditoria') || []).slice().reverse();

    const filas = logs.map(log => {
      const fecha  = log.fecha     || log.timestamp || '—';
      const user   = log.usuario   || log.user      || 'Sistema';
      const accion = log.accion    || log.action    || '—';
      const detalle= log.detalle   || log.detail    || '—';
      const ip     = log.ip        || '127.0.0.1';

      return `
        <tr>
          <td class="text-sm text-muted">${fecha}</td>
          <td>${user}</td>
          <td><span class="badge badge-info">${accion}</span></td>
          <td class="text-sm">${detalle}</td>
          <td><code>${ip}</code></td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">📋 Auditoría del Sistema</h2>
          <p class="view-subtitle">Registro cronológico de actividades y eventos del sistema</p>
        </div>
        <button class="btn btn-ghost" onclick="simulateDownload('auditoria.xlsx')">
          📥 Exportar Log
        </button>
      </div>

      ${this._tabsHTML('auditoria')}

      <div class="card mt-4">
        <div class="card-header">
          <h3 class="card-title">📋 Log de Actividades</h3>
          <span class="badge badge-info">${logs.length} eventos</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Detalle</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              ${filas || `
                <tr>
                  <td colspan="5" class="text-center text-muted py-4">
                    No hay eventos de auditoría registrados.
                  </td>
                </tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     6. renderConfig — Parámetros del sistema + zona de peligro
  ────────────────────────────────────────────────────────── */
  renderConfig(container) {
    const cfg = DB.get('config') || {};

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">⚙️ Configuración del Sistema</h2>
          <p class="view-subtitle">Parámetros institucionales y operativos del Comedor Universitario</p>
        </div>
      </div>

      ${this._tabsHTML('config')}

      <div class="grid-2 mt-4">
        <!-- Datos institucionales -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🏛 Datos Institucionales</h3>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Nombre de la institución</label>
              <input id="cfg-nombre" type="text" class="form-input"
                value="${cfg.nombre || 'Comedor Universitario UNAM Ilo'}" />
            </div>
            <div class="form-group">
              <label class="form-label">Filial</label>
              <input id="cfg-filial" type="text" class="form-input"
                value="${cfg.filial || 'UNAM — Sede Ilo, Moquegua'}" />
            </div>
            <div class="form-group">
              <label class="form-label">Período académico activo</label>
              <input id="cfg-periodo" type="text" class="form-input"
                value="${cfg.periodo || '2026-I'}" />
            </div>
            <div class="form-group">
              <label class="form-label">Capacidad diaria de raciones</label>
              <input id="cfg-capacidad" type="number" class="form-input"
                value="${cfg.capacidad || 200}" min="1" />
            </div>
            <button class="btn btn-primary w-full mt-2" onclick="window.guardarConfigInstitucional()">
              💾 Guardar Datos
            </button>
          </div>
        </div>

        <!-- Parámetros del sistema -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🔧 Parámetros Operativos</h3>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Máx. ausencias consecutivas permitidas</label>
              <input id="cfg-max-cons" type="number" class="form-input"
                value="${cfg.maxAusenciasConsecutivas || 3}" min="1" max="30" />
            </div>
            <div class="form-group">
              <label class="form-label">Máx. ausencias por mes</label>
              <input id="cfg-max-mes" type="number" class="form-input"
                value="${cfg.maxAusenciasMes || 5}" min="1" max="31" />
            </div>
            <div class="form-group">
              <label class="form-label">Costo por ración (S/.)</label>
              <input id="cfg-costo" type="number" class="form-input"
                value="${cfg.costoRacion || 1.50}" min="0" step="0.10" />
            </div>
            <button class="btn btn-primary w-full mt-2" onclick="window.guardarConfigOperativa()">
              💾 Guardar Parámetros
            </button>
          </div>
        </div>
      </div>

      <!-- Zona de Peligro -->
      <div class="card card--danger mt-4">
        <div class="card-header card-header--danger">
          <h3 class="card-title">⚠️ Zona de Peligro</h3>
          <span class="badge badge-danger">Acciones irreversibles</span>
        </div>
        <div class="card-body danger-zone">
          <div class="danger-action">
            <div class="danger-action__info">
              <strong>Reiniciar Base de Datos</strong>
              <p class="text-muted text-sm">
                Elimina todos los datos del sistema y restaura los valores iniciales.
                Esta acción no puede deshacerse.
              </p>
            </div>
            <button class="btn btn-danger" id="btn-reset-db" onclick="window.reiniciarDB()">
              🗑 Reiniciar Base de Datos
            </button>
          </div>
          <div class="danger-divider"></div>
          <div class="danger-action">
            <div class="danger-action__info">
              <strong>Cerrar Todas las Sesiones</strong>
              <p class="text-muted text-sm">
                Fuerza el cierre de sesión de todos los usuarios activos en el sistema.
              </p>
            </div>
            <button class="btn btn-warning" id="btn-close-sessions" onclick="window.cerrarTodasLasSesiones()">
              🔒 Cerrar Todas las Sesiones
            </button>
          </div>
        </div>
      </div>`;

    /* ────── Funciones window ────── */

    window.guardarConfigInstitucional = function() {
      const cfg = DB.get('config') || {};
      cfg.nombre    = ($('cfg-nombre')    || {}).value || cfg.nombre;
      cfg.filial    = ($('cfg-filial')    || {}).value || cfg.filial;
      cfg.periodo   = ($('cfg-periodo')   || {}).value || cfg.periodo;
      cfg.capacidad = parseInt(($('cfg-capacidad') || {}).value) || cfg.capacidad;
      DB.update('config', cfg);
      AuditoriaService.log('Guardar configuración', 'Datos institucionales actualizados');
      showToast('✅ Datos institucionales guardados', 'success');
    };

    window.guardarConfigOperativa = function() {
      const cfg = DB.get('config') || {};
      cfg.maxAusenciasConsecutivas = parseInt(($('cfg-max-cons') || {}).value) || cfg.maxAusenciasConsecutivas;
      cfg.maxAusenciasMes          = parseInt(($('cfg-max-mes')  || {}).value) || cfg.maxAusenciasMes;
      cfg.costoRacion              = parseFloat(($('cfg-costo')  || {}).value) || cfg.costoRacion;
      DB.update('config', cfg);
      AuditoriaService.log('Guardar configuración', 'Parámetros operativos actualizados');
      showToast('✅ Parámetros del sistema guardados', 'success');
    };

    window.reiniciarDB = function() {
      const confirmado = confirm(
        '⚠️ ¿Estás seguro de que deseas REINICIAR la base de datos?\n\n' +
        'Esta acción eliminará TODOS los datos del sistema y no puede deshacerse.'
      );
      if (confirmado) {
        DB.reset();
        AuditoriaService.log('Reiniciar BD', 'Base de datos reiniciada por el administrador');
        showToast('✅ Base de datos reiniciada. Recarga la página.', 'success');
      }
    };

    window.cerrarTodasLasSesiones = function() {
      AuditoriaService.log('Cerrar sesiones', 'Todas las sesiones fueron cerradas forzadamente');
      showToast('🔒 Todas las sesiones han sido cerradas', 'warning');
    };
  },
};
