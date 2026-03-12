// supabase-config.js - VERSIÓN CORRECTA
window.SUPABASE_URL = 'https://iqwwoihiiyrtypyqzhgy.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm';

// Función para inicializar el cliente con un token JWT opcional
window.inicializarSupabaseCliente = (jwtToken = null) => {
    const options = { 
        auth: { 
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        } 
    };
    if (jwtToken) {
        options.global = {
            headers: {
                Authorization: `Bearer ${jwtToken}`
            }
        };
    }
    window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY,
        options
    );
    console.log(jwtToken ? '📌 Cliente Supabase inicializado con JWT' : '📌 Cliente Supabase inicializado (anónimo)');
    return window.supabaseClient;
};

// Inicializar cliente por defecto (sin token)
if (!window.supabaseClient) {
    window.supabaseClient = window.inicializarSupabaseCliente();
}

window.configGlobal = {
    tasa_cambio: 400,
    tasa_efectiva: 400,
    aumento_diario: 0,
    aumento_acumulado: 0,
    aumento_activo: false,
    aumento_detenido: false,
    fecha_ultimo_aumento: null,
    ultima_actualizacion: null,
    admin_password: '654321',
    recovery_email: 'admin@sakisushi.com',
    alerta_stock_minimo: 5
};

// ============================================
// CACHÉ GLOBAL MEJORADO
// ============================================
window.appCache = {
    stock: { data: {}, lastUpdate: 0, duration: 5000 },
    platillos: new Map(),
    pedidos: new Map(),
    notificaciones: new Map(),
    
    getStock: function(ingredienteId) {
        const ahora = Date.now();
        if (ahora - this.stock.lastUpdate > this.stock.duration) {
            this.stock.data = {};
        }
        return this.stock.data[ingredienteId];
    },
    
    setStock: function(ingredienteId, valor) {
        this.stock.data[ingredienteId] = valor;
        this.stock.lastUpdate = Date.now();
    },
    
    invalidateStock: function() {
        this.stock.data = {};
        this.stock.lastUpdate = 0;
        this.platillos.clear();
    },
    
    limpiarTodo: function() {
        this.stock.data = {};
        this.stock.lastUpdate = 0;
        this.platillos.clear();
        this.pedidos.clear();
        this.notificaciones.clear();
    }
};

window.stockCache = {
    get: (id) => window.appCache.getStock(id),
    set: (id, v) => window.appCache.setStock(id, v),
    invalidate: () => window.appCache.invalidateStock(),
    clear: () => { 
        window.appCache.stock.data = {}; 
        window.appCache.stock.lastUpdate = 0; 
    }
};

// ============================================
// FUNCIONES DE ZONA HORARIA GMT-4
// ============================================
window.getFechaGMT4 = function() {
    const fecha = new Date();
    return new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
};

window.formatearFechaGMT4 = function(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const fecha = new Date(timestamp);
        const fechaGMT4 = new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
        const dia = fechaGMT4.getDate().toString().padStart(2, '0');
        const mes = (fechaGMT4.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaGMT4.getFullYear();
        const horas = fechaGMT4.getHours().toString().padStart(2, '0');
        const minutos = fechaGMT4.getMinutes().toString().padStart(2, '0');
        return `${dia}/${mes}/${año} ${horas}:${minutos}`;
    } catch (e) {
        return timestamp;
    }
};

window.formatearHora12GMT4 = function(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const fecha = new Date(timestamp);
        const fechaGMT4 = new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
        let horas = fechaGMT4.getHours();
        const minutos = fechaGMT4.getMinutes().toString().padStart(2, '0');
        const ampm = horas >= 12 ? 'pm' : 'am';
        horas = horas % 12;
        horas = horas ? horas : 12;
        return `${horas}:${minutos} ${ampm}`;
    } catch (e) {
        return timestamp;
    }
};

window.getTimestampISO_GMT4 = function() {
    const fecha = new Date();
    const fechaGMT4 = new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const fechaUTC = new Date(fechaGMT4.getTime() + (4 * 60 * 60 * 1000));
    return fechaUTC.toISOString();
};

window.utcToGMT4 = function(utcTimestamp) {
    if (!utcTimestamp) return null;
    try {
        const fecha = new Date(utcTimestamp);
        return new Date(fecha.getTime() - (4 * 60 * 60 * 1000));
    } catch (e) {
        return new Date(utcTimestamp);
    }
};

