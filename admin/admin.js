// admin/admin.js
import { supabaseClient } from './services/supabaseClient.js';
import { dashboardComponent } from './modules/dashboard.js';
import { inventoryComponent } from './modules/inventory.js';
import { menuComponent } from './modules/menu.js';
import { usuariosComponent } from './modules/usuarios.js';
import { deliverysComponent } from './modules/deliverys.js';
import { mesonerosComponent } from './modules/mesoneros.js';
import { configComponent } from './modules/config.js';
import { qrComponent } from './modules/qr.js';
import { reportesComponent } from './modules/reportes.js';

// ============================================
// UTILIDADES GLOBALES
// ============================================
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

// ============================================
// EXPONER COMPONENTES GLOBALMENTE PARA ALPINE
// ============================================
window.dashboardComponent = dashboardComponent;
window.inventoryComponent = inventoryComponent;
window.menuComponent = menuComponent;
window.usuariosComponent = usuariosComponent;
window.deliverysComponent = deliverysComponent;
window.mesonerosComponent = mesonerosComponent;
window.configComponent = configComponent;
window.qrComponent = qrComponent;
window.reportesComponent = reportesComponent;

// ============================================
// APLICACIÓN PRINCIPAL
// ============================================
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
            this.cargarConfiguracionGlobal();
        },

        // Sincronizar window.configGlobal con la tabla config
        async cargarConfiguracionGlobal() {
            const { data, error } = await supabaseClient.client
                .from('config')
                .select('*')
                .eq('id', 1)
                .single();
            if (error) return;
            window.configGlobal = data;
        },

        checkSession() {
            const token = sessionStorage.getItem('admin_jwt_token');
            if (token && sessionStorage.getItem('admin_user')) {
                supabaseClient.setToken(token);
                window.dispatchEvent(new CustomEvent('supabase-token-updated'));
                this.loggedIn = true;
                console.log('✅ Sesión activa');
                document.getElementById('loginContainer').style.display = 'none';
            } else {
                console.log('⚠️ Sin sesión');
            }
        },

        async login() {
            console.log('🔑 Login iniciado con password:', this.loginPassword);

            if (!this.loginPassword) {
                window.showToast('Ingrese la contraseña', 'error');
                return;
            }

            try {
                const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ username: 'admin', password: this.loginPassword })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
                if (!data.success) throw new Error(data.error || 'Contraseña incorrecta');
                if (data.user.rol !== 'admin') throw new Error('No eres administrador');

                sessionStorage.setItem('admin_jwt_token', data.token);
                sessionStorage.setItem('admin_user', JSON.stringify(data.user));

                // ACTUALIZAR EL CLIENTE DE SUPABASE CON EL TOKEN
                supabaseClient.setToken(data.token);
                window.dispatchEvent(new CustomEvent('supabase-token-updated'));

                this.loggedIn = true;
                window.showToast('✅ Bienvenido Administrador', 'success');
                document.getElementById('loginContainer').style.display = 'none';

                // Cargar configuración después del login
                await this.cargarConfiguracionGlobal();
            } catch (error) {
                console.error('Login error:', error);
                window.showToast('❌ Error: ' + error.message, 'error');
            }
        },

        logout() {
            sessionStorage.removeItem('admin_jwt_token');
            sessionStorage.removeItem('admin_user');
            this.loggedIn = false;
            window.showToast('Sesión cerrada', 'info');
            document.getElementById('loginContainer').style.display = 'flex';
            // Opcional: reiniciar cliente con anon key
            supabaseClient.setToken(null);
            window.dispatchEvent(new CustomEvent('supabase-token-cleared'));
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
                const { data, error } = await supabaseClient.client.from('inventario').select('id, nombre, stock, reservado, minimo');
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

// Cargar Alpine.js dinámicamente después de que todo está definido
const alpineScript = document.createElement('script');
alpineScript.src = 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.js';
alpineScript.defer = true;
document.head.appendChild(alpineScript);
console.log('📦 Alpine.js cargando dinámicamente...');
