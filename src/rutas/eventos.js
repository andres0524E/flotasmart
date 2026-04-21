const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

enrutador.post('/', (req, res) => {
    // Agregamos causa_raiz a los datos que recibimos
    const { id_vehiculo, tipo_evento, descripcion, costo, causa_raiz } = req.body;
    
    const consulta_evento = 'INSERT INTO eventos (id_vehiculo, tipo_evento, descripcion, causa_raiz, fecha_evento, costo) VALUES (?, ?, ?, ?, NOW(), ?)';
    
    bd.query(consulta_evento, [id_vehiculo, tipo_evento, descripcion, causa_raiz, costo], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al guardar evento' });
        
        const tipo_normalizado = tipo_evento.toLowerCase();
        
        if (tipo_normalizado.includes('falla') || tipo_normalizado.includes('mantenimiento') || tipo_normalizado.includes('accidente')) {
            bd.query("UPDATE vehiculos SET estado_actual = 'en mantenimiento' WHERE id_vehiculo = ?", [id_vehiculo], (err_estado) => {
                if (err_estado) console.error(err_estado);
                return res.status(201).json({ mensaje: 'Evento registrado y auto en taller', id: resultados.insertId });
            });
        } else {
            return res.status(201).json({ mensaje: 'Evento registrado', id: resultados.insertId });
        }
    });
});

module.exports = enrutador;