// ============================================
// FUNCIONES DE NOTIFICACIONES PUSH (COMPLETAS)
// ============================================
window.VAPID_PUBLIC_KEY = 'BC6oJ4E+5pGIn4icpzCBLMi6/nk+1JJenrUA41uJrAs1ELraSw5ctvRAlh8sHVldqzBXUtEwEeFKBm0/hmuM9EY=';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

window.esBrave = function() {
    return navigator.brave && typeof navigator.brave.isBrave === 'function';
};

window.solicitarPermisoPushUI = async function() {
    const sessionId = localStorage.getItem('saki_session_id');
    if (!sessionId) {
        console.error('❌ No hay session_id');
        return;
    }
    
    if (window.esBrave()) {
        window.mostrarToast?.('🦁 En Brave, haz clic en el león y permite notificaciones', 'warning');
    }
    
    const resultado = await window.solicitarPermisoPush(sessionId);
    const btn = document.getElementById('pushPermissionBtn');
    if (!btn) return;
    
    if (resultado && resultado.success) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-bell"></i>';
        btn.setAttribute('data-tooltip', 'Notificaciones activadas');
        window.mostrarToast?.('✅ Notificaciones activadas', 'success');
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-bell"></i>';
        btn.setAttribute('data-tooltip', 'Activar notificaciones');
        if (window.esBrave()) {
            window.mostrarToast?.('🦁 Brave: Haz clic en el león y permite notificaciones', 'warning');
        } else {
            window.mostrarToast?.('❌ No se pudieron activar las notificaciones', 'error');
        }
    }
};

window.solicitarPermisoPush = async function(sessionId) {
    if (!('Notification' in window)) return { success: false, error: 'no_support' };
    if (!('serviceWorker' in navigator)) return { success: false, error: 'no_sw' };
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return { success: false, error: 'no_https' };
    
    try {
        const permiso = await Notification.requestPermission();
        if (permiso !== 'granted') return { success: false, error: 'denied' };
        
        const swUrl = '/SakiSushi0/sw.js';
        const registration = await navigator.serviceWorker.register(swUrl);
        await navigator.serviceWorker.ready;
        
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY)
            });
        }
        
        const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh'))));
        const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))));
        
        const { error } = await window.supabaseClient
            .from('push_subscriptions')
            .upsert([{
                session_id: sessionId,
                endpoint: subscription.endpoint,
                p256dh: p256dh,
                auth: auth,
                user_agent: navigator.userAgent
            }], { onConflict: 'endpoint' });
            
        if (error) throw error;
        return { success: true, subscription };
        
    } catch (error) {
        console.error('❌ Error en push:', error);
        if (window.esBrave()) {
            return { success: false, error: 'brave_blocked' };
        }
        return { success: false, error: error.message };
    }
};

window.tienePermisoPush = function() {
    return Notification.permission === 'granted';
};

window.actualizarEstadoPushUI = function() {
    const btn = document.getElementById('pushPermissionBtn');
    if (!btn) return;
    if (window.tienePermisoPush()) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-bell"></i>';
        btn.setAttribute('data-tooltip', 'Notificaciones activadas');
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-bell"></i>';
        btn.setAttribute('data-tooltip', 'Activar notificaciones');
    }
};

window.verificarServiceWorker = async function() {
    if (!('serviceWorker' in navigator)) return false;
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.some(reg => reg.active && reg.active.scriptURL.includes('sw.js'));
};

window.verificarNotificacionPush = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const notifSession = urlParams.get('notif');
    if (notifSession) {
        setTimeout(() => {
            if (window.toggleNotifications) window.toggleNotifications();
        }, 1000);
    }
};

// ============================================
// FUNCIONES DE CONFIGURACIÓN
// ============================================
window.cargarConfiguracion = async function() {
    try {
        const { data, error } = await window.supabaseClient
            .from('config')
            .select('*')
            .eq('id', 1)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        if (data) window.configGlobal = { ...window.configGlobal, ...data };
        return window.configGlobal;
    } catch (error) {
        console.error('Error cargando configuración:', error);
        return window.configGlobal;
    }
};

