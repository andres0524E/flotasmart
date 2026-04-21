const express = require('express');
const app = express();
const puerto = 3000;

// Importamos todas las rutas
const rutas_vehiculos = require('./src/rutas/vehiculos');
const rutas_usos = require('./src/rutas/usos');
const rutas_eventos = require('./src/rutas/eventos');
const rutas_historial = require('./src/rutas/historial');
const rutas_login = require('./src/rutas/login');

// Configuración
app.use(express.static('public'));
app.use(express.json());

// Asignamos las rutas (¡Aquí es donde ocurría el 404 si faltaba alguna!)
app.use('/api/vehiculos', rutas_vehiculos);
app.use('/api/usos', rutas_usos);
app.use('/api/eventos', rutas_eventos);
app.use('/api/historial', rutas_historial);
app.use('/api/login', rutas_login);

app.listen(puerto, () => {
    console.log(`✅ Servidor corriendo con éxito en http://localhost:${puerto}`);
});