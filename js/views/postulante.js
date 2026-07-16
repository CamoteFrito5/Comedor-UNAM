/* ============================================================
   views/postulante.js — Portal del Postulante
   ============================================================
   Contiene todas las vistas para estudiantes postulantes.
   ============================================================ */

const PostulanteViews = {

  // ─── Inicio del Postulante ──────────────────────────────────
  renderInicio(container) {
    const userId = App.currentUserId;
    const user   = DB.getOne('users', userId) || {};
    
    // Buscar si ya tiene postulación
    const postulantes = DB.get('postulantes') || [];
    const post = postulantes.find(p => p.dni === user.dni || p.usuario_id === userId);

    const estadoHTML = post 
      ? statusBadge(post.estado)
      : '<span class="badge badge-neutral">No Iniciada</span>';

    container.innerHTML = `
      <div class="page-view">
        <div class="page-header">
          <h1>Portal del Postulante</h1>
          <p>Bienvenido, ${user.nombre || 'Estudiante'} · Convocatoria Comedor Universitario</p>
        </div>

        ${post && post.estado === 'aprobado' ? `
          <div class="alert alert-success" style="margin-bottom:1.5rem">
            <span class="alert-icon">🎉</span>
            <div class="alert-body">
              <strong>¡Postulación Aprobada!</strong>
              <p>Tu beneficio ya se encuentra activo en el comedor. Por favor, cierra sesión y entra a través del módulo de **Beneficiario** para usar tu código QR y ver tu calendario.</p>
            </div>
          </div>
        ` : ''}

        <div class="grid-2">
          <!-- Card de Acceso rápido -->
          <div class="card">
            <div class="card-title">📋 Mi Solicitud de Beca</div>
            <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1.25rem;">
              Presenta tus documentos socioeconómicos y FUT en formato digital para postular a la ración estudiantil sin trámites presenciales.
            </p>
            <button class="btn btn-primary" onclick="navigateTo('post-solicitar')">
              ${post ? '📝 Ver / Editar Postulación' : '📤 Iniciar Postulación'}
            </button>
          </div>

          <!-- Card de Estado -->
          <div class="card">
            <div class="card-title">🔍 Estado de Trámite</div>
            <div style="margin-bottom:1.25rem;">
              <span style="font-size:0.85rem;color:var(--text-secondary)">Estado actual:</span>
              <div style="margin-top:0.35rem;font-size:1.1rem;">${estadoHTML}</div>
            </div>
            <button class="btn btn-secondary-light" onclick="navigateTo('post-estado')">
              🔎 Consultar Expediente
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ─── Formulario de Postulación (FUT + Documentos) ────────────
  renderSolicitar(container) {
    // Reutilizar el formulario de postulación existente
    BeneficiarioViews.renderPostulacion(container);

    // Ajustar título para que encaje con el flujo del Postulante
    const headerTitle = container.querySelector('.page-header h1');
    if (headerTitle) headerTitle.textContent = 'Formulario de Postulación';
  },

  // ─── Estado del Trámite (US-05 Criterios de Aceptación) ───────
  renderEstado(container) {
    const userId = App.currentUserId;
    const user   = DB.getOne('users', userId) || {};
    
    // Buscar postulación
    const postulantes = DB.get('postulantes') || [];
    const post = postulantes.find(p => p.dni === user.dni || p.usuario_id === userId);

    let statusContentHTML = '';

    if (!post) {
      statusContentHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h4>Sin Solicitud Activa</h4>
          <p>Aún no has enviado tu postulación para el semestre actual.</p>
          <button class="btn btn-primary" style="margin-top:1rem" onclick="navigateTo('post-solicitar')">
            📤 Postular Ahora
          </button>
        </div>
      `;
    } else {
      const isAlert = post.estado === 'rechazado';
      const isWaiting = post.estado === 'evaluacion';
      const isQueue = post.estado === 'pendiente' && !post.activo; // Simulación de espera

      // Simular cola de espera
      let queuePosText = '';
      if (post.estado === 'pendiente') {
        queuePosText = `<p style="margin-top:0.5rem;font-weight:700;color:var(--amber-dark)">Estás en la posición N° 12 en la cola de reemplazo.</p>`;
      }

      statusContentHTML = `
        <div class="card" style="max-width:600px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <div style="font-size:2.5rem;margin-bottom:0.5rem;">
              ${post.estado === 'aprobado' ? '✅' : post.estado === 'rechazado' ? '❌' : '⏳'}
            </div>
            <h3 style="font-family:var(--font-display);font-size:1.2rem;color:var(--unam-navy);">
              Estado: ${post.estado.toUpperCase()}
            </h3>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">
              Fecha de envío: ${fmt(post.fecha_postulacion || post.fecha || getToday())}
            </p>
          </div>

          <div class="info-table">
            <div class="info-row">
              <span class="info-label">Postulante</span>
              <span class="info-value">${user.nombre}</span>
            </div>
            <div class="info-row">
              <span class="info-label">DNI / Código</span>
              <span class="info-value">${user.dni} / ${user.codigo || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Carrera</span>
              <span class="info-value">${user.carrera || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Observaciones</span>
              <span class="info-value" style="font-weight:500;">
                ${post.observaciones || post.observacion || 'Expediente recibido y en proceso de validación.'}
              </span>
            </div>
          </div>

          ${post.estado === 'pendiente' ? `
            <div class="alert alert-warning" style="margin-top:1.5rem;margin-bottom:0;">
              <span class="alert-icon">⏳</span>
              <div class="alert-body">
                <strong>En Lista de Espera</strong>
                <p>Tu expediente socioeconómico fue aprobado pero actualmente no hay vacantes disponibles en el comedor.</p>
                ${queuePosText}
              </div>
            </div>
          ` : ''}

          ${post.estado === 'evaluacion' ? `
            <div class="alert alert-info" style="margin-top:1.5rem;margin-bottom:0;">
              <span class="alert-icon">👁</span>
              <div class="alert-body">
                <strong>Evaluación Socioeconómica</strong>
                <p>Tu expediente está siendo validado por Bienestar Social. Documentos validados: FUT, Recibo Luz/Agua, Constancia de Notas.</p>
              </div>
            </div>
          ` : ''}

          ${post.estado === 'aprobado' ? `
            <div class="alert alert-success" style="margin-top:1.5rem;margin-bottom:0;">
              <span class="alert-icon">🎉</span>
              <div class="alert-body">
                <strong>Beneficio Aprobado</strong>
                <p>Tu cuenta ha sido promovida a Beneficiario. Cierra sesión e ingresa en el módulo correspondiente para acceder.</p>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page-view">
        <div class="page-header">
          <h1>Estado del Trámite</h1>
          <p>Consulta en tiempo real la situación de tu postulación al comedor</p>
        </div>
        ${statusContentHTML}
      </div>
    `;
  }

};
