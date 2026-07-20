/* ============================================================
   app.js — Punto de Entrada Principal de la Aplicación
   ============================================================
   Responsabilidades ÚNICAS de este archivo:
   1. Inicializar la aplicación al cargar la página
   2. Gestionar el enrutador de vistas (navigateTo)
   3. Renderizar el sidebar según el rol activo
   4. Manejar la pantalla de selección de rol/módulo
   5. Actualizar cabeceras (título, fecha, contador notifs)
   6. Login por DNI + contraseña para todos los módulos
      excepto Postulante (acceso público directo).
   7. Modal de restablecimiento de contraseña por DNI + correo.

   NO contiene lógica de negocio ni HTML de vistas.
   Eso está en js/views/*.js y js/components/*.js
   ============================================================ */

// ─── Estado global de la aplicación ─────────────────────────
const App = {
  currentRole:   null,  // 'postulante'|'dbu'|'beneficiario'|'asistenta_social'|'admin'
  currentView:   null,  // ID de la vista activa (ver HEADER_LABELS en config.js)
  currentUserId: null,  // ID del usuario activo (null para Postulante)
  currentUser:   null,  // Objeto de usuario completo con datos del perfil
};

// ─── Punto de entrada ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  _updateClock();
  setInterval(_updateClock, 60_000);
  console.info('[SGCU] Sistema inicializado — UNAM Filial Ilo | v' + INSTITUCION.version);
  console.info('[SGCU] Modo:', USE_SUPABASE ? '🌐 Supabase conectado' : '💾 Offline (seed.js)');
});

// ─── Módulo Postulante: Acceso público sin login ──────────────
/**
 * Entra directamente al módulo Postulante sin autenticación.
 * El módulo provee dos flujos:
 *   1. Enviar postulación (formulario público).
 *   2. Consultar estado ingresando el DNI.
 */
window.enterAsPostulante = async function() {
  await selectRole('postulante', null);
};

