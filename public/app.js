const cancelar = document.getElementById("limpiar");
cancelar.addEventListener('click', () => {
  const nombre = document.getElementById("nombre");
  const apellido = document.getElementById("apellido");
  const fecha_nacimiento = document.getElementById("fecha_nacimiento");
  const email = document.getElementById("email");
  const telefono = document.getElementById("telefono");
  const departamento = document.getElementById("departamento");
  const cargo = document.getElementById("cargo");
  const fecha_contratacion = document.getElementById("fecha_contratacion");
  const base_datos = document.getElementById("base_datos");

  if (nombre.value !== "" || apellido.value !== "" || fecha_nacimiento.value !== "" || email.value !== "" || telefono.value !== "" || departamento.value !== "" || cargo.value !== "" || fecha_contratacion.value !== "") {
    Swal.fire({
      title: "Registro Cancelado",
      icon: "error",
      draggable: true
    });
  }
})

// Registo de empleados
document.getElementById("empleadoForm").addEventListener("submit", async function () {
  const data = {
    nombre: document.getElementById("nombre").value,
    apellido: document.getElementById("apellido").value,
    fecha_nacimiento: document.getElementById("fecha_nacimiento").value,
    email: document.getElementById("email").value,
    telefono: document.getElementById("telefono").value,
    departamento: document.getElementById("departamento").value,
    cargo: document.getElementById("cargo").value,
    fecha_contratacion: document.getElementById("fecha_contratacion").value,
    base_datos: document.getElementById("base_datos").value
  };
  try {
    const response = await fetch("/api/empleado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      Swal.fire({
        title: "Empleado registrado correctamente",
        icon: "success",
        timer: 2000
      });
      document.getElementById("empleadoForm").reset();
    } else {
      Swal.fire({
        title: "Error al registrar empleado",
        text: result.message,
        icon: "error"
      });
    }
  } catch (err) {
    console.error("Error en el registro:", err);
    Swal.fire({
      title: "Error",
      text: "No se pudo registrar el empleado",
      icon: "error"
    });
  }
});


//Mostramos los empleados de las bases de datos seleccionadas
async function mostrarEmpleados(id) {
  const nameDB = document.getElementById("nameDB");
  const bd = document.getElementById("ver_bd").value;
  nameDB.innerText = "Base de datos: " + bd.toUpperCase();
  const tablaBody = document.getElementById("tabla-empleados-body");
  tablaBody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';

  try {
    const response = await fetch(`/api/empleados?db=${bd}`);
    const empleados = await response.json();
    if (empleados.length === 0) {
      tablaBody.innerHTML = '<tr><td colspan="8">No hay empleados registrados.</td></tr>';
      return;
    }

    tablaBody.innerHTML = "";
    empleados.forEach(emp => {
      tablaBody.innerHTML += `
        <tr>
          <td>${emp.id}</td>
          <td>${emp.nombre}</td>
          <td>${emp.apellido}</td>
          <td>${formatearFecha(emp.fecha_n)}</td>
          <td>${emp.telefono}</td>
          <td>${emp.cargo}</td>
          <td>${emp.correo}</td>
          <td>${emp.departamento}</td>
          <td>${formatearFecha(emp.fecha_c)}</td>
          <td>
            <button class="btn btn-danger" onclick="eliminarEmpleado(${emp.id})" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>
            <button type="button" class="btn btn-primary" onclick='abrirModalEditar(${JSON.stringify(emp)})' title="Actualizar"><i class="bi bi-arrow-clockwise"></i></button>
          </td>
        </tr>

        <!-- Modal Global para editar -->
        <div class="modal fade" id="modalEditar" tabindex="-1" aria-labelledby="modalEditarLabel" aria-hidden="true">
          <div class="modal-dialog" style="max-width: 90vw; width: 90vw;">
            <div class="modal-content">
              <form id="form-editar-empleado">
                <div class="modal-header">
                  <h5 class="modal-title" id="modalEditarLabel">Actualizar Empleado</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body">
                  <input type="hidden" id="editar_id">
                  <div class="mb-3">
                    <div class="row">
                    <div class="col-md-4 mb-3">
                      <label for="editar_nombre" class="form-label">Nombre</label>
                      <input type="text" class="form-control" id="editar_nombre">
                    </div>
                    <div class="col-md-4 mb-3">
                      <label for="editar_apellido" class="form-label">Apellido</label>
                      <input type="text" class="form-control" id="editar_apellido">
                    </div>
                    <div class="col-md-4 mb-3">
                      <label for="editar_fecha_nacimiento" class="form-label">Fecha de Nacimiento</label>
                      <input class="form-control" type="date" id="editar_fecha_nacimiento">
                    </div>
                    <div class="col-md-4 mb-3">
                      <label for="editar_email" class="form-label">Email</label>
                      <input type="email" class="form-control" id="editar_email">
                    </div>
                    <div class="col-md-4 mb-3">
                      <label for="editar_telefono" class="form-label">Teléfono</label>
                      <input type="text" class="form-control" id="editar_telefono">
                    </div>
                    <div class="col-md-4 mb-3">
                      <label for="editar_departamento" class="form-label">Departamento</label>
                      <input type="text" class="form-control" id="editar_departamento">
                    </div>
                    <div class="col-md-4 mb-3">
                      <label for="editar_cargo" class="form-label">Cargo</label>
                      <input type="text" class="form-control" id="editar_cargo">
                    </div>
                    <div class="col-md-4 mb-3">
                      <label for="editar_fecha_contratacion" class="form-label">Fecha de Contratación</label>
                      <input class="form-control" type="date" id="editar_fecha_contratacion">
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-primary" id="btnActualizarEmpleado" onclick="actualizarEmpleado(${emp.id})">Actualizar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
        `;

    });
  } catch (error) {
    console.error(error);
    tablaBody.innerHTML = '<tr><td colspan="8">Error al cargar empleados.</td></tr>';
  }
}

