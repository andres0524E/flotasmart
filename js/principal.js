'use strict';

const API_URL = 'https://flotasmart-backend.onrender.com';
let vehiculosGlobal = [];
let gasDataGlobal = [];
let evtDataGlobal = [];
let filtroActivo = 'todos';
let solicitudesGlobal = [];
let solicitudSeleccionada = null;

function verificarSesion() {
    const raw = localStorage.getItem('usuarioFlota');
    if (!raw) return null;
    try {
        const usr = JSON.parse(raw);
        const OCHO_HORAS = 8 * 60 * 60 * 1000;
        if (!usr._ts || (Date.now() - usr._ts) > OCHO_HORAS) {
            localStorage.removeItem('usuarioFlota');
            window.location.href = 'login.html';
            return null;
        }
        if (!usr.id_usuario || !usr.rol) {
            localStorage.removeItem('usuarioFlota');
            window.location.href = 'login.html';
            return null;
        }
        return usr;
    } catch (e) {
        localStorage.removeItem('usuarioFlota');
        window.location.href = 'login.html';
        return null;
    }
}

function sanitizar(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>'"]/g, '').trim().slice(0, 500);
}

async function apiFetch(url, opts = {}) {
    try {
        const res = await fetch(API_URL + url, opts);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('API Error:', url, e);
        return null;
    }
}

function claseEstado(estado) {
    const e = (estado || '').toLowerCase();
    if (e === 'activo') return 'activo';
    if (e.includes('mantenimiento') || e === 'taller') return 'taller';
    if (e.includes('ruta')) return 'ruta';
    if (e === 'bloqueado') return 'bloqueado';
    return 'otro';
}

function badgeHTML(estado) {
    const cls = claseEstado(estado);
    return `<span class="v-badge badge-${cls}">${sanitizar(estado)}</span>`;
}

function alertasVehiculo(auto) {
    let html = '';
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    if (auto.fecha_seguro) {
        const venc = new Date(auto.fecha_seguro);
        venc.setHours(0,0,0,0);
        const dias = Math.round((venc - hoy) / 86400000);
        if (dias <= 15 && dias >= 0) {
            html += `<div class="alerta-seguro-banner"><i class="fa-solid fa-triangle-exclamation"></i> Seguro vence en ${dias} días (${venc.toLocaleDateString()})</div>`;
        } else if (dias < 0) {
            html += `<div class="alerta-seguro-banner"><i class="fa-solid fa-bell-exclamation"></i> Seguro VENCIDO hace ${Math.abs(dias)} días</div>`;
        }
    }
    if (auto.km_proximo_servicio && auto.kilometraje) {
        const falta = auto.km_proximo_servicio - auto.kilometraje;
        if (falta <= 500 && falta >= 0) {
            html += `<div class="alerta-km-banner"><i class="fa-solid fa-triangle-exclamation"></i> Servicio preventivo en ${falta} km</div>`;
        } else if (falta < 0) {
            html += `<div class="alerta-km-banner"><i class="fa-solid fa-bell"></i> Servicio vencido por ${Math.abs(falta)} km</div>`;
        }
    }
    return html;
}

