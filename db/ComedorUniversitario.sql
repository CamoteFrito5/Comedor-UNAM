/*=============================================================================
    PROYECTO: SISTEMA DE COMEDOR UNIVERSITARIO (SOPORTE POSTGRESQL / SUPABASE)
    DESCRIPCIÓN: Script de creación de 20 tablas y datos semilla en snake_case.
    SGBD: PostgreSQL 12 o superior (Compatible con Supabase)
=============================================================================*/

-- 1. LIMPIEZA DE TABLAS EXISTENTES (Con borrado en cascada para evitar conflictos)
DROP TABLE IF EXISTS reporte CASCADE;
DROP TABLE IF EXISTS asistencia CASCADE;
DROP TABLE IF EXISTS detalle_solicitud CASCADE;
DROP TABLE IF EXISTS solicitud CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS personal CASCADE;
DROP TABLE IF EXISTS beneficiario CASCADE;
DROP TABLE IF EXISTS postulacion CASCADE;
DROP TABLE IF EXISTS estudiante CASCADE;
DROP TABLE IF EXISTS escuela_profesional CASCADE;
DROP TABLE IF EXISTS estado_solicitud CASCADE;
DROP TABLE IF EXISTS estado_postulacion CASCADE;
DROP TABLE IF EXISTS categoria_producto CASCADE;
DROP TABLE IF EXISTS cargo CASCADE;
DROP TABLE IF EXISTS horario CASCADE;
DROP TABLE IF EXISTS tipo_racion CASCADE;
DROP TABLE IF EXISTS facultad CASCADE;
DROP TABLE IF EXISTS tipo_documento CASCADE;
DROP TABLE IF EXISTS rol CASCADE;
DROP TABLE IF EXISTS estado CASCADE;

/*=============================================================================
    PARTE 1: TABLAS MAESTRAS (NIVEL 1)
=============================================================================*/

-- 1.1 TABLA ESTADO (General)
CREATE TABLE estado (
    id_estado SERIAL PRIMARY KEY,
    nombre_estado VARCHAR(30) NOT NULL UNIQUE
);

-- 1.2 TABLA ROL (Roles de usuarios del sistema)
CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

-- 1.3 TABLA TIPO DOCUMENTO (DNI, Pasaporte, etc.)
CREATE TABLE tipo_documento (
    id_tipo_documento SERIAL PRIMARY KEY,
    nombre_documento VARCHAR(30) NOT NULL UNIQUE
);

-- 1.4 TABLA FACULTAD (Facultades de la universidad)
CREATE TABLE facultad (
    id_facultad SERIAL PRIMARY KEY,
    nombre_facultad VARCHAR(120) NOT NULL UNIQUE
);

-- 1.5 TABLA TIPO RACION (Desayuno, Almuerzo, Cena)
CREATE TABLE tipo_racion (
    id_tipo_racion SERIAL PRIMARY KEY,
    nombre_racion VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    costo DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

-- 1.6 TABLA HORARIO (Horarios de reparto de raciones)
CREATE TABLE horario (
    id_horario SERIAL PRIMARY KEY,
    nombre_horario VARCHAR(40) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);

-- 1.7 TABLA CARGO (Cargos del personal del comedor)
CREATE TABLE cargo (
    id_cargo SERIAL PRIMARY KEY,
    nombre_cargo VARCHAR(80) NOT NULL UNIQUE
);

-- 1.8 TABLA CATEGORIA PRODUCTO (Mantenida a petición)
CREATE TABLE categoria_producto (
    id_categoria SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(80) NOT NULL UNIQUE
);

-- 1.9 TABLA ESTADO POSTULACION (Estados de la postulación)
CREATE TABLE estado_postulacion (
    id_estado_postulacion SERIAL PRIMARY KEY,
    nombre_estado VARCHAR(30) NOT NULL UNIQUE
);

-- 1.10 TABLA ESTADO SOLICITUD (Estados de las reservas de raciones)
CREATE TABLE estado_solicitud (
    id_estado_solicitud SERIAL PRIMARY KEY,
    nombre_estado VARCHAR(30) NOT NULL UNIQUE
);


/*=============================================================================
    PARTE 2: TABLAS CON DEPENDENCIAS SIMPLES (NIVEL 2)
=============================================================================*/

-- 2.1 TABLA ESCUELA PROFESIONAL (Depende de Facultad)
CREATE TABLE escuela_profesional (
    id_escuela SERIAL PRIMARY KEY,
    nombre_escuela VARCHAR(120) NOT NULL UNIQUE,
    id_facultad INTEGER NOT NULL,
    CONSTRAINT fk_escuela_facultad FOREIGN KEY (id_facultad) REFERENCES facultad(id_facultad)
);

-- 2.2 TABLA ESTUDIANTE (Depende de Escuela y Estado)
CREATE TABLE estudiante (
    id_estudiante SERIAL PRIMARY KEY,
    codigo_universitario VARCHAR(12) NOT NULL UNIQUE,
    dni CHAR(8) NOT NULL UNIQUE,
    nombres VARCHAR(80) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    sexo CHAR(1) CHECK (sexo IN ('M', 'F')),
    fecha_nacimiento DATE,
    telefono VARCHAR(15),
    correo VARCHAR(100),
    direccion VARCHAR(150),
    ciclo SMALLINT CHECK (ciclo BETWEEN 1 AND 14),
    id_escuela INTEGER NOT NULL,
    id_estado INTEGER NOT NULL,
    CONSTRAINT fk_estudiante_escuela FOREIGN KEY (id_escuela) REFERENCES escuela_profesional(id_escuela),
    CONSTRAINT fk_estudiante_estado FOREIGN KEY (id_estado) REFERENCES estado(id_estado)
);

-- 2.3 TABLA POSTULACION (Depende de Estudiante y EstadoPostulacion)
CREATE TABLE postulacion (
    id_postulacion SERIAL PRIMARY KEY,
    id_estudiante INTEGER NOT NULL,
    fecha_postulacion DATE NOT NULL DEFAULT CURRENT_DATE,
    observacion VARCHAR(300),
    documentos_completos BOOLEAN DEFAULT FALSE,
    entrevista_realizada BOOLEAN DEFAULT FALSE,
    id_estado_postulacion INTEGER NOT NULL,
    CONSTRAINT fk_postulacion_estudiante FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante),
    CONSTRAINT fk_postulacion_estado_postulacion FOREIGN KEY (id_estado_postulacion) REFERENCES estado_postulacion(id_estado_postulacion)
);


