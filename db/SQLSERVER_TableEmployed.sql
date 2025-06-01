CREATE DATABASE crud_employedd;
use crud_employedd;

CREATE TABLE employed (
    id INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    nombre VARCHAR(20) NOT NULL,
    apellido VARCHAR(20) NOT NULL,
    fecha_n VARCHAR(15) NOT NULL,
    telefono INT NOT NULL,
    cargo VARCHAR(15) NOT NULL,
    correo VARCHAR(30) NOT NULL,
    departamento VARCHAR(15) NOT NULL,
    fecha_c VARCHAR(15) NOT NULL
);

SELECT * FROM employed;