function renderizarVehiculos(vehiculos) {
    const contenedor = document.getElementById('contenedor-vehiculos');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const usuario = verificarSesion();
    if (!usuario) return;
    const rol = usuario.rol;
    const esChofer = rol === 'chofer';
    const esMecanico = rol === 'mecanico';

    let lista = vehiculos;
    if (esMecanico) lista = vehiculos.filter(v => claseEstado(v.estado_actual) === 'taller');
    if (filtroActivo !== 'todos') lista = lista.filter(v => claseEstado(v.estado_actual) === filtroActivo);
    const busq = (document.getElementById('buscador-placa')?.value || '').trim().toUpperCase();
    if (busq) lista = lista.filter(v => (v.placa || '').toUpperCase().includes(busq));

    if (lista.length === 0) {
        contenedor.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">
            <div style="font-size:48px;margin-bottom:12px"><i class="fa-solid fa-car-side"></i></div>
            <div style="font-family:'Montserrat',sans-serif;font-size:16px">No hay vehículos que mostrar</div>
        </div>`;
        return;
    }

    lista.forEach((auto, idx) => {
        const cls = claseEstado(auto.estado_actual);
        const nivelGas = auto.nivel_combustible != null ? auto.nivel_combustible : 100;
        const gasColor = nivelGas < 25 ? 'color:var(--danger)' : nivelGas < 50 ? 'color:var(--warn)' : 'color:var(--success)';

        let alertaChip = '';
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        
        if (auto.fecha_seguro) {
            const v = new Date(auto.fecha_seguro); v.setHours(0,0,0,0);
            const d = Math.round((v - hoy) / 86400000);
            if (d <= 15) alertaChip += `<div class="v-alert seguro show"><i class="fa-solid fa-triangle-exclamation"></i> Seguro vence pronto</div>`;
        }
        if (auto.km_proximo_servicio && auto.kilometraje && (auto.km_proximo_servicio - auto.kilometraje) <= 500) {
            alertaChip += `<div class="v-alert servicio show"><i class="fa-solid fa-bell"></i> Servicio próximo</div>`;
        }

        let accionTarjeta = '';
        if (!esChofer) accionTarjeta = `onclick="abrirModalDetalles(${auto.id_vehiculo})"`;

        let botonChofer = '';
        if (esChofer && cls === 'activo') {
            botonChofer = `<div class="v-chofer-actions">
                <button class="btn-fs btn-fs-success" onclick="abrirModalUso(${auto.id_vehiculo})"><i class="fa-solid fa-key"></i> Solicitar Unidad</button>
                <button class="btn-fs btn-fs-dark" onclick="abrirModalGasolina(${auto.id_vehiculo})"><i class="fa-solid fa-gas-pump"></i> Cargar Combustible</button>
            </div>`;
        } else if (esChofer && cls === 'ruta') {
            botonChofer = `<div class="v-chofer-actions"><button class="btn-fs btn-fs-info" onclick="abrirModalRetorno(${auto.id_vehiculo})"><i class="fa-solid fa-location-dot"></i> Registrar Retorno</button></div>`;
        } else if (esChofer && cls === 'taller') {
            botonChofer = `<div class="v-chofer-actions"><button class="btn-fs btn-fs-warn" disabled><i class="fa-solid fa-wrench"></i> En Taller</button></div>`;
        } else if (esChofer && cls === 'bloqueado') {
            botonChofer = `<div class="v-chofer-actions"><button class="btn-fs btn-fs-danger" disabled><i class="fa-solid fa-lock"></i> Bloqueado por Admin</button></div>`;
        }

        let botonMecanico = '';
        if (esMecanico && cls === 'taller') {
            botonMecanico = `<div class="v-chofer-actions"><button class="btn-fs btn-fs-warn" onclick="abrirModalLiberar(${auto.id_vehiculo})"><i class="fa-solid fa-check"></i> Liberar del Taller</button></div>`;
        }

        contenedor.innerHTML += `
        <div class="v-card estado-${cls}" ${accionTarjeta} style="animation-delay:${idx * 60}ms">
            <div class="v-card-top">
                <div>
                    <div class="v-marca">${sanitizar(auto.marca)} ${sanitizar(auto.modelo)}</div>
                    <div class="v-anio">Año ${sanitizar(String(auto.anio))}</div>
                </div>
                ${badgeHTML(auto.estado_actual)}
            </div>
            <div class="v-placa">${sanitizar(auto.placa)}</div>
            <div class="v-stats">
                <div class="v-stat"><div class="v-stat-val">${(auto.kilometraje || 0).toLocaleString()}</div><div class="v-stat-lbl">Kilómetros</div></div>
                <div class="v-stat"><div class="v-stat-val" style="${gasColor}">${nivelGas}%</div><div class="v-stat-lbl">Combustible</div></div>
            </div>
            ${alertaChip}
            ${botonChofer}
            ${botonMecanico}
            ${(!esChofer && !esMecanico) ? `<p style="text-align:center;color:var(--muted);font-size:11px;margin:16px 0 0"><i class="fa-solid fa-arrow-pointer"></i> Clic para ver opciones</p>` : ''}
        </div>`;
    });
}

function filtrarVehiculos(filtro, btn) {
    filtroActivo = filtro;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderizarVehiculos(vehiculosGlobal);
}

function buscarPorPlaca(val) { renderizarVehiculos(vehiculosGlobal); }

function cambiarTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('tab-' + tab)?.classList.add('active');

    if (tab === 'dashboard') actualizarDashboard(vehiculosGlobal);
    if (tab === 'financiero') cargarFinanciero();
}

function abrirModalDetalles(id) {
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    if (!auto) return;

    const usuario = verificarSesion();
    if (!usuario) return;
    const esAdmin = usuario.rol === 'admin';

    document.getElementById('detalles-titulo').textContent = `${sanitizar(auto.marca)} ${sanitizar(auto.modelo)}`;
    document.getElementById('detalles-placa').textContent = sanitizar(auto.placa);
    document.getElementById('detalles-estado-badge').innerHTML = badgeHTML(auto.estado_actual);

    const nivelGas = auto.nivel_combustible != null ? auto.nivel_combustible : 100;
    const gasColor = nivelGas < 25 ? 'color:var(--danger)' : 'color:var(--success)';
    document.getElementById('detalles-km').textContent = `${(auto.kilometraje || 0).toLocaleString()} km`;
    document.getElementById('detalles-gas').innerHTML = `<span style="${gasColor}">${nivelGas}%</span>
        <button style="background:none;border:none;color:var(--muted);cursor:pointer;margin-left:4px" onclick="editarTanque(${auto.id_vehiculo},${auto.capacidad_tanque})" title="Editar tanque"><i class="fa-solid fa-pen"></i></button>`;

    document.getElementById('detalles-alertas').innerHTML = alertasVehiculo(auto);

    const cls = claseEstado(auto.estado_actual);
    let botonesHTML = '';

    if (cls === 'activo') {
        botonesHTML += `<button class="btn-fs btn-fs-success" onclick="cerrarDetallesYabrir('uso',${id})"><i class="fa-solid fa-key"></i> Registrar Salida</button>`;
        botonesHTML += `<button class="btn-fs btn-fs-dark" onclick="cerrarDetallesYabrir('gasolina',${id})"><i class="fa-solid fa-gas-pump"></i> Cargar Combustible</button>`;
        botonesHTML += `<button class="btn-fs btn-fs-danger" onclick="cerrarDetallesYabrir('evento',${id})"><i class="fa-solid fa-wrench"></i> Reportar Incidencia</button>`;
        if (esAdmin) botonesHTML += `<button class="btn-paro" onclick="activarParoMotor(${id})"><i class="fa-solid fa-power-off"></i> PARO DE MOTOR</button>`;
    } else if (cls === 'taller') {
        botonesHTML += `<button class="btn-fs btn-fs-warn" onclick="abrirModalLiberar(${id});bootstrap.Modal.getInstance(document.getElementById('modal-detalles')).hide()"><i class="fa-solid fa-check"></i> Liberar del Taller</button>`;
    } else if (auto.estado_actual?.toLowerCase() === 'pendiente') {
        botonesHTML += `<button class="btn-fs btn-fs-success" onclick="responderPeticion(${id},'Aprobar')"><i class="fa-solid fa-check"></i> Aprobar Salida</button>`;
        botonesHTML += `<button class="btn-fs btn-fs-danger" onclick="responderPeticion(${id},'Rechazar')"><i class="fa-solid fa-xmark"></i> Rechazar</button>`;
    } else if (cls === 'ruta') {
        botonesHTML += `<button class="btn-fs btn-fs-info" onclick="cerrarDetallesYabrir('retorno',${id})"><i class="fa-solid fa-location-dot"></i> Registrar Retorno</button>`;
    } else if (cls === 'bloqueado') {
        botonesHTML += `<button class="btn-desbloquear" onclick="desbloquearVehiculo(${id})"><i class="fa-solid fa-unlock"></i> DESBLOQUEAR UNIDAD</button>`;
    }

    botonesHTML += `<button class="btn-fs btn-fs-dark" onclick="cerrarDetallesYabrir('historial',${id})" style="margin-top:12px;border-top:1px solid var(--border);padding-top:16px"><i class="fa-solid fa-book"></i> Ver Historial Completo</button>`;

    // 🔥 EL NUEVO BOTÓN DEL REPORTE PDF (Solo para Administradores)
    if (esAdmin) {
        botonesHTML += `<button class="btn-fs btn-fs-primary" onclick="generarReportePDF(${id})" style="margin-top:8px"><i class="fa-solid fa-file-pdf"></i> Generar Reporte PDF</button>`;
    }

    document.getElementById('detalles-botones').innerHTML = botonesHTML;
    new bootstrap.Modal(document.getElementById('modal-detalles')).show();
}

function cerrarDetallesYabrir(tipo, id) {
    const inst = bootstrap.Modal.getInstance(document.getElementById('modal-detalles'));
    inst?.hide();
    setTimeout(() => {
        if (tipo === 'uso') abrirModalUso(id);
        if (tipo === 'gasolina') abrirModalGasolina(id);
        if (tipo === 'evento') abrirModalEvento(id);
        if (tipo === 'historial') abrirModalHistorial(id);
        if (tipo === 'retorno') abrirModalRetorno(id);
    }, 350);
}

function abrirModalUso(id) {
    const usr = verificarSesion();
    if (!usr) return;
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    if (!auto) return;

    if (claseEstado(auto.estado_actual) === 'bloqueado') {
        Swal.fire({ icon:'error', title:'Vehículo Bloqueado', text:'Este vehículo fue bloqueado remotamente.', background:'#0e1421', color:'#e8edf5' });
        return;
    }

    document.getElementById('uso-id-vehiculo').value = id;
    document.getElementById('uso-id-usuario').value = usr.id_usuario || 1;
    document.getElementById('uso-gasolina-lectura').value = `${auto.nivel_combustible || 100}%`;
    document.getElementById('uso-km-previo').textContent = auto.kilometraje || 0;
    document.getElementById('uso-kilometraje').value = auto.kilometraje || 0;
    new bootstrap.Modal(document.getElementById('modal-uso')).show();
}

function abrirModalRetorno(id) {
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    if (auto) {
        document.getElementById('retorno-id-vehiculo').value = id;
        document.getElementById('retorno-km-previo').textContent = auto.kilometraje || 0;
        document.getElementById('retorno-km').value = auto.kilometraje || 0;
    }
    new bootstrap.Modal(document.getElementById('modal-retorno')).show();
}

function abrirModalGasolina(id) {
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    if (auto) {
        document.getElementById('gasolina-id-vehiculo').value = id;
        document.getElementById('gasolina-km-previo').textContent = auto.kilometraje || 0;
        document.getElementById('gasolina-km').value = auto.kilometraje || 0;
    }
    new bootstrap.Modal(document.getElementById('modal-gasolina')).show();
}

function abrirModalEvento(id) {
    document.getElementById('evento-id-vehiculo').value = id;
    new bootstrap.Modal(document.getElementById('modal-evento')).show();
}

function abrirModalLiberar(id) {
    document.getElementById('liberar-id-vehiculo').value = id;
    document.getElementById('liberar-descripcion').value = '';
    new bootstrap.Modal(document.getElementById('modal-liberar')).show();
}

async function editarTanque(id, actual) {
    const { value: cap } = await Swal.fire({
        title: 'Capacidad del Tanque',
        input: 'number', inputLabel: 'Litros totales', inputValue: actual || 50,
        showCancelButton: true, confirmButtonText: 'Guardar',
        background: '#0e1421', color: '#e8edf5'
    });
    if (cap) {
        await apiFetch(`/api/vehiculos/${id}/tanque`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ capacidad: cap }) });
        Swal.fire({ icon:'success', title:'Actualizado', background:'#0e1421', color:'#e8edf5' }).then(() => cargarVehiculos());
    }
}

async function activarParoMotor(id) {
    const { isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: 'Activar Paro de Motor',
        html: `<p style="color:#aaa">Este vehículo será <strong style="color:#ff4757">BLOQUEADO</strong>.</p>`,
        showCancelButton: true, confirmButtonText: 'Bloquear Ahora', confirmButtonColor: '#ff4757',
        background: '#0e1421', color: '#e8edf5'
    });
    if (isConfirmed) {
        const r = await apiFetch(`/api/vehiculos/${id}/bloquear`, { method: 'PUT' });
        if (r) {
            bootstrap.Modal.getInstance(document.getElementById('modal-detalles'))?.hide();
            Swal.fire({ icon:'success', title:'Vehículo Bloqueado', background:'#0e1421', color:'#e8edf5' }).then(() => cargarVehiculos());
        } else {
            await apiFetch(`/api/vehiculos/${id}/mantenimiento`, { method: 'PUT' });
            bootstrap.Modal.getInstance(document.getElementById('modal-detalles'))?.hide();
            Swal.fire({ icon:'success', title:'Motor Bloqueado (simulado)', background:'#0e1421', color:'#e8edf5' }).then(() => cargarVehiculos());
        }
    }
}

async function desbloquearVehiculo(id) {
    const { isConfirmed } = await Swal.fire({
        icon: 'question', title: '¿Desbloquear vehículo?',
        showCancelButton: true, confirmButtonText: 'Sí, desbloquear',
        background: '#0e1421', color: '#e8edf5'
    });
    if (isConfirmed) {
        await apiFetch(`/api/vehiculos/${id}/liberar`, { method: 'PUT' });
        bootstrap.Modal.getInstance(document.getElementById('modal-detalles'))?.hide();
        Swal.fire({ icon:'success', title:'Vehículo Desbloqueado', background:'#0e1421', color:'#e8edf5' }).then(() => cargarVehiculos());
    }
}

async function responderPeticion(id, accion) {
    const { isConfirmed } = await Swal.fire({
        icon: 'warning', title: `¿${accion} solicitud?`,
        showCancelButton: true, confirmButtonText: `Sí, ${accion}`,
        background: '#0e1421', color: '#e8edf5'
    });
    if (isConfirmed) {
        const endpoint = accion === 'Rechazar' ? `/api/vehiculos/${id}/liberar` : `/api/vehiculos/${id}/ruta`;
        await apiFetch(endpoint, { method: 'PUT' });
        bootstrap.Modal.getInstance(document.getElementById('modal-detalles'))?.hide();
        cargarVehiculos();
    }
}

async function abrirModalHistorial(id) {
    new bootstrap.Modal(document.getElementById('modal-historial')).show();
    const contenido = document.getElementById('historial-contenido');
    contenido.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px"><i class="fa-solid fa-circle-notch fa-spin"></i> Cargando historial...</p>';

    const historial = await apiFetch(`/api/historial/${id}`);
    if (!historial || historial.length === 0) {
        contenido.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px">Sin registros aún.</p>';
        return;
    }

    let html = '';
    historial.forEach(item => {
        const fecha = item.fecha ? new Date(item.fecha).toLocaleDateString('es-MX') : '—';
        const act = sanitizar(item.actividad || 'Registro');
        const det = sanitizar(item.detalles || '—');
        const actLC = act.toLowerCase();
        const badgeCls = actLC.includes('falla') ? 'background:rgba(255,71,87,0.15);color:#ff6b7a' :
                         actLC.includes('gasolina') ? 'background:rgba(255,77,77,0.1);color:var(--accent)' :
                         actLC.includes('uso') || actLC.includes('salida') ? 'background:rgba(0,230,118,0.1);color:var(--success)' :
                         actLC.includes('taller') || actLC.includes('mantenimiento') ? 'background:rgba(255,190,33,0.1);color:var(--warn)' :
                         'background:rgba(255,255,255,0.06);color:var(--muted)';
        const empleado = item.nombre_empleado ? 
            `<div style="font-size:10px;color:var(--muted);margin-top:4px;display:flex;align-items:center;gap:4px">
                <i class="fa-solid fa-user-circle" style="font-size:9px"></i>
                <span>${sanitizar(item.nombre_empleado)}</span>
                <span style="color:rgba(255,255,255,0.2)">·</span>
                <span>${sanitizar(item.correo_empleado || '')}</span>
             </div>` : '';
        html += `<div class="hist-row">
            <div class="hist-date">${fecha}</div>
            <div class="hist-detail">${det}${empleado}</div>
            <span class="hist-badge" style="${badgeCls}">${act}</span>
        </div>`;
    });
    contenido.innerHTML = html;
}

async function actualizarDashboard(vehiculos) {
    const total = vehiculos.length;
    const activos = vehiculos.filter(v => claseEstado(v.estado_actual) === 'activo').length;
    const taller = vehiculos.filter(v => claseEstado(v.estado_actual) === 'taller').length;
    const bloqueados = vehiculos.filter(v => claseEstado(v.estado_actual) === 'bloqueado').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-activos').textContent = activos;
    document.getElementById('stat-taller').textContent = taller;
    document.getElementById('stat-bloqueados').textContent = bloqueados;

    const ctx = document.getElementById('graficaFlota');
    if (ctx) {
        const viejo = Chart.getChart(ctx);
        if (viejo) viejo.destroy();
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Activos', 'En Taller', 'En Ruta', 'Bloqueados'],
                datasets: [{
                    data: [activos, taller, vehiculos.filter(v => claseEstado(v.estado_actual) === 'ruta').length, bloqueados],
                    backgroundColor: ['#00e676', '#ffbe21', '#7c83ff', '#ff6b35'],
                    borderWidth: 0, hoverOffset: 8
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '68%',
                plugins: { legend: { labels: { color: '#5a6a80', font: { size: 12 } } } }
            }
        });
    }

    const ranking = document.getElementById('contenedor-ranking');
    if (!ranking) return;
    const eventos = await apiFetch('/api/eventos');
    if (!eventos) { ranking.innerHTML = '<p style="color:var(--muted);text-align:center">Datos no disponibles.</p>'; return; }

    const conteo = {};
    eventos.forEach(ev => conteo[ev.id_vehiculo] = (conteo[ev.id_vehiculo] || 0) + 1);
    const topFallas = Object.keys(conteo).map(id => {
        const auto = vehiculos.find(v => v.id_vehiculo == id);
        return { nombre: auto ? `${auto.marca} ${auto.modelo}` : `Unidad #${id}`, placa: auto?.placa || '', fallas: conteo[id] };
    }).sort((a, b) => b.fallas - a.fallas).slice(0, 5);

    if (topFallas.length === 0) {
        ranking.innerHTML = '<p style="color:var(--muted);text-align:center;margin-top:40px">Sin incidencias registradas.</p>';
        return;
    }
    ranking.innerHTML = topFallas.map((item, i) => `
        <div class="rank-item">
            <div style="display:flex;align-items:center;gap:12px">
                <span class="rank-num">${i+1}</span>
                <div><div class="rank-name">${sanitizar(item.nombre)}</div><div style="color:var(--muted);font-size:11px">${sanitizar(item.placa)}</div></div>
            </div>
            <span class="rank-badge">${item.fallas} fallas</span>
        </div>`).join('');
}

