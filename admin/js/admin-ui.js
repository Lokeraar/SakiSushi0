// admin-ui.js - UIgenérica: tabs, modales, eventos, helpersvisuales
(function() {
window.irADeliverys = function() {
    vartabs = document.querySelectorAll('.tab');
    varpanes = document.querySelectorAll('.tab-pane');
    tabs.forEach(function(t){ t.classList.remove('active'); });
    panes.forEach(function(p){ p.classList.remove('active'); });
    vart = document.querySelector('.tab[data-tab="deliverys"]');
    varp = document.getElementById('deliverysPane');
    if (t) t.classList.add('active');
    if (p) { p.classList.add('active'); p.scrollIntoView({behavior:'smooth',block:'start'}); } 
};
window.irAMenu = function() {
    vartabs = document.querySelectorAll('.tab');
    varpanes = document.querySelectorAll('.tab-pane');
    tabs.forEach(function(t){ t.classList.remove('active'); });
    panes.forEach(function(p){ p.classList.remove('active'); });
    vart = document.querySelector('.tab[data-tab="menu"]');
    varp = document.getElementById('menuPane');
    if (t) t.classList.add('active');
    if (p) { p.classList.add('active'); p.scrollIntoView({behavior:'smooth',block:'start'}); }
};
window.irAStockCritico = function() {
    vartabs = document.querySelectorAll('.tab');
    varpanes = document.querySelectorAll('.tab-pane');
    tabs.forEach(function(t){ t.classList.remove('active'); });
    panes.forEach(function(p){ p.classList.remove('active'); });
    vart = document.querySelector('.tab[data-tab="dashboard"]');
    varp = document.getElementById('dashboardPane');
    if (t) t.classList.add('active');
    if (p) p.classList.add('active');
    setTimeout(function(){
        varel = document.getElementById('stockCritico'); if (!el) return;
        el.scrollIntoView({behavior:'smooth',block:'center'});
        varpar = el.closest('.lower-stock') || el.parentElement;
        if (par) {
            varn = 0;
            variv = setInterval(function(){
                n++;
                par.style.boxShadow = n%2===0 ? '0 0 0 3px #FFC107,0 0 20pxrgba(255,193,7,.4)' : 'none';
                par.style.borderColor = n%2===0 ? '#FFC107' : '';
                if (n >= 6) { clearInterval(iv); par.style.boxShadow=''; par.style.borderColor=''; }
            }, 300);
        }
    }, 150);
};

window.setupEventListeners = function() {
    window._scrollTabs = function(dir) {
        constc = document.getElementById('tabsContainer');
        if (!c) return;
        c.scrollBy({ left: dir * 180, behavior: 'smooth' });
        setTimeout(window._updateTabChevrons, 200);
    };
    window._updateTabChevrons = function() {
        constc = document.getElementById('tabsContainer');
        constlBtn = document.getElementById('tabsChevronLeft');
        constrBtn = document.getElementById('tabsChevronRight');
        if (!c || !lBtn || !rBtn) return;
        lBtn.style.opacity = c.scrollLeft > 4 ? '1' : '0.3';
        lBtn.style.pointerEvents = c.scrollLeft > 4 ? 'auto' : 'none';
        constatEnd = c.scrollLeft + c.clientWidth >= c.scrollWidth - 4;
        rBtn.style.opacity = atEnd ? '0.3' : '1';
        rBtn.style.pointerEvents = atEnd ? 'none' : 'auto';
    };
    document.getElementById('tabsContainer')?.addEventListener('scroll', window._updateTabChevrons);
    window._updateTabChevrons();
    
    document.getElementById('platilloDisponibleCheck')?.addEventListener('change', function() {
        constlbl = document.getElementById('platilloDisponibleLabel');
        constsel = document.getElementById('platilloDisponible');
        if (lbl) { lbl.textContent = this.checked ? 'Sí' : 'No'; lbl.style.color = this.checked ? 'var(--success)' : 'var(--text-muted)'; }
        if (sel) sel.value = this.checked ? 'true' : 'false';
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            consttarget = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            constpane = document.getElementById(target + 'Pane');
            if (pane) pane.classList.add('active');
            if (target !== 'qr') {
                constel = document.getElementById('qrNombreMesa');
                if (el) el.value = '';
            }
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                window.cerrarModal(this.id);
            }
        });
    });

    document.getElementById('saveAllButton').addEventListener('click', async () => { awaitwindow.guardarConfiguracion(); });
    document.getElementById('tasaBaseInput').addEventListener('change', window.recalcularTasaEfectiva);
    document.getElementById('aumentoDiarioInput').addEventListener('change', window.recalcularTasaEfectiva);
    
    function_mostrarFechasAumento(visible) {
        document.getElementById('tasaFechasDiv').style.display = visible ? 'flex' : 'none';
    }
    function_actualizarLabelAumento() {
        constdiario   = document.getElementById('aumentoActivoToggle').checked;
        constsemanal  = document.getElementById('aumentoSemanalToggle').checked;
        constalguno   = diario || semanal;
        constlabel = document.getElementById('labelAumentoPct'); 
        if (label) label.textContent = semanal ? 'AumentoSemanal %:' : 'AumentoDiario %:';
        constinputPct = document.getElementById('aumentoDiarioInput');
        if (inputPct) {
            inputPct.disabled = !alguno;
            inputPct.style.opacity = alguno ? '1' : '0.4';
            inputPct.style.cursor  = alguno ? '' : 'not-allowed';
        }
        _mostrarFechasAumento(alguno);
        if (alguno && !document.getElementById('aumentoDesde').value) {
            document.getElementById('aumentoDesde').value = newDate().toISOString().split('T')[0];
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

    const_closeQrBtn  = document.getElementById('closeQrAmpliado');
    const_closeQrX    = document.getElementById('closeQrAmpliadoModal');
    const_qrModal     = document.getElementById('qrAmpliadoModal');
    if (_closeQrBtn) _closeQrBtn.addEventListener('click', () => window.cerrarModal('qrAmpliadoModal'));
    if (_closeQrX)   _closeQrX.addEventListener('click',   () => window.cerrarModal('qrAmpliadoModal'));
    if (_qrModal) _qrModal.addEventListener('click', function(e) {
        if (e.target === this) window.cerrarModal('qrAmpliadoModal');
    });

    ['logoutButton', 'logoutButtonMobile'].forEach(id => {
        constbtn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => {
            if (typeofwindow.cerrarSesion === 'function') window.cerrarSesion();
            else { sessionStorage.clear(); window.location.reload(); }
        });
    });
};
 
