const API_URL = 'https://flotasmart-backend.onrender.com';
let vehiculosGlobal = []; 

async function cargarVehiculos() {
    try {
        const res = await fetch(`${API_URL}/api/vehiculos`); 
        vehiculosGlobal = await res.json();
        renderizarVehiculos(vehiculosGlobal);
        actualizarDashboard(vehiculosGlobal);
    } catch (error) { console.error("Error al cargar:", error); }
}

function renderizarVehiculos(vehiculos) {
    const contenedor = document.getElementById('contenedor-vehiculos');
    if (!contenedor) return; 
    contenedor.innerHTML = ''; 

    const usuario = JSON.parse(localStorage.getItem('usuarioFlota')) || { rol: 'admin' };
    const esChofer = (usuario.rol === 'chofer');

    vehiculos.forEach(auto => {
        const estadoLC = auto.estado_actual.toLowerCase();
        let colorBadge = estadoLC === 'activo' ? 'bg-success' : (estadoLC.includes('mantenimiento') ? 'bg-warning text-dark' : (estadoLC === 'pendiente' ? 'bg-secondary' : 'bg-info text-white'));
        
        let accionTarjeta = esChofer ? '' : `onclick="abrirModalDetalles(${auto.id_vehiculo})"`;
        let claseHover = esChofer ? 'tarjeta-chofer' : 'tarjeta-vehiculo';

        let botonChofer = '';
        if (esChofer && estadoLC === 'activo') {
            botonChofer = `
                <button class="btn btn-outline-success w-100 mt-3 fw-bold" onclick="abrirModalUso(${auto.id_vehiculo})">🚗 Solicitar Unidad</button>
                <button class="btn btn-outline-dark w-100 mt-2 fw-bold" onclick="abrirModalGasolina(${auto.id_vehiculo})">⛽ Cargar Combustible</button>
            `;
        } else if (esChofer && estadoLC === 'pendiente') {
            botonChofer = `<button class="btn btn-warning w-100 mt-3 fw-bold text-dark" disabled>⏳ Esperando Aprobación</button>`;
        } else if (esChofer && estadoLC.includes('ruta')) {
            botonChofer = `<button class="btn btn-info text-white w-100 mt-3 fw-bold" onclick="abrirModalRetorno(${auto.id_vehiculo})">📍 Registrar Retorno</button>`;
        }

        contenedor.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="card p-4 h-100 border-0 shadow-sm rounded-4 ${claseHover}" ${accionTarjeta}>
                    <h4 class="fw-bold text-primary mb-0">${auto.marca} ${auto.modelo}</h4>
                    <p class="text-muted small mb-3">Año: ${auto.anio}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2 mt-2">
                        <span class="text-muted fw-bold small">Placa:</span>
                        <span class="badge bg-secondary px-3 py-2" style="border-radius: 8px;">${auto.placa}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-0">
                        <span class="text-muted fw-bold small">Estado:</span>
                        <span class="badge ${colorBadge} px-3 py-2 text-capitalize">${auto.estado_actual}</span>
                    </div>
                    ${botonChofer}
                    ${!esChofer ? `<p class="text-center text-muted small mt-3 mb-0">👉 Clic para opciones (Admin)</p>` : ''}
                </div>
            </div>
        `;
    });
}

// 🔥 FUNCIÓN PARA EDITAR EL TANQUE MANUALMENTE (Para autos viejos)
async function editarTanque(id_vehiculo, capacidadActual) {
    const { value: nuevaCapacidad } = await Swal.fire({
        title: 'Capacidad del Tanque',
        input: 'number',
        inputLabel: 'Litros totales que le caben (Ej. 50)',
        inputValue: capacidadActual || 50,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar'
    });

    if (nuevaCapacidad) {
        try {
            await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/tanque`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ capacidad: nuevaCapacidad })
            });
            Swal.fire('¡Actualizado!', 'La capacidad fue guardada.', 'success').then(() => window.location.reload());
        } catch(e) { Swal.fire('Error', 'No se pudo guardar.', 'error'); }
    }
}

