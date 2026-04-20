// admin-config.js - Configuración de tasa de cambio y parámetros globales
(function() {
    window.cargarconfiguracion = async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('Config')
                .select('*')
                .eq('Id', 1)
                .single();
            if (error) throw error;
            window.configglobal = data || {};
            
            window.configglobal.tasa_cambio = window.configglobal.tasa_cambio || 400;
            window.configglobal.tasa_efectiva = window.configglobal.tasa_efectiva || 400;
            window.configglobal.aumento_diario = window.configglobal.aumento_diario || 0;
            window.configglobal.aumento_activo = window.configglobal.aumento_activo || false;
            window.configglobal.aumento_semanal = window.configglobal.aumento_semanal || false;
            
            window.configglobal.admin_password = window.configglobal.admin_password || 'Admin123';
            window.configglobal.recovery_email = window.configglobal.recovery_email || 'Admin@sakisushi.com';
            
            console.log('⚙️ configuración cargada. admin_password:', window.configglobal.admin_password ? '***' : 'No cargada');
            
        } catch (e) {
            console.error('Error cargando configuración:', e);
            window.configglobal = {
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

    window.cargarconfiguracionInicial = async function() {
        await window.cargarconfiguracion();
        window.actualizartasaui();
        window.recalculartasaefectiva();
        window.actualizarmenutasabanner();
    };

    window.actualizartasaui = function() {
        document.getElementById('Tasabaseinput').value      = window.configglobal.tasa_cambio || 400;
        document.getElementById('Aumentodiarioinput').value = window.configglobal.aumento_diario || 0;
        document.getElementById('Aumentoactivotoggle').checked = window.configglobal.aumento_activo || false;
        const semEl = document.getElementById('Aumentosemanaltoggle');
        if (semEl) semEl.checked = window.configglobal.aumento_semanal || false;
        document.getElementById('Tasaefectivadisplay').textContent = (window.configglobal.tasa_efectiva || 400).toFixed(2);
        document.getElementById('Aumentoacumuladodisplay').textContent = (window.configglobal.aumento_acumulado || 0).toFixed(2) + '%';
        if (window.configglobal.aumento_desde && document.getElementById('Aumentodesde'))
            document.getElementById('Aumentodesde').value = window.configglobal.aumento_desde.split('T')[0];
        if (window.configglobal.aumento_hasta && document.getElementById('Aumentohasta'))
            document.getElementById('Aumentohasta').value = window.configglobal.aumento_hasta.split('T')[0];
        if (window.configglobal.aumento_indefinido && document.getElementById('Aumentoindefinido'))
            document.getElementById('Aumentoindefinido').checked = true;
        if (typeof _actualizarLabelAumento === 'Function') _actualizarLabelAumento();
    };

    window.actualizarmenutasabanner = window.actualizartasaui;

    window.recalculartasaefectiva = function() {
        const tasaBaseInput = document.getElementById('Tasabaseinput');
        if (tasaBaseInput && window.configglobal) {
            window.configglobal.tasa_cambio = parseFloat(tasaBaseInput.value) || 0;
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
        const hastaval     = !indefinido ? (document.getElementById('aumentoHasta')?.value || '') : '';

        let periodos = 0;

        if (estaactivo && desdeval) {
            const hoy        = new Date(); hoy.setHours(0,0,0,0);
            const desdedate  = new Date(desdeval + 'T00:00:00');
            const hastadate  = hastaval ? new Date(hastaval + 'T00:00:00') : null;

            if (desdedate <= hoy) {
                const finefectivo = hastadate && hastadate < hoy ? hastadate : hoy;
                const msday      = 24 * 60 * 60 * 1000;
                const msperiodo  = activosemanal ? 7 * msday : msday;
                const diffms     = finefectivo - desdedate;
                periodos = Math.max(0, Math.floor(diffms / msperiodo) + 1);
            }
        }

        const aumentoacumulado = periodos * aumentopct;
        const tasaefectiva     = tasabase * (1 + aumentoacumulado / 100);

        console.group('%c🔄 Saki Sushi — Cálculo de Tasa', 'color:#FF9800;font-weight:700');
        console.log('Modo activo:', estaactivo ? (activosemanal ? 'SEMANAL' : 'DIARIO') : 'DESACTIVADO');
        console.log('Fecha inicio (Desde):', desdeval || '—');
        console.log('Fecha fin   (Hasta): ', hastaval || (indefinido ? 'Indefinido' : '—'));
        if (estaactivo && desdeval) {
            const _hoylog = new Date(); _hoylog.setHours(0,0,0,0);
            const _desdelog = new Date(desdeval + 'T00:00:00');
            const _msd = 24*60*60*1000;
            const _mplog = activosemanal ? 7*_msd : _msd;
            const _diffdias = Math.floor((_hoylog - _desdelog) / _msd);
            console.log('Días transcurridos desde "Desde":', _diffdias);
            console.log('Períodos ' + (activosemanal ? 'semanales' : 'diarios') + ' completados:', periodos);
        }
        console.log('Porcentaje por período:', aumentopct + '%');
        console.log('Períodos aplicados:', periodos);
        console.log('Acumulado total:', aumentoacumulado.toFixed(2) + '%');
        console.log('Tasa Base:', tasabase);
        console.log('Tasa Efectiva 💵 Bs', tasaefectiva.toFixed(2));
        console.groupEnd();

        document.getElementById('tasaEfectivaDisplay').textContent = tasaefectiva.toFixed(2);
        document.getElementById('aumentoAcumuladoDisplay').textContent = aumentoacumulado.toFixed(2) + '%';
        if (document.getElementById('tasaEfectivaCard'))
            document.getElementById('tasaEfectivaCard').textContent = 'Bs. ' + tasaefectiva.toFixed(2);

        window.configglobal.tasa_cambio       = tasabase;
        window.configglobal.aumento_diario    = aumentopct;
        window.configglobal.aumento_activo    = activodiario;
        window.configglobal.aumento_semanal   = activosemanal;
        window.configglobal.aumento_acumulado = aumentoacumulado;
        window.configglobal.tasa_efectiva     = tasaefectiva;
    };

    window.guardarconfiguracion = async function() {
        try {
            const tasabase = parseFloat(document.getElementById('tasaBaseInput').value) || 0;
            const aumentopct = parseFloat(document.getElementById('aumentoDiarioInput').value) || 0;
            const activodiario = document.getElementById('aumentoActivoToggle').checked;
            const activosemanal = document.getElementById('aumentoSemanalToggle')?.checked || false;
            const indefinido = document.getElementById('aumentoIndefinido')?.checked || false;
            
            window.configglobal.tasa_cambio = tasabase;
            window.configglobal.aumento_diario = aumentopct;
            window.configglobal.aumento_activo = activodiario;
            window.configglobal.aumento_semanal = activosemanal;
            
            window.recalculartasaefectiva();
            
            await window.supabaseClient.from('config').update({
                tasa_cambio:       window.configglobal.tasa_cambio,
                aumento_diario:    window.configglobal.aumento_diario,
                aumento_activo:    window.configglobal.aumento_activo,
                aumento_semanal:   window.configglobal.aumento_semanal || false,
                aumento_detenido:  window.configglobal.aumento_detenido,
                aumento_acumulado: window.configglobal.aumento_acumulado,
                tasa_efectiva:     window.configglobal.tasa_efectiva,
                aumento_desde:     (document.getElementById('aumentoDesde') && document.getElementById('aumentoDesde').value) || null,
                aumento_hasta:     (!document.getElementById('aumentoIndefinido')?.checked && document.getElementById('aumentoHasta')?.value) || null,
                aumento_indefinido: document.getElementById('aumentoIndefinido')?.checked || false,
                ultima_actualizacion: new Date().toISOString()
            }).eq('id', 1);
            
            window.renderizarmenu(document.getElementById('menuBuscador')?.value || '');
            await window._actualizarventashoyneto();
            await window._actualizardeliveryshoy();
            
            const tasadisplay = document.getElementById('tasaEfectivaDisplay');
            if (tasadisplay) {
                tasadisplay.textContent = (window.configglobal.tasa_efectiva || 0).toFixed(2);
            }
            
            window.mostrartoast(`💱 configuración guardada. nueva tasa efectiva: bs ${(window.configglobal.tasa_efectiva || 0).toFixed(2)} por usd`, 'success');
            
        } catch (e) { 
            console.error('Error guardando configuración:', e); 
            window.mostrartoast('❌ Error al guardar la configuración', 'error'); 
        }
    };
})();
