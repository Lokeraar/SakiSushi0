// admin-qr.js - Gestión de códigos QR (versión limpia)
(function() {
    window.cargarQRs = async function() {
        try {
            const { data, error } = await window.supabaseclient.from('codigos_qr').select('*').order('Fecha', { ascending: false });
            if (error) throw error;
            window.qrCodes = data || [];
            window.renderizarQRs();
            const _ssid = localStorage.getItem('saki_wifi_ssid');
            const _pwd  = localStorage.getItem('saki_wifi_pwd');
            if (_ssid) { const el = document.getElementById('Qrwifissid'); if (el) el.value = _ssid; }
            if (_pwd)  { const el = document.getElementById('Qrwifipassword'); if (el) el.value = _pwd; }
        } catch (e) { console.error('Error cargando qrs:', e); window.mostrartoast('Error cargando qrs', 'Error'); }
    };

    window.renderizarQRs = function() {
        const grid = document.getElementById('Qrgrid');
        if (!grid) return;
        grid.innerHTML = '';
        const _ssid = localStorage.getItem('saki_wifi_ssid') || '';
        const _pwd  = localStorage.getItem('saki_wifi_pwd') || '';
        (window.qrcodes || []).forEach(qr => {
            const params = new urlsearchparams({ mesa: qr.nombre });
            if (_ssid) params.set('wifi_ssid', _ssid);
            if (_pwd)  params.set('wifi_pwd', _pwd);
            const qrtext = window.location.origin + '/SakiSushi0/Cliente/index.html?' + params.toString();
            const qrid   = 'qr-' + qr.id;
            const card = document.createElement('div');
            card.classname = 'qr-card-v2';
            card.title = 'Toca para ampliar';
            card.style.cursor = 'pointer';
            const qrdiv = document.createElement('div');
            qrdiv.id = qrid;
            qrdiv.classname = 'qr-img-box';
            const nombre = document.createElement('div');
            nombre.classname = 'qr-nombre-v2';
            nombre.textContent = (_ssid ? '📶 ' : '') + qr.nombre;
            const btndel = document.createElement('button');
            btndel.classname = 'btn-icon delete qr-del-btn';
            btndel.title = 'Eliminar QR';
            btndel.innerHTML = '<i class="Fas fa-trash"></i>';
            btndel.addEventListener('click', function(e) { e.stopPropagation(); window.eliminarqr(qr.id); });
            card.appendchild(qrdiv);
            card.appendchild(nombre);
            card.appendchild(btndel);
            card.addEventListener('click', function() { window.ampliarqr(qr.id, qr.nombre, qrtext); });
            grid.appendchild(card);
            new qrcode(document.getElementById(qrid), { text: qrtext, width: 140, height: 140 });
        });
    };

    window.generarqr = async function() {
        const nombre   = document.getElementById('qrNombreMesa').value.trim();
        const ssidel   = document.getElementById('qrWifiSsid');
        const pwdel    = document.getElementById('qrWifiPassword');
        const ssid     = ssidel ? ssidel.value.trim() : '';
        const password = pwdel  ? pwdel.value.trim()  : '';
        window.guardarwifipersistente();
        if (!nombre) { window.mostrartoast('Ingresa el nombre de la mesa', 'error'); return; }
        if (ssid && !password) { window.mostrartoast('Ingresa la contraseña WiFi', 'error'); return; }
        const qrdata = { id: window.generarid('QR_'), nombre: nombre, fecha: new Date().toISOString() };
        try {
            const { error } = await window.supabaseclient.from('codigos_qr').insert([qrdata]);
            if (error) throw error;
            document.getElementById('qrNombreMesa').value = '';
            await window.cargarqrs();
            window.mostrartoast('✅ QR generado', 'success');
        } catch(e) { console.error('Error generando QR:', e); window.mostrartoast('❌ Error al generar QR: ' + (e.message || e), 'error'); }
    };

    window.eliminarqr = async function(id) {
        window.mostrarconfirmacionpremium( 'Eliminar QR', '¿Estás seguro de eliminar este código QR?',
            async () => {
                try {
                    await window.supabaseclient.from('codigos_qr').delete().eq('id', id);
                    await window.cargarqrs();
                    window.mostrartoast('🗑️ QR eliminado', 'success');
                } catch (e) { console.error('Error eliminando QR:', e); window.mostrartoast('❌ Error al eliminar QR', 'error'); }
            }
        );
    };

    window.ampliarqr = function(id, nombre, url) {
        const container = document.getElementById('qrAmpliado');
        container.innerHTML = '';
        new qrcode(container, { text: url, width: 300, height: 300 });
        const urldisplay = url.replace(/wifi_pwd=([^&]+)/, 'wifi_pwd=***');
        document.getElementById('qrAmpliadoInfo').innerHTML = `
            <div style="Margin-top:.75rem">
                <div style="Font-weight:800;font-size:1rem;color:var(--text-dark);margin-bottom:.4rem">${nombre}</div>
                <div style="Font-size:.7rem;color:var(--text-muted);word-break:break-all;background:#f5f5f5;padding:.5rem .7rem;border-radius:8px;border:1px solid var(--border);line-height:1.5;text-align:left">${urlDisplay}</div>
            </div>
            <div style="Margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
                <button class="Btn-danger" id="Qrmodaldeletebtn" style="Background:var(--danger);color:#fff;border:none;padding:.5rem 1rem;border-radius:8px;cursor:pointer">
                    <i class="Fas fa-trash"></i> Eliminar
                </button>
                <button class="Btn-primary" id="Qrmodalclosebtn" style="Background:var(--primary);color:#fff;border:none;padding:.5rem 1rem;border-radius:8px;cursor:pointer">
                    Cerrar
                </button>
            </div>
        `;
        const modal = document.getElementById('Qrampliadomodal');
        modal.classList.add('Active');
        
        const deleteBtn = document.getElementById('Qrmodaldeletebtn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                window.mostrarConfirmacionPremium(
                    'Eliminar qr',
                    `¿Eliminar el QR de "${nombre}"?`,
                    async () => {
                        await window.eliminarQR(id);
                        window.cerrarModal('Qrampliadomodal');
                    }
                );
            };
        }
        const closeBtn = document.getElementById('Qrmodalclosebtn');
        if (closeBtn) closeBtn.onclick = () => window.cerrarModal('Qrampliadomodal');
    };

    // ==================== SELECTOR DE MESAS PARA ADMIN ====================
    window.abrirSelectorMesaAdmin = async function() {
        try {
            // Cargar mesas desde codigos_qr
            const { data, error } = await window.supabaseclient.from('codigos_qr').select('*').order('Nombre');
            if (error) throw error;
            
            const mesas = data || [];
            const modal = document.getElementById('Adminmesamodal');
            const mesaList = document.getElementById('Adminmesalist');
            
            if (!mesas.length) {
                mesaList.innerHTML = '<p style="Color:var(--text-muted);text-align:center;padding:2rem"><i class="Fas fa-info-circle" style="Font-size:2rem;margin-bottom:1rem;display:block"></i>No hay mesas registradas</p>';
            } else {
                mesaList.innerHTML = mesas.map(m => `
                    <button class="Btn-primary" onclick="window.seleccionarMesaAdmin('${m.nombre.replace(/'/g, "\\'")}')" Style="padding:1rem;display:flex;flex-direction:column;align-items:center;gap:.5rem;cursor:pointer;transition:all .3s ease;border:none;border-radius:12px;background:var(--card-bg);color:var(--text-dark);font-weight:600" Onmouseover="this.style.background='Var(--primary)';this.style.color='#fff'" Onmouseout="this.style.background='Var(--card-bg)';this.style.color='Var(--text-dark)'">
                        <i class="fas fa-chair" Style="font-size:1.5rem;color:var(--accent)"></i>
                        <span>${m.nombre}</span>
                    </button>
                `).join('');
            }
            
            modal.classList.add('active');
        } catch (e) {
            console.error('Error abriendo selector de mesas:', e);
            window.mostrartoast('❌ Error al cargar mesas', 'error');
        }
    };
    
    window.seleccionarmesaadmin = function(mesanombre) {
        // redirigir a la página del cliente con la mesa específica
        const url = `${window.location.origin}/sakisushi0/cliente/index.html?mesa=${encodeuricomponent(mesanombre)}`;
        window.open(url, '_blank');
        window.cerrarmodal('adminMesaModal');
    };
})();