function abrirModalDetalles(id_vehiculo) {
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id_vehiculo);
    if(!auto) return;

    document.getElementById('detalles-titulo').innerText = `${auto.marca} ${auto.modelo}`;
    document.getElementById('detalles-placa').innerText = auto.placa;
    document.getElementById('detalles-km').innerText = `${auto.kilometraje || 0} km`;
    
    const nivelGas = auto.nivel_combustible !== null ? auto.nivel_combustible : 100;
    const gasColor = nivelGas < 25 ? 'text-danger' : 'text-success';
    
    // 🔥 Añadimos el botón del lapicito para poder editar el tanque
    document.getElementById('detalles-gas').innerHTML = `
        <span class="${gasColor}">${nivelGas}%</span>
        <button class="btn btn-sm btn-link p-0 ms-2 text-muted" onclick="editarTanque(${auto.id_vehiculo}, ${auto.capacidad_tanque})" title="Editar Capacidad del Tanque">✏️</button>
    `;

    const estadoLC = auto.estado_actual.toLowerCase();
    let botonesHTML = '';

    if (estadoLC === 'activo') {
        botonesHTML += `<button class="btn btn-success fw-bold w-100" onclick="cerrarDetallesYabrir('uso', ${auto.id_vehiculo})">🚗 Registrar Salida</button>`;
        botonesHTML += `<button class="btn btn-dark fw-bold w-100" onclick="cerrarDetallesYabrir('gasolina', ${auto.id_vehiculo})">⛽ Cargar Combustible</button>`;
        botonesHTML += `<button class="btn btn-danger fw-bold w-100 mt-2" onclick="cerrarDetallesYabrir('evento', ${auto.id_vehiculo})">🔧 Reportar Incidencia</button>`;
    } else if (estadoLC.includes('mantenimiento')) {
        botonesHTML += `<button class="btn btn-warning fw-bold text-dark w-100" onclick="liberarVehiculo(${auto.id_vehiculo})">✅ Liberar del Taller</button>`;
    } else if (estadoLC === 'pendiente') {
        botonesHTML += `<button class="btn btn-success fw-bold w-100" onclick="responderPeticion(${auto.id_vehiculo}, 'Aprobar')">✅ Aprobar Salida</button>`;
        botonesHTML += `<button class="btn btn-danger fw-bold w-100 mt-2" onclick="responderPeticion(${auto.id_vehiculo}, 'Rechazar')">❌ Rechazar</button>`;
    } else if (estadoLC.includes('ruta')) {
        botonesHTML += `<button class="btn btn-info text-white fw-bold w-100" onclick="cerrarDetallesYabrir('retorno', ${auto.id_vehiculo})">📍 Registrar Retorno</button>`;
    }

    botonesHTML += `<button class="btn btn-outline-secondary fw-bold w-100 mt-2" onclick="cerrarDetallesYabrir('historial', ${auto.id_vehiculo})">📖 Ver Historial</button>`;

    document.getElementById('detalles-botones').innerHTML = botonesHTML;
    new bootstrap.Modal(document.getElementById('modal-detalles')).show();
}

function cerrarDetallesYabrir(tipoModal, id) {
    const modalActual = bootstrap.Modal.getInstance(document.getElementById('modal-detalles'));
    modalActual.hide();
    setTimeout(() => {
        if(tipoModal === 'uso') abrirModalUso(id);
        if(tipoModal === 'gasolina') abrirModalGasolina(id);
        if(tipoModal === 'evento') abrirModalEvento(id);
        if(tipoModal === 'historial') abrirModalHistorial(id);
        if(tipoModal === 'retorno') abrirModalRetorno(id);
    }, 400); 
}

