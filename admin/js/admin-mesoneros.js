// admin-mesoneros.js — Mesoneros y Propinas
(function() {
'use strict';
let currentMesoneroFotoFile = null;
let currentMesoneroFotoUrl  = '';

window.cargarMesoneros = async function() {
    try {
        const { data, error } = await window.supabaseClient.from('mesoneros').select('*').order('nombre');
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
        container.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;text-align:center;padding:2rem;">No hay mesoneros registrados.</p>';
        return;
    }

    // 1. Calcular acumulado de propinas NO entregadas
    let acumulados = {};
    try {
        const { data: allProp } = await window.supabaseClient.from('propinas').select('mesonero_id, monto_bs, entregado').eq('entregado', false);
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
            ? `<img src="${m.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer;" onclick="window.expandirImagen(this.src)">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.4rem;background:linear-gradient(135deg,var(--propina),#7B1FA2);border-radius:50%;">${inicial}</div>`;
        
        const statusClass = m.activo ? 'status-activo' : 'status-inactivo';
        const statusText  = m.activo ? 'Activo' : 'Inactivo';
        const toggleClass = m.activo ? 'btn-toggle-on' : 'btn-toggle-off';
        const toggleTxt   = m.activo ? 'Inhabilitar' : 'Activar';
        const toggleVal   = String(!m.activo);
        const propColor   = hayAcum ? 'var(--propina)' : 'var(--text-muted)';
        const propWeight  = hayAcum ? '700' : '400';

        return `
        <div class="mesonero-card" style="display:grid; grid-template-columns: 64px 1fr auto; grid-template-rows: auto auto auto; gap: 8px 12px; align-items: center; background: var(--card-bg); border-radius: 14px; padding: 12px 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); border-left: 4px solid var(--propina); transition: var(--transition);">
            <!-- Izquierda: Foto -->
            <div style="grid-row: 1 / 4; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--secondary);">
                ${avatar}
            </div>

            <!-- Centro Línea 1: Nombre -->
            <div style="grid-column: 2; grid-row: 1; font-weight: 700; font-size: 0.95rem; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${m.nombre}
            </div>

            <!-- Centro Línea 2: Acumulado Propinas -->
            <div style="grid-column: 2; grid-row: 2; font-size: 0.85rem; font-weight: ${propWeight}; color: ${propColor};">
                Propinas: ${hayAcum ? window.formatUSD(acumUsd) + ' | ' : ''}${window.formatBs(acum)}
            </div>

            <!-- Centro Línea 3: Pagado + Toggle -->
            <div style="grid-column: 2; grid-row: 3; display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                <button class="btn-sm" style="background:linear-gradient(135deg,var(--propina),#7B1FA2);color:#fff; font-size:0.75rem; padding:4px 10px; border-radius:20px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" onclick="window.mostrarPagoMesonero('${m.id}')" ${!hayAcum ? 'disabled style="opacity:0.5;cursor:not-allowed;background:#ccc;"' : ''}>
                    <i class="fas fa-hand-holding-heart"></i> Pagado
                </button>
                <button class="btn-toggle ${toggleClass}" onclick="window.toggleMesoneroActivo('${m.id}', ${toggleVal})">${toggleTxt}</button>
            </div>

            <!-- Derecha Línea 1: Estado -->
            <div style="grid-column: 3; grid-row: 1; justify-self: end;">
                <span class="${statusClass}"><i class="fas ${m.activo ? 'fa-check-circle' : 'fa-circle'}"></i> ${statusText}</span>
            </div>

            <!-- Derecha Línea 2: (Vacío) -->
            <div style="grid-column: 3; grid-row: 2;"></div>

            <!-- Derecha Línea 3: Editar + Papelera -->
            <div style="grid-column: 3; grid-row: 3; justify-self: end; display: flex; gap: 6px;">
                <button class="btn-icon edit" onclick="window.editarMesonero('${m.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                <button class="btn-icon delete" onclick="window.eliminarMesonero('${m.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
};

window.mostrarPagoMesonero = async function(id) {
    const mesonero = (window.mesoneros || []).find(m => m.id === id);
    if (!mesonero) return;
    window.mesoneroParaPago = id;
    let acum = 0;
    try {
        const { data } = await window.supabaseClient.from('propinas').select('monto_bs').eq('mesonero_id', id).eq('entregado', false);
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
    var el;
    el = document.getElementById('propinasTotal');    if(el) el.textContent = window.formatBs(total);
    el = document.getElementById('propinasCantidad'); if(el) el.textContent = String(cantidad);
    el = document.getElementById('propinasPromedio'); if(el) el.textContent = window.formatBs(promedio);
    el = document.getElementById('propinasHoyDashboard'); if(el) el.textContent = window.formatBs(total);
    const tbody = document.getElementById('propinasTableBody');
    if (tbody) {
        const ultimas5 = propinas.slice(0, 5);
        if (ultimas5.length) {
            tbody.innerHTML = ultimas5.map(function(p) {
                var hora = new Date(p.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                return '<tr><td>'+hora+'</td><td>'+(p.mesoneros ? p.mesoneros.nombre : 'N/A')+'</td><td>'+(p.mesa||'N/A')+'</td><td>'+(p.metodo||'N/A')+'</td><td>'+window.formatBs(p.monto_bs)+'</td><td>'+(p.cajero||'N/A')+'</td></tr>';
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Sin propinas hoy</td></tr>';
        }
    }
};

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