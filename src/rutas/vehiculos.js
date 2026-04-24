const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

// 1. Obtener todos los vehículos
enrutador.get('/', (req, res) => {
    const consulta = 'SELECT * FROM vehiculos';
    bd.query(consulta, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al obtener vehículos' });
        res.json(resultados);
    });
});

// 2. Registrar un nuevo vehículo
enrutador.post('/', (req, res) => {
    const { placa, marca, modelo, anio, estado_actual } = req.body;
    const consulta = 'INSERT INTO vehiculos (placa, marca, modelo, anio, estado_actual) VALUES (?, ?, ?, ?, ?)';
    
    bd.query(consulta, [placa, marca, modelo, anio, estado_actual || 'Activo'], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al crear vehículo' });
        res.status(201).json({ mensaje: 'Vehículo creado exitosamente', id: resultados.insertId });
    });
});

// 3. Poner vehículo "En Mantenimiento" (Reportar falla)
enrutador.put('/:id/mantenimiento', (req, res) => {
    const { id } = req.params;
    const consulta = "UPDATE vehiculos SET estado_actual = 'En mantenimiento' WHERE id_vehiculo = ?";
    
    bd.query(consulta, [id], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al actualizar el estado' });
        res.json({ mensaje: 'Vehículo enviado al taller' });
    });
});

// 4. Liberar vehículo del taller (Poner 'Activo')
enrutador.put('/:id/liberar', (req, res) => {
    const { id } = req.params;
    const consulta = "UPDATE vehiculos SET estado_actual = 'Activo' WHERE id_vehiculo = ?";
    
    bd.query(consulta, [id], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al liberar el vehículo' });
        res.json({ mensaje: 'Vehículo activo y disponible' });
    });
});

// 5. Aprobar salida del vehículo (Poner 'En Ruta')
enrutador.put('/:id/ruta', (req, res) => {
    const { id } = req.params;
    const consulta = "UPDATE vehiculos SET estado_actual = 'En Ruta' WHERE id_vehiculo = ?";
    
    bd.query(consulta, [id], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al actualizar a En Ruta' });
        res.json({ mensaje: 'Vehículo en ruta autorizado' });
    });
});

module.exports = enrutador;