// 🔥 FUNCIONES CON MEMORIA DE DATOS VISUALES
function abrirModalUso(id) {
    document.getElementById('uso-id-vehiculo').value = id;
    const usr = JSON.parse(localStorage.getItem('usuarioFlota'));
    if(usr && document.getElementById('uso-id-usuario')) document.getElementById('uso-id-usuario').value = usr.id_usuario || 1; 
    
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    if(auto) {
        document.getElementById('uso-gasolina-lectura').value = `${auto.nivel_combustible || 100}%`;
        document.getElementById('uso-km-previo').innerText = auto.kilometraje || 0; // Muestra el dato anterior en el texto azul
        document.getElementById('uso-kilometraje').value = auto.kilometraje || 0;   // Lo escribe en el input
    }
    new bootstrap.Modal(document.getElementById('modal-uso')).show();
}

function abrirModalRetorno(id) {
    document.getElementById('retorno-id-vehiculo').value = id;
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    if(auto) {
        document.getElementById('retorno-km-previo').innerText = auto.kilometraje || 0; 
        document.getElementById('retorno-km').value = auto.kilometraje || 0; 
    }
    new bootstrap.Modal(document.getElementById('modal-retorno')).show();
}

function abrirModalGasolina(id) { 
    document.getElementById('gasolina-id-vehiculo').value = id; 
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    if(auto) {
        document.getElementById('gasolina-km-previo').innerText = auto.kilometraje || 0;
        document.getElementById('gasolina-km').value = auto.kilometraje || 0; 
    }
    new bootstrap.Modal(document.getElementById('modal-gasolina')).show(); 
}

function abrirModalEvento(id) { document.getElementById('evento-id-vehiculo').value = id; new bootstrap.Modal(document.getElementById('modal-evento')).show(); }

async function liberarVehiculo(id) {
    Swal.fire({ title: '¿Liberar?', icon: 'question', showCancelButton: true, confirmButtonText: 'Sí' }).then(async (res) => {
        if (res.isConfirmed) {
            await fetch(`${API_URL}/api/vehiculos/${id}/liberar`, { method: 'PUT' });
            window.location.reload();
        }
    });
}

async function responderPeticion(id, accion) {
    Swal.fire({ title: `¿${accion} solicitud?`, icon: 'warning', showCancelButton: true, confirmButtonText: `Sí, ${accion}` }).then(async (res) => {
        if (res.isConfirmed) {
            if(accion === 'Rechazar') await fetch(`${API_URL}/api/vehiculos/${id}/liberar`, { method: 'PUT' });
            else await fetch(`${API_URL}/api/vehiculos/${id}/ruta`, { method: 'PUT' });
            window.location.reload();
        }
    });
}

