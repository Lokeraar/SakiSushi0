// admin-inventario.js - ndeingredientes / inventario
(function() {
letcurrentIngredienteImagenFile = null;
letcurrentIngredienteImagenUrl = '';

window.cargarInventario = asyncfunction() {
    try {
        const { data, error } = awaitwindow.supabaseClient.from('inventario').select('*');
        if (error) throwerror;
        window.inventarioItems = data || [];
        constinventarioGrid = document.getElementById('inventarioGrid');
        if (inventarioGrid) window.renderizarInventario();
        window.actualizarAlertasStock();
        awaitwindow.cargarMenu();
        window.actualizarStockCriticoHeader();
        if (typeofwindow.verificarStockCritico === 'function') awaitwindow.verificarStockCritico();
    } catch (e) { 
        console.error('Errorcargandoinventario:', e); 
        if (e.message && !e.message.includes('inventarioGrid')) window.mostrarToast('Errorcargandoinventario', 'error');
    }
};

window.renderizarInventario = function(filtro) {
    constgrid = document.getElementById('inventarioGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const_normI = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
    const_baseI = [...window.inventarioItems].sort((a,b) => a.nombre.localeCompare(b.nombre));
    constitems = filtro
        ? _baseI.filter(i => _normI(i.nombre).includes(_normI(filtro)))
        : _baseI;
    if (!items.length) {
        grid.innerHTML = '<pstyle="color:var(--text-muted);font-size:.85rem;padding:.75rem">' +
            (filtro ? 'Sinresultadospara "' + filtro + '"' : 'Nohayingredientesregistrados.') + '</p>';
        window.actualizarStockCriticoHeader();
        return;
    }
    items.forEach(item => {
        constdisponible = (item.stock||0) - (item.reservado||0);
        constminimo = item.minimo || 0;
        letestado = 'ok';
        if (disponible <= 0) estado = 'agotado';
        elseif (disponible <= minimo) estado = 'critico';
        elseif (disponible <= minimo * 1.5) estado = 'bajo';
        elseestado = 'ok';
        
        constel = document.createElement('div');
        el.className = 'inv-list-item' + (item.id === window._invActiveId ? ' active' : '');
        el.id = 'invItem_' + item.id;
        constimgHtml = item.imagen ? `<imgsrc="${item.imagen}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;margin-right:8px">` : '';
        el.innerHTML = `
            <divstyle="display:flex;align-items:center;flex:1;min-width:0">
               ${imgHtml}
                <spanstyle="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.nombre}</span>
            </div>
            <spanclass="inv-item-badge ${estado}">${disponible.toFixed(3)} ${item.unidad_base||'u'}</span>`;
        el.addEventListener('click', function() {
            constwasActive = item.id === window._invActiveId;
            document.querySelectorAll('.inv-list-item').forEach(e => e.classList.remove('active'));
            document.querySelectorAll('.inv-mobile-detail').forEach(e => e.remove());
            if (wasActive) {
                window._invActiveId = null;
                constcol = document.getElementById('invDetailCol');
                if (col) col.innerHTML = '<divclass="inv-detail-empty"><iclass="fasfa-hand-point-left" style="font-size:2rem;margin-bottom:.75rem;display:block;opacity:.3"></i>Seleccionauningredientedelalistaparaversudetalle</div>';
            } else {
                window._invActiveId = item.id;
                this.classList.add('active');
                window._invMostrarDetalle(item);
            } 
        });
        grid.appendChild(el);
    });
    if (window._invActiveId) {
        constactiveItem = items.find(i => i.id === window._invActiveId);
        if (activeItem) {
            constel = document.getElementById('invItem_' + window._invActiveId);
            if (el) el.classList.add('active');
            window._invMostrarDetalle(activeItem);
        } else {
            window._invActiveId = null;
        }
    }
    window.actualizarStockCriticoHeader();
};

window._invActiveId = null;

window._invMostrarDetalle = function(item) {
    constisMobile   = window.innerWidth <= 768;
    constdisponible = (item.stock||0) - (item.reservado||0);
    constminimo     = item.minimo || 0;
    conststockBase  = Math.max(item.stock || 0, 0.0001);

    // 4estados
    letestado, estadoLabel, estadoColor, estadoGrad;
    if (disponible <= 0) {
        estado='agotado';  estadoLabel='Agotado (= 0)';
        estadoColor='#546e7a'; estadoGrad='linear-gradient(90deg,#37474f,#546e7a)';
    } elseif (disponible <= minimo) {
        estado='critico';  estadoLabel='Crítico (≤ stockm)';
        estadoColor='#e53935'; estadoGrad='linear-gradient(90deg,#e53935,#ef5350)';
    } elseif ((disponible / stockBase) * 100 <= 50) {
        estado='moderado'; estadoLabel='Moderado (≤ 50%)';
        estadoColor='#fb8c00'; estadoGrad='linear-gradient(90deg,#fb8c00,#ffa726)';
    } else {
        estado='optimo';   estadoLabel='Óptimo (> 50%)';
        estadoColor='#43a047'; estadoGrad='linear-gradient(90deg,#43a047,#66bb6a)';
    }

    constpct = Math.min(100, Math.max(0, (disponible / stockBase) * 100));
    // Formatode 3decimaleslimpio
    constfmt = (n) => { 
        consts = parseFloat(n.toPrecision(10)).toFixed(3).replace(/\.?0+$/, ''); 
        returns === 'NaN' ? '0' : s; 
    };

    constimgHtml = item.imagen
        ? `<imgsrc="${item.imagen}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-bottom:.5rem;cursor:pointer" onclick="window.expandirImagen &&window.expandirImagen('${item.imagen.replace(/'/g, "\'")}')">`
        : '';

    // CORRECCIÓN: Barraconcoloralaizquierda, grisaladerecha
    constdetailHTML = `
        <divclass="inv-detail-card" id="invDetailCard_${item.id}">
            <divclass="inv-detail-title">
                <span>${item.nombre}</span>
                <buttonclass="inv-detail-close" onclick="window._invCerrarDetalle('${item.id}')" title="Minimizar">
                    <iclass="fasfa-minus"></i>
                </button>
            </div>
           ${imgHtml}
            <divclass="inv-stock-row" style="margin-bottom:.4rem;display:flex;align-items:baseline;gap:.4rem;flex-wrap:wrap">
                <spanstyle="font-size:2.2rem;font-weight:800;color:${estadoColor};line-height:1">${fmt(disponible)}</span>
                <spanclass="inv-stock-unit" style="font-size:.9rem">${item.unidad_base||'u'}</span>
                <spanstyle="font-size:.7rem;color:var(--text-muted);margin-left:auto;background:var(--secondary);padding:2px 8px;border-radius:20px;white-space:nowrap">
                   Reservado: ${fmt(item.reservado||0)}
                </span>
            </div>
            <!-- Barra: Color (stockactual) alaizquierda, Gris (consumido) aladerecha -->
            <divstyle="height:10px;background:rgba(0,0,0,.08);border-radius:6px;overflow:hidden;margin-bottom:.35rem;position:relative">
                <divstyle="position:absolute;top:0;left:0;height:100%;width:${pct.toFixed(1)}%;background:${estadoGrad};border-radius:6px 0 0 6px;transition:width .55scubic-bezier(.4,0,.2,1)"></div>
                <divstyle="position:absolute;top:0;right:0;height:100%;width:${(100-pct).toFixed(1)}%;background:rgba(0,0,0,.08);border-radius:0 6px 6px 0;transition:width .55scubic-bezier(.4,0,.2,1)"></div>
            </div>
            <divstyle="display:flex;align-items:center;gap:.45rem;margin-bottom:.85rem;font-size:.75rem;font-weight:700;color:${estadoColor}">
                <spanstyle="width:9px;height:9px;border-radius:50%;background:${estadoColor};display:inline-block;flex-shrink:0"></span>
               ${estadoLabel}
                <spanstyle="margin-left:auto;color:var(--text-muted);font-weight:400">${pct.toFixed(0)}% delstock</span>
            </div>
            <divclass="inv-meta-grid" style="grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-bottom:.85rem">
                <divclass="inv-meta-item">
                    <spanclass="inv-meta-label">Stockm</span>
                    <spanclass="inv-meta-val" style="color:${estadoColor}">${fmt(minimo)} ${item.unidad_base||'u'}</span>
                </div>
                <divclass="inv-meta-item">
                    <spanclass="inv-meta-label">Costo (USD/Bs)</span>
                    <spanclass="inv-meta-val">${window.formatUSD(item.precio_costo||0)}</span>
                    <spanclass="inv-meta-bs">${window.formatBs(window.usdToBs(item.precio_costo||0))}</span>
                </div>
                <divclass="inv-meta-item">
                    <spanclass="inv-meta-label">Venta (USD/Bs)</span>
                    <spanclass="inv-meta-val">${window.formatUSD(item.precio_unitario||0)}</span>
                    <spanclass="inv-meta-bs">${window.formatBs(window.usdToBs(item.precio_unitario||0))}</span>
                </div>
            </div>
            <divstyle="display:flex;gap:.5rem;flex-wrap:wrap">
                <buttonclass="btn-iconedit" onclick="window.editarIngrediente('${item.id}')" title="Editaringrediente" style="width:auto;padding:.45rem .9rem;border-radius:8px">
                    <iclass="fasfa-pen"></i> Editar
                </button>
                <buttonclass="btn-icondelete" onclick="window.eliminarIngrediente('${item.id}')" title="Eliminaringrediente" style="width:auto;padding:.45rem .9rem;border-radius:8px">
                    <iclass="fasfa-trash"></i> Eliminar
                </button>
            </div>
        </div>`;

    if (isMobile) {
        constel = document.getElementById('invItem_' + item.id);
        if (!el) return;
        constprev = el.nextElementSibling;
        if (prev && prev.classList.contains('inv-mobile-detail')) prev.remove();
        constwrap = document.createElement('div');
        wrap.className = 'inv-mobile-detail';
        wrap.innerHTML = detailHTML;
        el.insertAdjacentElement('afterend', wrap);
    } else {
        constcol = document.getElementById('invDetailCol');
        if (!col) return;
        col.innerHTML = detailHTML;
    }
};

window._invCerrarDetalle = function(itemId) {
    window._invActiveId = null;
    document.querySelectorAll('.inv-list-item').forEach(el => el.classList.remove('active'));
    constmDet = document.querySelector('.inv-mobile-detail');
    if (mDet) mDet.remove();
    constcol = document.getElementById('invDetailCol');
    if (col) col.innerHTML = '<divclass="inv-detail-empty" id="invDetailEmpty"><iclass="fasfa-hand-point-left" style="font-size:2rem;margin-bottom:.75rem;display:block;opacity:.3"></i>Seleccionauningredientedelalistaparaversudetalle</div>';
};

functionhandleIngredienteImagenFile() {
    constfileInput = document.getElementById('ingredienteImagen');
    consturlInput = document.getElementById('ingredienteImagenUrl');
    constpreviewDiv = document.getElementById('ingredienteImagenPreview');
    constpreviewImg = document.getElementById('ingredientePreviewImg');
    constremoveBtn = document.getElementById('ingredienteImgRemoveBtn');
    
    if (fileInput.files && fileInput.files[0]) {
        constfile = fileInput.files[0];
        currentIngredienteImagenFile = file;
        currentIngredienteImagenUrl = '';
        urlInput.value = ''; 
        urlInput.disabled = true;
        constreader = newFileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewDiv.style.display = 'flex';
            if (removeBtn) removeBtn.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    } else {
        urlInput.disabled = false;
        if (urlInput.value.trim()) {
            previewImg.src = urlInput.value;
            previewDiv.style.display = 'flex';
            if (removeBtn) removeBtn.style.display = 'flex';
            currentIngredienteImagenUrl = urlInput.value;
            currentIngredienteImagenFile = null;
        } else {
            previewDiv.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'none';
            previewImg.src = '';
        }
    }
}

functionhandleIngredienteImagenUrl() {
    consturlInput = document.getElementById('ingredienteImagenUrl');
    constfileInput = document.getElementById('ingredienteImagen');
    constpreviewDiv = document.getElementById('ingredienteImagenPreview');
    constpreviewImg = document.getElementById('ingredientePreviewImg');
    constremoveBtn = document.getElementById('ingredienteImgRemoveBtn');
    
    if (fileInput.files && fileInput.files[0]) return;
    
    consturl = urlInput.value.trim();
    if (url) {
        currentIngredienteImagenUrl = url;
        currentIngredienteImagenFile = null;
         previewImg.src = url;
        previewDiv.style.display = 'flex';
        if (removeBtn) removeBtn.style.display = 'flex';
    } else {
        previewDiv.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'none';
        previewImg.src = '';
        currentIngredienteImagenUrl = '';
    }
}

functionsyncAgregarToCantidadComprada() {
    constagregarInput = document.getElementById('ingredienteAgregar');
    constcantidadComprada = document.getElementById('cantidadComprada');
    if (agregarInput && cantidadComprada) {
        cantidadComprada.value = agregarInput.value;
    }
    window._syncIngredientePreview();
}

window.mostrarModalContraseñaStock = function() {
    constinput = document.getElementById('stockPasswordModalInput');
    consterror = document.getElementById('passwordStockError');
    if (input) input.value = '';
    if (error) error.style.display = 'none';
    constmodal = document.getElementById('passwordStockModal');
    if (modal) {
        modal.classList.add('active');
        setTimeout(() => {
            constinp = document.getElementById('stockPasswordModalInput');
            if (inp) inp.focus();
        }, 100);
    }
};

window.verificarContraseñaStock = asyncfunction() {
    constpwd = document.getElementById('stockPasswordModalInput')?.value;
    consterrorEl = document.getElementById('passwordStockError');
    constbtnConfirm = document.getElementById('confirmPasswordStockBtn');
    
    if (!pwd) {
        if (errorEl) { errorEl.textContent = 'Ingresalacontraseña'; errorEl.style.display = 'block'; }
         return;
    }
    if (btnConfirm) { btnConfirm.disabled = true; btnConfirm.innerHTML = '<iclass="fasfa-spinnerfa-spin"></i> Validando...'; }
    try {
        constuserData = sessionStorage.getItem('admin_user');
        letcurrentAdminUsername = null;
        if (userData) {
            try {
                constuser = JSON.parse(userData);
                currentAdminUsername = user.username;
            } catch (e) {}
        }
        letesValida = false;
        if (window.configGlobal?.admin_password === pwd) esValida = true; 
        if (!esValida && currentAdminUsername) {
            const {  authData } = awaitwindow.supabaseClient.rpc('verify_user_credentials', {
                p_username: currentAdminUsername,
                 p_password: pwd
            });
            if (authData && authData.success === true) esValida = true;
        }
        if (!esValida) {
            const {  adminUsers } = awaitwindow.supabaseClient.from('usuarios').select('username').eq('rol', 'admin');
            if (adminUsers && adminUsers.length) {
                for (constadminofadminUsers) {
                    const { data: authData } = awaitwindow.supabaseClient.rpc('verify_user_credentials', { 
                        p_username: admin.username,
                        p_password: pwd
                    });
                    if (authData && authData.success === true) { esValida = true; break; }
                }
            }
        }
        if (esValida) {
            awaitwindow._desbloquearStock();
        } else {
            if (errorEl) { errorEl.textContent = 'aincorrecta. Intentadenuevo.'; errorEl.style.display = 'block'; }
            document.getElementById('stockPasswordModalInput')?.focus();
        }
    } catch (e) {
        console.error('Error:', e);
        if (errorEl) { errorEl.textContent = 'Erroralvalidarlacontraseña'; errorEl.style.display = 'block'; }
    } finally {
        if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.innerHTML = 'Confirmar'; }
    }
};

window._desbloquearStock = asyncfunction() {
    conststockInput = document.getElementById('ingredienteStock');
    constlockIcon   = document.getElementById('stockLockIcon');
    constclickArea  = document.getElementById('stockClickArea');
    if (stockInput) {
        stockInput.disabled = false;
        stockInput.readOnly = false;
        stockInput.style.cursor = 'text';
        stockInput.style.pointerEvents = 'auto';
        stockInput.onclick = null;
        setTimeout(() => stockInput.focus(), 150);
    }
    if (lockIcon) { lockIcon.innerHTML = '<iclass="fasfa-lock-open" style="font-size:.8rem; color:var(--success)"></i>'; lockIcon.style.cursor = 'default'; }
    if (clickArea) { clickArea.onclick = null; clickArea.style.cursor = 'default'; clickArea.style.borderColor = 'var(--success)'; clickArea.style.backgroundColor = 'rgba(56,142,60,0.1)'; }
    constpwdModal = document.getElementById('passwordStockModal');
    if (pwdModal) {
        pwdModal.classList.remove('active');
        pwdModal.style.display = 'none';
        setTimeout(() => { pwdModal.style.display = ''; }, 60);
    }
    window.mostrarToast('✅ Stockdesbloqueado. Puedeseditarlacantidad.', 'success');
};

window.resetearBloqueoStock = function() {
    if (window.ingredienteEditandoId) {
        conststockInput = document.getElementById('ingredienteStock');
        constlockIcon = document.getElementById('stockLockIcon'); 
        constclickArea = document.getElementById('stockClickArea');
        if (stockInput && !stockInput.disabled) {
            stockInput.disabled = true;
            stockInput.readOnly = true;
            stockInput.style.cursor = 'pointer';
            if (clickArea) {
                clickArea.onclick = function(e) { e.stopPropagation(); window.mostrarModalContraseñaStock(); };
                clickArea.style.cursor = 'pointer';
                 clickArea.style.borderColor = '';
                clickArea.style.backgroundColor = '';
            }
            if (lockIcon) { lockIcon.innerHTML = '<iclass="fasfa-lock" style="font-size:.8rem"></i>'; lockIcon.style.cursor = 'default'; }
        }
    }
};

document.getElementById('saveIngrediente').addEventListener('click', asyncfunction(e) {
    e.preventDefault();
    e.stopPropagation();
    constbtn = this;
    if (btn.disabled) return;
    constesNuevo = !window.ingredienteEditandoId;
    constid = esNuevo ? window.generarId('ing_') : window.ingredienteEditandoId;
    constnombre = document.getElementById('ingredienteNombre').value.trim();
    conststockActual = parseFloat(document.getElementById('ingredienteStock').value) || 0;
    constagregar = parseFloat(document.getElementById('ingredienteAgregar').value) || 0;
    constunidad = document.getElementById('ingredienteUnidad').value;
    constminimo = parseFloat(document.getElementById('ingredienteMinimo').value) || 0;
    constcosto = parseFloat(document.getElementById('ingredienteCosto').value) || 0;
    constventa = parseFloat(document.getElementById('ingredienteVenta').value) || 0;
    
    letimagenUrl = '';
    constarchivoImagen = document.getElementById('ingredienteImagen').files[0];
    constimagenUrlInput = document.getElementById('ingredienteImagenUrl').value;
    if (archivoImagen) {
        constresultado = awaitwindow.subirImagenPlatillo(archivoImagen, 'ingredientes');
        if (resultado.success) imagenUrl = resultado.url;
        else { window.mostrarToast('Erroralsubirlaimagen: ' + resultado.error, 'error'); return; }
    } elseif (imagenUrlInput) imagenUrl = imagenUrlInput;
    
    if (!nombre) { window.mostrarToast('Ingresaelnombredelingrediente', 'error'); return; }
    try {
        btn.disabled = true;
        btn.innerHTML = '<iclass="fasfa-spinnerfa-spin"></i> Guardando...';
        constingrediente = {
            id, nombre,
            stock: stockActual + agregar,
            reservado: 0,
            unidad_base: unidad,
             minimo,
            precio_costo: costo,
            precio_unitario: venta,
            imagen: imagenUrl || null
        };
        leterror;
        if (esNuevo) ({ error } = awaitwindow.supabaseClient.from('inventario').insert([ingrediente]));
        else ({ error } = awaitwindow.supabaseClient.from('inventario').update(ingrediente).eq('id', id));
        if (error) throwerror;
        window.ingredienteEditandoId = null;
        window.cerrarModal('ingredienteModal');
        awaitwindow.cargarInventario();
        window.mostrarToast('✅ Ingredienteguardado', 'success');
    } catch (e) {
        console.error('Errorguardandoingrediente:', e);
        window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Guardar';
    }
});

document.getElementById('cancelIngrediente').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    window.cerrarModal('ingredienteModal');
    window.resetearBloqueoStock();
});
document.getElementById('closeIngredienteModal').addEventListener('click', function() {
    window.cerrarModal('ingredienteModal');
    window.resetearBloqueoStock();
});

