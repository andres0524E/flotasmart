// ==========================================
// CÓDIGO COMPLETO DE FUNCIONES DE CONEXIÓN
// (Pega esto en tu principal.js reemplazando las anteriores)
// ==========================================

// 1. Cargar los vehículos al inicio
async function cargarVehiculos() {
    try {
        // Usamos el link de Render directo para evitar choques de variables
        const res = await fetch('https://flotasmart-backend.onrender.com/api/vehiculos'); 
        const vehiculos = await res.json();
        
        // AQUÍ VAN TUS FUNCIONES QUE DIBUJAN EL DISEÑO 
        // (Asegúrate de dejar los nombres que ya tenías, como renderizarTarjetas o actualizarDashboard)
        if (typeof renderizarVehiculos === 'function') renderizarVehiculos(vehiculos);
        if (typeof actualizarDashboard === 'function') actualizarDashboard(vehiculos);
        
    } catch (error) {
        console.error("Error al cargar los vehículos:", error);
    }
}

// 2. Liberar Vehículo del Taller
async function liberarVehiculo(id_vehiculo) {
    if (confirm("¿Confirmas la liberación del vehículo?")) {
        try {
            // Usamos el link directo de Render
            const res = await fetch(`https://flotasmart-backend.onrender.com/api/vehiculos/${id_vehiculo}/liberar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                // Al tener éxito, la página se recarga solita
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

// 3. Reportar Incidencia (Mandar al taller)
async function reportarIncidencia(id_vehiculo) {
    if (confirm("¿Confirmas enviar este vehículo a mantenimiento?")) {
        try {
            // Usamos el link directo de Render
            const res = await fetch(`https://flotasmart-backend.onrender.com/api/vehiculos/${id_vehiculo}/mantenimiento`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                // Al tener éxito, la página se recarga solita
                window.location.reload(); 
            } else {
                alert('❌ Error al reportar la incidencia.');
            }
        } catch (error) {
            console.error("Error de conexión:", error);
        }
    }
}