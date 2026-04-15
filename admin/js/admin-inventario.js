// admin-inventario.js - Gestión de ingredientes / inventario
(function() {
    let currentIngredienteImagenFile = null;
    let currentIngredienteImagenUrl = '';

    window.cargarInventario = async function() {
        try {
            const { data, error } = await window.supabaseClient.from('inventario').select('*');
            if (error) throw error;
            window.inventarioItems = data || [];
            const inventarioGrid = document.getElementById('inventarioGrid');
            if (inventarioGrid) window.renderizarInventario();
            window.actualizarAlertasStock();
            await window.cargarMenu();
            window.actualizarStockCriticoHeader();
            if (typeof window.verificarStockCritico === 'function') await window.verificarStockCritico();
        } catch (e) { 
            console.error('Error cargando inventario:', e); 
            if (e.message && !e.message.includes('inventarioGrid')) window.mostrarToast('Error cargando inventario', 'error');
        }
    };

    window.renderizarInventario = function(filtro) {
        const grid = document.getElementById('inventarioGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const _normI = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
        const _baseI = [...window.inventarioItems].sort((a,b) => a.nombre.localeCompare(b.nombre));
        const items = filtro
            ? _baseI.filter(i => _normI(i.nombre).includes(_normI(filtro)))
            : _baseI;
        if (!items.length) {
            grid.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:.75rem">' +
                (filtro ? 'Sin resultados para "' + filtro + '"' : 'No hay ingredientes registrados.') + '</p>';
            window.actualizarStockCriticoHeader();
            return;
        }
        items.forEach(item => {
            const disponible = (item.stock||0) - (item.reservado||0);
            const minimo = item.minimo || 0;
            let estado = 'ok';
            if (disponible <= 0) estado = 'agotado';
            else if (disponible <= minimo) estado = 'critico';
            else if (disponible <= minimo * 1.5) estado = 'bajo';
            else estado = 'ok';
            
            const el = document.createElement('div');
            el.className = 'inv-list-item' + (item.id === window._invActiveId ? ' active' : '');
            el.id = 'invItem_' + item.id;
            // Mostrar imagen pequeña si existe
            const imgHtml = item.imagen ? `<img src="${item.imagen}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;margin-right:8px">` : '';
            el.innerHTML = `
                <div style="display:flex;align-items:center;flex:1;min-width:0">
                    ${imgHtml}
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.nombre}</span>
                </div>
                <span class="inv-item-badge ${estado}">${Math.round((disponible + Number.EPSILON) * 1000) / 1000} ${item.unidad_base||'u'}</span>`;
            el.addEventListener('click', function() {
                const wasActive = item.id === window._invActiveId;
                document.querySelectorAll('.inv-list-item').forEach(e => e.classList.remove('active'));
                document.querySelectorAll('.inv-mobile-detail').forEach(e => e.remove());
                if (wasActive) {
                    window._invActiveId = null;
                    const col = document.getElementById('invDetailCol');
                    if (col) col.innerHTML = '<div class="inv-detail-empty"><i class="fas fa-hand-point-left" style="font-size:2rem;margin-bottom:.75rem;display:block;opacity:.3"></i>Selecciona un ingrediente de la lista para ver su detalle</div>';
                } else {
                    window._invActiveId = item.id;
                    this.classList.add('active');
                    window._invMostrarDetalle(item);
                }
            });
            grid.appendChild(el);
        });
        if (window._invActiveId) {
            const activeItem = items.find(i => i.id === window._invActiveId);
            if (activeItem) {
                const el = document.getElementById('invItem_' + window._invActiveId);
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
        const isMobile   = window.innerWidth <= 768;
        const disponible = (item.stock||0) - (item.reservado||0);
        const minimo     = item.minimo || 0;
        const stockBase  = Math.max(item.stock || 0, 0.0001);

        // 4 estados
        let estado, estadoLabel, estadoColor, estadoGrad;
        if (disponible <= 0) {
            estado='agotado';  estadoLabel='Agotado (= 0)';
            estadoColor='#546e7a'; estadoGrad='linear-gradient(90deg,#37474f,#546e7a)';
        } else if (disponible <= minimo) {
            estado='critico';  estadoLabel='Crítico (≤ stock mínimo)';
            estadoColor='#e53935'; estadoGrad='linear-gradient(90deg,#e53935,#ef5350)';
        } else if ((disponible / stockBase) * 100 <= 50) {
            estado='moderado'; estadoLabel='Moderado (≤ 50%)';
            estadoColor='#fb8c00'; estadoGrad='linear-gradient(90deg,#fb8c00,#ffa726)';
        } else {
            estado='optimo';   estadoLabel='Óptimo (> 50%)';
            estadoColor='#43a047'; estadoGrad='linear-gradient(90deg,#43a047,#66bb6a)';
        }

        const pct = Math.min(100, Math.max(0, (disponible / stockBase) * 100));
        // Decimales limpios: hasta milésimas (3 decimales) sin ceros extra
        const fmt = (n) => { 
            const num = parseFloat(n.toPrecision(10));
            if (isNaN(num)) return '0';
            // Mostrar hasta 3 decimales si es necesario
            const s = num.toFixed(3);
            // Eliminar ceros innecesarios después del punto decimal
            return parseFloat(s).toString();
        };

        const imgHtml = item.imagen
            ? `<img src="${item.imagen}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-bottom:.5rem;cursor:pointer" onclick="window.expandirImagen&&window.expandirImagen('${item.imagen.replace(/'/g,"\'")}')">`
            : '';

        const detailHTML = `
            <div class="inv-detail-card" id="invDetailCard_${item.id}">
                <div class="inv-detail-title">
                    <span>${item.nombre}</span>
                    <button class="inv-detail-close" onclick="window._invCerrarDetalle('${item.id}')" title="Minimizar">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
                ${imgHtml}
                <div class="inv-stock-row" style="margin-bottom:.4rem;display:flex;align-items:baseline;gap:.4rem;flex-wrap:wrap">
                    <span style="font-size:2.2rem;font-weight:800;color:${estadoColor};line-height:1">${fmt(disponible)}</span>
                    <span class="inv-stock-unit" style="font-size:.9rem">${item.unidad_base||'u'}</span>
                    <span style="font-size:.7rem;color:var(--text-muted);margin-left:auto;background:var(--secondary);padding:2px 8px;border-radius:20px;white-space:nowrap">
                        Reservado: ${fmt(item.reservado||0)}
                    </span>
                </div>
                <!-- Barra invertida: stock restante a la izquierda (color), consumido a la derecha (gris) -->
                <div style="height:10px;background:rgba(0,0,0,.08);border-radius:6px;overflow:hidden;margin-bottom:.35rem;position:relative">
                    <div style="position:absolute;top:0;right:0;height:100%;width:${(100-pct).toFixed(1)}%;background:rgba(0,0,0,.15);border-radius:0 6px 6px 0;"></div>
                    <div style="position:absolute;top:0;left:0;height:100%;width:${pct.toFixed(1)}%;background:${estadoGrad};border-radius:6px 0 0 6px;transition:width .55s cubic-bezier(.4,0,.2,1)"></div>
                </div>
                <div style="display:flex;align-items:center;gap:.45rem;margin-bottom:.85rem;font-size:.75rem;font-weight:700;color:${estadoColor}">
                    <span style="width:9px;height:9px;border-radius:50%;background:${estadoColor};display:inline-block;flex-shrink:0"></span>
                    ${estadoLabel}
                    <span style="margin-left:auto;color:var(--text-muted);font-weight:400">${pct.toFixed(0)}% del stock</span>
                </div>
                <div class="inv-meta-grid" style="grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-bottom:.85rem">
                    <div class="inv-meta-item">
                        <span class="inv-meta-label">Stock mínimo</span>
                        <span class="inv-meta-val" style="color:${estadoColor}">${fmt(minimo)} ${item.unidad_base||'u'}</span>
                    </div>
                    <div class="inv-meta-item">
                        <span class="inv-meta-label">Costo (USD/Bs)</span>
                        <span class="inv-meta-val">${window.formatUSD(item.precio_costo||0)}</span>
                        <span class="inv-meta-bs">${window.formatBs(window.usdToBs(item.precio_costo||0))}</span>
                    </div>
                    <div class="inv-meta-item">
                        <span class="inv-meta-label">Venta (USD/Bs)</span>
                        <span class="inv-meta-val">${window.formatUSD(item.precio_unitario||0)}</span>
                        <span class="inv-meta-bs">${window.formatBs(window.usdToBs(item.precio_unitario||0))}</span>
                    </div>
                </div>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                    <button class="btn-icon edit" onclick="window.editarIngrediente('${item.id}')" title="Editar ingrediente" style="width:auto;padding:.45rem .9rem;border-radius:8px">
                        <i class="fas fa-pen"></i> Editar
                    </button>
                    <button class="btn-icon delete" onclick="window.eliminarIngrediente('${item.id}')" title="Eliminar ingrediente" style="width:auto;padding:.45rem .9rem;border-radius:8px">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>`;

        if (isMobile) {
            const el = document.getElementById('invItem_' + item.id);
            if (!el) return;
            const prev = el.nextElementSibling;
            if (prev && prev.classList.contains('inv-mobile-detail')) prev.remove();
            const wrap = document.createElement('div');
            wrap.className = 'inv-mobile-detail';
            wrap.innerHTML = detailHTML;
            el.insertAdjacentElement('afterend', wrap);
        } else {
            const col = document.getElementById('invDetailCol');
            if (!col) return;
            col.innerHTML = detailHTML;
        }
    };

    window._invCerrarDetalle = function(itemId) {
        window._invActiveId = null;
        document.querySelectorAll('.inv-list-item').forEach(el => el.classList.remove('active'));
        const mDet = document.querySelector('.inv-mobile-detail');
        if (mDet) mDet.remove();
        const col = document.getElementById('invDetailCol');
        if (col) col.innerHTML = '<div class="inv-detail-empty" id="invDetailEmpty"><i class="fas fa-hand-point-left" style="font-size:2rem;margin-bottom:.75rem;display:block;opacity:.3"></i>Selecciona un ingrediente de la lista para ver su detalle</div>';
    };

    // Funciones para imagen de ingrediente
    function handleIngredienteImagenFile() {
        const fileInput = document.getElementById('ingredienteImagen');
        const urlInput = document.getElementById('ingredienteImagenUrl');
        const previewDiv = document.getElementById('ingredienteImagenPreview');
        const previewImg = document.getElementById('ingredientePreviewImg');
        const removeBtn = document.getElementById('ingredienteImgRemoveBtn');
        
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            currentIngredienteImagenFile = file;
            currentIngredienteImagenUrl = '';
            urlInput.value = '';
            urlInput.disabled = true;
            const reader = new FileReader();
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

    function handleIngredienteImagenUrl() {
        const urlInput = document.getElementById('ingredienteImagenUrl');
        const fileInput = document.getElementById('ingredienteImagen');
        const previewDiv = document.getElementById('ingredienteImagenPreview');
        const previewImg = document.getElementById('ingredientePreviewImg');
        const removeBtn = document.getElementById('ingredienteImgRemoveBtn');
        
        if (fileInput.files && fileInput.files[0]) return;
        
        const url = urlInput.value.trim();
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


    // Sincronizar Mercancía Nueva con Cantidad Comprada
    function syncAgregarToCantidadComprada() {
        const agregarInput = document.getElementById('ingredienteAgregar');
        const cantidadComprada = document.getElementById('cantidadComprada');
        if (agregarInput && cantidadComprada) {
            cantidadComprada.value = agregarInput.value;
        }
        window._syncIngredientePreview();
    }


    window.agregarStock = function(ingredienteId) {
        const ingrediente = window.inventarioItems.find(i => i.id === ingredienteId);
        if (ingrediente) { 
            window.editarIngrediente(ingredienteId); 
            setTimeout(() => { 
                const agregarInput = document.getElementById('ingredienteAgregar');
                if (agregarInput) agregarInput.focus();
            }, 500); 
        }
    };

    window.calcularCostoUnitario = function() {
        const costoTotal = parseFloat(document.getElementById('costoTotal').value) || 0;
        const cantidad   = parseFloat(document.getElementById('cantidadComprada').value) || 0;
        const resDiv = document.getElementById('calcResultado');
        const resVal = document.getElementById('calcPrecioUnitario');
        const resUni = document.getElementById('calcUnidadResult');
        const unidad = document.getElementById('ingredienteUnidad')?.value || 'unidad';
        if (costoTotal > 0 && cantidad > 0) {
            const unitario = costoTotal / cantidad;
            document.getElementById('ingredienteCosto').value = unitario.toFixed(4);
            if (resDiv) resDiv.style.display = 'block';
            if (resVal) resVal.textContent = unitario.toFixed(4);
            if (resUni) resUni.textContent = ' por ' + unidad;
        } else {
            if (resDiv) resDiv.style.display = 'none';
        }
    };

    window._syncIngredientePreview = function() {
        const stockActualEl = document.getElementById('ingredienteStock');
        const stockActual = parseFloat(stockActualEl?.value) || 0;
        const nuevo       = parseFloat(document.getElementById('ingredienteAgregar')?.value) || 0;
        const unidad      = document.getElementById('ingredienteUnidad')?.value || 'unidades';
        const total = stockActual + nuevo;
        const sp = document.getElementById('stockTotalPreview');
        const sc = document.getElementById('stockConversionPreview');
        if (sp) sp.textContent = (nuevo > 0 || stockActualEl) ? `Stock resultante: ${total.toFixed(3)} ${unidad}` : '';
        if (sc) {
            if (unidad === 'kilogramos' && nuevo > 0) sc.textContent = `= ${(nuevo * 1000).toFixed(0)} g adicionales`;
            else if (unidad === 'litros' && nuevo > 0) sc.textContent = `= ${(nuevo * 1000).toFixed(0)} ml adicionales`;
            else sc.textContent = '';
        }
    };

    function removeIngredienteImage() {
		const fileInput = document.getElementById('ingredienteImagen');
		const urlInput = document.getElementById('ingredienteImagenUrl');
		const previewDiv = document.getElementById('ingredienteImagenPreview');
		const previewImg = document.getElementById('ingredientePreviewImg');
		const removeBtn = document.getElementById('ingredienteImgRemoveBtn');
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
		const modalTitle = document.getElementById('ingredienteModalTitle');
		if (modalTitle) modalTitle.textContent = 'Nuevo Ingrediente';
		const nombreInput = document.getElementById('ingredienteNombre');
		if (nombreInput) nombreInput.value = '';
		const minimoInput = document.getElementById('ingredienteMinimo');
		if (minimoInput) minimoInput.value = '';
		const costoInput = document.getElementById('ingredienteCosto');
		if (costoInput) costoInput.value = '';
		const ventaInput = document.getElementById('ingredienteVenta');
		if (ventaInput) ventaInput.value = '';
		const agregarInput = document.getElementById('ingredienteAgregar');
		if (agregarInput) agregarInput.value = '';
		const cantidadComprada = document.getElementById('cantidadComprada');
		if (cantidadComprada) cantidadComprada.value = '';
		const costoTotal = document.getElementById('costoTotal');
		if (costoTotal) costoTotal.value = '';
		
		removeIngredienteImage();
		
		const deleteBtn = document.getElementById('deleteIngredienteBtn');
		if (deleteBtn) deleteBtn.style.display = 'none';
		const modal = document.getElementById('ingredienteModal');
		if (modal) modal.classList.add('active');
	};

	window.editarIngrediente = function(id) {
		const ingrediente = window.inventarioItems.find(i => i.id === id);
		if (!ingrediente) return;
		window.ingredienteEditandoId = id;
		const modalTitle = document.getElementById('ingredienteModalTitle');
		if (modalTitle) modalTitle.textContent = 'Editar Ingrediente';
		const nombreInput = document.getElementById('ingredienteNombre');
		if (nombreInput) nombreInput.value = ingrediente.nombre || '';
		// Asignar stock actual al input bloqueado
		const stockInput = document.getElementById('ingredienteStock');
		if (stockInput) {
			stockInput.value = (ingrediente.stock || 0).toFixed(2);
			stockInput.setAttribute('readonly', '');
			stockInput.style.background = 'rgba(0,0,0,.08)';
			stockInput.style.cursor = 'not-allowed';
		}
		const lockIcon = document.getElementById('stockLockIcon');
		if (lockIcon) lockIcon.innerHTML = '<i class="fas fa-lock" style="font-size:.9rem; color:var(--text-muted)"></i>';
		const unidadSelect = document.getElementById('ingredienteUnidad');
		if (unidadSelect) unidadSelect.value = ingrediente.unidad_base || 'unidades';
		const minimoInput = document.getElementById('ingredienteMinimo');
		if (minimoInput) minimoInput.value = ingrediente.minimo || 0;
		const costoInput = document.getElementById('ingredienteCosto');
		if (costoInput) costoInput.value = ingrediente.precio_costo || 0;
		const ventaInput = document.getElementById('ingredienteVenta');
		if (ventaInput) ventaInput.value = ingrediente.precio_unitario || 0;
		const agregarInput = document.getElementById('ingredienteAgregar');
		if (agregarInput) agregarInput.value = '';
		const cantidadComprada = document.getElementById('cantidadComprada');
		if (cantidadComprada) cantidadComprada.value = '';
		const costoTotal = document.getElementById('costoTotal');
		if (costoTotal) costoTotal.value = '';
		
		if (ingrediente.imagen) {
			const previewDiv = document.getElementById('ingredienteImagenPreview');
			const previewImg = document.getElementById('ingredientePreviewImg');
			if (previewImg) previewImg.src = ingrediente.imagen;
			if (previewDiv) previewDiv.style.display = 'flex';
			const urlInput = document.getElementById('ingredienteImagenUrl');
			if (urlInput) urlInput.value = ingrediente.imagen;
			currentIngredienteImagenUrl = ingrediente.imagen;
			const removeBtn = document.getElementById('ingredienteImgRemoveBtn');
			if (removeBtn) removeBtn.style.display = 'flex';
		} else {
			removeIngredienteImage();
		}
		
		const deleteBtn = document.getElementById('deleteIngredienteBtn');
		if (deleteBtn) deleteBtn.style.display = 'inline-flex';
		const modal = document.getElementById('ingredienteModal');
		if (modal) modal.classList.add('active');
	};

	// Reemplazar eliminarIngrediente para usar confirmación premium
	window.eliminarIngrediente = async function(id) {
		const ingrediente = window.inventarioItems.find(i => i.id === id);
		if (!ingrediente) return;
		window.mostrarConfirmacionPremium(
			'Eliminar Ingrediente',
			`¿Estás seguro de eliminar "${ingrediente.nombre}"? Esta acción no se puede deshacer.`,
			async () => {
				try {
					await window.supabaseClient.from('inventario').delete().eq('id', id);
					await window.cargarInventario();
					window.mostrarToast('🗑️ Ingrediente eliminado', 'success');
				} catch (e) {
					console.error('Error eliminando ingrediente:', e);
					window.mostrarToast('❌ Error al eliminar ingrediente', 'error');
				}
			}
		);
	};

    window.actualizarAlertasStock = function() {
        document.getElementById('alertasStock').textContent = window.inventarioItems.filter(i => i.stock <= i.minimo).length;
        // Hacer clic en la tarjeta redirige a stock crítico
        const alertCard = document.querySelector('.dashboard-card:nth-child(3)');
        if (alertCard && !alertCard.hasAttribute('data-listener')) {
            alertCard.setAttribute('data-listener', 'true');
            alertCard.style.cursor = 'pointer';
            alertCard.addEventListener('click', () => {
                const stockCriticoDiv = document.getElementById('stockCritico');
                if (stockCriticoDiv) {
                    stockCriticoDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    window.resaltarElemento('stockCritico', 'border');
                }
            });
        }
    };

    window.verificarStockCritico = async function() {
        const stockCriticoDiv = document.getElementById('stockCritico');
        if (!stockCriticoDiv) return;
        const criticos = (window.inventarioItems || []).filter(item => {
            const disponible = (item.stock || 0) - (item.reservado || 0);
            const minimo = item.minimo || 0;
            return disponible <= minimo && minimo > 0;
        });
        if (criticos.length > 0) {
            stockCriticoDiv.innerHTML = criticos.map(item => {
                const disponible = (item.stock || 0) - (item.reservado || 0);
                const faltantes = Math.round(((item.minimo || 0) - disponible + Number.EPSILON) * 1000) / 1000;
                return `
                    <div class="alert-item critical">
                        <span>
                            <strong>${item.nombre}</strong><br>
                            Stock: ${Math.round((disponible + Number.EPSILON) * 1000) / 1000} / Mínimo: ${item.minimo || 0}
                            ${faltantes > 0 ? `(Faltan ${faltantes})` : ''}
                        </span>
                        <button class="btn-small" onclick="window.agregarStock('${item.id}')" style="background:var(--primary);color:#fff;border:none;padding:.3rem .7rem;border-radius:4px;cursor:pointer">
                            <i class="fas fa-plus"></i> Agregar
                        </button>
                    </div>
                `;
            }).join('');
            document.getElementById('alertasStock').textContent = criticos.length;
        } else {
            stockCriticoDiv.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">No hay alertas de stock</p>';
            document.getElementById('alertasStock').textContent = '0';
        }
    };

    window.actualizarStockCriticoHeader = function() {
        const container = document.getElementById('stockCriticoTags');
        if (!container) return;
        const criticos = (window.inventarioItems || []).filter(item => {
            const disponible = (item.stock || 0) - (item.reservado || 0);
            const minimo = item.minimo || 0;
            return disponible <= minimo && minimo > 0;
        });
        if (criticos.length === 0) {
            container.innerHTML = '<span style="color:var(--text-muted)">NINGÚN INGREDIENTE EN STOCK CRÍTICO</span>';
            return;
        }
        container.innerHTML = criticos.map(item => {
            const disponible = (item.stock || 0) - (item.reservado || 0);
            return `
                <span class="stock-critico-tag" 
                      data-ingrediente-id="${item.id}"
                      onclick="window._irAIngrediente('${item.id}')"
                      style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; background:rgba(239,68,68,.25); border-radius:20px; color:var(--danger); font-weight:800; font-size:.75rem; cursor:pointer; animation:pulse 0.8s infinite; text-transform:uppercase; letter-spacing:.5px"
                      onmouseover="this.style.transform='scale(1.05)'; this.style.background='rgba(239,68,68,.4)'"
                      onmouseout="this.style.transform='scale(1)'; this.style.background='rgba(239,68,68,.25)'">
                    <i class="fas fa-exclamation-triangle" style="font-size:.7rem"></i>
                    ${item.nombre}
                    <span style="background:var(--danger); color:#fff; padding:0 5px; border-radius:12px; font-size:.65rem; margin-left:2px">${Math.round((disponible + Number.EPSILON) * 1000) / 1000}</span>
                </span>
            `;
        }).join('');
    };

    window._irAIngrediente = function(ingredienteId) {
        const tabs = document.querySelectorAll('.tab');
        const panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(tab => tab.classList.remove('active'));
        panes.forEach(pane => pane.classList.remove('active'));
        const inventarioTab = document.querySelector('.tab[data-tab="inventario"]');
        const inventarioPane = document.getElementById('inventarioPane');
        if (inventarioTab) inventarioTab.classList.add('active');
        if (inventarioPane) inventarioPane.classList.add('active');
        setTimeout(() => {
            const itemElement = document.getElementById(`invItem_${ingredienteId}`);
            if (itemElement) {
                itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                itemElement.click();
                window.resaltarElemento(`invItem_${ingredienteId}`, 'pulse');
            } else {
                window.renderizarInventario();
                setTimeout(() => {
                    const retryElement = document.getElementById(`invItem_${ingredienteId}`);
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
                const index = window.inventarioItems.findIndex(i => i.id === payload.new.id);
                if (index !== -1) window.inventarioItems[index] = payload.new;
                else window.inventarioItems.push(payload.new);
                await window.verificarYNotificarStockReactivado(payload.new.id, payload.new.nombre);
                await window.recalcularStockPlatillos();
                if (payload.new.stock > 0 && payload.old?.stock <= 0) {
                    await window.enviarNotificacionPush('📢 Stock actualizado', `El ingrediente ${payload.new.nombre} está disponible nuevamente. ¡Revisa el menú!`);
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, async () => { await window.cargarMenu(); })
            .subscribe();
    };

    window.verificarYNotificarStockReactivado = async function(ingredienteId, ingredienteNombre) {
        for (const platillo of window.menuItems) {
            if (!platillo.ingredientes || Object.keys(platillo.ingredientes).length === 0) continue;
            const usaIngrediente = Object.keys(platillo.ingredientes).some(id => id === ingredienteId);
            if (!usaIngrediente) continue;
            let stockDisponible = Infinity;
            for (const [ingId, ingInfo] of Object.entries(platillo.ingredientes)) {
                const ingrediente = window.inventarioItems.find(i => i.id === ingId);
                if (!ingrediente) { stockDisponible = 0; break; }
                const stockDisp = (ingrediente.stock || 0) - (ingrediente.reservado || 0);
                const cantidadNecesaria = ingInfo.cantidad || 1;
                const posible = Math.floor(stockDisp / cantidadNecesaria);
                stockDisponible = Math.min(stockDisponible, posible);
            }
            const estabaAgotado = window.platillosNotificados[platillo.id] === 'agotado';
            const ahoraDisponible = stockDisponible > 0;
            if (estabaAgotado && ahoraDisponible) {
                window.platillosNotificados[platillo.id] = 'disponible';
                localStorage.setItem('saki_platillos_notificados', JSON.stringify(window.platillosNotificados));
                const titulo = `🍣 ${platillo.nombre} disponible de nuevo!`;
                const mensaje = `Ya tenemos ${platillo.nombre} en stock. ¡Pide ahora!`;
                try {
                    const { data: pedidosUnicos } = await window.supabaseClient.from('pedidos').select('session_id').not('session_id', 'is', null).order('fecha', { ascending: false });
                    const sessionIds = [...new Set(pedidosUnicos?.map(p => p.session_id) || [])];
                    for (const sessionId of sessionIds) await window.enviarNotificacionPush(titulo, mensaje, sessionId);
                    window.mostrarToast(`📢 Notificación enviada: ${platillo.nombre} disponible`, 'success');
                } catch (e) { console.error('Error enviando notificaciones masivas:', e); }
            } else if (!ahoraDisponible && !estabaAgotado) {
                window.platillosNotificados[platillo.id] = 'agotado';
                localStorage.setItem('saki_platillos_notificados', JSON.stringify(window.platillosNotificados));
            }
        }
    };

    window.recalcularStockPlatillos = async function() {
        for (const platillo of window.menuItems) {
            let stockDisponible = Infinity;
            let todosIngredientes = true;
            if (platillo.ingredientes && Object.keys(platillo.ingredientes).length > 0) {
                for (const [ingId, ingInfo] of Object.entries(platillo.ingredientes)) {
                    const ingrediente = window.inventarioItems.find(i => i.id === ingId);
                    if (!ingrediente) { todosIngredientes = false; stockDisponible = 0; break; }
                    const stockDisp = (ingrediente.stock || 0) - (ingrediente.reservado || 0);
                    const cantidadNecesaria = ingInfo.cantidad || 1;
                    const posible = Math.floor(stockDisp / cantidadNecesaria);
                    stockDisponible = Math.min(stockDisponible, posible);
                }
            } else {
                stockDisponible = platillo.stock_maximo || 999;
            }
            const nuevoStock = todosIngredientes ? Math.max(0, stockDisponible) : 0;
            if (platillo.stock !== nuevoStock) {
                await window.supabaseClient.from('menu').update({ stock: nuevoStock }).eq('id', platillo.id);
                platillo.stock = nuevoStock;
            }
        }
        window.renderizarMenu();
    };

    window.enviarNotificacionPush = async function(titulo, mensaje, sessionId = null) {
        try {
            const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/send-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.jwtToken}` },
                body: JSON.stringify({ titulo, mensaje, session_id: sessionId })
            });
            const result = await response.json();
            console.log('Notificaciones push enviadas:', result);
        } catch (e) { console.error('Error enviando push:', e); }
    };

    // Configurar eventos del modal de ingrediente (imagen, tooltips, sincronización)
    function setupIngredienteModalEvents() {
        const fileInput = document.getElementById('ingredienteImagen');
        const urlInput = document.getElementById('ingredienteImagenUrl');
        const agregarInput = document.getElementById('ingredienteAgregar');
        const cantidadComprada = document.getElementById('cantidadComprada');
        const removeBtn = document.getElementById('ingredienteImgRemoveBtn');
        
        if (fileInput) fileInput.addEventListener('change', handleIngredienteImagenFile);
        if (urlInput) urlInput.addEventListener('input', handleIngredienteImagenUrl);
        if (removeBtn) removeBtn.addEventListener('click', removeIngredienteImage);
        if (agregarInput) agregarInput.addEventListener('input', syncAgregarToCantidadComprada);
        if (cantidadComprada) cantidadComprada.readOnly = true;
        
        // Evento para desbloquear Stock Actual con contraseña
        const stockClickArea = document.getElementById('stockClickArea');
        const lockIcon = document.getElementById('stockLockIcon');
        if (stockClickArea && lockIcon) {
            stockClickArea.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                const stockInput = document.getElementById('ingredienteStock');
                if (!stockInput) return;
                
                // Si ya está desbloqueado, no hacer nada
                if (!stockInput.hasAttribute('readonly')) return;
                
                // Solicitar contraseña usando SweetAlert2 si está disponible
                let password = null;
                if (window.Swal) {
                    const result = await window.Swal.fire({
                        title: 'Verificación de Seguridad',
                        html: '<p style="margin-bottom:.5rem;color:var(--text-muted)">Ingresa tu contraseña para editar el stock</p>' +
                              '<input type="password" id="swalPasswordInput" class="swal2-input" placeholder="Contraseña" style="width:100%;padding:.5rem;border-radius:6px;border:1px solid var(--border);font-size:.9rem">',
                        showCancelButton: true,
                        confirmButtonText: 'Desbloquear',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: 'var(--primary)',
                        cancelButtonColor: 'var(--text-muted)',
                        allowOutsideClick: false,
                        didOpen: () => {
                            document.getElementById('swalPasswordInput').focus();
                        }
                    });
                    if (result.isConfirmed) {
                        password = document.getElementById('swalPasswordInput').value;
                    }
                } else {
                    password = prompt('Ingresa tu contraseña para desbloquear el campo de stock:');
                }
                
                if (!password) return;
                
                // Validar contraseña contra Supabase
                try {
                    const userData = sessionStorage.getItem('admin_user');
                    if (!userData) {
                        throw new Error('No hay sesión activa');
                    }
                    const user = JSON.parse(userData);
                    
                    // Usar la función de login para verificar contraseña
                    const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: user.username, password: password })
                    });
                    const data = await response.json();
                    
                    if (response.ok && data.success) {
                        // Contraseña correcta - desbloquear
                        stockInput.removeAttribute('readonly');
                        stockInput.style.background = '#fff';
                        stockInput.style.cursor = 'text';
                        lockIcon.innerHTML = '<i class="fas fa-lock-open" style="font-size:.9rem; color:var(--success)"></i>';
                        
                        if (window.Swal) {
                            window.Swal.fire({
                                icon: 'success',
                                title: 'Acceso concedido',
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 2000
                            });
                        } else {
                            alert('Acceso concedido');
                        }
                    } else {
                        // Contraseña incorrecta
                        if (window.Swal) {
                            window.Swal.fire({
                                icon: 'error',
                                title: 'Acceso denegado',
                                text: 'Contraseña incorrecta',
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 2000
                            });
                        } else {
                            alert('Contraseña incorrecta. Acceso denegado');
                        }
                    }
                } catch (e) {
                    console.error('Error validando contraseña:', e);
                    if (window.Swal) {
                        window.Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'No se pudo validar la contraseña',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000
                        });
                    } else {
                        alert('Error al validar contraseña');
                    }
                }
            });
        }
        
        // Tooltip para Unidad de Medida (ahora es el label de Nombre del ingrediente - form-group:nth-child(2))
        const unidadLabel = document.querySelector('#ingredienteForm .form-group:nth-child(2) label');
        if (unidadLabel) {
            unidadLabel.innerHTML = `
                Nombre del ingrediente
                <span class="tooltip-wrap" style="position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem">
                    <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                    <span class="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:260px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,.3); z-index:100; line-height:1.4">
                        ⚠️ La unidad de medida es crítica: "1 aguacate" no equivale a 500 gramos. Asegúrate de seleccionar la unidad correcta (unidades, kilogramos, litros, etc.) según corresponda.
                    </span>
                </span>
            `;
        }
        
        // Tooltip para Precio de Costo
        const costoLabel = document.querySelector('#ingredienteForm .form-row .form-group:first-child label');
        if (costoLabel) {
            costoLabel.innerHTML = `
                Precio de Costo (USD/Bs)
                <span class="tooltip-wrap" style="position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem">
                    <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                    <span class="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:220px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,.3); z-index:100; line-height:1.4">
                        Precio de cada kilogramo / gramo / mililitro / litro / unidad, según la unidad de medida seleccionada.
                    </span>
                </span>
            `;
        }
        
        // Tooltip para Precio de Venta
        const ventaLabel = document.querySelector('#ingredienteForm .form-row .form-group:last-child label');
        if (ventaLabel) {
            ventaLabel.innerHTML = `
                Precio de Venta (USD/Bs)
                <span class="tooltip-wrap" style="position:relative; display:inline-flex; align-items:center; cursor:help; margin-left:.3rem">
                    <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:var(--text-muted); color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                    <span class="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:260px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,.3); z-index:100; line-height:1.4">
                        Precio al que se le cobrará este ingrediente al cliente en cada platillo armado, por kilogramo / gramo / mililitro / litro / unidad, según la unidad de medida seleccionada.
                    </span>
                </span>
            `;
        }
    }
    
    setupIngredienteModalEvents();
    
    // Configurar botones del footer del modal de ingrediente
    setTimeout(function() {
        const saveBtn = document.getElementById('saveIngredienteBtn');
        const cancelBtn = document.getElementById('cancelIngredienteBtn');
        const deleteBtn = document.getElementById('deleteIngredienteBtn');
        
        // Función para bloquear el campo de stock (auto-bloqueo)
        function bloquearStock() {
            const stockInput = document.getElementById('ingredienteStock');
            const lockIcon = document.getElementById('stockLockIcon');
            if (stockInput) {
                stockInput.setAttribute('readonly', '');
                stockInput.style.background = 'rgba(0,0,0,.08)';
                stockInput.style.cursor = 'not-allowed';
            }
            if (lockIcon) {
                lockIcon.innerHTML = '<i class="fas fa-lock" style="font-size:.9rem; color:var(--text-muted)"></i>';
            }
        }
        
        // Botón Guardar - usando .onclick directo para evitar duplicidad en Brave
        if (saveBtn) {
            saveBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                console.log('Botón Guardar Ingrediente presionado');
                if (typeof window.guardarIngrediente === 'function') {
                    window.guardarIngrediente();
                }
                // Auto-bloquear stock después de guardar
                setTimeout(bloquearStock, 100);
            };
        }
        
        // Botón Cancelar
        if (cancelBtn) {
            cancelBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botón Cancelar Ingrediente presionado');
                // Auto-bloquear stock antes de cerrar
                bloquearStock();
                window.cerrarModal('ingredienteModal');
                window.ingredienteEditandoId = null;
                removeIngredienteImage();
            };
        }
        
        // Botón Eliminar
        if (deleteBtn) {
            deleteBtn.onclick = function(e) {
                console.log('Botón Eliminar Ingrediente presionado');
                e.preventDefault();
                e.stopPropagation();
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                if (typeof window._eliminarIngredienteDesdeModal === 'function') {
                    window._eliminarIngredienteDesdeModal();
                }
                // Auto-bloquear stock después de eliminar
                setTimeout(bloquearStock, 100);
            };
        }
    }, 100);
    
    // Cierre automático al cerrar el modal con la X o clic fuera
    const modalObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const modal = document.getElementById('ingredienteModal');
                if (modal && !modal.classList.contains('active')) {
                    // Modal cerrado - bloquear stock
                    const stockInput = document.getElementById('ingredienteStock');
                    const lockIcon = document.getElementById('stockLockIcon');
                    if (stockInput) {
                        stockInput.setAttribute('readonly', '');
                        stockInput.style.background = 'rgba(0,0,0,.08)';
                        stockInput.style.cursor = 'not-allowed';
                    }
                    if (lockIcon) {
                        lockIcon.innerHTML = '<i class="fas fa-lock" style="font-size:.9rem; color:var(--text-muted)"></i>';
                    }
                }
            }
        });
    });
    
    const modalElement = document.getElementById('ingredienteModal');
    if (modalElement) {
        modalObserver.observe(modalElement, { attributes: true, attributeFilter: ['class'] });
    }
    
    // Función auxiliar para eliminar ingrediente desde el modal
    window._eliminarIngredienteDesdeModal = async function() {
        const id = window.ingredienteEditandoId;
        if (!id) return;
        const ingrediente = window.inventarioItems.find(i => i.id === id);
        if (!ingrediente) return;
        
        window.mostrarConfirmacionPremium(
            'Eliminar Ingrediente',
            `¿Estás seguro de eliminar "${ingrediente.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    await window.supabaseClient.from('inventario').delete().eq('id', id);
                    await window.cargarInventario();
                    window.cerrarModal('ingredienteModal');
                    window.ingredienteEditandoId = null;
                    removeIngredienteImage();
                    window.mostrarToast('🗑️ Ingrediente eliminado', 'success');
                } catch (e) {
                    console.error('Error eliminando ingrediente:', e);
                    window.mostrarToast('❌ Error al eliminar ingrediente', 'error');
                }
            }
        );
    };
    
    // Función principal para guardar ingrediente
    window.guardarIngrediente = async function() {
        const nombre = document.getElementById('ingredienteNombre')?.value.trim();
        const stock = parseFloat(document.getElementById('ingredienteStock')?.value) || 0;
        const unidad = document.getElementById('ingredienteUnidad')?.value || 'unidades';
        const minimo = parseFloat(document.getElementById('ingredienteMinimo')?.value) || 0;
        const costo = parseFloat(document.getElementById('ingredienteCosto')?.value) || 0;
        const venta = parseFloat(document.getElementById('ingredienteVenta')?.value) || 0;
        
        // Validaciones
        let hayError = false;
        
        if (!nombre) {
            window.mostrarErrorInput('ingredienteNombre', 'El nombre es obligatorio');
            hayError = true;
        }
        
        if (hayError) {
            window.mostrarToast('⚠️ Por favor corrige los errores', 'warning');
            return;
        }
        
        // Aplicar fix de decimales con toFixed(2) para evitar errores como 14.60000000001
        const ingredienteData = {
            nombre: nombre,
            stock: parseFloat(parseFloat(stock).toFixed(2)),
            unidad_base: unidad,
            minimo: parseFloat(parseFloat(minimo).toFixed(2)),
            precio_costo: parseFloat(parseFloat(costo).toFixed(2)),
            precio_unitario: parseFloat(parseFloat(venta).toFixed(2)),
            imagen: currentIngredienteImagenUrl || currentIngredienteImagenFile ? (currentIngredienteImagenUrl || null) : null,
            reservado: 0
        };
        
        try {
            let error;
            if (window.ingredienteEditandoId) {
                // Actualizar existente
                const { error: updError } = await window.supabaseClient.from('inventario')
                    .update(ingredienteData)
                    .eq('id', window.ingredienteEditandoId);
                error = updError;
            } else {
                // Crear nuevo
                const { error: insError } = await window.supabaseClient.from('inventario')
                    .insert([ingredienteData]);
                error = insError;
            }
            
            if (error) throw error;
            
            // Éxito - mensaje específico según acción
            window.cerrarModal('ingredienteModal');
            window.ingredienteEditandoId = null;
            removeIngredienteImage();
            await window.cargarInventario();
            const mensajeExito = window.ingredienteEditandoId ? 'Ingrediente editado con éxito' : 'Ingrediente creado con éxito';
            window.mostrarToast('✅ ' + mensajeExito, 'success');
            
        } catch (e) {
            console.error('Error guardando ingrediente:', e);
            window.mostrarToast('❌ Error al guardar: ' + (e.message || e), 'error');
        }
    };
})();