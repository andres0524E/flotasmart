const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');
const bcrypt = require('bcrypt'); // Agregamos bcrypt para encriptar la contraseña

// Obtener cuántos están pendientes
enrutador.get('/conteo', (req, res) => {
    bd.query("SELECT COUNT(*) AS total FROM usuarios WHERE estado_cuenta = 'Pendiente'", (err, r) => {
        if (err) return res.json({total: 0});
        res.json(r[0] || {total: 0});
    });
});

// Obtener la lista de pendientes
enrutador.get('/pendientes', (req, res) => {
    bd.query("SELECT id_usuario AS id_solicitud, nombre, correo, rol AS rol_solicitado, departamento, NOW() as fecha_solicitud FROM usuarios WHERE estado_cuenta = 'Pendiente'", (err, r) => {
        if (err) return res.json([]);
        res.json(r);
    });
});

// 🔥 NUEVO: Recibir y guardar solicitud de registro
enrutador.post('/nuevo', async (req, res) => {
    const { nombre, departamento, correo, contrasena, rol } = req.body;
    if (!nombre || !departamento || !correo || !contrasena || !rol) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    try {
        // 1. Verificar que el correo no exista ya
        bd.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo], async (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });
            if (resultados.length > 0) return res.status(400).json({ error: 'Este correo ya está registrado' });

            // 2. Encriptar contraseña y guardar como "Pendiente"
            const hash = await bcrypt.hash(contrasena, 10);
            const sql = "INSERT INTO usuarios (nombre, departamento, correo, contrasena, rol, estado_cuenta) VALUES (?, ?, ?, ?, ?, 'Pendiente')";
            
            bd.query(sql, [nombre, departamento, correo, hash, rol], (err2) => {
                if (err2) return res.status(500).json({ error: 'Error al guardar la solicitud' });
                res.json({ msg: 'Solicitud enviada exitosamente' });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Aprobar usuario
enrutador.put('/:id/aprobar', (req, res) => {
    const { rol_final } = req.body;
    const q = rol_final === 'admin' 
        ? "UPDATE usuarios SET estado_cuenta = 'Aprobado', rol = 'admin' WHERE id_usuario = ?"
        : "UPDATE usuarios SET estado_cuenta = 'Aprobado' WHERE id_usuario = ?";
    bd.query(q, [req.params.id], (err) => {
        if (err) return res.status(500).json({error: 'Error DB'});
        res.json({msg:'Ok'});
    });
});

// Rechazar usuario
enrutador.put('/:id/rechazar', (req, res) => {
    bd.query("UPDATE usuarios SET estado_cuenta = 'Rechazado' WHERE id_usuario = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({error: 'Error DB'});
        res.json({msg:'Ok'});
    });
});

module.exports = enrutador;