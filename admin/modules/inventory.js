// admin/modules/inventory.js
import { supabaseClient } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { updateStockAtomic } from '../services/inventoryService.js';
import { showToast } from '../utils/toast.js';
import { formatBs, formatUSD, usdToBs } from '../utils/formatters.js';
import { debounce } from '../utils/debounce.js';

export function inventoryComponent() {
    return {
        search: '',
        inventoryItems: [],
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

        async init() {
            await this.loadInventory();
            subscribe('inventario', () => this.loadInventory());
        },

        async loadInventory() {
            this.isLoading = true;
            try {
                const { data, error } = await supabaseClient.client
                    .from('inventario')
                    .select('*')
                    .order('nombre');
                if (error) throw error;
                this.inventoryItems = data || [];
                if (this.selectedIngredient) {
                    const updated = this.inventoryItems.find(i => i.id === this.selectedIngredient.id);
                    if (updated) this.selectedIngredient = updated;
                }
            } catch (err) {
                showToast('Error cargando inventario: ' + err.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        filteredItems() {
            const term = this.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return this.inventoryItems.filter(i =>
                i.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
            );
        },

        selectIngredient(id) {
            this.selectedIngredient = this.inventoryItems.find(i => i.id === id);
            this.form = { ...this.selectedIngredient };
            this.editMode = true;
            this.showForm = false;
        },

        async updateStock(delta) {
            if (!this.selectedIngredient) return;
            const prevStock = this.selectedIngredient.stock;
            const newStock = prevStock + delta;
            if (newStock < 0) {
                showToast('Stock no puede ser negativo', 'error');
                return;
            }
            // Optimistic update
            this.selectedIngredient.stock = newStock;
            try {
                const result = await updateStockAtomic(this.selectedIngredient.id, delta);
                if (!result.success) throw new Error(result.error);
                showToast(`Stock actualizado: ${delta > 0 ? '+' : ''}${delta}`, 'success');
            } catch (err) {
                this.selectedIngredient.stock = prevStock;
                showToast(err.message, 'error');
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
            this.passwordModal = false;
        },

        async saveIngredient() {
            if (!this.form.nombre.trim()) {
                showToast('El nombre es obligatorio', 'error');
                return;
            }
            const data = {
                id: this.form.id || crypto.randomUUID ? crypto.randomUUID() : 'ing_' + Date.now(),
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
                    await supabaseClient.client.from('inventario').update(data).eq('id', this.form.id);
                    showToast('Ingrediente actualizado', 'success');
                } else {
                    await supabaseClient.client.from('inventario').insert([data]);
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
                await supabaseClient.client.from('inventario').delete().eq('id', this.selectedIngredient.id);
                showToast('Ingrediente eliminado', 'success');
                this.selectedIngredient = null;
                await this.loadInventory();
            } catch (err) {
                showToast('Error eliminando: ' + err.message, 'error');
            }
        },

        closeForm() {
            this.showForm = false;
        },

        async verifyPassword() {
            if (!this.tempPassword) {
                this.passwordError = 'Ingresa la contraseña';
                return;
            }
            const { data, error } = await supabaseClient.client
                .from('config')
                .select('admin_password')
                .eq('id', 1)
                .single();
            if (error || !data || data.admin_password !== this.tempPassword) {
                this.passwordError = 'Contraseña incorrecta';
                return;
            }
            this.passwordModal = false;
            this.passwordError = '';
            // Desbloquear input de stock (manualmente después de la verificación)
            const stockInput = document.querySelector('#ingredienteStock');
            if (stockInput) stockInput.disabled = false;
        },

        updatePreview() {
            const stockActual = parseFloat(this.form.stock) || 0;
            const agregar = parseFloat(this.form.agregar) || 0;
            const total = stockActual + agregar;
            const preview = document.getElementById('stockTotalPreview');
            if (preview) preview.textContent = agregar > 0 ? `Stock resultante: ${total} ${this.form.unidad}` : '';
        },

        debouncedSearch: debounce(function() {
            // Alpine reacciona automáticamente
        }, 300),

        formatBs,
        formatUSD,
        usdToBs
    };
}
