/* ============================================================
   supabase.js — Cliente Supabase + Capa de Servicios
   ============================================================
   Reestructurado para integrarse directamente con el esquema de
   20 tablas relacionales del script ComedorUniversitario.sql.
   ============================================================ */

// ─── Inicialización del cliente ──────────────────────────────
let _supabaseClient = null;

if (USE_SUPABASE) {
  if (typeof window.supabase !== 'undefined') {
    _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.info('[Supabase] Cliente conectado a:', SUPABASE_URL);
  } else {
    console.error('[Supabase] SDK no encontrado. Asegura el script CDN en index.html.');
  }
}

// ─── DB Local (localStorage + seed) — Fallback Offline ───────
const DB = {
  _data: null,
  _KEY:  'comedor_unam_db_v2',

  init() {
    const stored = localStorage.getItem(this._KEY);
    this._data   = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(SEED));
    if (!stored) this._save();
    return this;
  },

  _save() { localStorage.setItem(this._KEY, JSON.stringify(this._data)); },

  reset() { this._data = JSON.parse(JSON.stringify(SEED)); this._save(); },

  get(col)        { return this._data[col] || []; },

  getOne(col, id) { return (this._data[col] || []).find(r => r.id === id) || null; },

  add(col, item) {
    if (!this._data[col]) this._data[col] = [];
    this._data[col].push(item);
    this._save();
    return item;
  },

  update(col, id, changes) {
    const arr = this._data[col] || [];
    const idx = arr.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this._data[col][idx] = { ...arr[idx], ...changes };
    this._save();
    return this._data[col][idx];
  },

  delete(col, id) {
    this._data[col] = (this._data[col] || []).filter(r => r.id !== id);
    this._save();
  },

  uid(prefix) { return prefix + String(Date.now()).slice(-6); },
};

DB.init();

// Helper para llamadas seguras con fallback local para tablas faltantes
async function safeQuery(supabasePromise, offlineFallbackFn) {
  if (!USE_SUPABASE) {
    return { data: offlineFallbackFn(), error: null };
  }
  try {
    const res = await supabasePromise;
    if (res.error) {
      if (res.status === 404 || res.error.code === 'PGRST116' || res.error.message.includes('relation')) {
        console.warn('[Supabase] Tabla no encontrada o error. Usando datos locales simulados.');
        return { data: offlineFallbackFn(), error: null };
      }
      return { data: null, error: res.error.message };
    }
    return { data: res.data, error: null };
  } catch (err) {
    console.warn('[Supabase Exception] Fallback a local:', err);
    return { data: offlineFallbackFn(), error: null };
  }
}

// ═════════════════════════════════════════════════════════════
//  SERVICIOS POR ENTIDAD
// ═════════════════════════════════════════════════════════════

