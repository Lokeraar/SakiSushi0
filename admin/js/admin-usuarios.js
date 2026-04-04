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
            const inicial   = (user.nombre || '?').charAt(0).toUpperCase();
            const fotoSrc   = user.foto || '';
            const rolBadge  = user.rol === 'admin'
                ? '<span class="usuario-rol admin">Admin</span>'
                : '<span class="usuario-rol cajero">Cajero</span>';
            const statusBadge = user.activo
                ? '<span class="status-activo"><i class="fas fa-check-circle"></i> Activo</span>'
                : '<span class="status-inactivo"><i class="fas fa-circle"></i> Inactivo</span>';
            const avatarHtml = fotoSrc
                ? `<div class="ucard-avatar">
                       <img src="${fotoSrc}"
                           style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer"
                           onclick="window.expandirImagen('${fotoSrc.replace(/'/g,"\'")}')">
                   </div>`
                : `<div class="ucard-avatar"><div class="usuario-avatar" style="width:100%;height:100%;font-size:1.4rem">${inicial}</div></div>`;
            return `<div class="usuario-card-v2">
                ${avatarHtml}
                <div class="ucard-body">
                    <div class="ucard-top">
                        <div class="ucard-names">
                            <span class="usuario-nombre">${user.nombre}</span>
                            <span class="usuario-username">@${user.username}</span>
                            ${rolBadge}
                        </div>
                        <div class="ucard-status">${statusBadge}</div>
                    </div>
                    <div class="ucard-actions">
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
                </div>
            </div>`;
        }).join('');
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

    window.abrirModalNuevoUsuario = function() {
		const form = document.getElementById('usuarioForm');
		if (form) form.reset();
		const rolSelect = document.getElementById('usuarioRol');
		if (rolSelect) rolSelect.value = 'cajero';
		const activoSelect = document.getElementById('usuarioActivo');
		if (activoSelect) activoSelect.value = 'true';
		// Limpiar foto
		currentUserFotoFile = null;
		currentUserFotoUrl = '';
		const fotoInput = document.getElementById('usuarioFoto');
		if (fotoInput) fotoInput.value = '';
		const urlInput = document.getElementById('usuarioFotoUrl');
		if (urlInput) urlInput.value = '';
		const previewDiv = document.getElementById('usuarioFotoPreview');
		if (previewDiv) previewDiv.style.display = 'none';
		const modalTitle = document.getElementById('usuarioModalTitle');
		if (modalTitle) modalTitle.textContent = 'Nuevo Cajero/Admin';
		window.usuarioEditandoId = null;
		const modal = document.getElementById('usuarioModal');
		if (modal) modal.classList.add('active');
	};

	window.editarUsuario = function(id) {
		const user = window.usuarios.find(u => u.id === id);
		if (!user) return;
		window.usuarioEditandoId = id;
		const modalTitle = document.getElementById('usuarioModalTitle');
		if (modalTitle) modalTitle.textContent = 'Editar Usuario';
		const nombreInput = document.getElementById('usuarioNombre');
		if (nombreInput) nombreInput.value = user.nombre || '';
		const usernameInput = document.getElementById('usuarioUsername');
		if (usernameInput) usernameInput.value = user.username || '';
		const rolSelect = document.getElementById('usuarioRol');
		if (rolSelect) rolSelect.value = user.rol || 'cajero';
		const activoSelect = document.getElementById('usuarioActivo');
		if (activoSelect) activoSelect.value = user.activo ? 'true' : 'false';
		const passwordInput = document.getElementById('usuarioPassword');
		if (passwordInput) passwordInput.value = '';
		if (user.foto) {
			const urlInput = document.getElementById('usuarioFotoUrl');
			if (urlInput) urlInput.value = user.foto;
			const previewImg = document.getElementById('usuarioPreviewImg');
			if (previewImg) previewImg.src = user.foto;
			const previewDiv = document.getElementById('usuarioFotoPreview');
			if (previewDiv) previewDiv.style.display = 'flex';
			currentUserFotoUrl = user.foto;
		} else {
			const urlInput = document.getElementById('usuarioFotoUrl');
			if (urlInput) urlInput.value = '';
			const previewDiv = document.getElementById('usuarioFotoPreview');
			if (previewDiv) previewDiv.style.display = 'none';
		}
		const modal = document.getElementById('usuarioModal');
		if (modal) modal.classList.add('active');
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
		window.mostrarConfirmacionPremium(
			'Eliminar Usuario',
			`¿Estás seguro de eliminar al usuario "${user.nombre}"? Esta acción no se puede deshacer.`,
			async () => {
				try {
					await window.supabaseClient.from('usuarios').delete().eq('id', userId);
					await window.cargarUsuarios();
					window.mostrarToast('🗑️ Usuario eliminado', 'success');
				} catch (e) {
					console.error('Error eliminando usuario:', e);
					window.mostrarToast('❌ Error al eliminar usuario', 'error');
				}
			}
		);
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