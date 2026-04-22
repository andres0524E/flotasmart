document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.querySelector('form');
    
    if(formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            // Atrapamos los valores directamente por el tipo de input
            const correo = document.querySelector('input[type="email"]').value;
            const password = document.querySelector('input[type="password"]').value;
            
            try {
                const res = await fetch('https://flotasmart-backend.onrender.com/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Aseguramos que los nombres coincidan con la BD (correo y contrasena)
                    body: JSON.stringify({ correo: correo, contrasena: password })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('usuarioFlota', JSON.stringify(data.usuario));
                    window.location.href = 'index.html'; // Redirige al panel
                } else {
                    alert('❌ ' + (data.error || 'Credenciales incorrectas'));
                }
            } catch (error) {
                alert('Error crítico de conexión. Revisa consola (F12).');
                console.error(error);
            }
        });
    }
});