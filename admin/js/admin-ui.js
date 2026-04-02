// admin-ui.js - UI genérica: tabs, modales, eventos, helpers visuales
(function() {
    window.setupEventListeners = function() {
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

        document.getElementById('platilloDisponibleCheck')?.addEventListener('change', function() {
            const lbl = document.getElementById('platilloDisponibleLabel');
            const sel = document.getElementById('platilloDisponible');
            if (lbl) { lbl.textContent = this.checked ? 'Sí' : 'No'; lbl.style.color = this.checked ? 'var(--success)' : 'var(--text-muted)'; }
            if (sel) sel.value = this.checked ? 'true' : 'false';
        });

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

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    window.cerrarModal(this.id);
                    if (this.id === 'ingredienteModal') {
                        window.resetearBloqueoStock();
                    }
                }
            });
        });

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

        const _closeQrBtn  = document.getElementById('closeQrAmpliado');
        const _closeQrX    = document.getElementById('closeQrAmpliadoModal');
        const _qrModal     = document.getElementById('qrAmpliadoModal');
        if (_closeQrBtn) _closeQrBtn.addEventListener('click', () => window.cerrarModal('qrAmpliadoModal'));
        if (_closeQrX)   _closeQrX.addEventListener('click',   () => window.cerrarModal('qrAmpliadoModal'));
        if (_qrModal) _qrModal.addEventListener('click', function(e) {
            if (e.target === this) window.cerrarModal('qrAmpliadoModal');
        });

        document.getElementById('logoutButton').addEventListener('click', () => {
            sessionStorage.removeItem('admin_authenticated');
            sessionStorage.removeItem('admin_jwt_token');
            sessionStorage.removeItem('admin_user');
            window.isAdminAuthenticated = false;
            window.jwtToken = null;
            window.mostrarLogin();
            window.mostrarToast('🔓 Sesión cerrada', 'info');
            window.supabaseClient = window.inicializarSupabaseCliente();
        });
		
    };

    window.toggleTheme = function() {
        const html = document.documentElement;
        const icon = document.getElementById('themeIcon');
        const isDark = html.classList.toggle('dark-theme');
        if (icon) {
            icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        }
        localStorage.setItem('saki_admin_theme', isDark ? 'dark' : 'light');
    };

    window.initTheme = function() {
        const savedTheme = localStorage.getItem('saki_admin_theme');
        const icon = document.getElementById('themeIcon');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark-theme');
            if (icon) icon.className = 'fas fa-moon';
        } else {
            document.documentElement.classList.remove('dark-theme');
            if (icon) icon.className = 'fas fa-sun';
        }
    };

    window.abrirSelectorMesaAdmin = async function() {
        const list = document.getElementById('adminMesaList');
        list.innerHTML = '<p style="color:var(--text-muted)">Cargando mesas...</p>';
        document.getElementById('adminMesaModal').classList.add('active');
        try {
            const { data, error } = await window.supabaseClient
                .from('codigos_qr').select('*').order('nombre');
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
	    // ==================== INICIALIZACIÓN AL CARGAR LA PÁGINA ====================
    document.addEventListener('DOMContentLoaded', async () => {
        window.initTheme();
        if (await window.restaurarSesionAdmin()) {
            window.mostrarPanel();
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
})();
