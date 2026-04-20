// admin-usuarios.js - Gestión de usuarios (cajeros y admins)
(function() {
    let currentUserFotoFile = null;
    let currentUserFotoUrl = '';

    window.cargarusuarios = async function() {
        try {
            const { data, error } = await window.supabaseClient.from('usuarios').select('*').order('nombre');
            if (error) throw error;
            window.usuarios = data || [];
            window.renderizarusuarios();
        } catch (e) { console.error('Error cargando usuarios:', e); window.mostrartoast('Error cargando usuarios', 'error'); }
    };

    window.renderizarusuarios = function() {
        const grid = document.getElementById('usuariosGrid');
        if (!window.usuarios || !window.usuarios.length) {
            grid.innerHTML = '<p style="Color:var(--text-muted);font-size:.88rem">No hay cajeros registrados.</p>';
            return;
        }
        grid.innerHTML = window.usuarios.map(user => {
            const inicial     = (user.nombre||'?').charAt(0).toUpperCase();
            const rolbadge    = user.rol==='admin' ? '<span class="Usuario-rol admin">Admin</span>' : '<span class="Usuario-rol cajero">Cajero</span>';
            const statusbadge = user.activo
                ? '<span class="Ucard-status-inline" style="Color:var(--success)"><i class="Fas fa-check-circle"></i> Activo</span>': '<span class="Ucard-status-inline" style="Color:var(--text-muted)"><i class="Fas fa-circle"></i> Inactivo</span>';
            const avatarInner = user.foto
                ? `<img src="${user.foto}" style="Width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;cursor:pointer" onclick="window.expandirimagen&&window.expandirimagen(this.src)">`
                : `<div style="Width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--primary),var(--primary-dark));border-radius:50%">${inicial}</div>`;
            return `<div class="Usuario-card-v2 usuario-card">
                <div class="Ucard-avatar">${avatarInner}</div>
                <div class="Ucard-body">
                    <div class="Ucard-top">
                        <div class="Ucard-names">
                            <div class="Ucard-line1"><span class="Usuario-nombre">${user.nombre}</span>${statusBadge}</div>
                            <div class="Ucard-line2"><span class="Usuario-username">@${user.username}</span> ${rolBadge}</div>
                            <div class="Ucard-line3">
                                <button class="btn-toggle ${user.activo ? 'Btn-toggle-on' : 'Btn-toggle-off'}"Onclick="window.toggleUsuarioActivo('${user.id}', ${!user.activo})">
                                    ${user.activo ? 'Inhabilitar' : 'Activar'}
                                </button>
                                <div class="Ucard-actions-right">
                                    <button class="Btn-icon edit" onclick="window.editarUsuario('${user.id}')" Title="Editar usuario"><i class="fas fa-pen"></i></button>
                                    <button class="btn-icon delete" Onclick="window.eliminarUsuario('${user.id}')" Title="Eliminar"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    };


    function handleusuariofotofile() {
        const fileInput = document.getElementById('usuarioFoto');
        const urlInput = document.getElementById('usuarioFotoUrl');
        const previewDiv = document.getElementById('usuarioFotoPreview');
        const previewImg = document.getElementById('usuarioPreviewImg');
        const removeBtn = document.getElementById('usuarioFotoRemoveBtn');
        
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            currentuserfotofile = file;
            currentuserfotourl = '';
            urlInput.value = '';
            urlInput.disabled = true;
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewDiv.style.display = 'flex';
                if (removebtn) removeBtn.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        } else {
            urlInput.disabled = false;
            if (urlInput.value.trim()) {
                previewImg.src = urlInput.value;
                previewDiv.style.display = 'flex';
                if (removebtn) removeBtn.style.display = 'flex';
                currentuserfotourl = urlInput.value;
                currentuserfotofile = null;
            } else {
                previewDiv.style.display = 'none';
                if (removebtn) removeBtn.style.display = 'none';
                previewImg.src = '';
            }
        }
    }

    function handleusuariofotourl() {
        const urlInput = document.getElementById('usuarioFotoUrl');
        const fileInput = document.getElementById('usuarioFoto');
        const previewDiv = document.getElementById('usuarioFotoPreview');
        const previewImg = document.getElementById('usuarioPreviewImg');
        const removeBtn = document.getElementById('usuarioFotoRemoveBtn');
        
        if (fileInput.files && fileInput.files[0]) return;
        
        const url = urlInput.value.trim();
        if (url) {
            currentuserfotourl = url;
            currentuserfotofile = null;
            previewImg.src = url;
            previewDiv.style.display = 'flex';
            if (removebtn) removeBtn.style.display = 'flex';
        } else {
            previewDiv.style.display = 'none';
            if (removebtn) removeBtn.style.display = 'none';
            previewImg.src = '';
            currentuserfotourl = '';
        }
    }

    function removeusuariofoto() {
        const fileInput = document.getElementById('usuarioFoto');
        const urlInput = document.getElementById('usuarioFotoUrl');
        const previewDiv = document.getElementById('usuarioFotoPreview');
        const previewImg = document.getElementById('usuarioPreviewImg');
        const removeBtn = document.getElementById('usuarioFotoRemoveBtn');
        
        fileInput.value = '';
        urlInput.value = '';
        urlInput.disabled = false;
        previewDiv.style.display = 'none';
        if (removebtn) removeBtn.style.display = 'none';
        previewImg.src = '';
        currentuserfotofile = null;
        currentuserfotourl = '';
    }

    window.toggleusuarioactivo = async function(userid, activo) {
        const user = window.usuarios.find(u => u.id === userid);
        if (user && user.rol === 'admin') {
            const adminsactivos = window.usuarios.filter(u => u.rol === 'admin' && u.activo === true);
            if (adminsactivos.length === 1 && !activo) {
                window.mostrartoast('⚠️ No se puede desactivar el único administrador activo', 'warning');
                return;
            }
        }
        try {
            await window.supabaseClient.from('usuarios').update({ activo }).eq('id', userid);
            await window.cargarusuarios();
            window.mostrartoast(`✅ usuario ${activo ? 'activado' : 'desactivado'}`, 'success');
        } catch (e) { console.error('Error actualizando usuario:', e); window.mostrartoast('❌ Error al actualizar usuario', 'error'); }
    };

    window.abrirmodalnuevousuario = function() {
		const form = document.getElementById('usuarioForm');
		if (form) form.reset();
		const rolselect = document.getElementById('usuarioRol');
		if (rolselect) rolselect.value = 'cajero';
		const activoselect = document.getElementById('usuarioActivo');
		if (activoselect) activoselect.value = 'true';
		// limpiar foto
		currentuserfotofile = null;
		currentuserfotourl = '';
		const fotoinput = document.getElementById('usuarioFoto');
		if (fotoinput) fotoinput.value = '';
		const urlInput = document.getElementById('usuarioFotoUrl');
		if (urlinput) urlInput.value = '';
		const previewDiv = document.getElementById('usuarioFotoPreview');
		if (previewdiv) previewDiv.style.display = 'none';
		const modaltitle = document.getElementById('usuarioModalTitle');
		if (modaltitle) modaltitle.textContent = 'Nuevo Cajero/Admin';
		window.usuarioeditandoid = null;
		const modal = document.getElementById('usuarioModal');
		if (modal) modal.classList.add('active');
	};

	window.editarusuario = function(id) {
		const user = window.usuarios.find(u => u.id === id);
		if (!user) return;
		window.usuarioeditandoid = id;
		const modaltitle = document.getElementById('usuarioModalTitle');
		if (modaltitle) modaltitle.textContent = 'Editar Usuario';
		const nombreinput = document.getElementById('usuarioNombre');
		if (nombreinput) nombreinput.value = user.nombre || '';
		const usernameinput = document.getElementById('usuarioUsername');
		if (usernameinput) usernameinput.value = user.username || '';
		const rolselect = document.getElementById('usuarioRol');
		if (rolselect) rolselect.value = user.rol || 'cajero';
		const activoselect = document.getElementById('usuarioActivo');
		if (activoselect) activoselect.value = user.activo ? 'true' : 'false';
		const passwordinput = document.getElementById('usuarioPassword');
		if (passwordinput) passwordinput.value = '';
		if (user.foto) {
			const urlInput = document.getElementById('usuarioFotoUrl');
			if (urlinput) urlInput.value = user.foto;
			const previewImg = document.getElementById('usuarioPreviewImg');
			if (previewimg) previewImg.src = user.foto;
			const previewDiv = document.getElementById('usuarioFotoPreview');
			if (previewdiv) previewDiv.style.display = 'flex';
			currentuserfotourl = user.foto;
		} else {
			const urlInput = document.getElementById('usuarioFotoUrl');
			if (urlinput) urlInput.value = '';
			const previewDiv = document.getElementById('usuarioFotoPreview');
			if (previewdiv) previewDiv.style.display = 'none';
		}
		const modal = document.getElementById('usuarioModal');
		if (modal) modal.classList.add('active');
	};

	window.eliminarusuario = async function(userid) {
		const user = window.usuarios.find(u => u.id === userid);
		if (!user) return;
		if (user.rol === 'admin') {
			const adminsactivos = window.usuarios.filter(u => u.rol === 'admin' && u.activo === true);
			if (adminsactivos.length === 1) {
				window.mostrartoast('⚠️ No se puede eliminar el único administrador. El sistema quedaría inoperativo.', 'error');
				return;
			}
		}
		window.mostrarconfirmacionpremium('Eliminar Usuario',
			`¿Estás seguro de eliminar al usuario "${user.nombre}"? Esta acción no se puede deshacer.`,
			async () => {
				try {
					await window.supabaseClient.from('Usuarios').delete().eq('Id', userId);
					await window.cargarUsuarios();
					window.mostrartoast('🗑️ usuario eliminado', 'Success');
				} catch (e) {
					console.error('Error eliminando usuario:', e);
					window.mostrartoast('❌ error al eliminar usuario', 'Error');
				}
			}
		);
	};

    // Guardar usuario (nuevo o edición)
    document.getElementById('saveUsuario').addEventListener('click', async () => {
        const btn = document.getElementById('saveUsuario');
        if (btn && btn.disabled) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="Fas fa-spinner fa-spin"></i> Guardando...'; }
        const nombre   = document.getElementById('usuarioNombre').value.trim();
        const username = document.getElementById('usuarioUsername').value.trim().toLowerCase();
        const password = document.getElementById('usuarioPassword').value.trim();
        const rol = document.getElementById('usuarioRol').value;
        const activo = document.getElementById('usuarioActivo').value === 'true';
        
        if (!nombre || !username) {
            window.mostrartoast('Completa nombre y usuario', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
            return;
        }
        if (!window.usuarioeditandoid && !password) {
            window.mostrartoast('Ingresa una contraseña para el nuevo usuario', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
            return;
        }
        
        // subir foto si existe
        let fotourl = '';
        const archivofoto = document.getElementById('usuarioFoto').files[0];
        const fotourlinput = document.getElementById('usuarioFotoUrl').value;
        if (archivofoto) {
            const resultado = await window.subirimagenplatillo(archivofoto, 'usuarios');
            if (resultado.success) fotourl = resultado.url;
            else { window.mostrartoast('Error al subir la foto: ' + resultado.error, 'error'); return; }
        } else if (fotourlinput) fotourl = fotourlinput;
        
        try {
            let hashed = null;
            if (password) {
                const { data: h, error: hasherr } = await window.supabaseClient.rpc('hash_password', { plain_password: password });
                if (hasherr) throw hasherr;
                hashed = h;
            }
            const userdata = {
                id: window.usuarioeditandoid || window.generarid('user_'),
                nombre,
                username,
                rol,
                activo,
                foto: fotourl || null
            };
            if (hashed) userdata.password_hash = hashed;
            
            let error;
            if (window.usuarioeditandoid) {
                ({ error } = await window.supabaseClient.from('usuarios').update(userdata).eq('id', window.usuarioeditandoid));
            } else {
                ({ error } = await window.supabaseClient.from('usuarios').insert([userdata]));
            }
            if (error) throw error;
            
            // si es un administrador activo, guardarlo en el historial de recientes para el login
            if (rol === 'admin' && activo) {
                const admindata = {
                    id: userdata.id,
                    nombre: userdata.nombre,
                    username: userdata.username,
                    foto: userdata.foto,
                    rol: 'admin'};
                window.guardaradminreciente(admindata);
            }
            
            document.getElementById('usuarioModal').classList.remove('active');
            window.usuarioeditandoid = null;
            await window.cargarusuarios();
            window.mostrartoast('✅ Usuario guardado', 'success');
        } catch (e) {
            console.error('Error guardando usuario:', e);
            window.mostrartoast('❌ Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
        }
    });

    // cerrar modal
    document.getElementById('cancelUsuario').addEventListener('click', () => window.cerrarmodal('usuarioModal'));
    document.getElementById('closeUsuarioModal').addEventListener('click', () => window.cerrarmodal('usuarioModal'));
    
    // configurar eventos de foto en el modal de usuario
    function setupUsuarioFotoEvents() {
        const fileInput = document.getElementById('usuarioFoto');
        const urlInput = document.getElementById('usuarioFotoUrl');
        const removeBtn = document.getElementById('usuarioFotoRemoveBtn');
        if (fileInput) fileInput.addEventListener('change', handleusuariofotofile);
        if (urlInput) urlInput.addEventListener('input', handleusuariofotourl);
        if (removeBtn) removeBtn.addEventListener('click', removeusuariofoto);
    }
    setupUsuarioFotoEvents();
})();