
import { inventoryStore } from '../stores/inventoryStore.js';
import { fetchInventory, updateStockAtomic } from '../services/inventoryService.js';
import { subscribe } from '../services/realtimeManager.js';
import { debounce } from '../utils/debounce.js';
import { showToast } from '../utils/toast.js';
import { formatBs, formatUSD, usdToBs } from '../utils/formatters.js';

export function inventoryComponent() {
  return {
    search: '',
    selectedIngredient: null,
    form: {
      id: null,
      nombre: '',
      stock: 0,
      agregar: 0,
      unidad: 'unidades',
      minimo: 0,
      precio_costo: 0,
      precio_unitario: 0
    },
    editMode: false,
    showForm: false,
    isLoading: false,
    passwordModal: false,
    tempPassword: '',
    passwordError: '',

    init() {
      this.loadInventory();
      subscribe('inventario', (payload) => {
        if (payload.eventType === 'INSERT') {
          inventoryStore.addItem(payload.new);
          this.render();
        } else if (payload.eventType === 'UPDATE') {
          inventoryStore.updateItem(payload.new);
          this.render();
        } else if (payload.eventType === 'DELETE') {
          inventoryStore.removeItem(payload.old.id);
          this.render();
        }
        this.render(); // forcer actualización UI
      });
    },

    async loadInventory() {
      this.isLoading = true;
      try {
        const items = await fetchInventory();
        inventoryStore.set(items);
        this.render();
      } catch (err) {
        showToast('Error cargando inventario: ' + err.message, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    filteredItems() {
      const term = this.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return inventoryStore.items.filter(i =>
        i.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
      );
    },

    selectIngredient(id) {
      this.selectedIngredient = inventoryStore.items.find(i => i.id === id);
      this.form = { ...this.selectedIngredient };
      this.editMode = true;
      this.showForm = true;
      this.resetPasswordFields();
    },

    resetPasswordFields() {
      this.tempPassword = '';
      this.passwordError = '';
    },

    async updateStock(delta) {
      if (!this.selectedIngredient) return;
      const prev = [...inventoryStore.items];
      inventoryStore.updateItem({ id: this.selectedIngredient.id, stock: this.selectedIngredient.stock + delta });
      this.render();
      try {
        await updateStockAtomic(this.selectedIngredient.id, delta);
        showToast(`Stock actualizado: ${delta > 0 ? '+' : ''}${delta}`, 'success');
      } catch (err) {
        inventoryStore.set(prev);
        this.render();
        showToast(err.message, 'error');
      }
    },

    async saveIngredient() {
      if (!this.form.nombre.trim()) {
        showToast('El nombre es obligatorio', 'error');
        return;
      }
      const token = sessionStorage.getItem('admin_jwt_token');
      if (!token) {
        showToast('Sesión expirada, por favor recarga la página', 'error');
        return;
      }
      const supabase = window.supabaseClient || (await import('../services/supabaseClient.js')).supabase;
      const data = {
        id: this.form.id || window.crypto.randomUUID ? crypto.randomUUID() : 'ing_' + Date.now(),
        nombre: this.form.nombre,
        stock: (parseFloat(this.form.stock) || 0) + (parseFloat(this.form.agregar) || 0),
        reservado: 0,
        unidad_base: this.form.unidad,
        minimo: parseFloat(this.form.minimo) || 0,
        precio_costo: parseFloat(this.form.precio_costo) || 0,
        precio_unitario: parseFloat(this.form.precio_unitario) || 0
      };
      try {
        if (this.editMode) {
          await supabase.from('inventario').update(data).eq('id', this.form.id);
          showToast('Ingrediente actualizado', 'success');
        } else {
          await supabase.from('inventario').insert([data]);
          showToast('Ingrediente creado', 'success');
        }
        this.closeForm();
        await this.loadInventory();
      } catch (err) {
        showToast('Error guardando ingrediente: ' + err.message, 'error');
      }
    },

    async deleteIngredient() {
      if (!confirm('¿Eliminar este ingrediente? Se perderán todas las referencias en platillos.')) return;
      try {
        const supabase = (await import('../services/supabaseClient.js')).supabase;
        await supabase.from('inventario').delete().eq('id', this.selectedIngredient.id);
        showToast('Ingrediente eliminado', 'success');
        this.closeForm();
        await this.loadInventory();
      } catch (err) {
        showToast('Error eliminando: ' + err.message, 'error');
      }
    },

    newIngredient() {
      this.editMode = false;
      this.form = {
        id: null,
        nombre: '',
        stock: 0,
        agregar: 0,
        unidad: 'unidades',
        minimo: 0,
        precio_costo: 0,
        precio_unitario: 0
      };
      this.showForm = true;
      this.selectedIngredient = null;
      this.resetPasswordFields();
    },

    closeForm() {
      this.showForm = false;
      this.selectedIngredient = null;
      this.editMode = false;
    },

    render() {
      // Forzar actualización de la vista (Alpine automáticamente lo hace)
      this.$forceUpdate();
    },

    debouncedSearch: debounce(function() {
      this.render();
    }, 300),

    formatBs,
    formatUSD,
    usdToBs
  };
}