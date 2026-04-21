const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

// 1. Obtener todos los vehículos
enrutador.get('/', (req, res) => {
    const consulta = 'select * from vehiculos';
    bd.query(consulta, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'error al consultar' });
        res.json(resultados);
    });
});

// 2. NUEVO: Obtener el Top 3 de vehículos con más fallas
enrutador.get('/ranking/fallas', (req, res) => {
    const consulta = `
        SELECT v.marca, v.modelo, v.placa, COUNT(e.id_evento) as total_fallas
        FROM vehiculos v
        JOIN eventos e ON v.id_vehiculo = e.id_vehiculo
        WHERE e.tipo_evento LIKE '%falla%' OR e.tipo_evento LIKE '%mantenimiento%' OR e.tipo_evento LIKE '%accidente%'
        GROUP BY v.id_vehiculo
        ORDER BY total_fallas DESC
        LIMIT 3
    `;
    bd.query(consulta, (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al consultar ranking' });
        res.json(resultados);
    });
});

// 3. Crear vehículo
enrutador.post('/', (req, res) => {
    const { placa, marca, modelo, anio } = req.body;
    const consulta = 'insert into vehiculos (placa, marca, modelo, anio, estado_actual) values (?, ?, ?, ?, ?)';
    
    bd.query(consulta, [placa, marca, modelo, anio, 'activo'], (error, resultados) => {
        if (error) {
            if (error.code === 'er_dup_entry') return res.status(400).json({ error: 'la placa ya existe' });
            return res.status(500).json({ error: 'error al guardar' });
        }
        res.status(201).json({ mensaje: 'vehiculo guardado', id: resultados.insertId });
    });
});

// 4. Liberar del taller
enrutador.put('/:id/liberar', (req, res) => {
    const { id } = req.params;
    const consulta = "update vehiculos set estado_actual = 'activo' where id_vehiculo = ?";
    
    bd.query(consulta, [id], (error) => {
        if (error) return res.status(500).json({ error: 'Error al actualizar el estado' });
        res.json({ mensaje: 'Vehículo liberado con éxito' });
    });
});

module.exports = enrutador;