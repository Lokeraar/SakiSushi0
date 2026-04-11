// admin-config.js - Configuracióndetasadecambioyparámetrosglobales
(function() {
    window.cargarConfiguracion = asyncfunction() {
        try {
            const { data, error } = awaitwindow.supabaseClient
                .from('config')
                .select('*')
                .eq('id', 1)
                .single();
            if (error) throwerror;
            window.configGlobal = data || {};
            
            window.configGlobal.tasa_cambio = window.configGlobal.tasa_cambio || 400;
            window.configGlobal.tasa_efectiva = window.configGlobal.tasa_efectiva || 400;
            window.configGlobal.aumento_diario = window.configGlobal.aumento_diario || 0;
            window.configGlobal.aumento_activo = window.configGlobal.aumento_activo || false;
            window.configGlobal.aumento_semanal = window.configGlobal.aumento_semanal || false;
            
            window.configGlobal.admin_password = window.configGlobal.admin_password || 'admin123';
            window.configGlobal.recovery_email = window.configGlobal.recovery_email || 'admin@sakisushi.com';
            
            console.log('⚙️ Configuracióncargada. admin_password:', window.configGlobal.admin_password ? '***' : 'NOCARGADA');
            
        } catch (e) {
            console.error('Errorcargandoconfiguración:', e);
            window.configGlobal = {
                tasa_cambio: 400,
                tasa_efectiva: 400,
                aumento_diario: 0,
                aumento_activo: false,
                aumento_semanal: false,
                admin_password: 'admin123',
                recovery_email: 'admin@sakisushi.com'
            };
        }
    };

    window.cargarConfiguracionInicial = asyncfunction() {
        awaitwindow.cargarConfiguracion();
        window.actualizarTasaUI();
        window.recalcularTasaEfectiva();
        window.actualizarMenuTasaBanner();
    };

    window.actualizarTasaUI = function() {
        document.getElementById('tasaBaseInput').value      = window.configGlobal.tasa_cambio || 400;
        document.getElementById('aumentoDiarioInput').value = window.configGlobal.aumento_diario || 0;
        document.getElementById('aumentoActivoToggle').checked = window.configGlobal.aumento_activo || false;
        constsemEl = document.getElementById('aumentoSemanalToggle');
        if (semEl) semEl.checked = window.configGlobal.aumento_semanal || false;
        document.getElementById('tasaEfectivaDisplay').textContent = (window.configGlobal.tasa_efectiva || 400).toFixed(2);
        document.getElementById('aumentoAcumuladoDisplay').textContent = (window.configGlobal.aumento_acumulado || 0).toFixed(2) + '%';
        if (window.configGlobal.aumento_desde && document.getElementById('aumentoDesde'))
            document.getElementById('aumentoDesde').value = window.configGlobal.aumento_desde.split('T')[0];
        if (window.configGlobal.aumento_hasta && document.getElementById('aumentoHasta'))
            document.getElementById('aumentoHasta').value = window.configGlobal.aumento_hasta.split('T')[0];
        if (window.configGlobal.aumento_indefinido && document.getElementById('aumentoIndefinido'))
            document.getElementById('aumentoIndefinido').checked = true;
        if (typeof_actualizarLabelAumento === 'function') _actualizarLabelAumento();
    };

    window.actualizarMenuTasaBanner = window.actualizarTasaUI;

    window.recalcularTasaEfectiva = function() {
        consttasaBaseInput = document.getElementById('tasaBaseInput');
        if (tasaBaseInput && window.configGlobal) {
            window.configGlobal.tasa_cambio = parseFloat(tasaBaseInput.value) || 0;
        }
        consttasaBase     = parseFloat(document.getElementById('tasaBaseInput').value) || 0;
        constaumentoPct   = parseFloat(document.getElementById('aumentoDiarioInput').value) || 0;
        constactivoDiario  = document.getElementById('aumentoActivoToggle').checked;
        constactivoSemanal = document.getElementById('aumentoSemanalToggle') &&
                              document.getElementById('aumentoSemanalToggle').checked;
        constestaActivo   = activoDiario || activoSemanal;
        constindefinido   = document.getElementById('aumentoIndefinido') &&
                             document.getElementById('aumentoIndefinido').checked;
        constdesdeVal     = document.getElementById('aumentoDesde')?.value || '';
        consthastaVal     = !indefinido ? (document.getElementById('aumentoHasta')?.value || '') : '';

        letperiodos = 0;

        if (estaActivo && desdeVal) {
            consthoy        = newDate(); hoy.setHours(0,0,0,0);
            constdesdeDate  = newDate(desdeVal + 'T00:00:00');
            consthastaDate  = hastaVal ? newDate(hastaVal + 'T00:00:00') : null;

            if (desdeDate <= hoy) {
                constfinEfectivo = hastaDate && hastaDate < hoy ? hastaDate : hoy;
                constmsDay      = 24 * 60 * 60 * 1000;
                constmsPeriodo  = activoSemanal ? 7 * msDay : msDay;
                constdiffMs     = finEfectivo - desdeDate;
                periodos = Math.max(0, Math.floor(diffMs / msPeriodo) + 1);
            }
        }

        constaumentoAcumulado = periodos * aumentoPct;
        consttasaEfectiva     = tasaBase * (1 + aumentoAcumulado / 100);

        console.group('%c🔄 SakiSushi — CálculodeTasa', 'color:#FF9800;font-weight:700');
        console.log('Modoactivo:', estaActivo ? (activoSemanal ? 'SEMANAL' : 'DIARIO') : 'DESACTIVADO');
        console.log('Fechainicio (Desde):', desdeVal || '—');
        console.log('Fechafin   (Hasta): ', hastaVal || (indefinido ? 'Indefinido' : '—'));
        if (estaActivo && desdeVal) {
            const_hoyLog = newDate(); _hoyLog.setHours(0,0,0,0);
            const_desdeLog = newDate(desdeVal + 'T00:00:00');
            const_msD = 24*60*60*1000;
            const_mpLog = activoSemanal ? 7*_msD : _msD;
            const_diffDias = Math.floor((_hoyLog - _desdeLog) / _msD);
            console.log('Díastranscurridosdesde "Desde":', _diffDias);
            console.log('Períodos ' + (activoSemanal ? 'semanales' : 'diarios') + ' completados:', periodos);
        }
        console.log('Porcentajeporperíodo:', aumentoPct + '%');
        console.log('Períodosaplicados:', periodos);
        console.log('Acumuladototal:', aumentoAcumulado.toFixed(2) + '%');
        console.log('TasaBase:', tasaBase);
        console.log('TasaEfectiva 💵 Bs', tasaEfectiva.toFixed(2));
        console.groupEnd();

        document.getElementById('tasaEfectivaDisplay').textContent = tasaEfectiva.toFixed(2);
        document.getElementById('aumentoAcumuladoDisplay').textContent = aumentoAcumulado.toFixed(2) + '%';
        if (document.getElementById('tasaEfectivaCard'))
            document.getElementById('tasaEfectivaCard').textContent = 'Bs. ' + tasaEfectiva.toFixed(2);

        window.configGlobal.tasa_cambio       = tasaBase;
        window.configGlobal.aumento_diario    = aumentoPct;
        window.configGlobal.aumento_activo    = activoDiario;
        window.configGlobal.aumento_semanal   = activoSemanal;
        window.configGlobal.aumento_acumulado = aumentoAcumulado;
        window.configGlobal.tasa_efectiva     = tasaEfectiva;
    };

    window.guardarConfiguracion = asyncfunction() {
        try {
            consttasaBase = parseFloat(document.getElementById('tasaBaseInput').value) || 0;
            constaumentoPct = parseFloat(document.getElementById('aumentoDiarioInput').value) || 0;
            constactivoDiario = document.getElementById('aumentoActivoToggle').checked;
            constactivoSemanal = document.getElementById('aumentoSemanalToggle')?.checked || false;
            constindefinido = document.getElementById('aumentoIndefinido')?.checked || false;
            
            window.configGlobal.tasa_cambio = tasaBase;
            window.configGlobal.aumento_diario = aumentoPct;
            window.configGlobal.aumento_activo = activoDiario;
            window.configGlobal.aumento_semanal = activoSemanal;
            
            window.recalcularTasaEfectiva();
            
            awaitwindow.supabaseClient.from('config').update({
                tasa_cambio:       window.configGlobal.tasa_cambio,
                aumento_diario:    window.configGlobal.aumento_diario,
                aumento_activo:    window.configGlobal.aumento_activo,
                aumento_semanal:   window.configGlobal.aumento_semanal || false,
                aumento_detenido:  window.configGlobal.aumento_detenido,
                aumento_acumulado: window.configGlobal.aumento_acumulado,
                tasa_efectiva:     window.configGlobal.tasa_efectiva,
                aumento_desde:     (document.getElementById('aumentoDesde') && document.getElementById('aumentoDesde').value) || null,
                aumento_hasta:     (!document.getElementById('aumentoIndefinido')?.checked && document.getElementById('aumentoHasta')?.value) || null,
                aumento_indefinido: document.getElementById('aumentoIndefinido')?.checked || false,
                ultima_actualizacion: newDate().toISOString()
            }).eq('id', 1);
            
            window.renderizarMenu(document.getElementById('menuBuscador')?.value || '');
            awaitwindow._actualizarVentasHoyNeto();
            awaitwindow._actualizarDeliverysHoy();
            
            consttasaDisplay = document.getElementById('tasaEfectivaDisplay');
            if (tasaDisplay) {
                tasaDisplay.textContent = (window.configGlobal.tasa_efectiva || 0).toFixed(2);
            }
            
            window.mostrarToast(`💱 Configuraciónguardada. Nuevatasaefectiva: Bs ${(window.configGlobal.tasa_efectiva || 0).toFixed(2)} porUSD`, 'success');
            
        } catch (e) { 
            console.error('Errorguardandoconfiguración:', e); 
            window.mostrarToast('❌ Erroralguardarlaconfiguración', 'error'); 
        }
    };
})();
