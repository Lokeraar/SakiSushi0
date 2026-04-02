// admin/modules/config.js
import { supabaseClient } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';

export function configComponent() {
    return {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        recoveryEmail: '',
        isLoading: false,

        async init() {
            console.log('🔧 Config component iniciado');
            await this.cargarRecoveryEmail();
            subscribe('config', () => this.cargarRecoveryEmail());

            window.addEventListener('supabase-token-updated', () => {
                console.log('Token actualizado, recargando configuración');
                this.cargarRecoveryEmail();
            });
        },

        async cargarRecoveryEmail() {
            const { data, error } = await supabaseClient.client
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
                const { data: adminData } = await supabaseClient.client
                    .from('usuarios')
                    .select('username')
                    .eq('rol', 'admin')
                    .single();
                if (!adminData) throw new Error('Usuario admin no encontrado');
                const { data: authData } = await supabaseClient.client
                    .rpc('verify_user_credentials', {
                        p_username: adminData.username,
                        p_password: this.currentPassword
                    });
                if (!authData || !authData.success) {
                    showToast('Contraseña actual incorrecta', 'error');
                    return;
                }
                const { data: hashed } = await supabaseClient.client
                    .rpc('hash_password', { plain_password: this.newPassword });
                await supabaseClient.client
                    .from('usuarios')
                    .update({ password_hash: hashed })
                    .eq('rol', 'admin');
                await supabaseClient.client
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
                await supabaseClient.client
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
