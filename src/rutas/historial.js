const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

enrutador.get('/:id', (req, res) => {
    const { id } = req.params;
    
    // Buscamos en eventos (fallas)
    bd.query('SELECT fecha_evento AS fecha, tipo_evento AS actividad, descripcion AS detalles FROM eventos WHERE id_vehiculo = ?', [id], (err1, eventos) => {
        // Buscamos en gasolina
        bd.query('SELECT fecha AS fecha, "Carga de Combustible" AS actividad, CONCAT(litros, " Litros - Costo: $", costo_total) AS detalles FROM registros_gasolina WHERE id_vehiculo = ?', [id], (err2, gasolina) => {
            
            let historialCompleto = [];
            if(eventos && !err1) historialCompleto = historialCompleto.concat(eventos);
            if(gasolina && !err2) historialCompleto = historialCompleto.concat(gasolina);
            
            // Ordenamos por fecha (del más nuevo al más viejo)
            historialCompleto.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            
            res.json(historialCompleto);
        });
    });
});

module.exports = enrutador;