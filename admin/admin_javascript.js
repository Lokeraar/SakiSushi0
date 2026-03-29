// ==================== VARIABLES GLOBALES ====================
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
window._currentClickArea = null;
window._stockOriginalValue = null;
window._debounceTimeout = null;
window._throttlePending = false;
window._realtimeChannels = [];

// WiFi persistentes
window.wifiSsidPersistente = localStorage.getItem('saki_wifi_ssid') || '';
window.wifiPasswordPersistente = localStorage.getItem('saki_wifi_pwd') || '';
window.platillosNotificados = JSON.parse(localStorage.getItem('saki_platillos_notificados') || '{}');
window.stockUpdateChannel = null;

// ==================== FUNCIÓN DE TOAST ====================
window.mostrarToast = function(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = mensaje;
        toast.className = `toast show ${tipo}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    } else {
        alert(mensaje);
    }
};

// ==================== FUNCIONES DE UTILIDAD AVANZADAS ====================
window.mostrarErrorEnModal = function(modalId, mensajeError) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const body = modal.querySelector('.modal-body');
    if (!body) return;
    
    let errorContainer = body.querySelector('.error-message-container');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.className = 'error-message-container';
        errorContainer.style.cssText = 'background:rgba(239,68,68,.15); border-left:4px solid var(--danger); padding:.75rem; border-radius:8px; margin-bottom:1rem; display:flex; align-items:center; gap:.5rem';
        errorContainer.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--danger)"></i><span style="flex:1; font-size:.85rem"></span>';
        body.insertBefore(errorContainer, body.firstChild);
    }
    
    const span = errorContainer.querySelector('span');
    if (span) span.textContent = mensajeError;
    errorContainer.style.display = 'flex';
    
    setTimeout(() => {
        if (errorContainer) errorContainer.style.display = 'none';
    }, 5000);
};

window.cerrarModalConLimpieza = function(modalId, cleanupFn = null) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        if (cleanupFn && typeof cleanupFn === 'function') {
            cleanupFn();
        }
    }
};

window.manejarErrorConReintento = async function(error, nombreFuncion, maxReintentos = 3, delay = 1000) {
    console.error(`❌ Error en ${nombreFuncion}:`, error);
    window.mostrarToast(`⚠️ Error en ${nombreFuncion}: ${error.message || error}`, 'error');
    
    for (let intento = 1; intento <= maxReintentos; intento++) {
        console.log(`🔄 Reintento ${intento}/${maxReintentos} para ${nombreFuncion}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        try {
            const resultado = await window[nombreFuncion]();
            window.mostrarToast(`✓ ${nombreFuncion} recuperado exitosamente`, 'success');
            return resultado;
        } catch (retryError) {
            console.error(`❌ Reintento ${intento} falló:`, retryError);
            if (intento === maxReintentos) {
                window.mostrarToast(`❌ Error persistente en ${nombreFuncion}. Revisa conexión.`, 'error');
                throw retryError;
            }
        }
    }
};

window._notificarAdminStockCritico = async function(ingredienteNombre) {
    try {
        let adminSessionId = localStorage.getItem('saki_admin_session_id');
        if (!adminSessionId) {
            adminSessionId = 'admin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            localStorage.setItem('saki_admin_session_id', adminSessionId);
        }
        
        const { error } = await window.supabaseClient.from('notificaciones').insert([{
            pedido_id: null,
            tipo: 'stock_critico',
            titulo: '⚠️ Stock crítico',
            mensaje: `El ingrediente "${ingredienteNombre}" está por debajo del mínimo. Revisa el inventario.`,
            session_id: adminSessionId,
            leida: false
        }]);
        
        if (error) throw error;
        
    } catch (e) {
        console.error('Error notificando stock crítico:', e);
    }
};

// ==================== UTILIDADES ====================
window.formatBs = function(m) {
    try {
        const valor = Math.round((m || 0) * 100) / 100;
        let [entero, decimal] = valor.toFixed(2).split('.');
        entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return 'Bs ' + entero + ',' + decimal;
    } catch (e) {
        return 'Bs ' + (m || 0).toFixed(2);
    }
};

window.formatUSD = function(m) {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(m);
    } catch (e) {
        return '$ ' + (m || 0).toFixed(2);
    }
};

window.usdToBs = function(u) {
    return u * (window.configGlobal?.tasa_efectiva || 400);
};

window.generarId = function(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

window.escapeHtml = function(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
};

window.cerrarModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
};

window.mostrarLogin = function() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('panelContainer').classList.remove('active');
};

// ==================== DEBOUNCE / THROTTLE ====================
window.debounce = function(func, wait) {
    return function(...args) {
        clearTimeout(window._debounceTimeout);
        window._debounceTimeout = setTimeout(() => func.apply(this, args), wait);
    };
};

window.throttle = function(func, limit) {
    return function(...args) {
        if (!window._throttlePending) {
            window._throttlePending = true;
            func.apply(this, args);
            setTimeout(() => { window._throttlePending = false; }, limit);
        }
    };
};

// ==================== WRAPPER SEGURO PARA LLAMADAS SUPABASE ====================
window.safeSupabaseCall = async (promise, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
        try {
            const result = await promise;
            return result;
        } catch (error) {
            if (window.interceptarError401(error)) {
                throw new Error('Sesión expirada');
            }
            if (i === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
};

// ==================== LOGIN CON MANEJO DE JWT ====================
window.hacerLogin = async function() {
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
        if (!data.success) { window.mostrarToast(data.error || 'Contraseña incorrecta', 'error'); return; }
        if (data.user.rol !== 'admin') { window.mostrarToast('Acceso denegado. Se requiere rol de administrador.', 'error'); return; }

        window.isAdminAuthenticated = true;
        window.jwtToken = data.token;
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_jwt_token', window.jwtToken);
        sessionStorage.setItem('admin_user', JSON.stringify(data.user));
        window.supabaseClient = window.inicializarSupabaseCliente(window.jwtToken);
        
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('panelContainer').classList.add('active');
        window.mostrarToast('✓ Bienvenido Administrador', 'success');
        
        setTimeout(async () => {
            try {
                await window.cargarConfiguracionInicial();
                await Promise.allSettled([
                    window.cargarMenu(),
                    window.cargarInventario(),
                    window.cargarUsuarios(),
                    window.cargarQRs(),
                    window.cargarMesoneros(),
                    window.cargarDeliverys(),
                    window.cargarReportes(),
                    window.cargarPedidosRecientes(),
                    window.cargarPropinas()
                ]);
                window.setupEventListeners();
                window.setupRealtimeSubscriptions();
                window.setupStockRealtime();
                window.restaurarWifiPersistente();
                
                window._verificarTasaDeHoy((tasa) => {
                    const tasaInput = document.getElementById('tasaBaseInput');
                    if (tasaInput) tasaInput.value = tasa;
                    window.configGlobal.tasa_cambio = tasa;
                    window.recalcularTasaEfectiva();
                });
                
                await window._actualizarVentasHoyNeto();
                await window._actualizarDeliverysHoy();
                
            } catch (e) { 
                console.error('Error cargando datos:', e); 
                window.mostrarToast('Error cargando datos: ' + e.message, 'error'); 
            }
        }, 500);
    } catch (error) {
        console.error('Error:', error);
        window.mostrarToast('Error: ' + error.message, 'error');
    } finally {
        if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = 'Ingresar'; }
    }
};

window.interceptarError401 = function(error) {
    if (error?.status === 401 || error?.message?.includes('JWT') || error?.code === 'PGRST301') {
        window.mostrarToast('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
        sessionStorage.removeItem('admin_authenticated');
        sessionStorage.removeItem('admin_jwt_token');
        sessionStorage.removeItem('admin_user');
        window.mostrarLogin();
        return true;
    }
    return false;
};

// ==================== CARGA DE DATOS DESDE SUPABASE ====================
window.cargarConfiguracion = async function() {
    try {
        const { data, error } = await window.safeSupabaseCall(window.supabaseClient.from('config').select('*').eq('id', 1).single());
        if (error && error.code !== 'PGRST116') throw error;
        window.configGlobal = { ...window.configGlobal, ...(data || {}) };
        window.configGlobal.tasa_cambio = window.configGlobal.tasa_cambio || 400;
        window.configGlobal.tasa_efectiva = window.configGlobal.tasa_efectiva || 400;
        window.configGlobal.admin_password = window.configGlobal.admin_password || 'admin123';
        window.configGlobal.recovery_email = window.configGlobal.recovery_email || 'admin@sakisushi.com';
    } catch (e) {
        console.error('Error cargando configuración:', e);
        window.configGlobal = {
            tasa_cambio: 400, tasa_efectiva: 400, aumento_diario: 0,
            aumento_activo: false, aumento_semanal: false,
            admin_password: 'admin123', recovery_email: 'admin@sakisushi.com'
        };
    }
};

window.cargarConfiguracionInicial = async function() {
    await window.cargarConfiguracion();
    window.actualizarTasaUI();
    window.recalcularTasaEfectiva();
};

window.actualizarTasaUI = function() {
    const baseInput = document.getElementById('tasaBaseInput');
    if (baseInput) baseInput.value = window.configGlobal.tasa_cambio || 400;
    const diarioInput = document.getElementById('aumentoDiarioInput');
    if (diarioInput) diarioInput.value = window.configGlobal.aumento_diario || 0;
    const diarioToggle = document.getElementById('aumentoActivoToggle');
    if (diarioToggle) diarioToggle.checked = window.configGlobal.aumento_activo || false;
    const semanalToggle = document.getElementById('aumentoSemanalToggle');
    if (semanalToggle) semanalToggle.checked = window.configGlobal.aumento_semanal || false;
    const efectivaDisplay = document.getElementById('tasaEfectivaDisplay');
    if (efectivaDisplay) efectivaDisplay.textContent = (window.configGlobal.tasa_efectiva || 400).toFixed(2);
    const acumuladoDisplay = document.getElementById('aumentoAcumuladoDisplay');
    if (acumuladoDisplay) acumuladoDisplay.textContent = (window.configGlobal.aumento_acumulado || 0).toFixed(2) + '%';
};

window.cargarMenu = async function() {
    try {
        const { data, error } = await window.safeSupabaseCall(window.supabaseClient.from('menu').select('*'));
        if (error) throw error;
        window.menuItems = data || [];
        window.renderizarMenu(window._menuBuscadorValue || '');
        window.actualizarProductosActivos();
    } catch (e) { 
        console.error('Error cargando menú:', e); 
        window.mostrarToast('Error cargando menú', 'error');
        window.menuItems = [];
        window.renderizarMenu('');
    }
};

window.cargarInventario = async function(retry = 0) {
    try {
        console.log('🔄 Cargando inventario desde Supabase...');
        const { data, error } = await window.safeSupabaseCall(window.supabaseClient.from('inventario').select('*'));
        if (error) throw error;
        window.inventarioItems = data || [];
        console.log(`✅ Inventario cargado: ${window.inventarioItems.length} ingredientes`);
        window.renderizarInventario(window._inventarioBuscadorValue || '');
        window.actualizarAlertasStock();
        window.actualizarStockCriticoHeader();
        window.verificarStockCritico();
        await window.cargarMenu();
    } catch (e) {
        console.error('❌ Error cargando inventario:', e);
        if (retry < 2) {
            setTimeout(() => window.cargarInventario(retry + 1), 3000);
            window.mostrarToast('Reintentando cargar inventario...', 'warning');
        } else {
            window.mostrarToast('Error cargando inventario. Algunas funciones pueden no estar disponibles.', 'error');
            window.inventarioItems = [];
            window.renderizarInventario('');
        }
    }
};

window.cargarMesoneros = async function(retry = 0) {
    try {
        console.log('🔄 Cargando mesoneros desde Supabase...');
        const { data, error } = await window.safeSupabaseCall(window.supabaseClient.from('mesoneros').select('*').order('nombre'));
        if (error) throw error;
        window.mesoneros = data || [];
        console.log(`✅ Mesoneros cargados: ${window.mesoneros.length}`);
        await window.renderizarMesoneros(window._mesonerosBuscadorValue || '');
        window.renderizarPropinas();
    } catch (e) {
        console.error('❌ Error cargando mesoneros:', e);
        if (retry < 2) {
            setTimeout(() => window.cargarMesoneros(retry + 1), 3000);
            window.mostrarToast('Reintentando cargar mesoneros...', 'warning');
        } else {
            window.mostrarToast('Error cargando mesoneros', 'error');
            window.mesoneros = [];
            window.renderizarMesoneros('');
        }
    }
};

window.cargarDeliverys = async function(retry = 0) {
    try {
        console.log('🔄 Cargando deliverys desde Supabase...');
        const { data, error } = await window.safeSupabaseCall(window.supabaseClient.from('deliverys').select('*').order('nombre'));
        if (error) throw error;
        window.deliverys = data || [];
        console.log(`✅ Deliverys cargados: ${window.deliverys.length}`);
        await window.renderizarDeliverys(window._deliverysBuscadorValue || '');
    } catch (e) {
        console.error('❌ Error cargando deliverys:', e);
        if (retry < 2) {
            setTimeout(() => window.cargarDeliverys(retry + 1), 3000);
            window.mostrarToast('Reintentando cargar deliverys...', 'warning');
        } else {
            window.mostrarToast('Error cargando deliverys', 'error');
            window.deliverys = [];
            window.renderizarDeliverys('');
        }
    }
};

window.cargarUsuarios = async function() {
    try {
        const { data, error } = await window.safeSupabaseCall(window.supabaseClient.from('usuarios').select('*').order('nombre'));
        if (error) throw error;
        window.usuarios = data || [];
        window.renderizarUsuarios();
    } catch (e) { console.error('Error cargando usuarios:', e); window.mostrarToast('Error cargando usuarios', 'error'); }
};

window.cargarQRs = async function() {
    try {
        const { data, error } = await window.safeSupabaseCall(window.supabaseClient.from('codigos_qr').select('*').order('fecha', { ascending: false }));
        if (error) throw error;
        window.qrCodes = data || [];
        window.renderizarQRs();
        const ssid = localStorage.getItem('saki_wifi_ssid');
        const pwd = localStorage.getItem('saki_wifi_pwd');
        if (ssid) { const el = document.getElementById('qrWifiSsid'); if (el) el.value = ssid; }
        if (pwd) { const el = document.getElementById('qrWifiPassword'); if (el) el.value = pwd; }
    } catch (e) { console.error('Error cargando QRs:', e); window.mostrarToast('Error cargando QRs', 'error'); }
};

window.cargarPropinas = async function() {
    try {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
        const { data, error } = await window.safeSupabaseCall(
            window.supabaseClient
                .from('propinas')
                .select('*, mesoneros(nombre)')
                .gte('fecha', hoy.toISOString())
                .lt('fecha', manana.toISOString())
                .order('fecha', { ascending: false })
        );
        if (error) throw error;
        window.propinas = data || [];
        window.renderizarPropinas();
    } catch (e) { console.error('Error cargando propinas:', e); }
};

window.cargarPedidosRecientes = async function() {
    try {
        const { data, error } = await window.safeSupabaseCall(window.supabaseClient.from('pedidos').select('*').order('fecha', { ascending: false }).limit(5));
        if (error) throw error;
        const pedidosCount = document.getElementById('pedidosCountBadge');
        if (pedidosCount) pedidosCount.textContent = (data || []).length;
        
        document.getElementById('pedidosRecientes').innerHTML = (data || []).map(p => {
            const hora = new Date(p.fecha).toLocaleTimeString('es-VE', {hour:'2-digit',minute:'2-digit'});
            const fecha = new Date(p.fecha).toLocaleDateString('es-VE', {day:'2-digit',month:'2-digit'});
            const items = (p.items || []).slice(0,2).map(i => `${i.cantidad||1}x ${i.nombre}`).join(', ');
            const masItems = (p.items||[]).length > 2 ? ` +${(p.items||[]).length-2} más` : '';
            const tipoIcon = p.tipo==='delivery' ? '🛵' : p.tipo==='reserva' ? '📅' : '🍽️';
            const tipoColor = p.tipo==='delivery' ? 'var(--delivery)' : p.tipo==='reserva' ? 'var(--propina)' : 'var(--info)';
            const totalBs = window.formatBs(window.usdToBs(p.total||0));
            const estadoText = p.estado ? p.estado.replace(/_/g,' ') : '';
            const estadoColor = p.estado === 'entregado' ? 'var(--success)' : p.estado === 'en_camino' ? 'var(--delivery)' : p.estado === 'en_cocina' ? 'var(--warning)' : 'var(--text-muted)';
            
            return `<div class="pedido-item-modern" style="background:var(--card-bg); border-radius:12px; padding:.8rem 1rem; border:1px solid var(--border); margin-bottom:.6rem; cursor:pointer" onclick="window._abrirDetallePedidoAdmin('${p.id}')">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:.5rem; margin-bottom:.5rem">
                            <div style="display:flex; align-items:center; gap:.6rem; flex-wrap:wrap">
                                <span style="font-size:1.1rem">${tipoIcon}</span>
                                <span style="font-weight:700; color:${tipoColor}">${p.tipo || 'mesa'} ${p.mesa ? `· Mesa ${p.mesa}` : ''}</span>
                                <span style="font-size:.7rem; background:${estadoColor}20; color:${estadoColor}; padding:.2rem .6rem; border-radius:20px; font-weight:600">${estadoText || 'pendiente'}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:.5rem">
                                <span style="font-size:.7rem; color:var(--text-muted)">${fecha} ${hora}</span>
                                <span style="font-weight:800; color:var(--accent); font-size:.9rem">${totalBs}</span>
                            </div>
                        </div>
                        <div style="font-size:.75rem; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:.3rem">
                            <span><i class="fas fa-receipt" style="width:14px; margin-right:.3rem"></i> ${items || 'Sin items'}</span>
                            ${masItems ? `<span style="color:var(--accent)">${masItems}</span>` : ''}
                        </div>
                    </div>`;
        }).join('') || '<div style="text-align:center; padding:1rem; color:var(--text-muted)"><i class="fas fa-inbox"></i><p>No hay pedidos recientes</p></div>';
    } catch (e) { console.error('Error cargando pedidos recientes:', e); }
};

window._abrirDetallePedidoAdmin = function(pedidoId) {
    window.mostrarToast(`Pedido: ${pedidoId}`, 'info');
};

// ==================== RENDERIZADO CON DEBOUNCE ====================
window._menuBuscadorValue = '';
window._inventarioBuscadorValue = '';
window._mesonerosBuscadorValue = '';
window._deliverysBuscadorValue = '';

window.renderizarMenu = window.debounce(function(filtro = '') {
    window._menuBuscadorValue = filtro;
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    
    const _norm = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
    const _base = [...window.menuItems].sort((a,b) => a.nombre.localeCompare(b.nombre));
    const items = filtro ? _base.filter(item => _norm(item.nombre).includes(_norm(filtro))) : _base;
    
    if (!items.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;padding:.5rem">' +
            (filtro ? 'Sin resultados para "' + filtro + '"' : 'No hay platillos registrados.') + '</p>';
        return;
    }
    
    grid.innerHTML = items.map(item => {
        const ingredientesEstado = [];
        let todosDisponibles = true;
        if (item.ingredientes) {
            for (const [ingId, ingInfo] of Object.entries(item.ingredientes)) {
                const ing = window.inventarioItems.find(i => i.id === ingId);
                const disponible = ing && (ing.stock - ing.reservado) >= (ingInfo.cantidad || 0);
                if (!disponible) todosDisponibles = false;
                ingredientesEstado.push({ nombre: ingInfo.nombre || ingId, disponible });
            }
        }
        const disponibleFinal = item.disponible && todosDisponibles;
        const imgSrc = item.imagen || '';
        
        return `<div class="menu-card-v2${item.disponible ? '' : ' no-disponible'}">
                    <div class="mc2-header">
                        <div class="mc2-info">
                            <div class="mc2-nombre">${window.escapeHtml(item.nombre)}</div>
                            <div class="mc2-cat">${window.escapeHtml(item.categoria || '')}${item.subcategoria ? ' · ' + window.escapeHtml(item.subcategoria) : ''}</div>
                            <div class="mc2-precio">
                                ${window.formatUSD(item.precio || 0)}
                                <span class="mc2-precio-bs">/ ${window.formatBs(window.usdToBs(item.precio || 0))}</span>
                                <i class="fas fa-info-circle" style="font-size:.7rem; margin-left:.3rem; color:var(--text-muted); cursor:help" data-tooltip="El precio se convertirá a la tasa efectiva y se mostrará en bolívares al cliente."></i>
                            </div>
                            <div class="mc2-stock-line">
                                Stock: <span class="mc2-stock-val">${item.stock || 0}</span>
                                <span class="mc2-badge ${disponibleFinal ? 'mc2-badge-ok' : 'mc2-badge-off'}">
                                    ${disponibleFinal ? 'Disponible' : 'No disponible'}
                                </span>
                            </div>
                        </div>
                        ${imgSrc ? `<div class="mc2-img-wrap"><img src="${imgSrc}" class="mc2-img" alt="${window.escapeHtml(item.nombre)}" onerror="this.parentElement.style.display='none'"></div>` : ''}
                    </div>
                    ${item.descripcion ? `<div class="mc2-desc">${window.escapeHtml(item.descripcion)}</div>` : ''}
                    <div class="mc2-tags">${ingredientesEstado.map(ing =>
                        `<span class="ing-tag ${ing.disponible ? '' : 'ing-tag-sin-stock'}" title="${ing.disponible ? 'En stock' : 'Sin stock suficiente'}">
                            ${window.escapeHtml(ing.nombre)} <i class="fas fa-${ing.disponible ? 'check' : 'times'}" style="font-size:.55rem;margin-left:2px"></i>
                         </span>`
                    ).join('') || '<span class="ing-tag" style="opacity:.5">Sin ingredientes</span>'}</div>
                    <div class="mc2-actions">
                        <label style="display:flex;align-items:center;gap:.35rem;cursor:pointer;margin-right:.25rem"
                            title="${disponibleFinal ? 'Marcar como no disponible' : 'Marcar como disponible'}">
                            <span style="font-size:.72rem;color:${disponibleFinal ? 'var(--success)' : 'var(--text-muted)'};font-weight:600">
                                ${disponibleFinal ? 'Disponible' : 'No disponible'}
                            </span>
                            <input type="checkbox" ${item.disponible ? 'checked' : ''}
                                style="accent-color:var(--success);cursor:pointer"
                                onchange="window.toggleDisponiblePlatillo('${item.id}', this.checked)">
                        </label>
                        <button class="btn-icon edit" onclick="window.editarPlatillo('${item.id}')" title="Editar platillo">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-icon delete" onclick="window.eliminarPlatillo('${item.id}')" title="Eliminar platillo">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`;
    }).join('');
}, 300);

// ==================== RENDERIZADO DE INVENTARIO (MEJORADO) ====================
window._invActiveId = null;

window.renderizarInventario = window.debounce(function(filtro = '') {
    window._inventarioBuscadorValue = filtro;
    const container = document.getElementById('inventarioGrid');
    if (!container) return;
    
    const _normI = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
    const _baseI = [...window.inventarioItems].sort((a,b) => a.nombre.localeCompare(b.nombre));
    const items = filtro ? _baseI.filter(i => _normI(i.nombre).includes(_normI(filtro))) : _baseI;
    
    if (!items.length) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:.75rem">' +
            (filtro ? 'Sin resultados para "' + filtro + '"' : 'No hay ingredientes registrados.') + '</p>';
        window.actualizarStockCriticoHeader();
        return;
    }
    
    const wasActive = window._invActiveId;
    const isMobile = window.innerWidth <= 768;
    
    container.innerHTML = '';
    
    items.forEach(item => {
        const disponible = (item.stock||0) - (item.reservado||0);
        const estado = disponible <= 0 ? 'critico' : disponible <= (item.minimo||0) ? 'bajo' : 'ok';
        const isActive = item.id === window._invActiveId;
        
        const listItem = document.createElement('div');
        listItem.className = `inv-list-item${isActive ? ' active' : ''}`;
        listItem.id = `invItem_${item.id}`;
        listItem.setAttribute('data-ingrediente-id', item.id);
        listItem.innerHTML = `
            <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${window.escapeHtml(item.nombre)}</span>
            <span class="inv-item-badge ${estado}">${disponible} ${item.unidad_base||'u'}</span>
        `;
        
        listItem.addEventListener('click', (function(ingId) {
            return function() { window._invSeleccionarIngrediente(ingId); };
        })(item.id));
        
        container.appendChild(listItem);
        
        if (isMobile && isActive) {
            const detailDiv = document.createElement('div');
            detailDiv.className = 'inv-mobile-detail';
            detailDiv.id = `invMobileDetail_${item.id}`;
            detailDiv.style.cssText = 'margin:0.5rem 0 0.75rem 0; padding:0.75rem; background:var(--card-bg); border-radius:10px; border:1px solid var(--border); border-top:2px solid var(--info)';
            detailDiv.innerHTML = window._generarDetalleHTML(item);
            container.appendChild(detailDiv);
        }
    });
    
    if (!isMobile && window._invActiveId) {
        const activeItem = items.find(i => i.id === window._invActiveId);
        if (activeItem) {
            const col = document.getElementById('invDetailCol');
            if (col) col.innerHTML = window._generarDetalleHTML(activeItem);
        }
    } else if (!isMobile && !window._invActiveId) {
        const col = document.getElementById('invDetailCol');
        if (col) col.innerHTML = '<div class="inv-detail-empty" id="invDetailEmpty"><i class="fas fa-hand-point-left" style="font-size:2rem;margin-bottom:.75rem;display:block;opacity:.3"></i>Selecciona un ingrediente de la lista para ver su detalle</div>';
    }
    
    window.actualizarStockCriticoHeader();
}, 300);

