import { obtener_vehiculos, crear_vehiculo, registrar_salida, registrar_evento, obtener_historial, obtener_ranking, aprobar_salida, rechazar_salida } from './modulos/api.js';

let grafico_flota = null;

const usuarioString = localStorage.getItem('usuarioFlota');
if (!usuarioString) window.location.href = '/login.html';

const usuarioLogueado = JSON.parse(usuarioString);
const textoRol = usuarioLogueado.rol.charAt(0).toUpperCase() + usuarioLogueado.rol.slice(1);
document.getElementById('nav-usuario-rol').textContent = textoRol;

const btn_nuevo = document.getElementById('btn-nuevo-vehiculo');
if (usuarioLogueado.rol !== 'administrador' && btn_nuevo) btn_nuevo.style.display = 'none';

document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem('usuarioFlota');
    window.location.href = '/login.html';
});

// ==========================================
// 📊 LÓGICA DEL DASHBOARD
// ==========================================
async function actualizarDashboard(vehiculos) {
    if (usuarioLogueado.rol !== 'administrador') return;
    document.getElementById('seccion-dashboard').classList.remove('d-none');
    
    const activos = vehiculos.filter(v => v.estado_actual.toLowerCase() === 'activo').length;
    const pendientes = vehiculos.filter(v => v.estado_actual.toLowerCase() === 'pendiente').length;
    const enUso = vehiculos.filter(v => v.estado_actual.toLowerCase() === 'en uso').length;
    const taller = vehiculos.filter(v => v.estado_actual.toLowerCase().includes('mantenimiento')).length;

    const ctx = document.getElementById('graficoFlota');
    if (grafico_flota) grafico_flota.destroy();
    grafico_flota = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Disponibles', 'Por Aprobar', 'En Ruta', 'En Taller'],
            datasets: [{
                data: [activos, pendientes, enUso, taller],
                backgroundColor: ['#198754', '#fd7e14', '#0dcaf0', '#ffc107'], // Verde, Naranja, Azul, Amarillo
                hoverOffset: 10, borderWidth: 0
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Poppins', size: 12 } } } } }
    });

    const ranking = await obtener_ranking();
    const listaHtml = document.getElementById('lista-ranking');
    listaHtml.innerHTML = '';
    if (ranking.length === 0) {
        listaHtml.innerHTML = '<li class="list-group-item text-center text-success border-0 fw-bold">¡Excelente! Cero fallas.</li>';
    } else {
        const medallas = ['🥇', '🥈', '🥉'];
        ranking.forEach((auto, index) => {
            listaHtml.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center border-0 mb-1 rounded bg-light">
                    <div><span class="fs-5 me-2">${medallas[index] || '🚩'}</span><span class="fw-bold text-dark">${auto.marca} ${auto.modelo}</span></div>
                    <span class="badge bg-danger rounded-pill fs-6 shadow-sm">${auto.total_fallas} Fallas</span>
                </li>`;
        });
    }
}

// ==========================================
// 🚗 CARGA DE LA INTERFAZ
// ==========================================
const modales = {
    vehiculo: document.getElementById('modal-vehiculo') ? new bootstrap.Modal(document.getElementById('modal-vehiculo')) : null,
    uso: document.getElementById('modal-uso') ? new bootstrap.Modal(document.getElementById('modal-uso')) : null,
    retorno: document.getElementById('modal-retorno') ? new bootstrap.Modal(document.getElementById('modal-retorno')) : null,
    evento: document.getElementById('modal-evento') ? new bootstrap.Modal(document.getElementById('modal-evento')) : null,
    historial: document.getElementById('modal-historial') ? new bootstrap.Modal(document.getElementById('modal-historial')) : null
};

async function cargar_pantalla() {
    const contenedor = document.getElementById('contenedor-vehiculos');
    if (!contenedor) return;
    contenedor.innerHTML = '<div class="col-12 text-center mt-5"><div class="spinner-border text-primary"></div></div>';
    
    const datos = await obtener_vehiculos();
    contenedor.innerHTML = '';
    
    if (datos.length > 0) actualizarDashboard(datos);
    if (datos.length === 0) return contenedor.innerHTML = '<div class="col-12"><div class="alert alert-warning">Sin Unidades.</div></div>';

    datos.forEach(v => {
        const estado_lower = v.estado_actual.toLowerCase();
        let color_estado = 'bg-success';
        if (estado_lower.includes('mantenimiento')) color_estado = 'bg-warning text-dark';
        else if (estado_lower === 'en uso') color_estado = 'bg-info text-white'; 
        else if (estado_lower === 'pendiente') color_estado = 'bg-warning text-dark'; 
        else if (estado_lower === 'inactivo' || estado_lower.includes('fuera')) color_estado = 'bg-danger';

        const estado_formateado = v.estado_actual.charAt(0).toUpperCase() + v.estado_actual.slice(1);

        let botones_html = '';
        if (estado_lower === 'activo') {
            const textoBoton = (usuarioLogueado.rol === 'administrador') ? '🚗 Autorizar Salida' : '🚗 Solicitar Unidad';
            botones_html += `<button class="btn btn-outline-success btn-sm w-100 mb-2 btn-usar fw-bold" data-id="${v.id_vehiculo}">${textoBoton}</button>`;
            botones_html += `<button class="btn btn-outline-danger btn-sm w-100 mb-2 btn-evento fw-bold" data-id="${v.id_vehiculo}">🔧 Reportar Incidencia</button>`;
        } 
        else if (estado_lower === 'pendiente') {
            if (usuarioLogueado.rol === 'administrador') {
                botones_html += `<button class="btn btn-success text-white btn-sm w-100 mb-2 btn-aprobar fw-bold shadow-sm" data-id="${v.id_vehiculo}">✅ Aprobar Salida</button>`;
                botones_html += `<button class="btn btn-danger text-white btn-sm w-100 mb-2 btn-rechazar fw-bold shadow-sm" data-id="${v.id_vehiculo}">❌ Rechazar</button>`;
            } else {
                botones_html += `<div class="alert alert-warning p-1 text-center small fw-bold mb-2">⏳ En revisión gerencial...</div>`;
            }
        }
        else if (estado_lower === 'en uso') {
            botones_html += `<button class="btn btn-info text-white btn-sm w-100 mb-2 btn-retorno fw-bold shadow-sm" data-id="${v.id_vehiculo}">📍 Registrar Retorno</button>`;
            botones_html += `<button class="btn btn-outline-danger btn-sm w-100 mb-2 btn-evento fw-bold" data-id="${v.id_vehiculo}">⚠️ Reportar Accidente</button>`;
        } 
        else if (estado_lower.includes('mantenimiento')) {
            if (usuarioLogueado.rol === 'administrador') {
                botones_html += `<button class="btn btn-warning btn-sm w-100 mb-2 btn-liberar fw-bold text-dark border-0 shadow-sm" data-id="${v.id_vehiculo}">✅ Liberar del Taller</button>`;
            } else {
                botones_html += `<div class="alert alert-warning p-1 text-center small fw-bold mb-2">Unidad en Taller</div>`;
            }
        }

        if (usuarioLogueado.rol === 'administrador') {
            botones_html += `<button class="btn btn-outline-primary btn-sm w-100 btn-historial fw-bold" data-id="${v.id_vehiculo}">📖 Ver Historial</button>`;
        }

        const div = document.createElement('div');
        div.className = 'col-md-4 mb-4';
        div.innerHTML = `
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body p-4">
                    <h4 class="card-title text-primary fw-bold mb-1">${v.marca} ${v.modelo}</h4>
                    <h6 class="card-subtitle mb-4 text-muted">Año: ${v.anio}</h6>
                    <ul class="list-group list-group-flush mb-3">
                        <li class="list-group-item px-0 d-flex justify-content-between align-items-center"><span class="text-secondary fw-bold">Placa:</span> <span class="badge bg-secondary fs-6 shadow-sm">${v.placa}</span></li>
                        <li class="list-group-item px-0 d-flex justify-content-between align-items-center"><span class="text-secondary fw-bold">Estado:</span> <span class="badge ${color_estado} fs-6 shadow-sm">${estado_formateado}</span></li>
                    </ul>
                </div>
                <div class="card-footer bg-white border-0 px-4 pb-4 pt-0">${botones_html}</div>
            </div>`;
        contenedor.appendChild(div);
    });

    // Conectar Eventos
    document.querySelectorAll('.btn-usar').forEach(btn => btn.addEventListener('click', (e) => {
        document.getElementById('uso-id-vehiculo').value = e.target.getAttribute('data-id');
        document.getElementById('uso-id-usuario').value = usuarioLogueado.id_usuario;
        if(modales.uso) modales.uso.show();
    }));
    document.querySelectorAll('.btn-retorno').forEach(btn => btn.addEventListener('click', (e) => {
        document.getElementById('retorno-id-vehiculo').value = e.target.getAttribute('data-id');
        if(modales.retorno) modales.retorno.show();
    }));
    document.querySelectorAll('.btn-evento').forEach(btn => btn.addEventListener('click', (e) => {
        document.getElementById('evento-id-vehiculo').value = e.target.getAttribute('data-id');
        if(modales.evento) modales.evento.show();
    }));
    document.querySelectorAll('.btn-liberar').forEach(btn => btn.addEventListener('click', async (e) => {
        if(confirm('¿Confirmas liberación?')) { await fetch(`/api/vehiculos/${e.target.getAttribute('data-id')}/liberar`, { method: 'PUT' }); cargar_pantalla(); }
    }));
    
    document.querySelectorAll('.btn-aprobar').forEach(btn => btn.addEventListener('click', async (e) => {
        await aprobar_salida(e.target.getAttribute('data-id')); cargar_pantalla();
    }));
    document.querySelectorAll('.btn-rechazar').forEach(btn => btn.addEventListener('click', async (e) => {
        if(confirm('¿Rechazar esta solicitud de salida?')) { await rechazar_salida(e.target.getAttribute('data-id')); cargar_pantalla(); }
    }));

    if (usuarioLogueado.rol === 'administrador') {
        document.querySelectorAll('.btn-historial').forEach(btn => btn.addEventListener('click', async (e) => {
            const tabla = document.getElementById('tabla-historial');
            tabla.innerHTML = '<tr><td colspan="3" class="text-center">Consultando...</td></tr>';
            if(modales.historial) modales.historial.show();
            const historial = await obtener_historial(e.target.getAttribute('data-id'));
            tabla.innerHTML = '';
            if (historial.length === 0) return tabla.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin registros.</td></tr>';
            
            historial.forEach(reg => {
                const fecha = new Date(reg.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
                let color_etiqueta = 'bg-primary text-white'; 
                if (reg.actividad.toLowerCase().includes('falla') || reg.actividad.toLowerCase().includes('mantenimiento') || reg.actividad.toLowerCase().includes('accidente')) color_etiqueta = 'bg-danger text-white'; 
                tabla.innerHTML += `<tr><td class="align-middle">${fecha}</td><td class="align-middle"><span class="badge ${color_etiqueta} border-0 shadow-sm text-wrap" style="max-width: 150px;">${reg.actividad}</span></td><td class="align-middle fw-bold text-secondary small">${reg.detalle}</td></tr>`;
            });
        }));
    }
}

// ==========================================
// 📩 ENVÍO DE FORMULARIOS
// ==========================================
if(btn_nuevo) { btn_nuevo.addEventListener('click', () => { if(modales.vehiculo) modales.vehiculo.show(); }); }

const f_v = document.getElementById('formulario-vehiculo');
if(f_v) f_v.addEventListener('submit', async (e) => {
    e.preventDefault();
    const n = { placa: document.getElementById('input-placa').value, marca: document.getElementById('input-marca').value, modelo: document.getElementById('input-modelo').value, anio: document.getElementById('input-anio').value };
    if (await crear_vehiculo(n)) { modales.vehiculo.hide(); f_v.reset(); cargar_pantalla(); }
});

const f_u = document.getElementById('formulario-uso');
if(f_u) f_u.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = { 
        id_vehiculo: document.getElementById('uso-id-vehiculo').value, 
        id_usuario: document.getElementById('uso-id-usuario').value, 
        proposito: document.getElementById('uso-proposito').value, 
        kilometraje_salida: document.getElementById('uso-kilometraje').value,
        rol: usuarioLogueado.rol 
    };
    const respuesta = await registrar_salida(d);
    if (respuesta) { 
        modales.uso.hide(); f_u.reset(); 
        alert(respuesta.estado === 'pendiente' ? '¡Solicitud enviada! Esperando aprobación del Admin.' : '¡Salida Autorizada!');
        cargar_pantalla(); 
    }
});

const f_r = document.getElementById('formulario-retorno');
if(f_r) f_r.addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch(`/api/usos/${document.getElementById('retorno-id-vehiculo').value}/retorno`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kilometraje_retorno: document.getElementById('retorno-kilometraje').value })
    });
    modales.retorno.hide(); f_r.reset(); cargar_pantalla();
});

const f_e = document.getElementById('formulario-evento');
if(f_e) f_e.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = { 
        id_vehiculo: document.getElementById('evento-id-vehiculo').value, 
        tipo_evento: document.getElementById('evento-tipo').value, 
        descripcion: document.getElementById('evento-descripcion').value, 
        // ¡NUEVO: CAPTURAMOS LA CAUSA RAÍZ AQUÍ!
        causa_raiz: document.getElementById('evento-causa').value, 
        costo: document.getElementById('evento-costo').value || 0 
    };
    if (await registrar_evento(d)) { modales.evento.hide(); f_e.reset(); cargar_pantalla(); }
});

cargar_pantalla();