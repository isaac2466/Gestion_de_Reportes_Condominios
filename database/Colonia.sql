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
FOREING_KEY (id_habitante) REFERENCES habitantes(id) ON DELETE CASCADE
);

CREATE TABLE imagenes_reporte(
id INT AUTO_INCREMENT PRIMARY KEY,
id_reporte INT NOT NULL,
url_imagen VARCHAR(255) NOT NULL,
fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (id_reporte) REFERENCES reportes(id) ON DELETE CASCADE
);