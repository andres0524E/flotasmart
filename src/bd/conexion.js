const mysql = require('mysql2');

const pool_conexiones = mysql.createPool({
    host: '82.197.82.142', // tu ip de hostinger
    user: 'u858068531_andresj',
    password: 'AJCa5z4h2e1', // ¡recuerda poner tu contraseña!
    database: 'u858068531_autosdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool_conexiones.getConnection((error, conexion) => {
    if (error) {
        console.error('❌ error al conectar a hostinger:', error.message);
        return;
    }
    console.log('✅ ¡conectado exitosamente al pool de la base de datos autosdb!');
    conexion.release(); 
});

module.exports = pool_conexiones;