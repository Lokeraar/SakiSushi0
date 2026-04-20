// admin-delivery.js — Motorizados (Deliverys)
(function() {
    'Use strict';
    var currentDeliveryFotoFile = null;
    var currentDeliveryFotoUrl  = '';

    // ════════════════════════════════════════
    // cargar / renderizar deliverys
    // ════════════════════════════════════════
    window.cargardeliverys = async function() {
        try {
            var r = await window.supabaseClient.from('deliverys').select('*').order('nombre');
            if (r.error) throw r.error;
            window.deliverys = r.data || [];
            await window.renderizardeliverys();
            if (typeof window.cargarultimosviajes === 'function') window.cargarultimosviajes();
            if (typeof window._actualizardeliveryshoystats === 'function') window._actualizardeliveryshoystats();
        } catch(e) { console.error('Error cargando deliverys:', e); }
    };

    window.renderizardeliverys = async function() {
        if (window._renderizandodeliverys) return;
        window._renderizandodeliverys = true;
        var grid = document.getElementById('deliverysGrid');
        if (!grid) { window._renderizandodeliverys = false; return; }
        grid.innerHTML = '';
        try {
            var tasa = window.configglobal?.tasa_efectiva || window.configglobal?.tasa_cambio || 400;
            var deliverys = window.deliverys || [];
            for (var i = 0; i < deliverys.length; i++) {
                var d = deliverys[i];
                var acumulado = await window.obteneracumuladodelivery(d.id);
                var acumusd   = tasa > 0 ? acumulado / tasa : 0;
                var avatar    = d.foto
                    ? '<div class="Ucard-avatar"><img src="' + d.foto + '" Style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer" Onclick="window.expandirImagen(this.src)"></div>': '<div class="Ucard-avatar" style="Background:linear-gradient(135deg,var(--delivery),#00838f);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.4rem"><i class="Fas fa-motorcycle"></i></div>';
                var dbadge = d.activo
                    ? '<span class="Ucard-status-inline" style="Color:var(--success)"><i class="Fas fa-check-circle"></i> Activo</span>': '<span class="Ucard-status-inline" style="Color:var(--text-muted)"><i class="Fas fa-circle"></i> Inactivo</span>';
                var toggleclass = d.activo ? 'btn-toggle-on' : 'btn-toggle-off';
                var toggletxt   = d.activo ? 'Inhabilitar' : 'Activar';
                var toggleval   = String(!d.activo);
                var card = document.createElement('div');
                card.classname = 'card-standard delivery-card';
                card.style.borderleftcolor = 'var(--delivery)';
                card.innerHTML = avatar
                    + '<div class="Ucard-body">'+ '<div class="Ucard-top">'+ '<div class="Ucard-names">'+ '<div class="Ucard-line1"><span class="Delivery-nombre">' + d.nombre + '</span>' + dbadge + '</div>'+ '<div class="Ucard-line2"><span style="Font-size:.78rem;color:var(--delivery);font-weight:600">Total Acumulado ' + window.formatusd(acumusd) + ' / ' + window.formatbs(acumulado) + '</span></div>'+ '<div class="Ucard-line3">'+ '<button class="Btn-sm" style="Background:linear-gradient(135deg,var(--success),#2e7d32);color:#fff;white-space:nowrap;font-size:.75rem;padding:.35rem .6rem" onclick="window.mostrarPagoDelivery(\'' + d.id + '\')">'+ '<i class="Fas fa-hand-holding-usd"></i> Pagado'+ '</button>'+ '<button class="btn-toggle ' + toggleclass + '" Style="font-size:.75rem;padding:.35rem .6rem" Onclick="window.toggleDeliveryActivo(\'' + d.id + '\',' + toggleVal + ')">' + toggletxt + '</button>'+ '<div class="Ucard-actions-right">'+ '<button class="Btn-icon edit" onclick="window.editarDelivery(\'' + d.id + '\')" Title="Editar"><i class="fas fa-edit"></i></button>'+ '<button class="Btn-icon delete" onclick="window.eliminarDelivery(\'' + d.id + '\')" Title="Eliminar"><i class="fas fa-trash"></i></button>'+ '</div>'+ '</div>'+ '</div>'+ '</div>'+ '</div>';
                grid.appendchild(card);
            }
        } finally { window._renderizandodeliverys = false; }
    };

    window.obteneracumuladodelivery = async function(deliveryid) {
        try {
            var r = await window.supabaseClient.from('entregas_delivery').select('monto_bs').eq('delivery_id', deliveryid);
            if (r.error) throw r.error;
            return (r.data || []).reduce(function(sum,e){ return sum+(e.monto_bs||0); }, 0);
        } catch(e) { return 0; }
    };

    // ════════════════════════════════════════
    // agregar / editar / toggle / eliminar
    // ════════════════════════════════════════
    window.agregardelivery = async function() {
        var inp = document.getElementById('nuevoDelivery');
        var nombre = inp ? inp.value.trim() : '';
        if (!nombre) { window.mostrartoast('Ingresa un nombre', 'error'); return; }
        var btn = document.querySelector('.btn-delivery');
        if (btn) { btn.disabled=true; btn.innerHTML='<i class="Fas fa-spinner fa-spin"></i>'; }
        try {
            var r = await window.supabaseClient.from('deliverys').insert([{ id: window.generarid('del_'), nombre: nombre, activo: true }]);
            if (r.error) throw r.error;
            if (inp) inp.value = '';
            await window.cargardeliverys();
            window.mostrartoast('Motorizado agregado', 'success');
        } catch(e) { window.mostrartoast('Error: '+(e.message||e),'error'); }
        finally { if(btn){btn.disabled=false;btn.innerHTML='<i class="Fas fa-plus"></i> Agregar';} }
    };

    window.editardelivery = function(id) {
        var d = (window.deliverys||[]).find(function(x){ return x.id===id; });
        if (!d) return;
        window.deliveryeditandoid = id;
        var ni=document.getElementById('deliveryNombre'); if(ni) ni.value=d.nombre||'';
        var es=document.getElementById('deliveryEstado'); if(es) es.value=d.activo?'true':'false';
        if (d.foto) {
            var ui=document.getElementById('deliveryFotoUrl'); if(ui) ui.value=d.foto;
            var pi=document.getElementById('deliveryPreviewImg'); if(pi) pi.src=d.foto;
            var pd=document.getElementById('deliveryFotoPreview'); if(pd) pd.style.display='flex';
            currentdeliveryfotourl=d.foto;
        } else {
            var ui2=document.getElementById('deliveryFotoUrl'); if(ui2) ui2.value='';
            var pd2=document.getElementById('deliveryFotoPreview'); if(pd2) pd2.style.display='none';
            currentdeliveryfotourl='';
        }
        var modal=document.getElementById('deliveryModal'); if(modal) modal.classList.add('active');
    };

    window.toggledeliveryactivo = async function(id, activo) {
        try {
            await window.supabaseClient.from('deliverys').update({ activo: activo }).eq('id', id);
            await window.cargardeliverys();
        } catch(e) { console.error('Error toggle delivery:', e); }
    };

    window.eliminardelivery = async function(id) {
        var d = (window.deliverys||[]).find(function(x){ return x.id===id; });
        if (!d) return;
        window.mostrarconfirmacionpremium( 'Eliminar Motorizado', 'Eliminar al motorizado "' + d.nombre + '"? También se borrarán sus registros de entrega.',
            async function() {
                try {
                    await window.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', id);
                    await window.supabaseClient.from('deliverys').delete().eq('id', id);
                    await window.cargardeliverys();
                    window.mostrartoast('Motorizado eliminado', 'success');
                } catch(e) { window.mostrartoast('Error: '+(e.message||e),'error'); }
            }
        );
    };

    // ════════════════════════════════════════
    // pago delivery (completo o parcial)
    // ════════════════════════════════════════
    window.mostrarpagodelivery = async function(id) {
        var d = (window.deliverys||[]).find(function(x){ return x.id===id; });
        if (!d) return;
        window.deliveryparapago = id;
        var acumulado = await window.obteneracumuladodelivery(id);
        var body = document.getElementById('confirmPagoDeliveryBody');
        if (body) body.innerHTML = '<p style="Margin-bottom:1rem"><strong>' + d.nombre + '</strong> tiene acumulado: <span style="Color:var(--accent);font-weight:700;font-size:1.1rem">' + window.formatbs(acumulado) + '</span></p>'+ '<div style="Display:flex;flex-direction:column;gap:.75rem">'+ '<label style="Display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer">'+ '<input type="Radio" name="Tipopago" value="Total" checked style="Margin-top:3px;accent-color:var(--success)">'+ '<div><div style="Font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago total</div><div style="Font-size:.78rem;color:var(--text-muted)">Reinicia el acumulado a Bs 0,00</div></div>'+ '<span style="Margin-left:auto;font-weight:800;color:var(--success)">' + window.formatbs(acumulado) + '</span></label>'+ '<label style="Display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer">'+ '<input type="Radio" name="Tipopago" value="Parcial" style="Margin-top:3px;accent-color:var(--warning)">'+ '<div style="Flex:1"><div style="Font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago parcial</div>'+ '<div style="Font-size:.78rem;color:var(--text-muted);margin-bottom:.4rem">Ingresa el monto a pagar</div>'+ '<input type="Number" id="Montopagoparcial" placeholder="Monto en bs" step="0.01" min="0.01" max="' + acumulado + '" Style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:8px;font-family:Montserrat,sans-serif;font-size:.88rem;outline:none;background:var(--input-bg);color:var(--text-dark)" Onclick="event.stopPropagation()" Oninput="document.querySelector(\'[name=tipoPago][value=parcial]\').checked=true">'+ '</div></label></div>';
        var btn = document.getElementById('confirmPagoDeliveryBtn');
        if (btn) btn.onclick = window.confirmarpagodelivery;
        var modal = document.getElementById('confirmPagoDeliveryModal');
        if (modal) modal.classList.add('active');
    };

    window.confirmarpagodelivery = async function() {
        if (!window.deliveryparapago) return;
        var btn = document.getElementById('confirmPagoDeliveryBtn');
        if (btn && btn.disabled) return;
        if (btn) { btn.disabled=true; btn.innerHTML='<i class="Fas fa-spinner fa-spin"></i> Procesando...'; }
        try {
            var tipo = (document.querySelector('[name="Tipopago"]:checked')||{}).value || 'total';
            if (tipo === 'parcial') {
                var inp = document.getElementById('montoPagoParcial');
                var monto = parseFloat(inp ? inp.value : 0);
                if (!monto||monto<=0) { window.mostrartoast('Ingresa un monto válido','error'); return; }
                var r1 = await window.supabaseClient.from('entregas_delivery').insert([{ delivery_id: window.deliveryparapago, monto_bs: -monto, pedido_id: null, fecha_entrega: new Date().toISOString() }]);
                if (r1.error) throw r1.error;
                window.mostrartoast('Pago parcial registrado','success');
            } else {
                var r2 = await window.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', window.deliveryparapago);
                if (r2.error) throw r2.error;
                window.mostrartoast('Pago total registrado. Acumulado reiniciado.','success');
            }
            window.cerrarmodal('confirmPagoDeliveryModal');
            await window.cargardeliverys();
        } catch(e) { window.mostrartoast('Error: '+(e.message||e),'error'); }
        finally { if(btn){btn.disabled=false;btn.innerHTML='Confirmar';} }
    };

    // ════════════════════════════════════════
    // stats cards (5.1)
    // ════════════════════════════════════════
    window._actualizardeliveryshoystats = async function() {
        try {
            var tasa = window.configglobal?.tasa_efectiva || window.configglobal?.tasa_cambio || 400;
            var hoy  = new Date(); hoy.setHours(0,0,0,0);
            var man  = new Date(hoy); man.setDate(man.getDate()+1);
            var ra = await window.supabaseClient.from('entregas_delivery').select('monto_bs');
            var totall    = (ra.data||[]).reduce(function(s,e){ return s+(e.monto_bs||0); },0);
            var totallusd = tasa>0 ? totall/tasa : 0;
            var rh = await window.supabaseClient.from('entregas_delivery').select('monto_bs')
                .gte('fecha_entrega', hoy.toISOString()).lt('fecha_entrega', man.toISOString());
            var lista  = rh.data || [];
            var totbs  = lista.reduce(function(s,e){ return s+(e.monto_bs||0); },0);
            var totusd = tasa>0 ? totbs/tasa : 0;
            var cnt    = lista.length;
            var avgbs  = cnt>0 ? totbs/cnt : 0;
            var avgusd = tasa>0 ? avgbs/tasa : 0;
            function _s(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
            _s('deliverysHoyDashboard', window.formatusd(totusd)+' / '+window.formatbs(totbs));
            _s('deliverysTotalCard',    window.formatusd(totallusd)+' / '+window.formatbs(totall));
            _s('deliverysCountCard',    String(cnt));
            _s('deliverysPromedioCard', window.formatusd(avgusd)+' / '+window.formatbs(avgbs));
        } catch(e) { console.error('Error stats deliverys:',e); }
    };

    // ════════════════════════════════════════
    // tabla últimos 5 viajes (5.2)
    // ════════════════════════════════════════
    window.cargarultimosviajes = async function() {
        var tbody = document.getElementById('ultimosViajesTbody');
        if (!tbody) return;
        try {
            var tasa = window.configglobal?.tasa_efectiva || window.configglobal?.tasa_cambio || 400;
            var r = await window.supabaseClient.from('entregas_delivery')
                .select('*, deliverys(nombre), pedidos(id, mesa, cliente_nombre, items)')
                .order('fecha_entrega', { ascending: false }).limit(5);
            if (r.error) throw r.error;
            var lista = r.data || [];
            if (!lista.length) { tbody.innerHTML='<tr><td colspan="4" style="Text-align:center;padding:1.5rem;color:var(--text-muted)">Sin viajes registrados</td></tr>'; return; }
            tbody.innerHTML = lista.map(function(e) {
                var motor = e.deliverys ? e.deliverys.nombre : '—';
                var resumen = '—';
                if (e.pedidos && e.pedidos.mesa) resumen = 'Mesa '+e.pedidos.mesa;
                else if (e.pedidos && e.pedidos.cliente_nombre) resumen = e.pedidos.cliente_nombre;
                else if (e.pedidos && e.pedidos.items && e.pedidos.items.length) {
                    resumen = e.pedidos.items.slice(0,2).map(function(i){ return (i.cantidad||1)+'x '+i.nombre; }).join(', ');
                    if (e.pedidos.items.length>2) resumen += ' +'+(e.pedidos.items.length-2)+' más';
                } else if (e.pedido_id) { resumen=e.pedido_id.slice(0,8); }
                var mbs  = e.monto_bs||0;
                var musd = tasa>0 ? mbs/tasa : 0;
                var hora = new Date(e.fecha_entrega).toLocaleString('es-VE',{timezone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                return '<tr>'+ '<td style="Padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+resumen+'</td>'+ '<td style="Padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">'+motor+'</td>'+ '<td style="Padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:var(--delivery)">'+window.formatusd(musd)+'<br><span style="Font-size:.72rem;color:var(--text-muted)">'+window.formatbs(mbs)+'</span></td>'+ '<td style="Padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">'+hora+'</td>'+ '</tr>';
            }).join('');
        } catch(err) {
            var tb2=document.getElementById('ultimosViajesTbody');
            if(tb2) tb2.innerHTML='<tr><td colspan="4" style="Text-align:center;color:var(--danger)">Error al cargar</td></tr>';
        }
    };

    // ════════════════════════════════════════
    // historial completo hoy (5.3)
    // ════════════════════════════════════════
    window.verhistorialenvioshoy = async function() {
        try {
            var tasa = window.configglobal?.tasa_efectiva || window.configglobal?.tasa_cambio || 400;
            var hoy  = new Date(); hoy.setHours(0,0,0,0);
            var man  = new Date(hoy); man.setDate(man.getDate()+1);
            var r = await window.supabaseClient.from('entregas_delivery')
                .select('*, deliverys(nombre), pedidos(id, mesa, cliente_nombre, items)')
                .gte('fecha_entrega', hoy.toISOString()).lt('fecha_entrega', man.toISOString())
                .order('fecha_entrega', { ascending: false });
            var lista  = r.data || [];
            var totbs  = lista.reduce(function(s,e){ return s+(e.monto_bs||0); },0);
            var totusd = tasa>0 ? totbs/tasa : 0;
            var rows = lista.map(function(e) {
                var motor = e.deliverys ? e.deliverys.nombre : '—';
                var resumen = '—';
                if (e.pedidos && e.pedidos.mesa) resumen='Mesa '+e.pedidos.mesa;
                else if (e.pedidos && e.pedidos.cliente_nombre) resumen=e.pedidos.cliente_nombre;
                else if (e.pedidos && e.pedidos.items && e.pedidos.items.length) {
                    resumen=e.pedidos.items.slice(0,2).map(function(i){return (i.cantidad||1)+'x '+i.nombre;}).join(', ');
                }
                var mbs=e.monto_bs||0; var musd=tasa>0?mbs/tasa:0;
                var hora=new Date(e.fecha_entrega).toLocaleString('es-VE',{timezone:'America/Caracas',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
                return '<tr>'+'<td style="Padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.8rem">'+resumen+'</td>'+'<td style="Padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">'+motor+'</td>'+'<td style="Padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:var(--delivery)">'+window.formatusd(musd)+' / '+window.formatbs(mbs)+'</td>'+'<td style="Padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">'+hora+'</td>'+'</tr>';
            }).join('');
            var pl=lista.length;
            var totline=pl+' envío'+(pl!==1?'s':'')+' · Total: '+window.formatusd(totusd)+' / '+window.formatbs(totbs);
            var emptyrow='<tr><td colspan="4" style="Text-align:center;padding:1.5rem;color:var(--text-muted)">Sin envíos hoy</td></tr>';
            var ov=document.createElement('div');
            ov.style.csstext='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
            ov.innerHTML='<div style="Background:var(--card-bg);border-radius:16px;max-width:700px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.4)">'+'<div style="Background:linear-gradient(135deg,var(--delivery),#00838f);padding:1rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center">'+'<div><div style="Font-weight:700;font-size:1rem"><i class="Fas fa-motorcycle"></i> Historial Envíos — Hoy</div><div style="Font-size:.75rem;opacity:.8;margin-top:2px">'+totline+'</div></div>'+'<button onclick="this.closest(\'[style*=position]\').remove()" Style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:1rem;font-weight:700;display:flex;align-items:center;justify-content:center">&#x2715;</button>'+'</div>'+'<div style="Overflow-y:auto;flex:1"><table style="Width:100%;border-collapse:collapse">'+'<thead><tr style="Background:var(--secondary)">'+'<th style="Padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Resumen</th>'+'<th style="Padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Motorizado</th>'+'<th style="Padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Monto</th>'+'<th style="Padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Hora</th>'+'</tr></thead>'+'<tbody>'+(rows||emptyrow)+'</tbody></table></div>'+'<div style="Padding:.85rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">'+'<button onclick="this.closest(\'[style*=position]\').remove()" Style="background:var(--primary);color:#fff;border:none;padding:.55rem 1.25rem;border-radius:8px;cursor:pointer;font-family:Montserrat,sans-serif;font-weight:600;font-size:.85rem">Cerrar</button>'+'</div></div>';
            ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
            document.body.appendchild(ov);
        } catch(err) { console.error('Error historial envíos:',err); window.mostrartoast('Error al cargar historial','error'); }
    };

    // ════════════════════════════════════════
    // foto delivery
    // ════════════════════════════════════════
    function handledeliveryfotofile() {
        var fi=document.getElementById('deliveryFoto');
        var ui=document.getElementById('deliveryFotoUrl');
        var pd=document.getElementById('deliveryFotoPreview');
        var pi=document.getElementById('deliveryPreviewImg');
        var rb=document.getElementById('deliveryFotoRemoveBtn');
        if(!fi||!pd) return;
        if(fi.files&&fi.files[0]){
            currentdeliveryfotofile=fi.files[0]; currentdeliveryfotourl='';
            if(ui){ui.value='';ui.disabled=true;}
            var reader=new FileReader();
            reader.onload=function(e){if(pi)pi.src=e.target.result;pd.style.display='flex';if(rb)rb.style.display='flex';};
            reader.readasdataurl(fi.files[0]);
        } else { if(ui)ui.disabled=false; }
    }
    function handledeliveryfotourl() {
        var ui=document.getElementById('deliveryFotoUrl');
        var fi=document.getElementById('deliveryFoto');
        var pd=document.getElementById('deliveryFotoPreview');
        var pi=document.getElementById('deliveryPreviewImg');
        var rb=document.getElementById('deliveryFotoRemoveBtn');
        if(!ui||!pd) return;
        if(fi&&fi.files&&fi.files[0]) return;
        var url=ui.value.trim();
        if(url){currentdeliveryfotourl=url;currentdeliveryfotofile=null;if(pi)pi.src=url;pd.style.display='flex';if(rb)rb.style.display='flex';}
        else{pd.style.display='none';if(rb)rb.style.display='none';if(pi)pi.src='';currentDeliveryFotoUrl='';}
    }
    function removeDeliveryFoto() {
        var fi=document.getElementById('deliveryFoto');
        var ui=document.getElementById('deliveryFotoUrl');
        var pd=document.getElementById('deliveryFotoPreview');
        var pi=document.getElementById('deliveryPreviewImg');
        var rb=document.getElementById('deliveryFotoRemoveBtn');
        if(fi)fi.value=''; if(ui){ui.value='';ui.disabled=false;}
        if(pd)pd.style.display='none'; if(rb)rb.style.display='none';
        if(pi)pi.src=''; currentdeliveryfotofile=null; currentdeliveryfotourl='';
    }

    // ════════════════════════════════════════
    // guardar delivery
    // ════════════════════════════════════════
    var savedeliverybtn = document.getElementById('saveDelivery');
    if (savedeliverybtn) {
        savedeliverybtn.addEventListener('click', async function() {
            if (!window.deliveryeditandoid) return;
            if (this.disabled) return;
            var nombre = ((document.getElementById('deliveryNombre')||{}).value||'').trim();
            var activoel = document.getElementById('deliveryEstado');
            var activo = activoel ? activoel.value==='true' : true;
            if (!nombre) { window.mostrartoast('Ingresa un nombre','error'); return; }
            var fotourl='';
            var archivofoto=(document.getElementById('deliveryFoto')||{files:[]}).files[0];
            var fotourlinput=((document.getElementById('deliveryFotoUrl')||{}).value)||'';
            if(archivofoto){
                var res=await window.subirimagenplatillo(archivofoto,'deliverys');
                if(res.success) fotourl=res.url; else{window.mostrartoast('Error al subir foto: '+res.error,'error');return;}
            } else if(fotourlinput){fotourl=fotourlinput;}
            try {
                this.disabled=true; this.innerHTML='<i class="Fas fa-spinner fa-spin"></i>';
                var r=await window.supabaseClient.from('deliverys').update({nombre:nombre,activo:activo,foto:fotourl||null}).eq('id',window.deliveryeditandoid);
                if(r.error) throw r.error;
                window.cerrarmodal('deliveryModal');
                await window.cargardeliverys();
                window.mostrartoast('Motorizado actualizado','success');
            } catch(e){window.mostrartoast('Error al actualizar','error');}
            finally{this.disabled=false;this.innerHTML='Guardar';}
        });
    }

    var closedelivery=document.getElementById('closeDeliveryModal');
    if(closedelivery) closedelivery.addEventListener('click',function(){window.cerrarmodal('deliveryModal');});
    var canceldelivery=document.getElementById('cancelDeliveryEdit');
    if(canceldelivery) canceldelivery.addEventListener('click',function(){window.cerrarmodal('deliveryModal');});
    var dfotofile=document.getElementById('deliveryFoto');
    if(dfotofile) dfotofile.addEventListener('change',handledeliveryfotofile);
    var dfotourl=document.getElementById('deliveryFotoUrl');
    if(dfotourl) dfotourl.addEventListener('input',handledeliveryfotourl);
    var dfotorm=document.getElementById('deliveryFotoRemoveBtn');
    if(dfotorm) dfotorm.addEventListener('click',removeDeliveryFoto);

})();