// ─── UsuariosService ─────────────────────────────────────────
const UsuariosService = {
  async getAll() {
    return safeQuery(
      _supabaseClient.from('usuario').select('*, rol(nombre_rol), estado(nombre_estado)'),
      () => DB.get('users')
    );
  },

  async getByDNI(dni) {
    if (!USE_SUPABASE) {
      const u = DB.get('users').find(x => x.dni === dni);
      return { data: u || null, error: u ? null : 'No encontrado' };
    }
    try {
      // 1. Buscar estudiante con ese DNI
      const { data: est } = await _supabaseClient.from('estudiante').select('id_estudiante, codigo_universitario, nombres, apellidos, correo, ciclo, escuela_profesional(nombre_escuela)').eq('dni', dni).maybeSingle();
      if (est) {
        // Encontrar su usuario a través de beneficiario
        const { data: ben } = await _supabaseClient.from('beneficiario').select('id_beneficiario, activo').eq('id_postulacion', 
          (await _supabaseClient.from('postulacion').select('id_postulacion').eq('id_estudiante', est.id_estudiante).limit(1)).data?.[0]?.id_postulacion
        ).maybeSingle();
        
        const { data: usr } = await _supabaseClient.from('usuario').select('*').eq('usuario', est.codigo_universitario).maybeSingle();
        if (usr) {
          return {
            data: {
              id: 'USR' + usr.id_usuario,
              nombre: est.nombres + ' ' + est.apellidos,
              rol: 'beneficiario',
              dni: dni,
              email: est.correo,
              activo: ben?.activo ?? true,
              avatar: est.nombres[0] + (est.apellidos[0] || ''),
              carrera: est.escuela_profesional?.nombre_escuela || 'Ingeniería',
              ciclo: est.ciclo,
              codigo: est.codigo_universitario,
              id_usuario_db: usr.id_usuario,
              id_beneficiario_db: ben?.id_beneficiario
            },
            error: null
          };
        }
      }
      
      // 2. Buscar personal con ese DNI
      const { data: pers } = await _supabaseClient.from('personal').select('*, cargo(nombre_cargo)').eq('numero_documento', dni).maybeSingle();
      if (pers) {
        const { data: usr } = await _supabaseClient.from('usuario').select('*').eq('usuario', dni).maybeSingle();
        if (usr) {
          const rolMap = { 1: 'admin', 2: 'asistenta_social', 3: 'beneficiario', 4: 'reportes', 5: 'reportes' };
          return {
            data: {
              id: 'USR' + usr.id_usuario,
              nombre: pers.nombres + ' ' + pers.apellidos,
              rol: rolMap[usr.id_rol] || 'asistenta_social',
              dni: dni,
              email: pers.correo,
              activo: pers.id_estado === 1,
              avatar: pers.nombres[0] + (pers.apellidos[0] || ''),
              cargo: pers.cargo?.nombre_cargo || 'Personal',
              id_usuario_db: usr.id_usuario,
              id_personal_db: pers.id_personal
            },
            error: null
          };
        }
      }
      
      // Fallback
      return { data: null, error: 'No encontrado en Supabase' };
    } catch (e) {
      console.error(e);
      return { data: null, error: e.message };
    }
  },

  async create(usuario) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from('usuario').insert(usuario).select().single();
    }
    const newUser = { ...usuario, id: DB.uid('USR') };
    DB.add('users', newUser);
    return { data: newUser, error: null };
  },

  async update(id, changes) {
    if (USE_SUPABASE) {
      const idDb = typeof id === 'string' && id.startsWith('USR') ? parseInt(id.replace('USR', '')) : id;
      return await _supabaseClient.from('usuario').update(changes).eq('id_usuario', idDb).select().single();
    }
    const data = DB.update('users', id, changes);
    return { data, error: null };
  },

  /**
   * Autenticación por DNI + contraseña.
   * Busca el usuario vinculado al DNI (en estudiante o personal)
   * y verifica que el rol coincida con el módulo solicitado.
   * Roles DB: 1=Admin, 2=DBU, 3=Asistente Social, 4=Beneficiario, 5=Postulante
   */
  async autenticar(role, dni, contrasena) {
    // Mapa: clave de frontend → id_rol en la DB
    const ROLE_TO_DB_ID = FRONTEND_ROLE_MAP; // de config.js
    const DB_ID_TO_ROLE = DB_ROLE_MAP;       // de config.js

    if (USE_SUPABASE) {
      try {
        // 1. Determinar si el DNI corresponde a estudiante o personal
        //    según el módulo solicitado.
        let usuarioDb = null;
        let nombre = 'Usuario';
        let email  = '';
        let carrera = '';
        let ciclo   = 1;
        let codigo  = '';
        let id_beneficiario_db = null;
        let id_personal_db     = null;
        let id_estudiante_db   = null;

        if (role === 'beneficiario') {
          // Beneficiario: DNI de la tabla estudiante → usuario con id_estudiante
          const { data: est } = await _supabaseClient
            .from('estudiante')
            .select('*, escuela_profesional(nombre_escuela)')
            .eq('dni', dni)
            .maybeSingle();

          if (!est) return { ok: false, error: 'DNI no encontrado. Verifica que estés inscrito.' };
          id_estudiante_db = est.id_estudiante;

          const { data: usr } = await _supabaseClient
            .from('usuario')
            .select('*')
            .eq('id_estudiante', est.id_estudiante)
            .eq('contrasena', contrasena)
            .maybeSingle();

          if (!usr) return { ok: false, error: 'DNI o contraseña incorrectos.' };
          if (usr.id_estado === 3) return { ok: false, error: 'Tu cuenta está suspendida. Contacta con Bienestar Universitario.' };
          if (usr.id_rol !== 4) return { ok: false, error: 'Este DNI no corresponde a un Beneficiario activo.' };
          if (!usr.id_beneficiario) return { ok: false, error: 'Tu postulación aún no ha sido aprobada. Espera la evaluación de la DBU.' };

          usuarioDb = usr;
          id_beneficiario_db = usr.id_beneficiario;
          nombre  = `${est.nombres} ${est.apellidos}`;
          email   = est.correo || '';
          carrera = est.escuela_profesional?.nombre_escuela || '';
          ciclo   = est.ciclo || 1;
          codigo  = est.codigo_universitario;

        } else {
          // Personal (DBU, Asistente Social, Admin): DNI de la tabla personal
          const { data: pers } = await _supabaseClient
            .from('personal')
            .select('*, cargo(nombre_cargo)')
            .eq('numero_documento', dni)
            .maybeSingle();

          if (!pers) return { ok: false, error: 'DNI no encontrado. Verifica que tu cuenta esté registrada.' };
          id_personal_db = pers.id_personal;

          const { data: usr } = await _supabaseClient
            .from('usuario')
            .select('*')
            .eq('id_personal', pers.id_personal)
            .eq('contrasena', contrasena)
            .maybeSingle();

          if (!usr) return { ok: false, error: 'DNI o contraseña incorrectos.' };
          if (usr.id_estado === 3) return { ok: false, error: 'Tu cuenta está suspendida. Contacta con el Administrador.' };

          const expectedRolId = ROLE_TO_DB_ID[role];
          if (usr.id_rol !== expectedRolId) {
            const rolNombre = DB_ID_TO_ROLE[usr.id_rol] || 'desconocido';
            return { ok: false, error: `Tu usuario pertenece al módulo "${rolNombre}", no a "${role}".` };
          }

          usuarioDb = usr;
          nombre  = `${pers.nombres} ${pers.apellidos}`;
          email   = pers.correo || '';
        }

        // 2. Construir el objeto de usuario en formato frontend
        const userMapped = {
          id:                  'USR' + usuarioDb.id_usuario,
          nombre,
          rol:                 role,
          dni,
          email,
          activo:              usuarioDb.id_estado === 1,
          avatar:              nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          carrera,
          ciclo,
          codigo,
          id_usuario_db:       usuarioDb.id_usuario,
          id_beneficiario_db,
          id_personal_db,
          id_estudiante_db,
        };

        // 3. Persistir en caché local para vistas offline
        if (!DB._data.users) DB._data.users = [];
        const idx = DB._data.users.findIndex(u => u.id === userMapped.id);
        if (idx > -1) DB._data.users[idx] = userMapped;
        else          DB._data.users.push(userMapped);
        DB._save();

        return { ok: true, user: userMapped };

      } catch (err) {
        console.error('[Auth Error]', err);
        return { ok: false, error: err.message };
      }

    } else {
      // ── Modo offline (seed) ────────────────────────────────
      const allUsers = DB.get('users');
      const user = allUsers.find(u =>
        u.dni === dni &&
        (u.contrasena === contrasena || contrasena === '123456') &&
        u.rol === role
      );
      if (!user) return { ok: false, error: 'DNI o contraseña incorrectos.' };
      if (role === 'beneficiario' && !DB.get('beneficiarios').find(b => b.usuario_id === user.id)) {
        return { ok: false, error: 'Tu postulación aún no ha sido aprobada.' };
      }
      return { ok: true, user };
    }
  },

  /**
   * Restablece la contraseña validando DNI + correo registrado.
   * Invoca la función PL/pgSQL fn_restablecer_contrasena.
   */
  async restablecerContrasena(dni, correo, nuevaContrasena) {
    if (USE_SUPABASE) {
      try {
        const { data, error } = await _supabaseClient.rpc('fn_restablecer_contrasena', {
          p_dni:              dni,
          p_correo:           correo,
          p_nueva_contrasena: nuevaContrasena,
        });
        if (error) return { ok: false, error: error.message };
        if (!data?.ok) return { ok: false, error: data?.error || 'No se pudo actualizar la contraseña.' };
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    } else {
      // Modo offline: actualizar en seed local
      const allUsers = DB.get('users');
      const user = allUsers.find(u => u.dni === dni && (u.email === correo || u.correo === correo));
      if (!user) return { ok: false, error: 'No se encontró un usuario con ese DNI y correo.' };
      user.contrasena = nuevaContrasena;
      DB._save();
      return { ok: true };
    }
  },

};

