import { exec } from 'child_process';
import fs from 'fs';
import express from 'express';
import mysql from 'mysql2/promise';
import sql from 'mssql';
import oracledb from 'oracledb';
import cors from 'cors';
import multer from 'multer';

import mysqlConfig from './db/mysql_config.js';
import sqlserverConfig from './db/sqlserver_config.js';
import oracleConfig from './db/oracle_config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fileUpload from 'express-fileupload';

const mysqlConnection = mysql.createPool(mysqlConfig);
const sqlserverPool = new sql.ConnectionPool(sqlserverConfig);
const sqlserverConnect = sqlserverPool.connect(); // Se ejecuta una vez
const oracleConnection = await oracledb.getConnection(oracleConfig);

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de directorios
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = 'C:\\backups';
const uploadsDir = path.join(__dirname, 'uploads');

// Crear directorios si no existen
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar middleware para carga de archivos
app.use(fileUpload({
  limits: { fileSize: 200 * 1024 * 1024 }, // Límite de 200MB
  useTempFiles: true,
  tempFileDir: uploadsDir,
  debug: true
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/backups', express.static(backupDir));

// Función para ejecutar comandos
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al ejecutar el comando: ${command}`, error);
        reject(error);
        return;
      }
      console.log(`Salida del comando ${command}: ${stdout}`);
      if (stderr) {
        console.error(`Errores del comando ${command}: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

// Endpoint para realizar el backup de las bases de datos
app.post('/api/backup', async (req, res) => {
  // Si recibes ?db=all o no recibes nada, respalda todas
  const db = req.query.db;
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '');

  // Lista de bases de datos a respaldar
  let dbs = [];
  if (!db || db === 'all') {
    dbs = ['mysql', 'sqlserver', 'oracle'];
  } else {
    dbs = [db];
  }

  const results = [];

  for (const dbName of dbs) {
    let filename = '';
    let backupFilePath = '';
    try {
      if (dbName === 'mysql') {
        filename = `mysql_backup_${timestamp}.sql`;
        backupFilePath = path.join(backupDir, filename);
        const mysqlCommand = `mysqldump -u ${mysqlConfig.user} -p${mysqlConfig.password} ${mysqlConfig.database} > "${backupFilePath}"`;
        await executeCommand(mysqlCommand);
        results.push({
          db: 'mysql',
          message: 'Backup de MySQL completado.',
          downloadUrl: `/backups/${filename}`,
          filename
        });
      } else if (dbName === 'sqlserver') {
        try {
          filename = `sqlserver_backup_${timestamp}.bak`;
          backupFilePath = path.join(backupDir, filename);

          // Primero verificamos que la tabla 'employed' existe
          await sqlserverConnect;
          const pool = await sql.connect(sqlserverConfig);

          // Verificar si la tabla existe
          const tableResult = await pool.request().query(`
            SELECT OBJECT_ID('employed') as TableID
          `);

          if (!tableResult.recordset[0].TableID) {
            console.log("La tabla 'employed' no existe. Creándola antes del backup...");

            // Crear la tabla employed con la estructura correcta
            await pool.request().query(`
              CREATE TABLE employed (
                id INT IDENTITY(1,1) PRIMARY KEY,
                nombre NVARCHAR(100) NOT NULL,
                apellido NVARCHAR(100) NOT NULL,
                fecha_n DATE,
                telefono NVARCHAR(20),
                cargo NVARCHAR(100),
                correo NVARCHAR(100),
                departamento NVARCHAR(100),
                fecha_c DATE
              )
            `);

            console.log("Tabla 'employed' creada exitosamente");
          }

          // Verificar si hay datos en la tabla
          const dataResult = await pool.request().query(`
            SELECT COUNT(*) as Count FROM employed
          `);

          console.log(`La tabla 'employed' tiene ${dataResult.recordset[0].Count} registros para backup`);

          await pool.close();

          // Ahora hacemos el backup con INIT para sobrescribir cualquier backup anterior
          const sqlServerCommand = `sqlcmd -S ${sqlserverConfig.server} -U ${sqlserverConfig.user} -P${sqlserverConfig.password} -Q "BACKUP DATABASE ${sqlserverConfig.database} TO DISK='${backupFilePath}' WITH INIT"`;
          await executeCommand(sqlServerCommand);
          const { stdout, stderr } = await executeCommand(sqlServerCommand);
          console.log('Salida del comando de backup de SQL Server:', stdout);

          if (stderr && !stderr.includes("successfully processed")) {
            console.error('Errores del comando de backup de SQL Server:', stderr);
            throw new Error(`Error en el backup de SQL Server: ${stderr}`);
          }

          // Verificar que el archivo existe y tiene tamaño
          if (fs.existsSync(backupFilePath)) {
            const stats = fs.statSync(backupFilePath);
            if (stats.size === 0) {
              throw new Error(`El archivo de backup está vacío: ${backupFilePath}`);
            }

            console.log(`Backup creado exitosamente: ${backupFilePath} (${stats.size} bytes)`);

            results.push({
              db: 'sqlserver',
              message: `Backup de SQL Server completado con ${dataResult.recordset[0].Count} registros.`,
              downloadUrl: `/backups/${filename}`,
              filename
            });
          } else {
            throw new Error(`No se pudo crear el archivo de backup: ${backupFilePath}`);
          }
        } catch (error) {
          console.error("Error en el backup de SQL Server:", error);
          results.push({
            db: 'sqlserver',
            message: `Error en el backup de SQL Server: ${error.message}`,
            error: true
          });
        }
      } else if (dbName === 'oracle') {
        filename = `oracle_backup_${timestamp}.dmp`;
        backupFilePath = path.join(backupDir, filename);
        try {
          const oracleCommand = `expdp ${oracleConfig.user}/${oracleConfig.password}@${oracleConfig.connectString} tables=${oracleConfig.schema}.EMPLOYED directory=DATA_PUMP_DIR dumpfile=${filename} logfile=backup_${timestamp}.log`;
          await executeCommand(oracleCommand);
          const oracleDumpDir = process.env.ORACLE_DUMP_DIR || 'C:/backups';
          const oracleDumpFile = path.join(oracleDumpDir, filename);
          if (fs.existsSync(oracleDumpFile)) {
            fs.copyFileSync(oracleDumpFile, backupFilePath);
            console.log('Backup de Oracle completado.');
            results.push({
              db: 'oracle',
              message: 'Backup de Oracle completado.',
              downloadUrl: `/backups/${filename}`,
              filename
            });
          } else {
            throw new Error(`No se encontró el archivo de backup en ${oracleDumpFile}`);
          }
        } catch (oracleError) {
          results.push({
            db: 'oracle',
            message: `Error en backup de Oracle: ${oracleError.message}`,
            downloadUrl: null,
            filename: null
          });
        }
      }
    } catch (error) {
      results.push({
        db: dbName,
        message: `Error al respaldar ${dbName}: ${error.message}`,
        downloadUrl: null,
        filename: null
      });
    }
  }

  res.status(200).json({
    message: 'Proceso de backup finalizado.',
    results
  });
});

//estamos insertando los datos en las bases de datos, ya que post lo que hace es insertar el registro
app.post('/api/empleado', async (req, res) => {
  const data = req.body;
  try {
    //DB MYSQL
    if (data.base_datos === 'mysql') {
      const connection = await mysql.createConnection(mysqlConfig);
      await connection.execute(
        'INSERT INTO employed (nombre, apellido, fecha_n, telefono, cargo, correo, departamento, fecha_c) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [data.nombre, data.apellido, data.fecha_nacimiento, data.telefono, data.cargo, data.email, data.departamento, data.fecha_contratacion]
      );
      await connection.end();

      //DB sqlserver
    } else if (data.base_datos === 'sqlserver') {
      try {
        const pool = await sql.connect(sqlserverConfig);

        await pool.request()
          .input('nombre', sql.VarChar, data.nombre)
          .input('apellido', sql.VarChar, data.apellido)
          .input('fecha_n', sql.Date, data.fecha_nacimiento)
          .input('telefono', sql.VarChar, data.telefono)
          .input('cargo', sql.VarChar, data.cargo)
          .input('correo', sql.VarChar, data.email)
          .input('departamento', sql.VarChar, data.departamento)
          .input('fecha_c', sql.Date, data.fecha_contratacion)
          .query(
            'INSERT INTO employed (nombre, apellido, fecha_n, telefono, cargo, correo, departamento, fecha_c) VALUES (@nombre, @apellido, @fecha_n, @telefono, @cargo, @correo, @departamento, @fecha_c)'
          );

        await pool.close();
      } catch (error) {
        console.error('Error al insertar en SQL Server:', error);
        throw error;  // para que el catch general lo capture
      }

      //DB ORACLE
    } else if (data.base_datos === 'oracle') {
      const conn = await oracledb.getConnection(oracleConfig);

      // Aseguramos que las fechas estén en el formato correcto de Oracle
      const fechaNacimiento = new Date(data.fecha_nacimiento);
      const fechaContratacion = new Date(data.fecha_contratacion);

      await conn.execute(
        'INSERT INTO employed (nombre, apellido, fecha_n, telefono, cargo, correo, departamento, fecha_c) VALUES (:1, :2, :3, :4, :5, :6, :7, :8)',
        [
          data.nombre,
          data.apellido,
          fechaNacimiento,  // Enviamos la fecha como un objeto Date
          data.telefono,
          data.cargo,
          data.email,
          data.departamento,
          fechaContratacion // Enviamos la fecha como un objeto Date
        ],
        { autoCommit: true }
      );

      await conn.close();
    }

    res.status(200).json({ message: 'Empleado guardado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al guardar el empleado.' });
  }
});

//estamos leyendo los datos de las bases de datos, ya que get lo que hace es traer el registro
app.get('/api/empleados', async (req, res) => {
  const db = req.query.db;

  try {
    let empleados = [];
    //DB MYSQL
    if (db === 'mysql') {
      const conn = await mysql.createConnection(mysqlConfig);
      const [rows] = await conn.execute('SELECT * FROM employed');
      empleados = rows;
      await conn.end();

      //DB SQLSERVER
    } else if (db === 'sqlserver') {
      const pool = await sql.connect(sqlserverConfig);
      const result = await pool.request().query('SELECT * FROM employed');
      empleados = result.recordset;
      await pool.close();

      //DB ORACLE
    } else if (db === 'oracle') {
      const conn = await oracledb.getConnection(oracleConfig);
      const result = await conn.execute(`
                        SELECT 
                          id,
                          nombre,
                          apellido,
                          fecha_n,
                          telefono,
                          cargo,
                          correo,
                          departamento,
                          fecha_c
                        FROM EMPLOYED
                      `);

      empleados = result.rows.map(row => {
        return {
          id: row[0],
          nombre: row[1],
          apellido: row[2],
          fecha_n: row[3],
          telefono: row[4],
          cargo: row[5],
          correo: row[6],
          departamento: row[7],
          fecha_c: row[8]
        };
      });
      await conn.close();
    }

    res.json(empleados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los empleados.' });
  }
});

// Endpoint para eliminar un empleado
app.delete("/api/empleado/:id", async (req, res) => {
  const id = req.params.id;
  const bd = req.query.db;

  try {
    //DB MYSQL
    if (bd === "mysql") {
      const [resultado] = await mysqlConnection.execute("DELETE FROM employed WHERE id = ?", [id]);
      res.status(200).json({ message: "Empleado eliminado correctamente" });

      //DB SQLSERVER
    } else if (bd === "sqlserver") {
      await sqlserverConnect; // Esto se asegura que el pool esté conectado

      await sqlserverPool.request()
        .input("id", sql.Int, id)
        .query("DELETE FROM employed WHERE id = @id");

      res.status(200).json({ message: "Empleado eliminado correctamente" });

      //DB ORACLE
    } else if (bd === "oracle") {
      const result = await oracleConnection.execute("DELETE FROM EMPLOYED WHERE id = :id", [id], { autoCommit: true });
      res.status(200).json({ message: "Empleado eliminado correctamente" });

    } else {
      return res.status(400).json({ message: "Base de datos no válida" });
    }
  } catch (error) {
    console.error("Error al eliminar empleado:", error);  // 👈 Que este console.error esté así
    res.status(500).json({ message: "Error al eliminar empleado" });
  }
});

// PUT para actualizar empleado
app.put("/api/empleado/:id", async (req, res) => {
  const id = parseInt(req.params.id); // Asegurar que el ID sea un número entero
  const bd = req.query.db;
  const data = req.body;

  // Validar que el ID sea válido
  if (!id || isNaN(id) || id <= 0) {
    return res.status(400).json({ message: "ID de empleado inválido" });
  }

  // Validar que se especifique la base de datos
  if (!bd) {
    return res.status(400).json({ message: "Debe especificar la base de datos (db)" });
  }

  // Validar que se proporcionen los datos necesarios
  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({ message: "No se proporcionaron datos para actualizar" });
  }

  try {
    // DB MYSQL
    if (bd === "mysql") {
      try {
        // Verificar que el empleado existe antes de actualizar
        const [existingEmployee] = await mysqlConnection.execute(
          'SELECT id FROM employed WHERE id = ?',
          [id]
        );

        if (existingEmployee.length === 0) {
          return res.status(404).json({ message: `No se encontró ningún empleado con ID ${id}` });
        }

        // Realizar la actualización
        const [result] = await mysqlConnection.execute(
          'UPDATE employed SET nombre = ?, apellido = ?, fecha_n = ?, telefono = ?, cargo = ?, correo = ?, departamento = ?, fecha_c = ? WHERE id = ?',
          [
            data.nombre,
            data.apellido,
            data.fecha_nacimiento,
            data.telefono,
            data.cargo,
            data.email,
            data.departamento,
            data.fecha_contratacion,
            id
          ]
        );

        // Verificar que se actualizó correctamente
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: `No se pudo actualizar el empleado con ID ${id}` });
        }

        console.log(`Empleado ID ${id} actualizado en MySQL. Filas afectadas: ${result.affectedRows}`);
        res.status(200).json({ 
          message: "Empleado actualizado correctamente",
          affectedRows: result.affectedRows,
          employeeId: id
        });

      } catch (mysqlError) {
        console.error(`Error al actualizar empleado en MySQL: ${mysqlError.message}`);
        res.status(500).json({ message: `Error al actualizar empleado en MySQL: ${mysqlError.message}` });
      }

    // DB SQLSERVER
    } else if (bd === "sqlserver") {
      try {
        // Verificar si la conexión está cerrada y reconectar si es necesario
        if (!sqlserverPool || !sqlserverPool.connected) {
          console.log("La conexión a SQL Server está cerrada. Reconectando...");
          await sqlserverConnect;
          console.log("Reconexión a SQL Server exitosa");
        }

        // Crear una nueva conexión para esta operación específica
        const pool = await sql.connect(sqlserverConfig);

        // Verificar que el empleado existe antes de actualizar
        const existingEmployee = await pool.request()
          .input("checkId", sql.Int, id)
          .query('SELECT id FROM employed WHERE id = @checkId');

        if (existingEmployee.recordset.length === 0) {
          await pool.close();
          return res.status(404).json({ message: `No se encontró ningún empleado con ID ${id}` });
        }

        // Formatear fechas correctamente
        const fechaNacimiento = data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : null;
        const fechaContratacion = data.fecha_contratacion ? new Date(data.fecha_contratacion) : null;

        // Ejecutar la actualización
        const result = await pool.request()
          .input("id", sql.Int, id)
          .input("nombre", sql.NVarChar(100), data.nombre)
          .input("apellido", sql.NVarChar(100), data.apellido)
          .input("fecha_n", sql.Date, fechaNacimiento)
          .input("telefono", sql.NVarChar(20), data.telefono)
          .input("cargo", sql.NVarChar(100), data.cargo)
          .input("correo", sql.NVarChar(100), data.email)
          .input("departamento", sql.NVarChar(100), data.departamento)
          .input("fecha_c", sql.Date, fechaContratacion)
          .query(
            'UPDATE employed SET nombre = @nombre, apellido = @apellido, fecha_n = @fecha_n, telefono = @telefono, cargo = @cargo, correo = @correo, departamento = @departamento, fecha_c = @fecha_c WHERE id = @id'
          );

        // Verificar que se actualizó correctamente
        if (result.rowsAffected[0] === 0) {
          await pool.close();
          return res.status(404).json({ message: `No se pudo actualizar el empleado con ID ${id}` });
        }

        console.log(`Empleado ID ${id} actualizado en SQL Server. Filas afectadas: ${result.rowsAffected[0]}`);

        // Cerrar la conexión específica de esta operación
        await pool.close();

        res.status(200).json({ 
          message: "Empleado actualizado correctamente",
          affectedRows: result.rowsAffected[0],
          employeeId: id
        });

      } catch (sqlServerError) {
        console.error(`Error al actualizar empleado en SQL Server: ${sqlServerError.message}`);
        res.status(500).json({ message: `Error al actualizar empleado en SQL Server: ${sqlServerError.message}` });
      }

    // DB ORACLE
    } else if (bd === "oracle") {
      try {
        // Verificar que el empleado existe antes de actualizar
        const existingEmployee = await oracleConnection.execute(
          'SELECT id FROM EMPLOYED WHERE id = :1',
          [id]
        );

        if (existingEmployee.rows.length === 0) {
          return res.status(404).json({ message: `No se encontró ningún empleado con ID ${id}` });
        }

        // Formatear fechas correctamente para Oracle
        const fechaNacimiento = data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : null;
        const fechaContratacion = data.fecha_contratacion ? new Date(data.fecha_contratacion) : null;

        // Ejecutar la actualización
        const result = await oracleConnection.execute(
          'UPDATE EMPLOYED SET nombre = :1, apellido = :2, fecha_n = :3, telefono = :4, cargo = :5, correo = :6, departamento = :7, fecha_c = :8 WHERE id = :9',
          [
            data.nombre,
            data.apellido,
            fechaNacimiento,
            data.telefono,
            data.cargo,
            data.email,
            data.departamento,
            fechaContratacion,
            id
          ],
          { autoCommit: true }
        );

        // Verificar que se actualizó correctamente
        if (result.rowsAffected === 0) {
          return res.status(404).json({ message: `No se pudo actualizar el empleado con ID ${id}` });
        }

        console.log(`Empleado ID ${id} actualizado en Oracle. Filas afectadas: ${result.rowsAffected}`);
        res.status(200).json({ 
          message: "Empleado actualizado correctamente",
          affectedRows: result.rowsAffected,
          employeeId: id
        });

      } catch (oracleError) {
        console.error(`Error al actualizar empleado en Oracle: ${oracleError.message}`);
        res.status(500).json({ message: `Error al actualizar empleado en Oracle: ${oracleError.message}` });
      }

    } else {
      return res.status(400).json({ message: "Base de datos no válida. Use: mysql, sqlserver, o oracle" });
    }

  } catch (error) {
    console.error("Error general al actualizar empleado:", error);
    res.status(500).json({ message: "Error interno del servidor al actualizar empleado" });
  }
});
// Endpoint para el servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});

