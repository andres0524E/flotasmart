// 👇 PEGA TU LINK DE RENDER AQUÍ ADENTRO DE LAS COMILLAS (Sin la diagonal / al final)
const API_URL = "https://flotasmart-backend.onrender.com"; 

export async function obtener_vehiculos() {
    try { const res = await fetch(`${API_URL}/api/vehiculos`); return await res.json(); } 
    catch (e) { return []; }
}

export async function obtener_ranking() {
    try { const res = await fetch(`${API_URL}/api/vehiculos/ranking/fallas`); return await res.json(); } 
    catch (e) { return []; }
}

export async function crear_vehiculo(datos) {
    try {
        const res = await fetch(`${API_URL}/api/vehiculos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        if(!res.ok) throw new Error('Error al guardar');
        return true;
    } catch (e) { alert('❌ Error: ' + e.message); return false; }
}

export async function registrar_salida(datos) {
    try {
        const res = await fetch(`${API_URL}/api/usos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        if(!res.ok) throw new Error('Error al registrar salida');
        return await res.json(); 
    } catch (e) { alert('❌ Error: ' + e.message); return false; }
}

export async function aprobar_salida(id) {
    await fetch(`${API_URL}/api/usos/${id}/aprobar`, { method: 'PUT' });
}

export async function rechazar_salida(id) {
    await fetch(`${API_URL}/api/usos/${id}/rechazar`, { method: 'DELETE' });
}

export async function registrar_evento(datos) {
    try {
        const res = await fetch(`${API_URL}/api/eventos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        if(!res.ok) throw new Error('Error al guardar evento');
        return true;
    } catch (e) { alert('❌ Error: ' + e.message); return false; }
}

export async function obtener_historial(id) {
    try { const res = await fetch(`${API_URL}/api/historial/${id}`); return await res.json(); } 
    catch (e) { return []; }
}