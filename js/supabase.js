/* ============================================================
   supabase.js — Cliente Supabase + Capa de Servicios
   ============================================================
   Responsabilidades:
   1. Inicializar el cliente Supabase (si USE_SUPABASE = true)
   2. Exponer servicios por entidad (CRUD + helpers de dominio)
   3. En modo offline (USE_SUPABASE = false), delegar a DB
      que opera sobre localStorage con datos de seed.js
   
   ── CÓMO CONECTAR SUPABASE ───────────────────────────────────
   1. Crea un proyecto en https://supabase.com
   2. En config.js → pon SUPABASE_URL y SUPABASE_ANON_KEY
   3. Cambia USE_SUPABASE = true en config.js
   4. Ejecuta las migraciones SQL de tu schema PostgreSQL
   5. Ajusta los nombres de columna en cada servicio si difieren
   ============================================================ */

// ─── Inicialización del cliente ──────────────────────────────
// El CDN de Supabase expone `supabase` en window.supabase
let _supabaseClient = null;

if (USE_SUPABASE) {
  if (typeof window.supabase !== 'undefined') {
    _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.info('[Supabase] Cliente inicializado correctamente.');
  } else {
    console.error('[Supabase] SDK no encontrado. Verifica el <script> CDN en index.html.');
  }
}

// ─── DB Local (localStorage + seed) ─────────────────────────
// Motor offline compatible. Misma API que los servicios Supabase.
const DB = {
  _data: null,
  _KEY:  'comedor_unam_db_v2',

  /** Inicializa la BD local desde localStorage o seed.js */
  init() {
    const stored = localStorage.getItem(this._KEY);
    this._data   = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(SEED));
    if (!stored) this._save();
    return this;
  },

  /** Persiste el estado actual en localStorage */
  _save() { localStorage.setItem(this._KEY, JSON.stringify(this._data)); },

  /** Reinicia la BD al estado inicial de seed.js */
  reset() { this._data = JSON.parse(JSON.stringify(SEED)); this._save(); },

  // ── CRUD genérico ──────────────────────────────────────────

  /** Lee todos los registros de una colección */
  get(col)        { return this._data[col] || []; },

  /** Lee un registro por ID */
  getOne(col, id) { return (this._data[col] || []).find(r => r.id === id) || null; },

  /** Inserta un nuevo registro */
  add(col, item) {
    if (!this._data[col]) this._data[col] = [];
    this._data[col].push(item);
    this._save();
    return item;
  },

  /** Actualiza campos de un registro por ID */
  update(col, id, changes) {
    const arr = this._data[col] || [];
    const idx = arr.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this._data[col][idx] = { ...arr[idx], ...changes };
    this._save();
    return this._data[col][idx];
  },

  /** Elimina un registro por ID */
  delete(col, id) {
    this._data[col] = (this._data[col] || []).filter(r => r.id !== id);
    this._save();
  },

  /** Genera un ID único con prefijo */
  uid(prefix) { return prefix + String(Date.now()).slice(-6); },
};

// ─── Inicialización automática ───────────────────────────────
DB.init();

// ═════════════════════════════════════════════════════════════
//  SERVICIOS POR ENTIDAD
//  Cada servicio tiene métodos async. En modo online llaman
//  a Supabase. En modo offline llaman a DB.
//  Firma de retorno: { data, error }
// ═════════════════════════════════════════════════════════════

// ─── UsuariosService ─────────────────────────────────────────
const UsuariosService = {

  async getAll() {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.usuarios).select('*');
    }
    return { data: DB.get('users'), error: null };
  },

  async getByDNI(dni) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.usuarios).select('*').eq('dni', dni).single();
    }
    const data = DB.get('users').find(u => u.dni === dni) || null;
    return { data, error: data ? null : 'No encontrado' };
  },

  async create(usuario) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.usuarios).insert(usuario).select().single();
    }
    const newUser = { ...usuario, id: DB.uid('USR') };
    DB.add('users', newUser);
    return { data: newUser, error: null };
  },

  async update(id, changes) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.usuarios).update(changes).eq('id', id).select().single();
    }
    const data = DB.update('users', id, changes);
    return { data, error: null };
  },
};

