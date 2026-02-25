// supabase-config.js
window.SUPABASE_URL = 'https://iqwwoihiiyrtypyqzhgy.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm';

if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
    );
    console.log('✅ Cliente Supabase inicializado');
}

// Configuración global (se actualiza con cargarConfiguracion)
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

// Cargar configuración desde la BD
window.cargarConfiguracion = async function() {
    try {
        const { data, error } = await window.supabaseClient
            .from('config')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;
        if (data) {
            window.configGlobal = { ...window.configGlobal, ...data };
        }
        return window.configGlobal;
    } catch (error) {
        console.error('Error cargando configuración:', error);
        return window.configGlobal;
    }
};

// Subir imagen de platillo
window.subirImagenPlatillo = async function(archivoImagen, carpetaAdicional = '') {
    try {
        if (!archivoImagen) return { success: false, error: 'No se proporcionó archivo' };

        const tipoValido = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
        if (!tipoValido.includes(archivoImagen.type)) {
            return { success: false, error: 'Tipo de archivo no válido' };
        }

        const maxSize = 5 * 1024 * 1024;
        if (archivoImagen.size > maxSize) {
            return { success: false, error: 'El archivo es demasiado grande. Máximo 5MB' };
        }

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = archivoImagen.name.split('.').pop();
        const nombreArchivo = `${timestamp}_${random}.${extension}`;
        const ruta = carpetaAdicional ? `${carpetaAdicional}/${nombreArchivo}` : nombreArchivo;

        const { data, error } = await window.supabaseClient.storage
            .from('imagenes-platillos')
            .upload(ruta, archivoImagen, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: urlData } = window.supabaseClient.storage
            .from('imagenes-platillos')
            .getPublicUrl(ruta);

        return { success: true, path: ruta, url: urlData.publicUrl };
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        return { success: false, error: error.message };
    }
};

// Eliminar imagen de platillo
window.eliminarImagenPlatillo = async function(urlImagen) {
    try {
        if (!urlImagen) return { success: true };

        const bucketName = 'imagenes-platillos';
        const bucketIndex = urlImagen.indexOf(`/public/${bucketName}/`);

        if (bucketIndex === -1) return { success: true };

        const rutaRelativa = urlImagen.substring(bucketIndex + `/public/${bucketName}/`.length);
        if (!rutaRelativa) return { success: true };

        const { error } = await window.supabaseClient.storage
            .from(bucketName)
            .remove([rutaRelativa]);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error eliminando imagen:', error);
        return { success: false, error: error.message };
    }
};

// Subir comprobante (con soporte para progreso)
window.subirComprobante = async function(file, tipo, onProgress) {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const nombreArchivo = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const ruta = `${tipo}/${nombreArchivo}`;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${window.SUPABASE_URL}/storage/v1/object/comprobantes/${ruta}`);
        xhr.setRequestHeader('Authorization', `Bearer ${window.SUPABASE_ANON_KEY}`);

        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress({ loaded: e.loaded, total: e.total, percent: percentComplete });
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const publicUrl = `${window.SUPABASE_URL}/storage/v1/object/public/comprobantes/${ruta}`;
                resolve({ success: true, url: publicUrl });
            } else {
                reject({ success: false, error: xhr.responseText });
            }
        };

        xhr.onerror = () => reject({ success: false, error: 'Error de red' });

        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
    });
};

// Formateadores
window.formatBs = function(monto) {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(monto).replace('VES', 'Bs.');
};

window.formatUSD = function(monto) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(monto);
};

// Generador de IDs
window.generarId = function(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Validaciones
window.validarTelefono = function(telefono) {
    const soloNumeros = telefono.replace(/\D/g, '');
    const regex = /^(0412|0414|0424|0416|0426|0418|0422|0212|0234|0241|0243|0246|0251|0254|0255|0257|0261|0264|0265|0268|0271|0273|0274|0275|0276|0281)\d{7}$/;
    return regex.test(soloNumeros);
};

window.validarReferencia = function(ref) {
    const soloNumeros = ref.replace(/\D/g, '');
    return soloNumeros.length === 6;
};

window.formatearReferenciaInput = function(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value.length > 1) input.value = input.value.charAt(0);
};

// Conversores de moneda
window.usdToBs = function(usd, tasa) {
    const tasaActual = tasa || window.configGlobal.tasa_efectiva || 400;
    return usd * tasaActual;
};

window.bsToUsd = function(bs, tasa) {
    const tasaActual = tasa || window.configGlobal.tasa_efectiva || 400;
    return bs / tasaActual;
};

// Cache de stock (compartido)
window.stockCache = {
    data: {},
    lastUpdate: 0,
    duration: 5000,

    get: function(ingredienteId) {
        const ahora = Date.now();
        if (ahora - this.lastUpdate > this.duration) this.clear();
        return this.data[ingredienteId];
    },

    set: function(ingredienteId, valor) {
        this.data[ingredienteId] = valor;
        this.lastUpdate = Date.now();
    },

    clear: function() {
        this.data = {};
        this.lastUpdate = Date.now();
    },

    invalidate: function() {
        this.data = {};
        this.lastUpdate = 0;
    }
};

// Lista de parroquias con precios
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

// Categorías predefinidas
window.categoriasMenu = {
    "Entradas": [],
    "Sushi": [],
    "Rolls": ["Rolls Fríos de 10 piezas", "Rolls Tempura de 12 piezas"],
    "Tragos y bebidas": [],
    "Pokes": [],
    "Ensaladas": [],
    "Comida China": ["Arroz Chino", "Arroz Cantones", "Chopsuey", "Lomey", "Chow Mein", "Fideos de Arroz", "Tallarines Cantones", "Mariscos", "Foo Yong", "Sopas", "Entremeses"],
    "Comida Japonesa": ["Yakimeshi", "Yakisoba", "Pasta Udon", "Churrasco"],
    "Ofertas Especiales": [],
    "Para Niños": [],
    "Combo Ejecutivo": []
};

console.log('✅ supabase-config.js cargado correctamente');