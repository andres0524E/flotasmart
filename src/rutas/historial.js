const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

enrutador.get('/:id', (req, res) => {
    const { id } = req.params;
    
    // Eventos con nombre/correo del empleado que lo reportó
    const qEventos = `
        SELECT 
            e.fecha_evento AS fecha, 
            e.tipo_evento AS actividad, 
            e.descripcion AS detalles,
            u.nombre AS nombre_empleado,
            u.correo AS correo_empleado
        FROM eventos e
        LEFT JOIN usuarios u ON e.id_usuario = u.id_usuario
        WHERE e.id_vehiculo = ?
    `;

    // Gasolina con nombre/correo del que la registró
    const qGasolina = `
        SELECT 
            rg.fecha AS fecha, 
            'Carga de Combustible' AS actividad, 
            CONCAT(rg.litros, ' Litros - Costo: $', rg.costo_total) AS detalles,
            u.nombre AS nombre_empleado,
            u.correo AS correo_empleado
        FROM registros_gasolina rg
        LEFT JOIN usuarios u ON rg.id_usuario = u.id_usuario
        WHERE rg.id_vehiculo = ?
    `;

    // Historial de uso con quién tomó el vehículo
    const qUsos = `
        SELECT 
            hu.fecha_salida AS fecha, 
            CONCAT('Salida: ', hu.proposito) AS actividad,
            CONCAT('Km salida: ', COALESCE(hu.kilometraje_salida, '-'),
                   IF(hu.fecha_retorno IS NOT NULL, CONCAT(' | Retorno: ', hu.kilometraje_retorno, ' km'), ' | En ruta')) AS detalles,
            u.nombre AS nombre_empleado,
            u.correo AS correo_empleado
        FROM historial_uso hu
        LEFT JOIN usuarios u ON hu.id_usuario = u.id_usuario
        WHERE hu.id_vehiculo = ?
    `;

    bd.query(qEventos, [id], (err1, eventos) => {
        bd.query(qGasolina, [id], (err2, gasolina) => {
            bd.query(qUsos, [id], (err3, usos) => {
                let historialCompleto = [];
                if (eventos && !err1) historialCompleto = historialCompleto.concat(eventos);
                if (gasolina && !err2) historialCompleto = historialCompleto.concat(gasolina);
                if (usos && !err3) historialCompleto = historialCompleto.concat(usos);
                historialCompleto.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                res.json(historialCompleto);
            });
        });
    });
});

module.exports = enrutador;