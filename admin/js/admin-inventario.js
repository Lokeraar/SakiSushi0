// admin-inventario.js - Gestión de ingredientes / inventario
(function() {
    let currentIngredienteImagenFile = null;
    let currentIngredienteImagenUrl = '';
    
    // variables para gestión de stock con contraseña
    let stockoriginalvalue = 0;
    let stockpasswordmodalopen = false;
    let pendingingredientid = null;

    window.cargarinventario = async function() {
        try {
            const { data, error } = await window.supabaseClient.from('inventario').select('*');
            if (error) throw error;
            window.inventarioitems = data || [];
            const inventariogrid = document.getElementById('inventarioGrid');
            if (inventariogrid) window.renderizarinventario();
            window.actualizaralertasstock();
            await window.cargarmenu();
            window.actualizarstockcriticoheader();
            if (typeof window.verificarstockcritico === 'function') await window.verificarstockcritico();
        } catch (e) { 
            console.error('Error cargando inventario:', e); 
            if (e.message && !e.message.includes('inventarioGrid')) window.mostrartoast('Error cargando inventario', 'error');
        }
    };

    window.renderizarinventario = function(filtro) {
        const grid = document.getElementById('inventarioGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const _normi = t => (t || '').normalize('NFD').replace(/[áéíóú]/g, '').toLowerCase();
        const _basei = [...window.inventarioitems].sort((a,b) => a.nombre.localeCompare(b.nombre));
        const items = filtro
            ? _basei.filter(i => _normi(i.nombre).includes(_normi(filtro)))
            : _basei;
        if (!items.length) {
            grid.innerHTML = '<p style="Color:var(--text-muted);font-size:.85rem;padding:.75rem">' +
                (filtro ? 'Sin resultados para "' + filtro + '"' : 'No hay ingredientes registrados.') + '</p>';
            window.actualizarstockcriticoheader();
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
            
            const el = document.createelement('div');
            el.classname = 'inv-list-item' + (item.id === window._invactiveid ? ' active' : '');
            el.id = 'invItem_' + item.id;
            // Mostrar imagen pequeña si existe
            const imgHtml = item.imagen ? `<img src="${item.imagen}" style="Width:24px;height:24px;object-fit:cover;border-radius:4px;margin-right:8px">` : '';
            el.innerHTML = `
                <div style="Display:flex;align-items:center;flex:1;min-width:0">
                    ${imgHtml}
                    <span style="Overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.nombre}</span>
                </div>
                <span class="Inv-item-badge ${estado}">${Math.round((disponible + Number.EPSILON) * 1000) / 1000} ${item.unidad_base||'U'}</span>`;
            el.addEventListener('Click', function() {
                const wasActive = item.id === window._invActiveId;
                document.querySelectorAll('.inv-list-item').forEach(e => e.classList.remove('Active'));
                document.querySelectorAll('.inv-mobile-detail').forEach(e => e.remove());
                if (wasActive) {
                    window._invActiveId = null;
                    const col = document.getElementById('Invdetailcol');
                    if (col) col.innerHTML = '<div class="Inv-detail-empty"><i class="Fas fa-hand-point-left" style="Font-size:2rem;margin-bottom:.75rem;display:block;opacity:.3"></i>Selecciona un ingrediente de la lista para ver su detalle</div>';
                } else {
                    window._invactiveid = item.id;
                    this.classList.add('active');
                    window._invmostrardetalle(item);
                }
            });
            grid.appendchild(el);
        });
        if (window._invactiveid) {
            const activeitem = items.find(i => i.id === window._invactiveid);
            if (activeitem) {
                const el = document.getElementById('invItem_' + window._invactiveid);
                if (el) el.classList.add('active');
                window._invmostrardetalle(activeitem);
            } else {
                window._invactiveid = null;
            }
        }
        window.actualizarstockcriticoheader();
    };

    window._invactiveid = null;

    window._invmostrardetalle = function(item) {
        const ismobile   = window.innerwidth <= 768;
        const disponible = (item.stock||0) - (item.reservado||0);
        const minimo     = item.minimo || 0;
        const stockbase  = Math.max(item.stock || 0, 0.0001);

        // 4 estados
        let estado, estadolabel, estadocolor, estadograd;
        if (disponible <= 0) {
            estado='agotado';  estadolabel='Agotado (= 0)';
            estadocolor='#546e7a'; estadograd='linear-gradient(90deg,#37474f,#546e7a)';
        } else if (disponible <= minimo) {
            estado='critico';  estadolabel='Crítico (≤ stock mínimo)';
            estadocolor='#e53935'; estadograd='linear-gradient(90deg,#e53935,#ef5350)';
        } else if ((disponible / stockbase) * 100 <= 50) {
            estado='moderado'; estadolabel='Moderado (≤ 50%)';
            estadocolor='#fb8c00'; estadograd='linear-gradient(90deg,#fb8c00,#ffa726)';
        } else {
            estado='optimo';   estadolabel='Óptimo (> 50%)';
            estadocolor='#43a047'; estadograd='linear-gradient(90deg,#43a047,#66bb6a)';
        }

        const pct = Math.min(100, Math.max(0, (disponible / stockbase) * 100));
        // decimales limpios: hasta milésimas (3 decimales) sin ceros extra
        const fmt = (n) => { 
            const num = parseFloat(n.toprecision(10));
            if (isNaN(num)) return '0';
            // Mostrar hasta 3 decimales si es necesario
            const s = num.toFixed(3);
            // Eliminar ceros innecesarios después del punto decimal
            return parseFloat(s).toString();
        };

        const imgHtml = item.imagen
            ? `<img src="${item.imagen}" style="Width:60px;height:60px;object-fit:cover;border-radius:8px;margin-bottom:.5rem;cursor:pointer" onclick="window.expandirImagen&&window.expandirImagen('${item.imagen.replace(/'/g,"\'")}')">`
            : '';

        const detailHTML = `
            <div class="Inv-detail-card" id="invDetailCard_${item.id}">
                <div class="Inv-detail-title">
                    <span>${item.nombre}</span>
                    <button class="Inv-detail-close" onclick="window._invCerrarDetalle('${item.id}')" Title="Minimizar">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
                ${imghtml}
                <div class="inv-stock-row" Style="margin-bottom:.4rem;display:flex;align-items:baseline;gap:.4rem;flex-wrap:wrap">
                    <span style="font-size:2.2rem;font-weight:800;color:${estadoColor};line-height:1">${fmt(disponible)}</span>
                    <span class="inv-stock-unit" Style="font-size:.9rem">${item.unidad_base||'U'}</span>
                    <span style="Font-size:.7rem;color:var(--text-muted);margin-left:auto;background:var(--secondary);padding:2px 8px;border-radius:20px;white-space:nowrap">
                        Reservado: ${fmt(item.reservado||0)}
                    </span>
                </div>
                <!-- Barra invertida: stock restante a la izquierda (color), consumido a la derecha (gris) -->
                <div style="Height:10px;background:rgba(0,0,0,.08);border-radius:6px;overflow:hidden;margin-bottom:.35rem;position:relative">
                    <div style="Position:absolute;top:0;right:0;height:100%;width:${(100-pct).toFixed(1)}%;background:rgba(0,0,0,.15);border-radius:0 6px 6px 0;"></div>
                    <div style="Position:absolute;top:0;left:0;height:100%;width:${pct.toFixed(1)}%;background:${estadograd};border-radius:6px 0 0 6px;transition:width .55s cubic-bezier(.4,0,.2,1)"></div>
                </div>
                <div style="Display:flex;align-items:center;gap:.45rem;margin-bottom:.85rem;font-size:.75rem;font-weight:700;color:${estadocolor}">
                    <span style="Width:9px;height:9px;border-radius:50%;background:${estadocolor};display:inline-block;flex-shrink:0"></span>
                    ${estadoLabel}
                    <span style="Margin-left:auto;color:var(--text-muted);font-weight:400">${pct.toFixed(0)}% del stock</span>
                </div>
                <div class="Inv-meta-grid" style="Grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-bottom:.85rem">
                    <div class="Inv-meta-item">
                        <span class="Inv-meta-label">Stock mínimo</span>
                        <span class="Inv-meta-val" style="Color:${estadocolor}">${fmt(minimo)} ${item.unidad_base||'U'}</span>
                    </div>
                    <div class="Inv-meta-item">
                        <span class="Inv-meta-label">Costo (USD/Bs)</span>
                        <span class="Inv-meta-val">${window.formatUSD(item.precio_costo||0)}</span>
                        <span class="Inv-meta-bs">${window.formatBs(window.usdToBs(item.precio_costo||0))}</span>
                    </div>
                    <div class="Inv-meta-item">
                        <span class="Inv-meta-label">Venta (USD/Bs)</span>
                        <span class="Inv-meta-val">${window.formatUSD(item.precio_unitario||0)}</span>
                        <span class="Inv-meta-bs">${window.formatBs(window.usdToBs(item.precio_unitario||0))}</span>
                    </div>
                </div>
                <div style="Display:flex;gap:.5rem;flex-wrap:wrap">
                    <button class="Btn-icon edit" onclick="window.editarIngrediente('${item.id}')" Title="Editar ingrediente" Style="width:auto;padding:.45rem .9rem;border-radius:8px">
                        <i class="fas fa-pen"></i> editar
                    </button>
                    <button class="btn-icon delete" Onclick="window.eliminarIngrediente('${item.id}')" Title="Eliminar ingrediente" Style="width:auto;padding:.45rem .9rem;border-radius:8px">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>`;

        if (isMobile) {
            const el = document.getElementById('invItem_' + item.id);
            if (!el) return;
            const prev = el.nextElementSibling;
            if (prev && prev.classList.contains('Inv-mobile-detail')) prev.remove();
            const wrap = document.createElement('Div');
            wrap.className = 'Inv-mobile-detail';
            wrap.innerHTML = detailHTML;
            el.insertAdjacentElement('Afterend', wrap);
        } else {
            const col = document.getElementById('Invdetailcol');
            if (!col) return;
            col.innerHTML = detailHTML;
        }
    };

    window._invCerrarDetalle = function(itemId) {
        window._invActiveId = null;
        document.querySelectorAll('.inv-list-item').forEach(el => el.classList.remove('Active'));
        const mDet = document.querySelector('.inv-mobile-detail');
        if (mDet) mDet.remove();
        const col = document.getElementById('Invdetailcol');
        if (col) col.innerHTML = '<div class="Inv-detail-empty" id="Invdetailempty"><i class="Fas fa-hand-point-left" style="Font-size:2rem;margin-bottom:.75rem;display:block;opacity:.3"></i>Selecciona un ingrediente de la lista para ver su detalle</div>';
    };

    // funciones para imagen de ingrediente
    function handleingredienteimagenfile() {
        const fileinput = document.getElementById('ingredienteImagen');
        const urlinput = document.getElementById('ingredienteImagenUrl');
        const previewdiv = document.getElementById('ingredienteImagenPreview');
        const previewimg = document.getElementById('ingredientePreviewImg');
        const removebtn = document.getElementById('ingredienteImgRemoveBtn');
        
        if (fileinput.files && fileinput.files[0]) {
            const file = fileinput.files[0];
            currentingredienteimagenfile = file;
            currentingredienteimagenurl = '';
            urlinput.value = '';
            urlinput.disabled = true;
            const reader = new filereader();
            reader.onload = function(e) {
                previewimg.src = e.target.result;
                previewdiv.style.display = 'flex';
                if (removebtn) removebtn.style.display = 'flex';
            };
            reader.readasdataurl(file);
        } else {
            urlinput.disabled = false;
            if (urlinput.value.trim()) {
                previewimg.src = urlinput.value;
                previewdiv.style.display = 'flex';
                if (removebtn) removebtn.style.display = 'flex';
                currentingredienteimagenurl = urlinput.value;
                currentingredienteimagenfile = null;
            } else {
                previewdiv.style.display = 'none';
                if (removebtn) removebtn.style.display = 'none';
                previewimg.src = '';
            }
        }
    }

    function handleingredienteimagenurl() {
        const urlinput = document.getElementById('ingredienteImagenUrl');
        const fileinput = document.getElementById('ingredienteImagen');
        const previewdiv = document.getElementById('ingredienteImagenPreview');
        const previewimg = document.getElementById('ingredientePreviewImg');
        const removebtn = document.getElementById('ingredienteImgRemoveBtn');
        
        if (fileinput.files && fileinput.files[0]) return;
        
        const url = urlinput.value.trim();
        if (url) {
            currentingredienteimagenurl = url;
            currentingredienteimagenfile = null;
            previewimg.src = url;
            previewdiv.style.display = 'flex';
            if (removebtn) removebtn.style.display = 'flex';
        } else {
            previewdiv.style.display = 'none';
            if (removebtn) removebtn.style.display = 'none';
            previewimg.src = '';
            currentingredienteimagenurl = '';
        }
    }


    // sincronizar mercancía nueva con cantidad comprada
    function syncagregartocantidadcomprada() {
        const agregarinput = document.getElementById('ingredienteAgregar');
        const cantidadcomprada = document.getElementById('cantidadComprada');
        if (agregarinput && cantidadcomprada) {
            cantidadcomprada.value = agregarinput.value;
        }
        window._syncingredientepreview();
    }


    window.agregarstock = function(ingredienteid) {
        const ingrediente = window.inventarioitems.find(i => i.id === ingredienteid);
        if (ingrediente) { 
            window.editaringrediente(ingredienteid); 
            setTimeout(() => { 
                const agregarinput = document.getElementById('ingredienteAgregar');
                if (agregarinput) agregarinput.focus();
            }, 500); 
        }
    };

    window.calcularcostounitario = function() {
        const costototal = parseFloat(document.getElementById('costoTotal').value) || 0;
        const cantidad   = parseFloat(document.getElementById('cantidadComprada').value) || 0;
        const resdiv = document.getElementById('calcResultado');
        const resval = document.getElementById('calcPrecioUnitario');
        const resuni = document.getElementById('calcUnidadResult');
        const unidad = document.getElementById('ingredienteUnidad')?.value || 'unidad';
        if (costototal > 0 && cantidad > 0) {
            const unitario = costototal / cantidad;
            document.getElementById('ingredienteCosto').value = unitario.toFixed(4);
            if (resdiv) resdiv.style.display = 'block';
            if (resval) resval.textContent = unitario.toFixed(4);
            if (resuni) resuni.textContent = ' por ' + unidad;
        } else {
            if (resdiv) resdiv.style.display = 'none';
        }
    };

    window.convertircostototalbs = function() {
        const tasabase = window.configglobal?.tasa_cambio || 1;
        const costototalbs = parseFloat(document.getElementById('costoTotalBs').value) || 0;
        const costototalinput = document.getElementById('costoTotal');
        if (costototalbs > 0 && tasabase > 0) {
            const costototalusd = costototalbs / tasabase;
            costototalinput.value = costototalusd.toFixed(2);
            window.calcularcostounitario();
        }
    };

    // agregar conversión inversa: cuando se modifica usd, actualizar bs
    window._setupconversionbidireccional = function() {
        const costototalinput = document.getElementById('costoTotal');
        if (costototalinput) {
            costototalinput.addEventListener('input', function() {
                const tasabase = window.configglobal?.tasa_cambio || 1;
                const costototalusd = parseFloat(costototalinput.value) || 0;
                const costototalbsinput = document.getElementById('costoTotalBs');
                if (costototalusd > 0 && tasabase > 0 && costototalbsinput) {
                    const costototalbs = costototalusd * tasabase;
                    costototalbsinput.value = costototalbs.toFixed(2);
                }
            });
        }
    };

    window._syncingredientepreview = function() {
        const nuevo       = parseFloat(document.getElementById('ingredienteAgregar')?.value) || 0;
        const unidad      = document.getElementById('ingredienteUnidad')?.value || 'unidades';
        const sp = document.getElementById('stockTotalPreview');
        const sc = document.getElementById('stockConversionPreview');
        if (sp) sp.textContent = nuevo > 0 ? `stock resultante: ${nuevo.toFixed(3)} ${unidad}` : '';
        if (sc) {
            if (unidad === 'kilogramos' && nuevo > 0) sc.textContent = `= ${(nuevo * 1000).toFixed(0)} g adicionales`;
            else if (unidad === 'litros' && nuevo > 0) sc.textContent = `= ${(nuevo * 1000).toFixed(0)} ml adicionales`;
            else sc.textContent = '';
        }
    };

    function removeingredienteimage() {
		const fileinput = document.getElementById('ingredienteImagen');
		const urlinput = document.getElementById('ingredienteImagenUrl');
		const previewdiv = document.getElementById('ingredienteImagenPreview');
		const previewimg = document.getElementById('ingredientePreviewImg');
		const removebtn = document.getElementById('ingredienteImgRemoveBtn');
		if (fileinput) fileinput.value = '';
		if (urlinput) {
			urlinput.value = '';
			urlinput.disabled = false;
		}
		if (previewdiv) previewdiv.style.display = 'none';
		if (removebtn) removebtn.style.display = 'none';
		if (previewimg) previewimg.src = '';
		currentingredienteimagenfile = null;
		currentingredienteimagenurl = '';
	}

// validación dinámica de precio de venta vs costo
window._inicializarvalidacionprecioingrediente = function() {
const costoinput = document.getElementById('ingredienteCosto');
const ventainput = document.getElementById('ingredienteVenta');

if (!costoinput || !ventainput) return;

// remover listeners previos para evitar duplicados
costoinput._validacionlistener?.();
ventainput._validacionlistener?.();

// crear o actualizar elemento de mensaje de advertencia
let warningmsg = document.getElementById('precioVentaWarning');
if (!warningmsg) {
warningmsg = document.createelement('span');
warningmsg.id = 'precioVentaWarning';
warningmsg.style.csstext = 'color:#dc2626; font-size:.75rem; display:block; margin-top:.25rem;';
ventainput.parentnode.insertbefore(warningmsg, ventainput.nextsibling);
}

const validarprecios = function() {
const costo = parseFloat(costoinput.value) || 0;
const venta = parseFloat(ventainput.value) || 0;

if (venta > 0 && venta < costo) {
warningmsg.textContent = 'Atención: El precio de venta es menor al costo.';
warningmsg.style.display = 'block';
costoinput.style.bordercolor = '#dc2626';
ventainput.style.bordercolor = '#dc2626';
} else {
warningmsg.textContent = '';
warningmsg.style.display = 'none';
costoinput.style.bordercolor = '';
ventainput.style.bordercolor = '';
}
};

// agregar listeners
costoinput.addEventListener('input', validarprecios);
ventainput.addEventListener('input', validarprecios);

// guardar referencia para poder removerlos después
costoinput._validacionlistener = function() {
costoinput.removeeventlistener('input', validarprecios);
};
ventainput._validacionlistener = function() {
ventainput.removeeventlistener('input', validarprecios);
};

// ejecutar validación inicial
validarprecios();
};

	window.abrirmodalnuevoingrediente = function() {
		window.ingredienteeditandoid = null;
		const modaltitle = document.getElementById('ingredienteModalTitle');
		if (modaltitle) modaltitle.textContent = 'Nuevo Ingrediente';
		const nombreinput = document.getElementById('ingredienteNombre');
		if (nombreinput) nombreinput.value = '';
		const minimoinput = document.getElementById('ingredienteMinimo');
		if (minimoinput) minimoinput.value = '';
		const costoinput = document.getElementById('ingredienteCosto');
		if (costoinput) costoinput.value = '';
		const ventainput = document.getElementById('ingredienteVenta');
		if (ventainput) ventainput.value = '';
		const agregarinput = document.getElementById('ingredienteAgregar');
		if (agregarinput) agregarinput.value = '';
		const cantidadcomprada = document.getElementById('cantidadComprada');
		if (cantidadcomprada) cantidadcomprada.value = '';
		const costototal = document.getElementById('costoTotal');
		if (costototal) costototal.value = '';
		
		removeingredienteimage();
		
		const deletebtn = document.getElementById('deleteIngredienteBtn');
		if (deletebtn) deletebtn.style.display = 'none';
		const modal = document.getElementById('ingredienteModal');
		if (modal) modal.classList.add('active');
		
		// inicializar validación y conversión bidireccional después de mostrar el modal
		setTimeout(function() {
			window._inicializarvalidacionprecioingrediente();
			window._setupconversionbidireccional();
		}, 50);
	};

	window.editaringrediente = function(id) {
		const ingrediente = window.inventarioitems.find(i => i.id === id);
		if (!ingrediente) return;
		window.ingredienteeditandoid = id;
		const modaltitle = document.getElementById('ingredienteModalTitle');
		if (modaltitle) modaltitle.textContent = 'Editar Ingrediente';
		
		// phase 2: fetch stock - set value in input
		const stockinput = document.getElementById('stock-actual-input');
		if (stockinput) {
			stockoriginalvalue = typeof ingrediente.stock === 'number' ? ingrediente.stock : 0;
			stockinput.value = stockoriginalvalue;
				stockinput.readonly = true; // use readonly instead of disabled to allow click events
				stockinput.disabled = false; // ensure it's not disabled so click events work
			// PHASE 3: Click Behavior - Bind dynamically on each modal open (avoid duplicates)
			stockInput.onclick = null; // Remove previous listener
			stockInput.onclick = function() {
				console.log('Click stock input detected', this.readOnly);
				
				if (this.readOnly && !stockPasswordModalOpen) {
					pendingIngredientId = window.ingredienteEditandoId;
					window.abrirStockPasswordModal();
				}
				// If enabled, do NOTHING (already editable)
			};
		}
		
		const nombreInput = document.getElementById('Ingredientenombre');
		if (nombreInput) {
			nombreInput.value = ingrediente.nombre || '';
		}
		const unidadselect = document.getElementById('ingredienteUnidad');
		if (unidadselect) unidadselect.value = ingrediente.unidad_base || 'unidades';
		const minimoinput = document.getElementById('ingredienteMinimo');
		if (minimoinput) minimoinput.value = ingrediente.minimo || 0;
		const costoinput = document.getElementById('ingredienteCosto');
		if (costoinput) costoinput.value = ingrediente.precio_costo || 0;
		const ventainput = document.getElementById('ingredienteVenta');
		if (ventainput) ventainput.value = ingrediente.precio_unitario || 0;
		const agregarinput = document.getElementById('ingredienteAgregar');
		if (agregarinput) agregarinput.value = '';
		const cantidadcomprada = document.getElementById('cantidadComprada');
		if (cantidadcomprada) cantidadcomprada.value = '';
		const costototal = document.getElementById('costoTotal');
		if (costototal) costototal.value = '';
		
		if (ingrediente.imagen) {
			const previewdiv = document.getElementById('ingredienteImagenPreview');
			const previewimg = document.getElementById('ingredientePreviewImg');
			if (previewimg) previewimg.src = ingrediente.imagen;
			if (previewdiv) previewdiv.style.display = 'flex';
			const urlinput = document.getElementById('ingredienteImagenUrl');
			if (urlinput) urlinput.value = ingrediente.imagen;
			currentingredienteimagenurl = ingrediente.imagen;
			const removebtn = document.getElementById('ingredienteImgRemoveBtn');
			if (removebtn) removebtn.style.display = 'flex';
		} else {
			removeingredienteimage();
		}
		
		const deletebtn = document.getElementById('deleteIngredienteBtn');
		if (deletebtn) deletebtn.style.display = 'inline-flex';
		const modal = document.getElementById('ingredienteModal');
		if (modal) modal.classList.add('active');
		
		// inicializar validación y conversión bidireccional después de mostrar el modal
		setTimeout(function() {
			window._inicializarvalidacionprecioingrediente();
			window._setupconversionbidireccional();
		}, 50);
	};

	// reemplazar eliminaringrediente para usar confirmación premium
	window.eliminaringrediente = async function(id) {
		const ingrediente = window.inventarioitems.find(i => i.id === id);
		if (!ingrediente) return;
		window.mostrarconfirmacionpremium('Eliminar Ingrediente',
			`¿Estás seguro de eliminar "${ingrediente.nombre}"? Esta acción no se puede deshacer.`,
			async () => {
				try {
					await window.supabaseClient.from('Inventario').delete().eq('Id', id);
					await window.cargarInventario();
					window.mostrarToast('🗑️ ingrediente eliminado', 'Success');
				} catch (e) {
					console.error('Error eliminando ingrediente:', e);
					window.mostrarToast('❌ error al eliminar ingrediente', 'Error');
				}
			}
		);
	};

    window.actualizarAlertasStock = function() {
        document.getElementById('Alertasstock').textContent = window.inventarioItems.filter(i => i.stock <= i.minimo).length;
        // Hacer clic en la tarjeta redirige a stock crítico
        const alertCard = document.querySelector('.dashboard-card:nth-child(3)');
        if (alertCard && !alertCard.hasAttribute('Data-listener')) {
            alertCard.setAttribute('Data-listener', 'True');
            alertCard.style.cursor = 'Pointer';
            alertCard.addEventListener('Click', () => {
                const stockCriticoDiv = document.getElementById('Stockcritico');
                if (stockCriticoDiv) {
                    stockCriticoDiv.scrollIntoView({ behavior: 'Smooth', block: 'Center' });
                    window.resaltarElemento('Stockcritico', 'Border');
                }
            });
        }
    };

    window.verificarStockCritico = async function() {
        const stockCriticoDiv = document.getElementById('Stockcritico');
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
                    <div class="Alert-item critical">
                        <span>
                            <strong>${item.nombre}</strong><br>
                            Stock: ${Math.round((disponible + Number.EPSILON) * 1000) / 1000} / Mínimo: ${item.minimo || 0}
                            ${faltantes > 0 ? `(Faltan ${faltantes})` : ''}
                        </span>
                        <button class="Btn-small" onclick="window.agregarStock('${item.id}')" Style="background:var(--primary);color:#fff;border:none;padding:.3rem .7rem;border-radius:4px;cursor:pointer">
                            <i class="fas fa-plus"></i> Agregar
                        </button>
                    </div>
                `;
            }).join('');
            document.getElementById('alertasStock').textContent = criticos.length;
        } else {
            stockcriticodiv.innerHTML = '<p style="Color:var(--text-muted);font-size:.85rem">No hay alertas de stock</p>';
            document.getElementById('alertasStock').textContent = '0';
        }
    };

    window.actualizarstockcriticoheader = function() {
        const container = document.getElementById('stockCriticoTags');
        if (!container) return;
        const criticos = (window.inventarioitems || []).filter(item => {
            const disponible = (item.stock || 0) - (item.reservado || 0);
            const minimo = item.minimo || 0;
            return disponible <= minimo && minimo > 0;
        });
        if (criticos.length === 0) {
            container.innerHTML = '<span style="Color:var(--text-muted)">NINGÚN INGREDIENTE EN STOCK CRÍTICO</span>';
            return;
        }
        container.innerHTML = criticos.map(item => {
            const disponible = (item.stock || 0) - (item.reservado || 0);
            return `
                <span class="Stock-critico-tag" 
                      data-ingrediente-id="${item.id}"
                      onclick="window._irAIngrediente('${item.id}')"Style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; background:rgba(239,68,68,.25); border-radius:20px; color:var(--danger); font-weight:800; font-size:.75rem; cursor:pointer; animation:pulse 0.8s infinite; text-transform:uppercase; letter-spacing:.5px"Onmouseover="this.style.transform='Scale(1.05)'; this.style.background='Rgba(239,68,68,.4)'"Onmouseout="this.style.transform='Scale(1)'; this.style.background='Rgba(239,68,68,.25)'">
                    <i class="fas fa-exclamation-triangle" Style="font-size:.7rem"></i>
                    ${item.nombre}
                    <span style="background:var(--danger); color:#fff; padding:0 5px; border-radius:12px; font-size:.65rem; margin-left:2px">${Math.round((disponible + Number.EPSILON) * 1000) / 1000}</span>
                </span>
            `;
        }).join('');
    };

    window._iraingrediente = function(ingredienteid) {
        const tabs = document.querySelectorAll('.tab');
        const panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(tab => tab.classList.remove('active'));
        panes.forEach(pane => pane.classList.remove('active'));
        const inventariotab = document.querySelector('.tab[data-tab="Inventario"]');
        const inventariopane = document.getElementById('inventarioPane');
        if (inventariotab) inventariotab.classList.add('active');
        if (inventariopane) inventariopane.classList.add('active');
        setTimeout(() => {
            const itemelement = document.getElementById(`invitem_${ingredienteid}`);
            if (itemelement) {
                itemelement.scrollintoview({ behavior: 'smooth', block: 'center' });
                itemelement.click();
                window.resaltarelemento(`invitem_${ingredienteid}`, 'pulse');
            } else {
                window.renderizarinventario();
                setTimeout(() => {
                    const retryelement = document.getElementById(`invitem_${ingredienteid}`);
                    if (retryelement) {
                        retryelement.scrollintoview({ behavior: 'smooth', block: 'center' });
                        retryelement.click();
                        window.resaltarelemento(`invitem_${ingredienteid}`, 'pulse');
                    }
                }, 300);
            }
        }, 200);
    };

    window.setupstockrealtime = function() {
        if (window.stockupdatechannel) window.supabaseClient.removeChannel(window.stockupdatechannel);
        window.stockupdatechannel = window.supabaseClient
            .channel('stock-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventario' }, async (payload) => {
                const index = window.inventarioitems.findindex(i => i.id === payload.new.id);
                if (index !== -1) window.inventarioitems[index] = payload.new;
                else window.inventarioitems.push(payload.new);
                await window.verificarynotificarstockreactivado(payload.new.id, payload.new.nombre);
                await window.recalcularstockplatillos();
                if (payload.new.stock > 0 && payload.old?.stock <= 0) {
                    await window.enviarnotificacionpush('📢 Stock actualizado', `el ingrediente ${payload.new.nombre} está disponible nuevamente. ¡revisa el menú!`);
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, async () => { await window.cargarmenu(); })
            .subscribe();
    };

    window.verificarynotificarstockreactivado = async function(ingredienteid, ingredientenombre) {
        for (const platillo of window.menuitems) {
            if (!platillo.ingredientes || Object.keys(platillo.ingredientes).length === 0) continue;
            const usaingrediente = Object.keys(platillo.ingredientes).some(id => id === ingredienteid);
            if (!usaingrediente) continue;
            let stockdisponible = infinity;
            for (const [ingid, inginfo] of object.entries(platillo.ingredientes)) {
                const ingrediente = window.inventarioitems.find(i => i.id === ingid);
                if (!ingrediente) { stockdisponible = 0; break; }
                const stockdisp = (ingrediente.stock || 0) - (ingrediente.reservado || 0);
                const cantidadnecesaria = inginfo.cantidad || 1;
                const posible = Math.floor(stockdisp / cantidadnecesaria);
                stockdisponible = Math.min(stockdisponible, posible);
            }
            const estabaagotado = window.platillosnotificados[platillo.id] === 'agotado';
            const ahoradisponible = stockdisponible > 0;
            if (estabaagotado && ahoradisponible) {
                window.platillosnotificados[platillo.id] = 'disponible';
                localStorage.setItem('saki_platillos_notificados', JSON.stringify(window.platillosnotificados));
                const titulo = `🍣 ${platillo.nombre} disponible de nuevo!`;
                const mensaje = `ya tenemos ${platillo.nombre} en stock. ¡pide ahora!`;
                try {
                    const { data: pedidosunicos } = await window.supabaseClient.from('pedidos').select('session_id').not('session_id', 'is', null).order('fecha', { ascending: false });
                    const sessionids = [...new set(pedidosunicos?.map(p => p.session_id) || [])];
                    for (const sessionid of sessionids) await window.enviarnotificacionpush(titulo, mensaje, sessionid);
                    window.mostrartoast(`📢 notificación enviada: ${platillo.nombre} disponible`, 'success');
                } catch (e) { console.error('Error enviando notificaciones masivas:', e); }
            } else if (!ahoradisponible && !estabaagotado) {
                window.platillosnotificados[platillo.id] = 'agotado';
                localStorage.setItem('saki_platillos_notificados', JSON.stringify(window.platillosnotificados));
            }
        }
    };

    window.recalcularstockplatillos = async function() {
        for (const platillo of window.menuitems) {
            let stockdisponible = infinity;
            let todosingredientes = true;
            if (platillo.ingredientes && Object.keys(platillo.ingredientes).length > 0) {
                for (const [ingid, inginfo] of object.entries(platillo.ingredientes)) {
                    const ingrediente = window.inventarioitems.find(i => i.id === ingid);
                    if (!ingrediente) { todosingredientes = false; stockdisponible = 0; break; }
                    const stockdisp = (ingrediente.stock || 0) - (ingrediente.reservado || 0);
                    const cantidadnecesaria = inginfo.cantidad || 1;
                    const posible = Math.floor(stockdisp / cantidadnecesaria);
                    stockdisponible = Math.min(stockdisponible, posible);
                }
            } else {
                stockdisponible = platillo.stock_maximo || 999;
            }
            const nuevostock = todosingredientes ? Math.max(0, stockdisponible) : 0;
            if (platillo.stock !== nuevostock) {
                await window.supabaseClient.from('menu').update({ stock: nuevostock }).eq('id', platillo.id);
                platillo.stock = nuevostock;
            }
        }
        window.renderizarmenu();
    };

    window.enviarnotificacionpush = async function(titulo, mensaje, sessionid = null) {
        try {
            const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/send-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `bearer ${window.jwttoken}` },
                body: JSON.stringify({ titulo, mensaje, session_id: sessionid })
            });
            const result = await response.json();
            console.log('Notificaciones push enviadas:', result);
        } catch (e) { console.error('Error enviando push:', e); }
    };

    // configurar eventos del modal de ingrediente (imagen, sincronización)
    function setupIngredienteModalEvents() {
        const fileinput = document.getElementById('ingredienteImagen');
        const urlinput = document.getElementById('ingredienteImagenUrl');
        const agregarinput = document.getElementById('ingredienteAgregar');
        const cantidadcomprada = document.getElementById('cantidadComprada');
        const removebtn = document.getElementById('ingredienteImgRemoveBtn');
        
        if (fileinput) fileinput.addEventListener('change', handleingredienteimagenfile);
        if (urlinput) urlinput.addEventListener('input', handleingredienteimagenurl);
        if (removebtn) removebtn.addEventListener('click', removeingredienteimage);
        if (agregarinput) agregarinput.addEventListener('input', syncagregartocantidadcomprada);
        if (cantidadcomprada) cantidadcomprada.readonly = true;
        
        // phase 3: click behavior - removed from here, now bound dynamically in editaringrediente
    }
    
    setupIngredienteModalEvents();
    
    // configurar botones del footer del modal de ingrediente
    setTimeout(function() {
        const savebtn = document.getElementById('saveIngredienteBtn');
        const cancelbtn = document.getElementById('cancelIngredienteBtn');
        const deletebtn = document.getElementById('deleteIngredienteBtn');
        
        // botón guardar - usando .onclick directo para evitar duplicidad en brave
        if (savebtn) {
            savebtn.onclick = function(e) {
                e.preventdefault();
                e.stoppropagation();
                if (e.stopimmediatepropagation) e.stopimmediatepropagation();
                console.log('Botón Guardar Ingrediente presionado');
                if (typeof window.guardaringrediente === 'function') {
                    window.guardaringrediente();
                }
            };
        }
        
        // botón cancelar
        if (cancelbtn) {
            cancelbtn.onclick = function(e) {
                e.preventdefault();
                e.stoppropagation();
                console.log('Botón Cancelar Ingrediente presionado');
                window.cerrarmodal('ingredienteModal');
                window.ingredienteeditandoid = null;
                removeingredienteimage();
            };
        }
        
        // botón eliminar
        if (deletebtn) {
            deletebtn.onclick = function(e) {
                console.log('Botón Eliminar Ingrediente presionado');
                e.preventdefault();
                e.stoppropagation();
                if (e.stopimmediatepropagation) e.stopimmediatepropagation();
                if (typeof window._eliminaringredientedesdemodal === 'function') {
                    window._eliminaringredientedesdemodal();
                }
            };
        }
    }, 100);
    
    // función auxiliar para eliminar ingrediente desde el modal
    window._eliminaringredientedesdemodal = async function() {
        const id = window.ingredienteeditandoid;
        if (!id) return;
        const ingrediente = window.inventarioitems.find(i => i.id === id);
        if (!ingrediente) return;
        
        window.mostrarconfirmacionpremium( 'Eliminar Ingrediente',
            `¿Estás seguro de eliminar "${ingrediente.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    await window.supabaseClient.from('Inventario').delete().eq('Id', id);
                    await window.cargarInventario();
                    window.cerrarModal('Ingredientemodal');
                    window.ingredienteEditandoId = null;
                    removeIngredienteImage();
                    window.mostrarToast('🗑️ ingrediente eliminado', 'Success');
                } catch (e) {
                    console.error('Error eliminando ingrediente:', e);
                    window.mostrarToast('❌ error al eliminar ingrediente', 'Error');
                }
            }
        );
    };
    
    // Función principal para guardar ingrediente
    window.guardarIngrediente = async function() {
        const nombre = document.getElementById('Ingredientenombre')?.value.trim();
        const unidad = document.getElementById('Ingredienteunidad')?.value || 'Unidades';
        const minimo = parseFloat(document.getElementById('Ingredienteminimo')?.value) || 0;
        const costo = parseFloat(document.getElementById('Ingredientecosto')?.value) || 0;
        const venta = parseFloat(document.getElementById('Ingredienteventa')?.value) || 0;
        
        // PHASE 8: Save Logic - Get current stock value (may have been unlocked)
        const stockInput = document.getElementById('Stock-actual-input');
        let newStockValue = stockOriginalValue; // Default to original
        if (stockInput && !stockInput.readOnly) {
            // Only use new value if input was unlocked and user changed it
            const inputValue = parseFloat(stockInput.value);
            if (!isNaN(inputValue)) {
                newStockValue = inputValue;
            }
        }
        
        // Validaciones
        if (!nombre) {
            window.mostrarToast('El nombre es obligatorio', 'Error');
            return;
        }
        
        // PHASE 8: Compare original vs new stock - only update if changed
        const shouldUpdateStock = newStockValue !== stockOriginalValue;
        
        // Aplicar fix de decimales con toFixed(2) para evitar errores como 14.60000000001
        const ingredienteData = {
            nombre: nombre,
            stock: shouldUpdateStock ? parseFloat(parseFloat(newStockValue).toFixed(2)) : parseFloat(parseFloat(stockOriginalValue).toFixed(2)),
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
                const { error: updError } = await window.supabaseClient.from('Inventario')
                    .update(ingredienteData)
                    .eq('Id', window.ingredienteEditandoId);
                error = updError;
            } else {
                // Crear nuevo
                const { error: insError } = await window.supabaseClient.from('Inventario')
                    .insert([ingredienteData]);
                error = insError;
            }
            
            if (error) throw error;
            
            // Éxito - mensaje específico según acción
            // PHASE 7: Reset State on save
            const stockInput = document.getElementById('Stock-actual-input');
            if (stockInput) {
                stockInput.readOnly = true;
            }
            
            window.cerrarModal('Ingredientemodal');
            window.ingredienteEditandoId = null;
            removeIngredienteImage();
            await window.cargarInventario();
            const mensajeExito = window.ingredienteEditandoId ? 'Ingrediente editado con éxito' : 'Ingrediente creado con éxito';
            window.mostrarToast('✅ ' + mensajeExito, 'Success');
            
        } catch (e) {
            console.error('Error guardando ingrediente:', e);
            window.mostrarToast('❌ error al guardar: ' + (e.message || e), 'Error');
        }
    };
    
    // ============================================
    // PHASE 4-6: Password Modal Functions
    // ============================================
    
    window.abrirStockPasswordModal = function() {
        console.log('Opening password modal...');
        
        if (stockPasswordModalOpen) return; // Prevent multiple openings
        
        const modal = document.getElementById('Stockpasswordmodal');
        const passwordInput = document.getElementById('Stock-password-input');
        const errorDiv = document.getElementById('Stock-password-error');
        
        if (!modal) {
            console.error('Stockpasswordmodal not found in dom');
            return;
        }
        
        stockPasswordModalOpen = true;
        pendingIngredientId = window.ingredienteEditandoId;
        
        // Reset state
        if (passwordInput) {
            passwordInput.value = '';
            passwordinput.disabled = false;
        }
        if (errordiv) {
            errordiv.style.display = 'none';
            errordiv.textContent = '';
        }
        
        // show modal with animation
        modal.classList.add('active');
        
        // focus trap - phase 9
        setTimeout(() => {
            if (passwordinput) passwordinput.focus();
        }, 100);
    };
    
    window.cerrarstockpasswordmodal = function() {
        const modal = document.getElementById('stockPasswordModal');
        const passwordinput = document.getElementById('stock-password-input');
        
        if (modal) {
            modal.classList.remove('active');
        }
        
        // phase 7: reset state on close
        stockpasswordmodalopen = false;
        pendingingredientid = null;
        
        if (passwordinput) {
            passwordinput.value = '';
            passwordinput.disabled = false;
        }
        
        const errordiv = document.getElementById('stock-password-error');
        if (errordiv) {
            errordiv.style.display = 'none';
            errordiv.textContent = '';
        }
    };
    
    window.validarpasswordstock = async function() {
        const passwordinput = document.getElementById('stock-password-input');
        const errordiv = document.getElementById('stock-password-error');
        const password = passwordinput?.value.trim();
        
        if (!password) {
            if (errordiv) {
                errordiv.textContent = 'La contraseña es requerida';
                errordiv.style.display = 'block';
            }
            return;
        }
        
        try {
            // obtener el usuario admin actual de la sesión
            const adminuser = JSON.parse(sessionStorage.getItem('admin_user') || '{}');
            
            if (!adminuser.username) {
                throw new error('No se pudo identificar el usuario administrador');
            }
            
            // usar el mismo endpoint de login que ya funciona
            const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: adminUser.username, 
                    password: password 
                })
            });
            
            const data = await response.json();
            
            // Validar respuesta exactamente igual que en admin-auth.js
            if (data.success && data.user && data.user.rol === 'admin') {
                // contraseña correcta → desbloquear stock
                const stockinput = document.getElementById('stock-actual-input');
                if (stockinput) {
                    stockinput.readonly = false;
                    stockinput.focus();
                }
                window.cerrarstockpasswordmodal();
                window.mostrartoast('🔓 Stock desbloqueado para edición', 'success');
            } else {
                throw new error(data.error || 'Contraseña incorrecta');
            }
            
        } catch (error) {
            console.error('Error validando contraseña:', error);
            if (errordiv) {
                errordiv.textContent = error.message || 'Contraseña incorrecta. Inténtalo de nuevo.';
                errordiv.style.display = 'block';
            }
            if (passwordinput) {
                passwordinput.value = '';
                passwordinput.focus();
            }
        }
    };
    
    // setup password modal event listeners
    setTimeout(function() {
        const confirmbtn = document.getElementById('confirmStockPasswordBtn');
        const cancelbtn = document.getElementById('cancelStockPasswordBtn');
        const closebtn = document.getElementById('closeStockPasswordModal');
        const passwordinput = document.getElementById('stock-password-input');
        
        // confirm button
        if (confirmbtn) {
            confirmbtn.onclick = function(e) {
                e.preventdefault();
                e.stoppropagation();
                window.validarpasswordstock();
            };
        }
        
        // cancel button
        if (cancelbtn) {
            cancelbtn.onclick = function(e) {
                e.preventdefault();
                e.stoppropagation();
                window.cerrarstockpasswordmodal();
            };
        }
        
        // close button (x)
        if (closebtn) {
            closebtn.onclick = function(e) {
                e.preventdefault();
                e.stoppropagation();
                window.cerrarstockpasswordmodal();
            };
        }
        
        // enter key support
        if (passwordinput) {
            passwordinput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventdefault();
                    window.validarpasswordstock();
                }
            });
        }
        
        // phase 7: also reset on ingrediente modal close
        const originalcerrarmodal = window.cerrarmodal;
        window.cerrarmodal = function(modalid) {
            if (modalid === 'ingredienteModal') {
                const stockinput = document.getElementById('stock-actual-input');
                if (stockInput) {
                    stockInput.readOnly = true;
                }
                stockPasswordModalOpen = false;
                pendingIngredientId = null;
            }
            if (originalCerrarModal) {
                originalCerrarModal(modalId);
            }
        };
        
    }, 150);
    
})();