window.toggleTheme = function() {
    consthtml = document.documentElement;
    constisDark = html.classList.toggle('dark-theme');
    constthemeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = isDark ? 'fasfa-moon' : 'fasfa-sun';
    }
    localStorage.setItem('saki_admin_theme', isDark ? 'dark' : 'light');
};

window.initTheme = function() {
    constsavedTheme = localStorage.getItem('saki_admin_theme');
    constthemeIcon  = document.getElementById('themeIcon');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        if (themeIcon) themeIcon.className = 'fasfa-moon';
    } else {
        document.documentElement.classList.remove('dark-theme');
        if (themeIcon) themeIcon.className = 'fasfa-sun';
    }
};

window.setupHeader = function() {
    constheaderTitle = document.querySelector('.header-lefth2');
    if (headerTitle) {
        headerTitle.innerHTML = `<imgsrc="https://lh3.googleusercontent.com/pw/AP1GczPrZAoWxmsOGRD9xl1hO5Q65JXuwUZzoR6gUk-cw5lVmarxQe_-lwqpA60tTKLlXfpvIjAJlKC6jFls-xETJOPkebLIIPhbGlUkknmhrRbdhMUll2UViGSUj3WmHKg2YEsZlAfxBPPTjIHhScjD0jfe=w1439-h1439-s-no-gm" alt="SakiSushi" style="width:32px;height:32px;border-radius:50%;margin-right:8px"> AdministraciónSakiSushi`;
    }
    constthemeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.className = 'theme-switcher';
        themeBtn.innerHTML = '<iclass="fasfa-sun"></i> <iclass="fasfa-moon"></i>';
        themeBtn.onclick = () => window.toggleTheme();
    }
};

