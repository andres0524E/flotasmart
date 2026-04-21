const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

enrutador.get('/:id', (req, res) => {
    const { id } = req.params;

    const consultaViajes = `
        SELECT 
            h.fecha_salida AS fecha, 
            concat('Viaje: ', h.proposito) AS actividad, 
            concat('Operador: ', u.nombre, ' | Salida: ', h.kilometraje_salida, ' km', IFNULL(concat(' | Regreso: ', h.kilometraje_retorno, ' km'), ' | 📍 (En Ruta)')) AS detalle 
        FROM historial_uso h
        JOIN usuarios u ON h.id_usuario = u.id_usuario
        WHERE h.id_vehiculo = ?
    `;
    
    // Agregamos la causa_raiz al detalle visual del historial
    const consultaEventos = `
        SELECT 
            fecha_evento AS fecha, 
            tipo_evento AS actividad, 
            concat('Motivo: ', descripcion, ' | Causa Raíz: ', IFNULL(causa_raiz, 'No especificada')) AS detalle 
        FROM eventos 
        WHERE id_vehiculo = ?
    `;

    bd.query(consultaViajes, [id], (errorViajes, viajes) => {
        if (errorViajes) return res.status(500).json({ error: 'Error al consultar viajes' });
        
        bd.query(consultaEventos, [id], (errorEventos, eventos) => {
            if (errorEventos) return res.status(500).json({ error: 'Error al consultar eventos' });
            
            const historialCompleto = [...viajes, ...eventos];
            historialCompleto.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            res.json(historialCompleto);
        });
    });
});

module.exports = enrutador;