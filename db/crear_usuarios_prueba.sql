-- =============================================================================
-- SCRIPT: Semilla de Cuentas de Usuario de Prueba para Todos los Módulos
-- OBJETIVO: Insertar cuentas de prueba con contraseñas en Supabase para poder
--           logearse y operar en cualquiera de los módulos.
--
-- CREDENCIALES GENERADAS (DNI + Contraseña):
--   1. Administrador:      DNI: 70001000 | Contraseña: admin123
--   2. Director DBU:       DNI: 70002000 | Contraseña: dbu123
--   3. Asistente Social:   DNI: 70003000 | Contraseña: social123
--   4. Beneficiario:       DNI: 72345678 | Contraseña: beneficiario123
-- =============================================================================

-- ==========================================
-- 1. INSERTAR PERSONAL DE BIENESTAR / ADMIN
-- ==========================================

-- 1.1 Administrador (Cargo: Soporte/Sistemas = 3)
INSERT INTO public.personal (nombres, apellidos, numero_documento, telefono, correo, id_cargo, id_estado)
VALUES ('Admin', 'Comedor', '70001000', '999888777', 'admin@unammoquegua.edu.pe', 3, 1)
ON CONFLICT (numero_documento) DO NOTHING;

-- 1.2 Director de Bienestar (Cargo: Director = 1)
INSERT INTO public.personal (nombres, apellidos, numero_documento, telefono, correo, id_cargo, id_estado)
VALUES ('Roberto', 'Flores DBU', '70002000', '999222333', 'rflores.dbu@unammoquegua.edu.pe', 1, 1)
ON CONFLICT (numero_documento) DO NOTHING;

-- 1.3 Asistente Social Principal (Cargo: Asistente = 2)
INSERT INTO public.personal (nombres, apellidos, numero_documento, telefono, correo, id_cargo, id_estado)
VALUES ('Rosa', 'Vargas Social', '70003000', '999333444', 'rvargas.social@unammoquegua.edu.pe', 2, 1)
ON CONFLICT (numero_documento) DO NOTHING;


-- ==========================================
-- 2. INSERTAR ESTUDIANTE Y BENEFICIARIO DE PRUEBA
-- ==========================================

-- 2.1 Estudiante Base
INSERT INTO public.estudiante (codigo_universitario, dni, nombres, apellidos, sexo, fecha_nacimiento, telefono, correo, ciclo, id_escuela, id_estado)
VALUES ('2022001', '72345678', 'María Elena', 'Quispe Torres', 'F', '2004-05-15', '987654321', 'mquispe@unammoquegua.edu.pe', 4, 1, 1)
ON CONFLICT (dni) DO NOTHING;

-- 2.2 Postulación Aprobada
INSERT INTO public.postulacion (id_estudiante, fecha_postulacion, observacion, documentos_completos, entrevista_realizada, id_estado_postulacion, url_fut, url_ficha_socioeconomica, url_constancia_matricula)
SELECT 
    id_estudiante,
    CURRENT_DATE - INTERVAL '15 days',
    'Expediente aprobado para Beca Alimentaria 2026-I.',
    TRUE,
    TRUE,
    3, -- Estado: Aprobado
    'https://drive.google.com/FUT.pdf',
    'https://drive.google.com/ficha.pdf',
    'https://drive.google.com/constancia.pdf'
FROM public.estudiante
WHERE dni = '72345678'
ON CONFLICT DO NOTHING;

-- 2.3 Registro en la Tabla de Beneficiarios
-- (Si se ejecuta el trigger tr_beneficiario_actualizar_usuario_automatico, cambiará el rol en cascada)
INSERT INTO public.beneficiario (id_postulacion, fecha_inicio, activo)
SELECT 
    id_postulacion,
    CURRENT_DATE - INTERVAL '10 days',
    TRUE
FROM public.postulacion p
INNER JOIN public.estudiante e ON p.id_estudiante = e.id_estudiante
WHERE e.dni = '72345678'
ON CONFLICT (id_postulacion) DO NOTHING;


-- ==========================================
-- 3. VINCULAR CUENTAS DE USUARIO CON CONTRASENAS
-- ==========================================

-- 3.1 Administrador (Rol: 1)
INSERT INTO public.usuario (contrasena, id_rol, id_personal, id_estado)
SELECT 'admin123', 1, id_personal, 1
FROM public.personal
WHERE numero_documento = '70001000'
ON CONFLICT (id_personal) DO NOTHING;

-- 3.2 Dirección de Bienestar Universitario (Rol: 2)
INSERT INTO public.usuario (contrasena, id_rol, id_personal, id_estado)
SELECT 'dbu123', 2, id_personal, 1
FROM public.personal
WHERE numero_documento = '70002000'
ON CONFLICT (id_personal) DO NOTHING;

-- 3.3 Asistente Social (Rol: 3)
INSERT INTO public.usuario (contrasena, id_rol, id_personal, id_estado)
SELECT 'social123', 3, id_personal, 1
FROM public.personal
WHERE numero_documento = '70003000'
ON CONFLICT (id_personal) DO NOTHING;

-- 3.4 Beneficiario (Rol: 4)
INSERT INTO public.usuario (contrasena, id_rol, id_estudiante, id_beneficiario, id_estado)
SELECT 
    'beneficiario123', 
    4, -- Rol: Beneficiario
    e.id_estudiante,
    b.id_beneficiario,
    1  -- Estado: Activo
FROM public.beneficiario b
INNER JOIN public.postulacion p ON b.id_postulacion = p.id_postulacion
INNER JOIN public.estudiante e ON p.id_estudiante = e.id_estudiante
WHERE e.dni = '72345678'
ON CONFLICT (id_estudiante) DO NOTHING;