window._eliminarIngredienteDesdeModal = asyncfunction() {
    constid = window.ingredienteEditandoId;
    if (!id) return;
    consting = (window.inventarioItems || []).find(i => i.id === id);
    if (!confirm(`¿Eliminarelingrediente "${ing?.nombre || id}"?`)) return;
    try {
        const { error } = awaitwindow.supabaseClient.from('inventario').delete().eq('id', id);
        if (error) throwerror;
        window.cerrarModal('ingredienteModal');
        window.ingredienteEditandoId = null;
        awaitwindow.cargarInventario();
        window.mostrarToast('🗑Ingredienteeliminadoeliminado', 'success');
    } catch(e) {
        console.error('Erroreliminandoingrediente:', e);
        window.mostrarToast('❌ Error: ' + (e.message || e), 'error');
    }
};

window.agregarStock = function(ingredienteId) {
    constingrediente = window.inventarioItems.find(i => i.id === ingredienteId);
    if (ingrediente) { 
        window.editarIngrediente(ingredienteId); 
        setTimeout(() => { 
            constagregarInput = document.getElementById('ingredienteAgregar');
            if (agregarInput) agregarInput.focus();
        }, 500); 
    }
};

window.calcularCostoUnitario = function() {
    constcostoTotal = parseFloat(document.getElementById('costoTotal').value) || 0;
    constcantidad   = parseFloat(document.getElementById('cantidadComprada').value) || 0;
    constresDiv = document.getElementById('calcResultado');
    constresVal = document.getElementById('calcPrecioUnitario');
    constresUni = document.getElementById('calcUnidadResult');
    constunidad = document.getElementById('ingredienteUnidad')?.value || 'unidad';
    if (costoTotal > 0 && cantidad > 0) {
        constunitario = costoTotal / cantidad;
        document.getElementById('ingredienteCosto').value = unitario.toFixed(4);
        if (resDiv) resDiv.style.display = 'block';
        if (resVal) resVal.textContent = unitario.toFixed(4);
        if (resUni) resUni.textContent = ' por ' + unidad;
    } else {
        if (resDiv) resDiv.style.display = 'none';
    }
};