// Función para eliminar un empleado
async function eliminarEmpleado(id) {
  const bd = document.getElementById("ver_bd").value;

  if (!bd) {
    Swal.fire({
      title: "Selecciona la base de datos",
      icon: "warning"
    });
    return;
  }

  const confirmacion = await Swal.fire({
    title: "Quieres eliminar el empleado?",
    text: `ID: ${id}`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (confirmacion.isConfirmed) {
    try {
      const res = await fetch(`/api/empleado/${id}?db=${bd}`, {
        method: "DELETE"
      });

      if (res.ok) {
        Swal.fire({
          title: "Eliminado correctamente",
          icon: "success"
        });
        mostrarEmpleados();
      } else {
        const msg = await res.text();
        Swal.fire("Error", msg, "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo eliminar el empleado", "error");
    }
  }
}

//Función para actualizar un empleado
async function actualizarEmpleado(id) {
  const bd = document.getElementById("ver_bd").value;
  
  if (!bd) {
    Swal.fire({
      title: "Selecciona la base de datos",
      icon: "warning"
    });
    return;
  }
  
  const data = {
    id: document.getElementById("editar_id").value,
    nombre: document.getElementById("editar_nombre").value,
    apellido: document.getElementById("editar_apellido").value,
    fecha_nacimiento: document.getElementById("editar_fecha_nacimiento").value,
    email: document.getElementById("editar_email").value,
    telefono: document.getElementById("editar_telefono").value,
    departamento: document.getElementById("editar_departamento").value,
    cargo: document.getElementById("editar_cargo").value,
    fecha_contratacion: document.getElementById("editar_fecha_contratacion").value
  };

  try {
    const response = await fetch(`/api/empleado/${id}?db=${bd}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      Swal.fire({
        title: "Empleado actualizado correctamente",
        icon: "success",
        timer: 2000
      });
      
      // Cerrar el modal
      const modalElement = document.getElementById('modalEditar');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
      
      // Actualizar la tabla
      mostrarEmpleados();
    } else {
      const result = await response.json();
      Swal.fire({
        title: "Error al actualizar empleado",
        text: result.message,
        icon: "error"
      });
    }
  } catch (err) {
    console.error("Error en la actualización:", err);
    Swal.fire({
      title: "Error",
      text: "No se pudo actualizar el empleado",
      icon: "error"
    });
  }
}

//Función para formatear la fecha
function formatearFecha(fecha) {
  try {
    const f = new Date(fecha);
    return isNaN(f) ? "" : f.toLocaleDateString('es-ES');
  } catch (e) {
    return "";
  }
}

// Función para abrir el modal de edición
function abrirModalEditar(emp) {
  const fecha_nacimiento = new Date(emp.fecha_n);
  const localDate = new Date(fecha_nacimiento.getTime() - fecha_nacimiento.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const fecha_contratacion = new Date(emp.fecha_c);
  const localDate2 = new Date(fecha_contratacion.getTime() - fecha_contratacion.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  document.getElementById("editar_id").value = emp.id;
  document.getElementById("editar_nombre").value = emp.nombre;
  document.getElementById("editar_apellido").value = emp.apellido;
  // Aquí convertimos la fecha a formato ISO para input date (yyyy-mm-dd)
  document.getElementById("editar_fecha_nacimiento").value = localDate;
  document.getElementById("editar_email").value = emp.correo;
  document.getElementById("editar_telefono").value = emp.telefono;
  document.getElementById("editar_departamento").value = emp.departamento;
  document.getElementById("editar_cargo").value = emp.cargo;
  document.getElementById("editar_fecha_contratacion").value = localDate2;

  new bootstrap.Modal(document.getElementById("modalEditar")).show();
}

//Funciones para hacer el backup y restaurar
async function backup() {
  const response = await fetch(`/api/backup`, {
    method: "POST"
  });

  if (response.ok) {
    Swal.fire({
      title: "Backup realizado correctamente",
      icon: "success",
      timer: 2000
    });
  } else {
    Swal.fire({
      title: "Error al realizar el backup",
      icon: "error",
      timer: 2000
    });
  }
}

// Función para eliminar una base de datos o tabla
document.querySelector('.btnBackup .btn-danger:nth-child(2)').addEventListener('click', async function() {
  const bd = document.getElementById("ver_bd").value;
  
  if (!bd) {
    Swal.fire({
      title: "Selecciona la base de datos",
      icon: "warning"
    });
    return;
  }
  
  let warningMessage = "";
  if (bd === "oracle") {
    warningMessage = `Vas a eliminar TODOS los registros de la tabla EMPLOYED en Oracle. Esta acción no se puede deshacer.`;
  } else {
    warningMessage = `Vas a ELIMINAR COMPLETAMENTE la base de datos ${bd.toUpperCase()}. Esta acción no se puede deshacer y requerirá restaurar la base de datos.`;
  }
  
  const confirmacion = await Swal.fire({
    title: "¿Estás seguro?",
    text: warningMessage,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6"
  });
  
  if (confirmacion.isConfirmed) {
    try {
      const response = await fetch(`/api/eliminar-db?db=${bd}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        let successMessage = "";
        if (bd === "oracle") {
          successMessage = "Se han eliminado todos los registros de la tabla EMPLOYED en Oracle";
        } else {
          successMessage = `Se ha eliminado completamente la base de datos ${bd.toUpperCase()}`;
        }
        
        Swal.fire({
          title: "Operación completada",
          text: successMessage,
          icon: "success"
        });
        
        // Actualizar la tabla o mostrar mensaje de que no hay conexión
        if (bd === "oracle") {
          mostrarEmpleados();
        } else {
          document.getElementById("tabla-empleados-body").innerHTML = 
            '<tr><td colspan="10">Base de datos eliminada. Necesita ser restaurada para continuar.</td></tr>';
          document.getElementById("nameDB").innerText = `Base de datos: ${bd.toUpperCase()} (ELIMINADA)`;
        }
      } else {
        const result = await response.json();
        Swal.fire({
          title: "Error en la operación",
          text: result.message,
          icon: "error"
        });
      }
    } catch (err) {
      console.error("Error en la operación:", err);
      Swal.fire({
        title: "Error",
        text: "No se pudo completar la operación",
        icon: "error"
      });
    }
  }
});

// Función para restaurar una base de datos
function restaurarBaseDatos() {
  const fileInput = document.getElementById('backup');
  const bd = document.getElementById("ver_bd").value;
  
  if (!bd) {
    Swal.fire({
      title: "Selecciona la base de datos",
      icon: "warning"
    });
    return;
  }
  
  if (!fileInput.files || fileInput.files.length === 0) {
    Swal.fire({
      title: "Selecciona un archivo de backup",
      icon: "warning"
    });
    return;
  }
  
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('backupFile', file);
  formData.append('db', bd);
  
  Swal.fire({
    title: "Restaurando...",
    text: `Restaurando ${bd.toUpperCase()} desde backup`,
    icon: "info",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
  
  fetch('/api/restaurar-db', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.message || 'Error en la restauración');
      });
    }
    return response.json();
  })
  .then(data => {
    Swal.fire({
      title: "Restauración completada",
      text: data.message,
      icon: "success"
    });
    
    // Limpiar el input de archivo
    fileInput.value = '';
    
    // Actualizar la tabla para mostrar los datos restaurados
    mostrarEmpleados();
  })
  .catch(error => {
    console.error("Error en la restauración:", error);
    Swal.fire({
      title: "Error",
      text: error.message || "No se pudo completar la restauración",
      icon: "error"
    });
  });
}

