/* ============================================================
   components/scanner.js — Lógica del Escáner de Asistencia
   ============================================================
   Maneja la lógica de registro de asistencia, el resultado
   visual, el teclado de DNI y la lista de últimos registros.
   
   No contiene HTML de la vista — ese está en scanner.view.js.
   Este componente solo procesa la lógica de negocio.
   ============================================================ */

const ScannerComponent = {

  /**
   * Procesa un escaneo: valida el DNI/QR y registra asistencia.
   * Muestra el resultado en #scanner-result y reproduce audio.
   * @param {string} input  — DNI o código QR
   * @param {string} method — 'qr' | 'barcode' | 'dni'
   */
  async process(input, method) {
    if (!input?.trim()) {
      showToast('warning', 'Campo vacío', 'Ingresa un código o DNI válido.');
      return;
    }

    // Si el input es un QR code, resolverlo al DNI del usuario
    let dni = input.trim();
    if (dni.startsWith('QR-')) {
      const ben  = DB.get('beneficiarios').find(b => b.qr_code === dni);
      const user = ben ? DB.get('users').find(u => u.id === ben.usuario_id) : null;
      if (user) dni = user.dni;
    }

    const result = await BeneficiariosService.registrarAsistencia(dni, method);
    this._mostrarResultado(result);
    this._actualizarListaReciente();

    // Limpiar input
    const inp = $('scanner-input');
    if (inp) inp.value = '';
  },

  /**
   * Muestra el panel de resultado de asistencia.
   * @private
   */
  _mostrarResultado(result) {
    const resultEl    = $('scanner-result');
    const centerIcon  = $('scanner-center-icon');

    if (!resultEl) return;
    if (centerIcon) centerIcon.style.display = 'none';

    let html    = '';
    let tipo    = '';
    let sonido  = '';

    if (result.ok) {
      tipo   = 'success';
      sonido = 'success';
      html   = `
        <div class="attendance-result success" style="margin:0.5rem auto">
          <div class="result-icon">✅</div>
          <div class="result-title" style="color:var(--emerald)">¡Asistencia registrada!</div>
          <div class="result-name">${result.usuario.nombre}</div>
          <div class="result-detail">${result.usuario.carrera ?? ''} · ${new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>`;
      showToast('success', '✅ Asistencia OK', `${result.usuario.nombre} registrado correctamente.`);

    } else if (result.code === 'ALREADY') {
      tipo   = 'warning';
      sonido = 'warn';
      html   = `
        <div class="attendance-result warning" style="margin:0.5rem auto">
          <div class="result-icon">⚠️</div>
          <div class="result-title" style="color:var(--amber)">Ya registrado</div>
          <div class="result-name">${result.usuario?.nombre ?? 'Estudiante'}</div>
          <div class="result-detail">Asistencia ya registrada hoy</div>
        </div>`;
      showToast('warning', 'Ya registrado', 'Este estudiante ya marcó asistencia hoy.');

    } else if (result.code === 'SUSPENDED') {
      tipo   = 'error';
      sonido = 'error';
      html   = `
        <div class="attendance-result error" style="margin:0.5rem auto">
          <div class="result-icon">⊘</div>
          <div class="result-title" style="color:var(--rose)">Beneficio suspendido</div>
          <div class="result-name">${result.usuario?.nombre ?? ''}</div>
          <div class="result-detail">${result.msg}</div>
        </div>`;
      showToast('error', 'Suspendido', result.msg);

    } else {
      tipo   = 'error';
      sonido = 'error';
      html   = `
        <div class="attendance-result error" style="margin:0.5rem auto">
          <div class="result-icon">❌</div>
          <div class="result-title" style="color:var(--rose)">No encontrado</div>
          <div class="result-detail">${result.msg}</div>
        </div>`;
      showToast('error', 'No encontrado', result.msg);
    }

    resultEl.style.display = 'flex';
    resultEl.innerHTML     = html;
    playSound(sonido);

    // Auto-ocultar después de 3.5 s y restaurar ícono central
    setTimeout(() => {
      resultEl.style.display = 'none';
      resultEl.innerHTML     = '';
      if (centerIcon) centerIcon.style.display = 'flex';
      this._actualizarListaReciente();
    }, 3500);
  },

  /**
   * Renderiza la lista de últimos registros del día en el contenedor dado.
   * @param {string} containerId — ID del elemento (default: 'last-registrations')
   */
  _actualizarListaReciente(containerId = 'last-registrations') {
    const el = $(containerId);
    if (!el) return;

    const today   = getToday();
    const recents = DB.get('asistencias').filter(a => a.fecha === today).slice(-5).reverse();

    if (!recents.length) { el.innerHTML = ''; return; }

    const filas = recents.map(a => {
      const ben  = DB.getOne('beneficiarios', a.beneficiario_id);
      const user = ben ? DB.get('users').find(u => u.id === ben.usuario_id) : null;
      return user ? `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
          <div class="avatar" style="width:30px;height:30px;font-size:0.62rem">${user.avatar}</div>
          <div style="flex:1;font-size:0.82rem;color:var(--text-secondary)">${user.nombre}</div>
          <span class="badge badge-info">${a.metodo.toUpperCase()}</span>
          <span style="font-size:0.78rem;color:var(--text-muted)">${a.hora}</span>
        </div>` : '';
    }).join('');

    el.innerHTML = `
      <div class="card" style="margin-top:1.5rem">
        <div class="card-title" style="font-size:0.85rem">⚡ Últimos registros de hoy</div>
        ${filas}
      </div>`;
  },

  /**
   * Maneja las pulsaciones del teclado numérico de DNI.
   * @param {string} key — dígito, '⌫' o '↵'
   */
  keypadPress(key) {
    const inp = $('scanner-input');
    if (!inp) return;
    if (key === '⌫') { inp.value = inp.value.slice(0, -1); return; }
    if (key === '↵') { this.process(inp.value, 'dni'); inp.value = ''; return; }
    if (inp.value.length < 8) inp.value += key;
  },
};