window.subirImagenPlatillo = async function(archivoImagen, carpetaAdicional = '') {
    try {
        if (!archivoImagen) return { success: false, error: 'No se proporcionó archivo' };
        const tipoValido = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
        if (!tipoValido.includes(archivoImagen.type)) return { success: false, error: 'Tipo de archivo no válido' };
        const maxSize = 5 * 1024 * 1024;
        if (archivoImagen.size > maxSize) return { success: false, error: 'El archivo es demasiado grande. Máximo 5MB' };
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = archivoImagen.name.split('.').pop();
        const nombreArchivo = `${timestamp}_${random}.${extension}`;
        const ruta = carpetaAdicional ? `${carpetaAdicional}/${nombreArchivo}` : nombreArchivo;
        const { data, error } = await window.supabaseClient.storage
            .from('imagenes-platillos')
            .upload(ruta, archivoImagen, { cacheControl: '3600', upsert: false, contentType: archivoImagen.type });
        if (error) throw error;
        const { data: urlData } = window.supabaseClient.storage.from('imagenes-platillos').getPublicUrl(ruta);
        return { success: true, path: ruta, url: urlData.publicUrl };
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        return { success: false, error: error.message };
    }
};

window.eliminarImagenPlatillo = async function(urlImagen) {
    try {
        if (!urlImagen) return { success: true };
        const bucketName = 'imagenes-platillos';
        const bucketIndex = urlImagen.indexOf(`/public/${bucketName}/`);
        if (bucketIndex === -1) return { success: true };
        const rutaRelativa = urlImagen.substring(bucketIndex + `/public/${bucketName}/`.length);
        if (!rutaRelativa) return { success: true };
        const { error } = await window.supabaseClient.storage.from(bucketName).remove([rutaRelativa]);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error eliminando imagen:', error);
        return { success: false, error: error.message };
    }
};

window.subirComprobante = async function(file, tipo, onProgress) {
    try {
        if (!file) throw new Error('No se proporcionó archivo');
        const tipoValido = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
        if (!tipoValido.includes(file.type)) throw new Error('Tipo de archivo no válido. Solo imágenes JPG, PNG, WEBP o GIF');
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) throw new Error('El archivo es demasiado grande. Máximo 5MB');
        const timestamp = Date.now();
        const nombreArchivo = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const ruta = `${tipo}/${nombreArchivo}`;
        const { data, error } = await window.supabaseClient.storage
            .from('comprobantes')
            .upload(ruta, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (error) throw new Error(error.message || 'Error al subir el archivo');
        const { data: urlData } = window.supabaseClient.storage.from('comprobantes').getPublicUrl(ruta);
        if (onProgress) onProgress({ loaded: file.size, total: file.size, percent: 100 });
        return { success: true, url: urlData.publicUrl };
    } catch (error) {
        console.error('Error en subirComprobante:', error);
        return { success: false, error: error.message || 'Error desconocido al subir el comprobante' };
    }
};

window.formatBs = function(monto) {
    try {
        const valor = Math.round((monto || 0) * 100) / 100;
        let [entero, decimal] = valor.toFixed(2).split('.');
        entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `Bs ${entero},${decimal}`;
    } catch (e) {
        return 'Bs ' + (monto || 0).toFixed(2);
    }
};

window.formatUSD = function(monto) {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(monto);
    } catch (e) {
        return '$ ' + (monto || 0).toFixed(2);
    }
};

