// admin-auth.js - Autenticación con selección de administrador (corregido)
(function() {
    let selectedAdmin = null;

    window.cargarListaAdminsRecientes = async function() {
        const container = document.getElementById('Loginadminslist');
        if (!container) return;
        
        // Mostrar spinner de carga
        container.innerHTML = '<div class="Loading-spinner" style="Margin:0 auto;"></div>';
        
        try {
            // esperar a que supabaseclient esté listo (puede tardar un momento)
            let intentos = 0;
            while (!window.supabaseclient && intentos < 20) {
                await new promise(r => settimeout(r, 100));
                intentos++;
            }
            
            const recent = window.obteneradminsrecientes();
            let admins = [];
            
            if (recent.length) {
                // usar los recientes (ya tienen foto o null)
                admins = recent;
            } else {
                // obtener todos los admins activos de la bd
                const { data, error } = await window.supabaseclient.from('usuarios').select('*').eq('rol', 'admin').eq('activo', true);
                if (error) throw error;
                admins = data || [];
            }
            
            if (!admins.length) {
                container.innerhtml = '<p style="Color:var(--text-muted);text-align:center">No hay administradores registrados</p>';
                return;
            }
            
            container.innerHTML = admins.map(admin => {
                const fotoUrl = admin.foto || window.getPlaceholderImage(admin.nombre);
                return `
                    <div class="admin-card" data-id="${admin.id}" data-username="${admin.username}" data-nombre="${admin.nombre}" data-foto="${admin.foto || ''}">
                        <img class="admin-foto" Src="${fotoUrl}" Onerror="this.src='${window.getplaceholderimage(admin.nombre)}'">
                        <div class="admin-info">
                            <div class="admin-nombre">${admin.nombre}</div>
                            <div class="admin-username">@${admin.username}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // agregar evento click a cada tarjeta
            document.queryselectorall('.admin-card').foreach(card => {
                card.addeventlistener('click', async (e) => {
                    const id = card.dataset.id;
                    const username = card.dataset.username;
                    const nombre = card.dataset.nombre;
                    const foto = card.dataset.foto;
                    selectedadmin = { id, username, nombre, foto };
                    // mostrar panel de contraseña
                    document.getelementbyid('loginSelectorPanel').classlist.add('hide');
                    document.getelementbyid('loginPasswordPanel').classlist.add('show');
                    document.getelementbyid('selectedAdminFoto').src = foto || window.getplaceholderimage(nombre);
                    document.getelementbyid('selectedAdminNombre').textcontent = nombre;
                    // limpiar campo contraseña
                    document.getelementbyid('adminPassword').value = '';
                    document.getelementbyid('adminPassword').focus();
                });
            });
        } catch (error) {
            console.error('Error cargando administradores:', error);
            container.innerhtml = '<p style="Color:var(--danger);text-align:center">Error al cargar administradores. Recarga la página.</p>';
        }
    };

    window.hacerlogin = async function() {
        if (!selectedadmin) {
            window.mostrartoast('Selecciona un administrador primero', 'error');
            return;
        }
        const password = document.getelementbyid('adminPassword').value;
        if (!password) { window.mostrartoast('Ingresa la contraseña', 'error'); return; }
        
        const loginbtn = document.queryselector('#loginForm button[type="Submit"]');
        if (loginbtn) { loginbtn.disabled = true; loginbtn.innerhtml = '<i class="Fas fa-spinner fa-spin"></i> Conectando...'; }
        
        try {
            const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: json.stringify({ username: selectedadmin.username, password: password })
            });
            const data = await response.json();
            if (!response.ok) throw new error(data.error || `error ${response.status}`);
            if (!data.success) { window.mostrartoast('❌ Contraseña incorrecta', 'error'); return; }
            if (data.user.rol !== 'admin') { window.mostrartoast('Acceso denegado. Se requiere rol de administrador.', 'error'); return; }
            
            // verificar sesión duplicada
            const existingtoken = sessionstorage.getitem('admin_jwt_token');
            if (existingtoken && existingtoken !== data.token) {
                const confirmforce = confirm('Ya hay una sesión de administrador activa en otro dispositivo. ¿Deseas cerrarla y continuar con esta?');
                if (!confirmforce) return;
                sessionstorage.removeitem('admin_authenticated');
                sessionstorage.removeitem('admin_jwt_token');
                sessionstorage.removeitem('admin_user');
            }
            
            window.isadminauthenticated = true;
            window.jwttoken = data.token;
            sessionstorage.setitem('admin_authenticated', 'true');
            sessionstorage.setitem('admin_jwt_token', window.jwttoken);
            sessionstorage.setitem('admin_user', json.stringify(data.user));
            
            // guardar usuario actual en variable global
            window.usuarioactual = data.user;
            
            // guardar este admin en recientes (con foto actualizada si la tiene)
            const adminuser = data.user;
            if (adminuser.foto === undefined && selectedadmin.foto) adminuser.foto = selectedadmin.foto;
            window.guardaradminreciente(adminuser);
            
            window.supabaseclient = window.inicializarsupabasecliente(window.jwttoken);
            
            document.getelementbyid('loginContainer').style.display = 'none';
            document.getelementbyid('panelContainer').classlist.add('active');
            
            // eliminar cualquier toast o mensaje de bienvenida previo para evitar bloqueos fantasma
            const existingtoast = document.getelementbyid('toast');
            if (existingtoast) {
                existingtoast.classlist.remove('show');
                settimeout(() => {
                    if (existingtoast.parentnode) existingtoast.remove();
                }, 300);
            }
            
            // mostrar mensaje de bienvenida con desvanecimiento y eliminación segura del dom
            const welcomediv = document.createelement('div');
            welcomediv.id = 'welcomeMessage';
            welcomediv.style.csstext = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg, var(--danger), #d32f2f);color:#fff;padding:1rem 2rem;border-radius:12px;box-shadow:0 8px 24px rgba(211,47,47,.4);z-index:9999;font-size:.95rem;font-weight:600;opacity:0;transition:opacity .4s ease;pointer-events:none';
            welcomediv.innerhtml = '<i class=\"Fas fa-check-circle\" style=\"Margin-right:.5rem\"></i>Bienvenido, <strong>' + (adminuser.nombre || 'Administrador') + '</strong>';
            document.body.appendchild(welcomediv);
            
            // fade in
            settimeout(() => { welcomediv.style.opacity = '1'; }, 50);
            
            // fade out y eliminación del dom después de 3.5 segundos
            settimeout(() => {
                welcomediv.style.opacity = '0';
                settimeout(() => {
                    if (welcomediv.parentnode) welcomediv.remove();
                }, 400); // esperar a que termine la transición
            }, 3500);
            
            // actualizar header con nombre del usuario en línea 1 (desktop) y línea 2 (móvil)
            const headerusuarionombredesktop = document.getelementbyid('headerUsuarioNombreDesktop');
            const headerusuarionombremobile = document.getelementbyid('headerUsuarioNombreMobile');
            if (adminuser.nombre) {
                if (headerusuarionombredesktop) headerusuarionombredesktop.textcontent = adminuser.nombre;
                if (headerusuarionombremobile) headerusuarionombremobile.textcontent = adminuser.nombre;
            }
            
            settimeout(async () => {
                try {
                    await window.cargarconfiguracioninicial();
                    await window.cargarmenu();
                    await window.cargarinventario();
                    await window.cargarusuarios();
                    await window.cargarqrs();
                    await window.cargarreportes();
                    await window.cargarpedidosrecientes();
                    if (typeof window.cargarmesoneros === 'function') await window.cargarmesoneros();
                    if (typeof window.cargardeliverys  === 'function') await window.cargardeliverys();
                    if (typeof window.cargarpropinas   === 'function') await window.cargarpropinas();
                    window.setupeventlisteners();
                    window.setuprealtimesubscriptions();
                    window.setupstockrealtime();
                    window.restaurarwifipersistente();
                    window._registrarpushadmin();
                    window.agregartarjetadiferenciatasa();
                    window._verificartasadehoy((tasa) => {
                        const tasainput = document.getelementbyid('tasaBaseInput');
                        if (tasainput) tasainput.value = tasa;
                        window.configglobal.tasa_cambio = tasa;
                        window.recalculartasaefectiva();
                        window._verificaravisolunes();
                    });
                    await window._actualizarventashoyneto();
                    await window._actualizardeliveryshoy();
                    setinterval(async () => { 
                        await window._actualizarventashoyneto();
                        await window._actualizardeliveryshoy();
                        window.actualizartarjetadiferenciatasa();
                    }, 60000);
                } catch (e) { console.error('Error cargando datos:', e); window.mostrartoast('Error cargando datos: ' + e.message, 'error'); }
            }, 100);
        } catch (error) {
            console.error('❌ Error:', error);
            window.mostrartoast('❌ Error: ' + error.message, 'error');
        } finally {
            if (loginbtn) { loginbtn.disabled = false; loginbtn.innerhtml = 'Ingresar'; }
        }
    };

    window.restaurarsesionadmin = async function() {
        const token = sessionstorage.getitem('admin_jwt_token');
        const userdata = sessionstorage.getitem('admin_user');
        if (!token || !userdata) return false;
        try {
            const user = json.parse(userdata);
            if (user.rol !== 'admin') return false;
            // verificar token con supabase
            const { error } = await window.supabaseclient.from('config').select('id').limit(1).maybesingle();
            if (error && error.message.includes('JWT')) {
                window.cerrarsesion();
                return false;
            }
            window.jwttoken = token;
            window.isadminauthenticated = true;
            window.supabaseclient = window.inicializarsupabasecliente(window.jwttoken);
            
            // actualizar el nombre del usuario en el header después de restaurar sesión (desktop y móvil)
            const headerusuarionombredesktop = document.getelementbyid('headerUsuarioNombreDesktop');
            const headerusuarionombremobile = document.getelementbyid('headerUsuarioNombreMobile');
            if (user.nombre) {
                if (headerusuarionombredesktop) headerusuarionombredesktop.textcontent = user.nombre;
                if (headerusuarionombremobile) headerusuarionombremobile.textcontent = user.nombre;
            }
            
            return true;
        } catch (e) {
            console.error('Error restaurando sesión:', e);
            window.cerrarsesion();
            return false;
        }
    };

    window.cerrarsesion = function() {
        sessionstorage.removeitem('admin_authenticated');
        sessionstorage.removeitem('admin_jwt_token');
        sessionstorage.removeitem('admin_user');
        window.isadminauthenticated = false;
        window.jwttoken = null;
        selectedadmin = null;
        // limpiar campo contraseña
        const pwdinput = document.getelementbyid('adminPassword');
        if (pwdinput) pwdinput.value = '';
        // volver al selector de admins
        const selectorpanel = document.getelementbyid('loginSelectorPanel');
        const passwordpanel = document.getelementbyid('loginPasswordPanel');
        if (selectorpanel) {
            selectorpanel.classlist.remove('hide');
            selectorpanel.style.display = 'block';
        }
        if (passwordpanel) {
            passwordpanel.classlist.remove('show');
            passwordpanel.style.display = 'none';
        }
        window.mostrarlogin();
        window.mostrartoast('🔓 Sesión cerrada', 'info');
        window.supabaseclient = window.inicializarsupabasecliente();
        // recargar la lista de admins (por si cambió)
        settimeout(() => window.cargarlistaadminsrecientes(), 500);
    };

    // botón volver
    const backbtn = document.getelementbyid('backToSelectorBtn');
    if (backbtn) {
        backbtn.addeventlistener('click', () => {
            document.getelementbyid('loginSelectorPanel').classlist.remove('hide');
            document.getelementbyid('loginPasswordPanel').classlist.remove('show');
            document.getelementbyid('loginPasswordPanel').style.display = 'none';
            document.getelementbyid('loginSelectorPanel').style.display = 'block';
            selectedadmin = null;
        });
    }

    // botón limpiar historial
    const clearbtn = document.getelementbyid('clearRecentAdminsBtn');
    if (clearbtn) {
        clearbtn.addeventlistener('click', () => {
            if (confirm('¿Borrar el historial de administradores recientes?')) {
                window.limpiarAdminsRecientes();
                window.cargarListaAdminsRecientes();
            }
        });
    }

    // Inicializar la lista al cargar la página (se llama desde DOMContentLoaded)
    window.iniciarLoginUI = async function() {
        // Esperar un poco para que supabaseClient se inicialice
        await new Promise(r => setTimeout(r, 300));
        await window.cargarListaAdminsRecientes();
    };
})();