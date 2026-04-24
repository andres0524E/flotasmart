const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

enrutador.get('/', (req, res) => {
    bd.query('SELECT * FROM vehiculos', (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error' });
        res.json(resultados);
    });
});

// 🔥 AQUÍ ESTÁ LA CORRECCIÓN DE LOS SEGUROS Y MANTENIMIENTO
enrutador.post('/', (req, res) => {
    const { placa, marca, modelo, anio, estado_actual, capacidad_tanque, km_proximo_servicio, fecha_seguro } = req.body;
    
    const consulta = 'INSERT INTO vehiculos (placa, marca, modelo, anio, estado_actual, capacidad_tanque, km_proximo_servicio, fecha_seguro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    bd.query(consulta, [placa, marca, modelo, anio, estado_actual || 'Activo', capacidad_tanque || 50, km_proximo_servicio || null, fecha_seguro || null], (error, resultados) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Error al crear vehículo' });
        }
        res.status(201).json({ mensaje: 'Vehículo creado', id: resultados.insertId });
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

enrutador.put('/:id/bloquear', (req, res) => {
    bd.query("UPDATE vehiculos SET estado_actual = 'Bloqueado' WHERE id_vehiculo = ?", [req.params.id], (e) => res.json({ msg: 'Ok' }));
});

enrutador.put('/:id/tanque', (req, res) => {
    bd.query("UPDATE vehiculos SET capacidad_tanque = ? WHERE id_vehiculo = ?", [req.body.capacidad, req.params.id], (error) => {
        if (error) return res.status(500).json({ error: 'Error' });
        res.json({ mensaje: 'Capacidad actualizada' });
    });
});

module.exports = enrutador;