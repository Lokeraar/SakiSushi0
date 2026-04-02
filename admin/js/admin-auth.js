// admin-auth.js - Autenticación (login, logout, sesión)
(function() {
    window.hacerLogin = async function() {
        console.log('🔐 Intentando login admin...');
        const password = document.getElementById('adminPassword').value;
        if (!password) { window.mostrarToast('Ingresa la contraseña', 'error'); return; }
        
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');
        if (loginBtn) { loginBtn.disabled = true; loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...'; }
        
        try {
            const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
            if (!data.success) { window.mostrarToast('❌ ' + (data.error || 'Contraseña incorrecta'), 'error'); return; }
            if (data.user.rol !== 'admin') { window.mostrarToast('Acceso denegado. Se requiere rol de administrador.', 'error'); return; }
            if (sessionStorage.getItem('admin_authenticated') === 'true') { window.mostrarToast('⚠️ Ya hay una sesión de administrador activa', 'warning'); return; }

            window.isAdminAuthenticated = true;
            window.jwtToken = data.token;
            sessionStorage.setItem('admin_authenticated', 'true');
            sessionStorage.setItem('admin_jwt_token', window.jwtToken);
            sessionStorage.setItem('admin_user', JSON.stringify(data.user));
            window.supabaseClient = window.inicializarSupabaseCliente(window.jwtToken);
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('panelContainer').classList.add('active');
            window.mostrarToast('✅ Bienvenido Administrador', 'success');
            
            setTimeout(async () => {
                try {
                    await window.cargarConfiguracionInicial();
                    await window.cargarMenu();
                    await window.cargarInventario();
                    await window.cargarUsuarios();
                    await window.cargarQRs();
                    await window.cargarReportes();
                    await window.cargarPedidosRecientes();
                    await window.cargarMesoneros();
                    await window.cargarDeliverys();
                    await window.cargarPropinas();
                    window.setupEventListeners();
                    window.setupRealtimeSubscriptions();
                    window.setupStockRealtime();
                    window.restaurarWifiPersistente();
                } catch (e) { console.error('Error cargando datos:', e); window.mostrarToast('Error cargando datos: ' + e.message, 'error'); }
            }, 500);
        } catch (error) {
            console.error('❌ Error:', error);
            window.mostrarToast('❌ Error: ' + error.message, 'error');
        } finally {
            if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = 'Ingresar'; }
        }
    };

    window.restaurarSesionAdmin = function() {
        const token = sessionStorage.getItem('admin_jwt_token');
        const userData = sessionStorage.getItem('admin_user');
        if (token && userData) {
            try {
                window.jwtToken = token;
                const user = JSON.parse(userData);
                if (user.rol === 'admin') {
                    window.isAdminAuthenticated = true;
                    window.supabaseClient = window.inicializarSupabaseCliente(window.jwtToken);
                    return true;
                }
            } catch (e) {
                console.error('Error restaurando sesión admin:', e);
            }
        }
        return false;
    };

    window.cerrarSesion = function() {
        sessionStorage.removeItem('admin_authenticated');
        sessionStorage.removeItem('admin_jwt_token');
        sessionStorage.removeItem('admin_user');
        window.isAdminAuthenticated = false;
        window.jwtToken = null;
        window.mostrarLogin();
        window.mostrarToast('🔓 Sesión cerrada', 'info');
        window.supabaseClient = window.inicializarSupabaseCliente();
    };

    window.forzarCierreSesionAnterior = async function() {
        // Si se requiere, se puede implementar, pero no es necesario en admin
    };

    window.setupLogoutListener = function() {
        // No necesario para admin
    };
})();
