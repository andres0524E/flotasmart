// ==========================================
// 1. FUNCIONES DE CARGA Y CONEXIÓN
// ==========================================
const API_URL = 'https://flotasmart-backend.onrender.com';

async function cargarVehiculos() {
    try {
        const res = await fetch(`${API_URL}/api/vehiculos`); 
        const vehiculos = await res.json();
        
        renderizarVehiculos(vehiculos);
        actualizarDashboard(vehiculos); // Esta función ahora calcula el top real
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
        } catch (error) { console.error(error); }
    }
}

// ==========================================
// 2. FUNCIONES DE MODALES E HISTORIAL INTELIGENTE
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

async function abrirModalHistorial(id_vehiculo) {
    new bootstrap.Modal(document.getElementById('modal-historial')).show();
    const tabla = document.getElementById('tabla-historial');
    tabla.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Cargando datos...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/api/historial/${id_vehiculo}`);
        if (!res.ok) throw new Error('No se pudo cargar el historial');
        
        const historial = await res.json();
        tabla.innerHTML = ''; 

        if(historial.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay registros previos para este vehículo.</td></tr>';
            return;
        }

        historial.forEach(item => {
            let fecha = item.fecha ? new Date(item.fecha).toLocaleDateString() : 'Sin fecha';
            // Unificamos el nombre de la actividad basándonos en lo que traiga tu BD
            let actividad = item.actividad || item.tipo_evento || item.proposito || 'Registro';
            let detalles = item.detalles || item.descripcion || item.causa || 'Sin detalles adicionales';

            // 🎨 Lógica de colores inteligente
            let colorBadge = 'bg-secondary';
            let texto = actividad.toLowerCase();
            
            if (texto.includes('falla') || texto.includes('accidente') || texto.includes('mantenimiento')) {
                colorBadge = 'bg-danger'; // Rojo para fallas
            } else if (texto.includes('logística') || texto.includes('transporte') || texto.includes('salida') || texto.includes('uso')) {
                colorBadge = 'bg-primary'; // Azul para salidas
            } else if (texto.includes('libera') || texto.includes('retorno') || texto.includes('activo')) {
                colorBadge = 'bg-success'; // Verde para cosas buenas
            }

            tabla.innerHTML += `
                <tr>
                    <td class="fw-bold text-muted">${fecha}</td>
                    <td><span class="badge ${colorBadge}">${actividad}</span></td>
                    <td class="small">${detalles}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error(error);
        tabla.innerHTML = '<tr><td colspan="3" class="text-center text-danger">⚠️ El historial no está disponible.</td></tr>';
    }
}

// ==========================================
// 3. DIBUJAR INTERFAZ (Tarjetas y Dashboard Real)
// ==========================================

function renderizarVehiculos(vehiculos) {
    const contenedor = document.getElementById('contenedor-vehiculos');
    if (!contenedor) return; 
    contenedor.innerHTML = ''; 

    vehiculos.forEach(auto => {
        // Detectamos si está "En Ruta" para mostrar los botones correctos
        const esActivo = auto.estado_actual.toLowerCase() === 'activo';
        const esMantenimiento = auto.estado_actual.toLowerCase().includes('mantenimiento');
        
        let colorBadge = esActivo ? 'bg-activo' : (esMantenimiento ? 'bg-mantenimiento' : 'bg-primary text-white');
        let textoEstado = auto.estado_actual;
        
        let botonesHTML = '';
        if (esActivo) {
            botonesHTML = `
                <button class="btn btn-outline-success w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="abrirModalUso(${auto.id_vehiculo})">🚗 Autorizar Salida</button>
                <button class="btn btn-outline-danger w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="abrirModalEvento(${auto.id_vehiculo})">🔧 Reportar Incidencia</button>
            `;
        } else if (esMantenimiento) {
            botonesHTML = `
                <button class="btn w-100 mb-2 fw-bold" style="background-color: #d4af37; color: white; border-radius: 10px;" onclick="liberarVehiculo(${auto.id_vehiculo})">✅ Liberar del Taller</button>
            `;
        } else {
            // Si está "En Ruta" (o cualquier otro)
            botonesHTML = `
                <button class="btn btn-info text-white w-100 mb-2 fw-bold" style="border-radius: 10px;" onclick="alert('Funcionalidad de retorno pendiente')">📍 Registrar Retorno</button>
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
                        <span class="status-badge ${colorBadge} px-3 py-2 text-capitalize">${textoEstado}</span>
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
    // 1. Gráfica
    const activos = vehiculos.filter(v => v.estado_actual.toLowerCase() === 'activo').length;
    const enMantenimiento = vehiculos.filter(v => v.estado_actual.toLowerCase().includes('mantenimiento')).length;

    const ctx = document.getElementById('graficaFlota');
    if (ctx && Chart.getChart(ctx)) Chart.getChart(ctx).destroy(); // Evitar que se empalmen gráficas
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

    // 2. Ranking REAL de fallas (Se conecta a la BD de eventos)
    const ranking = document.getElementById('contenedor-ranking');
    if (!ranking) return;

    try {
        const res = await fetch(`${API_URL}/api/eventos`);
        if (!res.ok) throw new Error("No se pueden leer los eventos");
        const eventos = await res.json();

        // Contamos cuántas fallas tiene cada ID
        const conteo = {};
        eventos.forEach(ev => {
            conteo[ev.id_vehiculo] = (conteo[ev.id_vehiculo] || 0) + 1;
        });

        // Ordenamos y sacamos los peores 3
        const topFallas = Object.keys(conteo).map(id => {
            const auto = vehiculos.find(v => v.id_vehiculo == id);
            return {
                nombre: auto ? `${auto.marca} ${auto.modelo}` : `Unidad #${id}`,
                fallas: conteo[id]
            };
        }).sort((a, b) => b.fallas - a.fallas).slice(0, 3);

        ranking.innerHTML = '';
        if(topFallas.length === 0) {
            ranking.innerHTML = '<p class="text-muted text-center mt-3">No hay historial de fallas. ¡Excelente! 🎉</p>';
        } else {
            topFallas.forEach(item => {
                ranking.innerHTML += `<div class="d-flex justify-content-between align-items-center mb-3 p-2 border-bottom"><span class="fw-bold">${item.nombre}</span><span class="badge bg-danger rounded-pill px-3 py-2">${item.fallas} Fallas</span></div>`;
            });
        }
    } catch (error) {
        console.log("No se pudo cargar el Top de Fallas avanzado:", error);
        ranking.innerHTML = '<p class="text-muted text-center">Calculando datos desde el servidor...</p>';
    }
}

// ==========================================
// 4. CAPTURAR FORMULARIOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const usuario = JSON.parse(localStorage.getItem('usuarioFlota'));
    if(!usuario) { window.location.href = 'login.html'; return; }
    
    const navUsuario = document.getElementById('nav-usuario-rol');
    if(navUsuario) navUsuario.textContent = `Hola, ${usuario.nombre || 'Administrador'}`;
    
    cargarVehiculos();

    // Formulario: Reportar Falla (Evento)
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

    // Formulario: Autorizar Salida (Uso)
    const formUso = document.getElementById('formulario-uso');
    if(formUso) {
        formUso.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id_vehiculo = document.getElementById('uso-id-vehiculo').value;
            try {
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
                // OPCIONAL: Si tu backend tiene la ruta para pasarlo a "En Ruta", descomenta la línea de abajo:
                // await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/ruta`, { method: 'PUT' });
                
                alert("Salida registrada con éxito.");
                window.location.reload();
            } catch(error) { console.error(error); }
        });
    }
});