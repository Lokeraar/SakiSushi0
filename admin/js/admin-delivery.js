// admin-delivery.js — Motorizados (Deliverys)
(function() {
'use strict';
var currentDeliveryFotoFile = null;
var currentDeliveryFotoUrl  = '';

window.cargarDeliverys = async function() {
    try {
        var r = await window.supabaseClient.from('deliverys').select('*').order('nombre');
        if (r.error) throw r.error;
        window.deliverys = r.data || [];
        await window.renderizarDeliverys();
        if (typeof window.cargarUltimosViajes === 'function') window.cargarUltimosViajes();
        if (typeof window._actualizarDeliverysHoyStats === 'function') window._actualizarDeliverysHoyStats();
    } catch(e) { console.error('Error cargando deliverys:', e); }
};

window.renderizarDeliverys = async function() {
    if (window._renderizandoDeliverys) return;
    window._renderizandoDeliverys = true;
    var grid = document.getElementById('deliverysGrid');
    if (!grid) { window._renderizandoDeliverys = false; return; }
    grid.innerHTML = '';
    try {
        var tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        var deliverys = window.deliverys || [];
        for (var i = 0; i < deliverys.length; i++) {
            var d = deliverys[i];
            var acumulado = await window.obtenerAcumuladoDelivery(d.id);
            var acumUsd   = tasa > 0 ? acumulado / tasa : 0;
            var avatar    = d.foto
                ? `<img src="${d.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer;" onclick="window.expandirImagen(this.src)">`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.4rem;background:linear-gradient(135deg,var(--delivery),#00838F);border-radius:50%;"><i class="fas fa-motorcycle"></i></div>`;
            
            var statusClass = d.activo ? 'status-activo' : 'status-inactivo';
            var statusText  = d.activo ? 'Activo' : 'Inactivo';
            var toggleClass = d.activo ? 'btn-toggle-on' : 'btn-toggle-off';
            var toggleTxt   = d.activo ? 'Inhabilitar' : 'Activar';
            var toggleVal   = String(!d.activo);

            grid.innerHTML += `
            <div class="delivery-card" style="display:grid; grid-template-columns: 64px 1fr auto; grid-template-rows: auto auto auto; gap: 8px 12px; align-items: center; background: var(--card-bg); border-radius: 14px; padding: 12px 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); border-left: 4px solid var(--delivery); transition: var(--transition);">
                <div style="grid-row: 1 / 4; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--secondary);">
                    ${avatar}
                </div>

                <div style="grid-column: 2; grid-row: 1; font-weight: 700; font-size: 0.95rem; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${d.nombre}
                </div>

                <div style="grid-column: 2; grid-row: 2; font-size: 0.85rem; font-weight: 700; color: var(--delivery);">
                    ${window.formatUSD(acumUsd)} / ${window.formatBs(acumulado)}
                </div>

                <div style="grid-column: 2; grid-row: 3; display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    <button class="btn-sm" style="background:linear-gradient(135deg,var(--success),#2E7D32);color:#fff; font-size:0.75rem; padding:4px 10px; border-radius:20px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" onclick="window.mostrarPagoDelivery('${d.id}')">
                        <i class="fas fa-hand-holding-usd"></i> Pagado
                    </button>
                    <button class="btn-toggle ${toggleClass}" onclick="window.toggleDeliveryActivo('${d.id}', ${toggleVal})">${toggleTxt}</button>
                </div>

                <div style="grid-column: 3; grid-row: 1; justify-self: end;">
                    <span class="${statusClass}"><i class="fas ${d.activo ? 'fa-check-circle' : 'fa-circle'}"></i> ${statusText}</span>
                </div>

                <div style="grid-column: 3; grid-row: 2;"></div>

                <div style="grid-column: 3; grid-row: 3; justify-self: end; display: flex; gap: 6px;">
                    <button class="btn-icon edit" onclick="window.editarDelivery('${d.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon delete" onclick="window.eliminarDelivery('${d.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }
    } finally { window._renderizandoDeliverys = false; }
};

window.obtenerAcumuladoDelivery = async function(deliveryId) {
    try {
        var r = await window.supabaseClient.from('entregas_delivery').select('monto_bs').eq('delivery_id', deliveryId);
        if (r.error) throw r.error;
        return (r.data || []).reduce(function(sum,e){ return sum+(e.monto_bs||0); }, 0);
    } catch(e) { return 0; }
};

window.agregarDelivery = async function() {
    var inp = document.getElementById('nuevoDelivery');
    var nombre = inp ? inp.value.trim() : '';
    if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
    var btn = document.querySelector('.btn-delivery');
    if (btn) { btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>'; }
    try {
        var r = await window.supabaseClient.from('deliverys').insert([{ id: window.generarId('del_'), nombre: nombre, activo: true }]);
        if (r.error) throw r.error;
        if (inp) inp.value = '';
        await window.cargarDeliverys();
        window.mostrarToast('Motorizado agregado', 'success');
    } catch(e) { window.mostrarToast('Error: '+(e.message||e),'error'); }
    finally { if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-plus"></i> Agregar';} }
};

window.editarDelivery = function(id) {
    var d = (window.deliverys||[]).find(function(x){ return x.id===id; });
    if (!d) return;
    window.deliveryEditandoId = id;
    var ni=document.getElementById('deliveryNombre'); if(ni) ni.value=d.nombre||'';
    var es=document.getElementById('deliveryEstado'); if(es) es.value=d.activo?'true':'false';
    if (d.foto) {
        var ui=document.getElementById('deliveryFotoUrl'); if(ui) ui.value=d.foto;
        var pi=document.getElementById('deliveryPreviewImg'); if(pi) pi.src=d.foto;
        var pd=document.getElementById('deliveryFotoPreview'); if(pd) pd.style.display='flex';
        currentDeliveryFotoUrl=d.foto;
    } else {
        var ui2=document.getElementById('deliveryFotoUrl'); if(ui2) ui2.value='';
        var pd2=document.getElementById('deliveryFotoPreview'); if(pd2) pd2.style.display='none';
        currentDeliveryFotoUrl='';
    }
    var modal=document.getElementById('deliveryModal'); if(modal) modal.classList.add('active');
};

window.toggleDeliveryActivo = async function(id, activo) { 
    try {
        await window.supabaseClient.from('deliverys').update({ activo: activo }).eq('id', id);
        await window.cargarDeliverys();
    } catch(e) { console.error('Error toggle delivery:', e); }
};

window.eliminarDelivery = async function(id) {
    var d = (window.deliverys||[]).find(function(x){ return x.id===id; });
    if (!d) return;
    window.mostrarConfirmacionPremium(
        'Eliminar Motorizado',
        'Eliminar al motorizado "' + d.nombre + '"? También se borrarán sus registros de entrega.',
        async function() {
            try {
                await window.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', id);
                await window.supabaseClient.from('deliverys').delete().eq('id', id);
                await window.cargarDeliverys();
                window.mostrarToast('Motorizado eliminado', 'success');
            } catch(e) { window.mostrarToast('Error: '+(e.message||e),'error'); }
        }
    );
};

window.mostrarPagoDelivery = async function(id) {
    var d = (window.deliverys||[]).find(function(x){ return x.id===id; });
    if (!d) return;
    window.deliveryParaPago = id;
    var acumulado = await window.obtenerAcumuladoDelivery(id);
    var body = document.getElementById('confirmPagoDeliveryBody');
    if (body) body.innerHTML = '<p style="margin-bottom:1rem"><strong>' + d.nombre + '</strong> tiene acumulado: <span style="color:var(--accent);font-weight:700;font-size:1.1rem">' + window.formatBs(acumulado) + '</span></p>'
        + '<div style="display:flex;flex-direction:column;gap:.75rem">'
        + '<label style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer">'
        + '<input type="radio" name="tipoPago" value="total" checked style="margin-top:3px;accent-color:var(--success)">'
        + '<div><div style="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago total</div><div style="font-size:.78rem;color:var(--text-muted)">Reinicia el acumulado a Bs 0,00</div></div>'
        + '<span style="margin-left:auto;font-weight:800;color:var(--success)">' + window.formatBs(acumulado) + '</span></label>'
        + '<label style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2px solid var(--border);border-radius:10px;cursor:pointer">'
        + '<input type="radio" name="tipoPago" value="parcial" style="margin-top:3px;accent-color:var(--warning)">'
        + '<div style="flex:1"><div style="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pago parcial</div>'
        + '<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:.4rem">Ingresa el monto a pagar</div>'
        + '<input type="number" id="montoPagoParcial" placeholder="Monto en Bs" step="0.01" min="0.01" max="' + acumulado + '" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:8px;font-family:Montserrat,sans-serif;font-size:.88rem;outline:none;background:var(--input-bg);color:var(--text-dark)" onclick="event.stopPropagation()" oninput="document.querySelector(\'[name=tipoPago][value=parcial]\').checked=true">'
        + '</div></label></div>';
    var btn = document.getElementById('confirmPagoDeliveryBtn');
    if (btn) btn.onclick = window.confirmarPagoDelivery;
    var modal = document.getElementById('confirmPagoDeliveryModal');
    if (modal) modal.classList.add('active');
};

window.confirmarPagoDelivery = async function() {
    if (!window.deliveryParaPago) return;
    var btn = document.getElementById('confirmPagoDeliveryBtn');
    if (btn && btn.disabled) return;
    if (btn) { btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Procesando...'; }
    try {
        var tipo = (document.querySelector('[name="tipoPago"]:checked')||{}).value || 'total';
        if (tipo === 'parcial') {
            var inp = document.getElementById('montoPagoParcial');
            var monto = parseFloat(inp ? inp.value : 0);
            if (!monto||monto <=0) { window.mostrarToast('Ingresa un monto válido','error'); return; }
            var r1 = await window.supabaseClient.from('entregas_delivery').insert([{ delivery_id: window.deliveryParaPago, monto_bs: -monto, pedido_id: null, fecha_entrega: new Date().toISOString() }]);
            if (r1.error) throw r1.error;
            window.mostrarToast('Pago parcial registrado','success');
        } else {
            var r2 = await window.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', window.deliveryParaPago);
            if (r2.error) throw r2.error;
            window.mostrarToast('Pago total registrado. Acumulado reiniciado.','success');
        }
        window.cerrarModal('confirmPagoDeliveryModal');
        await window.cargarDeliverys();
    } catch(e) { window.mostrarToast('Error: '+(e.message||e),'error'); }
    finally { if(btn){btn.disabled=false;btn.innerHTML='Confirmar';} }
};

window._actualizarDeliverysHoyStats = async function() {
    try {
        var tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        var hoy  = new Date(); hoy.setHours(0,0,0,0);
        var man  = new Date(hoy); man.setDate(man.getDate()+1);
        var ra = await window.supabaseClient.from('entregas_delivery').select('monto_bs');
        var totAll    = (ra.data||[]).reduce(function(s,e){ return s+(e.monto_bs||0); },0);
        var totAllUsd = tasa >0 ? totAll/tasa : 0;
        var rh = await window.supabaseClient.from('entregas_delivery').select('monto_bs')
            .gte('fecha_entrega', hoy.toISOString()).lt('fecha_entrega', man.toISOString());
        var lista  = rh.data || [];
        var totBs  = lista.reduce(function(s,e){ return s+(e.monto_bs||0); },0);
        var totUsd = tasa >0 ? totBs/tasa : 0;
        var cnt    = lista.length;
        var avgBs  = cnt >0 ? totBs/cnt : 0;
        var avgUsd = tasa >0 ? avgBs/tasa : 0;
        function _s(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
        _s('deliverysHoyDashboard', window.formatUSD(totUsd)+' / '+window.formatBs(totBs));
        _s('deliverysTotalCard',    window.formatUSD(totAllUsd)+' / '+window.formatBs(totAll));
        _s('deliverysCountCard',    String(cnt));
        _s('deliverysPromedioCard', window.formatUSD(avgUsd)+' / '+window.formatBs(avgBs));
    } catch(e) { console.error('Error stats deliverys:',e); }
};

window.cargarUltimosViajes = async function() {
    var tbody = document.getElementById('ultimosViajesTbody');
    if (!tbody) return;
    try {
        var tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        var r = await window.supabaseClient.from('entregas_delivery')
            .select('*, deliverys(nombre), pedidos(id, mesa, cliente_nombre, items)')
            .order('fecha_entrega', { ascending: false }).limit(5);
        if (r.error) throw r.error;
        var lista = r.data || [];
        if (!lista.length) { tbody.innerHTML='<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sin viajes registrados</td></tr>'; return; }
        tbody.innerHTML = lista.map(function(e) {
            var motor = e.deliverys ? e.deliverys.nombre : '—';
            var resumen = '—';
            if (e.pedidos && e.pedidos.mesa) resumen = 'Mesa '+e.pedidos.mesa;
            else if (e.pedidos && e.pedidos.cliente_nombre) resumen = e.pedidos.cliente_nombre;
            else if (e.pedidos && e.pedidos.items && e.pedidos.items.length) {
                resumen = e.pedidos.items.slice(0,2).map(function(i){ return (i.cantidad||1)+'x '+i.nombre; }).join(', ');
                if (e.pedidos.items.length >2) resumen += ' +'+(e.pedidos.items.length-2)+' más';
            } else if (e.pedido_id) { resumen=e.pedido_id.slice(0,8); }
            var mBs  = e.monto_bs||0;
            var mUsd = tasa >0 ? mBs/tasa : 0;
            var hora = new Date(e.fecha_entrega).toLocaleString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
            return '<tr>'
                + '<td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+resumen+'</td>'
                + '<td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">'+motor+'</td>'
                + '<td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:var(--delivery)">'+window.formatUSD(mUsd)+'<br><span style="font-size:.72rem;color:var(--text-muted)">'+window.formatBs(mBs)+'</span></td>'
                + '<td style="padding:.6rem 1rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">'+hora+'</td>'
                + '</tr>';
        }).join('');
    } catch(err) {
        var tb2=document.getElementById('ultimosViajesTbody');
        if(tb2) tb2.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--danger)">Error al cargar</td></tr>';
    }
};

function handleDeliveryFotoFile() {
    var fi=document.getElementById('deliveryFoto');
    var ui=document.getElementById('deliveryFotoUrl');
    var pd=document.getElementById('deliveryFotoPreview');
    var pi=document.getElementById('deliveryPreviewImg');
    var rb=document.getElementById('deliveryFotoRemoveBtn');
    if(!fi||!pd) return;
    if(fi.files && fi.files[0]){
        currentDeliveryFotoFile=fi.files[0]; currentDeliveryFotoUrl='';
        if(ui){ui.value='';ui.disabled=true;}
        var reader=new FileReader();
        reader.onload=function(e){if(pi)pi.src=e.target.result;pd.style.display='flex';if(rb)rb.style.display='flex';};
        reader.readAsDataURL(fi.files[0]);
    } else { if(ui)ui.disabled=false; }
}
function handleDeliveryFotoUrl() {
    var ui=document.getElementById('deliveryFotoUrl');
    var fi=document.getElementById('deliveryFoto');
    var pd=document.getElementById('deliveryFotoPreview');
    var pi=document.getElementById('deliveryPreviewImg');
    var rb=document.getElementById('deliveryFotoRemoveBtn');
    if(!ui||!pd) return;
    if(fi && fi.files && fi.files[0]) return;
    var url=ui.value.trim();
    if(url){currentDeliveryFotoUrl=url;currentDeliveryFotoFile=null;if(pi)pi.src=url;pd.style.display='flex';if(rb)rb.style.display='flex';}
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
    if(pi)pi.src=''; currentDeliveryFotoFile=null; currentDeliveryFotoUrl='';
}

var saveDeliveryBtn = document.getElementById('saveDelivery');
if (saveDeliveryBtn) {
    saveDeliveryBtn.addEventListener('click', async function() {
        if (!window.deliveryEditandoId) return;
        if (this.disabled) return;
        var nombre = ((document.getElementById('deliveryNombre')||{}).value||'').trim();
        var activoEl = document.getElementById('deliveryEstado');
        var activo = activoEl ? activoEl.value==='true' : true;
        if (!nombre) { window.mostrarToast('Ingresa un nombre','error'); return; }
        var fotoUrl='';
        var archivoFoto=(document.getElementById('deliveryFoto')||{files:[]}).files[0];
        var fotoUrlInput=((document.getElementById('deliveryFotoUrl')||{}).value)||'';
        if(archivoFoto){
            var res=await window.subirImagenPlatillo(archivoFoto,'deliverys');
            if(res.success) fotoUrl=res.url; else{window.mostrarToast('Error al subir foto: '+res.error,'error');return;}
        } else if(fotoUrlInput){fotoUrl=fotoUrlInput;}
        try {
            this.disabled=true; this.innerHTML='<i class="fas fa-spinner fa-spin"></i>';
            var r=await window.supabaseClient.from('deliverys').update({nombre:nombre,activo:activo,foto:fotoUrl||null}).eq('id',window.deliveryEditandoId);
            if(r.error) throw r.error;
            window.cerrarModal('deliveryModal');
            await window.cargarDeliverys();
            window.mostrarToast('Motorizado actualizado','success');
        } catch(e){window.mostrarToast('Error al actualizar','error');}
        finally{this.disabled=false;this.innerHTML='Guardar';}
    });
}

var closeDelivery=document.getElementById('closeDeliveryModal');
if(closeDelivery) closeDelivery.addEventListener('click',function(){window.cerrarModal('deliveryModal');});
var cancelDelivery=document.getElementById('cancelDeliveryEdit');
if(cancelDelivery) cancelDelivery.addEventListener('click',function(){window.cerrarModal('deliveryModal');});
var dFotoFile=document.getElementById('deliveryFoto');
if(dFotoFile) dFotoFile.addEventListener('change',handleDeliveryFotoFile);
var dFotoUrl=document.getElementById('deliveryFotoUrl');
if(dFotoUrl) dFotoUrl.addEventListener('input',handleDeliveryFotoUrl);
var dFotoRm=document.getElementById('deliveryFotoRemoveBtn');
if(dFotoRm) dFotoRm.addEventListener('click',removeDeliveryFoto);
})();
