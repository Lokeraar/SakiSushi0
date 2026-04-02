// admin-delivery.js - Motorizados (deliverys), mesoneros, propinas
(function() {
    // Variables para fotos
    let currentDeliveryFotoFile = null;
    let currentDeliveryFotoUrl = '';
    let currentMesoneroFotoFile = null;
    let currentMesoneroFotoUrl = '';

    window.cargarMesoneros = async function() {
        try {
            const { data, error } = await window.supabaseClient.from('mesoneros').select('*').order('nombre');
            if (error) throw error;
            window.mesoneros = data || [];
            await window.renderizarMesoneros();
            window.renderizarPropinas();
        } catch (e) { console.error('Error cargando mesoneros:', e); }
    };

    window.renderizarMesoneros = async function() {
        const container = document.getElementById('mesonerosList');
        if (!container) return;
        if (!window.mesoneros || !window.mesoneros.length) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem">No hay mesoneros registrados.</p>';
            return;
        }
        let acumulados = {};
        try {
            const { data: allProp } = await window.supabaseClient.from('propinas').select('mesonero_id, monto_bs, entregado').eq('entregado', false);
            (allProp || []).forEach(p => { acumulados[p.mesonero_id] = (acumulados[p.mesonero_id] || 0) + (p.monto_bs || 0); });
        } catch(e) { console.error('Error obteniendo acumulado propinas:', e); }
        const sorted = [...window.mesoneros].sort((a, b) => a.nombre.localeCompare(b.nombre));
        container.innerHTML = sorted.map(m => {
            const inicial  = m.nombre.charAt(0).toUpperCase();
            const acum     = acumulados[m.id] || 0;
            const hayAcum  = acum > 0;
            const fotoHtml = m.foto ? `<img src="${m.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;margin-right:.5rem">` : `<div class="mesonero-avatar">${inicial}</div>`;
            return `<div class="mesonero-card">
                ${fotoHtml}
                <div style="flex:1;min-width:0">
                    <span class="mesonero-nombre">${m.nombre}</span>
                    <div style="font-size:.72rem;color:${hayAcum ? 'var(--propina)' : 'var(--text-muted)'};font-weight:${hayAcum ? '700' : '400'};margin-top:2px">
                        Propinas pendientes: ${window.formatBs(acum)}
                    </div>
                </div>
                ${m.activo ? '<span class="status-activo"><i class="fas fa-check-circle"></i> Activo</span>' : '<span class="status-inactivo"><i class="fas fa-circle"></i> Inactivo</span>'}
                <div class="mesonero-actions">
                    ${hayAcum ? `<button class="btn-sm" style="background:linear-gradient(135deg,var(--propina),#7B1FA2);color:#fff;white-space:nowrap"
                        onclick="window.pagarPropinaMesonero('${m.id}', '${m.nombre}', ${acum})">
                        <i class="fas fa-hand-holding-heart"></i> Pagar
                    </button>` : ''}
                    <button class="btn-icon edit" onclick="window.editarMesonero('${m.id}')" title="Editar mesonero">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-toggle ${m.activo ? 'btn-toggle-on' : 'btn-toggle-off'}"
                        onclick="window.toggleMesoneroActivo('${m.id}', ${!m.activo})">
                        ${m.activo ? 'Inhabilitar' : 'Activar'}
                    </button>
                    <button class="btn-icon delete" onclick="window.eliminarMesonero('${m.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    };

    window.editarMesonero = function(id) {
        const mesonero = window.mesoneros.find(m => m.id === id);
        if (!mesonero) return;
        window.mesoneroEditandoId = id;
        document.getElementById('mesoneroModalTitle').textContent = 'Editar Mesonero';
        document.getElementById('mesoneroNombre').value = mesonero.nombre || '';
        document.getElementById('mesoneroActivo').value = mesonero.activo ? 'true' : 'false';
        // Foto
        if (mesonero.foto) {
            document.getElementById('mesoneroFotoUrl').value = mesonero.foto;
            const previewImg = document.getElementById('mesoneroPreviewImg');
            if (previewImg) previewImg.src = mesonero.foto;
            const previewDiv = document.getElementById('mesoneroFotoPreview');
            if (previewDiv) previewDiv.style.display = 'flex';
            currentMesoneroFotoUrl = mesonero.foto;
        } else {
            document.getElementById('mesoneroFotoUrl').value = '';
            const previewDiv = document.getElementById('mesoneroFotoPreview');
            if (previewDiv) previewDiv.style.display = 'none';
        }
        document.getElementById('mesoneroModal').classList.add('active');
    };

    function handleMesoneroFotoFile() {
        const fileInput = document.getElementById('mesoneroFoto');
        const urlInput = document.getElementById('mesoneroFotoUrl');
        const previewDiv = document.getElementById('mesoneroFotoPreview');
        const previewImg = document.getElementById('mesoneroPreviewImg');
        const removeBtn = document.getElementById('mesoneroFotoRemoveBtn');
        if (!fileInput || !urlInput || !previewDiv) return;
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            currentMesoneroFotoFile = file;
            currentMesoneroFotoUrl = '';
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
                currentMesoneroFotoUrl = urlInput.value;
                currentMesoneroFotoFile = null;
            } else {
                previewDiv.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'none';
                previewImg.src = '';
            }
        }
    }

    function handleMesoneroFotoUrl() {
        const urlInput = document.getElementById('mesoneroFotoUrl');
        const fileInput = document.getElementById('mesoneroFoto');
        const previewDiv = document.getElementById('mesoneroFotoPreview');
        const previewImg = document.getElementById('mesoneroPreviewImg');
        const removeBtn = document.getElementById('mesoneroFotoRemoveBtn');
        if (!urlInput || !previewDiv) return;
        if (fileInput && fileInput.files && fileInput.files[0]) return;
        const url = urlInput.value.trim();
        if (url) {
            currentMesoneroFotoUrl = url;
            currentMesoneroFotoFile = null;
            previewImg.src = url;
            previewDiv.style.display = 'flex';
            if (removeBtn) removeBtn.style.display = 'flex';
        } else {
            previewDiv.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'none';
            previewImg.src = '';
            currentMesoneroFotoUrl = '';
        }
    }

    function removeMesoneroFoto() {
        const fileInput = document.getElementById('mesoneroFoto');
        const urlInput = document.getElementById('mesoneroFotoUrl');
        const previewDiv = document.getElementById('mesoneroFotoPreview');
        const previewImg = document.getElementById('mesoneroPreviewImg');
        const removeBtn = document.getElementById('mesoneroFotoRemoveBtn');
        if (fileInput) fileInput.value = '';
        if (urlInput) {
            urlInput.value = '';
            urlInput.disabled = false;
        }
        if (previewDiv) previewDiv.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'none';
        if (previewImg) previewImg.src = '';
        currentMesoneroFotoFile = null;
        currentMesoneroFotoUrl = '';
    }

    document.getElementById('saveMesonero')?.addEventListener('click', async () => {
        const btn = document.getElementById('saveMesonero');
        if (btn.disabled) return;
        const id = window.mesoneroEditandoId;
        const nombre = document.getElementById('mesoneroNombre')?.value.trim();
        const activo = document.getElementById('mesoneroActivo')?.value === 'true';
        if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
        let fotoUrl = '';
        const archivoFoto = document.getElementById('mesoneroFoto')?.files[0];
        const fotoUrlInput = document.getElementById('mesoneroFotoUrl')?.value;
        if (archivoFoto) {
            const resultado = await window.subirImagenPlatillo(archivoFoto, 'mesoneros');
            if (resultado.success) fotoUrl = resultado.url;
            else { window.mostrarToast('Error al subir la foto: ' + resultado.error, 'error'); return; }
        } else if (fotoUrlInput) fotoUrl = fotoUrlInput;
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const data = { nombre, activo, foto: fotoUrl || null };
            let error;
            if (id) {
                ({ error } = await window.supabaseClient.from('mesoneros').update(data).eq('id', id));
            } else {
                data.id = window.generarId('mes_');
                ({ error } = await window.supabaseClient.from('mesoneros').insert([data]));
            }
            if (error) throw error;
            window.cerrarModal('mesoneroModal');
            await window.cargarMesoneros();
            window.mostrarToast('✅ Mesonero guardado', 'success');
        } catch (e) { console.error(e); window.mostrarToast('❌ Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = 'Guardar'; }
    });

    window.toggleMesoneroActivo = async function(id, activo) {
        try {
            await window.supabaseClient.from('mesoneros').update({ activo }).eq('id', id);
            await window.cargarMesoneros();
        } catch (e) { console.error('Error:', e); }
    };

    window.pagarPropinaMesonero = async function(mesoneroId, nombre, acum) {
        if (!confirm(`¿Registrar pago de propinas a ${nombre}?\nMonto pendiente: ${window.formatBs(acum)}\n\nEsto marcará todas sus propinas pendientes como entregadas.`)) return;
        try {
            const { error } = await window.supabaseClient.from('propinas').update({ entregado: true }).eq('mesonero_id', mesoneroId).eq('entregado', false);
            if (error) throw error;
            await window.renderizarMesoneros();
            window.mostrarToast(`💰 Propinas pagadas a ${nombre}`, 'success');
        } catch(e) { console.error('Error pagando propinas:', e); window.mostrarToast('❌ Error: ' + (e.message || e), 'error'); }
    };

    window.eliminarMesonero = async function(id) {
        if (!confirm('¿Eliminar mesonero?')) return;
        try {
            await window.supabaseClient.from('mesoneros').delete().eq('id', id);
            await window.cargarMesoneros();
            window.mostrarToast('🗑️ Eliminado', 'success');
        } catch (e) { console.error('Error:', e); }
    };

    window.agregarMesonero = async function() {
        const nombre = document.getElementById('nuevoMesonero').value.trim();
        if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
        const btn = document.querySelector('[onclick="window.agregarMesonero()"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        try {
            const { error } = await window.supabaseClient.from('mesoneros').insert([{ id: window.generarId('mes_'), nombre, activo: true }]);
            if (error) throw error;
            document.getElementById('nuevoMesonero').value = '';
            await window.cargarMesoneros();
            window.mostrarToast('✅ Mesonero agregado', 'success');
        } catch (e) { console.error('Error agregando mesonero:', e); window.mostrarToast('❌ Error: ' + (e.message || e), 'error'); }
        finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Agregar'; } }
    };

    window.cargarPropinas = async function() {
        try {
            const h = new Date(); h.setHours(0, 0, 0, 0);
            const m = new Date(h); m.setDate(m.getDate() + 1);
            const { data, error } = await window.supabaseClient.from('propinas').select('*, mesoneros(nombre)').gte('fecha', h.toISOString()).lt('fecha', m.toISOString()).order('fecha', { ascending: false });
            if (error) throw error;
            window.propinas = data || [];
            window.renderizarPropinas();
        } catch (e) { console.error('Error cargando propinas:', e); }
    };

    window.renderizarPropinas = function() {
        const total = window.propinas.reduce((s, p) => s + (p.monto_bs || 0), 0);
        const cantidad = window.propinas.length;
        const promedio = cantidad > 0 ? total / cantidad : 0;
        document.getElementById('propinasTotal').textContent = window.formatBs(total);
        document.getElementById('propinasCantidad').textContent = cantidad;
        document.getElementById('propinasPromedio').textContent = window.formatBs(promedio);
        const propinasDashboard = document.getElementById('propinasHoyDashboard');
        if (propinasDashboard) propinasDashboard.textContent = window.formatBs(total);
        const tbody = document.getElementById('propinasTableBody');
        if (tbody) {
            tbody.innerHTML = window.propinas.map(p => `
                <tr>
                    <td>${new Date(p.fecha).toLocaleString('es-VE', { timeZone: 'America/Caracas'})}</td>
                    <td>${p.mesoneros?.nombre || 'N/A'}</td>
                    <td>${p.mesa || 'N/A'}</td>
                    <td>${p.metodo}</td>
                    <td>${window.formatBs(p.monto_bs)}</td>
                    <td>${p.cajero || 'N/A'}</td>
                </tr>`).join('');
        }
    };

    window.cargarDeliverys = async function() {
        try {
            const { data, error } = await window.supabaseClient.from('deliverys').select('*').order('nombre');
            if (error) throw error;
            window.deliverys = data || [];
            await window.renderizarDeliverys();
        } catch (e) { console.error('Error cargando deliverys:', e); }
    };

    window.renderizarDeliverys = async function() {
        if (window._renderizandoDeliverys) return;
        window._renderizandoDeliverys = true;
        const grid = document.getElementById('deliverysGrid');
        if (!grid) { window._renderizandoDeliverys = false; return; }
        grid.innerHTML = '';
        try {
            for (const d of (window.deliverys || [])) {
                const acumulado = await window.obtenerAcumuladoDelivery(d.id);
                const fotoHtml = d.foto ? `<img src="${d.foto}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;margin-left:auto">` : '<div style="width:48px;height:48px;border-radius:50%;background:var(--delivery);display:flex;align-items:center;justify-content:center;color:#fff"><i class="fas fa-motorcycle"></i></div>';
                const card = document.createElement('div');
                card.className = 'delivery-card';
                card.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <div class="delivery-nombre">${d.nombre}</div>
                            <div class="delivery-estado ${d.activo ? 'activo' : 'inactivo'}">${d.activo ? 'Activo' : 'Inactivo'}</div>
                        </div>
                        ${fotoHtml}
                    </div>
                    <div class="delivery-acumulado">
                        <span>💰 Acumulado total:</span>
                        <span class="delivery-monto">${window.formatBs(acumulado)}</span>
                    </div>
                    <div class="delivery-actions">
                        <button class="btn-icon edit" onclick="window.editarDelivery('${d.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-toggle ${d.activo ? 'btn-toggle-on' : 'btn-toggle-off'}" onclick="window.toggleDeliveryActivo('${d.id}', ${!d.activo})">
                            ${d.activo ? 'Inhabilitar' : 'Activar'}
                        </button>
                        <button class="btn-sm" style="background:linear-gradient(135deg,var(--success),#2E7D32);color:#fff"
                            onclick="window.mostrarPagoDelivery('${d.id}')">
                            <i class="fas fa-hand-holding-usd"></i> Pagado
                        </button>
                        <button class="btn-icon delete" onclick="window.eliminarDelivery('${d.id}')" title="Eliminar motorizado">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>`;
                grid.appendChild(card);
            }
        } finally { window._renderizandoDeliverys = false; }
    };

    window.obtenerAcumuladoDelivery = async function(deliveryId) {
        try {
            const { data, error } = await window.supabaseClient.from('entregas_delivery').select('monto_bs').eq('delivery_id', deliveryId);
            if (error) throw error;
            return (data || []).reduce((sum, e) => sum + (e.monto_bs || 0), 0);
        } catch (e) { console.error('Error obteniendo acumulado:', e); return 0; }
    };

    window.agregarDelivery = async function() {
        const nombre = document.getElementById('nuevoDelivery').value.trim();
        if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
        const btn = document.querySelector('.btn-delivery');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        try {
            const { error } = await window.supabaseClient.from('deliverys').insert([{ id: window.generarId('del_'), nombre, activo: true }]);
            if (error) throw error;
            document.getElementById('nuevoDelivery').value = '';
            await window.cargarDeliverys();
            window.mostrarToast('✅ Motorizado agregado', 'success');
        } catch (e) { console.error('Error agregando motorizado:', e); window.mostrarToast('❌ Error: ' + (e.message || e), 'error'); }
        finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Agregar'; } }
    };

    window.editarDelivery = function(id) {
        const delivery = window.deliverys.find(d => d.id === id);
        if (!delivery) return;
        window.deliveryEditandoId = id;
        document.getElementById('deliveryNombre').value = delivery.nombre;
        document.getElementById('deliveryEstado').value = delivery.activo ? 'true' : 'false';
        if (delivery.foto) {
            const urlInput = document.getElementById('deliveryFotoUrl');
            if (urlInput) urlInput.value = delivery.foto;
            const previewImg = document.getElementById('deliveryPreviewImg');
            if (previewImg) previewImg.src = delivery.foto;
            const previewDiv = document.getElementById('deliveryFotoPreview');
            if (previewDiv) previewDiv.style.display = 'flex';
            currentDeliveryFotoUrl = delivery.foto;
        } else {
            const urlInput = document.getElementById('deliveryFotoUrl');
            if (urlInput) urlInput.value = '';
            const previewDiv = document.getElementById('deliveryFotoPreview');
            if (previewDiv) previewDiv.style.display = 'none';
        }
        document.getElementById('deliveryModal').classList.add('active');
    };

    function handleDeliveryFotoFile() {
        const fileInput = document.getElementById('deliveryFoto');
        const urlInput = document.getElementById('deliveryFotoUrl');
        const previewDiv = document.getElementById('deliveryFotoPreview');
        const previewImg = document.getElementById('deliveryPreviewImg');
        const removeBtn = document.getElementById('deliveryFotoRemoveBtn');
        if (!fileInput || !urlInput || !previewDiv) return;
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            currentDeliveryFotoFile = file;
            currentDeliveryFotoUrl = '';
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
                currentDeliveryFotoUrl = urlInput.value;
                currentDeliveryFotoFile = null;
            } else {
                previewDiv.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'none';
                previewImg.src = '';
            }
        }
    }

    function handleDeliveryFotoUrl() {
        const urlInput = document.getElementById('deliveryFotoUrl');
        const fileInput = document.getElementById('deliveryFoto');
        const previewDiv = document.getElementById('deliveryFotoPreview');
        const previewImg = document.getElementById('deliveryPreviewImg');
        const removeBtn = document.getElementById('deliveryFotoRemoveBtn');
        if (!urlInput || !previewDiv) return;
        if (fileInput && fileInput.files && fileInput.files[0]) return;
        const url = urlInput.value.trim();
        if (url) {
            currentDeliveryFotoUrl = url;
            currentDeliveryFotoFile = null;
            previewImg.src = url;
            previewDiv.style.display = 'flex';
            if (removeBtn) removeBtn.style.display = 'flex';
        } else {
            previewDiv.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'none';
            previewImg.src = '';
            currentDeliveryFotoUrl = '';
        }
    }

    function removeDeliveryFoto() {
        const fileInput = document.getElementById('deliveryFoto');
        const urlInput = document.getElementById('deliveryFotoUrl');
        const previewDiv = document.getElementById('deliveryFotoPreview');
        const previewImg = document.getElementById('deliveryPreviewImg');
        const removeBtn = document.getElementById('deliveryFotoRemoveBtn');
        if (fileInput) fileInput.value = '';
        if (urlInput) {
            urlInput.value = '';
            urlInput.disabled = false;
        }
        if (previewDiv) previewDiv.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'none';
        if (previewImg) previewImg.src = '';
        currentDeliveryFotoFile = null;
        currentDeliveryFotoUrl = '';
    }

    document.getElementById('saveDelivery')?.addEventListener('click', async () => {
        if (!window.deliveryEditandoId) return;
        const nombre = document.getElementById('deliveryNombre').value.trim();
        const activo = document.getElementById('deliveryEstado').value === 'true';
        if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
        let fotoUrl = '';
        const archivoFoto = document.getElementById('deliveryFoto')?.files[0];
        const fotoUrlInput = document.getElementById('deliveryFotoUrl')?.value;
        if (archivoFoto) {
            const resultado = await window.subirImagenPlatillo(archivoFoto, 'deliverys');
            if (resultado.success) fotoUrl = resultado.url;
            else { window.mostrarToast('Error al subir la foto: ' + resultado.error, 'error'); return; }
        } else if (fotoUrlInput) fotoUrl = fotoUrlInput;
        try {
            await window.supabaseClient.from('deliverys').update({ nombre, activo, foto: fotoUrl || null }).eq('id', window.deliveryEditandoId);
            document.getElementById('deliveryModal').classList.remove('active');
            await window.cargarDeliverys();
            window.mostrarToast('✅ Motorizado actualizado', 'success');
        } catch (e) { console.error('Error:', e); window.mostrarToast('❌ Error al actualizar', 'error'); }
    });

    // Configurar eventos de foto en modales (solo si los elementos existen)
    function setupFotoEvents() {
        const deliveryFile = document.getElementById('deliveryFoto');
        const deliveryUrl = document.getElementById('deliveryFotoUrl');
        const deliveryRemove = document.getElementById('deliveryFotoRemoveBtn');
        if (deliveryFile) deliveryFile.addEventListener('change', handleDeliveryFotoFile);
        if (deliveryUrl) deliveryUrl.addEventListener('input', handleDeliveryFotoUrl);
        if (deliveryRemove) deliveryRemove.addEventListener('click', removeDeliveryFoto);
        
        const mesoneroFile = document.getElementById('mesoneroFoto');
        const mesoneroUrl = document.getElementById('mesoneroFotoUrl');
        const mesoneroRemove = document.getElementById('mesoneroFotoRemoveBtn');
        if (mesoneroFile) mesoneroFile.addEventListener('change', handleMesoneroFotoFile);
        if (mesoneroUrl) mesoneroUrl.addEventListener('input', handleMesoneroFotoUrl);
        if (mesoneroRemove) mesoneroRemove.addEventListener('click', removeMesoneroFoto);
    }
    setupFotoEvents();

    window.eliminarDelivery = async function(id) {
        const delivery = window.deliverys.find(d => d.id === id);
        if (!delivery) return;
        if (!confirm(`¿Eliminar al motorizado "${delivery.nombre}"? También se borrarán sus registros de entrega.`)) return;
        try {
            await window.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', id);
            await window.supabaseClient.from('deliverys').delete().eq('id', id);
            await window.cargarDeliverys();
            window.mostrarToast('🗑️ Motorizado eliminado', 'success');
        } catch (e) { console.error('Error eliminando motorizado:', e); window.mostrarToast('❌ Error al eliminar: ' + (e.message || e), 'error'); }
    };

    window.toggleDeliveryActivo = async function(id, activo) {
        try {
            await window.supabaseClient.from('deliverys').update({ activo }).eq('id', id);
            await window.cargarDeliverys();
        } catch (e) { console.error('Error:', e); }
    };

    window.mostrarPagoDelivery = async function(id) {
        const delivery = window.deliverys.find(d => d.id === id);
        if (!delivery) return;
        window.deliveryParaPago = id;
        const acumulado = await window.obtenerAcumuladoDelivery(id);
        document.getElementById('confirmPagoDeliveryBody').innerHTML = `
            <p style="margin-bottom:1rem">
                <strong>${delivery.nombre}</strong> tiene acumulado:
                <span style="color:var(--accent);font-weight:700;font-size:1.1rem"> ${window.formatBs(acumulado)}</span>
            </p>
            <div style="display:flex;flex-direction:column;gap:.75rem">
                <label class="pago-tipo-option" style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:.2s" id="opcionTotal">
                    <input type="radio" name="tipoPago" value="total" checked style="margin-top:3px;accent-color:var(--success)">
                    <div>
                        <div style="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago total</div>
                        <div style="font-size:.78rem;color:var(--text-muted)">Reinicia el acumulado a Bs 0,00</div>
                    </div>
                    <span style="margin-left:auto;font-weight:800;color:var(--success)">${window.formatBs(acumulado)}</span>
                </label>
                <label class="pago-tipo-option" style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:.2s" id="opcionParcial">
                    <input type="radio" name="tipoPago" value="parcial" style="margin-top:3px;accent-color:var(--warning)">
                    <div style="flex:1">
                        <div style="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago parcial</div>
                        <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:.4rem">Ingresa el monto a pagar</div>
                        <input type="number" id="montoPagoParcial" placeholder="Monto en Bs" step="0.01" min="0.01"
                            max="${acumulado}"
                            style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:8px;font-family:Montserrat,sans-serif;font-size:.88rem;outline:none"
                            onclick="event.stopPropagation()"
                            oninput="document.querySelector('[name=tipoPago][value=parcial]').checked=true">
                    </div>
                </label>
            </div>`;
        document.getElementById('confirmPagoDeliveryModal').classList.add('active');
    };
    window.confirmarPagoDelivery = async function() {
        if (!window.deliveryParaPago) return;
        const btn = document.getElementById('confirmPagoDeliveryBtn');
        if (btn && btn.disabled) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'; }
        try {
            const tipoPago = document.querySelector('[name="tipoPago"]:checked')?.value || 'total';
            if (tipoPago === 'parcial') {
                const monto = parseFloat(document.getElementById('montoPagoParcial')?.value);
                if (!monto || monto <= 0) { window.mostrarToast('Ingresa un monto válido para el pago parcial', 'error'); return; }
                const { error } = await window.supabaseClient.from('entregas_delivery').insert([{ delivery_id: window.deliveryParaPago, monto_bs: -monto, pedido_id: null, fecha_entrega: new Date().toISOString() }]);
                if (error) throw error;
                window.mostrarToast('💰 Pago parcial registrado.', 'success');
            } else {
                const { error } = await window.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', window.deliveryParaPago);
                if (error) throw error;
                window.mostrarToast('💰 Pago total registrado. Acumulado reiniciado.', 'success');
            }
            window.cerrarModal('confirmPagoDeliveryModal');
            await window.cargarDeliverys();
        } catch (e) { console.error('Error registrando pago:', e); window.mostrarToast('❌ Error al registrar pago: ' + (e.message || e), 'error'); }
        finally { if (btn) { btn.disabled = false; btn.innerHTML = 'Confirmar'; } }
    };
})();
