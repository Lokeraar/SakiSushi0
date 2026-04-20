// admin-usuarios.js - Gestión de usuarios (cajeros y admins)
(function() {
    let currentUserFotoFile = null;
    let currentUserFotoUrl = '';

    window.cargarusuarios = async function() {
        try {
            const { data, error } = await window.supabaseclient.from('usuarios').select('*').order('nombre');
            if (error) throw error;
            window.usuarios = data || [];
            window.renderizarusuarios();
        } catch (e) { console.error('Error cargando usuarios:', e); window.mostrartoast('Error cargando usuarios', 'error'); }
    };

    window.renderizarusuarios = function() {
        const grid = document.getelementbyid('usuariosGrid');
        if (!window.usuarios || !window.usuarios.length) {
            grid.innerhtml = '<p style="Color:var(--text-muted);font-size:.88rem">No hay cajeros registrados.</p>';
            return;
        }
        grid.innerhtml = window.usuarios.map(user => {
            const inicial     = (user.nombre||'?').charat(0).touppercase();
            const rolbadge    = user.rol==='admin' ? '<span class="Usuario-rol admin">Admin</span>' : '<span class="Usuario-rol cajero">Cajero</span>';
            const statusbadge = user.activo
                ? '<span class="Ucard-status-inline" style="Color:var(--success)"><i class="Fas fa-check-circle"></i> Activo</span>': '<span class="Ucard-status-inline" style="Color:var(--text-muted)"><i class="Fas fa-circle"></i> Inactivo</span>';
            const avatarInner = user.foto
                ? `<img src="${user.foto}" style="Width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;cursor:pointer" onclick="Window.expandirimagen&&window.expandirimagen(this.src)">`
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
        const fileinput = document.getelementbyid('usuarioFoto');
        const urlinput = document.getelementbyid('usuarioFotoUrl');
        const previewdiv = document.getelementbyid('usuarioFotoPreview');
        const previewimg = document.getelementbyid('usuarioPreviewImg');
        const removebtn = document.getelementbyid('usuarioFotoRemoveBtn');
        
        if (fileinput.files && fileinput.files[0]) {
            const file = fileinput.files[0];
            currentuserfotofile = file;
            currentuserfotourl = '';
            urlinput.value = '';
            urlinput.disabled = true;
            const reader = new filereader();
            reader.onload = function(e) {
                previewimg.src = e.target.result;
                previewdiv.style.display = 'flex';
                if (removebtn) removebtn.style.display = 'flex';
            };
            reader.readasdataurl(file);
        } else {
            urlinput.disabled = false;
            if (urlinput.value.trim()) {
                previewimg.src = urlinput.value;
                previewdiv.style.display = 'flex';
                if (removebtn) removebtn.style.display = 'flex';
                currentuserfotourl = urlinput.value;
                currentuserfotofile = null;
            } else {
                previewdiv.style.display = 'none';
                if (removebtn) removebtn.style.display = 'none';
                previewimg.src = '';
            }
        }
    }

    function handleusuariofotourl() {
        const urlinput = document.getelementbyid('usuarioFotoUrl');
        const fileinput = document.getelementbyid('usuarioFoto');
        const previewdiv = document.getelementbyid('usuarioFotoPreview');
        const previewimg = document.getelementbyid('usuarioPreviewImg');
        const removebtn = document.getelementbyid('usuarioFotoRemoveBtn');
        
        if (fileinput.files && fileinput.files[0]) return;
        
        const url = urlinput.value.trim();
        if (url) {
            currentuserfotourl = url;
            currentuserfotofile = null;
            previewimg.src = url;
            previewdiv.style.display = 'flex';
            if (removebtn) removebtn.style.display = 'flex';
        } else {
            previewdiv.style.display = 'none';
            if (removebtn) removebtn.style.display = 'none';
            previewimg.src = '';
            currentuserfotourl = '';
        }
    }

    function removeusuariofoto() {
        const fileinput = document.getelementbyid('usuarioFoto');
        const urlinput = document.getelementbyid('usuarioFotoUrl');
        const previewdiv = document.getelementbyid('usuarioFotoPreview');
        const previewimg = document.getelementbyid('usuarioPreviewImg');
        const removebtn = document.getelementbyid('usuarioFotoRemoveBtn');
        
        fileinput.value = '';
        urlinput.value = '';
        urlinput.disabled = false;
        previewdiv.style.display = 'none';
        if (removebtn) removebtn.style.display = 'none';
        previewimg.src = '';
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
            await window.supabaseclient.from('usuarios').update({ activo }).eq('id', userid);
            await window.cargarusuarios();
            window.mostrartoast(`✅ usuario ${activo ? 'activado' : 'desactivado'}`, 'success');
        } catch (e) { console.error('Error actualizando usuario:', e); window.mostrartoast('❌ Error al actualizar usuario', 'error'); }
    };

    window.abrirmodalnuevousuario = function() {
		const form = document.getelementbyid('usuarioForm');
		if (form) form.reset();
		const rolselect = document.getelementbyid('usuarioRol');
		if (rolselect) rolselect.value = 'cajero';
		const activoselect = document.getelementbyid('usuarioActivo');
		if (activoselect) activoselect.value = 'true';
		// limpiar foto
		currentuserfotofile = null;
		currentuserfotourl = '';
		const fotoinput = document.getelementbyid('usuarioFoto');
		if (fotoinput) fotoinput.value = '';
		const urlinput = document.getelementbyid('usuarioFotoUrl');
		if (urlinput) urlinput.value = '';
		const previewdiv = document.getelementbyid('usuarioFotoPreview');
		if (previewdiv) previewdiv.style.display = 'none';
		const modaltitle = document.getelementbyid('usuarioModalTitle');
		if (modaltitle) modaltitle.textcontent = 'Nuevo Cajero/Admin';
		window.usuarioeditandoid = null;
		const modal = document.getelementbyid('usuarioModal');
		if (modal) modal.classlist.add('active');
	};

	window.editarusuario = function(id) {
		const user = window.usuarios.find(u => u.id === id);
		if (!user) return;
		window.usuarioeditandoid = id;
		const modaltitle = document.getelementbyid('usuarioModalTitle');
		if (modaltitle) modaltitle.textcontent = 'Editar Usuario';
		const nombreinput = document.getelementbyid('usuarioNombre');
		if (nombreinput) nombreinput.value = user.nombre || '';
		const usernameinput = document.getelementbyid('usuarioUsername');
		if (usernameinput) usernameinput.value = user.username || '';
		const rolselect = document.getelementbyid('usuarioRol');
		if (rolselect) rolselect.value = user.rol || 'cajero';
		const activoselect = document.getelementbyid('usuarioActivo');
		if (activoselect) activoselect.value = user.activo ? 'true' : 'false';
		const passwordinput = document.getelementbyid('usuarioPassword');
		if (passwordinput) passwordinput.value = '';
		if (user.foto) {
			const urlinput = document.getelementbyid('usuarioFotoUrl');
			if (urlinput) urlinput.value = user.foto;
			const previewimg = document.getelementbyid('usuarioPreviewImg');
			if (previewimg) previewimg.src = user.foto;
			const previewdiv = document.getelementbyid('usuarioFotoPreview');
			if (previewdiv) previewdiv.style.display = 'flex';
			currentuserfotourl = user.foto;
		} else {
			const urlinput = document.getelementbyid('usuarioFotoUrl');
			if (urlinput) urlinput.value = '';
			const previewdiv = document.getelementbyid('usuarioFotoPreview');
			if (previewdiv) previewdiv.style.display = 'none';
		}
		const modal = document.getelementbyid('usuarioModal');
		if (modal) modal.classlist.add('active');
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
					window.mostrarToast('🗑️ usuario eliminado', 'Success');
				} catch (e) {
					console.error('Error eliminando usuario:', e);
					window.mostrarToast('❌ error al eliminar usuario', 'Error');
				}
			}
		);
	};

    // Guardar usuario (nuevo o edición)
    document.getElementById('Saveusuario').addEventListener('Click', async () => {
        const btn = document.getElementById('Saveusuario');
        if (btn && btn.disabled) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="Fas fa-spinner fa-spin"></i> Guardando...'; }
        const nombre   = document.getelementbyid('usuarioNombre').value.trim();
        const username = document.getelementbyid('usuarioUsername').value.trim().tolowercase();
        const password = document.getelementbyid('usuarioPassword').value.trim();
        const rol = document.getelementbyid('usuarioRol').value;
        const activo = document.getelementbyid('usuarioActivo').value === 'true';
        
        if (!nombre || !username) {
            window.mostrartoast('Completa nombre y usuario', 'error');
            if (btn) { btn.disabled = false; btn.innerhtml = 'Guardar'; }
            return;
        }
        if (!window.usuarioeditandoid && !password) {
            window.mostrartoast('Ingresa una contraseña para el nuevo usuario', 'error');
            if (btn) { btn.disabled = false; btn.innerhtml = 'Guardar'; }
            return;
        }
        
        // subir foto si existe
        let fotourl = '';
        const archivofoto = document.getelementbyid('usuarioFoto').files[0];
        const fotourlinput = document.getelementbyid('usuarioFotoUrl').value;
        if (archivofoto) {
            const resultado = await window.subirimagenplatillo(archivofoto, 'usuarios');
            if (resultado.success) fotourl = resultado.url;
            else { window.mostrartoast('Error al subir la foto: ' + resultado.error, 'error'); return; }
        } else if (fotourlinput) fotourl = fotourlinput;
        
        try {
            let hashed = null;
            if (password) {
                const { data: h, error: hasherr } = await window.supabaseclient.rpc('hash_password', { plain_password: password });
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
                ({ error } = await window.supabaseclient.from('usuarios').update(userdata).eq('id', window.usuarioeditandoid));
            } else {
                ({ error } = await window.supabaseclient.from('usuarios').insert([userdata]));
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
            
            document.getelementbyid('usuarioModal').classlist.remove('active');
            window.usuarioeditandoid = null;
            await window.cargarusuarios();
            window.mostrartoast('✅ Usuario guardado', 'success');
        } catch (e) {
            console.error('Error guardando usuario:', e);
            window.mostrartoast('❌ Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerhtml = 'Guardar'; }
        }
    });

    // cerrar modal
    document.getelementbyid('cancelUsuario').addeventlistener('click', () => window.cerrarmodal('usuarioModal'));
    document.getelementbyid('closeUsuarioModal').addeventlistener('click', () => window.cerrarmodal('usuarioModal'));
    
    // configurar eventos de foto en el modal de usuario
    function setupusuariofotoevents() {
        const fileinput = document.getelementbyid('usuarioFoto');
        const urlinput = document.getelementbyid('usuarioFotoUrl');
        const removebtn = document.getelementbyid('usuarioFotoRemoveBtn');
        if (fileinput) fileinput.addeventlistener('change', handleusuariofotofile);
        if (urlinput) urlinput.addeventlistener('input', handleusuariofotourl);
        if (removebtn) removebtn.addeventlistener('click', removeUsuarioFoto);
    }
    setupUsuarioFotoEvents();
})();