const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

// 🔥 1. LEER TODOS LOS EVENTOS (Para el Top Fallas y costo de reparaciones)
enrutador.get('/', (req, res) => {
    const consulta = 'SELECT * FROM eventos';
    bd.query(consulta, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al obtener eventos' });
        res.json(resultados);
    });
});

// 2. REGISTRAR UNA NUEVA FALLA O EVENTO
enrutador.post('/', (req, res) => {
    const { id_vehiculo, tipo_evento, descripcion, costo } = req.body;
    const consulta = 'INSERT INTO eventos (id_vehiculo, tipo_evento, descripcion, fecha_evento, costo) VALUES (?, ?, ?, NOW(), ?)';
    
    bd.query(consulta, [id_vehiculo, tipo_evento, descripcion, costo || 0], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al guardar el evento' });
        res.status(201).json({ mensaje: 'Evento registrado exitosamente', id: resultados.insertId });
    });
});

module.exports = enrutador;