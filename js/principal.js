// ==========================================
// 1. FUNCIONES DE CARGA Y CONEXIÓN
// ==========================================
const API_URL = 'https://flotasmart-backend.onrender.com';

async function cargarVehiculos() {
    try {
        const res = await fetch(`${API_URL}/api/vehiculos`); 
        const vehiculos = await res.json();
        
        renderizarVehiculos(vehiculos);
        actualizarDashboard(vehiculos);
    } catch (error) { console.error("Error al cargar los vehículos:", error); }
}

async function liberarVehiculo(id_vehiculo) {
    if (confirm("¿Confirmas la liberación del vehículo?")) {
        try {
            const res = await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/liberar`, { method: 'PUT' });
            if (res.ok) window.location.reload(); 
            else alert('❌ Error al liberar.');
        } catch (error) { console.error(error); }
    }
}

async function responderPeticion(id_vehiculo, accion) {
    if(confirm(`¿Confirmas que deseas ${accion.toUpperCase()} esta solicitud?`)) {
        try {
            if(accion === 'Rechazar') {
                // Si rechaza, el auto vuelve a estar disponible (Activo)
                await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/liberar`, { method: 'PUT' });
            } else {
                // Si aprueba, el auto se va "En Ruta"
                await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/ruta`, { method: 'PUT' });
            }
            window.location.reload();
        } catch(e) { console.error(e); }
    }
}

// ==========================================
// 2. MODALES E HISTORIAL
// ==========================================

function abrirModalUso(id) {
    document.getElementById('uso-id-vehiculo').value = id;
    const usr = JSON.parse(localStorage.getItem('usuarioFlota'));
    if(usr && document.getElementById('uso-id-usuario')) document.getElementById('uso-id-usuario').value = usr.id_usuario || usr.id || 1; 
    new bootstrap.Modal(document.getElementById('modal-uso')).show();
}

function abrirModalEvento(id) {
    document.getElementById('evento-id-vehiculo').value = id;
    new bootstrap.Modal(document.getElementById('modal-evento')).show();
}

function abrirModalGasolina(id) {
    document.getElementById('gasolina-id-vehiculo').value = id;
    new bootstrap.Modal(document.getElementById('modal-gasolina')).show();
}

async function abrirModalHistorial(id_vehiculo) {
    new bootstrap.Modal(document.getElementById('modal-historial')).show();
    const tabla = document.getElementById('tabla-historial');
    tabla.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Cargando datos...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/api/historial/${id_vehiculo}`);
        if (!res.ok) throw new Error('Error al cargar historial');
        
        const historial = await res.json();
        tabla.innerHTML = ''; 

        if(historial.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay registros.</td></tr>';
            return;
        }

        historial.forEach(item => {
            let fecha = item.fecha ? new Date(item.fecha).toLocaleDateString() : 'Sin fecha';
            let actividad = item.actividad || item.tipo_evento || item.proposito || 'Registro';
            let detalles = item.detalles || item.descripcion || item.causa || 'Sin detalles';

            let colorBadge = 'bg-secondary';
            let txt = actividad.toLowerCase();
            
            if (txt.includes('falla') || txt.includes('accidente') || txt.includes('mantenimiento')) colorBadge = 'bg-danger';
            else if (txt.includes('logística') || txt.includes('transporte') || txt.includes('uso')) colorBadge = 'bg-primary';
            else if (txt.includes('libera') || txt.includes('activo')) colorBadge = 'bg-success';
            else if (txt.includes('gasolina') || txt.includes('combustible')) colorBadge = 'bg-dark';

            tabla.innerHTML += `<tr><td class="fw-bold text-muted">${fecha}</td><td><span class="badge ${colorBadge}">${actividad}</span></td><td class="small">${detalles}</td></tr>`;
        });
    } catch (error) { tabla.innerHTML = '<tr><td colspan="3" class="text-center text-danger">⚠️ Historial no disponible.</td></tr>'; }
}

// ==========================================
// 3. DIBUJAR INTERFAZ (Alertas y Roles)
// ==========================================

