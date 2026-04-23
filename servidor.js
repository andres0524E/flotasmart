const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config(); // Para leer tus variables ocultas

// Importamos la conexión a la base de datos
const bd = require('./src/bd/conexion');

const app = express();

// Middlewares necesarios
app.use(cors());
app.use(express.json());

// ==========================================
// 1. IMPORTACIÓN Y CONEXIÓN DE RUTAS
// ==========================================
// Asegúrate de tener estos archivos creados en tu carpeta src/rutas/
const rutasVehiculos = require('./src/rutas/vehiculos');
const rutasEventos = require('./src/rutas/eventos');
const rutasUsos = require('./src/rutas/usos');
const rutasGasolina = require('./src/rutas/gasolina'); // 🔥 NUEVA RUTA DE GASOLINA

// Le decimos a Node.js que use esas rutas
app.use('/api/vehiculos', rutasVehiculos);
app.use('/api/eventos', rutasEventos);
app.use('/api/usos', rutasUsos);
app.use('/api/gasolina', rutasGasolina); // 🔥 CONECTADA AL SISTEMA

// ==========================================
// 2. RUTA DE LOGIN (Con seguridad Bcrypt)
// ==========================================
app.post('/api/login', (req, res) => {
    const { correo, contrasena } = req.body;
    
    const consulta = 'SELECT * FROM usuarios WHERE correo = ?';
    
    bd.query(consulta, [correo], async (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error en la base de datos' });
        
        if (resultados.length > 0) {
            const usuario = resultados[0];
            
            // Comparamos la contraseña escrita con el hash de la BD
            const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
            
            if (coincide) {
                // Borramos la contraseña antes de enviar los datos al frontend por seguridad
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

// ==========================================
// 3. ARRANQUE DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor de FlotaSmart corriendo exitosamente en el puerto ${PORT} 🚀`);
});