// ─── selectRole ───────────────────────────────────────────────
async function selectRole(role, authenticatedUser) {
  App.currentRole   = role;
  App.currentUser   = authenticatedUser || null;
  App.currentUserId = authenticatedUser?.id || null;

  // Actualizar info de usuario en sidebar y top-header
  await _renderUserInfo(role, authenticatedUser);

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
 * Vuelve a la pantalla de selección de módulo.
 */
function goToRoles() {
  App.currentRole   = null;
  App.currentView   = null;
  App.currentUserId = null;
  App.currentUser   = null;

  $('app-shell').classList.remove('visible');
  $('app-shell').style.display = 'none';
  $('role-selector').style.display = 'flex';
  $('auth-panel').style.display = 'none';
  $('roles-grid').style.display = 'grid';
  $('role-selector-header').style.display = 'block';
  $('role-selector-footer').style.display = 'block';
}

// ─── Enrutador de vistas ──────────────────────────────────────
async function navigateTo(viewId) {
  App.currentView = viewId;
  const container = $('view-container');

  // Actualizar cabecera
  const [title, sub] = HEADER_LABELS[viewId] || [viewId, ''];
  const titleEl = $('header-title');
  const subEl   = $('header-sub');
  if (titleEl) titleEl.textContent = title;
  if (subEl)   subEl.textContent   = sub;

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

  // Mostrar spinner de carga
  container.innerHTML = '<div class="loading-state" style="display:flex;align-items:center;justify-content:center;padding:3rem;"><div style="text-align:center;color:var(--text-muted)"><div style="font-size:2rem;margin-bottom:0.75rem">⏳</div><p>Cargando...</p></div></div>';

  // Delegar al módulo de vistas según el rol y vista
  try {
    switch (viewId) {
      // ── Postulante (módulo público sin sesión) ────────────
      case 'post-inicio':      PostulanteViews.renderInicio(container);       break;
      case 'post-solicitar':   PostulanteViews.renderSolicitar(container);    break;
      case 'post-estado':      PostulanteViews.renderEstado(container);       break;

      // ── Dirección de Bienestar Universitario ──────────────
      case 'dbu-dashboard':     await DBUViews.renderDashboard(container);    break;
      case 'dbu-postulantes':   await DBUViews.renderPostulantes(container);  break;
      case 'dbu-evaluar':       await DBUViews.renderEvaluar(container);      break;
      case 'dbu-lista-espera':  await DBUViews.renderListaEspera(container);  break;
      case 'dbu-beneficiarios': await DBUViews.renderBeneficiarios(container);break;
      case 'dbu-reportes':      await DBUViews.renderReportes(container);     break;

      // ── Beneficiario ──────────────────────────────────────
      case 'inicio':           BeneficiarioViews.renderInicio(container);         break;
      case 'mi-beneficio':     BeneficiarioViews.renderMiBeneficio(container);    break;
      case 'mis-asistencias':  BeneficiarioViews.renderMisAsistencias(container); break;
      case 'justificacion':    BeneficiarioViews.renderJustificacion(container);  break;
      case 'notificaciones':   await BeneficiarioViews.renderNotificaciones(container); break;

      // ── Asistente Social ──────────────────────────────────
      case 'dashboard':        SocialViews.renderDashboard(container);        break;
      case 'beneficiarios':    SocialViews.renderBeneficiarios(container);    break;
      case 'asistencias':      SocialViews.renderAsistencias(container);      break;
      case 'justificaciones':  SocialViews.renderJustificaciones(container);  break;
      case 'reportes':         SocialViews.renderReportesSocial(container);   break;

      // ── Scanner (accesible desde Asistente Social) ────────
      case 'scanner-qr':       ScannerViews.renderQR(container);       break;
      case 'scanner-barcode':  ScannerViews.renderBarcode(container);  break;
      case 'scanner-dni':      ScannerViews.renderDNI(container);      break;
      case 'scanner-confirm':  ScannerViews.renderConfirm(container);  break;

      // ── Reportes (accesible desde Asistente Social) ───────
      case 'rep-pdf':          ReportesViews.renderPDF(container);          break;
      case 'rep-excel':        ReportesViews.renderExcel(container);        break;
      case 'rep-estadisticas': ReportesViews.renderEstadisticas(container); break;
      case 'rep-graficos':     ReportesViews.renderGraficos(container);     break;

      // ── Administrador ─────────────────────────────────────
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
const MOBILE_NAV_CONFIG = {
  postulante: [
    { id: 'post-inicio',    icon: '🏠', label: 'Inicio' },
    { id: 'post-solicitar', icon: '📤', label: 'Postular' },
    { id: 'post-estado',    icon: '🔍', label: 'Estado' },
  ],
  dbu: [
    { id: 'dbu-dashboard',   icon: '🏠', label: 'Inicio' },
    { id: 'dbu-postulantes', icon: '📋', label: 'Postulantes' },
    { id: 'dbu-evaluar',     icon: '⚖️', label: 'Evaluar' },
    { id: 'dbu-beneficiarios',icon:'👥', label: 'Activos' },
  ],
  beneficiario: [
    { id: 'inicio',          icon: '🏠', label: 'Inicio' },
    { id: 'mi-beneficio',    icon: '🎓', label: 'Beneficio' },
    { id: 'mis-asistencias', icon: '📅', label: 'Asistencia' },
    { id: 'notificaciones',  icon: '🔔', label: 'Alertas' },
  ],
  asistenta_social: [
    { id: 'dashboard',      icon: '🏠', label: 'Inicio' },
    { id: 'asistencias',    icon: '📋', label: 'Asistencia' },
    { id: 'beneficiarios',  icon: '👥', label: 'Padrón' },
    { id: 'reportes',       icon: '📊', label: 'Reportes' },
  ],
  admin: [
    { id: 'admin-usuarios',  icon: '👤', label: 'Usuarios' },
    { id: 'admin-roles',     icon: '🔑', label: 'Roles' },
    { id: 'admin-respaldos', icon: '💾', label: 'Respaldos' },
    { id: 'admin-config',    icon: '⚙️', label: 'Config' },
  ],
};

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

function closeMobileSidebar() {
  const sidebar = $('sidebar');
  const overlay = $('sidebar-overlay');
  sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('visible');
}

// ─── Privados ─────────────────────────────────────────────────

/** Actualiza la info de usuario en la cabecera del sidebar y top header */
async function _renderUserInfo(role, user) {
  const ROLE_LABELS = {
    postulante:       'Módulo Postulante',
    dbu:              'Dirección de Bienestar',
    beneficiario:     'Portal Estudiantil',
    asistenta_social: 'Asistente Social',
    admin:            'Administrador',
  };

  const roleTag = $('header-role-tag');
  if (roleTag) roleTag.textContent = ROLE_LABELS[role] || role;

  const studentInfoPanel = $('student-header-info');

  if (role === 'postulante') {
    // Postulante: no hay usuario autenticado, mostrar info genérica
    if (studentInfoPanel) studentInfoPanel.style.display = 'none';
    $('sidebar-avatar').textContent    = '📝';
    $('sidebar-user-name').textContent = 'Portal Público';
    $('sidebar-user-role').textContent = 'Sin autenticación requerida';

  } else if (role === 'beneficiario' && user) {
    if (studentInfoPanel) studentInfoPanel.style.display = 'flex';
    const avatarEl  = $('header-student-avatar');
    const codeEl    = $('header-student-code');
    const careerEl  = $('header-student-career');
    const nameEl    = $('header-student-name');

    if (avatarEl)  avatarEl.textContent  = user.avatar || 'E';
    if (codeEl)    codeEl.textContent    = user.dni || '—';
    if (careerEl)  careerEl.textContent  = (user.carrera || '—').toUpperCase();
    if (nameEl)    nameEl.textContent    = (user.nombre || '—').toUpperCase();

    $('sidebar-avatar').textContent    = user.avatar || 'E';
    $('sidebar-user-name').textContent = user.nombre || '—';
    $('sidebar-user-role').textContent = 'Beneficiario';

  } else {
    if (studentInfoPanel) studentInfoPanel.style.display = 'none';
    $('sidebar-avatar').textContent    = user?.avatar    || role[0].toUpperCase();
    $('sidebar-user-name').textContent = user?.nombre    || 'Personal';
    $('sidebar-user-role').textContent = ROLE_LABELS[role] || role;
  }
}

/** Actualiza el reloj de la cabecera */
function _updateClock() {
  const el = $('header-date');
  if (el) el.textContent = getTodayDisplay ? getTodayDisplay() : new Date().toLocaleDateString('es-PE');
}

/** Actualiza el subtítulo del header móvil según la vista activa */
function _updateMobileHeader(viewId) {
  const subEl = $('mobile-header-subtitle');
  if (!subEl) return;
  const [, sub] = HEADER_LABELS[viewId] || ['', 'Comedor Universitario'];
  subEl.textContent = sub || 'Comedor Universitario';
}

/** Actualiza el badge de notificaciones no leídas */
function _updateNotifBadge() {
  const badge = $('notif-count');
  if (!badge || !App.currentUserId) { if (badge) badge.style.display = 'none'; return; }
  const unread = (typeof NotificacionesService !== 'undefined')
    ? NotificacionesService.countUnread(App.currentUserId)
    : 0;
  badge.textContent   = unread;
  badge.style.display = unread > 0 ? 'flex' : 'none';
}

/** Abre/cierra el panel de notificaciones */
function toggleNotifPanel() {
  if (App.currentRole === 'beneficiario') {
    navigateTo('notificaciones');
  } else {
    showToast('info', 'Notificaciones', 'Panel de notificaciones del sistema.');
  }
}

// ─── Lógica de Autenticación (Login por DNI) ──────────────────

window._selectedAuthRole = null;

/**
 * Muestra el panel de Login para el rol seleccionado.
 * Solo para módulos con autenticación (no para Postulante).
 */
window.showAuthForm = function(role) {
  window._selectedAuthRole = role;

  const ROLE_TITLES = {
    beneficiario:     'Portal de Beneficiario',
    dbu:              'Dirección de Bienestar Universitario',
    asistenta_social: 'Portal de Asistente Social',
    admin:            'Portal de Administrador / Técnico',
  };

  $('login-username').value = '';
  $('login-password').value = '';

  $('auth-title').textContent    = ROLE_TITLES[role] || 'Ingreso al Sistema';
  $('auth-subtitle').textContent = 'Ingresa tu DNI y contraseña para acceder';
  $('username-label').textContent = 'DNI';

  $('roles-grid').style.display          = 'none';
  $('role-selector-header').style.display = 'none';
  $('role-selector-footer').style.display = 'none';
  $('auth-panel').style.display          = 'flex';
};

/**
 * Vuelve a la selección de módulos.
 */
window.hideAuthForm = function() {
  window._selectedAuthRole = null;
  $('auth-panel').style.display          = 'none';
  $('roles-grid').style.display          = 'grid';
  $('role-selector-header').style.display = 'block';
  $('role-selector-footer').style.display = 'block';
};

/**
 * Envía el formulario de Login por DNI.
 */
window.submitLogin = async function() {
  const dni  = $('login-username').value.trim();
  const pass = $('login-password').value.trim();

  if (!dni || !pass) {
    showToast('warning', 'Campos obligatorios', 'Por favor ingresa tu DNI y contraseña.');
    return;
  }

  showToast('info', 'Autenticando...', 'Verificando tus datos en el sistema.');

  const res = await UsuariosService.autenticar(window._selectedAuthRole, dni, pass);

  if (res.ok) {
    showToast('success', '¡Acceso Correcto!', `Bienvenido, ${res.user.nombre}.`);
    window.hideAuthForm();
    await selectRole(window._selectedAuthRole, res.user);
  } else {
    showToast('error', 'Error de ingreso', res.error || 'DNI o contraseña incorrectos.');
  }
};

// ─── Modal de Restablecimiento de Contraseña ─────────────────

window.openResetModal = function() {
  $('reset-dni').value         = '';
  $('reset-email').value       = '';
  $('reset-new-pwd').value     = '';
  $('reset-confirm-pwd').value = '';
  $('modal-reset-pwd').style.display = 'flex';
};

window.closeResetModal = function() {
  $('modal-reset-pwd').style.display = 'none';
};

window.submitResetPassword = async function() {
  const dni      = $('reset-dni').value.trim();
  const email    = $('reset-email').value.trim();
  const newPwd   = $('reset-new-pwd').value.trim();
  const confirm  = $('reset-confirm-pwd').value.trim();

  if (!dni || !email || !newPwd || !confirm) {
    showToast('warning', 'Campos incompletos', 'Completa todos los campos del formulario.');
    return;
  }
  if (newPwd !== confirm) {
    showToast('error', 'Contraseñas no coinciden', 'Las contraseñas ingresadas no son iguales.');
    return;
  }
  if (newPwd.length < 6) {
    showToast('warning', 'Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.');
    return;
  }

  showToast('info', 'Procesando...', 'Verificando tu identidad en el sistema.');

  const res = await UsuariosService.restablecerContrasena(dni, email, newPwd);

  if (res.ok) {
    showToast('success', '¡Contraseña actualizada!', 'Ya puedes iniciar sesión con tu nueva contraseña.');
    closeResetModal();
    // Pre-llenar DNI en el campo de login
    $('login-username').value = dni;
  } else {
    showToast('error', 'Error', res.error || 'No se pudo actualizar la contraseña.');
  }
};

// Cerrar modal al hacer clic fuera de él
$('modal-reset-pwd')?.addEventListener('click', function(e) {
  if (e.target === this) closeResetModal();
});