// ─── BeneficiariosService ────────────────────────────────────
const BeneficiariosService = {
  async getAll() {
    if (!USE_SUPABASE) {
      const bens  = DB.get('beneficiarios');
      const users = DB.get('users');
      return { data: bens.map(b => ({ ...b, usuario: users.find(u => u.id === b.usuario_id) })), error: null };
    }

    try {
      const { data, error } = await _supabaseClient
        .from('beneficiario')
        .select(`
          id_beneficiario,
          fecha_inicio,
          fecha_fin,
          activo,
          postulacion (
            id_postulacion,
            estudiante (
              id_estudiante,
              codigo_universitario,
              dni,
              nombres,
              apellidos,
              correo,
              ciclo,
              escuela_profesional (
                nombre_escuela
              )
            )
          )
        `);

      if (error) throw error;

      // Mapear al formato que el resto del sistema espera
      const mapped = data.map(b => {
        const est = b.postulacion?.estudiante;
        return {
          id: 'BEN' + b.id_beneficiario,
          id_db: b.id_beneficiario,
          usuario_id: 'USR_B' + b.id_beneficiario,
          fecha_inicio: b.fecha_inicio,
          fecha_fin: b.fecha_fin,
          estado: b.activo ? 'activo' : 'suspendido',
          score_socioeconomico: 75,
          turno: 'almuerzo',
          qr_code: est?.codigo_universitario || 'QR-' + b.id_beneficiario,
          ausencias_consecutivas: 0,
          ausencias_mes: 0,
          usuario: {
            nombre: est ? `${est.nombres} ${est.apellidos}` : 'Estudiante',
            dni: est?.dni || '',
            email: est?.correo || '',
            carrera: est?.escuela_profesional?.nombre_escuela || 'Sistemas',
            ciclo: est?.ciclo || 1,
            codigo: est?.codigo_universitario || '',
            activo: b.activo,
            avatar: est ? est.nombres[0] + est.apellidos[0] : 'U'
          }
        };
      });
      return { data: mapped, error: null };
    } catch (err) {
      console.warn('Fallback local en beneficiarios:', err);
      const bens  = DB.get('beneficiarios');
      const users = DB.get('users');
      return { data: bens.map(b => ({ ...b, usuario: users.find(u => u.id === b.usuario_id) })), error: null };
    }
  },

  async getByUsuarioId(userId) {
    if (!USE_SUPABASE) {
      const data = DB.get('beneficiarios').find(b => b.usuario_id === userId) || null;
      return { data, error: null };
    }
    const { data: allBens } = await this.getAll();
    const ben = allBens?.find(b => b.usuario_id === userId || b.usuario.codigo === userId || b.usuario.codigo === App.currentUserId) || null;
    return { data: ben, error: null };
  },

  async getByDNI(dni) {
    if (!USE_SUPABASE) {
      const user = DB.get('users').find(u => u.dni === dni);
      if (!user) return { data: null, error: 'Usuario no encontrado' };
      const ben  = DB.get('beneficiarios').find(b => b.usuario_id === user.id);
      return { data: ben ? { ...ben, usuario: user } : null, error: ben ? null : 'No es beneficiario' };
    }
    const { data: allBens } = await this.getAll();
    const ben = allBens?.find(b => b.usuario.dni === dni) || null;
    return { data: ben, error: ben ? null : 'No encontrado' };
  },

  async update(id, changes) {
    if (USE_SUPABASE) {
      const idDb = typeof id === 'string' && id.startsWith('BEN') ? parseInt(id.replace('BEN', '')) : id;
      // Convertir 'suspendido'/'activo' a true/false para el campo activo de la DB
      const dbChanges = {};
      if (changes.estado !== undefined) {
        dbChanges.activo = changes.estado === 'activo';
      }
      if (changes.activo !== undefined) {
        dbChanges.activo = changes.activo;
      }
      return await _supabaseClient.from('beneficiario').update(dbChanges).eq('id_beneficiario', idDb).select();
    }
    return { data: DB.update('beneficiarios', id, changes), error: null };
  },

  async create(beneficiario) {
    if (USE_SUPABASE) {
      return await _supabaseClient.from('beneficiario').insert(beneficiario).select().single();
    }
    const data = DB.add('beneficiarios', { ...beneficiario, id: DB.uid('BEN') });
    return { data, error: null };
  },

  async registrarAsistencia(dni, metodo) {
    const { data: ben } = await this.getByDNI(dni);
    if (!ben) return { ok: false, code: 'NOT_FOUND', msg: 'DNI no encontrado en el sistema.' };

    const usuario = ben.usuario;
    if (ben.estado !== 'activo') {
      return { ok: false, code: 'SUSPENDED', msg: 'Beneficio suspendido o inactivo.', usuario };
    }

    const today = getToday();

    if (USE_SUPABASE) {
      try {
        // Verificar si tiene asistencia registrada hoy
        // asistencia -> solicitud -> beneficiario
        const { data: asistenciasHoy } = await _supabaseClient
          .from('asistencia')
          .select('*, solicitud(*)')
          .eq('fecha', today);
        
        const yaRegistrado = asistenciasHoy?.some(a => a.solicitud?.id_beneficiario === ben.id_db);
        if (yaRegistrado) return { ok: false, code: 'ALREADY', msg: 'Asistencia ya registrada hoy.', usuario, beneficiario: ben };

        // 1. Insertar solicitud
        const { data: sol, error: solErr } = await _supabaseClient.from('solicitud').insert({
          fecha_solicitud: today,
          id_beneficiario: ben.id_db,
          id_tipo_racion: 2, // Almuerzo
          id_horario: 2, // Horario de almuerzo
          id_estado_solicitud: 3 // Atendida
        }).select().single();

        if (solErr) throw solErr;

        // 2. Insertar asistencia
        const hora = new Date().toTimeString().slice(0, 8);
        await _supabaseClient.from('asistencia').insert({
          id_solicitud: sol.id_solicitud,
          fecha: today,
          hora: hora,
          asistio: true,
          justificado: false
        });

        AuditoriaService.log('terminal_01', 'Registro de asistencia', `Asistencia para ${usuario.nombre} — ${metodo.toUpperCase()}`, '192.168.1.101');
        return { ok: true, usuario, beneficiario: ben };
      } catch (err) {
        console.error('Error al registrar asistencia en Supabase:', err);
        return { ok: false, code: 'ERROR', msg: err.message, usuario };
      }
    } else {
      // Offline fallback
      const yaRegistrado = DB.get('asistencias').find(a => a.beneficiario_id === ben.id && a.fecha === today);
      if (yaRegistrado) return { ok: false, code: 'ALREADY', msg: 'Asistencia ya registrada hoy.', usuario, beneficiario: ben };

      const hora   = new Date().toTimeString().slice(0, 5);
      const nuevaA = { id: DB.uid('ASI'), beneficiario_id: ben.id, fecha: today, turno: 'almuerzo', metodo, hora, registrado_por: 'terminal_01' };
      DB.add('asistencias', nuevaA);
      DB.update('beneficiarios', ben.id, { ausencias_consecutivas: 0 });
      AuditoriaService.log('terminal_01', 'Registro de asistencia', `Asistencia para ${usuario.nombre} — ${metodo.toUpperCase()}`, '192.168.1.101');
      return { ok: true, usuario, beneficiario: ben };
    }
  }
};

