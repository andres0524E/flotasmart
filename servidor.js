const express = require('express');
const cors = require('cors'); 
const app = express();

// Importamos tu conexión a la base de datos
const bd = require('./src/bd/conexion'); 

const puerto = process.env.PORT || 3000;

// Importamos las demás rutas
const rutas_vehiculos = require('./src/rutas/vehiculos');
const rutas_usos = require('./src/rutas/usos');
const rutas_eventos = require('./src/rutas/eventos');
const rutas_historial = require('./src/rutas/historial');

// Permisos para que Hostinger y Render hablen entre sí
app.use(cors()); 
app.use(express.json());

// Activamos las rutas de tu sistema
app.use('/api/vehiculos', rutas_vehiculos);
app.use('/api/usos', rutas_usos);
app.use('/api/eventos', rutas_eventos);
app.use('/api/historial', rutas_historial);

// 🔥 LA RUTA SALVAVIDAS: El Login directo en el servidor 🔥
app.post('/api/login', (req, res) => {
    const { correo, contrasena } = req.body;
    
    const consulta = 'SELECT * FROM usuarios WHERE correo = ? AND contrasena = ?';
    
    bd.query(consulta, [correo, contrasena], (error, resultados) => {
        if (error) {
            console.error("Error en BD:", error);
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (resultados.length > 0) {
            res.json({ mensaje: 'Login exitoso', usuario: resultados[0] });
        } else {
            res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }
    });
});

// Arrancamos el motor
app.listen(puerto, () => {
    console.log(`✅ Backend corriendo con éxito en el puerto ${puerto}`);
});