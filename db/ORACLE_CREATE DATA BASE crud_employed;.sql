CREATE DATA BASE crud_employed;
use crud_employed;
CREATE TABLE employed (
    id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    nombre VARCHAR2(20) NOT NULL,
    apellido VARCHAR2(20) NOT NULL,
    fecha_n DATE NOT NULL,
    telefono VARCHAR2(15) NOT NULL,
    cargo VARCHAR2(15) NOT NULL,
    correo VARCHAR2(30) NOT NULL,
    departamento VARCHAR2(15) NOT NULL,
    fecha_c DATE NOT NULL
);


SELECT * FROM EMPLOYED;