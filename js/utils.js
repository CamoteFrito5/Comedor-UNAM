/* ============================================================
   utils.js — Utilidades y Helpers Globales
   ============================================================
   Funciones puras sin estado propio. Pueden usarse desde
   cualquier módulo. No importan nada de otros archivos JS.
   
   Secciones:
   1. Selectores DOM
   2. Formato de fechas
   3. Generación de HTML reutilizable
   4. Toast notifications
   5. Modales
   6. Generador de QR (SVG puro)
   7. Audio (Web Audio API)
   8. Helpers de fecha
   ============================================================ */

// ─── 1. Selectores DOM ───────────────────────────────────────
// Atajos reutilizables para acceso al DOM.
const $ = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─── 2. Formato de fechas ────────────────────────────────────

/**
 * Formatea una fecha ISO (YYYY-MM-DD) al formato peruano DD/MM/YYYY.
 * @param {string} date — fecha en formato ISO o con hora
 * @returns {string} fecha formateada o '—' si es nula
 */
function fmt(date) {
  if (!date) return '—';
  // Forzar hora para evitar desfase de zona horaria
  const d = new Date(date.includes('T') ? date : date + 'T00:00:00');
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Devuelve texto relativo: 'Hoy', 'Ayer', 'Hace N días', o fecha.
 * @param {string} dateStr — fecha ISO
 * @returns {string}
 */
function fmtRelative(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - d) / 86_400_000); // días de diferencia
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7)  return `Hace ${diff} días`;
  return fmt(dateStr);
}

/**
 * Fecha de hoy en formato YYYY-MM-DD (compatible con ISO 8601).
 * @returns {string}
 */
function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Fecha de hoy en formato largo para mostrar al usuario.
 * Ejemplo: "lunes, 14 de julio de 2026"
 * @returns {string}
 */
function getTodayDisplay() {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── 3. Generación de HTML reutilizable ─────────────────────

/**
 * Genera el HTML de un badge de estado coloreado.
 * @param {string} estado — 'activo' | 'suspendido' | 'pendiente' | 'aprobado' | 'rechazado' | 'observado'
 * @returns {string} HTML del badge
 */
function statusBadge(estado) {
  const map = {
    activo:     ['badge-success', '✔ Activo'],
    suspendido: ['badge-danger',  '⊘ Suspendido'],
    pendiente:  ['badge-warning', '⏳ Pendiente'],
    aprobado:   ['badge-success', '✔ Aprobado'],
    rechazado:  ['badge-danger',  '✖ Rechazado'],
    observado:  ['badge-info',    '👁 Observado'],
    inactivo:   ['badge-neutral', '— Inactivo'],
  };
  const [cls, label] = map[estado] || ['badge-neutral', estado];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ─── 4. Toast Notifications ──────────────────────────────────

/**
 * Muestra una notificación tipo toast en la esquina superior derecha.
 * Se auto-destruye después de `duration` ms.
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} title — título en negrita
 * @param {string} msg   — mensaje descriptivo
 * @param {number} duration — ms antes de desaparecer (default: 4000)
 */
function showToast(type, title, msg, duration = 4000) {
  const container = $('toast-container');
  if (!container) return;

  const icons  = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast  = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fadeout');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ─── 5. Modales ──────────────────────────────────────────────

/** Abre un modal por su ID. */
function openModal(id)  { const el = $(id); if (el) el.classList.add('open'); }

/** Cierra un modal por su ID. */
function closeModal(id) { const el = $(id); if (el) el.classList.remove('open'); }

// Cierra cualquier modal al hacer clic en el overlay
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ─── 6. Generador de QR (SVG puro) ──────────────────────────

/**
 * Genera un QR visual (no escaneable) en SVG basado en un hash
 * determinista del texto. Sirve como representación visual.
 * Para QR real, conecta una librería como qrcode.js.
 *
 * @param {string} text — texto a codificar (QR code del beneficiario)
 * @param {number} size — tamaño en px (default: 120)
 * @returns {string} HTML del SVG
 */
function generateQRSvg(text, size = 120) {
  // Hash simple determinista del texto
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  const cells = 15;
  const cs    = Math.floor(size / cells);
  let svg     = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg        += `<rect width="${size}" height="${size}" fill="white"/>`;

  // Módulos aleatorios basados en hash
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const bit = ((hash >> ((r * cells + c) % 32)) & 1) || _isFinderArea(r, c, cells);
      if (bit) svg += `<rect x="${c * cs}" y="${r * cs}" width="${cs}" height="${cs}" fill="#0b1329"/>`;
    }
  }

  // Patrones de esquina (finder patterns)
  [[0, 0], [0, cells - 7], [cells - 7, 0]].forEach(([ro, co]) => {
    svg += `<rect x="${co*cs}" y="${ro*cs}" width="${7*cs}" height="${7*cs}" fill="#0b1329" rx="2"/>`;
    svg += `<rect x="${(co+1)*cs}" y="${(ro+1)*cs}" width="${5*cs}" height="${5*cs}" fill="white" rx="1"/>`;
    svg += `<rect x="${(co+2)*cs}" y="${(ro+2)*cs}" width="${3*cs}" height="${3*cs}" fill="#0b1329"/>`;
  });

  svg += '</svg>';
  return svg;
}

/** @private Determina si una celda pertenece al área de un finder pattern */
function _isFinderArea(r, c, cells) {
  return (r < 7 && c < 7)
      || (r < 7 && c >= cells - 7)
      || (r >= cells - 7 && c < 7);
}

// ─── 7. Audio (Web Audio API) ────────────────────────────────

/**
 * Reproduce un tono corto de feedback sin archivos de audio.
 * Usa la Web Audio API disponible en todos los navegadores modernos.
 * @param {'success'|'warn'|'error'} type
 */
function playSound(type) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880,  ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    } else if (type === 'warn') {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {
    // Silencioso si el navegador bloquea el audio
  }
}

// ─── 8. Helpers de descarga simulada ─────────────────────────

/**
 * Simula la descarga de un reporte mostrando toasts de progreso.
 * @param {string} titulo — nombre del reporte
 * @param {string} formato — 'PDF' | 'Excel'
 */
function simulateDownload(titulo, formato) {
  showToast('info', `Generando ${formato}…`, `Preparando "${titulo}". La descarga iniciará pronto.`);
  setTimeout(() => {
    showToast('success', '¡Descarga lista!', `${titulo}.${formato.toLowerCase()} descargado correctamente.`);
  }, 2500);
}
