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

async function selectRole(role) {
  App.currentRole   = role;
  App.currentUserId = DEMO_USER_BY_ROLE[role] || null;

  // Actualizar info de usuario en sidebar y top-header
  await _renderUserInfo(role);

  // Construir navegación del sidebar
  renderSidebar(role);

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

  // Delegar al módulo de vistas según el rol y vista
  try {
    switch (viewId) {
      // ── Beneficiario ──────────────────────────────
      case 'inicio':           BeneficiarioViews.renderInicio(container);         break;
      case 'mi-beneficio':     BeneficiarioViews.renderMiBeneficio(container);    break;
      case 'mis-asistencias':  BeneficiarioViews.renderMisAsistencias(container); break;
      case 'postulacion':      BeneficiarioViews.renderPostulacion(container);    break;
      case 'justificacion':    BeneficiarioViews.renderJustificacion(container);  break;
      case 'notificaciones':   BeneficiarioViews.renderNotificaciones(container); break;

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
      <button class="nav-item" data-view="${item.id}" onclick="navigateTo('${item.id}')">
        <span class="nav-icon">${item.icon}</span>
        ${item.label}
        ${badgeHtml}
      </button>`;
  }).join('');
}

// ─── Privados ─────────────────────────────────────────────────

/** Actualiza la info de usuario en la cabecera del sidebar y top header */
async function _renderUserInfo(role) {
  const ROLE_LABELS = {
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

  if (role === 'beneficiario') {
    if (studentInfoPanel) studentInfoPanel.style.display = 'flex';
    
    let user = null;
    if (USE_SUPABASE) {
      try {
        const { data: ben } = await BeneficiariosService.getByDNI('72345678'); // DNI de demo María Elena
        if (ben && ben.usuario) {
          user = ben.usuario;
        }
      } catch (err) {
        console.warn('Error cargando estudiante de Supabase:', err);
      }
    }
    
    if (!user) {
      user = DB.getOne('users', 'USR001'); // Fallback local
    }

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
      $('sidebar-user-role').textContent = 'Estudiante';
    }
  } else {
    if (studentInfoPanel) studentInfoPanel.style.display = 'none';

    const userId = DEMO_USER_BY_ROLE[role];
    const user   = userId ? DB.getOne('users', userId) : null;

    $('sidebar-avatar').textContent    = user?.avatar    || role[0].toUpperCase();
    $('sidebar-user-name').textContent = user?.nombre    || 'Terminal';
    $('sidebar-user-role').textContent = ROLE_LABELS[role] || role;
  }
}

/** Actualiza el reloj de la cabecera */
function _updateClock() {
  const el = $('header-date');
  if (el) el.textContent = getTodayDisplay();
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
