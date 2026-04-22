document.getElementById('formulario-login').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitamos que la página se recargue
    
    const correo = document.getElementById('login-correo').value;
    const contrasena = document.getElementById('login-contrasena').value;
    const div_error = document.getElementById('mensaje-error');

    // Ocultamos el mensaje de error por si estaba visible de un intento anterior
    div_error.classList.add('d-none');

    try {
        // Le tocamos la puerta a nuestro "cadenero" en el backend
// Asegúrate de que el fetch apunte a Render y no al servidor local
        const res = await fetch('https://flotasmart-backend.onrender.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            // ¡Éxito! Guardamos los datos del usuario en la memoria del navegador
            localStorage.setItem('usuarioFlota', JSON.stringify(datos.usuario));
            
            // Lo redirigimos automáticamente a nuestro panel principal
            window.location.href = '/index.html';
        } else {
            // Si el backend dice que las credenciales están mal, mostramos el error
            div_error.textContent = datos.error;
            div_error.classList.remove('d-none');
        }
    } catch (error) {
        div_error.textContent = 'Error al conectar con el servidor. Intenta de nuevo.';
        div_error.classList.remove('d-none');
    }
});