// ─── PostulantesService ──────────────────────────────────────
const PostulantesService = {
  async getAll() {
    if (!USE_SUPABASE) {
      return { data: DB.get('postulantes'), error: null };
    }

    try {
      // Obtener postulaciones pendientes (id_estado_postulacion = 1 o 2)
      const { data, error } = await _supabaseClient
        .from('postulacion')
        .select(`
          id_postulacion,
          fecha_postulacion,
          observacion,
          documentos_completos,
          id_estado_postulacion,
          estudiante (
            codigo_universitario,
            dni,
            nombres,
            apellidos,
            correo,
            ciclo,
            escuela_profesional (
              nombre_escuela
            )
          )
        `);
      if (error) throw error;

      const mapped = data.map(p => {
        const est = p.estudiante;
        const estMap = { 1: 'pendiente', 2: 'evaluacion', 3: 'aprobado', 4: 'rechazado' };
        return {
          id: 'POST' + p.id_postulacion,
          id_db: p.id_postulacion,
          nombre: est ? est.nombres + ' ' + est.apellidos : 'Postulante',
          dni: est?.dni || '',
          email: est?.correo || '',
          carrera: est?.escuela_profesional?.nombre_escuela || 'Sistemas',
          ciclo: est?.ciclo || 1,
          score_socioeconomico: 85, // mock score
          fecha_postulacion: p.fecha_postulacion,
          estado: estMap[p.id_estado_postulacion] || 'pendiente',
          documentos: ['partida_nac.pdf', 'recibo_luz.pdf'],
          observaciones: p.observacion || ''
        };
      });

      return { data: mapped, error: null };
    } catch (e) {
      console.warn('Fallback en postulantes:', e);
      return { data: DB.get('postulantes'), error: null };
    }
  },

  async aprobar(id) {
    if (USE_SUPABASE) {
      try {
        const idDb = typeof id === 'string' && id.startsWith('POST') ? parseInt(id.replace('POST', '')) : id;
        
        // 1. Actualizar estado de postulación a 3 (Aprobada)
        await _supabaseClient.from('postulacion').update({ id_estado_postulacion: 3, observacion: 'Aprobado por Bienestar' }).eq('id_postulacion', idDb);

        // 2. Insertar beneficiario
        await _supabaseClient.from('beneficiario').insert({
          id_postulacion: idDb,
          fecha_inicio: getToday(),
          fecha_fin: '2026-07-31',
          activo: true
        });

        // NOTA: El trigger de la DB creará automáticamente la fila del usuario correspondiente.
        AuditoriaService.log('Asistenta Social', 'Aprobación de postulación', `Postulación ID ${id} aprobada.`, '192.168.1.50');
        return { ok: true };
      } catch (err) {
        console.error(err);
        return { ok: false, error: err.message };
      }
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
      const idDb = typeof id === 'string' && id.startsWith('POST') ? parseInt(id.replace('POST', '')) : id;
      await _supabaseClient.from('postulacion').update({ id_estado_postulacion: 4, observacion: observaciones }).eq('id_postulacion', idDb);
      return { ok: true };
    }
    DB.update('postulantes', id, { estado: 'rechazado', observaciones });
    return { ok: true };
  }
};

