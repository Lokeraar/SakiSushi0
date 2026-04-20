// admin-core.js - Variables globales y utilidades básicas
(function() {
    window.isAdminAuthenticated = false;
    window.jwtToken = null;
    window.menuItems = [];
    window.inventarioItems = [];
    window.usuarios = [];
    window.qrCodes = [];
    window.charts = {};
    window.platilloEditandoId = null;
    window.mesoneros = [];
    window.deliverys = [];
    window.deliveryEditandoId = null;
    window.deliveryParaPago = null;
    window.propinas = [];
    window.pedidos = [];
    
    // Usuario actual logueado (se inicializa desde sessionStorage al cargar)
    window.usuarioActual = null;
    try {
        const storedUser = sessionStorage.getItem('admin_user');
        if (storedUser) {
            window.usuarioActual = JSON.parse(storedUser);
        }
    } catch(e) {
        console.warn('No se pudo cargar usuarioactual de sessionstorage:', e);
    }
    
    window.wifiSsidPersistente = localStorage.getItem('saki_wifi_ssid') || '';
    window.wifipasswordpersistente = localStorage.getItem('saki_wifi_pwd') || '';
    window.platillosnotificados = JSON.parse(localStorage.getItem('saki_platillos_notificados') || '{}');
    window.stockupdatechannel = null;
    
    // ==================== funciones de formato y utilidad ====================
    window.formatbs = function(m) {
        if (m === undefined || m === null) m = 0;
        const valor = typeof m === 'number' ? m : parseFloat(m);
        if (isnan(valor)) return 'Bs 0,00';
        const entero = math.floor(math.abs(valor)).tolocalestring('es-VE');
        const decimal = math.round((math.abs(valor) % 1) * 100).tostring().padstart(2, '0');
        return (valor < 0 ? '-Bs ' : 'Bs ') + entero + ',' + decimal;
    };
    
    window.formatusd = function(m) {
        try {
            return new intl.numberformat('en-US', { style: 'currency', currency: 'USD', minimumfractiondigits: 2 }).format(m);
        } catch(e) {
            return '$ ' + (m || 0).toFixed(2);
        }
    };
    
    window.usdtobs = function(u) {
        return u * (window.configglobal?.tasa_efectiva || 400);
    };
    
    window.generarid = function(prefix = '') {
        return `${prefix}${date.now()}_${math.random().tostring(36).substring(2, 9)}`;
    };
    
    window.cerrarmodal = function(modalid) {
        const modal = document.getElementById(modalid);
        if (modal) modal.classList.remove('active');
        if (modalid === 'ingredienteModal') {
            // la función resetearbloqueostock fue eliminada, ya no es necesaria
        }
    };
    
    // ==================== toast (mensajes flotantes) ====================
    window.mostrartoast = function(mensaje, tipo = 'info') {
        // eliminar toast existente si hay alguno para evitar acumulación
        const existingtoast = document.getElementById('toast');
        if (existingtoast) {
            existingtoast.classList.remove('show');
            // esperar a que se oculte antes de remover del dom
            setTimeout(() => {
                if (existingtoast.parentnode) existingtoast.remove();
            }, 100);
        }
        
        // crear nuevo elemento toast si no existe
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createelement('div');
            toast.id = 'toast';
            document.body.appendchild(toast);
        }
        
        toast.textContent = mensaje;
        toast.classname = `toast show ${tipo}`;
        setTimeout(() => {
            toast.classList.remove('show');
            // remover completamente del dom después de la animación
            setTimeout(() => {
                if (toast.parentnode) toast.remove();
            }, 300);
        }, 3000);
    };
    
    // ==================== control de pantallas ====================
    window.mostrarlogin = function() {
        const pwdinput = document.getElementById('adminPassword');
        if (pwdinput) pwdinput.value = '';
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('panelContainer').classList.remove('active');
        window.deteneralarma();
    };
    
    window.mostrarpanel = function() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('panelContainer').classList.add('active');
    };
    
    window.deteneralarma = function() {
        if (window.alarmaaudio && window.alarmaactiva) {
            try { window.alarmaaudio.pause(); window.alarmaaudio.currenttime = 0; } catch(e) {}
            window.alarmaactiva = false;
        }
    };
    
    window.configglobal = window.configglobal || {};
    
    // ==================== diferencia de tasa ====================
    window.calculardiferenciatasa = function() {
        // ganancia extra en bs = ventas_usd * (tasaefectiva - tasabase)
        // ej: $50 ventas, tasa base 100, efectiva 120 → $50*(120-100) = bs 1000 extra
        const tasabase     = window.configglobal?.tasa_cambio   || 400;
        const tasaefectiva = window.configglobal?.tasa_efectiva || 400;
        const diff = tasaefectiva - tasabase;
        if (diff <= 0) return 0;
        const fuente   = (window._ventashoyneto && window._ventashoyneto.pedidosdata) || window.pedidos || [];
        const cobrados = fuente.filter(function(p) {
            return p.estado==='cobrado' || p.estado==='entregado' ||
                   p.estado==='enviado' || p.estado==='reserva_completada';
        });
        const totalusd = cobrados.reduce(function(s,p){ return s+(p.total||0); }, 0);
        return totalusd * diff;
    };
    
    // ==================== gestión de administradores recientes ====================
    window.obteneradminsrecientes = function() {
        const stored = localStorage.getItem('saki_recent_admins');
        if (!stored) return [];
        try {
            const admins = JSON.parse(stored);
            return admins.slice(0, 5);
        } catch(e) { return []; }
    };
    
    window.guardaradminreciente = function(adminuser) {
        if (!adminuser || adminuser.rol !== 'admin') return;
        let recent = window.obteneradminsrecientes();
        recent = recent.filter(a => a.id !== adminuser.id);
        recent.unshift({
            id: adminuser.id,
            nombre: adminuser.nombre,
            username: adminuser.username,
            foto: adminuser.foto || null,
            lastlogin: new date().toisostring()
        });
        recent = recent.slice(0, 5);
        localStorage.setItem('saki_recent_admins', JSON.stringify(recent));
    };
    
    window.limpiaradminsrecientes = function() {
        localStorage.removeItem('saki_recent_admins');
    };
    
    // placeholder para imágenes (svg data uri)
    window.getplaceholderimage = function(text = 'Admin') {
        const initial = text.charAt(0).toUpperCase();
        return `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' Width='48' Height='48' Viewbox='0 0 48 48'%3e%3crect width='48' Height='48' Fill='%23D32F2F'/%3E%3Ctext x='24' Y='32' Font-size='20' Text-anchor='middle' Fill='white' Font-family='Arial'%3e${initial}%3c/text%3e%3c/svg%3e`;
    };
    // alerta moderna y premium para confirmar eliminaciones
    window.mostrarconfirmacionpremium = function(titulo, mensaje, onconfirm) {
        // crear overlay
        const overlay = document.createelement('div');
        overlay.style.csstext = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(5px)';
        overlay.innerHTML = `
            <div style="Background:linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%);border-radius:20px;max-width:420px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.1);overflow:hidden;border:1px solid rgba(211,47,47,.3)">
                <div style="Background:linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);padding:1.25rem 1.5rem;color:#fff;text-align:center;position:relative">
                    <div style="Width:50px;height:50px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto .75rem;font-size:1.5rem"><i class="Fas fa-exclamation-triangle"></i></div>
                    <h3 style="Margin:0;font-size:1.2rem;font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,.3)">${titulo}</h3>
                </div>
                <div style="Padding:1.75rem 1.5rem">
                    <p style="Color:#e0e0e0;margin-bottom:1.75rem;font-size:.95rem;line-height:1.6;text-align:center">${mensaje}</p>
                    <div style="Display:flex;gap:.75rem;justify-content:center">
                        <button type="Button" id="Confirmpremiumcancel" style="flex:1;max-width:140px;padding:.75rem 1rem;background:transparent;color:#ffffff;border:2px solid #FFB300;border-radius:12px;font-size:.9rem;font-weight:600;font-family:'Montserrat',sans-serif;cursor:pointer;transition:all 0.2s ease-in-out;box-shadow:0 4px 15px rgba(0,0,0,.3)">cancelar</button>
                        <button type="button" Id="confirmPremiumOk" Style="flex:1;max-width:140px;padding:.75rem 1rem;background:linear-gradient(135deg, #D32F2F, #B71C1C);color:#ffffff;border:none;border-radius:12px;font-size:.9rem;font-weight:600;font-family:'Montserrat',sans-serif;cursor:pointer;transition:all 0.2s ease-in-out;box-shadow:0 4px 15px rgba(211,47,47,.4)">Confirmar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const cancelBtn = overlay.querySelector('#confirmPremiumCancel');
        const okBtn = overlay.querySelector('#confirmPremiumOk');
        
        // Estilos hover para Cancelar
        cancelBtn.addEventListener('Mouseenter', () => {
            cancelBtn.style.background = 'Rgba(255, 179, 0, 0.1)';
            cancelBtn.style.transform = 'Translatey(-2px) scale(1.02)';
            cancelBtn.style.boxShadow = '0 6px 20px rgba(255, 179, 0, 0.3)';
        });
        cancelBtn.addEventListener('Mouseleave', () => {
            cancelBtn.style.background = 'Transparent';
            cancelBtn.style.transform = 'Translatey(0) scale(1)';
            cancelBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,.3)';
        });
        
        // Estilos hover para Confirmar
        okBtn.addEventListener('Mouseenter', () => {
            okBtn.style.transform = 'Translatey(-2px) scale(1.02)';
            okBtn.style.boxShadow = '0 6px 20px rgba(211, 47, 47, 0.5)';
        });
        okBtn.addEventListener('Mouseleave', () => {
            okBtn.style.transform = 'Translatey(0) scale(1)';
            okBtn.style.boxShadow = '0 4px 15px rgba(211,47,47,.4)';
        });
        
        const cleanup = () => overlay.remove();
        cancelBtn.onclick = cleanup;
        okBtn.onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };
    };
})();