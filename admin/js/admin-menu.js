// admin-menu.js - ndeplatillos (menú)
(function() {
letcurrentImagenUrl = '';
letcurrentImagenFile = null;
window.cargarMenu = asyncfunction() {
try {
const { data, error } = awaitwindow.supabaseClient.from('menu').select('*');
if (error) throwerror;
window.menuItems = data || [];
window.renderizarMenu();
window.actualizarProductosActivos();
} catch (e) { console.error('Errorcargandomenú:', e); window.mostrarToast('Errorcargandomenú', 'error'); }
};
// admin-menu.js - nrenderizarMenucorregida (líneas 15-35)
window.renderizarMenu = function(filtro) {
    constgrid = document.getElementById('menuGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const_norm = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
    const_base = [...window.menuItems].sort((a,b) => a.nombre.localeCompare(b.nombre));
    constitems = filtro ? _base.filter(item => _norm(item.nombre).includes(_norm(filtro))) : _base;
    if (!items.length) {
        grid.innerHTML = '<pstyle="color:var(--text-muted);text-align:center;">' +
            (filtro ? 'Sinresultadospara "' + filtro + '"' : 'Nohayplatillosregistrados.') + '</p>';
        return;
}
items.forEach(item => {
constingredientesEstado = [];
lettodosDisponibles = true;
if (item.ingredientes) {
for (const [ingId, ingInfo] ofObject.entries(item.ingredientes)) {
consting = window.inventarioItems.find(i => i.id === ingId);
constdisponible = ing && (ing.stock - ing.reservado) >= (ingInfo.cantidad || 0);
if (!disponible) todosDisponibles = false;
ingredientesEstado.push({ id: ingId, nombre: ingInfo.nombre || ingId, disponible });
}
}
constdisponibleFinal = item.disponible && todosDisponibles;
constimgSrc = item.imagen || '';
constcard = document.createElement('div');
card.className = 'menu-card-v2' + (item.disponible ? '' : ' no-disponible');
card.innerHTML = `
    <divclass="mc2-header">
        <divclass="mc2-info">
            <divclass="mc2-nombre">${item.nombre}</div>
            <divclass="mc2-cat">${item.categoria || ''}${item.subcategoria ? ' · ' + item.subcategoria : ''}</div>
            <divclass="mc2-precio">${window.formatUSD(item.precio || 0)} <spanclass="mc2-precio-bs">/ ${window.formatBs(window.usdToBs(item.precio || 0))}</span></div>
            <divclass="mc2-stock-line">Stock: <spanclass="mc2-stock-val">${item.stock || 0}</span> <spanclass="mc2-badge ${disponibleFinal ? 'mc2-badge-ok' : 'mc2-badge-off'}">${disponibleFinal ? 'Disponible' : 'Nodisponible'}</span></div>
        </div>
        ${imgSrc ? `<divclass="mc2-img-wrap"><imgclass="mc2-img" src="${imgSrc}" alt="${item.nombre}"></div>` : ''}
    </div>
    ${item.descripcion ? `<divclass="mc2-desc">${item.descripcion}</div>` : ''}
    <divclass="mc2-tags">
        ${ingredientesEstado.map(ing => `<spanclass="ing-tag ${!ing.disponible ? 'ing-tag-sin-stock' : ''}" data-ingrediente-id="${ing.id}">${ing.nombre}</span>`).join('') || '<spanclass="ing-tag" style="opacity:.5">Siningredientes</span>'}
    </div>
    <divclass="mc2-actions">
        <labelstyle="display:flex;align-items:center;gap:.35rem;cursor:pointer;margin-right:.25rem;" title="${disponibleFinal ? 'Marcarcomonodisponible' : 'Marcarcomodisponible'}">
            <spanstyle="font-size:.72rem;color:${disponibleFinal ? 'var(--success)' : 'var(--text-muted)'};font-weight:600;">${disponibleFinal ? 'Disponible' : 'Nodisponible'}</span>
            <inputtype="checkbox" ${item.disponible ? 'checked' : ''} style="accent-color:var(--success);cursor:pointer;" onchange="window.toggleDisponiblePlatillo('${item.id}', this.checked)">
        </label>
        <buttonclass="btn-iconedit" onclick="window.editarPlatillo('${item.id}')" title="Editarplatillo"><iclass="fasfa-pen"></i></button>
        <buttonclass="btn-icondelete" onclick="window.eliminarPlatillo('${item.id}')" title="Eliminarplatillo"><iclass="fasfa-trash"></i></button>
    </div>
`;
    constimgElement = card.querySelector('.mc2-img');
    if (imgElement) {
        imgElement.style.cursor = 'pointer';
        imgElement.addEventListener('click', (e) => {
            e.stopPropagation();
            window.expandirImagen(imgSrc);
        });
    }
    card.querySelectorAll('.ing-tag[data-ingrediente-id]').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            constingId = tag.dataset.ingredienteId;
            window._irAIngrediente(ingId);
        });
    });
     grid.appendChild(card);
});
};
window.expandirImagen = function(src) {
if (!src) return;
constmodal = document.createElement('div');
modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer';
modal.innerHTML = `<imgsrc="${src}" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:8px">`;
modal.addEventListener('click', () => modal.remove());
document.body.appendChild(modal);
};
window.toggleDisponiblePlatillo = asyncfunction(id, disponible) {
try {
const { error } = awaitwindow.supabaseClient.from('menu')
.update({ disponible: disponible })
.eq('id', id);
if (error) throwerror;
constitem = window.menuItems.find(p => p.id === id);
if (item) item.disponible = disponible;
window.renderizarMenu(document.getElementById('menuBuscador')?.value || '');
if (disponible) {
window.mostrarToast(`✅ Platillo "${item?.nombre}" ahoraestDISPONIBLEenelmendelcliente`, 'success');
} else {
window.mostrarToast(`⚠ahoraest "${item?.nombre}" ahoraestNODISPONIBLE (semostrarcomoAGOTADOenelahoraestcliente)`, 'warning');
}
} catch(e) {
console.error('Errortoggledisponible:', e);
if (e.message && e.message.includes('permissiondenied')) {
window.mostrarToast('⚠Nosesepudocambiarelestado. Contactaaladministradordelsistema.', 'error');
} else {
window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
}
}
};
window.limpiarImagenPreview = function() {
currentImagenFile = null;
currentImagenUrl = '';
constfileInput = document.getElementById('platilloImagen');
consturlInput = document.getElementById('platilloImagenUrl');
constpreviewDiv = document.getElementById('imagenPreview');
constpreviewImg = document.getElementById('previewImg');
if (fileInput) fileInput.value = '';
if (urlInput) {
urlInput.value = '';
urlInput.disabled = false;
}
if (previewDiv) previewDiv.style.display = 'none';
if (previewImg) previewImg.src = '';
constoldQuitar = document.querySelector('#imagenPreview .btn-small, #imagenPreviewbutton:not(.preview-remove-btn)');
if (oldQuitar) oldQuitar.remove();
};
functionsetupPlatilloModalEvents() {
constfileInput = document.getElementById('platilloImagen');
consturlInput = document.getElementById('platilloImagenUrl');
constpreviewDiv = document.getElementById('imagenPreview');
constpreviewImg = document.getElementById('previewImg');
constexistingQuitar = document.querySelector('#imagenPreview .btn-small, #imagenPreviewbutton:not(.preview-remove-btn)');
if (existingQuitar) existingQuitar.remove();

letremovePreviewBtn = null;
functionupdateRemoveButton() {
    if (removePreviewBtn) removePreviewBtn.remove();
    if (previewDiv && previewDiv.style.display === 'flex') {
        removePreviewBtn = document.createElement('button');
        removePreviewBtn.innerHTML = '<iclass="fasfa-times-circle"></i>';
        removePreviewBtn.style.cssText = 'position:absolute;top:-8px;right:-8px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.8rem;z-index:10;backdrop-filter:blur(2px)';
        removePreviewBtn.title = 'Eliminarimagen';
        removePreviewBtn.onclick = (e) => {
            e.stopPropagation();
            window.limpiarImagenPreview();
        };
        previewDiv.style.position = 'relative';
        previewDiv.appendChild(removePreviewBtn);
    }
}

if (fileInput) {
    fileInput.addEventListener('change', function() {
        if (fileInput.files && fileInput.files[0]) {
            constfile = fileInput.files[0];
            currentImagenFile = file;
            currentImagenUrl = '';
            if (urlInput) {
                 urlInput.value = '';
                urlInput.disabled = true;
            }
            constreader = newFileReader();
            reader.onload = function(e) {
                 if (previewImg) previewImg.src = e.target.result;
                if (previewDiv) previewDiv.style.display = 'flex';
                 updateRemoveButton();
            };
             reader.readAsDataURL(file);
        } else {
            if (urlInput) urlInput.disabled = false;
             if (urlInput && urlInput.value.trim()) {
                if (previewImg) previewImg.src = urlInput.value;
                if (previewDiv) previewDiv.style.display = 'flex';
                 updateRemoveButton();
                currentImagenUrl = urlInput.value;
                currentImagenFile = null;
            } else {
                if (previewDiv) previewDiv.style .display = 'none';
                if (previewImg) previewImg.src = '';
            }
        }
    });
}

if (urlInput) {
     urlInput.addEventListener('input', function() {
         if (fileInput  & & fileInput.files && fileInput.files[0]) return;
        consturl = urlInput.value.trim();
        if (url) {
            if (previewImg) previewImg.src = url;
            if (previewDiv) previewDiv .style.display = 'flex';
            updateRemoveButton();
            currentImagenUrl = url;
            currentImagenFile = null;
        } else {
            if (previewDiv) previewDiv.style.display = 'none';
            if (previewImg) previewImg.src = '';
        }
    });
}

if (previewImg) {
    previewImg.style.cursor = 'pointer';
    previewImg.addEventListener('click', (e) = > {
        e.stopPropagation();
        if (previewImg.src) window.expandirImagen(previewImg.src);
    });
}

constingredientesLabel = document.querySelector('#platilloForm .form -group:nth-child(7) label');
if (ingredientesLabel) {
    ingredientesLabel.innerHTML += `
         <spanclass= "tooltip-wrap " style= "position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem " >
             <spanstyle= "display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700 " >? </span >
             <spanclass= "tooltip-text " style= "display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:260px; text-align:center; box-shadow:0 4px 12pxrgba(0,0,0,.3); z-index:100; line-height:1.4 " >
               ⚠Launidadunidaddemedidadelingredienteescrítica:  "1aguacate " noequivalea 500gramos. ratedeseleccionarlaunidadcorrecta (unidades, kilogramos, litros, etc.) ncorresponda.
             </span >
         </span >
    `;
}
}
window.abrirModalNuevoPlatillo = function() {
document.getElementById('platilloModalTitle').textContent = 'NuevoPlatillo';
document.getElementById('platilloForm').reset();
document.getElementById('ingredientesContainer').innerHTML = '';
window.limpiarImagenPreview();
window.cargarCategoriasSelect();
window.platilloEditandoId = null;
document.getElementById('platilloModal').classList.add('active');
};
window.cargarCategoriasSelect = function() {
constselect = document.getElementById('platilloCategoria');
select.innerHTML = 'Seleccionar';
Object.keys(window.categoriasMenu || {}).forEach(cat => {
constopt = document.createElement('option');
opt.value = cat;
opt.textContent = cat;
select.appendChild(opt);
});
select.addEventListener('change', (e) => { window.cargarSubcategoriasSelect(e.target.value); });
};
window.cargarSubcategoriasSelect = function(categoria) {
constselect = document.getElementById('platilloSubcategoria');
select.innerHTML = 'Ninguna';
if (categoria && window.categoriasMenu && window.categoriasMenu[categoria]) {
window.categoriasMenu[categoria].forEach(sub => {
constopt = document.createElement('option');
opt.value = sub;
opt.textContent = sub;
select.appendChild(opt);
});
}
};
window.agregarIngredienteRow = function(ingredienteId, cantidad, unidad, esPrincipal = false) {
ingredienteId = ingredienteId || '';
cantidad = cantidad || '';
if (!unidad && ingredienteId) {
const_invItem = (window.inventarioItems || []).find(i => i.id === ingredienteId);
unidad = _invItem?.unidad_base || 'unidades';
}
unidad = unidad || 'unidades';
constcontainer = document.getElementById('ingredientesContainer');
constrow = document.createElement('div');
row.className = 'ingrediente-row';
row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1frauto;gap:.4rem;align-items:center;margin-bottom:.4rem';
constselect = document.createElement('select');
select.style.cssText = 'font-family:Montserrat,sans-serif;font-size:.82rem';
constoptBlank = document.createElement('option');
optBlank.value = ''; optBlank.textContent = 'Seleccionaringrediente';
select.appendChild(optBlank);
constoptOtro = document.createElement('option');
optOtro.value = '__otro__'; optOtro.textContent = '➕ Otro (nuevoingrediente)';
select.appendChild(optOtro);
constsorted = [...(window.inventarioItems || [])].sort((a,b) = > a.nombre.localeCompare(b.nombre));
sorted.forEach(ing = > {
    constopt = document.createElement('option');
    opt.value = ing.id;
    opt.textContent = ing.nombre;
    if (ing.id === ingredienteId) opt.selected = true;
    select.appendChild(opt);
});
constinputNombreOtro = document.createElement('input');
inputNombreOtro.type = 'text';
inputNombreOtro.placeholder = 'Nombredelingrediente';
inputNombreOtro. className = 'ing-row-nombre-otro';
inputNombreOtro.style.cssText = 'display:none;font-family:Montserrat,sans-serif;font-size:.82rem;width:100%;padding:.3rem .5rem;border:1pxsolidvar(--border);border-radius:6px;background:var(--input-bg);color:var(--text-dark);box-sizing:border-box;margin-top:.25rem';

constselWrap = document.createElement('div');
selWrap. style.cssText = 'display:flex;flex-direction:column;min-width:0';
selWrap.appendChild(select);
selWrap.appendChild(inputNombreOtro);
select.addEventListener('change', function() {
     constisOtro = this.value === '__otro__';
    inputNombreOtro.style.display = isOtro ? 'block' : 'none';
    if (!isOtro) {
        consting = (window.inventarioItems || []).find(i = > i.id === this.value);
        if (ing  & & ing.unidad_base) {
            constunitSel = row.querySelector('select.ing-row-unidad');
            if (unitSel) unitSel.value = ing.unidad_base;
        }
    }
    window._recalcularStockPlatillo();
});

constinputCantidad = document.createElement('input');
inputCantidad.type = 'number'; inputCantidad.step = '0.001';
 inputCantidad.placeholder = 'Cant.'; inputCantidad.value = cantidad;
inputCantidad.style.cssText = 'font-family:Montserrat,sans-serif;font-size:.82rem';
inputCantidad.addEventListener('input', window._recalcularStockPlatillo);

constselUnidad = document.createElement('select');
selUnidad.className = 'ing-row-unidad';
selUnidad.style.cssText = 'font-family:Montserrat,sans-serif;font-size:. 78rem';
['unidades','gramos','mililitros','kilogramos','litros'].forEach(u = > {
    consto = document.createElement('option');
    o.value = u; o.textContent = u.charAt(0).toUpperCase() + u.slice(1);
    if (u === unidad) o.selected = true;
     selUnidad .appendChild(o);
});
selUnidad.addEventListener('change', window._recalcularStockPlatillo);

constremoveBtn = document.createElement('button');
removeBtn.type = 'button';
removeBtn.innerHTML = ' <iclass= "fasfa-times " > </i >';
removeBtn.style.cssText = 'background:#ffebee;color:var(--danger);border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0';
removeBtn.onclick = () = > { if(row._hideTip) row._hideTip(); row.remove(); window._recalcularStockPlatillo(); };

constprincipalWrap = document.createElement('div');
principalWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative';
constchk = document.createElement('input');
chk.type = 'checkbox'; chk.className = 'ing-principal-chk';
chk.style.cssText = 'width:16px;height:16px;accent-color:var(--primary);cursor:pointer;display:block';
if (esPrincipal) chk.checked = true;
let_tipEl = null;
const_showTip = function() {
    if (_tipEl) return;
    constrect = chk.getBoundingClientRect();
    _tipEl = document.createElement('div');
    _tipEl.style.cssText = 'position:fixed;background:#1a1a2e;color:#fff;padding:.6rem .9rem;border-radius:9px;font-size:.72rem;width:250px;text-align:center;box-shadow:0 6px 22pxrgba(0,0,0,.55);z-index:99999;line-height:1.55;pointer-events:none;font-family:Montserrat,sans-serif';
    _tipEl.innerHTML = ' <strongstyle= "display:block;margin-bottom:.3rem;font-size:.76rem " >¿Esuningredienteprincipal? </strong >Siloactivas, elclientenopodrdeseleccionarloalpersonalizarelplatilloystrongstylenantesdeeliminarsedelinventario.';
    document.body.appendChild(_tipEl);
    consttw = _tipEl.offsetWidth, th = _tipEl.offsetHeight;
    letleft = rect.left + rect.width/2 - tw/2;
    lettop  = rect.top - th - 10;
    if (left  < 6) left = 6;
    if (left + tw  > window.innerWidth - 6) left = window.innerWidth - tw - 6;
    if (top  < 6) top = rect.bottom + 10;
    _tipEl.style.left = left + 'px';
    _tipEl.style.top  = top  + 'px';
};
const_hideTip = function() { if (_tipEl) { _tipEl.remove(); _tipEl = null ; } };
chk.addEventListener('mouseenter', _showTip);
chk.addEventListener('mouseleave', _hideTip);
chk.addEventListener('focus',      _showTip);
chk.addEventListener('blur',        _hideTip);
chk.addEventListener('touchstart', function(e){
    e.stopPropagation();
    _tipEl ? _hideTip() : _showTip();
    setTimeout(_hideTip, 2800);
}, {passive:true});
principalWrap.appendChild(chk);
row._hideTip = _hideTip;

row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1frautoauto;gap:.4rem;align-items:start;margin-bottom:.4rem;background:var(--card-bg);padding:.3rem .4rem;border-radius:6px;border:1pxsolidvar(--border)';

row.appendChild(selWrap);
row.appendChild(inputCantidad);
row.appendChild(selUnidad) ;
row.appendChild(principalWrap);
row.appendChild(removeBtn);
container.appendChild(row);
window._recalcularStockPlatillo();
};
window.editarPlatillo = function(id) {
constplatillo = window.menuItems.find(p => p.id === id);
if (!platillo) return;
window.platilloEditandoId = id;
document.getElementById('platilloModalTitle').textContent = 'EditarPlatillo';
window.limpiarImagenPreview();
// FIX: Cargarcategorinmediatamenteparaasegurarqueeldropdownnuncaestvacío
window.cargarCategoriasSelect();

document.getElementById('platilloNombre').value = platillo.nombre || '';
document.getElementById('platilloCategoria').value = platillo.categoria || '';
 document.getElementById('platilloSubcategoria').value = platillo.subcategoria || '';
document.getElementById('platilloPrecio').value = platillo.precio || '';
document.getElementById('platilloDescripcion').value = platillo.descripcion || '';
document.getElementById('platilloDisponible').value = platillo.disponible ? 'true' : 'false';
const_chkD = document.getElementById('platilloDisponibleCheck');
const_lblD = document.getElementById('platilloDisponibleLabel');
if (_chkD) { _chkD.checked = !!platillo.disponible; }
if (_lblD) { _lblD.textContent = platillo.disponible ? 'Sí' : 'No'; _lblD.style.color = platillo.disponible ? 'var(--success)' : 'var(--text-muted)'; }
if (platillo.imagen) {
    document.getElementById('previewImg').src = platillo.imagen;
    document.getElementById('imagenPreview').style.display = 'flex';
    document.getElementById('platilloImagenUrl').value = platillo.imagen;
    currentImagenUrl = platillo.imagen;
}
window.cargarSubcategoriasSelect(platillo.categoria);
document.getElementById('ingredientesContainer').innerHTML = '';
if (platillo.ingredientes) {
    Object.entries(platillo.ingredientes).forEach(([ingId, ingInfo]) => {
        window.agregarIngredienteRow(ingId, ingInfo.cantidad, ingInfo.unidad, ingInfo.principal || false);
    });
}
document.getElementById('platilloModal').classList.add('active');
};
window.eliminarPlatillo = asyncfunction(id) {
constplatillo = window.menuItems.find(p => p.id === id);
if (!platillo) return;
window.mostrarConfirmacionPremium(
'EliminarPlatillo',
`¿ssegurodeeliminar "${platillo.nombre}"? Estaaccinosepuededeshacer.`,
async () => {
try {
if (platillo.imagen && platillo.imagen.includes('imagenes-platillos')) {
awaitwindow.eliminarImagenPlatillo(platillo.imagen);
}
awaitwindow.supabaseClient.from('menu').delete().eq('id', id);
awaitwindow.cargarMenu();
window.mostrarToast('🗑Platilloeliminadoeliminado', 'success');
} catch (e) {
console.error('Erroreliminandoplatillo:', e);
window.mostrarToast('❌ Erroraleliminarelplatillo', 'error');
}
}
);
};
window.actualizarProductosActivos = function() {
constprodCard = document.querySelector('.dashboard-card:nth-child(3)');
if (prodCard) {
    // nclave: contarsololosproductosdisponibles
    constcount = window.menuItems.filter(m => m.disponible).length;
    document.getElementById('productosActivosCount').textContent = count;
}
};
window._onCategoriaChange = function() {
constcat = document.getElementById('platilloCategoria')?.value;
constwrap = document.getElementById('subcategoriaContainer');
constsel   = document.getElementById('platilloSubcategoria');
if (!wrap || !sel) return;
constSUBCATEGORIAS = {
'rolls': [{ id: 'rolls-frios', name: 'RollsFr (10pzas)' }, { id: 'rolls-tempura', name: 'RollsTempura (12pzas)' }],
'china': [
{ id: 'arroz-chino', name: 'ArrozChino' }, { id: 'arroz-cantones', name: 'ArrozCantones' },
{ id: 'chopsuey', name: 'Chopsuey' }, { id: 'lomey', name: 'Lomey' }, { id: 'chow-mein', name: 'ChowMein' },
{ id: 'fideos-arroz', name: 'FideosdeArroz' }, { id: 'tallarines-cantones', name: 'TallarinesCantones' },
{ id: 'mariscos', name: 'Mariscos' }, { id: 'foo-yung', name: 'FooYong' }, { id: 'sopas', name: 'Sopas' },
{ id: 'entremeses', name: 'Entremeses' }
],
'japonesa': [
{ id:  'yakimeshi', name: 'Yakimeshi' }, { id: 'yakisoba', name: 'Yakisoba' },
{ id: 'pasta-udon', name: 'PastaUdon' }, { id: 'churrasco', name: 'Churrasco' }
]
};
constsubs = SUBCATEGORIAS[cat];
if (subs  & & subs.length) {
wrap.style.display = 'block';
sel.innerHTML = ' Sinsubcategor ' +
subs.map(s = >  `<optionvalue=` `"${s.id}` `"` `>${s.name}` `</option` `>` ).join('');
} else {
wrap.style.display = 'none';
sel.innerHTML = ' Ninguna ';
}
window._recalcularStockPlatillo();
};
window._previewPrecioBs = function() {
constprecio = parseFloat(document.getElementById('platilloPrecio')?.value) || 0;
consttasa   = (window.configGlobal?.tasa_efectiva) || (window.configGlobal?.tasa_cambio) || 0;
constel = document.getElementById('platilloPrecioBsPreview');
if (el) el.textContent = tasa > 0 && precio > 0 ? '💰 ' + window.formatBs(precio * tasa) : '';
};
window._previewPlatilloUrl = function(url) {
if (!url) return;
constprev = document.getElementById('imagenPreview');
constimg  = document.getElementById('previewImg');
if (prev && img) { img.src = url; prev.style.display = 'flex'; }
};
window._recalcularStockPlatillo = function() {
constwrap = document.getElementById('stockCalculadoWrap');
consttxt  = document.getElementById('stockCalculadoText');
if (!wrap ||  !txt) return;
constrows = document.querySelectorAll('#ingredientesContainer .ingrediente-row');
if (!rows.length) { wrap.style.display = 'none'; return; }
letmaxPlatillos = Infinity;
lethayIngredientes = false;
rows.forEach(row = > {
constselIng = row.querySelector('select:not(.ing-row-unidad)');
constselUni = row.querySelector('select.ing-row-unidad');
constcant   = parseFloat(row.querySelector('input[type= "number "]')?.value) || 0;
if (!selIng?.value || !cant) return;
hayIngredientes = true;
constinv = (window.inventarioItems || []).find(i = > i.id === selIng.value);
if (inv) {
constdisponible = (inv.stock || 0) - (inv.reservado || 0);
constunidadIng  = selUni?.value || 'unidades';
constnecesario  = window._convertirUnidad(cant, unidadIng, inv.unidad_base || 'unidades');
if (necesario  > 0) maxPlatillos = Math.min(maxPlatillos, Math.floor(disponible / necesario));
} else { maxPlatillos = 0; }
});
if (!hayIngredientes) { wrap.style.display = 'none'; return; }
if ( !isFinite(maxPlatillos) || maxPlatillos  < 0) maxPlatillos = 0;
wrap.style.display = 'block';
wrap.style.background = maxPlatillos  > 5 ? '#f0fdf4' : maxPlatillos  > 0 ? '#fffbeb' : '#fef2f2';
wrap.style.borderColor = maxPlatillos  > 5 ? '#bbf7d0' : maxPlatillos  > 0 ? '#fde68a' : '#fecaca';
txt.style.color = maxPlatillos  > 5 ? '#166534' : maxPlatillos  > 0 ? '#92400e' : '#991b1b';
txt.textContent = maxPlatillos  > 0
?  `Conelstockactualsepuedenpreparar ${maxPlatillos} porcion${maxPlatillos !== 1 ? 'es' : ''}` 
: '⚠Stockinsuficienteinsuficienteparaprepararesteplatillo';
};
// CROSS-BROWSERFIX: RobusteventhandlingforSavebutton
functionsetupSaveButtonHandler() {
constsaveBtn = document.getElementById('savePlatillo');
if (!saveBtn) {
console.error('❌ savePlatillobuttonnotfoundinDOM');
return;
}
// Removeanyexistinglistenerstopreventduplicates
constnewSaveBtn = saveBtn.cloneNode(true);
saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

// AddrobustclickhandlerwithpreventDefault
newSaveBtn.addEventListener('click', asyncfunction(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔘 Savebuttonclicked - Browser:', navigator.userAgent);
    
    if (this.disabled) {
        console.warn('⚠Buttonisisdisabled');
        return;
    }
    
    try {
        this.disabled = true;
        constoriginalText = this.innerHTML;
        this.innerHTML = '<iclass="fasfa-spinnerfa-spin"></i> Guardando...';
        
        console.log('📝 Startingsaveprocess...');
        awaitwindow.guardarPlatillo();
        
        console.log('✅ Savecompletedsuccessfully');
    } catch (error) {
        console.error('❌ Errorinsavebuttonhandler:', error);
        window.mostrarToast('❌ Error: ' + error.message, 'error');
    } finally {
        this.disabled = false;
        this.innerHTML = 'Guardar';
    }
}, { passive: false });

// AlsoaddkeydownhandlerforEnterkey
newSaveBtn.addEventListener('keydown', asyncfunction(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        this.click();
    }
});
}
// Mainsavefunctionextractedforbettererrorhandling
window.guardarPlatillo = asyncfunction() {
console.log('💾 ExecutingguardarPlatillofunction');
constnombre = document.getElementById('platilloNombre').value;
constcategoria = document.getElementById('platilloCategoria').value;
constsubcategoria = document.getElementById(' platilloSubcategoria').value;
constprecio = parseFloat(document.getElementById('platilloPrecio').value);
constdescripcion = document.getElementById('platilloDescripcion').value;
 
console.log('📋 Form ', { nombre, categoria, precio });

if (!nombre || !categoria || !precio) { 
    thrownewError('Completaloscamposobligatorios (Nombre, Categoría, Precio) '); 
}

letimagenUrl = '';
constarchivoImagen = document.getElementById('platilloImagen').files[0];
constimagenUrlInput = document.getElementById('platilloImagenUrl').value;

if  (archivoImagen) {
    console.log('📤 Uploadingimagefile...');
    constresultado = awaitwindow.subirImagenPlatillo(archivoImagen, 'menu');
    if (resultado.success) {
         imagenUrl = resultado.url;
        console.log('✅ Imageuploaded:', imagenUrl);
    } else { 
        thrownewError('Erroralsubirlaimagen: ' + resultado.error); 
    }
} elseif (imagenUrlInput) {
    imagenUrl = imagenUrlInput;
}

constingredientes = {};
const_otrosNuevos = [];

document.querySelectorAll('#ingredientesContainer .ingrediente-row'). forEach(row = > {
    constselIng       = row.querySelector('select:not(.ing-row-unidad)');
    constinputNomOtro = row.querySelector('.ing-row-nombre-otro');
    if (selIng  & & selIng.value === '__otro__'  & & inputNomOtro) {
        constnombreOtro = inputNomOtro.value.trim();
        if (nombreOtro) _otrosNuevos.push({ row, nombreOtro, selIng });
    }
});

// Createnewingredients 
for (constentryof_otrosNuevos) {
    constnuevoId = window.generarId('ing_');
    constnuevoIng = {
        id: nuevoId,
        nombre: entry.nombreOtro,
        stock: 0,
         reservado: 0,
        unidad_base: 'unidades',
        minimo: 0,
        precio_costo: 0,
        precio_unitario: 0,
        imagen: null
    };
    try {
        const {  error: errIng } = awaitwindow.supabaseClient.from('inventario').insert([nuevoIng]);
        if (!errIng) {
            if (!window.inventarioItems) window.inventarioItems = [];
             window.inventarioItems.push(nuevoIng);
            entry.selIng.value = nuevoId;
            constoptNew = document.createElement('option');
            optNew.value = nuevoId; optNew.textContent = entry.nombreOtro; optNew.selected = true;
            entry.selIng.appendChild(optNew);
            console.log('✅ Creatednewingredient:', nombreOtro );
        } else { 
            console.warn('⚠Couldnotnotcreateingredient:', entry.nombreOtro, errIng.message); 
        }
    } catch(eIng) { 
        console.error('❌ Errorcreatingingredient:', eIng.message); 
    }
}

// Collectallingredients
document.querySelectorAll('#ingredientesContainer .ingrediente-row').forEach(row = > {
    constselIng    = row.querySelector('select:not(.ing-row-unidad)');
    constselUnidad = row.querySelector('select.ing-row-unidad');
    constcantInput = row.querySelector('input[type= "number "]');
    constchkP = row.querySelector('.ing-principal-chk');
    if (selIng  & & selIng.value  & & selIng.value !== '__otro__'  & & cantInput  & & cantInput.value) {
        ingredientes[selIng.value] = {
            cantidad: parseFloat(cantInput.value),
            nombre:    selIng.options[selIng.selectedIndex]?.text ||  selIng.value,
            unidad:    selUnidad ? selUnidad.value : 'unidades',
            principal: chkP ? chkP.checked : false
        };
    }
});

const_ingEntries = Object.entries(ingredientes);
letmaxPlatillos;
if (!_ingEntries.length) {
    const_existing = (window.menuItems || []).find(p = > p.id === (window.platilloEditandoId || ''));
    maxPlatillos = _existing ? (_existing.stock || 0) : 0;
} else {
    maxPlatillos = Infinity;
    _ingEntries.forEach(([ingId, ingData]) = > {
        constinv = (window.inventarioItems || []).find(i = > i.id === ingId);
        if (inv) {
            constdisponibleInv = (inv.stock || 0) - (inv.reservado || 0);
            constunidadRef  = inv.unidad_base || 'unidades';
             constunidadDato = ingData.unidad || unidadRef;
            constnecesario  = window._convertirUnidad(ingData.cantidad, unidadDato, unidadRef);
            if (necesario  > 0) maxPlatillos = Math.min(maxPlatillos, Math.floor(disponibleInv / necesario));
        } else { maxPlatillos = 0; }
    });
    if (!isFinite(maxPlatillos) || maxPlatillos  < 0) maxPlatillos = 0;
}

constchkDisp = document.getElementById('platilloDisponibleCheck');
constdisponibleFinal = chkDisp ? chkDisp.checked : true;

constplatillo = {
    id:  window.platilloEditandoId || window.generarId('plat_'),
    nombre, categoria, subcategoria: subcategoria || null, precio, descripcion,
    imagen: imagenUrl, ingredientes, disponible: disponibleFinal,
    stock: maxPlatillos, stock_maximo: maxPlatillos
};

console.log('💾 Savingplatillotodatabase:', platillo.nombre);

leterror;
if (window.platilloEditandoId) {
    console.log('🔄 Updatingexistingplatillo:', window.platilloEditandoId);
    ({ error } = awaitwindow.supabaseClient.from('menu').update(platillo).eq('id', window.platilloEditandoId));
} else {
    console.log('➕ Insertingnewplatillo');
    ({ error } = awaitwindow.supabaseClient.from('menu').insert([platillo]));
}

if (error) {
    console. error('❌ Databaseerror:', error);
    throwerror;
}

console.log('✅ Platillosavedsuccessfully');

document.getElementById('platilloModal').classList.remove('active');
window.platilloEditandoId = null;
window.limpiarImagenPreview();
awaitwindow.cargarMenu();
window.mostrarToast('✅ Platilloguardado', 'success');
};
// InitializesavebuttonhandlerwhenDOMisready
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', setupSaveButtonHandler);
} else {
setupSaveButtonHandler();
}
document.getElementById('cancelPlatillo').addEventListener('click', () => {
document.getElementById('platilloModal').classList.remove('active');
window.platilloEditandoId = null;
window.limpiarImagenPreview();
});
document.getElementById('closePlatilloModal').addEventListener('click', () => {
document.getElementById('platilloModal').classList.remove('active');
window.platilloEditandoId = null;
window.limpiarImagenPreview();
});
setupPlatilloModalEvents();
})();
