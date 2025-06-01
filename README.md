# Multi-DB CRUD

Sistema de gestión de empleados con soporte para múltiples bases de datos (MySQL, SQL Server y Oracle).

## Descripción

Este proyecto es una aplicación web que permite gestionar información de empleados utilizando tres diferentes sistemas de bases de datos simultáneamente. Proporciona una interfaz unificada para realizar operaciones CRUD (Create, Read, Update, Delete) y gestionar respaldos de datos.

## Características Principales

- Gestión de empleados en múltiples bases de datos
- Sistema de respaldo y restauración
- Interfaz web moderna y responsiva
- Soporte para MySQL, SQL Server y Oracle
- Operaciones CRUD completas
- Carga y descarga de archivos

## Tecnologías Utilizadas

### Backend
- Node.js
- Express.js
- MySQL2
- MSSQL
- OracleDB
- Express-fileupload
- Multer
- CORS

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap 5.3
- SweetAlert2
- Bootstrap Icons

## Estructura del Proyecto

```
C:/Desktop/multi-db-crud/
├── db/
│   ├── mysql_config.js
│   ├── sqlserver_config.js
│   └── oracle_config.js
├── public/
│   ├── index.html
│   ├── index.css
│   └── app.js
├── uploads/
├── server.js
├── package.json
└── README.md

C:/backups/
|__mysqlbackup.sql
|__sqlserverbackup.bak
|__oraclebackup.dmp

```

## Instalación

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd multi-db-crud
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar las bases de datos:
   - Editar los archivos de configuración en la carpeta `db/`
   - Asegurarse de que las bases de datos estén accesibles

4. Iniciar el servidor:
```bash
npm start
```

## Configuración de Bases de Datos

### MySQL
Configurar en `db/mysql_config.js`:
```javascript
{
    host: 'localhost',
    user: 'tu_usuario',
    password: 'tu_contraseña',
    database: 'tu_base_de_datos'
}
```

### SQL Server
Configurar en `db/sqlserver_config.js`:
```javascript
{
    server: 'tu_servidor',
    user: 'tu_usuario',
    password: 'tu_contraseña',
    database: 'tu_base_de_datos'
}
```

### Oracle
Configurar en `db/oracle_config.js`:
```javascript
{
    user: 'tu_usuario',
    password: 'tu_contraseña',
    connectString: 'tu_connection_string'
}
```

## Estructura de Datos

### Tabla de Empleados
```sql
CREATE TABLE employed (
    id INT PRIMARY KEY,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    fecha_n DATE,
    telefono VARCHAR(20),
    cargo VARCHAR(100),
    correo VARCHAR(100),
    departamento VARCHAR(100),
    fecha_c DATE
)
```

## Funcionalidades

### Gestión de Empleados
- Registro de nuevos empleados
- Visualización de empleados existentes
- Actualización de información
- Eliminación de registros
- Búsqueda y filtrado

### Sistema de Respaldo
- Backup completo de todas las bases de datos
- Restauración de respaldos
- Descarga de archivos de respaldo

### Características de Seguridad
- Validación de datos
- Protección contra inyección SQL
- Manejo seguro de conexiones
- Límites en tamaño de archivos

## Uso

