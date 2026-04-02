// admin-qr.js - Gestión de códigos QR
(function() {
    window.cargarQRs = async function() {
        try {
            const { data, error } = await window.supabaseClient.from('codigos_qr').select('*').order('fecha', { ascending: false });
            if (error) throw error;
            window.qrCodes = data || [];
            window.renderizarQRs();
            const _ssid = localStorage.getItem('saki_wifi_ssid');
            const _pwd  = localStorage.getItem('saki_wifi_pwd');
            if (_ssid) { const el = document.getElementById('qrWifiSsid'); if (el) el.value = _ssid; }
            if (_pwd)  { const el = document.getElementById('qrWifiPassword'); if (el) el.value = _pwd; }
        } catch (e) { console.error('Error cargando QRs:', e); window.mostrarToast('Error cargando QRs', 'error'); }
    };

    window.renderizarQRs = function() {
        const grid = document.getElementById('qrGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const _ssid = localStorage.getItem('saki_wifi_ssid') || '';
        const _pwd  = localStorage.getItem('saki_wifi_pwd') || '';
        (window.qrCodes || []).forEach(qr => {
            const params = new URLSearchParams({ mesa: qr.nombre });
            if (_ssid) params.set('wifi_ssid', _ssid);
            if (_pwd)  params.set('wifi_pwd', _pwd);
            const qrText = window.location.origin + '/SakiSushi0/Cliente/index.html?' + params.toString();
            const qrId   = 'qr-' + qr.id;
            const card = document.createElement('div');
            card.className = 'qr-card-v2';
            card.title = 'Toca para ampliar';
            card.style.cursor = 'pointer';
            const qrDiv = document.createElement('div');
            qrDiv.id = qrId;
            qrDiv.className = 'qr-img-box';
            const nombre = document.createElement('div');
            nombre.className = 'qr-nombre-v2';
            nombre.textContent = (_ssid ? '📶 ' : '') + qr.nombre;
            const btnDel = document.createElement('button');
            btnDel.className = 'btn-icon delete qr-del-btn';
            btnDel.title = 'Eliminar QR';
            btnDel.innerHTML = '<i class="fas fa-trash"></i>';
            btnDel.addEventListener('click', function(e) { e.stopPropagation(); window.eliminarQR(qr.id); });
            card.appendChild(qrDiv);
            card.appendChild(nombre);
            card.appendChild(btnDel);
            card.addEventListener('click', function() { window.ampliarQR(qr.id, qr.nombre, qrText); });
            grid.appendChild(card);
            new QRCode(document.getElementById(qrId), { text: qrText, width: 140, height: 140 });
        });
    };

    window.generarQR = async function() {
        const nombre   = document.getElementById('qrNombreMesa').value.trim();
        const ssidEl   = document.getElementById('qrWifiSsid');
        const pwdEl    = document.getElementById('qrWifiPassword');
        const ssid     = ssidEl ? ssidEl.value.trim() : '';
        const password = pwdEl  ? pwdEl.value.trim()  : '';
        window.guardarWifiPersistente();
        if (!nombre) { window.mostrarToast('Ingresa el nombre de la mesa', 'error'); return; }
        if (ssid && !password) { window.mostrarToast('Ingresa la contraseña WiFi', 'error'); return; }
        const qrData = { id: window.generarId('QR_'), nombre: nombre, fecha: new Date().toISOString() };
        try {
            const { error } = await window.supabaseClient.from('codigos_qr').insert([qrData]);
            if (error) throw error;
            document.getElementById('qrNombreMesa').value = '';
            await window.cargarQRs();
            window.mostrarToast('✅ QR generado', 'success');
        } catch(e) { console.error('Error generando QR:', e); window.mostrarToast('❌ Error al generar QR: ' + (e.message || e), 'error'); }
    };

    window.eliminarQR = async function(id) {
        if (!confirm('¿Estás seguro de eliminar este código QR?')) return;
        try {
            await window.supabaseClient.from('codigos_qr').delete().eq('id', id);
            await window.cargarQRs();
            window.mostrarToast('🗑️ QR eliminado', 'success');
        } catch (e) { console.error('Error eliminando QR:', e); window.mostrarToast('❌ Error al eliminar QR', 'error'); }
    };

    window.ampliarQR = function(id, nombre, url) {
        const container = document.getElementById('qrAmpliado');
        container.innerHTML = '';
        new QRCode(container, { text: url, width: 300, height: 300 });
        const urlDisplay = url.replace(/wifi_pwd=([^&]+)/, 'wifi_pwd=***');
        document.getElementById('qrAmpliadoInfo').innerHTML = `
            <div style="margin-top:.75rem">
                <div style="font-weight:800;font-size:1rem;color:var(--text-dark);margin-bottom:.4rem">${nombre}</div>
                <div style="font-size:.7rem;color:var(--text-muted);word-break:break-all;background:#f5f5f5;padding:.5rem .7rem;border-radius:8px;border:1px solid var(--border);line-height:1.5;text-align:left">${urlDisplay}</div>
            </div>
            <div style="margin-top:1rem;display:flex;justify-content:center">
                <button class="btn-danger" id="qrModalDeleteBtn" style="background:var(--danger);color:#fff;border:none;padding:.5rem 1rem;border-radius:8px;cursor:pointer">
                    <i class="fas fa-trash"></i> Eliminar QR
                </button>
            </div>
        `;
        const modal = document.getElementById('qrAmpliadoModal');
        modal.classList.add('active');
        
        // Agregar evento al botón eliminar dentro del modal
        const deleteBtn = document.getElementById('qrModalDeleteBtn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if (confirm(`¿Eliminar el QR de "${nombre}"?`)) {
                    await window.eliminarQR(id);
                    window.cerrarModal('qrAmpliadoModal');
                }
            };
        }
    };
})();
