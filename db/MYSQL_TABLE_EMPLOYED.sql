create database crud_employed;

use crud_employed;

CREATE TABLE employed (	
	id int primary key auto_increment not null,
    nombre varchar(20) not null,
    apellido varchar(20) not null,
    fecha_n varchar (15) not null,
    telefono int not null,
    cargo varchar(15) not null,
    correo varchar(30) not null,
    departamento varchar(15) not null,
    fecha_c varchar(15) not null
);

select * from employed;