function renderizarVehiculos(vehiculos) {
    const contenedor = document.getElementById('contenedor-vehiculos');
    if (!contenedor) return; 
    contenedor.innerHTML = ''; 

    // OBTENEMOS EL ROL DEL USUARIO
    const usuario = JSON.parse(localStorage.getItem('usuarioFlota')) || { rol: 'admin' };
    const esChofer = (usuario.rol === 'chofer');

    vehiculos.forEach(auto => {
        const estadoLC = auto.estado_actual.toLowerCase();
        const esActivo = estadoLC === 'activo';
        const esMantenimiento = estadoLC.includes('mantenimiento');
        const esPendiente = estadoLC === 'pendiente';
        const esRuta = estadoLC.includes('ruta');
        
        let colorBadge = esActivo ? 'bg-activo' : (esMantenimiento ? 'bg-mantenimiento' : (esPendiente ? 'bg-warning text-dark' : 'bg-info text-white'));
        
        // LÓGICA DE BOTONES SEGÚN EL ROL Y EL ESTADO
        let botonesHTML = '';
        
        if (esActivo) {
            botonesHTML += `<button class="btn btn-outline-success w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="abrirModalUso(${auto.id_vehiculo})">🚗 Registrar Salida</button>`;
            botonesHTML += `<button class="btn btn-outline-dark w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="abrirModalGasolina(${auto.id_vehiculo})">⛽ Cargar Combustible</button>`;
            if (!esChofer) {
                botonesHTML += `<button class="btn btn-outline-danger w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="abrirModalEvento(${auto.id_vehiculo})">🔧 Reportar Incidencia</button>`;
            }
        } 
        else if (esMantenimiento) {
            if (!esChofer) {
                botonesHTML = `<button class="btn w-100 mb-2 fw-bold" style="background-color: #d4af37; color: white; border-radius: 10px;" onclick="liberarVehiculo(${auto.id_vehiculo})">✅ Liberar del Taller</button>`;
            } else {
                botonesHTML = `<button class="btn btn-secondary w-100 mb-2 fw-bold" disabled>En Taller (Restringido)</button>`;
            }
        } 
        else if (esPendiente) {
            if (!esChofer) { 
                botonesHTML += `<button class="btn btn-success w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="responderPeticion(${auto.id_vehiculo}, 'Aprobar')">✅ Aprobar Salida</button>`;
                botonesHTML += `<button class="btn btn-danger w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="responderPeticion(${auto.id_vehiculo}, 'Rechazar')">❌ Rechazar</button>`;
            } else {
                botonesHTML = `<button class="btn btn-warning w-100 mb-2 fw-bold text-dark" disabled>⏳ Esperando Aprobación</button>`;
            }
        } 
        else if (esRuta) {
            botonesHTML = `<button class="btn btn-info text-white w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="alert('Funcionalidad de retorno pendiente')">📍 Registrar Retorno</button>`;
        }

        // LÓGICA DE ALERTAS (Seguros y Servicios)
        let alertasHTML = '';
        const hoy = new Date();
        
        if (auto.fecha_seguro) {
            const fechaSeguro = new Date(auto.fecha_seguro);
            const diasRestantes = (fechaSeguro - hoy) / (1000 * 60 * 60 * 24);
            if (diasRestantes > 0 && diasRestantes <= 15) {
                alertasHTML += `<div class="alert alert-warning py-1 px-2 small mb-2 text-center" style="border-radius: 8px;">⚠️ Seguro vence en ${Math.ceil(diasRestantes)} días</div>`;
            } else if (diasRestantes <= 0) {
                alertasHTML += `<div class="alert alert-danger py-1 px-2 small mb-2 text-center fw-bold" style="border-radius: 8px;">❌ SEGURO VENCIDO</div>`;
            }
        }

        if (auto.km_proximo_servicio && auto.kilometraje) {
            if (auto.kilometraje >= auto.km_proximo_servicio - 500) {
                alertasHTML += `<div class="alert alert-danger py-1 px-2 small mb-2 text-center" style="border-radius: 8px;">🚨 Requiere Servicio Inmediato</div>`;
            }
        }

        contenedor.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="card p-4 h-100 border-0 shadow-sm" style="border-radius: 15px;">
                    <h4 class="fw-bold text-primary mb-0">${auto.marca} ${auto.modelo}</h4>
                    <p class="text-muted small mb-3">Año: ${auto.anio}</p>
                    
                    ${alertasHTML}

                    <div class="d-flex justify-content-between align-items-center mb-2 mt-2">
                        <span class="text-muted fw-bold small">Placa:</span>
                        <span class="badge bg-secondary px-3 py-2" style="border-radius: 8px;">${auto.placa}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <span class="text-muted fw-bold small">Estado:</span>
                        <span class="status-badge ${colorBadge} px-3 py-2 text-capitalize">${auto.estado_actual}</span>
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

async function actualizarDashboard(vehiculos) {
    const activos = vehiculos.filter(v => v.estado_actual.toLowerCase() === 'activo').length;
    const enMantenimiento = vehiculos.filter(v => v.estado_actual.toLowerCase().includes('mantenimiento')).length;

    const ctx = document.getElementById('graficaFlota');
    if (ctx && Chart.getChart(ctx)) Chart.getChart(ctx).destroy(); 
    if (ctx) {
        new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Disponibles', 'En Taller'], datasets: [{ data: [activos, enMantenimiento], backgroundColor: ['#2e8b57', '#d4af37'], borderWidth: 0 }] },
            options: { cutout: '60%', plugins: { legend: { position: 'bottom' } } }
        });
    }

    const ranking = document.getElementById('contenedor-ranking');
    if (!ranking) return;

    try {
        const res = await fetch(`${API_URL}/api/eventos`);
        if (!res.ok) throw new Error("Error API");
        const eventos = await res.json();

        const conteo = {};
        eventos.forEach(ev => conteo[ev.id_vehiculo] = (conteo[ev.id_vehiculo] || 0) + 1);

        const topFallas = Object.keys(conteo).map(id => {
            const auto = vehiculos.find(v => v.id_vehiculo == id);
            return { nombre: auto ? `${auto.marca} ${auto.modelo}` : `Unidad #${id}`, fallas: conteo[id] };
        }).sort((a, b) => b.fallas - a.fallas).slice(0, 3);

        ranking.innerHTML = '';
        if(topFallas.length === 0) ranking.innerHTML = '<p class="text-muted text-center mt-3">No hay historial de fallas.</p>';
        else topFallas.forEach(item => ranking.innerHTML += `<div class="d-flex justify-content-between align-items-center mb-3 p-2 border-bottom"><span class="fw-bold">${item.nombre}</span><span class="badge bg-danger rounded-pill px-3 py-2">${item.fallas} Fallas</span></div>`);
    } catch (error) { ranking.innerHTML = '<p class="text-muted text-center">Datos no disponibles.</p>'; }
}

// ==========================================
// 4. CAPTURA DE FORMULARIOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const usuario = JSON.parse(localStorage.getItem('usuarioFlota'));
    if(!usuario) { window.location.href = 'login.html'; return; }
    
    const navUsuario = document.getElementById('nav-usuario-rol');
    if(navUsuario) navUsuario.textContent = `Hola, ${usuario.nombre || 'Usuario'} (${usuario.rol || 'admin'})`;
    
    // Ocultar botón "Registrar Unidad" si es chofer
    if(usuario.rol === 'chofer' && document.getElementById('btn-registrar-unidad')) {
        document.getElementById('btn-registrar-unidad').style.display = 'none';
    }

    cargarVehiculos();

    // Evento
    const formEvento = document.getElementById('formulario-evento');
    if(formEvento) {
        formEvento.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            const id_vehiculo = document.getElementById('evento-id-vehiculo').value;
            try {
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
                await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/mantenimiento`, { method: 'PUT' });
                window.location.reload(); 
            } catch(error) { alert("Error al reportar"); }
        });
    }

    // Uso / Salida
    const formUso = document.getElementById('formulario-uso');
    if(formUso) {
        formUso.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await fetch(`${API_URL}/api/usos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_vehiculo: document.getElementById('uso-id-vehiculo').value,
                        id_usuario: document.getElementById('uso-id-usuario').value,
                        proposito: document.getElementById('uso-proposito').value,
                        kilometraje_salida: document.getElementById('uso-kilometraje').value
                    })
                });
                alert("Petición de salida registrada. Esperando aprobación.");
                window.location.reload();
            } catch(error) { console.error(error); }
        });
    }

    // Gasolina
    const formGasolina = document.getElementById('formulario-gasolina');
    if(formGasolina) {
        formGasolina.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await fetch(`${API_URL}/api/gasolina`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_vehiculo: document.getElementById('gasolina-id-vehiculo').value,
                        litros: document.getElementById('gasolina-litros').value,
                        costo_total: document.getElementById('gasolina-costo').value,
                        kilometraje: document.getElementById('gasolina-km').value
                    })
                });
                alert("⛽ Carga de combustible registrada exitosamente.");
                window.location.reload();
            } catch(error) { console.error(error); alert("Error al guardar combustible."); }
        });
    }
});