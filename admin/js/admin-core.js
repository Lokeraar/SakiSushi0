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
    
    window.wifiSsidPersistente = localStorage.getItem('saki_wifi_ssid') || '';
    window.wifiPasswordPersistente = localStorage.getItem('saki_wifi_pwd') || '';
    window.platillosNotificados = JSON.parse(localStorage.getItem('saki_platillos_notificados') || '{}');
    window.stockUpdateChannel = null;
    
    // ==================== FUNCIONES DE FORMATO Y UTILIDAD ====================
    window.formatBs = function(m) {
        if (m === undefined || m === null) m = 0;
        const valor = typeof m === 'number' ? m : parseFloat(m);
        if (isNaN(valor)) return 'Bs 0,00';
        const entero = Math.floor(Math.abs(valor)).toLocaleString('es-VE');
        const decimal = Math.round((Math.abs(valor) % 1) * 100).toString().padStart(2, '0');
        return (valor < 0 ? '-Bs ' : 'Bs ') + entero + ',' + decimal;
    };
    
    window.formatUSD = function(m) {
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(m);
        } catch(e) {
            return '$ ' + (m || 0).toFixed(2);
        }
    };
    
    window.usdToBs = function(u) {
        return u * (window.configGlobal?.tasa_efectiva || 400);
    };
    
    window.generarId = function(prefix = '') {
        return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    };
    
    window.cerrarModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
        if (modalId === 'ingredienteModal') {
            window.resetearBloqueoStock();
        }
    };
    
    // ==================== TOAST (MENSAJES FLOTANTES) ====================
    window.mostrarToast = function(mensaje, tipo = 'info') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = mensaje;
            toast.className = `toast show ${tipo}`;
            setTimeout(() => toast.classList.remove('show'), 3000);
        } else {
            console.warn('Toast no encontrado en DOM:', mensaje);
            alert(mensaje);
        }
    };
    
    // ==================== CONTROL DE PANTALLAS ====================
    window.mostrarLogin = function() {
        const pwdInput = document.getElementById('adminPassword');
        if (pwdInput) pwdInput.value = '';
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('panelContainer').classList.remove('active');
        window.detenerAlarma();
    };
    
    window.mostrarPanel = function() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('panelContainer').classList.add('active');
    };
    
    window.detenerAlarma = function() {
        if (window.alarmaAudio && window.alarmaActiva) {
            try { window.alarmaAudio.pause(); window.alarmaAudio.currentTime = 0; } catch(e) {}
            window.alarmaActiva = false;
        }
    };
    
    window.configGlobal = window.configGlobal || {};
    
    // ==================== DIFERENCIA DE TASA ====================
    window.calcularDiferenciaTasa = function() {
        // Ganancia extra en Bs = ventas_USD * (tasaEfectiva - tasaBase)
        // Ej: $50 ventas, tasa base 100, efectiva 120 → $50*(120-100) = Bs 1000 extra
        const tasaBase     = window.configGlobal?.tasa_cambio   || 400;
        const tasaEfectiva = window.configGlobal?.tasa_efectiva || 400;
        const diff = tasaEfectiva - tasaBase;
        if (diff <= 0) return 0;
        const fuente   = (window._ventasHoyNeto && window._ventasHoyNeto.pedidosData) || window.pedidos || [];
        const cobrados = fuente.filter(function(p) {
            return p.estado==='cobrado' || p.estado==='entregado' ||
                   p.estado==='enviado' || p.estado==='reserva_completada';
        });
        const totalUSD = cobrados.reduce(function(s,p){ return s+(p.total||0); }, 0);
        return totalUSD * diff;
    };
    
    // ==================== GESTIÓN DE ADMINISTRADORES RECIENTES ====================
    window.obtenerAdminsRecientes = function() {
        const stored = localStorage.getItem('saki_recent_admins');
        if (!stored) return [];
        try {
            const admins = JSON.parse(stored);
            return admins.slice(0, 5);
        } catch(e) { return []; }
    };
    
    window.guardarAdminReciente = function(adminUser) {
        if (!adminUser || adminUser.rol !== 'admin') return;
        let recent = window.obtenerAdminsRecientes();
        recent = recent.filter(a => a.id !== adminUser.id);
        recent.unshift({
            id: adminUser.id,
            nombre: adminUser.nombre,
            username: adminUser.username,
            foto: adminUser.foto || null,
            lastLogin: new Date().toISOString()
        });
        recent = recent.slice(0, 5);
        localStorage.setItem('saki_recent_admins', JSON.stringify(recent));
    };
    
    window.limpiarAdminsRecientes = function() {
        localStorage.removeItem('saki_recent_admins');
    };
    
    // Placeholder para imágenes (SVG Data URI)
    window.getPlaceholderImage = function(text = 'Admin') {
        const initial = text.charAt(0).toUpperCase();
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23D32F2F'/%3E%3Ctext x='24' y='32' font-size='20' text-anchor='middle' fill='white' font-family='Arial'%3E${initial}%3C/text%3E%3C/svg%3E`;
    };
	// Alerta moderna y premium para confirmar eliminaciones
	    window.mostrarConfirmacionPremium = function(titulo, mensaje, onConfirm) {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
        overlay.innerHTML = `
            <div style="background:var(--card-bg);border-radius:16px;max-width:400px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,.4);border:1px solid var(--border);overflow:hidden">
                <div style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));padding:1rem 1.5rem;color:#fff">
                    <h3 style="margin:0;font-size:1.1rem"><i class="fas fa-exclamation-triangle"></i> ${titulo}</h3>
                </div>
                <div style="padding:1.5rem">
                    <p style="color:var(--text-dark);margin-bottom:1.5rem">${mensaje}</p>
                    <div style="display:flex;gap:.75rem;justify-content:flex-end">
                        <button type="button" class="btn-secondary" id="confirmPremiumCancel">Cancelar</button>
                        <button type="button" class="btn-primary" id="confirmPremiumOk">Confirmar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const cancelBtn = overlay.querySelector('#confirmPremiumCancel');
        const okBtn = overlay.querySelector('#confirmPremiumOk');
        const cleanup = () => overlay.remove();
        cancelBtn.addEventListener('click', cleanup);
        okBtn.addEventListener('click', () => {
            cleanup();
            if (onConfirm) onConfirm();
        });
    };
})();