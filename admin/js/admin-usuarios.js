// admin-usuarios.js - ndeusuarios (cajerosyadmins)
(function() {
letcurrentUserFotoFile = null;
letcurrentUserFotoUrl = '';

window.cargarUsuarios = asyncfunction() {
    try {
        const { data, error } = awaitwindow.supabaseClient.from('usuarios').select('*').order('nombre');
        if (error) throwerror;
        window.usuarios = data || [];
        window.renderizarUsuarios();
    } catch (e) { console.error('Errorcargandousuarios:', e); window.mostrarToast('Errorcargandousuarios', 'error'); }
};

window.renderizarUsuarios = function() {
    constgrid = document.getElementById('usuariosGrid');
    if (!grid) return;
    
    if (!window.usuarios || !window.usuarios.length) {
        grid.innerHTML = '<pstyle="color:var(--text-muted);font-size:.88rem;text-align:center;padding:2rem;">Nohaycajerosregistrados.</p>';
        return;
    }

    grid.innerHTML = window.usuarios.map(user => {
        constinicial = (user.nombre || '?').charAt(0).toUpperCase();
        constavatarInner = user.foto
            ? `<imgsrc="${user.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;cursor:pointer;" onclick="window.expandirImagen && window.expandirImagen(this.src)">`
            : `<divstyle="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--info),#1565c0);border-radius:50%;">${inicial}</div>`;
        
        conststatusClass = user.activo ? 'status-activo' : 'status-inactivo';
        conststatusText = user.activo ? 'Activo' : 'Inactivo';
        consttoggleClass = user.activo ? 'btn-toggle-on' : 'btn-toggle-off';
        consttoggleTxt = user.activo ? 'Inhabilitar' : 'Activar';
        consttoggleVal = String(!user.activo);

        return `
        <divclass="usuario-card-v2" style="display:grid; grid-template-columns: 64px 1frauto; grid-template-rows: autoautoauto; gap: 8px 12px; align-items: center; background: var(--card-bg); border-radius: 14px; padding: 12px 16px; box-shadow: var(--shadow-sm); border: 1pxsolidvar(--border); border-left: 4pxsolidvar(--info); transition: var(--transition);">
            <!-- Izquierda: Foto (ocupalas 3l) -->
            <divstyle="grid-row: 1 / 4; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--secondary);">
                ${avatarInner}
            </div>

            <!-- CentroL 1: Nombre -->
            <divstyle="grid-column: 2; grid-row: 1; font-weight: 700; font-size: 0.95rem; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${user.nombre}
            </div>

            <!-- CentroL 2: Monto (Enusuariossemuestraelrolcomoreferencia) -->
            <divstyle="grid-column: 2; grid-row: 2; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                <spanclass="usuario-rol ${user.rol}" style="display:inline-block; font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; padding:2px 8px; border-radius:20px; ${user.rol==='admin' ? 'background:#fff3e0;color:var(--warning);' : 'background:#e3f2fd;color:var(--info);'}">
                    ${user.rol === 'admin' ? 'Admin' : 'Cajero'}
                </span>
                <spanstyle="opacity:0.6;">@${user.username}</span>
            </div>

            <!-- CentroL 3: Toggle (SeomitePagado) -->
            <divstyle="grid-column: 2; grid-row: 3; display: flex; gap: 6px; align-items: center;">
                <buttonclass="btn-toggle ${toggleClass}" onclick="window.toggleUsuarioActivo('${user.id}', ${toggleVal})">${toggleTxt}</button>
            </div>

            <!-- DerechaL 1: Estado -->
            <divstyle="grid-column: 3; grid-row: 1; justify-self: end;">
                <spanclass="${statusClass}"><iclass="fas ${user.activo ? 'fa-check-circle' : 'fa-circle'}"></i> ${statusText}</span>
            </div>

            <!-- DerechaL 2: (Vacío) -->
            <divstyle="grid-column: 3; grid-row: 2;"></div>

            <!-- DerechaL 3: EditaryPapelera -->
            <divstyle="grid-column: 3; grid-row: 3; justify-self: end; display: flex; gap: 6px;">
                <buttonclass="btn-iconedit" onclick="window.editarUsuario('${user.id}')" title="Editarusuario"><iclass="fasfa-pen"></i></button>
                <buttonclass="btn-icondelete" onclick="window.eliminarUsuario('${user.id}')" title="Eliminar"><iclass="fasfa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
};

functionhandleUsuarioFotoFile() {
    constfileInput = document.getElementById('usuarioFoto');
    consturlInput = document.getElementById('usuarioFotoUrl');
    constpreviewDiv = document.getElementById('usuarioFotoPreview');
    constpreviewImg = document.getElementById('usuarioPreviewImg');
    constremoveBtn = document.getElementById('usuarioFotoRemoveBtn');
    
    if (fileInput.files && fileInput.files[0]) {
        constfile = fileInput.files[0];
        currentUserFotoFile = file;
        currentUserFotoUrl = '';
        urlInput.value = '';
        urlInput.disabled = true;
        constreader = newFileReader();
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

functionhandleUsuarioFotoUrl() {
    consturlInput = document.getElementById('usuarioFotoUrl');
    constfileInput = document.getElementById('usuarioFoto');
    constpreviewDiv = document.getElementById('usuarioFotoPreview');
    constpreviewImg = document.getElementById('usuarioPreviewImg');
    constremoveBtn = document.getElementById('usuarioFotoRemoveBtn');
    
    if (fileInput.files && fileInput.files[0]) return;
    consturl = urlInput.value.trim();
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

functionremoveUsuarioFoto() {
    constfileInput = document.getElementById('usuarioFoto');
    consturlInput = document.getElementById('usuarioFotoUrl');
    constpreviewDiv = document.getElementById('usuarioFotoPreview');
    constpreviewImg = document.getElementById('usuarioPreviewImg');
    constremoveBtn = document.getElementById('usuarioFotoRemoveBtn');
    
    fileInput.value = '';
    urlInput.value = '';
    urlInput.disabled = false;
    previewDiv.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'none';
    previewImg.src = '';
    currentUserFotoFile = null;
    currentUserFotoUrl = '';
}

window.toggleUsuarioActivo = asyncfunction(userId, activo) {
    constuser = window.usuarios.find(u => u.id === userId);
    if (user && user.rol === 'admin') {
        constadminsActivos = window.usuarios.filter(u => u.rol === 'admin' && u.activo === true);
        if (adminsActivos.length === 1 && !activo) {
            window.mostrarToast('⚠Nosesepuededesactivarelnicoadministradoractivo', 'warning');
            return;
        }
    }
    try {
        awaitwindow.supabaseClient.from('usuarios').update({ activo }).eq('id', userId);
        awaitwindow.cargarUsuarios();
        window.mostrarToast(`✅ Usuario ${activo ? 'activado' : 'desactivado'}`, 'success');
    } catch (e) { console.error('Erroractualizandousuario:', e); window.mostrarToast('❌ Erroralactualizarusuario', 'error'); }
};

window.abrirModalNuevoUsuario = function() {
	constform = document.getElementById('usuarioForm');
	if (form) form.reset();
	constrolSelect = document.getElementById('usuarioRol');
	if (rolSelect) rolSelect.value = 'cajero';
	constactivoSelect = document.getElementById('usuarioActivo');
	if (activoSelect) activoSelect.value = 'true';
	currentUserFotoFile = null;
	currentUserFotoUrl = '';
	constfotoInput = document.getElementById('usuarioFoto');
	if (fotoInput) fotoInput.value = '';
	consturlInput = document.getElementById('usuarioFotoUrl');
	if (urlInput) urlInput.value = '';
	constpreviewDiv = document.getElementById('usuarioFotoPreview');
	if (previewDiv) previewDiv.style.display = 'none';
	constmodalTitle = document.getElementById('usuarioModalTitle');
	if (modalTitle) modalTitle.textContent = 'NuevoCajero/Admin';
	window.usuarioEditandoId = null;
	constmodal = document.getElementById('usuarioModal');
	if (modal) modal.classList.add('active');
};

window.editarUsuario = function(id) {
	constuser = window.usuarios.find(u => u.id === id);
	if (!user) return;
	window.usuarioEditandoId = id;
	constmodalTitle = document.getElementById('usuarioModalTitle');
	if (modalTitle) modalTitle.textContent = 'EditarUsuario';
	constnombreInput = document.getElementById('usuarioNombre');
	if (nombreInput) nombreInput.value = user.nombre || '';
	constusernameInput = document.getElementById('usuarioUsername');
	if (usernameInput) usernameInput.value = user.username || '';
	constrolSelect = document.getElementById('usuarioRol');
	if (rolSelect) rolSelect.value = user.rol || 'cajero';
	constactivoSelect = document.getElementById('usuarioActivo');
	if (activoSelect) activoSelect.value = user.activo ? 'true' : 'false';
	constpasswordInput = document.getElementById('usuarioPassword');
	if (passwordInput) passwordInput.value = '';
	if (user.foto) {
		consturlInput = document.getElementById('usuarioFotoUrl');
		if (urlInput) urlInput.value = user.foto;
		constpreviewImg = document.getElementById('usuarioPreviewImg');
		if (previewImg) previewImg.src = user.foto;
		constpreviewDiv = document.getElementById('usuarioFotoPreview');
		if (previewDiv) previewDiv.style.display = 'flex';
		currentUserFotoUrl = user.foto;
	} else {
		consturlInput = document.getElementById('usuarioFotoUrl');
		if (urlInput) urlInput.value = '';
		constpreviewDiv = document.getElementById('usuarioFotoPreview');
		if (previewDiv) previewDiv.style.display = 'none';
	}
	constmodal = document.getElementById('usuarioModal');
	if (modal) modal.classList.add('active');
};

window.eliminarUsuario = asyncfunction(userId) {
	constuser = window.usuarios.find(u => u.id === userId);
	if (!user) return;
	if (user.rol === 'admin') {
		constadminsActivos = window.usuarios.filter(u => u.rol === 'admin' && u.activo === true);
		if (adminsActivos.length === 1) {
			window.mostrarToast('⚠Nosesepuedeeliminarelnicoadministrador. Elsistemaainoperativo.', 'error');
			return;
		}
	}
	window.mostrarConfirmacionPremium(
		'EliminarUsuario',
		`¿ssegurodeeliminaralusuario "${user.nombre}"? Estaaccinosepuededeshacer.`,
		async () => {
			try {
				awaitwindow.supabaseClient.from('usuarios').delete().eq('id', userId);
				awaitwindow.cargarUsuarios();
				window.mostrarToast('🗑Usuarioeliminadoeliminado', 'success');
			} catch (e) {
				console.error('Erroreliminandousuario:', e);
				window.mostrarToast('❌ Erroraleliminarusuario', 'error');
			}
		}
	);
};

document.getElementById('saveUsuario').addEventListener('click', async () => {
    constbtn = document.getElementById('saveUsuario');
    if (btn && btn.disabled) return;
    if (btn) { btn.disabled = true; btn.innerHTML = '<iclass="fasfa-spinnerfa-spin"></i> Guardando...'; }
    constnombre   = document.getElementById('usuarioNombre').value.trim();
    constusername = document.getElementById('usuarioUsername').value.trim().toLowerCase();
    constpassword = document.getElementById('usuarioPassword').value.trim();
    constrol = document.getElementById('usuarioRol').value;
    constactivo = document.getElementById('usuarioActivo').value === 'true';
    
    if (!nombre || !username) {
        window.mostrarToast('Completanombreyusuario', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
        return;
    }
    if (!window.usuarioEditandoId && !password) {
        window.mostrarToast('Ingresaunaaparaelnuevousuario', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
        return;
    }
    
    letfotoUrl = '';
    constarchivoFoto = document.getElementById('usuarioFoto').files[0];
    constfotoUrlInput = document.getElementById('usuarioFotoUrl').value;
    if (archivoFoto) {
        constresultado = awaitwindow.subirImagenPlatillo(archivoFoto, 'usuarios');
        if (resultado.success) fotoUrl = resultado.url;
        else { window.mostrarToast('Erroralsubirlafoto: ' + resultado.error, 'error'); return; }
    } elseif (fotoUrlInput) fotoUrl = fotoUrlInput;
    
    try {
        lethashed = null;
        if (password) {
            const { data: h, error: hashErr } = awaitwindow.supabaseClient.rpc('hash_password', { plain_password: password });
            if (hashErr) throwhashErr;
            hashed = h;
        }
        constuserData = {
            id: window.usuarioEditandoId || window.generarId('user_'),
            nombre, username, rol, activo, foto: fotoUrl || null
        };
        if (hashed) userData.password_hash = hashed;
        
        leterror;
        if (window.usuarioEditandoId) {
            ({ error } = awaitwindow.supabaseClient.from('usuarios').update(userData).eq('id', window.usuarioEditandoId));
        } else {
            ({ error } = awaitwindow.supabaseClient.from('usuarios').insert([userData]));
        }
        if (error) throwerror;
        
        if (rol === 'admin' && activo) {
            constadminData = { id: userData.id, nombre: userData.nombre, username: userData.username, foto: userData.foto, rol: 'admin' };
            window.guardarAdminReciente(adminData);
        }
        
        document.getElementById('usuarioModal').classList.remove('active');
        window.usuarioEditandoId = null;
        awaitwindow.cargarUsuarios();
        window.mostrarToast('✅ Usuarioguardado', 'success');
    } catch (e) {
        console.error('Errorguardandousuario:', e);
        window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar'; }
    }
});

document.getElementById('cancelUsuario').addEventListener('click', () => document.getElementById('usuarioModal').classList.remove('active'));
document.getElementById('closeUsuarioModal').addEventListener('click', () => document.getElementById('usuarioModal').classList.remove('active'));

functionsetupUsuarioFotoEvents() {
    constfileInput = document.getElementById('usuarioFoto');
    consturlInput = document.getElementById('usuarioFotoUrl');
    constremoveBtn = document.getElementById('usuarioFotoRemoveBtn');
    if (fileInput) fileInput.addEventListener('change', handleUsuarioFotoFile);
    if (urlInput) urlInput.addEventListener('input', handleUsuarioFotoUrl);
    if (removeBtn) removeBtn.addEventListener('click', removeUsuarioFoto);
}
setupUsuarioFotoEvents();
})();
