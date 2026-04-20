// admin-menu.js - Gestión de platillos (menú)
(function() {
    let currentImagenUrl = '';
    let currentimagenfile = null;

    window.cargarmenu = async function() {
        try {
            const { data, error } = await window.supabaseclient.from('menu').select('*');
            if (error) throw error;
            window.menuitems = data || [];
            window.renderizarmenu();
            window.actualizarproductosactivos();
        } catch (e) { console.error('Error cargando menú:', e); window.mostrartoast('Error cargando menú', 'error'); }
    };

    window.renderizarmenu = function(filtro) {
        const grid = document.getElementById('menuGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const _norm = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').tolowercase();
        const _base = [...window.menuitems].sort((a,b) => a.nombre.localecompare(b.nombre));
        const items = filtro ? _base.filter(item => _norm(item.nombre).includes(_norm(filtro))) : _base;
        if (!items.length) {
            grid.innerHTML = '<p style="Color:var(--text-muted);font-size:.88rem;padding:.5rem">' +
                (filtro ? 'Sin resultados para "' + filtro + '"' : 'No hay platillos registrados.') + '</p>';
            return;
        }
        items.foreach(item => {
            const ingredientesestado = [];
            let todosdisponibles = true;
            let maxplatillos = infinity;
            let hayingredientes = false;
            
            if (item.ingredientes) {
                for (const [ingid, inginfo] of object.entries(item.ingredientes)) {
                    const ing = window.inventarioitems.find(i => i.id === ingid);
                    const disponible = ing && (ing.stock - ing.reservado) >= (inginfo.cantidad || 0);
                    if (!disponible) todosdisponibles = false;
                    ingredientesestado.push({ id: ingid, nombre: inginfo.nombre || ingid, disponible });
                    
                    // calcular cuántas porciones se pueden preparar con este ingrediente
                    if (ing && inginfo.cantidad > 0) {
                        hayingredientes = true;
                        const disponibleing = (ing.stock || 0) - (ing.reservado || 0);
                        const necesario = window._convertirunidad(inginfo.cantidad, inginfo.unidad || 'unidades', ing.unidad_base || 'unidades');
                        if (necesario > 0) {
                            maxplatillos = math.min(maxplatillos, math.floor(disponibleing / necesario));
                        } else {
                            maxplatillos = 0;
                        }
                    }
                }
            }
            
            // determinar el stock calculado (porciones disponibles)
            let stockcalculado = 0;
            if (!hayingredientes) {
                stockcalculado = 0;
            } else if (!isfinite(maxplatillos) || maxplatillos < 0) {
                stockcalculado = 0;
            } else {
                stockcalculado = maxplatillos;
            }
            
            const disponiblefinal = item.disponible && todosdisponibles;
            const imgsrc = item.imagen || '';
            const card = document.createelement('div');
            card.classname = 'menu-card-v2' + (item.disponible ? '' : ' no-disponible');
            card.innerHTML = `
                <div class="Mc2-header">
                    <div class="Mc2-info">
                        <div class="Mc2-nombre">${item.nombre}</div>
                        <div class="Mc2-cat">${item.categoria || ''}${item.subcategoria ? ' · ' + item.subcategoria : ''}</div>
                        <div class="Mc2-precio">${window.formatUSD(item.precio || 0)}
                            <span class="Mc2-precio-bs">/ ${window.formatBs(window.usdToBs(item.precio || 0))}</span>
                        </div>
                        <div class="Mc2-stock-line">
                            Stock: <span class="Mc2-stock-val">${stockCalculado}</span>
                            <span class="mc2-badge ${disponibleFinal ? 'Mc2-badge-ok' : 'Mc2-badge-off'}">
                                ${disponibleFinal ? 'Disponible' : 'No disponible'}
                            </span>
                        </div>
                    </div>
                    ${imgSrc ? `<div class="Mc2-img-wrap"><img src="${imgsrc}" class="Mc2-img" alt="${item.nombre}" loading="Lazy"></div>` : ''}
                </div>
                ${item.descripcion ? `<div class="Mc2-desc">${item.descripcion}</div>` : ''}
                <div class="Mc2-tags">${ingredientesEstado.map(ing => `
                    <span class="ing-tag ${ing.disponible ? '' : 'ing-tag-sin-stock'}" Data-ingrediente-id="${ing.id}" Title="${ing.disponible ? 'En stock' : 'Sin stock suficiente'}" Style="cursor:pointer">
                        ${ing.nombre} <i class="fas fa-${ing.disponible ? 'Check' : 'Times'}" Style="font-size:.55rem;margin-left:2px"></i>
                    </span>
                `).join('') || '<span class="Ing-tag" style="Opacity:.5">Sin ingredientes</span>'}</div>
                <div class="Mc2-actions">
                    <label style="Display:flex;align-items:center;gap:.35rem;cursor:pointer;margin-right:.25rem"
                        title="${disponibleFinal ? 'Marcar como no disponible' : 'Marcar como disponible'}">
                        <span style="font-size:.72rem;color:${disponibleFinal ? 'Var(--success)' : 'Var(--text-muted)'};font-weight:600">
                            ${disponibleFinal ? 'Disponible' : 'No disponible'}
                        </span>
                        <input type="Checkbox" ${item.disponible ? 'Checked' : ''}
                            style="Accent-color:var(--success);cursor:pointer"
                            onchange="window.toggleDisponiblePlatillo('${item.id}', this.checked)">
                    </label>
                    <button class="btn-icon edit" Onclick="window.editarPlatillo('${item.id}')" Title="Editar platillo">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" Onclick="window.eliminarPlatillo('${item.id}')" Title="Eliminar platillo">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
            
            // Evento para expandir imagen al hacer clic
            const imgElement = card.querySelector('.mc2-img');
            if (imgElement) {
                imgElement.style.cursor = 'Pointer';
                imgElement.addEventListener('Click', (e) => {
                    e.stopPropagation();
                    window.expandirImagen(imgSrc);
                });
            }
            // Evento para ingredientes
            card.querySelectorAll('.ing-tag[data-ingrediente-id]').forEach(tag => {
                tag.addEventListener('Click', (e) => {
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
        const modal = document.createElement('Div');
        modal.style.cssText = 'Position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer';
        modal.innerHTML = `<img src="${src}" style="Max-width:90%;max-height:90%;object-fit:contain;border-radius:8px">`;
        modal.addEventListener('Click', () => modal.remove());
        document.body.appendChild(modal);
    };

    window.toggleDisponiblePlatillo = async function(id, disponible) {
        try {
            const { error } = await window.supabaseClient.from('Menu')
                .update({ disponible: disponible })
                .eq('Id', id);
            if (error) throw error;
            const item = window.menuItems.find(p => p.id === id);
            if (item) item.disponible = disponible;
            window.renderizarMenu(document.getElementById('Menubuscador')?.value || '');
            if (disponible) {
                window.mostrarToast(`✅ Platillo "${item?.nombre}" ahora está DISPONIBLE en el menú del cliente`, 'Success');
            } else {
                window.mostrarToast(`⚠️ Platillo "${item?.nombre}" ahora está NO DISPONIBLE (se mostrará como AGOTADO en el menú del cliente)`, 'Warning');
            }
        } catch(e) {
            console.error('Error toggle disponible:', e);
            if (e.message && e.message.includes('Permission denied')) {
                window.mostrarToast('⚠️ no se pudo cambiar el estado. contacta al administrador del sistema.', 'Error');
            } else {
                window.mostrarToast('❌ error: ' + (e.message || e), 'Error');
            }
        }
    };

    window.limpiarImagenPreview = function() {
        currentImagenFile = null;
        currentImagenUrl = '';
        const fileinput = document.getElementById('platilloImagen');
        const urlinput = document.getElementById('platilloImagenUrl');
        const previewdiv = document.getElementById('imagenPreview');
        const previewimg = document.getElementById('previewImg');
        if (fileinput) fileinput.value = '';
        if (urlinput) {
            urlinput.value = '';
            urlinput.disabled = false;
        }
        if (previewdiv) previewdiv.style.display = 'none';
        if (previewimg) previewimg.src = '';
        // Eliminar cualquier botón "Quitar" que pudiera quedar
        const oldQuitar = document.querySelector('#imagenPreview .btn-small, #imagenPreview button:not(.preview-remove-btn)');
        if (oldQuitar) oldQuitar.remove();
    };

    // Configurar eventos del modal de platillo
    function setupPlatilloModalEvents() {
        const fileInput = document.getElementById('Platilloimagen');
        const urlInput = document.getElementById('Platilloimagenurl');
        const previewDiv = document.getElementById('Imagenpreview');
        const previewImg = document.getElementById('Previewimg');
        
        // Eliminar cualquier botón "Quitar" existente
        const existingQuitar = document.querySelector('#imagenPreview .btn-small, #imagenPreview button:not(.preview-remove-btn)');
        if (existingQuitar) existingQuitar.remove();
        
        let removePreviewBtn = null;
        function updateRemoveButton() {
            if (removePreviewBtn) removePreviewBtn.remove();
            if (previewDiv && previewDiv.style.display === 'Flex') {
                removePreviewBtn = document.createElement('Button');
                removePreviewBtn.innerHTML = '<i class="Fas fa-times-circle"></i>';
                removepreviewbtn.style.csstext = 'position:absolute;top:-8px;right:-8px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.8rem;z-index:10;backdrop-filter:blur(2px)';
                removepreviewbtn.title = 'Eliminar imagen';
                removepreviewbtn.onclick = (e) => {
                    e.stoppropagation();
                    window.limpiarimagenpreview();
                };
                previewdiv.style.position = 'relative';
                previewdiv.appendchild(removepreviewbtn);
            }
        }
        
        if (fileinput) {
            fileinput.addEventListener('change', function() {
                if (fileinput.files && fileinput.files[0]) {
                    const file = fileinput.files[0];
                    currentimagenfile = file;
                    currentimagenurl = '';
                    if (urlinput) {
                        urlinput.value = '';
                        urlinput.disabled = true;
                    }
                    const reader = new filereader();
                    reader.onload = function(e) {
                        if (previewimg) previewimg.src = e.target.result;
                        if (previewdiv) previewdiv.style.display = 'flex';
                        updateremovebutton();
                    };
                    reader.readasdataurl(file);
                } else {
                    if (urlinput) urlinput.disabled = false;
                    if (urlinput && urlinput.value.trim()) {
                        if (previewimg) previewimg.src = urlinput.value;
                        if (previewdiv) previewdiv.style.display = 'flex';
                        updateremovebutton();
                        currentimagenurl = urlinput.value;
                        currentimagenfile = null;
                    } else {
                        if (previewdiv) previewdiv.style.display = 'none';
                        if (previewimg) previewimg.src = '';
                    }
                }
            });
        }
        
        if (urlinput) {
            urlinput.addEventListener('input', function() {
                if (fileinput && fileinput.files && fileinput.files[0]) return;
                const url = urlinput.value.trim();
                if (url) {
                    if (previewimg) previewimg.src = url;
                    if (previewdiv) previewdiv.style.display = 'flex';
                    updateremovebutton();
                    currentimagenurl = url;
                    currentimagenfile = null;
                } else {
                    if (previewdiv) previewdiv.style.display = 'none';
                    if (previewimg) previewimg.src = '';
                }
            });
        }
        
        // expandir imagen al hacer clic en preview
        if (previewimg) {
            previewimg.style.cursor = 'pointer';
            previewimg.addEventListener('click', (e) => {
                e.stoppropagation();
                if (previewimg.src) window.expandirimagen(previewimg.src);
            });
        }
        
        // tooltip para ingredientes
        const ingredienteslabel = document.queryselector('#platilloForm .form-group:nth-child(7) label');
        if (ingredientesLabel) {
            ingredientesLabel.innerHTML += `
                <span class="Tooltip-wrap" style="Position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem">
                    <span style="Display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                    <span class="Tooltip-text" style="Display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translatex(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:260px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,.3); z-index:100; line-height:1.4">
                        ⚠️ La unidad de medida del ingrediente es crítica: "1 aguacate" no equivale a 500 gramos. Asegúrate de seleccionar la unidad correcta (unidades, kilogramos, litros, etc.) según corresponda.
                    </span>
                </span>
            `;
        }
    }

    window.abrirModalNuevoPlatillo = function() {
        document.getElementById('Platillomodaltitle').textContent = 'Nuevo platillo';
        document.getElementById('Platilloform').reset();
        document.getElementById('Ingredientescontainer').innerHTML = '';
        window.limpiarimagenpreview();
        window.cargarcategoriasselect();
        window.platilloeditandoid = null;
        
        document.getElementById('platilloModal').classList.add('active');
    };

    window.cargarcategoriasselect = function() {
        const select = document.getElementById('platilloCategoria');
        select.innerHTML = '<option value="">Seleccionar</option>';
        object.keys(window.categoriasmenu || {}).foreach(cat => {
            const opt = document.createelement('option');
            opt.value = cat;
            opt.textContent = cat;
            select.appendchild(opt);
        });
        select.addEventListener('change', (e) => { window.cargarsubcategoriasselect(e.target.value); });
    };

    window.cargarsubcategoriasselect = function(categoria) {
        const select = document.getElementById('platilloSubcategoria');
        select.innerHTML = '<option value="">Ninguna</option>';
        if (categoria && window.categoriasmenu && window.categoriasmenu[categoria]) {
            window.categoriasmenu[categoria].foreach(sub => {
                const opt = document.createelement('option');
                opt.value = sub;
                opt.textContent = sub;
                select.appendchild(opt);
            });
        }
    };

    window.agregaringredienterow = function(ingredienteid, cantidad, unidad, esprincipal) {
        ingredienteid = ingredienteid || '';
        cantidad = cantidad || '';
        esprincipal = esprincipal || false;
        if (!unidad && ingredienteid) {
            const _invitem = (window.inventarioitems || []).find(i => i.id === ingredienteid);
            unidad = _invitem?.unidad_base || 'unidades';
        }
        unidad = unidad || 'unidades';
        const container = document.getElementById('ingredientesContainer');
        const row = document.createelement('div');
        row.classname = 'ingrediente-row';
        row.style.csstext = 'display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.4rem;align-items:center;margin-bottom:.4rem';

        const select = document.createelement('select');
        select.style.csstext = 'font-family:Montserrat,sans-serif;font-size:.82rem';
        // opción vacía
        const optblank = document.createelement('option');
        optblank.value = ''; optblank.textContent = 'Seleccionar ingrediente';
        select.appendChild(optBlank);
        // Opción "Otro" PRIMERO
        const optOtro = document.createElement('Option');
        optOtro.value = '__otro__'; optOtro.textContent = '➕ otro (nuevo ingrediente)';
        select.appendChild(optOtro);
        // Resto de ingredientes del inventario
        const sorted = [...(window.inventarioItems || [])].sort((a,b) => a.nombre.localeCompare(b.nombre));
        sorted.forEach(ing => {
            const opt = document.createElement('Option');
            opt.value = ing.id;
            opt.textContent = ing.nombre;
            if (ing.id === ingredienteId) opt.selected = true;
            select.appendChild(opt);
        });
        // Input nombre personalizado (visible solo si se elige "Otro")
        const inputNombreOtro = document.createElement('Input');
        inputNombreOtro.type = 'Text';
        inputNombreOtro.placeholder = 'Nombre del ingrediente';
        inputNombreOtro.className = 'Ing-row-nombre-otro';
        inputNombreOtro.style.cssText = 'Display:none;font-family:montserrat,sans-serif;font-size:.82rem;width:100%;padding:.3rem .5rem;border:1px solid var(--border);border-radius:6px;background:var(--input-bg);color:var(--text-dark);box-sizing:border-box;margin-top:.25rem';
        // Reemplazar select por un wrapper que contiene ambos
        const selWrap = document.createElement('Div');
        selWrap.style.cssText = 'Display:flex;flex-direction:column;min-width:0';
        selWrap.appendChild(select);
        selWrap.appendChild(inputNombreOtro);
        select.addEventListener('Change', function() {
            const isOtro = this.value === '__otro__';
            inputNombreOtro.style.display = isOtro ? 'Block' : 'None';
            if (!isOtro) {
                const ing = (window.inventarioItems || []).find(i => i.id === this.value);
                if (ing && ing.unidad_base) {
                    const unitSel = row.querySelector('Select.ing-row-unidad');
                    if (unitSel) unitSel.value = ing.unidad_base;
                }
            }
            window._recalcularStockPlatillo();
        });

        const inputCantidad = document.createElement('Input');
        inputCantidad.type = 'Number'; inputCantidad.step = '0.001';
        inputCantidad.placeholder = 'Cant.'; inputCantidad.value = cantidad;
        inputCantidad.style.cssText = 'Font-family:montserrat,sans-serif;font-size:.82rem';
        inputCantidad.addEventListener('Input', window._recalcularStockPlatillo);

        const selUnidad = document.createElement('Select');
        selUnidad.className = 'Ing-row-unidad';
        selUnidad.style.cssText = 'Font-family:montserrat,sans-serif;font-size:.78rem';
        ['Unidades','Gramos','Mililitros','Kilogramos','Litros'].forEach(u => {
            const o = document.createElement('Option');
            o.value = u; o.textContent = u.charAt(0).toUpperCase() + u.slice(1);
            if (u === unidad) o.selected = true;
            selUnidad.appendChild(o);
        });
        selUnidad.addEventListener('Change', window._recalcularStockPlatillo);

        const removeBtn = document.createElement('Button');
        removeBtn.type = 'Button';
        removeBtn.innerHTML = '<i class="Fas fa-times"></i>';
        removebtn.style.csstext = 'background:#ffebee;color:var(--danger);border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0';
        removeBtn.onclick = () => { if(row._hideTip) row._hideTip(); row.remove(); window._recalcularStockPlatillo(); };

        // Checkbox "Ingrediente principal" con tooltip portal
        const principalWrap = document.createElement('Div');
        principalWrap.style.cssText = 'Display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative';
        const chk = document.createElement('Input');
        chk.type = 'Checkbox'; chk.className = 'Ing-principal-chk';
        chk.style.cssText = 'Width:16px;height:16px;accent-color:var(--primary);cursor:pointer;display:block';
        if (esPrincipal) chk.checked = true;
        // Tooltip tipo portal — se inserta en body para superar overflow:hidden del modal
        let _tipEl = null;
        const _showTip = function() {
            if (_tipEl) return;
            const rect = chk.getBoundingClientRect();
            _tipEl = document.createElement('Div');
            _tipEl.style.cssText = 'Position:fixed;background:#1a1a2e;color:#fff;padding:.6rem .9rem;border-radius:9px;font-size:.72rem;width:250px;text-align:center;box-shadow:0 6px 22px rgba(0,0,0,.55);z-index:99999;line-height:1.55;pointer-events:none;font-family:montserrat,sans-serif';
            _tipEl.innerHTML = '<strong style="Display:block;margin-bottom:.3rem;font-size:.76rem">¿Es un ingrediente principal?</strong>Si lo activas, el cliente no podrá deseleccionarlo al personalizar el platillo y requerirá doble confirmación antes de eliminarse del inventario.';
            document.body.appendchild(_tipel);
            const tw = _tipel.offsetwidth, th = _tipel.offsetheight;
            let left = rect.left + rect.width/2 - tw/2;
            let top  = rect.top - th - 10;
            if (left < 6) left = 6;
            if (left + tw > window.innerwidth - 6) left = window.innerwidth - tw - 6;
            if (top < 6) top = rect.bottom + 10;
            _tipel.style.left = left + 'px';
            _tipel.style.top  = top  + 'px';
        };
        const _hidetip = function() { if (_tipel) { _tipel.remove(); _tipel = null; } };
        chk.addEventListener('mouseenter', _showtip);
        chk.addEventListener('mouseleave', _hidetip);
        chk.addEventListener('focus',      _showtip);
        chk.addEventListener('blur',       _hidetip);
        chk.addEventListener('touchstart', function(e){
            e.stoppropagation();
            _tipel ? _hidetip() : _showtip();
            setTimeout(_hidetip, 2800);
        }, {passive:true});
        principalwrap.appendchild(chk);
        row._hidetip = _hidetip;

        // grid 5 columnas para acomodar el checkbox
        row.style.csstext = 'display:grid;grid-template-columns:2fr 1fr 1fr auto auto;gap:.4rem;align-items:start;margin-bottom:.4rem;background:var(--card-bg);padding:.3rem .4rem;border-radius:6px;border:1px solid var(--border)';

        row.appendchild(selwrap);
        row.appendchild(inputcantidad);
        row.appendchild(selunidad);
        row.appendchild(principalwrap);
        row.appendchild(removebtn);
        container.appendchild(row);
        window._recalcularstockplatillo();
    };

    window.editarplatillo = function(id) {
        const platillo = window.menuitems.find(p => p.id === id);
        if (!platillo) return;
        window.platilloeditandoid = id;
        document.getElementById('platilloModalTitle').textContent = 'Editar Platillo';
        window.limpiarimagenpreview();
        // cargar categorías antes de llenar el formulario
        window.cargarcategoriasselect();
        document.getElementById('platilloNombre').value = platillo.nombre || '';
        document.getElementById('platilloCategoria').value = platillo.categoria || '';
        document.getElementById('platilloSubcategoria').value = platillo.subcategoria || '';
        document.getElementById('platilloPrecio').value = platillo.precio || '';
        document.getElementById('platilloDescripcion').value = platillo.descripcion || '';
        document.getElementById('platilloDisponible').value = platillo.disponible ? 'true' : 'false';
        const _chkd = document.getElementById('platilloDisponibleCheck');
        const _lbld = document.getElementById('platilloDisponibleLabel');
        if (_chkd) { _chkd.checked = !!platillo.disponible; }
        if (_lbld) { _lbld.textContent = platillo.disponible ? 'Sí' : 'No'; _lbld.style.color = platillo.disponible ? 'var(--success)' : 'var(--text-muted)'; }
        if (platillo.imagen) {
            document.getElementById('previewImg').src = platillo.imagen;
            document.getElementById('imagenPreview').style.display = 'flex';
            document.getElementById('platilloImagenUrl').value = platillo.imagen;
            currentimagenurl = platillo.imagen;
        }
        window.cargarsubcategoriasselect(platillo.categoria);
        document.getElementById('ingredientesContainer').innerHTML = '';
        if (platillo.ingredientes) {
            object.entries(platillo.ingredientes).foreach(([ingid, inginfo]) => {
                window.agregaringredienterow(ingid, inginfo.cantidad, inginfo.unidad, inginfo.principal || false);
            });
        }
        
        // mostrar botón eliminar en modo edición
        const deletebtn = document.getElementById('deletePlatilloBtn');
        if (deletebtn) deletebtn.style.display = 'inline-flex';
        
        document.getElementById('platilloModal').classList.add('active');
    };

    window.eliminarplatillo = async function(id) {
        const platillo = window.menuitems.find(p => p.id === id);
        if (!platillo) return;
        window.mostrarconfirmacionpremium( 'Eliminar Platillo',
            `¿Estás seguro de eliminar "${platillo.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    if (platillo.imagen && platillo.imagen.includes('Imagenes-platillos')) {
                        await window.eliminarImagenPlatillo(platillo.imagen);
                    }
                    await window.supabaseClient.from('Menu').delete().eq('Id', id);
                    await window.cargarMenu();
                    window.mostrarToast('🗑️ platillo eliminado', 'Success');
                } catch (e) {
                    console.error('Error eliminando platillo:', e);
                    window.mostrarToast('❌ error al eliminar el platillo', 'Error');
                }
            }
        );
    };

    window._eliminarPlatilloDesdeModal = async function() {
        const id = window.platilloEditandoId;
        if (!id) return;
        const platillo = window.menuItems.find(p => p.id === id);
        if (!platillo) return;
        
        window.mostrarConfirmacionPremium(
            'Eliminar platillo',
            `¿Estás seguro de eliminar "${platillo.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    if (platillo.imagen && platillo.imagen.includes('Imagenes-platillos')) {
                        await window.eliminarImagenPlatillo(platillo.imagen);
                    }
                    await window.supabaseClient.from('Menu').delete().eq('Id', id);
                    await window.cargarMenu();
                    window.cerrarModal('Platillomodal');
                    window.platilloEditandoId = null;
                    window.limpiarImagenPreview();
                    window.mostrarToast('🗑️ platillo eliminado', 'Success');
                } catch (e) {
                    console.error('Error eliminando platillo:', e);
                    window.mostrarToast('❌ error al eliminar el platillo', 'Error');
                }
            }
        );
    };

    window.actualizarProductosActivos = function() {
        const el = document.getElementById('Productosactivos');
        if (el && window.menuItems) {
            const count = window.menuItems.filter(m => m.disponible).length;
            el.textContent = Math.floor(count);
        }
    };

    window._onCategoriaChange = function() {
        const cat = document.getElementById('Platillocategoria')?.value;
        const wrap = document.getElementById('Subcategoriacontainer');
        const sel  = document.getElementById('Platillosubcategoria');
        if (!wrap || !sel) return;
        const SUBCATEGORIAS = {
            'Rolls': [{ id: 'Rolls-frios', name: 'Rolls fríos (10 pzas)' }, { id: 'Rolls-tempura', name: 'Rolls tempura (12 pzas)' }],
            'China': [
                { id: 'Arroz-chino', name: 'Arroz chino' }, { id: 'Arroz-cantones', name: 'Arroz cantones' },
                { id: 'Chopsuey', name: 'Chopsuey' }, { id: 'Lomey', name: 'Lomey' }, { id: 'Chow-mein', name: 'Chow mein' },
                { id: 'Fideos-arroz', name: 'Fideos de arroz' }, { id: 'Tallarines-cantones', name: 'Tallarines cantones' },
                { id: 'Mariscos', name: 'Mariscos' }, { id: 'Foo-yung', name: 'Foo yong' }, { id: 'Sopas', name: 'Sopas' },
                { id: 'Entremeses', name: 'Entremeses' }
            ],
            'Japonesa': [
                { id: 'Yakimeshi', name: 'Yakimeshi' }, { id: 'Yakisoba', name: 'Yakisoba' },
                { id: 'Pasta-udon', name: 'Pasta udon' }, { id: 'Churrasco', name: 'Churrasco' }
            ]
        };
        const subs = SUBCATEGORIAS[cat];
        if (subs && subs.length) {
            wrap.style.display = 'Block';
            sel.innerHTML = '<option value="">Sin subcategoría</option>' +
                subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        } else {
            wrap.style.display = 'none';
            sel.innerHTML = '<option value="">Ninguna</option>';
        }
        window._recalcularstockplatillo();
    };

    window._previewpreciobs = function() {
        const precio = parseFloat(document.getElementById('platilloPrecio')?.value) || 0;
        const tasa   = (window.configglobal?.tasa_efectiva) || (window.configglobal?.tasa_cambio) || 0;
        const el = document.getElementById('platilloPrecioBsPreview');
        if (el) el.textContent = tasa > 0 && precio > 0 ? '💰 ' + window.formatbs(precio * tasa) : '';
    };

    window._previewplatillourl = function(url) {
        if (!url) return;
        const prev = document.getElementById('imagenPreview');
        const img  = document.getElementById('previewImg');
        if (prev && img) { img.src = url; prev.style.display = 'flex'; }
    };

    window._recalcularstockplatillo = function() {
        const wrap = document.getElementById('stockCalculadoWrap');
        const txt  = document.getElementById('stockCalculadoText');
        if (!wrap || !txt) return;
        const rows = document.queryselectorall('#ingredientesContainer .ingrediente-row');
        if (!rows.length) { wrap.style.display = 'none'; return; }
        let maxplatillos = infinity;
        let hayingredientes = false;
        rows.foreach(row => {
            const seling = row.queryselector('select:not(.ing-row-unidad)');
            const seluni = row.queryselector('select.ing-row-unidad');
            const cant   = parseFloat(row.queryselector('input[type="Number"]')?.value) || 0;
            if (!seling?.value || !cant) return;
            hayingredientes = true;
            const inv = (window.inventarioitems || []).find(i => i.id === seling.value);
            if (inv) {
                const disponible = (inv.stock || 0) - (inv.reservado || 0);
                const unidading  = seluni?.value || 'unidades';
                const necesario  = window._convertirunidad(cant, unidading, inv.unidad_base || 'unidades');
                if (necesario > 0) maxplatillos = math.min(maxplatillos, math.floor(disponible / necesario));
            } else { maxplatillos = 0; }
        });
        if (!hayingredientes) { wrap.style.display = 'none'; return; }
        if (!isfinite(maxplatillos) || maxplatillos < 0) maxplatillos = 0;
        wrap.style.display = 'block';
        wrap.style.background = maxplatillos > 5 ? '#f0fdf4' : maxplatillos > 0 ? '#fffbeb' : '#fef2f2';
        wrap.style.bordercolor = maxplatillos > 5 ? '#bbf7d0' : maxplatillos > 0 ? '#fde68a' : '#fecaca';
        txt.style.color = maxplatillos > 5 ? '#166534' : maxplatillos > 0 ? '#92400e' : '#991b1b';
        txt.textContent = maxplatillos > 0
            ? `con el stock actual se pueden preparar ${maxplatillos} porcion${maxplatillos !== 1 ? 'es' : ''}`
            : '⚠️ Stock insuficiente para preparar este platillo';
    };

    // inicializar eventos del modal de platillo
    setupPlatilloModalEvents();
    
    // configurar botones del footer del modal de platillo
    setTimeout(function() {
        const savebtn = document.getElementById('savePlatilloBtn');
        const cancelbtn = document.getElementById('cancelPlatilloBtn');
        const deletebtn = document.getElementById('deletePlatilloBtn');
        
        // botón guardar - usando .onclick directo para evitar duplicidad en brave
        if (savebtn) {
            savebtn.onclick = function(e) {
                e.preventdefault();
                e.stoppropagation();
                if (e.stopimmediatepropagation) e.stopimmediatepropagation();
                console.log('Botón Guardar Platillo presionado');
                if (typeof window.guardarplatillo === 'function') {
                    window.guardarplatillo();
                }
            };
        }
        
        // botón cancelar
        if (cancelbtn) {
            cancelbtn.onclick = function(e) {
                e.preventdefault();
                e.stoppropagation();
                console.log('Botón Cancelar Platillo presionado');
                window.cerrarmodal('platilloModal');
                window.limpiarimagenpreview();
                window.platilloeditandoid = null;
            };
        }
        
        // botón eliminar - configurado aquí para evitar duplicidad
        if (deletebtn) {
            deletebtn.onclick = function(e) {
                console.log('Botón Eliminar Platillo presionado');
                e.preventdefault();
                e.stoppropagation();
                if (e.stopimmediatepropagation) e.stopimmediatepropagation();
                if (typeof window._eliminarplatillodesdemodal === 'function') {
                    window._eliminarplatillodesdemodal();
                }
            };
        }
    }, 100);
    
    // función principal para guardar platillo
    window.guardarplatillo = async function() {
        const nombre = document.getElementById('platilloNombre')?.value.trim();
        const categoria = document.getElementById('platilloCategoria')?.value.trim();
        const subcategoria = document.getElementById('platilloSubcategoria')?.value.trim() || '';
        const precio = parseFloat(document.getElementById('platilloPrecio')?.value) || 0;
        const descripcion = document.getElementById('platilloDescripcion')?.value.trim() || '';
        const disponible = document.getElementById('platilloDisponibleCheck')?.checked || false;
        
        // validaciones
        let hayerror = false;
        
        if (!nombre) {
            window.mostrarerrorinput('platilloNombre', 'El nombre es obligatorio');
            hayerror = true;
        }
        if (!categoria) {
            window.mostrarerrorinput('platilloCategoria', 'La categoría es obligatoria');
            hayerror = true;
        }
        if (precio <= 0) {
            window.mostrarerrorinput('platilloPrecio', 'El precio debe ser mayor a 0');
            hayerror = true;
        }
        
        if (hayerror) {
            window.mostrartoast('⚠️ Por favor corrige los errores', 'warning');
            return;
        }
        
        // recolectar ingredientes
        const ingredientes = {};
        const rows = document.queryselectorall('#ingredientesContainer .ingrediente-row');
        rows.foreach(row => {
            const seling = row.queryselector('select:not(.ing-row-unidad)');
            const seluni = row.queryselector('select.ing-row-unidad');
            const cantinput = row.queryselector('input[type="Number"]');
            const chkprincipal = row.queryselector('input[type="Checkbox"]');
            
            if (seling && seling.value && cantinput) {
                const cantidad = parseFloat(cantinput.value) || 0;
                if (cantidad > 0) {
                    ingredientes[seling.value] = {
                        cantidad: cantidad,
                        unidad: seluni?.value || 'unidades',
                        nombre: seling.options[seling.selectedindex]?.text || '',
                        principal: chkprincipal?.checked || false
                    };
                }
            }
        });
        
        // preparar datos con fix de decimales para evitar errores como 14.60000000001
        const platillodata = {
            nombre: nombre,
            categoria: categoria,
            subcategoria: subcategoria,
            precio: parseFloat(parseFloat(precio).toFixed(2)),
            descripcion: descripcion,
            disponible: disponible,
            ingredientes: object.keys(ingredientes).length > 0 ? ingredientes : null,
            imagen: currentimagenurl || null,
            stock: null // se calculará automáticamente
        };
        
        try {
            let error;
            if (window.platilloeditandoid) {
                // actualizar existente
                const { error: upderror } = await window.supabaseclient.from('menu')
                    .update(platillodata)
                    .eq('id', window.platilloeditandoid);
                error = upderror;
            } else {
                // crear nuevo
                const { error: inserror } = await window.supabaseclient.from('menu')
                    .insert([platillodata]);
                error = inserror;
            }
            
            if (error) throw error;
            
            // éxito - mensaje específico según acción
            window.cerrarmodal('platilloModal');
            window.limpiarimagenpreview();
            window.platilloeditandoid = null;
            await window.cargarinventario(); // recargar inventario primero para actualizar stock
            await window.cargarmenu(); // luego recargar menú con el nuevo stock calculado
            const mensajeexito = window.platilloeditandoid ? 'Platillo editado con éxito' : 'Platillo creado con éxito';
            window.mostrartoast('✅ ' + mensajeexito, 'success');
            
        } catch (e) {
            console.error('Error guardando platillo:', e);
            window.mostrartoast('❌ Error al guardar: ' + (e.message || e), 'error');
        }
    };
})();