window._syncIngredientePreview = function() {
    conststockActual = parseFloat(document.getElementById('ingredienteStock')?.value) || 0;
    constnuevo        = parseFloat(document.getElementById('ingredienteAgregar')?.value) || 0;
    constunidad      = document.getElementById('ingredienteUnidad')?.value || 'unidades';
    consttotal       = stockActual + nuevo;
    constsp = document.getElementById('stockTotalPreview');
    constsc = document.getElementById('stockConversionPreview');
    if (sp) sp.textContent = nuevo > 0 ? `Stockresultante: ${total.toFixed(3)} ${unidad}` : '';
    if (sc) {
        if (unidad === 'kilogramos' && nuevo > 0) sc.textContent = `= ${(nuevo * 1000).toFixed(0)} gramosadicionales`;
        elseif (unidad === 'litros' && nuevo > 0) sc.textContent = `= ${(nuevo * 1000).toFixed(0)} mililitrosadicionales`;
        elsesc.textContent = '';
    }
};

functionremoveIngredienteImage() {
	constfileInput = document.getElementById('ingredienteImagen');
	consturlInput = document.getElementById('ingredienteImagenUrl');
	constpreviewDiv = document.getElementById('ingredienteImagenPreview');
	constpreviewImg = document.getElementById('ingredientePreviewImg');
	constremoveBtn = document.getElementById('ingredienteImgRemoveBtn');
	if (fileInput) fileInput.value = '';
	if (urlInput) {
		urlInput.value = '';
		urlInput.disabled = false;
	}
	if (previewDiv) previewDiv.style.display = 'none';
	if (removeBtn) removeBtn.style.display = 'none';
	if (previewImg) previewImg.src = '';
	currentIngredienteImagenFile = null;
	currentIngredienteImagenUrl = '';
}

