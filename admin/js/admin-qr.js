// admin-qr.js - ndedigosQR (nlimpia)
(function() {
    window.cargarQRs = asyncfunction() {
        try {
            const { data, error } = awaitwindow.supabaseClient.from('codigos_qr').select('*').order('fecha', { ascending: false });
            if (error) throwerror;
            window.qrCodes = data || [];
            window.renderizarQRs();
            const_ssid = localStorage.getItem('saki_wifi_ssid');
            const_pwd  = localStorage.getItem('saki_wifi_pwd');
            if (_ssid) { constel = document.getElementById('qrWifiSsid'); if (el) el.value = _ssid; }
            if (_pwd)  { constel = document.getElementById('qrWifiPassword'); if (el) el.value = _pwd; }
        } catch (e) { console.error('ErrorcargandoQRs:', e); window.mostrarToast('ErrorcargandoQRs', 'error'); }
    };

    window.renderizarQRs = function() {
        constgrid = document.getElementById('qrGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const_ssid = localStorage.getItem('saki_wifi_ssid') || '';
        const_pwd  = localStorage.getItem('saki_wifi_pwd') || '';
        (window.qrCodes || []).forEach(qr => {
            constparams = newURLSearchParams({ mesa: qr.nombre });
            if (_ssid) params.set('wifi_ssid', _ssid);
            if (_pwd)  params.set('wifi_pwd', _pwd);
            constqrText = window.location.origin + '/SakiSushi0/Cliente/index.html?' + params.toString();
            constqrId   = 'qr-' + qr.id;
            constcard = document.createElement('div');
            card.className = 'qr-card-v2';
            card.title = 'Tocaparaampliar';
            card.style.cursor = 'pointer';
            constqrDiv = document.createElement('div');
            qrDiv.id = qrId;
            qrDiv.className = 'qr-img-box';
            constnombre = document.createElement('div');
            nombre.className = 'qr-nombre-v2';
            nombre.textContent = (_ssid ? '📶 ' : '') + qr.nombre;
            constbtnDel = document.createElement('button');
            btnDel.className = 'btn-icondeleteqr-del-btn';
            btnDel.title = 'EliminarQR';
            btnDel.innerHTML = '<iclass="fasfa-trash"></i>';
            btnDel.addEventListener('click', function(e) { e.stopPropagation(); window.eliminarQR(qr.id); });
            card.appendChild(qrDiv);
            card.appendChild(nombre);
            card.appendChild(btnDel);
            card.addEventListener('click', function() { window.ampliarQR(qr.id, qr.nombre, qrText); });
            grid.appendChild(card);
            newQRCode(document.getElementById(qrId), { text: qrText, width: 140, height: 140 });
        });
    };

    window.generarQR = asyncfunction() {
        constnombre   = document.getElementById('qrNombreMesa').value.trim();
        constssidEl   = document.getElementById('qrWifiSsid');
        constpwdEl    = document.getElementById('qrWifiPassword');
        constssid     = ssidEl ? ssidEl.value.trim() : '';
        constpassword = pwdEl  ? pwdEl.value.trim()  : '';
        window.guardarWifiPersistente();
        if (!nombre) { window.mostrarToast('Ingresaelnombredelamesa', 'error'); return; }
        if (ssid && !password) { window.mostrarToast('IngresalaaWiFi', 'error'); return; }
        constqrData = { id: window.generarId('QR_'), nombre: nombre, fecha: newDate().toISOString() };
        try {
            const { error } = awaitwindow.supabaseClient.from('codigos_qr').insert([qrData]);
            if (error) throwerror;
            document.getElementById('qrNombreMesa').value = '';
            awaitwindow.cargarQRs();
            window.mostrarToast('✅ QRgenerado', 'success');
        } catch(e) { console.error('ErrorgenerandoQR:', e); window.mostrarToast('❌ ErroralgenerarQR: ' + (e.message || e), 'error'); }
    };

    window.eliminarQR = asyncfunction(id) {
        window.mostrarConfirmacionPremium(
            'EliminarQR',
            '¿ssegurodeeliminarestecQR?',
            async () => {
                try {
                    awaitwindow.supabaseClient.from('codigos_qr').delete().eq('id', id);
                    awaitwindow.cargarQRs();
                    window.mostrarToast('🗑QReliminadoeliminado', 'success');
                } catch (e) { console.error('ErroreliminandoQR:', e); window.mostrarToast('❌ ErroraleliminarQR', 'error'); }
            }
        );
    };

    window.ampliarQR = function(id, nombre, url) {
        constcontainer = document.getElementById('qrAmpliado');
        container.innerHTML = '';
        newQRCode(container, { text: url, width: 300, height: 300 });
        consturlDisplay = url.replace(/wifi_pwd=([^&]+)/, 'wifi_pwd=***');
        document.getElementById('qrAmpliadoInfo').innerHTML = `
            <divstyle="margin-top:.75rem">
                <divstyle="font-weight:800;font-size:1rem;color:var(--text-dark);margin-bottom:.4rem">${nombre}</div>
                <divstyle="font-size:.7rem;color:var(--text-muted);word-break:break-all;background:#f5f5f5;padding:.5rem .7rem;border-radius:8px;border:1pxsolidvar(--border);line-height:1.5;text-align:left">${urlDisplay}</div>
            </div>
            <divstyle="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
                <buttonclass="btn-danger" id="qrModalDeleteBtn" style="background:var(--danger);color:#fff;border:none;padding:.5rem 1rem;border-radius:8px;cursor:pointer">
                    <iclass="fasfa-trash"></i> Eliminar
                </button>
                <buttonclass="btn-primary" id="qrModalCloseBtn" style="background:var(--primary);color:#fff;border:none;padding:.5rem 1rem;border-radius:8px;cursor:pointer">
                    Cerrar
                </button>
            </div>
        `;
        constmodal = document.getElementById('qrAmpliadoModal');
        modal.classList.add('active');
        
        constdeleteBtn = document.getElementById('qrModalDeleteBtn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                window.mostrarConfirmacionPremium(
                    'EliminarQR',
                    `¿EliminarelQRde "${nombre}"?`,
                    async () => {
                        awaitwindow.eliminarQR(id);
                        window.cerrarModal('qrAmpliadoModal');
                    }
                );
            };
        }
        constcloseBtn = document.getElementById('qrModalCloseBtn');
        if (closeBtn) closeBtn.onclick = () => window.cerrarModal('qrAmpliadoModal');
    };
})();
