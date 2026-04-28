const express = require('express');
const bd = require('../bd/conexion');

// Recibe `app` para acceder a los middlewares de seguridad
module.exports = function(app) {
    const enrutador = express.Router();
    const verificarToken = app.get('verificarToken');
    const soloAdmin      = app.get('soloAdmin');

    // GET / — Cualquier usuario autenticado puede ver los vehículos
    enrutador.get('/', verificarToken, (req, res) => {
        bd.query('SELECT * FROM vehiculos', (error, resultados) => {
            if (error) return res.status(500).json({ error: 'Error' });
            res.json(resultados);
        });
    });

    // POST / — Solo admin puede registrar vehículos
    enrutador.post('/', verificarToken, soloAdmin, (req, res) => {
        const { placa, marca, modelo, anio, estado_actual, capacidad_tanque, km_proximo_servicio, fecha_seguro } = req.body;
        const consulta = 'INSERT INTO vehiculos (placa, marca, modelo, anio, estado_actual, capacidad_tanque, km_proximo_servicio, fecha_seguro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        bd.query(consulta, [placa, marca, modelo, anio, estado_actual || 'Activo', capacidad_tanque || 50, km_proximo_servicio || null, fecha_seguro || null], (error, resultados) => {
            if (error) { console.error(error); return res.status(500).json({ error: 'Error al crear vehículo' }); }
            res.status(201).json({ mensaje: 'Vehículo creado', id: resultados.insertId });
        });
    });

    // PUT /:id/mantenimiento — Admin y mecánico
    enrutador.put('/:id/mantenimiento', verificarToken, (req, res) => {
        const rol = req.usuario.rol;
        if (rol !== 'admin' && rol !== 'mecanico') return res.status(403).json({ error: 'No autorizado' });
        bd.query("UPDATE vehiculos SET estado_actual = 'En mantenimiento' WHERE id_vehiculo = ?", [req.params.id], (e) => res.json({ msg: 'Ok' }));
    });

    // PUT /:id/liberar — Admin y mecánico
    enrutador.put('/:id/liberar', verificarToken, (req, res) => {
        const rol = req.usuario.rol;
        if (rol !== 'admin' && rol !== 'mecanico') return res.status(403).json({ error: 'No autorizado' });
        bd.query("UPDATE vehiculos SET estado_actual = 'Activo' WHERE id_vehiculo = ?", [req.params.id], (e) => res.json({ msg: 'Ok' }));
    });

    enrutador.put('/:id/ruta', verificarToken, (req, res) => {
        bd.query("UPDATE vehiculos SET estado_actual = 'En Ruta' WHERE id_vehiculo = ?", [req.params.id], (e) => res.json({ msg: 'Ok' }));
    });

    enrutador.put('/:id/retorno', verificarToken, (req, res) => {
        const { kilometraje, nivel_combustible } = req.body;
        bd.query("UPDATE vehiculos SET estado_actual = 'Activo', kilometraje = ?, nivel_combustible = ? WHERE id_vehiculo = ?",
            [kilometraje, nivel_combustible, req.params.id], (e) => res.json({ msg: 'Ok' }));
    });

    // PUT /:id/bloquear — Solo admin
    enrutador.put('/:id/bloquear', verificarToken, soloAdmin, (req, res) => {
        bd.query("UPDATE vehiculos SET estado_actual = 'Bloqueado' WHERE id_vehiculo = ?", [req.params.id], (e) => res.json({ msg: 'Ok' }));
    });

    // PUT /:id/tanque — Solo admin
    enrutador.put('/:id/tanque', verificarToken, soloAdmin, (req, res) => {
        bd.query("UPDATE vehiculos SET capacidad_tanque = ? WHERE id_vehiculo = ?", [req.body.capacidad, req.params.id], (error) => {
            if (error) return res.status(500).json({ error: 'Error' });
            res.json({ mensaje: 'Capacidad actualizada' });
        });
    });

    return enrutador;
};