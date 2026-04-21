const express = require('express');
const enrutador = express.Router();
const bd = require('../bd/conexion');

// 1. Crear Salida (Lógica Inteligente por Rol)
enrutador.post('/', (req, res) => {
    const { id_vehiculo, id_usuario, proposito, kilometraje_salida, rol } = req.body;
    
    // Si es admin pasa directo, si es empleado se queda en pausa
    const nuevo_estado = (rol === 'administrador') ? 'en uso' : 'pendiente';

    const consulta = 'INSERT INTO historial_uso (id_vehiculo, id_usuario, proposito, fecha_salida, kilometraje_salida) VALUES (?, ?, ?, NOW(), ?)';
    
    bd.query(consulta, [id_vehiculo, id_usuario, proposito, kilometraje_salida], (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error al registrar salida' });
        
        bd.query("UPDATE vehiculos SET estado_actual = ? WHERE id_vehiculo = ?", [nuevo_estado, id_vehiculo], (err) => {
            if (err) console.error(err);
            res.status(201).json({ mensaje: 'Procesado correctamente', estado: nuevo_estado });
        });
    });
});

// 2. APROBAR SALIDA (Solo Admin)
enrutador.put('/:id/aprobar', (req, res) => {
    bd.query("UPDATE vehiculos SET estado_actual = 'en uso' WHERE id_vehiculo = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Error al aprobar' });
        res.json({ mensaje: 'Salida Aprobada' });
    });
});

// 3. RECHAZAR SALIDA (Solo Admin)
enrutador.delete('/:id/rechazar', (req, res) => {
    const id = req.params.id;
    // Borramos el registro pendiente (el último viaje sin retorno de ese auto)
    bd.query("DELETE FROM historial_uso WHERE id_vehiculo = ? AND fecha_retorno IS NULL ORDER BY fecha_salida DESC LIMIT 1", [id], (err) => {
        if (err) return res.status(500).json({ error: 'Error al rechazar' });
        // Devolvemos el auto a "activo"
        bd.query("UPDATE vehiculos SET estado_actual = 'activo' WHERE id_vehiculo = ?", [id], (err2) => {
            res.json({ mensaje: 'Salida Rechazada' });
        });
    });
});

// 4. Registrar Retorno (Ya lo teníamos)
enrutador.put('/:id_vehiculo/retorno', (req, res) => {
    const { id_vehiculo } = req.params;
    const { kilometraje_retorno } = req.body;

    const consulta_retorno = `
        UPDATE historial_uso 
        SET fecha_retorno = NOW(), kilometraje_retorno = ? 
        WHERE id_vehiculo = ? AND fecha_retorno IS NULL 
        ORDER BY fecha_salida DESC LIMIT 1
    `;

    bd.query(consulta_retorno, [kilometraje_retorno, id_vehiculo], (error) => {
        if (error) return res.status(500).json({ error: 'Error al registrar retorno' });
        bd.query("UPDATE vehiculos SET estado_actual = 'activo' WHERE id_vehiculo = ?", [id_vehiculo], (err) => {
            res.json({ mensaje: 'Retorno registrado' });
        });
    });
});

module.exports = enrutador;