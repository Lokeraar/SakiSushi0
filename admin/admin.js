// admin.js - Versión con carga dinámica de Alpine
import { supabase } from './services/supabaseClient.js';

window.formatBs = function(monto) {
  try {
    const valor = Math.round((monto || 0) * 100) / 100;
    let [entero, decimal] = valor.toFixed(2).split('.');
    entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Bs ${entero},${decimal}`;
  } catch {
    return 'Bs ' + (monto || 0).toFixed(2);
  }
};

window.formatUSD = function(monto) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(monto);
  } catch {
    return '$ ' + (monto || 0).toFixed(2);
  }
};

window.usdToBs = function(usd) {
  const tasa = (typeof window !== 'undefined' && window.configGlobal?.tasa_efectiva) || 400;
  return usd * tasa;
};

window.showToast = function(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

window.supabaseClient = supabase;

// Componentes placeholder (todos con las propiedades necesarias)
window.dashboardComponent = function() {
  return {
    tasaBase: 400, aumentoDiario: 0, aumentoActivo: false, aumentoSemanal: false,
    aumentoDesde: '', aumentoHasta: '', aumentoIndefinido: false, aumentoAcumulado: 0,
    tasaEfectiva: 400, loading: false, ventasHoy: { usd: 0, bs: 0 },
    deliverysHoy: 0, propinasHoy: 0, stockCritico: [], pedidosRecientes: [], productosActivos: 0,
    init() { console.log('Dashboard iniciado'); },
    recalcularTasaEfectiva() {}, guardarConfiguracion() {}, abrirDetalleVentas() {},
    abrirDetallePropinas() {}, abrirDetalleDeliverys() {}, irAIngrediente() {}, abrirDetallePedido() {},
    formatBs: window.formatBs, formatUSD: window.formatUSD, usdToBs: window.usdToBs
  };
};

window.inventoryComponent = function() {
  return {
    search: '', inventoryItems: [], selectedIngredient: null,
    form: { id: null, nombre: '', stock: 0, agregar: 0, unidad: 'unidades', minimo: 0, precio_costo: 0, precio_unitario: 0 },
    editMode: false, showForm: false, isLoading: false,
    init() { console.log('Inventory iniciado'); },
    filteredItems() { return []; }, selectIngredient() {}, updateStock() {}, newIngredient() {},
    saveIngredient() {}, deleteIngredient() {}, closeForm() {}, debouncedSearch() {},
    formatBs: window.formatBs, formatUSD: window.formatUSD, usdToBs: window.usdToBs
  };
};

window.menuComponent = function() {
  return {
    search: '', menuItems: [],
    form: { id: null, nombre: '', categoria: '', subcategoria: '', precio: 0, descripcion: '', imagen: '', disponible: true },
    editMode: false, showForm: false, isLoading: false,
    categorias: ['Entradas', 'Sushi', 'Rolls', 'Tragos y bebidas', 'Pokes', 'Ensaladas', 'Comida China', 'Comida Japonesa', 'Ofertas Especiales', 'Para Niños', 'Combo Ejecutivo'],
    subcategorias: { 'Rolls': ['Rolls Fríos de 10 piezas', 'Rolls Tempura de 12 piezas'], 'Comida China': ['Arroz Chino', 'Arroz Cantones', 'Chopsuey', 'Lomey', 'Chow Mein', 'Fideos de Arroz', 'Tallarines Cantones', 'Mariscos', 'Foo Yong', 'Sopas', 'Entremeses'], 'Comida Japonesa': ['Yakimeshi', 'Yakisoba', 'Pasta Udon', 'Churrasco'] },
    init() { console.log('Menu iniciado'); },
    filteredItems() { return []; }, getAvailableSubcategorias() { return []; }, savePlatillo() {},
    deletePlatillo() {}, toggleDisponible() {}, editPlatillo() {}, newPlatillo() {}, closeForm() {}, debouncedSearch() {},
    formatBs: window.formatBs, formatUSD: window.formatUSD, usdToBs: window.usdToBs
  };
};

window.usuariosComponent = function() {
  return {
    search: '', usuarios: [], form: { id: null, nombre: '', username: '', password: '123456', activo: true },
    editMode: false, showForm: false, isLoading: false,
    init() { console.log('Usuarios iniciado'); },
    filteredUsuarios() { return []; }, nuevoUsuario() {}, editarUsuario() {}, guardarUsuario() {},
    toggleActivo() {}, eliminarUsuario() {}, closeForm() {}, debouncedSearch() {}
  };
};

window.deliverysComponent = function() {
  return {
    search: '', newNombre: '', deliverys: [], acumulado: {}, showForm: false, form: { id: null, nombre: '', activo: true }, editMode: false,
    init() { console.log('Deliverys iniciado'); },
    filteredDeliverys() { return []; }, agregarDelivery() {}, editarDelivery() {}, guardarDelivery() {},
    toggleActivo() {}, eliminarDelivery() {}, registrarPago() {}, closeForm() {}, debouncedSearch() {},
    formatBs: window.formatBs
  };
};

window.mesonerosComponent = function() {
  return {
    search: '', newNombre: '', mesoneros: [], propinas: [], totalPropinas: 0, cantidadPropinas: 0, promedioPropinas: 0,
    showForm: false, form: { id: null, nombre: '', activo: true }, editMode: false,
    init() { console.log('Mesoneros iniciado'); },
    filteredMesoneros() { return []; }, agregarMesonero() {}, editarMesonero() {}, guardarMesonero() {},
    toggleActivo() {}, eliminarMesonero() {}, pagarPropinas() {}, closeForm() {}, debouncedSearch() {},
    formatBs: window.formatBs
  };
};

window.configComponent = function() {
  return {
    currentPassword: '', newPassword: '', confirmPassword: '', recoveryEmail: '', isLoading: false,
    init() { console.log('Config iniciado'); },
    cambiarPassword() {}, guardarRecoveryEmail() {}
  };
};

window.qrComponent = function() {
  return {
    qrs: [], nuevaMesa: '', wifiSsid: '', wifiPassword: '', qrModalVisible: false, qrModalUrl: '', qrModalNombre: '',
    init() { console.log('QR iniciado'); },
    cargarQRs() {}, generarQR() {}, eliminarQR() {}, abrirQR() {}, cerrarModal() {}, guardarWifi() {}
  };
};

window.reportesComponent = function() {
  return {
    desde: '', hasta: '', pedidos: [], ventasDia: { usd: 0, bs: 0 }, ventasSemana: { usd: 0, bs: 0 },
    ticketPromedio: { usd: 0, bs: 0 }, platilloTop: '-', charts: {}, isLoading: false,
    init() { console.log('Reportes iniciado'); },
    cargarReportes() {}, calcularEstadisticas() {}, actualizarGraficos() {}, actualizarTablaVentas() {},
    formatBs: window.formatBs, formatUSD: window.formatUSD, usdToBs: window.usdToBs
  };
};

// APP PRINCIPAL
window.app = function() {
  return {
    loggedIn: false,
    loginPassword: '',
    activeTab: 'dashboard',
    tabs: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'inventario', label: 'Inventario' },
      { id: 'menu', label: 'Menú y Precios' },
      { id: 'usuarios', label: 'Usuarios' },
      { id: 'deliverys', label: 'Deliverys' },
      { id: 'mesoneros', label: 'Mesoneros' },
      { id: 'configuracion', label: 'Configuración' },
      { id: 'qr', label: 'Códigos QR' },
      { id: 'reportes', label: 'Reportes' }
    ],
    themeIcon: '<i class="fas fa-sun"></i>',
    stockCriticoTags: '',
    
    init() {
      console.log('🔧 App init ejecutado');
      this.checkSession();
      this.initTheme();
      this.loadStockCriticoTags();
    },
    
    checkSession() {
      const token = sessionStorage.getItem('admin_jwt_token');
      if (token && sessionStorage.getItem('admin_user')) {
        this.loggedIn = true;
        console.log('✅ Sesión activa');
        document.getElementById('loginContainer').style.display = 'none';
        document.querySelector('.panel-container').style.display = 'flex';
      } else {
        console.log('⚠️ Sin sesión');
      }
    },
    
    async login() {
  console.log('🔑 1. Login iniciado con password:', this.loginPassword);
  console.log('🔑 2. this.loggedIn antes:', this.loggedIn);
  
  if (!this.loginPassword) {
    console.log('❌ 2. Contraseña vacía');
    window.showToast('Ingrese la contraseña', 'error');
    return;
  }
  
  try {
    console.log('📡 3. Haciendo fetch a la función login...');
    const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: this.loginPassword })
    });
    
    console.log('📡 4. Response status:', response.status);
    console.log('📡 5. Response ok:', response.ok);
    
    const data = await response.json();
    console.log('📡 6. Datos recibidos:', data);
    
    if (!response.ok) {
      console.log('❌ 7. Response no ok:', response.status);
      throw new Error(data.error || `Error HTTP ${response.status}`);
    }
    
    if (!data.success) {
      console.log('❌ 8. data.success es false:', data.error);
      throw new Error(data.error || 'Contraseña incorrecta');
    }
    
    if (!data.user) {
      console.log('❌ 9. No hay data.user');
      throw new Error('No se recibieron datos del usuario');
    }
    
    if (data.user.rol !== 'admin') {
      console.log('❌ 10. Rol incorrecto:', data.user.rol);
      throw new Error('No eres administrador. Rol: ' + data.user.rol);
    }
    
    console.log('✅ 11. Guardando token en sessionStorage...');
    sessionStorage.setItem('admin_jwt_token', data.token);
    sessionStorage.setItem('admin_user', JSON.stringify(data.user));
    
    console.log('✅ 12. Actualizando estado loggedIn...');
    this.loggedIn = true;
    console.log('✅ 12b. this.loggedIn ahora es:', this.loggedIn);
    
    console.log('✅ 13. Mostrando toast...');
    window.showToast('✅ Bienvenido Administrador', 'success');
    
    console.log('✅ 14. Ocultando login y mostrando panel...');
    const loginContainer = document.getElementById('loginContainer');
    const panelContainer = document.querySelector('.panel-container');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (panelContainer) panelContainer.style.display = 'flex';
    
    console.log('✅ 15. Login completado exitosamente');
    
  } catch (error) {
    console.error('❌ ERROR EN LOGIN:', error);
    console.error('❌ Mensaje de error:', error.message);
    window.showToast('❌ Error: ' + error.message, 'error');
  }
},
    
    logout() {
      sessionStorage.removeItem('admin_jwt_token');
      sessionStorage.removeItem('admin_user');
      this.loggedIn = false;
      window.showToast('Sesión cerrada', 'info');
      document.getElementById('loginContainer').style.display = 'flex';
      document.querySelector('.panel-container').style.display = 'none';
    },
    
    initTheme() {
      const saved = localStorage.getItem('saki_admin_theme');
      if (saved === 'dark') {
        document.documentElement.classList.add('dark-theme');
        this.themeIcon = '<i class="fas fa-moon"></i>';
      }
    },
    
    toggleTheme() {
      document.documentElement.classList.toggle('dark-theme');
      const isDark = document.documentElement.classList.contains('dark-theme');
      this.themeIcon = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
      localStorage.setItem('saki_admin_theme', isDark ? 'dark' : 'light');
    },
    
    scrollTabs(dir) {
      const container = this.$refs.tabsContainer;
      if (container) container.scrollBy({ left: dir * 180, behavior: 'smooth' });
    },
    
    openMesas() {
      const modal = document.getElementById('adminMesaModal');
      if (modal) modal.classList.add('active');
    },
    
    async loadStockCriticoTags() {
      try {
        const { data, error } = await supabase.from('inventario').select('id, nombre, stock, reservado, minimo');
        if (error) throw error;
        const criticos = (data || []).filter(i => (i.stock - i.reservado) <= (i.minimo || 0) && i.minimo > 0);
        this.stockCriticoTags = criticos.map(i => `
          <span class="stock-critico-tag" data-ingrediente-id="${i.id}"
            style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; background:rgba(239,68,68,.15); border-radius:20px; color:var(--danger); font-weight:600; font-size:.7rem; cursor:pointer; animation:pulse 1.5s infinite"
            @click="window._irAIngrediente('${i.id}')">
            <i class="fas fa-box" style="font-size:.6rem"></i>
            ${i.nombre}
            <span style="background:var(--danger); color:#fff; padding:0 4px; border-radius:10px; font-size:.6rem">${i.stock - i.reservado}</span>
          </span>
        `).join('');
      } catch (error) {
        console.error('Error cargando stock crítico:', error);
      }
    }
  };
};

window._irAIngrediente = function(id) {
  const tab = document.querySelector('.tab[data-tab="inventario"]');
  if (tab) tab.click();
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('selectIngrediente', { detail: { id } }));
  }, 200);
};

console.log('✅ admin.js cargado correctamente');
console.log('window.app disponible:', typeof window.app);

// Cargar Alpine.js DINÁMICAMENTE después de que todo está definido
const alpineScript = document.createElement('script');
alpineScript.src = 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.js';
alpineScript.defer = true;
document.head.appendChild(alpineScript);
console.log('📦 Alpine.js cargando dinámicamente...');
