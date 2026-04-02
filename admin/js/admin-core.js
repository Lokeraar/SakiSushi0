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
    
    // Formato de moneda personalizado: Bs X.XXX,XX
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
        // Al cerrar modales de ingrediente, resetear bloqueo de stock
        if (modalId === 'ingredienteModal') {
            window.resetearBloqueoStock();
        }
    };
    
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
    
    // Nueva función: calcular diferencia acumulada entre tasa base y efectiva
    window.calcularDiferenciaTasa = function() {
        if (!window.pedidos || !window.pedidos.length) return 0;
        const tasaBase = window.configGlobal?.tasa_cambio || 400;
        const tasaEfectiva = window.configGlobal?.tasa_efectiva || 400;
        if (tasaEfectiva <= tasaBase) return 0;
        
        // Sumar todos los totales en USD de pedidos cobrados (entregados o en estado final)
        const pedidosCerrados = window.pedidos.filter(p => 
            p.estado === 'entregado' || p.estado === 'enviado' || p.estado === 'reserva_completada'
        );
        const totalUSD = pedidosCerrados.reduce((sum, p) => sum + (p.total || 0), 0);
        // La diferencia por cada dólar es (tasaEfectiva - tasaBase)
        const diferencia = totalUSD * (tasaEfectiva - tasaBase);
        return diferencia;
    };
})();
