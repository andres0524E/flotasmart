document.addEventListener('DOMContentLoaded', () => {
    // Buscamos el formulario por su ID exacto
    const formulario = document.getElementById('formulario-login');
    
    if(formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            // Buscamos las cajitas por su ID exacto
            const correo = document.getElementById('correo').value;
            const password = document.getElementById('password').value;
            const divError = document.getElementById('mensaje-error');
            
            // Ocultamos el error si estaba visible
            divError.classList.add('d-none');

            try {
                // Petición a Render
                const res = await fetch('https://flotasmart-backend.onrender.com/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: correo, contrasena: password })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    // Guardamos la sesión y mandamos al panel
                    localStorage.setItem('usuarioFlota', JSON.stringify(data.usuario));
                    window.location.href = 'index.html'; 
                } else {
                    // Mostramos el error en la pantalla
                    divError.textContent = '❌ ' + (data.error || 'Credenciales incorrectas');
                    divError.classList.remove('d-none');
                }
            } catch (error) {
                console.error("Error detectado:", error);
                divError.textContent = '❌ Servidor desconectado. Revisa la consola.';
                divError.classList.remove('d-none');
            }
        });
    }
});