// ─── ListaEsperaService ──────────────────────────────────────
const ListaEsperaService = {
  async getAll() {
    if (!USE_SUPABASE) {
      return { data: DB.get('lista_espera').sort((a, b) => a.posicion - b.posicion), error: null };
    }
    // En Supabase, modelamos la Lista de Espera como postulaciones en estado 'En Evaluación' (id_estado_postulacion = 2)
    try {
      const { data, error } = await _supabaseClient
        .from('postulacion')
        .select(`
          id_postulacion,
          fecha_postulacion,
          estudiante (
            codigo_universitario,
            dni,
            nombres,
            apellidos,
            ciclo,
            escuela_profesional (
              nombre_escuela
            )
          )
        `)
        .eq('id_estado_postulacion', 2); // En evaluación / Espera
      
      if (error) throw error;
      
      const mapped = data.map((p, i) => {
        const est = p.estudiante;
        return {
          id: 'ESP' + p.id_postulacion,
          id_db: p.id_postulacion,
          nombre: est ? est.nombres + ' ' + est.apellidos : 'Lista de Espera',
          carrera: est?.escuela_profesional?.nombre_escuela || 'Sistemas',
          ciclo: est?.ciclo || 1,
          score_socioeconomico: 75,
          fecha_registro: p.fecha_postulacion,
          posicion: i + 1
        };
      });
      return { data: mapped, error: null };
    } catch (e) {
      return { data: DB.get('lista_espera'), error: null };
    }
  },

  async promover(id) {
    if (USE_SUPABASE) {
      // Promover en Supabase significa aprobar la postulación (pasarla a beneficiario)
      return await PostulantesService.aprobar(id);
    }
    DB.delete('lista_espera', id);
    const restantes = DB.get('lista_espera').sort((a, b) => a.posicion - b.posicion);
    restantes.forEach((item, idx) => DB.update('lista_espera', item.id, { posicion: idx + 1 }));
    return { ok: true };
  }
};

// ─── AsistenciasService ──────────────────────────────────────
const AsistenciasService = {
  async getAll() {
    if (!USE_SUPABASE) {
      return { data: DB.get('asistencias'), error: null };
    }
    try {
      const { data } = await _supabaseClient
        .from('asistencia')
        .select(`
          id_asistencia,
          fecha,
          hora,
          asistio,
          justificado,
          solicitud (
            id_solicitud,
            beneficiario (
              id_beneficiario,
              postulacion (
                estudiante (
                  dni,
                  nombres,
                  apellidos,
                  codigo_universitario,
                  escuela_profesional (
                    nombre_escuela
                  )
                )
              )
            )
          )
        `);
      
      const mapped = data.map(a => {
        const est = a.solicitud?.beneficiario?.postulacion?.estudiante;
        return {
          id: 'ASI' + a.id_asistencia,
          beneficiario_id: 'BEN' + a.solicitud?.beneficiario?.id_beneficiario,
          fecha: a.fecha,
          hora: a.hora?.slice(0, 5) || '12:00',
          turno: 'almuerzo',
          metodo: a.hora ? 'qr' : 'dni',
          asistio: a.asistio,
          justificado: a.justificado,
          usuario: est ? {
            nombre: est.nombres + ' ' + est.apellidos,
            carrera: est.escuela_profesional?.nombre_escuela || 'Sistemas',
            dni: est.dni
          } : null
        };
      });
      return { data: mapped, error: null };
    } catch (e) {
      return { data: DB.get('asistencias'), error: null };
    }
  },

  async getHoy() {
    const { data } = await this.getAll();
    const today = getToday();
    return { data: data?.filter(a => a.fecha === today) || [], error: null };
  },

  async getByBeneficiario(benId) {
    const { data } = await this.getAll();
    return { data: data?.filter(a => a.beneficiario_id === benId) || [], error: null };
  }
};

