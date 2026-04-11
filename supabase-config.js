// supabase-config.js - NCOMPLETAYCORREGIDA
window.SUPABASE_URL = 'https://iqwwoihiiyrtypyqzhgy.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm';

// NPARAINICIALIZARELCLIENTECONUNTOKENJWTOPCIONAL
window.inicializarSupabaseCliente = (jwtToken = null) => {
    if (!window.supabase) {
        console.error('❌ SupabaseSDKnocargado. VerificatunainternetoelscriptCDN.');
        returnnull;
    }
    constoptions = {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        },
        realtime: {
            heartbeatIntervalMs: 60000,
            reconnectAfterMs: (tries) => Math.min(tries * 2000, 30000)
        }
    };
    if (jwtToken) {
        options.global = { headers: { Authorization: `Bearer ${jwtToken}` } };
    }
    window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY,
        options
    );
    console.log(jwtToken ? 'ClienteSupabaseconJWT' : 'ClienteSupabaseanonimo');
    returnwindow.supabaseClient;
};

// Inicializarclientepordefecto (sintoken)
if (!window.supabaseClient && window.supabase) {
    window.supabaseClient = window.inicializarSupabaseCliente();
}

// ============================================
// NGLOBAL
// ============================================
window.configGlobal = {
    tasa_cambio: 400,
    tasa_efectiva: 400,
    aumento_diario: 0,
    aumento_acumulado: 0,
    aumento_activo: false,
    aumento_detenido: false,
    fecha_ultimo_aumento: null,
    ultima_actualizacion: null,
    admin_password: 'admin123',
    recovery_email: 'admin@sakisushi.com',
    alerta_stock_minimo: 5
};

