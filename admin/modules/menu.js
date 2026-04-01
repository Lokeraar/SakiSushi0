import { supabase } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';
import { formatBs, formatUSD, usdToBs } from '../utils/formatters.js';
import { debounce } from '../utils/debounce.js';

export function menuComponent() {
  return {
    search: '',
    menuItems: [],
    form: {
      id: null,
      nombre: '',
      categoria: '',
      subcategoria: '',
      precio: 0,
      descripcion: '',
      imagen: '',
      ingredientes: {},
      disponible: true
    },
    editMode: false,
    showForm: false,
    isLoading: false,
    categorias: [
      'Entradas', 'Sushi', 'Rolls', 'Tragos y bebidas', 'Pokes',
      'Ensaladas', 'Comida China', 'Comida Japonesa', 'Ofertas Especiales',
      'Para Niños', 'Combo Ejecutivo'
    ],
    subcategorias: {
      'Rolls': ['Rolls Fríos de 10 piezas', 'Rolls Tempura de 12 piezas'],
      'Comida China': ['Arroz Chino', 'Arroz Cantones', 'Chopsuey', 'Lomey', 'Chow Mein', 'Fideos de Arroz', 'Tallarines Cantones', 'Mariscos', 'Foo Yong', 'Sopas', 'Entremeses'],
      'Comida Japonesa': ['Yakimeshi', 'Yakisoba', 'Pasta Udon', 'Churrasco']
    },

    async init() {
      console.log('🔧 Menu component iniciado');
      await this.loadMenu();
      subscribe('menu', () => this.loadMenu());

      window.addEventListener('supabase-token-updated', () => {
        console.log('Token actualizado, recargando menú');
        this.loadMenu();
      });
    },

    async loadMenu() {
      this.isLoading = true;
      try {
        const { data, error } = await supabase
          .from('menu')
          .select('*')
          .order('nombre');
        if (error) throw error;
        this.menuItems = data || [];
      } catch (err) {
        showToast('Error cargando menú: ' + err.message, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    filteredItems() {
      const term = this.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return this.menuItems.filter(i =>
        i.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
      );
    },

    getAvailableSubcategorias() {
      return this.subcategorias[this.form.categoria] || [];
    },

    async savePlatillo() {
      if (!this.form.nombre || !this.form.categoria || this.form.precio <= 0) {
        showToast('Complete nombre, categoría y precio', 'error');
        return;
      }
      const data = {
        id: this.form.id || (crypto.randomUUID ? crypto.randomUUID() : 'plat_' + Date.now()),
        nombre: this.form.nombre,
        categoria: this.form.categoria,
        subcategoria: this.form.subcategoria || null,
        precio: this.form.precio,
        descripcion: this.form.descripcion,
        imagen: this.form.imagen,
        ingredientes: this.form.ingredientes || {},
        disponible: this.form.disponible,
        stock: 0,
        stock_maximo: 0
      };
      try {
        if (this.editMode) {
          await supabase.from('menu').update(data).eq('id', this.form.id);
          showToast('Platillo actualizado', 'success');
        } else {
          await supabase.from('menu').insert([data]);
          showToast('Platillo creado', 'success');
        }
        this.closeForm();
        await this.loadMenu();
      } catch (err) {
        showToast('Error guardando platillo: ' + err.message, 'error');
      }
    },

    async deletePlatillo(id) {
      if (!confirm('¿Eliminar este platillo?')) return;
      try {
        await supabase.from('menu').delete().eq('id', id);
        showToast('Platillo eliminado', 'success');
        await this.loadMenu();
      } catch (err) {
        showToast('Error eliminando: ' + err.message, 'error');
      }
    },

    async toggleDisponible(id, disponible) {
      try {
        await supabase.from('menu').update({ disponible }).eq('id', id);
        showToast(`Platillo ${disponible ? 'habilitado' : 'deshabilitado'}`, 'success');
        await this.loadMenu();
      } catch (err) {
        showToast('Error cambiando disponibilidad: ' + err.message, 'error');
      }
    },

    editPlatillo(id) {
      const platillo = this.menuItems.find(p => p.id === id);
      if (!platillo) return;
      this.form = { ...platillo };
      this.editMode = true;
      this.showForm = true;
    },

    newPlatillo() {
      this.form = {
        id: null,
        nombre: '',
        categoria: '',
        subcategoria: '',
        precio: 0,
        descripcion: '',
        imagen: '',
        ingredientes: {},
        disponible: true
      };
      this.editMode = false;
      this.showForm = true;
    },

    closeForm() {
      this.showForm = false;
    },

    debouncedSearch: debounce(function() {}, 300),

    formatBs,
    formatUSD,
    usdToBs
  };
}