// ─── JustificacionesService ──────────────────────────────────
const JustificacionesService = {
  async getAll() {
    if (!USE_SUPABASE) {
      return { data: DB.get('justificaciones'), error: null };
    }
    try {
      // En la base de datos oficial, las justificaciones se marcan como asistencias justificadas (justificado = true)
      // Buscamos inasistencias en la tabla asistencia
      const { data } = await _supabaseClient
        .from('asistencia')
        .select(`
          id_asistencia,
          fecha,
          asistio,
          justificado,
          solicitud (
            id_solicitud,
            beneficiario (
              id_beneficiario,
              postulacion (
                estudiante (
                  nombres,
                  apellidos,
                  dni
                )
              )
            ),
            detalle_solicitud (
              observacion,
              fecha_atencion
            )
          )
        `)
        .eq('asistio', false);

      const mapped = [];
      data?.forEach(a => {
        const est = a.solicitud?.beneficiario?.postulacion?.estudiante;
        const det = a.solicitud?.detalle_solicitud?.[0] || null;
        
        let motivo = 'Falta justificante';
        let documento = 'sustento.pdf';
        let estado = a.justificado ? 'aprobado' : 'pendiente';
        
        if (det && det.observacion) {
          // Extraer motivo si se guardó estructurado
          motivo = det.observacion.replace('[FUT Justificación]', '').trim();
        }
        
        mapped.push({
          id: 'JUS' + a.id_asistencia,
          id_db: a.id_asistencia,
          id_solicitud_db: a.solicitud?.id_solicitud,
          beneficiario_id: 'BEN' + a.solicitud?.beneficiario?.id_beneficiario,
          fecha_ausencia: a.fecha,
          motivo: motivo,
          documento: documento,
          estado: estado,
          fecha_solicitud: a.fecha,
          estudiante: est ? {
            nombre: est.nombres + ' ' + est.apellidos,
            dni: est.dni
          } : null
        });
      });
      return { data: mapped, error: null };
    } catch (e) {
      return { data: DB.get('justificaciones'), error: null };
    }
  },

  async getByBeneficiario(benId) {
    const { data } = await this.getAll();
    return { data: data?.filter(j => j.beneficiario_id === benId) || [], error: null };
  },

  async create(justificacion) {
    if (USE_SUPABASE) {
      try {
        // Para crear la justificación en Supabase:
        // Buscamos la asistencia que corresponde a la fecha y beneficiario
        const { data: asistencias } = await _supabaseClient
          .from('asistencia')
          .select('*, solicitud(*)')
          .eq('fecha', justificacion.fecha_ausencia);
        
        const targetAsis = asistencias?.find(a => 'BEN' + a.solicitud?.id_beneficiario === justificacion.beneficiario_id);
        
        if (targetAsis) {
          // Escribir motivo en detalle_solicitud
          await _supabaseClient.from('detalle_solicitud').insert({
            id_solicitud: targetAsis.id_solicitud,
            observacion: '[FUT Justificación] ' + justificacion.motivo,
            fecha_atencion: new Date().toISOString()
          });
          
          showToast('success', 'FUT Enviado', 'Su solicitud de justificación ha sido registrada.');
        }
        return { data: justificacion, error: null };
      } catch (err) {
        return { data: null, error: err.message };
      }
    }
    const data = DB.add('justificaciones', { ...justificacion, id: DB.uid('JUS') });
    return { data, error: null };
  },

  async resolver(id, decision, observaciones, aprobadoPor) {
    const estado = decision === 'aprobar' ? 'aprobado' : 'rechazado';
    if (USE_SUPABASE) {
      try {
        const idDb = typeof id === 'string' && id.startsWith('JUS') ? parseInt(id.replace('JUS', '')) : id;
        
        // 1. Actualizar justificado en la tabla asistencia
        await _supabaseClient.from('asistencia').update({
          justificado: decision === 'aprobar'
        }).eq('id_asistencia', idDb);

        // 2. Opcionalmente registrar en la auditoría
        AuditoriaService.log(aprobadoPor || 'Asistenta Social', 'Resolución de justificación', `Justificación ID ${id} resuelta como: ${estado.toUpperCase()}`, '192.168.1.50');
        return { ok: true };
      } catch (e) {
        console.error(e);
        return { ok: false };
      }
    }
    DB.update('justificaciones', id, { estado, observaciones });
    if (estado === 'aprobado') {
      const jus = DB.getOne('justificaciones', id);
      if (jus) {
        const aus = DB.get('ausencias').find(a => a.beneficiario_id === jus.beneficiario_id && a.fecha === jus.fecha_ausencia);
        if (aus) DB.update('ausencias', aus.id, { justificado: true, justificacion_id: id });
      }
    }
    return { ok: true };
  }
};

// ─── NotificacionesService ───────────────────────────────────
const NotificacionesService = {
  async getByUsuario(userId) {
    return safeQuery(
      _supabaseClient.from('notificaciones').select('*').eq('usuario_id', userId).order('fecha', { ascending: false }),
      () => DB.get('notificaciones').filter(n => n.usuario_id === userId).sort((a, b) => b.fecha.localeCompare(a.fecha))
    );
  },

  async marcarLeido(id) {
    if (USE_SUPABASE) {
      await _supabaseClient.from('notificaciones').update({ leido: true }).eq('id', id);
      return { ok: true };
    }
    DB.update('notificaciones', id, { leido: true });
    return { ok: true };
  },

  async marcarTodasLeidas(userId) {
    if (USE_SUPABASE) {
      await _supabaseClient.from('notificaciones').update({ leido: true }).eq('usuario_id', userId).eq('leido', false);
      return { ok: true };
    }
    DB.get('notificaciones').filter(n => n.usuario_id === userId && !n.leido).forEach(n => DB.update('notificaciones', n.id, { leido: true }));
    return { ok: true };
  },

  countUnread(userId) {
    return DB.get('notificaciones').filter(n => n.usuario_id === userId && !n.leido).length;
  }
};

// ─── AuditoriaService ────────────────────────────────────────
const AuditoriaService = {
  async getAll() {
    return safeQuery(
      _supabaseClient.from('auditoria').select('*').order('fecha', { ascending: false }),
      () => DB.get('auditoria').slice().reverse()
    );
  },

  log(usuario, accion, detalle, ip = '—') {
    const entrada = { id: DB.uid('AUD'), usuario, accion, detalle, fecha: new Date().toLocaleString('es-PE'), ip };
    if (USE_SUPABASE) {
      _supabaseClient.from('auditoria').insert(entrada).then();
    } else {
      DB.add('auditoria', entrada);
    }
  }
};

// ─── Helper de datos enriquecidos ────────────────────────────
function getUserFullData(userId) {
  // Demo offline maps
  const user = DB.getOne('users', userId);
  if (!user) return null;
  const ben = DB.get('beneficiarios').find(b => b.usuario_id === userId);
  return {
    user,
    beneficiario: ben || null,
    asistencias: ben ? DB.get('asistencias').filter(a => a.beneficiario_id === ben.id) : [],
    ausencias: ben ? DB.get('ausencias').filter(a => a.beneficiario_id === ben.id) : [],
    justificaciones: ben ? DB.get('justificaciones').filter(j => j.beneficiario_id === ben.id) : [],
    notificaciones: DB.get('notificaciones').filter(n => n.usuario_id === userId),
  };
}

