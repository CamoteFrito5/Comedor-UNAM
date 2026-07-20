/*=============================================================================
    PROYECTO: SISTEMA DE GESTIÓN Y CONTROL DE ASISTENCIA DEL COMEDOR UNIVERSITARIO
    ESPECIFICACIÓN: Triggers PL/pgSQL optimizados para Supabase.
    SGBD: PostgreSQL (Supabase BaaS)
    ACTUALIZACIÓN: Alineado a 5 roles (ID 4=Beneficiario, 5=Postulante).
=============================================================================*/

-- ============================================================
-- 1. TRIGGER: tr_solicitud_evitar_duplicado
-- Evita duplicaciones de reservas de ración por beneficiario/día/turno.
-- ============================================================
DROP TRIGGER IF EXISTS tr_solicitud_evitar_duplicado ON public.solicitud;
DROP FUNCTION IF EXISTS public.fn_evitar_solicitud_duplicada();

CREATE OR REPLACE FUNCTION public.fn_evitar_solicitud_duplicada()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.solicitud s
        WHERE s.id_beneficiario = NEW.id_beneficiario
          AND s.fecha_solicitud = NEW.fecha_solicitud
          AND s.id_horario = NEW.id_horario
          AND s.id_solicitud <> COALESCE(NEW.id_solicitud, -1)
    ) THEN
        RAISE EXCEPTION 'El beneficiario ya cuenta con una reserva de ración para esta fecha y turno.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_solicitud_evitar_duplicado
BEFORE INSERT OR UPDATE ON public.solicitud
FOR EACH ROW
EXECUTE FUNCTION public.fn_evitar_solicitud_duplicada();


-- ============================================================
-- 2. TRIGGER: tr_beneficiario_actualizar_usuario_automatico
-- Cuando se aprueba una postulación e inserta en 'beneficiario',
-- cambia automáticamente el rol del usuario de Postulante (5) a Beneficiario (4)
-- y le asigna el id_beneficiario correspondiente.
-- ============================================================
DROP TRIGGER IF EXISTS tr_beneficiario_actualizar_usuario_automatico ON public.beneficiario;
DROP FUNCTION IF EXISTS public.fn_actualizar_usuario_beneficiario();

CREATE OR REPLACE FUNCTION public.fn_actualizar_usuario_beneficiario()
RETURNS TRIGGER AS $$
DECLARE
    v_id_estudiante INTEGER;
BEGIN
    -- Obtener el id_estudiante a través de la postulación
    SELECT p.id_estudiante INTO v_id_estudiante
    FROM public.postulacion p
    WHERE p.id_postulacion = NEW.id_postulacion;

    -- Actualizar el usuario: cambiar rol de Postulante (5) a Beneficiario (4)
    -- y asignar el id_beneficiario recién creado
    UPDATE public.usuario
    SET id_rol = 4,                           -- Beneficiario
        id_beneficiario = NEW.id_beneficiario
    WHERE id_estudiante = v_id_estudiante
      AND id_rol = 5;                         -- Solo si era Postulante

    -- Si no había usuario, no falla (puede ser postulación sin cuenta aún)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_beneficiario_actualizar_usuario_automatico
AFTER INSERT ON public.beneficiario
FOR EACH ROW
EXECUTE FUNCTION public.fn_actualizar_usuario_beneficiario();


-- ============================================================
-- 3. TRIGGER: tr_asistencia_controlar_inasistencias
-- Monitorea inasistencias injustificadas del beneficiario.
-- Reglas de suspensión automática:
--   - 3 faltas CONSECUTIVAS injustificadas en cualquier momento.
--   - 5 faltas ALTERNADAS (no justificadas) en el mismo mes.
-- ============================================================
DROP TRIGGER IF EXISTS tr_asistencia_controlar_inasistencias ON public.asistencia;
DROP FUNCTION IF EXISTS public.fn_controlar_inasistencias();

CREATE OR REPLACE FUNCTION public.fn_controlar_inasistencias()
RETURNS TRIGGER AS $$
DECLARE
    v_id_beneficiario     INTEGER;
    v_faltas_consecutivas INTEGER := 0;
    v_faltas_mensuales    INTEGER := 0;
    r_asistencia          RECORD;
BEGIN
    -- Obtener el id_beneficiario de la solicitud relacionada
    SELECT s.id_beneficiario INTO v_id_beneficiario
    FROM public.solicitud s
    WHERE s.id_solicitud = NEW.id_solicitud;

    -- Solo procesar inasistencias injustificadas nuevas
    IF NEW.asistio = FALSE AND NEW.justificado = FALSE THEN

        -- Regla 1: Contar faltas alternadas en el mismo mes
        SELECT COUNT(*) INTO v_faltas_mensuales
        FROM public.asistencia a
        INNER JOIN public.solicitud s ON a.id_solicitud = s.id_solicitud
        WHERE s.id_beneficiario = v_id_beneficiario
          AND a.asistio = FALSE
          AND a.justificado = FALSE
          AND DATE_TRUNC('month', a.fecha) = DATE_TRUNC('month', NEW.fecha);

        -- Regla 2: Contar faltas consecutivas (cronológicamente de más reciente a más antigua)
        FOR r_asistencia IN
            SELECT a.asistio, a.justificado
            FROM public.asistencia a
            INNER JOIN public.solicitud s ON a.id_solicitud = s.id_solicitud
            WHERE s.id_beneficiario = v_id_beneficiario
            ORDER BY a.fecha DESC, a.hora DESC
        LOOP
            IF r_asistencia.asistio = FALSE AND r_asistencia.justificado = FALSE THEN
                v_faltas_consecutivas := v_faltas_consecutivas + 1;
            ELSE
                EXIT; -- Rompe la cadena al primer registro con asistencia o justificación
            END IF;
        END LOOP;

        -- Aplicar suspensión si se supera cualquiera de los dos límites
        IF v_faltas_consecutivas >= 3 OR v_faltas_mensuales >= 5 THEN

            -- Desactivar el beneficio
            UPDATE public.beneficiario
            SET activo = FALSE,
                fecha_fin = NEW.fecha
            WHERE id_beneficiario = v_id_beneficiario;

            -- Bloquear la cuenta del usuario (Estado 3 = Suspendido)
            UPDATE public.usuario
            SET id_estado = 3
            WHERE id_beneficiario = v_id_beneficiario;

            RAISE NOTICE
                'Sanción automática: Beneficiario ID % suspendido. (Mensuales: %, Consecutivas: %)',
                v_id_beneficiario, v_faltas_mensuales, v_faltas_consecutivas;

        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_asistencia_controlar_inasistencias
AFTER INSERT OR UPDATE ON public.asistencia
FOR EACH ROW
EXECUTE FUNCTION public.fn_controlar_inasistencias();
