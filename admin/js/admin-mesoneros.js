// admin-mesoneros.js — Mesoneros y Propinas
(function() {
    'use strict';
    let currentMesoneroFotoFile = null;
    let currentMesoneroFotoUrl  = '';

    // ════════════════════════════════════════
    // CARGAR / RENDERIZAR
    // ════════════════════════════════════════
    window.cargarMesoneros = async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('mesoneros').select('*').order('nombre');
            if (error) throw error;
            window.mesoneros = data || [];
            await window.renderizarMesoneros();
            window.cargarPropinas();
        } catch(e) { console.error('Error cargando mesoneros:', e); }
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
            // Obtener todas las propinas pendientes (entregado = false), sin filtrar por fecha
            const { data: allProp } = await window.supabaseClient
                .from('propinas').select('mesonero_id, monto_bs')
                .eq('entregado', false);
            (allProp || []).forEach(p => {
                acumulados[p.mesonero_id] = (acumulados[p.mesonero_id] || 0) + (p.monto_bs || 0);
            });
        } catch(e) { console.error('Error obteniendo acumulado propinas:', e); }

        const sorted = [...window.mesoneros].sort((a, b) => a.nombre.localeCompare(b.nombre));
        const tasa   = Number(window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400) || 400;

        container.innerHTML = sorted.map(m => {
            const inicial = m.nombre.charAt(0).toUpperCase();
            const acum    = acumulados[m.id] || 0;
            const hayAcum = acum > 0;
            const acumUsd = tasa > 0 ? acum / tasa : 0;
            const avatar  = m.foto
                ? '<div class="ucard-avatar"><img src="' + m.foto + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer" onclick="window.expandirImagen(this.src)"></div>'
                : '<div class="ucard-avatar"><div style="width:100%;height:100%;font-size:1.4rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--propina),#7B1FA2);color:#fff">' + inicial + '</div></div>';
            const badge = m.activo
                ? '<span class="ucard-status-inline" style="color:var(--success);margin-left:auto"><i class="fas fa-check-circle"></i> ACTIVO</span>'
                : '<span class="ucard-status-inline" style="color:var(--text-muted);margin-left:auto"><i class="fas fa-circle"></i> INACTIVO</span>';
            const propStr = hayAcum
                ? window.formatUSD(acumUsd) + ' | ' + window.formatBs(acum)
                : 'Bs 0,00';
            const propColor = hayAcum ? 'var(--propina)' : 'var(--text-muted)';
            const propWeight = hayAcum ? '700' : '400';
            const toggleClass = m.activo ? 'btn-toggle-on' : 'btn-toggle-off';
            const toggleTxt   = m.activo ? 'Inhabilitar' : 'Activar';
            const toggleVal   = String(!m.activo);
            return '<div class="card-standard mesonero-card" style="border-left-color:var(--propina)">'
                + avatar
                + '<div class="ucard-body">'
                +   '<div class="ucard-top">'
                +     '<div class="ucard-names">'
                +       '<div class="ucard-line1"><span class="mesonero-nombre">' + m.nombre + '</span>' + badge + '</div>'
                +       '<div class="ucard-line2" style="display:flex;align-items:center;gap:0.5rem"><span style="font-size:.78rem;color:var(--propina);font-weight:600">Total Acumulado</span><span style="font-size:1.05rem;color:var(--propina);font-weight:700">' + window.formatUSD(acumUsd) + ' / ' + window.formatBs(acum) + '</span></div>'
                +       '<div class="ucard-line3">'
                +         '<button class="btn-sm" style="background:linear-gradient(135deg,var(--propina),#7B1FA2);color:#fff;white-space:nowrap;font-size:.75rem;padding:.35rem .6rem" onclick="window.mostrarPagoMesonero(\'' + m.id + '\')">'
                +           '<i class="fas fa-hand-holding-usd"></i> Pagado'
                +         '</button>'
                +         '<button class="btn-toggle ' + toggleClass + '" style="font-size:.75rem;padding:.35rem .6rem" onclick="window.toggleMesoneroActivo(\'' + m.id + '\',' + toggleVal + ')">' + toggleTxt + '</button>'
                +         '<div class="ucard-actions-right">'
                +           '<button class="btn-icon edit" onclick="window.editarMesonero(\'' + m.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>'
                +           '<button class="btn-icon delete" onclick="window.eliminarMesonero(\'' + m.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>'
                +         '</div>'
                +       '</div>'
                +     '</div>'
                +   '</div>'
                + '</div>'
                + '</div>';
        }).join('');
    };

    // ════════════════════════════════════════
    // PAGO PROPINAS (completo o parcial)
    // ════════════════════════════════════════
    window.mostrarPagoMesonero = async function(id) {
        const mesonero = (window.mesoneros || []).find(m => m.id === id);
        if (!mesonero) return;
        window.mesoneroParaPago = id;
        let acum = 0;
        try {
            const { data } = await window.supabaseClient
                .from('propinas').select('monto_bs').eq('mesonero_id', id).eq('entregado', false);
            acum = (data || []).reduce((s, p) => s + (p.monto_bs || 0), 0);
        } catch(e) { console.error('Error propinas pendientes:', e); }
        if (acum <= 0) { window.mostrarToast(mesonero.nombre + ' no tiene propinas pendientes', 'info'); return; }
        const tasa    = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        const acumUsd = tasa > 0 ? acum / tasa : 0;
        const body = document.getElementById('confirmPagoDeliveryBody');
        if (body) body.innerHTML = '<p style="margin-bottom:1rem"><strong>' + mesonero.nombre + '</strong> tiene propinas pendientes: <span style="color:var(--propina);font-weight:700;font-size:1.1rem">' + window.formatUSD(acumUsd) + ' | ' + window.formatBs(acum) + '</span></p>'
            + '<div style="display:flex;flex-direction:column;gap:.75rem">'
            + '<label style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer">'
            + '<input type="radio" name="tipoPagoMes" value="total" checked style="margin-top:3px;accent-color:var(--success)">'
            + '<div><div style="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago total</div><div style="font-size:.78rem;color:var(--text-muted)">Marca todas sus propinas pendientes como entregadas</div></div>'
            + '<span style="margin-left:auto;font-weight:800;color:var(--success)">' + window.formatBs(acum) + '</span></label>'
            + '<label style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer">'
            + '<input type="radio" name="tipoPagoMes" value="parcial" style="margin-top:3px;accent-color:var(--warning)">'
            + '<div style="flex:1"><div style="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago parcial</div>'
            + '<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:.4rem">Ingresa el monto a pagar</div>'
            + '<input type="number" id="montoPagoParc_mes" placeholder="Monto en Bs" step="0.01" min="0.01" max="' + acum + '" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:8px;font-family:Montserrat,sans-serif;font-size:.88rem;outline:none;background:var(--input-bg);color:var(--text-dark)" onclick="event.stopPropagation()" oninput="document.querySelector(\'[name=tipoPagoMes][value=parcial]\').checked=true">'
            + '</div></label></div>';
        const btn = document.getElementById('confirmPagoDeliveryBtn');
        if (btn) btn.onclick = window.confirmarPagoMesonero;
        const modal = document.getElementById('confirmPagoDeliveryModal');
        if (modal) modal.classList.add('active');
    };

    window.confirmarPagoMesonero = async function() {
        if (!window.mesoneroParaPago) return;
        const btn = document.getElementById('confirmPagoDeliveryBtn');
        if (btn && btn.disabled) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'; }
        const mesonero = (window.mesoneros || []).find(m => m.id === window.mesoneroParaPago);
        try {
            const tipo = (document.querySelector('[name="tipoPagoMes"]:checked') || {}).value || 'total';
            if (tipo === 'parcial') {
                const input = document.getElementById('montoPagoParc_mes');
                const monto = parseFloat(input ? input.value : 0);
                if (!monto || monto <= 0) { window.mostrarToast('Ingresa un monto válido', 'error'); return; }
                const { error } = await window.supabaseClient.from('propinas').insert([{
                    mesonero_id: window.mesoneroParaPago, monto_bs: -monto,
                    mesa: 'Pago parcial', metodo: 'pago_interno',
                    cajero: 'admin', entregado: true, fecha: new Date().toISOString()
                }]);
                if (error) throw error;
                window.mostrarToast('Pago parcial de ' + window.formatBs(monto) + ' registrado a ' + (mesonero ? mesonero.nombre : ''), 'success');
            } else {
                const { error } = await window.supabaseClient.from('propinas')
                    .update({ entregado: true })
                    .eq('mesonero_id', window.mesoneroParaPago).eq('entregado', false);
                if (error) throw error;
                window.mostrarToast('Propinas pagadas a ' + (mesonero ? mesonero.nombre : ''), 'success');
            }
            window.cerrarModal('confirmPagoDeliveryModal');
            if (btn) btn.onclick = window.confirmarPagoDelivery;
            window.mesoneroParaPago = null;
            await window.renderizarMesoneros();
            await window.cargarPropinas();
        } catch(e) {
            console.error('Error pago propinas:', e);
            window.mostrarToast('Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Confirmar'; }
        }
    };

    window.pagarPropinaMesonero = async function(mesoneroId) {
        window.mesoneroParaPago = mesoneroId;
        await window.mostrarPagoMesonero(mesoneroId);
    };

    // ════════════════════════════════════════
    // EDITAR / TOGGLE / ELIMINAR / AGREGAR
    // ════════════════════════════════════════
    window.editarMesonero = function(id) {
        const m = (window.mesoneros || []).find(x => x.id === id);
        if (!m) return;
        window.mesoneroEditandoId = id;
        const mt = document.getElementById('mesoneroModalTitle');
        if (mt) mt.textContent = 'Editar Mesonero';
        const ni = document.getElementById('mesoneroNombre'); if (ni) ni.value = m.nombre || '';
        const as = document.getElementById('mesoneroActivo'); if (as) as.value = m.activo ? 'true' : 'false';
        if (m.foto) {
            const ui = document.getElementById('mesoneroFotoUrl'); if (ui) ui.value = m.foto;
            const pi = document.getElementById('mesoneroPreviewImg'); if (pi) pi.src = m.foto;
            const pd = document.getElementById('mesoneroFotoPreview'); if (pd) pd.style.display = 'flex';
            currentMesoneroFotoUrl = m.foto;
        } else {
            const ui = document.getElementById('mesoneroFotoUrl'); if (ui) ui.value = '';
            const pd = document.getElementById('mesoneroFotoPreview'); if (pd) pd.style.display = 'none';
            currentMesoneroFotoUrl = '';
        }
        const modal = document.getElementById('mesoneroModal');
        if (modal) modal.classList.add('active');
    };

    window.toggleMesoneroActivo = async function(id, activo) {
        try {
            await window.supabaseClient.from('mesoneros').update({ activo }).eq('id', id);
            await window.cargarMesoneros();
        } catch(e) { console.error('Error toggle mesonero:', e); }
    };

    window.eliminarMesonero = async function(id) {
        const m = (window.mesoneros || []).find(x => x.id === id);
        if (!m) return;
        window.mostrarConfirmacionPremium(
            'Eliminar Mesonero',
            'Eliminar al mesonero "' + m.nombre + '"? Esta acción no se puede deshacer.',
            async function() {
                try {
                    await window.supabaseClient.from('mesoneros').delete().eq('id', id);
                    await window.cargarMesoneros();
                    window.mostrarToast('Mesonero eliminado', 'success');
                } catch(e) { window.mostrarToast('Error: ' + (e.message || e), 'error'); }
            }
        );
    };

    window.agregarMesonero = async function() {
        const inp = document.getElementById('nuevoMesonero');
        const nombre = inp ? inp.value.trim() : '';
        if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
        const btn = document.querySelector('[onclick="window.agregarMesonero()"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        try {
            const { error } = await window.supabaseClient.from('mesoneros')
                .insert([{ id: window.generarId('mes_'), nombre, activo: true }]);
            if (error) throw error;
            if (inp) inp.value = '';
            await window.cargarMesoneros();
            window.mostrarToast('Mesonero agregado', 'success');
        } catch(e) {
            window.mostrarToast('Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Agregar'; }
        }
    };

    // ════════════════════════════════════════
    // PROPINAS — cargar + renderizar + historial
    // ════════════════════════════════════════
    window.cargarPropinas = async function() {
        try {
            const h = new Date(); h.setHours(0,0,0,0);
            const m = new Date(h); m.setDate(m.getDate()+1);
            const { data, error } = await window.supabaseClient
                .from('propinas').select('*, mesoneros(nombre)')
                .gte('fecha', h.toISOString()).lt('fecha', m.toISOString())
                .order('fecha', { ascending: false });
            if (error) throw error;
            window.propinas = data || [];
            window.renderizarPropinas();
        } catch(e) { console.error('Error cargando propinas:', e); }
    };

    window.renderizarPropinas = function() {
        const propinas = window.propinas || [];
        const total    = propinas.reduce(function(s,p){ return s+(p.monto_bs||0); }, 0);
        const cantidad = propinas.length;
        const promedio = cantidad > 0 ? total/cantidad : 0;
        const tasa     = Number(window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400) || 400;
        const totalUsd = tasa > 0 ? total / tasa : 0;
        const promUsd  = tasa > 0 ? promedio / tasa : 0;
        var el;
        el = document.getElementById('propinasTotal');    if(el) el.textContent = window.formatUSD(totalUsd) + ' / ' + window.formatBs(total);
        el = document.getElementById('propinasCantidad'); if(el) el.textContent = String(cantidad);
        el = document.getElementById('propinasPromedio'); if(el) el.textContent = window.formatUSD(promUsd) + ' / ' + window.formatBs(promedio);
        el = document.getElementById('propinasHoyDashboard'); if(el) el.textContent = window.formatUSD(totalUsd) + ' / ' + window.formatBs(total);
        const tbody = document.getElementById('propinasTableBody');
        if (tbody) {
            const ultimas5 = propinas.slice(0, 5);
            if (ultimas5.length) {
                tbody.innerHTML = ultimas5.map(function(p) {
                    var hora = new Date(p.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                    return '<tr><td>' + hora + '</td><td>' + (p.mesoneros ? p.mesoneros.nombre : 'N/A') + '</td><td>' + (p.mesa||'N/A') + '</td><td>' + (p.metodo||'N/A') + '</td><td>' + window.formatBs(p.monto_bs) + '</td><td>' + (p.cajero||'N/A') + '</td></tr>';
                }).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-muted)">Sin propinas hoy</td></tr>';
            }
        }
    };

    window.verHistorialPropinaHoy = async function() {
        try {
            const h   = new Date(); h.setHours(0,0,0,0);
            const m   = new Date(h); m.setDate(m.getDate()+1);
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const { data, error } = await window.supabaseClient
                .from('propinas').select('*, mesoneros(nombre)')
                .gte('fecha', h.toISOString()).lt('fecha', m.toISOString())
                .order('fecha', { ascending: false });
            if (error) throw error;
            const lista  = data || [];
            const totBs  = lista.reduce(function(s,p){ return s+(p.monto_bs||0); }, 0);
            const totUsd = tasa > 0 ? totBs/tasa : 0;
            const rows = lista.map(function(p) {
                var mUsd = tasa > 0 ? (p.monto_bs||0)/tasa : 0;
                var hora = new Date(p.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                return '<tr>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">' + hora + '</td>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">' + (p.mesoneros ? p.mesoneros.nombre : 'N/A') + '</td>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">' + (p.mesa||'N/A') + '</td>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem">' + (p.metodo||'N/A') + '</td>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:var(--propina)">' + window.formatUSD(mUsd) + ' | ' + window.formatBs(p.monto_bs||0) + '</td>'
                    + '</tr>';
            }).join('');
            var pl = lista.length;
            var totLine = pl + ' propina' + (pl!==1?'s':'') + ' · Total: ' + window.formatUSD(totUsd) + ' | ' + window.formatBs(totBs);
            var emptyRow = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sin propinas hoy</td></tr>';
            var ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
            ov.innerHTML = '<div style="background:var(--card-bg);border-radius:16px;max-width:680px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.4)">'
                + '<div style="background:linear-gradient(135deg,var(--propina),#7B1FA2);padding:1rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center">'
                +   '<div><div style="font-weight:700;font-size:1rem"><i class="fas fa-hand-holding-heart"></i> Historial de Propinas — Hoy</div>'
                +   '<div style="font-size:.75rem;opacity:.8;margin-top:2px">' + totLine + '</div></div>'
                +   '<button onclick="this.closest(\'[style*=position]\').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:1rem;font-weight:700;display:flex;align-items:center;justify-content:center">&#x2715;</button>'
                + '</div>'
                + '<div style="overflow-y:auto;flex:1"><table style="width:100%;border-collapse:collapse">'
                + '<thead><tr style="background:var(--secondary)">'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Hora</th>'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Mesonero</th>'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Mesa</th>'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Método</th>'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Monto</th>'
                + '</tr></thead>'
                + '<tbody>' + (rows || emptyRow) + '</tbody></table></div>'
                + '<div style="padding:.85rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">'
                + '<button onclick="this.closest(\'[style*=position]\').remove()" style="background:var(--primary);color:#fff;border:none;padding:.55rem 1.25rem;border-radius:8px;cursor:pointer;font-family:Montserrat,sans-serif;font-weight:600;font-size:.85rem">Cerrar</button>'
                + '</div></div>';
            ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
            document.body.appendChild(ov);
        } catch(e) {
            console.error('Error historial propinas:', e);
            window.mostrarToast('Error al cargar historial', 'error');
        }
    };

    // ════════════════════════════════════════
    // FOTO MESONERO
    // ════════════════════════════════════════
    function handleMesoneroFotoFile() {
        var fi=document.getElementById('mesoneroFoto');
        var ui=document.getElementById('mesoneroFotoUrl');
        var pd=document.getElementById('mesoneroFotoPreview');
        var pi=document.getElementById('mesoneroPreviewImg');
        var rb=document.getElementById('mesoneroFotoRemoveBtn');
        if (!fi||!pd) return;
        if (fi.files && fi.files[0]) {
            currentMesoneroFotoFile=fi.files[0]; currentMesoneroFotoUrl='';
            if(ui){ui.value='';ui.disabled=true;}
            var reader=new FileReader();
            reader.onload=function(e){if(pi)pi.src=e.target.result;pd.style.display='flex';if(rb)rb.style.display='flex';};
            reader.readAsDataURL(fi.files[0]);
        } else { if(ui)ui.disabled=false; }
    }
    function handleMesoneroFotoUrl() {
        var ui=document.getElementById('mesoneroFotoUrl');
        var fi=document.getElementById('mesoneroFoto');
        var pd=document.getElementById('mesoneroFotoPreview');
        var pi=document.getElementById('mesoneroPreviewImg');
        var rb=document.getElementById('mesoneroFotoRemoveBtn');
        if(!ui||!pd) return;
        if(fi&&fi.files&&fi.files[0]) return;
        var url=ui.value.trim();
        if(url){currentMesoneroFotoUrl=url;currentMesoneroFotoFile=null;if(pi)pi.src=url;pd.style.display='flex';if(rb)rb.style.display='flex';}
        else{pd.style.display='none';if(rb)rb.style.display='none';if(pi)pi.src='';currentMesoneroFotoUrl='';}
    }
    function removeMesoneroFoto() {
        var fi=document.getElementById('mesoneroFoto');
        var ui=document.getElementById('mesoneroFotoUrl');
        var pd=document.getElementById('mesoneroFotoPreview');
        var pi=document.getElementById('mesoneroPreviewImg');
        var rb=document.getElementById('mesoneroFotoRemoveBtn');
        if(fi)fi.value=''; if(ui){ui.value='';ui.disabled=false;}
        if(pd)pd.style.display='none'; if(rb)rb.style.display='none';
        if(pi)pi.src=''; currentMesoneroFotoFile=null; currentMesoneroFotoUrl='';
    }

    // ════════════════════════════════════════
    // GUARDAR MESONERO
    // ════════════════════════════════════════
    var saveMesoneroBtn = document.getElementById('saveMesonero');
    if (saveMesoneroBtn) {
        saveMesoneroBtn.addEventListener('click', async function() {
            if (this.disabled) return;
            var id     = window.mesoneroEditandoId;
            var nombre = (document.getElementById('mesoneroNombre')||{}).value;
            if (nombre) nombre = nombre.trim();
            var activoEl = document.getElementById('mesoneroActivo');
            var activo = activoEl ? activoEl.value === 'true' : true;
            if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
            var fotoUrl = '';
            var archivoFoto = (document.getElementById('mesoneroFoto')||{files:[]}).files[0];
            var fotoUrlInput = ((document.getElementById('mesoneroFotoUrl')||{}).value)||'';
            if (archivoFoto) {
                var res = await window.subirImagenPlatillo(archivoFoto, 'mesoneros');
                if (res.success) fotoUrl = res.url;
                else { window.mostrarToast('Error al subir foto: '+res.error,'error'); return; }
            } else if (fotoUrlInput) { fotoUrl = fotoUrlInput; }
            try {
                this.disabled=true; this.innerHTML='<i class="fas fa-spinner fa-spin"></i>';
                var dataObj = { nombre: nombre, activo: activo, foto: fotoUrl || null };
                var err;
                if (id) {
                    var r1 = await window.supabaseClient.from('mesoneros').update(dataObj).eq('id', id);
                    err = r1.error;
                } else {
                    dataObj.id = window.generarId('mes_');
                    var r2 = await window.supabaseClient.from('mesoneros').insert([dataObj]);
                    err = r2.error;
                }
                if (err) throw err;
                window.cerrarModal('mesoneroModal');
                await window.cargarMesoneros();
                window.mostrarToast('Mesonero guardado', 'success');
            } catch(e) { window.mostrarToast('Error: '+e.message,'error'); }
            finally { this.disabled=false; this.innerHTML='Guardar'; }
        });
    }

    var closeBtn = document.getElementById('closeMesoneroModal');
    if (closeBtn) closeBtn.addEventListener('click', function(){ window.cerrarModal('mesoneroModal'); });
    var cancelBtn = document.getElementById('cancelMesoneroEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', function(){ window.cerrarModal('mesoneroModal'); });
    var fotoInput = document.getElementById('mesoneroFoto');
    if (fotoInput) fotoInput.addEventListener('change', handleMesoneroFotoFile);
    var fotoUrlInp = document.getElementById('mesoneroFotoUrl');
    if (fotoUrlInp) fotoUrlInp.addEventListener('input', handleMesoneroFotoUrl);
    var removeBtn = document.getElementById('mesoneroFotoRemoveBtn');
    if (removeBtn) removeBtn.addEventListener('click', removeMesoneroFoto);

})();