window._generarDetalleHTML = function(item) {
    const estado = (item.stock||0)-(item.reservado||0) <= 0 ? 'critico'
        : (item.stock||0)-(item.reservado||0) <= (item.minimo||0) ? 'bajo' : 'ok';
    const disponible = (item.stock||0) - (item.reservado||0);
    const porcentaje = item.minimo > 0 ? Math.min((disponible/item.minimo)*100, 100) : 100;
    const colorEstado = estado === 'critico' ? 'var(--danger)' : estado === 'bajo' ? 'var(--warning)' : 'var(--success)';
    
    return `<div class="inv-detail-card">
                <div class="inv-detail-title">
                    <span>${window.escapeHtml(item.nombre)}</span>
                    <button class="inv-detail-close" onclick="window._invCerrarDetalle()" title="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="inv-stock-row" style="margin-bottom:.5rem">
                    <span class="inv-stock-num ${estado}" style="font-size:2rem">${disponible}</span>
                    <span class="inv-stock-unit" style="font-size:.9rem">${item.unidad_base||'u'}</span>
                    <span style="font-size:.75rem;color:var(--text-muted);margin-left:auto">Reservado: ${item.reservado||0}</span>
                </div>
                <div class="inv-bar" style="margin-bottom:.85rem"><div class="inv-bar-fill ${estado}" style="width:${porcentaje}%"></div></div>
                <div class="inv-meta-grid">
                    <div class="inv-meta-item">
                        <span class="inv-meta-label">Mínimo</span>
                        <span class="inv-meta-val" style="color:${colorEstado}">${item.minimo||0} ${item.unidad_base||'u'}</span>
                    </div>
                    <div class="inv-meta-item">
                        <span class="inv-meta-label">Costo</span>
                        <span class="inv-meta-val">${window.formatUSD(item.precio_costo||0)}</span>
                        <span class="inv-meta-bs">${window.formatBs(window.usdToBs(item.precio_costo||0))}</span>
                    </div>
                    <div class="inv-meta-item">
                        <span class="inv-meta-label">Venta</span>
                        <span class="inv-meta-val">${window.formatUSD(item.precio_unitario||0)}</span>
                        <span class="inv-meta-bs">${window.formatBs(window.usdToBs(item.precio_unitario||0))}</span>
                    </div>
                </div>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                    <button class="btn-icon edit" onclick="window.editarIngrediente('${item.id}')" title="Editar ingrediente" style="width:auto;padding:.45rem .9rem;border-radius:8px">
                        <i class="fas fa-pen"></i> Editar
                    </button>
                    <button class="btn-icon delete" onclick="window.eliminarIngrediente('${item.id}')" title="Eliminar ingrediente" style="width:auto;padding:.45rem .9rem;border-radius:8px">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>`;
};

window._invSeleccionarIngrediente = function(ingredienteId) {
    const item = window.inventarioItems.find(i => i.id === ingredienteId);
    if (!item) return;
    
    const wasActive = window._invActiveId === ingredienteId;
    const isMobile = window.innerWidth <= 768;
    
    if (wasActive) {
        window._invActiveId = null;
        if (isMobile) {
            const detailDiv = document.getElementById(`invMobileDetail_${ingredienteId}`);
            if (detailDiv) detailDiv.remove();
        } else {
            const col = document.getElementById('invDetailCol');
            if (col) col.innerHTML = '<div class="inv-detail-empty" id="invDetailEmpty"><i class="fas fa-hand-point-left" style="font-size:2rem;margin-bottom:.75rem;display:block;opacity:.3"></i>Selecciona un ingrediente de la lista para ver su detalle</div>';
        }
        document.querySelectorAll('.inv-list-item').forEach(el => el.classList.remove('active'));
    } else {
        window._invActiveId = ingredienteId;
        document.querySelectorAll('.inv-list-item').forEach(el => el.classList.remove('active'));
        const selectedEl = document.getElementById(`invItem_${ingredienteId}`);
        if (selectedEl) selectedEl.classList.add('active');
        
        if (isMobile) {
            document.querySelectorAll('.inv-mobile-detail').forEach(el => el.remove());
            const detailDiv = document.createElement('div');
            detailDiv.className = 'inv-mobile-detail';
            detailDiv.id = `invMobileDetail_${ingredienteId}`;
            detailDiv.style.cssText = 'margin:0.5rem 0 0.75rem 0; padding:0.75rem; background:var(--card-bg); border-radius:10px; border:1px solid var(--border); border-top:2px solid var(--info)';
            detailDiv.innerHTML = window._generarDetalleHTML(item);
            selectedEl.insertAdjacentElement('afterend', detailDiv);
        } else {
            const col = document.getElementById('invDetailCol');
            if (col) col.innerHTML = window._generarDetalleHTML(item);
        }
    }
};

window._invCerrarDetalle = function() {
    const isMobile = window.innerWidth <= 768;
    const wasActive = window._invActiveId;
    
    window._invActiveId = null;
    document.querySelectorAll('.inv-list-item').forEach(el => el.classList.remove('active'));
    
    if (isMobile && wasActive) {
        document.querySelectorAll('.inv-mobile-detail').forEach(el => el.remove());
    } else {
        const col = document.getElementById('invDetailCol');
        if (col) col.innerHTML = '<div class="inv-detail-empty" id="invDetailEmpty"><i class="fas fa-hand-point-left" style="font-size:2rem;margin-bottom:.75rem;display:block;opacity:.3"></i>Selecciona un ingrediente de la lista para ver su detalle</div>';
    }
};

// ==================== RENDERIZADO DE USUARIOS ====================
window.renderizarUsuarios = function() {
    const grid = document.getElementById('usuariosGrid');
    if (!grid) return;
    if (!window.usuarios || !window.usuarios.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem">No hay cajeros registrados.</p>';
        return;
    }
    grid.innerHTML = window.usuarios.map(user => {
        const inicial = (user.nombre || '?').charAt(0).toUpperCase();
        return `<div class="usuario-card">
                    <div class="usuario-avatar">${inicial}</div>
                    <div class="usuario-info">
                        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
                            <span class="usuario-nombre">${user.nombre}</span>
                            ${user.activo 
                                ? '<span class="status-activo"><i class="fas fa-check-circle"></i> Activo</span>'
                                : '<span class="status-inactivo"><i class="fas fa-circle"></i> Inactivo</span>'}
                        </div>
                        <div class="usuario-username">@${user.username} · ${user.rol || 'cajero'}</div>
                    </div>
                    <div class="usuario-actions">
                        <button class="btn-toggle ${user.activo ? 'btn-toggle-on' : 'btn-toggle-off'}"
                            onclick="window.toggleUsuarioActivo('${user.id}', ${!user.activo})">
                            ${user.activo ? 'Inhabilitar' : 'Activar'}
                        </button>
                        <button class="btn-icon delete" onclick="window.eliminarUsuario('${user.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`;
    }).join('');
};

// ==================== RENDERIZADO DE MESONEROS (CON BUSCADOR) ====================
window.renderizarMesoneros = window.debounce(async function(filtro = '') {
    window._mesonerosBuscadorValue = filtro;
    const container = document.getElementById('mesonerosList');
    if (!container) return;
    
    if (!window.mesoneros || !window.mesoneros.length) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem">No hay mesoneros registrados.</p>';
        return;
    }
    
    const _normM = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
    let filtered = [...window.mesoneros];
    if (filtro) {
        filtered = filtered.filter(m => _normM(m.nombre).includes(_normM(filtro)));
    }
    
    let acumulados = {};
    try {
        const { data: allProp } = await window.safeSupabaseCall(
            window.supabaseClient
                .from('propinas')
                .select('mesonero_id, monto_bs, entregado')
                .eq('entregado', false)
        );
        (allProp || []).forEach(p => {
            acumulados[p.mesonero_id] = (acumulados[p.mesonero_id] || 0) + (p.monto_bs || 0);
        });
    } catch(e) { console.error('Error obteniendo acumulado propinas:', e); }

    const sorted = filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
    container.innerHTML = sorted.map(m => {
        const inicial = m.nombre.charAt(0).toUpperCase();
        const acum = acumulados[m.id] || 0;
        const hayAcum = acum > 0;
        return `<div class="mesonero-card">
                    <div class="mesonero-avatar">${inicial}</div>
                    <div style="flex:1;min-width:0">
                        <span class="mesonero-nombre">${m.nombre}</span>
                        <div style="font-size:.72rem;color:${hayAcum ? 'var(--propina)' : 'var(--text-muted)'};font-weight:${hayAcum ? '700' : '400'};margin-top:2px">
                            Propinas pendientes: ${window.formatBs(acum)}
                        </div>
                    </div>
                    ${m.activo 
                        ? '<span class="status-activo"><i class="fas fa-check-circle"></i> Activo</span>'
                        : '<span class="status-inactivo"><i class="fas fa-circle"></i> Inactivo</span>'}
                    <div class="mesonero-actions">
                        ${hayAcum ? `<button class="btn-sm" style="background:linear-gradient(135deg,var(--propina),#7B1FA2);color:#fff;white-space:nowrap"
                            onclick="window.pagarPropinaMesonero('${m.id}', '${m.nombre}', ${acum})">
                            <i class="fas fa-hand-holding-heart"></i> Pagar
                        </button>` : ''}
                        <button class="btn-toggle ${m.activo ? 'btn-toggle-on' : 'btn-toggle-off'}"
                            onclick="window.toggleMesoneroActivo('${m.id}', ${!m.activo})">
                            ${m.activo ? 'Inhabilitar' : 'Activar'}
                        </button>
                        <button class="btn-icon delete" onclick="window.eliminarMesonero('${m.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`;
    }).join('');
}, 300);

