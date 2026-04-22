// ==========================================
// 1. FUNCIONES DE CONEXIÓN AL BACKEND (RENDER)
// ==========================================

async function cargarVehiculos() {
    try {
        const res = await fetch('https://flotasmart-backend.onrender.com/api/vehiculos'); 
        const vehiculos = await res.json();
        
        // Llamamos a las funciones que dibujan la pantalla
        renderizarVehiculos(vehiculos);
        actualizarDashboard(vehiculos);
        
    } catch (error) {
        console.error("Error al cargar los vehículos:", error);
    }
}

async function liberarVehiculo(id_vehiculo) {
    if (confirm("¿Confirmas la liberación del vehículo?")) {
        try {
            const res = await fetch(`https://flotasmart-backend.onrender.com/api/vehiculos/${id_vehiculo}/liberar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                window.location.reload(); 
            } else {
                alert('❌ Hubo un error al intentar liberar el vehículo.');
            }
        } catch (error) {
            console.error("Error de conexión:", error);
            alert('❌ No se pudo conectar con el servidor.');
        }
    }
}

// ==========================================
// 2. FUNCIONES PARA ABRIR LAS VENTANAS (MODALES)
// ==========================================

function abrirModalUso(id_vehiculo) {
    // Le pasamos el ID oculto al formulario
    document.getElementById('uso-id-vehiculo').value = id_vehiculo;
    
    // Rellenamos el ID del usuario que autoriza
    const usuario = JSON.parse(localStorage.getItem('usuarioFlota'));
    if(usuario && document.getElementById('uso-id-usuario')) {
        document.getElementById('uso-id-usuario').value = usuario.id_usuario || usuario.id; 
    }
    
    // Abrimos el modal
    new bootstrap.Modal(document.getElementById('modal-uso')).show();
}

function abrirModalEvento(id_vehiculo) {
    // Le pasamos el ID oculto al formulario
    document.getElementById('evento-id-vehiculo').value = id_vehiculo;
    
    // Abrimos el modal
    new bootstrap.Modal(document.getElementById('modal-evento')).show();
}

function abrirModalHistorial(id_vehiculo) {
    // Abrimos la ventana del historial
    new bootstrap.Modal(document.getElementById('modal-historial')).show();
    
    // Mensaje temporal mientras programamos la carga de la tabla
    document.getElementById('tabla-historial').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Cargando historial del vehículo...</td></tr>';
}

// ==========================================
// 3. FUNCIONES PARA DIBUJAR LA INTERFAZ (UI)
// ==========================================

function renderizarVehiculos(vehiculos) {
    const contenedor = document.getElementById('contenedor-vehiculos');
    if (!contenedor) return; 
    
    contenedor.innerHTML = ''; // Limpiamos antes de dibujar

    vehiculos.forEach(auto => {
        // Determinamos colores y botones según el estado
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

        // Armamos la tarjeta HTML
        const tarjeta = `
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
        contenedor.innerHTML += tarjeta;
    });
}

function actualizarDashboard(vehiculos) {
    const activos = vehiculos.filter(v => v.estado_actual.toLowerCase() === 'activo').length;
    const enMantenimiento = vehiculos.filter(v => v.estado_actual.toLowerCase() !== 'activo').length;

    // 1. Dibujar Gráfica
    const ctx = document.getElementById('graficaFlota');
    if (ctx) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Disponibles', 'En Taller'],
                datasets: [{
                    data: [activos, enMantenimiento],
                    backgroundColor: ['#2e8b57', '#d4af37'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '60%', plugins: { legend: { position: 'bottom' } } }
        });
    }

    // 2. Dibujar Ranking de Fallas
    const ranking = document.getElementById('contenedor-ranking');
    if (ranking) {
        ranking.innerHTML = '';
        const autosEnTaller = vehiculos.filter(v => v.estado_actual.toLowerCase() !== 'activo');
        
        if(autosEnTaller.length === 0) {
            ranking.innerHTML = '<p class="text-muted text-center mt-3">No hay unidades con fallas reportadas. ¡Todo excelente! 🎉</p>';
        } else {
            autosEnTaller.forEach(auto => {
                ranking.innerHTML += `
                <div class="d-flex justify-content-between align-items-center mb-3 p-2 border-bottom">
                    <span class="fw-bold">${auto.marca} ${auto.modelo}</span>
                    <span class="badge bg-danger rounded-pill px-3 py-2">En Taller</span>
                </div>`;
            });
        }
    }
}

// ==========================================
// 4. LA LLAVE DEL MOTOR (Arranque Automático)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Revisamos si el usuario está logueado
    const usuario = JSON.parse(localStorage.getItem('usuarioFlota'));
    
    if(!usuario) {
        // Si no hay sesión, lo mandamos al login
        window.location.href = 'login.html';
    } else {
        // Ponemos su nombre en la barra superior
        const navUsuario = document.getElementById('nav-usuario-rol');
        if(navUsuario) navUsuario.textContent = `Hola, ${usuario.nombre || 'Administrador'}`;
        
        // Arrancamos la carga de vehículos
        cargarVehiculos();
    }
});