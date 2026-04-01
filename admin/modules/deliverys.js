import { supabase } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';
import { formatBs } from '../utils/formatters.js';
import { debounce } from '../utils/debounce.js';

export function deliverysComponent() {
  return {
    search: '',
    newNombre: '',
    deliverys: [],
    acumulado: {},
    showForm: false,
    form: { id: null, nombre: '', activo: true },
    editMode: false,

    async init() {
      console.log('🔧 Deliverys component iniciado');
      await this.cargarDeliverys();
      subscribe('deliverys', () => this.cargarDeliverys());
      subscribe('entregas_delivery', () => this.calcularAcumulados());

      window.addEventListener('supabase-token-updated', () => {
        console.log('Token actualizado, recargando deliverys');
        this.cargarDeliverys();
      });
    },

    async cargarDeliverys() {
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

    async agregarDelivery() {
      if (!this.newNombre.trim()) {
        showToast('Ingrese un nombre', 'error');
        return;
      }
      try {
        await supabase.from('deliverys').insert([{
          id: crypto.randomUUID ? crypto.randomUUID() : 'del_' + Date.now(),
          nombre: this.newNombre.trim(),
          activo: true
        }]);
        this.newNombre = '';
        await this.cargarDeliverys();
        showToast('Motorizado agregado', 'success');
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
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
        await supabase.from('deliverys').update({
          nombre: this.form.nombre,
          activo: this.form.activo
        }).eq('id', this.form.id);
        showToast('Motorizado actualizado', 'success');
        this.closeForm();
        await this.cargarDeliverys();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async toggleActivo(delivery) {
      try {
        await supabase.from('deliverys').update({ activo: !delivery.activo }).eq('id', delivery.id);
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
      if (!confirm(`¿Registrar pago a ${delivery.nombre} por ${formatBs(montoTotal)}?\nEsto reiniciará su acumulado.`)) return;
      try {
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

    debouncedSearch: debounce(function() {}, 300),

    formatBs
  };
}
