const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

enrutador.get('/', (req, res) => {
    bd.query('SELECT * FROM vehiculos', (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error' });
        res.json(resultados);
    });
});

enrutador.post('/', (req, res) => {
    const { placa, marca, modelo, anio, estado_actual, capacidad_tanque } = req.body;
    bd.query('INSERT INTO vehiculos (placa, marca, modelo, anio, estado_actual, capacidad_tanque) VALUES (?, ?, ?, ?, ?, ?)', 
    [placa, marca, modelo, anio, estado_actual || 'Activo', capacidad_tanque || 50], (error) => {
        if (error) return res.status(500).json({ error: 'Error' });
        res.status(201).json({ mensaje: 'Creado' });
    });
});

enrutador.put('/:id/mantenimiento', (req, res) => {
    bd.query("UPDATE vehiculos SET estado_actual = 'En mantenimiento' WHERE id_vehiculo = ?", [req.params.id], (e) => res.json({ msg: 'Ok' }));
});

enrutador.put('/:id/liberar', (req, res) => {
    bd.query("UPDATE vehiculos SET estado_actual = 'Activo' WHERE id_vehiculo = ?", [req.params.id], (e) => res.json({ msg: 'Ok' }));
});

enrutador.put('/:id/ruta', (req, res) => {
    bd.query("UPDATE vehiculos SET estado_actual = 'En Ruta' WHERE id_vehiculo = ?", [req.params.id], (e) => res.json({ msg: 'Ok' }));
});

enrutador.put('/:id/retorno', (req, res) => {
    const { kilometraje, nivel_combustible } = req.body;
    bd.query("UPDATE vehiculos SET estado_actual = 'Activo', kilometraje = ?, nivel_combustible = ? WHERE id_vehiculo = ?", 
    [kilometraje, nivel_combustible, req.params.id], (e) => res.json({ msg: 'Ok' }));
});

// 🔥 NUEVA RUTA PARA EDITAR EL TANQUE MANUALMENTE
enrutador.put('/:id/tanque', (req, res) => {
    bd.query("UPDATE vehiculos SET capacidad_tanque = ? WHERE id_vehiculo = ?", [req.body.capacidad, req.params.id], (error) => {
        if (error) return res.status(500).json({ error: 'Error' });
        res.json({ mensaje: 'Capacidad actualizada' });
    });
});

module.exports = enrutador;