const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

// Ruta para procesar el inicio de sesión
enrutador.post('/', (req, res) => {
    const { correo, contrasena } = req.body;

    // Buscamos al usuario que coincida exactamente con ese correo y contraseña
    const consulta = 'SELECT id_usuario, nombre, rol FROM usuarios WHERE correo = ? AND contrasena = ?';

    bd.query(consulta, [correo, contrasena], (error, resultados) => {
        if (error) {
            console.error('❌ Error en el proceso de login:', error);
            return res.status(500).json({ error: 'Error en el servidor al intentar iniciar sesión' });
        }

        // Si la base de datos nos devuelve al menos un registro, ¡el usuario existe!
        if (resultados.length > 0) {
            res.json({
                mensaje: 'Login exitoso',
                usuario: resultados[0] // Le enviamos al frontend su ID, nombre y rol (pero NO la contraseña)
            });
        } else {
            // Si el arreglo está vacío, las credenciales son incorrectas
            res.status(401).json({ error: 'Correo o contraseña incorrectos. Verifica tus datos.' });
        }
    });
});

module.exports = enrutador;