// ─── BeneficiariosService ────────────────────────────────────
const BeneficiariosService = {

  async getAll() {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.beneficiarios).select('*, usuarios(*)');
    }
    // Offline: enriquecer con datos de usuario
    const bens  = DB.get('beneficiarios');
    const users = DB.get('users');
    const data  = bens.map(b => ({ ...b, usuario: users.find(u => u.id === b.usuario_id) }));
    return { data, error: null };
  },

  async getByUsuarioId(userId) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.beneficiarios).select('*').eq('usuario_id', userId).single();
    }
    const data = DB.get('beneficiarios').find(b => b.usuario_id === userId) || null;
    return { data, error: null };
  },

  async getByDNI(dni) {
    if (USE_SUPABASE) {
      const { data: user } = await _supabaseClient.from(TABLE.usuarios).select('id').eq('dni', dni).single();
      if (!user) return { data: null, error: 'Usuario no encontrado' };
      return await _supabaseClient.from(TABLE.beneficiarios).select('*, usuarios(*)').eq('usuario_id', user.id).single();
    }
    // Offline
    const user = DB.get('users').find(u => u.dni === dni);
    if (!user) return { data: null, error: 'Usuario no encontrado' };
    const ben  = DB.get('beneficiarios').find(b => b.usuario_id === user.id);
    if (!ben)  return { data: null, error: 'No es beneficiario' };
    return { data: { ...ben, usuario: user }, error: null };
  },

  async update(id, changes) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.beneficiarios).update(changes).eq('id', id).select().single();
    }
    return { data: DB.update('beneficiarios', id, changes), error: null };
  },

  async create(beneficiario) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.beneficiarios).insert(beneficiario).select().single();
    }
    const data = DB.add('beneficiarios', { ...beneficiario, id: DB.uid('BEN') });
    return { data, error: null };
  },

  /** Helper de dominio: registra una asistencia con validaciones */
  async registrarAsistencia(dni, metodo) {
    const { data: ben, error } = await this.getByDNI(dni);
    if (error || !ben) return { ok: false, code: 'NOT_FOUND', msg: 'DNI no encontrado en el sistema.' };

    const usuario = ben.usuario || DB.get('users').find(u => u.id === ben.usuario_id);
    if (ben.estado !== 'activo') {
      return { ok: false, code: 'SUSPENDED', msg: usuario?.suspension_razon || 'Beneficio suspendido.', usuario };
    }

    const today = getToday();
    const yaRegistrado = DB.get('asistencias').find(a => a.beneficiario_id === ben.id && a.fecha === today);
    if (yaRegistrado) return { ok: false, code: 'ALREADY', msg: 'Asistencia ya registrada hoy.', usuario, beneficiario: ben };

    const hora   = new Date().toTimeString().slice(0, 5);
    const nuevaA = { id: DB.uid('ASI'), beneficiario_id: ben.id, fecha: today, turno: 'almuerzo', metodo, hora, registrado_por: 'terminal_01' };

    if (USE_SUPABASE) {
      await _supabaseClient.from(TABLE.asistencias).insert(nuevaA);
      await _supabaseClient.from(TABLE.beneficiarios).update({ ausencias_consecutivas: 0 }).eq('id', ben.id);
    } else {
      DB.add('asistencias', nuevaA);
      DB.update('beneficiarios', ben.id, { ausencias_consecutivas: 0 });
    }

    AuditoriaService.log('terminal_01', 'Registro de asistencia', `Asistencia para ${usuario?.nombre} — ${metodo.toUpperCase()}`, '192.168.1.101');
    return { ok: true, usuario, beneficiario: ben };
  },
};