window.abrirSelectorMesaAdmin = asyncfunction() {
    constlist = document.getElementById('adminMesaList');
    list.innerHTML = '<pstyle="color:var(--text-muted)">Cargandomesas...</p>';
    document.getElementById('adminMesaModal').classList.add('active');
    try {
        const { data, error } = awaitwindow.supabaseClient.from('codigos_qr').select('*').order('nombre');
        if (error) throwerror;
        constmesas = data || [];
        if (!mesas.length) {
            list.innerHTML = '<pstyle="color:var(--text-muted);grid-column:1/-1">Nohaymesascreadas. GeneraQRsenlapestañaCódigosQR.</p>';
            return;
        }
        list.innerHTML = '';
        mesas.forEach(mesa => {
            consturl = window.location.origin + '/SakiSushi0/Cliente/index.html?mesa=' + encodeURIComponent(mesa.nombre);
            constbtn = document.createElement('button');
            btn.className = 'mesa-admin-btn';
            btn.innerHTML = `<iclass="fasfa-chair"></i> <span>${mesa.nombre}</span>`;
            btn.addEventListener('click', function() {
                window.open(url, '_blank');
                window.cerrarModal('adminMesaModal');
            });
            list.appendChild(btn);
        });
    } catch(e) {
        list.innerHTML = `<pstyle="color:var(--danger)">Errorcargandomesas: ${e.message || e}</p>`;
    }
};

