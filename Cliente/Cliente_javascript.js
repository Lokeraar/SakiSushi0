history.replaceState({saki:1,d:0},'');
history.pushState({saki:1,d:1},'');
history.pushState({saki:1,d:2},'');
window.addEventListener('beforeunload',function(e){if(!window._sakiReady){e.preventDefault();e.returnValue='';}});
        let sessionId = localStorage.getItem('saki_session_id');
        const savedNotificaciones = localStorage.getItem('saki_notificaciones');
        if (savedNotificaciones) {
            try {
                const notis = JSON.parse(savedNotificaciones);
                if (notis.length > 0 && notis[0].session_id && notis[0].session_id.includes('-')) {
                    sessionId = notis[0].session_id;
                    localStorage.setItem('saki_session_id', sessionId);
                }
            } catch (e) {}
        }
        if (!sessionId || !sessionId.includes('-')) {
            sessionId = 'session_' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random().toString(36).substring(2, 15));
            localStorage.setItem('saki_session_id', sessionId);
        }

        let menuItems = [], inventario = [], carrito = [], notificaciones = [], notificacionesCache = [], notificacionesNoLeidas = 0;
		let notificacionesCompletas = [], ultimaActualizacion = Date.now(), paginaVisible = true;
		let currentCustomizeItem = null, mesaId = null, nivel1Activo = null, nivel2Activo = null;
		let timersActivos = {}, intervalosTimer = {};
		let scrollTimeout = null;
		let filteredMenuItems = [];
		let _stockPrecalculado = {};
        let favoritos = JSON.parse(localStorage.getItem('saki_favoritos') || '[]');
        let historialPedidos = JSON.parse(localStorage.getItem('saki_historial') || '[]');
        let reconocimientoVoz = null;

        const preciosPorParroquia = {"Altagracia":3,"Antímano":7,"Candelaria":2,"Caricuao":7,"Caucagüita":7,"Catedral":3,"Chacao":5,"Coche":5,"El Cafetal":6,"El Junquito":7,"El Paraíso":4,"El Recreo":4,"El Valle":5,"Fila de Mariches":6,"La Dolorita":6,"La Pastora":3,"La Vega":4,"Las Minas":5,"Leoncio Martínez":6,"Macarao":7,"Nuestra Señora del Rosario":7,"Petare":6,"San Agustín":2,"San Bernardino":2,"San José":2,"San Juan":3,"San Pedro":4,"Santa Rosalía":3,"Santa Rosalía de Palermo":3,"Santa Teresa":3,"Sucre":7,"23 de Enero":4};
        const mensajesEstado = {'approved':{titulo:'✅ Pago confirmado',icono:'check-circle'},'rejected':{titulo:'❌ Pedido rechazado',icono:'times-circle'},'pending':{titulo:'⏳ Pedido pendiente',icono:'clock'}};
        const iconosCategorias = {'todos':'fa-utensils','entradas':'fa-leaf','sushi':'fa-fish','rolls':'fa-egg','tragos':'fa-wine-glass-alt','pokes':'fa-bowl-food','ensaladas':'fa-carrot','china':'fa-dragon','japonesa':'fa-sun','ofertas':'fa-fire','favoritos':'fa-star','ninos':'fa-child','ejecutivo':'fa-briefcase'};
        const categoriasPredefinidas = [
            {id:'todos',nombre:'Todos los platillos'},
            {id:'favoritos',nombre:'⭐ Favoritos'},
            {id:'entradas',nombre:'Entradas'},
            {id:'sushi',nombre:'Sushi'},
            {id:'rolls',nombre:'Rolls',subcategorias:['Rolls Fríos de 10 piezas','Rolls Tempura de 12 piezas']},
            {id:'tragos',nombre:'Tragos y bebidas'},
            {id:'pokes',nombre:'Pokes'},
            {id:'ensaladas',nombre:'Ensaladas'},
            {id:'china',nombre:'Comida China',subcategorias:['Arroz Chino','Arroz Cantones','Chopsuey','Lomey','Chow Mein','Fideos de Arroz','Tallarines Cantones','Mariscos','Foo Yong','Sopas','Entremeses']},
            {id:'japonesa',nombre:'Comida Japonesa',subcategorias:['Yakimeshi','Yakisoba','Pasta Udon','Churrasco']},
            {id:'ofertas',nombre:'OFERTAS ESPECIALES'},
            {id:'ninos',nombre:'Para Niños'},
            {id:'ejecutivo',nombre:'Combo Ejecutivo'}
        ];
        const urlParams = new URLSearchParams(window.location.search);
        mesaId = urlParams.get('mesa');

        // ── WiFi desde QR: detectar parámetros wifi_ssid y wifi_pwd ──
        // Si el QR incluye credenciales WiFi y el dispositivo no tiene conexión,
        // mostrar pantalla de ayuda para conectarse antes de abrir el menú.
        (function() {
            const wifiSsid = urlParams.get('wifi_ssid');
            const wifiPwd  = urlParams.get('wifi_pwd');
            if (!wifiSsid) return; // QR sin WiFi, continuar normalmente

            // Guardar en localStorage para uso futuro
            if (wifiSsid) localStorage.setItem('saki_wifi_ssid', wifiSsid);
            if (wifiPwd)  localStorage.setItem('saki_wifi_pwd', wifiPwd);

            // Detectar conexión real: navigator.onLine falla en casos de red sin internet
            // Usamos fetch a un recurso tiny del mismo dominio como sonda
            const _mostrarPantallaWifi = function() {
                document.body.innerHTML =
                    '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
                    'background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:2rem;text-align:center;font-family:Roboto,sans-serif">' +
                    '<div style="font-size:3rem;margin-bottom:1rem">📶</div>' +
                    '<h2 style="color:#FF9800;font-size:1.4rem;margin-bottom:.75rem">Conéctate al WiFi del restaurante</h2>' +
                    '<p style="font-size:1rem;opacity:.85;margin-bottom:1.5rem">Para acceder al menú necesitas estar conectado a:</p>' +
                    '<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:1.2rem 2rem;margin-bottom:2rem;border:1px solid rgba(255,255,255,.2)">' +
                    '<div style="font-size:1.3rem;font-weight:700;color:#fff;letter-spacing:1px">' + wifiSsid + '</div>' +
                    (wifiPwd ? '<div style="font-size:.85rem;opacity:.6;margin-top:.3rem">Contraseña: ' + wifiPwd + '</div>' : '') +
                    '</div>' +
                    '<p style="font-size:.85rem;opacity:.65;margin-bottom:2rem">Ve a Ajustes → WiFi, conéctate a la red y luego toca:</p>' +
                    '<button onclick="window.location.reload()" ' +
                    'style="background:linear-gradient(135deg,#D32F2F,#B71C1C);color:#fff;border:none;padding:.9rem 2rem;' +
                    'border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;letter-spacing:.5px;margin-bottom:1rem">' +
                    '🔄 Ya me conecté — Abrir Menú</button>' +
                    '<p style="font-size:.75rem;opacity:.4">O escanea el QR nuevamente</p>' +
                    '</div>';
            };
            // Primero probar con navigator.onLine rápido
            if (!navigator.onLine) {
                _mostrarPantallaWifi();
                return;
            }
            // Si onLine=true, verificar con fetch real (puede ser red sin internet)
            fetch(window.location.origin + '/SakiSushi0/favicon.ico?_=' + Date.now(), {
                method: 'HEAD', mode: 'no-cors', cache: 'no-store',
                signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined
            }).catch(function() {
                _mostrarPantallaWifi();
            });
            // No return aquí — si fetch falla, mostrará la pantalla,
            // si pasa, continua cargando normalmente
            if (false) {  // bloque original reemplazado por fetch
            if (!navigator.onLine) {
                document.body.innerHTML =
                    '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
                    'background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:2rem;text-align:center;font-family:Roboto,sans-serif">' +
                    '<div style="font-size:3rem;margin-bottom:1rem">📶</div>' +
                    '<h2 style="color:#FF9800;font-size:1.4rem;margin-bottom:.75rem">Conéctate al WiFi del restaurante</h2>' +
                    '<p style="font-size:1rem;opacity:.85;margin-bottom:1.5rem">Para acceder al menú necesitas estar conectado a:</p>' +
                    '<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:1.2rem 2rem;margin-bottom:2rem;border:1px solid rgba(255,255,255,.2)">' +
                    '<div style="font-size:1.3rem;font-weight:700;color:#fff;letter-spacing:1px">' + wifiSsid + '</div>' +
                    '<div style="font-size:.85rem;opacity:.6;margin-top:.3rem">Contraseña: ' + (wifiPwd ? wifiPwd : '(sin contraseña)') + '</div>' +
                    '</div>' +
                    '<p style="font-size:.85rem;opacity:.65;margin-bottom:2rem">Después de conectarte al WiFi, vuelve a escanear el QR o toca el botón:</p>' +
                    '<button onclick="window.location.reload()" ' +
                    'style="background:linear-gradient(135deg,#D32F2F,#B71C1C);color:#fff;border:none;padding:.9rem 2rem;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;letter-spacing:.5px">' +
                    '🔄 Ya me conecté — Abrir Menú</button></div>';
                return;
            }}  // cierre del if(false) dummy
            // Si ya tiene conexión, limpiar los params WiFi de la URL para que quede limpia
            if (window.history && window.history.replaceState) {
                const cleanParams = new URLSearchParams(urlParams);
                cleanParams.delete('wifi_ssid');
                cleanParams.delete('wifi_pwd');
                const cleanUrl = window.location.pathname + (cleanParams.toString() ? '?' + cleanParams.toString() : '');
                window.history.replaceState({}, '', cleanUrl);
            }
        })();
        let deliveryFormData = {parroquia:'',direccion:'',telefono:'',referencia:'',comprobante:null}, reservaFormData = {fecha:'',nombre:'',referencia:'',comprobante:null};
        let isUploading = false, uploadComplete = false;


        // ────────────────────────────────────────────────────────────
        // FUNCIONES DE TEMA (CLARO/OSCURO)
        // ────────────────────────────────────────────────────────────
        function toggleTema() {
            document.body.classList.toggle('tema-claro');
            const icono = document.querySelector('#themeToggle i');
            if (document.body.classList.contains('tema-claro')) {
                icono.className = 'fas fa-sun';
                localStorage.setItem('saki_tema', 'claro');
            } else {
                icono.className = 'fas fa-moon';
                localStorage.setItem('saki_tema', 'oscuro');
            }
        }

        function cargarTemaGuardado() {
            const tema = localStorage.getItem('saki_tema');
            if (tema === 'claro') {
                document.body.classList.add('tema-claro');
                document.querySelector('#themeToggle i').className = 'fas fa-sun';
            }
        }


        // ────────────────────────────────────────────────────────────
        // FUNCIONES DE FAVORITOS
        // ────────────────────────────────────────────────────────────
        function toggleFavorito(platilloId) {
            const index = favoritos.indexOf(platilloId);
            if (index === -1) {
                favoritos.push(platilloId);
                mostrarToast('⭐ Agregado a favoritos', 'success');
            } else {
                favoritos.splice(index, 1);
                mostrarToast('⭐ Eliminado de favoritos', 'info');
            }
            localStorage.setItem('saki_favoritos', JSON.stringify(favoritos));
            const catActiva = document.querySelector('.category-item.active')?.dataset.categoria;
            if (catActiva === 'favoritos') {
                renderizarMenuPaginado('favoritos', null, document.getElementById('searchInput').value);
            } else {
                renderizarMenuPaginado(catActiva === 'todos' ? null : catActiva, null, document.getElementById('searchInput').value);
            }
        }

        function esFavorito(platilloId) {
            return favoritos.includes(platilloId);
        }


        // ────────────────────────────────────────────────────────────
        // BÚSQUEDA POR VOZ
        // ────────────────────────────────────────────────────────────
        function iniciarBusquedaPorVoz() {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                mostrarToast('❌ Tu navegador no soporta búsqueda por voz', 'error');
                return;
            }
            
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            reconocimientoVoz = new SpeechRecognition();
            reconocimientoVoz.lang = 'es-ES';
            reconocimientoVoz.continuous = false;
            reconocimientoVoz.interimResults = false;
            
            const btn = document.getElementById('voiceSearchBtn');
            btn.classList.add('listening');
            btn.querySelector('i').className = 'fas fa-microphone-alt';
            
            reconocimientoVoz.onresult = function(event) {
                const transcripcion = event.results[0][0].transcript;
                document.getElementById('searchInput').value = transcripcion;
                document.getElementById('searchInput').dispatchEvent(new Event('input'));
                mostrarToast(`🔊 Buscando: "${transcripcion}"`, 'info');
                btn.classList.remove('listening');
                btn.querySelector('i').className = 'fas fa-microphone';
            };
            
            reconocimientoVoz.onerror = function() {
                btn.classList.remove('listening');
                btn.querySelector('i').className = 'fas fa-microphone';
                mostrarToast('❌ No se pudo reconocer la voz', 'error');
            };
            
            reconocimientoVoz.onend = function() {
                btn.classList.remove('listening');
                btn.querySelector('i').className = 'fas fa-microphone';
            };
            
            reconocimientoVoz.start();
        }


        // ────────────────────────────────────────────────────────────
        // HISTORIAL DE PEDIDOS
        // ────────────────────────────────────────────────────────────
        function agregarPedidoAHistorial(pedido) {
            // Enriquecer los items con imagen desde menuItems (por si no viene en pedido.items)
            const itemsConImagen = (pedido.items || []).map(item => {
                const platillo = menuItems.find(p => p.id === item.platilloId);
                return { ...item, imagen: item.imagen || platillo?.imagen || '' };
            });
            const nuevoPedido = {
                id: pedido.id,
                fecha: new Date().toISOString(),
                total: pedido.total,
                items: itemsConImagen,
                tipo: pedido.tipo
            };
            historialPedidos.unshift(nuevoPedido);
            if (historialPedidos.length > 5) historialPedidos.pop();
            localStorage.setItem('saki_historial', JSON.stringify(historialPedidos));
            actualizarBotonHistorial();
        }

        function actualizarBotonHistorial() {
            const btn = document.getElementById('historialPedidosBtn');
            const count = document.getElementById('historialCount');
            if (historialPedidos.length > 0) {
                btn.style.display = 'flex';
                count.textContent = historialPedidos.length;
            } else {
                btn.style.display = 'none';
            }
        }

        function abrirHistorialPedidos() {
            // Expandir el botón al abrir
            const btn = document.getElementById('historialPedidosBtn');
            if (btn) btn.classList.remove('comprimido');
            const modal = document.getElementById('historialModal');
            const body = document.getElementById('historialModalBody');
            if (historialPedidos.length === 0) {
                body.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No hay pedidos anteriores</p></div>';
            } else {
                body.innerHTML = historialPedidos.map(p => `
                    <div class="pedido-item" onclick="repetirPedido('${p.id}')">
                        <div style="display:flex; justify-content:space-between">
                            <span><strong>${window.formatearFechaGMT4(p.fecha)}</strong></span>
                            <span class="pedido-total">${formatBs(usdToBs(p.total))}</span>
                        </div>
                        <div class="pedido-fecha">${p.tipo} - ${p.items?.length || 0} items</div>
                        <div style="margin-top:.5rem; font-size:.8rem">
                            ${p.items?.slice(0,2).map(i => i.nombre).join(', ')}${p.items?.length > 2 ? '...' : ''}
                        </div>
                    </div>
                `).join('');
            }
            modal.classList.add('active');

            // Estrella de favoritos
            const favBtn = document.getElementById('previewFavBtn');
            if (favBtn) {
                favBtn.addEventListener('click', () => {
                    toggleFavorito(platilloId);
                    const esFav = esFavorito(platilloId);
                    favBtn.classList.toggle('active', esFav);
                    favBtn.dataset.tooltip = esFav ? 'Quitar de favoritos' : 'Agregar a favoritos';
                });
            }
        }

        function cerrarHistorial() {
            document.getElementById('historialModal').classList.remove('active');
            // Comprimir el botón 3 segundos después de cerrar el modal
            setTimeout(() => {
                const btn = document.getElementById('historialPedidosBtn');
                if (btn && btn.style.display !== 'none') btn.classList.add('comprimido');
            }, 3000);
        }

        async function repetirPedido(pedidoId) {
            const pedido = historialPedidos.find(p => p.id === pedidoId);
            if (!pedido || !pedido.items || pedido.items.length === 0) return;
            carrito = [];
            for (const item of pedido.items) {
                const platillo = menuItems.find(p => p.id === item.platilloId);
                const nombre  = platillo?.nombre  || item.nombre;
                // La imagen SIEMPRE se toma de menuItems primero (fuente de verdad),
                // luego del historial como fallback. crearPedidoBase no guarda imagen
                // en sus items, por eso el historial puede tenerla vacía.
                const imagen  = platillo?.imagen  || item.imagen  || '';
                const precio  = platillo?.precio  || item.precioUnitarioUSD || 0;
                for (let i = 0; i < (item.cantidad || 1); i++) {
                    carrito.push({
                        id: generarId('inst_'),
                        platilloId: item.platilloId,
                        nombre,
                        personalizacion: item.personalizacion || [],
                        imagen,
                        precioUnitarioUSD: precio,
                        precioUnitarioBs: usdToBs(precio),
                        subtotal: usdToBs(precio),
                        selectionType: (item.personalizacion?.length > 0) ? 'personalizado' : 'completo'
                    });
                }
            }
            if (carrito.length === 0) {
                mostrarToast('❌ No se pudo restaurar el pedido', 'error');
                return;
            }
            guardarCarrito();
            actualizarCarritoBadge();
            cerrarHistorial();
            mostrarToast('🔄 Pedido anterior restaurado', 'success');
            if (window.innerWidth <= 992) {
                document.getElementById('cartSidebar').classList.add('open');
                document.getElementById('overlay').classList.add('active');
            }
            // Enfocar el último ítem restaurado (igual que al agregar un platillo)
            _enfocarUltimoItemCarrito(carrito[carrito.length - 1]);
        }


        // ────────────────────────────────────────────────────────────
        // VISTA PREVIA
        // ────────────────────────────────────────────────────────────
        function abrirPreview(platilloId) {
            const platillo = menuItems.find(p => p.id === platilloId);
            if (!platillo) return;

            const modal = document.getElementById('previewModal');
            const body = document.getElementById('previewModalBody');

            // Usar el stock precalculado que ya descuenta carrito local + reservas de otros
            let stockDisponible = _stockPrecalculado[platilloId] ?? 999;

            const agotado = stockDisponible <= 0 || platillo.disponible === false;

            const ingredientesHtml = platillo.ingredientes
                ? Object.entries(platillo.ingredientes).map(([ingId, ingInfo]) => {
                    const ingrediente = inventario.find(i => i.id === ingId);
                    return `<li>${ingInfo.nombre || ingrediente?.nombre || ingId}</li>`;
                  }).join('')
                : '<li>Sin ingredientes específicos</li>';

            let _previewCantidad = 1;
            const _stockClass = agotado ? 'sold-out' : (stockDisponible < 5 ? 'low' : 'available');
            const _stockTxt   = agotado ? 'Agotado' : `${stockDisponible} disponibles`;

            body.innerHTML = `
                <div style="position:relative">
                    <div class="preview-image" style="background-image:url('${platillo.imagen || 'https://via.placeholder.com/400x300?text=Sushi'}')"></div>
                    <button id="previewFavBtn" class="favorite-btn ${esFavorito(platilloId) ? 'active' : ''}"
                        style="position:absolute;top:.6rem;left:.6rem;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-size:1.1rem;z-index:2"
                        data-tooltip="${esFavorito(platilloId) ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
                <h3 style="color:var(--primary); margin-bottom:.5rem">${platillo.nombre}</h3>
                <p style="margin-bottom:1rem">${platillo.descripcion || 'Delicioso platillo de nuestra carta'}</p>
                <div class="preview-ingredientes">
                    <h4><i class="fas fa-utensils"></i> Ingredientes</h4>
                    <ul>${ingredientesHtml}</ul>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; gap:.8rem; margin:1rem 0">
                    <div style="display:flex; align-items:center; gap:.6rem">
                        <button id="previewMinus" style="width:36px;height:36px;border-radius:50%;border:2px solid var(--accent);background:transparent;color:var(--accent);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s" ${agotado ? 'disabled' : ''}><i class="fas fa-minus"></i></button>
                        <input id="previewCantidad" type="number" min="1" max="${Math.min(stockDisponible, 99)}" value="1" inputmode="numeric"
                            style="width:52px;height:36px;text-align:center;font-size:1.1rem;font-weight:700;border:2px solid var(--accent);border-radius:8px;background:rgba(0,0,0,.3);color:var(--text-primary);-moz-appearance:textfield"
                            ${agotado ? 'disabled' : ''}>
                        <button id="previewPlus" style="width:36px;height:36px;border-radius:50%;border:2px solid var(--accent);background:transparent;color:var(--accent);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s" ${agotado ? 'disabled' : ''}><i class="fas fa-plus"></i></button>
                    </div>
                    <button id="previewPersonalizar" style="flex:1;padding:.55rem .8rem;border-radius:8px;border:2px solid rgba(128,128,128,.4);background:transparent;color:var(--text-primary);font-size:.88rem;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap" ${agotado ? 'disabled' : ''}>
                        <i class="fas fa-star" style="color:var(--accent)"></i> Personalizar
                    </button>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center">
                    <span id="previewPrecio" style="font-size:1.5rem; font-weight:700; color:var(--text-primary)">${formatBs(usdToBs(platillo.precio))}</span>
                    <span id="previewStock" class="stock-info"><i class="fas fa-box ${_stockClass}"></i> ${_stockTxt}</span>
                </div>
            `;

            // Favoritos
            const favBtn = document.getElementById('previewFavBtn');
            if (favBtn) {
                favBtn.addEventListener('click', () => {
                    toggleFavorito(platilloId);
                    const esFav = esFavorito(platilloId);
                    favBtn.classList.toggle('active', esFav);
                    favBtn.dataset.tooltip = esFav ? 'Quitar de favoritos' : 'Agregar a favoritos';
                });
            }

            // Cantidad
            const inputCant = document.getElementById('previewCantidad');
            const precioEl  = document.getElementById('previewPrecio');
            const stockEl   = document.getElementById('previewStock');

            function _actualizarPreview() {
                _previewCantidad = Math.max(1, Math.min(stockDisponible, parseInt(inputCant.value) || 1));
                inputCant.value = _previewCantidad;
                precioEl.textContent = formatBs(usdToBs(platillo.precio * _previewCantidad));
                const restante = stockDisponible - _previewCantidad;
                const sc = restante <= 0 ? 'sold-out' : (restante < 5 ? 'low' : 'available');
                stockEl.innerHTML = `<i class="fas fa-box ${sc}"></i> ${restante <= 0 ? 'Agotado' : restante + ' disponibles'}`;
            }

            document.getElementById('previewMinus').addEventListener('click', () => { inputCant.value = Math.max(1, _previewCantidad - 1); _actualizarPreview(); });
            document.getElementById('previewPlus').addEventListener('click',  () => { inputCant.value = Math.min(stockDisponible, _previewCantidad + 1); _actualizarPreview(); });
            inputCant.addEventListener('input', _actualizarPreview);

            // Personalizar
            document.getElementById('previewPersonalizar').addEventListener('click', () => {
                cerrarPreview();
                setTimeout(() => abrirPersonalizacion(platilloId), 200);
            });

            // Agregar al carrito
            document.getElementById('previewAddToCart').onclick = () => {
                if (agotado) return;
                for (let i = 0; i < _previewCantidad; i++) agregarAlCarrito(platilloId);
                cerrarPreview();
            };

            modal.classList.add('active');
        }

        function cerrarPreview() {
            document.getElementById('previewModal').classList.remove('active');
        }


        // ────────────────────────────────────────────────────────────
        // NOTIFICACIONES PUSH (AUTOMÁTICAS) - RESTAURADO
        // ────────────────────────────────────────────────────────────
        function urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
            return outputArray;
        }

        async function solicitarPermisoPushAuto() {
            if (!('Notification' in window) || !('serviceWorker' in navigator) || location.protocol !== 'https:') return;
            // Si el permiso ya fue concedido en cualquier sesión anterior, solo registrar silenciosamente
            // Si fue denegado, no volver a pedir jamás
            if (Notification.permission === 'denied') return;
            const esBrave = navigator.brave && await navigator.brave.isBrave().catch(() => false);
            const registrarSuscripcion = async () => {
                try {
                    const registration = await navigator.serviceWorker.register('/SakiSushi0/sw.js', { scope: '/SakiSushi0/' });
                    await navigator.serviceWorker.ready;
                    let subscription = await registration.pushManager.getSubscription();
                    if (!subscription) {
                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array('BC6oJ4E+5pGIn4icpzCBLMi6/nk+1JJenrUA41uJrAs1ELraSw5ctvRAlh8sHVldqzBXUtEwEeFKBm0/hmuM9EY=')
                        });
                    }
                    if (esBrave && subscription.endpoint.includes('fcm.googleapis.com'))
                        console.warn('⚠️ Brave: activa "Usar Google Services para mensajería push" en brave://settings/privacy');
                    const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh'))));
                    const auth   = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))));
                    await window.supabaseClient.from('push_subscriptions').upsert([{
                        session_id: sessionId, endpoint: subscription.endpoint, p256dh, auth, user_agent: navigator.userAgent
                    }], { onConflict: 'endpoint' });
                } catch (e) { console.warn('⚠️ Push no disponible:', e.message); }
            };
            if (Notification.permission === 'granted') {
                // Permiso ya concedido — registrar sin mostrar ningún diálogo
                await registrarSuscripcion();
            } else {
                // Primera vez — pedir permiso una sola vez
                const perm = await Notification.requestPermission();
                if (perm === 'granted') await registrarSuscripcion();
            }
        }


        // ────────────────────────────────────────────────────────────
        // FUNCIONES DE STOCK Y CARGA
        // ────────────────────────────────────────────────────────────
        async function getStockDisponible(ingredienteId) {
            const cache = window.stockCache.get(ingredienteId);
            if (cache !== undefined) return cache;
            const ingrediente = inventario.find(i => i.id === ingredienteId);
            if (!ingrediente) return 0;
            let reservadoEnCarrito = 0;
            carrito.forEach(instancia => {
                if (instancia.platilloId) {
                    const platillo = menuItems.find(p => p.id === instancia.platilloId);
                    if (platillo && platillo.ingredientes && platillo.ingredientes[ingredienteId] && !instancia.personalizacion.includes(ingredienteId)) {
                        reservadoEnCarrito += platillo.ingredientes[ingredienteId].cantidad || 1;
                    }
                }
            });
            const disponible = (ingrediente.stock || 0) - (ingrediente.reservado || 0) - reservadoEnCarrito;
            window.stockCache.set(ingredienteId, disponible);
            return disponible;
        }

        // Actualiza solo los elementos de stock en las tarjetas ya renderizadas,
        // sin reconstruir el DOM completo. Llama siempre después de precalcularStockMenu().
        function actualizarStockTarjetas() {
            document.querySelectorAll('.menu-card').forEach(card => {
                const btn = card.querySelector('.btn-add');
                const platilloId = btn ? btn.getAttribute('onclick')?.match(/agregarAlCarrito\('([^']+)'\)/)?.[1] : null;
                if (!platilloId) return;
                const stock = _stockPrecalculado[platilloId] ?? 999;
                const agotado = stock <= 0;
                const sc = agotado ? 'sold-out' : (stock < 5 ? 'low' : 'available');
                // Actualizar stock-info
                const stockInfo = card.querySelector('.stock-info:not(.menu-card-footer .stock-info)') 
                               || card.querySelector('div.stock-info');
                if (stockInfo) {
                    if (agotado) {
                        stockInfo.innerHTML = '';
                    } else {
                        stockInfo.innerHTML = `<i class="fas fa-box ${sc}"></i><span>${stock} disponibles</span>`;
                    }
                }
                // Actualizar badge agotado
                const overlay = card.querySelector('.menu-card-sold-overlay');
                const badge   = card.querySelector('.menu-card-badge');
                if (agotado && !overlay) {
                    const imgDiv = card.querySelector('.menu-card-image');
                    if (imgDiv) imgDiv.insertAdjacentHTML('beforeend', '<div class="menu-card-sold-overlay"><span>🚫 Agotado</span></div>');
                } else if (!agotado && overlay) {
                    overlay.remove();
                }
                if (!agotado && !badge && stock < 5) {
                    const imgDiv = card.querySelector('.menu-card-image');
                    if (imgDiv) imgDiv.insertAdjacentHTML('beforeend', '<div class="menu-card-badge low"><i class="fas fa-exclamation-triangle"></i> Últimas</div>');
                } else if ((agotado || stock >= 5) && badge) {
                    badge.remove();
                }
                // Deshabilitar/habilitar botones
                card.querySelectorAll('.btn-add, .btn-customize').forEach(b => {
                    b.disabled = agotado;
                    b.style.opacity = agotado ? '0.4' : '';
                });
                card.classList.toggle('agotado', agotado);
            });
        }

        function precalcularStockMenu() {
            _stockPrecalculado = {};
            // Mapa de cuántas unidades reserva el carrito actual por ingrediente
            const reservadoPorCarrito = {};
            carrito.forEach(inst => {
                const pl = menuItems.find(p => p.id === inst.platilloId);
                if (!pl?.ingredientes) return;
                Object.entries(pl.ingredientes).forEach(([ingId, ingInfo]) => {
                    if (!inst.personalizacion?.includes(ingId))
                        reservadoPorCarrito[ingId] = (reservadoPorCarrito[ingId] || 0) + (ingInfo.cantidad || 1);
                });
            });
            for (const item of menuItems) {
                if (item.ingredientes && Object.keys(item.ingredientes).length > 0) {
                    let minStock = Infinity;
                    for (const [ingId, ingInfo] of Object.entries(item.ingredientes)) {
                        const ing = inventario.find(i => i.id === ingId);
                        if (!ing) { minStock = 0; break; }
                        // stock real del servidor ya descuenta lo confirmado; 
                        // reservado = lo que otros clientes tienen pendiente de pago
                        // reservadoPorCarrito = lo que este cliente ya puso en su carrito
                        const libre = (ing.stock || 0) - (ing.reservado || 0) - (reservadoPorCarrito[ingId] || 0);
                        minStock = Math.min(minStock, Math.floor(libre / (ingInfo.cantidad || 1)));
                    }
                    _stockPrecalculado[item.id] = minStock === Infinity ? 999 : Math.max(0, minStock);
                } else {
                    _stockPrecalculado[item.id] = item.stock_maximo || 999;
                }
            }
        }

        // Carga menú sin renderizar (para uso en carga paralela con inventario)
        async function cargarMenuSinRenderizar() {
    try {
        // CORREGIDO: Ya NO filtramos por disponible === true
        const { data, error } = await window.supabaseClient.from('menu').select('*');
        if (error) throw error;
        menuItems = data || [];
        menuItems.sort((a, b) => a.nombre.localeCompare(b.nombre));
        filteredMenuItems = [...menuItems];
        _precargarImagenes(menuItems);
    } catch (error) { console.error('Error cargando menú:', error); mostrarToast('Error al cargar el menú', 'error'); }
}

        async function cargarMenu() {
            await cargarMenuSinRenderizar();
            precalcularStockMenu();
            const ultimaCategoria = localStorage.getItem('saki_ultima_categoria');
            if (ultimaCategoria && ultimaCategoria !== 'todos') {
                renderizarMenuPaginado(ultimaCategoria);
                const categoriaItem = document.querySelector(`.category-item[data-categoria="${ultimaCategoria}"]`);
                if (categoriaItem) {
                    document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
                    categoriaItem.classList.add('active');
                    document.getElementById('categoryTitle').textContent = categoriaItem.querySelector('span').textContent.replace(/^[^\s]+\s/, '');
                }
            } else renderizarMenuPaginado();
        }

        async function cargarInventario() {
            try {
                const { data, error } = await window.supabaseClient.from('inventario').select('*');
                if (error) throw error;
                inventario = data || [];
                window.stockCache.invalidate();
                precalcularStockMenu(); // Precálculo síncrono inmediato
            } catch (error) { console.error('Error cargando inventario:', error); }
        }

        // ============================================
        // RENDER CON PAGINACIÓN — 6 por página
        // • Todas las tarjetas de la página se renderizan en un solo RAF (sin await en el loop)
        // • Imágenes precargadas en background al cargar el menú
        // • IntersectionObserver hace fade-in al entrar al viewport
        // • Paginación con botones Anterior / números / Siguiente
        // ============================================
        const ITEMS_POR_PAGINA = 6;
        let _paginaActual = 1;
        let _imageCache = new Set();

        function _precargarImagenes(items) {
            items.forEach(item => {
                if (item.imagen && !_imageCache.has(item.imagen)) {
                    _imageCache.add(item.imagen);
                    const img = new Image();
                    img.src = item.imagen;
                }
            });
        }

        function _htmlTarjeta(item) {
    const stock = _stockPrecalculado[item.id] ?? 999;
    const agotado = stock <= 0 || item.disponible === false;  // <-- MODIFICADO: incluye disponible === false
    const sc = agotado ? 'sold-out' : (stock < 5 ? 'low' : 'available');
    const fav = esFavorito(item.id) ? 'active' : '';
    const img = item.imagen || 'https://via.placeholder.com/400x300?text=Sushi';
    const badge = agotado
        ? '<div class="menu-card-sold-overlay"><span>🚫 Agotado</span></div>'
        : (sc === 'low' ? '<div class="menu-card-badge low"><i class="fas fa-exclamation-triangle"></i> Últimas</div>' : '');
    const footer = agotado
        ? '<span class="stock-info"><i class="fas fa-info-circle"></i> No disponible</span>'
        : `<button class="btn-add" onclick="agregarAlCarrito('${item.id}')" data-tooltip="Agregar al carrito"><i class="fas fa-plus"></i></button><button class="btn-customize" onclick="abrirPersonalizacion('${item.id}')" data-tooltip="Personalizar platillo y cantidades"><i class="fas fa-star"></i> Personalizar</button>`;
    const stockInfo = agotado ? '' : `<div class="stock-info"><i class="fas fa-box ${sc}"></i><span>${stock} disponibles</span></div>`;
    return `<div class="menu-card${agotado?' agotado':''}"><div class="menu-card-image" style="background-image:url('${img}')"${agotado?'':` onclick="abrirPreview('${item.id}')"`}>${badge}</div><div class="menu-card-content"><div class="menu-card-header"><div style="display:flex;align-items:center"><button class="favorite-btn ${fav}" onclick="event.stopPropagation();toggleFavorito('${item.id}')" data-tooltip="${fav?'Quitar de favoritos':'Agregar a favoritos'}"><i class="fas fa-star"></i></button><h3 class="menu-card-title">${item.nombre}</h3></div><span class="menu-card-price">${formatBs(usdToBs(item.precio))}</span></div><p class="menu-card-description">${item.descripcion||''}</p><div class="menu-card-footer">${footer}</div>${stockInfo}</div></div>`;
}

        function _htmlPaginacion(paginaActual, totalPaginas) {
            if (totalPaginas <= 1) return '';
            let inicio = Math.max(1, paginaActual - 1);
            let fin    = Math.min(totalPaginas, inicio + 3);
            if (fin - inicio < 3) inicio = Math.max(1, fin - 3);
            let nums = '';
            for (let p = inicio; p <= fin; p++) {
                nums += `<button class="pagination-num ${p === paginaActual ? 'active' : ''}" onclick="irAPagina(${p})">${p}</button>`;
            }
            return `<div class="pagination-controls"><button class="pagination-btn" onclick="irAPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Anterior</button><div class="pagination-nums">${nums}</div><button class="pagination-btn" onclick="irAPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}>Siguiente <i class="fas fa-chevron-right"></i></button></div>`;
        }

        function renderizarMenuPaginado(filtroCategoria = null, filtroSubcategoria = null, busqueda = '') {
    let items = [...menuItems];
    // CORREGIDO: NO filtrar por disponible === false, solo filtros normales
    if (filtroCategoria === 'favoritos')       items = items.filter(i => favoritos.includes(i.id));
    else if (filtroCategoria === 'ofertas')    items = items.filter(i => i.categoria === 'Ofertas Especiales' || i.precio < 10);
    else if (filtroCategoria && filtroCategoria !== 'todos') items = items.filter(i => i.categoria === filtroCategoria);
    if (filtroSubcategoria) items = items.filter(i => i.subcategoria === filtroSubcategoria);
    if (busqueda) {
        const t = busqueda.toLowerCase().split(/\s+/).filter(x => x.length > 0);
        items = items.filter(i => t.every(x => i.nombre.toLowerCase().includes(x)));
    }
    filteredMenuItems = items;
    _paginaActual = 1;
    if (filtroCategoria) localStorage.setItem('saki_ultima_categoria', filtroCategoria);
    else if (filtroCategoria === null) localStorage.setItem('saki_ultima_categoria', 'todos');
    renderizarPaginaActual();
}

        function renderizarPaginaActual() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    if (filteredMenuItems.length === 0) {
        grid.innerHTML = '<div class="loading-container"><p>No hay platillos</p></div>';
        return;
    }
    const totalPaginas = Math.ceil(filteredMenuItems.length / ITEMS_POR_PAGINA);
    _paginaActual = Math.max(1, Math.min(_paginaActual, totalPaginas));
    const pagItems = filteredMenuItems.slice((_paginaActual - 1) * ITEMS_POR_PAGINA, _paginaActual * ITEMS_POR_PAGINA);
    // Render directo, síncrono, sin observer ni RAF — tarjetas siempre visibles
    grid.innerHTML = pagItems.map(_htmlTarjeta).join('') + _htmlPaginacion(_paginaActual, totalPaginas);
}

        window.irAPagina = function(pagina) {
            const totalPaginas = Math.ceil(filteredMenuItems.length / ITEMS_POR_PAGINA);
            if (pagina < 1 || pagina > totalPaginas) return;
            _paginaActual = pagina;
            renderizarPaginaActual();
            document.getElementById('menuGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        function cargarCategorias() {
            const categoryList = document.getElementById('categoryList');
            let html = '';
            categoriasPredefinidas.forEach(cat => {
                const icono = iconosCategorias[cat.id] || 'fa-utensils';
                const activeClass = cat.id === 'todos' ? 'active' : '';
                html += `<li class="category-item ${activeClass}" data-categoria="${cat.id}"><span><i class="fas ${icono}"></i> ${cat.nombre}</span>${cat.subcategorias ? '<i class="fas fa-chevron-right"></i>' : ''}</li>`;
                if (cat.subcategorias) {
                    html += `<ul class="subcategory-list" data-categoria="${cat.id}">`;
                    cat.subcategorias.forEach(sub => html += `<li class="subcategory-item" data-subcategoria="${sub}">${sub}</li>`);
                    html += `</ul>`;
                }
            });
            categoryList.innerHTML = html;
            
            document.querySelectorAll('.category-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const categoria = item.dataset.categoria;
                    const tieneSubcategorias = item.querySelector('i.fa-chevron-right') !== null;
                    if (tieneSubcategorias && categoria !== 'todos' && categoria !== 'favoritos') {
                        const subList = document.querySelector(`.subcategory-list[data-categoria="${categoria}"]`);
                        if (subList) {
                            subList.classList.toggle('expanded');
                            // Sincronizar con el historial de navegación
                            if (typeof _sincronizarBackStack === 'function') _sincronizarBackStack();
                        }
                        return;
                    }
                    document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
                    item.classList.add('active');
                    document.querySelectorAll('.subcategory-list').forEach(list => list.classList.remove('expanded'));
                    document.getElementById('categoryTitle').textContent = categoria === 'todos' ? 'Menú' : item.querySelector('span').textContent.replace(/^[^\s]+\s/, '');
                    document.getElementById('searchInput').value = '';
                    renderizarMenuPaginado(categoria === 'todos' ? null : categoria);
                    if (window.innerWidth <= 992) cerrarMenuCategorias();
                });
            });
            
            document.querySelectorAll('.subcategory-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const subcategoria = item.dataset.subcategoria;
                    const categoria = item.closest('.subcategory-list').dataset.categoria;
                    document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
                    document.querySelector(`.category-item[data-categoria="${categoria}"]`).classList.add('active');
                    document.querySelectorAll('.subcategory-item').forEach(s => s.classList.remove('active'));
                    item.classList.add('active');
                    document.getElementById('categoryTitle').textContent = subcategoria;
                    document.getElementById('searchInput').value = '';
                    renderizarMenuPaginado(categoria, subcategoria);
                    if (window.innerWidth <= 992) cerrarMenuCategorias();
                });
            });
        }

        function resetToAllCategories(scroll = true) {
            cerrarTodosLosPaneles();
            document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
            const todosItem = document.querySelector('.category-item[data-categoria="todos"]');
            if (todosItem) todosItem.classList.add('active');
            document.querySelectorAll('.subcategory-list').forEach(l => l.classList.remove('expanded'));
            document.getElementById('categoryTitle').textContent = 'Menú';
            document.getElementById('searchInput').value = '';
            renderizarMenuPaginado(null);
            if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function selectCategoria(cat) {
            document.querySelector(`.category-item[data-categoria="${cat}"]`)?.click();
        }

        function actualizarCarritoBadge() {
            const cartBadge = document.getElementById('cartBadge');
            const totalItems = carrito.length;
            if (totalItems > 0) {
                cartBadge.textContent = totalItems;
                cartBadge.style.display = 'block';
                cartBadge.classList.add('pop');
                setTimeout(() => cartBadge.classList.remove('pop'), 300);
            } else cartBadge.style.display = 'none';
        }

        async function agregarAlCarrito(platilloId) {
            const platillo = menuItems.find(p => p.id === platilloId);
            if (!platillo) return;
            const nuevaInstancia = {
                id: generarId('inst_'),
                platilloId: platillo.id,
                nombre: platillo.nombre,
                personalizacion: [],
                imagen: platillo.imagen,
                precioUnitarioUSD: platillo.precio,
                precioUnitarioBs: usdToBs(platillo.precio),
                subtotal: usdToBs(platillo.precio),
                selectionType: 'completo'
            };
            carrito.push(nuevaInstancia);
            guardarCarrito();
            actualizarCarritoBadge();
            window.stockCache.invalidate();
            mostrarToast('Agregado', 'success');
            if (window.innerWidth <= 992) {
                document.getElementById('cartSidebar').classList.add('open');
                document.getElementById('overlay').classList.add('active');
                document.getElementById('categorySidebar').classList.remove('open');
            } else {
                iniciarSeguimientoScroll();
            }
            // _enfocarUltimoItemCarrito setea nivel1Activo/nivel2Activo y llama
            // a actualizarCarritoUI internamente para que el HTML nazca expandido,
            // luego hace scroll al ítem en el siguiente frame de pintura.
            _enfocarUltimoItemCarrito(nuevaInstancia);
        }

        function guardarCarrito() {
            localStorage.setItem('saki_carrito', JSON.stringify({ items: carrito, timestamp: Date.now() }));
            precalcularStockMenu();
            actualizarStockTarjetas();
        }

        function restaurarCarrito() {
            const saved = localStorage.getItem('saki_carrito');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.items && data.items.length > 0 && Date.now() - data.timestamp < 3600000) {
                        window.pedidoAnterior = data.items;
                        mostrarDialogoContinuar();
                    } else if (data.items && data.items.length > 0) localStorage.removeItem('saki_carrito');
                } catch (e) { console.error('Error restaurando carrito:', e); }
            }
        }

        function actualizarCarritoUI() {
            const cartItems = document.getElementById('cartItems');
            const cartFooter = document.getElementById('cartFooter');
            const cartTotal = document.getElementById('cartTotal');
            const cartButtons = document.getElementById('cartButtons');
            
            if (carrito.length === 0) {
                cartItems.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-basket"></i><p>Tu carrito está vacío</p></div>';
                cartFooter.style.display = 'none';
                nivel1Activo = null; nivel2Activo = null;
                detenerSeguimientoScroll();
                const indicatorContainer = document.getElementById('cartIndicatorContainer');
                if (indicatorContainer) indicatorContainer.innerHTML = '';
                return;
            }
            
            cartFooter.style.display = 'block';
            const grupos = agruparItemsJerarquicamente();
            let totalGeneral = 0, html = '';
            
            grupos.forEach(grupo => {
                totalGeneral += grupo.subtotal;
                const nivel1Expandido = nivel1Activo === grupo.id;
                html += `<div class="nivel1-group"><div class="nivel1-header" onclick="toggleNivel1('${grupo.id}')"><div class="header-row"><div class="nombre"><i class="fas fa-chevron-right" id="icon1-${grupo.id}" ${nivel1Expandido ? 'class="rotated"' : ''}></i><span>🍣 ${grupo.nombre}</span></div><div style="display:flex;align-items:center;gap:.5rem"><span class="cantidad-total">${grupo.cantidad} unid.</span><button class="btn-borrar-grupo" onclick="event.stopPropagation();borrarGrupoNivel1('${grupo.id}')" title="Eliminar todos"><i class="fas fa-trash-alt"></i></button></div></div><div class="header-details"><span><i class="fas fa-tag"></i> Total: ${formatBs(grupo.subtotal)}</span></div></div><div class="nivel2-container ${nivel1Expandido ? 'expanded' : ''}" id="nivel1-${grupo.id}">`;
                
                grupo.subgrupos.forEach(subgrupo => {
                    const subgrupoId = `${grupo.id}_${subgrupo.id}`;
                    const nivel2Expandido = nivel2Activo === subgrupoId;
                    let descripcionPersonalizacion = 'Completo';
                    if (subgrupo.personalizacion.length > 0) {
                        const ingredientesNombres = subgrupo.personalizacion.map(p => inventario.find(i => i.id === p)?.nombre || p).join(', ');
                        descripcionPersonalizacion = `Sin: ${ingredientesNombres}`;
                    }
                    html += `<div class="nivel2-group"><div class="nivel2-header" onclick="toggleNivel2('${subgrupoId}','${grupo.id}')"><div class="header-row"><div class="nombre"><i class="fas fa-chevron-right" id="icon2-${subgrupoId}" ${nivel2Expandido ? 'class="rotated"' : ''}></i><span>🔹 ${descripcionPersonalizacion}</span></div><div style="display:flex;align-items:center;gap:.5rem"><span class="cantidad-subtotal">${subgrupo.cantidad} unid.</span><button class="btn-borrar-grupo" onclick="event.stopPropagation();borrarGrupoNivel2('${subgrupoId}')" title="Eliminar todos"><i class="fas fa-trash-alt"></i></button></div></div><div class="header-details"><span><i class="fas fa-tag"></i> Subtotal: ${formatBs(subgrupo.subtotal)}</span></div></div><div class="nivel3-container ${nivel2Expandido ? 'expanded' : ''}" id="nivel2-${subgrupoId}">`;
                    
                    subgrupo.items.forEach((item, index) => {
                        const ingredientesNombres = item.personalizacion.map(p => inventario.find(i => i.id === p)?.nombre || p).join(', ');
                        html += `<div class="nivel3-item" data-instancia-id="${item.id}"><div class="item-image" style="background-image:url('${item.imagen || 'https://via.placeholder.com/40'}')"></div><div class="item-info"><span class="item-number">#${index + 1}</span><span class="item-name">${item.nombre}</span>${item.personalizacion.length > 0 ? `<div class="personalizacion"><i class="fas fa-utensil-spoon"></i> ${ingredientesNombres}</div>` : ''}</div><div class="item-precio">${formatBs(item.subtotal)}</div><button class="btn-remove-item" onclick="eliminarInstancia('${item.id}')" title="Eliminar"><i class="fas fa-trash"></i></button></div>`;
                    });
                    html += `</div></div>`;
                });
                html += `</div></div>`;
            });
            
            const flechasHTML = `<div class="scroll-indicator-cascade" onclick="irABotonesAccion()"><i class="fas fa-chevron-down cascade-arrow"></i><i class="fas fa-chevron-down cascade-arrow"></i><i class="fas fa-chevron-down cascade-arrow"></i><span class="cascade-text">Toca y haz tu pedido</span></div>`;
            cartItems.innerHTML = carrito.length > 0
                ? `<div class="cart-items-inner">${html}</div>` + flechasHTML
                : html;
            if (carrito.length > 0) iniciarSeguimientoScroll();
            const indicatorContainer = document.getElementById('cartIndicatorContainer');
            if (indicatorContainer) indicatorContainer.innerHTML = '';
            // Limpiar clone del overlay para que se reconstruya con el nuevo HTML
            const fOverlay = document.getElementById('flechasOverlay');
            if (fOverlay) { fOverlay.innerHTML = ''; fOverlay.style.display = 'none'; }
            cartTotal.textContent = formatBs(totalGeneral);
            cartButtons.innerHTML = '';
            
            if (mesaId) cartButtons.innerHTML = `<button class="btn-primary" onclick="abrirConfirmacionMesa()" data-tooltip="Pedir para llevar a la mesa"><i class="fas fa-check"></i> Pedir en Mesa</button>`;
            else cartButtons.innerHTML = `<button class="btn-primary" onclick="iniciarProcesoDelivery()" data-tooltip="Solicitar delivery a domicilio"><i class="fas fa-motorcycle"></i> Pedir Delivery</button><button class="btn-secondary" onclick="iniciarProcesoReserva()" data-tooltip="Reservar para fecha futura"><i class="fas fa-calendar-alt"></i> Hacer Reserva</button>`;
        }

        window.addEventListener('resize', function() { if (carrito.length > 0) actualizarCarritoUI(); });

        function agruparItemsJerarquicamente() {
            const gruposPorPlatillo = {};
            carrito.forEach(instancia => {
                if (!gruposPorPlatillo[instancia.platilloId]) gruposPorPlatillo[instancia.platilloId] = { platilloId: instancia.platilloId, nombre: instancia.nombre, imagen: instancia.imagen, items: [] };
                gruposPorPlatillo[instancia.platilloId].items.push(instancia);
            });
            
            const resultado = [];
            Object.values(gruposPorPlatillo).forEach(grupoPlatillo => {
                const subgrupos = {};
                grupoPlatillo.items.forEach(instancia => {
                    const personalizacionKey = instancia.personalizacion.sort().join('|');
                    if (!subgrupos[personalizacionKey]) subgrupos[personalizacionKey] = {
                        id: `${grupoPlatillo.platilloId}_${personalizacionKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
                        platilloId: grupoPlatillo.platilloId,
                        nombre: grupoPlatillo.nombre,
                        personalizacion: instancia.personalizacion,
                        items: [],
                        cantidad: 0,
                        subtotal: 0
                    };
                    subgrupos[personalizacionKey].items.push(instancia);
                    subgrupos[personalizacionKey].cantidad++;
                    subgrupos[personalizacionKey].subtotal += instancia.subtotal;
                });
                resultado.push({
                    id: grupoPlatillo.platilloId.replace(/[^a-zA-Z0-9]/g, '_'),
                    platilloId: grupoPlatillo.platilloId,
                    nombre: grupoPlatillo.nombre,
                    imagen: grupoPlatillo.imagen,
                    items: grupoPlatillo.items,
                    cantidad: grupoPlatillo.items.length,
                    subtotal: grupoPlatillo.items.reduce((sum, i) => sum + i.subtotal, 0),
                    subgrupos: Object.values(subgrupos)
                });
            });
            return resultado;
        }

        function eliminarInstancia(instanciaId) {
            carrito = carrito.filter(i => i.id !== instanciaId);
            guardarCarrito();
            actualizarCarritoUI();
            actualizarCarritoBadge();
            window.stockCache.invalidate();
            if (carrito.length === 0) detenerSeguimientoScroll();
        }

        function toggleNivel1(grupoId) {
            const nivel1Container = document.getElementById(`nivel1-${grupoId}`);
            const icon = document.getElementById(`icon1-${grupoId}`);
            if (nivel1Activo && nivel1Activo !== grupoId) {
                const nivelAnterior = document.getElementById(`nivel1-${nivel1Activo}`);
                const iconAnterior = document.getElementById(`icon1-${nivel1Activo}`);
                if (nivelAnterior) nivelAnterior.classList.remove('expanded');
                if (iconAnterior) iconAnterior.classList.remove('rotated');
                if (nivel2Activo && nivel2Activo.startsWith(nivel1Activo)) {
                    const nivel2Anterior = document.getElementById(`nivel2-${nivel2Activo}`);
                    const icon2Anterior = document.getElementById(`icon2-${nivel2Activo}`);
                    if (nivel2Anterior) nivel2Anterior.classList.remove('expanded');
                    if (icon2Anterior) icon2Anterior.classList.remove('rotated');
                    nivel2Activo = null;
                }
            }
            if (nivel1Container) {
                nivel1Container.classList.toggle('expanded');
                if (icon) icon.classList.toggle('rotated');
                if (nivel1Container.classList.contains('expanded')) nivel1Activo = grupoId;
                else { nivel1Activo = null; nivel2Activo = null; }
            }
        }

        function toggleNivel2(subgrupoId, grupoPadreId) {
            const nivel2Container = document.getElementById(`nivel2-${subgrupoId}`);
            const icon = document.getElementById(`icon2-${subgrupoId}`);
            if (nivel2Activo && nivel2Activo !== subgrupoId && nivel2Activo.startsWith(grupoPadreId)) {
                const nivel2Anterior = document.getElementById(`nivel2-${nivel2Activo}`);
                const icon2Anterior = document.getElementById(`icon2-${nivel2Activo}`);
                if (nivel2Anterior) nivel2Anterior.classList.remove('expanded');
                if (icon2Anterior) icon2Anterior.classList.remove('rotated');
            }
            if (nivel2Container) {
                nivel2Container.classList.toggle('expanded');
                if (icon) icon.classList.toggle('rotated');
                if (nivel2Container.classList.contains('expanded')) nivel2Activo = subgrupoId;
                else nivel2Activo = null;
            }
        }

        function abrirPersonalizacion(platilloId) {
            currentCustomizeItem = null;
            const platillo = menuItems.find(p => p.id === platilloId);
            if (!platillo) return;
            currentCustomizeItem = { ...platillo, cantidad: 1, ingredientesQuitados: [], selectionType: 'completo' };
            const modalBody = document.getElementById('customizeModalBody');
            
            Promise.all(Object.entries(platillo.ingredientes || {}).map(async ([ingId, ingInfo]) => {
                const ingrediente = inventario.find(i => i.id === ingId);
                const stockDisp = await getStockDisponible(ingId);
                const disponible = stockDisp >= (ingInfo.cantidad || 1);
                const precio = ingrediente?.precio_unitario || 0;
                return `<div style="margin-bottom:.8rem; padding:.7rem; background:var(--customize-row-bg); border-radius:var(--radius-sm); ${!disponible ? 'opacity:0.5;' : ''}"><label style="display:flex; align-items:center; gap:.8rem; cursor:${disponible ? 'pointer' : 'not-allowed'}; color:var(--customize-text)"><input type="checkbox" class="ingrediente-check" data-ingrediente="${ingId}" data-precio="${precio}" ${!disponible ? 'disabled' : ''}><div style="flex:1"><div style="font-weight:500">${ingInfo.nombre || ingId}</div><div style="font-size:.85rem; color:var(--customize-subtext)">Valor: ${formatBs(usdToBs(precio))}${!disponible ? '<span style="color:var(--danger); margin-left:.5rem">(Sin stock)</span>' : ''}</div></div></label></div>`;
            })).then(ingredientesHtml => {
                const completoOption = `<div id="completoOptionDiv" class="completo-option ${currentCustomizeItem.selectionType === 'completo' ? 'activo' : ''}" onclick="selectCompleto()"><div style="display:flex; align-items:center; gap:.8rem"><div id="completoCircle" class="completo-circle ${currentCustomizeItem.selectionType === 'completo' ? 'activo' : ''}">${currentCustomizeItem.selectionType === 'completo' ? '<i class="fas fa-check" style="font-size:.7rem"></i>' : ''}</div><div style="flex:1"><div style="font-weight:600; color:var(--customize-text)">Platillo completo</div><div style="font-size:.85rem; color:var(--customize-subtext)">Con todos los ingredientes</div></div></div></div>`;
                modalBody.innerHTML = `<div style="display:flex; gap:1rem; margin-bottom:1.5rem; background:var(--customize-row-bg); padding:.8rem; border-radius:var(--radius-sm)"><img src="${platillo.imagen || 'https://via.placeholder.com/80'}" style="width:80px; height:80px; object-fit:cover; border-radius:var(--radius-sm)"><div><h4 style="font-size:1.2rem; margin-bottom:.3rem; color:var(--customize-text)">${platillo.nombre}</h4><p style="color:var(--customize-subtext); font-size:.9rem">${platillo.descripcion || ''}</p><p style="font-weight:600; color:var(--accent-text); font-size:1rem">Base: ${formatBs(usdToBs(platillo.precio))}</p></div></div><div style="margin-bottom:1.5rem"><label style="display:block; margin-bottom:.5rem; font-weight:600; color:var(--customize-text)">Cantidad:</label><div style="display:flex; align-items:center; gap:1rem"><button class="btn-icon" onclick="actualizarCantidadPersonalizacion(-1)" style="width:36px; height:36px; border:1px solid var(--customize-border); background:var(--customize-row-bg); border-radius:50%; cursor:pointer; color:var(--customize-text)"><i class="fas fa-minus"></i></button><input id="customizeCantidad" type="number" min="1" max="99" value="1" inputmode="numeric" style="font-size:1.2rem; font-weight:600; width:56px; text-align:center; color:var(--customize-text); background:var(--customize-row-bg); border:1px solid var(--customize-border); border-radius:8px; padding:.3rem; -moz-appearance:textfield;" oninput="this.value=this.value.replace(/[^0-9]/g,''); if(this.value<1||this.value==='')this.value=1; if(this.value>99)this.value=99; if(currentCustomizeItem){currentCustomizeItem.cantidad=parseInt(this.value)||1; calcularPrecioPersonalizado();}"><button class="btn-icon" onclick="actualizarCantidadPersonalizacion(1)" style="width:36px; height:36px; border:1px solid var(--customize-border); background:var(--customize-row-bg); border-radius:50%; cursor:pointer; color:var(--customize-text)"><i class="fas fa-plus"></i></button></div></div><div style="margin-bottom:1.5rem"><label style="display:block; margin-bottom:.5rem; font-weight:600; color:var(--customize-text)">Opciones:</label>${completoOption}<div id="ingredientesList" style="margin-top:.8rem"><div style="font-weight:500; margin-bottom:.5rem; color:var(--customize-text)">Quitar ingredientes:</div>${ingredientesHtml.join('') || '<p style="color:var(--customize-subtext)">Sin ingredientes para personalizar</p>'}</div></div><div style="background:var(--customize-row-bg); padding:.8rem; border-radius:var(--radius-sm)"><div style="display:flex; justify-content:space-between"><span style="font-weight:600; color:var(--customize-text)">Precio final:</span><span style="font-size:1.3rem; font-weight:700; color:var(--accent-text)" id="customizePrecio">${formatBs(usdToBs(platillo.precio * currentCustomizeItem.cantidad))}</span></div></div>`;
                
                document.querySelectorAll('.ingrediente-check').forEach(cb => {
                    cb.addEventListener('change', function() { if (this.checked) selectPersonalizado(); calcularPrecioPersonalizado(); });
                });
                document.getElementById('customizeModal').classList.add('active');
            });
        }

        function selectCompleto() {
            if (!currentCustomizeItem) return;
            currentCustomizeItem.selectionType = 'completo';
            currentCustomizeItem.ingredientesQuitados = [];
            document.querySelectorAll('.ingrediente-check').forEach(cb => cb.checked = false);
            const div = document.getElementById('completoOptionDiv');
            const circle = document.getElementById('completoCircle');
            if (div) div.classList.add('activo');
            if (circle) { circle.classList.add('activo'); circle.innerHTML = '<i class="fas fa-check" style="font-size:.7rem"></i>'; }
            calcularPrecioPersonalizado();
        }

        function selectPersonalizado() {
            if (!currentCustomizeItem) return;
            currentCustomizeItem.selectionType = 'personalizado';
            const div = document.getElementById('completoOptionDiv');
            const circle = document.getElementById('completoCircle');
            if (div) div.classList.remove('activo');
            if (circle) { circle.classList.remove('activo'); circle.innerHTML = ''; }
            calcularPrecioPersonalizado();
        }

        function borrarGrupoNivel1(grupoId) {
            carrito = carrito.filter(inst => {
                const gId = inst.platilloId.replace(/[^a-zA-Z0-9]/g, '_');
                return gId !== grupoId;
            });
            guardarCarrito(); actualizarCarritoUI(); actualizarCarritoBadge();
            window.stockCache.invalidate();
        }

        function borrarGrupoNivel2(subgrupoId) {
            // subgrupoId = grupoId_subgrupo.id = grupoId_platilloId_persKey
            // Lo comparamos reconstruyendo el mismo ID que usa el render
            carrito = carrito.filter(inst => {
                const grupoId = inst.platilloId.replace(/[^a-zA-Z0-9]/g, '_');
                const persKey = (inst.personalizacion || []).slice().sort().join('|').replace(/[^a-zA-Z0-9]/g, '_');
                const subId = `${inst.platilloId}_${persKey}`;
                const instSubgrupoId = `${grupoId}_${subId}`;
                return instSubgrupoId !== subgrupoId;
            });
            guardarCarrito(); actualizarCarritoUI(); actualizarCarritoBadge();
            window.stockCache.invalidate();
        }

        function actualizarCantidadPersonalizacion(delta) {
            if (!currentCustomizeItem) return;
            currentCustomizeItem.cantidad = Math.max(1, Math.min(99, currentCustomizeItem.cantidad + delta));
            const input = document.getElementById('customizeCantidad');
            if (input) input.value = currentCustomizeItem.cantidad;
            calcularPrecioPersonalizado();
        }

        function calcularPrecioPersonalizado() {
            if (!currentCustomizeItem) return;
            let descuento = 0;
            document.querySelectorAll('.ingrediente-check:checked').forEach(cb => descuento += parseFloat(cb.dataset.precio) || 0);
            const precioBaseUSD = currentCustomizeItem.precio;
            const precioFinalUSD = Math.max(0, precioBaseUSD - descuento);
            const precioFinalBs = usdToBs(precioFinalUSD) * currentCustomizeItem.cantidad;
            document.getElementById('customizePrecio').textContent = formatBs(precioFinalBs);
        }

        async function agregarPersonalizadoAlCarrito() {
            if (!currentCustomizeItem) return;
            const ingredientesQuitados = Array.from(document.querySelectorAll('.ingrediente-check:checked')).map(cb => cb.dataset.ingrediente);
            let descuento = 0;
            document.querySelectorAll('.ingrediente-check:checked').forEach(cb => descuento += parseFloat(cb.dataset.precio) || 0);
            const precioFinalUSD = Math.max(0, currentCustomizeItem.precio - descuento);
            const nuevasInstancias = [];
            for (let i = 0; i < currentCustomizeItem.cantidad; i++) {
                const nuevaInstancia = {
                    id: generarId('inst_'),
                    platilloId: currentCustomizeItem.id,
                    nombre: currentCustomizeItem.nombre,
                    personalizacion: ingredientesQuitados,
                    imagen: currentCustomizeItem.imagen,
                    precioUnitarioUSD: precioFinalUSD,
                    precioUnitarioBs: usdToBs(precioFinalUSD),
                    subtotal: usdToBs(precioFinalUSD),
                    selectionType: currentCustomizeItem.selectionType
                };
                carrito.push(nuevaInstancia);
                nuevasInstancias.push(nuevaInstancia);
            }
            guardarCarrito();
            actualizarCarritoBadge();
            window.stockCache.invalidate();
            const cantidadAgregada = nuevasInstancias.length;
            document.getElementById('customizeModal').classList.remove('active');
            currentCustomizeItem = null;
            mostrarToast(`${cantidadAgregada} agregado(s)`, 'success');
            if (window.innerWidth <= 992) {
                document.getElementById('cartSidebar').classList.add('open');
                document.getElementById('overlay').classList.add('active');
                document.getElementById('categorySidebar').classList.remove('open');
            } else {
                iniciarSeguimientoScroll();
            }
            if (nuevasInstancias.length > 0) _enfocarUltimoItemCarrito(nuevasInstancias[nuevasInstancias.length - 1]);
        }


        // ────────────────────────────────────────────────────────────
        // FUNCIONES DE SCROLL
        // ────────────────────────────────────────────────────────────
        function iniciarSeguimientoScroll() {
            const cartItems = document.getElementById('cartItems');
            const overlay   = document.getElementById('flechasOverlay');
            if (!cartItems || !overlay) return;

            // overlay es sticky dentro de cartItems (first child).
            // Poblar con clon de las flechas en-flujo y mostrar.
            // Cuando el usuario scrollea hasta ver las flechas originales,
            // IntersectionObserver oculta el overlay.
            if (cartItems._flechasObserver) {
                cartItems._flechasObserver.disconnect();
                cartItems._flechasObserver = null;
            }
            overlay.innerHTML = '';
            const src = cartItems.querySelector('.scroll-indicator-cascade');
            if (!src) return;
            const clone = src.cloneNode(true);
            clone.style.cssText = ''; // limpiar estilos en-flujo, el overlay tiene los suyos
            clone.addEventListener('click', irABotonesAccion);
            overlay.appendChild(clone);

            // IntersectionObserver observa las flechas ORIGINALES (en-flujo, al final)
            // root: cartItems — así detecta visibilidad dentro del scroll del carrito
            const observer = new IntersectionObserver(function(entries) {
                const visible = entries[0].isIntersecting;
                overlay.style.display = visible ? 'none' : 'block';
            }, { root: cartItems, threshold: 0.1 });

            observer.observe(src);
            cartItems._flechasObserver = observer;
        }

        function detenerSeguimientoScroll() {
            const cartItems = document.getElementById('cartItems');
            const overlay   = document.getElementById('flechasOverlay');
            if (cartItems && cartItems._flechasObserver) {
                cartItems._flechasObserver.disconnect();
                cartItems._flechasObserver = null;
            }
            if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
        }

        function irABotonesAccion() {
            const cartFooter = document.getElementById('cartFooter');
            if (cartFooter) cartFooter.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                const botonesAccion = document.querySelectorAll('#cartButtons .btn-primary, #cartButtons .btn-secondary');
                botonesAccion.forEach(btn => {
                    // Envolver el botón en un span que reserve el espacio fijo en el layout.
                    // El rotate se aplica al botón internamente — el span no se mueve.
                    let wrapper = btn.parentElement;
                    if (!wrapper || !wrapper.classList.contains('btn-nudge-wrapper')) {
                        wrapper = document.createElement('span');
                        wrapper.className = 'btn-nudge-wrapper';
                        wrapper.style.cssText = 'display:inline-flex;flex:1;min-width:0;';
                        btn.parentElement.insertBefore(wrapper, btn);
                        wrapper.appendChild(btn);
                    }
                    btn.classList.remove('btn-accion-animate');
                    void btn.offsetWidth;
                    btn.classList.add('btn-accion-animate');
                    btn.addEventListener('animationend', () => btn.classList.remove('btn-accion-animate'), { once: true });
                });
            }, 350);
        }

        function scrollAlItemAgregado(itemId) {
            setTimeout(() => {
                const itemElement = document.querySelector(`[data-instancia-id="${itemId}"]`);
                if (itemElement) itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }

        // Pre-expande el grupo de la instancia en nivel1Activo/nivel2Activo ANTES de
        // que actualizarCarritoUI renderice, para que el ítem aparezca visible desde el
        // primer frame. Luego scrollea al ítem dentro del contenedor.
        function _enfocarUltimoItemCarrito(instancia) {
            if (!instancia) return;

            // Pre-expandir niveles con los IDs exactos que genera el render
            const grupoId    = instancia.platilloId.replace(/[^a-zA-Z0-9]/g, '_');
            const persKey    = (instancia.personalizacion || []).slice().sort().join('|');
            const subgrupoId = `${grupoId}_${instancia.platilloId}_${persKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
            nivel1Activo = grupoId;
            nivel2Activo = subgrupoId;
            actualizarCarritoUI();

            // Scroll al ítem usando scrollIntoView — la misma técnica que funcionaba antes.
            // En móvil esperamos que termine la transición CSS del sidebar (transform .3s ease)
            // antes de ejecutarlo; en desktop basta con un setTimeout mínimo.
            function ejecutarScroll() {
                const itemEl = document.querySelector(`[data-instancia-id="${instancia.id}"]`);
                if (itemEl) itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            const cartSidebarEl = document.getElementById('cartSidebar');
            const esMobil = window.innerWidth <= 992;

            if (esMobil && cartSidebarEl && cartSidebarEl.classList.contains('open')) {
                cartSidebarEl.addEventListener('transitionend', function onEnd(e) {
                    if (e.propertyName !== 'transform') return;
                    cartSidebarEl.removeEventListener('transitionend', onEnd);
                    ejecutarScroll();
                });
            } else {
                setTimeout(ejecutarScroll, 50);
            }
        }


        // ────────────────────────────────────────────────────────────
        // FUNCIONES DE NOTIFICACIONES (POLLING CADA 2 SEGUNDOS) - RESTAURADO
        // ────────────────────────────────────────────────────────────


        function mostrarToastNotificacion(titulo, mensaje) {
			mostrarToast(`${titulo}: ${mensaje}`, 'info');
            // Toast enriquecido con logo para notificaciones en primer plano
            let toastNotif = document.getElementById('toastNotificacion');
            if (!toastNotif) {
                toastNotif = document.createElement('div');
                toastNotif.id = 'toastNotificacion';
                toastNotif.style.cssText = 'position:fixed;top:20px;right:16px;left:16px;max-width:360px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:12px 14px;display:none;align-items:center;gap:12px;z-index:4000;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:slideDown .3s ease;backdrop-filter:blur(10px)';
                toastNotif.innerHTML = '<img src="https://lh3.googleusercontent.com/pw/AP1GczPrZAoWxmsOGRD9xl1hO5Q65JXuwUZzoR6gUk-cw5lVmarxQe_-lwqpA60tTKLlXfpvIjAJlKC6jFls-xETJOPkebLIIPhbGlUkknmhrRbdhMUll2UViGSUj3WmHKg2YEsZlAfxBPPTjIHhScjD0jfe=w1439-h1439-s-no-gm" style="width:40px;height:40px;border-radius:10px;flex-shrink:0"><div style="flex:1;min-width:0"><div id="toastNotifTitulo" style="font-weight:700;font-size:.9rem;color:#fff;margin-bottom:2px"></div><div id="toastNotifMensaje" style="font-size:.8rem;color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div></div><button onclick="this.parentElement.style.display=\'none\'" style="background:none;border:none;color:rgba(255,255,255,.5);font-size:1.1rem;cursor:pointer;flex-shrink:0;padding:4px">×</button>';
                document.body.appendChild(toastNotif);
            }
            document.getElementById('toastNotifTitulo').textContent = titulo || '🍣 Saki Sushi';
            document.getElementById('toastNotifMensaje').textContent = mensaje || 'Nueva notificación';
            toastNotif.style.display = 'flex';
            clearTimeout(toastNotif._timer);
            toastNotif._timer = setTimeout(() => { toastNotif.style.display = 'none'; }, 5000);
        }

        function actualizarNotificacionesUI() {
            const badge = document.getElementById('notificationBadge');
            const countSpan = document.getElementById('notificationsCount');
            const listDiv = document.getElementById('notificationsList');
            if (badge) {
                if (notificacionesNoLeidas > 0) {
                    badge.textContent = notificacionesNoLeidas;
                    badge.style.display = 'block';
                    badge.classList.add('has-unread');
                    badge.style.animation = 'none';
                    badge.offsetHeight;
                    badge.style.animation = 'vibrate .3s ease';
                } else { badge.style.display = 'none'; badge.classList.remove('has-unread'); }
            }
            if (countSpan) countSpan.textContent = notificacionesNoLeidas;
            if (listDiv) {
                if (notificaciones.length === 0) listDiv.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--gray-400)">No hay notificaciones</div>';
                else {
                    listDiv.innerHTML = notificaciones.slice(0, 20).map(n => 
                        `<div class="notification-item ${n.tipo} ${!n.leida ? 'unread' : ''}" onclick="marcarNotificacionLeida('${n.id}')">
                            <div class="notification-title"><i class="fas fa-${mensajesEstado[n.tipo]?.icono || 'bell'}"></i> ${n.titulo}</div>
                            <div class="notification-message">${n.mensaje}</div>
                            <div class="notification-time">${window.formatearFechaGMT4(n.fecha)}</div>
                        </div>`
                    ).join('');
                }
            }
        }

        async function recargarNotificacionesCompletas() {
            try {
                const { data, error } = await window.supabaseClient.from('notificaciones').select('*').eq('session_id', sessionId).order('fecha', { ascending: false });
                if (error) throw error;
                notificaciones = data || [];
                notificacionesCompletas = data || [];
                notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;
                notificacionesCache = notificaciones.map(n => ({ id: n.id, leida: n.leida, fecha: n.fecha }));
                actualizarNotificacionesUI();
            } catch (error) { console.error('Error recargando notificaciones:', error); }
        }


  // ────────────────────────────────────────────────────────────
  // REPRODUCIR SONIDO DE NOTIFICACIÓN
  // ────────────────────────────────────────────────────────────
		function reproducirSonidoNotificacion() {
			const audio = document.getElementById('notificationSound');
			if (audio) {
				audio.pause();
				audio.currentTime = 0;
				const playPromise = audio.play();
				if (playPromise !== undefined) {
					playPromise.catch(() => {
						audio.muted = true;
						audio.play().then(() => {
							audio.muted = false;
							audio.currentTime = 0;
							audio.play().catch(() => {});
						}).catch(() => {});
					});
				}
			}
			if (navigator.vibrate) {
				navigator.vibrate([200, 100, 200]);
			}
		}


        // ────────────────────────────────────────────────────────────
        // NOTIFICACIONES — Realtime WebSocket (sin polling)
        // ────────────────────────────────────────────────────────────
        let _realtimeChannel = null;


        // ────────────────────────────────────────────────────────────
        // INICIAR VERIFICACIÓN PERIÓDICA - VERSIÓN OPTIMIZADA (SIN setInterval)
        // ────────────────────────────────────────────────────────────
		function iniciarVerificacionPeriodica() {
			// Si ya existía un canal de realtime, lo eliminamos para crear uno nuevo
			if (_realtimeChannel) {
				window.supabaseClient.removeChannel(_realtimeChannel);
				_realtimeChannel = null;
			}
			if (!sessionId) return;
			
			// Usar Realtime en lugar de polling
			_realtimeChannel = window.supabaseClient
				.channel('db-changes-' + sessionId)
				.on('postgres_changes', {
					event: 'INSERT',
					schema: 'public',
					table: 'notificaciones',
					filter: `session_id=eq.${sessionId}`
				}, async (payload) => {
					// Notificaciones nuevas
					if (payload.new && payload.new.session_id === sessionId) {
						await recargarNotificacionesCompletas();
						if (!payload.new.leida) {
							if (paginaVisible) {
								reproducirSonidoNotificacion();
								mostrarToastNotificacion(payload.new.titulo, payload.new.mensaje);
							} else {
								// Notificación local en segundo plano
								if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
									navigator.serviceWorker.controller.postMessage({
										type: 'SHOW_LOCAL_NOTIFICATION',
										titulo: payload.new.titulo || '🍣 Saki Sushi',
										mensaje: payload.new.mensaje || 'Tienes una nueva notificación',
										url: window.location.href,
										tipo: payload.new.tipo
									});
								}
							}
						}
					}
				})
				.on('postgres_changes', {
					event: 'INSERT',
					schema: 'public',
					table: 'pedidos',
					filter: `session_id=eq.${sessionId}`
				}, async (payload) => {
					// Nuevo pedido creado - actualizar historial
					if (payload.new) {
						agregarPedidoAHistorial(payload.new);
					}
				})
				.on('postgres_changes', {
					event: 'UPDATE',
					schema: 'public',
					table: 'pedidos',
					filter: `session_id=eq.${sessionId}`
				}, async (payload) => {
					// Pedido actualizado (ej. cambio de estado)
					console.log('Pedido actualizado:', payload.new);
					// Aquí podrías actualizar alguna UI si es necesario
				})
				.on('postgres_changes', {
					event: 'UPDATE',
					schema: 'public',
					table: 'inventario'
				}, async (payload) => {
					// Stock real cambió (cajero confirmó/rechazó pedido) → actualizar inventario local
					if (payload.new) {
						const idx = inventario.findIndex(i => i.id === payload.new.id);
						if (idx >= 0) inventario[idx] = { ...inventario[idx], ...payload.new };
						else inventario.push(payload.new);
						window.stockCache.invalidate();
						precalcularStockMenu();
						actualizarStockTarjetas();
					}
				})
				.subscribe((status) => {
					if (status === 'SUBSCRIBED') {
						console.log('✅ Suscrito a cambios en tiempo real');
					}
				});
		}


        async function marcarTodasComoLeidas() {
            const idsNoLeidas = notificaciones.filter(n => !n.leida).map(n => n.id);
            if (idsNoLeidas.length === 0) return;
            try {
                await window.supabaseClient.from('notificaciones').update({ leida: true }).in('id', idsNoLeidas);
                notificaciones = notificaciones.map(n => ({ ...n, leida: true }));
                notificacionesCache = notificacionesCache.map(n => n.id === n.id ? { ...n, leida: true } : n);
                notificacionesNoLeidas = 0;
                actualizarNotificacionesUI();
                localStorage.setItem('saki_notificaciones', JSON.stringify(notificaciones));
            } catch (error) { console.error('Error marcando notificaciones como leídas:', error); }
        }

        async function marcarNotificacionLeida(id) {
            try {
                await window.supabaseClient.from('notificaciones').update({ leida: true }).eq('id', id);
                notificaciones = notificaciones.map(n => n.id === id ? { ...n, leida: true } : n);
                notificacionesCache = notificacionesCache.map(n => n.id === id ? { ...n, leida: true } : n);
                notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;
                actualizarNotificacionesUI();
                localStorage.setItem('saki_notificaciones', JSON.stringify(notificaciones));
            } catch (error) { console.error('Error marcando notificación como leída:', error); }
        }

        function toggleNotifications() {
            const panel = document.getElementById('notificationsPanel');
            const overlay = document.getElementById('overlay');
            if (panel.classList.contains('active')) {
                panel.classList.remove('active');
                if (window.innerWidth <= 992 && !document.getElementById('categorySidebar').classList.contains('open') && !document.getElementById('cartSidebar').classList.contains('open')) overlay.classList.remove('active');
            } else {
                panel.classList.add('active');
                if (window.innerWidth <= 992) overlay.classList.add('active');
                marcarTodasComoLeidas();
            }
        }

        let _audioDesbloqueado = false;
        function verificarPermisosAudio() {
            const audio = document.getElementById('notificationSound');
            if (!audio) return;
            audio.load();
            audio.volume = 1;
            const _desbloquear = () => {
                if (_audioDesbloqueado) return;
                audio.muted = true;
                audio.play().then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = false;
                    _audioDesbloqueado = true;
                }).catch(() => {});
            };
            document.addEventListener('click', _desbloquear, { once: true });
            document.addEventListener('touchstart', _desbloquear, { once: true });
        }


        // ────────────────────────────────────────────────────────────
        // FUNCIONES DE PEDIDOS (MESA, DELIVERY, RESERVA)
        // ────────────────────────────────────────────────────────────
        function abrirConfirmacionMesa() {
            const summary = document.getElementById('mesaOrderSummary');
            let total = 0;
            const grupos = agruparItemsJerarquicamente();
            let html = '<div style="font-weight:700;font-size:.9rem;margin-bottom:.6rem;display:flex;align-items:center;gap:.5rem"><i class="fas fa-receipt" style="color:var(--accent)"></i>Resumen del pedido</div>';
            grupos.forEach(grupo => {
                total += grupo.subtotal;
                grupo.subgrupos.forEach(subgrupo => {
                    let personalizacionTexto = '';
                    if (subgrupo.personalizacion.length > 0) {
                        const ingredientesNombres = subgrupo.personalizacion.map(p => inventario.find(i => i.id === p)?.nombre || p).join(', ');
                        personalizacionTexto = `<small style="display:block; color:var(--gray-400)">Sin: ${ingredientesNombres}</small>`;
                    }
                    const imgMesa = grupo.imagen
                        ? `<img src="${grupo.imagen}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;margin-right:.6rem">`
                        : `<div style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,.08);flex-shrink:0;margin-right:.6rem;display:flex;align-items:center;justify-content:center"><i class="fas fa-utensils" style="font-size:.8rem;opacity:.4"></i></div>`;
                    html += `<div style="display:flex;align-items:center;margin-bottom:.5rem;font-size:.88rem">${imgMesa}<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:flex-start"><span style="flex:1;margin-right:.4rem">${grupo.nombre} x${subgrupo.cantidad}</span><span style="color:var(--text-primary);font-weig">${formatBs(subgrupo.subtotal)}</span></div>${personalizacionTexto}</div></div>`;
                });
            });
            summary.innerHTML = html + `<div style="display:flex; justify-content:space-between; margin-top:.6rem; padding-top:.5rem; border-top:1px solid rgba(255,255,255,.12); font-weight:700;font-size:.9rem"><span>Total platillos</span><span style="color:var(--text-primary)">${formatBs(total)}</span></div>`;
            const mModal = document.getElementById('confirmMesaModal');
            mModal.classList.add('active');
            setTimeout(() => { const mb = mModal.querySelector('.modal-body'); if (mb) mb.scrollTop = 0; }, 50);
        }


        // ────────────────────────────────────────────────────────────
        // CONFIRMAR PEDIDO MESA - CON PREVENCIÓN DE DUPLICADOS
        // ────────────────────────────────────────────────────────────
		async function confirmarPedidoMesa() {
			// Prevenir múltiples envíos
			const btn = document.getElementById('confirmMesaOrder');
			if (btn.disabled) return;
			btn.disabled = true;
			const btnOriginalHTML = btn.innerHTML;
			btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

			const pedido = crearPedidoBase('mesa');
			
			// Añadir identificador único de transacción
			pedido.transaction_nonce = generarId('nonce_');
			
			// Datos específicos de mesa
			pedido.cliente_nombre = document.getElementById('clienteNombre').value.trim() || 'Cliente';
			
			try {
				const resultado = await crearPedidoTransaccional(pedido);
				
				if (resultado.success) {
					carrito = [];
					guardarCarrito();
					actualizarCarritoUI();
					actualizarCarritoBadge();
					document.getElementById('confirmMesaModal').classList.remove('active');
					window.stockCache.invalidate();
					limpiarDatosFormulario();
					mostrarToast('✅ Pedido realizado con éxito', 'success');
				} else {
					// Si es duplicado, mostrar mensaje específico
					if (resultado.duplicate) {
						mostrarToast('⏳ Tu pedido ya está siendo procesado', 'warning');
					} else {
						mostrarToast('❌ Error: ' + (resultado.error || 'Error al procesar el pedido'), 'error');
					}
				}
			} catch (error) {
				console.error('Error en confirmarPedidoMesa:', error);
				mostrarToast('❌ Error inesperado al procesar el pedido', 'error');
			} finally {
				// Restaurar botón
				btn.disabled = false;
				btn.innerHTML = btnOriginalHTML;
			}
		}

        function crearPedidoBase(tipo) {
            const tasaActual = configGlobal.tasa_efectiva;
            const items = carrito.map(instancia => ({
                platilloId: instancia.platilloId,
                nombre: instancia.nombre,
                cantidad: 1,
                personalizacion: instancia.personalizacion,
                precioUnitarioUSD: instancia.precioUnitarioUSD,
                precioEnBs: instancia.precioUnitarioBs,
                subtotal: instancia.subtotal,
                tasaCambioAplicada: tasaActual
            }));
            return {
                id: generarId('PED-'),
                timestamp: new Date().toISOString(),
                estado: 'pendiente',
                tipo: tipo,
                items: items,
                total: carrito.reduce((sum, i) => sum + i.precioUnitarioUSD, 0),
                session_id: sessionId,
                mesa: tipo === 'mesa' ? mesaId : null,
                tasa_aplicada: tasaActual
            };
        }

        async function crearPedidoTransaccional(pedido) {
            try {
                const pedidoParaRPC = {
                    id: pedido.id,
                    fecha: pedido.fecha || new Date().toISOString(),
                    estado: pedido.estado,
                    tipo: pedido.tipo,
                    total: pedido.total,
                    session_id: pedido.session_id,
                    mesa: pedido.mesa || null,
                    cliente_nombre: pedido.cliente_nombre || null,
                    parroquia: pedido.parroquia || null,
                    direccion: pedido.direccion || null,
                    telefono: pedido.telefono || null,
                    referencia: pedido.referencia || null,
                    fecha_reserva: pedido.fecha_reserva || null,
                    comprobante_url: pedido.comprobante_url || null,
                    costo_delivery: pedido.costo_delivery || 0,
                    costo_delivery_usd: pedido.costo_delivery_usd || 0,
                    costo_delivery_bs: pedido.costo_delivery_bs || 0,
                    tasa_aplicada: pedido.tasa_aplicada || configGlobal?.tasa_efectiva || 400,
                    transaction_nonce: pedido.transaction_nonce || null
                };
                const { data, error } = await window.supabaseClient.rpc('crear_pedido_con_reserva', { p_pedido: pedidoParaRPC, p_items: pedido.items });
                if (error) throw error;
                if (data && data.success) {
                    agregarPedidoAHistorial(pedido);
                    if (window.innerWidth <= 992) {
                        document.getElementById('cartSidebar').classList.remove('open');
                        document.getElementById('overlay').classList.remove('active');
                    }
                    detenerSeguimientoScroll();
                    return { success: true, pedidoId: data.pedido_id };
                } else return { success: false, error: data?.error || 'Error desconocido' };
            } catch (error) {
                console.error('❌ Error:', error);
                mostrarToast('Error al procesar el pedido: ' + error.message, 'error');
                return { success: false, error: error.message };
            }
        }

        // Genera el HTML del resumen del carrito
        // modo: 'mesa'|'reserva' → "Total platillos"  /  'delivery' → líneas de delivery
        function generarResumenCarrito(modo) {
            const grupos = agruparItemsJerarquicamente();
            let html = '<div style="font-weight:700;font-size:.9rem;margin-bottom:.6rem;display:flex;align-items:center;gap:.5rem"><i class="fas fa-receipt" style="color:var(--accent)"></i>Resumen del pedido</div>';
            let total = 0;
            grupos.forEach(grupo => {
                total += grupo.subtotal;
                const img = grupo.imagen
                    ? `<img src="${grupo.imagen}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;margin-right:.6rem">`
                    : `<div style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,.08);flex-shrink:0;margin-right:.6rem;display:flex;align-items:center;justify-content:center"><i class="fas fa-utensils" style="font-size:.8rem;opacity:.4"></i></div>`;
                grupo.subgrupos.forEach(subgrupo => {
                    let persTexto = '';
                    if (subgrupo.personalizacion.length > 0) {
                        const nombres = subgrupo.personalizacion.map(p => inventario.find(i => i.id === p)?.nombre || p).join(', ');
                        persTexto = `<small style="display:block;color:var(--gray-400);font-size:.72rem">Sin: ${nombres}</small>`;
                    }
                    html += `<div style="display:flex;align-items:center;margin-bottom:.5rem;font-size:.88rem">
                        ${img}
                        <div style="flex:1;min-width:0">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                                <span style="flex:1;margin-right:.4rem">${grupo.nombre} x${subgrupo.cantidad}</span>
                                <span style="color:var(--text-primary);font-weight:600;white-space:nowrap">${formatBs(subgrupo.subtotal)}</span>
                            </div>
                            ${persTexto}
                        </div>
                    </div>`;
                });
            });
            const sep = `border-top:1px solid rgba(255,255,255,.12);margin-top:.6rem;padding-top:.5rem;`;
            if (modo === 'delivery') {
                // Subtotal platillos
                html += `<div style="display:flex;justify-content:space-between;${sep}font-size:.88rem" id="resumenSubtotalPlatillos">
                    <span>Subtotal platillos</span>
                    <span style="color:var(--text-primary);font-weight:600">${formatBs(total)}</span>
                </div>`;
                // Delivery — se actualiza en actualizarTotalDelivery
                html += `<div style="display:flex;justify-content:space-between;margin-top:.3rem;font-size:.88rem" id="resumenDeliveryLinea">
                    <span style="color:var(--text-secondary);font-size:.88rem">Delivery</span>
                    <span id="resumenDeliveryMonto" onclick="irAParroquia()" style="color:var(--text-primary);font-style:italic;font-weight:400;cursor:pointer;text-decoration:underline dotted;font-size:.88rem">Primero seleccione Parroquia a enviar</span>
                </div>`;
                // Total
                html += `<div style="display:flex;justify-content:space-between;margin-top:.3rem;padding-top:.4rem;border-top:1px solid rgba(255,255,255,.08);font-weight:700;font-size:.9rem" id="resumenTotalDelivery">
                    <span>Total Platillos + Delivery</span>
                    <span style="color:var(--primary)" id="resumenTotalDeliveryMonto">—</span>
                </div>`;
            } else {
                html += `<div style="display:flex;justify-content:space-between;${sep}font-weight:700;font-size:.9rem">
                    <span>Total platillos</span>
                    <span style="color:var(--text-primary)">${formatBs(total)}</span>
                </div>`;
            }
            return html;
        }

        function iniciarProcesoDelivery() {
            iniciarTimerFrontend('delivery', 20);
            const resumenDelivery = document.getElementById('resumenPedidoDelivery');
            if (resumenDelivery) resumenDelivery.innerHTML = generarResumenCarrito('delivery');
            document.getElementById('selectedParroquiaText').textContent = deliveryFormData.parroquia || 'Seleccionar parroquia';
            document.getElementById('parroquiaSelect').value = deliveryFormData.parroquia || '';
            document.getElementById('direccion').value = deliveryFormData.direccion || '';
            document.getElementById('telefono').value = deliveryFormData.telefono || '';
            if (deliveryFormData.referencia) {
                for (let i = 0; i < 6; i++) {
                    const input = document.querySelector(`.ref-digit[data-type="delivery"][data-index="${i}"]`);
                    if (input) input.value = deliveryFormData.referencia[i] || '';
                }
            }
            actualizarTotalDelivery();
            const dModal = document.getElementById('deliveryModal');
            dModal.classList.add('active');
            setTimeout(() => { const mb = dModal.querySelector('.modal-body'); if (mb) mb.scrollTop = 0; }, 50);
        }

        function iniciarProcesoReserva() {
            iniciarTimerFrontend('reserva', 20);
            const resumenReserva = document.getElementById('resumenPedidoReserva');
            if (resumenReserva) resumenReserva.innerHTML = generarResumenCarrito('reserva');
            const subtotalUSD = carrito.reduce((sum, item) => sum + item.precioUnitarioUSD, 0);
            document.getElementById('reservaTotal').textContent = formatBs(usdToBs(subtotalUSD));
            document.getElementById('montoReserva').textContent = formatBs(usdToBs(subtotalUSD));
            document.getElementById('fechaReserva').value = reservaFormData.fecha || '';
            document.getElementById('nombreReserva').value = reservaFormData.nombre || '';
            if (reservaFormData.referencia) {
                for (let i = 0; i < 6; i++) {
                    const input = document.querySelector(`.ref-digit[data-type="reserva"][data-index="${i}"]`);
                    if (input) input.value = reservaFormData.referencia[i] || '';
                }
            }
            validarFormularioReserva();
            const rModal = document.getElementById('reservaModal');
            rModal.classList.add('active');
            setTimeout(() => { const mb = rModal.querySelector('.modal-body'); if (mb) mb.scrollTop = 0; }, 50);
        }

        function iniciarTimerFrontend(tipo, minutos) {
            if (timersActivos[tipo]) clearInterval(intervalosTimer[tipo]);
            const timerDisplay = document.getElementById(tipo + 'TimerDisplay');
            if (!timerDisplay) return;
            const fin = Date.now() + minutos * 60 * 1000;
            timersActivos[tipo] = fin;
            intervalosTimer[tipo] = setInterval(() => {
                const restante = Math.max(0, Math.floor((fin - Date.now()) / 1000));
                if (restante <= 0) {
                    clearInterval(intervalosTimer[tipo]);
                    timerDisplay.textContent = '00:00';
                    if (tipo === 'delivery') { document.getElementById('deliveryModal').classList.remove('active'); mostrarToast('Tiempo agotado', 'error'); }
                    else { document.getElementById('reservaModal').classList.remove('active'); mostrarToast('Tiempo agotado', 'error'); }
                    delete timersActivos[tipo];
                } else {
                    const mins = Math.floor(restante / 60), segs = restante % 60;
                    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
                }
            }, 1000);
        }

        function detenerTimer(tipo) {
            if (intervalosTimer[tipo]) {
                clearInterval(intervalosTimer[tipo]);
                delete intervalosTimer[tipo];
                delete timersActivos[tipo];
                const timerDisplay = document.getElementById(tipo + 'TimerDisplay');
                if (timerDisplay) timerDisplay.textContent = '20:00';
            }
        }

        function irAParroquia() {
            const el = document.getElementById('parroquiaSelectorDiv');
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.remove('parroquia-highlight');
            void el.offsetWidth; // reflow para reiniciar animación
            el.classList.add('parroquia-highlight');
            setTimeout(() => el.classList.remove('parroquia-highlight'), 1700);
        }

        function toggleParroquiaSelect() {
            const select = document.getElementById('parroquiaSelect'), search = document.getElementById('parroquiaSearch'), chevron = document.getElementById('parroquiaChevron');
            if (select.style.display === 'none') {
                select.style.display = 'block'; search.style.display = 'block'; chevron.className = 'fas fa-chevron-up'; search.focus();
            } else {
                select.style.display = 'none'; search.style.display = 'none'; chevron.className = 'fas fa-chevron-down';
            }
        }

        function seleccionarParroquia(select) {
            if (select.value) document.getElementById('selectedParroquiaText').textContent = select.value;
            else document.getElementById('selectedParroquiaText').textContent = 'Seleccionar parroquia';
            toggleParroquiaSelect();
            actualizarTotalDelivery();
            validarFormularioDelivery();
            guardarDatosDelivery();
        }

        function filtrarParroquias() {
            const term = document.getElementById('parroquiaSearch').value.toLowerCase();
            const select = document.getElementById('parroquiaSelect');
            Array.from(select.options).forEach(opt => {
                if (opt.value === '') return;
                opt.style.display = opt.text.toLowerCase().includes(term) ? '' : 'none';
            });
        }

        function actualizarContadorDireccion() {
            const direccion = document.getElementById('direccion'), contador = document.getElementById('direccionCounter'), longitud = direccion.value.length;
            contador.textContent = `${longitud}/20 caracteres`;
            contador.style.color = longitud >= 20 ? 'var(--success)' : 'var(--gray-400)';
            validarFormularioDelivery();
            guardarDatosDelivery();
        }

        function moverSiguiente(input, type, index) {
            if (input.value.length === 1 && index < 5) document.querySelector(`.ref-digit[data-type="${type}"][data-index="${index + 1}"]`).focus();
            if (type === 'delivery') { guardarDatosDelivery(); } else guardarDatosReserva();
        }

        function actualizarTotalDelivery() {
            const select = document.getElementById('parroquiaSelect');
            const subtotalUSD = carrito.reduce((sum, item) => sum + item.precioUnitarioUSD, 0);
            if (select.value) {
                const precioUSD = preciosPorParroquia[select.value] || 2;
                const totalUSD = subtotalUSD + precioUSD;
                const totalBs = usdToBs(totalUSD);
                const deliveryBs = usdToBs(precioUSD);
                const subtotalBs = usdToBs(subtotalUSD);
                document.getElementById('deliveryTotal').textContent = formatBs(totalBs);
                const dpd = document.getElementById('deliveryPriceDisplay');
                dpd.textContent = `Costo de envío: ${formatBs(deliveryBs)}`;
                dpd.classList.remove('placeholder');
                dpd.onclick = null; dpd.style.cursor = 'default';
                const montoPago = document.getElementById('montoPago');
                if (montoPago) { montoPago.className = 'valor'; montoPago.textContent = formatBs(totalBs); }
                const btnCopy = document.getElementById('btnCopyMontoPago');
                if (btnCopy) btnCopy.style.display = 'inline-flex';
                // Actualizar líneas del resumen
                const rDel = document.getElementById('resumenDeliveryMonto');
                if (rDel) { rDel.style.color='var(--text-primary)'; rDel.style.fontStyle='normal'; rDel.style.fontWeight='600'; rDel.style.fontFamily='inherit'; rDel.style.fontSize='.88rem'; rDel.style.textDecoration='none'; rDel.onclick=null; rDel.style.cursor='default'; rDel.textContent = formatBs(deliveryBs); }
                const rTot = document.getElementById('resumenTotalDeliveryMonto');
                if (rTot) rTot.textContent = formatBs(totalBs);
            } else {
                document.getElementById('deliveryTotal').textContent = 'Primero seleccione Parroquia a enviar';
                const dpd2 = document.getElementById('deliveryPriceDisplay');
                dpd2.textContent = 'Costo de envío: Primero seleccione parroquia a enviar';
                dpd2.classList.add('placeholder');
                dpd2.onclick = irAParroquia; dpd2.style.cursor = 'pointer';
                const montoPago = document.getElementById('montoPago');
                if (montoPago) { montoPago.className = 'valor-placeholder'; montoPago.textContent = 'Primero seleccione Parroquia a enviar'; }
                const btnCopy = document.getElementById('btnCopyMontoPago');
                if (btnCopy) btnCopy.style.display = 'none';
                // Restablecer líneas del resumen
                const rDel = document.getElementById('resumenDeliveryMonto');
                if (rDel) { rDel.style.color='var(--text-primary)'; rDel.style.fontStyle='italic'; rDel.style.fontWeight='400'; rDel.style.fontFamily='inherit'; rDel.style.textDecoration='underline dotted'; rDel.style.cursor='pointer'; rDel.onclick=irAParroquia; rDel.textContent = 'Primero seleccione Parroquia a enviar'; }
                const rTot = document.getElementById('resumenTotalDeliveryMonto');
                if (rTot) rTot.textContent = '—';
            }
            validarFormularioDelivery();
        }

        function getReferencia(type) {
            let ref = '';
            for (let i = 0; i < 6; i++) {
                const input = document.querySelector(`.ref-digit[data-type="${type}"][data-index="${i}"]`);
                if (input) ref += input.value;
            }
            return ref;
        }

        function validarFormularioDelivery() {
            const parroquia = document.getElementById('parroquiaSelect').value;
            const direccion = document.getElementById('direccion').value;
            const telefono = document.getElementById('telefono').value;
            const referencia = getReferencia('delivery');
            const comprobanteOk = uploadComplete;
            const telefonoValido = /^\+[0-9]{11,14}$/.test(telefono);
            const referenciaValida = window.validarReferencia(referencia);
            const direccionValida = direccion.length >= 20;
            document.getElementById('confirmDelivery').disabled = !(parroquia && direccionValida && telefonoValido && referenciaValida && comprobanteOk && !isUploading);
        }

        function validarFormularioReserva() {
            const fecha = document.getElementById('fechaReserva').value;
            const nombre = document.getElementById('nombreReserva').value;
            const referencia = getReferencia('reserva');
            const comprobanteOk = uploadComplete;
            const referenciaValida = window.validarReferencia(referencia);
            document.getElementById('confirmReserva').disabled = !(fecha && nombre && referenciaValida && comprobanteOk && !isUploading);
        }


  // ────────────────────────────────────────────────────────────
  // CONFIRMAR PEDIDO DELIVERY - CON PREVENCIÓN DE DUPLICADOS
  // ────────────────────────────────────────────────────────────
		async function confirmarPedidoDelivery() {
			// Prevenir múltiples envíos
			const btn = document.getElementById('confirmDelivery');
			if (btn.disabled) return;
			btn.disabled = true;
			const btnOriginalHTML = btn.innerHTML;
			btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

			detenerTimer('delivery');
			const pedido = crearPedidoBase('delivery');
			
			// Añadir identificador único de transacción
			pedido.transaction_nonce = generarId('nonce_');
			
			// Datos específicos de delivery
			pedido.parroquia = document.getElementById('parroquiaSelect').value;
			pedido.direccion = document.getElementById('direccion').value;
			pedido.telefono = document.getElementById('telefono').value;
			pedido.referencia = getReferencia('delivery');
			pedido.costo_delivery_usd = preciosPorParroquia[pedido.parroquia] || 2;
			pedido.costo_delivery_bs = usdToBs(pedido.costo_delivery_usd);
			pedido.total += pedido.costo_delivery_usd;
			pedido.comprobante_url = deliveryFormData.comprobante;
			
			try {
				const resultado = await crearPedidoTransaccional(pedido);
				
				if (resultado.success) {
					carrito = [];
					guardarCarrito();
					actualizarCarritoUI();
					actualizarCarritoBadge();
					document.getElementById('deliveryModal').classList.remove('active');
					window.stockCache.invalidate();
					limpiarDatosFormulario();
					mostrarToast('✅ Pedido realizado con éxito', 'success');
				} else {
					// Si es duplicado, mostrar mensaje específico
					if (resultado.duplicate) {
						mostrarToast('⏳ Tu pedido ya está siendo procesado', 'warning');
					} else {
						mostrarToast('❌ Error: ' + (resultado.error || 'Error al procesar el pedido'), 'error');
					}
					iniciarTimerFrontend('delivery', 20);
				}
			} catch (error) {
				console.error('Error en confirmarPedidoDelivery:', error);
				mostrarToast('❌ Error inesperado al procesar el pedido', 'error');
				iniciarTimerFrontend('delivery', 20);
			} finally {
				// Restaurar botón
				btn.disabled = false;
				btn.innerHTML = btnOriginalHTML;
			}
		}


  // ────────────────────────────────────────────────────────────
  // CONFIRMAR PEDIDO RESERVA - CON PREVENCIÓN DE DUPLICADOS
  // ────────────────────────────────────────────────────────────
		async function confirmarPedidoReserva() {
			// Prevenir múltiples envíos
			const btn = document.getElementById('confirmReserva');
			if (btn.disabled) return;
			btn.disabled = true;
			const btnOriginalHTML = btn.innerHTML;
			btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

			detenerTimer('reserva');
			const pedido = crearPedidoBase('reserva');
			
			// Añadir identificador único de transacción
			pedido.transaction_nonce = generarId('nonce_');
			
			// Datos específicos de reserva
			pedido.fecha_reserva = document.getElementById('fechaReserva').value;
			pedido.cliente_nombre = document.getElementById('nombreReserva').value;
			pedido.referencia = getReferencia('reserva');
			pedido.comprobante_url = reservaFormData.comprobante;
			
			try {
				const resultado = await crearPedidoTransaccional(pedido);
				
				if (resultado.success) {
					carrito = [];
					guardarCarrito();
					actualizarCarritoUI();
					actualizarCarritoBadge();
					document.getElementById('reservaModal').classList.remove('active');
					window.stockCache.invalidate();
					limpiarDatosFormulario();
					mostrarToast('✅ Reserva realizada con éxito', 'success');
				} else {
					// Si es duplicado, mostrar mensaje específico
					if (resultado.duplicate) {
						mostrarToast('⏳ Tu reserva ya está siendo procesada', 'warning');
					} else {
						mostrarToast('❌ Error: ' + (resultado.error || 'Error al procesar la reserva'), 'error');
					}
					iniciarTimerFrontend('reserva', 20);
				}
			} catch (error) {
				console.error('Error en confirmarPedidoReserva:', error);
				mostrarToast('❌ Error inesperado al procesar la reserva', 'error');
				iniciarTimerFrontend('reserva', 20);
			} finally {
				// Restaurar botón
				btn.disabled = false;
				btn.innerHTML = btnOriginalHTML;
			}
		}

        function guardarDatosDelivery() {
            deliveryFormData.parroquia = document.getElementById('parroquiaSelect').value;
            deliveryFormData.direccion = document.getElementById('direccion').value;
            deliveryFormData.telefono = document.getElementById('telefono').value;
            deliveryFormData.referencia = getReferencia('delivery');
            sessionStorage.setItem('saki_delivery_data', JSON.stringify(deliveryFormData));
        }

        function guardarDatosReserva() {
            reservaFormData.fecha = document.getElementById('fechaReserva').value;
            reservaFormData.nombre = document.getElementById('nombreReserva').value;
            reservaFormData.referencia = getReferencia('reserva');
            sessionStorage.setItem('saki_reserva_data', JSON.stringify(reservaFormData));
        }

        function limpiarDatosFormulario() {
            deliveryFormData = { parroquia: '', direccion: '', telefono: '', referencia: '', comprobante: null };
            reservaFormData = { fecha: '', nombre: '', referencia: '', comprobante: null };
            sessionStorage.removeItem('saki_delivery_data');
            sessionStorage.removeItem('saki_reserva_data');
            limpiarCampoComprobante('delivery');
            limpiarCampoComprobante('reserva');
            limpiarReferencias('delivery');
            limpiarReferencias('reserva');
        }

        function limpiarCampoComprobante(tipo) {
            if (tipo === 'delivery') {
                document.getElementById('comprobante').value = '';
                deliveryFormData.comprobante = null;
                const label = document.getElementById('comprobanteLabel');
                label.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Haz clic para seleccionar una imagen</span><small>JPG, PNG, GIF (max. 5MB)</small>';
                label.classList.remove('has-file');
            } else {
                document.getElementById('comprobanteReserva').value = '';
                reservaFormData.comprobante = null;
                const label = document.getElementById('comprobanteReservaLabel');
                label.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Haz clic para seleccionar una imagen</span><small>JPG, PNG, GIF (max. 5MB)</small>';
                label.classList.remove('has-file');
            }
        }

        function limpiarReferencias(type) {
            for (let i = 0; i < 6; i++) {
                const input = document.querySelector(`.ref-digit[data-type="${type}"][data-index="${i}"]`);
                if (input) input.value = '';
            }
        }

        async function handleComprobanteSelect(input) {
            const file = input.files[0];
            if (!file) { deliveryFormData.comprobante = null; uploadComplete = false; validarFormularioDelivery(); return; }
            if (file.size > 5 * 1024 * 1024) { mostrarToast('El archivo es demasiado grande (máx 5MB)', 'error'); input.value = ''; return; }
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) { mostrarToast('Tipo de archivo no válido. Solo imágenes JPG, PNG, WEBP o GIF', 'error'); input.value = ''; return; }
            const progressBar = document.getElementById('uploadProgress'), progressBarFill = document.getElementById('uploadProgressBar');
            progressBar.style.display = 'block'; progressBarFill.style.width = '0%';
            isUploading = true; uploadComplete = false;
            document.getElementById('confirmDelivery').disabled = true;
            try {
                let progress = 0;
                const interval = setInterval(() => { if (progress < 90) { progress += 10; progressBarFill.style.width = `${progress}%`; } }, 200);
                const result = await window.subirComprobante(file, 'delivery');
                clearInterval(interval);
                if (result.success) {
                    deliveryFormData.comprobante = result.url; uploadComplete = true;
                    progressBarFill.style.width = '100%';
                    mostrarToast('✅ Comprobante subido correctamente', 'success');
                    const label = document.getElementById('comprobanteLabel');
                    label.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i><span style="color:var(--success); font-weight:600">${file.name}</span><small>Listo para enviar</small>`;
                    label.classList.add('has-file');
                } else throw new Error(result.error || 'Error al subir el archivo');
            } catch (error) {
                mostrarToast('❌ Error al subir el comprobante: ' + (error.message || 'Error desconocido'), 'error');
                deliveryFormData.comprobante = null;
                progressBarFill.style.width = '0%';
                input.value = '';
                const label = document.getElementById('comprobanteLabel');
                label.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Haz clic para seleccionar una imagen</span><small>JPG, PNG, GIF (max. 5MB)</small>';
                label.classList.remove('has-file');
            } finally {
                isUploading = false;
                setTimeout(() => { progressBar.style.display = 'none'; }, 1000);
                validarFormularioDelivery();
            }
        }

        async function handleComprobanteReservaSelect(input) {
            const file = input.files[0];
            if (!file) { reservaFormData.comprobante = null; uploadComplete = false; validarFormularioReserva(); return; }
            if (file.size > 5 * 1024 * 1024) { mostrarToast('El archivo es demasiado grande (máx 5MB)', 'error'); input.value = ''; return; }
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) { mostrarToast('Tipo de archivo no válido. Solo imágenes JPG, PNG, WEBP o GIF', 'error'); input.value = ''; return; }
            const progressBar = document.getElementById('uploadProgressReserva'), progressBarFill = document.getElementById('uploadProgressBarReserva');
            progressBar.style.display = 'block'; progressBarFill.style.width = '0%';
            isUploading = true; uploadComplete = false;
            document.getElementById('confirmReserva').disabled = true;
            try {
                let progress = 0;
                const interval = setInterval(() => { if (progress < 90) { progress += 10; progressBarFill.style.width = `${progress}%`; } }, 200);
                const result = await window.subirComprobante(file, 'reserva');
                clearInterval(interval);
                if (result.success) {
                    reservaFormData.comprobante = result.url; uploadComplete = true;
                    progressBarFill.style.width = '100%';
                    mostrarToast('✅ Comprobante subido correctamente', 'success');
                    const label = document.getElementById('comprobanteReservaLabel');
                    label.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i><span style="color:var(--success); font-weight:600">${file.name}</span><small>Listo para enviar</small>`;
                    label.classList.add('has-file');
                } else throw new Error(result.error || 'Error al subir el archivo');
            } catch (error) {
                mostrarToast('❌ Error al subir el comprobante: ' + (error.message || 'Error desconocido'), 'error');
                reservaFormData.comprobante = null;
                progressBarFill.style.width = '0%';
                input.value = '';
                const label = document.getElementById('comprobanteReservaLabel');
                label.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Haz clic para seleccionar una imagen</span><small>JPG, PNG, GIF (max. 5MB)</small>';
                label.classList.remove('has-file');
            } finally {
                isUploading = false;
                setTimeout(() => { progressBar.style.display = 'none'; }, 1000);
                validarFormularioReserva();
            }
        }

        function mostrarDialogoContinuar() {
            if (document.getElementById('continuarDialogo')) return;
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.id = 'continuarDialogo';
            overlay.innerHTML = `<div class="confirm-dialog"><i class="fas fa-shopping-basket"></i><h3>¿Continuar con pedido anterior?</h3><p>Parece que tienes un pedido sin finalizar de hace menos de una hora. ¿Deseas continuar donde lo dejaste?</p><div class="confirm-dialog-buttons"><button class="btn-cancel" id="cancelarPedidoAnterior">Cancelar</button><button class="btn-confirm" id="confirmarPedidoAnterior">Continuar</button></div></div>`;
            document.body.appendChild(overlay);
            document.getElementById('cancelarPedidoAnterior').addEventListener('click', () => {
                document.getElementById('continuarDialogo').remove();
                carrito = []; guardarCarrito(); actualizarCarritoUI(); actualizarCarritoBadge();
                limpiarDatosFormulario(); limpiarReferencias('delivery'); limpiarReferencias('reserva');
                window.pedidoAnterior = null;
            });
            document.getElementById('confirmarPedidoAnterior').addEventListener('click', () => {
                if (window.pedidoAnterior && window.pedidoAnterior.length > 0) {
                    carrito = window.pedidoAnterior;
                    guardarCarrito();
                    actualizarCarritoBadge();
                    window.stockCache.invalidate();
                    mostrarToast('🔄 Pedido anterior restaurado', 'success');
                    if (window.innerWidth <= 992) {
                        document.getElementById('cartSidebar').classList.add('open');
                        document.getElementById('overlay').classList.add('active');
                    }
                    _enfocarUltimoItemCarrito(carrito[carrito.length - 1]);
                }
                document.getElementById('continuarDialogo').remove();
                window.pedidoAnterior = null;
            });
        }

        function mostrarToast(msg, tipo) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.className = `toast show ${tipo}`;
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        function copiarAlPortapapeles(texto, boton) {
            navigator.clipboard.writeText(texto).then(() => {
                const icono = boton.querySelector('i'), claseOriginal = icono.className;
                icono.className = 'fas fa-check'; boton.classList.add('copied');
                setTimeout(() => { icono.className = claseOriginal; boton.classList.remove('copied'); }, 1500);
                mostrarToast('✅ Copiado al portapapeles', 'success');
            }).catch(err => { console.error('Error al copiar:', err); mostrarToast('❌ Error al copiar', 'error'); });
        }

        function toggleMenuCategorias() {
            const menu = document.getElementById('categorySidebar'), carrito = document.getElementById('cartSidebar'), overlay = document.getElementById('overlay');
            if (window.innerWidth <= 992) {
                if (menu.classList.contains('open')) {
                    menu.classList.remove('open');
                    if (!carrito.classList.contains('open') && !document.getElementById('notificationsPanel').classList.contains('active')) overlay.classList.remove('active');
                } else {
                    menu.classList.add('open');
                    overlay.classList.add('active');
                    carrito.classList.remove('open');
                    document.getElementById('notificationsPanel').classList.remove('active');
                }
            }
        }

        function cerrarMenuCategorias() {
            if (window.innerWidth <= 992) {
                document.getElementById('categorySidebar').classList.remove('open');
                if (!document.getElementById('cartSidebar').classList.contains('open') && !document.getElementById('notificationsPanel').classList.contains('active')) document.getElementById('overlay').classList.remove('active');
            }
        }

        function toggleCarrito() {
            const carrito = document.getElementById('cartSidebar'), menu = document.getElementById('categorySidebar'), overlay = document.getElementById('overlay');
            if (window.innerWidth <= 992) {
                if (carrito.classList.contains('open')) {
                    carrito.classList.remove('open');
                    if (!menu.classList.contains('open') && !document.getElementById('notificationsPanel').classList.contains('active')) overlay.classList.remove('active');
                } else {
                    carrito.classList.add('open');
                    overlay.classList.add('active');
                    menu.classList.remove('open');
                    document.getElementById('notificationsPanel').classList.remove('active');
                }
            }
            if (carrito.classList.contains('open') && carrito.length > 0) iniciarSeguimientoScroll(); else detenerSeguimientoScroll();
        }

        function cerrarCarrito() {
            if (window.innerWidth <= 992) {
                document.getElementById('cartSidebar').classList.remove('open');
                if (!document.getElementById('categorySidebar').classList.contains('open') && !document.getElementById('notificationsPanel').classList.contains('active')) document.getElementById('overlay').classList.remove('active');
            }
            detenerSeguimientoScroll();
        }

        function cerrarNotificaciones() {
            const panel = document.getElementById('notificationsPanel'), overlay = document.getElementById('overlay');
            panel.classList.remove('active');
            if (window.innerWidth <= 992 && !document.getElementById('categorySidebar').classList.contains('open') && !document.getElementById('cartSidebar').classList.contains('open')) overlay.classList.remove('active');
        }

        function cerrarTodosLosPaneles() {
            if (window.innerWidth <= 992) {
                document.getElementById('categorySidebar').classList.remove('open');
                document.getElementById('cartSidebar').classList.remove('open');
                document.getElementById('overlay').classList.remove('active');
            }
            document.getElementById('notificationsPanel').classList.remove('active');
        }

        function setupReferenceInputs() {
            document.querySelectorAll('.ref-digit').forEach(input => {
                input.addEventListener('input', function() {
                    const type = this.dataset.type, index = parseInt(this.dataset.index);
                    if (this.value.length === 1 && index < 5) document.querySelector(`.ref-digit[data-type="${type}"][data-index="${index + 1}"]`).focus();
                    if (type === 'delivery') { validarFormularioDelivery(); guardarDatosDelivery(); }
                    else { validarFormularioReserva(); guardarDatosReserva(); }
                    const errEl = document.getElementById(type === 'delivery' ? 'errorRefDelivery' : 'errorRefReserva');
                    if (errEl) errEl.style.display = 'none';
                });
                input.addEventListener('keydown', function(e) {
                    const type = this.dataset.type, index = parseInt(this.dataset.index);
                    if (e.key === 'Backspace' && this.value.length === 0 && index > 0) document.querySelector(`.ref-digit[data-type="${type}"][data-index="${index - 1}"]`).focus();
                });
                input.addEventListener('blur', function() {
                    const type = this.dataset.type;
                    const digits = document.querySelectorAll(`.ref-digit[data-type="${type}"]`);
                    const llenos = [...digits].filter(d => d.value.length === 1).length;
                    const errEl = document.getElementById(type === 'delivery' ? 'errorRefDelivery' : 'errorRefReserva');
                    if (!errEl) return;
                    const alguno = [...digits].some(d => d.value.length === 1);
                    errEl.style.display = (alguno && llenos < 6) ? 'block' : 'none';
                });
            });
        }

        function setupEventListeners() {
            const menuToggle = document.getElementById('menuToggle');
            if (menuToggle) menuToggle.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); toggleMenuCategorias(); });
            
            const closeCategoryMenu = document.getElementById('closeCategoryMenu');
            if (closeCategoryMenu) closeCategoryMenu.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); cerrarMenuCategorias(); });
            
            const cartToggle = document.getElementById('cartToggle');
            if (cartToggle) cartToggle.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); toggleCarrito(); });
            
            const closeCart = document.getElementById('closeCart');
            if (closeCart) closeCart.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); cerrarCarrito(); });
            
            const notificationBell = document.getElementById('notificationBell');
            if (notificationBell) notificationBell.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); toggleNotifications(); });
            
            const overlay = document.getElementById('overlay');
            if (overlay) overlay.addEventListener('click', function() { cerrarTodosLosPaneles(); });
            
            document.getElementById('searchInput').addEventListener('input', (e) => {
                const cat = document.querySelector('.category-item.active')?.dataset.categoria;
                renderizarMenuPaginado(cat === 'todos' ? null : cat, null, e.target.value);
            });
            
            
            document.getElementById('closeCustomizeModal').addEventListener('click', () => { 
                document.getElementById('customizeModal').classList.remove('active'); 
                currentCustomizeItem = null;
            });
            document.getElementById('cancelCustomize').addEventListener('click', () => { 
                document.getElementById('customizeModal').classList.remove('active'); 
                currentCustomizeItem = null;
            });
            document.getElementById('addToCartFromModal').addEventListener('click', agregarPersonalizadoAlCarrito);
            
            document.getElementById('closeDeliveryModal').addEventListener('click', () => { 
                detenerTimer('delivery'); 
                document.getElementById('deliveryModal').classList.remove('active');
            });
            document.getElementById('cancelDelivery').addEventListener('click', () => { 
                detenerTimer('delivery'); 
                document.getElementById('deliveryModal').classList.remove('active');
            });
            
            document.getElementById('closeReservaModal').addEventListener('click', () => { 
                detenerTimer('reserva'); 
                document.getElementById('reservaModal').classList.remove('active');
            });
            document.getElementById('cancelReserva').addEventListener('click', () => { 
                detenerTimer('reserva'); 
                document.getElementById('reservaModal').classList.remove('active');
            });
            
            document.getElementById('closePreviewModal').addEventListener('click', cerrarPreview);
            
            setupReferenceInputs();
            
            document.getElementById('direccion').addEventListener('input', actualizarContadorDireccion);
            document.getElementById('telefono').addEventListener('input', () => { validarFormularioDelivery(); guardarDatosDelivery(); });
            document.getElementById('fechaReserva').addEventListener('input', () => { validarFormularioReserva(); guardarDatosReserva(); });
            document.getElementById('nombreReserva').addEventListener('input', () => { validarFormularioReserva(); guardarDatosReserva(); });
            
            document.getElementById('confirmMesaOrder').addEventListener('click', confirmarPedidoMesa);
            document.getElementById('confirmDelivery').addEventListener('click', confirmarPedidoDelivery);
            document.getElementById('confirmReserva').addEventListener('click', confirmarPedidoReserva);
            
            document.getElementById('cancelMesaOrder').addEventListener('click', () => { 
                document.getElementById('confirmMesaModal').classList.remove('active');
            });
            document.getElementById('closeConfirmMesaModal').addEventListener('click', () => { 
                document.getElementById('confirmMesaModal').classList.remove('active');
            });
            
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        if (modal.id === 'deliveryModal') detenerTimer('delivery');
                        if (modal.id === 'reservaModal') detenerTimer('reserva');
                        modal.classList.remove('active');
                    }
                });
            });
            
            document.getElementById('parroquiaSearch').addEventListener('input', filtrarParroquias);
            
            document.addEventListener('click', (e) => {
                const panel = document.getElementById('notificationsPanel'), bell = document.getElementById('notificationBell');
                if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target) && panel.classList.contains('active')) {
                    panel.classList.remove('active');
                    if (window.innerWidth <= 992 && !document.getElementById('categorySidebar').classList.contains('open') && !document.getElementById('cartSidebar').classList.contains('open')) document.getElementById('overlay').classList.remove('active');
                }
            });
            
            window.addEventListener('resize', function() {
                if (window.innerWidth > 992) {
                    document.getElementById('categorySidebar').classList.remove('open');
                    document.getElementById('cartSidebar').classList.remove('open');
                    document.getElementById('overlay').classList.remove('active');
                }
            });
            
        }

        function restaurarDatosFormulario() {
            // Solo restaura datos de formularios guardados en esta sesión activa
            // sessionStorage se borra al cerrar el tab — no persiste entre sesiones
            const savedDelivery = sessionStorage.getItem('saki_delivery_data');
            if (savedDelivery) { try { deliveryFormData = JSON.parse(savedDelivery); } catch (e) {} }
            const savedReserva = sessionStorage.getItem('saki_reserva_data');
            if (savedReserva) { try { reservaFormData = JSON.parse(savedReserva); } catch (e) {} }
        }

        function generarId(prefix = '') {
            return window.crypto?.randomUUID ? prefix + crypto.randomUUID() : prefix + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        }

        function formatBs(monto) {
            try {
                const valor = Math.round((monto || 0) * 100) / 100;
                let [entero, decimal] = valor.toFixed(2).split('.');
                entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                return `Bs ${entero},${decimal}`;
            } catch (e) {
                return 'Bs ' + (monto || 0).toFixed(2);
            }
        }

        function usdToBs(usd) {
            return usd * (configGlobal?.tasa_efectiva || 400);
        }


  // ────────────────────────────────────────────────────────────
  // INICIALIZACIÓN - VERSIÓN OPTIMIZADA (SIN setInterval)
  // ────────────────────────────────────────────────────────────



		document.addEventListener('DOMContentLoaded', async () => {
			
			cargarTemaGuardado();
			restaurarCarrito();
			actualizarCarritoBadge();
			
			await cargarConfiguracion();
			
			// Cargar menú e inventario en paralelo — renderizar solo cuando ambos estén listos
			await Promise.all([cargarMenuSinRenderizar(), cargarInventario()]);
			precalcularStockMenu();
			// Respetar última categoría visitada
			const _ultCat = localStorage.getItem('saki_ultima_categoria');
			if (_ultCat && _ultCat !== 'todos') {
				renderizarMenuPaginado(_ultCat);
			} else {
				renderizarMenuPaginado();
			}
			
			cargarCategorias();
			
			restaurarDatosFormulario();
			
			await recargarNotificacionesCompletas();
			
			solicitarPermisoPushAuto();
			
			// --- CAMBIO IMPORTANTE: Solo usar Realtime, NO setInterval ---
			iniciarVerificacionPeriodica(); // Esta es la VERSIÓN NUEVA (sin setInterval)
			
			setupEventListeners();
			
			actualizarCarritoUI();
			verificarPermisosAudio();
			actualizarBotonHistorial();
			
			// Comprimir el botón de historial 3 segundos después de cargar la página
			setTimeout(() => {
				const btn = document.getElementById('historialPedidosBtn');
				if (btn && btn.style.display !== 'none') btn.classList.add('comprimido');
			}, 3000);
			
			const hoy = new Date().toISOString().split('T')[0];
			document.getElementById('fechaReserva').min = hoy;
			
			if (mesaId) {
				document.getElementById('tableNumber').textContent = mesaId;
                        document.getElementById('mesaRow').style.display = 'flex';
				// tableBadge now inside mesaRow (shown via mesaRow)
				document.getElementById('confirmTableNumber').textContent = mesaId;
				
				const headerIcons = document.getElementById('headerIcons'),
					  bellWrapper = headerIcons.children[0],
					  cartWrapper = headerIcons.children[1],
					  badge = headerIcons.children[2];
				
				headerIcons.innerHTML = '';
				headerIcons.appendChild(bellWrapper);
				headerIcons.appendChild(cartWrapper);
				headerIcons.appendChild(badge);
				headerIcons.classList.add('left-aligned');
			}
			

			// ── Sistema de navegación con botón atrás ──────────────────────────
			(function(){
				window._sakiReady = true;
				var depth = 2;
				var avisando = false, avisoTimer = null;
				var av = document.getElementById('_salidaAviso');
				var modConCarrito = new Set(['confirmMesaModal','deliveryModal','reservaModal']);

				function push(){ depth++; history.pushState({saki:1,d:depth},''); }

				function mostrar(){
					if(avisando){ avisando=false; window.location.replace(document.referrer||'about:blank'); return; }
					avisando=true; push(); av.style.display='flex';
					clearTimeout(avisoTimer);
					avisoTimer=setTimeout(function(){ av.style.display='none'; avisando=false; push(); },5000);
				}
				function ocultar(){ av.style.display='none'; avisando=false; clearTimeout(avisoTimer); }

				document.getElementById('_salidaSi').addEventListener('click',function(){
					avisando=false; av.style.display='none'; window.location.replace(document.referrer||'about:blank');
				});
				document.getElementById('_salidaNo').addEventListener('click',function(){
					avisando=false; av.style.display='none'; clearTimeout(avisoTimer); push();
				});

				function abrirCarrito(){
					var c=document.getElementById('cartSidebar'),o=document.getElementById('overlay');
					if(!c) return; c.classList.add('open');
					if(o&&innerWidth<=992) o.classList.add('active');
					var m=document.getElementById('categorySidebar'); if(m) m.classList.remove('open');
					var n=document.getElementById('notificationsPanel'); if(n) n.classList.remove('active');
				}
				function cerrarCarrito(){
					var c=document.getElementById('cartSidebar'),o=document.getElementById('overlay');
					if(!c) return; c.classList.remove('open');
					if(o&&!document.getElementById('categorySidebar')?.classList.contains('open')&&!document.getElementById('notificationsPanel')?.classList.contains('active')) o.classList.remove('active');
					detenerSeguimientoScroll();
				}

				function contarCapas(){
					var n=document.querySelectorAll('.modal-overlay.active').length;
					if(document.getElementById('notificationsPanel')?.classList.contains('active')) n++;
					if(document.querySelector('[id^="nivel2-"].expanded')) n++;
					if(document.querySelector('[id^="nivel1-"].expanded')) n++;
					if(document.getElementById('cartSidebar')?.classList.contains('open')) n++;
					if(document.querySelector('.subcategory-list.expanded')) n++;
					if(document.getElementById('categorySidebar')?.classList.contains('open')) n++;
					return n;
				}
				function sincronizar(){
					var c=contarCapas();
					if(c>depth) for(var i=c-depth;i>0;i--) push();
					else if(c<depth) depth=c;
					if(c===0) ocultar();
				}

				function cerrarCapa(){
					// 1. Modal
					var mods=Array.from(document.querySelectorAll('.modal-overlay.active'));
					if(mods.length){ ocultar();
						var m=mods[mods.length-1];
						if(m.id==='deliveryModal') detenerTimer('delivery');
						if(m.id==='reservaModal') detenerTimer('reserva');
						m.classList.remove('active');
						if(modConCarrito.has(m.id)) abrirCarrito();
						sincronizar(); return; }
					// 2. Notificaciones
					var np=document.getElementById('notificationsPanel');
					if(np?.classList.contains('active')){ ocultar(); np.classList.remove('active');
						var o=document.getElementById('overlay');
						if(o&&!document.getElementById('categorySidebar')?.classList.contains('open')&&!document.getElementById('cartSidebar')?.classList.contains('open')) o.classList.remove('active');
						sincronizar(); return; }
					// 3. Nivel2
					var n2=document.querySelector('[id^="nivel2-"].expanded');
					if(n2){ ocultar(); var i2=document.getElementById('icon2-'+n2.id.replace('nivel2-',''));
						n2.classList.remove('expanded'); if(i2) i2.classList.remove('rotated');
						nivel2Activo=null; sincronizar(); return; }
					// 4. Nivel1
					var n1=document.querySelector('[id^="nivel1-"].expanded');
					if(n1){ ocultar(); var i1=document.getElementById('icon1-'+n1.id.replace('nivel1-',''));
						n1.classList.remove('expanded'); if(i1) i1.classList.remove('rotated');
						n1.querySelectorAll('[id^="nivel2-"].expanded').forEach(function(el){
							el.classList.remove('expanded');
							var ic=document.getElementById('icon2-'+el.id.replace('nivel2-',''));
							if(ic) ic.classList.remove('rotated');
						});
						nivel1Activo=null; nivel2Activo=null; sincronizar(); return; }
					// 5. Carrito
					if(document.getElementById('cartSidebar')?.classList.contains('open')){ ocultar(); cerrarCarrito(); sincronizar(); return; }
					// 6. Subcategoría
					var sub=document.querySelector('.subcategory-list.expanded');
					if(sub){ ocultar(); sub.classList.remove('expanded'); sincronizar(); return; }
					// 7. Menú hamburguesa
					var cs=document.getElementById('categorySidebar');
					if(cs?.classList.contains('open')){ ocultar(); cs.classList.remove('open');
						var o2=document.getElementById('overlay');
						if(o2&&!document.getElementById('cartSidebar')?.classList.contains('open')&&!document.getElementById('notificationsPanel')?.classList.contains('active')) o2.classList.remove('active');
						sincronizar(); return; }
					// 8. Sin capas → aviso
					depth=0; mostrar();
				}

				window.addEventListener('popstate', function(e){
					if(e.state&&e.state.saki) depth=e.state.d||0; else push();
					cerrarCapa();
				});

				// MutationObserver para sincronizar el stack automáticamente
				var obs=new MutationObserver(function(ms){ ms.forEach(function(m){ if(m.attributeName==='class') sincronizar(); }); });
				document.querySelectorAll('.modal-overlay,#notificationsPanel').forEach(function(el){ obs.observe(el,{attributes:true,attributeFilter:['class']}); });
				var catEl=document.getElementById('categorySidebar'), cartEl=document.getElementById('cartSidebar');
				if(catEl){ obs.observe(catEl,{attributes:true,attributeFilter:['class']}); new MutationObserver(function(){ sincronizar(); }).observe(catEl,{subtree:true,attributes:true,attributeFilter:['class']}); }
				if(cartEl){ obs.observe(cartEl,{attributes:true,attributeFilter:['class']}); new MutationObserver(function(){ sincronizar(); }).observe(cartEl,{subtree:true,attributes:true,attributeFilter:['class']}); }

				// Parches de toggles
				var _ot=window.toggleCarrito; window.toggleCarrito=function(){ _ot?.apply(this,arguments); sincronizar(); };
				var _om=window.toggleMenuCategorias; window.toggleMenuCategorias=function(){ _om?.apply(this,arguments); sincronizar(); };
				var _on=window.toggleNotifications; window.toggleNotifications=function(){ _on?.apply(this,arguments); sincronizar(); };
				var _o1=window.toggleNivel1; window.toggleNivel1=function(g){ _o1?.(g); sincronizar(); };
				var _o2=window.toggleNivel2; window.toggleNivel2=function(s,p){ _o2?.(s,p); sincronizar(); };
				window._sincronizarBackStack=sincronizar;
			})();
			// ── fin sistema botón atrás ───────────────────────────────────────────

			resetToAllCategories(false);
		});

        window.addEventListener('beforeunload', () => {
            if (_realtimeChannel) window.supabaseClient.removeChannel(_realtimeChannel);
            Object.values(intervalosTimer).forEach(clearInterval);
            detenerSeguimientoScroll();
            if (scrollTimeout) clearTimeout(scrollTimeout);
        });

        window.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                paginaVisible = false;
                detenerSeguimientoScroll();
            } else {
                paginaVisible = true;
                // Al volver a visible, recargar una vez por si se perdió algún evento
                recargarNotificacionesCompletas();
                if (carrito.length > 0 && document.getElementById('cartSidebar').classList.contains('open')) iniciarSeguimientoScroll();
            }
        });
