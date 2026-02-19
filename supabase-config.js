// supabase-config.js
// Configuración compartida para todos los paneles

// Inicializar cliente de Supabase
const SUPABASE_URL = 'https://iqwwoihiiyrtypyqzhgy.supabase.co'; // Reemplazar con tu URL
const SUPABASE_ANON_KEY = 'sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm'; // Reemplazar con tu clave anónima

// Crear cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales de configuración
let configGlobal = {
    tasa_cambio: 400,
    tasa_efectiva: 400,
    aumento_diario: 0,
    aumento_acumulado: 0,
    aumento_activo: false,
    aumento_detenido: false,
    fecha_ultimo_aumento: null,
    ultima_actualizacion: null
};

// Función para cargar configuración global
async function cargarConfiguracion() {
    try {
        const { data, error } = await supabase
            .from('config')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error) throw error;
        if (data) {
            configGlobal = { ...configGlobal, ...data };
        }
        return configGlobal;
    } catch (error) {
        console.error('Error cargando configuración:', error);
        return configGlobal;
    }
}

// Función para formatear moneda en bolívares
function formatBs(monto) {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(monto).replace('VES', 'Bs.');
}

// Función para formatear moneda en dólares
function formatUSD(monto) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(monto);
}

// Función para generar ID único
function generarId(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Función para validar teléfono venezolano
function validarTelefono(telefono) {
    const regex = /^(0412|0414|0424|0416|0426|0418|0422|0212|0234|0241|0243|0246|0251|0254|0255|0257|0261|0264|0265|0268|0271|0273|0274|0275|0276|0281)\d{7}$/;
    return regex.test(telefono.replace(/\D/g, ''));
}

// Función para validar referencia de 6 dígitos
function validarReferencia(ref) {
    const regex = /^\d{6}$/;
    return regex.test(ref);
}

// Función para convertir dólares a bolívares
function usdToBs(usd, tasa = configGlobal.tasa_efectiva) {
    return usd * tasa;
}

// Función para convertir bolívares a dólares
function bsToUsd(bs, tasa = configGlobal.tasa_efectiva) {
    return bs / tasa;
}

// Parroquias con precios de delivery
const parroquiasDelivery = [
    { nombre: "San Bernardino", precioUSD: 2 },
    { nombre: "San José", precioUSD: 2 },
    { nombre: "San Agustín", precioUSD: 2 },
    { nombre: "Candelaria", precioUSD: 2 },
    { nombre: "San Juan", precioUSD: 3 },
    { nombre: "Catedral", precioUSD: 3 },
    { nombre: "Santa Rosalía", precioUSD: 3 },
    { nombre: "El Recreo", precioUSD: 4 },
    { nombre: "La Candelaria", precioUSD: 2 },
    { nombre: "San Pedro", precioUSD: 4 },
    { nombre: "El Paraíso", precioUSD: 4 },
    { nombre: "La Vega", precioUSD: 4 },
    { nombre: "El Valle", precioUSD: 5 },
    { nombre: "Coche", precioUSD: 5 },
    { nombre: "Caricuao", precioUSD: 7 },
    { nombre: "Antímano", precioUSD: 7 },
    { nombre: "Macarao", precioUSD: 7 },
    { nombre: "23 de Enero", precioUSD: 4 },
    { nombre: "La Pastora", precioUSD: 3 },
    { nombre: "Altagracia", precioUSD: 3 },
    { nombre: "Santa Teresa", precioUSD: 3 },
    { nombre: "Santa Rosalía de Palermo", precioUSD: 3 },
    { nombre: "Chacao", precioUSD: 5 },
    { nombre: "Leoncio Martínez", precioUSD: 6 },
    { nombre: "Petare", precioUSD: 6 },
    { nombre: "La Dolorita", precioUSD: 6 },
    { nombre: "Fila de Mariches", precioUSD: 6 },
    { nombre: "Caucagüita", precioUSD: 7 },
    { nombre: "El Cafetal", precioUSD: 6 },
    { nombre: "Las Minas", precioUSD: 5 },
    { nombre: "Nuestra Señora del Rosario", precioUSD: 7 },
    { nombre: "Sucre", precioUSD: 7 },
    { nombre: "El Junquito", precioUSD: 7 }
];

// Categorías y subcategorías
const categoriasMenu = {
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