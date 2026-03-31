import { supabase } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';
import { formatBs } from '../utils/formatters.js';
import { debounce } from '../utils/debounce.js';

export function deliverysComponent() {
  return {
    deliverys: [],
    search: '',
    showForm: false,
    form: {
      id: null,
      nombre: '',
      activo: true
    },
    editMode: false,
    acumulado: {},
    isLoading: false,

    async init() {
      await this.cargarDeliverys();
      subscribe('deliverys', () => this.cargarDeliverys());
      subscribe('entregas_delivery', () => this.calcularAcumulados());
    },

    async cargarDeliverys() {
      this.isLoading = true;
      try {
        const { data, error } = await supabase
          .from('deliverys')
          .select('*')
          .order('nombre');
        if (error) throw error;
        this.deliverys = data || [];
        await this.calcularAcumulados();
      } catch (err) {
        showToast('Error cargando motorizados: ' + err.message, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    async calcularAcumulados() {
      const { data, error } = await supabase
        .from('entregas_delivery')
        .select('delivery_id, monto_bs');
      if (error) return;
      this.acumulado = {};
      (data || []).forEach(e => {
        this.acumulado[e.delivery_id] = (this.acumulado[e.delivery_id] || 0) + (e.monto_bs || 0);
      });
    },

    filteredDeliverys() {
      const term = this.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return this.deliverys.filter(d =>
        d.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
      );
    },

    nuevoDelivery() {
      this.form = { id: null, nombre: '', activo: true };
      this.editMode = false;
      this.showForm = true;
    },

    editarDelivery(delivery) {
      this.form = { ...delivery };
      this.editMode = true;
      this.showForm = true;
    },

    async guardarDelivery() {
      if (!this.form.nombre.trim()) {
        showToast('Ingrese nombre', 'error');
        return;
      }
      try {
        if (this.editMode) {
          const { error } = await supabase
            .from('deliverys')
            .update({ nombre: this.form.nombre, activo: this.form.activo })
            .eq('id', this.form.id);
          if (error) throw error;
          showToast('Motorizado actualizado', 'success');
        } else {
          const { error } = await supabase
            .from('deliverys')
            .insert([{
              id: crypto.randomUUID ? crypto.randomUUID() : 'del_' + Date.now(),
              nombre: this.form.nombre,
              activo: true
            }]);
          if (error) throw error;
          showToast('Motorizado creado', 'success');
        }
        this.closeForm();
        await this.cargarDeliverys();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async toggleActivo(delivery) {
      try {
        await supabase
          .from('deliverys')
          .update({ activo: !delivery.activo })
          .eq('id', delivery.id);
        showToast(`Motorizado ${delivery.activo ? 'desactivado' : 'activado'}`, 'success');
        await this.cargarDeliverys();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async eliminarDelivery(id) {
      if (!confirm('¿Eliminar este motorizado? También se eliminarán sus entregas.')) return;
      try {
        await supabase.from('entregas_delivery').delete().eq('delivery_id', id);
        await supabase.from('deliverys').delete().eq('id', id);
        showToast('Motorizado eliminado', 'success');
        await this.cargarDeliverys();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async registrarPago(delivery) {
      const montoTotal = this.acumulado[delivery.id] || 0;
      if (montoTotal === 0) {
        showToast('No hay acumulado para pagar', 'warning');
        return;
      }
      const confirmar = confirm(`¿Registrar pago a ${delivery.nombre} por ${formatBs(montoTotal)}?\nEsto reiniciará su acumulado.`);
      if (!confirmar) return;
      try {
        // Eliminar todas las entregas para reiniciar acumulado
        await supabase.from('entregas_delivery').delete().eq('delivery_id', delivery.id);
        showToast('Pago registrado', 'success');
        await this.calcularAcumulados();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    closeForm() {
      this.showForm = false;
    },

    formatBs
  };
}