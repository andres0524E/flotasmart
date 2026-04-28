const express = require('express');
const bd = require('../bd/conexion');

module.exports = function(app) {
    const enrutador = express.Router();
    const verificarToken = app.get('verificarToken');
    const soloAdmin      = app.get('soloAdmin');

    // GET / — Solo admin ve todos los eventos
    enrutador.get('/', verificarToken, soloAdmin, (req, res) => {
        bd.query('SELECT * FROM eventos', (error, resultados) => {
            if (error) return res.status(500).json({ error: 'Error' });
            res.json(resultados);
        });
    });

    // POST / — Cualquier usuario autenticado puede reportar un evento
    enrutador.post('/', verificarToken, (req, res) => {
        const { id_vehiculo, tipo_evento, descripcion, costo } = req.body;
        // El id_usuario viene del token, no del body (evita suplantación)
        const id_usuario = req.usuario.id_usuario;
        const consulta = "INSERT INTO eventos (id_vehiculo, id_usuario, tipo_evento, descripcion, fecha_evento, costo, estado_pago) VALUES (?, ?, ?, ?, NOW(), ?, 'Pendiente')";
        bd.query(consulta, [id_vehiculo, id_usuario, tipo_evento, descripcion, costo || 0], (error) => {
            if (error) return res.status(500).json({ error: 'Error' });
            res.status(201).json({ mensaje: 'Evento registrado' });
        });
    });

    // PUT /:id/pagar — Solo admin puede marcar como pagado
    enrutador.put('/:id/pagar', verificarToken, soloAdmin, (req, res) => {
        bd.query("UPDATE eventos SET estado_pago = 'Pagado' WHERE id_evento = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: 'Error' });
            res.json({ mensaje: 'Reparación pagada' });
        });
    });

    return enrutador;
};