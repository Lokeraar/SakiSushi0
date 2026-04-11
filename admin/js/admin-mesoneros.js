// admin-mesoneros.js — MesonerosyPropinas
(function() {
'usestrict';
letcurrentMesoneroFotoFile = null;
letcurrentMesoneroFotoUrl  = '';

window.cargarMesoneros = asyncfunction() {
    try {
        const { data, error } = awaitwindow.supabaseClient.from('mesoneros').select('*').order('nombre');
        if (error) throwerror;
        window.mesoneros = data || [];
        awaitwindow.renderizarMesoneros();
        window.cargarPropinas();
    } catch(e) { console.error('Errorcargandomesoneros:', e); }
};

window.renderizarMesoneros = asyncfunction() {
    constcontainer = document.getElementById('mesonerosList');
    if (!container) return;
    
    if (!window.mesoneros || !window.mesoneros.length) {
        container.innerHTML = '<pstyle="color:var(--text-muted);font-size:.88rem;text-align:center;padding:2rem;">Nohaymesonerosregistrados.</p>';
        return;
    }

    // 1. CalcularacumuladodepropinasNOentregadas
    letacumulados = {};
    try {
        const { data: allProp } = awaitwindow.supabaseClient.from('propinas').select('mesonero_id, monto_bs, entregado').eq('entregado', false);
        (allProp || []).forEach(p => {
            acumulados[p.mesonero_id] = (acumulados[p.mesonero_id] || 0) + (p.monto_bs || 0);
        });
    } catch(e) { console.error('Errorobteniendoacumuladopropinas:', e); }

    constsorted = [...window.mesoneros].sort((a, b) => a.nombre.localeCompare(b.nombre));
    consttasa   = Number(window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400) || 400;

    container.innerHTML = sorted.map(m => {
        constinicial = m.nombre.charAt(0).toUpperCase();
        constacum    = acumulados[m.id] || 0;
        consthayAcum = acum > 0;
        constacumUsd = tasa > 0 ? acum / tasa : 0;
        
        constavatar  = m.foto
            ? `<imgsrc="${m.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer;" onclick="window.expandirImagen(this.src)">`
            : `<divstyle="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.4rem;background:linear-gradient(135deg,var(--propina),#7B1FA2);border-radius:50%;">${inicial}</div>`;
        
        conststatusClass = m.activo ? 'status-activo' : 'status-inactivo';
        conststatusText  = m.activo ? 'Activo' : 'Inactivo';
        consttoggleClass = m.activo ? 'btn-toggle-on' : 'btn-toggle-off';
        consttoggleTxt   = m.activo ? 'Inhabilitar' : 'Activar';
        consttoggleVal   = String(!m.activo);
        constpropColor   = hayAcum ? 'var(--propina)' : 'var(--text-muted)';
        constpropWeight  = hayAcum ? '700' : '400';

        return `
        <divclass="mesonero-card" style="display:grid; grid-template-columns: 64px 1frauto; grid-template-rows: autoautoauto; gap: 8px 12px; align-items: center; background: var(--card-bg); border-radius: 14px; padding: 12px 16px; box-shadow: var(--shadow-sm); border: 1pxsolidvar(--border); border-left: 4pxsolidvar(--propina); transition: var(--transition);">
            <!-- Izquierda: Foto -->
            <divstyle="grid-row: 1 / 4; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--secondary);">
                ${avatar}
            </div>

            <!-- CentroL 1: Nombre -->
            <divstyle="grid-column: 2; grid-row: 1; font-weight: 700; font-size: 0.95rem; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${m.nombre}
            </div>

            <!-- CentroL 2: AcumuladoPropinas -->
            <divstyle="grid-column: 2; grid-row: 2; font-size: 0.85rem; font-weight: ${propWeight}; color: ${propColor};">
                Propinas: ${hayAcum ? window.formatUSD(acumUsd) + ' | ' : ''}${window.formatBs(acum)}
            </div>

            <!-- CentroL 3: Pagado + Toggle -->
            <divstyle="grid-column: 2; grid-row: 3; display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                <buttonclass="btn-sm" style="background:linear-gradient(135deg,var(--propina),#7B1FA2);color:#fff; font-size:0.75rem; padding:4px 10px; border-radius:20px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" onclick="window.mostrarPagoMesonero('${m.id}')" ${!hayAcum ? 'disabledstyle="opacity:0.5;cursor:not-allowed;background:#ccc;"' : ''}>
                    <iclass="fasfa-hand-holding-heart"></i> Pagado
                </button>
                <buttonclass="btn-toggle ${toggleClass}" onclick="window.toggleMesoneroActivo('${m.id}', ${toggleVal})">${toggleTxt}</button>
            </div>

            <!-- DerechaL 1: Estado -->
            <divstyle="grid-column: 3; grid-row: 1; justify-self: end;">
                <spanclass="${statusClass}"><iclass="fas ${m.activo ? 'fa-check-circle' : 'fa-circle'}"></i> ${statusText}</span>
            </div>

            <!-- DerechaL 2: (Vacío) -->
            <divstyle="grid-column: 3; grid-row: 2;"></div>

            <!-- DerechaL 3: Editar + Papelera -->
            <divstyle="grid-column: 3; grid-row: 3; justify-self: end; display: flex; gap: 6px;">
                <buttonclass="btn-iconedit" onclick="window.editarMesonero('${m.id}')" title="Editar"><iclass="fasfa-pen"></i></button>
                <buttonclass="btn-icondelete" onclick="window.eliminarMesonero('${m.id}')" title="Eliminar"><iclass="fasfa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
};

window.mostrarPagoMesonero = asyncfunction(id) {
    constmesonero = (window.mesoneros || []).find(m => m.id === id);
    if (!mesonero) return;
    window.mesoneroParaPago = id;
    letacum = 0;
    try {
        const { data } = awaitwindow.supabaseClient.from('propinas').select('monto_bs').eq('mesonero_id', id).eq('entregado', false);
        acum = (data || []).reduce((s, p) => s + (p.monto_bs || 0), 0);
    } catch(e) { console.error('Errorpropinaspendientes:', e); }
    if (acum <= 0) { window.mostrarToast(mesonero.nombre + ' notienepropinaspendientes', 'info'); return; }
    consttasa    = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
    constacumUsd = tasa > 0 ? acum / tasa : 0;
    constbody = document.getElementById('confirmPagoDeliveryBody');
    if (body) body.innerHTML = '<pstyle="margin-bottom:1rem"><strong>' + mesonero.nombre + '</strong> tienepropinaspendientes: <spanstyle="color:var(--propina);font-weight:700;font-size:1.1rem">' + window.formatUSD(acumUsd) + ' | ' + window.formatBs(acum) + '</span></p>'
        + '<divstyle="display:flex;flex-direction:column;gap:.75rem">'
        + '<labelstyle="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2pxsolidvar(--border);border-radius:10px;cursor:pointer">'
        + '<inputtype="radio" name="tipoPagoMes" value="total" checkedstyle="margin-top:3px;accent-color:var(--success)">'
        + '<div><divstyle="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pagototal</div><divstyle="font-size:.78rem;color:var(--text-muted)">Marcatodassuspropinaspendientescomoentregadas</div></div>'
        + '<spanstyle="margin-left:auto;font-weight:800;color:var(--success)">' + window.formatBs(acum) + '</span></label>'
        + '<labelstyle="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;border:2pxsolidvar(--border);border-radius:10px;cursor:pointer">'
        + '<inputtype="radio" name="tipoPagoMes" value="parcial" style="margin-top:3px;accent-color:var(--warning)">'
        + '<divstyle="flex:1"><divstyle="font-weight:700;font-size:.9rem;color:var(--text-dark)">Pagoparcial</div>'
        + '<divstyle="font-size:.78rem;color:var(--text-muted);margin-bottom:.4rem">Ingresaelmontoapagar</div>'
        + '<inputtype="number" id="montoPagoParc_mes" placeholder="MontoenBs" step="0.01" min="0.01" max="' + acum + '" style="width:100%;padding:.5rem .75rem;border:1pxsolidvar(--border);border-radius:8px;font-family:Montserrat,sans-serif;font-size:.88rem;outline:none;background:var(--input-bg);color:var(--text-dark)" onclick="event.stopPropagation()" oninput="document.querySelector(\'[name=tipoPagoMes][value=parcial]\').checked=true">'
        + '</div></label></div>';
    constbtn = document.getElementById('confirmPagoDeliveryBtn');
    if (btn) btn.onclick = window.confirmarPagoMesonero;
    constmodal = document.getElementById('confirmPagoDeliveryModal');
    if (modal) modal.classList.add('active');
};

window.confirmarPagoMesonero = asyncfunction() {
    if (!window.mesoneroParaPago) return;
    constbtn = document.getElementById('confirmPagoDeliveryBtn');
    if (btn && btn.disabled) return;
    if (btn) { btn.disabled = true; btn.innerHTML = '<iclass="fasfa-spinnerfa-spin"></i> Procesando...'; }
    constmesonero = (window.mesoneros || []).find(m => m.id === window.mesoneroParaPago);
    try {
        consttipo = (document.querySelector('[name="tipoPagoMes"]:checked') || {}).value || 'total';
        if (tipo === 'parcial') {
            constinput = document.getElementById('montoPagoParc_mes');
            constmonto = parseFloat(input ? input.value : 0);
            if (!monto || monto <= 0) { window.mostrarToast('Ingresaunmontov', 'error'); return; }
            const { error } = awaitwindow.supabaseClient.from('propinas').insert([{
                mesonero_id: window.mesoneroParaPago, monto_bs: -monto,
                mesa: 'Pagoparcial', metodo: 'pago_interno',
                cajero: 'admin', entregado: true, fecha: newDate().toISOString()
            }]);
            if (error) throwerror;
            window.mostrarToast('Pagoparcialde ' + window.formatBs(monto) + ' registradoa ' + (mesonero ? mesonero.nombre : ''), 'success');
        } else {
            const { error } = awaitwindow.supabaseClient.from('propinas')
                .update({ entregado: true })
                .eq('mesonero_id', window.mesoneroParaPago).eq('entregado', false);
            if (error) throwerror;
            window.mostrarToast('Propinaspagadasa ' + (mesonero ? mesonero.nombre : ''), 'success');
        }
        window.cerrarModal('confirmPagoDeliveryModal');
        if (btn) btn.onclick = window.confirmarPagoDelivery;
        window.mesoneroParaPago = null;
        awaitwindow.renderizarMesoneros();
        awaitwindow.cargarPropinas();
    } catch(e) {
        console.error('Errorpagopropinas:', e);
        window.mostrarToast('Error: ' + (e.message || e), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = 'Confirmar'; }
    }
};

window.editarMesonero = function(id) {
    constm = (window.mesoneros || []).find(x => x.id === id);
    if (!m) return;
    window.mesoneroEditandoId = id;
    constmt = document.getElementById('mesoneroModalTitle');
    if (mt) mt.textContent = 'EditarMesonero';
    constni = document.getElementById('mesoneroNombre'); if (ni) ni.value = m.nombre || '';
    constas = document.getElementById('mesoneroActivo'); if (as) as.value = m.activo ? 'true' : 'false';
    if (m.foto) {
        constui = document.getElementById('mesoneroFotoUrl'); if (ui) ui.value = m.foto;
        constpi = document.getElementById('mesoneroPreviewImg'); if (pi) pi.src = m.foto;
        constpd = document.getElementById('mesoneroFotoPreview'); if (pd) pd.style.display = 'flex';
        currentMesoneroFotoUrl = m.foto;
    } else {
        constui = document.getElementById('mesoneroFotoUrl'); if (ui) ui.value = '';
        constpd = document.getElementById('mesoneroFotoPreview'); if (pd) pd.style.display = 'none';
        currentMesoneroFotoUrl = '';
    }
    constmodal = document.getElementById('mesoneroModal');
    if (modal) modal.classList.add('active');
};

window.toggleMesoneroActivo = asyncfunction(id, activo) {
    try {
        awaitwindow.supabaseClient.from('mesoneros').update({ activo }).eq('id', id);
        awaitwindow.cargarMesoneros();
    } catch(e) { console.error('Errortogglemesonero:', e); }
};

window.eliminarMesonero = asyncfunction(id) {
    constm = (window.mesoneros || []).find(x => x.id === id);
    if (!m) return;
    window.mostrarConfirmacionPremium(
        'EliminarMesonero',
        'Eliminaralmesonero "' + m.nombre + '"? Estaaccinosepuededeshacer.',
        asyncfunction() {
            try {
                awaitwindow.supabaseClient.from('mesoneros').delete().eq('id', id);
                awaitwindow.cargarMesoneros();
                window.mostrarToast('Mesoneroeliminado', 'success');
            } catch(e) { window.mostrarToast('Error: ' + (e.message || e), 'error'); }
        }
    );
};

window.agregarMesonero = asyncfunction() {
    constinp = document.getElementById('nuevoMesonero');
    constnombre = inp ? inp.value.trim() : '';
    if (!nombre) { window.mostrarToast('Ingresaunnombre', 'error'); return; }
    constbtn = document.querySelector('[onclick="window.agregarMesonero()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<iclass="fasfa-spinnerfa-spin"></i>'; }
    try {
        const { error } = awaitwindow.supabaseClient.from('mesoneros')
            .insert([{ id: window.generarId('mes_'), nombre, activo: true }]);
        if (error) throwerror;
        if (inp) inp.value = '';
        awaitwindow.cargarMesoneros();
        window.mostrarToast('Mesoneroagregado', 'success');
    } catch(e) {
        window.mostrarToast('Error: ' + (e.message || e), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<iclass="fasfa-plus"></i> Agregar'; }
    }
};

window.cargarPropinas = asyncfunction() {
    try {
        consth = newDate(); h.setHours(0,0,0,0);
        constm = newDate(h); m.setDate(m.getDate()+1);
        const { data, error } = awaitwindow.supabaseClient
            .from('propinas').select('*, mesoneros(nombre)')
            .gte('fecha', h.toISOString()).lt('fecha', m.toISOString())
            .order('fecha', { ascending: false });
        if (error) throwerror;
        window.propinas = data || [];
        window.renderizarPropinas();
    } catch(e) { console.error('Errorcargandopropinas:', e); }
};

window.renderizarPropinas = function() {
    constpropinas = window.propinas || [];
    consttotal    = propinas.reduce(function(s,p){ returns+(p.monto_bs||0); }, 0);
    constcantidad = propinas.length;
    constpromedio = cantidad > 0 ? total/cantidad : 0;
    varel;
    el = document.getElementById('propinasTotal');    if(el) el.textContent = window.formatBs(total);
    el = document.getElementById('propinasCantidad'); if(el) el.textContent = String(cantidad);
    el = document.getElementById('propinasPromedio'); if(el) el.textContent = window.formatBs(promedio);
    el = document.getElementById('propinasHoyDashboard'); if(el) el.textContent = window.formatBs(total);
    consttbody = document.getElementById('propinasTableBody');
    if (tbody) {
        constultimas5 = propinas.slice(0, 5);
        if (ultimas5.length) {
            tbody.innerHTML = ultimas5.map(function(p) {
                varhora = newDate(p.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                return '<tr><td>'+hora+'</td><td>'+(p.mesoneros ? p.mesoneros.nombre : 'N/A')+'</td><td>'+(p.mesa||'N/A')+'</td><td>'+(p.metodo||'N/A')+'</td><td>'+window.formatBs(p.monto_bs)+'</td><td>'+(p.cajero||'N/A')+'</td></tr>';
            }).join('');
        } else {
            tbody.innerHTML = '<tr><tdcolspan="6" style="text-align:center;color:var(--text-muted)">Sinpropinashoy</td></tr>';
        }
    }
};

functionhandleMesoneroFotoFile() {
    varfi=document.getElementById('mesoneroFoto');
    varui=document.getElementById('mesoneroFotoUrl');
    varpd=document.getElementById('mesoneroFotoPreview');
    varpi=document.getElementById('mesoneroPreviewImg');
    varrb=document.getElementById('mesoneroFotoRemoveBtn');
    if (!fi||!pd) return;
    if (fi.files && fi.files[0]) {
        currentMesoneroFotoFile=fi.files[0]; currentMesoneroFotoUrl='';
        if(ui){ui.value='';ui.disabled=true;}
        varreader=newFileReader();
        reader.onload=function(e){if(pi)pi.src=e.target.result;pd.style.display='flex';if(rb)rb.style.display='flex';};
        reader.readAsDataURL(fi.files[0]);
    } else { if(ui)ui.disabled=false; }
}
functionhandleMesoneroFotoUrl() {
    varui=document.getElementById('mesoneroFotoUrl');
    varfi=document.getElementById('mesoneroFoto');
    varpd=document.getElementById('mesoneroFotoPreview');
    varpi=document.getElementById('mesoneroPreviewImg');
    varrb=document.getElementById('mesoneroFotoRemoveBtn');
    if(!ui||!pd) return;
    if(fi&&fi.files&&fi.files[0]) return;
    varurl=ui.value.trim();
    if(url){currentMesoneroFotoUrl=url;currentMesoneroFotoFile=null;if(pi)pi.src=url;pd.style.display='flex';if(rb)rb.style.display='flex';}
    else{pd.style.display='none';if(rb)rb.style.display='none';if(pi)pi.src='';currentMesoneroFotoUrl='';}
}
functionremoveMesoneroFoto() {
    varfi=document.getElementById('mesoneroFoto');
    varui=document.getElementById('mesoneroFotoUrl');
    varpd=document.getElementById('mesoneroFotoPreview');
    varpi=document.getElementById('mesoneroPreviewImg');
    varrb=document.getElementById('mesoneroFotoRemoveBtn');
    if(fi)fi.value=''; if(ui){ui.value='';ui.disabled=false;}
    if(pd)pd.style.display='none'; if(rb)rb.style.display='none';
    if(pi)pi.src=''; currentMesoneroFotoFile=null; currentMesoneroFotoUrl='';
}

varsaveMesoneroBtn = document.getElementById('saveMesonero');
if (saveMesoneroBtn) {
    saveMesoneroBtn.addEventListener('click', asyncfunction() {
        if (this.disabled) return;
        varid     = window.mesoneroEditandoId;
        varnombre = (document.getElementById('mesoneroNombre')||{}).value;
        if (nombre) nombre = nombre.trim();
        varactivoEl = document.getElementById('mesoneroActivo');
        varactivo = activoEl ? activoEl.value === 'true' : true;
        if (!nombre) { window.mostrarToast('Ingresaunnombre', 'error'); return; }
        varfotoUrl = '';
        vararchivoFoto = (document.getElementById('mesoneroFoto')||{files:[]}).files[0];
        varfotoUrlInput = ((document.getElementById('mesoneroFotoUrl')||{}).value)||'';
        if (archivoFoto) {
            varres = awaitwindow.subirImagenPlatillo(archivoFoto, 'mesoneros');
            if (res.success) fotoUrl = res.url;
            else { window.mostrarToast('Erroralsubirfoto: '+res.error,'error'); return; }
        } elseif (fotoUrlInput) { fotoUrl = fotoUrlInput; }
        try {
            this.disabled=true; this.innerHTML='<iclass="fasfa-spinnerfa-spin"></i>';
            vardataObj = { nombre: nombre, activo: activo, foto: fotoUrl || null };
            varerr;
            if (id) {
                varr1 = awaitwindow.supabaseClient.from('mesoneros').update(dataObj).eq('id', id);
                err = r1.error;
            } else {
                dataObj.id = window.generarId('mes_');
                varr2 = awaitwindow.supabaseClient.from('mesoneros').insert([dataObj]);
                err = r2.error;
            }
            if (err) throwerr;
            window.cerrarModal('mesoneroModal');
            awaitwindow.cargarMesoneros();
            window.mostrarToast('Mesoneroguardado', 'success');
        } catch(e) { window.mostrarToast('Error: '+e.message,'error'); }
        finally { this.disabled=false; this.innerHTML='Guardar'; }
    });
}

varcloseBtn = document.getElementById('closeMesoneroModal');
if (closeBtn) closeBtn.addEventListener('click', function(){ window.cerrarModal('mesoneroModal'); });
varcancelBtn = document.getElementById('cancelMesoneroEdit');
if (cancelBtn) cancelBtn.addEventListener('click', function(){ window.cerrarModal('mesoneroModal'); });
varfotoInput = document.getElementById('mesoneroFoto');
if (fotoInput) fotoInput.addEventListener('change', handleMesoneroFotoFile);
varfotoUrlInp = document.getElementById('mesoneroFotoUrl');
if (fotoUrlInp) fotoUrlInp.addEventListener('input', handleMesoneroFotoUrl);
varremoveBtn = document.getElementById('mesoneroFotoRemoveBtn');
if (removeBtn) removeBtn.addEventListener('click', removeMesoneroFoto);
})();
