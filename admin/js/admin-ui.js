// admin-ui.js - UI genérica: tabs, modales, eventos, helpers visuales
(function() {
    window.irADeliverys = function() {
        var tabs = document.querySelectorAll('.tab');
        var panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(function(t){ t.classList.remove('active'); });
        panes.forEach(function(p){ p.classList.remove('active'); });
        var t = document.querySelector('.tab[data-tab="deliverys"]');
        var p = document.getElementById('deliverysPane');
        if (t) t.classList.add('active');
        if (p) { p.classList.add('active'); p.scrollIntoView({behavior:'smooth',block:'start'}); }
    };
    window.irAMenu = function() {
        var tabs = document.querySelectorAll('.tab');
        var panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(function(t){ t.classList.remove('active'); });
        panes.forEach(function(p){ p.classList.remove('active'); });
        var t = document.querySelector('.tab[data-tab="menu"]');
        var p = document.getElementById('menuPane');
        if (t) t.classList.add('active');
        if (p) { p.classList.add('active'); p.scrollIntoView({behavior:'smooth',block:'start'}); }
    };
    window.irAStockCritico = function() {
        var tabs = document.querySelectorAll('.tab');
        var panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(function(t){ t.classList.remove('active'); });
        panes.forEach(function(p){ p.classList.remove('active'); });
        var t = document.querySelector('.tab[data-tab="dashboard"]');
        var p = document.getElementById('dashboardPane');
        if (t) t.classList.add('active');
        if (p) p.classList.add('active');
        setTimeout(function(){
            var el = document.getElementById('stockCritico'); if (!el) return;
            el.scrollIntoView({behavior:'smooth',block:'center'});
            var par = el.closest('.lower-stock') || el.parentElement;
            if (par) {
                var n = 0;
                var iv = setInterval(function(){
                    n++;
                    par.style.boxShadow = n%2===0 ? '0 0 0 3px #FFC107,0 0 20px rgba(255,193,7,.4)' : 'none';
                    par.style.borderColor = n%2===0 ? '#FFC107' : '';
                    if (n >= 6) { clearInterval(iv); par.style.boxShadow=''; par.style.borderColor=''; }
                }, 300);
            }
        }, 150);
    };
        window.setupEventListeners = function() {
        // Funciones de scroll para tabs con doble chevron
        window._scrollTabs = function(dir) {
            const c = document.getElementById('tabsContainer');
            if (!c) return;
            c.scrollBy({ left: dir * 180, behavior: 'smooth' });
            setTimeout(window._updateTabChevrons, 200);
        };
        window._updateTabChevrons = function() {
            const c = document.getElementById('tabsContainer');
            const lBtn = document.getElementById('tabsChevronLeft');
            const rBtn = document.getElementById('tabsChevronRight');
            if (!c || !lBtn || !rBtn) return;
            lBtn.style.opacity = c.scrollLeft > 4 ? '1' : '0.3';
            lBtn.style.pointerEvents = c.scrollLeft > 4 ? 'auto' : 'none';
            const atEnd = c.scrollLeft + c.clientWidth >= c.scrollWidth - 4;
            rBtn.style.opacity = atEnd ? '0.3' : '1';
            rBtn.style.pointerEvents = atEnd ? 'none' : 'auto';
        };
        document.getElementById('tabsContainer')?.addEventListener('scroll', window._updateTabChevrons);
        window._updateTabChevrons();

        // Checkbox de disponible en modal platillo
        document.getElementById('platilloDisponibleCheck')?.addEventListener('change', function() {
            const lbl = document.getElementById('platilloDisponibleLabel');
            const sel = document.getElementById('platilloDisponible');
            if (lbl) { lbl.textContent = this.checked ? 'Sí' : 'No'; lbl.style.color = this.checked ? 'var(--success)' : 'var(--text-muted)'; }
            if (sel) sel.value = this.checked ? 'true' : 'false';
        });

        // Navegación por tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
                const pane = document.getElementById(target + 'Pane');
                if (pane) pane.classList.add('active');
                if (target !== 'qr') {
                    const el = document.getElementById('qrNombreMesa');
                    if (el) el.value = '';
                }
            });
        });

        // Cerrar modales al hacer clic fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    window.cerrarModal(this.id);
                }
            });
        });

        // Guardar configuración de tasa
        document.getElementById('saveAllButton').addEventListener('click', async () => { await window.guardarConfiguracion(); });
        document.getElementById('tasaBaseInput').addEventListener('change', window.recalcularTasaEfectiva);
        document.getElementById('aumentoDiarioInput').addEventListener('change', window.recalcularTasaEfectiva);
        
        function _mostrarFechasAumento(visible) {
            document.getElementById('tasaFechasDiv').style.display = visible ? 'flex' : 'none';
        }
        function _actualizarLabelAumento() {
            const diario   = document.getElementById('aumentoActivoToggle').checked;
            const semanal  = document.getElementById('aumentoSemanalToggle').checked;
            const alguno   = diario || semanal;
            const label = document.getElementById('labelAumentoPct');
            if (label) label.textContent = semanal ? 'Aumento Semanal %:' : 'Aumento Diario %:';
            const inputPct = document.getElementById('aumentoDiarioInput');
            if (inputPct) {
                inputPct.disabled = !alguno;
                inputPct.style.opacity = alguno ? '1' : '0.4';
                inputPct.style.cursor  = alguno ? '' : 'not-allowed';
            }
            _mostrarFechasAumento(alguno);
            if (alguno && !document.getElementById('aumentoDesde').value) {
                document.getElementById('aumentoDesde').value = new Date().toISOString().split('T')[0];
            }
        }
        document.getElementById('aumentoActivoToggle').addEventListener('change', function() {
            if (this.checked) document.getElementById('aumentoSemanalToggle').checked = false;
            window.configGlobal.aumento_detenido = !this.checked;
            _actualizarLabelAumento();
            window.recalcularTasaEfectiva();
        });
        document.getElementById('aumentoSemanalToggle').addEventListener('change', function() {
            if (this.checked) document.getElementById('aumentoActivoToggle').checked = false;
            window.configGlobal.aumento_detenido = !this.checked;
            _actualizarLabelAumento();
            window.recalcularTasaEfectiva();
        });
        document.getElementById('aumentoIndefinido').addEventListener('change', function() {
            document.getElementById('aumentoHasta').disabled = this.checked;
            if (this.checked) document.getElementById('aumentoHasta').value = '';
        });

        // Modales QR
        const _closeQrBtn  = document.getElementById('closeQrAmpliado');
        const _closeQrX    = document.getElementById('closeQrAmpliadoModal');
        const _qrModal     = document.getElementById('qrAmpliadoModal');
        if (_closeQrBtn) _closeQrBtn.addEventListener('click', () => window.cerrarModal('qrAmpliadoModal'));
        if (_closeQrX)   _closeQrX.addEventListener('click',   () => window.cerrarModal('qrAmpliadoModal'));
        if (_qrModal) _qrModal.addEventListener('click', function(e) {
            if (e.target === this) window.cerrarModal('qrAmpliadoModal');
        });

        // Botón logout
        ['logoutButton', 'logoutButtonMobile'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => {
                if (typeof window.cerrarSesion === 'function') window.cerrarSesion();
                else { sessionStorage.clear(); window.location.reload(); }
            });
        });
    };

    // Dentro de admin-ui.js, reemplazar las funciones de tema y añadir setup del header

	window.toggleTheme = function() {
		const html = document.documentElement;
		const isDark = html.classList.toggle('dark-theme');
		const themeIcon = document.getElementById('themeIcon');
		if (themeIcon) {
			themeIcon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
		}
		localStorage.setItem('saki_admin_theme', isDark ? 'dark' : 'light');
	};

	window.initTheme = function() {
		const savedTheme = localStorage.getItem('saki_admin_theme');
		const themeIcon = document.getElementById('themeIcon');
		if (savedTheme === 'dark') {
			document.documentElement.classList.add('dark-theme');
			if (themeIcon) themeIcon.className = 'fas fa-moon';
		} else {
			document.documentElement.classList.remove('dark-theme');
			if (themeIcon) themeIcon.className = 'fas fa-sun';
		}
	};

	// Setup del header: reemplazar corona por logo y convertir theme toggle a theme-switcher
	window.setupHeader = function() {
		const headerTitle = document.querySelector('.header-left h2');
		if (headerTitle) {
			const originalHtml = headerTitle.innerHTML;
			// Reemplazar ícono corona por logo
			headerTitle.innerHTML = `<img src="https://lh3.googleusercontent.com/pw/AP1GczPrZAoWxmsOGRD9xl1hO5Q65JXuwUZzoR6gUk-cw5lVmarxQe_-lwqpA60tTKLlXfpvIjAJlKC6jFls-xETJOPkebLIIPhbGlUkknmhrRbdhMUll2UViGSUj3WmHKg2YEsZlAfxBPPTjIHhScjD0jfe=w1439-h1439-s-no-gm" alt="Saki Sushi" style="width:32px;height:32px;border-radius:50%;margin-right:8px"> Administración Saki Sushi`;
		}
		// Convertir theme toggle a theme-switcher
		const themeBtn = document.getElementById('themeToggle');
		if (themeBtn) {
			themeBtn.className = 'theme-switcher';
			themeBtn.innerHTML = '<i class="fas fa-sun"></i><i class="fas fa-moon"></i>';
			themeBtn.onclick = () => window.toggleTheme();
		}
	};

    window.abrirSelectorMesaAdmin = async function() {
        const list = document.getElementById('adminMesaList');
        list.innerHTML = '<p style="color:var(--text-muted)">Cargando mesas...</p>';
        document.getElementById('adminMesaModal').classList.add('active');
        try {
            const { data, error } = await window.supabaseClient.from('codigos_qr').select('*').order('nombre');
            if (error) throw error;
            const mesas = data || [];
            if (!mesas.length) {
                list.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1">No hay mesas creadas. Genera QRs en la pestaña Códigos QR.</p>';
                return;
            }
            list.innerHTML = '';
            mesas.forEach(mesa => {
                const url = window.location.origin + '/SakiSushi0/Cliente/index.html?mesa=' + encodeURIComponent(mesa.nombre);
                const btn = document.createElement('button');
                btn.className = 'mesa-admin-btn';
                btn.innerHTML = '<i class="fas fa-chair"></i><span>' + mesa.nombre + '</span>';
                btn.addEventListener('click', function() {
                    window.open(url, '_blank');
                    window.cerrarModal('adminMesaModal');
                });
                list.appendChild(btn);
            });
        } catch(e) {
            list.innerHTML = '<p style="color:var(--danger)">Error cargando mesas: ' + (e.message || e) + '</p>';
        }
    };

    window._irAMesoneros = function() {
        const tabs = document.querySelectorAll('.tab');
        const panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(tab => tab.classList.remove('active'));
        panes.forEach(pane => pane.classList.remove('active'));
        const mesonerosTab = document.querySelector('.tab[data-tab="mesoneros"]');
        const mesonerosPane = document.getElementById('mesonerosPane');
        if (mesonerosTab) mesonerosTab.classList.add('active');
        if (mesonerosPane) mesonerosPane.classList.add('active');
        setTimeout(() => {
            mesonerosPane?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // Animación para resaltar elemento (stock crítico)
    window.resaltarElemento = function(elementoId, tipo = 'border') {
        const el = document.getElementById(elementoId);
        if (!el) return;
        if (tipo === 'border') {
            el.style.transition = 'box-shadow 0.3s, border-color 0.3s';
            el.style.boxShadow = '0 0 0 3px var(--danger)';
            el.style.borderColor = 'var(--danger)';
            setTimeout(() => {
                el.style.boxShadow = '';
                el.style.borderColor = '';
            }, 1500);
        } else if (tipo === 'pulse') {
            el.style.animation = 'pulse 0.6s ease-in-out 2';
            setTimeout(() => { el.style.animation = ''; }, 1200);
        }
    };

    // ==================== INICIALIZACIÓN AL CARGAR LA PÁGINA ====================
    document.addEventListener('DOMContentLoaded', async () => {
        window.initTheme();
		// Inicializar UI de login (cargar lista de administradores)
		window.iniciarLoginUI();
        if (await window.restaurarSesionAdmin()) {
            window.mostrarPanel();
            // Actualizar header con nombre de usuario
            const user = JSON.parse(sessionStorage.getItem('admin_user') || '{}');
            const headerTitle = document.querySelector('.header-left h2');
            if (headerTitle && user.nombre) {
                headerTitle.innerHTML = `<i class="fas fa-crown"></i> Administración Saki Sushi - ${user.nombre}`;
            }
            setTimeout(async () => {
                try {
                    await window.cargarConfiguracionInicial();
                    await window.cargarMenu();
                    await window.cargarInventario();
                    await window.cargarUsuarios();
                    await window.cargarQRs();
                    await window.cargarReportes();
                    await window.cargarPedidosRecientes();
                    await window.cargarMesoneros();
                    await window.cargarDeliverys();
                    await window.cargarPropinas();
                    window.setupEventListeners();
                    window.setupRealtimeSubscriptions();
                    window.setupStockRealtime();
                    window.restaurarWifiPersistente();
                    window._registrarPushAdmin();
                    
                    // Agregar tarjeta de diferencia de tasa al dashboard
                    window.agregarTarjetaDiferenciaTasa();
                    
                    window._verificarTasaDeHoy((tasa) => {
                        const tasaInput = document.getElementById('tasaBaseInput');
                        if (tasaInput) tasaInput.value = tasa;
                        window.configGlobal.tasa_cambio = tasa;
                        window.recalcularTasaEfectiva();
                        window._verificarAvisoLunes();
                    });
                    await window._actualizarVentasHoyNeto();
                    await window._actualizarDeliverysHoy();
                    setInterval(async () => { 
                        await window._actualizarVentasHoyNeto();
                        await window._actualizarDeliverysHoy();
                        window.actualizarTarjetaDiferenciaTasa();
                    }, 60000);
                } catch (e) { 
                    console.error('Error cargando datos:', e); 
                    window.mostrarToast('Error cargando datos: ' + e.message, 'error'); 
                }
            }, 100);
        } else {
            window.mostrarLogin();
        }
    });

    // Función para agregar tarjeta de diferencia de tasa al dashboard
    window.agregarTarjetaDiferenciaTasa = function() {
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (!dashboardGrid) return;
        // Verificar si ya existe
        if (document.getElementById('diferenciaTasaCard')) return;
        const card = document.createElement('div');
        card.className = 'dashboard-card';
        card.id = 'diferenciaTasaCard';
        card.style.cursor = 'pointer';
        card.onclick = () => window.mostrarToast('Diferencia acumulada a favor del restaurante por aumento de tasa', 'info');
        card.innerHTML = `
            <div class="card-title">
                Acumulado Dif. Tasa Base y Efectiva 
                <span class="tooltip-wrap" style="position:relative; display:inline-flex; cursor:help; margin-left:.3rem">
                    <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:#aaa; color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                    <span class="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:250px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,.3); z-index:100; line-height:1.4">
                        Es la ganancia extra generada por la diferencia entre la tasa base y la tasa efectiva aplicada a los pedidos cobrados. Esta diferencia queda a favor del restaurante.
                    </span>
                </span>
            </div>
            <div class="card-value" id="diferenciaTasaValor">Bs 0,00</div>
        `;
        // Insertar como cuarta tarjeta (después de Deliverys Hoy)
        const deliverysCard = document.getElementById('deliverysHoyCard');
        if (deliverysCard && deliverysCard.parentNode) {
            deliverysCard.parentNode.insertBefore(card, deliverysCard.nextSibling);
        } else {
            dashboardGrid.appendChild(card);
        }
        window.actualizarTarjetaDiferenciaTasa();
    };

    window.actualizarTarjetaDiferenciaTasa = function() {
        const diff = window.calcularDiferenciaTasa();
        const valorEl = document.getElementById('diferenciaTasaValor');
        if (valorEl) valorEl.textContent = window.formatBs(diff);
    };
})();