window.abrirModalNuevoIngrediente = function() {
	window.ingredienteEditandoId = null;
	constmodalTitle = document.getElementById('ingredienteModalTitle');
	if (modalTitle) modalTitle.textContent = 'NuevoIngrediente';
	constnombreInput = document.getElementById('ingredienteNombre');
	if (nombreInput) nombreInput.value = '';
	constminimoInput = document.getElementById('ingredienteMinimo');
	if (minimoInput) minimoInput.value = '';
	constcostoInput = document.getElementById('ingredienteCosto');
	if (costoInput) costoInput.value = '';
	constventaInput = document.getElementById('ingredienteVenta');
	 if (ventaInput) ventaInput.value = '';
	constagregarInput = document.getElementById('ingredienteAgregar');
	if (agregarInput) agregarInput.value = '';
	constcantidadComprada = document.getElementById('cantidadComprada');
	if (cantidadComprada) cantidadComprada.value = '';
	constcostoTotal = document.getElementById('costoTotal');
	if (costoTotal) costoTotal.value = '';
	
	removeIngredienteImage();
	
	conststockInput = document.getElementById('ingredienteStock');
	constlockIcon = document.getElementById('stockLockIcon');
	constclickArea = document.getElementById('stockClickArea');
	if (stockInput) {
		stockInput.disabled = false;
		stockInput.readOnly = false;
		stockInput.value = '0';
		stockInput.style.cursor = 'text';
		stockInput.onclick = null;
	}
	if (lockIcon) {
		lockIcon.innerHTML = '<iclass="fasfa-lock-open" style="font-size:.8rem; color:var(--success)"></i>';
		lockIcon.style.cursor = 'default';
	}
	if (clickArea) {
		clickArea.onclick = null;
		clickArea.style.cursor = 'default';
		clickArea.style.borderColor = '';
		clickArea.style.backgroundColor = '';
	}
	constdeleteBtn = document.getElementById('deleteIngredienteBtn');
	if (deleteBtn) deleteBtn.style.display = 'none';
	constmodal = document.getElementById('ingredienteModal');
	if (modal) modal.classList.add('active');
};