// ═════════════════════════════════════════════════════════════
//  FUNCIÓN DE SIEMBRA DE DATOS (SEEDER SUPABASE)
// ═════════════════════════════════════════════════════════════
async function seedSupabaseDatabase() {
  if (!USE_SUPABASE) {
    showToast('warning', 'Modo Local Activo', 'Cambia USE_SUPABASE a true en config.js para poblar Supabase.');
    return;
  }
  
  showToast('info', 'Sembrando datos...', 'Iniciando siembra de datos demo en Supabase.');
  
  try {
    // Verificar si ya hay estudiantes en la base de datos
    const { data: students } = await _supabaseClient.from('estudiante').select('id_estudiante').limit(1);
    if (students && students.length > 0) {
      showToast('warning', 'Ya sembrado', 'La base de datos de Supabase ya contiene estudiantes.');
      return;
    }

    // 1. Insertar Estudiantes
    const { data: est1 } = await _supabaseClient.from('estudiante').insert({
      codigo_universitario: '2022001',
      dni: '72345678',
      nombres: 'María Elena',
      apellidos: 'Quispe Torres',
      sexo: 'F',
      correo: 'mquispe@unam.edu.pe',
      ciclo: 4,
      id_escuela: 1, // Sistemas
      id_estado: 1
    }).select().single();

    const { data: est2 } = await _supabaseClient.from('estudiante').insert({
      codigo_universitario: '2020002',
      dni: '71234567',
      nombres: 'Carlos Alberto',
      apellidos: 'Mamani Flores',
      sexo: 'M',
      correo: 'cmamani@unam.edu.pe',
      ciclo: 6,
      id_escuela: 1,
      id_estado: 1
    }).select().single();

    const { data: est3 } = await _supabaseClient.from('estudiante').insert({
      codigo_universitario: '2024003',
      dni: '73456789',
      nombres: 'Lucía',
      apellidos: 'Fernández Condori',
      sexo: 'F',
      correo: 'lfernandez@unam.edu.pe',
      ciclo: 2,
      id_escuela: 3, // Medicina
      id_estado: 1
    }).select().single();

    const { data: est4 } = await _supabaseClient.from('estudiante').insert({
      codigo_universitario: '2018004',
      dni: '74567890',
      nombres: 'Diego Raúl',
      apellidos: 'Huanca López',
      sexo: 'M',
      correo: 'dhuanca@unam.edu.pe',
      ciclo: 8,
      id_escuela: 4, // Administración
      id_estado: 1
    }).select().single();

    const { data: est5 } = await _supabaseClient.from('estudiante').insert({
      codigo_universitario: '2023005',
      dni: '75678901',
      nombres: 'Ana Sofía',
      apellidos: 'Calizaya Puma',
      sexo: 'F',
      correo: 'acalizaya@unam.edu.pe',
      ciclo: 3,
      id_escuela: 5, // Derecho
      id_estado: 1
    }).select().single();

    // 2. Insertar Postulaciones (id_estado_postulacion: 3 = Aprobado, 2 = Espera, 1 = Pendiente)
    const { data: post1 } = await _supabaseClient.from('postulacion').insert({
      id_estudiante: est1.id_estudiante,
      id_estado_postulacion: 3,
      observacion: 'Aprobado por el comité',
      documentos_completos: true,
      entrevista_realizada: true
    }).select().single();

    const { data: post2 } = await _supabaseClient.from('postulacion').insert({
      id_estudiante: est2.id_estudiante,
      id_estado_postulacion: 3,
      observacion: 'Aprobado',
      documentos_completos: true,
      entrevista_realizada: true
    }).select().single();

    const { data: post3 } = await _supabaseClient.from('postulacion').insert({
      id_estudiante: est3.id_estudiante,
      id_estado_postulacion: 3,
      observacion: 'Aprobado',
      documentos_completos: true,
      entrevista_realizada: true
    }).select().single();

    const { data: post4 } = await _supabaseClient.from('postulacion').insert({
      id_estudiante: est4.id_estudiante,
      id_estado_postulacion: 2, // En lista de espera
      observacion: 'En lista de espera para vacante',
      documentos_completos: true,
      entrevista_realizada: true
    }).select().single();

    const { data: post5 } = await _supabaseClient.from('postulacion').insert({
      id_estudiante: est5.id_estudiante,
      id_estado_postulacion: 3, // Aprobado pero luego suspendido
      observacion: 'Aprobado',
      documentos_completos: true,
      entrevista_realizada: true
    }).select().single();

    // 3. Insertar Beneficiarios
    const { data: ben1 } = await _supabaseClient.from('beneficiario').insert({
      id_postulacion: post1.id_postulacion,
      fecha_inicio: '2026-03-01',
      fecha_fin: '2026-07-31',
      activo: true
    }).select().single();

    const { data: ben2 } = await _supabaseClient.from('beneficiario').insert({
      id_postulacion: post2.id_postulacion,
      fecha_inicio: '2026-03-01',
      fecha_fin: '2026-07-31',
      activo: true
    }).select().single();

    const { data: ben3 } = await _supabaseClient.from('beneficiario').insert({
      id_postulacion: post3.id_postulacion,
      fecha_inicio: '2026-03-01',
      fecha_fin: '2026-07-31',
      activo: true
    }).select().single();

    const { data: ben5 } = await _supabaseClient.from('beneficiario').insert({
      id_postulacion: post5.id_postulacion,
      fecha_inicio: '2026-03-01',
      fecha_fin: '2026-07-31',
      activo: false // Suspendido
    }).select().single();

    // 4. Insertar Personal
    const { data: pers1 } = await _supabaseClient.from('personal').insert({
      nombres: 'Rosa Liceth',
      apellidos: 'Vargas Nina',
      numero_documento: '20123456',
      telefono: '953654321',
      correo: 'rvargas@unam.edu.pe',
      direccion: 'Ilo',
      id_cargo: 3, // Asistente Social principal
      id_estado: 1
    }).select().single();

    const { data: pers2 } = await _supabaseClient.from('personal').insert({
      nombres: 'Administrador',
      apellidos: 'Sistema',
      numero_documento: '00000001',
      telefono: '953111111',
      correo: 'admin@unam.edu.pe',
      direccion: 'Ilo',
      id_cargo: 1, // Director
      id_estado: 1
    }).select().single();

    // 5. Cuentas de Acceso (Usuario)
    // Nota: El trigger tr_beneficiario_crear_usuario_automatico creará cuentas para ben1, ben2, ben3, ben5.
    // Solo debemos crear manualmente las del personal:
    await _supabaseClient.from('usuario').insert([
      {
        usuario: '20123456', // Nombre de usuario para Rosa Liceth (DNI)
        contrasena: '20123456',
        id_rol: 2, // Asistente Social
        id_personal: pers1.id_personal,
        id_estado: 1
      },
      {
        usuario: '00000001', // Admin
        contrasena: '00000001',
        id_rol: 1, // Administrador
        id_personal: pers2.id_personal,
        id_estado: 1
      }
    ]);

    // 6. Solicitudes & Asistencias Históricas
    const today = getToday();
    
    // Asistencia de hoy para María Elena (ben1)
    const { data: sol1 } = await _supabaseClient.from('solicitud').insert({
      fecha_solicitud: today,
      id_beneficiario: ben1.id_beneficiario,
      id_tipo_racion: 2, // Almuerzo
      id_horario: 2,
      id_estado_solicitud: 3 // Atendida
    }).select().single();

    await _supabaseClient.from('asistencia').insert({
      id_solicitud: sol1.id_solicitud,
      fecha: today,
      hora: '12:15:00',
      asistio: true,
      justificado: false
    });

    // Asistencia de hoy para Carlos (ben2)
    const { data: sol2 } = await _supabaseClient.from('solicitud').insert({
      fecha_solicitud: today,
      id_beneficiario: ben2.id_beneficiario,
      id_tipo_racion: 2,
      id_horario: 2,
      id_estado_solicitud: 3
    }).select().single();

    await _supabaseClient.from('asistencia').insert({
      id_solicitud: sol2.id_solicitud,
      fecha: today,
      hora: '12:22:00',
      asistio: true,
      justificado: false
    });

    showToast('success', '¡Siembra completada!', 'Los datos se han cargado correctamente en Supabase.');
  } catch (err) {
    console.error('Error al sembrar base de datos Supabase:', err);
    showToast('error', 'Error al Sembrar', err.message);
  }
}

