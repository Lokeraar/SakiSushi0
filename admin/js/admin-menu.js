// admin-menu.js - Gestión de platillos (menú)
(function() {
    let currentImagenUrl = '';
    let currentImagenFile = null;

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
        if (!grid) return;
        grid.innerHTML = '';
        const _norm = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
        const _base = [...window.menuItems].sort((a,b) => a.nombre.localeCompare(b.nombre));
        const items = filtro ? _base.filter(item => _norm(item.nombre).includes(_norm(filtro))) : _base;
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
                    ingredientesEstado.push({ id: ingId, nombre: ingInfo.nombre || ingId, disponible });
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
                    ${imgSrc ? `<div class="mc2-img-wrap"><img src="${imgSrc}" class="mc2-img" alt="${item.nombre}" loading="lazy"></div>` : ''}
                </div>
                ${item.descripcion ? `<div class="mc2-desc">${item.descripcion}</div>` : ''}
                <div class="mc2-tags">${ingredientesEstado.map(ing => `
                    <span class="ing-tag ${ing.disponible ? '' : 'ing-tag-sin-stock'}" data-ingrediente-id="${ing.id}" 
                          title="${ing.disponible ? 'En stock' : 'Sin stock suficiente'}" style="cursor:pointer">
                        ${ing.nombre} <i class="fas fa-${ing.disponible ? 'check' : 'times'}" style="font-size:.55rem;margin-left:2px"></i>
                    </span>
                `).join('') || '<span class="ing-tag" style="opacity:.5">Sin ingredientes</span>'}</div>
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
            
            // Evento para expandir imagen al hacer clic
            const imgElement = card.querySelector('.mc2-img');
            if (imgElement) {
                imgElement.style.cursor = 'pointer';
                imgElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.expandirImagen(imgSrc);
                });
            }
            // Evento para ingredientes
            card.querySelectorAll('.ing-tag[data-ingrediente-id]').forEach(tag => {
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const ingId = tag.dataset.ingredienteId;
                    window._irAIngrediente(ingId);
                });
            });
            grid.appendChild(card);
        });
    };

    window.expandirImagen = function(src) {
        if (!src) return;
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer';
        modal.innerHTML = `<img src="${src}" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:8px">`;
        modal.addEventListener('click', () => modal.remove());
        document.body.appendChild(modal);
    };

    window.toggleDisponiblePlatillo = async function(id, disponible) {
        try {
            const { error } = await window.supabaseClient.from('menu')
                .update({ disponible: disponible })
                .eq('id', id);
            if (error) throw error;
            const item = window.menuItems.find(p => p.id === id);
            if (item) item.disponible = disponible;
            window.renderizarMenu(document.getElementById('menuBuscador')?.value || '');
            if (disponible) {
                window.mostrarToast(`✅ Platillo "${item?.nombre}" ahora está DISPONIBLE en el menú del cliente`, 'success');
            } else {
                window.mostrarToast(`⚠️ Platillo "${item?.nombre}" ahora está NO DISPONIBLE (se mostrará como AGOTADO en el menú del cliente)`, 'warning');
            }
        } catch(e) {
            console.error('Error toggle disponible:', e);
            if (e.message && e.message.includes('permission denied')) {
                window.mostrarToast('⚠️ No se pudo cambiar el estado. Contacta al administrador del sistema.', 'error');
            } else {
                window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
            }
        }
    };

    window.limpiarImagenPreview = function() {
        currentImagenFile = null;
        currentImagenUrl = '';
        const fileInput = document.getElementById('platilloImagen');
        const urlInput = document.getElementById('platilloImagenUrl');
        const previewDiv = document.getElementById('imagenPreview');
        const previewImg = document.getElementById('previewImg');
        if (fileInput) fileInput.value = '';
        if (urlInput) {
            urlInput.value = '';
            urlInput.disabled = false;
        }
        if (previewDiv) previewDiv.style.display = 'none';
        if (previewImg) previewImg.src = '';
        // Eliminar cualquier botón "Quitar" que pudiera quedar
        const oldQuitar = document.querySelector('#imagenPreview .btn-small, #imagenPreview button:not(.preview-remove-btn)');
        if (oldQuitar) oldQuitar.remove();
    };

    // Configurar eventos del modal de platillo
    function setupPlatilloModalEvents() {
        const fileInput = document.getElementById('platilloImagen');
        const urlInput = document.getElementById('platilloImagenUrl');
        const previewDiv = document.getElementById('imagenPreview');
        const previewImg = document.getElementById('previewImg');
        
        // Eliminar cualquier botón "Quitar" existente
        const existingQuitar = document.querySelector('#imagenPreview .btn-small, #imagenPreview button:not(.preview-remove-btn)');
        if (existingQuitar) existingQuitar.remove();
        
        let removePreviewBtn = null;
        function updateRemoveButton() {
            if (removePreviewBtn) removePreviewBtn.remove();
            if (previewDiv && previewDiv.style.display === 'flex') {
                removePreviewBtn = document.createElement('button');
                removePreviewBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
                removePreviewBtn.style.cssText = 'position:absolute;top:-8px;right:-8px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.8rem;z-index:10;backdrop-filter:blur(2px)';
                removePreviewBtn.title = 'Eliminar imagen';
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
                    const file = fileInput.files[0];
                    currentImagenFile = file;
                    currentImagenUrl = '';
                    if (urlInput) {
                        urlInput.value = '';
                        urlInput.disabled = true;
                    }
                    const reader = new FileReader();
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
                        if (previewDiv) previewDiv.style.display = 'none';
                        if (previewImg) previewImg.src = '';
                    }
                }
            });
        }
        
        if (urlInput) {
            urlInput.addEventListener('input', function() {
                if (fileInput && fileInput.files && fileInput.files[0]) return;
                const url = urlInput.value.trim();
                if (url) {
                    if (previewImg) previewImg.src = url;
                    if (previewDiv) previewDiv.style.display = 'flex';
                    updateRemoveButton();
                    currentImagenUrl = url;
                    currentImagenFile = null;
                } else {
                    if (previewDiv) previewDiv.style.display = 'none';
                    if (previewImg) previewImg.src = '';
                }
            });
        }
        
        // Expandir imagen al hacer clic en preview
        if (previewImg) {
            previewImg.style.cursor = 'pointer';
            previewImg.addEventListener('click', (e) => {
                e.stopPropagation();
                if (previewImg.src) window.expandirImagen(previewImg.src);
            });
        }
        
        // Tooltip para ingredientes
        const ingredientesLabel = document.querySelector('#platilloForm .form-group:nth-child(7) label');
        if (ingredientesLabel) {
            ingredientesLabel.innerHTML += `
                <span class="tooltip-wrap" style="position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem">
                    <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                    <span class="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:260px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,.3); z-index:100; line-height:1.4">
                        ⚠️ La unidad de medida del ingrediente es crítica: "1 aguacate" no equivale a 500 gramos. Asegúrate de seleccionar la unidad correcta (unidades, kilogramos, litros, etc.) según corresponda.
                    </span>
                </span>
            `;
        }
    }

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
        if (!select) return;
        select.innerHTML = '<option value="">Seleccionar categoría</option>';
        Object.keys(window.categoriasMenu || {}).forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            select.appendChild(opt);
        });
        // Clonar el nodo para eliminar listeners anteriores y evitar duplicados
        const nuevoSelect = select.cloneNode(true);
        select.parentNode.replaceChild(nuevoSelect, select);
        nuevoSelect.addEventListener('change', (e) => {
            window.cargarSubcategoriasSelect(e.target.value);
            window._recalcularStockPlatillo();
        });
    };

    window.cargarSubcategoriasSelect = function(categoria) {
        const select = document.getElementById('platilloSubcategoria');
        select.innerHTML = '<option value="">Ninguna</option>';
        if (categoria && window.categoriasMenu && window.categoriasMenu[categoria]) {
            window.categoriasMenu[categoria].forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                select.appendChild(opt);
            });
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

    window.editarPlatillo = function(id) {
        const platillo = window.menuItems.find(p => p.id === id);
        if (!platillo) return;
        window.platilloEditandoId = id;
        document.getElementById('platilloModalTitle').textContent = 'Editar Platillo';
        window.limpiarImagenPreview();
        // Cargar categorías PRIMERO para que el select tenga opciones antes de asignar valor
        window.cargarCategoriasSelect();
        document.getElementById('platilloNombre').value = platillo.nombre || '';
        // Asignar categoría después de haber cargado las opciones
        document.getElementById('platilloCategoria').value = platillo.categoria || '';
        // Cargar subcategorías de la categoría seleccionada y luego asignar el valor
        window.cargarSubcategoriasSelect(platillo.categoria || '');
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
            currentImagenUrl = platillo.imagen;
        }
        window.cargarSubcategoriasSelect(platillo.categoria);
        document.getElementById('ingredientesContainer').innerHTML = '';
        if (platillo.ingredientes) {
            Object.entries(platillo.ingredientes).forEach(([ingId, ingInfo]) => {
                window.agregarIngredienteRow(ingId, ingInfo.cantidad, ingInfo.unidad);
            });
        }
        document.getElementById('platilloModal').classList.add('active');
    };

    window.eliminarPlatillo = async function(id) {
        const platillo = window.menuItems.find(p => p.id === id);
        if (!platillo) return;
        window.mostrarConfirmacionPremium(
            'Eliminar Platillo',
            `¿Estás seguro de eliminar "${platillo.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    if (platillo.imagen && platillo.imagen.includes('imagenes-platillos')) {
                        await window.eliminarImagenPlatillo(platillo.imagen);
                    }
                    await window.supabaseClient.from('menu').delete().eq('id', id);
                    await window.cargarMenu();
                    window.mostrarToast('🗑️ Platillo eliminado', 'success');
                } catch (e) {
                    console.error('Error eliminando platillo:', e);
                    window.mostrarToast('❌ Error al eliminar el platillo', 'error');
                }
            }
        );
    };

    window.actualizarProductosActivos = function() {
        const prodCard = document.querySelector('.dashboard-card:nth-child(3)');
        if (prodCard) prodCard.textContent = window.menuItems.filter(m => m.disponible).length;
    };

    // _onCategoriaChange: llamado desde el atributo onchange del select en el HTML.
    // Delega directamente a cargarSubcategoriasSelect usando window.categoriasMenu
    // (las mismas claves y subcategorías que usa Cliente_2_0).
    window._onCategoriaChange = function() {
        const cat = document.getElementById('platilloCategoria')?.value || '';
        window.cargarSubcategoriasSelect(cat);
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

    // Guardar platillo (evento)
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
            const disponibleFinal = chkDisp ? chkDisp.checked : true;

            const platillo = {
                id: window.platilloEditandoId || window.generarId('plat_'),
                nombre, categoria, subcategoria: subcategoria || null, precio, descripcion,
                imagen: imagenUrl, ingredientes, disponible: disponibleFinal,
                stock: maxPlatillos, stock_maximo: maxPlatillos
            };
            
            let error;
            if (window.platilloEditandoId) {
                ({ error } = await window.supabaseClient.from('menu').update(platillo).eq('id', window.platilloEditandoId));
            } else {
                ({ error } = await window.supabaseClient.from('menu').insert([platillo]));
            }
            if (error) throw error;
            
            document.getElementById('platilloModal').classList.remove('active');
            window.platilloEditandoId = null;
            window.limpiarImagenPreview();
            await window.cargarMenu();
            window.mostrarToast('✅ Platillo guardado', 'success');
        } catch (e) {
            console.error('Error guardando platillo:', e);
            window.mostrarToast('❌ Error al guardar el platillo: ' + e.message, 'error');
        } finally {
            const saveBtn = document.getElementById('savePlatillo');
            saveBtn.innerHTML = 'Guardar';
            saveBtn.disabled = false;
        }
    });

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

    // Inicializar eventos del modal de platillo
    setupPlatilloModalEvents();
})();