async function cargarFinanciero() {
    gasDataGlobal = await apiFetch('/api/gasolina').catch(() => []);
    evtDataGlobal = await apiFetch('/api/eventos').catch(() => []);

    let totalPagado = 0, totalPendiente = 0, totalHistorico = 0;

    const gasxVeh = {};
    const repxVeh = {};

    if (gasDataGlobal && Array.isArray(gasDataGlobal)) {
        gasDataGlobal.forEach(r => {
            const costo = parseFloat(r.costo_total || 0);
            totalHistorico += costo;
            
            if (!gasxVeh[r.id_vehiculo]) gasxVeh[r.id_vehiculo] = { pagado: 0, pendiente: 0 };
            
            if (r.estado_pago === 'Pagado') {
                totalPagado += costo;
                gasxVeh[r.id_vehiculo].pagado += costo;
            } else {
                totalPendiente += costo;
                gasxVeh[r.id_vehiculo].pendiente += costo;
            }
        });
    }

    if (evtDataGlobal && Array.isArray(evtDataGlobal)) {
        evtDataGlobal.forEach(r => { 
            const costo = parseFloat(r.costo || 0);
            totalHistorico += costo;

            if (!repxVeh[r.id_vehiculo]) repxVeh[r.id_vehiculo] = { pagado: 0, pendiente: 0 };

            if (r.estado_pago === 'Pagado') {
                totalPagado += costo;
                repxVeh[r.id_vehiculo].pagado += costo;
            } else {
                totalPendiente += costo;
                repxVeh[r.id_vehiculo].pendiente += costo;
            }
        });
    }

    const fmt = (n) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    document.getElementById('fin-historico').textContent = fmt(totalHistorico);
    document.getElementById('fin-pagado').textContent = fmt(totalPagado);
    document.getElementById('fin-pendiente').textContent = fmt(totalPendiente);

    const tablaDiv = document.getElementById('fin-detalle-tabla');
    if (!vehiculosGlobal.length) { tablaDiv.innerHTML = '<p style="color:var(--muted);text-align:center">Sin datos.</p>'; return; }

    const todos = [...new Set([...Object.keys(gasxVeh), ...Object.keys(repxVeh)])];
    if (todos.length === 0) { tablaDiv.innerHTML = '<p style="color:var(--muted);text-align:center">Sin movimientos financieros aún.</p>'; return; }

    let rows = todos.map(id => {
        const auto = vehiculosGlobal.find(v => v.id_vehiculo == id);
        const g = gasxVeh[id] || {pagado:0, pendiente:0};
        const rep = repxVeh[id] || {pagado:0, pendiente:0};
        return { 
            id_vehiculo: id,
            nombre: auto ? `${auto.marca} ${auto.modelo}` : `#${id}`, 
            placa: auto?.placa || '—', 
            pagado: g.pagado + rep.pagado, 
            pendiente: g.pendiente + rep.pendiente 
        };
    }).sort((a, b) => b.pendiente - a.pendiente);

    tablaDiv.innerHTML = `
    <table class="fin-table">
        <thead><tr>
            <th>Vehículo</th><th>Placa</th>
            <th style="text-align:right">Total Pagado</th>
            <th style="text-align:right;color:var(--danger)">Deuda Pendiente</th>
            <th style="text-align:center">Acciones</th>
        </tr></thead>
        <tbody>
        ${rows.map(r => `<tr>
            <td><strong>${sanitizar(r.nombre)}</strong></td>
            <td style="color:var(--muted);font-size:12px">${sanitizar(r.placa)}</td>
            <td style="text-align:right;color:var(--success);font-weight:600">${fmt(r.pagado)}</td>
            <td style="text-align:right;color:var(--danger);font-weight:600">${fmt(r.pendiente)}</td>
            <td style="text-align:center">
                <button class="btn-fs btn-small btn-fs-primary" onclick="abrirModalDeudas(${r.id_vehiculo})">Ver Cuentas</button>
            </td>
        </tr>`).join('')}
        </tbody>
    </table>`;
}