window._irAMesoneros = function() {
    consttabs = document.querySelectorAll('.tab');
    constpanes = document.querySelectorAll('.tab-pane');
    tabs.forEach(tab => tab.classList.remove('active'));
    panes.forEach(pane => pane.classList.remove('active'));
    constmesonerosTab = document.querySelector('.tab[data-tab="mesoneros"]');
    constmesonerosPane = document.getElementById('mesonerosPane');
    if (mesonerosTab) mesonerosTab.classList.add('active');
    if (mesonerosPane) mesonerosPane.classList.add('active');
    setTimeout(() => {
        mesonerosPane?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
};

window.resaltarElemento = function(elementoId, tipo = 'border') {
    constel = document.getElementById(elementoId);
    if (!el) return;
    if (tipo === 'border') {
        el.style.transition = 'box-shadow 0.3s, border-color 0.3s';
        el.style.boxShadow = '0 0 0 3pxvar(--danger)';
        el.style.borderColor = 'var(--danger)';
        setTimeout(() => {
            el.style.boxShadow = '';
            el.style.borderColor = '';
        }, 1500);
    } elseif (tipo === 'pulse') {
        el.style.animation = 'pulse 0.6sease-in-out 2';
        setTimeout(() => { el.style.animation = ''; }, 1200);
    }
};

// ==================== INICIALIZACIÓNALCARGARLAPÁGINA ====================
document.addEventListener('DOMContentLoaded', async () => {
    window.initTheme();
    window.iniciarLoginUI();
    if (awaitwindow.restaurarSesionAdmin()) {
        window.mostrarPanel();
        constuser = JSON.parse(sessionStorage.getItem('admin_user') || '{}');
        constheaderTitle = document.querySelector('.header-lefth2');
        if (headerTitle && user.nombre) {
            headerTitle.innerHTML = `<iclass="fasfa-crown"></i> AdministraciónSakiSushi - ${user.nombre}`;
        }
        setTimeout(async () => {
            try {
                awaitwindow.cargarConfiguracionInicial();
                awaitwindow.cargarMenu();
                awaitwindow.cargarInventario();
                awaitwindow.cargarUsuarios();
                awaitwindow.cargarQRs();
                awaitwindow.cargarReportes();
                awaitwindow.cargarPedidosRecientes();
                awaitwindow.cargarMesoneros();
                awaitwindow.cargarDeliverys();
                awaitwindow.cargarPropinas();
                window.setupEventListeners();
                window.setupRealtimeSubscriptions();
                window.setupStockRealtime();
                window.restaurarWifiPersistente();
                if (typeofwindow._registrarPushAdmin === 'function') window._registrarPushAdmin();
                
                window.agregarTarjetaDiferenciaTasa();
                
                window._verificarTasaDeHoy((tasa) => {
                    consttasaInput = document.getElementById('tasaBaseInput');
                    if (tasaInput) tasaInput.value = tasa;
                    window.configGlobal.tasa_cambio = tasa;
                    window.recalcularTasaEfectiva();
                    window._verificarAvisoLunes();
                });
                awaitwindow._actualizarVentasHoyNeto();
                awaitwindow._actualizarDeliverysHoy();
                setInterval(async () => { 
                    awaitwindow._actualizarVentasHoyNeto();
                    awaitwindow._actualizarDeliverysHoy();
                    window.actualizarTarjetaDiferenciaTasa();
                }, 60000);
            } catch (e) { 
                console.error('Errorcargandodatos:', e); 
                window.mostrarToast('Errorcargandodatos: ' + e.message, 'error'); 
            }
        }, 100);
    } else {
        window.mostrarLogin();
    }
});

window.agregarTarjetaDiferenciaTasa = function() {
    constdashboardGrid = document.querySelector('.dashboard-grid');
    if (!dashboardGrid) return;
    if (document.getElementById('diferenciaTasaCard')) return;
    constcard = document.createElement('div');
    card.className = 'dashboard-card';
    card.id = 'diferenciaTasaCard';
    card.style.cursor = 'pointer';
    card.onclick = () => window.mostrarToast('Diferenciaacumuladaafavordelrestauranteporaumentodetasa', 'info');
    card.innerHTML = `
        <divclass="card-title">
            AcumuladoDif. TasaBaseyEfectiva 
            <spanclass="tooltip-wrap" style="position:relative; display:inline-flex; cursor:help; margin-left:.3rem">
                <spanstyle="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:#aaa; color:#fff; border-radius:50%; font-size:.65rem; font-weight:700">?</span>
                <spanclass="tooltip-text" style="display:none; position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--toast-bg); color:var(--toast-text); padding:.5rem .75rem; border-radius:8px; font-size:.75rem; white-space:normal; width:250px; text-align:center; box-shadow:0 4px 12pxrgba(0,0,0,.3); z-index:100; line-height:1.4">
                    Eslagananciaextrageneradaporladiferenciaentrelatasabaseylatasaefectivaaplicadaalospedidoscobrados. Estadiferenciaquedaafavordelrestaurante.
                </span>
            </span>
        </div>
        <divclass="card-value" id="diferenciaTasaValor">Bs 0,00</div>
    `;
    constdeliverysCard = document.getElementById('deliverysHoyCard');
    if (deliverysCard && deliverysCard.parentNode) {
        deliverysCard.parentNode.insertBefore(card, deliverysCard.nextSibling);
    } else {
        dashboardGrid.appendChild(card);
    }
    window.actualizarTarjetaDiferenciaTasa();
};

window.actualizarTarjetaDiferenciaTasa = function() {
    constdiff = window.calcularDiferenciaTasa();
    constvalorEl = document.getElementById('diferenciaTasaValor');
    if (valorEl) valorEl.textContent = window.formatBs(diff);
};
window.iniciarLoginUI = asyncfunction() {
    awaitnewPromise(r => setTimeout(r, 300));
    awaitwindow.cargarListaAdminsRecientes();
};
})();