window.editarIngrediente = function(id) {
	constingrediente = window.inventarioItems.find(i => i.id === id);
	if (!ingrediente) return;
	window.ingredienteEditandoId = id;
	constmodalTitle = document.getElementById('ingredienteModalTitle');
	if (modalTitle) modalTitle.textContent = 'EditarIngrediente';
	constnombreInput = document.getElementById('ingredienteNombre');
	if (nombreInput) nombreInput.value = ingrediente.nombre || '';
	conststockInput = document.getElementById('ingredienteStock');
	if (stockInput) stockInput.value = ingrediente.stock || 0;
	constunidadSelect = document.getElementById('ingredienteUnidad');
	if (unidadSelect) unidadSelect.value = ingrediente.unidad_base || 'unidades';
	constminimoInput = document.getElementById('ingredienteMinimo');
	if (minimoInput) minimoInput.value = ingrediente.minimo || 0;
	constcostoInput = document.getElementById('ingredienteCosto');
	if (costoInput) costoInput.value = ingrediente.precio_costo || 0;
	constventaInput = document.getElementById('ingredienteVenta');
	if (ventaInput) ventaInput.value = ingrediente.precio_unitario || 0;
	constagregarInput = document.getElementById('ingredienteAgregar');
	if (agregarInput) agregarInput.value = '';
	constcantidadComprada = document.getElementById('cantidadComprada');
	if (cantidadComprada) cantidadComprada.value = '';
	constcostoTotal = document.getElementById('costoTotal');
	if (costoTotal) costoTotal.value = '';
	
	if (ingrediente.imagen) {
		constpreviewDiv = document.getElementById('ingredienteImagenPreview');
		constpreviewImg = document.getElementById('ingredientePreviewImg');
		if (previewImg) previewImg.src = ingrediente.imagen;
		if (previewDiv) previewDiv.style.display = 'flex';
		consturlInput = document.getElementById('ingredienteImagenUrl');
		if (urlInput) urlInput.value = ingrediente.imagen;
		currentIngredienteImagenUrl = ingrediente.imagen;
		constremoveBtn = document.getElementById('ingredienteImgRemoveBtn');
		if (removeBtn) removeBtn.style.display = 'flex';
	} else {
		removeIngredienteImage();
	}
	
	if (stockInput) {
		stockInput.disabled = true;
		stockInput.readOnly = true;
		stockInput.style.cursor = 'pointer';
		stockInput.value = ingrediente.stock || 0;
		stockInput.onclick = null; 
	}
	constlockIcon = document.getElementById('stockLockIcon');
	if (lockIcon) {
		lockIcon.innerHTML = '<iclass="fasfa-lock" style="font-size:.8rem"></i>';
		lockIcon.style.cursor = 'default';
	}
	constclickArea = document.getElementById('stockClickArea');
	if (clickArea) {
		clickArea.onclick = function(e) {
			e.stopPropagation();
			window.mostrarModalContraseñaStock();
		};
		clickArea.style.cursor = 'pointer';
		clickArea.style.borderColor = '';
		clickArea.style.backgroundColor = '';
	} elseif (stockInput) {
		stockInput.onclick = function(e) {
			e.stopPropagation();
			window.mostrarModalContraseñaStock();
		};
	}
	constdeleteBtn = document.getElementById('deleteIngredienteBtn');
	if (deleteBtn) deleteBtn.style.display = 'inline-flex';
	constmodal = document.getElementById('ingredienteModal');
	if (modal) modal.classList.add('active');
};