// ─── FUNCIÓN PAGOS INDIVIDUALES ───
window.abrirModalDeudas = function(id_vehiculo) {
    const auto = vehiculosGlobal.find(v => v.id_vehiculo == id_vehiculo);
    const deudasGas = gasDataGlobal.filter(g => g.id_vehiculo == id_vehiculo && g.estado_pago !== 'Pagado');
    const deudasRep = evtDataGlobal.filter(e => e.id_vehiculo == id_vehiculo && e.estado_pago !== 'Pagado' && parseFloat(e.costo) > 0);

    let html = `<h6 style="color:var(--muted);margin-bottom:16px">Unidad: ${sanitizar(auto?.placa)}</h6>`;

    if (deudasGas.length === 0 && deudasRep.length === 0) {
        html += `<p style="text-align:center;color:var(--success);margin-top:20px;font-weight:600"><i class="fa-solid fa-circle-check"></i> Sin cuentas pendientes por pagar.</p>`;
    } else {
        deudasGas.forEach(g => {
            html += `<div class="rank-item" style="gap:12px; align-items:center">
                <div>
                    <div class="rank-name"><i class="fa-solid fa-gas-pump" style="color:var(--accent)"></i> Carga de Gasolina</div>
                    <div style="color:var(--muted);font-size:11px">${new Date(g.fecha).toLocaleDateString()} - ${g.litros} Litros</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="color:var(--danger);font-weight:700">$${parseFloat(g.costo_total).toLocaleString('es-MX')}</span>
                    <button class="btn-fs btn-small btn-fs-success" style="margin:0" onclick="pagarDeuda('gasolina', ${g.id_gasolina})"><i class="fa-solid fa-check"></i> Saldar</button>
                </div>
            </div>`;
        });
        deudasRep.forEach(e => {
            html += `<div class="rank-item" style="gap:12px; align-items:center">
                <div>
                    <div class="rank-name"><i class="fa-solid fa-wrench" style="color:var(--warn)"></i> ${sanitizar(e.tipo_evento)}</div>
                    <div style="color:var(--muted);font-size:11px">${new Date(e.fecha_evento).toLocaleDateString()}</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="color:var(--danger);font-weight:700">$${parseFloat(e.costo).toLocaleString('es-MX')}</span>
                    <button class="btn-fs btn-small btn-fs-success" style="margin:0" onclick="pagarDeuda('eventos', ${e.id_evento})"><i class="fa-solid fa-check"></i> Saldar</button>
                </div>
            </div>`;
        });
    }
    document.getElementById('lista-deudas').innerHTML = html;
    new bootstrap.Modal(document.getElementById('modal-deudas')).show();
}

