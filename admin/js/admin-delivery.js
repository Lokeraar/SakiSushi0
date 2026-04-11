// admin-delivery.js — Motorizados (Deliverys)
(function() {
'usestrict';
varcurrentDeliveryFotoFile = null;
varcurrentDeliveryFotoUrl  = '';

window.cargarDeliverys = asyncfunction() {
    try {
        varr = awaitwindow.supabaseClient.from('deliverys').select('*').order('nombre');
        if (r.error) throwr.error;
        window.deliverys = r.data || [];
        awaitwindow.renderizarDeliverys();
        if (typeofwindow.cargarUltimosViajes === 'function') window.cargarUltimosViajes();
        if (typeofwindow._actualizarDeliverysHoyStats === 'function') window._actualizarDeliverysHoyStats();
    } catch(e) { console.error('Errorcargandodeliverys:', e); }
};

window.renderizarDeliverys = asyncfunction() {
    if (window._renderizandoDeliverys) return;
    window._renderizandoDeliverys = true;
    vargrid = document.getElementById('deliverysGrid');
    if (!grid) { window._renderizandoDeliverys = false; return; }
    grid.innerHTML = '';
    try {
        vartasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        vardeliverys = window.deliverys || [];
        for (vari = 0; i < deliverys.length; i++) {
            vard = deliverys[i];
            varacumulado = awaitwindow.obtenerAcumuladoDelivery(d.id);
            varacumUsd   = tasa > 0 ? acumulado / tasa : 0;
            varavatar    = d.foto
                ? `<imgsrc="${d.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer;" onclick="window.expandirImagen(this.src)">`
                : `<divstyle="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.4rem;background:linear-gradient(135deg,var(--delivery),#00838F);border-radius:50%;"><iclass="fasfa-motorcycle"></i></div>`;
            
            varstatusClass = d.activo ? 'status-activo' : 'status-inactivo';
            varstatusText  = d.activo ? 'Activo' : 'Inactivo';
            vartoggleClass = d.activo ? 'btn-toggle-on' : 'btn-toggle-off';
            vartoggleTxt   = d.activo ? 'Inhabilitar' : 'Activar';
            vartoggleVal   = String(!d.activo);

            grid.innerHTML += `
            <divclass="delivery-card" style="display:grid; grid-template-columns: 64px 1frauto; grid-template-rows: autoautoauto; gap: 8px 12px; align-items: center; background: var(--card-bg); border-radius: 14px; padding: 12px 16px; box-shadow: var(--shadow-sm); border: 1pxsolidvar(--border); border-left: 4pxsolidvar(--delivery); transition: var(--transition);">
                <divstyle="grid-row: 1 / 4; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--secondary);">
                    ${avatar}
                </div>

                <divstyle="grid-column: 2; grid-row: 1; font-weight: 700; font-size: 0.95rem; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${d.nombre}
                </div>

                <divstyle="grid-column: 2; grid-row: 2; font-size: 0.85rem; font-weight: 700; color: var(--delivery);">
                    ${window.formatUSD(acumUsd)} / ${window.formatBs(acumulado)}
                </div>

                <divstyle="grid-column: 2; grid-row: 3; display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    <buttonclass="btn-sm" style="background:linear-gradient(135deg,var(--success),#2E7D32);color:#fff; font-size:0.75rem; padding:4px 10px; border-radius:20px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" onclick="window.mostrarPagoDelivery('${d.id}')">
                        <iclass="fasfa-hand-holding-usd"></i> Pagado
                    </button>
                    <buttonclass="btn-toggle ${toggleClass}" onclick="window.toggleDeliveryActivo('${d.id}', ${toggleVal})">${toggleTxt}</button>
                </div>

                <divstyle="grid-column: 3; grid-row: 1; justify-self: end;">
                    <spanclass="${statusClass}"><iclass="fas ${d.activo ? 'fa-check-circle' : 'fa-circle'}"></i> ${statusText}</span>
                </div>

                <divstyle="grid-column: 3; grid-row: 2;"></div>

                <divstyle="grid-column: 3; grid-row: 3; justify-self: end; display: flex; gap: 6px;">
                    <buttonclass="btn-iconedit" onclick="window.editarDelivery('${d.id}')" title="Editar"><iclass="fasfa-pen"></i></button>
                    <buttonclass="btn-icondelete" onclick="window.eliminarDelivery('${d.id}')" title="Eliminar"><iclass="fasfa-trash"></i></button>
                </div>
            </div>`;
        }
    } finally { window._renderizandoDeliverys = false; }
};

window.obtenerAcumuladoDelivery = asyncfunction(deliveryId) {
    try {
        varr = awaitwindow.supabaseClient.from('entregas_delivery').select('monto_bs').eq('delivery_id', deliveryId);
        if (r.error) throwr.error;
        return (r.data || []).reduce(function(sum,e){ returnsum+(e.monto_bs||0); }, 0);
    } catch(e) { return 0; }
};

window.agregarDelivery = asyncfunction() {
    varinp = document.getElementById('nuevoDelivery');
    varnombre = inp ? inp.value.trim() : '';
    if (!nombre) { window.mostrarToast('Ingresaunnombre', 'error'); return; }
    varbtn = document.querySelector('.btn-delivery');
    if (btn) { btn.disabled=true; btn.innerHTML='<iclass="fasfa-spinnerfa-spin"></i>'; }
    try {
        varr = awaitwindow.supabaseClient.from('deliverys').insert([{ id: window.generarId('del_'), nombre: nombre, activo: true }]);
        if (r.error) throwr.error;
        if (inp) inp.value = '';
        awaitwindow.cargarDeliverys();
        window.mostrarToast('Motorizadoagregado', 'success');
    } catch(e) { window.mostrarToast('Error: '+(e.message||e),'error'); }
    finally { if(btn){btn.disabled=false;btn.innerHTML='<iclass="fasfa-plus"></i> Agregar';} }
};

window.editarDelivery = function(id) {
    vard = (window.deliverys||[]).find(function(x){ returnx.id===id; });
    if (!d) return;
    window.deliveryEditandoId = id;
    varni=document.getElementById('deliveryNombre'); if(ni) ni.value=d.nombre||'';
    vares=document.getElementById('deliveryEstado'); if(es) es.value=d.activo?'true':'false';
    if (d.foto) {
        varui=document.getElementById('deliveryFotoUrl'); if(ui) ui.value=d.foto;
        varpi=document.getElementById('deliveryPreviewImg'); if(pi) pi.src=d.foto;
        varpd=document.getElementById('deliveryFotoPreview'); if(pd) pd.style.display='flex';
        currentDeliveryFotoUrl=d.foto;
    } else {
        varui2=document.getElementById('deliveryFotoUrl'); if(ui2) ui2.value='';
        varpd2=document.getElementById('deliveryFotoPreview'); if(pd2) pd2.style.display='none';
        currentDeliveryFotoUrl='';
    }
    varmodal=document.getElementById('deliveryModal'); if(modal) modal.classList.add('active');
};

window.toggleDeliveryActivo = asyncfunction(id, activo) { 
    try {
        awaitwindow.supabaseClient.from('deliverys').update({ activo: activo }).eq('id', id);
        awaitwindow.cargarDeliverys();
    } catch(e) { console.error('Errortoggledelivery:', e); }
};

window.eliminarDelivery = asyncfunction(id) {
    vard = (window.deliverys||[]).find(function(x){ returnx.id===id; });
    if (!d) return;
    window.mostrarConfirmacionPremium(
        'EliminarMotorizado',
        'Eliminaralmotorizado "' + d.nombre + '"? Tambiénseborraránsusregistrosdeentrega.',
        asyncfunction() {
            try {
                awaitwindow.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', id);
                awaitwindow.supabaseClient.from('deliverys').delete().eq('id', id);
                awaitwindow.cargarDeliverys();
                window.mostrarToast('Motorizadoeliminado', 'success');
            } catch(e) { window.mostrarToast('Error: '+(e.message||e),'error'); }
        }
    );
};

window.mostrarPagoDelivery = asyncfunction(id) {
    vard = (window.deliverys||[]).find(function(x){ returnx.id===id; });
    if (!d) return;
    window.deliveryParaPago = id;
    varacumulado = awaitwindow.obtenerAcumuladoDelivery(id);
    varbody = document.getElementById('confirmPagoDeliveryBody');
    if (body) body.innerHTML = '<pstyle="margin-bottom:1rem"><strong>' + d.nombre + '</strong> tieneacumulado: <spanstyle="color:var(--accent);font-weight:700;font-size:1.1rem">' + window.formatBs(acumulado) + '</span></p>'
        + '<divstyle="display:flex;flex-direction:column;gap:.75rem">'
        + '<labelstyle="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2pxsolidvar(--border);border-radius:10px;cursor:pointer">'
        + '<inputtype="radio" name="tipoPago" value="total" checkedstyle="margin-top:3px;accent-color:var(--success)">'
        + '<div><divstyle="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pagototal</div><divstyle="font-size:.78rem;color:var(--text-muted)">ReiniciaelacumuladoaBs 0,00</div></div>'
        + '<spanstyle="margin-left:auto;font-weight:800;color:var(--success)">' + window.formatBs(acumulado) + '</span></label>'
        + '<labelstyle="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2pxsolidvar(--border);border-radius:10px;cursor:pointer">'
        + '<inputtype="radio" name="tipoPago" value="parcial" style="margin-top:3px;accent-color:var(--warning)">'
        + '<divstyle="flex:1"><divstyle="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pagoparcial</div>'
        + '<divstyle="font-size:.78rem;color:var(--text-muted);margin-bottom:.4rem">Ingresaelmontoapagar</div>'
        + '<inputtype="number" id="montoPagoParcial" placeholder="MontoenBs" step="0.01" min="0.01" max="' + acumulado + '" style="width:100%;padding:.5rem .75rem;border:1pxsolidvar(--border);border-radius:8px;font-family:Montserrat,sans-serif;font-size:.88rem;outline:none;background:var(--input-bg);color:var(--text-dark)" onclick="event.stopPropagation()" oninput="document.querySelector(\'[name=tipoPago][value=parcial]\').checked=true">'
        + '</div></label></div>';
    varbtn = document.getElementById('confirmPagoDeliveryBtn');
    if (btn) btn.onclick = window.confirmarPagoDelivery;
    varmodal = document.getElementById('confirmPagoDeliveryModal');
    if (modal) modal.classList.add('active');
};

window.confirmarPagoDelivery = asyncfunction() {
    if (!window.deliveryParaPago) return;
    varbtn = document.getElementById('confirmPagoDeliveryBtn');
    if (btn && btn.disabled) return;
    if (btn) { btn.disabled=true; btn.innerHTML='<iclass="fasfa-spinnerfa-spin"></i> Procesando...'; }
    try {
        vartipo = (document.querySelector('[name="tipoPago"]:checked')||{}).value || 'total';
        if (tipo === 'parcial') {
            varinp = document.getElementById('montoPagoParcial');
            varmonto = parseFloat(inp ? inp.value : 0);
            if (!monto||monto <=0) { window.mostrarToast('Ingresaunmontoválido','error'); return; }
            varr1 = awaitwindow.supabaseClient.from('entregas_delivery').insert([{ delivery_id: window.deliveryParaPago, monto_bs: -monto, pedido_id: null, fecha_entrega: newDate().toISOString() }]);
            if (r1.error) throwr1.error;
            window.mostrarToast('Pagoparcialregistrado','success');
        } else {
            varr2 = awaitwindow.supabaseClient.from('entregas_delivery').delete().eq('delivery_id', window.deliveryParaPago);
            if (r2.error) throwr2.error;
            window.mostrarToast('Pagototalregistrado. Acumuladoreiniciado.','success');
        }
        window.cerrarModal('confirmPagoDeliveryModal');
        awaitwindow.cargarDeliverys();
    } catch(e) { window.mostrarToast('Error: '+(e.message||e),'error'); }
    finally { if(btn){btn.disabled=false;btn.innerHTML='Confirmar';} }
};

window._actualizarDeliverysHoyStats = asyncfunction() {
    try {
        vartasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        varhoy  = newDate(); hoy.setHours(0,0,0,0);
        varman  = newDate(hoy); man.setDate(man.getDate()+1);
        varra = awaitwindow.supabaseClient.from('entregas_delivery').select('monto_bs');
        vartotAll    = (ra.data||[]).reduce(function(s,e){ returns+(e.monto_bs||0); },0);
        vartotAllUsd = tasa >0 ? totAll/tasa : 0;
        varrh = awaitwindow.supabaseClient.from('entregas_delivery').select('monto_bs')
            .gte('fecha_entrega', hoy.toISOString()).lt('fecha_entrega', man.toISOString());
        varlista  = rh.data || [];
        vartotBs  = lista.reduce(function(s,e){ returns+(e.monto_bs||0); },0);
        vartotUsd = tasa >0 ? totBs/tasa : 0;
        varcnt    = lista.length;
        varavgBs  = cnt >0 ? totBs/cnt : 0;
        varavgUsd = tasa >0 ? avgBs/tasa : 0;
        function_s(id,v){ varel=document.getElementById(id); if(el) el.textContent=v; }
        _s('deliverysHoyDashboard', window.formatUSD(totUsd)+' / '+window.formatBs(totBs));
        _s('deliverysTotalCard',    window.formatUSD(totAllUsd)+' / '+window.formatBs(totAll));
        _s('deliverysCountCard',    String(cnt));
        _s('deliverysPromedioCard', window.formatUSD(avgUsd)+' / '+window.formatBs(avgBs));
    } catch(e) { console.error('Errorstatsdeliverys:',e); }
};

window.cargarUltimosViajes = asyncfunction() {
    vartbody = document.getElementById('ultimosViajesTbody');
    if (!tbody) return;
    try {
        vartasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        varr = awaitwindow.supabaseClient.from('entregas_delivery')
            .select('*, deliverys(nombre), pedidos(id, mesa, cliente_nombre, items)')
            .order('fecha_entrega', { ascending: false }).limit(5);
        if (r.error) throwr.error;
        varlista = r.data || [];
        if (!lista.length) { tbody.innerHTML='<tr><tdcolspan="4" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sinviajesregistrados</td></tr>'; return; }
        tbody.innerHTML = lista.map(function(e) {
            varmotor = e.deliverys ? e.deliverys.nombre : '—';
            varresumen = '—';
            if (e.pedidos && e.pedidos.mesa) resumen = 'Mesa '+e.pedidos.mesa;
            elseif (e.pedidos && e.pedidos.cliente_nombre) resumen = e.pedidos.cliente_nombre;
            elseif (e.pedidos && e.pedidos.items && e.pedidos.items.length) {
                resumen = e.pedidos.items.slice(0,2).map(function(i){ return (i.cantidad||1)+'x '+i.nombre; }).join(', ');
                if (e.pedidos.items.length >2) resumen += ' +'+(e.pedidos.items.length-2)+' más';
            } elseif (e.pedido_id) { resumen=e.pedido_id.slice(0,8); }
            varmBs  = e.monto_bs||0;
            varmUsd = tasa >0 ? mBs/tasa : 0;
            varhora = newDate(e.fecha_entrega).toLocaleString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
            return '<tr>'
                + '<tdstyle="padding:.6rem 1rem;border-bottom:1pxsolidvar(--border);font-size:.82rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+resumen+'</td>'
                + '<tdstyle="padding:.6rem 1rem;border-bottom:1pxsolidvar(--border);font-size:.82rem;font-weight:600">'+motor+'</td>'
                + '<tdstyle="padding:.6rem 1rem;border-bottom:1pxsolidvar(--border);font-size:.82rem;font-weight:700;color:var(--delivery)">'+window.formatUSD(mUsd)+'<br><spanstyle="font-size:.72rem;color:var(--text-muted)">'+window.formatBs(mBs)+'</span></td>'
                + '<tdstyle="padding:.6rem 1rem;border-bottom:1pxsolidvar(--border);font-size:.78rem;color:var(--text-muted)">'+hora+'</td>'
                + '</tr>';
        }).join('');
    } catch(err) {
        vartb2=document.getElementById('ultimosViajesTbody');
        if(tb2) tb2.innerHTML='<tr><tdcolspan="4" style="text-align:center;color:var(--danger)">Erroralcargar</td></tr>';
    }
};

functionhandleDeliveryFotoFile() {
    varfi=document.getElementById('deliveryFoto');
    varui=document.getElementById('deliveryFotoUrl');
    varpd=document.getElementById('deliveryFotoPreview');
    varpi=document.getElementById('deliveryPreviewImg');
    varrb=document.getElementById('deliveryFotoRemoveBtn');
    if(!fi||!pd) return;
    if(fi.files && fi.files[0]){
        currentDeliveryFotoFile=fi.files[0]; currentDeliveryFotoUrl='';
        if(ui){ui.value='';ui.disabled=true;}
        varreader=newFileReader();
        reader.onload=function(e){if(pi)pi.src=e.target.result;pd.style.display='flex';if(rb)rb.style.display='flex';};
        reader.readAsDataURL(fi.files[0]);
    } else { if(ui)ui.disabled=false; }
}
functionhandleDeliveryFotoUrl() {
    varui=document.getElementById('deliveryFotoUrl');
    varfi=document.getElementById('deliveryFoto');
    varpd=document.getElementById('deliveryFotoPreview');
    varpi=document.getElementById('deliveryPreviewImg');
    varrb=document.getElementById('deliveryFotoRemoveBtn');
    if(!ui||!pd) return;
    if(fi && fi.files && fi.files[0]) return;
    varurl=ui.value.trim();
    if(url){currentDeliveryFotoUrl=url;currentDeliveryFotoFile=null;if(pi)pi.src=url;pd.style.display='flex';if(rb)rb.style.display='flex';}
    else{pd.style.display='none';if(rb)rb.style.display='none';if(pi)pi.src='';currentDeliveryFotoUrl='';}
}
functionremoveDeliveryFoto() {
    varfi=document.getElementById('deliveryFoto');
    varui=document.getElementById('deliveryFotoUrl');
    varpd=document.getElementById('deliveryFotoPreview');
    varpi=document.getElementById('deliveryPreviewImg');
    varrb=document.getElementById('deliveryFotoRemoveBtn');
    if(fi)fi.value=''; if(ui){ui.value='';ui.disabled=false;}
    if(pd)pd.style.display='none'; if(rb)rb.style.display='none';
    if(pi)pi.src=''; currentDeliveryFotoFile=null; currentDeliveryFotoUrl='';
}

varsaveDeliveryBtn = document.getElementById('saveDelivery');
if (saveDeliveryBtn) {
    saveDeliveryBtn.addEventListener('click', asyncfunction() {
        if (!window.deliveryEditandoId) return;
        if (this.disabled) return;
        varnombre = ((document.getElementById('deliveryNombre')||{}).value||'').trim();
        varactivoEl = document.getElementById('deliveryEstado');
        varactivo = activoEl ? activoEl.value==='true' : true;
        if (!nombre) { window.mostrarToast('Ingresaunnombre','error'); return; }
        varfotoUrl='';
        vararchivoFoto=(document.getElementById('deliveryFoto')||{files:[]}).files[0];
        varfotoUrlInput=((document.getElementById('deliveryFotoUrl')||{}).value)||'';
        if(archivoFoto){
            varres=awaitwindow.subirImagenPlatillo(archivoFoto,'deliverys');
            if(res.success) fotoUrl=res.url; else{window.mostrarToast('Erroralsubirfoto: '+res.error,'error');return;}
        } elseif(fotoUrlInput){fotoUrl=fotoUrlInput;}
        try {
            this.disabled=true; this.innerHTML='<iclass="fasfa-spinnerfa-spin"></i>';
            varr=awaitwindow.supabaseClient.from('deliverys').update({nombre:nombre,activo:activo,foto:fotoUrl||null}).eq('id',window.deliveryEditandoId);
            if(r.error) throwr.error;
            window.cerrarModal('deliveryModal');
            awaitwindow.cargarDeliverys();
            window.mostrarToast('Motorizadoactualizado','success');
        } catch(e){window.mostrarToast('Erroralactualizar','error');}
        finally{this.disabled=false;this.innerHTML='Guardar';}
    });
}

varcloseDelivery=document.getElementById('closeDeliveryModal');
if(closeDelivery) closeDelivery.addEventListener('click',function(){window.cerrarModal('deliveryModal');});
varcancelDelivery=document.getElementById('cancelDeliveryEdit');
if(cancelDelivery) cancelDelivery.addEventListener('click',function(){window.cerrarModal('deliveryModal');});
vardFotoFile=document.getElementById('deliveryFoto');
if(dFotoFile) dFotoFile.addEventListener('change',handleDeliveryFotoFile);
vardFotoUrl=document.getElementById('deliveryFotoUrl');
if(dFotoUrl) dFotoUrl.addEventListener('input',handleDeliveryFotoUrl);
vardFotoRm=document.getElementById('deliveryFotoRemoveBtn');
if(dFotoRm) dFotoRm.addEventListener('click',removeDeliveryFoto);
})();
