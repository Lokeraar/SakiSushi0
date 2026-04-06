// admin-delivery.js — Motorizados (Deliverys)
(function() {
    let currentDeliveryFotoFile = null;
    let currentDeliveryFotoUrl  = '';

    // ══════════════════════════════════════════════════════════════
    // CARGAR / RENDERIZAR DELIVERYS
    // ══════════════════════════════════════════════════════════════
    window.cargarDeliverys = async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('deliverys').select('*').order('nombre');
            if (error) throw error;
            window.deliverys = data || [];
            await window.renderizarDeliverys();
            if (window.cargarUltimosViajes) window.cargarUltimosViajes();
            if (window._actualizarDeliverysHoyStats) window._actualizarDeliverysHoyStats();
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
            const { data, error } = await window.supabaseClient
                .from('entregas_delivery').select('monto_bs').eq('delivery_id', deliveryId);
            if (error) throw error;
            return (data || []).reduce((sum, e) => sum + (e.monto_bs || 0), 0);
        } catch (e) { console.error('Error obteniendo acumulado:', e); return 0; }
    };

    // ══════════════════════════════════════════════════════════════
    // AGREGAR / EDITAR / TOGGLE / ELIMINAR
    // ══════════════════════════════════════════════════════════════
    window.agregarDelivery = async function() {
        const nombre = document.getElementById('nuevoDelivery').value.trim();
        if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
        const btn = document.querySelector('.btn-delivery');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        try {
            const { error } = await window.supabaseClient.from('deliverys')
                .insert([{ id: window.generarId('del_'), nombre, activo: true }]);
            if (error) throw error;
            document.getElementById('nuevoDelivery').value = '';
            await window.cargarDeliverys();
            window.mostrarToast('✅ Motorizado agregado', 'success');
        } catch (e) {
            console.error('Error agregando motorizado:', e);
            window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Agregar'; }
        }
    };

    window.editarDelivery = function(id) {
        const delivery = window.deliverys.find(d => d.id === id);
        if (!delivery) return;
        window.deliveryEditandoId = id;
        const ni = document.getElementById('deliveryNombre');
        if (ni) ni.value = delivery.nombre;
        const es = document.getElementById('deliveryEstado');
        if (es) es.value = delivery.activo ? 'true' : 'false';
        if (delivery.foto) {
            const ui = document.getElementById('deliveryFotoUrl');
            if (ui) ui.value = delivery.foto;
            const pi = document.getElementById('deliveryPreviewImg');
            if (pi) pi.src = delivery.foto;
            const pd = document.getElementById('deliveryFotoPreview');
            if (pd) pd.style.display = 'flex';
            currentDeliveryFotoUrl = delivery.foto;
        } else {
            const ui = document.getElementById('deliveryFotoUrl');
            if (ui) ui.value = '';
            const pd = document.getElementById('deliveryFotoPreview');
            if (pd) pd.style.display = 'none';
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
                } catch (e) {
                    console.error('Error eliminando motorizado:', e);
                    window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
                }
            }
        );
    };

    // ══════════════════════════════════════════════════════════════
    // PAGO DE MOTORIZADO: completo o parcial
    // ══════════════════════════════════════════════════════════════
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
                <label style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:.2s" id="opcionTotal">
                    <input type="radio" name="tipoPago" value="total" checked style="margin-top:3px;accent-color:var(--success)">
                    <div>
                        <div style="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago total</div>
                        <div style="font-size:.78rem;color:var(--text-muted)">Reinicia el acumulado a Bs 0,00</div>
                    </div>
                    <span style="margin-left:auto;font-weight:800;color:var(--success)">${window.formatBs(acumulado)}</span>
                </label>
                <label style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:.2s" id="opcionParcial">
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
        // Asegurar que el botón llame a confirmarPagoDelivery
        const confirmBtn = document.getElementById('confirmPagoDeliveryBtn');
        if (confirmBtn) confirmBtn.onclick = window.confirmarPagoDelivery;
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
                if (!monto || monto <= 0) { window.mostrarToast('Ingresa un monto válido', 'error'); return; }
                const { error } = await window.supabaseClient.from('entregas_delivery').insert([{
                    delivery_id: window.deliveryParaPago,
                    monto_bs: -monto,
                    pedido_id: null,
                    fecha_entrega: new Date().toISOString()
                }]);
                if (error) throw error;
                window.mostrarToast('💰 Pago parcial registrado.', 'success');
            } else {
                const { error } = await window.supabaseClient.from('entregas_delivery')
                    .delete().eq('delivery_id', window.deliveryParaPago);
                if (error) throw error;
                window.mostrarToast('💰 Pago total registrado. Acumulado reiniciado.', 'success');
            }
            window.cerrarModal('confirmPagoDeliveryModal');
            await window.cargarDeliverys();
        } catch (e) {
            console.error('Error registrando pago:', e);
            window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Confirmar'; }
        }
    };

    // ══════════════════════════════════════════════════════════════
    // TABLA ÚLTIMOS 5 VIAJES + HISTORIAL DE HOY
    // ══════════════════════════════════════════════════════════════
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
                    ? (e.pedidos.mesa || e.pedidos.cliente_nombre || (e.pedido_id||'').slice(0,8) || '—')
                    : ((e.pedido_id||'').slice(0,8) || '—');
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

    // ══════════════════════════════════════════════════════════════
    // MANEJO DE FOTO DE DELIVERY
    // ══════════════════════════════════════════════════════════════
    function handleDeliveryFotoFile() {
        const fi = document.getElementById('deliveryFoto');
        const ui = document.getElementById('deliveryFotoUrl');
        const pd = document.getElementById('deliveryFotoPreview');
        const pi = document.getElementById('deliveryPreviewImg');
        const rb = document.getElementById('deliveryFotoRemoveBtn');
        if (!fi || !pd) return;
        if (fi.files && fi.files[0]) {
            const reader = new FileReader();
            currentDeliveryFotoFile = fi.files[0];
            currentDeliveryFotoUrl  = '';
            if (ui) { ui.value = ''; ui.disabled = true; }
            reader.onload = e => {
                if (pi) pi.src = e.target.result;
                pd.style.display = 'flex';
                if (rb) rb.style.display = 'flex';
            };
            reader.readAsDataURL(fi.files[0]);
        } else {
            if (ui) ui.disabled = false;
        }
    }

    function handleDeliveryFotoUrl() {
        const ui = document.getElementById('deliveryFotoUrl');
        const fi = document.getElementById('deliveryFoto');
        const pd = document.getElementById('deliveryFotoPreview');
        const pi = document.getElementById('deliveryPreviewImg');
        const rb = document.getElementById('deliveryFotoRemoveBtn');
        if (!ui || !pd) return;
        if (fi && fi.files && fi.files[0]) return;
        const url = ui.value.trim();
        if (url) {
            currentDeliveryFotoUrl  = url;
            currentDeliveryFotoFile = null;
            if (pi) pi.src = url;
            pd.style.display = 'flex';
            if (rb) rb.style.display = 'flex';
        } else {
            pd.style.display = 'none';
            if (rb) rb.style.display = 'none';
            if (pi) pi.src = '';
            currentDeliveryFotoUrl = '';
        }
    }

    function removeDeliveryFoto() {
        const fi = document.getElementById('deliveryFoto');
        const ui = document.getElementById('deliveryFotoUrl');
        const pd = document.getElementById('deliveryFotoPreview');
        const pi = document.getElementById('deliveryPreviewImg');
        const rb = document.getElementById('deliveryFotoRemoveBtn');
        if (fi) fi.value = '';
        if (ui) { ui.value = ''; ui.disabled = false; }
        if (pd) pd.style.display = 'none';
        if (rb) rb.style.display = 'none';
        if (pi) pi.src = '';
        currentDeliveryFotoFile = null;
        currentDeliveryFotoUrl  = '';
    }

    // ══════════════════════════════════════════════════════════════
    // GUARDAR DELIVERY (modal)
    // ══════════════════════════════════════════════════════════════
    document.getElementById('saveDelivery')?.addEventListener('click', async () => {
        if (!window.deliveryEditandoId) return;
        const btn = document.getElementById('saveDelivery');
        if (btn.disabled) return;
        const nombre = document.getElementById('deliveryNombre').value.trim();
        const activo = document.getElementById('deliveryEstado').value === 'true';
        if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
        let fotoUrl = '';
        const archivoFoto  = document.getElementById('deliveryFoto')?.files[0];
        const fotoUrlInput = document.getElementById('deliveryFotoUrl')?.value;
        if (archivoFoto) {
            const res = await window.subirImagenPlatillo(archivoFoto, 'deliverys');
            if (res.success) fotoUrl = res.url;
            else { window.mostrarToast('Error al subir la foto: ' + res.error, 'error'); return; }
        } else if (fotoUrlInput) {
            fotoUrl = fotoUrlInput;
        }
        try {
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await window.supabaseClient.from('deliverys')
                .update({ nombre, activo, foto: fotoUrl || null })
                .eq('id', window.deliveryEditandoId);
            window.cerrarModal('deliveryModal');
            await window.cargarDeliverys();
            window.mostrarToast('✅ Motorizado actualizado', 'success');
        } catch (e) {
            console.error('Error:', e);
            window.mostrarToast('❌ Error al actualizar', 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = 'Guardar';
        }
    });

    // Cerrar modal delivery
    document.getElementById('closeDeliveryModal')?.addEventListener('click', () => window.cerrarModal('deliveryModal'));
    document.getElementById('cancelDeliveryEdit')?.addEventListener('click', () => window.cerrarModal('deliveryModal'));

    // Eventos de foto
    document.getElementById('deliveryFoto')?.addEventListener('change', handleDeliveryFotoFile);
    document.getElementById('deliveryFotoUrl')?.addEventListener('input', handleDeliveryFotoUrl);
    document.getElementById('deliveryFotoRemoveBtn')?.addEventListener('click', removeDeliveryFoto);


    // ── Tarea 5.1: Stats cards deliverys ────────────────────────────────────
    window._actualizarDeliverysHoyStats = async function() {
        try {
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const hoy  = new Date(); hoy.setHours(0,0,0,0);
            const man  = new Date(hoy); man.setDate(man.getDate()+1);
            const { data: allData } = await window.supabaseClient
                .from('entregas_delivery').select('monto_bs');
            const totAll    = (allData||[]).reduce((s,e) => s+(e.monto_bs||0), 0);
            const totAllUsd = tasa>0 ? totAll/tasa : 0;
            const { data: hoyData } = await window.supabaseClient
                .from('entregas_delivery').select('monto_bs')
                .gte('fecha_entrega', hoy.toISOString())
                .lt('fecha_entrega', man.toISOString());
            const lista  = hoyData || [];
            const totBs  = lista.reduce((s,e) => s+(e.monto_bs||0), 0);
            const totUsd = tasa>0 ? totBs/tasa : 0;
            const cnt    = lista.length;
            const avgBs  = cnt>0 ? totBs/cnt : 0;
            const avgUsd = tasa>0 ? avgBs/tasa : 0;
            const _s = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
            _s('deliverysHoyDashboard', window.formatUSD(totUsd)+' / '+window.formatBs(totBs));
            _s('deliverysTotalCard',    window.formatUSD(totAllUsd)+' / '+window.formatBs(totAll));
            _s('deliverysCountCard',    String(cnt));
            _s('deliverysPromedioCard', window.formatUSD(avgUsd)+' / '+window.formatBs(avgBs));
        } catch(e) { console.error('Error stats deliverys:', e); }
    };

    // ── Tarea 5.2: Tabla últimos 5 viajes ───────────────────────────────────
    window.cargarUltimosViajes = async function() {
        const tbody = document.getElementById('ultimosViajesTbody');
        if (!tbody) return;
        try {
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const { data, error } = await window.supabaseClient
                .from('entregas_delivery')
                .select('*, deliverys(nombre), pedidos(id, mesa, cliente_nombre, items)')
                .order('fecha_entrega', { ascending: false }).limit(5);
            if (error) throw error;
            const lista = data || [];
            if (!lista.length) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sin viajes registrados</td></tr>';
                return;
            }
            tbody.innerHTML = lista.map(e => {
                const motor = e.deliverys?.nombre || '—';
                let resumen = '—';
                if (e.pedidos?.mesa)            resumen = 'Mesa ' + e.pedidos.mesa;
                else if (e.pedidos?.cliente_nombre) resumen = e.pedidos.cliente_nombre;
                else if (e.pedidos?.items?.length) {
                    resumen = e.pedidos.items.slice(0,2).map(i => (i.cantidad||1)+'x '+i.nombre).join(', ');
                    if (e.pedidos.items.length > 2) resumen += ' +' + (e.pedidos.items.length-2) + ' más';
                } else if (e.pedido_id) { resumen = e.pedido_id.slice(0,8); }
                const mBs  = e.monto_bs || 0;
                const mUsd = tasa>0 ? mBs/tasa : 0;
                const hora = new Date(e.fecha_entrega).toLocaleString('es-VE',
                    {timeZone:'America/Caracas', hour:'2-digit', minute:'2-digit'});
                return `<tr>
                    <td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${resumen}</td>
                    <td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">${motor}</td>
                    <td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:var(--delivery)">${window.formatUSD(mUsd)}<br><span style="font-size:.72rem;color:var(--text-muted)">${window.formatBs(mBs)}</span></td>
                    <td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">${hora}</td>
                </tr>`;
            }).join('');
        } catch(err) {
            const tb = document.getElementById('ultimosViajesTbody');
            if (tb) tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger)">Error al cargar</td></tr>';
        }
    };

    // ── Tarea 5.3: Historial completo de envíos hoy ──────────────────────────
    window.verHistorialEnviosHoy = async function() {
        try {
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const hoy  = new Date(); hoy.setHours(0,0,0,0);
            const man  = new Date(hoy); man.setDate(man.getDate()+1);
            const { data } = await window.supabaseClient
                .from('entregas_delivery')
                .select('*, deliverys(nombre), pedidos(id, mesa, cliente_nombre, items)')
                .gte('fecha_entrega', hoy.toISOString())
                .lt('fecha_entrega', man.toISOString())
                .order('fecha_entrega', { ascending: false });
            const lista  = data || [];
            const totBs  = lista.reduce((s,e) => s+(e.monto_bs||0), 0);
            const totUsd = tasa>0 ? totBs/tasa : 0;
            const rows = lista.map(e => {
                const motor = e.deliverys?.nombre || '—';
                let resumen = '—';
                if (e.pedidos?.mesa)            resumen = 'Mesa ' + e.pedidos.mesa;
                else if (e.pedidos?.cliente_nombre) resumen = e.pedidos.cliente_nombre;
                else if (e.pedidos?.items?.length) {
                    resumen = e.pedidos.items.slice(0,2).map(i => (i.cantidad||1)+'x '+i.nombre).join(', ');
                    if (e.pedidos.items.length > 2) resumen += ' +' + (e.pedidos.items.length-2) + ' más';
                }
                const mBs  = e.monto_bs||0;
                const mUsd = tasa>0 ? mBs/tasa : 0;
                const hora = new Date(e.fecha_entrega).toLocaleString('es-VE',
                    {timeZone:'America/Caracas', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
                return `<tr>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.8rem">${resumen}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">${motor}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:var(--delivery)">${window.formatUSD(mUsd)} / ${window.formatBs(mBs)}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">${hora}</td>
                </tr>`;
            }).join('');
            const totLine = `${lista.length} envío${lista.length!==1?'s':''} · Total: ${window.formatUSD(totUsd)} / ${window.formatBs(totBs)}`;
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
            ov.innerHTML = `
                <div style="background:var(--card-bg);border-radius:16px;max-width:700px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.4)">
                    <div style="background:linear-gradient(135deg,var(--delivery),#00838F);padding:1rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <div style="font-weight:700;font-size:1rem"><i class="fas fa-motorcycle"></i> Historial Envíos — Hoy</div>
                            <div style="font-size:.75rem;opacity:.8;margin-top:2px">${totLine}</div>
                        </div>
                        <button onclick="this.closest('[style*=position]').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:1rem;font-weight:700;display:flex;align-items:center;justify-content:center">✕</button>
                    </div>
                    <div style="overflow-y:auto;flex:1">
                        <table style="width:100%;border-collapse:collapse">
                            <thead><tr style="background:var(--secondary)">
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Resumen</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Motorizado</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Monto</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Hora</th>
                            </tr></thead>
                            <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sin envíos hoy</td></tr>'}</tbody>
                        </table>
                    </div>
                    <div style="padding:.85rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
                        <button onclick="this.closest('[style*=position]').remove()" style="background:var(--primary);color:#fff;border:none;padding:.55rem 1.25rem;border-radius:8px;cursor:pointer;font-family:Montserrat,sans-serif;font-weight:600;font-size:.85rem">Cerrar</button>
                    </div>
                </div>`;
            ov.addEventListener('click', e => { if(e.target===ov) ov.remove(); });
            document.body.appendChild(ov);
        } catch(err) {
            console.error('Error historial envíos:', err);
            window.mostrarToast('❌ Error al cargar historial', 'error');
        }
    };


})();