// ==================== RENDERIZADO DE DELIVERYS (CON BUSCADOR) ====================
window.renderizarDeliverys = window.debounce(async function(filtro = '') {
    window._deliverysBuscadorValue = filtro;
    const grid = document.getElementById('deliverysGrid');
    if (!grid) return;
    if (window._renderizandoDeliverys) return;
    window._renderizandoDeliverys = true;
    grid.innerHTML = '';
    
    const _normD = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
    let filtered = [...(window.deliverys || [])];
    if (filtro) {
        filtered = filtered.filter(d => _normD(d.nombre).includes(_normD(filtro)));
    }
    
    try {
        for (const d of filtered) {
            const acumulado = await window.obtenerAcumuladoDelivery(d.id);
            const card = document.createElement('div');
            card.className = 'delivery-item';
            card.innerHTML = `
                <div class="delivery-icon"><i class="fas fa-motorcycle"></i></div>
                <div style="flex:1;min-width:0">
                    <div class="delivery-nombre">${d.nombre}</div>
                    <div style="font-size:.72rem;margin-top:2px">Acumulado: <strong>${window.formatBs(acumulado)}</strong></div>
                </div>
                <div class="delivery-actions">
                    <button class="btn-icon edit" onclick="window.editarDelivery('${d.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-toggle ${d.activo ? 'btn-toggle-on' : 'btn-toggle-off'}" onclick="window.toggleDeliveryActivo('${d.id}', ${!d.activo})">
                        ${d.activo ? 'Inhabilitar' : 'Activar'}
                    </button>
                    <button class="btn-sm" style="background:linear-gradient(135deg,var(--success),#2E7D32);color:#fff"
                        onclick="window.mostrarPagoDelivery('${d.id}')">
                        <i class="fas fa-hand-holding-usd"></i> Pagado
                    </button>
                    <button class="btn-icon delete" onclick="window.eliminarDelivery('${d.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
            grid.appendChild(card);
        }
        if (filtered.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;padding:.5rem">' + (filtro ? 'Sin resultados para "' + filtro + '"' : 'No hay motorizados registrados.') + '</p>';
        }
    } finally { window._renderizandoDeliverys = false; }
}, 300);

window.renderizarPropinas = function() {
    const total = window.propinas.reduce((s, p) => s + (p.monto_bs || 0), 0);
    const cantidad = window.propinas.length;
    const promedio = cantidad > 0 ? total / cantidad : 0;
    
    const totalEl = document.getElementById('propinasTotal');
    if (totalEl) totalEl.textContent = window.formatBs(total);
    const cantidadEl = document.getElementById('propinasCantidad');
    if (cantidadEl) cantidadEl.textContent = cantidad;
    const promedioEl = document.getElementById('propinasPromedio');
    if (promedioEl) promedioEl.textContent = window.formatBs(promedio);
    
    const propinasDashboard = document.getElementById('propinasHoyDashboard');
    if (propinasDashboard) propinasDashboard.textContent = window.formatBs(total);
    
    const tbody = document.getElementById('propinasTableBody');
    if (tbody) {
        tbody.innerHTML = window.propinas.map(p => `
                  <tr>
                    <td>${new Date(p.fecha).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</td>
                    <td>${p.mesoneros?.nombre || 'N/A'}</td>
                    <td>${p.mesa || 'N/A'}</td>
                    <td>${p.metodo}</td>
                    <td>${window.formatBs(p.monto_bs)}</td>
                    <td>${p.cajero || 'N/A'}</td>
                  </tr>
        `).join('');
    }
};

window.renderizarQRs = function() {
    const grid = document.getElementById('qrGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const ssid = localStorage.getItem('saki_wifi_ssid') || '';
    const pwd = localStorage.getItem('saki_wifi_pwd') || '';
    
    (window.qrCodes || []).forEach(qr => {
        const params = new URLSearchParams({ mesa: qr.nombre });
        if (ssid) params.set('wifi_ssid', ssid);
        if (pwd) params.set('wifi_pwd', pwd);
        const qrText = window.location.origin + '/SakiSushi0/Cliente/index.html?' + params.toString();
        const qrId = 'qr-' + qr.id;
        
        const card = document.createElement('div');
        card.className = 'qr-card-v2';
        card.title = 'Toca para ampliar';
        card.style.cursor = 'pointer';
        
        const qrDiv = document.createElement('div');
        qrDiv.id = qrId;
        qrDiv.className = 'qr-img-box';
        
        const nombre = document.createElement('div');
        nombre.className = 'qr-nombre-v2';
        nombre.textContent = (ssid ? '✓ ' : '') + qr.nombre;
        
        const btnDel = document.createElement('button');
        btnDel.className = 'btn-icon delete qr-del-btn';
        btnDel.title = 'Eliminar QR';
        btnDel.innerHTML = '<i class="fas fa-trash"></i>';
        btnDel.addEventListener('click', function(e) {
            e.stopPropagation();
            window.eliminarQR(qr.id);
        });
        
        card.appendChild(qrDiv);
        card.appendChild(nombre);
        card.appendChild(btnDel);
        
        card.addEventListener('click', function() {
            window.ampliarQR(qr.id, qr.nombre, qrText);
        });
        
        grid.appendChild(card);
        new QRCode(document.getElementById(qrId), { text: qrText, width: 140, height: 140 });
    });
};

// ==================== STOCK Y NOTIFICACIONES ====================
window.actualizarStockPrecalculado = function() {
    if (!window.inventarioItems || !window.menuItems) return;
    const platillosPorIngrediente = {};
    window.menuItems.forEach(platillo => {
        if (platillo.ingredientes) {
            Object.keys(platillo.ingredientes).forEach(ingId => {
                if (!platillosPorIngrediente[ingId]) platillosPorIngrediente[ingId] = [];
                platillosPorIngrediente[ingId].push(platillo);
            });
        }
    });
    window._platillosPorIngrediente = platillosPorIngrediente;
};

window.obtenerPlatillosPorIngrediente = function(ingredienteId) {
    if (!window._platillosPorIngrediente) window.actualizarStockPrecalculado();
    return window._platillosPorIngrediente[ingredienteId] || [];
};

window.verificarYNotificarStockReactivado = async function(ingredienteId, ingredienteNombre) {
    for (const platillo of window.menuItems) {
        if (!platillo.ingredientes || Object.keys(platillo.ingredientes).length === 0) continue;
        const usaIngrediente = Object.keys(platillo.ingredientes).some(id => id === ingredienteId);
        if (!usaIngrediente) continue;
        
        let stockDisponible = Infinity;
        for (const [ingId, ingInfo] of Object.entries(platillo.ingredientes)) {
            const ingrediente = window.inventarioItems.find(i => i.id === ingId);
            if (!ingrediente) { stockDisponible = 0; break; }
            const stockDisp = (ingrediente.stock || 0) - (ingrediente.reservado || 0);
            const cantidadNecesaria = ingInfo.cantidad || 1;
            const posible = Math.floor(stockDisp / cantidadNecesaria);
            stockDisponible = Math.min(stockDisponible, posible);
        }
        
        const estabaAgotado = window.platillosNotificados[platillo.id] === 'agotado';
        const ahoraDisponible = stockDisponible > 0;
        
        if (estabaAgotado && ahoraDisponible) {
            window.platillosNotificados[platillo.id] = 'disponible';
            localStorage.setItem('saki_platillos_notificados', JSON.stringify(window.platillosNotificados));
            
            const titulo = `✓ ${platillo.nombre} disponible de nuevo!`;
            const mensaje = `Ya tenemos ${platillo.nombre} en stock. ¡Pide ahora!`;
            
            try {
                const { data: pedidosUnicos } = await window.safeSupabaseCall(
                    window.supabaseClient
                        .from('pedidos')
                        .select('session_id')
                        .not('session_id', 'is', null)
                        .order('fecha', { ascending: false })
                );
                const sessionIds = [...new Set(pedidosUnicos?.map(p => p.session_id) || [])];
                for (const sessionId of sessionIds) {
                    await window.enviarNotificacionPush(titulo, mensaje, sessionId);
                }
                window.mostrarToast(`✓ Notificación enviada: ${platillo.nombre} disponible`, 'success');
            } catch (e) {
                console.error('Error enviando notificaciones masivas:', e);
            }
        } else if (!ahoraDisponible && !estabaAgotado) {
            window.platillosNotificados[platillo.id] = 'agotado';
            localStorage.setItem('saki_platillos_notificados', JSON.stringify(window.platillosNotificados));
        }
    }
};

window.setupStockRealtime = function() {
    if (window.stockUpdateChannel) {
        window.supabaseClient.removeChannel(window.stockUpdateChannel);
    }
    
    window.stockUpdateChannel = window.supabaseClient
        .channel('stock-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventario' }, async (payload) => {
            const index = window.inventarioItems.findIndex(i => i.id === payload.new.id);
            if (index !== -1) {
                window.inventarioItems[index] = payload.new;
            } else {
                window.inventarioItems.push(payload.new);
            }
            await window.verificarYNotificarStockReactivado(payload.new.id, payload.new.nombre);
            await window.recalcularStockPlatillos(payload.new.id);
            if (payload.new.stock > 0 && payload.old?.stock <= 0) {
                await window.enviarNotificacionPush(
                    '✓ Stock actualizado',
                    `El ingrediente ${payload.new.nombre} está disponible nuevamente. ¡Revisa el menú!`
                );
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, async () => {
            await window.cargarMenu();
        })
        .subscribe();
};

window.recalcularStockPlatillos = async function(ingredienteId = null) {
    let platillosARevisar = window.menuItems;
    if (ingredienteId) {
        platillosARevisar = window.menuItems.filter(platillo => 
            platillo.ingredientes && platillo.ingredientes[ingredienteId]
        );
        if (platillosARevisar.length === 0) return;
    }
    
    const updates = [];
    for (const platillo of platillosARevisar) {
        let stockDisponible = Infinity;
        let todosIngredientes = true;
        
        if (platillo.ingredientes && Object.keys(platillo.ingredientes).length > 0) {
            for (const [ingId, ingInfo] of Object.entries(platillo.ingredientes)) {
                const ingrediente = window.inventarioItems.find(i => i.id === ingId);
                if (!ingrediente) {
                    todosIngredientes = false;
                    stockDisponible = 0;
                    break;
                }
                const stockDisp = (ingrediente.stock || 0) - (ingrediente.reservado || 0);
                const cantidadNecesaria = ingInfo.cantidad || 1;
                const posible = Math.floor(stockDisp / cantidadNecesaria);
                stockDisponible = Math.min(stockDisponible, posible);
            }
        } else {
            stockDisponible = platillo.stock_maximo || 999;
        }
        
        const nuevoStock = todosIngredientes ? Math.max(0, stockDisponible) : 0;
        if (platillo.stock !== nuevoStock) {
            updates.push({ id: platillo.id, stock: nuevoStock });
            platillo.stock = nuevoStock;
        }
    }
    
    for (const update of updates) {
        await window.safeSupabaseCall(window.supabaseClient.from('menu').update({ stock: update.stock }).eq('id', update.id));
    }
    if (updates.length > 0) window.renderizarMenu(window._menuBuscadorValue || '');
};

window.verificarStockCritico = async function() {
    const stockCriticoDiv = document.getElementById('stockCritico');
    if (!stockCriticoDiv) return;
    
    const criticos = (window.inventarioItems || []).filter(item => {
        const disponible = (item.stock || 0) - (item.reservado || 0);
        const minimo = item.minimo || 0;
        return disponible <= minimo && minimo > 0;
    });
    
    if (criticos.length > 0) {
        stockCriticoDiv.innerHTML = criticos.map(item => {
            const disponible = (item.stock || 0) - (item.reservado || 0);
            const faltantes = (item.minimo || 0) - disponible;
            window._notificarAdminStockCritico(item.nombre);
            return `<div class="alert-item critical" style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;border-radius:8px;background:#ffebee;border-left:4px solid var(--danger);margin-bottom:.5rem">
                        <div>
                            <strong>${item.nombre}</strong><br>
                            Stock: ${disponible} / Mínimo: ${item.minimo || 0}
                            ${faltantes > 0 ? `(Faltan ${faltantes})` : ''}
                        </div>
                        <button class="btn-small" onclick="window.agregarStock('${item.id}')" style="background:var(--primary);color:#fff;border:none;padding:.3rem .7rem;border-radius:4px;cursor:pointer">
                            <i class="fas fa-plus"></i> Agregar
                        </button>
                    </div>`;
        }).join('');
        document.getElementById('alertasStock').textContent = criticos.length;
    } else {
        stockCriticoDiv.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">No hay alertas de stock</p>';
        document.getElementById('alertasStock').textContent = '0';
    }
};

window.actualizarAlertasStock = function() {
    const alertas = document.getElementById('alertasStock');
    if (alertas) alertas.textContent = window.inventarioItems.filter(i => i.stock <= i.minimo).length;
};

window.actualizarProductosActivos = function() {
    const productos = document.getElementById('productosActivos');
    if (productos) productos.textContent = window.menuItems.filter(m => m.disponible).length;
};

window.actualizarStockCriticoHeader = function() {
    const container = document.getElementById('stockCriticoTags');
    if (!container) return;
    
    const criticos = (window.inventarioItems || []).filter(item => {
        const disponible = (item.stock || 0) - (item.reservado || 0);
        const minimo = item.minimo || 0;
        return disponible <= minimo && minimo > 0;
    });
    
    if (criticos.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted)">Ningún ingrediente en stock crítico</span>';
        return;
    }
    
    container.innerHTML = criticos.map(item => {
        const disponible = (item.stock || 0) - (item.reservado || 0);
        return `<span class="stock-critico-tag" 
                      data-ingrediente-id="${item.id}"
                      onclick="window._irAIngrediente('${item.id}')"
                      title="Haz clic para ir al ingrediente">
                    <i class="fas fa-box" style="font-size:.6rem"></i>
                    ${item.nombre}
                    <span style="background:var(--danger); color:#fff; padding:0 4px; border-radius:10px; font-size:.6rem">${disponible}</span>
                </span>`;
    }).join('');
};

window._irAIngrediente = function(ingredienteId) {
    const tabs = document.querySelectorAll('.tab');
    const panes = document.querySelectorAll('.tab-pane');
    tabs.forEach(tab => tab.classList.remove('active'));
    panes.forEach(pane => pane.classList.remove('active'));
    
    const inventarioTab = document.querySelector('.tab[data-tab="inventario"]');
    const inventarioPane = document.getElementById('inventarioPane');
    if (inventarioTab) inventarioTab.classList.add('active');
    if (inventarioPane) inventarioPane.classList.add('active');
    
    setTimeout(() => {
        const itemElement = document.getElementById(`invItem_${ingredienteId}`);
        if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            itemElement.click();
            itemElement.style.transition = 'background .3s';
            itemElement.style.background = 'rgba(211,47,47,.3)';
            setTimeout(() => { itemElement.style.background = ''; }, 1000);
        } else {
            window.renderizarInventario();
            setTimeout(() => {
                const retryElement = document.getElementById(`invItem_${ingredienteId}`);
                if (retryElement) {
                    retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    retryElement.click();
                }
            }, 300);
        }
    }, 200);
};

// ==================== TASA DE CAMBIO ====================
window.recalcularTasaEfectiva = function() {
    const tasaBaseInput = document.getElementById('tasaBaseInput');
    if (tasaBaseInput && window.configGlobal) {
        window.configGlobal.tasa_cambio = parseFloat(tasaBaseInput.value) || 0;
    }
    const tasaBase = parseFloat(document.getElementById('tasaBaseInput').value) || 0;
    const aumentoPct = parseFloat(document.getElementById('aumentoDiarioInput').value) || 0;
    const activoDiario = document.getElementById('aumentoActivoToggle').checked;
    const activoSemanal = document.getElementById('aumentoSemanalToggle')?.checked || false;
    const indefinido = document.getElementById('aumentoIndefinido')?.checked || false;
    const desdeVal = document.getElementById('aumentoDesde')?.value || '';
    const hastaVal = !indefinido ? (document.getElementById('aumentoHasta')?.value || '') : '';
    
    let periodos = 0;
    if ((activoDiario || activoSemanal) && desdeVal) {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const desdeDate = new Date(desdeVal + 'T00:00:00');
        const hastaDate = hastaVal ? new Date(hastaVal + 'T00:00:00') : null;
        if (desdeDate <= hoy) {
            const finEfectivo = hastaDate && hastaDate < hoy ? hastaDate : hoy;
            const msDay = 24 * 60 * 60 * 1000;
            const msPeriodo = activoSemanal ? 7 * msDay : msDay;
            const diffMs = finEfectivo - desdeDate;
            periodos = Math.max(0, Math.floor(diffMs / msPeriodo) + 1);
        }
    }
    
    const aumentoAcumulado = periodos * aumentoPct;
    const tasaEfectiva = tasaBase * (1 + aumentoAcumulado / 100);
    
    const efectivaDisplay = document.getElementById('tasaEfectivaDisplay');
    if (efectivaDisplay) efectivaDisplay.textContent = tasaEfectiva.toFixed(2);
    const acumuladoDisplay = document.getElementById('aumentoAcumuladoDisplay');
    if (acumuladoDisplay) acumuladoDisplay.textContent = aumentoAcumulado.toFixed(2) + '%';
    const tasaCard = document.getElementById('tasaEfectivaCard');
    if (tasaCard) tasaCard.textContent = 'Bs ' + tasaEfectiva.toFixed(2);
    
    window.configGlobal.tasa_cambio = tasaBase;
    window.configGlobal.aumento_diario = aumentoPct;
    window.configGlobal.aumento_activo = activoDiario;
    window.configGlobal.aumento_semanal = activoSemanal;
    window.configGlobal.aumento_acumulado = aumentoAcumulado;
    window.configGlobal.tasa_efectiva = tasaEfectiva;
};

window.guardarConfiguracion = async function() {
    const btn = document.getElementById('saveAllButton');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const tasaBase = parseFloat(document.getElementById('tasaBaseInput').value) || 0;
        const aumentoPct = parseFloat(document.getElementById('aumentoDiarioInput').value) || 0;
        const activoDiario = document.getElementById('aumentoActivoToggle').checked;
        const activoSemanal = document.getElementById('aumentoSemanalToggle')?.checked || false;
        const indefinido = document.getElementById('aumentoIndefinido')?.checked || false;
        
        window.configGlobal.tasa_cambio = tasaBase;
        window.configGlobal.aumento_diario = aumentoPct;
        window.configGlobal.aumento_activo = activoDiario;
        window.configGlobal.aumento_semanal = activoSemanal;
        window.recalcularTasaEfectiva();
        
        await window.safeSupabaseCall(
            window.supabaseClient.from('config').update({
                tasa_cambio: window.configGlobal.tasa_cambio,
                aumento_diario: window.configGlobal.aumento_diario,
                aumento_activo: window.configGlobal.aumento_activo,
                aumento_semanal: window.configGlobal.aumento_semanal || false,
                aumento_acumulado: window.configGlobal.aumento_acumulado,
                tasa_efectiva: window.configGlobal.tasa_efectiva,
                aumento_desde: (document.getElementById('aumentoDesde')?.value) || null,
                aumento_hasta: (!indefinido && document.getElementById('aumentoHasta')?.value) || null,
                aumento_indefinido: indefinido,
                ultima_actualizacion: new Date().toISOString()
            }).eq('id', 1)
        );
        
        window.renderizarMenu(window._menuBuscadorValue || '');
        await window._actualizarVentasHoyNeto();
        await window._actualizarDeliverysHoy();
        
        window.mostrarToast(`✓ Configuración guardada. Nueva tasa efectiva: Bs ${(window.configGlobal.tasa_efectiva || 0).toFixed(2)} por USD`, 'success');
    } catch (e) { 
        console.error('Error guardando configuración:', e); 
        window.mostrarToast('Error al guardar la configuración', 'error'); 
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Guardar cambios en tasa';
    }
};

window._verificarTasaDeHoy = function(onReady) {
    const hoy = new Date().toISOString().split('T')[0];
    const fecha = localStorage.getItem('saki_tasa_fecha');
    const valor = parseFloat(localStorage.getItem('saki_tasa_valor'));
    if (fecha === hoy && valor > 0) {
        onReady(valor);
    } else {
        window._pedirTasaDeHoy(onReady);
    }
};

window._pedirTasaDeHoy = function(onConfirm) {
    const overlay = document.createElement('div');
    overlay.id = 'tasaHoyOverlay';
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:Montserrat,sans-serif`;
    overlay.innerHTML = `<div style="background:#fff;border-radius:16px;padding:2rem 2.5rem;width:90%;max-width:400px;text-align:center">
                            <div style="font-size:2.5rem;margin-bottom:.75rem">💱</div>
                            <h2 style="font-size:1.3rem;color:#1a1a2e;margin-bottom:.4rem">Tasa de cambio de hoy</h2>
                            <p style="font-size:.88rem;color:#666;margin-bottom:1.5rem">Ingresa el valor actual del dólar en bolívares para que el sistema calcule correctamente todos los precios.</p>
                            <input type="number" id="tasaHoyInput" placeholder="Ej: 42.50" step="0.01" min="1"
                                style="width:100%;padding:.8rem 1rem;font-size:1.1rem;font-weight:700;text-align:center;border:2px solid #e0e0e0;border-radius:10px;outline:none;margin-bottom:1rem">
                            <div id="tasaHoyError" style="color:#D32F2F;font-size:.82rem;margin-bottom:.75rem;display:none">Por favor ingresa un valor válido mayor a 0.</div>
                            <button id="tasaHoyBtn" style="width:100%;padding:.9rem;background:linear-gradient(135deg,#D32F2F,#B71C1C);color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer">
                                Confirmar tasa de hoy
                            </button>
                            <p style="font-size:.75rem;color:#999;margin-top:.75rem">Podrás ajustarla en cualquier momento desde la barra de tasa.</p>
                        </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => { const input = document.getElementById('tasaHoyInput'); if (input) input.focus(); }, 100);
    
    const confirmar = () => {
        const val = parseFloat(document.getElementById('tasaHoyInput').value);
        const errEl = document.getElementById('tasaHoyError');
        if (!val || val <= 0) {
            errEl.style.display = 'block';
            document.getElementById('tasaHoyInput').focus();
            return;
        }
        errEl.style.display = 'none';
        const hoy = new Date().toISOString().split('T')[0];
        localStorage.setItem('saki_tasa_fecha', hoy);
        localStorage.setItem('saki_tasa_valor', val);
        overlay.remove();
        onConfirm(val);
    };
    document.getElementById('tasaHoyBtn').addEventListener('click', confirmar);
    document.getElementById('tasaHoyInput').addEventListener('keydown', e => { if (e.key === 'Enter') confirmar(); });
};

// ==================== FUNCIONES DE DEBUG ====================
window._simularLunes = function() {
    console.log('%c✓ Simulando lunes para prueba de aviso semanal...', 'color:#FF9800;font-weight:700');
    const hoy = new Date().toISOString().split('T')[0];
    localStorage.removeItem('saki_aviso_lunes_' + hoy);
    const estadoOriginal = window.configGlobal?.aumento_semanal;
    if (window.configGlobal) window.configGlobal.aumento_semanal = true;
    const _orig = Date.prototype.getDay;
    Date.prototype.getDay = function() { return 1; };
    if (typeof window._verificarAvisoLunes === 'function') window._verificarAvisoLunes();
    Date.prototype.getDay = _orig;
    if (window.configGlobal && estadoOriginal !== undefined)
        window.configGlobal.aumento_semanal = estadoOriginal;
    console.log('%c✓ Aviso de lunes disparado. Mira la pantalla.', 'color:green;font-weight:700');
};

window._simularPeriodoSemanal = function(semanas) {
    semanas = semanas || 1;
    const input = document.getElementById('aumentoDiarioInput');
    const pct = parseFloat(input?.value) || 0;
    const base = parseFloat(document.getElementById('tasaBaseInput')?.value) || 0;
    const acum = semanas * pct;
    const efectiva = base * (1 + acum / 100);
    console.group('%c✓ Simulación: ' + semanas + ' semana(s) de aumento semanal', 'color:#FF9800;font-weight:700');
    console.log('Tasa base:', base);
    console.log('% por semana:', pct + '%');
    console.log('Semanas simuladas:', semanas);
    console.log('Acumulado simulado:', acum.toFixed(2) + '%');
    console.log('Tasa efectiva simulada: Bs', efectiva.toFixed(2));
    console.log('Diferencia vs actual: Bs', (efectiva - (window.configGlobal?.tasa_efectiva || base)).toFixed(2));
    console.groupEnd();
    console.log('%c✓ Tip: prueba window._simularPeriodoSemanal(3) para 3 semanas', 'color:gray');
};

window.recalcularCostos = async function() {
    const tasa = (window.configGlobal?.tasa_efectiva) || (window.configGlobal?.tasa_cambio) || 0;
    if (!tasa) { window.mostrarToast('⚠️ Configura la tasa efectiva primero', 'warning'); return; }
    let actualizados = 0;
    for (const ing of (window.inventarioItems || [])) {
        const costoBs  = (ing.precio_costo  || 0) * tasa;
        const ventaBs  = (ing.precio_unitario || 0) * tasa;
        try {
            await window.safeSupabaseCall(
                window.supabaseClient.from('inventario')
                    .update({ costo_bs: costoBs, venta_bs: ventaBs }).eq('id', ing.id)
            );
            actualizados++;
        } catch(e) { console.warn('No se pudo actualizar', ing.nombre, e.message); }
    }
    await window.cargarInventario();
    window.mostrarToast(`✓ ${actualizados} ingrediente${actualizados !== 1 ? 's' : ''} actualizados en Bs`, 'success');
};

// ==================== REALTIME SUBSCRIPTIONS ====================
window.setupRealtimeSubscriptions = function() {
    try {
        const channel1 = window.supabaseClient
            .channel('admin-menu')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, () => window.cargarMenu())
            .subscribe();
        
        const channel2 = window.supabaseClient
            .channel('admin-inventario')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, async (p) => {
                if (p.eventType === 'UPDATE' && p.new.stock <= p.new.minimo) {
                    window.verificarStockCritico();
                    window.mostrarToast(`⚠️ Stock crítico: ${p.new.nombre}`, 'warning');
                }
                if (p.eventType === 'UPDATE' && (p.old?.stock || 0) <= 0 && p.new.stock > 0) {
                    await window.verificarYNotificarStockReactivado(p.new.id, p.new.nombre);
                }
                window.cargarInventario();
                window.actualizarStockCriticoHeader();
            })
            .subscribe();
        
        const channel3 = window.supabaseClient
            .channel('admin-usuarios')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => window.cargarUsuarios())
            .subscribe();
        
        const channel4 = window.supabaseClient
            .channel('admin-qr')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'codigos_qr' }, () => window.cargarQRs())
            .subscribe();
        
        const channel5 = window.supabaseClient
            .channel('admin-pedidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
                window.cargarPedidosRecientes();
                window._actualizarVentasHoyNeto();
                window._actualizarDeliverysHoy();
                const rPane = document.getElementById('reportesPane');
                if (rPane && rPane.classList.contains('active')) window.cargarReportes();
            })
            .subscribe();
        
        const channel6 = window.supabaseClient
            .channel('admin-ventas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => {
                window._actualizarVentasHoyNeto();
            })
            .subscribe();
        
        const channel7 = window.supabaseClient
            .channel('admin-mesoneros')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mesoneros' }, () => window.cargarMesoneros())
            .subscribe();
        
        const channel8 = window.supabaseClient
            .channel('admin-deliverys')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'deliverys' }, () => window.cargarDeliverys())
            .subscribe();
        
        const channel9 = window.supabaseClient
            .channel('admin-propinas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'propinas' }, () => window.cargarPropinas())
            .subscribe();
        
        const channel10 = window.supabaseClient
            .channel('admin-config')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'config' }, (p) => {
                window.configGlobal = { ...window.configGlobal, ...p.new };
                const bi = document.getElementById('tasaBaseInput');
                if (bi && p.new.tasa_cambio) bi.value = parseFloat(p.new.tasa_cambio).toFixed(2);
                window.recalcularTasaEfectiva();
                window.mostrarToast('✓ Tasa actualizada desde cajero: Bs ' + parseFloat(p.new.tasa_cambio||0).toFixed(2), 'info');
            })
            .subscribe();
        
        window._realtimeChannels = [channel1, channel2, channel3, channel4, channel5, channel6, channel7, channel8, channel9, channel10];
        
    } catch (e) { console.error('Error configurando suscripciones realtime:', e); }
};

window.cleanupRealtimeSubscriptions = function() {
    if (window._realtimeChannels && window._realtimeChannels.length) {
        window._realtimeChannels.forEach(channel => {
            try { window.supabaseClient.removeChannel(channel); } catch(e) {}
        });
        window._realtimeChannels = [];
    }
    if (window.stockUpdateChannel) {
        try { window.supabaseClient.removeChannel(window.stockUpdateChannel); } catch(e) {}
        window.stockUpdateChannel = null;
    }
};

// ==================== VENTAS Y DELIVERYS ====================
window._actualizarVentasHoyNeto = async function() {
    try {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
        
        const { data: ventasHoy } = await window.safeSupabaseCall(
            window.supabaseClient
                .from('ventas')
                .select('pedido_id')
                .gte('fecha', hoy.toISOString())
                .lt('fecha', manana.toISOString())
        );
        
        if (!ventasHoy || ventasHoy.length === 0) {
            const ventasEl = document.getElementById('ventasHoy');
            if (ventasEl) ventasEl.textContent = '$0.00 / Bs 0.00';
            return;
        }
        
        const pedidoIds = ventasHoy.map(v => v.pedido_id);
        const { data: pedidosData } = await window.safeSupabaseCall(
            window.supabaseClient
                .from('pedidos')
                .select('*')
                .in('id', pedidoIds)
        );
        
        const _netoCobradoPedido = (pedido) => {
            if (!pedido) return 0;
            if (pedido.metodo_pago === 'invitacion') return 0;
            const tasa = window.configGlobal?.tasa_cambio || window.configGlobal?.tasa_efectiva || 400;
            let recibido = 0;
            if (pedido.pagos_mixtos && pedido.pagos_mixtos.length) {
                pedido.pagos_mixtos.forEach(pg => {
                    if (pg.metodo === 'invitacion') return;
                    recibido += pg.metodo === 'efectivo_usd'
                        ? (pg.monto || 0) * tasa
                        : (pg.montoBs || pg.monto || 0);
                });
            } else {
                recibido = pedido.subtotal_bs || 0;
            }
            return Math.max(0, recibido - (pedido.vuelto_entregado || 0));
        };
        
        let netoBs = 0;
        pedidosData.forEach(pedido => { netoBs += _netoCobradoPedido(pedido); });
        
        const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        const netoUSD = netoBs / tasa;
        
        const ventasEl = document.getElementById('ventasHoy');
        if (ventasEl) ventasEl.textContent = `${window.formatUSD(netoUSD)} / ${window.formatBs(netoBs)}`;
    } catch (e) { 
        console.error('Error calculando neto cobrado:', e); 
        const ventasEl = document.getElementById('ventasHoy');
        if (ventasEl) ventasEl.textContent = '$0.00 / Bs 0.00';
    }
};

window._actualizarDeliverysHoy = async function() {
    try {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
        
        const { data: pedidosDelivery } = await window.safeSupabaseCall(
            window.supabaseClient
                .from('pedidos')
                .select('*')
                .eq('tipo', 'delivery')
                .eq('estado', 'enviado')
                .gte('fecha', hoy.toISOString())
                .lt('fecha', manana.toISOString())
        );
        
        let totalDeliverys = 0;
        (pedidosDelivery || []).forEach(p => { totalDeliverys += p.costo_delivery_bs || p.costoDelivery || 0; });
        
        const deliverysEl = document.getElementById('deliverysHoyDashboard');
        if (deliverysEl) deliverysEl.textContent = window.formatBs(totalDeliverys);
    } catch (e) {
        console.error('Error calculando deliverys hoy:', e);
        const deliverysEl = document.getElementById('deliverysHoyDashboard');
        if (deliverysEl) deliverysEl.textContent = 'Bs 0.00';
    }
};

window._abrirDetalleVentasAdmin = async function() {
    try {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
        
        const { data: ventasHoy } = await window.safeSupabaseCall(
            window.supabaseClient
                .from('ventas')
                .select('*')
                .gte('fecha', hoy.toISOString())
                .lt('fecha', manana.toISOString())
        );
        
        if (!ventasHoy || ventasHoy.length === 0) {
            window.mostrarToast('No hay ventas registradas hoy', 'info');
            return;
        }
        
        const pedidoIds = ventasHoy.map(v => v.pedido_id);
        const { data: pedidosHoy } = await window.safeSupabaseCall(
            window.supabaseClient
                .from('pedidos')
                .select('*')
                .in('id', pedidoIds)
        );
        
        const tasa = window.configGlobal?.tasa_cambio || window.configGlobal?.tasa_efectiva || 400;
        
        const _netoCobradoPedido = (pedido) => {
            if (!pedido) return 0;
            if (pedido.metodo_pago === 'invitacion') return 0;
            let recibido = 0;
            if (pedido.pagos_mixtos && pedido.pagos_mixtos.length) {
                pedido.pagos_mixtos.forEach(pg => {
                    if (pg.metodo === 'invitacion') return;
                    recibido += pg.metodo === 'efectivo_usd'
                        ? (pg.monto || 0) * tasa
                        : (pg.montoBs || pg.monto || 0);
                });
            } else {
                recibido = pedido.subtotal_bs || 0;
            }
            return Math.max(0, recibido - (pedido.vuelto_entregado || 0));
        };
        
        let totalNeto = 0;
        let vt_ebs = 0, vt_eusd = 0, vt_pm = 0, vt_pv = 0;
        let vt_cond = 0, vt_favor = 0, vt_delivery = 0;
        let vt_inv_count = 0, vt_inv_acum = 0;
        
        ventasHoy.forEach(v => {
            const p = pedidosHoy.find(pd => pd.id === v.pedido_id);
            if (!p) return;
            
            const neto = _netoCobradoPedido(p);
            totalNeto += neto;
            if (p.condonado > 0) vt_cond += p.condonado;
            if (p.a_favor_caja > 0) vt_favor += p.a_favor_caja;
            if (p.tipo === 'delivery' && (p.costo_delivery_bs || 0) > 0) vt_delivery += p.costo_delivery_bs;
            
            const pagos = p.pagos_mixtos;
            if (pagos && pagos.length) {
                let vueltoR = p.vuelto_entregado || 0;
                pagos.forEach(pg => {
                    const mbs = pg.metodo === 'efectivo_usd' 
                        ? (pg.monto || 0) * tasa 
                        : (pg.montoBs || pg.monto || 0);
                    if (pg.metodo === 'efectivo_bs') {
                        const n = Math.max(0, mbs - vueltoR);
                        vueltoR = Math.max(0, vueltoR - mbs);
                        vt_ebs += n;
                    } else if (pg.metodo === 'efectivo_usd') {
                        const n = Math.max(0, mbs - vueltoR);
                        vueltoR = Math.max(0, vueltoR - mbs);
                        vt_eusd += n;
                    } else if (pg.metodo === 'pago_movil') {
                        vt_pm += mbs;
                    } else if (pg.metodo === 'punto_venta') {
                        vt_pv += mbs;
                    } else if (pg.metodo === 'invitacion') {
                        vt_inv_count++;
                        const subtotalInv = (p.items || []).reduce((s, i) => 
                            s + window.usdToBs((i.precioUnitarioUSD || 0) * (i.cantidad || 1)), 0);
                        vt_inv_acum += subtotalInv + (p.costo_delivery_bs || 0);
                    }
                });
            } else {
                const metodo = p.metodo_pago || v.metodo_pago || '';
                const bs = neto;
                if (metodo === 'efectivo_bs') vt_ebs += bs;
                else if (metodo === 'efectivo_usd') vt_eusd += bs;
                else if (metodo === 'pago_movil') vt_pm += bs;
                else if (metodo === 'punto_venta') vt_pv += bs;
                else if (metodo === 'invitacion') {
                    vt_inv_count++;
                    const subtotalInv = (p.items || []).reduce((s, i) => 
                        s + window.usdToBs((i.precioUnitarioUSD || 0) * (i.cantidad || 1)), 0);
                    vt_inv_acum += subtotalInv + (p.costo_delivery_bs || 0);
                }
            }
        });
        
        const detallesCobros = ventasHoy.map(v => {
            const p = pedidosHoy.find(pd => pd.id === v.pedido_id);
            if (!p) return '';
            const hora = new Date(p.fecha).toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' });
            const items = (p.items || []).slice(0,2).map(i => `${i.cantidad||1}× ${i.nombre}`).join(', ');
            const masItems = (p.items || []).length > 2 ? ` +${(p.items || []).length - 2} más` : '';
            const neto = _netoCobradoPedido(p);
            const metodoLabel = { efectivo_bs:'Ef.Bs', efectivo_usd:'Ef.USD', pago_movil:'P.Móvil', punto_venta:'Pto.Venta', invitacion:'Invitación' };
            let metodoStr = p.metodo_pago || 'N/A';
            if (p.pagos_mixtos && p.pagos_mixtos.length > 1) {
                metodoStr = p.pagos_mixtos.map(pg => metodoLabel[pg.metodo] || pg.metodo).join(' + ');
            } else {
                metodoStr = metodoLabel[p.metodo_pago] || p.metodo_pago || 'N/A';
            }
            return `<div style="padding:.6rem .75rem;border-radius:8px;background:var(--table-header);margin-bottom:.4rem;font-size:.82rem">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.2rem">
                            <span style="font-weight:700;color:var(--text-dark)">${hora} · ${p.tipo || 'mesa'}</span>
                            <span style="font-weight:800;color:var(--success)">${window.formatBs(neto)}</span>
                        </div>
                        <div style="color:var(--text-muted);font-size:.75rem">${items}${masItems}</div>
                        <div style="font-size:.72rem;color:var(--text-muted);margin-top:.15rem">${metodoStr}</div>
                    </div>`;
        }).join('');
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
        modal.innerHTML = `<div style="background:var(--card-bg);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;">
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;border-bottom:2px solid var(--border);position:sticky;top:0;background:var(--card-bg);z-index:1">
                                <h3 style="font-size:1rem;font-weight:700;color:var(--text-dark)">
                                    <i class="fas fa-chart-line" style="color:var(--accent);margin-right:.5rem"></i>
                                    Ventas Hoy — Neto Cobrado
                                </h3>
                                <button onclick="this.closest('[style*=fixed]').remove()" 
                                    style="background:var(--table-header);border:none;border-radius:8px;width:30px;height:30px;cursor:pointer;">×</button>
                            </div>
                            <div style="padding:1.25rem">
                                <div style="margin-bottom:1rem;padding:.85rem;background:var(--table-header);border-radius:10px">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
                                        <span style="font-weight:700;color:var(--text-dark)">Neto cobrado hoy</span>
                                        <span style="font-weight:800;color:var(--success);font-size:1.15rem">${window.formatBs(totalNeto)}</span>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;color:var(--text-muted);font-size:.82rem">
                                        <span>Pedidos cobrados</span><span style="font-weight:600">${ventasHoy.length}</span>
                                    </div>
                                </div>
                                <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;margin-bottom:.6rem">Desglose por método de pago</div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1rem">
                                    ${vt_ebs > 0 ? `<div style="display:flex;gap:6px;padding:8px;background:rgba(0,0,0,.08);border-radius:8px;border-left:3px solid var(--success)">
                                        <i class="fas fa-money-bill-wave" style="color:var(--success)"></i><div><div style="font-size:.72rem">Efectivo Bs</div><div style="font-weight:700">${window.formatBs(vt_ebs)}</div></div>
                                    </div>` : ''}
                                    ${vt_eusd > 0 ? `<div style="display:flex;gap:6px;padding:8px;background:rgba(0,0,0,.08);border-radius:8px;border-left:3px solid #4CAF50">
                                        <i class="fas fa-dollar-sign" style="color:#4CAF50"></i><div><div style="font-size:.72rem">Efectivo USD</div><div style="font-weight:700">${window.formatBs(vt_eusd)}</div></div>
                                    </div>` : ''}
                                    ${vt_pm > 0 ? `<div style="display:flex;gap:6px;padding:8px;background:rgba(0,0,0,.08);border-radius:8px;border-left:3px solid var(--info)">
                                        <i class="fas fa-mobile-alt" style="color:var(--info)"></i><div><div style="font-size:.72rem">Pago Móvil</div><div style="font-weight:700">${window.formatBs(vt_pm)}</div></div>
                                    </div>` : ''}
                                    ${vt_pv > 0 ? `<div style="display:flex;gap:6px;padding:8px;background:rgba(0,0,0,.08);border-radius:8px;border-left:3px solid var(--warning)">
                                        <i class="fas fa-credit-card" style="color:var(--warning)"></i><div><div style="font-size:.72rem">Punto de Venta</div><div style="font-weight:700">${window.formatBs(vt_pv)}</div></div>
                                    </div>` : ''}
                                    ${vt_delivery > 0 ? `<div style="display:flex;gap:6px;padding:8px;background:rgba(0,0,0,.08);border-radius:8px;border-left:3px solid var(--delivery)">
                                        <i class="fas fa-motorcycle" style="color:var(--delivery)"></i><div><div style="font-size:.72rem">Deliverys</div><div style="font-weight:700">${window.formatBs(vt_delivery)}</div></div>
                                    </div>` : ''}
                                    ${vt_inv_count > 0 ? `<div style="grid-column:1/-1;padding:8px;background:rgba(0,0,0,.06);border-radius:8px;border-left:3px solid var(--propina);font-size:.82rem">
                                        <span style="color:var(--propina);font-weight:700">✓ Invitaciones: ${vt_inv_count}</span>
                                        <span style="color:var(--text-muted);font-size:.75rem;margin-left:.5rem">Valor real: ${window.formatBs(vt_inv_acum)}</span>
                                    </div>` : ''}
                                    ${vt_cond > 0 ? `<div style="display:flex;gap:6px;padding:8px;background:rgba(0,0,0,.08);border-radius:8px;border-left:3px solid var(--condonar)">
                                        <i class="fas fa-hand-holding-heart" style="color:var(--condonar)"></i><div><div style="font-size:.72rem">Condonado</div><div style="font-weight:700">${window.formatBs(vt_cond)}</div></div>
                                    </div>` : ''}
                                    ${vt_favor > 0 ? `<div style="display:flex;gap:6px;padding:8px;background:rgba(0,0,0,.08);border-radius:8px;border-left:3px solid var(--favordecaja)">
                                        <i class="fas fa-piggy-bank" style="color:var(--favordecaja)"></i><div><div style="font-size:.72rem">A favor de caja</div><div style="font-weight:700">${window.formatBs(vt_favor)}</div></div>
                                    </div>` : ''}
                                </div>
                                ${detallesCobros ? `<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;margin-bottom:.6rem">Detalle por cobro</div>${detallesCobros}` : ''}
                            </div>
                            <div class="modal-footer" style="padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
                                <button onclick="this.closest('[style*=fixed]').remove()" class="btn-primary">Cerrar</button>
                            </div>
                        </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    } catch (e) {
        console.error('Error abriendo detalle ventas admin:', e);
        window.mostrarToast('Error al cargar el detalle de ventas', 'error');
    }
};

window._abrirDetalleDeliverysAdmin = async function() {
    try {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
        
        const { data: entregas } = await window.safeSupabaseCall(
            window.supabaseClient
                .from('entregas_delivery')
                .select('*, deliverys(*)')
                .gte('fecha_entrega', hoy.toISOString())
                .lt('fecha_entrega', manana.toISOString())
        );
        
        const { data: motorizados } = await window.safeSupabaseCall(
            window.supabaseClient
                .from('deliverys')
                .select('*')
                .order('nombre')
        );
        
        const acumulado = {};
        (entregas || []).forEach(e => { acumulado[e.delivery_id] = (acumulado[e.delivery_id] || 0) + (e.monto_bs || 0); });
        const totalAcumulado = Object.values(acumulado).reduce((s, v) => s + v, 0);
        
        let motorizadosHtml = '';
        if (!motorizados || motorizados.length === 0) {
            motorizadosHtml = '<div class="empty-state"><i class="fas fa-motorcycle"></i><p>No hay motorizados registrados</p></div>';
        } else {
            motorizadosHtml = '<div class="motorizados-list" style="display:flex;flex-direction:column;gap:8px">';
            motorizados.forEach(m => {
                const monto = acumulado[m.id] || 0;
                const hayE = monto > 0;
                const detalleId = 'det_del_' + String(m.id).replace(/[^a-z0-9]/gi, '_');
                motorizadosHtml += `<div style="margin-bottom:8px">
                                        <div class="motorizado-item" style="background:rgba(0,0,0,.25);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid var(--delivery);cursor:${hayE ? 'pointer' : 'default'};opacity:${hayE ? '1' : '0.6'}" 
                                            onclick="${hayE ? `window._toggleDeliveryDetalle('${detalleId}')` : ''}">
                                            <span class="motorizado-nombre"><i class="fas fa-motorcycle" style="color:var(--delivery);margin-right:8px"></i> ${m.nombre}</span>
                                            <span class="motorizado-monto" style="color:${hayE ? 'var(--accent)' : 'var(--text-secondary)'};font-weight:700;display:flex;align-items:center;gap:6px">
                                                ${window.formatBs(monto)}
                                                ${hayE ? '<i class="fas fa-chevron-down" style="font-size:.7rem;transition:transform .2s" id="icon_' + detalleId + '"></i>' : ''}
                                            </span>
                                        </div>`;
                if (hayE) {
                    const pedidosDelDia = (window.pedidos || []).filter(p => 
                        p.delivery_id === m.id && p.estado === 'enviado' &&
                        new Date(p.fecha).toDateString() === hoy.toDateString()
                    );
                    motorizadosHtml += `<div id="${detalleId}" style="display:none;padding:8px 12px;background:rgba(0,0,0,.2);border-radius:0 0 8px 8px;margin-top:-4px;border:1px solid var(--border-color);border-top:none">
                                            ${pedidosDelDia.length > 0 ? pedidosDelDia.map(p => {
                                                const hora = new Date(p.fecha).toLocaleTimeString('es-VE', { hour:'numeric', minute:'2-digit' }).toLowerCase();
                                                return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:.78rem">
                                                            <span><i class="fas fa-map-marker-alt" style="color:var(--delivery);margin-right:6px"></i> ${p.parroquia || 'Sin parroquia'} <span style="color:var(--text-secondary);margin-left:8px">${hora}</span></span>
                                                            <span style="color:var(--accent);font-weight:700">${window.formatBs(p.costo_delivery_bs || 0)}</span>
                                                        </div>`;
                                            }).join('') : '<div style="padding:6px 0;color:var(--text-secondary);font-size:.78rem">No hay entregas registradas</div>'}
                                            <div style="padding:6px 0;margin-top:4px;font-size:.75rem;font-weight:600;border-top:1px solid rgba(255,255,255,.1);color:var(--text-secondary)">
                                                Total: ${pedidosDelDia.length} entrega${pedidosDelDia.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>`;
                }
                motorizadosHtml += `</div>`;
            });
            motorizadosHtml += '</div>';
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem';
        modal.innerHTML = `<div style="background:var(--card-bg);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;">
                            <div style="background:linear-gradient(135deg, var(--delivery), #00838F);color:#fff;padding:1rem 1.2rem;display:flex;justify-content:space-between;align-items:center;">
                                <h3 style="font-size:1rem;font-weight:700;"><i class="fas fa-motorcycle"></i> Acumulado Deliverys (Hoy)</h3>
                                <button onclick="this.closest('[style*=fixed]').remove()" style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;">×</button>
                            </div>
                            <div style="padding:1.25rem">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--border-color)">
                                    <span style="font-weight:700;font-size:1rem">Total acumulado hoy</span>
                                    <span style="font-weight:800;color:var(--delivery);font-size:1.2rem">${window.formatBs(totalAcumulado)}</span>
                                </div>
                                <h4 style="margin-bottom:12px;color:var(--text-secondary);font-size:.85rem">Desglose por motorizado:</h4>
                                ${motorizadosHtml}
                            </div>
                            <div style="padding:1rem 1.2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
                                <button onclick="this.closest('[style*=fixed]').remove()" class="btn-primary" style="background:linear-gradient(135deg, var(--delivery), #00838F)">Cerrar</button>
                            </div>
                        </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    } catch (e) {
        console.error('Error abriendo detalle deliverys admin:', e);
        window.mostrarToast('Error al cargar datos de deliverys', 'error');
    }
};

window._toggleDeliveryDetalle = function(detalleId) {
    const detalleEl = document.getElementById(detalleId);
    const iconEl = document.getElementById('icon_' + detalleId);
    if (detalleEl) {
        if (detalleEl.style.display === 'none' || detalleEl.style.display === '') {
            detalleEl.style.display = 'block';
            if (iconEl) iconEl.style.transform = 'rotate(180deg)';
        } else {
            detalleEl.style.display = 'none';
            if (iconEl) iconEl.style.transform = 'rotate(0deg)';
        }
    }
};

// ==================== NOTIFICACIONES PUSH ====================
window.enviarNotificacionPush = async function(titulo, mensaje, sessionId = null) {
    try {
        const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.jwtToken}` },
            body: JSON.stringify({ titulo, mensaje, session_id: sessionId })
        });
        const result = await response.json();
        console.log('Notificaciones push enviadas:', result);
    } catch (e) {
        console.error('Error enviando push:', e);
    }
};

window._registrarPushAdmin = async function() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    if (Notification.permission === 'denied') return;
    
    let sid = localStorage.getItem('saki_admin_session_id');
    if (!sid) {
        sid = 'admin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem('saki_admin_session_id', sid);
    }
    
    const _registrar = async () => {
        try {
            const reg = await navigator.serviceWorker.register('/SakiSushi0/sw.js', { scope: '/SakiSushi0/' });
            await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                const vapid = 'BC6oJ4E+5pGIn4icpzCBLMi6/nk+1JJenrUA41uJrAs1ELraSw5ctvRAlh8sHVldqzBXUtEwEeFKBm0/hmuM9EY=';
                const pad = '='.repeat((4 - vapid.length % 4) % 4);
                const raw = atob((vapid + pad).replace(/-/g, '+').replace(/_/g, '/'));
                const key = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
                sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
            }
            const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh'))));
            const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth'))));
            await window.safeSupabaseCall(
                window.supabaseClient.from('push_subscriptions').upsert([{
                    session_id: sid, endpoint: sub.endpoint, p256dh, auth,
                    rol: 'admin', user_agent: navigator.userAgent
                }], { onConflict: 'endpoint' })
            );
            console.log('✓ Push admin registrado:', sid);
        } catch (e) { console.warn('⚠️ Push admin no disponible:', e.message); }
    };
    
    if (Notification.permission === 'granted') {
        await _registrar();
    } else {
        setTimeout(async () => {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') await _registrar();
        }, 3000);
    }
};

// ==================== CONFIGURACIÓN Y UTILIDADES ====================
window.guardarWifiPersistente = function() {
    const ssid = document.getElementById('qrWifiSsid')?.value || '';
    const password = document.getElementById('qrWifiPassword')?.value || '';
    if (ssid !== window.wifiSsidPersistente) {
        window.wifiSsidPersistente = ssid;
        localStorage.setItem('saki_wifi_ssid', ssid);
    }
    if (password !== window.wifiPasswordPersistente) {
        window.wifiPasswordPersistente = password;
        localStorage.setItem('saki_wifi_pwd', password);
    }
};

window.restaurarWifiPersistente = function() {
    const ssidInput = document.getElementById('qrWifiSsid');
    const passwordInput = document.getElementById('qrWifiPassword');
    if (ssidInput && window.wifiSsidPersistente) ssidInput.value = window.wifiSsidPersistente;
    if (passwordInput && window.wifiPasswordPersistente) passwordInput.value = window.wifiPasswordPersistente;
};

window.obtenerAcumuladoDelivery = async function(deliveryId) {
    try {
        const { data, error } = await window.safeSupabaseCall(
            window.supabaseClient.from('entregas_delivery').select('monto_bs').eq('delivery_id', deliveryId)
        );
        if (error) throw error;
        return (data || []).reduce((sum, e) => sum + (e.monto_bs || 0), 0);
    } catch (e) { console.error('Error obteniendo acumulado:', e); return 0; }
};

window.toggleDisponiblePlatillo = async function(id, disponible) {
    const btn = document.querySelector(`.menu-card-v2 .btn-icon[onclick*="toggleDisponiblePlatillo('${id}'"]`);
    try {
        const { error } = await window.safeSupabaseCall(
            window.supabaseClient.from('menu').update({ disponible }).eq('id', id)
        );
        if (error) throw error;
        const item = (window.menuItems || []).find(p => p.id === id);
        if (item) item.disponible = disponible;
        window.renderizarMenu(window._menuBuscadorValue || '');
        if (disponible) {
            window.mostrarToast(`✓ Platillo "${item?.nombre}" ahora está DISPONIBLE`, 'success');
        } else {
            window.mostrarToast(`⚠️ Platillo "${item?.nombre}" ahora está NO DISPONIBLE`, 'warning');
        }
    } catch(e) {
        console.error('Error toggle disponible:', e);
        window.mostrarToast('Error: ' + (e.message || e), 'error');
    }
};

window.toggleUsuarioActivo = async function(userId, activo) {
    const btn = event?.target;
    if (btn && !btn.disabled) btn.disabled = true;
    try {
        await window.safeSupabaseCall(
            window.supabaseClient.from('usuarios').update({ activo }).eq('id', userId)
        );
        await window.cargarUsuarios();
        window.mostrarToast(`✓ Usuario ${activo ? 'activado' : 'desactivado'}`, 'success');
    } catch (e) { console.error('Error actualizando usuario:', e); window.mostrarToast('Error al actualizar usuario', 'error'); }
    finally { if (btn) btn.disabled = false; }
};

window.eliminarUsuario = async function(userId) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
        await window.safeSupabaseCall(
            window.supabaseClient.from('usuarios').delete().eq('id', userId)
        );
        await window.cargarUsuarios();
        window.mostrarToast('✓ Usuario eliminado', 'success');
    } catch (e) { console.error('Error eliminando usuario:', e); window.mostrarToast('Error al eliminar usuario', 'error'); }
};

window.agregarMesonero = async function() {
    const nombre = document.getElementById('nuevoMesonero').value.trim();
    if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
    const btn = document.querySelector('[onclick="window.agregarMesonero()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
        const { error } = await window.safeSupabaseCall(
            window.supabaseClient.from('mesoneros').insert([{ id: window.generarId('mes_'), nombre, activo: true }])
        );
        if (error) throw error;
        document.getElementById('nuevoMesonero').value = '';
        await window.cargarMesoneros();
        window.mostrarToast('✓ Mesonero agregado', 'success');
    } catch (e) {
        console.error('Error agregando mesonero:', e);
        window.mostrarToast('Error: ' + (e.message || e), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Agregar'; }
    }
};

window.toggleMesoneroActivo = async function(id, activo) {
    try {
        await window.safeSupabaseCall(
            window.supabaseClient.from('mesoneros').update({ activo }).eq('id', id)
        );
        await window.cargarMesoneros();
    } catch (e) { console.error('Error:', e); }
};

window.pagarPropinaMesonero = async function(mesoneroId, nombre, acum) {
    const confirmado = confirm(`¿Registrar pago de propinas a ${nombre}? Monto pendiente: ${window.formatBs(acum)}`);
    if (!confirmado) return;
    try {
        const { error } = await window.safeSupabaseCall(
            window.supabaseClient.from('propinas').update({ entregado: true }).eq('mesonero_id', mesoneroId).eq('entregado', false)
        );
        if (error) throw error;
        await window.renderizarMesoneros();
        window.mostrarToast(`✓ Propinas pagadas a ${nombre}`, 'success');
    } catch(e) {
        console.error('Error pagando propinas:', e);
        window.mostrarToast('Error: ' + (e.message || e), 'error');
    }
};

window.eliminarMesonero = async function(id) {
    if (!confirm('¿Eliminar mesonero?')) return;
    try {
        await window.safeSupabaseCall(
            window.supabaseClient.from('mesoneros').delete().eq('id', id)
        );
        await window.cargarMesoneros();
        window.mostrarToast('✓ Mesonero eliminado', 'success');
    } catch (e) { console.error('Error:', e); }
};

window.agregarDelivery = async function() {
    const nombre = document.getElementById('nuevoDelivery').value.trim();
    if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
    const btn = document.querySelector('.btn-delivery');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
        const { error } = await window.safeSupabaseCall(
            window.supabaseClient.from('deliverys').insert([{ id: window.generarId('del_'), nombre, activo: true }])
        );
        if (error) throw error;
        document.getElementById('nuevoDelivery').value = '';
        await window.cargarDeliverys();
        window.mostrarToast('✓ Motorizado agregado', 'success');
    } catch (e) {
        console.error('Error agregando motorizado:', e);
        window.mostrarToast('Error: ' + (e.message || e), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Agregar'; }
    }
};

window.editarDelivery = function(id) {
    const delivery = window.deliverys.find(d => d.id === id);
    if (!delivery) return;
    window.deliveryEditandoId = id;
    document.getElementById('deliveryNombre').value = delivery.nombre;
    document.getElementById('deliveryEstado').value = delivery.activo ? 'true' : 'false';
    document.getElementById('deliveryModal').classList.add('active');
};

window.eliminarDelivery = async function(id) {
    const delivery = window.deliverys.find(d => d.id === id);
    if (!delivery) return;
    if (!confirm(`¿Eliminar al motorizado "${delivery.nombre}"?`)) return;
    try {
        await window.safeSupabaseCall(
            window.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', id)
        );
        await window.safeSupabaseCall(
            window.supabaseClient.from('deliverys').delete().eq('id', id)
        );
        await window.cargarDeliverys();
        window.mostrarToast('✓ Motorizado eliminado', 'success');
    } catch (e) {
        console.error('Error eliminando motorizado:', e);
        window.mostrarToast('Error al eliminar: ' + (e.message || e), 'error');
    }
};

window.toggleDeliveryActivo = async function(id, activo) {
    try {
        await window.safeSupabaseCall(
            window.supabaseClient.from('deliverys').update({ activo }).eq('id', id)
        );
        await window.cargarDeliverys();
    } catch (e) { console.error('Error:', e); }
};

window.mostrarPagoDelivery = async function(id) {
    const delivery = window.deliverys.find(d => d.id === id);
    if (!delivery) return;
    window.deliveryParaPago = id;
    const acumulado = await window.obtenerAcumuladoDelivery(id);
    document.getElementById('confirmPagoDeliveryBody').innerHTML = `
        <p style="margin-bottom:1rem"><strong>${delivery.nombre}</strong> tiene acumulado: <span style="color:var(--accent);font-weight:700;font-size:1.1rem"> ${window.formatBs(acumulado)}</span></p>
        <div style="display:flex;flex-direction:column;gap:.75rem">
            <label class="pago-tipo-option" style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer" id="opcionTotal">
                <input type="radio" name="tipoPago" value="total" checked style="margin-top:3px;accent-color:var(--success)">
                <div><div style="font-weight:700;font-size:.9rem">Pago total</div><div style="font-size:.78rem">Reinicia el acumulado a Bs 0,00</div></div>
                <span style="margin-left:auto;font-weight:800;color:var(--success)">${window.formatBs(acumulado)}</span>
            </label>
            <label class="pago-tipo-option" style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer" id="opcionParcial">
                <input type="radio" name="tipoPago" value="parcial" style="margin-top:3px;accent-color:var(--warning)">
                <div style="flex:1"><div style="font-weight:700;font-size:.9rem">Pago parcial</div><div style="font-size:.78rem;margin-bottom:.4rem">Ingresa el monto a pagar</div>
                <input type="number" id="montoPagoParcial" placeholder="Monto en Bs" step="0.01" min="0.01" max="${acumulado}"
                    style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:8px;font-size:.88rem" onclick="event.stopPropagation()" oninput="document.querySelector('[name=tipoPago][value=parcial]').checked=true"></div>
            </label>
        </div>`;
    document.getElementById('confirmPagoDeliveryModal').classList.add('active');
};

window.confirmarPagoDelivery = async function() {
    if (!window.deliveryParaPago) return;
    const btn = document.getElementById('confirmPagoDeliveryBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'; }
    try {
        const tipoPago = document.querySelector('[name="tipoPago"]:checked')?.value || 'total';
        const acumulado = await window.obtenerAcumuladoDelivery(window.deliveryParaPago);
        if (tipoPago === 'parcial') {
            const monto = parseFloat(document.getElementById('montoPagoParcial')?.value);
            if (!monto || monto <= 0) throw new Error('Monto inválido');
            if (monto > acumulado) throw new Error('El monto excede el acumulado');
            const { error } = await window.safeSupabaseCall(
                window.supabaseClient.from('entregas_delivery').insert([{
                    delivery_id: window.deliveryParaPago, monto_bs: -monto, pedido_id: null, fecha_entrega: new Date().toISOString()
                }])
            );
            if (error) throw error;
            window.mostrarToast('✓ Pago parcial registrado.', 'success');
        } else {
            const { error } = await window.safeSupabaseCall(
                window.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', window.deliveryParaPago)
            );
            if (error) throw error;
            window.mostrarToast('✓ Pago total registrado.', 'success');
        }
        window.cerrarModal('confirmPagoDeliveryModal');
        await window.cargarDeliverys();
    } catch (e) {
        console.error('Error registrando pago:', e);
        window.mostrarToast('Error: ' + (e.message || e), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = 'Confirmar'; }
    }
};

window.generarQR = async function() {
    const nombre = document.getElementById('qrNombreMesa').value.trim();
    const ssidEl = document.getElementById('qrWifiSsid');
    const pwdEl = document.getElementById('qrWifiPassword');
    const ssid = ssidEl ? ssidEl.value.trim() : '';
    const password = pwdEl ? pwdEl.value.trim() : '';
    
    window.guardarWifiPersistente();
    if (!nombre) { window.mostrarToast('Ingresa el nombre de la mesa', 'error'); return; }
    if (ssid && !password) { window.mostrarToast('Ingresa la contraseña WiFi', 'error'); return; }
    
    const btn = document.querySelector('[onclick="window.generarQR()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...'; }
    
    const qrData = { id: window.generarId('QR_'), nombre: nombre, fecha: new Date().toISOString() };
    try {
        const { error } = await window.safeSupabaseCall(
            window.supabaseClient.from('codigos_qr').insert([qrData])
        );
        if (error) throw error;
        document.getElementById('qrNombreMesa').value = '';
        await window.cargarQRs();
        window.mostrarToast('✓ QR generado', 'success');
    } catch(e) {
        console.error('Error generando QR:', e);
        window.mostrarToast('Error al generar QR: ' + (e.message || e), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-qrcode"></i> Generar QR'; }
    }
};

window.ampliarQR = function(id, nombre, url) {
    const container = document.getElementById('qrAmpliado');
    container.innerHTML = '';
    new QRCode(container, { text: url, width: 300, height: 300 });
    const urlDisplay = url.replace(/wifi_pwd=([^&]+)/, 'wifi_pwd=***');
    document.getElementById('qrAmpliadoInfo').innerHTML = `<div style="margin-top:.75rem"><div style="font-weight:800;font-size:1rem;margin-bottom:.4rem">${nombre}</div><div style="font-size:.7rem;color:var(--text-muted);word-break:break-all;background:#f5f5f5;padding:.5rem .7rem;border-radius:8px;border:1px solid var(--border);line-height:1.5">${urlDisplay}</div></div>`;
    document.getElementById('qrAmpliadoModal').classList.add('active');
};

window.eliminarQR = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este código QR?')) return;
    try {
        await window.safeSupabaseCall(
            window.supabaseClient.from('codigos_qr').delete().eq('id', id)
        );
        await window.cargarQRs();
        window.mostrarToast('✓ QR eliminado', 'success');
    } catch (e) { console.error('Error eliminando QR:', e); window.mostrarToast('Error al eliminar QR', 'error'); }
};

window.cargarReportes = async function() {
    try {
        const desde = document.getElementById('reporteDesde').value;
        const hasta = document.getElementById('reporteHasta').value;
        let query = window.supabaseClient.from('pedidos').select('*').in('estado', ['cobrado', 'entregado', 'enviado', 'reserva_completada']);
        if (desde) query = query.gte('fecha', new Date(desde).toISOString());
        if (hasta) { const h = new Date(hasta); h.setDate(h.getDate() + 1); query = query.lt('fecha', h.toISOString()); }
        const { data, error } = await window.safeSupabaseCall(query.order('fecha', { ascending: false }));
        if (error) throw error;
        window.actualizarEstadisticasReportes(data || []);
        window.actualizarGraficos(data || []);
        window.actualizarTablaVentas(data || []);
    } catch (e) { console.error('Error cargando reportes:', e); window.mostrarToast('Error cargando reportes', 'error'); }
};

window.actualizarEstadisticasReportes = function(pedidos) {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const ventasHoy = pedidos.filter(p => new Date(p.fecha) >= hoy).reduce((s, p) => s + (p.total || 0), 0);
    const semana = new Date(); semana.setDate(semana.getDate() - 7);
    const ventasSemana = pedidos.filter(p => new Date(p.fecha) >= semana).reduce((s, p) => s + (p.total || 0), 0);
    const ticketPromedio = pedidos.length > 0 ? pedidos.reduce((s, p) => s + (p.total || 0), 0) / pedidos.length : 0;
    
    const platillosCount = {};
    pedidos.forEach(p => { if (p.items) p.items.forEach(item => { platillosCount[item.nombre] = (platillosCount[item.nombre] || 0) + (item.cantidad || 0); }); });
    let platilloTop = '-', maxCount = 0;
    for (const [n, c] of Object.entries(platillosCount)) { if (c > maxCount) { maxCount = c; platilloTop = n; } }
    
    const tasa = window.configGlobal?.tasa_efectiva || 400;
    const ventasDiaEl = document.getElementById('ventasDia');
    if (ventasDiaEl) ventasDiaEl.textContent = window.formatUSD(ventasHoy) + ' / ' + window.formatBs(ventasHoy * tasa);
    const ventasSemanaEl = document.getElementById('ventasSemana');
    if (ventasSemanaEl) ventasSemanaEl.textContent = window.formatUSD(ventasSemana) + ' / ' + window.formatBs(ventasSemana * tasa);
    const ticketPromedioEl = document.getElementById('ticketPromedio');
    if (ticketPromedioEl) ticketPromedioEl.textContent = window.formatUSD(ticketPromedio) + ' / ' + window.formatBs(ticketPromedio * tasa);
    const platilloTopEl = document.getElementById('platilloTop');
    if (platilloTopEl) platilloTopEl.textContent = platilloTop;
};

window.actualizarGraficos = function(pedidos) {
    const ventasPorDia = {};
    for (let i = 6; i >= 0; i--) { const f = new Date(); f.setDate(f.getDate() - i); ventasPorDia[f.toISOString().split('T')[0]] = 0; }
    pedidos.forEach(p => { const f = new Date(p.fecha).toISOString().split('T')[0]; if (ventasPorDia.hasOwnProperty(f)) ventasPorDia[f] += p.total || 0; });
    
    if (window.charts.ventas) window.charts.ventas.destroy();
    window.charts.ventas = new Chart(document.getElementById('ventasChart'), {
        type: 'line',
        data: { labels: Object.keys(ventasPorDia), datasets: [{ label: 'Ventas (USD)', data: Object.values(ventasPorDia), borderColor: 'var(--primary)', backgroundColor: 'rgba(211,47,47,0.1)', tension: 0.1 }] }
    });
    
    const categorias = {};
    pedidos.forEach(p => { if (p.items) p.items.forEach(item => { const platillo = window.menuItems.find(m => m.nombre === item.nombre); const cat = platillo?.categoria || 'Otros'; categorias[cat] = (categorias[cat] || 0) + ((item.precioUnitarioUSD || 0) * (item.cantidad || 1)); }); });
    
    if (window.charts.categorias) window.charts.categorias.destroy();
    window.charts.categorias = new Chart(document.getElementById('categoriasChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(categorias), datasets: [{ data: Object.values(categorias), backgroundColor: ['#D32F2F', '#FF9800', '#1976D2', '#388E3C', '#F57C00', '#6c757d'] }] }
    });
    
    const metodos = {};
    pedidos.forEach(p => {
        if (p.pagos_mixtos) p.pagos_mixtos.forEach(pago => { metodos[pago.metodo] = (metodos[pago.metodo] || 0) + (pago.monto || 0); });
        else if (p.metodo_pago) metodos[p.metodo_pago] = (metodos[p.metodo_pago] || 0) + (p.total || 0);
    });
    
    if (window.charts.pagos) window.charts.pagos.destroy();
    window.charts.pagos = new Chart(document.getElementById('pagosChart'), {
        type: 'bar',
        data: { labels: Object.keys(metodos).map(m => { const n = { efectivo_bs: 'Efectivo Bs', efectivo_usd: 'Efectivo USD', pago_movil: 'Pago Móvil', punto_venta: 'Punto de Venta', mixto: 'Mixto', invitacion: 'Invitación' }; return n[m] || m; }), datasets: [{ label: 'Monto (USD)', data: Object.values(metodos).map(v => v / (window.configGlobal?.tasa_efectiva || 400)), backgroundColor: 'var(--info)' }] }
    });
    
    const horas = {}; for (let i = 0; i < 24; i++) horas[i] = 0;
    pedidos.forEach(p => { const h = new Date(p.fecha).getHours(); horas[h] += p.total || 0; });
    
    if (window.charts.hora) window.charts.hora.destroy();
    window.charts.hora = new Chart(document.getElementById('horaChart'), {
        type: 'bar',
        data: { labels: Object.keys(horas).map(h => `${h}:00`), datasets: [{ label: 'Ventas (USD)', data: Object.values(horas), backgroundColor: 'var(--accent)' }] }
    });
};

window.actualizarTablaVentas = function(pedidos) {
    const tbody = document.getElementById('ventasTableBody');
    if (!tbody) return;
    const tasa = (window.configGlobal && window.configGlobal.tasa_efectiva) || window.configGlobal?.tasa_cambio || 400;
    tbody.innerHTML = pedidos.slice(0, 50).map(p => {
        const items = p.items || [];
        const totalItems = items.reduce((s, i) => s + (i.cantidad || 0), 0);
        const resumen = items.length ? items.slice(0,2).map(i => `${i.cantidad || 1}× ${i.nombre}`).join(', ') + (items.length > 2 ? ` +${items.length - 2} más` : '') : 'Sin detalle';
        const totalUSD = p.total || 0;
        const totalBs = window.formatBs(totalUSD * tasa);
        const metodoMap = { efectivo_bs:'Ef. Bs', efectivo_usd:'Ef. USD', pago_movil:'Pago Móvil', punto_venta:'Punto Venta', invitacion:'Invitación' };
        let metodoStr = metodoMap[p.metodo_pago] || p.metodo_pago || 'N/A';
        if (p.pagos_mixtos && p.pagos_mixtos.length > 1) {
            metodoStr = p.pagos_mixtos.map(pg => metodoMap[pg.metodo] || pg.metodo).join(' + ');
        }
        return `——
                     <td>${new Date(p.fecha).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}</td>
                    <td style="max-width:200px;font-size:.82rem">${resumen}</td>
                    <td>${window.formatUSD(totalUSD)}<br><span style="font-size:.75rem;color:var(--text-muted)">${totalBs}</span></td>
                    <td>${totalItems}</td>
                    <td>${metodoStr}</td>
                    <td>${p.tipo || 'N/A'}}`
                    .replace(/\s+/g, ' ') + '</td></tr>';
    }).join('');
};

window.abrirSelectorMesaAdmin = async function() {
    const list = document.getElementById('adminMesaList');
    if (list) list.innerHTML = '<p style="color:var(--text-muted)">Cargando mesas...</p>';
    document.getElementById('adminMesaModal').classList.add('active');
    try {
        const { data, error } = await window.safeSupabaseCall(
            window.supabaseClient.from('codigos_qr').select('*').order('nombre')
        );
        if (error) throw error;
        const mesas = data || [];
        if (!mesas.length) {
            if (list) list.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1">No hay mesas creadas. Genera QRs en la pestaña Códigos QR.</p>';
            return;
        }
        if (list) {
            list.innerHTML = '';
            mesas.forEach(mesa => {
                const url = window.location.origin + '/SakiSushi0/Cliente/index.html?mesa=' + encodeURIComponent(mesa.nombre);
                const btn = document.createElement('button');
                btn.className = 'mesa-admin-btn';
                btn.innerHTML = '<i class="fas fa-chair"></i><span>' + mesa.nombre + '</span>';
                btn.addEventListener('click', function() {
                    window.open(url, '_blank');
                    window.cerrarModal('adminMesaModal');
                });
                list.appendChild(btn);
            });
        }
    } catch(e) {
        if (list) list.innerHTML = '<p style="color:var(--danger)">Error cargando mesas: ' + (e.message || e) + '</p>';
    }
};

window.cambiarPassword = async function() {
    const current = document.getElementById('currentPassword').value;
    const nueva = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('passwordChangeError');
    if (errorDiv) errorDiv.style.display = 'none';
    
    if (!current || !nueva || !confirm) { window.mostrarToast('Completa todos los campos', 'error'); return; }
    if (nueva !== confirm) { window.mostrarToast('Las contraseñas no coinciden', 'error'); return; }
    if (nueva.length < 4) { window.mostrarToast('La contraseña debe tener al menos 4 caracteres', 'error'); return; }
    
    const btn = document.querySelector('[onclick="window.cambiarPassword()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...'; }
    
    try {
        const { data: adminData, error: userError } = await window.safeSupabaseCall(
            window.supabaseClient.from('usuarios').select('username').eq('rol', 'admin').maybeSingle()
        );
        if (userError) throw userError;
        if (!adminData) { window.mostrarToast('No se encontró usuario administrador', 'error'); return; }
        
        const { data: authData, error: authError } = await window.safeSupabaseCall(
            window.supabaseClient.rpc('verify_user_credentials', { p_username: adminData.username, p_password: current })
        );
        if (authError) throw authError;
        if (!authData || !authData.success) { window.mostrarToast('Contraseña actual incorrecta', 'error'); return; }
        
        const { data: hashed, error: hashErr } = await window.safeSupabaseCall(
            window.supabaseClient.rpc('hash_password', { plain_password: nueva })
        );
        if (hashErr) throw hashErr;
        
        const { error: updateUserError } = await window.safeSupabaseCall(
            window.supabaseClient.from('usuarios').update({ password_hash: hashed }).eq('rol', 'admin')
        );
        if (updateUserError) throw updateUserError;
        
        window.configGlobal.admin_password = nueva;
        
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        window.mostrarToast('✓ Contraseña actualizada correctamente', 'success');
    } catch (e) {
        console.error('Error cambiando contraseña:', e);
        if (errorDiv) { errorDiv.style.display = 'block'; errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error: ' + (e.message || 'Error al cambiar la contraseña'); }
        window.mostrarToast('Error al cambiar la contraseña: ' + (e.message || e), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-key"></i> Cambiar Contraseña'; }
    }
};

window.guardarRecoveryEmail = async function() {
    const email = document.getElementById('recoveryEmail').value;
    if (!email || !email.includes('@')) { window.mostrarToast('Ingresa un correo válido', 'error'); return; }
    try {
        await window.safeSupabaseCall(
            window.supabaseClient.from('config').update({ recovery_email: email }).eq('id', 1)
        );
        window.mostrarToast('✓ Correo de recuperación guardado', 'success');
    } catch (e) { console.error('Error guardando email:', e); window.mostrarToast('Error al guardar el correo', 'error'); }
};

// ==================== MODAL DE INGREDIENTE ====================
window.abrirModalNuevoIngrediente = function() {
    window.ingredienteEditandoId = null;
    document.getElementById('ingredienteModalTitle').textContent = 'Nuevo Ingrediente';
    document.getElementById('ingredienteNombre').value = '';
    document.getElementById('ingredienteMinimo').value = '';
    document.getElementById('ingredienteCosto').value = '';
    document.getElementById('ingredienteVenta').value = '';
    document.getElementById('ingredienteAgregar').value = '';
    
    const ct = document.getElementById('costoTotal'); if (ct) ct.value = '';
    const cc = document.getElementById('cantidadComprada'); if (cc) cc.value = '';
    const cr = document.getElementById('calcResultado'); if (cr) cr.style.display = 'none';
    const sp = document.getElementById('stockTotalPreview'); if (sp) sp.textContent = '';
    const sc = document.getElementById('stockConversionPreview'); if (sc) sc.textContent = '';
    
    const stockInput = document.getElementById('ingredienteStock');
    const lockIcon = document.getElementById('stockLockIcon');
    const clickArea = document.getElementById('stockClickArea');
    
    if (stockInput) {
        stockInput.disabled = false;
        stockInput.readOnly = false;
        stockInput.value = '0';
        stockInput.style.cursor = 'text';
        stockInput.onclick = null;
    }
    if (lockIcon) {
        lockIcon.innerHTML = '<i class="fas fa-lock-open" style="font-size:.8rem; color:var(--success)"></i>';
        lockIcon.style.cursor = 'default';
    }
    if (clickArea) {
        clickArea.onclick = null;
        clickArea.style.cursor = 'default';
    }
    
    const deleteBtn = document.getElementById('deleteIngredienteBtn');
    if (deleteBtn) deleteBtn.style.display = 'none';
    
    document.getElementById('ingredienteModal').classList.add('active');
};

window.editarIngrediente = function(id) {
    const ingrediente = window.inventarioItems.find(i => i.id === id);
    if (!ingrediente) return;
    
    window.ingredienteEditandoId = id;
    document.getElementById('ingredienteModalTitle').textContent = 'Editar Ingrediente';
    document.getElementById('ingredienteNombre').value = ingrediente.nombre || '';
    window._stockOriginalValue = ingrediente.stock || 0;
    document.getElementById('ingredienteStock').value = window._stockOriginalValue;
    document.getElementById('ingredienteUnidad').value = ingrediente.unidad_base || 'unidades';
    document.getElementById('ingredienteMinimo').value = ingrediente.minimo || 0;
    document.getElementById('ingredienteCosto').value = ingrediente.precio_costo || 0;
    document.getElementById('ingredienteVenta').value = ingrediente.precio_unitario || 0;
    document.getElementById('ingredienteAgregar').value = '';
    
    const ct = document.getElementById('costoTotal'); if (ct) ct.value = '';
    const cc = document.getElementById('cantidadComprada'); if (cc) cc.value = '';
    const cr = document.getElementById('calcResultado'); if (cr) cr.style.display = 'none';
    const sp = document.getElementById('stockTotalPreview'); if (sp) sp.textContent = '';
    const sc = document.getElementById('stockConversionPreview'); if (sc) sc.textContent = '';
    
    const stockInput = document.getElementById('ingredienteStock');
    const lockIcon = document.getElementById('stockLockIcon');
    const clickArea = document.getElementById('stockClickArea');
    
    if (stockInput) {
        stockInput.disabled = true;
        stockInput.readOnly = true;
        stockInput.style.cursor = 'pointer';
        stockInput.onclick = null;
    }
    if (lockIcon) {
        lockIcon.innerHTML = '<i class="fas fa-lock" style="font-size:.8rem"></i>';
        lockIcon.style.cursor = 'default';
    }
    if (clickArea) {
        const newDiv = clickArea.cloneNode(true);
        clickArea.parentNode.replaceChild(newDiv, clickArea);
        newDiv.onclick = function(e) {
            e.stopPropagation();
            window.mostrarModalContraseñaStock();
        };
        newDiv.style.cursor = 'pointer';
        window._currentClickArea = newDiv;
    }
    
    const deleteBtn = document.getElementById('deleteIngredienteBtn');
    if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    
    document.getElementById('ingredienteModal').classList.add('active');
};

window.mostrarModalContraseñaStock = function() {
    const input = document.getElementById('stockPasswordModalInput');
    const error = document.getElementById('passwordStockError');
    if (input) input.value = '';
    if (error) error.style.display = 'none';
    const modal = document.getElementById('passwordStockModal');
    if (modal) {
        modal.classList.add('active');
        setTimeout(() => { const inp = document.getElementById('stockPasswordModalInput'); if (inp) inp.focus(); }, 100);
    }
};

window.verificarContraseñaStock = async function() {
    const pwd = document.getElementById('stockPasswordModalInput')?.value;
    const errorEl = document.getElementById('passwordStockError');
    const btnConfirm = document.getElementById('confirmPasswordStockBtn');
    if (!pwd) {
        if (errorEl) { errorEl.textContent = 'Ingresa la contraseña'; errorEl.style.display = 'block'; }
        return;
    }
    if (btnConfirm) { btnConfirm.disabled = true; btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...'; }
    
    try {
        const adminPassword = window.configGlobal?.admin_password;
        let esValida = false;
        if (pwd === adminPassword) esValida = true;
        if (!esValida) {
            const { data: adminData } = await window.safeSupabaseCall(
                window.supabaseClient.from('usuarios').select('username').eq('rol', 'admin').maybeSingle()
            );
            if (adminData) {
                const { data: authData } = await window.safeSupabaseCall(
                    window.supabaseClient.rpc('verify_user_credentials', { p_username: adminData.username, p_password: pwd })
                );
                if (authData && authData.success === true) esValida = true;
            }
        }
        if (esValida) {
            await _desbloquearStock();
        } else {
            if (errorEl) { errorEl.textContent = 'Contraseña incorrecta. Intenta de nuevo.'; errorEl.style.display = 'block'; }
            document.getElementById('stockPasswordModalInput')?.focus();
        }
    } catch (e) {
        console.error('Error:', e);
        if (errorEl) { errorEl.textContent = 'Error al validar la contraseña'; errorEl.style.display = 'block'; }
    } finally {
        if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.innerHTML = 'Confirmar'; }
    }
};

async function _desbloquearStock() {
    const stockInput = document.getElementById('ingredienteStock');
    const lockIcon = document.getElementById('stockLockIcon');
    const clickArea = document.getElementById('stockClickArea');
    
    if (stockInput && !window._stockOriginalValue) window._stockOriginalValue = stockInput.value;
    if (stockInput) {
        stockInput.disabled = false;
        stockInput.readOnly = false;
        stockInput.style.cursor = 'text';
        stockInput.focus();
    }
    if (lockIcon) {
        lockIcon.innerHTML = '<i class="fas fa-lock-open" style="font-size:.8rem; color:var(--success)"></i>';
        lockIcon.style.cursor = 'default';
    }
    if (clickArea) {
        clickArea.onclick = null;
        clickArea.style.cursor = 'default';
        clickArea.style.borderColor = 'var(--success)';
        clickArea.style.backgroundColor = 'rgba(56,142,60,0.1)';
    }
    window.cerrarModal('passwordStockModal');
    window.mostrarToast('✓ Stock desbloqueado. Puedes editar la cantidad.', 'success');
}

window.resetearBloqueoStock = function() {
    const stockInput = document.getElementById('ingredienteStock');
    const lockIcon = document.getElementById('stockLockIcon');
    const clickArea = document.getElementById('stockClickArea');
    
    if (stockInput) {
        stockInput.disabled = true;
        stockInput.readOnly = true;
        stockInput.style.cursor = 'pointer';
        stockInput.value = window._stockOriginalValue || 0;
    }
    if (clickArea) {
        const newClickArea = clickArea.cloneNode(true);
        clickArea.parentNode.replaceChild(newClickArea, clickArea);
        newClickArea.onclick = function(e) {
            e.stopPropagation();
            window.mostrarModalContraseñaStock();
        };
        newClickArea.style.cursor = 'pointer';
        window._currentClickArea = newClickArea;
    }
    if (lockIcon) {
        lockIcon.innerHTML = '<i class="fas fa-lock" style="font-size:.8rem"></i>';
        lockIcon.style.cursor = 'default';
    }
    window._stockOriginalValue = null;
};

window._eliminarIngredienteDesdeModal = async function() {
    const id = window.ingredienteEditandoId;
    if (!id) return;
    const ing = (window.inventarioItems || []).find(i => i.id === id);
    if (!confirm(`¿Eliminar el ingrediente "${ing?.nombre || id}"?`)) return;
    
    const deleteBtn = document.getElementById('deleteIngredienteBtn');
    if (deleteBtn) { deleteBtn.disabled = true; deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
        const { error } = await window.safeSupabaseCall(
            window.supabaseClient.from('inventario').delete().eq('id', id)
        );
        if (error) throw error;
        window.cerrarModal('ingredienteModal');
        window.ingredienteEditandoId = null;
        await window.cargarInventario();
        window.mostrarToast('✓ Ingrediente eliminado', 'success');
    } catch(e) {
        console.error('Error eliminando ingrediente:', e);
        window.mostrarToast('Error: ' + (e.message || e), 'error');
    } finally {
        if (deleteBtn) { deleteBtn.disabled = false; deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar'; }
    }
};

window.guardarIngrediente = async function() {
    const isEdit = !!window.ingredienteEditandoId;
    const btn = document.getElementById('saveIngrediente');
    if (btn.disabled) return;
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const nombre = document.getElementById('ingredienteNombre').value.trim();
        if (!nombre) {
            window.mostrarErrorEnModal('ingredienteModal', 'El nombre es obligatorio');
            return;
        }
        
        let stockActual = parseFloat(document.getElementById('ingredienteStock').value) || 0;
        const nuevoStock = parseFloat(document.getElementById('ingredienteAgregar').value) || 0;
        const stockTotal = stockActual + nuevoStock;
        const unidadBase = document.getElementById('ingredienteUnidad').value;
        const minimo = parseFloat(document.getElementById('ingredienteMinimo').value) || 0;
        const precioCosto = parseFloat(document.getElementById('ingredienteCosto').value) || 0;
        const precioVenta = parseFloat(document.getElementById('ingredienteVenta').value) || 0;
        
        const ingredienteData = {
            nombre,
            stock: stockTotal,
            reservado: isEdit ? (window.inventarioItems.find(i => i.id === window.ingredienteEditandoId)?.reservado || 0) : 0,
            unidad_base: unidadBase,
            minimo,
            precio_costo: precioCosto,
            precio_unitario: precioVenta,
            updated_at: new Date().toISOString()
        };
        
        if (isEdit) {
            const { error } = await window.safeSupabaseCall(
                window.supabaseClient.from('inventario').update(ingredienteData).eq('id', window.ingredienteEditandoId)
            );
            if (error) throw error;
            window.mostrarToast('✓ Ingrediente actualizado', 'success');
        } else {
            const newId = window.generarId('ing_');
            ingredienteData.id = newId;
            ingredienteData.created_at = new Date().toISOString();
            const { error } = await window.safeSupabaseCall(
                window.supabaseClient.from('inventario').insert([ingredienteData])
            );
            if (error) throw error;
            window.mostrarToast('✓ Ingrediente creado', 'success');
        }
        
        window.cerrarModal('ingredienteModal');
        await window.cargarInventario();
        window.resetearBloqueoStock();
        window.ingredienteEditandoId = null;
        
    } catch (error) {
        console.error('Error guardando ingrediente:', error);
        window.mostrarErrorEnModal('ingredienteModal', 'Error al guardar: ' + (error.message || error));
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

window.agregarStock = function(ingredienteId) {
    const ingrediente = window.inventarioItems.find(i => i.id === ingredienteId);
    if (ingrediente) {
        window.editarIngrediente(ingredienteId);
        setTimeout(() => { const agregarInput = document.getElementById('ingredienteAgregar'); if (agregarInput) agregarInput.focus(); }, 500);
    }
};

window.eliminarIngrediente = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este ingrediente?')) return;
    try {
        await window.safeSupabaseCall(
            window.supabaseClient.from('inventario').delete().eq('id', id)
        );
        await window.cargarInventario();
        window.mostrarToast('✓ Ingrediente eliminado', 'success');
    } catch (e) { console.error('Error eliminando ingrediente:', e); window.mostrarToast('Error al eliminar ingrediente', 'error'); }
};

window.calcularCostoUnitario = function() {
    const costoTotal = parseFloat(document.getElementById('costoTotal').value) || 0;
    const cantidad = parseFloat(document.getElementById('cantidadComprada').value) || 0;
    const resDiv = document.getElementById('calcResultado');
    const resVal = document.getElementById('calcPrecioUnitario');
    const resUni = document.getElementById('calcUnidadResult');
    const unidad = document.getElementById('ingredienteUnidad')?.value || 'unidad';
    if (costoTotal > 0 && cantidad > 0) {
        const unitario = costoTotal / cantidad;
        document.getElementById('ingredienteCosto').value = unitario.toFixed(4);
        if (resDiv) resDiv.style.display = 'block';
        if (resVal) resVal.textContent = unitario.toFixed(4);
        if (resUni) resUni.textContent = ' por ' + unidad;
    } else {
        if (resDiv) resDiv.style.display = 'none';
    }
};

// ==================== MODAL DE PLATILLO ====================
window.abrirModalNuevoPlatillo = function() {
    document.getElementById('platilloModalTitle').textContent = 'Nuevo Platillo';
    document.getElementById('platilloForm').reset();
    document.getElementById('ingredientesContainer').innerHTML = '';
    window.limpiarImagenPreview();
    window.cargarCategoriasSelect();
    window.platilloEditandoId = null;
    document.getElementById('platilloModal').classList.add('active');
};

window.cargarCategoriasSelect = function() {
    const select = document.getElementById('platilloCategoria');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar</option>';
    Object.keys(window.categoriasMenu || {}).forEach(cat => { const opt = document.createElement('option'); opt.value = cat; opt.textContent = cat; select.appendChild(opt); });
    select.addEventListener('change', (e) => { window.cargarSubcategoriasSelect(e.target.value); });
};

window.cargarSubcategoriasSelect = function(categoria) {
    const select = document.getElementById('platilloSubcategoria');
    if (!select) return;
    select.innerHTML = '<option value="">Ninguna</option>';
    if (categoria && window.categoriasMenu && window.categoriasMenu[categoria]) {
        window.categoriasMenu[categoria].forEach(sub => { const opt = document.createElement('option'); opt.value = sub; opt.textContent = sub; select.appendChild(opt); });
    }
};

window.agregarIngredienteRow = function(ingredienteId, cantidad, unidad) {
    ingredienteId = ingredienteId || '';
    cantidad = cantidad || '';
    if (!unidad && ingredienteId) {
        const invItem = (window.inventarioItems || []).find(i => i.id === ingredienteId);
        unidad = invItem?.unidad_base || 'unidades';
    }
    unidad = unidad || 'unidades';
    const container = document.getElementById('ingredientesContainer');
    const row = document.createElement('div');
    row.className = 'ingrediente-row';
    row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.4rem;align-items:center;margin-bottom:.4rem';
    
    const select = document.createElement('select');
    select.style.cssText = 'font-family:Montserrat,sans-serif;font-size:.82rem';
    select.innerHTML = '<option value="">Seleccionar ingrediente</option>';
    const sorted = [...(window.inventarioItems || [])].sort((a,b) => a.nombre.localeCompare(b.nombre));
    sorted.forEach(ing => {
        const opt = document.createElement('option');
        opt.value = ing.id;
        opt.textContent = ing.nombre;
        if (ing.id === ingredienteId) opt.selected = true;
        select.appendChild(opt);
    });
    select.addEventListener('change', function() {
        const ing = (window.inventarioItems || []).find(i => i.id === this.value);
        if (ing && ing.unidad_base) {
            const unitSel = this.parentElement.querySelector('.ing-row-unidad');
            if (unitSel) unitSel.value = ing.unidad_base;
        }
        window._recalcularStockPlatillo();
    });
    
    const inputCantidad = document.createElement('input');
    inputCantidad.type = 'number'; inputCantidad.step = '0.001';
    inputCantidad.placeholder = 'Cant.'; inputCantidad.value = cantidad;
    inputCantidad.addEventListener('input', window._recalcularStockPlatillo);
    
    const selUnidad = document.createElement('select');
    selUnidad.className = 'ing-row-unidad';
    selUnidad.style.cssText = 'font-family:Montserrat,sans-serif;font-size:.78rem';
    ['unidades','gramos','mililitros','kilogramos','litros'].forEach(u => {
        const o = document.createElement('option');
        o.value = u; o.textContent = u.charAt(0).toUpperCase() + u.slice(1);
        if (u === unidad) o.selected = true;
        selUnidad.appendChild(o);
    });
    selUnidad.addEventListener('change', window._recalcularStockPlatillo);
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.style.cssText = 'background:#ffebee;color:var(--danger);border:none;border-radius:6px;width:28px;height:28px;cursor:pointer';
    removeBtn.onclick = () => { row.remove(); window._recalcularStockPlatillo(); };
    
    row.appendChild(select);
    row.appendChild(inputCantidad);
    row.appendChild(selUnidad);
    row.appendChild(removeBtn);
    container.appendChild(row);
    window._recalcularStockPlatillo();
};

window.limpiarImagenPreview = function() {
    document.getElementById('platilloImagen').value = '';
    document.getElementById('platilloImagenUrl').value = '';
    const previewDiv = document.getElementById('imagenPreview');
    if (previewDiv) previewDiv.style.display = 'none';
    document.getElementById('previewImg').src = '';
    document.getElementById('platilloImagenUrl').disabled = false;
};

window.actualizarPreviewDesdeArchivo = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    document.getElementById('platilloImagenUrl').value = '';
    document.getElementById('platilloImagenUrl').disabled = true;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewDiv = document.getElementById('imagenPreview');
        const previewImg = document.getElementById('previewImg');
        previewImg.src = e.target.result;
        previewDiv.style.display = 'flex';
    };
    reader.readAsDataURL(file);
};

window.actualizarPreviewDesdeUrl = function(urlInput) {
    const url = urlInput.value.trim();
    const archivoInput = document.getElementById('platilloImagen');
    
    if (archivoInput.files.length > 0) {
        urlInput.value = '';
        window.mostrarToast('Primero elimina la imagen adjunta para usar URL', 'warning');
        return;
    }
    
    if (url) {
        const previewDiv = document.getElementById('imagenPreview');
        const previewImg = document.getElementById('previewImg');
        previewImg.src = url;
        previewDiv.style.display = 'flex';
    } else {
        document.getElementById('imagenPreview').style.display = 'none';
    }
};

window.eliminarImagenAdjunta = function() {
    const archivoInput = document.getElementById('platilloImagen');
    const urlInput = document.getElementById('platilloImagenUrl');
    const previewDiv = document.getElementById('imagenPreview');
    
    archivoInput.value = '';
    urlInput.disabled = false;
    urlInput.value = '';
    previewDiv.style.display = 'none';
    document.getElementById('previewImg').src = '';
    window.mostrarToast('Imagen eliminada. Puedes usar URL o seleccionar otra.', 'info');
};

window.editarPlatillo = function(id) {
    const platillo = window.menuItems.find(p => p.id === id);
    if (!platillo) return;
    window.platilloEditandoId = id;
    document.getElementById('platilloModalTitle').textContent = 'Editar Platillo';
    window.limpiarImagenPreview();
    document.getElementById('platilloNombre').value = platillo.nombre || '';
    document.getElementById('platilloCategoria').value = platillo.categoria || '';
    document.getElementById('platilloSubcategoria').value = platillo.subcategoria || '';
    document.getElementById('platilloPrecio').value = platillo.precio || '';
    document.getElementById('platilloDescripcion').value = platillo.descripcion || '';
    document.getElementById('platilloDisponible').value = platillo.disponible ? 'true' : 'false';
    const chkD = document.getElementById('platilloDisponibleCheck');
    const lblD = document.getElementById('platilloDisponibleLabel');
    if (chkD) chkD.checked = !!platillo.disponible;
    if (lblD) { lblD.textContent = platillo.disponible ? 'Sí' : 'No'; lblD.style.color = platillo.disponible ? 'var(--success)' : 'var(--text-muted)'; }
    if (platillo.imagen) {
        document.getElementById('previewImg').src = platillo.imagen;
        const previewDiv = document.getElementById('imagenPreview');
        if (previewDiv) previewDiv.style.display = 'flex';
        document.getElementById('platilloImagenUrl').value = platillo.imagen;
        document.getElementById('platilloImagenUrl').disabled = false;
    }
    window.cargarSubcategoriasSelect(platillo.categoria);
    document.getElementById('ingredientesContainer').innerHTML = '';
    if (platillo.ingredientes) Object.entries(platillo.ingredientes).forEach(([ingId, ingInfo]) => { window.agregarIngredienteRow(ingId, ingInfo.cantidad, ingInfo.unidad); });
    document.getElementById('platilloModal').classList.add('active');
};

window.eliminarPlatillo = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este platillo?')) return;
    try {
        const platillo = window.menuItems.find(p => p.id === id);
        if (platillo && platillo.imagen && platillo.imagen.includes('imagenes-platillos')) await window.eliminarImagenPlatillo(platillo.imagen);
        await window.safeSupabaseCall(
            window.supabaseClient.from('menu').delete().eq('id', id)
        );
        await window.cargarMenu();
        window.mostrarToast('✓ Platillo eliminado', 'success');
    } catch (e) { console.error('Error eliminando platillo:', e); window.mostrarToast('Error al eliminar el platillo', 'error'); }
};

// ==================== EVENT LISTENERS ====================
window.setupEventListeners = function() {
    window._scrollTabs = function(dir) {
        const c = document.getElementById('tabsContainer');
        if (!c) return;
        c.scrollBy({ left: dir * 180, behavior: 'smooth' });
        setTimeout(window._updateTabChevrons, 200);
    };
    window._updateTabChevrons = function() {
        const c = document.getElementById('tabsContainer');
        const lBtn = document.getElementById('tabsChevronLeft');
        const rBtn = document.getElementById('tabsChevronRight');
        if (!c || !lBtn || !rBtn) return;
        lBtn.style.opacity = c.scrollLeft > 4 ? '1' : '0.3';
        lBtn.style.pointerEvents = c.scrollLeft > 4 ? 'auto' : 'none';
        const atEnd = c.scrollLeft + c.clientWidth >= c.scrollWidth - 4;
        rBtn.style.opacity = atEnd ? '0.3' : '1';
        rBtn.style.pointerEvents = atEnd ? 'none' : 'auto';
    };
    const tabsContainer = document.getElementById('tabsContainer');
    if (tabsContainer) tabsContainer.addEventListener('scroll', window._updateTabChevrons);
    window._updateTabChevrons();
    
    const platilloDisponibleCheck = document.getElementById('platilloDisponibleCheck');
    if (platilloDisponibleCheck) {
        platilloDisponibleCheck.addEventListener('change', function() {
            const lbl = document.getElementById('platilloDisponibleLabel');
            const sel = document.getElementById('platilloDisponible');
            if (lbl) { lbl.textContent = this.checked ? 'Sí' : 'No'; lbl.style.color = this.checked ? 'var(--success)' : 'var(--text-muted)'; }
            if (sel) sel.value = this.checked ? 'true' : 'false';
        });
    }
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            const pane = document.getElementById(target + 'Pane');
            if (pane) pane.classList.add('active');
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                window.cerrarModal(this.id);
                if (this.id === 'ingredienteModal') window.resetearBloqueoStock();
            }
        });
    });
    
    const saveAllButton = document.getElementById('saveAllButton');
    if (saveAllButton) saveAllButton.addEventListener('click', async () => { await window.guardarConfiguracion(); });
    
    const tasaBaseInput = document.getElementById('tasaBaseInput');
    if (tasaBaseInput) tasaBaseInput.addEventListener('change', window.recalcularTasaEfectiva);
    const aumentoDiarioInput = document.getElementById('aumentoDiarioInput');
    if (aumentoDiarioInput) aumentoDiarioInput.addEventListener('change', window.recalcularTasaEfectiva);
    
    function _mostrarFechasAumento(visible) {
        const fechasDiv = document.getElementById('tasaFechasDiv');
        if (fechasDiv) fechasDiv.style.display = visible ? 'flex' : 'none';
    }
    function _actualizarLabelAumento() {
        const diario = document.getElementById('aumentoActivoToggle')?.checked;
        const semanal = document.getElementById('aumentoSemanalToggle')?.checked;
        const alguno = diario || semanal;
        const label = document.getElementById('labelAumentoPct');
        if (label) label.textContent = semanal ? 'Aumento Semanal %:' : 'Aumento Diario %:';
        const inputPct = document.getElementById('aumentoDiarioInput');
        if (inputPct) {
            inputPct.disabled = !alguno;
            inputPct.style.opacity = alguno ? '1' : '0.4';
        }
        _mostrarFechasAumento(alguno);
        if (alguno && !document.getElementById('aumentoDesde')?.value) {
            const desdeInput = document.getElementById('aumentoDesde');
            if (desdeInput) desdeInput.value = new Date().toISOString().split('T')[0];
        }
    }
    
    const aumentoActivoToggle = document.getElementById('aumentoActivoToggle');
    if (aumentoActivoToggle) {
        aumentoActivoToggle.addEventListener('change', function() {
            if (this.checked) {
                const semanalToggle = document.getElementById('aumentoSemanalToggle');
                if (semanalToggle) semanalToggle.checked = false;
            }
            window.configGlobal.aumento_detenido = !this.checked;
            _actualizarLabelAumento();
            window.recalcularTasaEfectiva();
        });
    }
    
    const aumentoSemanalToggle = document.getElementById('aumentoSemanalToggle');
    if (aumentoSemanalToggle) {
        aumentoSemanalToggle.addEventListener('change', function() {
            if (this.checked) {
                const diarioToggle = document.getElementById('aumentoActivoToggle');
                if (diarioToggle) diarioToggle.checked = false;
            }
            window.configGlobal.aumento_detenido = !this.checked;
            _actualizarLabelAumento();
            window.recalcularTasaEfectiva();
        });
    }
    
    const aumentoIndefinido = document.getElementById('aumentoIndefinido');
    if (aumentoIndefinido) {
        aumentoIndefinido.addEventListener('change', function() {
            const hastaInput = document.getElementById('aumentoHasta');
            if (hastaInput) hastaInput.disabled = this.checked;
            if (this.checked && hastaInput) hastaInput.value = '';
        });
    }
    
    const closeQrBtn = document.getElementById('closeQrAmpliado');
    const closeQrX = document.getElementById('closeQrAmpliadoModal');
    const qrModal = document.getElementById('qrAmpliadoModal');
    if (closeQrBtn) closeQrBtn.addEventListener('click', () => window.cerrarModal('qrAmpliadoModal'));
    if (closeQrX) closeQrX.addEventListener('click', () => window.cerrarModal('qrAmpliadoModal'));
    if (qrModal) qrModal.addEventListener('click', function(e) { if (e.target === this) window.cerrarModal('qrAmpliadoModal'); });
    
    const menuBuscador = document.getElementById('menuBuscador');
    if (menuBuscador) {
        menuBuscador.addEventListener('input', (e) => { window.renderizarMenu(e.target.value); });
    }
    const inventarioBuscador = document.getElementById('inventarioBuscador');
    if (inventarioBuscador) {
        inventarioBuscador.addEventListener('input', (e) => { window.renderizarInventario(e.target.value); });
    }
    
    const mesonerosBuscador = document.getElementById('mesonerosBuscador');
    if (mesonerosBuscador) {
        mesonerosBuscador.addEventListener('input', (e) => { window.renderizarMesoneros(e.target.value); });
    }
    const deliverysBuscador = document.getElementById('deliverysBuscador');
    if (deliverysBuscador) {
        deliverysBuscador.addEventListener('input', (e) => { window.renderizarDeliverys(e.target.value); });
    }
    
    const closePlatilloModal = document.getElementById('closePlatilloModal');
    if (closePlatilloModal) closePlatilloModal.addEventListener('click', () => window.cerrarModal('platilloModal'));
    const cancelPlatillo = document.getElementById('cancelPlatillo');
    if (cancelPlatillo) cancelPlatillo.addEventListener('click', () => window.cerrarModal('platilloModal'));
    const savePlatillo = document.getElementById('savePlatillo');
    if (savePlatillo) {
        savePlatillo.addEventListener('click', async () => {
            const btn = savePlatillo;
            if (btn.disabled) return;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            try {
                const nombre = document.getElementById('platilloNombre').value;
                const categoria = document.getElementById('platilloCategoria').value;
                const subcategoria = document.getElementById('platilloSubcategoria').value;
                const precio = parseFloat(document.getElementById('platilloPrecio').value);
                const descripcion = document.getElementById('platilloDescripcion').value;
                const disponible = document.getElementById('platilloDisponibleCheck').checked;
                if (!nombre || !categoria || !precio) {
                    window.mostrarErrorEnModal('platilloModal', 'Completa los campos obligatorios');
                    return;
                }
                
                let imagenUrl = '';
                const archivoImagen = document.getElementById('platilloImagen').files[0];
                const imagenUrlInput = document.getElementById('platilloImagenUrl').value;
                if (archivoImagen) {
                    const resultado = await window.subirImagenPlatillo(archivoImagen, 'menu');
                    if (resultado.success) imagenUrl = resultado.url;
                    else { window.mostrarToast('Error al subir la imagen: ' + resultado.error, 'error'); return; }
                } else if (imagenUrlInput) imagenUrl = imagenUrlInput;
                
                const ingredientes = {};
                document.querySelectorAll('#ingredientesContainer .ingrediente-row').forEach(row => {
                    const selIng = row.querySelector('select:not(.ing-row-unidad)');
                    const selUnidad = row.querySelector('select.ing-row-unidad');
                    const cantInput = row.querySelector('input[type="number"]');
                    if (selIng && selIng.value && cantInput && cantInput.value) {
                        ingredientes[selIng.value] = {
                            cantidad: parseFloat(cantInput.value),
                            nombre: selIng.options[selIng.selectedIndex]?.text || selIng.value,
                            unidad: selUnidad ? selUnidad.value : 'unidades'
                        };
                    }
                });
                
                const ingEntries = Object.entries(ingredientes);
                let maxPlatillos;
                if (!ingEntries.length) {
                    const existing = (window.menuItems || []).find(p => p.id === (window.platilloEditandoId || ''));
                    maxPlatillos = existing ? (existing.stock || 0) : 0;
                } else {
                    maxPlatillos = Infinity;
                    ingEntries.forEach(([ingId, ingData]) => {
                        const inv = (window.inventarioItems || []).find(i => i.id === ingId);
                        if (inv) {
                            const disponibleInv = (inv.stock || 0) - (inv.reservado || 0);
                            const unidadRef = inv.unidad_base || 'unidades';
                            const unidadDato = ingData.unidad || unidadRef;
                            const necesario = window._convertirUnidad(ingData.cantidad, unidadDato, unidadRef);
                            if (necesario > 0) maxPlatillos = Math.min(maxPlatillos, Math.floor(disponibleInv / necesario));
                        } else { maxPlatillos = 0; }
                    });
                    if (!isFinite(maxPlatillos) || maxPlatillos < 0) maxPlatillos = 0;
                }
                
                const platillo = {
                    id: window.platilloEditandoId || window.generarId('plat_'),
                    nombre, categoria, subcategoria: subcategoria || null, precio, descripcion,
                    imagen: imagenUrl, ingredientes, disponible, stock: maxPlatillos, stock_maximo: maxPlatillos
                };
                
                let error;
                if (window.platilloEditandoId) {
                    const { error: updateError } = await window.safeSupabaseCall(
                        window.supabaseClient.from('menu').update(platillo).eq('id', window.platilloEditandoId)
                    );
                    error = updateError;
                } else {
                    const { error: insertError } = await window.safeSupabaseCall(
                        window.supabaseClient.from('menu').insert([platillo])
                    );
                    error = insertError;
                }
                if (error) throw error;
                
                window.cerrarModal('platilloModal');
                window.platilloEditandoId = null;
                window.limpiarImagenPreview();
                await window.cargarMenu();
                window.mostrarToast('✓ Platillo guardado', 'success');
            } catch (e) {
                console.error('Error guardando platillo:', e);
                window.mostrarErrorEnModal('platilloModal', 'Error al guardar: ' + e.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Guardar';
            }
        });
    }
    
    const closeUsuarioModal = document.getElementById('closeUsuarioModal');
    if (closeUsuarioModal) closeUsuarioModal.addEventListener('click', () => window.cerrarModal('usuarioModal'));
    const cancelUsuario = document.getElementById('cancelUsuario');
    if (cancelUsuario) cancelUsuario.addEventListener('click', () => window.cerrarModal('usuarioModal'));
    
    const closeDeliveryModal = document.getElementById('closeDeliveryModal');
    if (closeDeliveryModal) closeDeliveryModal.addEventListener('click', () => window.cerrarModal('deliveryModal'));
    const cancelDeliveryEdit = document.getElementById('cancelDeliveryEdit');
    if (cancelDeliveryEdit) cancelDeliveryEdit.addEventListener('click', () => window.cerrarModal('deliveryModal'));
    
    const saveDelivery = document.getElementById('saveDelivery');
    if (saveDelivery) {
        saveDelivery.addEventListener('click', async () => {
            if (!window.deliveryEditandoId) return;
            const nombre = document.getElementById('deliveryNombre').value.trim();
            const activo = document.getElementById('deliveryEstado').value === 'true';
            if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
            try {
                await window.safeSupabaseCall(
                    window.supabaseClient.from('deliverys').update({ nombre, activo }).eq('id', window.deliveryEditandoId)
                );
                window.cerrarModal('deliveryModal');
                await window.cargarDeliverys();
                window.mostrarToast('✓ Motorizado actualizado', 'success');
            } catch (e) { console.error('Error:', e); window.mostrarToast('Error al actualizar', 'error'); }
        });
    }
    
    const confirmPagoDeliveryBtn = document.getElementById('confirmPagoDeliveryBtn');
    if (confirmPagoDeliveryBtn) confirmPagoDeliveryBtn.addEventListener('click', window.confirmarPagoDelivery);
    
    const recoveryLink = document.getElementById('recoveryLink');
    if (recoveryLink) {
        recoveryLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const codigo = Math.floor(100000 + Math.random() * 900000);
            console.log('Código de recuperación:', codigo);
            const codigoIngresado = prompt('Ingresa el código de recuperación:');
            if (codigoIngresado === codigo.toString()) {
                const { data } = await window.safeSupabaseCall(
                    window.supabaseClient.from('config').select('admin_password, recovery_email').eq('id', 1).single()
                );
                alert(`Tu contraseña es: ${data.admin_password}\nCorreo de recuperación: ${data.recovery_email}`);
            } else window.mostrarToast('Código incorrecto', 'error');
        });
    }
    
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('admin_authenticated');
            sessionStorage.removeItem('admin_jwt_token');
            sessionStorage.removeItem('admin_user');
            window.isAdminAuthenticated = false;
            window.jwtToken = null;
            window.cleanupRealtimeSubscriptions();
            window.mostrarLogin();
            window.mostrarToast('✓ Sesión cerrada', 'info');
            window.supabaseClient = window.inicializarSupabaseCliente();
        });
    }
};

// ==================== UTILIDADES ADICIONALES ====================
window._recalcularStockPlatillo = function() {
    const wrap = document.getElementById('stockCalculadoWrap');
    const txt = document.getElementById('stockCalculadoText');
    if (!wrap || !txt) return;
    const rows = document.querySelectorAll('#ingredientesContainer .ingrediente-row');
    if (!rows.length) { wrap.style.display = 'none'; return; }
    let maxPlatillos = Infinity;
    let hayIngredientes = false;
    rows.forEach(row => {
        const selIng = row.querySelector('select:not(.ing-row-unidad)');
        const selUni = row.querySelector('select.ing-row-unidad');
        const cant = parseFloat(row.querySelector('input[type="number"]')?.value) || 0;
        if (!selIng?.value || !cant) return;
        hayIngredientes = true;
        const inv = (window.inventarioItems || []).find(i => i.id === selIng.value);
        if (inv) {
            const disponible = (inv.stock || 0) - (inv.reservado || 0);
            const unidadIng = selUni?.value || 'unidades';
            const necesario = window._convertirUnidad(cant, unidadIng, inv.unidad_base || 'unidades');
            if (necesario > 0) maxPlatillos = Math.min(maxPlatillos, Math.floor(disponible / necesario));
        } else { maxPlatillos = 0; }
    });
    if (!hayIngredientes) { wrap.style.display = 'none'; return; }
    if (!isFinite(maxPlatillos) || maxPlatillos < 0) maxPlatillos = 0;
    wrap.style.display = 'block';
    wrap.style.background = maxPlatillos > 5 ? '#f0fdf4' : maxPlatillos > 0 ? '#fffbeb' : '#fef2f2';
    wrap.style.borderColor = maxPlatillos > 5 ? '#bbf7d0' : maxPlatillos > 0 ? '#fde68a' : '#fecaca';
    txt.style.color = maxPlatillos > 5 ? '#166534' : maxPlatillos > 0 ? '#92400e' : '#991b1b';
    txt.textContent = maxPlatillos > 0 ? `Con el stock actual se pueden preparar ${maxPlatillos} porcion${maxPlatillos !== 1 ? 'es' : ''}` : '⚠️ Stock insuficiente para preparar este platillo';
};

window._convertirUnidad = function(valor, desde, hacia) {
    if (!desde || !hacia || desde === hacia) return valor;
    let base = valor;
    if (desde === 'kilogramos') base = valor * 1000;
    else if (desde === 'litros') base = valor * 1000;
    if (hacia === 'kilogramos') return base / 1000;
    if (hacia === 'litros') return base / 1000;
    return base;
};

window._previewPrecioBs = function() {
    const precio = parseFloat(document.getElementById('platilloPrecio')?.value) || 0;
    const tasa = (window.configGlobal?.tasa_efectiva) || (window.configGlobal?.tasa_cambio) || 0;
    const el = document.getElementById('platilloPrecioBsPreview');
    if (el) el.textContent = tasa > 0 && precio > 0 ? '✓ ' + window.formatBs(precio * tasa) : '';
};

window._previewPlatilloUrl = function(url) {
    if (!url) return;
    const prev = document.getElementById('imagenPreview');
    const img = document.getElementById('previewImg');
    if (prev && img) { img.src = url; prev.style.display = 'flex'; }
};

window._syncIngredientePreview = function() {
    const stockActual = parseFloat(document.getElementById('ingredienteStock')?.value) || 0;
    const nuevo = parseFloat(document.getElementById('ingredienteAgregar')?.value) || 0;
    const unidad = document.getElementById('ingredienteUnidad')?.value || 'unidades';
    const total = stockActual + nuevo;
    const sp = document.getElementById('stockTotalPreview');
    const sc = document.getElementById('stockConversionPreview');
    if (sp) sp.textContent = nuevo > 0 ? `Stock resultante: ${total.toFixed(3)} ${unidad}` : '';
    if (sc) {
        if (unidad === 'kilogramos' && nuevo > 0) sc.textContent = `= ${(nuevo * 1000).toFixed(0)} gramos adicionales`;
        else if (unidad === 'litros' && nuevo > 0) sc.textContent = `= ${(nuevo * 1000).toFixed(0)} mililitros adicionales`;
        else sc.textContent = '';
    }
};

// ==================== AVISO DE LUNES ====================
window._verificarAvisoLunes = function() {
    if (!window.configGlobal || !window.configGlobal.aumento_semanal) return;

    const hoy = new Date();
    if (hoy.getDay() !== 1) return;

    const claveAviso = 'saki_aviso_lunes_' + hoy.toISOString().split('T')[0];
    if (localStorage.getItem(claveAviso)) return;
    localStorage.setItem(claveAviso, '1');

    setTimeout(() => {
        const notif = document.createElement('div');
        notif.className = 'aviso-lunes';
        notif.innerHTML = `
            <div class="flex">
                <div class="emoji">📅</div>
                <div class="content">
                    <div class="title">Nueva semana — ¿Actualizas el porcentaje?</div>
                    <div class="message">
                        Hoy es lunes y tienes activo el aumento semanal.
                        ¿Quieres ajustar el porcentaje de aumento para esta semana?
                    </div>
                    <div class="buttons">
                        <button class="btn-no" id="avisoLunesNo">No, dejarlo igual</button>
                        <button class="btn-si" id="avisoLunesSi">Sí, cambiar %</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(notif);

        document.getElementById('avisoLunesNo').addEventListener('click', () => notif.remove());
        document.getElementById('avisoLunesSi').addEventListener('click', () => {
            notif.remove();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const input = document.getElementById('aumentoDiarioInput');
            if (input) {
                input.focus();
                input.select();
                input.style.outline = '3px solid #FF9800';
                setTimeout(() => { input.style.outline = ''; }, 3000);
            }
        });

        setTimeout(() => { if (notif.parentNode) notif.remove(); }, 30000);
    }, 1000);
};

// ==================== TEMA CLARO/OSCURO ====================
window.toggleTheme = function() {
    const html = document.documentElement;
    const icon = document.getElementById('themeIcon');
    const isDark = html.classList.toggle('dark-theme');
    if (icon) icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    localStorage.setItem('saki_admin_theme', isDark ? 'dark' : 'light');
};

window.initTheme = function() {
    const savedTheme = localStorage.getItem('saki_admin_theme');
    const icon = document.getElementById('themeIcon');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        if (icon) icon.className = 'fas fa-moon';
    } else {
        document.documentElement.classList.remove('dark-theme');
        if (icon) icon.className = 'fas fa-sun';
    }
};