window.generarId = function(prefix = '') {
    if (window.crypto && window.crypto.randomUUID) {
        return `${prefix}${crypto.randomUUID()}`;
    }
    return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

window.validarTelefono = function(telefono) {
    const soloNumeros = telefono.replace(/\D/g, '');
    const regex = /^(0412|0414|0424|0416|0426|0418|0422|0212|0234|0241|0243|0246|0251|0254|0255|0257|0261|0264|0265|0268|0271|0273|0274|0275|0276|0281)\d{7}$/;
    return regex.test(soloNumeros);
};

window.validarReferencia = function(ref) {
    const soloNumeros = ref.replace(/\D/g, '');
    return soloNumeros.length === 6;
};

window.usdToBs = function(usd, tasa) {
    const tasaActual = tasa || window.configGlobal.tasa_efectiva || 400;
    return usd * tasaActual;
};

window.bsToUsd = function(bs, tasa) {
    const tasaActual = tasa || window.configGlobal.tasa_efectiva || 400;
    return bs / tasaActual;
};

window.parroquiasDelivery = [
    { nombre: "San Bernardino", precioUSD: 2 }, { nombre: "San José", precioUSD: 2 },
    { nombre: "San Agustín", precioUSD: 2 }, { nombre: "Candelaria", precioUSD: 2 },
    { nombre: "San Juan", precioUSD: 3 }, { nombre: "Catedral", precioUSD: 3 },
    { nombre: "Santa Rosalía", precioUSD: 3 }, { nombre: "El Recreo", precioUSD: 4 },
    { nombre: "La Candelaria", precioUSD: 2 }, { nombre: "San Pedro", precioUSD: 4 },
    { nombre: "El Paraíso", precioUSD: 4 }, { nombre: "La Vega", precioUSD: 4 },
    { nombre: "El Valle", precioUSD: 5 }, { nombre: "Coche", precioUSD: 5 },
    { nombre: "Caricuao", precioUSD: 7 }, { nombre: "Antímano", precioUSD: 7 },
    { nombre: "Macarao", precioUSD: 7 }, { nombre: "23 de Enero", precioUSD: 4 },
    { nombre: "La Pastora", precioUSD: 3 }, { nombre: "Altagracia", precioUSD: 3 },
    { nombre: "Santa Teresa", precioUSD: 3 }, { nombre: "Santa Rosalía de Palermo", precioUSD: 3 },
    { nombre: "Chacao", precioUSD: 5 }, { nombre: "Leoncio Martínez", precioUSD: 6 },
    { nombre: "Petare", precioUSD: 6 }, { nombre: "La Dolorita", precioUSD: 6 },
    { nombre: "Fila de Mariches", precioUSD: 6 }, { nombre: "Caucagüita", precioUSD: 7 },
    { nombre: "El Cafetal", precioUSD: 6 }, { nombre: "Las Minas", precioUSD: 5 },
    { nombre: "Nuestra Señora del Rosario", precioUSD: 7 }, { nombre: "Sucre", precioUSD: 7 },
    { nombre: "El Junquito", precioUSD: 7 }
];

window.categoriasMenu = {
    "Entradas": [], "Sushi": [], "Rolls": ["Rolls Fríos de 10 piezas", "Rolls Tempura de 12 piezas"],
    "Tragos y bebidas": [], "Pokes": [], "Ensaladas": [],
    "Comida China": ["Arroz Chino", "Arroz Cantones", "Chopsuey", "Lomey", "Chow Mein", "Fideos de Arroz", "Tallarines Cantones", "Mariscos", "Foo Yong", "Sopas", "Entremeses"],
    "Comida Japonesa": ["Yakimeshi", "Yakisoba", "Pasta Udon", "Churrasco"],
    "Ofertas Especiales": [], "Para Niños": [], "Combo Ejecutivo": []
};

window.verificarNotificacionesForzadas = async function(sessionId) {
    try {
        const hoy = window.getFechaGMT4();
        hoy.setHours(0,0,0,0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        const hoyUTC = new Date(hoy.getTime() - (4 * 60 * 60 * 1000));
        const mananaUTC = new Date(manana.getTime() - (4 * 60 * 60 * 1000));
        const { data, error } = await window.supabaseClient
            .from('notificaciones')
            .select('*')
            .eq('session_id', sessionId)
            .gte('timestamp', hoyUTC.toISOString())
            .lt('timestamp', mananaUTC.toISOString())
            .order('timestamp', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error en verificación forzada:', error);
        return [];
    }
};

// ============================================
// FUNCIÓN PARA REPRODUCIR SONIDO DE NOTIFICACIÓN
// ============================================
window.reproducirSonidoNotificacion = function() {
    const audio = document.getElementById('notificationSound');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Error reproduciendo sonido:', e));
    }
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
};

// ============================================
// FUNCIÓN PARA ACTUALIZAR BADGE DE NOTIFICACIONES
// ============================================
window.actualizarBadgeNotificaciones = function(conteo) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (conteo > 0) {
            badge.textContent = conteo;
            badge.style.display = 'block';
            badge.classList.add('has-unread');
            badge.style.animation = 'none';
            badge.offsetHeight;
            badge.style.animation = 'vibrate .3s ease';
        } else {
            badge.style.display = 'none';
            badge.classList.remove('has-unread');
        }
    }
};

console.log('✅ supabase-config.js cargado correctamente');
console.log('   - VAPID Public Key:', window.VAPID_PUBLIC_KEY ? '✅' : '❌');
console.log('   - GMT-4 functions:', typeof window.formatearFechaGMT4 === 'function' ? '✅' : '❌');
console.log('   - Push functions:', typeof window.solicitarPermisoPush === 'function' ? '✅' : '❌');
console.log('   - Notificaciones: COMPLETAS');