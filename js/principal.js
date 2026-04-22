// ==========================================
// FUNCIONES DE ACCIÓN PARA LOS VEHÍCULOS
// La dirección maestra de tu backend en Render
const API_URL = 'https://flotasmart-backend.onrender.com';
// ==========================================

// 1. Función para Liberar del Taller
async function liberarVehiculo(id_vehiculo) {
    // Si usas tu propio modal de confirmación, puedes quitar este confirm()
    if (confirm("¿Confirmas la liberación del vehículo?")) {
        try {
            const res = await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/liberar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                // Si sale bien, recargamos la página mágicamente
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

// 2. Función para Reportar Incidencia (Mandar al taller)
async function reportarIncidencia(id_vehiculo) {
    if (confirm("¿Confirmas enviar este vehículo a mantenimiento?")) {
        try {
            const res = await fetch(`${API_URL}/api/vehiculos/${id_vehiculo}/mantenimiento`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                window.location.reload(); 
            } else {
                alert('❌ Error al reportar la incidencia.');
            }
        } catch (error) {
            console.error("Error de conexión:", error);
        }
    }
}

// 3. Función para cargar todos los vehículos al inicio (Ejemplo de cómo debe verse)
async function cargarVehiculos() {
    try {
        // Fíjate cómo usamos el API_URL aquí también
        const res = await fetch(`${API_URL}/api/vehiculos`); 
        const vehiculos = await res.json();
        
        // Aquí abajo va tu código normal donde dibujas las tarjetas en el HTML...
        // renderizarTarjetas(vehiculos); 
        console.log("Vehículos cargados:", vehiculos);
        
    } catch (error) {
        console.error("Error al cargar los vehículos:", error);
    }
}