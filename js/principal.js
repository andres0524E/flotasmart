'use strict';
const API_URL = 'https://flotasmart-backend.onrender.com';
let vehiculosGlobal = [], gasDataGlobal = [], evtDataGlobal = [], filtroActivo = 'todos';

function verificarSesion() {
    const raw = localStorage.getItem('usuarioFlota');
    if (!raw) return null;
    const usr = JSON.parse(raw);
    if (!usr.id_usuario || (Date.now() - usr._ts) > 28800000) { localStorage.removeItem('usuarioFlota'); window.location.href = 'login.html'; return null; }
    return usr;
}

function sanitizar(str) { return (typeof str !== 'string') ? '' : str.replace(/[<>'"]/g, '').trim().slice(0, 500); }

async function apiFetch(url, opts = {}) {
    try { const res = await fetch(API_URL + url, opts); return await res.json(); } 
    catch (e) { return null; }
}

function claseEstado(estado) {
    const e = (estado || '').toLowerCase();
    if (e === 'activo') return 'activo';
    if (e.includes('mantenimiento') || e === 'taller') return 'taller';
    if (e.includes('ruta')) return 'ruta';
    return e === 'bloqueado' ? 'bloqueado' : 'otro';
}

function badgeHTML(estado) { return `<span class="v-badge badge-${claseEstado(estado)}">${sanitizar(estado)}</span>`; }

function alertasVehiculo(auto) {
    let html = '';
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    if (auto.fecha_seguro) {
        const venc = new Date(auto.fecha_seguro);
        const dias = Math.round((venc - hoy) / 86400000);
        if (dias <= 15) html += `<div class="alerta-seguro-banner"><i class="fa-solid fa-bell"></i> Seguro vence en ${dias} días</div>`;
    }
    if (auto.km_proximo_servicio && auto.kilometraje) {
        const falta = auto.km_proximo_servicio - auto.kilometraje;
        if (falta <= 500) html += `<div class="alerta-km-banner"><i class="fa-solid fa-wrench"></i> Servicio en ${falta} km</div>`;
    }
    return html;
}

function renderizarVehiculos(vehiculos) {
    const contenedor = document.getElementById('contenedor-vehiculos');
    if (!contenedor) return; contenedor.innerHTML = '';
    const usr = verificarSesion(); if (!usr) return;
    
    let lista = vehiculos;
    if (usr.rol === 'mecanico') lista = vehiculos.filter(v => claseEstado(v.estado_actual) === 'taller');
    if (filtroActivo !== 'todos') lista = lista.filter(v => claseEstado(v.estado_actual) === filtroActivo);

    lista.forEach(auto => {
        const cls = claseEstado(auto.estado_actual);
        const gas = auto.nivel_combustible || 100;
        const click = (usr.rol === 'chofer') ? '' : `onclick="abrirModalDetalles(${auto.id_vehiculo})"`;
        
        contenedor.innerHTML += `
        <div class="v-card estado-${cls}" ${click}>
            <div style="display:flex; justify-content:space-between">
                <div><div class="v-marca">${sanitizar(auto.marca)}</div><div style="color:var(--muted);font-size:12px;">${sanitizar(auto.modelo)}</div></div>
                ${badgeHTML(auto.estado_actual)}
            </div>
            <div style="font-family:Montserrat; font-weight:700; font-size:13px; color:var(--muted); margin-top:8px;">${sanitizar(auto.placa)}</div>
            <div class="v-stats">
                <div><div class="v-stat-val">${(auto.kilometraje || 0).toLocaleString()}</div><div style="font-size:10px; color:var(--muted)">KM</div></div>
                <div><div class="v-stat-val" style="color:${gas < 25 ? 'var(--danger)' : 'var(--success)'}">${gas}%</div><div style="font-size:10px; color:var(--muted)">GAS</div></div>
            </div>
            ${usr.rol === 'chofer' && cls === 'activo' ? `<button class="btn-fs btn-fs-success mt-3" onclick="abrirModalUso(${auto.id_vehiculo})">Solicitar</button>` : ''}
            ${usr.rol === 'chofer' && cls === 'ruta' ? `<button class="btn-fs btn-fs-info mt-3" onclick="abrirModalRetorno(${auto.id_vehiculo})">Llegada</button>` : ''}
        </div>`;
    });
}

// 🔥 FUNCIÓN GENERAR PDF
async function generarReportePDF(id) {
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    Swal.fire({ title: 'Generando Reporte...', background: '#0e1421', color: '#e8edf5', didOpen: () => Swal.showLoading() });

    const historial = await apiFetch(`/api/historial/${id}`) || [];
    const gasolina = await apiFetch('/api/gasolina') || [];
    const eventos = await apiFetch('/api/eventos') || [];
    
    const totalGas = gasolina.filter(g => g.id_vehiculo === id).reduce((s, g) => s + parseFloat(g.costo_total), 0);
    const totalRep = eventos.filter(e => e.id_vehiculo === id).reduce((s, e) => s + parseFloat(e.costo), 0);

    const docHTML = `
        <body style="font-family:Arial; padding:40px;">
            <h1 style="color:#cc0000; border-bottom:2px solid #cc0000">Reporte de Unidad: ${auto.placa}</h1>
            <p><strong>Vehículo:</strong> ${auto.marca} ${auto.modelo} (${auto.anio})</p>
            <p><strong>Kilometraje:</strong> ${auto.kilometraje} km | <strong>Inversión Total:</strong> $${(totalGas + totalRep).toLocaleString()}</p>
            <h3>Historial Operativo</h3>
            <table style="width:100%; border-collapse:collapse;">
                <tr style="background:#eee"><th>Fecha</th><th>Actividad</th><th>Detalle</th></tr>
                ${historial.map(h => `<tr><td>${new Date(h.fecha).toLocaleDateString()}</td><td>${h.actividad}</td><td>${h.detalles}</td></tr>`).join('')}
            </table>
        </body>`;
    
    Swal.close();
    const win = window.open('', '_blank');
    win.document.write(docHTML); win.document.close(); win.print();
}

function abrirModalDetalles(id) {
    const auto = vehiculosGlobal.find(v => v.id_vehiculo === id);
    const usr = verificarSesion();
    const cls = claseEstado(auto.estado_actual);

    document.getElementById('detalles-titulo').textContent = `${auto.marca} ${auto.modelo}`;
    document.getElementById('detalles-placa').textContent = auto.placa;
    document.getElementById('detalles-km').textContent = `${auto.kilometraje} km`;
    document.getElementById('detalles-gas').textContent = `${auto.nivel_combustible || 100}%`;
    document.getElementById('detalles-estado-badge').innerHTML = badgeHTML(auto.estado_actual);
    document.getElementById('detalles-alertas').innerHTML = alertasVehiculo(auto);

    let bts = `<button class="btn-fs btn-fs-dark" onclick="cerrarDetallesYabrir('historial',${id})">Ver Historial</button>`;
    if (usr.rol === 'admin') bts += `<button class="btn-fs btn-fs-primary" onclick="generarReportePDF(${id})">Generar Reporte PDF</button>`;
    if (cls === 'activo') bts += `<button class="btn-fs btn-fs-success" onclick="cerrarDetallesYabrir('uso',${id})">Registrar Salida</button>`;
    if (cls === 'ruta') bts += `<button class="btn-fs btn-fs-info" onclick="cerrarDetallesYabrir('retorno',${id})">Registrar Retorno</button>`;

    document.getElementById('detalles-botones').innerHTML = bts;
    new bootstrap.Modal(document.getElementById('modal-detalles')).show();
}

// FUNCIONES DE SOPORTE
function cambiarTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active'); document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'dashboard') actualizarDashboard(vehiculosGlobal);
    if (tab === 'financiero') cargarFinanciero();
}

async function cargarFinanciero() {
    gasDataGlobal = await apiFetch('/api/gasolina') || [];
    evtDataGlobal = await apiFetch('/api/eventos') || [];
    const tH = gasDataGlobal.reduce((s,g)=>s+parseFloat(g.costo_total),0) + evtDataGlobal.reduce((s,e)=>s+parseFloat(e.costo),0);
    const tP = gasDataGlobal.filter(g=>g.estado_pago==='Pagado').reduce((s,g)=>s+parseFloat(g.costo_total),0) + evtDataGlobal.filter(e=>e.estado_pago==='Pagado').reduce((s,e)=>s+parseFloat(e.costo),0);
    
    document.getElementById('fin-historico').textContent = `$${tH.toLocaleString()}`;
    document.getElementById('fin-pagado').textContent = `$${tP.toLocaleString()}`;
    document.getElementById('fin-pendiente').textContent = `$${(tH - tP).toLocaleString()}`;
    
    document.getElementById('fin-detalle-tabla').innerHTML = `<table class="fin-table"><tr><th>Placa</th><th>Saldo Pendiente</th><th>Acción</th></tr>
        ${vehiculosGlobal.map(v => `<tr><td>${v.placa}</td><td>$${(gasDataGlobal.filter(g=>g.id_vehiculo===v.id_vehiculo && g.estado_pago!=='Pagado').reduce((s,g)=>s+parseFloat(g.costo_total),0)).toLocaleString()}</td><td><button class="btn-fs btn-small btn-fs-primary" onclick="abrirModalDeudas(${v.id_vehiculo})">Ver</button></td></tr>`).join('')}</table>`;
}

async function cargarVehiculos() { vehiculosGlobal = await apiFetch('/api/vehiculos') || []; renderizarVehiculos(vehiculosGlobal); }

document.addEventListener('DOMContentLoaded', () => {
    const usr = verificarSesion(); if (!usr) return;
    document.getElementById('nav-nombre').textContent = usr.nombre;
    document.getElementById('nav-rol').textContent = usr.rol;
    if (usr.rol !== 'admin') document.getElementById('btn-registrar-unidad').style.display = 'none';
    cargarVehiculos();
});