// ─── PostulantesService ──────────────────────────────────────
const PostulantesService = {

  async getAll() {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.postulantes).select('*').order('fecha_postulacion', { ascending: false });
    }
    return { data: DB.get('postulantes'), error: null };
  },

  async aprobar(id) {
    if (USE_SUPABASE) {
      const { data: post } = await _supabaseClient.from(TABLE.postulantes).select('*').eq('id', id).single();
      await _supabaseClient.from(TABLE.postulantes).update({ estado: 'aprobado', observaciones: 'Aprobado. Beneficio activo.' }).eq('id', id);
      // Crear usuario y beneficiario en Supabase
      const { data: newUser } = await UsuariosService.create({ nombre: post.nombre, rol: 'beneficiario', dni: post.dni, email: post.email, activo: true, avatar: post.nombre.split(' ').map(n=>n[0]).join('').slice(0,3), carrera: post.carrera, ciclo: post.ciclo, codigo: 'N/A' });
      await BeneficiariosService.create({ usuario_id: newUser.id, fecha_inicio: getToday(), fecha_fin: '2026-07-31', estado: 'activo', score_socioeconomico: post.score_socioeconomico, turno: 'almuerzo', qr_code: `QR-${Date.now()}`, ausencias_consecutivas: 0, ausencias_mes: 0 });
      return { ok: true };
    }
    // Offline
    const post = DB.getOne('postulantes', id);
    if (!post) return { ok: false };
    DB.update('postulantes', id, { estado: 'aprobado', observaciones: 'Aprobado. Beneficio activo.' });
    const newUserId = DB.uid('USR');
    const newBenId  = DB.uid('BEN');
    DB.add('users', { id: newUserId, nombre: post.nombre, rol: 'beneficiario', dni: post.dni, email: post.email, activo: true, avatar: post.nombre.split(' ').map(n=>n[0]).join('').slice(0,3), carrera: post.carrera, ciclo: post.ciclo, codigo: 'N/A' });
    DB.add('beneficiarios', { id: newBenId, usuario_id: newUserId, fecha_inicio: getToday(), fecha_fin: '2026-07-31', estado: 'activo', score_socioeconomico: post.score_socioeconomico, turno: 'almuerzo', qr_code: `QR-${Date.now().toString().slice(-6)}`, ausencias_consecutivas: 0, ausencias_mes: 0 });
    AuditoriaService.log('Asistenta Social', 'Aprobación de postulación', `Postulante ${post.nombre} aprobado`, '192.168.1.50');
    return { ok: true };
  },

  async rechazar(id, observaciones) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.postulantes).update({ estado: 'rechazado', observaciones }).eq('id', id);
    }
    DB.update('postulantes', id, { estado: 'rechazado', observaciones });
    return { ok: true };
  },
};

// ─── ListaEsperaService ──────────────────────────────────────
const ListaEsperaService = {

  async getAll() {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.lista_espera).select('*').order('posicion');
    }
    const data = DB.get('lista_espera').sort((a, b) => a.posicion - b.posicion);
    return { data, error: null };
  },

  async promover(id) {
    if (USE_SUPABASE) {
      await _supabaseClient.from(TABLE.lista_espera).delete().eq('id', id);
      // Re-numerar posiciones
      const { data: restantes } = await this.getAll();
      for (let i = 0; i < restantes.length; i++) {
        await _supabaseClient.from(TABLE.lista_espera).update({ posicion: i + 1 }).eq('id', restantes[i].id);
      }
      return { ok: true };
    }
    DB.delete('lista_espera', id);
    const restantes = DB.get('lista_espera').sort((a, b) => a.posicion - b.posicion);
    restantes.forEach((item, idx) => DB.update('lista_espera', item.id, { posicion: idx + 1 }));
    return { ok: true };
  },
};

// ─── AsistenciasService ──────────────────────────────────────
const AsistenciasService = {

  async getAll() {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.asistencias).select('*').order('fecha', { ascending: false });
    }
    return { data: DB.get('asistencias'), error: null };
  },

  async getHoy() {
    const today = getToday();
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.asistencias).select('*, beneficiarios(*, usuarios(*))').eq('fecha', today);
    }
    return { data: DB.get('asistencias').filter(a => a.fecha === today), error: null };
  },

  async getByBeneficiario(benId) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.asistencias).select('*').eq('beneficiario_id', benId).order('fecha', { ascending: false });
    }
    return { data: DB.get('asistencias').filter(a => a.beneficiario_id === benId), error: null };
  },
};

