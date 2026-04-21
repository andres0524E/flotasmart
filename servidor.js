const express = require('express');
const cors = require('cors'); // <--- NUEVO
const app = express();

const puerto = process.env.PORT || 3000;

const rutas_vehiculos = require('./src/rutas/vehiculos');
const rutas_usos = require('./src/rutas/usos');
const rutas_eventos = require('./src/rutas/eventos');
const rutas_historial = require('./src/rutas/historial');

// Permitir conexiones desde cualquier dominio (Hostinger podrá conectarse aquí)
app.use(cors()); 
app.use(express.json());

// Solo dejamos las rutas de la API (El Backend puro)
app.use('/api/vehiculos', rutas_vehiculos);
app.use('/api/usos', rutas_usos);
app.use('/api/eventos', rutas_eventos);
app.use('/api/historial', rutas_historial);

app.listen(puerto, () => {
    console.log(`✅ Backend corriendo con éxito en el puerto ${puerto}`);
});