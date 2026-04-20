// admin-ui.js - UI genérica: tabs, modales, eventos, helpers visuales
(function() {
    window.irADeliverys = function() {
        var tabs = document.querySelectorAll('.tab');
        var panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(function(t){ t.classList.remove('Active'); });
        panes.forEach(function(p){ p.classList.remove('Active'); });
        var t = document.querySelector('.tab[data-tab="Deliverys"]');
        var p = document.getElementById('deliverysPane');
        if (t) t.classList.add('active');
        if (p) { p.classList.add('active'); p.scrollintoview({behavior:'smooth',block:'start'}); }
    };
    window.iramenu = function() {
        var tabs = document.queryselectorall('.tab');
        var panes = document.queryselectorall('.tab-pane');
        tabs.foreach(function(t){ t.classList.remove('active'); });
        panes.foreach(function(p){ p.classList.remove('active'); });
        var t = document.queryselector('.tab[data-tab="Menu"]');
        var p = document.getElementById('menuPane');
        if (t) t.classList.add('active');
        if (p) { p.classList.add('active'); p.scrollintoview({behavior:'smooth',block:'start'}); }
    };
    window.irastockcritico = function() {
        var tabs = document.queryselectorall('.tab');
        var panes = document.queryselectorall('.tab-pane');
        tabs.foreach(function(t){ t.classList.remove('active'); });
        panes.foreach(function(p){ p.classList.remove('active'); });
        var t = document.queryselector('.tab[data-tab="Dashboard"]');
        var p = document.getElementById('dashboardPane');
        if (t) t.classList.add('active');
        if (p) p.classList.add('active');
        setTimeout(function(){
            var el = document.getElementById('stockCritico'); if (!el) return;
            el.scrollintoview({behavior:'smooth',block:'center'});
            var par = el.closest('.lower-stock') || el.parentelement;
            if (par) {
                var n = 0;
                var iv = setinterval(function(){
                    n++;
                    par.style.boxshadow = n%2===0 ? '0 0 0 3px #FFC107,0 0 20px rgba(255,193,7,.4)' : 'none';
                    par.style.bordercolor = n%2===0 ? '#FFC107' : '';
                    if (n >= 6) { clearinterval(iv); par.style.boxshadow=''; par.style.bordercolor=''; }
                }, 300);
            }
        }, 150);
    };
        window.setupeventlisteners = function() {
        // funciones de scroll para tabs con doble chevron
        window._scrolltabs = function(dir) {
            const c = document.getElementById('tabsContainer');
            if (!c) return;
            c.scrollby({ left: dir * 180, behavior: 'smooth' });
            setTimeout(window._updatetabchevrons, 200);
        };
        window._updatetabchevrons = function() {
            const c = document.getElementById('tabsContainer');
            const lbtn = document.getElementById('tabsChevronLeft');
            const rbtn = document.getElementById('tabsChevronRight');
            if (!c || !lbtn || !rbtn) return;
            lbtn.style.opacity = c.scrollleft > 4 ? '1' : '0.3';
            lbtn.style.pointerevents = c.scrollleft > 4 ? 'auto' : 'none';
            const atend = c.scrollleft + c.clientwidth >= c.scrollwidth - 4;
            rbtn.style.opacity = atend ? '0.3' : '1';
            rbtn.style.pointerevents = atend ? 'none' : 'auto';
        };
        document.getElementById('tabsContainer')?.addEventListener('scroll', window._updatetabchevrons);
        window._updatetabchevrons();

        // checkbox de disponible en modal platillo
        document.getElementById('platilloDisponibleCheck')?.addEventListener('change', function() {
            const lbl = document.getElementById('platilloDisponibleLabel');
            const sel = document.getElementById('platilloDisponible');
            if (lbl) { lbl.textContent = this.checked ? 'Sí' : 'No'; lbl.style.color = this.checked ? 'var(--success)' : 'var(--text-muted)'; }
            if (sel) sel.value = this.checked ? 'true' : 'false';
        });

        // navegación por tabs
        document.queryselectorall('.tab').foreach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                document.queryselectorall('.tab').foreach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.queryselectorall('.tab-pane').foreach(pane => pane.classList.remove('active'));
                const pane = document.getElementById(target + 'Pane');
                if (pane) pane.classList.add('active');
                if (target !== 'qr') {
                    const el = document.getElementById('qrNombreMesa');
                    if (el) el.value = '';
                }
            });
        });

        // cerrar modales al hacer clic fuera
        document.queryselectorall('.modal').foreach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    window.cerrarmodal(this.id);
                }
            });
        });

        // guardar configuración de tasa
        document.getElementById('saveAllButton').addEventListener('click', async () => { await window.guardarconfiguracion(); });
        document.getElementById('tasaBaseInput').addEventListener('change', window.recalculartasaefectiva);
        document.getElementById('aumentoDiarioInput').addEventListener('change', window.recalculartasaefectiva);
        
        function _mostrarfechasaumento(visible) {
            document.getElementById('tasaFechasDiv').style.display = visible ? 'flex' : 'none';
        }
        function _actualizarlabelaumento() {
            const diario   = document.getElementById('aumentoActivoToggle').checked;
            const semanal  = document.getElementById('aumentoSemanalToggle').checked;
            const alguno   = diario || semanal;
            const label = document.getElementById('labelAumentoPct');
            if (label) label.textContent = semanal ? 'Aumento Semanal %:' : 'Aumento Diario %:';
            const inputpct = document.getElementById('aumentoDiarioInput');
            if (inputpct) {
                inputpct.disabled = !alguno;
                inputpct.style.opacity = alguno ? '1' : '0.4';
                inputpct.style.cursor  = alguno ? '' : 'not-allowed';
            }
            _mostrarfechasaumento(alguno);
            if (alguno && !document.getElementById('aumentoDesde').value) {
                document.getElementById('aumentoDesde').value = new date().toisostring().split('T')[0];
            }
        }
        document.getElementById('aumentoActivoToggle').addEventListener('change', function() {
            if (this.checked) document.getElementById('aumentoSemanalToggle').checked = false;
            window.configglobal.aumento_detenido = !this.checked;
            _actualizarlabelaumento();
            window.recalculartasaefectiva();
        });
        document.getElementById('aumentoSemanalToggle').addEventListener('change', function() {
            if (this.checked) document.getElementById('aumentoActivoToggle').checked = false;
            window.configglobal.aumento_detenido = !this.checked;
            _actualizarlabelaumento();
            window.recalculartasaefectiva();
        });
        document.getElementById('aumentoIndefinido').addEventListener('change', function() {
            document.getElementById('aumentoHasta').disabled = this.checked;
            if (this.checked) document.getElementById('aumentoHasta').value = '';
        });

        // modales qr
        const _closeqrbtn  = document.getElementById('closeQrAmpliado');
        const _closeqrx    = document.getElementById('closeQrAmpliadoModal');
        const _qrmodal     = document.getElementById('qrAmpliadoModal');
        if (_closeqrbtn) _closeqrbtn.addEventListener('click', () => window.cerrarmodal('qrAmpliadoModal'));
        if (_closeqrx)   _closeqrx.addEventListener('click',   () => window.cerrarmodal('qrAmpliadoModal'));
        if (_qrmodal) _qrmodal.addEventListener('click', function(e) {
            if (e.target === this) window.cerrarmodal('qrAmpliadoModal');
        });

        // botón logout (desktop y móvil) - con aviso de confirmación
        const btndesktop = document.getElementById('logoutButtonDesktop');
        const btnmobile = document.getElementById('logoutButtonMobile');
        const salidaaviso = document.getElementById('_salidaAviso');
        const salidano = document.getElementById('_salidaNo');
        const salidasi = document.getElementById('_salidaSi');
        
        const mostraravisosalida = () => {
            if (salidaaviso) salidaaviso.style.display = 'flex';
        };
        
        const ocultaravisosalida = () => {
            if (salidaaviso) salidaaviso.style.display = 'none';
        };
        
        const ejecutarcerrarsesion = () => {
            if (typeof window.cerrarsesion === 'function') window.cerrarsesion();
            else { sessionStorage.clear(); window.location.reload(); }
        };
        
        if (btndesktop) btndesktop.addEventListener('click', mostraravisosalida);
        if (btnmobile) btnmobile.addEventListener('click', mostraravisosalida);
        if (salidano) salidano.addEventListener('click', ocultaravisosalida);
        if (salidasi) salidasi.addEventListener('click', () => {
            ocultaravisosalida();
            ejecutarcerrarsesion();
        });
    };

    // ==================== inicialización al cargar la página ====================
    document.addEventListener('DOMContentLoaded', async () => {
        // inicializar ui de login (cargar lista de administradores)
		window.iniciarloginui();
        
        // inicializar tema antes de mostrar cualquier cosa
        window.inittheme();
        
        if (await window.restaurarsesionadmin()) {
            window.mostrarpanel();
            // actualizar header con nombre de usuario (ya se hace en setupheaderusuario)
            setTimeout(async () => {
                try {
                    await window.cargarconfiguracioninicial();
                    await window.cargarmenu();
                    await window.cargarinventario();
                    await window.cargarusuarios();
                    await window.cargarqrs();
                    await window.cargarreportes();
                    await window.cargarpedidosrecientes();
                    await window.cargarmesoneros();
                    await window.cargardeliverys();
                    await window.cargarpropinas();
                    window.setupeventlisteners();
                    window.setuprealtimesubscriptions();
                    window.setupstockrealtime();
                    window.restaurarwifipersistente();
                    window._registrarpushadmin();
                    
                    // agregar tarjeta de diferencia de tasa al dashboard
                    window.agregartarjetadiferenciatasa();
                    
                    window._verificartasadehoy((tasa) => {
                        const tasainput = document.getElementById('tasaBaseInput');
                        if (tasainput) tasainput.value = tasa;
                        window.configglobal.tasa_cambio = tasa;
                        window.recalculartasaefectiva();
                        window._verificaravisolunes();
                    });
                    await window._actualizarventashoyneto();
                    await window._actualizardeliveryshoy();
                    setinterval(async () => { 
                        await window._actualizarventashoyneto();
                        await window._actualizardeliveryshoy();
                        window.actualizartarjetadiferenciatasa();
                    }, 60000);
                } catch (e) { 
                    console.error('Error cargando datos:', e); 
                    window.mostrartoast('Error cargando datos: ' + e.message, 'error'); 
                }
            }, 100);
        } else {
            window.mostrarlogin();
        }
    });

    // función para agregar tarjeta de diferencia de tasa al dashboard
    window.agregartarjetadiferenciatasa = function() {
        const dashboardgrid = document.queryselector('.dashboard-grid');
        if (!dashboardgrid) return;
        // verificar si ya existe
        if (document.getElementById('diferenciaTasaCard')) return;
        const card = document.createelement('div');
        card.classname = 'dashboard-card';
        card.id = 'diferenciaTasaCard';
        card.style.cursor = 'pointer';
        card.onclick = () => window.mostrartoast('Diferencia acumulada a favor del restaurante por aumento de tasa', 'info');
        card.innerHTML = `
            <div class="Card-title">
                Acumulado Dif. Tasa Base y Efectiva 
                <span class="Tooltip-wrap" style="Position:relative; display:inline-flex; cursor:help; margin-left:.3rem">
                    <span style="Display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:#aaa; color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                    <span class="Tooltip-text" style="Display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translatex(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:250px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,.3); z-index:100; line-height:1.4">
                        Es la ganancia extra generada por la diferencia entre la tasa base y la tasa efectiva aplicada a los pedidos cobrados. Esta diferencia queda a favor del restaurante.
                    </span>
                </span>
            </div>
            <div class="Card-value" id="Diferenciatasavalor">Bs 0,00</div>
        `;
        // Insertar como cuarta tarjeta (después de Deliverys Hoy)
        const deliverysCard = document.getElementById('Deliveryshoycard');
        if (deliverysCard && deliverysCard.parentNode) {
            deliverysCard.parentNode.insertBefore(card, deliverysCard.nextSibling);
        } else {
            dashboardGrid.appendChild(card);
        }
        window.actualizarTarjetaDiferenciaTasa();
    };

    window.actualizarTarjetaDiferenciaTasa = function() {
        const diff = window.calcularDiferenciaTasa();
        const valorEl = document.getElementById('Diferenciatasavalor');
        if (valorEl) valorEl.textContent = window.formatBs(diff);
    };

    // ==================== SISTEMA DE TEMAS PREMIUM ====================
    
    // Inicializar tema al cargar
    window.initTheme = function() {
        const savedTheme = localStorage.getItem('Sakisushitheme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'Dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('Dark-theme');
        } else {
            document.documentElement.classList.remove('Dark-theme');
        }
        
        // Configurar event listener del toggle (desktop y móvil)
        const themeToggle = document.getElementById('Themetoggle');
        const themeToggleMobile = document.getElementById('Themetogglemobile');
        [themeToggle, themeToggleMobile].forEach(toggle => {
            if (toggle) {
                toggle.checked = document.documentElement.classList.contains('Dark-theme');
                toggle.addEventListener('Change', window.toggleTheme);
            }
        });
    };

    // Cambiar tema con animación de partículas (sincronizar ambos toggles)
    window.toggleTheme = function(e) {
        const isDark = e.target.checked;
        const html = document.documentElement;
        
        // Sincronizar ambos toggles (desktop y móvil)
        const themeToggle = document.getElementById('Themetoggle');
        const themeToggleMobile = document.getElementById('Themetogglemobile');
        if (themeToggle && themeToggle !== e.target) themeToggle.checked = isDark;
        if (themeToggleMobile && themeToggleMobile !== e.target) themeToggleMobile.checked = isDark;
        
        // Crear efecto de partículas
        window.createThemeParticles(e.target);
        
        // Aplicar tema
        if (isDark) {
            html.classList.add('Dark-theme');
        } else {
            html.classList.remove('Dark-theme');
        }
        
        // Guardar preferencia
        localStorage.setItem('Sakisushitheme', isDark ? 'Dark' : 'Light');
    };

    // Efecto de partículas al cambiar tema
    window.createThemeParticles = function(element) {
        const rect = element.getBoundingClientRect();
        const colors = ['#D32F2F', '#FF7043', '#FFB300', '#9FA8DA', '#5C6BC0'];
        
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const particle = document.createElement('Div');
                particle.className = 'Theme-particle';
                particle.style.left = (rect.left + rect.width / 2) + 'Px';
                particle.style.top = (rect.top + rect.height / 2) + 'Px';
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                
                // Dirección aleatoria
                const angle = (Math.PI * 2 * i) / 12;
                const distance = 60 + Math.random() * 40;
                const tx = Math.cos(angle) * distance;
                const ty = Math.sin(angle) * distance;
                
                particle.style.transform = `translate(${tx}px, ${ty}px)`;
                document.body.appendChild(particle);
                
                // Limpiar partícula después de la animación
                setTimeout(() => particle.remove(), 600);
            }, i * 30);
        }
    };
})();