// admin-usuarios.js - Gestión de usuarios (cajeros)
(function() {
    window.cargarUsuarios = async function() {
        try {
            const { data, error } = await window.supabaseClient.from('usuarios').select('*').order('nombre');
            if (error) throw error;
            window.usuarios = data || [];
            window.renderizarUsuarios();
        } catch (e) { console.error('Error cargando usuarios:', e); window.mostrarToast('Error cargando usuarios', 'error'); }
    };

    window.renderizarUsuarios = function() {
        const grid = document.getElementById('usuariosGrid');
        if (!window.usuarios || !window.usuarios.length) {
            grid.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem">No hay cajeros registrados.</p>';
            return;
        }
        grid.innerHTML = window.usuarios.map(user => {
            const inicial = (user.nombre || '?').charAt(0).toUpperCase();
            return `<div class="usuario-card">
                <div class="usuario-avatar">${inicial}</div>
                <div class="usuario-info">
                    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
                        <span class="usuario-nombre">${user.nombre}</span>
                        ${user.activo ? '<span class="status-activo"><i class="fas fa-check-circle"></i> Activo</span>' : '<span class="status-inactivo"><i class="fas fa-circle"></i> Inactivo</span>'}
                    </div>
                    <div class="usuario-username">@${user.username} · ${user.rol || 'cajero'}</div>
                </div>
                <div class="usuario-actions">
                    <button class="btn-toggle ${user.activo ? 'btn-toggle-on' : 'btn-toggle-off'}"
                        onclick="window.toggleUsuarioActivo('${user.id}', ${!user.activo})">
                        ${user.activo ? 'Inhabilitar' : 'Activar'}
                    </button>
                    <button class="btn-icon delete" onclick="window.eliminarUsuario('${user.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    };

    window.abrirModalNuevoUsuario = function() {
        document.getElementById('usuarioForm').reset();
        document.getElementById('usuarioModal').classList.add('active');
    };

    window.toggleUsuarioActivo = async function(userId, activo) {
        try {
            await window.supabaseClient.from('usuarios').update({ activo }).eq('id', userId);
            await window.cargarUsuarios();
            window.mostrarToast(`✅ Usuario ${activo ? 'activado' : 'desactivado'}`, 'success');
        } catch (e) { console.error('Error actualizando usuario:', e); window.mostrarToast('❌ Error al actualizar usuario', 'error'); }
    };

    window.eliminarUsuario = async function(userId) {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await window.supabaseClient.from('usuarios').delete().eq('id', userId);
            await window.cargarUsuarios();
            window.mostrarToast('🗑️ Usuario eliminado', 'success');
        } catch (e) { console.error('Error eliminando usuario:', e); window.mostrarToast('❌ Error al eliminar usuario', 'error'); }
    };

    // Guardar nuevo usuario (cajero)
    document.getElementById('saveUsuario').addEventListener('click', async () => {
        const btn = document.getElementById('saveUsuario');
        if (btn && btn.disabled) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }
        const nombre   = document.getElementById('usuarioNombre').value.trim();
        const username = document.getElementById('usuarioUsername').value.trim().toLowerCase();
        const password = document.getElementById('usuarioPassword').value.trim();
        if (!nombre || !username || !password) {
            window.mostrarToast('Completa todos los campos', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
            return;
        }
        try {
            const { data: hashed, error: hashErr } = await window.supabaseClient.rpc('hash_password', { plain_password: password });
            if (hashErr) throw hashErr;
            const activo = document.getElementById('usuarioActivo')?.value !== 'false';
            const { error } = await window.supabaseClient.from('usuarios').insert([{
                id: window.generarId('user_'),
                nombre,
                username,
                password_hash: hashed,
                rol: 'cajero',
                activo
            }]);
            if (error) throw error;
            document.getElementById('usuarioModal').classList.remove('active');
            await window.cargarUsuarios();
            window.mostrarToast('✅ Cajero creado exitosamente', 'success');
        } catch (e) {
            console.error('Error creando cajero:', e);
            window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
        }
    });

    // Cerrar modal usuario
    document.getElementById('cancelUsuario').addEventListener('click', () => document.getElementById('usuarioModal').classList.remove('active'));
    document.getElementById('closeUsuarioModal').addEventListener('click', () => document.getElementById('usuarioModal').classList.remove('active'));
})();
