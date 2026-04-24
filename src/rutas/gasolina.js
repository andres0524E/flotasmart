const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

// 🔥 NUEVA RUTA GET (Esta es la que faltaba para que funcione el módulo financiero)
enrutador.get('/', (req, res) => {
    const consulta = 'SELECT * FROM registros_gasolina';
    bd.query(consulta, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al obtener registros de gasolina' });
        res.json(resultados);
    });
});

// Ruta para registrar carga de gasolina (POST)
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