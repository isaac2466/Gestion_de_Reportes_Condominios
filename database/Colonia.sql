CREATE DATABASE IF NOT EXISTS Colonia;
USE Colonia;

CREATE TABLE habitantes(
id_habitante INT AUTO_INCREMENT PRIMARY KEY ,
Nombre VARCHAR(100) NOT NULL,
Direccion VARCHAR (250) NOT NULL, 
Email VARCHAR (150) NOT NULL,
Rol ENUM('residente', 'admin') NOT NULL DEFAULT 'residente',
Password_hash VARCHAR (255) NOT NULL,
Create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reportes(
id INT AUTO_INCREMENT PRIMARY KEY,
id_habitante INT NOT NULL,
titulo VARCHAR (150) NOT NULL,
descripcion TEXT NOT NULL,
locacion VARCHAR (255),
categoria VARCHAR (100),
prioridad ENUM ('Low', 'Medium', 'High', 'Critical') default 'Medium',
severidad TINYINT DEFAULT 1,
resumen_ia TEXT,
recomendacion_ia TEXT,
confianza_ia DECIMAL (5,2),
estado ENUM ('Pendiente', 'En Progreso', 'Resuelto', 'Rechazado') default 'Pendiente',
fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (id_habitante) REFERENCES habitantes(id_habitante) ON DELETE CASCADE
);

CREATE TABLE imagenes_reportes(
id INT AUTO_INCREMENT PRIMARY KEY,
id_reporte INT NOT NULL,
url_imagen VARCHAR(255) NOT NULL,
fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (id_reporte) REFERENCES reportes(id) ON DELETE CASCADE
);

USE Colonia;

CREATE TABLE conversaciones_reporte (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    id_habitante INT NOT NULL,
    id_reporte INT NULL,

    estado ENUM(
        'collecting',
        'needs_information',
        'ready_for_confirmation',
        'submitted',
        'cancelled'
    ) NOT NULL DEFAULT 'collecting',

    titulo_borrador VARCHAR(150) NULL,
    descripcion_borrador TEXT NULL,
    locacion_borrador VARCHAR(255) NULL,

    categoria_borrador VARCHAR(100) NULL,

    prioridad_borrador ENUM(
        'Low',
        'Medium',
        'High',
        'Critical'
    ) NULL,

    severidad_borrador TINYINT NULL,

    resumen_borrador TEXT NULL,
    recomendacion_borrador TEXT NULL,

    campos_faltantes JSON NULL,
    datos_contexto JSON NULL,

    version_borrador INT NOT NULL DEFAULT 1,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    fecha_actualizacion TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_conversacion_habitante
        FOREIGN KEY (id_habitante)
        REFERENCES habitantes(id_habitante)
        ON DELETE CASCADE,

    CONSTRAINT fk_conversacion_reporte
        FOREIGN KEY (id_reporte)
        REFERENCES reportes(id)
        ON DELETE SET NULL,

    INDEX idx_conversacion_habitante (id_habitante),
    INDEX idx_conversacion_estado (estado)
);

CREATE TABLE mensajes_conversacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    id_conversacion BIGINT NOT NULL,

    rol ENUM(
        'user',
        'assistant',
        'system'
    ) NOT NULL,

    tipo ENUM(
        'text',
        'question',
        'form',
        'summary',
        'warning',
        'confirmation',
        'error'
    ) NOT NULL DEFAULT 'text',

    contenido TEXT NOT NULL,

    metadatos JSON NULL,

    client_message_id VARCHAR(100) NULL,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mensaje_conversacion
        FOREIGN KEY (id_conversacion)
        REFERENCES conversaciones_reporte(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_conversation_client_message (
        id_conversacion,
        client_message_id
    ),

    INDEX idx_mensaje_conversacion_fecha (
        id_conversacion,
        fecha_creacion
    )
);

DESCRIBE conversaciones_reporte;

USE Colonia;

SHOW TABLES;

DESCRIBE conversaciones_reporte;

DESCRIBE mensajes_conversacion;

SHOW CREATE TABLE conversaciones_reporte;

SELECT * FROM habitantes;

SELECT * FROM conversaciones_reporte;

SELECT * FROM mensajes_conversacion;

SELECT
    id,
    id_conversacion,
    rol,
    tipo,
    contenido,
    client_message_id,
    fecha_creacion
FROM mensajes_conversacion
ORDER BY id;

SELECT
    id_habitante,
    Nombre,
    Direccion,
    Email,
    Rol,
    Password_hash
FROM habitantes;

SELECT
    id,
    id_habitante,
    titulo,
    categoria,
    prioridad,
    severidad,
    resumen_ia,
    recomendacion_ia,
    confianza_ia,
    estado
FROM reportes;

USE Colonia;

UPDATE habitantes
SET Rol = 'admin'
WHERE id_habitante = 2;

SELECT id_habitante, Nombre, Email, Rol
FROM habitantes
WHERE id_habitante = 2;

SELECT
    id,
    id_habitante,
    id_reporte,
    estado,
    fecha_actualizacion
FROM conversaciones_reporte;

SELECT *
FROM mensajes_conversacion
WHERE id_conversacion = 2;

SELECT COUNT(*) AS total_reportes
FROM reportes;

SELECT
    id,
    id_habitante,
    id_reporte,
    estado
FROM conversaciones_reporte;

SELECT
    id,
    estado,
    titulo_borrador,
    descripcion_borrador,
    locacion_borrador,
    campos_faltantes,
    datos_contexto,
    version_borrador
FROM conversaciones_reporte
WHERE id = 3;


SELECT
    id,
    estado,
    titulo_borrador,
    descripcion_borrador,
    locacion_borrador,
    categoria_borrador,
    prioridad_borrador,
    severidad_borrador,
    resumen_borrador,
    recomendacion_borrador,
    campos_faltantes,
    datos_contexto,
    version_borrador
FROM conversaciones_reporte
WHERE id = 3;


SELECT
    id,
    id_reporte,
    estado,
    version_borrador
FROM conversaciones_reporte
ORDER BY id;