// Configuración de multer para almacenar archivos de backup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// Resto de las importaciones y configuraciones...

// Endpoint para eliminar bases de datos o limpiar tablas
app.delete("/api/eliminar-db", async (req, res) => {
  const bd = req.query.db;

  try {
    // DB MYSQL - Eliminar la base de datos completa
    if (bd === "mysql") {
      // Primero nos conectamos a MySQL sin especificar una base de datos
      const rootConnection = await mysql.createConnection({
        host: mysqlConfig.host,
        user: mysqlConfig.user,
        password: mysqlConfig.password
      });

      // Eliminamos la base de datos
      await rootConnection.execute(`DROP DATABASE IF EXISTS ${mysqlConfig.database}`);

      // Recreamos la base de datos vacía para futuras operaciones
      await rootConnection.execute(`CREATE DATABASE ${mysqlConfig.database}`);

      await rootConnection.end();

      res.status(200).json({ message: "Base de datos MySQL eliminada correctamente" });

      // DB SQLSERVER - Eliminar la base de datos completa
    } else if (bd === "sqlserver") {
      await sqlserverConnect; // Asegura que el pool esté conectado

      // Nos conectamos a master para poder eliminar la base de datos
      const masterConfig = { ...sqlserverConfig, database: 'master' };
      const masterPool = new sql.ConnectionPool(masterConfig);
      await masterPool.connect();

      // Cerramos todas las conexiones a la base de datos
      await masterPool.request().query(`
        ALTER DATABASE ${sqlserverConfig.database} SET SINGLE_USER WITH ROLLBACK IMMEDIATE
      `);

      // Eliminamos la base de datos
      await masterPool.request().query(`
        DROP DATABASE ${sqlserverConfig.database}
      `);

      // Recreamos la base de datos vacía
      await masterPool.request().query(`
        CREATE DATABASE ${sqlserverConfig.database}
      `);

      await masterPool.close();

      // Reconectamos el pool principal
      await sqlserverPool.close();
      await sqlserverConnect;

      res.status(200).json({ message: "Base de datos SQL Server eliminada correctamente" });

      // DB ORACLE - Solo limpiar la tabla
    } else if (bd === "oracle") {
      // Eliminamos todos los registros
      await oracleConnection.execute(
        "DELETE FROM EMPLOYED",
        [],
        { autoCommit: true }
      );

      // Reseteamos la secuencia si existe
      try {
        await oracleConnection.execute(
          "ALTER SEQUENCE EMPLOYED_SEQ RESTART START WITH 1",
          [],
          { autoCommit: true }
        );
      } catch (seqError) {
        console.log("No se pudo resetear la secuencia o no existe:", seqError);
        // Continuamos aunque falle el reseteo de la secuencia
      }

      res.status(200).json({ message: "Tabla EMPLOYED en Oracle limpiada correctamente" });

    } else {
      return res.status(400).json({ message: "Base de datos no válida" });
    }
  } catch (error) {
    console.error("Error en la operación:", error);
    res.status(500).json({ message: `Error: ${error.message}` });
  }
});