// Asignar la función al botón de restaurar
document.querySelector('.card .btn-warning').addEventListener('click', restaurarBaseDatos);

// Función para realizar backup de todas las bases de datos
function realizarBackupCompleto() {
  // Mostrar indicador de carga
  Swal.fire({
    title: "Realizando backup...",
    text: "Espere mientras se respaldan todas las bases de datos",
    icon: "info",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  // Realizar la petición
  fetch('/api/backup', { 
    method: 'POST'
  })
  .then(response => response.json())
  .then(data => {
    // Crear HTML para los enlaces de descarga
    let linksHtml = '<div class="backup-links">';
    
    data.results.forEach(result => {
      if (result.downloadUrl) {
        linksHtml += `
          <div class="backup-item">
            <strong>${result.db.toUpperCase()}</strong>: 
            <a href="${result.downloadUrl}" download="${result.filename}" class="btn btn-sm btn-primary">
              Descargar backup
            </a>
          </div>
        `;
      } else {
        linksHtml += `
          <div class="backup-item">
            <strong>${result.db.toUpperCase()}</strong>: 
            <span class="text-danger">${result.message}</span>
          </div>
        `;
      }
    });
    
    linksHtml += '</div>';
    
    // Mostrar resultados con SweetAlert
    Swal.fire({
      title: "Backup completado",
      html: `
        <p>Se han completado los procesos de backup.</p>
        ${linksHtml}
      `,
      icon: "success",
      confirmButtonText: "Cerrar"
    });
  })
  .catch(error => {
    console.error('Error:', error);
    Swal.fire({
      title: "Error",
      text: "Ocurrió un error al realizar el backup",
      icon: "error"
    });
  });
}

// Asignar esta función al botón de backup
document.querySelector('#btnBackupCompleto').addEventListener('click', realizarBackupCompleto);