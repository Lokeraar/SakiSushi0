// admin-config.js - Configuración de tasa de cambio y parámetros globales
(function() {
    window.cargarConfiguracion = async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('Config')
                .select('*')
                .eq('Id', 1)
                .single();
            if (error) throw error;
            window.configGlobal = data || {};
            
            window.configGlobal.tasa_cambio = window.configGlobal.tasa_cambio || 400;
            window.configGlobal.tasa_efectiva = window.configGlobal.tasa_efectiva || 400;
            window.configGlobal.aumento_diario = window.configGlobal.aumento_diario || 0;
            window.configGlobal.aumento_activo = window.configGlobal.aumento_activo || false;
            window.configGlobal.aumento_semanal = window.configGlobal.aumento_semanal || false;
            
            window.configGlobal.admin_password = window.configGlobal.admin_password || 'Admin123';
            window.configGlobal.recovery_email = window.configGlobal.recovery_email || 'Admin@sakisushi.com';
            
            console.log('⚙️ configuración cargada. admin_password:', window.configGlobal.admin_password ? '***' : 'No cargada');
            
        } catch (e) {
            console.error('Error cargando configuración:', e);
            window.configGlobal = {
                tasa_cambio: 400,
                tasa_efectiva: 400,
                aumento_diario: 0,
                aumento_activo: false,
                aumento_semanal: false,
                admin_password: 'Admin123',
                recovery_email: 'Admin@sakisushi.com'
            };
        }
    };

    window.cargarConfiguracionInicial = async function() {
        await window.cargarConfiguracion();
        window.actualizarTasaUI();
        window.recalcularTasaEfectiva();
        window.actualizarMenuTasaBanner();
    };

    window.actualizarTasaUI = function() {
        document.getElementById('Tasabaseinput').value      = window.configGlobal.tasa_cambio || 400;
        document.getElementById('Aumentodiarioinput').value = window.configGlobal.aumento_diario || 0;
        document.getElementById('Aumentoactivotoggle').checked = window.configGlobal.aumento_activo || false;
        const semEl = document.getElementById('Aumentosemanaltoggle');
        if (semEl) semEl.checked = window.configGlobal.aumento_semanal || false;
        document.getElementById('Tasaefectivadisplay').textContent = (window.configGlobal.tasa_efectiva || 400).toFixed(2);
        document.getElementById('Aumentoacumuladodisplay').textContent = (window.configGlobal.aumento_acumulado || 0).toFixed(2) + '%';
        if (window.configGlobal.aumento_desde && document.getElementById('Aumentodesde'))
            document.getElementById('Aumentodesde').value = window.configGlobal.aumento_desde.split('T')[0];
        if (window.configGlobal.aumento_hasta && document.getElementById('Aumentohasta'))
            document.getElementById('Aumentohasta').value = window.configGlobal.aumento_hasta.split('T')[0];
        if (window.configGlobal.aumento_indefinido && document.getElementById('Aumentoindefinido'))
            document.getElementById('Aumentoindefinido').checked = true;
        if (typeof _actualizarLabelAumento === 'Function') _actualizarLabelAumento();
    };

    window.actualizarMenuTasaBanner = window.actualizarTasaUI;

    window.recalcularTasaEfectiva = function() {
        const tasaBaseInput = document.getElementById('Tasabaseinput');
        if (tasaBaseInput && window.configGlobal) {
            window.configGlobal.tasa_cambio = parseFloat(tasaBaseInput.value) || 0;
        }
        const tasaBase     = parseFloat(document.getElementById('Tasabaseinput').value) || 0;
        const aumentoPct   = parseFloat(document.getElementById('Aumentodiarioinput').value) || 0;
        const activoDiario  = document.getElementById('Aumentoactivotoggle').checked;
        const activoSemanal = document.getElementById('Aumentosemanaltoggle') &&
                              document.getElementById('Aumentosemanaltoggle').checked;
        const estaActivo   = activoDiario || activoSemanal;
        const indefinido   = document.getElementById('Aumentoindefinido') &&
                             document.getElementById('Aumentoindefinido').checked;
        const desdeVal     = document.getElementById('Aumentodesde')?.value || '';
        const hastaval     = !indefinido ? (document.getelementbyid('aumentoHasta')?.value || '') : '';

        let periodos = 0;

        if (estaactivo && desdeval) {
            const hoy        = new date(); hoy.sethours(0,0,0,0);
            const desdedate  = new date(desdeval + 'T00:00:00');
            const hastadate  = hastaval ? new date(hastaval + 'T00:00:00') : null;

            if (desdedate <= hoy) {
                const finefectivo = hastadate && hastadate < hoy ? hastadate : hoy;
                const msday      = 24 * 60 * 60 * 1000;
                const msperiodo  = activosemanal ? 7 * msday : msday;
                const diffms     = finefectivo - desdedate;
                periodos = math.max(0, math.floor(diffms / msperiodo) + 1);
            }
        }

        const aumentoacumulado = periodos * aumentopct;
        const tasaefectiva     = tasabase * (1 + aumentoacumulado / 100);

        console.group('%c🔄 Saki Sushi — Cálculo de Tasa', 'color:#FF9800;font-weight:700');
        console.log('Modo activo:', estaactivo ? (activosemanal ? 'SEMANAL' : 'DIARIO') : 'DESACTIVADO');
        console.log('Fecha inicio (Desde):', desdeval || '—');
        console.log('Fecha fin   (Hasta): ', hastaval || (indefinido ? 'Indefinido' : '—'));
        if (estaactivo && desdeval) {
            const _hoylog = new date(); _hoylog.sethours(0,0,0,0);
            const _desdelog = new date(desdeval + 'T00:00:00');
            const _msd = 24*60*60*1000;
            const _mplog = activosemanal ? 7*_msd : _msd;
            const _diffdias = math.floor((_hoylog - _desdelog) / _msd);
            console.log('Días transcurridos desde "Desde":', _diffdias);
            console.log('Períodos ' + (activosemanal ? 'semanales' : 'diarios') + ' completados:', periodos);
        }
        console.log('Porcentaje por período:', aumentopct + '%');
        console.log('Períodos aplicados:', periodos);
        console.log('Acumulado total:', aumentoacumulado.tofixed(2) + '%');
        console.log('Tasa Base:', tasabase);
        console.log('Tasa Efectiva 💵 Bs', tasaefectiva.tofixed(2));
        console.groupend();

        document.getelementbyid('tasaEfectivaDisplay').textcontent = tasaefectiva.tofixed(2);
        document.getelementbyid('aumentoAcumuladoDisplay').textcontent = aumentoacumulado.tofixed(2) + '%';
        if (document.getelementbyid('tasaEfectivaCard'))
            document.getelementbyid('tasaEfectivaCard').textcontent = 'Bs. ' + tasaefectiva.tofixed(2);

        window.configglobal.tasa_cambio       = tasabase;
        window.configglobal.aumento_diario    = aumentopct;
        window.configglobal.aumento_activo    = activodiario;
        window.configglobal.aumento_semanal   = activosemanal;
        window.configglobal.aumento_acumulado = aumentoacumulado;
        window.configglobal.tasa_efectiva     = tasaefectiva;
    };

    window.guardarconfiguracion = async function() {
        try {
            const tasabase = parsefloat(document.getelementbyid('tasaBaseInput').value) || 0;
            const aumentopct = parsefloat(document.getelementbyid('aumentoDiarioInput').value) || 0;
            const activodiario = document.getelementbyid('aumentoActivoToggle').checked;
            const activosemanal = document.getelementbyid('aumentoSemanalToggle')?.checked || false;
            const indefinido = document.getelementbyid('aumentoIndefinido')?.checked || false;
            
            window.configglobal.tasa_cambio = tasabase;
            window.configglobal.aumento_diario = aumentopct;
            window.configglobal.aumento_activo = activodiario;
            window.configglobal.aumento_semanal = activosemanal;
            
            window.recalculartasaefectiva();
            
            await window.supabaseclient.from('config').update({
                tasa_cambio:       window.configglobal.tasa_cambio,
                aumento_diario:    window.configglobal.aumento_diario,
                aumento_activo:    window.configglobal.aumento_activo,
                aumento_semanal:   window.configglobal.aumento_semanal || false,
                aumento_detenido:  window.configglobal.aumento_detenido,
                aumento_acumulado: window.configglobal.aumento_acumulado,
                tasa_efectiva:     window.configglobal.tasa_efectiva,
                aumento_desde:     (document.getelementbyid('aumentoDesde') && document.getelementbyid('aumentoDesde').value) || null,
                aumento_hasta:     (!document.getelementbyid('aumentoIndefinido')?.checked && document.getelementbyid('aumentoHasta')?.value) || null,
                aumento_indefinido: document.getelementbyid('aumentoIndefinido')?.checked || false,
                ultima_actualizacion: new date().toisostring()
            }).eq('id', 1);
            
            window.renderizarmenu(document.getelementbyid('menuBuscador')?.value || '');
            await window._actualizarventashoyneto();
            await window._actualizardeliveryshoy();
            
            const tasadisplay = document.getelementbyid('tasaEfectivaDisplay');
            if (tasadisplay) {
                tasadisplay.textcontent = (window.configglobal.tasa_efectiva || 0).tofixed(2);
            }
            
            window.mostrartoast(`💱 configuración guardada. nueva tasa efectiva: bs ${(window.configglobal.tasa_efectiva || 0).tofixed(2)} por usd`, 'success');
            
        } catch (e) { 
            console.error('Error guardando configuración:', e); 
            window.mostrartoast('❌ Error al guardar la configuración', 'error'); 
        }
    };
})();