window.pagarDeuda = async function(tipo, id) {
    const { isConfirmed } = await Swal.fire({
        title: '¿Saldar esta cuenta?',
        text: "Se marcará como Pagado.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, pagar',
        background: '#0e1421', color: '#e8edf5'
    });
    if (isConfirmed) {
        await apiFetch(`/api/${tipo}/${id}/pagar`, { method: 'PUT' });
        bootstrap.Modal.getInstance(document.getElementById('modal-deudas'))?.hide();
        Swal.fire({ icon:'success', title:'Cuenta saldada', background:'#0e1421', color:'#e8edf5', timer:1500 });
        cargarFinanciero();
    }
}

// ─── FUNCIÓN REPORTE PDF (NUEVO) ───
window.generarReportePDF = async function(id) {
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    if (!auto) return;

    Swal.fire({ title: 'Generando documento...', text: 'Recopilando datos de la unidad', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }, background: '#0e1421', color: '#e8edf5' });

    const historial = await apiFetch(`/api/historial/${id}`) || [];
    const gasolina = await apiFetch('/api/gasolina') || [];
    const eventos = await apiFetch('/api/eventos') || [];

    const gasAuto = gasolina.filter(g => g.id_vehiculo === id);
    const evtAuto = eventos.filter(e => e.id_vehiculo === id);

    let totalGastoGas = 0; gasAuto.forEach(g => totalGastoGas += parseFloat(g.costo_total));
    let totalGastoRep = 0; evtAuto.forEach(e => totalGastoRep += parseFloat(e.costo));

    const fechaReporte = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const fmt = (n) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    let htmlHistorial = '';
    if(historial.length === 0) {
        htmlHistorial = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">No hay registros operativos para esta unidad.</td></tr>`;
    } else {
        historial.forEach(h => {
            const empleadoPDF = h.nombre_empleado ? `${h.nombre_empleado}<br><span style="color:#999;font-size:10px">${h.correo_empleado || ''}</span>` : '<span style="color:#aaa">—</span>';
            htmlHistorial += `
                <tr>
                    <td style="padding:10px; border-bottom:1px solid #ddd; font-size:12px;">${new Date(h.fecha).toLocaleDateString()}</td>
                    <td style="padding:10px; border-bottom:1px solid #ddd; font-size:12px; font-weight:bold;">${sanitizar(h.actividad)}</td>
                    <td style="padding:10px; border-bottom:1px solid #ddd; font-size:12px;">${sanitizar(h.detalles)}</td>
                    <td style="padding:10px; border-bottom:1px solid #ddd; font-size:12px;">${empleadoPDF}</td>
                </tr>
            `;
        });
    }

    const contenidoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte_Unidad_${auto.placa}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; margin: 0; }
                .header { text-align: center; border-bottom: 3px solid #cc0000; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { margin: 0; color: #cc0000; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
                .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
                .grid-info { display: table; width: 100%; margin-bottom: 30px; }
                .col { display: table-cell; width: 50%; vertical-align: top; padding: 15px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eee; }
                .col-spacer { display: table-cell; width: 2%; }
                h3 { font-size: 16px; color: #111; border-bottom: 2px solid #ccc; padding-bottom: 5px; margin-top: 0; }
                p { margin: 8px 0; font-size: 13px; }
                strong { color: #000; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #cc0000; color: white; text-align: left; padding: 12px 10px; font-size: 13px; text-transform: uppercase; }
                .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Reporte Oficial de Unidad</h1>
                <p>Sistema de Gestión FlotaSmart - Generado el ${fechaReporte}</p>
            </div>
            <div class="grid-info">
                <div class="col">
                    <h3>Ficha Técnica</h3>
                    <p><strong>Vehículo:</strong> ${sanitizar(auto.marca)} ${sanitizar(auto.modelo)}</p>
                    <p><strong>Placa:</strong> ${sanitizar(auto.placa)}</p>
                    <p><strong>Año:</strong> ${auto.anio}</p>
                    <p><strong>Estado Actual:</strong> ${sanitizar(auto.estado_actual).toUpperCase()}</p>
                    <p><strong>Kilometraje Actual:</strong> ${(auto.kilometraje || 0).toLocaleString()} km</p>
                </div>
                <div class="col-spacer"></div>
                <div class="col">
                    <h3>Resumen Financiero</h3>
                    <p><strong>Gasto en Combustible:</strong> ${fmt(totalGastoGas)}</p>
                    <p><strong>Costo de Reparaciones:</strong> ${fmt(totalGastoRep)}</p>
                    <p><strong>Inversión Total en Unidad:</strong> <span style="color:#cc0000; font-weight:bold; font-size:15px;">${fmt(totalGastoGas + totalGastoRep)}</span></p>
                    <p><strong>Vencimiento de Seguro:</strong> ${auto.fecha_seguro ? new Date(auto.fecha_seguro).toLocaleDateString() : 'No registrado'}</p>
                </div>
            </div>
            <h3>Historial de Uso y Eventos</h3>
            <table>
                <thead>
                    <tr><th style="width:15%">Fecha</th><th style="width:25%">Tipo de Actividad</th><th style="width:35%">Detalles / Causa Raíz</th><th style="width:25%">Registrado por</th></tr>
                </thead>
                <tbody>${htmlHistorial}</tbody>
            </table>
            <div class="footer">Este documento es de uso interno y confidencial. Avalado por el sistema FlotaSmart.</div>
        </body>
        </html>
    `;

    Swal.close();
    const ventanaImpresion = window.open('', '_blank', 'width=900,height=700');
    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    setTimeout(() => { ventanaImpresion.print(); }, 500);
}

async function cargarVehiculos() {
    const data = await apiFetch('/api/vehiculos');
    if (data) {
        vehiculosGlobal = data;
        renderizarVehiculos(vehiculosGlobal);
        actualizarDashboard(vehiculosGlobal);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const usuario = verificarSesion();
    if (!usuario) return;

    document.getElementById('nav-nombre').textContent = `${usuario.nombre || 'Usuario'}`;
    document.getElementById('nav-rol').textContent = usuario.rol?.toUpperCase() || '—';

    const esChofer = usuario.rol === 'chofer';
    const esMecanico = usuario.rol === 'mecanico';
    const esAdmin = usuario.rol === 'admin';

    if (!esAdmin) document.getElementById('btn-registrar-unidad').style.display = 'none';

    // Campanita de notificaciones: solo admin
    if (esAdmin) {
        const btnCampana = document.getElementById('btn-campanita');
        if (btnCampana) btnCampana.style.display = 'flex';
        cargarConteoNotificaciones();
        // Refresca el conteo cada 60 segundos
        setInterval(cargarConteoNotificaciones, 60000);
    }

    if (esMecanico) {
        document.getElementById('banner-mecanico').style.display = 'flex';
        document.getElementById('tab-financiero').style.display = 'none';
        document.getElementById('tab-dashboard').style.display = 'none';
    }

    if (esChofer) {
        document.getElementById('tab-financiero').style.display = 'none';
        document.getElementById('tab-dashboard').style.display = 'none';
    }

    cargarVehiculos();

    document.getElementById('formulario-vehiculo')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const placa = sanitizar(document.getElementById('input-placa').value);
        const marca = sanitizar(document.getElementById('input-marca').value);
        const modelo = sanitizar(document.getElementById('input-modelo').value);
        const anio = parseInt(document.getElementById('input-anio').value);
        const tanque = parseFloat(document.getElementById('input-tanque').value);
        const kmServicio = document.getElementById('input-km-servicio').value;
        const fechaSeguro = document.getElementById('input-fecha-seguro').value;

        if (!placa || !marca || !modelo || anio < 1990 || tanque < 1) {
            Swal.fire({ icon:'error', title:'Datos inválidos', ...SWAL_DARK }); return;
        }

        const r = await apiFetch('/api/vehiculos', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ placa, marca, modelo, anio, capacidad_tanque: tanque,
                km_proximo_servicio: kmServicio || null,
                fecha_seguro: fechaSeguro || null }) 
        });
        if (r) {
            bootstrap.Modal.getInstance(document.getElementById('modal-vehiculo'))?.hide();
            Swal.fire({ icon:'success', title:'Vehículo registrado', ...SWAL_DARK }).then(() => cargarVehiculos());
        } else {
            Swal.fire({ icon:'error', title:'Error al guardar', ...SWAL_DARK });
        }
    });

    document.getElementById('formulario-retorno')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('retorno-id-vehiculo').value;
        const km = parseFloat(document.getElementById('retorno-km').value);
        const gas = parseInt(document.getElementById('retorno-gas').value);
        const auto = vehiculosGlobal.find(v => v.id_vehiculo == id);
        if (auto && km < (auto.kilometraje || 0)) {
            Swal.fire({ icon:'warning', title:'Kilometraje inválido', text:'No puede ser menor al de salida.', ...SWAL_DARK }); return;
        }
        const r = await apiFetch(`/api/vehiculos/${id}/retorno`, {
            method: 'PUT', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ kilometraje: km, nivel_combustible: gas })
        });
        if (r !== null) {
            bootstrap.Modal.getInstance(document.getElementById('modal-retorno'))?.hide();
            Swal.fire({ icon:'success', title:'¡Retorno registrado!', ...SWAL_DARK }).then(() => cargarVehiculos());
        }
    });

    document.getElementById('formulario-uso')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('uso-id-vehiculo').value;
        const idUsr = document.getElementById('uso-id-usuario').value;
        const prop = document.getElementById('uso-proposito').value;
        const km = parseFloat(document.getElementById('uso-kilometraje').value);
        const r = await apiFetch('/api/usos', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id_vehiculo: id, id_usuario: idUsr, proposito: prop, kilometraje_salida: km })
        });
        if (r !== null) {
            bootstrap.Modal.getInstance(document.getElementById('modal-uso'))?.hide();
            Swal.fire({ icon:'success', title:'¡Petición enviada!', text:'El administrador debe aprobarla.', ...SWAL_DARK }).then(() => cargarVehiculos());
        }
    });

    document.getElementById('formulario-gasolina')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('gasolina-id-vehiculo').value;
        const litros = parseFloat(document.getElementById('gasolina-litros').value);
        const costo = parseFloat(document.getElementById('gasolina-costo').value);
        const km = parseFloat(document.getElementById('gasolina-km').value);
        if (litros <= 0 || costo < 0) { Swal.fire({ icon:'error', title:'Datos inválidos', ...SWAL_DARK }); return; }
        const r = await apiFetch('/api/gasolina', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id_vehiculo: id, litros, costo_total: costo, kilometraje: km, id_usuario: usuario.id_usuario })
        });
        if (r !== null) {
            bootstrap.Modal.getInstance(document.getElementById('modal-gasolina'))?.hide();
            Swal.fire({ icon:'success', title:'¡Combustible registrado como deuda!', ...SWAL_DARK }).then(() => cargarVehiculos());
        }
    });

    document.getElementById('formulario-evento')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('evento-id-vehiculo').value;
        const tipo = document.getElementById('evento-tipo').value;
        const causa = document.getElementById('evento-causa').value;
        const desc = sanitizar(document.getElementById('evento-descripcion').value);
        const costo = parseFloat(document.getElementById('evento-costo').value) || 0;
        if (!desc) { Swal.fire({ icon:'warning', title:'Ingresa una descripción', ...SWAL_DARK }); return; }
        
        const resEvento = await apiFetch('/api/eventos', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id_vehiculo: id, tipo_evento: tipo, descripcion: causa + ' — ' + desc, costo, id_usuario: usuario.id_usuario })
        });
        
        if (resEvento !== null) {
            await apiFetch(`/api/vehiculos/${id}/mantenimiento`, { method: 'PUT' });
            bootstrap.Modal.getInstance(document.getElementById('modal-evento'))?.hide();
            Swal.fire({ icon:'success', title:'¡Reportado!', text:'Unidad enviada al taller.', ...SWAL_DARK }).then(() => cargarVehiculos());
        } else {
             Swal.fire({ icon:'error', title:'Error en el servidor', ...SWAL_DARK });
        }
    });

    document.getElementById('formulario-liberar')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('liberar-id-vehiculo').value;
        const desc = sanitizar(document.getElementById('liberar-descripcion').value);
        if (!desc) { Swal.fire({ icon:'warning', title:'Describe la intervención', ...SWAL_DARK }); return; }

        await apiFetch('/api/eventos', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id_vehiculo: id, tipo_evento: 'Mantenimiento Completado', descripcion: desc, costo: 0, id_usuario: usuario.id_usuario })
        });
        await apiFetch(`/api/vehiculos/${id}/liberar`, { method: 'PUT' });
        bootstrap.Modal.getInstance(document.getElementById('modal-liberar'))?.hide();
        Swal.fire({ icon:'success', title:'Unidad Liberada', text:'El vehículo vuelve a estar activo.', ...SWAL_DARK }).then(() => cargarVehiculos());
    });
});
// ═══════════════════════════════════════════════
// SISTEMA DE NOTIFICACIONES — SOLICITUDES DE REGISTRO
// ═══════════════════════════════════════════════

async function cargarConteoNotificaciones() {
    const data = await apiFetch('/api/registro/conteo');
    if (!data) return;
    const total = data.total || 0;
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.textContent = total > 9 ? '9+' : total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

async function abrirBandeja() {
    const usuario = verificarSesion();
    if (!usuario || usuario.rol !== 'admin') return;

    const modal = new bootstrap.Modal(document.getElementById('modal-bandeja'));
    modal.show();

    const lista = document.getElementById('inbox-lista');
    lista.innerHTML = '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';

    const datos = await apiFetch('/api/registro/pendientes');
    solicitudesGlobal = datos || [];

    if (solicitudesGlobal.length === 0) {
        lista.innerHTML = `<div style="color:var(--muted);font-size:12px;text-align:center;padding:30px 0">
            <i class="fa-solid fa-inbox" style="font-size:28px;display:block;margin-bottom:8px;opacity:.4"></i>
            Sin solicitudes pendientes
        </div>`;
        document.getElementById('inbox-detalle').innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:var(--muted);gap:12px">
            <i class="fa-solid fa-circle-check" style="font-size:32px;opacity:.3;color:var(--success)"></i>
            <span style="font-size:13px">Todo al día</span>
        </div>`;
        return;
    }

    lista.innerHTML = solicitudesGlobal.map((s, i) => {
        const fecha = new Date(s.fecha_solicitud).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        return `<div class="inbox-item" id="inbox-item-${s.id_solicitud}" onclick="verSolicitud(${s.id_solicitud})">
            <div class="inbox-from"><i class="fa-solid fa-user-clock" style="color:var(--accent);margin-right:6px;font-size:11px"></i>${sanitizar(s.nombre)}</div>
            <div class="inbox-meta">${sanitizar(s.departamento)} · ${fecha}</div>
            <span class="inbox-rol-chip">${sanitizar(s.rol_solicitado)}</span>
        </div>`;
    }).join('');

    // Auto-seleccionar la primera
    if (solicitudesGlobal.length > 0) verSolicitud(solicitudesGlobal[0].id_solicitud);
}

window.verSolicitud = function(id) {
    const s = solicitudesGlobal.find(x => x.id_solicitud === id);
    if (!s) return;
    solicitudSeleccionada = s;

    document.querySelectorAll('.inbox-item').forEach(el => el.classList.remove('selected'));
    document.getElementById(`inbox-item-${id}`)?.classList.add('selected');

    const fecha = new Date(s.fecha_solicitud).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    const rolColor = s.rol_solicitado === 'chofer' ? '#00e676' : '#ffbe21';
    const rolIcon = s.rol_solicitado === 'chofer' ? '🚗' : '🔧';

    document.getElementById('inbox-detalle').innerHTML = `
        <div class="email-view">
            <div class="email-header">
                <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:16px;margin-bottom:12px">
                    Solicitud de Acceso al Sistema
                </div>
                <div class="email-field"><strong>De:</strong> ${sanitizar(s.nombre)}</div>
                <div class="email-field"><strong>Correo:</strong> <span style="color:var(--accent)">${sanitizar(s.correo)}</span></div>
                <div class="email-field"><strong>Departamento:</strong> ${sanitizar(s.departamento)}</div>
                <div class="email-field"><strong>Fecha:</strong> ${fecha}</div>
                <div class="email-field" style="margin-top:8px">
                    <strong>Rol solicitado:</strong>
                    <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:3px 10px;margin-left:6px;font-weight:700;color:${rolColor}">
                        ${rolIcon} ${sanitizar(s.rol_solicitado).toUpperCase()}
                    </span>
                </div>
            </div>

            <p style="font-size:13px;color:var(--muted);line-height:1.6">
                El empleado <strong style="color:var(--text)">${sanitizar(s.nombre)}</strong> ha solicitado acceso al sistema FlotaSmart con el rol de 
                <strong style="color:${rolColor}">${sanitizar(s.rol_solicitado)}</strong>.
                Puedes aprobar la solicitud con el rol solicitado, asignarle el rol de <strong style="color:var(--accent)">Administrador</strong>, o rechazarla.
            </p>

            <div class="admin-override">
                <div class="admin-override-title"><i class="fa-solid fa-shield-halved" style="margin-right:6px"></i>Asignar Rol de Administrador</div>
                <label class="override-check" id="check-admin-label">
                    <input type="checkbox" id="check-dar-admin" onchange="toggleAdminPass()">
                    <span>Dar acceso de <strong>Administrador</strong> a este usuario</span>
                </label>
                <div id="admin-pass-field" style="display:none">
                    <label style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px">
                        <i class="fa-solid fa-lock" style="margin-right:4px"></i>Confirma con tu contraseña de admin
                    </label>
                    <input type="password" class="fs-input" id="admin-pass-confirm" placeholder="Tu contraseña de administrador" style="max-width:280px">
                </div>
            </div>

            <div class="email-actions">
                <button class="btn-fs btn-fs-success" onclick="procesarSolicitud('aprobar', ${s.id_solicitud})">
                    <i class="fa-solid fa-circle-check"></i> Aprobar Solicitud
                </button>
                <button class="btn-fs btn-fs-danger" onclick="procesarSolicitud('rechazar', ${s.id_solicitud})" style="background:rgba(255,71,87,0.1);color:var(--danger);border:1px solid rgba(255,71,87,0.2)">
                    <i class="fa-solid fa-circle-xmark"></i> Rechazar
                </button>
            </div>
        </div>`;
};

window.toggleAdminPass = function() {
    const check = document.getElementById('check-dar-admin');
    const passField = document.getElementById('admin-pass-field');
    if (passField) passField.style.display = check?.checked ? 'block' : 'none';
};

window.procesarSolicitud = async function(accion, id) {
    const usuario = verificarSesion();
    if (!usuario) return;

    if (accion === 'rechazar') {
        const { isConfirmed } = await Swal.fire({
            title: '¿Rechazar esta solicitud?',
            text: 'El usuario no podrá ingresar al sistema.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, rechazar',
            cancelButtonText: 'Cancelar',
            background: '#0e1421', color: '#e8edf5'
        });
        if (!isConfirmed) return;

        const r = await apiFetch(`/api/registro/${id}/rechazar`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) });
        if (r !== null) {
            Swal.fire({ icon: 'success', title: 'Solicitud rechazada', timer: 1500, background: '#0e1421', color: '#e8edf5' });
            solicitudesGlobal = solicitudesGlobal.filter(s => s.id_solicitud !== id);
            await cargarConteoNotificaciones();
            abrirBandeja();
        }
        return;
    }

    // Aprobar
    const darAdmin = document.getElementById('check-dar-admin')?.checked;
    const passAdmin = document.getElementById('admin-pass-confirm')?.value || '';

    if (darAdmin && !passAdmin) {
        Swal.fire({ icon: 'warning', title: 'Falta la contraseña', text: 'Para asignar rol de administrador debes confirmar tu contraseña.', background: '#0e1421', color: '#e8edf5' });
        return;
    }

    const body = {
        id_admin: usuario.id_usuario,
        contrasena_admin: darAdmin ? passAdmin : 'SKIP_ADMIN_ROLE',
        rol_final: darAdmin ? 'admin' : null
    };

    // Si no quiere dar admin, no necesita contraseña — mandar password vacío no aplica
    // Pero el backend siempre verifica — así que si NO es admin override, mandamos contraseña dummy
    // Para evitar esto, ajustemos: si no dar admin, solicitar contraseña admin para aprobar
    if (!darAdmin) {
        const { value: pw } = await Swal.fire({
            title: 'Confirma tu identidad',
            text: 'Ingresa tu contraseña de administrador para aprobar.',
            input: 'password',
            inputPlaceholder: 'Tu contraseña',
            showCancelButton: true,
            background: '#0e1421', color: '#e8edf5',
            confirmButtonText: 'Aprobar'
        });
        if (!pw) return;
        body.contrasena_admin = pw;
    }

    const r = await apiFetch(`/api/registro/${id}/aprobar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (r && r.mensaje) {
        Swal.fire({ icon: 'success', title: '¡Usuario aprobado!', text: r.mensaje, timer: 2000, background: '#0e1421', color: '#e8edf5' });
        solicitudesGlobal = solicitudesGlobal.filter(s => s.id_solicitud !== id);
        await cargarConteoNotificaciones();
        abrirBandeja();
    } else {
        Swal.fire({ icon: 'error', title: 'Error al aprobar', text: r?.error || 'Verifica tu contraseña e intenta de nuevo.', background: '#0e1421', color: '#e8edf5' });
    }
};