const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

enrutador.get('/', (req, res) => {
    const consulta = 'SELECT * FROM eventos';
    bd.query(consulta, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error' });
        res.json(resultados);
    });
});

enrutador.post('/', (req, res) => {
    const { id_vehiculo, tipo_evento, descripcion, costo } = req.body;
    const consulta = "INSERT INTO eventos (id_vehiculo, tipo_evento, descripcion, fecha_evento, costo, estado_pago) VALUES (?, ?, ?, NOW(), ?, 'Pendiente')";
    
    bd.query(consulta, [id_vehiculo, tipo_evento, descripcion, costo || 0], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error' });
        res.status(201).json({ mensaje: 'Evento registrado' });
    });
});

// 🔥 NUEVA RUTA: Saldar deuda de reparación
enrutador.put('/:id/pagar', (req, res) => {
    bd.query("UPDATE eventos SET estado_pago = 'Pagado' WHERE id_evento = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Error' });
        res.json({ mensaje: 'Reparación pagada' });
    });
});

module.exports = enrutador;