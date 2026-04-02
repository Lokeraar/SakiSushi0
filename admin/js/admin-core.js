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
    
    window.mostrarToast = function(mensaje, tipo = 'info') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = mensaje;
            toast.className = `toast show ${tipo}`;
            setTimeout(() => toast.classList.remove('show'), 3000);
        } else alert(mensaje);
    };
    
    window.formatBs = function(m) {
        try {
            return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }).format(m).replace('VES', 'Bs.');
        } catch(e) { return 'Bs. ' + (m || 0).toFixed(2); }
    };
    
    window.formatUSD = function(m) {
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(m);
        } catch(e) { return '$ ' + (m || 0).toFixed(2); }
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
    };
    
    window.mostrarLogin = function() {
        // Limpiar campo contraseña al mostrar login
        const pwdInput = document.getElementById('adminPassword');
        if (pwdInput) pwdInput.value = '';
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('panelContainer').classList.remove('active');
        window.detenerAlarma();
    };
    
    window.detenerAlarma = function() {
        if (window.alarmaAudio && window.alarmaActiva) {
            try { window.alarmaAudio.pause(); window.alarmaAudio.currentTime = 0; } catch(e) {}
            window.alarmaActiva = false;
        }
    };
    
    window.configGlobal = window.configGlobal || {};
})();
