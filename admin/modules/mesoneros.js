import { supabase } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';
import { formatBs } from '../utils/formatters.js';
import { debounce } from '../utils/debounce.js';

export function mesonerosComponent() {
  return {
    mesoneros: [],
    propinas: [],
    totalPropinas: 0,
    cantidadPropinas: 0,
    promedioPropinas: 0,
    search: '',
    showForm: false,
    form: {
      id: null,
      nombre: '',
      activo: true
    },
    editMode: false,
    isLoading: false,

    async init() {
      await this.cargarMesoneros();
      await this.cargarPropinas();
      subscribe('mesoneros', () => this.cargarMesoneros());
      subscribe('propinas', () => this.cargarPropinas());
    },

    async cargarMesoneros() {
      this.isLoading = true;
      try {
        const { data, error } = await supabase
          .from('mesoneros')
          .select('*')
          .order('nombre');
        if (error) throw error;
        this.mesoneros = data || [];
      } catch (err) {
        showToast('Error cargando mesoneros: ' + err.message, 'error');
      } finally {
        this.isLoading = false;
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

    nuevoMesonero() {
      this.form = { id: null, nombre: '', activo: true };
      this.editMode = false;
      this.showForm = true;
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
        if (this.editMode) {
          const { error } = await supabase
            .from('mesoneros')
            .update({ nombre: this.form.nombre, activo: this.form.activo })
            .eq('id', this.form.id);
          if (error) throw error;
          showToast('Mesonero actualizado', 'success');
        } else {
          const { error } = await supabase
            .from('mesoneros')
            .insert([{
              id: crypto.randomUUID ? crypto.randomUUID() : 'mes_' + Date.now(),
              nombre: this.form.nombre,
              activo: true
            }]);
          if (error) throw error;
          showToast('Mesonero creado', 'success');
        }
        this.closeForm();
        await this.cargarMesoneros();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async toggleActivo(mesonero) {
      try {
        await supabase
          .from('mesoneros')
          .update({ activo: !mesonero.activo })
          .eq('id', mesonero.id);
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
      // Obtener propinas pendientes (entregado = false) para este mesonero
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
      const confirmar = confirm(`¿Registrar pago a ${mesonero.nombre}? Se marcarán como entregadas ${ids.length} propina(s).`);
      if (!confirmar) return;
      try {
        await supabase
          .from('propinas')
          .update({ entregado: true })
          .in('id', ids);
        showToast('Propinas pagadas', 'success');
        await this.cargarPropinas();
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