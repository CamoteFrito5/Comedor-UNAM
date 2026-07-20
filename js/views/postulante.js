/* ============================================================
   views/postulante.js — Portal Público del Postulante
   ============================================================
   MÓDULO SIN AUTENTICACIÓN. Acceso libre para cualquier
   estudiante que desee:
   1. Iniciar el proceso de postulación a la beca alimentaria.
   2. Consultar el estado de su trámite mediante su DNI.

   NO requiere sesión activa ni login previo.
   El formulario de postulación llama a la función
   Supabase RPC: fn_crear_postulacion_estudiante().
   La consulta de estado llama a: fn_obtener_estado_postulante().
   ============================================================ */

const PostulanteViews = {

  /* ──────────────────────────────────────────────────────────
     1. Inicio — Bienvenida y opciones del módulo
  ────────────────────────────────────────────────────────── */
  renderInicio(container) {
    container.innerHTML = `
      <div class="page-view" style="max-width:900px;margin:0 auto;">

        <!-- Banner de bienvenida -->
        <div class="card" style="background:linear-gradient(135deg,#0b2454,#003087);color:#fff;border:none;margin-bottom:1.5rem;padding:2.5rem;">
          <div style="display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap;">
            <div style="font-size:3rem;">📝</div>
            <div>
              <h1 style="margin:0;font-size:1.6rem;font-weight:800;color:#fff;">Portal del Postulante</h1>
              <p style="margin:0.35rem 0 0;opacity:0.85;font-size:0.95rem;">
                Comedor Universitario UNAM · Filial Ilo · Semestre ${INSTITUCION.periodo}
              </p>
            </div>
          </div>
          <div style="margin-top:1.5rem;padding:1rem;background:rgba(255,255,255,0.1);border-radius:0.75rem;font-size:0.875rem;line-height:1.7;">
            📌 Este portal es de <strong>acceso libre</strong>. No necesitas crear una cuenta para postular.<br>
            📌 Puedes consultar el estado de tu trámite en cualquier momento ingresando tu <strong>DNI</strong>.<br>
            📌 Si eres <strong>aprobado</strong>, recibirás instrucciones para configurar tu acceso al portal del Beneficiario.
          </div>
        </div>

        <!-- Opciones principales -->
        <div class="grid-2">
          <div class="card" style="border-top:4px solid var(--primary);cursor:pointer;" onclick="navigateTo('post-solicitar')">
            <div class="card-body" style="text-align:center;padding:2rem 1.5rem;">
              <div style="font-size:3rem;margin-bottom:1rem;">📤</div>
              <h3 style="margin:0 0 0.5rem;font-size:1.15rem;">Enviar Postulación</h3>
              <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1.5rem;">
                Completa el formulario en línea y adjunta tus documentos (FUT, ficha socioeconómica, constancia de matrícula).
              </p>
              <button class="btn btn-primary w-full">Iniciar Postulación →</button>
            </div>
          </div>

          <div class="card" style="border-top:4px solid var(--emerald);cursor:pointer;" onclick="navigateTo('post-estado')">
            <div class="card-body" style="text-align:center;padding:2rem 1.5rem;">
              <div style="font-size:3rem;margin-bottom:1rem;">🔍</div>
              <h3 style="margin:0 0 0.5rem;font-size:1.15rem;">Consultar Estado</h3>
              <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1.5rem;">
                Ingresa tu DNI para conocer el estado actual de tu expediente y ver el comentario de la evaluación.
              </p>
              <button class="btn btn-success w-full">Consultar mi trámite →</button>
            </div>
          </div>
        </div>

        <!-- Proceso de admisión -->
        <div class="card mt-4">
          <div class="card-header">
            <h3 class="card-title">📋 Proceso de Admisión — Pasos</h3>
          </div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:1rem;">
              ${[
                ['1', '📤', 'Enviar Postulación', 'Completa el formulario en línea con tus datos y carga los documentos requeridos (FUT, ficha socioeconómica, constancia de matrícula).'],
                ['2', '🔍', 'Evaluación por la DBU', 'La Dirección de Bienestar Universitario revisará tu expediente socioeconómico. Este proceso puede tomar hasta 15 días hábiles.'],
                ['3', '📧', 'Notificación de Resultado', 'Consulta el estado con tu DNI. Verás el resultado y el comentario de admisión redactado por la DBU.'],
                ['4', '🎓', 'Activación del Beneficio', 'Si eres aprobado, recibirás instrucciones para acceder al portal del Beneficiario y usar el comedor universitario.'],
              ].map(([num, icon, title, desc]) => `
                <div style="display:flex;gap:1rem;align-items:flex-start;">
                  <div style="min-width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;">${num}</div>
                  <div>
                    <strong>${icon} ${title}</strong>
                    <p style="margin:0.2rem 0 0;font-size:0.82rem;color:var(--text-muted);">${desc}</p>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>

      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     2. Solicitar — Formulario de postulación (sin login)
  ────────────────────────────────────────────────────────── */
  renderSolicitar(container) {
    container.innerHTML = `
      <div style="max-width:800px;margin:0 auto;">

        <div class="view-header">
          <div>
            <h2 class="view-title">📤 Formulario de Postulación</h2>
            <p class="view-subtitle">Completa todos los campos · Semestre ${INSTITUCION.periodo}</p>
          </div>
          <button class="btn btn-ghost" onclick="navigateTo('post-inicio')">← Volver</button>
        </div>

        <div class="alert alert-info" style="margin-bottom:1.5rem;">
          <span class="alert-icon">ℹ️</span>
          <div class="alert-body">
            Campos marcados con <strong>*</strong> son obligatorios. 
            Los documentos se cargan mediante URL (Supabase Storage, Google Drive, etc.).
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title">👤 Datos Personales</h3></div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nombres *</label>
                <input type="text" id="post-nombres" class="form-control" placeholder="Ej: Juan Carlos" required>
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos *</label>
                <input type="text" id="post-apellidos" class="form-control" placeholder="Ej: Quispe Torres" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">DNI * <span style="color:var(--text-muted);font-size:0.78rem">(8 dígitos)</span></label>
                <input type="text" id="post-dni" class="form-control" placeholder="Ej: 72345678" maxlength="8" pattern="[0-9]{8}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Código Universitario *</label>
                <input type="text" id="post-codigo" class="form-control" placeholder="Ej: 2022001234" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Sexo *</label>
                <select id="post-sexo" class="form-control">
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de Nacimiento *</label>
                <input type="date" id="post-fecha-nac" class="form-control" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input type="tel" id="post-telefono" class="form-control" placeholder="Ej: 987654321">
              </div>
              <div class="form-group">
                <label class="form-label">Correo Electrónico *</label>
                <input type="email" id="post-correo" class="form-control" placeholder="correo@unammoquegua.edu.pe" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Dirección</label>
              <input type="text" id="post-direccion" class="form-control" placeholder="Ej: Jr. Los Olivos 123, Ilo">
            </div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header"><h3 class="card-title">🎓 Datos Académicos</h3></div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Escuela Profesional *</label>
                <select id="post-escuela" class="form-control">
                  <option value="1">Ing. de Sistemas e Informática</option>
                  <option value="2">Ing. de Minas</option>
                  <option value="3">Ing. Ambiental</option>
                  <option value="4">Derecho y Ciencias Políticas</option>
                  <option value="5">Gestión Pública y Desarrollo Social</option>
                  <option value="6">Medicina Humana</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Ciclo Académico *</label>
                <select id="post-ciclo" class="form-control">
                  ${[...Array(10)].map((_, i) => `<option value="${i+1}">${i+1}° ciclo</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header">
            <h3 class="card-title">📎 Documentos Requeridos</h3>
            <span style="font-size:0.78rem;color:var(--text-muted)">Ingresa la URL pública de cada documento</span>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">FUT (Formulario Único de Trámite) * <span style="color:var(--text-muted);font-size:0.78rem">· URL de Google Drive o Supabase Storage</span></label>
              <input type="url" id="post-url-fut" class="form-control" placeholder="https://drive.google.com/..." required>
            </div>
            <div class="form-group">
              <label class="form-label">Ficha Socioeconómica * <span style="color:var(--text-muted);font-size:0.78rem">· Formulario institucional completado</span></label>
              <input type="url" id="post-url-ficha" class="form-control" placeholder="https://drive.google.com/..." required>
            </div>
            <div class="form-group">
              <label class="form-label">Constancia de Matrícula * <span style="color:var(--text-muted);font-size:0.78rem">· Del semestre vigente</span></label>
              <input type="url" id="post-url-constancia" class="form-control" placeholder="https://drive.google.com/..." required>
            </div>
          </div>
        </div>

        <div class="card mt-3" style="background:var(--surface-alt,var(--surface));">
          <div class="card-body">
            <label style="display:flex;gap:0.75rem;align-items:flex-start;cursor:pointer;">
              <input type="checkbox" id="post-acepta" style="margin-top:0.15rem;width:16px;height:16px;flex-shrink:0;">
              <span style="font-size:0.875rem;color:var(--text-secondary);">
                Declaro bajo juramento que la información proporcionada es verídica y que los documentos adjuntos son auténticos. 
                Entiendo que cualquier falsedad conlleva la <strong>anulación de la postulación</strong>.
              </span>
            </label>
          </div>
        </div>

        <div style="display:flex;gap:1rem;margin-top:1.5rem;margin-bottom:2rem;">
          <button class="btn btn-primary flex-1" style="padding:0.875rem;" onclick="PostulanteViews.submitPostulacion()">
            📤 Enviar Postulación
          </button>
          <button class="btn btn-ghost" onclick="navigateTo('post-inicio')">Cancelar</button>
        </div>

      </div>`;
  },

  /** Envía el formulario de postulación vía RPC */
  async submitPostulacion() {
    const get = id => $(id)?.value?.trim() || '';

    const nombres   = get('post-nombres');
    const apellidos = get('post-apellidos');
    const dni       = get('post-dni');
    const codigo    = get('post-codigo');
    const sexo      = get('post-sexo') || 'M';
    const fechaNac  = get('post-fecha-nac');
    const telefono  = get('post-telefono');
    const correo    = get('post-correo');
    const direccion = get('post-direccion');
    const ciclo     = parseInt(get('post-ciclo')) || 1;
    const idEscuela = parseInt(get('post-escuela')) || 1;
    const urlFut    = get('post-url-fut');
    const urlFicha  = get('post-url-ficha');
    const urlConst  = get('post-url-constancia');
    const acepta    = $('post-acepta')?.checked;

    // Validaciones
    if (!nombres || !apellidos || !dni || !codigo || !correo) {
      showToast('warning', 'Campos requeridos', 'Completa todos los campos obligatorios (*).');
      return;
    }
    if (dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      showToast('warning', 'DNI inválido', 'El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    if (!urlFut || !urlFicha || !urlConst) {
      showToast('warning', 'Documentos requeridos', 'Debes adjuntar los 3 documentos requeridos.');
      return;
    }
    if (!acepta) {
      showToast('warning', 'Declaración requerida', 'Debes aceptar la declaración jurada para continuar.');
      return;
    }

    showToast('info', 'Enviando postulación...', 'Procesando en el servidor.');

    try {
      let result;

      if (USE_SUPABASE && _supabaseClient) {
        const { data, error } = await _supabaseClient.rpc('fn_crear_postulacion_estudiante', {
          p_codigo_universitario:     codigo,
          p_dni:                      dni,
          p_nombres:                  nombres,
          p_apellidos:                apellidos,
          p_sexo:                     sexo,
          p_fecha_nacimiento:         fechaNac || null,
          p_telefono:                 telefono || null,
          p_correo:                   correo,
          p_direccion:                direccion || null,
          p_ciclo:                    ciclo,
          p_id_escuela:               idEscuela,
          p_url_fut:                  urlFut,
          p_url_ficha_socioeconomica: urlFicha,
          p_url_constancia_matricula: urlConst,
        });
        if (error) throw error;
        result = data;
      } else {
        // Modo offline
        const posts = DB.get('postulantes') || [];
        if (posts.find(p => p.dni === dni)) {
          result = { ok: false, error: 'Ya tienes una postulación activa.' };
        } else {
          const newPost = {
            id: DB.uid('POST'),
            nombre: `${nombres} ${apellidos}`,
            dni, correo, carrera: 'Sistemas', ciclo,
            fecha_postulacion: new Date().toISOString().slice(0, 10),
            estado: 'pendiente', documentos: ['FUT.pdf'],
            observacion: null,
          };
          DB.add('postulantes', newPost);
          result = { ok: true, mensaje: 'Postulación registrada correctamente.' };
        }
      }

      if (!result?.ok) {
        showToast('error', 'Error', result?.error || 'No se pudo registrar la postulación.');
        return;
      }

      // Mostrar confirmación
      const container = $('view-container');
      container.innerHTML = `
        <div style="max-width:600px;margin:3rem auto;text-align:center;">
          <div class="card" style="border-top:4px solid var(--emerald);padding:3rem 2rem;">
            <div style="font-size:4rem;margin-bottom:1rem;">🎉</div>
            <h2 style="color:var(--emerald);margin:0 0 0.75rem;">¡Postulación Enviada!</h2>
            <p style="color:var(--text-secondary);margin-bottom:1.5rem;line-height:1.7;">
              Tu postulación ha sido registrada exitosamente. La Dirección de Bienestar Universitario revisará tu expediente.
            </p>
            <div style="background:var(--surface-alt,#f8fafc);border-radius:0.75rem;padding:1rem;margin-bottom:1.5rem;text-align:left;font-size:0.875rem;">
              <strong>Datos de seguimiento:</strong><br>
              • <strong>DNI:</strong> ${dni}<br>
              • <strong>Nombre:</strong> ${nombres} ${apellidos}<br>
              • <strong>Estado actual:</strong> <span style="color:var(--amber)">Pendiente de evaluación</span>
            </div>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:1.5rem;">
              Puedes consultar el estado de tu trámite en cualquier momento usando tu DNI en la sección "Consultar Estado".
            </p>
            <button class="btn btn-primary" onclick="navigateTo('post-estado')">
              🔍 Consultar Estado de mi Trámite
            </button>
          </div>
        </div>`;

    } catch (err) {
      showToast('error', 'Error del servidor', err.message);
    }
  },

  /* ──────────────────────────────────────────────────────────
     3. Estado — Consulta pública por DNI
  ────────────────────────────────────────────────────────── */
  renderEstado(container) {
    container.innerHTML = `
      <div style="max-width:620px;margin:0 auto;">

        <div class="view-header">
          <div>
            <h2 class="view-title">🔍 Consultar Estado de Trámite</h2>
            <p class="view-subtitle">Ingresa tu DNI para conocer el estado de tu postulación</p>
          </div>
          <button class="btn btn-ghost" onclick="navigateTo('post-inicio')">← Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Tu DNI <span style="color:var(--text-muted);font-size:0.8rem">(8 dígitos)</span></label>
              <div style="display:flex;gap:0.75rem;">
                <input type="text" id="consulta-dni" class="form-control" 
                       placeholder="Ej: 72345678" maxlength="8" 
                       onkeydown="if(event.key==='Enter') PostulanteViews.consultarEstado()"
                       style="flex:1;">
                <button class="btn btn-primary" onclick="PostulanteViews.consultarEstado()">
                  🔍 Consultar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="resultado-estado" class="mt-4"></div>

      </div>`;
  },

  /** Consulta el estado del trámite por DNI */
  async consultarEstado() {
    const dni = $('consulta-dni')?.value?.trim();
    const resultadoEl = $('resultado-estado');

    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      showToast('warning', 'DNI inválido', 'Ingresa tu DNI de 8 dígitos.');
      return;
    }

    resultadoEl.innerHTML = `
      <div class="card" style="text-align:center;padding:2rem;">
        <div style="font-size:2rem;margin-bottom:0.75rem">⏳</div>
        <p>Consultando en el sistema...</p>
      </div>`;

    try {
      let resultado = null;

      if (USE_SUPABASE && _supabaseClient) {
        const { data, error } = await _supabaseClient.rpc('fn_obtener_estado_postulante', { p_dni: dni });
        if (error) throw error;
        resultado = data;
      } else {
        // Modo offline
        const posts = DB.get('postulantes') || [];
        const post  = posts.find(p => p.dni === dni);
        if (post) {
          resultado = {
            found:               true,
            nombre:              post.nombre || '—',
            dni,
            carrera:             post.carrera || 'Sistemas',
            ciclo:               post.ciclo || 1,
            fecha_postulacion:   post.fecha_postulacion || post.fecha || '—',
            estado:              post.estado === 'aprobado' ? 'Aprobado'
                               : post.estado === 'rechazado' ? 'Rechazado'
                               : post.estado === 'pendiente' ? 'Pendiente' : 'En Evaluación',
            id_estado:           post.estado === 'aprobado' ? 3 : post.estado === 'rechazado' ? 4 : 1,
            comentario_admision: post.observacion || null,
          };
        } else {
          resultado = { found: false, error: 'No se encontró ninguna postulación para este DNI.' };
        }
      }

      if (!resultado?.found) {
        resultadoEl.innerHTML = `
          <div class="card" style="border-left:4px solid var(--rose);">
            <div class="card-body" style="text-align:center;padding:2rem;">
              <div style="font-size:2rem;margin-bottom:0.75rem;">❌</div>
              <h4>Sin resultados</h4>
              <p style="color:var(--text-muted);">${resultado?.error || 'No se encontró ninguna postulación para el DNI ingresado.'}</p>
              <button class="btn btn-primary mt-3" onclick="navigateTo('post-solicitar')">
                📤 Iniciar Postulación
              </button>
            </div>
          </div>`;
        return;
      }

      const ESTADO_CONFIG = {
        1: { label: 'Pendiente de Evaluación',  color: 'var(--amber)',   icon: '⏰', badge: 'badge-warning' },
        2: { label: 'En Evaluación',             color: 'var(--sky)',     icon: '🔍', badge: 'badge-info'    },
        3: { label: 'APROBADO',                  color: 'var(--emerald)', icon: '✅', badge: 'badge-success' },
        4: { label: 'RECHAZADO',                 color: 'var(--rose)',    icon: '❌', badge: 'badge-danger'  },
        5: { label: 'En Lista de Espera',        color: 'var(--violet)',  icon: '⏳', badge: 'badge-purple'  },
      };
      const ec = ESTADO_CONFIG[resultado.id_estado] || ESTADO_CONFIG[1];

      resultadoEl.innerHTML = `
        <div class="card" style="border-top:4px solid ${ec.color};">
          <div class="card-header" style="align-items:center;">
            <h3 class="card-title">📋 Resultado de la Consulta</h3>
            <span class="badge ${ec.badge}">${ec.icon} ${ec.label}</span>
          </div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem 1.5rem;font-size:0.875rem;margin-bottom:1.5rem;">
              <div><span style="color:var(--text-muted)">Nombre completo</span><br><strong>${resultado.nombre}</strong></div>
              <div><span style="color:var(--text-muted)">DNI</span><br><strong>${resultado.dni}</strong></div>
              <div><span style="color:var(--text-muted)">Carrera</span><br><strong>${resultado.carrera}</strong></div>
              <div><span style="color:var(--text-muted)">Ciclo</span><br><strong>${resultado.ciclo}°</strong></div>
              <div><span style="color:var(--text-muted)">Fecha de postulación</span><br><strong>${resultado.fecha_postulacion}</strong></div>
              <div><span style="color:var(--text-muted)">Estado actual</span><br><strong style="color:${ec.color}">${ec.label}</strong></div>
            </div>

            ${resultado.comentario_admision ? `
              <div style="background:var(--surface-alt,#f8fafc);border-radius:0.75rem;padding:1.25rem;border-left:4px solid ${ec.color};">
                <strong style="display:block;margin-bottom:0.5rem;font-size:0.875rem;">
                  💬 Comentario de la Dirección de Bienestar Universitario:
                </strong>
                <p style="margin:0;font-size:0.875rem;color:var(--text-secondary);line-height:1.7;">
                  "${resultado.comentario_admision}"
                </p>
              </div>` : `
              <div style="color:var(--text-muted);font-size:0.85rem;font-style:italic;">
                📌 Tu expediente aún no ha sido evaluado. El comentario de admisión aparecerá aquí una vez que la DBU emita su decisión.
              </div>`
            }

            ${resultado.id_estado === 3 ? `
              <div class="alert alert-success" style="margin-top:1rem;">
                <span class="alert-icon">🎉</span>
                <div class="alert-body">
                  <strong>¡Felicitaciones!</strong> Tu postulación fue aprobada. Ingresa al módulo <strong>Beneficiario</strong> usando tu DNI y la contraseña que el sistema te asignó para acceder a tus beneficios.
                </div>
              </div>` : ''}
          </div>
        </div>`;

    } catch (err) {
      resultadoEl.innerHTML = `
        <div class="card" style="border-left:4px solid var(--rose);">
          <div class="card-body">
            <h4>Error al consultar</h4>
            <p style="color:var(--text-muted);font-family:monospace;font-size:0.82rem;">${err.message}</p>
          </div>
        </div>`;
    }
  },

};
