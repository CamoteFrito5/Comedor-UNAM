/*=============================================================================
    PROYECTO: SISTEMA DE GESTIÓN Y CONTROL DE ASISTENCIA DEL COMEDOR UNIVERSITARIO
    ESPECIFICACIÓN: Funciones PL/pgSQL consumidas por el frontend via Supabase RPC.
    SGBD: PostgreSQL (Supabase BaaS)
    DESCRIPCIÓN:
      Este archivo contiene las funciones de negocio centralizadas. El frontend
      las invoca mediante _supabaseClient.rpc('nombre_funcion', { params }).
      Así se mantiene la lógica transaccional en el servidor y no en el cliente.
=============================================================================*/

-- ============================================================
-- 1. fn_evaluar_postulante
-- Evalúa (aprueba o rechaza) una postulación.
-- Si se aprueba, crea automáticamente el registro de beneficiario.
-- El trigger tr_beneficiario_actualizar_usuario_automatico actualiza el rol.
-- ============================================================
DROP FUNCTION IF EXISTS public.fn_evaluar_postulante(INT, INT, VARCHAR);

CREATE OR REPLACE FUNCTION public.fn_evaluar_postulante(
    p_id_postulacion        INT,
    p_id_estado_postulacion INT,
    p_observacion           VARCHAR(300)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_beneficiario INT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.postulacion
        WHERE id_postulacion = p_id_postulacion
          AND id_estado_postulacion NOT IN (3, 4)
    ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Postulación no encontrada o ya fue resuelta.');
    END IF;

    UPDATE public.postulacion
    SET id_estado_postulacion = p_id_estado_postulacion,
        observacion = p_observacion
    WHERE id_postulacion = p_id_postulacion;

    IF p_id_estado_postulacion = 3 THEN
        INSERT INTO public.beneficiario (id_postulacion, fecha_inicio, activo)
        VALUES (p_id_postulacion, CURRENT_DATE, TRUE)
        RETURNING id_beneficiario INTO v_id_beneficiario;
    END IF;

    RETURN jsonb_build_object('ok', true, 'id_beneficiario', v_id_beneficiario);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;


-- ============================================================
-- 2. fn_registrar_asistencia_por_codigo
-- ============================================================
DROP FUNCTION IF EXISTS public.fn_registrar_asistencia_por_codigo(VARCHAR, VARCHAR, INT);

CREATE OR REPLACE FUNCTION public.fn_registrar_asistencia_por_codigo(
    p_dni           VARCHAR(15),
    p_metodo        VARCHAR(20),
    p_id_horario    INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_estudiante   INT;
    v_id_beneficiario INT;
    v_id_solicitud    INT;
    v_nombre          VARCHAR(200);
BEGIN
    SELECT id_estudiante, nombres || ' ' || apellidos
    INTO v_id_estudiante, v_nombre
    FROM public.estudiante
    WHERE dni = p_dni;

    IF v_id_estudiante IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'DNI no encontrado en el sistema.');
    END IF;

    SELECT b.id_beneficiario INTO v_id_beneficiario
    FROM public.beneficiario b
    INNER JOIN public.postulacion p ON b.id_postulacion = p.id_postulacion
    WHERE p.id_estudiante = v_id_estudiante
      AND b.activo = TRUE;

    IF v_id_beneficiario IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'El estudiante no es beneficiario activo. Acceso denegado.');
    END IF;

    SELECT s.id_solicitud INTO v_id_solicitud
    FROM public.solicitud s
    INNER JOIN public.asistencia a ON a.id_solicitud = s.id_solicitud
    WHERE s.id_beneficiario = v_id_beneficiario
      AND s.id_horario = p_id_horario
      AND a.fecha = CURRENT_DATE
      AND a.asistio = TRUE;

    IF v_id_solicitud IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Asistencia ya registrada para este turno hoy.');
    END IF;

    SELECT id_solicitud INTO v_id_solicitud
    FROM public.solicitud
    WHERE id_beneficiario = v_id_beneficiario
      AND id_horario = p_id_horario
      AND fecha_solicitud = CURRENT_DATE;

    IF v_id_solicitud IS NULL THEN
        INSERT INTO public.solicitud (fecha_solicitud, id_beneficiario, id_tipo_racion, id_horario, id_estado_solicitud)
        VALUES (CURRENT_DATE, v_id_beneficiario, p_id_horario, p_id_horario, 1)
        RETURNING id_solicitud INTO v_id_solicitud;
    END IF;

    INSERT INTO public.asistencia (id_solicitud, fecha, hora, asistio, justificado)
    VALUES (v_id_solicitud, CURRENT_DATE, CURRENT_TIME, TRUE, FALSE);

    UPDATE public.solicitud SET id_estado_solicitud = 2 WHERE id_solicitud = v_id_solicitud;

    RETURN jsonb_build_object(
        'ok', true,
        'nombre', v_nombre,
        'id_beneficiario', v_id_beneficiario,
        'metodo', p_metodo
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;


-- ============================================================
-- 3. fn_obtener_estado_postulante (consulta pública por DNI)
-- ============================================================
DROP FUNCTION IF EXISTS public.fn_obtener_estado_postulante(CHAR);

CREATE OR REPLACE FUNCTION public.fn_obtener_estado_postulante(
    p_dni CHAR(8)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'found', TRUE,
        'nombre',               e.nombres || ' ' || e.apellidos,
        'dni',                  e.dni,
        'carrera',              escpro.nombre_escuela,
        'ciclo',                e.ciclo,
        'fecha_postulacion',    p.fecha_postulacion,
        'estado',               ep2.nombre_estado,
        'id_estado',            p.id_estado_postulacion,
        'comentario_admision',  p.observacion
    ) INTO v_result
    FROM public.estudiante e
    INNER JOIN public.postulacion p ON p.id_estudiante = e.id_estudiante
    INNER JOIN public.escuela_profesional escpro ON escpro.id_escuela = e.id_escuela
    INNER JOIN public.estado_postulacion ep2 ON ep2.id_estado_postulacion = p.id_estado_postulacion
    WHERE e.dni = p_dni
    ORDER BY p.fecha_postulacion DESC
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('found', FALSE, 'error', 'No se encontró ninguna postulación para este DNI.');
    END IF;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('found', FALSE, 'error', SQLERRM);
END;
$$;


-- ============================================================
-- 4. fn_crear_postulacion_estudiante (registro sin sesión)
-- ============================================================
DROP FUNCTION IF EXISTS public.fn_crear_postulacion_estudiante(VARCHAR, CHAR, VARCHAR, VARCHAR, CHAR, DATE, VARCHAR, VARCHAR, VARCHAR, SMALLINT, INT, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION public.fn_crear_postulacion_estudiante(
    p_codigo_universitario     VARCHAR(12),
    p_dni                      CHAR(8),
    p_nombres                  VARCHAR(80),
    p_apellidos                VARCHAR(80),
    p_sexo                     CHAR(1),
    p_fecha_nacimiento         DATE,
    p_telefono                 VARCHAR(15),
    p_correo                   VARCHAR(100),
    p_direccion                VARCHAR(150),
    p_ciclo                    SMALLINT,
    p_id_escuela               INT,
    p_url_fut                  VARCHAR(255),
    p_url_ficha_socioeconomica VARCHAR(255),
    p_url_constancia_matricula VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_estudiante  INT;
    v_id_postulacion INT;
BEGIN
    SELECT id_estudiante INTO v_id_estudiante
    FROM public.estudiante WHERE dni = p_dni;

    IF v_id_estudiante IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.postulacion
            WHERE id_estudiante = v_id_estudiante
              AND id_estado_postulacion IN (1, 2)
        ) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'Ya tienes una postulación activa en proceso.');
        END IF;
    ELSE
        INSERT INTO public.estudiante (
            codigo_universitario, dni, nombres, apellidos, sexo,
            fecha_nacimiento, telefono, correo, direccion, ciclo,
            id_escuela, id_estado
        ) VALUES (
            p_codigo_universitario, p_dni, p_nombres, p_apellidos, p_sexo,
            p_fecha_nacimiento, p_telefono, p_correo, p_direccion, p_ciclo,
            p_id_escuela, 1
        ) RETURNING id_estudiante INTO v_id_estudiante;
    END IF;

    INSERT INTO public.postulacion (
        id_estudiante, fecha_postulacion, id_estado_postulacion,
        documentos_completos, entrevista_realizada,
        url_fut, url_ficha_socioeconomica, url_constancia_matricula
    ) VALUES (
        v_id_estudiante, CURRENT_DATE, 1,
        (p_url_fut IS NOT NULL AND p_url_ficha_socioeconomica IS NOT NULL AND p_url_constancia_matricula IS NOT NULL),
        FALSE,
        p_url_fut, p_url_ficha_socioeconomica, p_url_constancia_matricula
    ) RETURNING id_postulacion INTO v_id_postulacion;

    RETURN jsonb_build_object(
        'ok', true,
        'id_postulacion', v_id_postulacion,
        'id_estudiante', v_id_estudiante,
        'mensaje', 'Postulación registrada correctamente. Puedes consultar el estado con tu DNI.'
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'El DNI o código universitario ya está registrado.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;


-- ============================================================
-- 5. fn_restablecer_contrasena
-- ============================================================
DROP FUNCTION IF EXISTS public.fn_restablecer_contrasena(VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION public.fn_restablecer_contrasena(
    p_dni              VARCHAR(15),
    p_correo           VARCHAR(100),
    p_nueva_contrasena VARCHAR(200)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_usuario UUID;
BEGIN
    SELECT u.id_usuario INTO v_id_usuario
    FROM public.usuario u
    INNER JOIN public.estudiante e ON e.id_estudiante = u.id_estudiante
    WHERE e.dni = p_dni AND e.correo = p_correo
    LIMIT 1;

    IF v_id_usuario IS NULL THEN
        SELECT u.id_usuario INTO v_id_usuario
        FROM public.usuario u
        INNER JOIN public.personal p ON p.id_personal = u.id_personal
        WHERE p.numero_documento = p_dni AND p.correo = p_correo
        LIMIT 1;
    END IF;

    IF v_id_usuario IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'No se encontró un usuario con ese DNI y correo.');
    END IF;

    UPDATE public.usuario SET contrasena = p_nueva_contrasena WHERE id_usuario = v_id_usuario;

    RETURN jsonb_build_object('ok', true, 'mensaje', 'Contraseña actualizada exitosamente.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;


-- ============================================================
-- 6. fn_promover_lista_espera
-- ============================================================
DROP FUNCTION IF EXISTS public.fn_promover_lista_espera(INT);

CREATE OR REPLACE FUNCTION public.fn_promover_lista_espera(
    p_id_escuela_saliente INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_postulacion INT;
BEGIN
    SELECT p.id_postulacion INTO v_id_postulacion
    FROM public.postulacion p
    INNER JOIN public.estudiante e ON e.id_estudiante = p.id_estudiante
    WHERE p.id_estado_postulacion = 5
      AND e.id_escuela = p_id_escuela_saliente
    ORDER BY p.fecha_postulacion ASC
    LIMIT 1;

    IF v_id_postulacion IS NULL THEN
        SELECT id_postulacion INTO v_id_postulacion
        FROM public.postulacion
        WHERE id_estado_postulacion = 5
        ORDER BY fecha_postulacion ASC
        LIMIT 1;
    END IF;

    IF v_id_postulacion IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'No hay candidatos en lista de espera.');
    END IF;

    RETURN public.fn_evaluar_postulante(v_id_postulacion, 3, 'Promovido desde lista de espera por vacante disponible.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
