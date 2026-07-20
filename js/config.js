/* ============================================================
   config.js — Configuración Global de la Aplicación
   ============================================================
   Constantes que controlan el comportamiento de la app.
   Único lugar para cambiar nombres de tablas, rutas de
   Supabase, límites de negocio, y configuración de la UI.
   ============================================================ */

// ─── Supabase ────────────────────────────────────────────────
const SUPABASE_URL      = 'https://hrgkvblifsboxrocxqtv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZ2t2YmxpZnNib3hyb2N4cXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjc1OTIsImV4cCI6MjA5OTc0MzU5Mn0.7nxUzCvnytwhJ5eM6hjCly97DQai3q91TM64Nu_AGRs';

// Cambia a true cuando Supabase esté configurado.
const USE_SUPABASE = true;

// ─── Nombres de tablas PostgreSQL ────────────────────────────
// Si tu schema usa nombres distintos, cámbialos aquí.
const TABLE = {
  usuario:         'usuario',
  estudiante:      'estudiante',
  personal:        'personal',
  postulacion:     'postulacion',
  beneficiario:    'beneficiario',
  asistencia:      'asistencia',
  solicitud:       'solicitud',
  rol:             'rol',
  estado:          'estado',
  horario:         'horario',
  tipo_racion:     'tipo_racion',
  escuela:         'escuela_profesional',
  cargo:           'cargo',
};

// ─── Información institucional ────────────────────────────────
const INSTITUCION = {
  nombre:  'Universidad Nacional de Moquegua',
  filial:  'Filial Ilo',
  periodo: '2026-I',
  version: '2.0.0',
};

// ─── Reglas de negocio ────────────────────────────────────────
const REGLAS = {
  max_ausencias_consecutivas: 3,   // Suspensión automática
  max_ausencias_mes:          5,   // Límite mensual
  plazo_justificacion_horas:  48,  // Horas para presentar FUT
  capacidad_comedor:          80,  // Cupos totales
};

// ─── Mapeo Roles de la BD → Claves del Frontend ──────────────
// Coincide con los IDs de la tabla `rol` en PostgreSQL.
const DB_ROLE_MAP = {
  1: 'admin',
  2: 'dbu',
  3: 'asistenta_social',
  4: 'beneficiario',
  5: 'postulante',
};
const FRONTEND_ROLE_MAP = {
  admin:            1,
  dbu:              2,
  asistenta_social: 3,
  beneficiario:     4,
  postulante:       5,
};

// ─── Configuración de navegación por rol ─────────────────────
// Agrega o quita ítems aquí para modificar el sidebar.
const NAV_CONFIG = {
  postulante: [
    { id: 'post-inicio',     icon: '🏠', label: 'Inicio' },
    { id: 'post-solicitar',  icon: '📤', label: 'Enviar Postulación' },
    { id: 'post-estado',     icon: '🔍', label: 'Consultar Estado' },
  ],
  dbu: [
    { id: 'dbu-dashboard',   icon: '📊', label: 'Dashboard' },
    { id: 'dbu-postulantes', icon: '📋', label: 'Postulantes' },
    { id: 'dbu-evaluar',     icon: '⚖️', label: 'Evaluar Expedientes' },
    { id: 'dbu-lista-espera',icon: '⏳', label: 'Lista de Espera' },
    { id: 'dbu-beneficiarios',icon:'👥', label: 'Beneficiarios Activos' },
    { id: 'dbu-reportes',    icon: '📈', label: 'Reportes' },
  ],
  beneficiario: [
    { id: 'inicio',          icon: '🏠', label: 'Inicio' },
    { id: 'mi-beneficio',    icon: '🎓', label: 'Mi Beneficio' },
    { id: 'mis-asistencias', icon: '📅', label: 'Mis Asistencias' },
    { id: 'justificacion',   icon: '📄', label: 'Justificación (FUT)' },
    { id: 'notificaciones',  icon: '🔔', label: 'Notificaciones', badge: true },
  ],
  asistenta_social: [
    { id: 'dashboard',      icon: '📊', label: 'Dashboard' },
    { id: 'beneficiarios',  icon: '👥', label: 'Beneficiarios' },
    { id: 'asistencias',    icon: '✅', label: 'Asistencias' },
    { id: 'justificaciones',icon: '📄', label: 'Justificaciones (FUT)' },
    { id: 'reportes',       icon: '📈', label: 'Reportes' },
  ],
  admin: [
    { id: 'admin-usuarios',  icon: '👤', label: 'Usuarios' },
    { id: 'admin-roles',     icon: '🔑', label: 'Roles' },
    { id: 'admin-permisos',  icon: '🛡️', label: 'Permisos' },
    { id: 'admin-respaldos', icon: '💾', label: 'Respaldos' },
    { id: 'admin-auditoria', icon: '📜', label: 'Auditoría' },
    { id: 'admin-config',    icon: '⚙️', label: 'Configuración' },
  ],
};