// ============================================
// GLOBALMEJORADOMEJORADO
// ============================================
window.appCache = {
    stock: { data: {}, lastUpdate: 0, duration: 5000 },
    platillos: newMap(),
    pedidos: newMap(),
    notificaciones: newMap(),
    getStock: function(ingredienteId) {
        constahora = Date.now();
        if (ahora - this.stock.lastUpdate > this.stock.duration) {
            this.stock.data = {};
        }
        returnthis.stock.data[ingredienteId];
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
// FUNCIONESDEZONAHORARIAGMT-4
// ============================================
window.getFechaGMT4 = function() {
    constfecha = newDate();
    returnnewDate(fecha.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
};
window.formatearFechaGMT4 = function(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        letts = timestamp;
        if (typeofts === 'string' && !ts.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(ts)) ts += 'Z';
        constfecha = newDate(ts);
        constopts = z => fecha.toLocaleString('en-US', { timeZone: 'America/Caracas', ...z });
        constdia = String(opts({ day: 'numeric' })).padStart(2, '0');
        constmes = String(opts({ month: 'numeric' })).padStart(2, '0');
        constano = opts({ year: 'numeric' });
        consthhmm = opts({ hour: 'numeric', minute: '2-digit', hour12: true });
        return `${dia}/${mes}/${ano} ${hhmm}`.toLowerCase();
    } catch (e) {
        returntimestamp;
    }
};
window.formatearHora12GMT4 = function(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        letts = timestamp;
        if (typeofts === 'string' && !ts.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(ts)) ts += 'Z';
        constfecha = newDate(ts);
        returnfecha.toLocaleString('en-US', {
            timeZone: 'America/Caracas',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).toLowerCase();
    } catch (e) {
        returntimestamp;
    }
};
window.getTimestampISO_GMT4 = function() {
    constfecha = newDate();
    constfechaGMT4 = newDate(fecha.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    constfechaUTC = newDate(fechaGMT4.getTime() + (4 * 60 * 60 * 1000));
    returnfechaUTC.toISOString();
};
window.utcToGMT4 = function(utcTimestamp) {
    if (!utcTimestamp) returnnull;
    try {
        constfecha = newDate(utcTimestamp);
        returnnewDate(fecha.getTime() - (4 * 60 * 60 * 1000));
    } catch (e) {
        returnnewDate(utcTimestamp);
    }
};

// ============================================
// FUNCIONESDENOTIFICACIONESPUSH
// ============================================
window.VAPID_PUBLIC_KEY = 'BC6oJ4E+5pGIn4icpzCBLMi6/nk+1JJenrUA41uJrAs1ELraSw5ctvRAlh8sHVldqzBXUtEwEeFKBm0/hmuM9EY=';
functionurlBase64ToUint8Array(base64String) {
    constpadding = '='.repeat((4 - base64String.length % 4) % 4);
    constbase64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    constrawData = window.atob(base64);
    constoutputArray = newUint8Array(rawData.length);
    for (leti = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    returnoutputArray;
}
window.esBrave = function() {
    returnnavigator.brave && typeofnavigator.brave.isBrave === 'function';
};
window.solicitarPermisoPush = asyncfunction(sessionId) {
    if (!('Notification' inwindow)) return { success: false, error: 'no_support' };
    if (!('serviceWorker' innavigator)) return { success: false, error: 'no_sw' };
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return { success: false, error: 'no_https' };
    try {
        constpermiso = awaitNotification.requestPermission();
        if (permiso !== 'granted') return { success: false, error: 'denied' };
        
        constswUrl = '/SakiSushi0/sw.js';
        constregistration = awaitnavigator.serviceWorker.register(swUrl);
        awaitnavigator.serviceWorker.ready;
        
        letsubscription = awaitregistration.pushManager.getSubscription();
        if (!subscription) {
            subscription = awaitregistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY)
            });
        }
        
        constp256dh = btoa(String.fromCharCode.apply(null, newUint8Array(subscription.getKey('p256dh'))));
        constauth = btoa(String.fromCharCode.apply(null, newUint8Array(subscription.getKey('auth'))));
        
        const { error } = awaitwindow.supabaseClient
            .from('push_subscriptions')
            .upsert([{
                session_id: sessionId,
                endpoint: subscription.endpoint,
                p256dh: p256dh,
                auth: auth,
                user_agent: navigator.userAgent
            }], { onConflict: 'endpoint' });
            
        if (error) throwerror;
        return { success: true, subscription };
        
    } catch (error) {
        console.error('❌ Errorenpush:', error);
        return { success: false, error: error.message };
    }
};
window.tienePermisoPush = function() {
    returnNotification.permission === 'granted';
};

// ============================================
// FUNCIONESDECARGADECONFIGURACIÓN
// ============================================
window.cargarConfiguracion = asyncfunction() {
    try {
        const { data, error } = awaitwindow.supabaseClient
            .from('config')
            .select('*')
            .eq('id', 1)
            .single();
        if (error && error.code !== 'PGRST116') throwerror;
        if (data) window.configGlobal = { ...window.configGlobal, ...data };
        console.log('✅ ncargada. admin_password:', window.configGlobal.admin_password ? '**' : 'NOCARGADO');
        returnwindow.configGlobal;
    } catch (error) {
        console.error('Errorcargandoconfiguraci:', error);
        returnwindow.configGlobal;
    }
};

// ============================================
// FUNCIONESDESUBIDADEGENESYCOMPROBANTES
// ============================================
window.subirImagenPlatillo = asyncfunction(archivoImagen, carpetaAdicional = '') {
    try {
        if (!archivoImagen) return { success: false, error: 'NoseNose' };
        consttipoValido = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
        if (!tipoValido.includes(archivoImagen.type)) return { success: false, error: 'Tipodearchivonoválido' };
        constmaxSize = 5 * 1024 * 1024;
        if (archivoImagen.size > maxSize) return { success: false, error: 'Elarchivoesdemasiadogrande. Máximo 5MB' };
        consttimestamp = Date.now();
        constrandom = Math.random().toString(36).substring(2, 8);
        constextension = archivoImagen.name.split('.').pop();
        constnombreArchivo = `${timestamp}_${random}.${extension}`;
        construta = carpetaAdicional ? `${carpetaAdicional}/${nombreArchivo}` : nombreArchivo;
        const { data, error } = awaitwindow.supabaseClient.storage
            .from('imagenes-platillos')
            .upload(ruta, archivoImagen, { cacheControl: '3600', upsert: false, contentType: archivoImagen.type });
        if (error) throwerror;
        const {  urlData } = window.supabaseClient.storage.from('imagenes-platillos').getPublicUrl(ruta);
        return { success: true, path: ruta, url: urlData.publicUrl };
    } catch (error) {
        console.error('Errorsubiendoimagen:', error);
        return { success: false, error: error.message };
    }
};
window.eliminarImagenPlatillo = asyncfunction(urlImagen) {
    try {
        if (!urlImagen) return { success: true };
        constbucketName = 'imagenes-platillos';
        constbucketIndex = urlImagen.indexOf(`/public/${bucketName}/`);
        if (bucketIndex === -1) return { success: true };
        construtaRelativa = urlImagen.substring(bucketIndex + `/public/${bucketName}/`.length);
        if (!rutaRelativa) return { success: true };
        const { error } = awaitwindow.supabaseClient.storage.from(bucketName).remove([rutaRelativa]);
        if (error) throwerror;
        return { success: true };
    } catch (error) {
        console.error('Erroreliminandoimagen:', error);
        return { success: false, error: error.message };
    }
};
window.subirComprobante = asyncfunction(file, tipo, onProgress) {
    try {
        if (!file) thrownewError('Nosethrownew');
        consttipoValido = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
        if (!tipoValido.includes(file.type)) thrownewError('Tipodearchivonoválido. SoloimJPG, PNG, WEBPoGIF');
        constmaxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) thrownewError('Elarchivoesdemasiadogrande. Máximo 5MB');
        consttimestamp = Date.now();
        constnombreArchivo = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        construta = `${tipo}/${nombreArchivo}`;
        const { data, error } = awaitwindow.supabaseClient.storage
            .from('comprobantes')
            .upload(ruta, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (error) thrownewError(error.message || 'Erroralsubirelarchivo');
        const {  urlData } = window.supabaseClient.storage.from('comprobantes').getPublicUrl(ruta);
        if (onProgress) onProgress({ loaded: file.size, total: file.size, percent: 100 });
        return { success: true, url: urlData.publicUrl };
    } catch (error) {
        console.error('ErrorensubirComprobante:', error);
        return { success: false, error: error.message || 'Errordesconocidoalsubirelcomprobante' };
    }
};

// ============================================
// FUNCIONESDEFORMATOYVALIDACIÓN
// ============================================
window.formatBs = function(monto) {
    try {
        constvalor = Math.round((monto || 0) * 100) / 100;
        let [entero, decimal] = valor.toFixed(2).split('.');
        entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `Bs ${entero},${decimal}`;
    } catch (e) {
        return 'Bs ' + (monto || 0).toFixed(2);
    }
};
window.formatUSD = function(monto) {
    try {
        returnnewIntl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(monto);
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
    constsoloNumeros = telefono.replace(/\D/g, '');
    constregex = /^(0412|0414|0424|0416|0426|0418|0422|0212|0234|0241|0243|0246|0251|0254|0255|0257|0261|0264|0265|0268|0271|0273|0274|0275|0276|0281)\d{7}$/;
    returnregex.test(soloNumeros);
};
window.validarReferencia = function(ref) {
    constsoloNumeros = ref.replace(/\D/g, '');
    returnsoloNumeros.length === 6;
};
window.usdToBs = function(usd, tasa) {
    consttasaActual = tasa || window.configGlobal.tasa_efectiva || 400;
    returnusd * tasaActual;
};
window.bsToUsd = function(bs, tasa) {
    consttasaActual = tasa || window.configGlobal.tasa_efectiva || 400;
    returnbs / tasaActual;
};

// ============================================
// DATOSDEPARROQUIASYCATEGORÍAS
// ============================================
window.parroquiasDelivery = [
    { nombre: "SanBernardino", precioUSD: 2 }, { nombre: "SanJos", precioUSD: 2 },
    { nombre: "SanAgust", precioUSD: 2 }, { nombre: "Candelaria", precioUSD: 2 },
    { nombre: "SanJuan", precioUSD: 3 }, { nombre: "Catedral", precioUSD: 3 },
    { nombre: "SantaRosal", precioUSD: 3 }, { nombre: "ElRecreo", precioUSD: 4 },
    { nombre: "LaCandelaria", precioUSD: 2 }, { nombre: "SanPedro", precioUSD: 4 },
    { nombre: "ElPara", precioUSD: 4 }, { nombre: "LaVega", precioUSD: 4 },
    { nombre: "ElValle", precioUSD: 5 }, { nombre: "Coche", precioUSD: 5 },
    { nombre: "Caricuao", precioUSD: 7 }, { nombre: "Antímano", precioUSD: 7 },
    { nombre: "Macarao", precioUSD: 7 }, { nombre: "23deEnero", precioUSD: 4 },
    { nombre: "LaPastora", precioUSD: 3 }, { nombre: "Altagracia", precioUSD: 3 },
    { nombre: "SantaTeresa", precioUSD: 3 }, { nombre: "SantaRosaldePalermo", precioUSD: 3 },
    { nombre: "Chacao", precioUSD: 5 }, { nombre: "LeoncioMart", precioUSD: 6 },
    { nombre: "Petare", precioUSD: 6 }, { nombre: "LaDolorita", precioUSD: 6 },
    { nombre: "FiladeMariches", precioUSD: 6 }, { nombre: "Caucagüita", precioUSD: 7 },
    { nombre: "ElCafetal", precioUSD: 6 }, { nombre: "LasMinas", precioUSD: 5 },
    { nombre: "NuestraSedelRosario", precioUSD: 7 }, { nombre: "Sucre", precioUSD: 7 },
    { nombre: "ElJunquito", precioUSD: 7 }
];
window.categoriasMenu = {
    "entradas": [],
    "sushi": [],
    "rolls": ["RollsFrde 10piezas", "RollsTempurade 12piezas"],
    "tragos": [],
    "pokes": [],
    "ensaladas": [],
    "china": ["ArrozChino", "ArrozCantones", "Chopsuey", "Lomey", "ChowMein", "FideosdeArroz", "TallarinesCantones", "Mariscos", "FooYong", "Sopas", "Entremeses"],
    "japonesa": ["Yakimeshi", "Yakisoba", "PastaUdon", "Churrasco"],
    "ofertas": [],
    "ninos": [],
    "ejecutivo": []
};
window.categoriasMenuLabels = {
    "entradas": "Entradas", "sushi": "Sushi", "rolls": "Rolls",
    "tragos": "Tragosybebidas", "pokes": "Pokes", "ensaladas": "Ensaladas",
    "china": "ComidaChina", "japonesa": "ComidaJaponesa",
    "ofertas": "OfertasEspeciales", "ninos": "ParaNi", "ejecutivo": "ComboEjecutivo"
};

// ============================================
// FUNCIONESDENOTIFICACIONES (SONIDOYBADGE)
// ============================================
window.reproducirSonidoNotificacion = function() {
    constaudio = document.getElementById('notificationSound');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Errorreproduciendosonido:', e));
    }
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
};
window.actualizarBadgeNotificaciones = function(conteo) {
    constbadge = document.getElementById('notificationBadge');
    if (badge) {
        if (conteo > 0) {
            badge.textContent = conteo;
            badge.style.display = 'block';
            badge.classList.add('has-unread');
            badge.style.animation = 'none';
            badge.offsetHeight;
            badge.style.animation = 'vibrate .3sease';
        } else {
            badge.style.display = 'none';
            badge.classList.remove('has-unread');
        }
    }
};

// ============================================
// NAUXILIARPARAWIFI (cliente)
// ============================================
window._mostrarPantallaWifi = function(wifiSsid, wifiPwd) {
    document.body.innerHTML = `<divstyle="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:2rem;text-align:center;font-family:Roboto,sans-serif">
        <divstyle="font-size:3rem;margin-bottom:1rem">📶</div>
        <h2style="color:#FF9800;font-size:1.4rem;margin-bottom:.75rem">ctatealWiFidelrestaurante</h2>
        <pstyle="font-size:1rem;opacity:.85;margin-bottom:1.5rem">Paraaccederalmennecesitasestarconectadoa:</p>
        <divstyle="background:rgba(255,255,255,.1);border-radius:12px;padding:1.2rem 2rem;margin-bottom:2rem;border:1pxsolidrgba(255,255,255,.2)">
            <divstyle="font-size:1.3rem;font-weight:700;color:#fff;letter-spacing:1px">${wifiSsid}</div>
            ${wifiPwd ? `<divstyle="font-size:.85rem;opacity:.6;margin-top:.3rem">Contraseña: ${wifiPwd}</div>` : ''}
        </div>
        <pstyle="font-size:.85rem;opacity:.65;margin-bottom:2rem">VeaAjustes → WiFi, ctatealaredyluegotoca:</p>
        <buttononclick="window.location.reload()" style="background:linear-gradient(135deg,#D32F2F,#B71C1C);color:#fff;border:none;padding:.9rem 2rem;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;letter-spacing:.5px;margin-bottom:1rem">🔄 Yameconect — AbrirMen</button>
        <pstyle="font-size:.75rem;opacity:.4">OescaneaelQRnuevamente</p>
    </div>`;
};
console.log('✅ supabase-config.jscargadocorrectamente');
console.log('   - Anonkey:', window.SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('   - VAPIDPublicKey:', window.VAPID_PUBLIC_KEY ? '✅' : '❌');
console.log('   - GMT-4functions:', typeofwindow.formatearFechaGMT4 === 'function' ? '✅' : '❌');