window.eliminarIngrediente = asyncfunction(id) {
	constingrediente = window.inventarioItems.find(i => i.id === id);
	if (!ingrediente) return;
	window.mostrarConfirmacionPremium(
		'EliminarIngrediente',
		`¿ssegurodeeliminar "${ingrediente.nombre}"? Estaaccinosepuededeshacer.`,
		async () => {
			try {
				awaitwindow.supabaseClient.from('inventario').delete().eq('id', id);
				awaitwindow.cargarInventario();
				window.mostrarToast('🗑Ingredienteeliminadoeliminado', 'success');
			} catch (e) {
				console.error('Erroreliminandoingrediente:', e);
				window.mostrarToast('❌ Erroraleliminaringrediente', 'error');
			}
		}
	);
};

window.actualizarAlertasStock = function() {
    document.getElementById('alertasStock').textContent = window.inventarioItems.filter(i => i.stock <= i.minimo).length;
    constalertCard = document.querySelector('.dashboard-card:nth-child(3)');
    if (alertCard && !alertCard.hasAttribute('data-listener')) {
        alertCard.setAttribute('data-listener', 'true');
        alertCard.style.cursor = 'pointer';
        alertCard.addEventListener('click', () => {
            conststockCriticoDiv = document.getElementById('stockCritico');
            if (stockCriticoDiv) {
                stockCriticoDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                window.resaltarElemento('stockCritico', 'border');
            }
        });
    }
};

window.verificarStockCritico = asyncfunction() {
     conststockCriticoDiv = document.getElementById('stockCritico');
    if (!stockCriticoDiv) return;
    constcriticos = (window.inventarioItems || []).filter(item => {
        constdisponible = (item.stock || 0) - (item.reservado || 0);
        constminimo = item.minimo || 0;
        returndisponible <= minimo && minimo > 0;
    });
    if (criticos.length > 0) {
        stockCriticoDiv.innerHTML = criticos.map(item => {
            constdisponible = (item.stock || 0) - (item.reservado || 0);
            constfaltantes = (item.minimo || 0) - disponible;
            return `
                <divclass="alert-itemcritical">
                    <span>
                        <strong>${item.nombre}</strong><br>
                       Stock: ${disponible.toFixed(3)} / Mínimo: ${item.minimo || 0}
                       ${faltantes > 0 ? `(Faltan ${faltantes.toFixed(3)})` : ''}
                    </span>
                    <buttonclass="btn-small" onclick="window.agregarStock('${item.id}')" style="background:var(--primary);color:#fff;border:none;padding:.3rem .7rem;border-radius:4px;cursor:pointer">
                        <iclass="fasfa-plus"></i> Agregar
                    </button>
                </div>
            `;
        }).join('');
        document.getElementById('alertasStock').textContent = criticos.length;
    } else {
        stockCriticoDiv.innerHTML = '<pstyle="color:var(--text-muted);font-size:.85rem">Nohayalertasdestock</p>';
        document.getElementById('alertasStock').textContent = '0';
    }
};

