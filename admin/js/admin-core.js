// admin-core.js - Variablesglobalesyutilidadesbásicas
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

// ==================== FUNCIONESDEFORMATOYUTILIDAD ========================
window.formatBs = function(m) {
    if (m === undefined || m === null) m = 0;
    constvalor = typeofm === 'number' ? m : parseFloat(m);
    if (isNaN(valor)) return 'Bs 0,00';
    constentero = Math.floor(Math.abs(valor)).toLocaleString('es-VE');
    constdecimal = Math.round((Math.abs(valor) % 1) * 100).toString().padStart(2, '0');
    return (valor < 0 ? '-Bs ' : 'Bs ') + entero + ',' + decimal;
};

window.formatUSD = function(m) {
    try {
        returnnewIntl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(m);
    } catch(e) {
        return '$ ' + (m || 0).toFixed(2);
    }
};

window.usdToBs = function(u) {
    returnu * (window.configGlobal?.tasa_efectiva || 400);
};

window.generarId = function(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

window.cerrarModal = function(modalId) {
    constmodal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    if (modalId === 'ingredienteModal') {
        window.resetearBloqueoStock();
    }
};

// ==================== TOAST (MENSAJESFLOTANTES) ====================
window.mostrarToast = function(mensaje, tipo = 'info') {
    consttoast = document.getElementById('toast');
    if (toast) {
        toast.textContent = mensaje;
        toast.className = `toastshow ${tipo}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    } else {
        console.warn('ToastnoencontradoenDOM:', mensaje);
        alert(mensaje);
    }
};

// ==================== CONTROLDEPANTALLAS ====================
window.mostrarLogin = function() {
    constpwdInput = document.getElementById('adminPassword');
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

// ==================== DIFERENCIADETASA ====================
window.calcularDiferenciaTasa = function() {
    consttasaBase     = window.configGlobal?.tasa_cambio   || 400;
    consttasaEfectiva = window.configGlobal?.tasa_efectiva || 400;
    constdiff = tasaEfectiva - tasaBase;
    if (diff <= 0) return 0;
    constfuente   = (window._ventasHoyNeto && window._ventasHoyNeto.pedidosData) || window.pedidos || [];
    constcobrados = fuente.filter(function(p) {
        returnp.estado==='cobrado' || p.estado==='entregado' ||
                p.estado==='enviado' || p.estado==='reserva_completada';
    });
    consttotalUSD = cobrados.reduce(function(s,p){ returns+(p.total||0); }, 0);
    returntotalUSD * diff;
};

// ==================== GESTIÓNDEADMINISTRADORESRECIENTES ====================
window.obtenerAdminsRecientes = function() {
    conststored = localStorage.getItem('saki_recent_admins');
    if (!stored) return [];
    try {
        constadmins = JSON.parse(stored);
        returnadmins.slice(0, 5);
    } catch(e) { return []; }
};

window.guardarAdminReciente = function(adminUser) {
    if (!adminUser || adminUser.rol !== 'admin') return;
    letrecent = window.obtenerAdminsRecientes();
    recent = recent.filter(a => a.id !== adminUser.id);
    recent.unshift({
        id: adminUser.id,
        nombre: adminUser.nombre,
        username: adminUser.username,
        foto: adminUser.foto || null,
        lastLogin: newDate().toISOString()
    });
    recent = recent.slice(0, 5);
    localStorage.setItem('saki_recent_admins', JSON.stringify(recent));
};

window.limpiarAdminsRecientes = function() {
    localStorage.removeItem('saki_recent_admins');
};

// Placeholderparaimágenes (SVGDataURI)
window.getPlaceholderImage = function(text = 'Admin') {
    constinitial = text.charAt(0).toUpperCase();
    return `image/svg+xml,%3Csvgxmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crectwidth='48' height='48' fill='%23D32F2F'/%3E%3Ctextx='24' y='32' font-size='20' text-anchor='middle' fill='white' font-family='Arial'%3E${initial}%3C/text%3E%3C/svg%3E`;
};

// Alertamodernaypremiumparaconfirmareliminaciones
window.mostrarConfirmacionPremium = function(titulo, mensaje, onConfirm) {
    constoverlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
    overlay.innerHTML = `
        <divstyle="background:var(--card-bg);border-radius:16px;max-width:400px;width:100%;box-shadow:0 20px 40pxrgba(0,0,0,.4);border:1pxsolidvar(--border);overflow:hidden">
            <divstyle="background:linear-gradient(135deg,var(--primary),var(--primary-dark));padding:1rem 1.5rem;color:#fff">
                <h3style="margin:0;font-size:1.1rem"><iclass="fasfa-exclamation-triangle"></i> ${titulo}</h3>
            </div>
            <divstyle="padding:1.5rem">
                <pstyle="color:var(--text-dark);margin-bottom:1.5rem">${mensaje}</p>
                <divstyle="display:flex;gap:.75rem;justify-content:flex-end">
                    <buttonclass="btn-secondary" id="confirmPremiumCancel">Cancelar</button>
                    <buttonclass="btn-primary" id="confirmPremiumOk">Confirmar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    constcancelBtn = overlay.querySelector('#confirmPremiumCancel');
    constokBtn = overlay.querySelector('#confirmPremiumOk'); 
    constcleanup = () => overlay.remove();
    cancelBtn.addEventListener('click', cleanup);
    okBtn.addEventListener('click', () => {
        cleanup();
        if (onConfirm) onConfirm();
    });
};
})();
