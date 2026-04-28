const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

// Obtener cuántos están pendientes (BLINDADO)
enrutador.get('/conteo', (req, res) => {
    bd.query("SELECT COUNT(*) AS total FROM usuarios WHERE estado_cuenta = 'Pendiente'", (err, r) => {
        if (err) return res.json({total: 0}); // Si hay error, no crashea, devuelve 0
        res.json(r[0] || {total: 0});
    });
});

// Obtener la lista de pendientes (BLINDADO)
enrutador.get('/pendientes', (req, res) => {
    bd.query("SELECT id_usuario AS id_solicitud, nombre, correo, rol AS rol_solicitado, departamento, NOW() as fecha_solicitud FROM usuarios WHERE estado_cuenta = 'Pendiente'", (err, r) => {
        if (err) return res.json([]); // Si hay error, devuelve lista vacía
        res.json(r);
    });
});

// Aprobar usuario (BLINDADO)
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

// Rechazar usuario (BLINDADO)
enrutador.put('/:id/rechazar', (req, res) => {
    bd.query("UPDATE usuarios SET estado_cuenta = 'Rechazado' WHERE id_usuario = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({error: 'Error DB'});
        res.json({msg:'Ok'});
    });
});

module.exports = enrutador;