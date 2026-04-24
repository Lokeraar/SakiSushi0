// admin-config.js - Configuración de tasa de cambio y parámetros globales
(function() {
    window.cargarConfiguracion = async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('config')
                .select('*')
                .eq('id', 1)
                .single();
            if (error) throw error;
            window.configGlobal = data || {};
            
            window.configGlobal.tasa_cambio = window.configGlobal.tasa_cambio || 400;
            window.configGlobal.tasa_efectiva = window.configGlobal.tasa_efectiva || 400;
            window.configGlobal.aumento_diario = window.configGlobal.aumento_diario || 0;
            window.configGlobal.aumento_activo = window.configGlobal.aumento_activo || false;
            window.configGlobal.aumento_semanal = window.configGlobal.aumento_semanal || false;
            
        } catch (e) {
            console.error('Error cargando configuración:', e);
            window.configGlobal = {
                tasa_cambio: 400,
                tasa_efectiva: 400,
                aumento_diario: 0,
                aumento_activo: false,
                aumento_semanal: false
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
        document.getElementById('tasaBaseInput').value      = window.configGlobal.tasa_cambio || 400;
        document.getElementById('aumentoDiarioInput').value = window.configGlobal.aumento_diario || 0;
        document.getElementById('aumentoActivoToggle').checked = window.configGlobal.aumento_activo || false;
        const semEl = document.getElementById('aumentoSemanalToggle');
        if (semEl) semEl.checked = window.configGlobal.aumento_semanal || false;
        document.getElementById('tasaEfectivaDisplay').textContent = (window.configGlobal.tasa_efectiva || 400).toFixed(2);
        document.getElementById('aumentoAcumuladoDisplay').textContent = (window.configGlobal.aumento_acumulado || 0).toFixed(2) + '%';
        if (window.configGlobal.aumento_desde && document.getElementById('aumentoDesde'))
            document.getElementById('aumentoDesde').value = window.configGlobal.aumento_desde.split('T')[0];
        if (window.configGlobal.aumento_hasta && document.getElementById('aumentoHasta'))
            document.getElementById('aumentoHasta').value = window.configGlobal.aumento_hasta.split('T')[0];
        if (window.configGlobal.aumento_indefinido && document.getElementById('aumentoIndefinido'))
            document.getElementById('aumentoIndefinido').checked = true;
        // Mostrar fechas card si hay aumento activo (diario o semanal) O si está marcado indefinido
        const algunAumentoActivo = (window.configGlobal.aumento_activo || window.configGlobal.aumento_semanal || window.configGlobal.aumento_indefinido);
        document.getElementById('tasaFechasDiv').style.display = algunAumentoActivo ? 'flex' : 'none';
        if (typeof _actualizarLabelAumento === 'function') _actualizarLabelAumento();
    };

    window.actualizarMenuTasaBanner = window.actualizarTasaUI;

    window.recalcularTasaEfectiva = function() {
        const tasaBaseInput = document.getElementById('tasaBaseInput');
        if (tasaBaseInput && window.configGlobal) {
            window.configGlobal.tasa_cambio = parseFloat(tasaBaseInput.value) || 0;
        }
        const tasaBase     = parseFloat(document.getElementById('tasaBaseInput').value) || 0;
        const aumentoPct   = parseFloat(document.getElementById('aumentoDiarioInput').value) || 0;
        const activoDiario  = document.getElementById('aumentoActivoToggle').checked;
        const activoSemanal = document.getElementById('aumentoSemanalToggle') &&
                              document.getElementById('aumentoSemanalToggle').checked;
        const estaActivo   = activoDiario || activoSemanal;
        const indefinido   = document.getElementById('aumentoIndefinido') &&
                             document.getElementById('aumentoIndefinido').checked;
        const desdeVal     = document.getElementById('aumentoDesde')?.value || '';
        const hastaVal     = !indefinido ? (document.getElementById('aumentoHasta')?.value || '') : '';

        let periodos = 0;

        if (estaActivo && desdeVal) {
            const hoy        = new Date(); hoy.setHours(0,0,0,0);
            const desdeDate  = new Date(desdeVal + 'T00:00:00');
            const hastaDate  = hastaVal ? new Date(hastaVal + 'T00:00:00') : null;

            if (desdeDate <= hoy) {
                const finEfectivo = hastaDate && hastaDate < hoy ? hastaDate : hoy;
                const msDay      = 24 * 60 * 60 * 1000;
                const msPeriodo  = activoSemanal ? 7 * msDay : msDay;
                const diffMs     = finEfectivo - desdeDate;
                periodos = Math.max(0, Math.floor(diffMs / msPeriodo) + 1);
            }
        }

        const aumentoAcumulado = periodos * aumentoPct;
        const tasaEfectiva     = tasaBase * (1 + aumentoAcumulado / 100);

        console.group('%c🔄 Saki Sushi — Cálculo de Tasa', 'color:#FF9800;font-weight:700');
        console.log('Modo activo:', estaActivo ? (activoSemanal ? 'SEMANAL' : 'DIARIO') : 'DESACTIVADO');
        console.log('Fecha inicio (Desde):', desdeVal || '—');
        console.log('Fecha fin   (Hasta): ', hastaVal || (indefinido ? 'Indefinido' : '—'));
        if (estaActivo && desdeVal) {
            const _hoyLog = new Date(); _hoyLog.setHours(0,0,0,0);
            const _desdeLog = new Date(desdeVal + 'T00:00:00');
            const _msD = 24*60*60*1000;
            const _mpLog = activoSemanal ? 7*_msD : _msD;
            const _diffDias = Math.floor((_hoyLog - _desdeLog) / _msD);
            console.log('Días transcurridos desde "Desde":', _diffDias);
            console.log('Períodos ' + (activoSemanal ? 'semanales' : 'diarios') + ' completados:', periodos);
        }
        console.log('Porcentaje por período:', aumentoPct + '%');
        console.log('Períodos aplicados:', periodos);
        console.log('Acumulado total:', aumentoAcumulado.toFixed(2) + '%');
        console.log('Tasa Base:', tasaBase);
        console.log('Tasa Efectiva 💵 Bs', tasaEfectiva.toFixed(2));
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

    window.guardarConfiguracion = async function() {
        try {
            const tasaBase = parseFloat(document.getElementById('tasaBaseInput').value) || 0;
            const aumentoPct = parseFloat(document.getElementById('aumentoDiarioInput').value) || 0;
            const activoDiario = document.getElementById('aumentoActivoToggle').checked;
            const activoSemanal = document.getElementById('aumentoSemanalToggle')?.checked || false;
            const indefinido = document.getElementById('aumentoIndefinido')?.checked || false;
            
            window.configGlobal.tasa_cambio = tasaBase;
            window.configGlobal.aumento_diario = aumentoPct;
            window.configGlobal.aumento_activo = activoDiario;
            window.configGlobal.aumento_semanal = activoSemanal;
            
            window.recalcularTasaEfectiva();
            
            await window.supabaseClient.from('config').update({
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
                ultima_actualizacion: new Date().toISOString()
            }).eq('id', 1);
            
            window.renderizarMenu(document.getElementById('menuBuscador')?.value || '');
            await window._actualizarVentasHoyNeto();
            await window._actualizarDeliverysHoy();
            
            const tasaDisplay = document.getElementById('tasaEfectivaDisplay');
            if (tasaDisplay) {
                tasaDisplay.textContent = (window.configGlobal.tasa_efectiva || 0).toFixed(2);
            }
            
            window.mostrarToast(`💱 Configuración guardada. Nueva tasa efectiva: Bs ${(window.configGlobal.tasa_efectiva || 0).toFixed(2)} por USD`, 'success');
            
        } catch (e) { 
            console.error('Error guardando configuración:', e); 
            window.mostrarToast('❌ Error al guardar la configuración', 'error'); 
        }
    };
})();
