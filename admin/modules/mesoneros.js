import { supabase } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';
import { formatBs } from '../utils/formatters.js';
import { debounce } from '../utils/debounce.js';

export function mesonerosComponent() {
  return {
    search: '',
    newNombre: '',
    mesoneros: [],
    propinas: [],
    totalPropinas: 0,
    cantidadPropinas: 0,
    promedioPropinas: 0,
    showForm: false,
    form: { id: null, nombre: '', activo: true },
    editMode: false,

    async init() {
      await this.cargarMesoneros();
      await this.cargarPropinas();
      subscribe('mesoneros', () => this.cargarMesoneros());
      subscribe('propinas', () => this.cargarPropinas());
    },

    async cargarMesoneros() {
      try {
        const { data, error } = await supabase
          .from('mesoneros')
          .select('*')
          .order('nombre');
        if (error) throw error;
        this.mesoneros = data || [];
      } catch (err) {
        showToast('Error cargando mesoneros: ' + err.message, 'error');
      }
    },

    async cargarPropinas() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      try {
        const { data, error } = await supabase
          .from('propinas')
          .select('*, mesoneros(nombre)')
          .gte('fecha', hoy.toISOString())
          .lt('fecha', manana.toISOString())
          .order('fecha', { ascending: false });
        if (error) throw error;
        this.propinas = data || [];
        this.totalPropinas = this.propinas.reduce((s, p) => s + (p.monto_bs || 0), 0);
        this.cantidadPropinas = this.propinas.length;
        this.promedioPropinas = this.cantidadPropinas ? this.totalPropinas / this.cantidadPropinas : 0;
      } catch (err) {
        showToast('Error cargando propinas: ' + err.message, 'error');
      }
    },

    filteredMesoneros() {
      const term = this.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return this.mesoneros.filter(m =>
        m.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
      );
    },

    async agregarMesonero() {
      if (!this.newNombre.trim()) {
        showToast('Ingrese un nombre', 'error');
        return;
      }
      try {
        await supabase.from('mesoneros').insert([{
          id: crypto.randomUUID ? crypto.randomUUID() : 'mes_' + Date.now(),
          nombre: this.newNombre.trim(),
          activo: true
        }]);
        this.newNombre = '';
        await this.cargarMesoneros();
        showToast('Mesonero agregado', 'success');
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    editarMesonero(mesonero) {
      this.form = { ...mesonero };
      this.editMode = true;
      this.showForm = true;
    },

    async guardarMesonero() {
      if (!this.form.nombre.trim()) {
        showToast('Ingrese nombre', 'error');
        return;
      }
      try {
        await supabase.from('mesoneros').update({
          nombre: this.form.nombre,
          activo: this.form.activo
        }).eq('id', this.form.id);
        showToast('Mesonero actualizado', 'success');
        this.closeForm();
        await this.cargarMesoneros();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async toggleActivo(mesonero) {
      try {
        await supabase.from('mesoneros').update({ activo: !mesonero.activo }).eq('id', mesonero.id);
        showToast(`Mesonero ${mesonero.activo ? 'desactivado' : 'activado'}`, 'success');
        await this.cargarMesoneros();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async eliminarMesonero(id) {
      if (!confirm('¿Eliminar este mesonero?')) return;
      try {
        await supabase.from('mesoneros').delete().eq('id', id);
        showToast('Mesonero eliminado', 'success');
        await this.cargarMesoneros();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async pagarPropinas(mesonero) {
      const { data, error } = await supabase
        .from('propinas')
        .select('id')
        .eq('mesonero_id', mesonero.id)
        .eq('entregado', false);
      if (error) {
        showToast('Error obteniendo propinas', 'error');
        return;
      }
      if (!data || data.length === 0) {
        showToast('No hay propinas pendientes', 'warning');
        return;
      }
      const ids = data.map(p => p.id);
      if (!confirm(`¿Registrar pago a ${mesonero.nombre}? Se marcarán como entregadas ${ids.length} propina(s).`)) return;
      try {
        await supabase.from('propinas').update({ entregado: true }).in('id', ids);
        showToast('Propinas pagadas', 'success');
        await this.cargarPropinas();
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
