// admin-usuarios.js - Gestión de usuarios (cajeros y admins)
(function() {
    let currentUserFotoFile = null;
    let currentUserFotoUrl = '';

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
            const fotoHtml = user.foto ? `<img src="${user.foto}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;margin-right:.5rem">` : '';
            const inicial = (user.nombre || '?').charAt(0).toUpperCase();
            const avatarHtml = fotoHtml || `<div class="usuario-avatar">${inicial}</div>`;
            const rolBadge = user.rol === 'admin' ? '<span class="usuario-rol admin">Admin</span>' : '<span class="usuario-rol cajero">Cajero</span>';
            return `<div class="usuario-card">
                ${avatarHtml}
                <div class="usuario-info">
                    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
                        <span class="usuario-nombre">${user.nombre}</span>
                        ${rolBadge}
                        ${user.activo ? '<span class="status-activo"><i class="fas fa-check-circle"></i> Activo</span>' : '<span class="status-inactivo"><i class="fas fa-circle"></i> Inactivo</span>'}
                    </div>
                    <div class="usuario-username">@${user.username}</div>
                </div>
                <div class="usuario-actions">
                    <button class="btn-icon edit" onclick="window.editarUsuario('${user.id}')" title="Editar usuario">
                        <i class="fas fa-pen"></i>
                    </button>
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
        document.getElementById('usuarioRol').value = 'cajero';
        document.getElementById('usuarioActivo').value = 'true';
        // Limpiar foto
        currentUserFotoFile = null;
        currentUserFotoUrl = '';
        document.getElementById('usuarioFoto').value = '';
        document.getElementById('usuarioFotoUrl').value = '';
        const previewDiv = document.getElementById('usuarioFotoPreview');
        if (previewDiv) previewDiv.style.display = 'none';
        document.getElementById('usuarioModalTitle').textContent = 'Nuevo Cajero/Admin';
        window.usuarioEditandoId = null;
        document.getElementById('usuarioModal').classList.add('active');
    };

    window.editarUsuario = function(id) {
        const user = window.usuarios.find(u => u.id === id);
        if (!user) return;
        window.usuarioEditandoId = id;
        document.getElementById('usuarioModalTitle').textContent = 'Editar Usuario';
        document.getElementById('usuarioNombre').value = user.nombre || '';
        document.getElementById('usuarioUsername').value = user.username || '';
        document.getElementById('usuarioRol').value = user.rol || 'cajero';
        document.getElementById('usuarioActivo').value = user.activo ? 'true' : 'false';
        document.getElementById('usuarioPassword').value = ''; // no mostrar contraseña
        // Foto
        if (user.foto) {
            document.getElementById('usuarioFotoUrl').value = user.foto;
            const previewImg = document.getElementById('usuarioPreviewImg');
            if (previewImg) previewImg.src = user.foto;
            const previewDiv = document.getElementById('usuarioFotoPreview');
            if (previewDiv) previewDiv.style.display = 'flex';
            currentUserFotoUrl = user.foto;
        } else {
            document.getElementById('usuarioFotoUrl').value = '';
            const previewDiv = document.getElementById('usuarioFotoPreview');
            if (previewDiv) previewDiv.style.display = 'none';
        }
        document.getElementById('usuarioModal').classList.add('active');
    };

    function handleUsuarioFotoFile() {
        const fileInput = document.getElementById('usuarioFoto');
        const urlInput = document.getElementById('usuarioFotoUrl');
        const previewDiv = document.getElementById('usuarioFotoPreview');
        const previewImg = document.getElementById('usuarioPreviewImg');
        const removeBtn = document.getElementById('usuarioFotoRemoveBtn');
        
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            currentUserFotoFile = file;
            currentUserFotoUrl = '';
            urlInput.value = '';
            urlInput.disabled = true;
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewDiv.style.display = 'flex';
                if (removeBtn) removeBtn.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        } else {
            urlInput.disabled = false;
            if (urlInput.value.trim()) {
                previewImg.src = urlInput.value;
                previewDiv.style.display = 'flex';
                if (removeBtn) removeBtn.style.display = 'flex';
                currentUserFotoUrl = urlInput.value;
                currentUserFotoFile = null;
            } else {
                previewDiv.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'none';
                previewImg.src = '';
            }
        }
    }

    function handleUsuarioFotoUrl() {
        const urlInput = document.getElementById('usuarioFotoUrl');
        const fileInput = document.getElementById('usuarioFoto');
        const previewDiv = document.getElementById('usuarioFotoPreview');
        const previewImg = document.getElementById('usuarioPreviewImg');
        const removeBtn = document.getElementById('usuarioFotoRemoveBtn');
        
        if (fileInput.files && fileInput.files[0]) return;
        
        const url = urlInput.value.trim();
        if (url) {
            currentUserFotoUrl = url;
            currentUserFotoFile = null;
            previewImg.src = url;
            previewDiv.style.display = 'flex';
            if (removeBtn) removeBtn.style.display = 'flex';
        } else {
            previewDiv.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'none';
            previewImg.src = '';
            currentUserFotoUrl = '';
        }
    }

    function removeUsuarioFoto() {
        const fileInput = document.getElementById('usuarioFoto');
        const urlInput = document.getElementById('usuarioFotoUrl');
        const previewDiv = document.getElementById('usuarioFotoPreview');
        const previewImg = document.getElementById('usuarioPreviewImg');
        const removeBtn = document.getElementById('usuarioFotoRemoveBtn');
        
        fileInput.value = '';
        urlInput.value = '';
        urlInput.disabled = false;
        previewDiv.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'none';
        previewImg.src = '';
        currentUserFotoFile = null;
        currentUserFotoUrl = '';
    }

    window.toggleUsuarioActivo = async function(userId, activo) {
        const user = window.usuarios.find(u => u.id === userId);
        if (user && user.rol === 'admin') {
            const adminsActivos = window.usuarios.filter(u => u.rol === 'admin' && u.activo === true);
            if (adminsActivos.length === 1 && !activo) {
                window.mostrarToast('⚠️ No se puede desactivar el único administrador activo', 'warning');
                return;
            }
        }
        try {
            await window.supabaseClient.from('usuarios').update({ activo }).eq('id', userId);
            await window.cargarUsuarios();
            window.mostrarToast(`✅ Usuario ${activo ? 'activado' : 'desactivado'}`, 'success');
        } catch (e) { console.error('Error actualizando usuario:', e); window.mostrarToast('❌ Error al actualizar usuario', 'error'); }
    };

    window.eliminarUsuario = async function(userId) {
        const user = window.usuarios.find(u => u.id === userId);
        if (!user) return;
        if (user.rol === 'admin') {
            const adminsActivos = window.usuarios.filter(u => u.rol === 'admin' && u.activo === true);
            if (adminsActivos.length === 1) {
                window.mostrarToast('⚠️ No se puede eliminar el único administrador. El sistema quedaría inoperativo.', 'error');
                return;
            }
        }
        if (!confirm(`¿Estás seguro de eliminar al usuario "${user.nombre}"?`)) return;
        try {
            await window.supabaseClient.from('usuarios').delete().eq('id', userId);
            await window.cargarUsuarios();
            window.mostrarToast('🗑️ Usuario eliminado', 'success');
        } catch (e) { console.error('Error eliminando usuario:', e); window.mostrarToast('❌ Error al eliminar usuario', 'error'); }
    };

    // Guardar usuario (nuevo o edición)
    document.getElementById('saveUsuario').addEventListener('click', async () => {
        const btn = document.getElementById('saveUsuario');
        if (btn && btn.disabled) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }
        const nombre   = document.getElementById('usuarioNombre').value.trim();
        const username = document.getElementById('usuarioUsername').value.trim().toLowerCase();
        const password = document.getElementById('usuarioPassword').value.trim();
        const rol = document.getElementById('usuarioRol').value;
        const activo = document.getElementById('usuarioActivo').value === 'true';
        
        if (!nombre || !username) {
            window.mostrarToast('Completa nombre y usuario', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
            return;
        }
        if (!window.usuarioEditandoId && !password) {
            window.mostrarToast('Ingresa una contraseña para el nuevo usuario', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
            return;
        }
        
        // Subir foto si existe
        let fotoUrl = '';
        const archivoFoto = document.getElementById('usuarioFoto').files[0];
        const fotoUrlInput = document.getElementById('usuarioFotoUrl').value;
        if (archivoFoto) {
            const resultado = await window.subirImagenPlatillo(archivoFoto, 'usuarios');
            if (resultado.success) fotoUrl = resultado.url;
            else { window.mostrarToast('Error al subir la foto: ' + resultado.error, 'error'); return; }
        } else if (fotoUrlInput) fotoUrl = fotoUrlInput;
        
        try {
            let hashed = null;
            if (password) {
                const { data: h, error: hashErr } = await window.supabaseClient.rpc('hash_password', { plain_password: password });
                if (hashErr) throw hashErr;
                hashed = h;
            }
            const userData = {
                id: window.usuarioEditandoId || window.generarId('user_'),
                nombre,
                username,
                rol,
                activo,
                foto: fotoUrl || null
            };
            if (hashed) userData.password_hash = hashed;
            
            let error;
            if (window.usuarioEditandoId) {
                ({ error } = await window.supabaseClient.from('usuarios').update(userData).eq('id', window.usuarioEditandoId));
            } else {
                ({ error } = await window.supabaseClient.from('usuarios').insert([userData]));
            }
            if (error) throw error;
            
            // Si es un administrador activo, guardarlo en el historial de recientes para el login
            if (rol === 'admin' && activo) {
                const adminData = {
                    id: userData.id,
                    nombre: userData.nombre,
                    username: userData.username,
                    foto: userData.foto,
                    rol: 'admin'
                };
                window.guardarAdminReciente(adminData);
            }
            
            document.getElementById('usuarioModal').classList.remove('active');
            window.usuarioEditandoId = null;
            await window.cargarUsuarios();
            window.mostrarToast('✅ Usuario guardado', 'success');
        } catch (e) {
            console.error('Error guardando usuario:', e);
            window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
        }
    });

    // Cerrar modal
    document.getElementById('cancelUsuario').addEventListener('click', () => document.getElementById('usuarioModal').classList.remove('active'));
    document.getElementById('closeUsuarioModal').addEventListener('click', () => document.getElementById('usuarioModal').classList.remove('active'));
    
    // Configurar eventos de foto en el modal de usuario
    function setupUsuarioFotoEvents() {
        const fileInput = document.getElementById('usuarioFoto');
        const urlInput = document.getElementById('usuarioFotoUrl');
        const removeBtn = document.getElementById('usuarioFotoRemoveBtn');
        if (fileInput) fileInput.addEventListener('change', handleUsuarioFotoFile);
        if (urlInput) urlInput.addEventListener('input', handleUsuarioFotoUrl);
        if (removeBtn) removeBtn.addEventListener('click', removeUsuarioFoto);
    }
    setupUsuarioFotoEvents();
})();