/*=============================================================================
    PARTE 3: TABLAS DE GESTIÓN DE BENEFICIARIOS Y PERSONAL (NIVEL 3)
=============================================================================*/

-- 3.1 TABLA BENEFICIARIO (Estudiantes aprobados, depende de Postulacion)
CREATE TABLE beneficiario (
    id_beneficiario SERIAL PRIMARY KEY,
    id_postulacion INTEGER NOT NULL UNIQUE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_beneficiario_postulacion FOREIGN KEY (id_postulacion) REFERENCES postulacion(id_postulacion)
);

-- 3.2 TABLA PERSONAL (Personal que opera el comedor, depende de Cargo y Estado)
CREATE TABLE personal (
    id_personal SERIAL PRIMARY KEY,
    nombres VARCHAR(80) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    numero_documento VARCHAR(15) NOT NULL UNIQUE,
    telefono VARCHAR(15),
    correo VARCHAR(100),
    direccion VARCHAR(150),
    id_cargo INTEGER NOT NULL,
    id_estado INTEGER NOT NULL,
    CONSTRAINT fk_personal_cargo FOREIGN KEY (id_cargo) REFERENCES cargo(id_cargo),
    CONSTRAINT fk_personal_estado FOREIGN KEY (id_estado) REFERENCES estado(id_estado)
);

-- 3.3 TABLA USUARIO (Acceso al sistema, depende de Rol, Estado, Beneficiario, Personal)
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    id_rol INTEGER NOT NULL,
    id_beneficiario INTEGER NULL UNIQUE,
    id_personal INTEGER NULL UNIQUE,
    id_estado INTEGER NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol(id_rol),
    CONSTRAINT fk_usuario_beneficiario FOREIGN KEY (id_beneficiario) REFERENCES beneficiario(id_beneficiario),
    CONSTRAINT fk_usuario_personal FOREIGN KEY (id_personal) REFERENCES personal(id_personal),
    CONSTRAINT fk_usuario_estado FOREIGN KEY (id_estado) REFERENCES estado(id_estado),
    CONSTRAINT ck_usuario_asociacion CHECK (
        (id_beneficiario IS NOT NULL AND id_personal IS NULL) OR
        (id_beneficiario IS NULL AND id_personal IS NOT NULL) OR
        (id_beneficiario IS NULL AND id_personal IS NULL)
    )
);


/*=============================================================================
    PARTE 4: GESTIÓN DE RESERVAS Y ASISTENCIA (NIVEL 4)
=============================================================================*/

-- 4.1 TABLA SOLICITUD (Reservas de raciones diarias, depende de Beneficiario, TipoRacion, Horario, EstadoSolicitud)
CREATE TABLE solicitud (
    id_solicitud SERIAL PRIMARY KEY,
    fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
    id_beneficiario INTEGER NOT NULL,
    id_tipo_racion INTEGER NOT NULL,
    id_horario INTEGER NOT NULL,
    id_estado_solicitud INTEGER NOT NULL,
    CONSTRAINT fk_solicitud_beneficiario FOREIGN KEY (id_beneficiario) REFERENCES beneficiario(id_beneficiario),
    CONSTRAINT fk_solicitud_tipo_racion FOREIGN KEY (id_tipo_racion) REFERENCES tipo_racion(id_tipo_racion),
    CONSTRAINT fk_solicitud_horario FOREIGN KEY (id_horario) REFERENCES horario(id_horario),
    CONSTRAINT fk_solicitud_estado_solicitud FOREIGN KEY (id_estado_solicitud) REFERENCES estado_solicitud(id_estado_solicitud)
);

