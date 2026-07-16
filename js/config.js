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
  usuarios:        'usuarios',
  beneficiarios:   'beneficiarios',
  postulantes:     'postulantes',
  lista_espera:    'lista_espera',
  asistencias:     'asistencias',
  ausencias:       'ausencias',
  justificaciones: 'justificaciones',
  notificaciones:  'notificaciones',
  auditoria:       'auditoria',
  roles:           'roles',
  config:          'configuracion',
};

// ─── Información institucional ────────────────────────────────
const INSTITUCION = {
  nombre:  'Universidad Nacional de Moquegua',
  filial:  'Filial Ilo',
  periodo: '2026-I',
  version: '1.0.0',
};

// ─── Reglas de negocio ────────────────────────────────────────
const REGLAS = {
  max_ausencias_consecutivas: 3,   // Suspensiión automática
  max_ausencias_mes:          5,   // Límite mensual
  plazo_justificacion_horas:  48,  // Horas para presentar FUT
  capacidad_comedor:          80,  // Cupos totales
};

// ─── Configuración de navegación por rol ─────────────────────
// Agrega o quita ítems aquí para modificar el sidebar.
const NAV_CONFIG = {
  postulante: [
    { id: 'post-inicio',     icon: '🏠', label: 'Inicio' },
    { id: 'post-solicitar',  icon: '📋', label: 'Enviar Postulación' },
    { id: 'post-estado',     icon: '🔍', label: 'Estado de Trámite' },
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
    { id: 'postulantes',    icon: '📋', label: 'Postulantes' },
    { id: 'lista-espera',   icon: '⏳', label: 'Lista de Espera' },
    { id: 'asistencias',    icon: '✅', label: 'Asistencias' },
    { id: 'justificaciones',icon: '📄', label: 'Justificaciones (FUT)' },
    { id: 'reportes',       icon: '📈', label: 'Reportes' },
    { id: 'configuracion',  icon: '⚙️', label: 'Configuración' },
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
  'post-inicio':      ['Portal del Postulante',   'Convocatoria Comedor Universitario'],
  'post-solicitar':   ['Enviar Postulación',      'Formulario único de postulación en línea'],
  'post-estado':      ['Estado del Trámite',      'Situación actual de tu expediente socioeconómico'],
  'inicio':           ['Inicio',                  'Bienvenido a tu portal estudiantil'],
  'mi-beneficio':     ['Mi Beneficio',            'Detalle de tu beca del comedor universitario'],
  'mis-asistencias':  ['Mis Asistencias',         'Historial completo de asistencias'],
  'justificacion':    ['Justificación (FUT)',      'Presenta tu Formulario Único de Trámite'],
  'notificaciones':   ['Notificaciones',          'Tus alertas y comunicaciones del sistema'],
  'dashboard':        ['Dashboard',               'Resumen operativo del comedor universitario'],
  'beneficiarios':    ['Beneficiarios',           'Gestión de estudiantes beneficiarios activos'],
  'postulantes':      ['Postulantes',             'Evaluación de nuevas solicitudes'],
  'lista-espera':     ['Lista de Espera',         'Estudiantes en cola para el beneficio'],
  'asistencias':      ['Asistencias',             'Registro y control de asistencias diarias'],
  'justificaciones':  ['Justificaciones (FUT)',   'Gestión de solicitudes de justificación'],
  'reportes':         ['Reportes',                'Informes y estadísticas del comedor'],
  'configuracion':    ['Configuración',           'Parámetros del sistema'],
  'scanner-qr':       ['Escanear QR',             'Registro de asistencia por código QR'],
  'scanner-barcode':  ['Código de Barras',        'Registro por código de barras'],
  'scanner-dni':      ['Ingresar DNI',            'Registro manual por número de DNI'],
  'scanner-confirm':  ['Confirmaciones de Hoy',   'Asistencias registradas en esta sesión'],
  'rep-pdf':          ['Reportes PDF',            'Generación de informes en PDF'],
  'rep-excel':        ['Reportes Excel',          'Exportación de datos a Excel'],
  'rep-estadisticas': ['Estadísticas',            'Indicadores clave de rendimiento'],
  'rep-graficos':     ['Gráficos',                'Visualización de datos del comedor'],
  'admin-usuarios':   ['Usuarios',                'Gestión de cuentas del sistema'],
  'admin-roles':      ['Roles',                   'Configuración de roles del sistema'],
  'admin-permisos':   ['Permisos',                'Matriz de permisos por rol'],
  'admin-respaldos':  ['Respaldos',               'Copias de seguridad de la base de datos'],
  'admin-auditoria':  ['Auditoría',               'Registro de actividades del sistema'],
  'admin-config':     ['Configuración',           'Parámetros generales del sistema'],
};

// ─── Vista por defecto por rol ────────────────────────────────
const DEFAULT_VIEW = {
  postulante:       'post-inicio',
  beneficiario:     'inicio',
  asistenta_social: 'dashboard',
  admin:            'admin-usuarios',
};

// ─── Usuario demo por rol (para modo offline) ─────────────────
const DEMO_USER_BY_ROLE = {
  beneficiario:     'USR001',
  asistenta_social: 'USR006',
  scanner:          null,   // Terminal no tiene usuario asignado
  reportes:         'USR006',
  admin:            'USR007',
};
