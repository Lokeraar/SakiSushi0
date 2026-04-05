// admin-delivery.js - Motorizados (deliverys), mesoneros, propinas
(function() {
    // Variables para fotos
    let currentDeliveryFotoFile = null;
    let currentDeliveryFotoUrl = '';
    let currentMesoneroFotoFile = null;
    let currentMesoneroFotoUrl = '';

    // ==================== MESONEROS ====================
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
        const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        container.innerHTML = sorted.map(m => {
            const inicial  = m.nombre.charAt(0).toUpperCase();
            const acum     = acumulados[m.id] || 0;
            const hayAcum  = acum > 0;
            const acumUsd  = tasa > 0 ? acum / tasa : 0;
            const avatar   = m.foto
                ? `<div class="ucard-avatar"><img src="${m.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer" onclick="window.expandirImagen(this.src)"></div>`
                : `<div class="ucard-avatar"><div class="mesonero-avatar" style="width:100%;height:100%;font-size:1.4rem;border-radius:50%">${inicial}</div></div>`;
            const badge    = m.activo
                ? '<span class="status-activo"><i class="fas fa-check-circle"></i> Activo</span>'
                : '<span class="status-inactivo"><i class="fas fa-circle"></i> Inactivo</span>';
            return `<div class="usuario-card-v2" style="border-left-color:var(--propina)">
                ${avatar}
                <div class="ucard-body">
                    <div class="ucard-top">
                        <div class="ucard-names">
                            <span class="mesonero-nombre">${m.nombre}</span>
                            <span style="font-size:.72rem;color:${hayAcum ? 'var(--propina)' : 'var(--text-muted)'};font-weight:${hayAcum ? '700' : '400'}">
                                Propinas: ${hayAcum ? window.formatUSD(acumUsd) + ' / ' + window.formatBs(acum) : 'Bs 0,00'}
                            </span>
                        </div>
                        <div class="ucard-status">${badge}</div>
                    </div>
                    <div class="ucard-actions">
                        ${hayAcum ? `<button class="btn-sm" style="background:linear-gradient(135deg,var(--propina),#7B1FA2);color:#fff;white-space:nowrap"
                            onclick="window.pagarPropinaMesonero('${m.id}', '${m.nombre}', ${acum})">
                            <i class="fas fa-hand-holding-heart"></i> Pagar
                        </button>` : ''}
                        <button class="btn-icon edit" onclick="window.editarMesonero('${m.id}')" title="Editar mesonero"><i class="fas fa-pen"></i></button>
                        <button class="btn-toggle ${m.activo ? 'btn-toggle-on' : 'btn-toggle-off'}"
                            onclick="window.toggleMesoneroActivo('${m.id}', ${!m.activo})">
                            ${m.activo ? 'Inhabilitar' : 'Activar'}
                        </button>
                        <button class="btn-icon delete" onclick="window.eliminarMesonero('${m.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');
    };

    window.editarMesonero = function(id) {
        const mesonero = window.mesoneros.find(m => m.id === id);
        if (!mesonero) return;
        window.mesoneroEditandoId = id;
        const modalTitle = document.getElementById('mesoneroModalTitle');
        if (modalTitle) modalTitle.textContent = 'Editar Mesonero';
        const nombreInput = document.getElementById('mesoneroNombre');
        if (nombreInput) nombreInput.value = mesonero.nombre || '';
        const activoSelect = document.getElementById('mesoneroActivo');
        if (activoSelect) activoSelect.value = mesonero.activo ? 'true' : 'false';
        // Foto
        if (mesonero.foto) {
            const urlInput = document.getElementById('mesoneroFotoUrl');
            if (urlInput) urlInput.value = mesonero.foto;
            const previewImg = document.getElementById('mesoneroPreviewImg');
            if (previewImg) previewImg.src = mesonero.foto;
            const previewDiv = document.getElementById('mesoneroFotoPreview');
            if (previewDiv) previewDiv.style.display = 'flex';
            currentMesoneroFotoUrl = mesonero.foto;
        } else {
            const urlInput = document.getElementById('mesoneroFotoUrl');
            if (urlInput) urlInput.value = '';
            const previewDiv = document.getElementById('mesoneroFotoPreview');
            if (previewDiv) previewDiv.style.display = 'none';
        }
        const modal = document.getElementById('mesoneroModal');
        if (modal) modal.classList.add('active');
    };

    window.toggleMesoneroActivo = async function(id, activo) {
        try {
            await window.supabaseClient.from('mesoneros').update({ activo }).eq('id', id);
            await window.cargarMesoneros();
        } catch (e) { console.error('Error:', e); }
    };

    window.pagarPropinaMesonero = async function(mesoneroId, nombre, acum) {
        window.mostrarConfirmacionPremium(
            'Pagar Propinas',
            `¿Registrar pago de propinas a ${nombre}?\nMonto pendiente: ${window.formatBs(acum)}\n\nEsto marcará todas sus propinas pendientes como entregadas.`,
            async () => {
                try {
                    const { error } = await window.supabaseClient.from('propinas').update({ entregado: true }).eq('mesonero_id', mesoneroId).eq('entregado', false);
                    if (error) throw error;
                    await window.renderizarMesoneros();
                    window.mostrarToast(`💰 Propinas pagadas a ${nombre}`, 'success');
                } catch(e) { console.error('Error pagando propinas:', e); window.mostrarToast('❌ Error: ' + (e.message || e), 'error'); }
            }
        );
    };

    window.eliminarMesonero = async function(id) {
        const mesonero = window.mesoneros.find(m => m.id === id);
        if (!mesonero) return;
        window.mostrarConfirmacionPremium(
            'Eliminar Mesonero',
            `¿Eliminar al mesonero "${mesonero.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    await window.supabaseClient.from('mesoneros').delete().eq('id', id);
                    await window.cargarMesoneros();
                    window.mostrarToast('🗑️ Eliminado', 'success');
                } catch (e) { console.error('Error:', e); }
            }
        );
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

    // ==================== PROPINAS ====================
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

    // ==================== DELIVERYS ====================
    window.cargarDeliverys = async function() {
        try {
            const { data, error } = await window.supabaseClient.from('deliverys').select('*').order('nombre');
            if (error) throw error;
            window.deliverys = data || [];
            await window.renderizarDeliverys();
            if (window.cargarUltimosViajes) window.cargarUltimosViajes();
        } catch (e) { console.error('Error cargando deliverys:', e); }
    };

    window.renderizarDeliverys = async function() {
        if (window._renderizandoDeliverys) return;
        window._renderizandoDeliverys = true;
        const grid = document.getElementById('deliverysGrid');
        if (!grid) { window._renderizandoDeliverys = false; return; }
        grid.innerHTML = '';
        try {
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            for (const d of (window.deliverys || [])) {
                const acumulado = await window.obtenerAcumuladoDelivery(d.id);
                const acumUsd   = tasa > 0 ? acumulado / tasa : 0;
                const avatar    = d.foto
                    ? `<div class="ucard-avatar"><img src="${d.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer" onclick="window.expandirImagen(this.src)"></div>`
                    : `<div class="ucard-avatar" style="background:linear-gradient(135deg,var(--delivery),#00838F);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.4rem"><i class="fas fa-motorcycle"></i></div>`;
                const dbadge    = d.activo
                    ? '<span class="status-activo"><i class="fas fa-check-circle"></i> Activo</span>'
                    : '<span class="status-inactivo"><i class="fas fa-circle"></i> Inactivo</span>';
                const card = document.createElement('div');
                card.className = 'usuario-card-v2';
                card.style.borderLeftColor = 'var(--delivery)';
                card.innerHTML = `
                    ${avatar}
                    <div class="ucard-body">
                        <div class="ucard-top">
                            <div class="ucard-names">
                                <span class="delivery-nombre">${d.nombre}</span>
                                <span style="font-size:.72rem;color:var(--delivery);font-weight:600">
                                    💰 ${window.formatUSD(acumUsd)} / ${window.formatBs(acumulado)}
                                </span>
                            </div>
                            <div class="ucard-status">${dbadge}</div>
                        </div>
                        <div class="ucard-actions">
                            <button class="btn-icon edit" onclick="window.editarDelivery('${d.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-toggle ${d.activo ? 'btn-toggle-on' : 'btn-toggle-off'}"
                                onclick="window.toggleDeliveryActivo('${d.id}', ${!d.activo})">
                                ${d.activo ? 'Inhabilitar' : 'Activar'}
                            </button>
                            <button class="btn-sm" style="background:linear-gradient(135deg,var(--success),#2E7D32);color:#fff"
                                onclick="window.mostrarPagoDelivery('${d.id}')">
                                <i class="fas fa-hand-holding-usd"></i> Pagado
                            </button>
                            <button class="btn-icon delete" onclick="window.eliminarDelivery('${d.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
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
        const nombreInput = document.getElementById('deliveryNombre');
        if (nombreInput) nombreInput.value = delivery.nombre;
        const estadoSelect = document.getElementById('deliveryEstado');
        if (estadoSelect) estadoSelect.value = delivery.activo ? 'true' : 'false';
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
        const modal = document.getElementById('deliveryModal');
        if (modal) modal.classList.add('active');
    };

    window.toggleDeliveryActivo = async function(id, activo) {
        try {
            await window.supabaseClient.from('deliverys').update({ activo }).eq('id', id);
            await window.cargarDeliverys();
        } catch (e) { console.error('Error:', e); }
    };

    window.eliminarDelivery = async function(id) {
        const delivery = window.deliverys.find(d => d.id === id);
        if (!delivery) return;
        window.mostrarConfirmacionPremium(
            'Eliminar Motorizado',
            `¿Eliminar al motorizado "${delivery.nombre}"? También se borrarán sus registros de entrega.`,
            async () => {
                try {
                    await window.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', id);
                    await window.supabaseClient.from('deliverys').delete().eq('id', id);
                    await window.cargarDeliverys();
                    window.mostrarToast('🗑️ Motorizado eliminado', 'success');
                } catch (e) { console.error('Error eliminando motorizado:', e); window.mostrarToast('❌ Error al eliminar: ' + (e.message || e), 'error'); }
            }
        );
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

    // ==================== MANEJO DE FOTOS ====================
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

    // ==================== GUARDADO DE DATOS ====================
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

    document.getElementById('saveDelivery')?.addEventListener('click', async () => {
        if (!window.deliveryEditandoId) return;
        const btn = document.getElementById('saveDelivery');
        if (btn.disabled) return;
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
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await window.supabaseClient.from('deliverys').update({ nombre, activo, foto: fotoUrl || null }).eq('id', window.deliveryEditandoId);
            window.cerrarModal('deliveryModal');
            await window.cargarDeliverys();
            window.mostrarToast('✅ Motorizado actualizado', 'success');
        } catch (e) { console.error('Error:', e); window.mostrarToast('❌ Error al actualizar', 'error'); }
        finally { btn.disabled = false; btn.innerHTML = 'Guardar'; }
    });

    // ==================== CERRAR MODALES (X y Cancelar) ====================
    const closeMesoneroModal = document.getElementById('closeMesoneroModal');
    const cancelMesoneroEdit = document.getElementById('cancelMesoneroEdit');
    if (closeMesoneroModal) closeMesoneroModal.addEventListener('click', () => window.cerrarModal('mesoneroModal'));
    if (cancelMesoneroEdit) cancelMesoneroEdit.addEventListener('click', () => window.cerrarModal('mesoneroModal'));

    const closeDeliveryModal = document.getElementById('closeDeliveryModal');
    const cancelDeliveryEdit = document.getElementById('cancelDeliveryEdit');
    if (closeDeliveryModal) closeDeliveryModal.addEventListener('click', () => window.cerrarModal('deliveryModal'));
    if (cancelDeliveryEdit) cancelDeliveryEdit.addEventListener('click', () => window.cerrarModal('deliveryModal'));

    // ==================== CONFIGURAR EVENTOS DE FOTO ====================
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

    // ── Tabla últimos 5 viajes ────────────────────────────────────────────────
    window.cargarUltimosViajes = async function() {
        const tbody = document.getElementById('ultimosViajesTbody');
        if (!tbody) return;
        try {
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const { data, error } = await window.supabaseClient
                .from('entregas_delivery')
                .select('*, deliverys(nombre), pedidos(id, mesa, cliente_nombre)')
                .order('fecha_entrega', { ascending: false }).limit(5);
            if (error) throw error;
            const lista = data || [];
            tbody.innerHTML = lista.length ? lista.map(e => {
                const motor = e.deliverys?.nombre || '—';
                const ref   = e.pedidos
                    ? (e.pedidos.mesa || e.pedidos.cliente_nombre || (e.pedido_id || '').slice(0,8) || '—')
                    : ((e.pedido_id || '').slice(0,8) || '—');
                const mBs  = e.monto_bs || 0;
                const mUsd = tasa > 0 ? mBs / tasa : 0;
                const fecha = new Date(e.fecha_entrega).toLocaleString('es-VE', {
                    timeZone:'America/Caracas', day:'2-digit', month:'2-digit',
                    hour:'2-digit', minute:'2-digit'
                });
                return `<tr>
                    <td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.8rem;color:var(--text-muted)">${fecha}</td>
                    <td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.85rem;font-weight:600">${motor}</td>
                    <td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.8rem;color:var(--text-muted)">${ref}</td>
                    <td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.85rem;font-weight:700;color:var(--delivery)">
                        ${window.formatUSD(mUsd)}<br>
                        <span style="font-size:.75rem;color:var(--text-muted);font-weight:600">${window.formatBs(mBs)}</span>
                    </td>
                </tr>`;
            }).join('') : '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sin viajes registrados</td></tr>';
        } catch(e) {
            const tb = document.getElementById('ultimosViajesTbody');
            if (tb) tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger)">Error al cargar</td></tr>';
        }
    };

    window.verHistorialEnviosHoy = async function() {
        try {
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const hoy  = new Date(); hoy.setHours(0,0,0,0);
            const man  = new Date(hoy); man.setDate(man.getDate()+1);
            const { data } = await window.supabaseClient
                .from('entregas_delivery')
                .select('*, deliverys(nombre), pedidos(id, mesa, cliente_nombre)')
                .gte('fecha_entrega', hoy.toISOString())
                .lt('fecha_entrega', man.toISOString())
                .order('fecha_entrega', { ascending: false });
            const lista  = data || [];
            const totBs  = lista.reduce((s,e) => s+(e.monto_bs||0), 0);
            const totUsd = tasa > 0 ? totBs / tasa : 0;
            const rows   = lista.map(e => {
                const motor = e.deliverys?.nombre || '—';
                const ref   = e.pedidos
                    ? (e.pedidos.mesa || e.pedidos.cliente_nombre || (e.pedido_id||'').slice(0,8) || '—')
                    : ((e.pedido_id||'').slice(0,8) || '—');
                const mBs  = e.monto_bs||0;
                const mUsd = tasa > 0 ? mBs/tasa : 0;
                const fecha = new Date(e.fecha_entrega).toLocaleString('es-VE', {
                    timeZone:'America/Caracas', day:'2-digit', month:'2-digit',
                    hour:'2-digit', minute:'2-digit'
                });
                return `<tr>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">${fecha}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">${motor}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">${ref}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:var(--delivery)">
                        ${window.formatUSD(mUsd)} / ${window.formatBs(mBs)}
                    </td>
                </tr>`;
            }).join('');
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
            ov.innerHTML = `
                <div style="background:var(--card-bg);border-radius:16px;max-width:680px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.4)">
                    <div style="background:linear-gradient(135deg,var(--delivery),#00838F);padding:1rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <div style="font-weight:700;font-size:1rem"><i class="fas fa-motorcycle"></i> Historial Envíos — Hoy</div>
                            <div style="font-size:.75rem;opacity:.8;margin-top:2px">
                                ${lista.length} envío${lista.length!==1?'s':''} · Total: ${window.formatUSD(totUsd)} / ${window.formatBs(totBs)}
                            </div>
                        </div>
                        <button onclick="this.closest('[style*=position]').remove()"
                            style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;font-weight:700">✕</button>
                    </div>
                    <div style="overflow-y:auto;flex:1">
                        <table style="width:100%;border-collapse:collapse">
                            <thead><tr style="background:var(--secondary)">
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Hora</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Motorizado</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Referencia</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Monto</th>
                            </tr></thead>
                            <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sin envíos hoy</td></tr>'}</tbody>
                        </table>
                    </div>
                    <div style="padding:.85rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
                        <button onclick="this.closest('[style*=position]').remove()"
                            style="background:var(--primary);color:#fff;border:none;padding:.55rem 1.25rem;border-radius:8px;cursor:pointer;font-family:Montserrat,sans-serif;font-weight:600;font-size:.85rem">Cerrar</button>
                    </div>
                </div>`;
            ov.addEventListener('click', e => { if(e.target===ov) ov.remove(); });
            document.body.appendChild(ov);
        } catch(e) {
            console.error('Error historial envíos:', e);
            window.mostrarToast('❌ Error al cargar historial', 'error');
        }
    };

    window._actualizarDeliverysHoyStats = async function() {
        try {
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const hoy  = new Date(); hoy.setHours(0,0,0,0);
            const man  = new Date(hoy); man.setDate(man.getDate()+1);
            const { data } = await window.supabaseClient
                .from('entregas_delivery').select('monto_bs')
                .gte('fecha_entrega', hoy.toISOString())
                .lt('fecha_entrega', man.toISOString());
            const lista  = data || [];
            const totBs  = lista.reduce((s,e) => s+(e.monto_bs||0), 0);
            const totUsd = tasa > 0 ? totBs/tasa : 0;
            const cnt    = lista.length;
            const avgBs  = cnt > 0 ? totBs/cnt : 0;
            const avgUsd = tasa > 0 ? avgBs/tasa : 0;
            const _s = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
            _s('deliverysHoyDashboard', `${window.formatUSD(totUsd)} / ${window.formatBs(totBs)}`);
            _s('deliverysTotalCard',    `${window.formatUSD(totUsd)} / ${window.formatBs(totBs)}`);
            _s('deliverysCountCard',    String(cnt));
            _s('deliverysPromedioCard', `${window.formatUSD(avgUsd)} / ${window.formatBs(avgBs)}`);
        } catch(e) { console.error('Error stats deliverys:', e); }
    };

})();