window.actualizarStockCriticoHeader = function() {
    constcontainer = document.getElementById('stockCriticoTags');
    if (!container) return;
    constcriticos = (window.inventarioItems || []).filter(item => {
        constdisponible = (item.stock || 0) - (item.reservado || 0);
        constminimo = item.minimo || 0;
        returndisponible <= minimo && minimo > 0;
    });
    if (criticos.length === 0) {
        container.innerHTML = '<spanstyle="color:var(--text-muted)">NINGREDIENTEENSTOCKCRÍTICO</span>';
        return;
    }
    container.innerHTML = criticos.map(item => {
        constdisponible = (item.stock || 0) - (item.reservado || 0);
        return `
            <spanclass="stock-critico-tag" 
                 data-ingrediente-id="${item.id}"
                 onclick="window._irAIngrediente('${item.id}')"
                 style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; background:rgba(239,68,68,.25); border-radius:20px; color:var(--danger); font-weight:800; font-size:.75rem; cursor:pointer; animation:pulse 0.8sinfinite; text-transform:uppercase; letter-spacing:.5px"
                 onmouseover="this.style.transform='scale(1.05)'; this.style.background='rgba(239,68,68,.4)'"
                 onmouseout="this.style.transform='scale(1)'; this.style.background='rgba(239,68,68,.25)'" >
                <iclass="fasfa-exclamation-triangle" style="font-size:.7rem"></i>
               ${item.nombre}
                <spanstyle="background:var(--danger); color:#fff; padding:0 5px; border-radius:12px; font-size:.65rem; margin-left:2px">${disponible.toFixed(3)}</span>
            </span>
        `;
    }).join('');
};

window._irAIngrediente = function(ingredienteId) {
    consttabs = document.querySelectorAll('.tab');
    constpanes = document.querySelectorAll('.tab-pane');
    tabs.forEach(tab => tab.classList.remove('active'));
    panes.forEach(pane => pane.classList.remove('active'));
    constinventarioTab = document.querySelector('.tab[data-tab="inventario"]');
    constinventarioPane = document.getElementById('inventarioPane');
    if (inventarioTab) inventarioTab.classList.add('active');
    if (inventarioPane) inventarioPane.classList.add('active');
    setTimeout(() => {
        constitemElement = document.getElementById(`invItem_${ingredienteId}`);
        if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            itemElement.click();
            window.resaltarElemento(`invItem_${ingredienteId}`, 'pulse');
        } else {
            window.renderizarInventario();
             setTimeout(() => {
                constretryElement = document.getElementById(`invItem_${ingredienteId}`);
                if (retryElement) {
                    retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    retryElement.click();
                    window.resaltarElemento(`invItem_${ingredienteId}`, 'pulse');
                 }
            }, 300);
        }
    }, 200);
};

window.setupStockRealtime = function() {
    if (window.stockUpdateChannel) window.supabaseClient.removeChannel(window.stockUpdateChannel);
    window.stockUpdateChannel = window.supabaseClient
        .channel('stock-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventario' }, async (payload) => {
            constindex = window.inventarioItems.findIndex(i => i.id === payload.new.id);
            if (index !== -1) window.inventarioItems[index] = payload.new;
            elsewindow.inventarioItems.push(payload.new);
            awaitwindow.verificarYNotificarStockReactivado(payload.new.id, payload.new.nombre);
            awaitwindow.recalcularStockPlatillos();
            if (payload.new.stock > 0 && payload.old?.stock <= 0) {
                awaitwindow.enviarNotificacionPush('📢 Stockactualizado', `Elingrediente ${payload.new.nombre} awaitwindownuevamente. ¡Revisaelmenú!`);
             }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, async () => { awaitwindow.cargarMenu(); })
        .subscribe();
};

window.verificarYNotificarStockReactivado = asyncfunction(ingredienteId, ingredienteNombre) {
    for (constplatilloofwindow.menuItems) {
        if (!platillo.ingredientes || Object.keys(platillo.ingredientes).length === 0) continue;
        constusaIngrediente = Object.keys(platillo.ingredientes).some(id => id === ingredienteId);
        if (!usaIngrediente) continue;
        letstockDisponible = Infinity;
        for (const [ingId, ingInfo] ofObject.entries(platillo.ingredientes)) {
            constingrediente = window.inventarioItems.find(i => i.id === ingId);
            if (!ingrediente) { stockDisponible = 0; break; }
            conststockDisp = (ingrediente.stock || 0) - (ingrediente.reservado || 0);
             constcantidadNecesaria = ingInfo.cantidad || 1;
            constposible = Math.floor(stockDisp / cantidadNecesaria);
            stockDisponible = Math.min(stockDisponible, posible);
        }
        constestabaAgotado = window.platillosNotificados[platillo.id] === 'agotado';
        constahoraDisponible = stockDisponible > 0;
        if (estabaAgotado && ahoraDisponible) {
            window.platillosNotificados[platillo.id] = 'disponible';
            localStorage.setItem('saki_platillos_notificados', JSON.stringify(window.platillosNotificados));
            consttitulo = `🍣 ${platillo.nombre} disponibledenuevo!`;
            constmensaje = `Yatenemos ${platillo.nombre} enstock. ¡Pideahora!`;
             try {
                const {  pedidosUnicos } = awaitwindow.supabaseClient.from('pedidos').select('session_id').not('session_id', 'is', null).order('fecha', { ascending: false });
                constsessionIds = [...newSet(pedidosUnicos?.map(p => p.session_id) || [])];
                for (constsessionIdofsessionIds) awaitwindow.enviarNotificacionPush(titulo, mensaje, sessionId);
                window.mostrarToast(`📢 nenviada: ${platillo.nombre} disponible`, 'success');
            } catch (e) { console.error('Errorenviandonotificacionesmasivas:', e); }
        } elseif (!ahoraDisponible && !estabaAgotado) {
            window.platillosNotificados[platillo.id] = 'agotado';
            localStorage.setItem('saki_platillos_notificados', JSON.stringify(window.platillosNotificados));
        }
    }
};

