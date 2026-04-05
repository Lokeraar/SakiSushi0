// admin-mesoneros.js — Mesoneros y Propinas
(function() {
    let currentMesoneroFotoFile = null;
    let currentMesoneroFotoUrl  = '';

    // ══════════════════════════════════════════════════════════════
    // CARGAR / RENDERIZAR MESONEROS
    // ══════════════════════════════════════════════════════════════
    window.cargarMesoneros = async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('mesoneros').select('*').order('nombre');
            if (error) throw error;
            window.mesoneros = data || [];
            await window.renderizarMesoneros();
            window.cargarPropinas();
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
            const { data: allProp } = await window.supabaseClient
                .from('propinas').select('mesonero_id, monto_bs, entregado').eq('entregado', false);
            (allProp || []).forEach(p => {
                acumulados[p.mesonero_id] = (acumulados[p.mesonero_id] || 0) + (p.monto_bs || 0);
            });
        } catch(e) { console.error('Error obteniendo acumulado propinas:', e); }

        const sorted = [...window.mesoneros].sort((a, b) => a.nombre.localeCompare(b.nombre));
        const tasa   = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;

        container.innerHTML = sorted.map(m => {
            const inicial = m.nombre.charAt(0).toUpperCase();
            const acum    = acumulados[m.id] || 0;
            const hayAcum = acum > 0;
            const acumUsd = tasa > 0 ? acum / tasa : 0;
            const avatar  = m.foto
                ? `<div class="ucard-avatar"><img src="${m.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer" onclick="window.expandirImagen(this.src)"></div>`
                : `<div class="ucard-avatar"><div class="mesonero-avatar" style="width:100%;height:100%;font-size:1.4rem;border-radius:50%">${inicial}</div></div>`;
            const badge   = m.activo
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
                        <button class="btn-sm" style="background:linear-gradient(135deg,var(--propina),#7B1FA2);color:#fff;white-space:nowrap"
                            onclick="window.mostrarPagoMesonero('${m.id}')">
                            <i class="fas fa-hand-holding-heart"></i> Pagado
                        </button>
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

    // ══════════════════════════════════════════════════════════════
    // PAGO DE PROPINAS: completo o parcial (igual que motorizado)
    // ══════════════════════════════════════════════════════════════
    window.mostrarPagoMesonero = async function(id) {
        const mesonero = window.mesoneros.find(m => m.id === id);
        if (!mesonero) return;
        window.mesoneroParaPago = id;

        // Obtener acumulado pendiente (propinas no entregadas)
        let acum = 0;
        try {
            const { data } = await window.supabaseClient
                .from('propinas').select('monto_bs').eq('mesonero_id', id).eq('entregado', false);
            acum = (data || []).reduce((s,p) => s + (p.monto_bs||0), 0);
        } catch(e) { console.error('Error leyendo propinas pendientes:', e); }

        const tasa   = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        const acumUsd = tasa > 0 ? acum / tasa : 0;

        if (acum <= 0) {
            window.mostrarToast(`${mesonero.nombre} no tiene propinas pendientes`, 'info');
            return;
        }

        // Reutilizar el modal de pago de delivery (misma estructura)
        document.getElementById('confirmPagoDeliveryBody').innerHTML = `
            <p style="margin-bottom:1rem">
                <strong>${mesonero.nombre}</strong> tiene propinas pendientes:
                <span style="color:var(--propina);font-weight:700;font-size:1.1rem">
                    ${window.formatUSD(acumUsd)} / ${window.formatBs(acum)}
                </span>
            </p>
            <div style="display:flex;flex-direction:column;gap:.75rem">
                <label style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:.2s" id="opcionTotalMes">
                    <input type="radio" name="tipoPagoMes" value="total" checked style="margin-top:3px;accent-color:var(--success)">
                    <div>
                        <div style="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago total</div>
                        <div style="font-size:.78rem;color:var(--text-muted)">Marca todas sus propinas pendientes como entregadas</div>
                    </div>
                    <span style="margin-left:auto;font-weight:800;color:var(--success)">${window.formatBs(acum)}</span>
                </label>
                <label style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:.2s" id="opcionParcialMes">
                    <input type="radio" name="tipoPagoMes" value="parcial" style="margin-top:3px;accent-color:var(--warning)">
                    <div style="flex:1">
                        <div style="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago parcial</div>
                        <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:.4rem">Ingresa el monto a pagar</div>
                        <input type="number" id="montoPagoParc_mes" placeholder="Monto en Bs" step="0.01" min="0.01"
                            max="${acum}"
                            style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:8px;font-family:Montserrat,sans-serif;font-size:.88rem;outline:none"
                            onclick="event.stopPropagation()"
                            oninput="document.querySelector('[name=tipoPagoMes][value=parcial]').checked=true">
                    </div>
                </label>
            </div>`;

        // Cambiar el botón Confirmar del modal para que llame a confirmarPagoMesonero
        const confirmBtn = document.getElementById('confirmPagoDeliveryBtn');
        if (confirmBtn) {
            confirmBtn.onclick = window.confirmarPagoMesonero;
        }
        document.getElementById('confirmPagoDeliveryModal').classList.add('active');
    };

    window.confirmarPagoMesonero = async function() {
        if (!window.mesoneroParaPago) return;
        const btn = document.getElementById('confirmPagoDeliveryBtn');
        if (btn && btn.disabled) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'; }

        const mesonero = window.mesoneros.find(m => m.id === window.mesoneroParaPago);
        try {
            const tipoPago = document.querySelector('[name="tipoPagoMes"]:checked')?.value || 'total';
            if (tipoPago === 'parcial') {
                const monto = parseFloat(document.getElementById('montoPagoParc_mes')?.value);
                if (!monto || monto <= 0) {
                    window.mostrarToast('Ingresa un monto válido para el pago parcial', 'error');
                    return;
                }
                // Registrar pago parcial como propina negativa de ajuste
                const { error } = await window.supabaseClient.from('propinas').insert([{
                    mesonero_id: window.mesoneroParaPago,
                    monto_bs: -monto,
                    mesa: 'Pago parcial',
                    metodo: 'pago_interno',
                    cajero: 'admin',
                    entregado: true,
                    fecha: new Date().toISOString()
                }]);
                if (error) throw error;
                window.mostrarToast(`💰 Pago parcial de ${window.formatBs(monto)} registrado a ${mesonero?.nombre}`, 'success');
            } else {
                // Marcar todas las propinas pendientes como entregadas
                const { error } = await window.supabaseClient
                    .from('propinas').update({ entregado: true })
                    .eq('mesonero_id', window.mesoneroParaPago).eq('entregado', false);
                if (error) throw error;
                window.mostrarToast(`💰 Propinas pagadas completamente a ${mesonero?.nombre}`, 'success');
            }
            window.cerrarModal('confirmPagoDeliveryModal');
            // Restaurar el botón a confirmarPagoDelivery para deliverys
            const cb = document.getElementById('confirmPagoDeliveryBtn');
            if (cb) cb.onclick = window.confirmarPagoDelivery;
            window.mesoneroParaPago = null;
            await window.renderizarMesoneros();
            await window.cargarPropinas();
        } catch(e) {
            console.error('Error registrando pago propinas:', e);
            window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Confirmar'; }
        }
    };

    // ══════════════════════════════════════════════════════════════
    // EDITAR / TOGGLE / ELIMINAR / AGREGAR
    // ══════════════════════════════════════════════════════════════
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
        if (mesonero.foto) {
            const urlInput  = document.getElementById('mesoneroFotoUrl');
            if (urlInput) urlInput.value = mesonero.foto;
            const previewImg = document.getElementById('mesoneroPreviewImg');
            if (previewImg) previewImg.src = mesonero.foto;
            const previewDiv = document.getElementById('mesoneroFotoPreview');
            if (previewDiv) previewDiv.style.display = 'flex';
            currentMesoneroFotoUrl = mesonero.foto;
        } else {
            const urlInput  = document.getElementById('mesoneroFotoUrl');
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
            const { error } = await window.supabaseClient.from('mesoneros')
                .insert([{ id: window.generarId('mes_'), nombre, activo: true }]);
            if (error) throw error;
            document.getElementById('nuevoMesonero').value = '';
            await window.cargarMesoneros();
            window.mostrarToast('✅ Mesonero agregado', 'success');
        } catch (e) {
            console.error('Error agregando mesonero:', e);
            window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Agregar'; }
        }
    };

    // Alias para compatibilidad con código que usa el nombre antiguo
    window.pagarPropinaMesonero = async function(mesoneroId, nombre, acum) {
        window.mesoneroParaPago = mesoneroId;
        await window.mostrarPagoMesonero(mesoneroId);
    };

    // ══════════════════════════════════════════════════════════════
    // PROPINAS — Últimas 5 + historial de hoy
    // ══════════════════════════════════════════════════════════════
    window.cargarPropinas = async function() {
        try {
            const h = new Date(); h.setHours(0,0,0,0);
            const m = new Date(h); m.setDate(m.getDate()+1);
            const { data, error } = await window.supabaseClient
                .from('propinas')
                .select('*, mesoneros(nombre)')
                .gte('fecha', h.toISOString())
                .lt('fecha', m.toISOString())
                .order('fecha', { ascending: false });
            if (error) throw error;
            window.propinas = data || [];
            window.renderizarPropinas();
        } catch (e) { console.error('Error cargando propinas:', e); }
    };

    window.renderizarPropinas = function() {
        const propinas = window.propinas || [];
        const total    = propinas.reduce((s,p) => s + (p.monto_bs||0), 0);
        const cantidad = propinas.length;
        const promedio = cantidad > 0 ? total / cantidad : 0;
        const _t = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
        _t('propinasTotal',    window.formatBs(total));
        _t('propinasCantidad', String(cantidad));
        _t('propinasPromedio', window.formatBs(promedio));
        const dashboard = document.getElementById('propinasHoyDashboard');
        if (dashboard) dashboard.textContent = window.formatBs(total);

        // Últimas 5 propinas en tabla
        const tbody = document.getElementById('propinasTableBody');
        if (tbody) {
            const ultimas5 = propinas.slice(0, 5);
            tbody.innerHTML = ultimas5.map(p => `
                <tr>
                    <td>${new Date(p.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas'})}</td>
                    <td>${p.mesoneros?.nombre || 'N/A'}</td>
                    <td>${p.mesa || 'N/A'}</td>
                    <td>${p.metodo}</td>
                    <td>${window.formatBs(p.monto_bs)}</td>
                    <td>${p.cajero || 'N/A'}</td>
                </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-muted)">Sin propinas hoy</td></tr>';
        }
    };

    window.verHistorialPropinaHoy = async function() {
        try {
            const h   = new Date(); h.setHours(0,0,0,0);
            const m   = new Date(h); m.setDate(m.getDate()+1);
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const { data, error } = await window.supabaseClient
                .from('propinas')
                .select('*, mesoneros(nombre)')
                .gte('fecha', h.toISOString())
                .lt('fecha', m.toISOString())
                .order('fecha', { ascending: false });
            if (error) throw error;
            const lista  = data || [];
            const totBs  = lista.reduce((s,p) => s+(p.monto_bs||0), 0);
            const totUsd = tasa > 0 ? totBs / tasa : 0;
            const rows   = lista.map(p => {
                const mUsd = tasa > 0 ? (p.monto_bs||0)/tasa : 0;
                const hora = new Date(p.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                return `<tr>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">${hora}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">${p.mesoneros?.nombre||'N/A'}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">${p.mesa||'N/A'}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem">${p.metodo||'N/A'}</td>
                    <td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:var(--propina)">
                        ${window.formatUSD(mUsd)} / ${window.formatBs(p.monto_bs||0)}
                    </td>
                </tr>`;
            }).join('');

            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
            ov.innerHTML = `
                <div style="background:var(--card-bg);border-radius:16px;max-width:680px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.4)">
                    <div style="background:linear-gradient(135deg,var(--propina),#7B1FA2);padding:1rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <div style="font-weight:700;font-size:1rem"><i class="fas fa-hand-holding-heart"></i> Historial de Propinas — Hoy</div>
                            <div style="font-size:.75rem;opacity:.8;margin-top:2px">
                                ${lista.length} propina${lista.length!==1?'s':''} · Total: ${window.formatUSD(totUsd)} / ${window.formatBs(totBs)}
                            </div>
                        </div>
                        <button onclick="this.closest('[style*=position]').remove()"
                            style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;font-weight:700">✕</button>
                    </div>
                    <div style="overflow-y:auto;flex:1">
                        <table style="width:100%;border-collapse:collapse">
                            <thead><tr style="background:var(--secondary)">
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Hora</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Mesonero</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Mesa</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Método</th>
                                <th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Monto</th>
                            </tr></thead>
                            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sin propinas hoy</td></tr>'}</tbody>
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
            console.error('Error historial propinas:', e);
            window.mostrarToast('❌ Error al cargar historial de propinas', 'error');
        }
    };

    // ══════════════════════════════════════════════════════════════
    // MANEJO DE FOTO DE MESONERO
    // ══════════════════════════════════════════════════════════════
    function handleMesoneroFotoFile() {
        const fi = document.getElementById('mesoneroFoto');
        const ui = document.getElementById('mesoneroFotoUrl');
        const pd = document.getElementById('mesoneroFotoPreview');
        const pi = document.getElementById('mesoneroPreviewImg');
        const rb = document.getElementById('mesoneroFotoRemoveBtn');
        if (!fi || !pd) return;
        if (fi.files && fi.files[0]) {
            const reader = new FileReader();
            currentMesoneroFotoFile = fi.files[0];
            currentMesoneroFotoUrl  = '';
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

    function handleMesoneroFotoUrl() {
        const ui = document.getElementById('mesoneroFotoUrl');
        const fi = document.getElementById('mesoneroFoto');
        const pd = document.getElementById('mesoneroFotoPreview');
        const pi = document.getElementById('mesoneroPreviewImg');
        const rb = document.getElementById('mesoneroFotoRemoveBtn');
        if (!ui || !pd) return;
        if (fi && fi.files && fi.files[0]) return;
        const url = ui.value.trim();
        if (url) {
            currentMesoneroFotoUrl  = url;
            currentMesoneroFotoFile = null;
            if (pi) pi.src = url;
            pd.style.display = 'flex';
            if (rb) rb.style.display = 'flex';
        } else {
            pd.style.display = 'none';
            if (rb) rb.style.display = 'none';
            if (pi) pi.src = '';
            currentMesoneroFotoUrl = '';
        }
    }

    function removeMesoneroFoto() {
        const fi = document.getElementById('mesoneroFoto');
        const ui = document.getElementById('mesoneroFotoUrl');
        const pd = document.getElementById('mesoneroFotoPreview');
        const pi = document.getElementById('mesoneroPreviewImg');
        const rb = document.getElementById('mesoneroFotoRemoveBtn');
        if (fi) fi.value = '';
        if (ui) { ui.value = ''; ui.disabled = false; }
        if (pd) pd.style.display = 'none';
        if (rb) rb.style.display = 'none';
        if (pi) pi.src = '';
        currentMesoneroFotoFile = null;
        currentMesoneroFotoUrl  = '';
    }

    // ══════════════════════════════════════════════════════════════
    // GUARDAR MESONERO (modal)
    // ══════════════════════════════════════════════════════════════
    document.getElementById('saveMesonero')?.addEventListener('click', async () => {
        const btn = document.getElementById('saveMesonero');
        if (btn.disabled) return;
        const id     = window.mesoneroEditandoId;
        const nombre = document.getElementById('mesoneroNombre')?.value.trim();
        const activo = document.getElementById('mesoneroActivo')?.value === 'true';
        if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
        let fotoUrl = '';
        const archivoFoto = document.getElementById('mesoneroFoto')?.files[0];
        const fotoUrlInput = document.getElementById('mesoneroFotoUrl')?.value;
        if (archivoFoto) {
            const res = await window.subirImagenPlatillo(archivoFoto, 'mesoneros');
            if (res.success) fotoUrl = res.url;
            else { window.mostrarToast('Error al subir la foto: ' + res.error, 'error'); return; }
        } else if (fotoUrlInput) {
            fotoUrl = fotoUrlInput;
        }
        try {
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
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
        } catch(e) {
            console.error(e);
            window.mostrarToast('❌ Error: ' + e.message, 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = 'Guardar';
        }
    });

    // Cerrar modal mesonero
    document.getElementById('closeMesoneroModal')?.addEventListener('click', () => window.cerrarModal('mesoneroModal'));
    document.getElementById('cancelMesoneroEdit')?.addEventListener('click', () => window.cerrarModal('mesoneroModal'));

    // Eventos de foto
    document.getElementById('mesoneroFoto')?.addEventListener('change', handleMesoneroFotoFile);
    document.getElementById('mesoneroFotoUrl')?.addEventListener('input', handleMesoneroFotoUrl);
    document.getElementById('mesoneroFotoRemoveBtn')?.addEventListener('click', removeMesoneroFoto);

})();