// ==================== INICIALIZACIÓN ====================
window.mostrarPanel = function() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('panelContainer').classList.add('active');
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

document.addEventListener('DOMContentLoaded', async () => {
    window.initTheme();
    
    if (window.restaurarSesionAdmin()) {
        window.mostrarPanel();
        setTimeout(async () => {
            try {
                await window.cargarConfiguracionInicial();
                await Promise.allSettled([
                    window.cargarMenu(),
                    window.cargarInventario(),
                    window.cargarUsuarios(),
                    window.cargarQRs(),
                    window.cargarReportes(),
                    window.cargarPedidosRecientes(),
                    window.cargarMesoneros(),
                    window.cargarDeliverys(),
                    window.cargarPropinas()
                ]);
                window.setupEventListeners();
                window.setupRealtimeSubscriptions();
                window.setupStockRealtime();
                window.restaurarWifiPersistente();
                window._registrarPushAdmin();
                
                window._verificarTasaDeHoy((tasa) => {
                    const tasaInput = document.getElementById('tasaBaseInput');
                    if (tasaInput) tasaInput.value = tasa;
                    window.configGlobal.tasa_cambio = tasa;
                    window.recalcularTasaEfectiva();
                });
                
                await window._actualizarVentasHoyNeto();
                await window._actualizarDeliverysHoy();
                
            } catch (e) { 
                console.error('Error cargando datos:', e); 
                window.mostrarToast('Error cargando datos: ' + e.message, 'error'); 
            }
        }, 100);
    } else {
        window.mostrarLogin();
    }
});