window.recalcularStockPlatillos = asyncfunction() {
    for (constplatilloofwindow.menuItems) {
        letstockDisponible = Infinity;
         lettodosIngredientes = true;
        if (platillo.ingredientes && Object.keys(platillo.ingredientes).length > 0) {
            for (const [ingId, ingInfo] ofObject.entries(platillo.ingredientes)) {
                constingrediente = window.inventarioItems.find(i => i.id === ingId);
                if (!ingrediente) { todosIngredientes = false; stockDisponible = 0; break; }
                conststockDisp = (ingrediente.stock || 0) - (ingrediente.reservado || 0);
                constcantidadNecesaria = ingInfo.cantidad || 1;
                constposible = Math.floor(stockDisp / cantidadNecesaria);
                stockDisponible = Math.min(stockDisponible, posible);
            }
        } else {
            stockDisponible = platillo.stock_maximo || 999;
        }
        constnuevoStock = todosIngredientes ? Math.max(0, stockDisponible) : 0;
        if (platillo.stock !== nuevoStock) {
            awaitwindow.supabaseClient.from('menu').update({ stock: nuevoStock }).eq('id', platillo.id);
            platillo.stock = nuevoStock;
        }
    }
    window.renderizarMenu();
};

window.enviarNotificacionPush = asyncfunction(titulo, mensaje, sessionId = null) {
    try {
        constresponse = awaitfetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.jwtToken}` },
            body: JSON.stringify({ titulo, mensaje, session_id: sessionId })
        });
         constresult = awaitresponse.json();
        console.log('Notificacionespushenviadas:', result);
    } catch (e) { console.error('Errorenviandopush:', e); }
};

functionsetupIngredienteModalEvents() {
    constfileInput = document.getElementById('ingredienteImagen');
    consturlInput = document.getElementById('ingredienteImagenUrl');
    constagregarInput = document.getElementById('ingredienteAgregar');
    constcantidadComprada = document.getElementById('cantidadComprada');
    constremoveBtn = document.getElementById('ingredienteImgRemoveBtn');
    
    if (fileInput) fileInput.addEventListener('change', handleIngredienteImagenFile);
    if (urlInput) urlInput.addEventListener('input', handleIngredienteImagenUrl);
    if (removeBtn) removeBtn.addEventListener('click', removeIngredienteImage);
    if (agregarInput) agregarInput.addEventListener('input', syncAgregarToCantidadComprada);
    if (cantidadComprada) cantidadComprada.readOnly = true;
    
    constunidadLabel = document.querySelector('#ingredienteForm .form-group:nth-child(4) label'); // Ajustadondicetrascambio
    if (unidadLabel) {
        unidadLabel.innerHTML = `
            UnidaddeMedida
            <spanclass="tooltip-wrap" style="position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem">
                <spanstyle="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                <spanclass="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:260px; text-align:center; box-shadow:0 4px 12pxrgba(0,0,0,.3); z-index:100; line-height:1.4">
                   ⚠Launidadunidaddemedidaescrítica: "1aguacate" noequivalea 500gramos. ratedeseleccionarlaunidadcorrecta (unidades, kilogramos, litros, etc.) ncorresponda.
                </span>
            </span>
        `;
    }
    
    constminimoLabel = document.querySelector('#ingredienteForm .form-group:nth-child(5) label');
    if (minimoLabel) {
         minimoLabel.innerHTML = `
           StockM
            <spanclass="tooltip-wrap" style="position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem">
                <spanstyle="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                <spanclass="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:250px; text-align:center; box-shadow:0 4px 12pxrgba(0,0,0,.3); z-index:100; line-height:1.4">
                   Alllegaraestacantidad, elestadoAlllegarstockcryseAlllegarlasalertas.
                </span>
            </span>
        `;
    }
    
    constcostoLabel = document.querySelector('#ingredienteForm .form-row .form-group:first-childlabel');
    if (costoLabel) {
        costoLabel.innerHTML = `
           PreciodeCosto (USD/Bs)
            <spanclass="tooltip-wrap" style="position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem">
                <spanstyle="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                <spanclass="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:220px; text-align:center; box-shadow:0 4px 12pxrgba(0,0,0,.3); z-index:100; line-height:1.4">
                   Preciodecadakilogramo / gramo / mililitro / litro / unidad, nlaunidaddemedidaseleccionada.
                </span>
            </span>
        `;
    }
    
    constventaLabel = document.querySelector('#ingredienteForm .form-row .form-group:last-childlabel');
    if (ventaLabel) {
        ventaLabel.innerHTML = `
           PreciodeVenta (USD/Bs)
            <spanclass="tooltip-wrap" style="position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem">
                <spanstyle="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                <spanclass="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:260px; text-align:center; box-shadow:0 4px 12pxrgba(0,0,0,.3); z-index:100; line-height:1.4">
                   Precioalqueselecobraresteingredientealclienteencadaplatilloarmado, porkilogramo / gramo / mililitro / litro / unidad, nlaunidaddemedidaseleccionada.
                </span>
            </span>
        `;
    }
}

setupIngredienteModalEvents();
})();
