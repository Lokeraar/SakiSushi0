// supabase-config.js - VERSIÓN FINAL CON TODAS LAS FUNCIONALIDADES
window.SUPABASE_URL = 'https://iqwwoihiiyrtypyqzhgy.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm';

if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
    );
    console.log('📌 Cliente Supabase inicializado');
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
// CACHÉ GLOBAL
// ============================================
window.appCache = {
    stock: { data: {}, lastUpdate: 0, duration: 5000 },
    platillos: new Map(),
    pedidos: new Map(),
    getStock: function(id) {
        const ahora = Date.now();
        if (ahora - this.stock.lastUpdate > this.stock.duration) this.stock.data = {};
        return this.stock.data[id];
    },
    setStock: function(id, v) {
        this.stock.data[id] = v;
        this.stock.lastUpdate = Date.now();
    },
    invalidateStock: function() {
        this.stock.data = {};
        this.stock.lastUpdate = 0;
        this.platillos.clear();
    }
};
window.stockCache = window.appCache;

// ============================================
// FUNCIONES GMT-4
// ============================================
window.getFechaGMT4 = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }));
window.formatearFechaGMT4 = (t) => t ? new Date(t).toLocaleString('es-VE', { day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit' }) : 'N/A';
window.formatearHora12GMT4 = (t) => t ? new Date(t).toLocaleTimeString('es-VE', { hour:'numeric',minute:'2-digit',hour12:true }) : 'N/A';
window.usdToBs = (u,t) => u * (t || window.configGlobal.tasa_efectiva || 400);
window.bsToUsd = (b,t) => b / (t || window.configGlobal.tasa_efectiva || 400);

// ============================================
// NOTIFICACIONES PUSH (VAPID)
// ============================================
window.VAPID_PUBLIC_KEY = 'BC6oJ4E+5pGIn4icpzCBLMi6/nk+1JJenrUA41uJrAs1ELraSw5ctvRAlh8sHVldqzBXUtEwEeFKBm0/hmuM9EY=';
function urlBase64ToUint8Array(b){
    const padding='='.repeat((4-b.length%4)%4);
    const base64=(b+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=window.atob(base64);
    const output=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) output[i]=raw.charCodeAt(i);
    return output;
}
window.esBrave = ()=> navigator.brave && typeof navigator.brave.isBrave==='function';
window.solicitarPermisoPush = async function(sid){
    if(!('Notification'in window)) return {success:false,error:'no_support'};
    if(!('serviceWorker'in navigator)) return {success:false,error:'no_sw'};
    if(location.protocol!=='https:' && location.hostname!=='localhost') return {success:false,error:'no_https'};
    try{
        if(await Notification.requestPermission()!=='granted') return {success:false,error:'denied'};
        const reg = await navigator.serviceWorker.register('/SakiSushi0/sw.js');
        await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if(!sub){
            sub = await reg.pushManager.subscribe({
                userVisibleOnly:true,
                applicationServerKey:urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY)
            });
        }
        const p256dh = btoa(String.fromCharCode.apply(null,new Uint8Array(sub.getKey('p256dh'))));
        const auth = btoa(String.fromCharCode.apply(null,new Uint8Array(sub.getKey('auth'))));
        const {error} = await window.supabaseClient.from('push_subscriptions').upsert([{
            session_id:sid, endpoint:sub.endpoint, p256dh, auth, user_agent:navigator.userAgent
        }],{onConflict:'endpoint'});
        if(error) throw error;
        return {success:true,subscription:sub};
    }catch(e){ return {success:false,error:e.message}; }
};
window.solicitarPermisoPushUI = async function(){
    const sid = localStorage.getItem('saki_session_id');
    if(!sid) return;
    if(window.esBrave()) window.mostrarToast?.('🦁 Brave: haz clic en el león y permite notificaciones','warning');
    const r = await window.solicitarPermisoPush(sid);
    const btn = document.getElementById('pushPermissionBtn');
    if(!btn) return;
    if(r.success){
        btn.classList.add('active'); btn.innerHTML='<i class="fas fa-bell"></i>';
        btn.setAttribute('data-tooltip','Notificaciones activadas');
        window.mostrarToast?.('✅ Notificaciones activadas','success');
    }else{
        btn.classList.remove('active'); btn.innerHTML='<i class="fas fa-bell"></i>';
        btn.setAttribute('data-tooltip','Activar notificaciones');
        if(r.error!=='denied') window.mostrarToast?.('❌ No se pudieron activar','error');
    }
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
window.cargarConfiguracion = async()=>{
    try{
        const {data,error}=await window.supabaseClient.from('config').select('*').eq('id',1).single();
        if(error) throw error;
        if(data) window.configGlobal={...window.configGlobal,...data};
        return window.configGlobal;
    }catch(e){ return window.configGlobal; }
};
window.subirImagenPlatillo = async(file,carpeta='')=>{
    if(!file) return {success:false,error:'No file'};
    const tipos=['image/jpeg','image/png','image/jpg','image/webp','image/gif'];
    if(!tipos.includes(file.type)) return {success:false,error:'Tipo inválido'};
    if(file.size>5*1024*1024) return {success:false,error:'Max 5MB'};
    const nombre=`${Date.now()}_${Math.random().toString(36).substring(2,8)}.${file.name.split('.').pop()}`;
    const ruta = carpeta ? `${carpeta}/${nombre}` : nombre;
    const {error}=await window.supabaseClient.storage.from('imagenes-platillos').upload(ruta,file);
    if(error) return {success:false,error:error.message};
    const {data:{publicUrl}}=window.supabaseClient.storage.from('imagenes-platillos').getPublicUrl(ruta);
    return {success:true,url:publicUrl};
};
window.subirComprobante = async(file,tipo)=>{
    if(!file) return {success:false,error:'No file'};
    const tipos=['image/jpeg','image/png','image/jpg','image/webp','image/gif'];
    if(!tipos.includes(file.type)) return {success:false,error:'Tipo inválido'};
    if(file.size>5*1024*1024) return {success:false,error:'Max 5MB'};
    const nombre=`${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g,'_')}`;
    const {error}=await window.supabaseClient.storage.from('comprobantes').upload(`${tipo}/${nombre}`,file);
    if(error) return {success:false,error:error.message};
    const {data:{publicUrl}}=window.supabaseClient.storage.from('comprobantes').getPublicUrl(`${tipo}/${nombre}`);
    return {success:true,url:publicUrl};
};
window.formatBs = m=>{
    try{
        const v = Math.round((m||0)*100)/100;
        let [e,d]=v.toFixed(2).split('.');
        e=e.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
        return `Bs ${e},${d}`;
    }catch{ return 'Bs '+(m||0).toFixed(2); }
};
window.formatUSD = m=> new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(m);
window.generarId = p=> p + (crypto.randomUUID ? crypto.randomUUID() : Date.now()+'_'+Math.random().toString(36).substring(2,15));
window.validarTelefono = t=> /^(0412|0414|0424|0416|0426|0418|0422|0212|0234|0241|0243|0246|0251|0254|0255|0257|0261|0264|0265|0268|0271|0273|0274|0275|0276|0281)\d{7}$/.test(t.replace(/\D/g,''));
window.validarReferencia = r=> r.replace(/\D/g,'').length===6;

window.parroquiasDelivery = [
    {nombre:"San Bernardino",precioUSD:2},{nombre:"San José",precioUSD:2},{nombre:"San Agustín",precioUSD:2},
    {nombre:"Candelaria",precioUSD:2},{nombre:"San Juan",precioUSD:3},{nombre:"Catedral",precioUSD:3},
    {nombre:"Santa Rosalía",precioUSD:3},{nombre:"El Recreo",precioUSD:4},{nombre:"La Candelaria",precioUSD:2},
    {nombre:"San Pedro",precioUSD:4},{nombre:"El Paraíso",precioUSD:4},{nombre:"La Vega",precioUSD:4},
    {nombre:"El Valle",precioUSD:5},{nombre:"Coche",precioUSD:5},{nombre:"Caricuao",precioUSD:7},
    {nombre:"Antímano",precioUSD:7},{nombre:"Macarao",precioUSD:7},{nombre:"23 de Enero",precioUSD:4},
    {nombre:"La Pastora",precioUSD:3},{nombre:"Altagracia",precioUSD:3},{nombre:"Santa Teresa",precioUSD:3},
    {nombre:"Santa Rosalía de Palermo",precioUSD:3},{nombre:"Chacao",precioUSD:5},{nombre:"Leoncio Martínez",precioUSD:6},
    {nombre:"Petare",precioUSD:6},{nombre:"La Dolorita",precioUSD:6},{nombre:"Fila de Mariches",precioUSD:6},
    {nombre:"Caucagüita",precioUSD:7},{nombre:"El Cafetal",precioUSD:6},{nombre:"Las Minas",precioUSD:5},
    {nombre:"Nuestra Señora del Rosario",precioUSD:7},{nombre:"Sucre",precioUSD:7},{nombre:"El Junquito",precioUSD:7}
];
window.categoriasMenu = {
    "Entradas":[],"Sushi":[],"Rolls":["Rolls Fríos de 10 piezas","Rolls Tempura de 12 piezas"],
    "Tragos y bebidas":[],"Pokes":[],"Ensaladas":[],
    "Comida China":["Arroz Chino","Arroz Cantones","Chopsuey","Lomey","Chow Mein","Fideos de Arroz","Tallarines Cantones","Mariscos","Foo Yong","Sopas","Entremeses"],
    "Comida Japonesa":["Yakimeshi","Yakisoba","Pasta Udon","Churrasco"],
    "Ofertas Especiales":[],"Para Niños":[],"Combo Ejecutivo":[]
};

console.log('✅ supabase-config.js cargado con todas las funcionalidades');
