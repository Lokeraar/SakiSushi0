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
    if (!grid) return;
    
    if (!window.usuarios || !window.usuarios.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;text-align:center;padding:2rem;">No hay cajeros registrados.</p>';
        return;
    }

    grid.innerHTML = window.usuarios.map(user => {
        const inicial = (user.nombre || '?').charAt(0).toUpperCase();
        const avatarInner = user.foto
            ? `<img src="${user.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;cursor:pointer;" onclick="window.expandirImagen && window.expandirImagen(this.src)">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--info),#1565c0);border-radius:50%;">${inicial}</div>`;
        
        const statusClass = user.activo ? 'status-activo' : 'status-inactivo';
        const statusText = user.activo ? 'Activo' : 'Inactivo';
        const toggleClass = user.activo ? 'btn-toggle-on' : 'btn-toggle-off';
        const toggleTxt = user.activo ? 'Inhabilitar' : 'Activar';
        const toggleVal = String(!user.activo);

        return `
        <div class="usuario-card-v2" style="display:grid; grid-template-columns: 64px 1fr auto; grid-template-rows: auto auto auto; gap: 8px 12px; align-items: center; background: var(--card-bg); border-radius: 14px; padding: 12px 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); border-left: 4px solid var(--info); transition: var(--transition);">
            <!-- Izquierda: Foto (ocupa las 3 líneas) -->
            <div style="grid-row: 1 / 4; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--secondary);">
                ${avatarInner}
            </div>

            <!-- Centro Línea 1: Nombre -->
            <div style="grid-column: 2; grid-row: 1; font-weight: 700; font-size: 0.95rem; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${user.nombre}
            </div>

            <!-- Centro Línea 2: Monto (En usuarios se muestra el rol como referencia) -->
            <div style="grid-column: 2; grid-row: 2; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                <span class="usuario-rol ${user.rol}" style="display:inline-block; font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; padding:2px 8px; border-radius:20px; ${user.rol==='admin' ? 'background:#fff3e0;color:var(--warning);' : 'background:#e3f2fd;color:var(--info);'}">
                    ${user.rol === 'admin' ? 'Admin' : 'Cajero'}
                </span>
                <span style="opacity:0.6;">@${user.username}</span>
            </div>

            <!-- Centro Línea 3: Toggle (Se omite Pagado) -->
            <div style="grid-column: 2; grid-row: 3; display: flex; gap: 6px; align-items: center;">
                <button class="btn-toggle ${toggleClass}" onclick="window.toggleUsuarioActivo('${user.id}', ${toggleVal})">${toggleTxt}</button>
            </div>

            <!-- Derecha Línea 1: Estado -->
            <div style="grid-column: 3; grid-row: 1; justify-self: end;">
                <span class="${statusClass}"><i class="fas ${user.activo ? 'fa-check-circle' : 'fa-circle'}"></i> ${statusText}</span>
            </div>

            <!-- Derecha Línea 2: (Vacío) -->
            <div style="grid-column: 3; grid-row: 2;"></div>

            <!-- Derecha Línea 3: Editar y Papelera -->
            <div style="grid-column: 3; grid-row: 3; justify-self: end; display: flex; gap: 6px;">
                <button class="btn-icon edit" onclick="window.editarUsuario('${user.id}')" title="Editar usuario"><i class="fas fa-pen"></i></button>
                <button class="btn-icon delete" onclick="window.eliminarUsuario('${user.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
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
            nombre, username, rol, activo, foto: fotoUrl || null
        };
        if (hashed) userData.password_hash = hashed;
        
        let error;
        if (window.usuarioEditandoId) {
            ({ error } = await window.supabaseClient.from('usuarios').update(userData).eq('id', window.usuarioEditandoId));
        } else {
            ({ error } = await window.supabaseClient.from('usuarios').insert([userData]));
        }
        if (error) throw error;
        
        if (rol === 'admin' && activo) {
            const adminData = { id: userData.id, nombre: userData.nombre, username: userData.username, foto: userData.foto, rol: 'admin' };
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

document.getElementById('cancelUsuario').addEventListener('click', () => document.getElementById('usuarioModal').classList.remove('active'));
document.getElementById('closeUsuarioModal').addEventListener('click', () => document.getElementById('usuarioModal').classList.remove('active'));

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
