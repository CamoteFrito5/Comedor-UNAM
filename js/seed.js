/* ============================================================
   seed.js — Datos de Prueba / Mock Database
   ============================================================
   Datos iniciales que simulan la base de datos PostgreSQL.
   Se usan cuando USE_SUPABASE = false en config.js.
   
   ⚠️ NO modificar la estructura de los objetos — cada campo
   debe coincidir con la columna equivalente en Supabase.
   
   Cuando conectes Supabase, este archivo permanece como
   referencia del schema esperado.
   ============================================================ */

const SEED = {

  // ──────────────────────────────────────────────────────────
  // Tabla: configuracion
  // ──────────────────────────────────────────────────────────
  config: {
    institucion:                  'Universidad Nacional de Moquegua',
    filial:                       'Filial Ilo',
    turno_desayuno:               '07:00 - 08:30',
    turno_almuerzo:               '12:00 - 14:00',
    turno_cena:                   '18:00 - 19:30',
    max_ausencias_consecutivas:   3,
    max_ausencias_mes:            5,
    periodo_actual:               '2026-I',
    ciclo:                        '2026-I',
    capacidad_comedor:            80,
    costo_racion:                 0.50,
  },

  // ──────────────────────────────────────────────────────────
  // Tabla: usuarios
  // ──────────────────────────────────────────────────────────
  users: [
    { id: 'USR001', nombre: 'María Elena Quispe Torres',   rol: 'beneficiario',    dni: '72345678', email: 'mquispe@unam.edu.pe',    activo: true,  avatar: 'MEQ', carrera: 'Ingeniería Civil',     ciclo: 4, codigo: '2022001' },
    { id: 'USR002', nombre: 'Carlos Alberto Mamani Flores',rol: 'beneficiario',    dni: '71234567', email: 'cmamani@unam.edu.pe',     activo: true,  avatar: 'CAM', carrera: 'Administración',       ciclo: 6, codigo: '2020002' },
    { id: 'USR003', nombre: 'Lucía Fernández Condori',     rol: 'beneficiario',    dni: '73456789', email: 'lfernandez@unam.edu.pe',  activo: true,  avatar: 'LFC', carrera: 'Enfermería',           ciclo: 2, codigo: '2024003' },
    { id: 'USR004', nombre: 'Diego Raúl Huanca López',     rol: 'beneficiario',    dni: '74567890', email: 'dhuanca@unam.edu.pe',     activo: true,  avatar: 'DHL', carrera: 'Ingeniería Ambiental', ciclo: 8, codigo: '2018004' },
    { id: 'USR005', nombre: 'Ana Sofía Calizaya Puma',     rol: 'beneficiario',    dni: '75678901', email: 'acalizaya@unam.edu.pe',   activo: false, avatar: 'ASC', carrera: 'Contabilidad',         ciclo: 3, codigo: '2023005', suspension_razon: 'Supera límite de ausencias consecutivas', suspension_fecha: '2026-07-01' },
    { id: 'USR006', nombre: 'Rosa Liceth Vargas Nina',     rol: 'asistenta_social',dni: '20123456', email: 'rvargas@unam.edu.pe',     activo: true,  avatar: 'RLV', cargo: 'Asistenta Social UNAM Ilo' },
    { id: 'USR007', nombre: 'Administrador Sistema',        rol: 'admin',           dni: '00000001', email: 'admin@unam.edu.pe',       activo: true,  avatar: 'ADM', cargo: 'Administrador TI' },
    { id: 'USR008', nombre: 'Kevin Jair Apaza Rojas',      rol: 'beneficiario',    dni: '76789012', email: 'kapaza@unam.edu.pe',      activo: true,  avatar: 'KJA', carrera: 'Ingeniería Civil',     ciclo: 5, codigo: '2021006' },
    { id: 'USR009', nombre: 'Valeria Ortiz Calcina',       rol: 'beneficiario',    dni: '77890123', email: 'vortiz@unam.edu.pe',      activo: true,  avatar: 'VOC', carrera: 'Psicología',           ciclo: 1, codigo: '2025007' },
    { id: 'USR010', nombre: 'Jhon Paul Ticona Bernedo',    rol: 'beneficiario',    dni: '78901234', email: 'jticona@unam.edu.pe',     activo: true,  avatar: 'JPT', carrera: 'Administración',       ciclo: 7, codigo: '2019008' },
  ],

  // ──────────────────────────────────────────────────────────
  // Tabla: beneficiarios
  // ──────────────────────────────────────────────────────────
  beneficiarios: [
    { id: 'BEN001', usuario_id: 'USR001', fecha_inicio: '2026-03-01', fecha_fin: '2026-07-31', estado: 'activo',     score_socioeconomico: 78, turno: 'almuerzo', qr_code: 'QR-2026-001', ausencias_consecutivas: 1, ausencias_mes: 2 },
    { id: 'BEN002', usuario_id: 'USR002', fecha_inicio: '2026-03-01', fecha_fin: '2026-07-31', estado: 'activo',     score_socioeconomico: 82, turno: 'almuerzo', qr_code: 'QR-2026-002', ausencias_consecutivas: 0, ausencias_mes: 1 },
    { id: 'BEN003', usuario_id: 'USR003', fecha_inicio: '2026-03-01', fecha_fin: '2026-07-31', estado: 'activo',     score_socioeconomico: 91, turno: 'almuerzo', qr_code: 'QR-2026-003', ausencias_consecutivas: 0, ausencias_mes: 0 },
    { id: 'BEN004', usuario_id: 'USR004', fecha_inicio: '2026-03-01', fecha_fin: '2026-07-31', estado: 'activo',     score_socioeconomico: 65, turno: 'almuerzo', qr_code: 'QR-2026-004', ausencias_consecutivas: 2, ausencias_mes: 3 },
    { id: 'BEN005', usuario_id: 'USR005', fecha_inicio: '2026-03-01', fecha_fin: '2026-07-31', estado: 'suspendido', score_socioeconomico: 55, turno: 'almuerzo', qr_code: 'QR-2026-005', ausencias_consecutivas: 3, ausencias_mes: 5 },
    { id: 'BEN006', usuario_id: 'USR008', fecha_inicio: '2026-03-01', fecha_fin: '2026-07-31', estado: 'activo',     score_socioeconomico: 73, turno: 'almuerzo', qr_code: 'QR-2026-006', ausencias_consecutivas: 0, ausencias_mes: 1 },
    { id: 'BEN007', usuario_id: 'USR009', fecha_inicio: '2026-05-01', fecha_fin: '2026-07-31', estado: 'activo',     score_socioeconomico: 88, turno: 'almuerzo', qr_code: 'QR-2026-007', ausencias_consecutivas: 0, ausencias_mes: 0 },
    { id: 'BEN008', usuario_id: 'USR010', fecha_inicio: '2026-03-01', fecha_fin: '2026-07-31', estado: 'activo',     score_socioeconomico: 69, turno: 'almuerzo', qr_code: 'QR-2026-008', ausencias_consecutivas: 1, ausencias_mes: 2 },
  ],

  // ──────────────────────────────────────────────────────────
  // Tabla: postulantes
  // ──────────────────────────────────────────────────────────
  postulantes: [
    { id: 'POST001', nombre: 'Fernando Lazo Ccama',   dni: '79012345', email: 'flazo@unam.edu.pe',   carrera: 'Ingeniería Civil',  ciclo: 3, score_socioeconomico: 85, fecha_postulacion: '2026-07-05', estado: 'pendiente', documentos: ['partida_nac.pdf','recibo_luz.pdf','declaracion_jurada.pdf'],                                      observaciones: '' },
    { id: 'POST002', nombre: 'Melissa Choque Apaza',  dni: '80123456', email: 'mchoque@unam.edu.pe',  carrera: 'Enfermería',        ciclo: 1, score_socioeconomico: 92, fecha_postulacion: '2026-07-06', estado: 'pendiente', documentos: ['partida_nac.pdf','recibo_agua.pdf','ficha_socioeconomica.pdf'],                                   observaciones: '' },
    { id: 'POST003', nombre: 'Roberto Suca Vilca',    dni: '81234567', email: 'rsuca@unam.edu.pe',    carrera: 'Contabilidad',      ciclo: 5, score_socioeconomico: 61, fecha_postulacion: '2026-07-03', estado: 'observado', documentos: ['partida_nac.pdf'],                                                                                 observaciones: 'Falta ficha socioeconómica completa' },
    { id: 'POST004', nombre: 'Diana Lucila Paz Rios', dni: '82345678', email: 'dpaz@unam.edu.pe',     carrera: 'Psicología',        ciclo: 2, score_socioeconomico: 77, fecha_postulacion: '2026-07-08', estado: 'pendiente', documentos: ['partida_nac.pdf','recibo_luz.pdf','declaracion_jurada.pdf','constancia_trabajo_padre.pdf'],        observaciones: '' },
    { id: 'POST005', nombre: 'Julio Mamani Quispe',   dni: '83456789', email: 'jmamani@unam.edu.pe',  carrera: 'Administración',    ciclo: 4, score_socioeconomico: 70, fecha_postulacion: '2026-07-01', estado: 'aprobado',  documentos: ['partida_nac.pdf','recibo_luz.pdf'],                                                               observaciones: 'Aprobado. Inicia desde el 15/07/2026' },
  ],

  // ──────────────────────────────────────────────────────────
  // Tabla: lista_espera
  // ──────────────────────────────────────────────────────────
  lista_espera: [
    { id: 'ESP001', nombre: 'Carmen Rosa Turpo Huanca', dni: '84567890', carrera: 'Ingeniería Ambiental', ciclo: 2, score_socioeconomico: 80, fecha_registro: '2026-06-20', posicion: 1 },
    { id: 'ESP002', nombre: 'Adrián Ccopa Mamani',      dni: '85678901', carrera: 'Ingeniería Civil',     ciclo: 4, score_socioeconomico: 75, fecha_registro: '2026-06-22', posicion: 2 },
    { id: 'ESP003', nombre: 'Noemí Arapa Condori',      dni: '86789012', carrera: 'Enfermería',           ciclo: 3, score_socioeconomico: 72, fecha_registro: '2026-06-25', posicion: 3 },
    { id: 'ESP004', nombre: 'Héctor Tito Layme',        dni: '87890123', carrera: 'Psicología',           ciclo: 1, score_socioeconomico: 68, fecha_registro: '2026-06-28', posicion: 4 },
    { id: 'ESP005', nombre: 'Inés Velásquez Cruz',      dni: '88901234', carrera: 'Contabilidad',         ciclo: 6, score_socioeconomico: 63, fecha_registro: '2026-07-02', posicion: 5 },
  ],

  // ──────────────────────────────────────────────────────────
  // Tabla: asistencias
  // ──────────────────────────────────────────────────────────
  asistencias: [
    // USR001 — histórico
    { id: 'ASI001', beneficiario_id: 'BEN001', fecha: '2026-07-14', turno: 'almuerzo', metodo: 'qr',      hora: '12:15', registrado_por: 'terminal_01' },
    { id: 'ASI002', beneficiario_id: 'BEN001', fecha: '2026-07-11', turno: 'almuerzo', metodo: 'qr',      hora: '12:22', registrado_por: 'terminal_01' },
    { id: 'ASI003', beneficiario_id: 'BEN001', fecha: '2026-07-10', turno: 'almuerzo', metodo: 'qr',      hora: '12:08', registrado_por: 'terminal_01' },
    { id: 'ASI004', beneficiario_id: 'BEN001', fecha: '2026-07-09', turno: 'almuerzo', metodo: 'dni',     hora: '12:31', registrado_por: 'terminal_01' },
    { id: 'ASI005', beneficiario_id: 'BEN001', fecha: '2026-07-08', turno: 'almuerzo', metodo: 'qr',      hora: '12:18', registrado_por: 'terminal_01' },
    { id: 'ASI006', beneficiario_id: 'BEN001', fecha: '2026-07-07', turno: 'almuerzo', metodo: 'qr',      hora: '12:05', registrado_por: 'terminal_01' },
    { id: 'ASI007', beneficiario_id: 'BEN001', fecha: '2026-07-04', turno: 'almuerzo', metodo: 'qr',      hora: '12:20', registrado_por: 'terminal_01' },
    { id: 'ASI008', beneficiario_id: 'BEN001', fecha: '2026-07-03', turno: 'almuerzo', metodo: 'qr',      hora: '12:12', registrado_por: 'terminal_01' },
    { id: 'ASI009', beneficiario_id: 'BEN001', fecha: '2026-07-01', turno: 'almuerzo', metodo: 'qr',      hora: '12:09', registrado_por: 'terminal_01' },
    { id: 'ASI010', beneficiario_id: 'BEN001', fecha: '2026-06-30', turno: 'almuerzo', metodo: 'qr',      hora: '12:25', registrado_por: 'terminal_01' },
    // Otras asistencias de hoy
    { id: 'ASI011', beneficiario_id: 'BEN002', fecha: '2026-07-14', turno: 'almuerzo', metodo: 'qr',      hora: '12:10', registrado_por: 'terminal_01' },
    { id: 'ASI012', beneficiario_id: 'BEN003', fecha: '2026-07-14', turno: 'almuerzo', metodo: 'barcode', hora: '12:14', registrado_por: 'terminal_01' },
    { id: 'ASI013', beneficiario_id: 'BEN006', fecha: '2026-07-14', turno: 'almuerzo', metodo: 'qr',      hora: '12:30', registrado_por: 'terminal_01' },
    { id: 'ASI014', beneficiario_id: 'BEN007', fecha: '2026-07-14', turno: 'almuerzo', metodo: 'qr',      hora: '12:45', registrado_por: 'terminal_01' },
  ],

  // ──────────────────────────────────────────────────────────
  // Tabla: ausencias
  // ──────────────────────────────────────────────────────────
  ausencias: [
    { id: 'AUS001', beneficiario_id: 'BEN001', fecha: '2026-07-02', turno: 'almuerzo', justificado: true,  justificacion_id: 'JUS001' },
    { id: 'AUS002', beneficiario_id: 'BEN001', fecha: '2026-07-05', turno: 'almuerzo', justificado: false, justificacion_id: null },
    { id: 'AUS003', beneficiario_id: 'BEN004', fecha: '2026-07-10', turno: 'almuerzo', justificado: false, justificacion_id: null },
    { id: 'AUS004', beneficiario_id: 'BEN004', fecha: '2026-07-11', turno: 'almuerzo', justificado: false, justificacion_id: null },
    { id: 'AUS005', beneficiario_id: 'BEN005', fecha: '2026-06-28', turno: 'almuerzo', justificado: false, justificacion_id: null },
    { id: 'AUS006', beneficiario_id: 'BEN005', fecha: '2026-06-29', turno: 'almuerzo', justificado: false, justificacion_id: null },
    { id: 'AUS007', beneficiario_id: 'BEN005', fecha: '2026-06-30', turno: 'almuerzo', justificado: false, justificacion_id: null },
  ],

  // ──────────────────────────────────────────────────────────
  // Tabla: justificaciones
  // ──────────────────────────────────────────────────────────
  justificaciones: [
    { id: 'JUS001', beneficiario_id: 'BEN001', fecha_ausencia: '2026-07-02', motivo: 'Cita médica en el hospital',          documento: 'certificado_medico.pdf',    estado: 'aprobado', fecha_solicitud: '2026-07-03', fecha_resolucion: '2026-07-04', aprobado_por: 'USR006', observaciones: 'Documento válido. Ausencia justificada.' },
    { id: 'JUS002', beneficiario_id: 'BEN004', fecha_ausencia: '2026-07-10', motivo: 'Viaje por emergencia familiar',       documento: 'declaracion_jurada.pdf',    estado: 'pendiente',fecha_solicitud: '2026-07-11', fecha_resolucion: null,         aprobado_por: null,     observaciones: '' },
    { id: 'JUS003', beneficiario_id: 'BEN001', fecha_ausencia: '2026-07-05', motivo: 'Examen parcial en horario de cruce', documento: 'cronograma_examenes.pdf',   estado: 'pendiente',fecha_solicitud: '2026-07-07', fecha_resolucion: null,         aprobado_por: null,     observaciones: '' },
  ],

  // ──────────────────────────────────────────────────────────
  // Tabla: notificaciones
  // ──────────────────────────────────────────────────────────
  notificaciones: [
    { id: 'NOT001', usuario_id: 'USR001', tipo: 'info',    titulo: 'Bienvenido al Sistema',        mensaje: 'Tu beneficio del comedor universitario está activo para el semestre 2026-I.',                                                                                  fecha: '2026-03-01', leido: true  },
    { id: 'NOT002', usuario_id: 'USR001', tipo: 'warning', titulo: 'Ausencia registrada',          mensaje: 'Se registró una ausencia el 05/07/2026. Recuerda presentar tu justificación dentro de 48 horas.',                                                            fecha: '2026-07-05', leido: false },
    { id: 'NOT003', usuario_id: 'USR001', tipo: 'success', titulo: 'Justificación aprobada',       mensaje: 'Tu justificación del 02/07/2026 ha sido aprobada por la Asistenta Social.',                                                                                   fecha: '2026-07-04', leido: false },
    { id: 'NOT004', usuario_id: 'USR005', tipo: 'danger',  titulo: 'Beneficio suspendido',         mensaje: 'Tu beneficio ha sido suspendido por superar el límite de ausencias consecutivas (3). Acércate a Bienestar Universitario.',                                   fecha: '2026-07-01', leido: false },
    { id: 'NOT005', usuario_id: 'USR001', tipo: 'info',    titulo: 'Encuesta de satisfacción',    mensaje: 'Por favor completa la encuesta de calidad del servicio del comedor universitario.',                                                                            fecha: '2026-07-10', leido: false },
  ],

  // ──────────────────────────────────────────────────────────
  // Tabla: auditoria
  // ──────────────────────────────────────────────────────────
  auditoria: [
    { id: 'AUD001', usuario: 'Rosa Vargas Nina',      accion: 'Aprobación de postulación',   detalle: 'Postulante Julio Mamani Quispe aprobado',                         fecha: '2026-07-12 10:35', ip: '192.168.1.50'  },
    { id: 'AUD002', usuario: 'Rosa Vargas Nina',      accion: 'Resolución de justificación', detalle: 'Justificación JUS001 de María Elena Quispe aprobada',             fecha: '2026-07-04 09:15', ip: '192.168.1.50'  },
    { id: 'AUD003', usuario: 'terminal_01',           accion: 'Registro de asistencia',      detalle: 'Asistencia registrada para BEN001 - método QR',                   fecha: '2026-07-14 12:15', ip: '192.168.1.101' },
    { id: 'AUD004', usuario: 'Administrador Sistema', accion: 'Respaldo de base de datos',   detalle: 'Backup_2026-07-13.zip generado correctamente',                    fecha: '2026-07-13 22:00', ip: '192.168.1.1'   },
    { id: 'AUD005', usuario: 'Rosa Vargas Nina',      accion: 'Suspensión automática',       detalle: 'Beneficio de Ana Calizaya Puma suspendido por ausencias',          fecha: '2026-07-01 00:01', ip: 'sistema'       },
    { id: 'AUD006', usuario: 'Administrador Sistema', accion: 'Creación de usuario',         detalle: 'Usuario terminal_02 creado para Laboratorio B',                   fecha: '2026-07-08 14:00', ip: '192.168.1.1'   },
  ],

  // ──────────────────────────────────────────────────────────
  // Tabla: roles
  // ──────────────────────────────────────────────────────────
  roles: [
    { id: 'ROL001', nombre: 'Administrador',    descripcion: 'Acceso total al sistema',                              permisos: ['all'] },
    { id: 'ROL002', nombre: 'Asistenta Social', descripcion: 'Gestión de beneficiarios y postulantes',              permisos: ['beneficiarios.read','beneficiarios.write','postulantes.*','justificaciones.*','reportes.read'] },
    { id: 'ROL003', nombre: 'Beneficiario',     descripcion: 'Acceso al portal estudiantil',                        permisos: ['perfil.read','asistencias.read','justificaciones.write','notificaciones.read'] },
    { id: 'ROL004', nombre: 'Terminal',         descripcion: 'Registro de asistencia vía terminal',                 permisos: ['asistencias.write','beneficiarios.read'] },
  ],

  // ──────────────────────────────────────────────────────────
  // Datos estadísticos mensuales (para gráficos)
  // ──────────────────────────────────────────────────────────
  estadisticas_mensuales: [
    { mes: 'Marzo', asistencias: 420, ausencias: 45, tasa: 90.3 },
    { mes: 'Abril', asistencias: 398, ausencias: 62, tasa: 86.5 },
    { mes: 'Mayo',  asistencias: 445, ausencias: 38, tasa: 92.1 },
    { mes: 'Junio', asistencias: 412, ausencias: 58, tasa: 87.6 },
    { mes: 'Julio', asistencias: 285, ausencias: 30, tasa: 90.5 },
  ],

};
