const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const bd = require('./src/bd/conexion');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// IMPORTACIÓN Y CONEXIÓN DE RUTAS
// ==========================================
const rutasVehiculos = require('./src/rutas/vehiculos');
const rutasEventos = require('./src/rutas/eventos');
const rutasUsos = require('./src/rutas/usos');
const rutasGasolina = require('./src/rutas/gasolina');
const rutasHistorial = require('./src/rutas/historial');
const rutasRegistro = require('./src/rutas/registro');

app.use('/api/vehiculos', rutasVehiculos);
app.use('/api/eventos', rutasEventos);
app.use('/api/usos', rutasUsos);
app.use('/api/gasolina', rutasGasolina);
app.use('/api/historial', rutasHistorial);
app.use('/api/registro', rutasRegistro);

// ==========================================
// RUTA DE LOGIN
// ==========================================
app.post('/api/login', (req, res) => {
    const { correo, contrasena } = req.body;
    const consulta = 'SELECT * FROM usuarios WHERE correo = ?';
    
    bd.query(consulta, [correo], async (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error en la base de datos' });
        if (resultados.length > 0) {
            const usuario = resultados[0];
            const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
            if (coincide) {
                delete usuario.contrasena; 
                res.json({ mensaje: 'Login exitoso', usuario: usuario });
            } else {
                res.status(401).json({ error: 'Contraseña incorrecta' });
            }
        } else {
            res.status(401).json({ error: 'El usuario no existe' });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`✅ Servidor en puerto ${PORT} 🚀`); });