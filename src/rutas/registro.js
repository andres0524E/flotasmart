const express = require('express');
const bd = require('../bd/conexion');
const bcrypt = require('bcrypt');

module.exports = function(app) {
    const enrutador = express.Router();
    const verificarToken = app.get('verificarToken');
    const soloAdmin      = app.get('soloAdmin');

    // POST / — Crear solicitud de registro (pública, sin auth)
    enrutador.post('/', async (req, res) => {
        const { nombre, departamento, correo, contrasena, rol_solicitado } = req.body;
        if (!nombre || !departamento || !correo || !contrasena || !rol_solicitado)
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });

        const rolesPermitidos = ['chofer', 'mecanico'];
        if (!rolesPermitidos.includes(rol_solicitado))
            return res.status(400).json({ error: 'Rol no permitido en auto-registro' });

        bd.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo], async (err, existentes) => {
            if (err) return res.status(500).json({ error: 'Error en base de datos' });
            if (existentes.length > 0) return res.status(409).json({ error: 'Este correo ya está registrado' });

            bd.query('SELECT id_solicitud FROM solicitudes_registro WHERE correo = ? AND estado = "pendiente"', [correo], async (err2, pendientes) => {
                if (err2) return res.status(500).json({ error: 'Error en base de datos' });
                if (pendientes.length > 0) return res.status(409).json({ error: 'Ya existe una solicitud pendiente con este correo' });

                try {
                    const hash = await bcrypt.hash(contrasena, 12);
                    const consulta = 'INSERT INTO solicitudes_registro (nombre, departamento, correo, contrasena_hash, rol_solicitado, estado, fecha_solicitud) VALUES (?, ?, ?, ?, ?, "pendiente", NOW())';
                    bd.query(consulta, [nombre.trim(), departamento.trim(), correo.trim(), hash, rol_solicitado], (err3) => {
                        if (err3) return res.status(500).json({ error: 'Error al guardar solicitud' });
                        res.status(201).json({ mensaje: 'Solicitud enviada. El administrador la revisará próximamente.' });
                    });
                } catch (e) {
                    res.status(500).json({ error: 'Error al procesar contraseña' });
                }
            });
        });
    });

    // GET /pendientes — Solo admin
    enrutador.get('/pendientes', verificarToken, soloAdmin, (req, res) => {
        bd.query('SELECT * FROM solicitudes_registro WHERE estado = "pendiente" ORDER BY fecha_solicitud DESC', (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en base de datos' });
            res.json(resultados);
        });
    });

    // GET /conteo — Solo admin
    enrutador.get('/conteo', verificarToken, soloAdmin, (req, res) => {
        bd.query('SELECT COUNT(*) AS total FROM solicitudes_registro WHERE estado = "pendiente"', (err, resultado) => {
            if (err) return res.status(500).json({ error: 'Error' });
            res.json({ total: resultado[0].total });
        });
    });

    // PUT /:id/aprobar — Solo admin
    // SEGURIDAD: el rol del admin se verifica por JWT, ya NO por contraseña en el body
    enrutador.put('/:id/aprobar', verificarToken, soloAdmin, async (req, res) => {
        const { rol_final } = req.body;
        const idSolicitud = req.params.id;

        bd.query('SELECT * FROM solicitudes_registro WHERE id_solicitud = ? AND estado = "pendiente"', [idSolicitud], (err2, solicitudes) => {
            if (err2) return res.status(500).json({ error: 'Error de base de datos' });
            if (solicitudes.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });

            const sol = solicitudes[0];
            const rolAsignado = (rol_final === 'admin') ? 'admin' : sol.rol_solicitado;

            bd.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [sol.correo], (err3, yaRegistrado) => {
                if (err3) return res.status(500).json({ error: 'Error de base de datos' });
                if (yaRegistrado.length > 0) {
                    bd.query('UPDATE solicitudes_registro SET estado = "rechazado" WHERE id_solicitud = ?', [idSolicitud], () => {});
                    return res.status(409).json({ error: 'El correo ya fue registrado' });
                }

                const insertQ = 'INSERT INTO usuarios (nombre, departamento, correo, contrasena, rol, fecha_registro) VALUES (?, ?, ?, ?, ?, NOW())';
                bd.query(insertQ, [sol.nombre, sol.departamento, sol.correo, sol.contrasena_hash, rolAsignado], (err4) => {
                    if (err4) return res.status(500).json({ error: 'Error al crear usuario' });
                    bd.query('UPDATE solicitudes_registro SET estado = "aprobado", fecha_respuesta = NOW() WHERE id_solicitud = ?', [idSolicitud], () => {});
                    res.json({ mensaje: `Usuario aprobado con rol: ${rolAsignado}` });
                });
            });
        });
    });

    // PUT /:id/rechazar — Solo admin
    enrutador.put('/:id/rechazar', verificarToken, soloAdmin, (req, res) => {
        bd.query('UPDATE solicitudes_registro SET estado = "rechazado", fecha_respuesta = NOW() WHERE id_solicitud = ? AND estado = "pendiente"', [req.params.id], (err, resultado) => {
            if (err) return res.status(500).json({ error: 'Error de base de datos' });
            if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
            res.json({ mensaje: 'Solicitud rechazada' });
        });
    });

    return enrutador;
};