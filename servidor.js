const express = require('express');
const path = require('path'); // <- Esta librería es vital para servidores en la nube
const app = express();

// En Hostinger, el puerto lo asigna el servidor dinámicamente, por eso usamos process.env.PORT
const puerto = process.env.PORT || 3000;

// Importamos todas las rutas
const rutas_vehiculos = require('./src/rutas/vehiculos');
const rutas_usos = require('./src/rutas/usos');
const rutas_eventos = require('./src/rutas/eventos');
const rutas_historial = require('./src/rutas/historial');
// Si tienes un archivo de login.js en rutas, descomenta la siguiente línea:
// const rutas_login = require('./src/rutas/login');

// 1. Configuración de la carpeta pública con ruta ABSOLUTA
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 2. Asignamos las rutas de la API
app.use('/api/vehiculos', rutas_vehiculos);
app.use('/api/usos', rutas_usos);
app.use('/api/eventos', rutas_eventos);
app.use('/api/historial', rutas_historial);
// app.use('/api/login', rutas_login);

// 3. LA SOLUCIÓN AL ERROR 403: Le decimos a Hostinger qué archivo abrir por defecto
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// (Opcional) Hacemos lo mismo para el login si existe
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 4. Iniciar el servidor
app.listen(puerto, () => {
    console.log(`✅ Servidor corriendo con éxito en el puerto ${puerto}`);
});