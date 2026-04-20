// admin-helpers.js - Funciones auxiliares (no dependientes de otros módulos)
(function() {
    window.cambiarPassword = async function() {
        const current = document.getElementById('Currentpassword').value;
        const nueva = document.getElementById('Newpassword').value;
        const confirm = document.getElementById('Confirmpassword').value;
        const errorDiv = document.getElementById('Passwordchangeerror');
        
        if (errorDiv) errorDiv.style.display = 'None';
        
        if (!current || !nueva || !confirm) {
            window.mostrarToast('Completa todos los campos', 'Error');
            return;
        }
        if (nueva !== confirm) {
            window.mostrarToast('Las contraseñas no coinciden', 'Error');
            return;
        }
        if (nueva.length < 4) {
            window.mostrarToast('La contraseña debe tener al menos 4 caracteres', 'Error');
            return;
        }
        
        const btn = document.querySelector('[onclick="Window.cambiarpassword()"]');
        const originaltext = btn ? btn.innerhtml : '';
        if (btn) {
            btn.disabled = true;
            btn.innerhtml = '<i class="Fas fa-spinner fa-spin"></i> Actualizando...';
        }
        
        try {
            const { data: admindata, error: usererror } = await window.supabaseclient
                .from('usuarios')
                .select('username')
                .eq('rol', 'admin')
                .maybesingle();
            if (usererror) throw usererror;
            if (!admindata) {
                window.mostrartoast('No se encontró usuario administrador', 'error');
                return;
            }
            
            const { data: authdata, error: autherror } = await window.supabaseclient
                .rpc('verify_user_credentials', {
                    p_username: admindata.username,
                    p_password: current
                });
            if (autherror) throw autherror;
            if (!authdata || !authdata.success) {
                window.mostrartoast('Contraseña actual incorrecta', 'error');
                return;
            }
            
            const { data: hashed, error: hasherr } = await window.supabaseclient
                .rpc('hash_password', { plain_password: nueva });
            if (hasherr) throw hasherr;
            
            const { error: updateusererror } = await window.supabaseclient
                .from('usuarios')
                .update({ password_hash: hashed })
                .eq('rol', 'admin');
            if (updateusererror) throw updateusererror;
            
            const { error: updateconfigerror } = await window.supabaseclient
                .from('config')
                .update({ admin_password: nueva })
                .eq('id', 1);
            if (updateconfigerror) throw updateconfigerror;
            
            window.configglobal.admin_password = nueva;
            
            document.getelementbyid('currentPassword').value = '';
            document.getelementbyid('newPassword').value = '';
            document.getelementbyid('confirmPassword').value = '';
            
            window.mostrartoast('✅ Contraseña actualizada correctamente en todo el sistema', 'success');
            
        } catch (e) {
            console.error('Error cambiando contraseña:', e);
            if (errordiv) {
                errordiv.style.display = 'block';
                errordiv.innerhtml = '<i class="Fas fa-exclamation-circle"></i> Error: ' + (e.message || 'Error al cambiar la contraseña');
            }
            window.mostrartoast('❌ Error al cambiar la contraseña: ' + (e.message || e), 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerhtml = originaltext;
            }
        }
    };

    window.guardarrecoveryemail = async function() {
        const email = document.getelementbyid('recoveryEmail').value;
        if (!email || !email.includes('@')) { window.mostrartoast('Ingresa un correo válido', 'error'); return; }
        try {
            await window.supabaseclient.from('config').update({ recovery_email: email }).eq('id', 1);
            window.mostrartoast('✉️ Correo de recuperación guardado', 'success');
        } catch (e) { console.error('Error guardando email:', e); window.mostrartoast('❌ Error al guardar el correo', 'error'); }
    };

    window.guardarwifipersistente = function() {
        const ssid = document.getelementbyid('qrWifiSsid')?.value || '';
        const password = document.getelementbyid('qrWifiPassword')?.value || '';
        
        if (ssid !== window.wifissidpersistente) {
            window.wifissidpersistente = ssid;
            localstorage.setitem('saki_wifi_ssid', ssid);
        }
        if (password !== window.wifipasswordpersistente) {
            window.wifipasswordpersistente = password;
            localstorage.setitem('saki_wifi_pwd', password);
        }
    };

    window.restaurarwifipersistente = function() {
        const ssidinput = document.getelementbyid('qrWifiSsid');
        const passwordinput = document.getelementbyid('qrWifiPassword');
        if (ssidinput && window.wifissidpersistente) ssidinput.value = window.wifissidpersistente;
        if (passwordinput && window.wifipasswordpersistente) passwordinput.value = window.wifipasswordpersistente;
    };

    window._convertirunidad = function(valor, desde, hacia) {
        if (!desde || !hacia || desde === hacia) return valor;
        let base = valor;
        if (desde === 'kilogramos') base = valor * 1000;
        else if (desde === 'litros') base = valor * 1000;
        if (hacia === 'kilogramos') return base / 1000;
        if (hacia === 'litros')     return base / 1000;
        return base;
    };

    window._pedirtasadehoy = function(onconfirm) {
        const overlay = document.createelement('div');
        overlay.id = 'tasaHoyOverlay';
        overlay.style.csstext = [ 'position:fixed','top:0','left:0','width:100%','height:100%', 'background:rgba(0,0,0,.85)','z-index:9999', 'display:flex','align-items:center','justify-content:center', 'font-family:Montserrat,sans-serif'].join(';');
        overlay.innerHTML = `
            <div style="Background:#fff;border-radius:16px;padding:2rem 2.5rem;width:90%;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,.3);text-align:center">
                <div style="Font-size:2.5rem;margin-bottom:.75rem">💱</div>
                <h2 style="Font-size:1.3rem;color:#1a1a2e;margin-bottom:.4rem">Tasa de cambio de hoy</h2>
                <p style="Font-size:.88rem;color:#666;margin-bottom:1.5rem">
                    Ingresa el valor actual del dólar en bolívares para que el sistema calcule correctamente todos los precios de hoy.
                </p>
                <input type="Number" id="Tasahoyinput" placeholder="Ej: 42.50"
                    step="0.01" min="1"
                    style="Width:100%;padding:.8rem 1rem;font-size:1.1rem;font-weight:700;text-align:center;
                           border:2px solid #e0e0e0;border-radius:10px;outline:none;
                           font-family:montserrat,sans-serif;margin-bottom:1rem;box-sizing:border-box">
                <div id="Tasahoyerror" style="Color:#d32f2f;font-size:.82rem;margin-bottom:.75rem;display:none">
                    Por favor ingresa un valor válido mayor a 0.
                </div>
                <button id="Tasahoybtn"
                    style="Width:100%;padding:.9rem;background:linear-gradient(135deg,#d32f2f,#b71c1c);
                           color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;
                           cursor:pointer;font-family:montserrat,sans-serif;letter-spacing:.5px">
                    Confirmar tasa de hoy
                </button>
                <p style="Font-size:.75rem;color:#999;margin-top:.75rem">
                    Podrás ajustarla en cualquier momento desde la barra de tasa.
                </p>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => {
            const input = document.getElementById('Tasahoyinput');
            if (input) input.focus();
        }, 100);

        const confirmar = () => {
            const val = parseFloat(document.getElementById('Tasahoyinput').value);
            const errEl = document.getElementById('Tasahoyerror');
            if (!val || val <= 0) {
                errEl.style.display = 'Block';
                document.getElementById('Tasahoyinput').focus();
                return;
            }
            errEl.style.display = 'None';
            const hoy = new Date().toISOString().split('T')[0];
            localStorage.setItem('saki_tasa_fecha', hoy);
            localStorage.setItem('saki_tasa_valor', val);
            overlay.remove();
            onConfirm(val);
        };

        document.getElementById('Tasahoybtn').addEventListener('Click', confirmar);
        document.getElementById('Tasahoyinput').addEventListener('Keydown', e => {
            if (e.key === 'Enter') confirmar();
        });
    };

    window._verificarTasaDeHoy = function(onReady) {
        const hoy  = new Date().toISOString().split('T')[0];
        const fecha = localStorage.getItem('saki_tasa_fecha');
        const valor = parseFloat(localStorage.getItem('saki_tasa_valor'));

        if (fecha === hoy && valor > 0) {
            onReady(valor);
        } else {
            window._pedirTasaDeHoy((val) => {
                onReady(val);
            });
        }
    };

    window._verificarAvisoLunes = function() {
        if (!window.configGlobal || !window.configGlobal.aumento_semanal) return;

        const hoy = new Date();
        if (hoy.getDay() !== 1) return;

        const claveAviso = 'saki_aviso_lunes_' + hoy.toISOString().split('T')[0];
        if (localStorage.getItem(claveAviso)) return;
        localStorage.setItem(claveAviso, '1');

        const notif = document.createElement('Div');
        notif.style.cssText = [
            'Position:fixed','Top:1.5rem','Left:50%','Transform:translatex(-50%)',
            'Background:#1a1a2e','Color:#fff','Border-radius:12px',
            'Padding:1.2rem 1.5rem','Z-index:8000','Box-shadow:0 4px 20px rgba(0,0,0,.4)',
            'Max-width:420px','Width:90%','Font-family:montserrat,sans-serif',
            'Border-left:4px solid #ff9800'
        ].join(';');
        notif.innerHTML = `
            <div style="Display:flex;align-items:flex-start;gap:.75rem">
                <div style="Font-size:1.5rem;flex-shrink:0">📅</div>
                <div style="Flex:1">
                    <div style="Font-weight:700;margin-bottom:.3rem;font-size:.95rem">Nueva semana — ¿Actualizas el porcentaje?</div>
                    <div style="Font-size:.82rem;opacity:.85;margin-bottom:.75rem">
                        Hoy es lunes y tienes activo el aumento semanal.
                        ¿Quieres ajustar el porcentaje de aumento para esta semana?
                    </div>
                    <div style="Display:flex;gap:.5rem;justify-content:flex-end">
                        <button id="Avisolunesno"
                            style="Padding:.4rem .9rem;background:rgba(255,255,255,.15);color:#fff;
                                   border:1px solid rgba(255,255,255,.3);border-radius:6px;
                                   cursor:pointer;font-family:montserrat,sans-serif;font-size:.82rem">
                            No, dejarlo igual
                        </button>
                        <button id="Avisolunessi"
                            style="Padding:.4rem .9rem;background:#ff9800;color:#1a1a2e;border:none;
                                   border-radius:6px;cursor:pointer;font-family:montserrat,sans-serif;
                                   font-weight:700;font-size:.82rem">
                            Sí, cambiar %
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(notif);

        document.getElementById('Avisolunesno').addEventListener('Click', () => notif.remove());
        document.getElementById('Avisolunessi').addEventListener('Click', () => {
            notif.remove();
            window.scrollTo({ top: 0, behavior: 'Smooth' });
            const input = document.getElementById('Aumentodiarioinput');
            if (input) {
                input.focus();
                input.select();
                input.style.outline = '3px solid #ff9800';
                setTimeout(() => { input.style.outline = ''; }, 3000);
            }
        });

        settimeout(() => { if (notif.parentnode) notif.remove(); }, 30000);
    };

    window._simularlunes = function() {
        console.log('%c📅 Simulando lunes para prueba de aviso semanal...', 'color:#FF9800;font-weight:700');
        const hoy = new date().toisostring().split('T')[0];
        localstorage.removeitem('saki_aviso_lunes_' + hoy);
        const estadooriginal = window.configglobal?.aumento_semanal;
        if (window.configglobal) window.configglobal.aumento_semanal = true;
        const _orig = date.prototype.getday;
        date.prototype.getday = function() { return 1; };
        window._verificaravisolunes();
        date.prototype.getday = _orig;
        if (window.configglobal && estadooriginal !== undefined)
            window.configglobal.aumento_semanal = estadooriginal;
        console.log('%c✅ Aviso de lunes disparado. Mira la pantalla.', 'color:green;font-weight:700');
    };

    window._simularperiodosemanal = function(semanas) {
        semanas = semanas || 1;
        const input = document.getelementbyid('aumentoDiarioInput');
        const pct = parsefloat(input?.value) || 0;
        const base = parsefloat(document.getelementbyid('tasaBaseInput')?.value) || 0;
        const acum = semanas * pct;
        const efectiva = base * (1 + acum / 100);
        console.group('%c📊 Simulación: ' + semanas + ' semana(s) de aumento semanal', 'color:#FF9800;font-weight:700');
        console.log('Tasa base:', base);
        console.log('% por semana:', pct + '%');
        console.log('Semanas simuladas:', semanas);
        console.log('Acumulado simulado:', acum.tofixed(2) + '%');
        console.log('Tasa efectiva simulada: Bs', efectiva.tofixed(2));
        console.log('Diferencia vs actual: Bs', (efectiva - (window.configglobal?.tasa_efectiva || base)).tofixed(2));
        console.groupend();
        console.log('%c💡 Tip: prueba window._simularPeriodoSemanal(3) para 3 semanas', 'color:gray');
    };
})();
