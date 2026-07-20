-- =============================================================================
-- SCRIPT: Agregar Usuario Administrador de Prueba / Producción
-- OBJETIVO: Crear un registro en 'personal' y su correspondiente 'usuario'
--           con Rol 1 (Administrador) para poder iniciar sesión.
-- LOGIN CREDENTIALS:
--   DNI (Usuario): 70001000
--   Contraseña:    admin123
-- =============================================================================

-- 1. Insertar el registro en la tabla de Personal
-- Se asume cargo = 3 ('Ingeniero de Soporte y Sistemas') y estado = 1 ('Activo')
INSERT INTO public.personal (nombres, apellidos, numero_documento, telefono, correo, direccion, id_cargo, id_estado)
VALUES (
    'Admin', 
    'Comedor', 
    '70001000', 
    '999888777', 
    'admin@unammoquegua.edu.pe', 
    'Ciudad Universitaria, Ilo', 
    3, -- Cargo: Ingeniero de Soporte y Sistemas
    1  -- Estado: Activo
)
ON CONFLICT (numero_documento) DO NOTHING;

-- 2. Insertar la cuenta de usuario vinculada
-- Se asume rol = 1 ('Administrador') y estado = 1 ('Activo')
INSERT INTO public.usuario (contrasena, id_rol, id_personal, id_estado)
SELECT 
    'admin123', -- Contraseña en texto plano (el trigger/sistema se encarga de verificarla)
    1,          -- Rol: Administrador
    id_personal, 
    1           -- Estado: Activo
FROM public.personal 
WHERE numero_documento = '70001000'
ON CONFLICT (id_personal) DO NOTHING;
