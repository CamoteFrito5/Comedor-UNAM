/*=============================================================================
    PROYECTO: SISTEMA DE COMEDOR UNIVERSITARIO (TRIGGERS POSTGRESQL / SUPABASE)
    DESCRIPCIÓN: Script de creación de funciones PL/pgSQL y desencadenadores.
    SGBD: PostgreSQL 12 o superior (Compatible con Supabase)
=============================================================================*/

-- USE ComedorUniversitario; -- En Supabase se omite esta línea ya que se ejecuta en la base de datos por defecto.

/*=============================================================================
    1. TRIGGER: tr_solicitud_evitar_duplicado
    DESCRIPCIÓN: Evita que un beneficiario registre más de una reserva de comida
                 para la misma fecha y ración (ej. Doble almuerzo en la misma fecha).
=============================================================================*/

-- Eliminar trigger y función previa si existen
DROP TRIGGER IF EXISTS tr_solicitud_evitar_duplicado ON solicitud;
DROP FUNCTION IF EXISTS fn_evitar_solicitud_duplicada();

-- Crear función del trigger
CREATE OR REPLACE FUNCTION fn_evitar_solicitud_duplicada()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM solicitud s
        WHERE s.id_beneficiario = NEW.id_beneficiario
          AND s.fecha_solicitud = NEW.fecha_solicitud
          AND s.id_tipo_racion = NEW.id_tipo_racion
          -- Excluir el registro actual si se trata de una modificación (UPDATE)
          AND s.id_solicitud <> COALESCE(NEW.id_solicitud, -1)
    ) THEN
        RAISE EXCEPTION 'El beneficiario ya cuenta con una solicitud registrada para esta ración en la fecha seleccionada.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
CREATE TRIGGER tr_solicitud_evitar_duplicado
BEFORE INSERT OR UPDATE ON solicitud
FOR EACH ROW
EXECUTE FUNCTION fn_evitar_solicitud_duplicada();

-- En Postgres, la siguiente línea se comenta para evitar errores de sintaxis:
-- PRINT 'Trigger tr_solicitud_evitar_duplicado creado.';


/*=============================================================================
    2. TRIGGER: tr_beneficiario_crear_usuario_automatico
    DESCRIPCIÓN: Crea automáticamente un usuario activo para el alumno cuando es
                 aceptado como beneficiario. El usuario será su código y
                 la contraseña inicial su DNI.
=============================================================================*/

-- Eliminar trigger y función previa si existen
DROP TRIGGER IF EXISTS tr_beneficiario_crear_usuario_automatico ON beneficiario;
DROP FUNCTION IF EXISTS fn_crear_usuario_automatico();

-- Crear función del trigger
CREATE OR REPLACE FUNCTION fn_crear_usuario_automatico()
RETURNS TRIGGER AS $$
BEGIN
    -- Rol de Beneficiario: id_rol = 3
    -- Estado de cuenta Activo: id_estado = 1
    INSERT INTO usuario (usuario, contrasena, id_rol, id_beneficiario, id_personal, id_estado, fecha_registro)
    SELECT 
        e.codigo_universitario,
        e.dni,
        3, -- Rol: Beneficiario
        NEW.id_beneficiario,
        NULL,
        1, -- Estado: Activo
        CURRENT_TIMESTAMP
    FROM postulacion p
    INNER JOIN estudiante e ON p.id_estudiante = e.id_estudiante
    WHERE p.id_postulacion = NEW.id_postulacion;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
CREATE TRIGGER tr_beneficiario_crear_usuario_automatico
AFTER INSERT ON beneficiario
FOR EACH ROW
EXECUTE FUNCTION fn_crear_usuario_automatico();

-- PRINT 'Trigger tr_beneficiario_crear_usuario_automatico creado.';


/*=============================================================================
    3. TRIGGER: tr_asistencia_controlar_inasistencias
    DESCRIPCIÓN: Si un beneficiario falta más de 5 veces de forma injustificada
                 (asistio = FALSE y justificado = FALSE), se desactiva su
                 beneficio automáticamente (activo = FALSE) y se bloquea su usuario.
=============================================================================*/

-- Eliminar trigger y función previa si existen
DROP TRIGGER IF EXISTS tr_asistencia_controlar_inasistencias ON asistencia;
DROP FUNCTION IF EXISTS fn_controlar_inasistencias();

-- Crear función del trigger
CREATE OR REPLACE FUNCTION fn_controlar_inasistencias()
RETURNS TRIGGER AS $$
DECLARE
    v_id_beneficiario INTEGER;
    v_inasistencias_injustificadas INTEGER;
BEGIN
    -- Obtener el id_beneficiario asociado a la asistencia a través de la solicitud
    SELECT s.id_beneficiario INTO v_id_beneficiario
    FROM solicitud s
    WHERE s.id_solicitud = NEW.id_solicitud;

    -- Solo procesar si el registro marca que NO asistió y NO está justificado
    IF NEW.asistio = FALSE AND NEW.justificado = FALSE THEN
        
        -- Contar las faltas injustificadas totales del beneficiario
        -- (Dado que es un trigger AFTER, el registro actual ya está en la tabla)
        SELECT COUNT(*) INTO v_inasistencias_injustificadas
        FROM asistencia a
        INNER JOIN solicitud s ON a.id_solicitud = s.id_solicitud
        WHERE s.id_beneficiario = v_id_beneficiario
          AND a.asistio = FALSE
          AND a.justificado = FALSE;

        -- Regla de negocio: si acumula más de 5 faltas injustificadas (> 5)
        IF v_inasistencias_injustificadas > 5 THEN
            
            -- Desactivar el beneficio (activo = FALSE)
            UPDATE beneficiario
            SET activo = FALSE
            WHERE id_beneficiario = v_id_beneficiario;

            -- Bloquear la cuenta de usuario (id_estado = 2 -> Inactivo)
            UPDATE usuario
            SET id_estado = 2
            WHERE id_beneficiario = v_id_beneficiario;
            
            -- Opcionalmente registrar un detalle
            RAISE NOTICE 'Beneficiario ID % desactivado por acumular % inasistencias injustificadas.', 
                v_id_beneficiario, v_inasistencias_injustificadas;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
CREATE TRIGGER tr_asistencia_controlar_inasistencias
AFTER INSERT OR UPDATE ON asistencia
FOR EACH ROW
EXECUTE FUNCTION fn_controlar_inasistencias();

-- PRINT 'Trigger tr_asistencia_controlar_inasistencias creado.';