// ─── JustificacionesService ──────────────────────────────────
const JustificacionesService = {

  async getAll() {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.justificaciones).select('*, beneficiarios(*, usuarios(*))').order('fecha_solicitud', { ascending: false });
    }
    return { data: DB.get('justificaciones'), error: null };
  },

  async getByBeneficiario(benId) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.justificaciones).select('*').eq('beneficiario_id', benId);
    }
    return { data: DB.get('justificaciones').filter(j => j.beneficiario_id === benId), error: null };
  },

  async create(justificacion) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.justificaciones).insert(justificacion).select().single();
    }
    const data = DB.add('justificaciones', { ...justificacion, id: DB.uid('JUS') });
    return { data, error: null };
  },

  async resolver(id, decision, observaciones, aprobadoPor) {
    const estado          = decision === 'aprobar' ? 'aprobado' : 'rechazado';
    const fecha_resolucion = getToday();

    if (USE_SUPABASE) {
      await _supabaseClient.from(TABLE.justificaciones).update({ estado, fecha_resolucion, aprobado_por: aprobadoPor, observaciones }).eq('id', id);
      if (estado === 'aprobado') {
        const { data: jus } = await _supabaseClient.from(TABLE.justificaciones).select('*').eq('id', id).single();
        if (jus) await _supabaseClient.from(TABLE.ausencias).update({ justificado: true, justificacion_id: id }).eq('beneficiario_id', jus.beneficiario_id).eq('fecha', jus.fecha_ausencia);
      }
      return { ok: true };
    }

    DB.update('justificaciones', id, { estado, fecha_resolucion, aprobado_por: aprobadoPor, observaciones });
    if (estado === 'aprobado') {
      const jus = DB.getOne('justificaciones', id);
      if (jus) {
        const aus = DB.get('ausencias').find(a => a.beneficiario_id === jus.beneficiario_id && a.fecha === jus.fecha_ausencia);
        if (aus) DB.update('ausencias', aus.id, { justificado: true, justificacion_id: id });
      }
    }
    return { ok: true };
  },
};

// ─── NotificacionesService ───────────────────────────────────
const NotificacionesService = {

  async getByUsuario(userId) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.notificaciones).select('*').eq('usuario_id', userId).order('fecha', { ascending: false });
    }
    const data = DB.get('notificaciones').filter(n => n.usuario_id === userId).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return { data, error: null };
  },

  async marcarLeido(id) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.notificaciones).update({ leido: true }).eq('id', id);
    }
    DB.update('notificaciones', id, { leido: true });
    return { ok: true };
  },

  async marcarTodasLeidas(userId) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.notificaciones).update({ leido: true }).eq('usuario_id', userId).eq('leido', false);
    }
    DB.get('notificaciones').filter(n => n.usuario_id === userId && !n.leido).forEach(n => DB.update('notificaciones', n.id, { leido: true }));
    return { ok: true };
  },

  countUnread(userId) {
    return DB.get('notificaciones').filter(n => n.usuario_id === userId && !n.leido).length;
  },
};

// ─── AuditoriaService ────────────────────────────────────────
const AuditoriaService = {

  async getAll() {
    if (USE_SUPABASE) {
      return await _supabaseClient.from(TABLE.auditoria).select('*').order('fecha', { ascending: false });
    }
    return { data: DB.get('auditoria').slice().reverse(), error: null };
  },

  /** Registra una entrada de auditoría (fire-and-forget) */
  log(usuario, accion, detalle, ip = '—') {
    const entrada = { id: DB.uid('AUD'), usuario, accion, detalle, fecha: new Date().toLocaleString('es-PE'), ip };
    if (USE_SUPABASE) {
      _supabaseClient.from(TABLE.auditoria).insert(entrada);
    } else {
      DB.add('auditoria', entrada);
    }
  },
};

// ─── Helper de datos enriquecidos (modo offline) ─────────────
/**
 * Devuelve todos los datos relacionados de un usuario beneficiario.
 * En modo Supabase, usarías JOINs directamente en la consulta.
 */
function getUserFullData(userId) {
  const user     = DB.getOne('users', userId);
  if (!user) return null;
  const ben      = DB.get('beneficiarios').find(b => b.usuario_id === userId);
  return {
    user,
    beneficiario:   ben || null,
    asistencias:    ben ? DB.get('asistencias').filter(a => a.beneficiario_id === ben.id) : [],
    ausencias:      ben ? DB.get('ausencias').filter(a => a.beneficiario_id === ben.id)   : [],
    justificaciones:ben ? DB.get('justificaciones').filter(j => j.beneficiario_id === ben.id) : [],
    notificaciones: DB.get('notificaciones').filter(n => n.usuario_id === userId),
  };
}
