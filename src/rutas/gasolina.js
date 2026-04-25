const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

enrutador.get('/', (req, res) => {
    const consulta = 'SELECT * FROM registros_gasolina';
    bd.query(consulta, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error' });
        res.json(resultados);
    });
});

enrutador.post('/', (req, res) => {
    const { id_vehiculo, litros, costo_total, kilometraje, id_usuario } = req.body;
    const consulta = "INSERT INTO registros_gasolina (id_vehiculo, id_usuario, litros, costo_total, kilometraje, estado_pago) VALUES (?, ?, ?, ?, ?, 'Pendiente')";
    
    bd.query(consulta, [id_vehiculo, id_usuario || null, litros, costo_total, kilometraje], (err) => {
        if (err) return res.status(500).json({ error: 'Error' });
        res.status(201).json({ mensaje: 'Carga registrada como pendiente' });
    });
});

// 🔥 NUEVA RUTA: Saldar deuda de gasolina
enrutador.put('/:id/pagar', (req, res) => {
    bd.query("UPDATE registros_gasolina SET estado_pago = 'Pagado' WHERE id_gasolina = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Error' });
        res.json({ mensaje: 'Deuda saldada' });
    });
});

module.exports = enrutador;