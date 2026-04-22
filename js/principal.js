// ==========================================
// 1. FUNCIONES DE CARGA Y CONEXIÓN BÁSICA
// ==========================================
const API_URL = 'https://flotasmart-backend.onrender.com';

async function cargarVehiculos() {
    try {
        const res = await fetch(`${API_URL}/api/vehiculos`); 
        const vehiculos = await res.json();
        
        renderizarVehiculos(vehiculos);
        actualizarDashboard(vehiculos);
    } catch (error) {
        console.error("Error al cargar los vehículos:", error);
    }
}

async function liberarVehiculo(id_vehiculo) {
    if (confirm("¿Confirmas la liberación del vehículo?")) {
        try {
            const res = await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/liberar`, { method: 'PUT' });
            if (res.ok) window.location.reload(); 
            else alert('❌ Hubo un error al intentar liberar el vehículo.');
        } catch (error) {
            console.error(error);
        }
    }
}

// ==========================================
// 2. FUNCIONES DE MODALES E HISTORIAL
// ==========================================

function abrirModalUso(id_vehiculo) {
    document.getElementById('uso-id-vehiculo').value = id_vehiculo;
    const usuario = JSON.parse(localStorage.getItem('usuarioFlota'));
    if(usuario && document.getElementById('uso-id-usuario')) {
        document.getElementById('uso-id-usuario').value = usuario.id_usuario || usuario.id || 1; 
    }
    new bootstrap.Modal(document.getElementById('modal-uso')).show();
}

function abrirModalEvento(id_vehiculo) {
    document.getElementById('evento-id-vehiculo').value = id_vehiculo;
    new bootstrap.Modal(document.getElementById('modal-evento')).show();
}

// 🔥 NUEVO: Función real que trae el historial desde la base de datos
async function abrirModalHistorial(id_vehiculo) {
    new bootstrap.Modal(document.getElementById('modal-historial')).show();
    const tabla = document.getElementById('tabla-historial');
    tabla.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4"><div class="spinner-border text-primary" role="status"></div><br>Cargando datos...</td></tr>';

    try {
        // Buscamos en tu ruta de historial (si falla, intenta buscar en eventos o usos)
        const res = await fetch(`${API_URL}/api/historial/${id_vehiculo}`);
        if (!res.ok) throw new Error('No se pudo cargar el historial');
        
        const historial = await res.json();
        tabla.innerHTML = ''; // Limpiamos el mensaje de carga

        if(historial.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay registros previos para este vehículo.</td></tr>';
            return;
        }

        historial.forEach(item => {
            // Formateamos la fecha si existe
            let fecha = item.fecha ? new Date(item.fecha).toLocaleDateString() : 'Sin fecha';
            // Usamos las columnas de tu BD (ajusta si se llaman diferente)
            let actividad = item.actividad || item.tipo_evento || item.proposito || 'Registro de sistema';
            let detalles = item.detalles || item.descripcion || 'Sin detalles adicionales';

            tabla.innerHTML += `
                <tr>
                    <td class="fw-bold text-muted">${fecha}</td>
                    <td><span class="badge bg-secondary">${actividad}</span></td>
                    <td class="small">${detalles}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error(error);
        tabla.innerHTML = '<tr><td colspan="3" class="text-center text-danger">⚠️ No se pudo obtener el historial. Verifica las rutas en el backend.</td></tr>';
    }
}

// ==========================================
// 3. DIBUJAR INTERFAZ (Tarjetas y Dashboard)
// ==========================================

function renderizarVehiculos(vehiculos) {
    const contenedor = document.getElementById('contenedor-vehiculos');
    if (!contenedor) return; 
    contenedor.innerHTML = ''; 

    vehiculos.forEach(auto => {
        const esActivo = auto.estado_actual.toLowerCase() === 'activo';
        const colorBadge = esActivo ? 'bg-activo' : 'bg-mantenimiento';
        const textoEstado = esActivo ? 'Activo' : 'En mantenimiento';
        
        let botonesHTML = '';
        if (esActivo) {
            botonesHTML = `
                <button class="btn btn-outline-success w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="abrirModalUso(${auto.id_vehiculo})">🚗 Autorizar Salida</button>
                <button class="btn btn-outline-danger w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="abrirModalEvento(${auto.id_vehiculo})">🔧 Reportar Incidencia</button>
            `;
        } else {
            botonesHTML = `
                <button class="btn w-100 mb-2 fw-bold" style="background-color: #d4af37; color: white; border-radius: 10px;" onclick="liberarVehiculo(${auto.id_vehiculo})">✅ Liberar del Taller</button>
            `;
        }

        contenedor.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="card p-4 h-100 border-0 shadow-sm" style="border-radius: 15px;">
                    <h4 class="fw-bold text-primary mb-0">${auto.marca} ${auto.modelo}</h4>
                    <p class="text-muted small mb-3">Año: ${auto.anio}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-muted fw-bold small">Placa:</span>
                        <span class="badge bg-secondary px-3 py-2" style="border-radius: 8px;">${auto.placa}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <span class="text-muted fw-bold small">Estado:</span>
                        <span class="status-badge ${colorBadge} px-3 py-2">${textoEstado}</span>
                    </div>
                    <div class="mt-auto">
                        ${botonesHTML}
                        <button class="btn btn-outline-primary w-100 fw-bold" style="border-radius: 10px;" onclick="abrirModalHistorial(${auto.id_vehiculo})">📖 Ver Historial</button>
                    </div>
                </div>
            </div>
        `;
    });
}

function actualizarDashboard(vehiculos) {
    const activos = vehiculos.filter(v => v.estado_actual.toLowerCase() === 'activo').length;
    const enMantenimiento = vehiculos.filter(v => v.estado_actual.toLowerCase() !== 'activo').length;

    const ctx = document.getElementById('graficaFlota');
    if (ctx) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Disponibles', 'En Taller'],
                datasets: [{ data: [activos, enMantenimiento], backgroundColor: ['#2e8b57', '#d4af37'], borderWidth: 0 }]
            },
            options: { cutout: '60%', plugins: { legend: { position: 'bottom' } } }
        });
    }

    const ranking = document.getElementById('contenedor-ranking');
    if (ranking) {
        ranking.innerHTML = '';
        const autosEnTaller = vehiculos.filter(v => v.estado_actual.toLowerCase() !== 'activo');
        if(autosEnTaller.length === 0) {
            ranking.innerHTML = '<p class="text-muted text-center mt-3">No hay unidades con fallas reportadas. ¡Todo excelente! 🎉</p>';
        } else {
            autosEnTaller.forEach(auto => {
                ranking.innerHTML += `<div class="d-flex justify-content-between align-items-center mb-3 p-2 border-bottom"><span class="fw-bold">${auto.marca} ${auto.modelo}</span><span class="badge bg-danger rounded-pill px-3 py-2">En Taller</span></div>`;
            });
        }
    }
}

// ==========================================
// 4. CAPTURAR FORMULARIOS Y ENVIAR AL SERVIDOR
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión
    const usuario = JSON.parse(localStorage.getItem('usuarioFlota'));
    if(!usuario) { window.location.href = 'login.html'; return; }
    
    const navUsuario = document.getElementById('nav-usuario-rol');
    if(navUsuario) navUsuario.textContent = `Hola, ${usuario.nombre || 'Administrador'}`;
    
    cargarVehiculos();

    // 🔥 EVITAR QUE LA PÁGINA SE RECARGUE SOLA Y ENVIAR LOS DATOS 🔥

    // Formulario: Reportar Falla (Evento)
    const formEvento = document.getElementById('formulario-evento');
    if(formEvento) {
        formEvento.addEventListener('submit', async (e) => {
            e.preventDefault(); // <- ESTO EVITA QUE LA PÁGINA SE RECARGUE
            const id_vehiculo = document.getElementById('evento-id-vehiculo').value;
            
            try {
                // 1. Enviamos los datos del reporte a la BD (Ruta de eventos)
                await fetch(`${API_URL}/api/eventos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_vehiculo: id_vehiculo,
                        tipo_evento: document.getElementById('evento-tipo').value,
                        descripcion: document.getElementById('evento-causa').value + ' - ' + document.getElementById('evento-descripcion').value,
                        costo: document.getElementById('evento-costo').value
                    })
                });

                // 2. Cambiamos el estado del auto a mantenimiento
                const res = await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/mantenimiento`, { method: 'PUT' });
                if(res.ok) window.location.reload(); // Recargamos para ver el cambio
            } catch(error) { console.error("Error al reportar:", error); alert("Error al contactar al servidor."); }
        });
    }

    // Formulario: Registrar Unidad Nueva
    const formVehiculo = document.getElementById('formulario-vehiculo');
    if(formVehiculo) {
        formVehiculo.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const res = await fetch(`${API_URL}/api/vehiculos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        placa: document.getElementById('input-placa').value,
                        marca: document.getElementById('input-marca').value,
                        modelo: document.getElementById('input-modelo').value,
                        anio: document.getElementById('input-anio').value,
                        estado_actual: 'Activo'
                    })
                });
                if(res.ok) window.location.reload();
            } catch(error) { console.error(error); }
        });
    }

    // Formulario: Autorizar Salida (Uso)
    const formUso = document.getElementById('formulario-uso');
    if(formUso) {
        formUso.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id_vehiculo = document.getElementById('uso-id-vehiculo').value;
            try {
                // Registramos el uso
                await fetch(`${API_URL}/api/usos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_vehiculo: id_vehiculo,
                        id_usuario: document.getElementById('uso-id-usuario').value,
                        proposito: document.getElementById('uso-proposito').value,
                        kilometraje_salida: document.getElementById('uso-kilometraje').value
                    })
                });
                // (Opcional) si tienes una ruta para ponerlo "En Ruta", sería aquí
                alert("Salida registrada con éxito en el historial.");
                window.location.reload();
            } catch(error) { console.error(error); }
        });
    }
});