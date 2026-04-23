const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

// Ruta para registrar carga de gasolina
enrutador.post('/', (req, res) => {
    const { id_vehiculo, litros, costo_total, kilometraje } = req.body;
    
    if (!id_vehiculo || !litros || !costo_total || !kilometraje) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    const consulta = 'INSERT INTO registros_gasolina (id_vehiculo, litros, costo_total, kilometraje) VALUES (?, ?, ?, ?)';
    
    bd.query(consulta, [id_vehiculo, litros, costo_total, kilometraje], (err, result) => {
        if (err) {
            console.error("Error al guardar gasolina:", err);
            return res.status(500).json({ error: 'Error al registrar combustible' });
        }
        res.status(201).json({ mensaje: 'Carga de combustible registrada' });
    });
});

module.exports = enrutador;