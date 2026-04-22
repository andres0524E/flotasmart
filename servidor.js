const express = require('express');
const cors = require('cors'); 
const app = express();
const bd = require('./src/bd/conexion'); // Llamamos a la base de datos aquí mismo

const puerto = process.env.PORT || 3000;

// Importamos las otras rutas normales
const rutas_vehiculos = require('./src/rutas/vehiculos');
const rutas_usos = require('./src/rutas/usos');
const rutas_eventos = require('./src/rutas/eventos');
const rutas_historial = require('./src/rutas/historial');

app.use(cors()); 
app.use(express.json());

app.use('/api/vehiculos', rutas_vehiculos);
app.use('/api/usos', rutas_usos);
app.use('/api/eventos', rutas_eventos);
app.use('/api/historial', rutas_historial);

// 🔥 OPCIÓN NUCLEAR: El Login directo en el servidor principal 🔥
app.post('/api/login', (req, res) => {
    const { correo, contrasena } = req.body;
    const consulta = 'SELECT * FROM usuarios WHERE correo = ? AND contrasena = ?';
    
    bd.query(consulta, [correo, contrasena], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error en la base de datos' });
        
        if (resultados.length > 0) {
            res.json({ mensaje: 'Login exitoso', usuario: resultados[0] });
        } else {
            res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }
    });
});

app.listen(puerto, () => {
    console.log(`✅ Backend corriendo con éxito en el puerto ${puerto}`);
});