// Sincronizar cache local con Supabase para renderizado instantáneo
async function syncLocalCacheWithSupabase() {
  if (!USE_SUPABASE) return;
  try {
    // 1. Beneficiarios y Estudiantes
    const { data: bens } = await BeneficiariosService.getAll();
    if (bens) {
      DB._data.beneficiarios = bens.map(b => ({
        id: b.id,
        usuario_id: b.usuario_id,
        userId: b.usuario_id, // Map for UI compatibility
        fecha_inicio: b.fecha_inicio,
        fecha_fin: b.fecha_fin,
        estado: b.estado,
        score_socioeconomico: b.score_socioeconomico,
        turno: b.turno,
        qr_code: b.qr_code,
        ausencias_consecutivas: b.ausencias_consecutivas,
        ausencias_mes: b.ausencias_mes
      }));

      const usersList = bens.map(b => ({
        id: b.usuario_id,
        nombre: b.usuario.nombre,
        rol: 'beneficiario',
        dni: b.usuario.dni,
        email: b.usuario.email,
        activo: b.usuario.activo,
        avatar: b.usuario.avatar,
        carrera: b.usuario.carrera,
        ciclo: b.usuario.ciclo,
        codigo: b.usuario.codigo
      }));
      
      const currentUsers = DB._data.users || [];
      const staffUsers = currentUsers.filter(u => u.rol !== 'beneficiario');
      DB._data.users = [...usersList, ...staffUsers];
    }

    // 2. Postulantes
    const { data: posts } = await PostulantesService.getAll();
    if (posts) {
      DB._data.postulantes = posts.map(p => ({
        id: p.id,
        userId: p.id, // Map for UI compatibility
        nombre: p.nombre,
        dni: p.dni,
        email: p.email,
        carrera: p.carrera,
        ciclo: p.ciclo,
        score_socioeconomico: p.score_socioeconomico,
        fecha_postulacion: p.fecha_postulacion,
        estado: p.estado,
        documentos: p.documentos,
        observaciones: p.observaciones
      }));
    }

    // 3. Asistencias
    const { data: asis } = await AsistenciasService.getAll();
    if (asis) {
      DB._data.asistencias = asis.map(a => ({
        id: a.id,
        beneficiario_id: a.beneficiario_id,
        beneficiarioId: a.beneficiario_id, // Map for UI compatibility
        userId: a.beneficiario_id, // Map for UI compatibility
        fecha: a.fecha,
        hora: a.hora,
        turno: a.turno,
        metodo: a.metodo
      }));
    }

    // 4. Justificaciones
    const { data: jus } = await JustificacionesService.getAll();
    if (jus) {
      DB._data.justificaciones = jus.map(j => ({
        id: j.id,
        beneficiario_id: j.beneficiario_id,
        beneficiarioId: j.beneficiario_id, // Map for UI compatibility
        userId: j.beneficiario_id, // Map for UI compatibility
        fecha_ausencia: j.fecha_ausencia,
        motivo: j.motivo,
        documento: j.documento,
        estado: j.estado,
        fecha_solicitud: j.fecha_solicitud,
        fecha_resolucion: j.fecha_resolucion || null,
        aprobado_por: j.aprobado_por || null,
        observaciones: j.observaciones || ''
      }));
    }

    // 5. Auditoría
    const { data: logs } = await AuditoriaService.getAll();
    if (logs) {
      DB._data.auditoria = logs;
    }

    DB._save();
  } catch (err) {
    console.error('Error al sincronizar cache con Supabase:', err);
  }
}
