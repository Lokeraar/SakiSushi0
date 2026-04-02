// admin-auth.js - Autenticación con selección de administrador
(function() {
    let selectedAdmin = null;

    window.cargarListaAdminsRecientes = async function() {
        const container = document.getElementById('loginAdminsList');
        if (!container) return;
        const recent = window.obtenerAdminsRecientes();
        if (!recent.length) {
            // Si no hay recientes, mostrar todos los admins activos de la BD
            const { data: admins } = await window.supabaseClient.from('usuarios').select('*').eq('rol', 'admin').eq('activo', true);
            if (admins && admins.length) {
                container.innerHTML = admins.map(admin => `
                    <div class="admin-card" data-id="${admin.id}" data-username="${admin.username}" data-nombre="${admin.nombre}" data-foto="${admin.foto || ''}">
                        <img class="admin-foto" src="${admin.foto || 'https://via.placeholder.com/48?text=Admin'}" onerror="this.src='https://via.placeholder.com/48?text=Admin'">
                        <div class="admin-info">
                            <div class="admin-nombre">${admin.nombre}</div>
                            <div class="admin-username">@${admin.username}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p style="color:var(--text-muted);text-align:center">No hay administradores registrados</p>';
            }
        } else {
            container.innerHTML = recent.map(admin => `
                <div class="admin-card" data-id="${admin.id}" data-username="${admin.username}" data-nombre="${admin.nombre}" data-foto="${admin.foto || ''}">
                    <img class="admin-foto" src="${admin.foto || 'https://via.placeholder.com/48?text=Admin'}" onerror="this.src='https://via.placeholder.com/48?text=Admin'">
                    <div class="admin-info">
                        <div class="admin-nombre">${admin.nombre}</div>
                        <div class="admin-username">@${admin.username}</div>
                    </div>
                </div>
            `).join('');
        }
        // Agregar evento click a cada tarjeta
        document.querySelectorAll('.admin-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                const id = card.dataset.id;
                const username = card.dataset.username;
                const nombre = card.dataset.nombre;
                const foto = card.dataset.foto;
                selectedAdmin = { id, username, nombre, foto };
                // Mostrar panel de contraseña
                document.getElementById('loginSelectorPanel').classList.add('hide');
                document.getElementById('loginPasswordPanel').classList.add('show');
                document.getElementById('selectedAdminFoto').src = foto || 'https://via.placeholder.com/48?text=Admin';
                document.getElementById('selectedAdminNombre').textContent = nombre;
                // Limpiar campo contraseña
                document.getElementById('adminPassword').value = '';
                document.getElementById('adminPassword').focus();
            });
        });
    };

    window.hacerLogin = async function() {
        if (!selectedAdmin) {
            window.mostrarToast('Selecciona un administrador primero', 'error');
            return;
        }
        const password = document.getElementById('adminPassword').value;
        if (!password) { window.mostrarToast('Ingresa la contraseña', 'error'); return; }
        
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');
        if (loginBtn) { loginBtn.disabled = true; loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...'; }
        
        try {
            const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: selectedAdmin.username, password: password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
            if (!data.success) { window.mostrarToast('❌ Contraseña incorrecta', 'error'); return; }
            if (data.user.rol !== 'admin') { window.mostrarToast('Acceso denegado. Se requiere rol de administrador.', 'error'); return; }
            
            // Verificar sesión duplicada
            const existingToken = sessionStorage.getItem('admin_jwt_token');
            if (existingToken && existingToken !== data.token) {
                const confirmForce = confirm('Ya hay una sesión de administrador activa en otro dispositivo. ¿Deseas cerrarla y continuar con esta?');
                if (!confirmForce) return;
                sessionStorage.removeItem('admin_authenticated');
                sessionStorage.removeItem('admin_jwt_token');
                sessionStorage.removeItem('admin_user');
            }
            
            window.isAdminAuthenticated = true;
            window.jwtToken = data.token;
            sessionStorage.setItem('admin_authenticated', 'true');
            sessionStorage.setItem('admin_jwt_token', window.jwtToken);
            sessionStorage.setItem('admin_user', JSON.stringify(data.user));
            
            // Guardar este admin en recientes (con foto actualizada si la tiene)
            const adminUser = data.user;
            if (adminUser.foto === undefined && selectedAdmin.foto) adminUser.foto = selectedAdmin.foto;
            window.guardarAdminReciente(adminUser);
            
            window.supabaseClient = window.inicializarSupabaseCliente(window.jwtToken);
            
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('panelContainer').classList.add('active');
            window.mostrarToast('✅ Bienvenido Administrador', 'success');
            
            // Actualizar header con nombre
            const headerTitle = document.querySelector('.header-left h2');
            if (headerTitle && adminUser.nombre) {
                headerTitle.innerHTML = `<i class="fas fa-crown"></i> Administración Saki Sushi - ${adminUser.nombre}`;
            }
            
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
                    window._registrarPushAdmin();
                    window.agregarTarjetaDiferenciaTasa();
                    window._verificarTasaDeHoy((tasa) => {
                        const tasaInput = document.getElementById('tasaBaseInput');
                        if (tasaInput) tasaInput.value = tasa;
                        window.configGlobal.tasa_cambio = tasa;
                        window.recalcularTasaEfectiva();
                        window._verificarAvisoLunes();
                    });
                    await window._actualizarVentasHoyNeto();
                    await window._actualizarDeliverysHoy();
                    setInterval(async () => { 
                        await window._actualizarVentasHoyNeto();
                        await window._actualizarDeliverysHoy();
                        window.actualizarTarjetaDiferenciaTasa();
                    }, 60000);
                } catch (e) { console.error('Error cargando datos:', e); window.mostrarToast('Error cargando datos: ' + e.message, 'error'); }
            }, 100);
        } catch (error) {
            console.error('❌ Error:', error);
            window.mostrarToast('❌ Error: ' + error.message, 'error');
        } finally {
            if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = 'Ingresar'; }
        }
    };

    window.restaurarSesionAdmin = async function() {
        const token = sessionStorage.getItem('admin_jwt_token');
        const userData = sessionStorage.getItem('admin_user');
        if (!token || !userData) return false;
        try {
            const user = JSON.parse(userData);
            if (user.rol !== 'admin') return false;
            const { error } = await window.supabaseClient.from('config').select('id').limit(1).maybeSingle();
            if (error && error.message.includes('JWT')) {
                window.cerrarSesion();
                return false;
            }
            window.jwtToken = token;
            window.isAdminAuthenticated = true;
            window.supabaseClient = window.inicializarSupabaseCliente(window.jwtToken);
            return true;
        } catch (e) {
            console.error('Error restaurando sesión:', e);
            window.cerrarSesion();
            return false;
        }
    };

    window.cerrarSesion = function() {
        sessionStorage.removeItem('admin_authenticated');
        sessionStorage.removeItem('admin_jwt_token');
        sessionStorage.removeItem('admin_user');
        window.isAdminAuthenticated = false;
        window.jwtToken = null;
        // Limpiar selección de admin
        selectedAdmin = null;
        document.getElementById('adminPassword').value = '';
        // Mostrar de nuevo el selector de admins
        document.getElementById('loginSelectorPanel').classList.remove('hide');
        document.getElementById('loginPasswordPanel').classList.remove('show');
        document.getElementById('loginPasswordPanel').style.display = 'none';
        document.getElementById('loginSelectorPanel').style.display = 'block';
        window.mostrarLogin();
        window.mostrarToast('🔓 Sesión cerrada', 'info');
        window.supabaseClient = window.inicializarSupabaseCliente();
    };

    // Botón volver
    document.getElementById('backToSelectorBtn')?.addEventListener('click', () => {
        document.getElementById('loginSelectorPanel').classList.remove('hide');
        document.getElementById('loginPasswordPanel').classList.remove('show');
        document.getElementById('loginPasswordPanel').style.display = 'none';
        document.getElementById('loginSelectorPanel').style.display = 'block';
        selectedAdmin = null;
    });

    // Botón limpiar historial
    document.getElementById('clearRecentAdminsBtn')?.addEventListener('click', () => {
        if (confirm('¿Borrar el historial de administradores recientes?')) {
            window.limpiarAdminsRecientes();
            window.cargarListaAdminsRecientes();
        }
    });

    // Inicializar la lista al cargar la página (se llama desde DOMContentLoaded)
    window.iniciarLoginUI = async function() {
        await window.cargarListaAdminsRecientes();
    };
})();
