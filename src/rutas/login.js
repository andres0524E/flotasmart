document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formulario-login');
    if (!formulario) return;

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const correo    = document.getElementById('correo').value.trim();
        const password  = document.getElementById('password').value;
        const divError  = document.getElementById('mensaje-error');
        const btnIngresar = document.getElementById('btn-ingresar');

        divError.style.display = 'none';

        if (!correo.includes('@') || correo.length > 100 || password.length < 4) {
            divError.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Credenciales inválidas.';
            divError.style.display = 'block'; return;
        }

        btnIngresar.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verificando...';
        btnIngresar.disabled = true;

        try {
            const res = await fetch('https://flotasmart-backend.onrender.com/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, contrasena: password })
            });
            const data = await res.json();

            if (res.ok && data.token) {
                // Guardar el JWT y los datos públicos del usuario
                localStorage.setItem('tokenFlota',    data.token);
                localStorage.setItem('usuarioFlota',  JSON.stringify({ ...data.usuario, _ts: Date.now() }));

                btnIngresar.innerHTML = '<i class="fa-solid fa-check"></i> Acceso concedido';
                btnIngresar.style.background = 'linear-gradient(135deg,#00b09b,#00e676)';
                setTimeout(() => window.location.href = 'index.html', 600);
            } else {
                divError.innerHTML = '<i class="fa-solid fa-xmark"></i> ' + (data.error || 'Credenciales incorrectas');
                divError.style.display = 'block';
                btnIngresar.textContent = 'Ingresar al Sistema';
                btnIngresar.disabled = false;
            }
        } catch (err) {
            divError.innerHTML = '<i class="fa-solid fa-wifi"></i> Sin conexión al servidor.';
            divError.style.display = 'block';
            btnIngresar.textContent = 'Ingresar al Sistema';
            btnIngresar.disabled = false;
        }
    });
});