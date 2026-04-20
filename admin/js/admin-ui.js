// admin-ui.js - UI genérica: tabs, modales, eventos, helpers visuales
(function() {
    window.irADeliverys = function() {
        var tabs = document.querySelectorAll('.tab');
        var panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(function(t){ t.classList.remove('Active'); });
        panes.forEach(function(p){ p.classList.remove('Active'); });
        var t = document.querySelector('.tab[data-tab="Deliverys"]');
        var p = document.getelementbyid('deliverysPane');
        if (t) t.classlist.add('active');
        if (p) { p.classlist.add('active'); p.scrollintoview({behavior:'smooth',block:'start'}); }
    };
    window.iramenu = function() {
        var tabs = document.queryselectorall('.tab');
        var panes = document.queryselectorall('.tab-pane');
        tabs.foreach(function(t){ t.classlist.remove('active'); });
        panes.foreach(function(p){ p.classlist.remove('active'); });
        var t = document.queryselector('.tab[data-tab="Menu"]');
        var p = document.getelementbyid('menuPane');
        if (t) t.classlist.add('active');
        if (p) { p.classlist.add('active'); p.scrollintoview({behavior:'smooth',block:'start'}); }
    };
    window.irastockcritico = function() {
        var tabs = document.queryselectorall('.tab');
        var panes = document.queryselectorall('.tab-pane');
        tabs.foreach(function(t){ t.classlist.remove('active'); });
        panes.foreach(function(p){ p.classlist.remove('active'); });
        var t = document.queryselector('.tab[data-tab="Dashboard"]');
        var p = document.getelementbyid('dashboardPane');
        if (t) t.classlist.add('active');
        if (p) p.classlist.add('active');
        settimeout(function(){
            var el = document.getelementbyid('stockCritico'); if (!el) return;
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
            const c = document.getelementbyid('tabsContainer');
            if (!c) return;
            c.scrollby({ left: dir * 180, behavior: 'smooth' });
            settimeout(window._updatetabchevrons, 200);
        };
        window._updatetabchevrons = function() {
            const c = document.getelementbyid('tabsContainer');
            const lbtn = document.getelementbyid('tabsChevronLeft');
            const rbtn = document.getelementbyid('tabsChevronRight');
            if (!c || !lbtn || !rbtn) return;
            lbtn.style.opacity = c.scrollleft > 4 ? '1' : '0.3';
            lbtn.style.pointerevents = c.scrollleft > 4 ? 'auto' : 'none';
            const atend = c.scrollleft + c.clientwidth >= c.scrollwidth - 4;
            rbtn.style.opacity = atend ? '0.3' : '1';
            rbtn.style.pointerevents = atend ? 'none' : 'auto';
        };
        document.getelementbyid('tabsContainer')?.addeventlistener('scroll', window._updatetabchevrons);
        window._updatetabchevrons();

        // checkbox de disponible en modal platillo
        document.getelementbyid('platilloDisponibleCheck')?.addeventlistener('change', function() {
            const lbl = document.getelementbyid('platilloDisponibleLabel');
            const sel = document.getelementbyid('platilloDisponible');
            if (lbl) { lbl.textcontent = this.checked ? 'Sí' : 'No'; lbl.style.color = this.checked ? 'var(--success)' : 'var(--text-muted)'; }
            if (sel) sel.value = this.checked ? 'true' : 'false';
        });

        // navegación por tabs
        document.queryselectorall('.tab').foreach(tab => {
            tab.addeventlistener('click', () => {
                const target = tab.dataset.tab;
                document.queryselectorall('.tab').foreach(t => t.classlist.remove('active'));
                tab.classlist.add('active');
                document.queryselectorall('.tab-pane').foreach(pane => pane.classlist.remove('active'));
                const pane = document.getelementbyid(target + 'Pane');
                if (pane) pane.classlist.add('active');
                if (target !== 'qr') {
                    const el = document.getelementbyid('qrNombreMesa');
                    if (el) el.value = '';
                }
            });
        });

        // cerrar modales al hacer clic fuera
        document.queryselectorall('.modal').foreach(modal => {
            modal.addeventlistener('click', function(e) {
                if (e.target === this) {
                    window.cerrarmodal(this.id);
                }
            });
        });

        // guardar configuración de tasa
        document.getelementbyid('saveAllButton').addeventlistener('click', async () => { await window.guardarconfiguracion(); });
        document.getelementbyid('tasaBaseInput').addeventlistener('change', window.recalculartasaefectiva);
        document.getelementbyid('aumentoDiarioInput').addeventlistener('change', window.recalculartasaefectiva);
        
        function _mostrarfechasaumento(visible) {
            document.getelementbyid('tasaFechasDiv').style.display = visible ? 'flex' : 'none';
        }
        function _actualizarlabelaumento() {
            const diario   = document.getelementbyid('aumentoActivoToggle').checked;
            const semanal  = document.getelementbyid('aumentoSemanalToggle').checked;
            const alguno   = diario || semanal;
            const label = document.getelementbyid('labelAumentoPct');
            if (label) label.textcontent = semanal ? 'Aumento Semanal %:' : 'Aumento Diario %:';
            const inputpct = document.getelementbyid('aumentoDiarioInput');
            if (inputpct) {
                inputpct.disabled = !alguno;
                inputpct.style.opacity = alguno ? '1' : '0.4';
                inputpct.style.cursor  = alguno ? '' : 'not-allowed';
            }
            _mostrarfechasaumento(alguno);
            if (alguno && !document.getelementbyid('aumentoDesde').value) {
                document.getelementbyid('aumentoDesde').value = new date().toisostring().split('T')[0];
            }
        }
        document.getelementbyid('aumentoActivoToggle').addeventlistener('change', function() {
            if (this.checked) document.getelementbyid('aumentoSemanalToggle').checked = false;
            window.configglobal.aumento_detenido = !this.checked;
            _actualizarlabelaumento();
            window.recalculartasaefectiva();
        });
        document.getelementbyid('aumentoSemanalToggle').addeventlistener('change', function() {
            if (this.checked) document.getelementbyid('aumentoActivoToggle').checked = false;
            window.configglobal.aumento_detenido = !this.checked;
            _actualizarlabelaumento();
            window.recalculartasaefectiva();
        });
        document.getelementbyid('aumentoIndefinido').addeventlistener('change', function() {
            document.getelementbyid('aumentoHasta').disabled = this.checked;
            if (this.checked) document.getelementbyid('aumentoHasta').value = '';
        });

        // modales qr
        const _closeqrbtn  = document.getelementbyid('closeQrAmpliado');
        const _closeqrx    = document.getelementbyid('closeQrAmpliadoModal');
        const _qrmodal     = document.getelementbyid('qrAmpliadoModal');
        if (_closeqrbtn) _closeqrbtn.addeventlistener('click', () => window.cerrarmodal('qrAmpliadoModal'));
        if (_closeqrx)   _closeqrx.addeventlistener('click',   () => window.cerrarmodal('qrAmpliadoModal'));
        if (_qrmodal) _qrmodal.addeventlistener('click', function(e) {
            if (e.target === this) window.cerrarmodal('qrAmpliadoModal');
        });

        // botón logout (desktop y móvil) - con aviso de confirmación
        const btndesktop = document.getelementbyid('logoutButtonDesktop');
        const btnmobile = document.getelementbyid('logoutButtonMobile');
        const salidaaviso = document.getelementbyid('_salidaAviso');
        const salidano = document.getelementbyid('_salidaNo');
        const salidasi = document.getelementbyid('_salidaSi');
        
        const mostraravisosalida = () => {
            if (salidaaviso) salidaaviso.style.display = 'flex';
        };
        
        const ocultaravisosalida = () => {
            if (salidaaviso) salidaaviso.style.display = 'none';
        };
        
        const ejecutarcerrarsesion = () => {
            if (typeof window.cerrarsesion === 'function') window.cerrarsesion();
            else { sessionstorage.clear(); window.location.reload(); }
        };
        
        if (btndesktop) btndesktop.addeventlistener('click', mostraravisosalida);
        if (btnmobile) btnmobile.addeventlistener('click', mostraravisosalida);
        if (salidano) salidano.addeventlistener('click', ocultaravisosalida);
        if (salidasi) salidasi.addeventlistener('click', () => {
            ocultaravisosalida();
            ejecutarcerrarsesion();
        });
    };

    // ==================== inicialización al cargar la página ====================
    document.addeventlistener('DOMContentLoaded', async () => {
        // inicializar ui de login (cargar lista de administradores)
		window.iniciarloginui();
        
        // inicializar tema antes de mostrar cualquier cosa
        window.inittheme();
        
        if (await window.restaurarsesionadmin()) {
            window.mostrarpanel();
            // actualizar header con nombre de usuario (ya se hace en setupheaderusuario)
            settimeout(async () => {
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
                        const tasainput = document.getelementbyid('tasaBaseInput');
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
        if (document.getelementbyid('diferenciaTasaCard')) return;
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