// Endpoint para restaurar bases de datos o tablas desde backup
app.post('/api/restaurar-db', async (req, res) => {
  if (!req.files || !req.files.backupFile) {
    return res.status(400).json({ message: "No se ha proporcionado un archivo de backup" });
  }

  const db = req.body.db;
  if (!db) {
    return res.status(400).json({ message: "Debe especificar una base de datos" });
  }

  const backupFile = req.files.backupFile;
  const backupFilePath = path.join(uploadsDir, `${Date.now()}-${backupFile.name}`);

  try {
    // Guardar el archivo subido
    await backupFile.mv(backupFilePath);
    console.log(`Archivo guardado en: ${backupFilePath}`);

    // DB MYSQL - Restaurar la base de datos completa
    if (db === "mysql") {
      // Primero nos conectamos a MySQL sin especificar una base de datos
      const rootConnection = await mysql.createConnection({
        host: mysqlConfig.host,
        user: mysqlConfig.user,
        password: mysqlConfig.password
      });

      // Recreamos la base de datos
      await rootConnection.execute(`DROP DATABASE IF EXISTS ${mysqlConfig.database}`);
      await rootConnection.execute(`CREATE DATABASE ${mysqlConfig.database}`);

      await rootConnection.end();

      // Ejecutamos el comando de restauración de MySQL
      const mysqlRestoreCommand = `mysql -u ${mysqlConfig.user} -p${mysqlConfig.password} ${mysqlConfig.database} < "${backupFilePath}"`;
      await executeCommand(mysqlRestoreCommand);

      res.status(200).json({ message: "Base de datos MySQL restaurada correctamente" });

      // DB SQLSERVER - Restaurar la base de datos completa
    } else if (db === "sqlserver") {
      try {
        // Conexión a master
        const masterConfig = { ...sqlserverConfig, database: 'master' };
        const masterPool = new sql.ConnectionPool(masterConfig);
        await masterPool.connect();

        // Verifica que el archivo existe
        if (!fs.existsSync(backupFilePath)) {
          throw new Error(`El archivo de backup no existe: ${backupFilePath}`);
        }

        // Crear directorio de SQL Server si no existe
        const sqlServerBackupDir = 'C:/backups/sqlserver';
        if (!fs.existsSync(sqlServerBackupDir)) {
          fs.mkdirSync(sqlServerBackupDir, { recursive: true });
        }

        // Copiar el archivo a una ubicación donde SQL Server tenga permisos
        const sqlServerBackupPath = path.join(sqlServerBackupDir, path.basename(backupFilePath));
        fs.copyFileSync(backupFilePath, sqlServerBackupPath);
        console.log(`Archivo copiado a ${sqlServerBackupPath}`);

        // Dar permisos a todos (solo para desarrollo)
        try {
          await executeCommand(`icacls "${sqlServerBackupPath}" /grant "Everyone":(F)`);
          console.log(`Permisos otorgados a ${sqlServerBackupPath}`);
        } catch (permError) {
          console.warn(`No se pudieron cambiar los permisos: ${permError.message}`);
        }

        // SINGLE_USER
        await masterPool.request().query(`
          IF EXISTS (SELECT name FROM sys.databases WHERE name = '${sqlserverConfig.database}')
          BEGIN
            ALTER DATABASE ${sqlserverConfig.database} SET SINGLE_USER WITH ROLLBACK IMMEDIATE
          END
        `);

        // RESTORE usando la nueva ubicación
        const sqlServerRestoreCommand = `sqlcmd -S ${sqlserverConfig.server} -U ${sqlserverConfig.user} -P${sqlserverConfig.password} -Q "RESTORE DATABASE ${sqlserverConfig.database} FROM DISK='${sqlServerBackupPath}' WITH REPLACE"`;
        console.log("Ejecutando comando de restauración:", sqlServerRestoreCommand);
        await executeCommand(sqlServerRestoreCommand);

        const { stdout, stderr } = await executeCommand(sqlServerRestoreCommand);
        console.log("Salida de la restauración:", stdout);

        if (stderr && !stderr.includes("successfully processed")) {
          console.error("Errores en la restauración:", stderr);
          throw new Error(`Error en la restauración: ${stderr}`);
        }

        // MULTI_USER
        await masterPool.request().query(`
          IF EXISTS (SELECT name FROM sys.databases WHERE name = '${sqlserverConfig.database}')
          BEGIN
            ALTER DATABASE ${sqlserverConfig.database} SET MULTI_USER
          END
        `);

        await masterPool.close();

        // Eliminar el archivo temporal
        try {
          fs.unlinkSync(sqlServerBackupPath);
          console.log(`Archivo temporal eliminado: ${sqlServerBackupPath}`);
        } catch (unlinkError) {
          console.warn(`No se pudo eliminar el archivo temporal: ${unlinkError.message}`);
        }

        // Conexión a la base restaurada
        const pool = await sql.connect(sqlserverConfig);

        // Verifica si la tabla existe
        const tableResult = await pool.request().query(`
          SELECT OBJECT_ID('employed') as TableID
        `);

        if (!tableResult.recordset[0].TableID) {
          throw new Error("La tabla 'employed' no existe en la base de datos restaurada. El backup no contenía la tabla.");
        }

        // Verifica si hay datos
        const dataResult = await pool.request().query(`
          SELECT COUNT(*) as Count FROM employed
        `);

        // Muestra los primeros 5 registros para depuración
        const previewResult = await pool.request().query(`
          SELECT TOP 5 * FROM employed
        `);

        await pool.close();

        res.status(200).json({
          message: "Base de datos SQL Server restaurada correctamente",
          rowCount: dataResult.recordset[0].Count,
          preview: previewResult.recordset
        });
      } catch (error) {
        console.error("Error en la restauración de SQL Server:", error);
        res.status(500).json({ message: `Error: ${error.message}` });
      }
    } else if (db === "oracle") {
      // Primero limpiamos la tabla existente
      await oracleConnection.execute(
        "DELETE FROM EMPLOYED",
        [],
        { autoCommit: true }
      );

      // Reseteamos la secuencia si existe
      try {
        await oracleConnection.execute(
          "ALTER SEQUENCE EMPLOYED_SEQ RESTART START WITH 1",
          [],
          { autoCommit: true }
        );
      } catch (seqError) {
        console.log("No se pudo resetear la secuencia o no existe:", seqError);
      }

      // Copiamos el archivo al directorio DATA_PUMP_DIR
      // Usamos C:/BACKUPS como directorio para Oracle en Windows
      const oracleDumpDir = 'C:/BACKUPS';
      const dumpFilename = path.basename(backupFilePath);
      const oracleDumpFile = path.join(oracleDumpDir, dumpFilename);

      fs.copyFileSync(backupFilePath, oracleDumpFile);
      console.log(`Archivo copiado a: ${oracleDumpFile}`);

      // Para Oracle, usamos impdp (Data Pump Import)
      const oracleRestoreCommand = `impdp ${oracleConfig.user}/${oracleConfig.password}@${oracleConfig.connectString} tables=${oracleConfig.schema}.EMPLOYED directory=DATA_PUMP_DIR dumpfile=${dumpFilename} logfile=restore_${Date.now()}.log table_exists_action=replace`;
      await executeCommand(oracleRestoreCommand);

      res.status(200).json({ message: "Tabla EMPLOYED en Oracle restaurada correctamente" });

    } else {
      return res.status(400).json({ message: "Base de datos no válida" });
    }
  } catch (error) {
    console.error("Error en la restauración:", error);
    res.status(500).json({ message: `Error: ${error.message}` });
  } finally {
    // Limpiamos el archivo temporal
    try {
      fs.unlinkSync(backupFilePath);
    } catch (err) {
      console.error("Error al eliminar el archivo temporal:", err);
    }
  }
});