-- 4.2 TABLA DETALLE SOLICITUD (Seguimiento, depende de Solicitud)
CREATE TABLE detalle_solicitud (
    id_detalle_solicitud SERIAL PRIMARY KEY,
    id_solicitud INTEGER NOT NULL,
    observacion VARCHAR(250),
    fecha_atencion TIMESTAMP,
    CONSTRAINT fk_detalle_solicitud_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud)
);

-- 4.3 TABLA ASISTENCIA (Control de entrega de la ración, depende de Solicitud)
CREATE TABLE asistencia (
    id_asistencia SERIAL PRIMARY KEY,
    id_solicitud INTEGER NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    asistio BOOLEAN NOT NULL DEFAULT FALSE,
    justificado BOOLEAN NOT NULL DEFAULT FALSE, -- Registra si la inasistencia fue justificada
    CONSTRAINT fk_asistencia_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud)
);


/*=============================================================================
    PARTE 5: REPORTES (NIVEL 4)
=============================================================================*/

-- 5.1 TABLA REPORTE (Historial de informes generados, depende de Personal)
CREATE TABLE reporte (
    id_reporte SERIAL PRIMARY KEY,
    nombre_reporte VARCHAR(100) NOT NULL,
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descripcion VARCHAR(250),
    id_personal INTEGER NOT NULL,
    CONSTRAINT fk_reporte_personal FOREIGN KEY (id_personal) REFERENCES personal(id_personal)
);


/*=============================================================================
    PARTE 6: INSERCIÓN DE DATOS SEMILLA (CATÁLOGOS)
=============================================================================*/

-- 6.1 DATOS: estado
INSERT INTO estado (nombre_estado) VALUES 
('Activo'),
('Inactivo');

-- 6.2 DATOS: rol
INSERT INTO rol (nombre_rol) VALUES 
('Administrador'),
('Asistente Social'),
('Beneficiario'),
('Nutricionista'),
('Almacenero');

-- 6.3 DATOS: tipo_documento
INSERT INTO tipo_documento (nombre_documento) VALUES 
('DNI'),
('Carné Universitario'),
('Pasaporte'),
('Carné de Extranjería');

-- 6.4 DATOS: facultad
INSERT INTO facultad (nombre_facultad) VALUES 
('Facultad de Ingeniería de Sistemas e Informática'),
('Facultad de Medicina Humana'),
('Facultad de Ciencias Administrativas'),
('Facultad de Derecho y Ciencia Política'),
('Facultad de Ingeniería Industrial');

-- 6.5 DATOS: escuela_profesional
INSERT INTO escuela_profesional (nombre_escuela, id_facultad) VALUES 
('Escuela Profesional de Ingeniería de Sistemas', 1),
('Escuela Profesional de Ingeniería de Software', 1),
('Escuela Profesional de Medicina Humana', 2),
('Escuela Profesional de Administración', 3),
('Escuela Profesional de Derecho', 4),
('Escuela Profesional de Ingeniería Industrial', 5);

-- 6.6 DATOS: tipo_racion
INSERT INTO tipo_racion (nombre_racion, descripcion, costo) VALUES 
('Desayuno', 'Ración de desayuno básico estudiantil', 0.00),
('Almuerzo', 'Almuerzo completo con entrada, segundo y bebida', 0.00),
('Cena', 'Ración de cena estudiantil ligera', 0.00);

-- 6.7 DATOS: horario
INSERT INTO horario (nombre_horario, hora_inicio, hora_fin) VALUES 
('Horario de Desayuno', '07:00:00', '09:00:00'),
('Horario de Almuerzo', '12:00:00', '14:30:00'),
('Horario de Cena', '17:30:00', '19:30:00');

-- 6.8 DATOS: cargo
INSERT INTO cargo (nombre_cargo) VALUES 
('Director de Comedor'),
('Jefe de Almacén'),
('Asistente Social principal'),
('Nutricionista Residente'),
('Operario de Almacén'),
('Cocinero General');

-- 6.9 DATOS: categoria_producto
INSERT INTO categoria_producto (nombre_categoria) VALUES 
('Carnes, Aves y Pescados'),
('Verduras, Hortalizas y Frutas'),
('Cereales, Menestras y Tubérculos'),
('Lácteos y Derivados'),
('Aceites y Abarrotes en General'),
('Artículos de Limpieza y Desinfección');

-- 6.10 DATOS: estado_postulacion
INSERT INTO estado_postulacion (nombre_estado) VALUES 
('Pendiente'),
('En Evaluación'),
('Aprobado'),
('Rechazado');

-- 6.11 DATOS: estado_solicitud
INSERT INTO estado_solicitud (nombre_estado) VALUES 
('Pendiente'),
('Aprobada'),
('Atendida'),
('Cancelada');
