/* ============================================================
   app.js — Punto de Entrada Principal de la Aplicación
   ============================================================
   Responsabilidades ÚNICAS de este archivo:
   1. Inicializar la aplicación al cargar la página
   2. Gestionar el enrutador de vistas (navigateTo)
   3. Renderizar el sidebar según el rol activo
   4. Manejar la pantalla de selección de rol
   5. Actualizar cabeceras (título, fecha, contador notifs)

   NO contiene lógica de negocio ni HTML de vistas.
   Eso está en js/views/*.js y js/components/*.js
   ============================================================ */

// ─── Estado global de la aplicación ─────────────────────────
// Solo App.js controla estos valores. Las vistas los leen pero no los modifican.
const App = {
  currentRole: null,  // 'beneficiario' | 'asistenta_social' | 'scanner' | 'reportes' | 'admin'
  currentView: null,  // ID de la vista activa (ver HEADER_LABELS en config.js)
  currentUserId: null,// ID del usuario demo activo
};

// ─── Punto de entrada ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  _updateClock();
  setInterval(_updateClock, 60_000);
  console.info('[SGCU] Sistema inicializado — UNAM Filial Ilo | v' + INSTITUCION.version);
  console.info('[SGCU] Modo:', USE_SUPABASE ? '🌐 Supabase conectado' : '💾 Offline (seed.js)');
});

async function selectRole(role, authenticatedUserId) {
  App.currentRole   = role;
  App.currentUserId = authenticatedUserId || DEMO_USER_BY_ROLE[role] || null;

  // Actualizar info de usuario en sidebar y top-header
  await _renderUserInfo(role);

  // Construir navegación del sidebar y bottom nav
  renderSidebar(role);
  renderMobileBottomNav(role);

  // Mostrar shell, ocultar selector
  $('role-selector').style.display  = 'none';
  const shell = $('app-shell');
  shell.classList.add('visible');
  shell.style.display = 'flex';

  // Navegar a la vista por defecto del rol
  await navigateTo(DEFAULT_VIEW[role]);
}

/**
 * Vuelve a la pantalla de selección de rol.
 * Expuesta globalmente para el botón del sidebar.
 */
function goToRoles() {
  App.currentRole   = null;
  App.currentView   = null;
  App.currentUserId = null;

  $('app-shell').classList.remove('visible');
  $('app-shell').style.display = 'none';
  $('role-selector').style.display = 'flex';
  
  if (typeof hideAuthForm === 'function') {
    hideAuthForm();
  }
}

// ─── Enrutador de vistas ──────────────────────────────────────
/**
 * Navega a la vista especificada por su ID.
 * Delega el renderizado al objeto de vistas correspondiente.
 * @param {string} viewId — ID de la vista (ver NAV_CONFIG en config.js)
 */
