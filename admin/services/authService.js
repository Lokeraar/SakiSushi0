// admin/services/authService.js
import { supabaseClient } from './supabaseClient.js';
import { showToast } from '../utils/toast.js';

export async function loginAdmin(password) {
    try {
        const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
        if (!data.success) throw new Error(data.error || 'Contraseña incorrecta');
        if (data.user.rol !== 'admin') throw new Error('Acceso denegado. Se requiere rol de administrador.');

        sessionStorage.setItem('admin_jwt_token', data.token);
        sessionStorage.setItem('admin_user', JSON.stringify(data.user));
        supabaseClient.setToken(data.token); // <--- Actualizar cliente con token
        showToast('✅ Bienvenido Administrador', 'success');
        return true;
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
        return false;
    }
}

export function getJwtToken() {
    return sessionStorage.getItem('admin_jwt_token');
}

export function logout() {
    sessionStorage.removeItem('admin_jwt_token');
    sessionStorage.removeItem('admin_user');
    supabaseClient.setToken(null); // <--- Resetear cliente
    window.location.reload();
}
