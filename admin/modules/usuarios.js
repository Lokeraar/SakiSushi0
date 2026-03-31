import { supabase } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';
import { debounce } from '../utils/debounce.js';

export function usuariosComponent() {
  return {
    usuarios: [],
    search: '',
    showForm: false,
    form: {
      id: null,
      nombre: '',
      username: '',
      password: '123456',
      activo: true
    },
    editMode: false,
    isLoading: false,

    async init() {
      await this.cargarUsuarios();
      subscribe('usuarios', () => this.cargarUsuarios());
    },

    async cargarUsuarios() {
      this.isLoading = true;
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .order('nombre');
        if (error) throw error;
        this.usuarios = data || [];
      } catch (err) {
        showToast('Error cargando usuarios: ' + err.message, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    filteredUsuarios() {
      const term = this.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return this.usuarios.filter(u =>
        u.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term) ||
        u.username.toLowerCase().includes(term)
      );
    },

    nuevoUsuario() {
      this.form = { id: null, nombre: '', username: '', password: '123456', activo: true };
      this.editMode = false;
      this.showForm = true;
    },

    editarUsuario(usuario) {
      this.form = { ...usuario };
      this.editMode = true;
      this.showForm = true;
    },

    async guardarUsuario() {
      if (!this.form.nombre.trim() || !this.form.username.trim()) {
        showToast('Complete nombre y usuario', 'error');
        return;
      }
      try {
        if (this.editMode) {
          const { error } = await supabase
            .from('usuarios')
            .update({
              nombre: this.form.nombre,
              username: this.form.username,
              activo: this.form.activo
            })
            .eq('id', this.form.id);
          if (error) throw error;
          showToast('Usuario actualizado', 'success');
        } else {
          // Generar hash de contraseña
          const { data: hashed, error: hashErr } = await supabase
            .rpc('hash_password', { plain_password: this.form.password });
          if (hashErr) throw hashErr;
          const { error } = await supabase
            .from('usuarios')
            .insert([{
              id: crypto.randomUUID ? crypto.randomUUID() : 'user_' + Date.now(),
              nombre: this.form.nombre,
              username: this.form.username,
              password_hash: hashed,
              rol: 'cajero',
              activo: true
            }]);
          if (error) throw error;
          showToast('Usuario creado', 'success');
        }
        this.closeForm();
        await this.cargarUsuarios();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async toggleActivo(usuario) {
      try {
        await supabase
          .from('usuarios')
          .update({ activo: !usuario.activo })
          .eq('id', usuario.id);
        showToast(`Usuario ${usuario.activo ? 'desactivado' : 'activado'}`, 'success');
        await this.cargarUsuarios();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async eliminarUsuario(id) {
      if (!confirm('¿Eliminar este usuario?')) return;
      try {
        await supabase.from('usuarios').delete().eq('id', id);
        showToast('Usuario eliminado', 'success');
        await this.cargarUsuarios();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    closeForm() {
      this.showForm = false;
    },

    debouncedSearch: debounce(function() {
      // Alpine reacciona automáticamente al cambio de search
    }, 300)
  };
}