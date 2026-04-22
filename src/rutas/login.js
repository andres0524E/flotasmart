const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

// Usamos '/' porque en servidor.js ya le dijimos que esta es la ruta '/api/login'
enrutador.post('/', (req, res) => {
    const { correo, contrasena } = req.body;

    const consulta = 'SELECT * FROM usuarios WHERE correo = ? AND contrasena = ?';
    
    bd.query(consulta, [correo, contrasena], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error en la base de datos' });
        
        if (resultados.length > 0) {
            // Si la contraseña es correcta, devolvemos los datos del usuario
            res.json({ mensaje: 'Login exitoso', usuario: resultados[0] });
        } else {
            // Si no existe, mandamos error 401 (No autorizado)
            res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }
    });
});

module.exports = enrutador;