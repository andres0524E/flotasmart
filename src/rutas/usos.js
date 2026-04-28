const express = require('express');
const bd = require('../bd/conexion');

module.exports = function(app) {
    const enrutador = express.Router();
    const verificarToken = app.get('verificarToken');
    const soloAdmin      = app.get('soloAdmin');

    // POST / — Crear salida (cualquier usuario autenticado)
    enrutador.post('/', verificarToken, (req, res) => {
        const { id_vehiculo, proposito, kilometraje_salida } = req.body;
        const id_usuario = req.usuario.id_usuario; // Del token
        const rol        = req.usuario.rol;

        const nuevo_estado = (rol === 'admin') ? 'en uso' : 'pendiente';
        const consulta = 'INSERT INTO historial_uso (id_vehiculo, id_usuario, proposito, fecha_salida, kilometraje_salida) VALUES (?, ?, ?, NOW(), ?)';

        bd.query(consulta, [id_vehiculo, id_usuario, proposito, kilometraje_salida], (error) => {
            if (error) return res.status(500).json({ error: 'Error al registrar salida' });
            bd.query("UPDATE vehiculos SET estado_actual = ? WHERE id_vehiculo = ?", [nuevo_estado, id_vehiculo], (err) => {
                if (err) console.error(err);
                res.status(201).json({ mensaje: 'Procesado correctamente', estado: nuevo_estado });
            });
        });
    });

    // PUT /:id/aprobar — Solo admin
    enrutador.put('/:id/aprobar', verificarToken, soloAdmin, (req, res) => {
        bd.query("UPDATE vehiculos SET estado_actual = 'en uso' WHERE id_vehiculo = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: 'Error al aprobar' });
            res.json({ mensaje: 'Salida Aprobada' });
        });
    });

    // DELETE /:id/rechazar — Solo admin
    enrutador.delete('/:id/rechazar', verificarToken, soloAdmin, (req, res) => {
        const id = req.params.id;
        bd.query("DELETE FROM historial_uso WHERE id_vehiculo = ? AND fecha_retorno IS NULL ORDER BY fecha_salida DESC LIMIT 1", [id], (err) => {
            if (err) return res.status(500).json({ error: 'Error al rechazar' });
            bd.query("UPDATE vehiculos SET estado_actual = 'activo' WHERE id_vehiculo = ?", [id], () => {
                res.json({ mensaje: 'Salida Rechazada' });
            });
        });
    });

    // PUT /:id_vehiculo/retorno — Cualquier usuario autenticado
    enrutador.put('/:id_vehiculo/retorno', verificarToken, (req, res) => {
        const { id_vehiculo } = req.params;
        const { kilometraje_retorno } = req.body;
        const consulta = `UPDATE historial_uso SET fecha_retorno = NOW(), kilometraje_retorno = ? WHERE id_vehiculo = ? AND fecha_retorno IS NULL ORDER BY fecha_salida DESC LIMIT 1`;
        bd.query(consulta, [kilometraje_retorno, id_vehiculo], (error) => {
            if (error) return res.status(500).json({ error: 'Error al registrar retorno' });
            bd.query("UPDATE vehiculos SET estado_actual = 'activo' WHERE id_vehiculo = ?", [id_vehiculo], () => {
                res.json({ mensaje: 'Retorno registrado' });
            });
        });
    });

    return enrutador;
};