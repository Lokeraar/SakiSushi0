// admin-helpers.js - Funcionesauxiliares (nodependientesdeotrosmódulos)
(function() {
    window.cambiarPassword = asyncfunction() {
        constcurrent = document.getElementById('currentPassword').value;
        constnueva = document.getElementById('newPassword').value;
        constconfirm = document.getElementById('confirmPassword').value;
        consterrorDiv = document.getElementById('passwordChangeError');
        
        if (errorDiv) errorDiv.style.display = 'none';
        
        if (!current || !nueva || !confirm) {
            window.mostrarToast('Completatodosloscampos', 'error');
            return;
        }
        if (nueva !== confirm) {
            window.mostrarToast('Lascontraseñasnocoinciden', 'error');
            return;
        
        }
        if (nueva.length < 4) {
            window.mostrarToast('Lacontraseñadebeteneralmenos 4caracteres', 'error');
            return;
        }
        
        constbtn = document.querySelector('[onclick="window.cambiarPassword()"]');
        constoriginalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<iclass="fasfa-spinnerfa-spin"></i> Actualizando...';
        }
        
        try {
            const { data: adminData, error: userError } = awaitwindow.supabaseClient
                .from('usuarios')
                .select('username')
                .eq('rol', 'admin')
                .maybeSingle();
            if (userError) throwuserError;
            if (!adminData) {
                window.mostrarToast('Noseencontró usuarioadministrador', 'error');
                return;
            }
            
            const { data: authData, error: authError } = awaitwindow.supabaseClient
                .rpc('verify_user_credentials', {
                    p_username: adminData.username,
                    p_password: current
                });
            if (authError) throwauthError;
            if (!authData || !authData.success) {
                window.mostrarToast('Contraseñaactualincorrecta', 'error');
                return;
            }
            
            const { data: hashed, error: hashErr } = awaitwindow.supabaseClient
                .rpc('hash_password', { plain_password: nueva });
            if (hashErr) throwhashErr;
            
            const { error: updateUserError } = awaitwindow.supabaseClient
                .from('usuarios')
                .update({ password_hash: hashed })
                .eq('rol', 'admin');
            if (updateUserError) throwupdateUserError;
            
            const { error: updateConfigError } = awaitwindow.supabaseClient
                .from('config')
                .update({ admin_password: nueva })
                .eq('id', 1);
            if (updateConfigError) throwupdateConfigError;
            
            window.configGlobal.admin_password = nueva;
            
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            window.mostrarToast('✅ Contraseñaactualizadacorrectamenteentodoelsistema', 'success');
            
        } catch (e) {
            console.error('Errorcambiandocontraseña:', e);
            if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.innerHTML = '<iclass="fasfa-exclamation-circle"></i> Error: ' + (e.message || 'Erroralcambiarlacontraseña');
            }
            window.mostrarToast('❌ Erroralcambiarlacontraseña: ' + (e.message || e), 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    };

    window.guardarRecoveryEmail = asyncfunction() {
        constemail = document.getElementById('recoveryEmail').value;
        if (!email || !email.includes('@')) { window.mostrarToast('Ingresauncorreoválido', 'error'); return; }
        try {
            awaitwindow.supabaseClient.from('config').update({ recovery_email: email }).eq('id', 1);
            window.mostrarToast('✉️ Correoderecuperaciónguardado', 'success');
        } catch (e) { console.error('Errorguardandoemail:', e); window.mostrarToast('❌ Erroralguardarelcorreo', 'error'); }
    };

    window.guardarWifiPersistente = function() {
        constssid = document.getElementById('qrWifiSsid')?.value || '';
        constpassword = document.getElementById('qrWifiPassword')?.value || '';
        
        if (ssid !== window.wifiSsidPersistente) {
            window.wifiSsidPersistente = ssid;
            localStorage.setItem('saki_wifi_ssid', ssid);
        }
        if (password !== window.wifiPasswordPersistente) {
            window.wifiPasswordPersistente = password;
            localStorage.setItem('saki_wifi_pwd', password);
        }
    };

    window.restaurarWifiPersistente = function() {
        constssidInput = document.getElementById('qrWifiSsid');
        constpasswordInput = document.getElementById('qrWifiPassword');
        if (ssidInput && window.wifiSsidPersistente) ssidInput.value = window.wifiSsidPersistente;
        if (passwordInput && window.wifiPasswordPersistente) passwordInput.value = window.wifiPasswordPersistente;
    };

    window._convertirUnidad = function(valor, desde, hacia) {
        if (!desde || !hacia || desde === hacia) returnvalor;
        letbase = valor;
        if (desde === 'kilogramos') base = valor * 1000;
        elseif (desde === 'litros') base = valor * 1000;
        if (hacia === 'kilogramos') returnbase / 1000;
        if (hacia === 'litros')     returnbase / 1000;
        returnbase;
    };

    window._pedirTasaDeHoy = function(onConfirm) {
        constoverlay = document.createElement('div');
        overlay.id = 'tasaHoyOverlay';
        overlay.style.cssText = [
            'position:fixed','top:0','left:0','width:100%','height:100%',
            'background:rgba(0,0,0,.85)','z-index:9999',
            'display:flex','align-items:center','justify-content:center',
            'font-family:Montserrat,sans-serif'
        ].join(';');
        overlay.innerHTML = `
            <divstyle="background:#fff;border-radius:16px;padding:2rem 2.5rem;width:90%;max-width:400px;box-shadow:0 8px 32pxrgba(0,0,0,.3);text-align:center">
                <divstyle="font-size:2.5rem;margin-bottom:.75rem">💱</div>
                <h2style="font-size:1.3rem;color:#1a1a2e;margin-bottom:.4rem">Tasadecambiodehoy</h2>
                <pstyle="font-size:.88rem;color:#666;margin-bottom:1.5rem">
                    Ingresaelvaloractualdeldólarenbolívaresparaqueelsistemacalculecorrectamentetodoslospreciosdehoy.
                </p>
                <inputtype="number" id="tasaHoyInput" placeholder="Ej: 42.50"
                    step="0.01" min="1"
                    style="width:100%;padding:.8rem 1rem;font-size:1.1rem;font-weight:700;text-align:center;
                           border:2pxsolid #e0e0e0;border-radius:10px;outline:none;
                           font-family:Montserrat,sans-serif;margin-bottom:1rem;box-sizing:border-box">
                <divid="tasaHoyError" style="color:#D32F2F;font-size:.82rem;margin-bottom:.75rem;display:none">
                    Porfavoringresaunvalorválidomayora 0.
                </div>
                <buttonid="tasaHoyBtn"
                    style="width:100%;padding:.9rem;background:linear-gradient(135deg,#D32F2F,#B71C1C);
                           color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;
                           cursor:pointer;font-family:Montserrat,sans-serif;letter-spacing:.5px">
                    Confirmartasadehoy
                </button>
                <pstyle="font-size:.75rem;color:#999;margin-top:.75rem">
                    Podrásajustarlaencualquiermomentodesdelabarradetasa.
                </p>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => {
            constinput = document.getElementById('tasaHoyInput');
            if (input) input.focus();
        }, 100);

        constconfirmar = () => {
            constval = parseFloat(document.getElementById('tasaHoyInput').value);
            consterrEl = document.getElementById('tasaHoyError');
            if (!val || val <= 0) {
                errEl.style.display = 'block';
                document.getElementById('tasaHoyInput').focus();
                return;
            }
            errEl.style.display = 'none';
            consthoy = newDate().toISOString().split('T')[0];
            localStorage.setItem('saki_tasa_fecha', hoy);
            localStorage.setItem('saki_tasa_valor', val);
            overlay.remove();
            onConfirm(val);
        };

        document.getElementById('tasaHoyBtn').addEventListener('click', confirmar);
        document.getElementById('tasaHoyInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') confirmar();
        });
    };

    window._verificarTasaDeHoy = function(onReady) {
        consthoy  = newDate().toISOString().split('T')[0];
        constfecha = localStorage.getItem('saki_tasa_fecha');
        constvalor = parseFloat(localStorage.getItem('saki_tasa_valor'));

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

        consthoy = newDate();
        if (hoy.getDay() !== 1) return;

        constclaveAviso = 'saki_aviso_lunes_' + hoy.toISOString().split('T')[0];
        if (localStorage.getItem(claveAviso)) return;
        localStorage.setItem(claveAviso, '1');

        constnotif = document.createElement('div');
        notif.style.cssText = [
            'position:fixed','top:1.5rem','left:50%','transform:translateX(-50%)',
            'background:#1a1a2e','color:#fff','border-radius:12px',
            'padding:1.2rem 1.5rem','z-index:8000','box-shadow:0 4px 20pxrgba(0,0,0,.4)',
            'max-width:420px','width:90%','font-family:Montserrat,sans-serif',
            'border-left:4pxsolid #FF9800'
        ].join(';');
        notif.innerHTML = `
            <divstyle="display:flex;align-items:flex-start;gap:.75rem">
                <divstyle="font-size:1.5rem;flex-shrink:0">📅</div>
                <divstyle="flex:1">
                    <divstyle="font-weight:700;margin-bottom:.3rem;font-size:.95rem">Nuevasemana — ¿Actualizaselporcentaje?</div>
                    <divstyle="font-size:.82rem;opacity:.85;margin-bottom:.75rem">
                        Hoyeslunesytienesactivoelaumentosemanal.
                        ¿Quieresajustarelporcentajedeaumentoparaestasemana?
                    </div>
                    <divstyle="display:flex;gap:.5rem;justify-content:flex-end">
                        <buttonid="avisoLunesNo"
                            style="padding:.4rem .9rem;background:rgba(255,255,255,.15);color:#fff;
                                   border:1pxsolidrgba(255,255,255,.3);border-radius:6px;
                                   cursor:pointer;font-family:Montserrat,sans-serif;font-size:.82rem">
                            No, dejarloigual
                        </button>
                        <buttonid="avisoLunesSi"
                            style="padding:.4rem .9rem;background:#FF9800;color:#1a1a2e;border:none;
                                   border-radius:6px;cursor:pointer;font-family:Montserrat,sans-serif;
                                   font-weight:700;font-size:.82rem">
                            Sí, cambiar %
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(notif);

        document.getElementById('avisoLunesNo').addEventListener('click', () => notif.remove());
        document.getElementById('avisoLunesSi').addEventListener('click', () => {
            notif.remove();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            constinput = document.getElementById('aumentoDiarioInput');
            if (input) {
                input.focus();
                input.select();
                input.style.outline = '3pxsolid #FF9800';
                setTimeout(() => { input.style.outline = ''; }, 3000);
            }
        });

        setTimeout(() => { if (notif.parentNode) notif.remove(); }, 30000);
    };

    window._simularLunes = function() {
        console.log('%c📅 Simulandolunesparapruebadeavisosemanal...', 'color:#FF9800;font-weight:700');
        consthoy = newDate().toISOString().split('T')[0];
        localStorage.removeItem('saki_aviso_lunes_' + hoy);
        constestadoOriginal = window.configGlobal?.aumento_semanal;
        if (window.configGlobal) window.configGlobal.aumento_semanal = true;
        const_orig = Date.prototype.getDay;
        Date.prototype.getDay = function() { return 1; };
        window._verificarAvisoLunes();
        Date.prototype.getDay = _orig;
        if (window.configGlobal && estadoOriginal !== undefined)
            window.configGlobal.aumento_semanal = estadoOriginal;
        console.log('%c✅ Avisodelunesdisparado. Miralapantalla.', 'color:green;font-weight:700');
    };

    window._simularPeriodoSemanal = function(semanas) {
        semanas = semanas || 1;
        constinput = document.getElementById('aumentoDiarioInput');
        constpct = parseFloat(input?.value) || 0;
        constbase = parseFloat(document.getElementById('tasaBaseInput')?.value) || 0;
        constacum = semanas * pct;
        constefectiva = base * (1 + acum / 100);
        console.group('%c📊 Simulación: ' + semanas + ' semana(s) deaumentosemanal', 'color:#FF9800;font-weight:700');
        console.log('Tasabase:', base);
        console.log('% porsemana:', pct + '%');
        console.log('Semanassimuladas:', semanas);
        console.log('Acumuladosimulado:', acum.toFixed(2) + '%');
        console.log('Tasaefectivasimulada: Bs', efectiva.toFixed(2));
        console.log('Diferenciavsactual: Bs', (efectiva - (window.configGlobal?.tasa_efectiva || base)).toFixed(2));
        console.groupEnd();
        console.log('%c💡 Tip: pruebawindow._simularPeriodoSemanal(3) para 3semanas', 'color:gray');
    };
})();