async function abrirModalHistorial(id_vehiculo) {
    new bootstrap.Modal(document.getElementById('modal-historial')).show();
    const tabla = document.getElementById('tabla-historial');
    tabla.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Cargando...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/api/historial/${id_vehiculo}`);
        const historial = await res.json();
        tabla.innerHTML = ''; 
        if(historial.length === 0) return tabla.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin registros.</td></tr>';

        historial.forEach(item => {
            let fecha = item.fecha ? new Date(item.fecha).toLocaleDateString() : '';
            let actividad = item.actividad || 'Registro';
            let detalles = item.detalles || 'Sin detalles';
            let colorBadge = actividad.toLowerCase().includes('falla') ? 'bg-danger' : (actividad.toLowerCase().includes('gasolina') ? 'bg-dark' : 'bg-secondary');
            tabla.innerHTML += `<tr><td class="fw-bold text-muted">${fecha}</td><td><span class="badge ${colorBadge}">${actividad}</span></td><td class="small">${detalles}</td></tr>`;
        });
    } catch (error) { tabla.innerHTML = '<tr><td colspan="3" class="text-danger">Error al cargar historial. Verifica la ruta en el servidor.</td></tr>'; }
}

async function actualizarDashboard(vehiculos) {
    const ctx = document.getElementById('graficaFlota');
    if (ctx && Chart.getChart(ctx)) Chart.getChart(ctx).destroy(); 
    if (ctx) new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels: ['Activos', 'En Taller'], datasets: [{ data: [vehiculos.filter(v=>v.estado_actual.toLowerCase()==='activo').length, vehiculos.filter(v=>v.estado_actual.toLowerCase().includes('mantenimiento')).length], backgroundColor: ['#2e8b57', '#d4af37'], borderWidth: 0 }] }, 
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%' } // Permite que la gráfica crezca al tamaño del contenedor
    });

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

document.addEventListener('DOMContentLoaded', () => {
    const usuario = JSON.parse(localStorage.getItem('usuarioFlota'));
    if(!usuario) return window.location.href = 'login.html';
    
    document.getElementById('nav-usuario-rol').textContent = `Hola, ${usuario.nombre || 'Usuario'} (${usuario.rol || 'admin'})`;
    if(usuario.rol === 'chofer' && document.getElementById('btn-registrar-unidad')) document.getElementById('btn-registrar-unidad').style.display = 'none';

    cargarVehiculos();

    const formVehiculo = document.getElementById('formulario-vehiculo');
    if(formVehiculo) {
        formVehiculo.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await fetch(`${API_URL}/api/vehiculos`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ placa: document.getElementById('input-placa').value, marca: document.getElementById('input-marca').value, modelo: document.getElementById('input-modelo').value, anio: document.getElementById('input-anio').value, capacidad_tanque: document.getElementById('input-tanque').value })
                });
                Swal.fire('¡Guardado!', 'Vehículo registrado.', 'success').then(()=>window.location.reload());
            } catch(e) {}
        });
    }

    const formRetorno = document.getElementById('formulario-retorno');
    if(formRetorno) formRetorno.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/api/vehiculos/${document.getElementById('retorno-id-vehiculo').value}/retorno`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kilometraje: document.getElementById('retorno-km').value, nivel_combustible: document.getElementById('retorno-gas').value })
            });
            Swal.fire('¡Viaje Finalizado!', 'Kilometraje y gasolina actualizados.', 'success').then(()=>window.location.reload());
        } catch(e) {}
    });

    const formUso = document.getElementById('formulario-uso');
    if(formUso) formUso.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/api/usos`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_vehiculo: document.getElementById('uso-id-vehiculo').value, id_usuario: document.getElementById('uso-id-usuario').value, proposito: document.getElementById('uso-proposito').value, kilometraje_salida: document.getElementById('uso-kilometraje').value })
            });
            Swal.fire('¡Enviado!', 'Petición enviada al administrador.', 'success').then(()=>window.location.reload());
        } catch(e) {}
    });

    const formGas = document.getElementById('formulario-gasolina');
    if(formGas) formGas.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/api/gasolina`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_vehiculo: document.getElementById('gasolina-id-vehiculo').value, litros: document.getElementById('gasolina-litros').value, costo_total: document.getElementById('gasolina-costo').value, kilometraje: document.getElementById('gasolina-km').value }) 
            });
            Swal.fire('¡Guardado!', 'Combustible registrado.', 'success').then(()=>window.location.reload());
        } catch(e) {}
    });

    const formEv = document.getElementById('formulario-evento');
    if(formEv) formEv.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('evento-id-vehiculo').value;
        try {
            await fetch(`${API_URL}/api/eventos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_vehiculo: id, tipo_evento: document.getElementById('evento-tipo').value, descripcion: document.getElementById('evento-causa').value + ' - ' + document.getElementById('evento-descripcion').value, costo: document.getElementById('evento-costo').value }) });
            await fetch(`${API_URL}/api/vehiculos/${id}/mantenimiento`, { method: 'PUT' });
            Swal.fire('¡Reportado!', 'Enviado al taller.', 'success').then(()=>window.location.reload());
        } catch(e) {}
    });
});