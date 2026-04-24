'use strict';

const API_URL = 'https://flotasmart-backend.onrender.com';
let vehiculosGlobal = [];
let filtroActivo = 'todos';

// ─── SEGURIDAD: Verificar sesión con expiración de 8 horas ───
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
        // Validar que tiene campos mínimos
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

// ─── SANITIZAR texto ───
function sanitizar(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>'"]/g, '').trim().slice(0, 500);
}

// ─── FETCH CON MANEJO DE ERRORES ───
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

// ─── UTILIDAD: clase de estado de vehículo ───
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

// ─── ALERTA DE SEGURO / KM ───
function alertasVehiculo(auto) {
    let html = '';
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    if (auto.fecha_vencimiento_seguro) {
        const venc = new Date(auto.fecha_vencimiento_seguro);
        venc.setHours(0,0,0,0);
        const dias = Math.round((venc - hoy) / 86400000);
        if (dias <= 15 && dias >= 0) {
            html += `<div class="alerta-seguro-banner">⚠ Seguro vence en ${dias} días (${venc.toLocaleDateString()})</div>`;
        } else if (dias < 0) {
            html += `<div class="alerta-seguro-banner">🚨 Seguro VENCIDO hace ${Math.abs(dias)} días</div>`;
        }
    }
    if (auto.km_proximo_servicio && auto.kilometraje) {
        const falta = auto.km_proximo_servicio - auto.kilometraje;
        if (falta <= 500 && falta >= 0) {
            html += `<div class="alerta-km-banner">⚠ Servicio preventivo en ${falta} km</div>`;
        } else if (falta < 0) {
            html += `<div class="alerta-km-banner">🔔 Servicio vencido por ${Math.abs(falta)} km</div>`;
        }
    }
    return html;
}

// ─── RENDERIZAR VEHÍCULOS ───
function renderizarVehiculos(vehiculos) {
    const contenedor = document.getElementById('contenedor-vehiculos');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const usuario = verificarSesion();
    if (!usuario) return;
    const rol = usuario.rol;
    const esChofer = rol === 'chofer';
    const esMecanico = rol === 'mecanico';

    // Filtrar según rol mecánico
    let lista = vehiculos;
    if (esMecanico) {
        lista = vehiculos.filter(v => claseEstado(v.estado_actual) === 'taller');
    }

    // Aplicar filtro de estado
    if (filtroActivo !== 'todos') {
        lista = lista.filter(v => claseEstado(v.estado_actual) === filtroActivo);
    }

    // Busqueda por placa
    const busq = (document.getElementById('buscador-placa')?.value || '').trim().toUpperCase();
    if (busq) {
        lista = lista.filter(v => (v.placa || '').toUpperCase().includes(busq));
    }

    if (lista.length === 0) {
        contenedor.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">
            <div style="font-size:48px;margin-bottom:12px">🚗</div>
            <div style="font-family:'Syne',sans-serif;font-size:16px">No hay vehículos que mostrar</div>
        </div>`;
        return;
    }

    lista.forEach((auto, idx) => {
        const cls = claseEstado(auto.estado_actual);
        const nivelGas = auto.nivel_combustible != null ? auto.nivel_combustible : 100;
        const gasColor = nivelGas < 25 ? 'color:var(--danger)' : nivelGas < 50 ? 'color:var(--warn)' : 'color:var(--success)';

        // Alertas en tarjeta
        let alertaChip = '';
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        if (auto.fecha_vencimiento_seguro) {
            const v = new Date(auto.fecha_vencimiento_seguro); v.setHours(0,0,0,0);
            const d = Math.round((v - hoy) / 86400000);
            if (d <= 15) alertaChip += `<div class="v-alert seguro show">⚠ Seguro vence pronto</div>`;
        }
        if (auto.km_proximo_servicio && auto.kilometraje && (auto.km_proximo_servicio - auto.kilometraje) <= 500) {
            alertaChip += `<div class="v-alert servicio show">🔔 Servicio próximo</div>`;
        }

        // Acción en tarjeta
        let accionTarjeta = '';
        if (!esChofer) accionTarjeta = `onclick="abrirModalDetalles(${auto.id_vehiculo})"`;

        // Botones de chofer
        let botonChofer = '';
        if (esChofer && cls === 'activo') {
            botonChofer = `<div class="v-chofer-actions">
                <button class="btn-fs btn-fs-success" onclick="abrirModalUso(${auto.id_vehiculo})">🚗 Solicitar Unidad</button>
                <button class="btn-fs btn-fs-dark" onclick="abrirModalGasolina(${auto.id_vehiculo})">⛽ Cargar Combustible</button>
            </div>`;
        } else if (esChofer && cls === 'ruta') {
            botonChofer = `<div class="v-chofer-actions"><button class="btn-fs btn-fs-info" onclick="abrirModalRetorno(${auto.id_vehiculo})">📍 Registrar Retorno</button></div>`;
        } else if (esChofer && cls === 'taller') {
            botonChofer = `<div class="v-chofer-actions"><button class="btn-fs btn-fs-warn" disabled>🔧 En Taller</button></div>`;
        } else if (esChofer && cls === 'bloqueado') {
            botonChofer = `<div class="v-chofer-actions"><button class="btn-fs btn-fs-danger" disabled>🔴 Bloqueado por Admin</button></div>`;
        }

        // Botón mecánico
        let botonMecanico = '';
        if (esMecanico && cls === 'taller') {
            botonMecanico = `<div class="v-chofer-actions"><button class="btn-fs btn-fs-warn" onclick="abrirModalLiberar(${auto.id_vehiculo})">✅ Liberar del Taller</button></div>`;
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
            ${(!esChofer && !esMecanico) ? `<p style="text-align:center;color:var(--muted);font-size:11px;margin:16px 0 0">Clic para ver opciones</p>` : ''}
        </div>`;
    });
}

