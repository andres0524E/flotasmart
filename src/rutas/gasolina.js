const express = require('express');
const bd = require('../bd/conexion');

module.exports = function(app) {
    const enrutador = express.Router();
    const verificarToken = app.get('verificarToken');
    const soloAdmin      = app.get('soloAdmin');

    // GET / — Solo admin ve todos los registros
    enrutador.get('/', verificarToken, soloAdmin, (req, res) => {
        bd.query('SELECT * FROM registros_gasolina', (error, resultados) => {
            if (error) return res.status(500).json({ error: 'Error' });
            res.json(resultados);
        });
    });

    // POST / — Cualquier usuario autenticado puede cargar gasolina
    enrutador.post('/', verificarToken, (req, res) => {
        const { id_vehiculo, litros, costo_total, kilometraje } = req.body;
        const id_usuario = req.usuario.id_usuario; // Del token, no del body
        const consulta = "INSERT INTO registros_gasolina (id_vehiculo, id_usuario, litros, costo_total, kilometraje, estado_pago) VALUES (?, ?, ?, ?, ?, 'Pendiente')";
        bd.query(consulta, [id_vehiculo, id_usuario, litros, costo_total, kilometraje], (err) => {
            if (err) return res.status(500).json({ error: 'Error' });
            res.status(201).json({ mensaje: 'Carga registrada como pendiente' });
        });
    });

    // PUT /:id/pagar — Solo admin
    enrutador.put('/:id/pagar', verificarToken, soloAdmin, (req, res) => {
        bd.query("UPDATE registros_gasolina SET estado_pago = 'Pagado' WHERE id_gasolina = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: 'Error' });
            res.json({ mensaje: 'Deuda saldada' });
        });
    });

    return enrutador;
};