async function navigateTo(viewId) {
  App.currentView = viewId;
  const container = $('view-container');

  // Si usa Supabase, sincronizar caché remoto antes de renderizar la vista
  if (typeof syncLocalCacheWithSupabase === 'function' && USE_SUPABASE) {
    try {
      await syncLocalCacheWithSupabase();
    } catch (e) {
      console.warn('Fallo al sincronizar con Supabase en navegación:', e);
    }
  }

  // Actualizar cabecera
  const [title, sub] = HEADER_LABELS[viewId] || [viewId, ''];
  const titleEl = $('header-title');
  const subEl = $('header-sub');
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent   = sub;

  // Marcar nav item activo en sidebar
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  // Marcar nav item activo en bottom nav
  $$('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  // Actualizar subtítulo del header móvil
  _updateMobileHeader(viewId);

  // Delegar al módulo de vistas según el rol y vista
  try {
    switch (viewId) {
      // ── Postulante ────────────────────────────────
      case 'post-inicio':      PostulanteViews.renderInicio(container);       break;
      case 'post-solicitar':   PostulanteViews.renderSolicitar(container);    break;
      case 'post-estado':      PostulanteViews.renderEstado(container);       break;

      // ── Beneficiario ──────────────────────────────
      case 'inicio':           BeneficiarioViews.renderInicio(container);         break;
      case 'mi-beneficio':     BeneficiarioViews.renderMiBeneficio(container);    break;
      case 'mis-asistencias':  BeneficiarioViews.renderMisAsistencias(container); break;
      case 'justificacion':    BeneficiarioViews.renderJustificacion(container);  break;
      case 'notificaciones':   await BeneficiarioViews.renderNotificaciones(container); break;

      // ── Asistenta Social ──────────────────────────
      case 'dashboard':        SocialViews.renderDashboard(container);        break;
      case 'beneficiarios':    SocialViews.renderBeneficiarios(container);    break;
      case 'postulantes':      SocialViews.renderPostulantes(container);      break;
      case 'lista-espera':     SocialViews.renderListaEspera(container);      break;
      case 'asistencias':      SocialViews.renderAsistencias(container);      break;
      case 'justificaciones':  SocialViews.renderJustificaciones(container);  break;
      case 'reportes':         SocialViews.renderReportesSocial(container);   break;
      case 'configuracion':    SocialViews.renderConfiguracion(container);    break;

      // ── Scanner ───────────────────────────────────
      case 'scanner-qr':       ScannerViews.renderQR(container);       break;
      case 'scanner-barcode':  ScannerViews.renderBarcode(container);  break;
      case 'scanner-dni':      ScannerViews.renderDNI(container);      break;
      case 'scanner-confirm':  ScannerViews.renderConfirm(container);  break;

      // ── Reportes ──────────────────────────────────
      case 'rep-pdf':          ReportesViews.renderPDF(container);          break;
      case 'rep-excel':        ReportesViews.renderExcel(container);        break;
      case 'rep-estadisticas': ReportesViews.renderEstadisticas(container); break;
      case 'rep-graficos':     ReportesViews.renderGraficos(container);     break;

      // ── Administrador ─────────────────────────────
      case 'admin-usuarios':   AdminViews.renderUsuarios(container);   break;
      case 'admin-roles':      AdminViews.renderRoles(container);      break;
      case 'admin-permisos':   AdminViews.renderPermisos(container);   break;
      case 'admin-respaldos':  AdminViews.renderRespaldos(container);  break;
      case 'admin-auditoria':  AdminViews.renderAuditoria(container);  break;
      case 'admin-config':     AdminViews.renderConfig(container);     break;

      default:
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><h4>Vista no encontrada</h4><p>ID: ${viewId}</p></div>`;
    }
  } catch (err) {
    console.error(`[SGCU] Error al renderizar vista "${viewId}":`, err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h4>Error al cargar la vista</h4>
        <p style="font-family:monospace;color:var(--rose)">${err.message}</p>
      </div>`;
  }

  // Actualizar contador de notificaciones
  _updateNotifBadge();
}

// ─── Sidebar ──────────────────────────────────────────────────
/**
 * Renderiza los ítems de navegación del sidebar según el rol.
 * @param {string} role
 */
function renderSidebar(role) {
  const nav  = $('sidebar-nav');
  const conf = NAV_CONFIG[role] || [];

  nav.innerHTML = conf.map(item => {
    const unread = (item.badge && App.currentUserId)
      ? NotificacionesService.countUnread(App.currentUserId)
      : 0;
    const badgeHtml = (item.badge && unread > 0)
      ? `<span class="nav-badge">${unread}</span>`
      : '';
    return `
      <button class="nav-item" data-view="${item.id}" onclick="navigateTo('${item.id}');closeMobileSidebar()">
        <span class="nav-icon">${item.icon}</span>
        ${item.label}
        ${badgeHtml}
      </button>`;
  }).join('');
}

// ─── Bottom Navigation (Móvil) ────────────────────────────────

/** Ítems del bottom nav por rol (máximo 4 para no saturar) */
const MOBILE_NAV_CONFIG = {
  beneficiario: [
    { id: 'inicio',          icon: '🏠', label: 'Inicio' },
    { id: 'mi-beneficio',    icon: '🎓', label: 'Beneficio' },
    { id: 'mis-asistencias', icon: '📅', label: 'Asistencia' },
    { id: 'notificaciones',  icon: '🔔', label: 'Alertas' },
  ],
  asistenta_social: [
    { id: 'dashboard',       icon: '🏠', label: 'Inicio' },
    { id: 'asistencias',     icon: '📋', label: 'Asistencia' },
    { id: 'beneficiarios',   icon: '👥', label: 'Padrón' },
    { id: 'reportes',        icon: '📊', label: 'Reportes' },
  ],
  scanner: [
    { id: 'scanner-qr',      icon: '📷', label: 'QR' },
    { id: 'scanner-barcode', icon: '▦',  label: 'Barras' },
    { id: 'scanner-dni',     icon: '🔢', label: 'DNI' },
    { id: 'scanner-confirm', icon: '✅', label: 'Hoy' },
  ],
  reportes: [
    { id: 'rep-estadisticas',icon: '📊', label: 'Estadísticas' },
    { id: 'rep-graficos',    icon: '📈', label: 'Gráficos' },
    { id: 'rep-pdf',         icon: '📕', label: 'PDF' },
    { id: 'rep-excel',       icon: '📗', label: 'Excel' },
  ],
  admin: [
    { id: 'admin-usuarios',  icon: '👤', label: 'Usuarios' },
    { id: 'admin-roles',     icon: '🔑', label: 'Roles' },
    { id: 'admin-respaldos', icon: '💾', label: 'Respaldos' },
    { id: 'admin-config',    icon: '⚙️', label: 'Config' },
  ],
};

/**
 * Renderiza la barra de navegación inferior para móvil.
 * @param {string} role
 */
function renderMobileBottomNav(role) {
  const nav  = $('mobile-bottom-nav');
  if (!nav) return;
  const conf = MOBILE_NAV_CONFIG[role] || [];
  const activeView = App.currentView || (conf[0] && conf[0].id);

  nav.innerHTML = conf.map(item => `
    <button class="mobile-nav-item ${item.id === activeView ? 'active' : ''}" 
            data-view="${item.id}" 
            onclick="navigateTo('${item.id}')">
      <span class="mobile-nav-icon">${item.icon}</span>
      ${item.label}
    </button>`).join('');
}

// ─── Mobile Sidebar Toggle ────────────────────────────────────

/** Abre el sidebar en móvil con overlay */
function toggleMobileSidebar() {
  const sidebar = $('sidebar');
  const overlay = $('sidebar-overlay');
  const isOpen  = sidebar.classList.contains('mobile-open');
  
  if (isOpen) {
    closeMobileSidebar();
  } else {
    sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.add('visible');
  }
}

/** Cierra el sidebar en móvil */
function closeMobileSidebar() {
  const sidebar = $('sidebar');
  const overlay = $('sidebar-overlay');
  sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('visible');
}

// ─── Privados ─────────────────────────────────────────────────

/** Actualiza la info de usuario en la cabecera del sidebar y top header */
async function _renderUserInfo(role) {
  const ROLE_LABELS = {
    postulante:       'Postulante',
    beneficiario:     'Portal Estudiantil',
    asistenta_social: 'Bienestar Social',
    scanner:          'Terminal de Registro',
    reportes:         'Portal de Reportes',
    admin:            'Administrador',
  };

  const roleTag = $('header-role-tag');
  if (roleTag) {
    roleTag.textContent = ROLE_LABELS[role] || role;
  }

  const studentInfoPanel = $('student-header-info');

  if (role === 'beneficiario' || role === 'postulante') {
    if (studentInfoPanel) studentInfoPanel.style.display = 'flex';
    
    const user = DB.getOne('users', App.currentUserId);

    if (user) {
      const avatarEl = $('header-student-avatar');
      const codeEl = $('header-student-code');
      const careerEl = $('header-student-career');
      const nameEl = $('header-student-name');
      
      if (avatarEl) avatarEl.textContent = user.avatar || 'U';
      if (codeEl) codeEl.textContent = user.codigo || '—';
      if (careerEl) careerEl.textContent = (user.carrera || '—').toUpperCase();
      if (nameEl) nameEl.textContent = (user.nombre || '—').toUpperCase();

      $('sidebar-avatar').textContent    = user.avatar || 'U';
      $('sidebar-user-name').textContent = user.nombre || '—';
      $('sidebar-user-role').textContent = role === 'postulante' ? 'Postulante' : 'Estudiante';
    }
  } else {
    if (studentInfoPanel) studentInfoPanel.style.display = 'none';

    const user = DB.getOne('users', App.currentUserId);

    $('sidebar-avatar').textContent    = user?.avatar    || role[0].toUpperCase();
    $('sidebar-user-name').textContent = user?.nombre    || 'Personal';
    $('sidebar-user-role').textContent = ROLE_LABELS[role] || role;
  }
}

/** Actualiza el reloj de la cabecera */
function _updateClock() {
  const el = $('header-date');
  if (el) el.textContent = getTodayDisplay();
}

/** Actualiza el subtítulo del header móvil según la vista activa */
function _updateMobileHeader(viewId) {
  const titleEl = $('mobile-header-title');
  const subEl   = $('mobile-header-subtitle');
  if (!subEl) return;

  const MOBILE_SUBTITLES = {
    'inicio':          'Servicio de Almuerzo',
    'mi-beneficio':    'Mi Beneficio',
    'mis-asistencias': 'Mis Asistencias',
    'postulacion':     'Postulación',
    'justificacion':   'Justificación (FUT)',
    'notificaciones':  'Notificaciones',
    'dashboard':       'Panel de Control',
    'beneficiarios':   'Gestión de Padrón',
    'postulantes':     'Evaluación',
    'lista-espera':    'Lista de Espera',
    'asistencias':     'Servicio de Almuerzo - Asistencia',
    'justificaciones': 'Justificaciones FUT',
    'reportes':        'Reportes',
    'configuracion':   'Configuración',
    'scanner-qr':      'Escanear QR',
    'scanner-barcode': 'Código de Barras',
    'scanner-dni':     'Ingresar DNI',
    'scanner-confirm': 'Confirmaciones',
    'rep-pdf':         'Reportes PDF',
    'rep-excel':       'Reportes Excel',
    'rep-estadisticas':'Estadísticas',
    'rep-graficos':    'Gráficos',
    'admin-usuarios':  'Gestión de Usuarios',
    'admin-roles':     'Roles del Sistema',
    'admin-permisos':  'Permisos',
    'admin-respaldos': 'Respaldos',
    'admin-auditoria': 'Auditoría',
    'admin-config':    'Configuración',
  };

  subEl.textContent = MOBILE_SUBTITLES[viewId] || 'Servicio de Almuerzo';
}

/** Actualiza el badge de notificaciones no leídas */
function _updateNotifBadge() {
  const badge    = $('notif-count');
  if (!badge || !App.currentUserId) { if (badge) badge.style.display = 'none'; return; }
  const unread   = NotificacionesService.countUnread(App.currentUserId);
  badge.textContent  = unread;
  badge.style.display = unread > 0 ? 'flex' : 'none';
}

/** Abre/cierra el panel de notificaciones (navega a la vista) */
function toggleNotifPanel() {
  if (App.currentRole === 'beneficiario') {
    navigateTo('notificaciones');
  } else {
    showToast('info', 'Notificaciones', 'Panel de notificaciones del sistema.');
  }
}

// ─── Lógica de Autenticación y Registro (Formularios) ──────────

window._selectedAuthRole = null;
window._authMode = 'login'; // 'login' | 'register'

/**
 * Muestra el panel de Login para el rol seleccionado.
 */
window.showAuthForm = function(role) {
  window._selectedAuthRole = role;
  window._authMode = 'login';
  
  // Limpiar campos
  $('login-username').value = '';
  $('login-password').value = '';
  
  // Título dinámico
  const ROLE_TITLES = {
    postulante: 'Portal del Postulante',
    beneficiario: 'Portal de Beneficiario',
    asistenta_social: 'Portal de Asistente Social',
    admin: 'Portal de Administrador'
  };
  
  $('auth-title').textContent = ROLE_TITLES[role] || 'Ingreso al Sistema';
  $('auth-subtitle').textContent = 'Ingresa tus credenciales para acceder';

  // Mostrar/Ocultar controles correspondientes
  $('login-form-container').style.display = 'block';
  $('register-form-container').style.display = 'none';
  $('register-footer-msg').style.display = 'block';

  // Ocultar grid de roles e info inicial
  $('roles-grid').style.display = 'none';
  $('role-selector-header').style.display = 'none';
  $('role-selector-footer').style.display = 'none';
  
  // Mostrar formulario
  $('auth-panel').style.display = 'flex';
};

/**
 * Vuelve a la selección de roles.
 */
window.hideAuthForm = function() {
  window._selectedAuthRole = null;
  $('auth-panel').style.display = 'none';
  $('roles-grid').style.display = 'grid';
  $('role-selector-header').style.display = 'block';
  $('role-selector-footer').style.display = 'block';
};

/**
 * Alterna entre login y registro.
 */
window.toggleAuthMode = function(mode) {
  window._authMode = mode;
  if (mode === 'login') {
    $('login-form-container').style.display = 'block';
    $('register-form-container').style.display = 'none';
  } else {
    $('login-form-container').style.display = 'none';
    $('register-form-container').style.display = 'block';
    
    // Inyectar campos de registro dinámicos
    $('register-fields').innerHTML = getRegisterFieldsHTML(window._selectedAuthRole);
  }
};

/**
 * Envía el formulario de Login.
 */
window.submitLogin = async function() {
  const user = $('login-username').value.trim();
  const pass = $('login-password').value.trim();

  if (!user || !pass) {
    showToast('warning', 'Campos obligatorios', 'Por favor ingresa tu usuario y contraseña.');
    return;
  }

  showToast('info', 'Autenticando...', 'Verificando tus datos en el sistema.');

  const res = await UsuariosService.autenticar(window._selectedAuthRole, user, pass);

  if (res.ok) {
    showToast('success', '¡Acceso Correcto!', `Bienvenido, ${res.user.nombre}.`);
    // Ocultar selector e ingresar a la aplicación
    window.hideAuthForm();
    await selectRole(window._selectedAuthRole, res.user.id);
  } else {
    showToast('error', 'Error de ingreso', res.error || 'Usuario o contraseña incorrectos.');
  }
};

/**
 * Envía el formulario de Registro.
 */
window.submitRegister = async function() {
  const role = window._selectedAuthRole;
  
  // Campos comunes
  const nombres = $('reg-nombres')?.value.trim();
  const apellidos = $('reg-apellidos')?.value.trim();
  const dni = $('reg-dni')?.value.trim();
  const email = $('reg-email')?.value.trim();
  
  // Campos específicos
  const codigo = $('reg-codigo')?.value.trim() || '';
  const sexo = $('reg-sexo')?.value || 'M';
  const id_escuela = $('reg-escuela')?.value || '1';
  const ciclo = $('reg-ciclo')?.value || '1';
  
  // Credenciales
  const usuario = $('reg-usuario')?.value.trim();
  const contrasena = $('reg-contrasena')?.value.trim();

  // Validaciones
  if (!usuario || !contrasena) {
    showToast('warning', 'Campos requeridos', 'Ingresa usuario y contraseña.');
    return;
  }

  const datos = {
    nombres, apellidos, dni, email, codigo, sexo, id_escuela, ciclo, usuario, contrasena
  };

  showToast('info', 'Registrando...', 'Procesando tu solicitud en el servidor.');

  const res = await UsuariosService.registrar(role, datos);

  if (res.ok) {
    showToast('success', 'Registro Exitoso', 'Tu cuenta ha sido creada. Ya puedes iniciar sesión.');
    window.toggleAuthMode('login');
    $('login-username').value = usuario;
    $('login-password').value = contrasena;
  } else {
    showToast('error', 'Error de registro', res.error || 'No se pudo crear la cuenta.');
  }
};

/**
 * Genera dinámicamente los campos de registro según el rol.
 */
function getRegisterFieldsHTML(role) {
  const commonFields = `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nombres</label><input type="text" id="reg-nombres" class="form-control" required></div>
      <div class="form-group"><label class="form-label">Apellidos</label><input type="text" id="reg-apellidos" class="form-control" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">DNI</label><input type="text" id="reg-dni" class="form-control" maxlength="8" required></div>
      <div class="form-group"><label class="form-label">Correo Electrónico</label><input type="email" id="reg-email" class="form-control" required></div>
    </div>
  `;

  const credentialsFields = `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nombre de Usuario</label><input type="text" id="reg-usuario" class="form-control" required></div>
      <div class="form-group"><label class="form-label">Contraseña</label><input type="password" id="reg-contrasena" class="form-control" required></div>
    </div>
  `;

  if (role === 'postulante') {
    return `
      ${commonFields}
      <div class="form-row">
        <div class="form-group"><label class="form-label">Código Universitario</label><input type="text" id="reg-codigo" class="form-control" required></div>
        <div class="form-group">
          <label class="form-label">Sexo</label>
          <select id="reg-sexo" class="form-control">
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Carrera (Escuela)</label>
          <select id="reg-escuela" class="form-control">
            <option value="1">Ingeniería de Sistemas</option>
            <option value="2">Ingeniería de Software</option>
            <option value="3">Medicina Humana</option>
            <option value="4">Administración</option>
            <option value="5">Derecho</option>
            <option value="6">Ingeniería Industrial</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ciclo</label>
          <input type="number" id="reg-ciclo" class="form-control" min="1" max="10" value="1" required>
        </div>
      </div>
      ${credentialsFields}
    `;
  } else if (role === 'beneficiario') {
    return `
      <p style="color:var(--text-muted);font-size:0.75rem;margin-bottom:1rem;line-height:1.4;">
        ⚠️ <strong>Nota:</strong> Los beneficiarios aprobados tienen cuentas auto-creadas. Ingresa tu código y DNI para registrar tu contraseña personalizada.
      </p>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Código Universitario</label><input type="text" id="reg-codigo" class="form-control" placeholder="Ej: 2022001" required></div>
        <div class="form-group"><label class="form-label">DNI</label><input type="text" id="reg-dni" class="form-control" maxlength="8" placeholder="Ej: 72345678" required></div>
      </div>
      ${credentialsFields}
    `;
  } else {
    return `
      ${commonFields}
      ${credentialsFields}
    `;
  }
}

