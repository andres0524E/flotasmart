const express = require('express');
const cors = require('cors'); 
const app = express();

const puerto = process.env.PORT || 3000;

const rutas_vehiculos = require('./src/rutas/vehiculos');
const rutas_usos = require('./src/rutas/usos');
const rutas_eventos = require('./src/rutas/eventos');
const rutas_historial = require('./src/rutas/historial');
// ¡AQUÍ ESTÁ LA LÍNEA QUE FALTABA!
const rutas_login = require('./src/rutas/login'); 

app.use(cors()); 
app.use(express.json());

app.use('/api/vehiculos', rutas_vehiculos);
app.use('/api/usos', rutas_usos);
app.use('/api/eventos', rutas_eventos);
app.use('/api/historial', rutas_historial);
// ¡Y AQUÍ LA ACTIVAMOS!
app.use('/api/login', rutas_login); 

app.listen(puerto, () => {
    console.log(`✅ Backend corriendo con éxito en el puerto ${puerto}`);
});