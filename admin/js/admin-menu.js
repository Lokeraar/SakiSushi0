// admin-menu.js - Gestión de platillos (menú)
(function() {
    window.cargarMenu = async function() {
        try {
            const { data, error } = await window.supabaseClient.from('menu').select('*');
            if (error) throw error;
            window.menuItems = data || [];
            window.renderizarMenu();
            window.actualizarProductosActivos();
        } catch (e) { console.error('Error cargando menú:', e); window.mostrarToast('Error cargando menú', 'error'); }
    };

    window.renderizarMenu = function(filtro) {
        const grid = document.getElementById('menuGrid');
        grid.innerHTML = '';
        const _norm = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
        const _base = [...window.menuItems].sort((a,b) => a.nombre.localeCompare(b.nombre));
        const items = filtro
            ? _base.filter(item => _norm(item.nombre).includes(_norm(filtro)))
            : _base;
        if (!items.length) {
            grid.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;padding:.5rem">' +
                (filtro ? 'Sin resultados para "' + filtro + '"' : 'No hay platillos registrados.') + '</p>';
            return;
        }
        items.forEach(item => {
            const ingredientesEstado = [];
            let todosDisponibles = true;
            if (item.ingredientes) {
                for (const [ingId, ingInfo] of Object.entries(item.ingredientes)) {
                    const ing = window.inventarioItems.find(i => i.id === ingId);
                    const disponible = ing && (ing.stock - ing.reservado) >= (ingInfo.cantidad || 0);
                    if (!disponible) todosDisponibles = false;
                    ingredientesEstado.push({ nombre: ingInfo.nombre || ingId, disponible });
                }
            }
            const disponibleFinal = item.disponible && todosDisponibles;
            const imgSrc = item.imagen || '';
            const card = document.createElement('div');
            card.className = 'menu-card-v2' + (item.disponible ? '' : ' no-disponible');
            card.innerHTML = `
                <div class="mc2-header">
                    <div class="mc2-info">
                        <div class="mc2-nombre">${item.nombre}</div>
                        <div class="mc2-cat">${item.categoria || ''}${item.subcategoria ? ' · ' + item.subcategoria : ''}</div>
                        <div class="mc2-precio">${window.formatUSD(item.precio || 0)}
                            <span class="mc2-precio-bs">/ ${window.formatBs(window.usdToBs(item.precio || 0))}</span>
                        </div>
                        <div class="mc2-stock-line">
                            Stock: <span class="mc2-stock-val">${item.stock || 0}</span>
                            <span class="mc2-badge ${disponibleFinal ? 'mc2-badge-ok' : 'mc2-badge-off'}">
                                ${disponibleFinal ? 'Disponible' : 'No disponible'}
                            </span>
                        </div>
                    </div>
                    ${imgSrc ? `<div class="mc2-img-wrap"><img src="${imgSrc}" class="mc2-img" alt="${item.nombre}" onerror="this.parentElement.style.display='none'"></div>` : ''}
                </div>
                ${item.descripcion ? `<div class="mc2-desc">${item.descripcion}</div>` : ''}
                <div class="mc2-tags">${ingredientesEstado.map(ing =>
                    `<span class="ing-tag ${ing.disponible ? '' : 'ing-tag-sin-stock'}" title="${ing.disponible ? 'En stock' : 'Sin stock suficiente'}">
                        ${ing.nombre} <i class="fas fa-${ing.disponible ? 'check' : 'times'}" style="font-size:.55rem;margin-left:2px"></i>
                     </span>`
                ).join('') || '<span class="ing-tag" style="opacity:.5">Sin ingredientes</span>'}</div>
                <div class="mc2-actions">
                    <label style="display:flex;align-items:center;gap:.35rem;cursor:pointer;margin-right:.25rem"
                        title="${disponibleFinal ? 'Marcar como no disponible' : 'Marcar como disponible'}">
                        <span style="font-size:.72rem;color:${disponibleFinal ? 'var(--success)' : 'var(--text-muted)'};font-weight:600">
                            ${disponibleFinal ? 'Disponible' : 'No disponible'}
                        </span>
                        <input type="checkbox" ${item.disponible ? 'checked' : ''}
                            style="accent-color:var(--success);cursor:pointer"
                            onchange="window.toggleDisponiblePlatillo('${item.id}', this.checked)">
                    </label>
                    <button class="btn-icon edit" onclick="window.editarPlatillo('${item.id}')" title="Editar platillo">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="window.eliminarPlatillo('${item.id}')" title="Eliminar platillo">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
            grid.appendChild(card);
        });
    };

    window.toggleDisponiblePlatillo = async function(id, disponible) {
        try {
            const { error } = await window.supabaseClient.from('menu')
                .update({ disponible }).eq('id', id);
            if (error) throw error;
            const item = (window.menuItems || []).find(p => p.id === id);
            if (item) item.disponible = disponible;
            window.renderizarMenu(document.getElementById('menuBuscador')?.value || '');
            if (disponible) {
                window.mostrarToast(`✅ Platillo "${item?.nombre}" ahora está DISPONIBLE en el menú del cliente`, 'success');
            } else {
                window.mostrarToast(`⚠️ Platillo "${item?.nombre}" ahora está NO DISPONIBLE (se mostrará como AGOTADO en el menú del cliente)`, 'warning');
            }
        } catch(e) {
            console.error('Error toggle disponible:', e);
            window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
        }
    };

    window.abrirModalNuevoPlatillo = function() {
        document.getElementById('platilloModalTitle').textContent = 'Nuevo Platillo';
        document.getElementById('platilloForm').reset();
        document.getElementById('ingredientesContainer').innerHTML = '';
        window.limpiarImagenPreview();
        window.cargarCategoriasSelect();
        window.platilloEditandoId = null;
        document.getElementById('platilloModal').classList.add('active');
    };

    window.cargarCategoriasSelect = function() {
        const select = document.getElementById('platilloCategoria');
        select.innerHTML = '<option value="">Seleccionar</option>';
        Object.keys(window.categoriasMenu || {}).forEach(cat => { const opt = document.createElement('option'); opt.value = cat; opt.textContent = cat; select.appendChild(opt); });
        select.addEventListener('change', (e) => { window.cargarSubcategoriasSelect(e.target.value); });
    };

    window.cargarSubcategoriasSelect = function(categoria) {
        const select = document.getElementById('platilloSubcategoria');
        select.innerHTML = '<option value="">Ninguna</option>';
        if (categoria && window.categoriasMenu && window.categoriasMenu[categoria]) {
            window.categoriasMenu[categoria].forEach(sub => { const opt = document.createElement('option'); opt.value = sub; opt.textContent = sub; select.appendChild(opt); });
        }
    };

    window.agregarIngredienteRow = function(ingredienteId, cantidad, unidad) {
        ingredienteId = ingredienteId || '';
        cantidad = cantidad || '';
        if (!unidad && ingredienteId) {
            const _invItem = (window.inventarioItems || []).find(i => i.id === ingredienteId);
            unidad = _invItem?.unidad_base || 'unidades';
        }
        unidad = unidad || 'unidades';
        const container = document.getElementById('ingredientesContainer');
        const row = document.createElement('div');
        row.className = 'ingrediente-row';
        row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.4rem;align-items:center;margin-bottom:.4rem';

        const select = document.createElement('select');
        select.style.cssText = 'font-family:Montserrat,sans-serif;font-size:.82rem';
        select.innerHTML = '<option value="">Seleccionar ingrediente</option>';
        const sorted = [...(window.inventarioItems || [])].sort((a,b) => a.nombre.localeCompare(b.nombre));
        sorted.forEach(ing => {
            const opt = document.createElement('option');
            opt.value = ing.id;
            opt.textContent = ing.nombre;
            if (ing.id === ingredienteId) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener('change', function() {
            const ing = (window.inventarioItems || []).find(i => i.id === this.value);
            if (ing && ing.unidad_base) {
                const unitSel = this.parentElement.querySelector('.ing-row-unidad');
                if (unitSel) unitSel.value = ing.unidad_base;
            }
            window._recalcularStockPlatillo();
        });

        const inputCantidad = document.createElement('input');
        inputCantidad.type = 'number'; inputCantidad.step = '0.001';
        inputCantidad.placeholder = 'Cant.'; inputCantidad.value = cantidad;
        inputCantidad.style.cssText = 'font-family:Montserrat,sans-serif;font-size:.82rem';
        inputCantidad.addEventListener('input', window._recalcularStockPlatillo);

        const selUnidad = document.createElement('select');
        selUnidad.className = 'ing-row-unidad';
        selUnidad.style.cssText = 'font-family:Montserrat,sans-serif;font-size:.78rem';
        ['unidades','gramos','mililitros','kilogramos','litros'].forEach(u => {
            const o = document.createElement('option');
            o.value = u; o.textContent = u.charAt(0).toUpperCase() + u.slice(1);
            if (u === unidad) o.selected = true;
            selUnidad.appendChild(o);
        });
        selUnidad.addEventListener('change', window._recalcularStockPlatillo);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.style.cssText = 'background:#ffebee;color:var(--danger);border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0';
        removeBtn.onclick = () => { row.remove(); window._recalcularStockPlatillo(); };

        row.appendChild(select);
        row.appendChild(inputCantidad);
        row.appendChild(selUnidad);
        row.appendChild(removeBtn);
        container.appendChild(row);
        window._recalcularStockPlatillo();
    };

    window.limpiarImagenPreview = function() {
        document.getElementById('platilloImagen').value = '';
        document.getElementById('platilloImagenUrl').value = '';
        document.getElementById('imagenPreview').style.display = 'none';
        document.getElementById('previewImg').src = '';
    };

    window.editarPlatillo = function(id) {
        const platillo = window.menuItems.find(p => p.id === id);
        if (!platillo) return;
        window.platilloEditandoId = id;
        document.getElementById('platilloModalTitle').textContent = 'Editar Platillo';
        window.limpiarImagenPreview();
        document.getElementById('platilloNombre').value = platillo.nombre || '';
        document.getElementById('platilloCategoria').value = platillo.categoria || '';
        document.getElementById('platilloSubcategoria').value = platillo.subcategoria || '';
        document.getElementById('platilloPrecio').value = platillo.precio || '';
        document.getElementById('platilloDescripcion').value = platillo.descripcion || '';
        document.getElementById('platilloDisponible').value = platillo.disponible ? 'true' : 'false';
        const _chkD = document.getElementById('platilloDisponibleCheck');
        const _lblD = document.getElementById('platilloDisponibleLabel');
        if (_chkD) { _chkD.checked = !!platillo.disponible; }
        if (_lblD) { _lblD.textContent = platillo.disponible ? 'Sí' : 'No'; _lblD.style.color = platillo.disponible ? 'var(--success)' : 'var(--text-muted)'; }
        if (platillo.imagen) {
            document.getElementById('previewImg').src = platillo.imagen;
            document.getElementById('imagenPreview').style.display = 'flex';
            document.getElementById('platilloImagenUrl').value = platillo.imagen;
        }
        window.cargarSubcategoriasSelect(platillo.categoria);
        document.getElementById('ingredientesContainer').innerHTML = '';
        if (platillo.ingredientes) Object.entries(platillo.ingredientes).forEach(([ingId, ingInfo]) => { window.agregarIngredienteRow(ingId, ingInfo.cantidad, ingInfo.unidad); });
        document.getElementById('platilloModal').classList.add('active');
    };

    document.getElementById('savePlatillo').addEventListener('click', async () => {
        const saveBtn = document.getElementById('savePlatillo');
        if (saveBtn && saveBtn.disabled) return;
        try {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            saveBtn.disabled = true;
            
            const nombre = document.getElementById('platilloNombre').value;
            const categoria = document.getElementById('platilloCategoria').value;
            const subcategoria = document.getElementById('platilloSubcategoria').value;
            const precio = parseFloat(document.getElementById('platilloPrecio').value);
            const descripcion = document.getElementById('platilloDescripcion').value;
            const disponible = document.getElementById('platilloDisponible').value === 'true';
            
            if (!nombre || !categoria || !precio) { window.mostrarToast('Completa los campos obligatorios', 'error'); return; }
            
            let imagenUrl = '';
            const archivoImagen = document.getElementById('platilloImagen').files[0];
            const imagenUrlInput = document.getElementById('platilloImagenUrl').value;
            
            if (archivoImagen) {
                const resultado = await window.subirImagenPlatillo(archivoImagen, 'menu');
                if (resultado.success) imagenUrl = resultado.url;
                else { window.mostrarToast('Error al subir la imagen: ' + resultado.error, 'error'); return; }
            } else if (imagenUrlInput) imagenUrl = imagenUrlInput;
            
            const ingredientes = {};
            document.querySelectorAll('#ingredientesContainer .ingrediente-row').forEach(row => {
                const selIng    = row.querySelector('select:not(.ing-row-unidad)');
                const selUnidad = row.querySelector('select.ing-row-unidad');
                const cantInput = row.querySelector('input[type="number"]');
                if (selIng && selIng.value && cantInput && cantInput.value) {
                    ingredientes[selIng.value] = {
                        cantidad: parseFloat(cantInput.value),
                        nombre: selIng.options[selIng.selectedIndex]?.text || selIng.value,
                        unidad: selUnidad ? selUnidad.value : 'unidades'
                    };
                }
            });

            const _ingEntries = Object.entries(ingredientes);
            let maxPlatillos;
            if (!_ingEntries.length) {
                const _existing = (window.menuItems || []).find(p => p.id === (window.platilloEditandoId || ''));
                maxPlatillos = _existing ? (_existing.stock || 0) : 0;
            } else {
                maxPlatillos = Infinity;
                _ingEntries.forEach(([ingId, ingData]) => {
                    const inv = (window.inventarioItems || []).find(i => i.id === ingId);
                    if (inv) {
                        const disponibleInv = (inv.stock || 0) - (inv.reservado || 0);
                        const unidadRef  = inv.unidad_base || 'unidades';
                        const unidadDato = ingData.unidad || unidadRef;
                        const necesario  = window._convertirUnidad(ingData.cantidad, unidadDato, unidadRef);
                        if (necesario > 0) maxPlatillos = Math.min(maxPlatillos, Math.floor(disponibleInv / necesario));
                    } else { maxPlatillos = 0; }
                });
                if (!isFinite(maxPlatillos) || maxPlatillos < 0) maxPlatillos = 0;
            }

            const chkDisp = document.getElementById('platilloDisponibleCheck');
            const disponibleFinal = chkDisp ? chkDisp.checked : disponible;

            const platillo = {
                id: window.platilloEditandoId || window.generarId('plat_'),
                nombre, categoria, subcategoria: subcategoria || null, precio, descripcion,
                imagen: imagenUrl, ingredientes, disponible: disponibleFinal,
                stock: maxPlatillos, stock_maximo: maxPlatillos
            };
            
            let error;
            if (window.platilloEditandoId) ({ error } = await window.supabaseClient.from('menu').update(platillo).eq('id', window.platilloEditandoId));
            else ({ error } = await window.supabaseClient.from('menu').insert([platillo]));
            
            if (error) throw error;
            
            document.getElementById('platilloModal').classList.remove('active');
            window.platilloEditandoId = null;
            window.limpiarImagenPreview();
            await window.cargarMenu();
            window.mostrarToast('✅ Platillo guardado', 'success');
        } catch (e) { console.error('Error guardando platillo:', e); window.mostrarToast('❌ Error al guardar el platillo: ' + e.message, 'error'); }
        finally { const saveBtn = document.getElementById('savePlatillo'); saveBtn.innerHTML = 'Guardar'; saveBtn.disabled = false; }
    });

    document.getElementById('cancelPlatillo').addEventListener('click', () => {
        document.getElementById('platilloModal').classList.remove('active');
        window.platilloEditandoId = null;
    });
    document.getElementById('closePlatilloModal').addEventListener('click', () => {
        document.getElementById('platilloModal').classList.remove('active');
        window.platilloEditandoId = null;
    });

    window.eliminarPlatillo = async function(id) {
        if (!confirm('¿Estás seguro de eliminar este platillo?')) return;
        try {
            const platillo = window.menuItems.find(p => p.id === id);
            if (platillo && platillo.imagen && platillo.imagen.includes('imagenes-platillos')) await window.eliminarImagenPlatillo(platillo.imagen);
            await window.supabaseClient.from('menu').delete().eq('id', id);
            await window.cargarMenu();
            window.mostrarToast('🗑️ Platillo eliminado', 'success');
        } catch (e) { console.error('Error eliminando platillo:', e); window.mostrarToast('❌ Error al eliminar el platillo', 'error'); }
    };

    window.actualizarProductosActivos = function() {
        document.getElementById('productosActivos').textContent = window.menuItems.filter(m => m.disponible).length;
    };

    window._onCategoriaChange = function() {
        const cat = document.getElementById('platilloCategoria')?.value;
        const wrap = document.getElementById('subcategoriaContainer');
        const sel  = document.getElementById('platilloSubcategoria');
        if (!wrap || !sel) return;
        const SUBCATEGORIAS = {
            'rolls': [{ id: 'rolls-frios', name: 'Rolls Fríos (10 pzas)' }, { id: 'rolls-tempura', name: 'Rolls Tempura (12 pzas)' }],
            'china': [
                { id: 'arroz-chino', name: 'Arroz Chino' }, { id: 'arroz-cantones', name: 'Arroz Cantones' },
                { id: 'chopsuey', name: 'Chopsuey' }, { id: 'lomey', name: 'Lomey' }, { id: 'chow-mein', name: 'Chow Mein' },
                { id: 'fideos-arroz', name: 'Fideos de Arroz' }, { id: 'tallarines-cantones', name: 'Tallarines Cantones' },
                { id: 'mariscos', name: 'Mariscos' }, { id: 'foo-yung', name: 'Foo Yong' }, { id: 'sopas', name: 'Sopas' },
                { id: 'entremeses', name: 'Entremeses' }
            ],
            'japonesa': [
                { id: 'yakimeshi', name: 'Yakimeshi' }, { id: 'yakisoba', name: 'Yakisoba' },
                { id: 'pasta-udon', name: 'Pasta Udon' }, { id: 'churrasco', name: 'Churrasco' }
            ]
        };
        const subs = SUBCATEGORIAS[cat];
        if (subs && subs.length) {
            wrap.style.display = 'block';
            sel.innerHTML = '<option value="">Sin subcategoría</option>' +
                subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        } else {
            wrap.style.display = 'none';
            sel.innerHTML = '<option value="">Ninguna</option>';
        }
        window._recalcularStockPlatillo();
    };

    window._previewPrecioBs = function() {
        const precio = parseFloat(document.getElementById('platilloPrecio')?.value) || 0;
        const tasa   = (window.configGlobal?.tasa_efectiva) || (window.configGlobal?.tasa_cambio) || 0;
        const el = document.getElementById('platilloPrecioBsPreview');
        if (el) el.textContent = tasa > 0 && precio > 0 ? '💰 ' + window.formatBs(precio * tasa) : '';
    };

    window._previewPlatilloUrl = function(url) {
        if (!url) return;
        const prev = document.getElementById('imagenPreview');
        const img  = document.getElementById('previewImg');
        if (prev && img) { img.src = url; prev.style.display = 'flex'; }
    };

    window._recalcularStockPlatillo = function() {
        const wrap = document.getElementById('stockCalculadoWrap');
        const txt  = document.getElementById('stockCalculadoText');
        if (!wrap || !txt) return;
        const rows = document.querySelectorAll('#ingredientesContainer .ingrediente-row');
        if (!rows.length) { wrap.style.display = 'none'; return; }
        let maxPlatillos = Infinity;
        let hayIngredientes = false;
        rows.forEach(row => {
            const selIng = row.querySelector('select:not(.ing-row-unidad)');
            const selUni = row.querySelector('select.ing-row-unidad');
            const cant   = parseFloat(row.querySelector('input[type="number"]')?.value) || 0;
            if (!selIng?.value || !cant) return;
            hayIngredientes = true;
            const inv = (window.inventarioItems || []).find(i => i.id === selIng.value);
            if (inv) {
                const disponible = (inv.stock || 0) - (inv.reservado || 0);
                const unidadIng  = selUni?.value || 'unidades';
                const necesario  = window._convertirUnidad(cant, unidadIng, inv.unidad_base || 'unidades');
                if (necesario > 0) maxPlatillos = Math.min(maxPlatillos, Math.floor(disponible / necesario));
            } else { maxPlatillos = 0; }
        });
        if (!hayIngredientes) { wrap.style.display = 'none'; return; }
        if (!isFinite(maxPlatillos) || maxPlatillos < 0) maxPlatillos = 0;
        wrap.style.display = 'block';
        wrap.style.background = maxPlatillos > 5 ? '#f0fdf4' : maxPlatillos > 0 ? '#fffbeb' : '#fef2f2';
        wrap.style.borderColor = maxPlatillos > 5 ? '#bbf7d0' : maxPlatillos > 0 ? '#fde68a' : '#fecaca';
        txt.style.color = maxPlatillos > 5 ? '#166534' : maxPlatillos > 0 ? '#92400e' : '#991b1b';
        txt.textContent = maxPlatillos > 0
            ? `Con el stock actual se pueden preparar ${maxPlatillos} porcion${maxPlatillos !== 1 ? 'es' : ''}`
            : '⚠️ Stock insuficiente para preparar este platillo';
    };
})();