// ─── FILTROS ───
function filtrarVehiculos(filtro, btn) {
    filtroActivo = filtro;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderizarVehiculos(vehiculosGlobal);
}

function buscarPorPlaca(val) {
    renderizarVehiculos(vehiculosGlobal);
}

// ─── TABS ───
function cambiarTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('tab-' + tab)?.classList.add('active');

    if (tab === 'dashboard') actualizarDashboard(vehiculosGlobal);
    if (tab === 'financiero') cargarFinanciero();
}

// ─── MODAL DETALLES ───
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
        <button style="background:none;border:none;color:var(--muted);cursor:pointer;margin-left:4px" onclick="editarTanque(${auto.id_vehiculo},${auto.capacidad_tanque})" title="Editar tanque">✏️</button>`;

    document.getElementById('detalles-alertas').innerHTML = alertasVehiculo(auto);

    const cls = claseEstado(auto.estado_actual);
    let botonesHTML = '';

    if (cls === 'activo') {
        botonesHTML += `<button class="btn-fs btn-fs-success" onclick="cerrarDetallesYabrir('uso',${id})">🚗 Registrar Salida</button>`;
        botonesHTML += `<button class="btn-fs btn-fs-dark" onclick="cerrarDetallesYabrir('gasolina',${id})">⛽ Cargar Combustible</button>`;
        botonesHTML += `<button class="btn-fs btn-fs-danger" onclick="cerrarDetallesYabrir('evento',${id})">🔧 Reportar Incidencia</button>`;
        if (esAdmin) botonesHTML += `<button class="btn-paro" onclick="activarParoMotor(${id})">🔴 PARO DE MOTOR</button>`;
    } else if (cls === 'taller') {
        botonesHTML += `<button class="btn-fs btn-fs-warn" onclick="abrirModalLiberar(${id});bootstrap.Modal.getInstance(document.getElementById('modal-detalles')).hide()">✅ Liberar del Taller</button>`;
    } else if (auto.estado_actual?.toLowerCase() === 'pendiente') {
        botonesHTML += `<button class="btn-fs btn-fs-success" onclick="responderPeticion(${id},'Aprobar')">✅ Aprobar Salida</button>`;
        botonesHTML += `<button class="btn-fs btn-fs-danger" onclick="responderPeticion(${id},'Rechazar')">❌ Rechazar</button>`;
    } else if (cls === 'ruta') {
        botonesHTML += `<button class="btn-fs btn-fs-info" onclick="cerrarDetallesYabrir('retorno',${id})">📍 Registrar Retorno</button>`;
    } else if (cls === 'bloqueado') {
        botonesHTML += `<button class="btn-desbloquear" onclick="desbloquearVehiculo(${id})">🔓 DESBLOQUEAR UNIDAD</button>`;
    }

    botonesHTML += `<button class="btn-fs btn-fs-dark" onclick="cerrarDetallesYabrir('historial',${id})" style="margin-top:12px;border-top:1px solid var(--border);padding-top:16px">📖 Ver Historial Completo</button>`;

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

// ─── MODALES ───
function abrirModalUso(id) {
    const usr = verificarSesion();
    if (!usr) return;
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    if (!auto) return;

    // Seguridad: no permitir salida de vehículo bloqueado
    if (claseEstado(auto.estado_actual) === 'bloqueado') {
        Swal.fire({ icon:'error', title:'Vehículo Bloqueado', text:'Este vehículo fue bloqueado remotamente por el administrador.', background:'#0e1421', color:'#e8edf5' });
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

// ─── EDITAR TANQUE ───
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

// ─── LIBERAR VEHÍCULO ───
async function liberarVehiculo(id) {
    await apiFetch(`/api/vehiculos/${id}/liberar`, { method: 'PUT' });
    cargarVehiculos();
}

// ─── PARO DE MOTOR ───
async function activarParoMotor(id) {
    const { isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: '🔴 Activar Paro de Motor',
        html: `<p style="color:#aaa">Este vehículo será <strong style="color:#ff4757">BLOQUEADO</strong>. Nadie podrá registrar salidas hasta que lo desbloquees manualmente.</p>`,
        showCancelButton: true,
        confirmButtonText: 'Bloquear Ahora',
        confirmButtonColor: '#ff4757',
        background: '#0e1421', color: '#e8edf5'
    });
    if (isConfirmed) {
        const r = await apiFetch(`/api/vehiculos/${id}/bloquear`, { method: 'PUT' });
        if (r) {
            bootstrap.Modal.getInstance(document.getElementById('modal-detalles'))?.hide();
            Swal.fire({ icon:'success', title:'Vehículo Bloqueado', text:'Estado cambiado a "Bloqueado". Nadie puede registrar salidas.', background:'#0e1421', color:'#e8edf5' }).then(() => cargarVehiculos());
        } else {
            // Fallback: usar ruta de mantenimiento si no existe /bloquear
            await apiFetch(`/api/vehiculos/${id}/mantenimiento`, { method: 'PUT' });
            // Marcamos localmente
            const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
            if (auto) auto.estado_actual = 'Bloqueado';
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

// ─── RESPONDER PETICIÓN ───
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

// ─── HISTORIAL ───
async function abrirModalHistorial(id) {
    new bootstrap.Modal(document.getElementById('modal-historial')).show();
    const contenido = document.getElementById('historial-contenido');
    contenido.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px">Cargando historial...</p>';

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
                         actLC.includes('gasolina') ? 'background:rgba(0,212,255,0.1);color:var(--accent)' :
                         actLC.includes('uso') || actLC.includes('salida') ? 'background:rgba(0,230,118,0.1);color:var(--success)' :
                         actLC.includes('taller') || actLC.includes('mantenimiento') ? 'background:rgba(255,190,33,0.1);color:var(--warn)' :
                         'background:rgba(255,255,255,0.06);color:var(--muted)';
        html += `<div class="hist-row">
            <div class="hist-date">${fecha}</div>
            <div class="hist-detail">${det}</div>
            <span class="hist-badge" style="${badgeCls}">${act}</span>
        </div>`;
    });
    contenido.innerHTML = html;
}

// ─── DASHBOARD ───
async function actualizarDashboard(vehiculos) {
    // Stats
    const total = vehiculos.length;
    const activos = vehiculos.filter(v => claseEstado(v.estado_actual) === 'activo').length;
    const taller = vehiculos.filter(v => claseEstado(v.estado_actual) === 'taller').length;
    const bloqueados = vehiculos.filter(v => claseEstado(v.estado_actual) === 'bloqueado').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-activos').textContent = activos;
    document.getElementById('stat-taller').textContent = taller;
    document.getElementById('stat-bloqueados').textContent = bloqueados;

    // Donut chart
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

    // Ranking
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

// ─── MÓDULO FINANCIERO ───
async function cargarFinanciero() {
    const [gasolinaData, eventosData] = await Promise.all([
        apiFetch('/api/gasolina'),
        apiFetch('/api/eventos')
    ]);

    let totalGas = 0, totalLitros = 0;
    if (gasolinaData && Array.isArray(gasolinaData)) {
        gasolinaData.forEach(r => {
            totalGas += parseFloat(r.costo_total || 0);
            totalLitros += parseFloat(r.litros || 0);
        });
    }

    let totalRep = 0;
    if (eventosData && Array.isArray(eventosData)) {
        eventosData.forEach(r => { totalRep += parseFloat(r.costo || 0); });
    }

    const totalGeneral = totalGas + totalRep;
    const fmt = (n) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    document.getElementById('fin-gasolina').textContent = fmt(totalGas);
    document.getElementById('fin-gasolina-litros').textContent = `${totalLitros.toFixed(1)} litros registrados`;
    document.getElementById('fin-reparaciones').textContent = fmt(totalRep);
    document.getElementById('fin-rep-eventos').textContent = `${eventosData?.length || 0} eventos registrados`;
    document.getElementById('fin-total').textContent = fmt(totalGeneral);

    // Tabla por vehículo
    const tablaDiv = document.getElementById('fin-detalle-tabla');
    if (!vehiculosGlobal.length) { tablaDiv.innerHTML = '<p style="color:var(--muted);text-align:center">Sin datos.</p>'; return; }

    const gasxVeh = {};
    const repxVeh = {};
    if (gasolinaData) gasolinaData.forEach(r => { gasxVeh[r.id_vehiculo] = (gasxVeh[r.id_vehiculo] || 0) + parseFloat(r.costo_total || 0); });
    if (eventosData) eventosData.forEach(r => { repxVeh[r.id_vehiculo] = (repxVeh[r.id_vehiculo] || 0) + parseFloat(r.costo || 0); });

    const todos = [...new Set([...Object.keys(gasxVeh), ...Object.keys(repxVeh)])];
    if (todos.length === 0) { tablaDiv.innerHTML = '<p style="color:var(--muted);text-align:center">Sin movimientos financieros aún.</p>'; return; }

    let rows = todos.map(id => {
        const auto = vehiculosGlobal.find(v => v.id_vehiculo == id);
        const g = gasxVeh[id] || 0;
        const rep = repxVeh[id] || 0;
        return { nombre: auto ? `${auto.marca} ${auto.modelo}` : `#${id}`, placa: auto?.placa || '—', gas: g, rep, total: g + rep };
    }).sort((a, b) => b.total - a.total);

    tablaDiv.innerHTML = `
    <table class="fin-table">
        <thead><tr>
            <th>Vehículo</th><th>Placa</th>
            <th style="text-align:right">⛽ Combustible</th>
            <th style="text-align:right">🔧 Reparaciones</th>
            <th style="text-align:right">Total</th>
        </tr></thead>
        <tbody>
        ${rows.map(r => `<tr>
            <td><strong>${sanitizar(r.nombre)}</strong></td>
            <td style="color:var(--muted);font-size:12px">${sanitizar(r.placa)}</td>
            <td style="text-align:right;color:var(--accent)">${fmt(r.gas)}</td>
            <td style="text-align:right;color:var(--danger)">${fmt(r.rep)}</td>
            <td style="text-align:right;font-family:'Syne',sans-serif;font-weight:700">${fmt(r.total)}</td>
        </tr>`).join('')}
        </tbody>
    </table>`;
}