1. Acceder a la interfaz web (por defecto: http://localhost:3000)
2. Seleccionar la base de datos deseada
3. Realizar operaciones CRUD según necesidad
4. Utilizar el sistema de respaldo cuando sea necesario

## API Endpoints

### Empleados

#### Crear Empleado
- **Endpoint**: `POST /api/empleados`
- **Descripción**: Crea un nuevo registro de empleado en la base de datos seleccionada
- **Parámetros de Query**:
  - `db`: Tipo de base de datos (`mysql`, `sqlserver`, `oracle`)
- **Body**:
```json
{
    "nombre": "string",
    "apellido": "string",
    "fecha_n": "YYYY-MM-DD",
    "telefono": "string",
    "cargo": "string",
    "correo": "string",
    "departamento": "string",
    "fecha_c": "YYYY-MM-DD"
}
```
- **Respuesta Exitosa** (200):
```json
{
    "success": true,
    "message": "Empleado creado exitosamente",
    "data": {
        "id": "number",
        "nombre": "string",
        "apellido": "string",
        // ... resto de datos del empleado
    }
}
```

#### Obtener Empleados
- **Endpoint**: `GET /api/empleados`
- **Descripción**: Obtiene la lista de empleados de la base de datos seleccionada
- **Parámetros de Query**:
  - `db`: Tipo de base de datos (`mysql`, `sqlserver`, `oracle`)
  - `page`: Número de página (opcional, default: 1)
  - `limit`: Registros por página (opcional, default: 10)
- **Respuesta Exitosa** (200):
```json
{
    "success": true,
    "data": {
        "empleados": [
            {
                "id": "number",
                "nombre": "string",
                "apellido": "string",
                // ... resto de datos del empleado
            }
        ],
        "pagination": {
            "total": "number",
            "page": "number",
            "limit": "number",
            "pages": "number"
        }
    }
}
```

#### Actualizar Empleado
- **Endpoint**: `PUT /api/empleados/:id`
- **Descripción**: Actualiza la información de un empleado existente
- **Parámetros de URL**:
  - `id`: ID del empleado a actualizar
- **Parámetros de Query**:
  - `db`: Tipo de base de datos (`mysql`, `sqlserver`, `oracle`)
- **Body**:
```json
{
    "nombre": "string",
    "apellido": "string",
    "fecha_n": "YYYY-MM-DD",
    "telefono": "string",
    "cargo": "string",
    "correo": "string",
    "departamento": "string",
    "fecha_c": "YYYY-MM-DD"
}
```
- **Respuesta Exitosa** (200):
```json
{
    "success": true,
    "message": "Empleado actualizado exitosamente",
    "data": {
        "id": "number",
        "nombre": "string",
        "apellido": "string",
        // ... resto de datos actualizados
    }
}
```

#### Eliminar Empleado
- **Endpoint**: `DELETE /api/empleados/:id`
- **Descripción**: Elimina un empleado de la base de datos
- **Parámetros de URL**:
  - `id`: ID del empleado a eliminar
- **Parámetros de Query**:
  - `db`: Tipo de base de datos (`mysql`, `sqlserver`, `oracle`)
- **Respuesta Exitosa** (200):
```json
{
    "success": true,
    "message": "Empleado eliminado exitosamente"
}
```

### Respaldo

#### Realizar Backup
- **Endpoint**: `POST /api/backup`
- **Descripción**: Crea un respaldo de la base de datos seleccionada
- **Parámetros de Query**:
  - `db`: Tipo de base de datos (`mysql`, `sqlserver`, `oracle`, `all`)
- **Respuesta Exitosa** (200):
```json
{
    "success": true,
    "message": "Backup completado exitosamente",
    "data": {
        "filename": "string",
        "size": "number",
        "timestamp": "string",
        "downloadUrl": "string"
    }
}
```

#### Restaurar Backup
- **Endpoint**: `POST /api/restore`
- **Descripción**: Restaura una base de datos desde un archivo de respaldo
- **Parámetros de Query**:
  - `db`: Tipo de base de datos (`mysql`, `sqlserver`, `oracle`)
- **Body** (multipart/form-data):
  - `file`: Archivo de respaldo (.sql, .bak, .dmp)
- **Respuesta Exitosa** (200):
```json
{
    "success": true,
    "message": "Backup restaurado exitosamente",
    "data": {
        "restoredTables": ["string"],
        "timestamp": "string"
    }
}
```

#### Descargar Backup
- **Endpoint**: `GET /api/backup/download/:filename`
- **Descripción**: Descarga un archivo de respaldo específico
- **Parámetros de URL**:
  - `filename`: Nombre del archivo de respaldo
- **Respuesta**: Archivo de respaldo (application/octet-stream)

### Códigos de Error

Todos los endpoints pueden devolver los siguientes códigos de error:

- **400 Bad Request**: Datos de entrada inválidos
- **404 Not Found**: Recurso no encontrado
- **500 Internal Server Error**: Error del servidor

Ejemplo de respuesta de error:
```json
{
    "success": false,
    "error": {
        "code": "number",
        "message": "string",
        "details": "string"
    }
}
```

### Ejemplos de Uso

#### Crear un nuevo empleado en MySQL
```bash
curl -X POST "http://localhost:3000/api/empleados?db=mysql" \
     -H "Content-Type: application/json" \
     -d '{
         "nombre": "Juan",
         "apellido": "Pérez",
         "fecha_n": "1990-01-01",
         "telefono": "123456789",
         "cargo": "Desarrollador",
         "correo": "juan@ejemplo.com",
         "departamento": "IT",
         "fecha_c": "2023-01-01"
     }'
```

#### Obtener empleados de SQL Server con paginación
```bash
curl "http://localhost:3000/api/empleados?db=sqlserver&page=1&limit=10"
```

#### Realizar backup de todas las bases de datos
```bash
curl -X POST "http://localhost:3000/api/backup?db=all"
```


