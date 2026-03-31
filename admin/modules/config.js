import { supabase } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';
import { debounce } from '../utils/debounce.js';

export function configComponent() {
  return {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    recoveryEmail: '',
    isLoading: false,

    async init() {
      await this.cargarRecoveryEmail();
      subscribe('config', () => this.cargarRecoveryEmail());
    },

    async cargarRecoveryEmail() {
      const { data, error } = await supabase
        .from('config')
        .select('recovery_email')
        .eq('id', 1)
        .single();
      if (error) return;
      this.recoveryEmail = data?.recovery_email || '';
    },

    async cambiarPassword() {
      if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
        showToast('Complete todos los campos', 'error');
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
      }
      if (this.newPassword.length < 4) {
        showToast('La contraseña debe tener al menos 4 caracteres', 'error');
        return;
      }
      this.isLoading = true;
      try {
        // Verificar contraseña actual usando verify_user_credentials
        const { data: adminData } = await supabase
          .from('usuarios')
          .select('username')
          .eq('rol', 'admin')
          .single();
        if (!adminData) throw new Error('Usuario admin no encontrado');
        const { data: authData, error: authErr } = await supabase
          .rpc('verify_user_credentials', {
            p_username: adminData.username,
            p_password: this.currentPassword
          });
        if (authErr || !authData || !authData.success) {
          showToast('Contraseña actual incorrecta', 'error');
          return;
        }
        // Generar hash de la nueva
        const { data: hashed, error: hashErr } = await supabase
          .rpc('hash_password', { plain_password: this.newPassword });
        if (hashErr) throw hashErr;
        // Actualizar en usuarios
        await supabase
          .from('usuarios')
          .update({ password_hash: hashed })
          .eq('rol', 'admin');
        // Actualizar en config
        await supabase
          .from('config')
          .update({ admin_password: this.newPassword })
          .eq('id', 1);
        showToast('Contraseña cambiada exitosamente', 'success');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    async guardarRecoveryEmail() {
      if (!this.recoveryEmail || !this.recoveryEmail.includes('@')) {
        showToast('Ingrese un correo válido', 'error');
        return;
      }
      this.isLoading = true;
      try {
        await supabase
          .from('config')
          .update({ recovery_email: this.recoveryEmail })
          .eq('id', 1);
        showToast('Correo guardado', 'success');
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      } finally {
        this.isLoading = false;
      }
    }
  };
}