// ─── CARGAR VEHÍCULOS ───
async function cargarVehiculos() {
    const data = await apiFetch('/api/vehiculos');
    if (data) {
        vehiculosGlobal = data;
        renderizarVehiculos(vehiculosGlobal);
    }
}

// ─── SWEETALERT CONFIG ───
const SWAL_DARK = { background: '#0e1421', color: '#e8edf5', confirmButtonColor: '#0066ff' };

// ─── INICIALIZACIÓN ───
document.addEventListener('DOMContentLoaded', () => {
    const usuario = verificarSesion();
    if (!usuario) return;

    document.getElementById('nav-nombre').textContent = `${usuario.nombre || 'Usuario'}`;
    document.getElementById('nav-rol').textContent = usuario.rol?.toUpperCase() || '—';

    const esChofer = usuario.rol === 'chofer';
    const esMecanico = usuario.rol === 'mecanico';
    const esAdmin = usuario.rol === 'admin';

    // Ocultar botón registrar si no es admin
    if (!esAdmin) {
        document.getElementById('btn-registrar-unidad').style.display = 'none';
    }

    // Banner mecánico
    if (esMecanico) {
        document.getElementById('banner-mecanico').style.display = 'flex';
        document.getElementById('tab-financiero').style.display = 'none';
        document.getElementById('tab-dashboard').style.display = 'none';
    }

    // Chofer no ve tab financiero ni dashboard
    if (esChofer) {
        document.getElementById('tab-financiero').style.display = 'none';
        document.getElementById('tab-dashboard').style.display = 'none';
    }

    cargarVehiculos();

    // ─── FORMULARIOS ───
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
                fecha_vencimiento_seguro: fechaSeguro || null })
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
            body: JSON.stringify({ id_vehiculo: id, litros, costo_total: costo, kilometraje: km })
        });
        if (r !== null) {
            bootstrap.Modal.getInstance(document.getElementById('modal-gasolina'))?.hide();
            Swal.fire({ icon:'success', title:'¡Combustible registrado!', ...SWAL_DARK }).then(() => cargarVehiculos());
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
        await apiFetch('/api/eventos', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id_vehiculo: id, tipo_evento: tipo, descripcion: causa + ' — ' + desc, costo })
        });
        await apiFetch(`/api/vehiculos/${id}/mantenimiento`, { method: 'PUT' });
        bootstrap.Modal.getInstance(document.getElementById('modal-evento'))?.hide();
        Swal.fire({ icon:'success', title:'¡Reportado!', text:'Unidad enviada al taller.', ...SWAL_DARK }).then(() => cargarVehiculos());
    });

    // ─── LIBERAR DEL TALLER (Mecánico) ───
    document.getElementById('formulario-liberar')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('liberar-id-vehiculo').value;
        const desc = sanitizar(document.getElementById('liberar-descripcion').value);
        if (!desc) { Swal.fire({ icon:'warning', title:'Describe la intervención', ...SWAL_DARK }); return; }

        // Registrar evento de tipo mantenimiento con la descripción del mecánico
        await apiFetch('/api/eventos', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id_vehiculo: id, tipo_evento: 'Mantenimiento Completado', descripcion: desc, costo: 0 })
        });
        await apiFetch(`/api/vehiculos/${id}/liberar`, { method: 'PUT' });
        bootstrap.Modal.getInstance(document.getElementById('modal-liberar'))?.hide();
        Swal.fire({ icon:'success', title:'Unidad Liberada', text:'El vehículo vuelve a estar activo.', ...SWAL_DARK }).then(() => cargarVehiculos());
    });
});