// ─── Etiquetas de cabecera por vista ─────────────────────────
const HEADER_LABELS = {
  // Postulante (módulo público)
  'post-inicio':      ['Portal del Postulante',         'Convocatoria Comedor Universitario 2026-I'],
  'post-solicitar':   ['Enviar Postulación',            'Formulario único de postulación en línea'],
  'post-estado':      ['Consultar Estado de Trámite',   'Ingresa tu DNI para ver el estado de tu expediente'],
  // Dirección de Bienestar Universitario
  'dbu-dashboard':    ['Dashboard DBU',                 'Resumen de postulaciones y evaluaciones pendientes'],
  'dbu-postulantes':  ['Postulantes',                   'Expedientes recibidos para evaluación socioeconómica'],
  'dbu-evaluar':      ['Evaluar Expedientes',           'Revisión y aprobación/rechazo de postulaciones'],
  'dbu-lista-espera': ['Lista de Espera',               'Postulantes en cola de espera por vacante'],
  'dbu-beneficiarios':['Beneficiarios Activos',         'Listado de estudiantes con beca alimentaria vigente'],
  'dbu-reportes':     ['Reportes DBU',                  'Estadísticas del proceso de admisión'],
  // Beneficiario
  'inicio':           ['Inicio',                        'Bienvenido a tu portal estudiantil del comedor'],
  'mi-beneficio':     ['Mi Beneficio',                  'Detalle de tu beca del comedor universitario'],
  'mis-asistencias':  ['Mis Asistencias',               'Historial completo de asistencias y faltas'],
  'justificacion':    ['Justificación (FUT)',            'Presenta tu Formulario Único de Trámite'],
  'notificaciones':   ['Notificaciones',                'Tus alertas y comunicaciones del sistema'],
  // Asistente Social
  'dashboard':        ['Dashboard',                     'Resumen operativo del comedor universitario'],
  'beneficiarios':    ['Beneficiarios',                 'Gestión de estudiantes beneficiarios activos'],
  'asistencias':      ['Asistencias',                   'Registro y control de asistencias diarias'],
  'justificaciones':  ['Justificaciones (FUT)',         'Gestión de solicitudes de justificación'],
  'reportes':         ['Reportes',                      'Informes y estadísticas del comedor'],
  // Scanner (accedido desde el módulo de Asistente Social)
  'scanner-qr':       ['Escanear QR',                   'Registro de asistencia por código QR'],
  'scanner-barcode':  ['Código de Barras',              'Registro por código de barras'],
  'scanner-dni':      ['Ingresar DNI',                  'Registro manual por número de DNI'],
  'scanner-confirm':  ['Confirmaciones de Hoy',         'Asistencias registradas en esta sesión'],
  // Administrador
  'admin-usuarios':   ['Usuarios del Sistema',          'Gestión de cuentas de personal y beneficiarios'],
  'admin-roles':      ['Roles del Sistema',             'Configuración de roles y sus permisos'],
  'admin-permisos':   ['Matriz de Permisos',            'Permisos de acceso por módulo y rol'],
  'admin-respaldos':  ['Respaldos',                     'Copias de seguridad de la base de datos'],
  'admin-auditoria':  ['Auditoría del Sistema',         'Registro de actividades y eventos del sistema'],
  'admin-config':     ['Configuración del Sistema',     'Parámetros institucionales y operativos'],
};

// ─── Vista por defecto por rol ────────────────────────────────
const DEFAULT_VIEW = {
  postulante:       'post-inicio',
  dbu:              'dbu-dashboard',
  beneficiario:     'inicio',
  asistenta_social: 'dashboard',
  admin:            'admin-usuarios',
};

// ─── Usuario demo por rol (para modo offline) ─────────────────
const DEMO_USER_BY_ROLE = {
  postulante:       null,
  dbu:              'USR_DBU01',
  beneficiario:     'USR001',
  asistenta_social: 'USR006',
  admin:            'USR007',
};
