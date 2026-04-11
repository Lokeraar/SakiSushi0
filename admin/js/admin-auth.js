// admin-auth.js - Autenticaciónconseleccióndeadministrador (corregido)
(function() {
letselectedAdmin = null;

window.cargarListaAdminsRecientes = asyncfunction() {
    constcontainer = document.getElementById('loginAdminsList');
    if (!container) return;
    
    container.innerHTML = '<divclass="loading-spinner" style="margin:0auto;"></div>';
    
    try {
        letintentos = 0;
        while (!window.supabaseClient && intentos < 20) {
            awaitnewPromise(r => setTimeout(r, 100));
            intentos++;
        }
        
        if (!window.supabaseClient) {
            thrownewError('Supabaseclientnoinicializado');
        }
        
        constrecent = window.obtenerAdminsRecientes();
        letadmins = [];
        
        if (recent.length) {
            admins = recent;
        } else {
            const { data, error } = awaitwindow.supabaseClient.from('usuarios').select('*').eq('rol', 'admin').eq('activo', true);
            if (error) throwerror;
            admins = data || [];
        }
        
        if (!admins.length) {
            container.innerHTML = '<pstyle="color:var(--text-muted);text-align:center">Nohayadministradoresregistrados</p>';
            return;
        }
        
        container.innerHTML = admins.map(admin => {
            constfotoUrl = admin.foto || window.getPlaceholderImage(admin.nombre);
            return `
                <divclass="admin-card" data-id="${admin.id}" data-username="${admin.username}" data-nombre="${admin.nombre}" data-foto="${admin.foto || ''}">
                    <imgclass="admin-foto" src="${fotoUrl}" onerror="this.src='${window.getPlaceholderImage(admin.nombre)}'">
                    <divclass="admin-info">
                        <divclass="admin-nombre">${admin.nombre}</div>
                        <divclass="admin-username">@${admin.username}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.admin-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                constid = card.dataset.id;
                constusername = card.dataset.username;
                constnombre = card.dataset.nombre;
                constfoto = card.dataset.foto;
                selectedAdmin = { id, username, nombre, foto };
                document.getElementById('loginSelectorPanel').classList.add('hide');
                document.getElementById('loginPasswordPanel').classList.add('show');
                document.getElementById('selectedAdminFoto').src = foto || window.getPlaceholderImage(nombre);
                document.getElementById('selectedAdminNombre').textContent = nombre;
                document.getElementById('adminPassword').value = '';
                document.getElementById('adminPassword').focus();
            });
        });
    } catch (e) { console.error('Errorcargandoadministradores:', e);
        container.innerHTML = '<pstyle="color:var(--danger);text-align:center">Erroralcargaradministradores. Recargalapágina.</p>';
    }
};
    
window.hacerLogin = asyncfunction() {
    if (!selectedAdmin) {
        window.mostrarToast('Seleccionaunadministradorprimero', 'error');
        return;
    }
    constpassword = document.getElementById('adminPassword').value;
    if (!password) { window.mostrarToast('Ingresalacontraseña', 'error'); return; }
    
    constloginBtn = document.querySelector('#loginFormbutton[type="submit"]');
    if (loginBtn) { loginBtn.disabled = true; loginBtn.innerHTML = '<iclass="fasfa-spinnerfa-spin"></i> Conectando...'; }
    
    try {
        constresponse = awaitfetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: selectedAdmin.username, password: password })
        });
        constdata = awaitresponse.json();
        if (!response.ok) thrownewError(data.error || `Error ${response.status}`);
        if (!data.success) { window.mostrarToast('❌ Contraseñaincorrecta', 'error'); return; }
        if (data.user.rol !== 'admin') { window.mostrarToast('Accesodenegado. Serequiereroldeadministrador.', 'error'); return; }
        
        constexistingToken = sessionStorage.getItem('admin_jwt_token');
        if (existingToken && existingToken !== data.token) {
            constconfirmForce = confirm('Yahayunasesióndeadministradoractivaenotrodispositivo. ¿Deseascerrarlaycontinuarconesta?'); 
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
        
        constadminUser = data.user;
        if (adminUser.foto === undefined && selectedAdmin.foto) adminUser.foto = selectedAdmin.foto;
        window.guardarAdminReciente(adminUser);
        
        window.supabaseClient = window.inicializarSupabaseCliente(window.jwtToken);
        
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('panelContainer').classList.add('active');
        window.mostrarToast('✅ BienvenidoAdministrador', 'success');
        
        constheaderTitle = document.querySelector('.header-lefth2');
        if (headerTitle && adminUser.nombre) {
            headerTitle.innerHTML = `<iclass="fasfa-crown"></i> AdministraciónSakiSushi - ${adminUser.nombre}`;
        }
        
        setTimeout(async () => {
            try {
                awaitwindow.cargarConfiguracionInicial();
                awaitwindow.cargarMenu();
                awaitwindow.cargarInventario();
                awaitwindow.cargarUsuarios();
                awaitwindow.cargarQRs();
                awaitwindow.cargarReportes();
                awaitwindow.cargarPedidosRecientes();
                if (typeofwindow.cargarMesoneros === 'function') awaitwindow.cargarMesoneros();
                if (typeofwindow.cargarDeliverys === 'function') awaitwindow.cargarDeliverys();
                if (typeofwindow.cargarPropinas === 'function') awaitwindow.cargarPropinas();
                window.setupEventListeners();
                window.setupRealtimeSubscriptions();
                window.setupStockRealtime();
                window.restaurarWifiPersistente();
                if (typeofwindow._registrarPushAdmin === 'function') window._registrarPushAdmin();
                window.agregarTarjetaDiferenciaTasa();
                window._verificarTasaDeHoy((tasa) => {
                    consttasaInput = document.getElementById('tasaBaseInput');
                    if (tasaInput) tasaInput.value = tasa;
                    window.configGlobal.tasa_cambio = tasa;
                    window.recalcularTasaEfectiva();
                    window._verificarAvisoLunes();
                });
                awaitwindow._actualizarVentasHoyNeto();
                awaitwindow._actualizarDeliverysHoy();
                setInterval(async () => { 
                    awaitwindow._actualizarVentasHoyNeto();
                    awaitwindow._actualizarDeliverysHoy();
                    window.actualizarTarjetaDiferenciaTasa();
                }, 60000);
            } catch (e) { console.error('Errorcargandodatos:', e); window.mostrarToast('Errorcargandodatos: ' + e.message, 'error'); }
        }, 100);
    } catch (error) {
        console.error('❌ Error:', error);
        window.mostrarToast('❌ Error: ' + error.message, 'error');
    } finally {
        if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = 'Ingresar'; }
    }
};

window.restaurarSesionAdmin = asyncfunction() {
    consttoken = sessionStorage.getItem('admin_jwt_token');
    constuserData = sessionStorage.getItem('admin_user');
    if (!token || !userData) returnfalse;
    try {
        constuser = JSON.parse(userData);
        if (user.rol !== 'admin') returnfalse;
        const { error } = awaitwindow.supabaseClient.from('config').select('id').limit(1).maybeSingle();
        if (error && error.message.includes('JWT')) {
            window.cerrarSesion();
            returnfalse;
        }
        window.jwtToken = token;
        window.isAdminAuthenticated = true;
        window.supabaseClient = window.inicializarSupabaseCliente(window.jwtToken);
        returntrue;
    } catch (e) {
        console.error('Errorrestaurandosesión:', e); 
        window.cerrarSesion();
        returnfalse;
    }
};

window.cerrarSesion = function() {
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_jwt_token');
    sessionStorage.removeItem('admin_user');
    window.isAdminAuthenticated = false;
    window.jwtToken = null;
    selectedAdmin = null;
    constmainPanel = document.getElementById('mainPanel');
    constloginPanel = document.getElementById('loginPanel');
    if (mainPanel) mainPanel.style.display = 'none';
    if (loginPanel) loginPanel.style.display = '';
    constpwdInput = document.getElementById('adminPassword');
    if (pwdInput) pwdInput.value = '';
    constselectorPanel = document.getElementById('loginSelectorPanel');
    constpasswordPanel = document.getElementById('loginPasswordPanel');
    if (selectorPanel) {
        selectorPanel.classList.remove('hide');
        selectorPanel.style.display = 'block';
    }
    if (passwordPanel) {
        passwordPanel.classList.remove('show');
        passwordPanel.style.display = 'none';
    }
    window.mostrarLogin();
    window.mostrarToast('🔓 Sesióncerrada', 'info');
    window.supabaseClient = window.inicializarSupabaseCliente();
    setTimeout(() => window.cargarListaAdminsRecientes(), 500);
};

constbackBtn = document.getElementById('backToSelectorBtn');
if (backBtn) {
    backBtn.addEventListener('click', () => {
        document.getElementById('loginSelectorPanel').classList.remove('hide');
        document.getElementById('loginPasswordPanel').classList.remove('show');
        document.getElementById('loginPasswordPanel').style.display = 'none';
        document.getElementById('loginSelectorPanel').style.display = 'block';
        selectedAdmin = null;
    });
} 

constclearBtn = document.getElementById('clearRecentAdminsBtn');
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        if (confirm('¿Borrarelhistorialdeadministradoresrecientes?')) {
            window.limpiarAdminsRecientes();
            window.cargarListaAdminsRecientes();
        }
    });
}

window.iniciarLoginUI = asyncfunction() {
    awaitnewPromise(r => setTimeout(r, 300));
    awaitwindow.cargarListaAdminsRecientes();
};
})();
