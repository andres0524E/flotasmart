const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

enrutador.get('/', (req, res) => {
    const consulta = 'SELECT * FROM vehiculos';
    bd.query(consulta, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al obtener vehículos' });
        res.json(resultados);
    });
});

enrutador.post('/', (req, res) => {
    const { placa, marca, modelo, anio, estado_actual, capacidad_tanque } = req.body;
    const consulta = 'INSERT INTO vehiculos (placa, marca, modelo, anio, estado_actual, capacidad_tanque) VALUES (?, ?, ?, ?, ?, ?)';
    
    bd.query(consulta, [placa, marca, modelo, anio, estado_actual || 'Activo', capacidad_tanque || 50], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al crear vehículo' });
        res.status(201).json({ mensaje: 'Vehículo creado exitosamente', id: resultados.insertId });
    });
});

enrutador.put('/:id/mantenimiento', (req, res) => {
    bd.query("UPDATE vehiculos SET estado_actual = 'En mantenimiento' WHERE id_vehiculo = ?", [req.params.id], (error) => {
        if (error) return res.status(500).json({ error: 'Error al actualizar' });
        res.json({ mensaje: 'Enviado al taller' });
    });
});

enrutador.put('/:id/liberar', (req, res) => {
    bd.query("UPDATE vehiculos SET estado_actual = 'Activo' WHERE id_vehiculo = ?", [req.params.id], (error) => {
        if (error) return res.status(500).json({ error: 'Error al liberar' });
        res.json({ mensaje: 'Vehículo activo' });
    });
});

enrutador.put('/:id/ruta', (req, res) => {
    bd.query("UPDATE vehiculos SET estado_actual = 'En Ruta' WHERE id_vehiculo = ?", [req.params.id], (error) => {
        if (error) return res.status(500).json({ error: 'Error al actualizar a En Ruta' });
        res.json({ mensaje: 'Vehículo en ruta' });
    });
});

enrutador.put('/:id/retorno', (req, res) => {
    const { id } = req.params;
    const { kilometraje, nivel_combustible } = req.body;
    
    const consulta = "UPDATE vehiculos SET estado_actual = 'Activo', kilometraje = ?, nivel_combustible = ? WHERE id_vehiculo = ?";
    bd.query(consulta, [kilometraje, nivel_combustible, id], (error) => {
        if (error) return res.status(500).json({ error: 'Error al registrar retorno' });
        res.json({ mensaje: 'Vehículo retornado' });
    });
});

module.exports = enrutador;