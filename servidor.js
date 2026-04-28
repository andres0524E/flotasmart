const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const bd = require('./src/bd/conexion');
const app = express();

// ==========================================
// SEGURIDAD: Cabeceras HTTP (Helmet)
// ==========================================
app.use(helmet());

// ==========================================
// SEGURIDAD: CORS restringido a tu frontend
// En .env pon: FRONTEND_URL=https://tu-dominio.com
// ==========================================
const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost')
    .split(',').map(o => o.trim());

app.use(cors({
    origin: function (origin, callback) {
        if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
        if (origenesPermitidos.includes(origin)) return callback(null, true);
        callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true
}));

app.use(express.json());

// ==========================================
// SEGURIDAD: Rate limiting en login
// Máximo 10 intentos por IP cada 15 min
// ==========================================
const limiterLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Espera 15 minutos.' }
});

// ==========================================
// MIDDLEWARE: Verificar JWT
// Uso: agregar verificarToken antes del handler
// ==========================================
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
        req.usuario = usuario;
        next();
    });
}

// ==========================================
// MIDDLEWARE: Solo admins (usar después de verificarToken)
// ==========================================
function soloAdmin(req, res, next) {
    if (req.usuario?.rol !== 'admin') {
        return res.status(403).json({ error: 'Acción solo permitida para administradores' });
    }
    next();
}

// Compartir middlewares con las rutas
app.set('verificarToken', verificarToken);
app.set('soloAdmin', soloAdmin);

// ==========================================
// RUTAS
// ==========================================
const rutasVehiculos = require('./src/rutas/vehiculos');
const rutasEventos   = require('./src/rutas/eventos');
const rutasUsos      = require('./src/rutas/usos');
const rutasGasolina  = require('./src/rutas/gasolina');
const rutasHistorial = require('./src/rutas/historial');
const rutasRegistro  = require('./src/rutas/registro');

app.use('/api/vehiculos', rutasVehiculos(app));
app.use('/api/eventos',   rutasEventos(app));
app.use('/api/usos',      rutasUsos(app));
app.use('/api/gasolina',  rutasGasolina(app));
app.use('/api/historial', verificarToken, rutasHistorial);
app.use('/api/registro',  rutasRegistro(app));

// ==========================================
// LOGIN — Devuelve JWT (pública, con rate limit)
// ==========================================
app.post('/api/login', limiterLogin, (req, res) => {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

    bd.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (error, resultados) => {
        if (error) return res.status(500).json({ error: 'Error en la base de datos' });

        if (resultados.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });

        const usuario = resultados[0];
        const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!coincide) return res.status(401).json({ error: 'Credenciales incorrectas' });

        const payload = { id_usuario: usuario.id_usuario, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({ mensaje: 'Login exitoso', token, usuario: payload });
    });
});

app.post('/api/logout', verificarToken, (req, res) => {
    res.json({ mensaje: 'Sesión cerrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Servidor en puerto ${PORT}`); });