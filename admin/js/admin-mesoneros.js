// admin-mesoneros.js — Gestión de Mesoneros y Propinas con Realtime
(function() {
    'use strict';

    // Variables globales de estado
    let currentMesoneroFotoFile = null;
    let currentMesoneroFotoUrl  = '';
    let mesoneroParaPagoId      = null;

    // ════════════════════════════════════════
    // ACTUALIZAR ACUMULADOS PENDIENTES
    // ════════════════════════════════════════
    window.actualizarAcumuladosPendientes = async function() {
        try {
            // Consulta todas las propinas pendientes (sin filtrar fecha)
            const { data, error } = await window.supabaseClient
                .from('propinas')
                .select('mesonero_id, monto_bs')
                .eq('entregado', false);

            if (error) throw error;

            // Sumar monto_bs por mesonero_id
            const acumuladosPorMesonero = {};
            (data || []).forEach(function(p) {
                const mid = p.mesonero_id;
                if (!acumuladosPorMesonero[mid]) {
                    acumuladosPorMesonero[mid] = 0;
                }
                acumuladosPorMesonero[mid] += (p.monto_bs || 0);
            });

            // Actualizar en DOM: selector [data-mesonero-id] → elemento .mesonero-pendiente
            const tarjetas = document.querySelectorAll('[data-mesonero-id]');
            tarjetas.forEach(function(card) {
                const mesoneroId = card.getAttribute('data-mesonero-id');
                const pendienteEl = card.querySelector('.mesonero-pendiente');
                const acumulado = acumuladosPorMesonero[mesoneroId] || 0;

                if (pendienteEl) {
                    const tasa = Number(window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400) || 400;
                    const usd = tasa > 0 ? acumulado / tasa : 0;
                    pendienteEl.textContent = window.formatUSD(usd) + ' / ' + window.formatBs(acumulado);

                    if (acumulado > 0) {
                        pendienteEl.style.color = 'var(--propina)';
                        pendienteEl.style.fontWeight = '700';
                    } else {
                        pendienteEl.style.color = 'var(--success)';
                        pendienteEl.style.fontWeight = '600';
                    }
                }

                // Actualizar botón Pagado
                const btnPagado = card.querySelector('.btn-pagado-mesonero');
                if (btnPagado) {
                    btnPagado.disabled = acumulado <= 0;
                    btnPagado.style.opacity = acumulado <= 0 ? '0.5' : '1';
                    btnPagado.style.cursor = acumulado <= 0 ? 'not-allowed' : 'pointer';
                }
            });

            // Llamar a cargarPropinas para actualizar totales generales
            await window.cargarPropinas();
        } catch (e) {
            console.error('Error actualizando acumulados:', e);
        }
    };

    // ════════════════════════════════════════
    // INICIALIZACIÓN DE REALTIME
    // ════════════════════════════════════════
    function iniciarRealtimePropinas() {
        // Limpiar canal previo si existe
        if (window.propinasChannel) {
            window.supabaseClient.removeChannel(window.propinasChannel);
        }

        // Crear nuevo canal para cambios en propinas
        window.propinasChannel = window.supabaseClient.channel('propinas-mesoneros-realtime')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'propinas' },
                async function(payload) {
                    console.log('Cambio en propinas:', payload);
                    // Actualizar acumulados con pequeño delay para permitir commit
                    setTimeout(function() {
                        window.actualizarAcumuladosPendientes();
                    }, 300);
                }
            )
            .subscribe();
    }

    // ════════════════════════════════════════
    // CARGAR / RENDERIZAR MESONEROS
    // ════════════════════════════════════════
    window.cargarMesoneros = async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('mesoneros').select('*').order('nombre');
            if (error) throw error;
            window.mesoneros = data || [];
            await renderizarMesonerosConAcumulados();
            await cargarPropinas();
            iniciarRealtimePropinas();
        } catch(e) { 
            console.error('Error cargando mesoneros:', e); 
            window.mostrarToast('Error al cargar mesoneros', 'error');
        }
    };

    async function renderizarMesonerosConAcumulados() {
        const container = document.getElementById('mesonerosList');
        if (!container) return;
        
        const mesoneros = window.mesoneros || [];
        if (!mesoneros.length) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;text-align:center;padding:2rem">No hay mesoneros registrados.</p>';
            return;
        }

        const sorted = [...mesoneros].sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        let html = '';
        for (const m of sorted) {
            const inicial = m.nombre.charAt(0).toUpperCase();
            const avatar = m.foto
                ? '<div class="ucard-avatar"><img src="' + m.foto + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:pointer" onclick="window.expandirImagen(this.src)"></div>'
                : '<div class="ucard-avatar"><div style="width:100%;height:100%;font-size:1.4rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--propina),#7B1FA2);color:#fff">' + inicial + '</div></div>';
            
            const badge = m.activo
                ? '<span class="ucard-status-inline" style="color:var(--success);margin-left:auto"><i class="fas fa-check-circle"></i> ACTIVO</span>'
                : '<span class="ucard-status-inline" style="color:var(--text-muted);margin-left:auto"><i class="fas fa-circle"></i> INACTIVO</span>';
            
            const toggleClass = m.activo ? 'btn-toggle-on' : 'btn-toggle-off';
            const toggleTxt   = m.activo ? 'Inhabilitar' : 'Activar';
            const toggleVal   = String(!m.activo);

            html += '<div class="card-standard mesonero-card" data-mesonero-id="' + m.id + '" id="mesonero-card-' + m.id + '" style="border-left-color:var(--propina)">'
                + avatar
                + '<div class="ucard-body">'
                +   '<div class="ucard-top">'
                +     '<div class="ucard-names">'
                +       '<div class="ucard-line1"><span class="mesonero-nombre">' + m.nombre + '</span>' + badge + '</div>'
                +       '<div class="ucard-line2" style="margin-top:.5rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">'
                +         '<span style="font-size:.75rem;color:var(--text-muted)">Pendiente:</span>'
                +         '<span class="mesonero-pendiente" style="font-size:.95rem">Calculando...</span>'
                +       '</div>'
                +       '<div class="ucard-line3" style="margin-top:.5rem">'
                +         '<button class="btn-toggle ' + toggleClass + '" style="font-size:.75rem;padding:.35rem .6rem" onclick="window.toggleMesoneroActivo(\'' + m.id + '\',' + toggleVal + ')">' + toggleTxt + '</button>'
                +         '<button class="btn-primary btn-pagado-mesonero" style="font-size:.75rem;padding:.35rem .75rem;margin-left:.5rem" onclick="window.abrirModalPago(\'' + m.id + '\')" title="Registrar pago">'
                +           '<i class="fas fa-hand-holding-usd"></i> Pagado'
                +         '</button>'
                +         '<div class="ucard-actions-right">'
                +           '<button class="btn-icon edit" onclick="window.editarMesonero(\'' + m.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>'
                +           '<button class="btn-icon delete" onclick="window.eliminarMesonero(\'' + m.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>'
                +         '</div>'
                +       '</div>'
                +     '</div>'
                +   '</div>'
                + '</div>'
                + '</div>';
        }
        container.innerHTML = html;

        // Actualizar acumulados pendientes usando la nueva función
        setTimeout(function() {
            window.actualizarAcumuladosPendientes();
        }, 100);
    }

    // ════════════════════════════════════════
    // GESTIÓN DE MESONEROS (CRUD)
    // ════════════════════════════════════════
    window.editarMesonero = function(id) {
        const m = (window.mesoneros || []).find(x => x.id === id);
        if (!m) return;
        window.mesoneroEditandoId = id;
        const mt = document.getElementById('mesoneroModalTitle');
        if (mt) mt.textContent = 'Editar Mesonero';
        const ni = document.getElementById('mesoneroNombre'); if (ni) ni.value = m.nombre || '';
        const as = document.getElementById('mesoneroActivo'); if (as) as.value = m.activo ? 'true' : 'false';
        if (m.foto) {
            const ui = document.getElementById('mesoneroFotoUrl'); if (ui) ui.value = m.foto;
            const pi = document.getElementById('mesoneroPreviewImg'); if (pi) pi.src = m.foto;
            const pd = document.getElementById('mesoneroFotoPreview'); if (pd) pd.style.display = 'flex';
            currentMesoneroFotoUrl = m.foto;
        } else {
            const ui = document.getElementById('mesoneroFotoUrl'); if (ui) ui.value = '';
            const pd = document.getElementById('mesoneroFotoPreview'); if (pd) pd.style.display = 'none';
            currentMesoneroFotoUrl = '';
        }
        const modal = document.getElementById('mesoneroModal');
        if (modal) modal.classList.add('active');
    };

    window.toggleMesoneroActivo = async function(id, activo) {
        try {
            await window.supabaseClient.from('mesoneros').update({ activo }).eq('id', id);
            await window.cargarMesoneros();
            window.mostrarToast('Estado actualizado', 'success');
        } catch(e) { 
            console.error('Error toggle mesonero:', e); 
            window.mostrarToast('Error al actualizar estado', 'error');
        }
    };

    window.eliminarMesonero = async function(id) {
        const m = (window.mesoneros || []).find(x => x.id === id);
        if (!m) return;
        window.mostrarConfirmacionPremium(
            'Eliminar Mesonero',
            'Eliminar al mesonero "' + m.nombre + '"? Esta acción no se puede deshacer.',
            async function() {
                try {
                    await window.supabaseClient.from('mesoneros').delete().eq('id', id);
                    await window.cargarMesoneros();
                    window.mostrarToast('Mesonero eliminado', 'success');
                } catch(e) { 
                    window.mostrarToast('Error: ' + (e.message || e), 'error'); 
                }
            }
        );
    };

    window.agregarMesonero = async function() {
        const inp = document.getElementById('nuevoMesonero');
        const nombre = inp ? inp.value.trim() : '';
        if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
        const btn = document.querySelector('[onclick="window.agregarMesonero()"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        try {
            const { error } = await window.supabaseClient.from('mesoneros')
                .insert([{ id: window.generarId('mes_'), nombre, activo: true }]);
            if (error) throw error;
            if (inp) inp.value = '';
            await window.cargarMesoneros();
            window.mostrarToast('Mesonero agregado', 'success');
        } catch(e) {
            window.mostrarToast('Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Agregar'; }
        }
    };

    // ════════════════════════════════════════
    // CALCULAR ACUMULADO PENDIENTE POR MESONERO
    // ════════════════════════════════════════
    async function calcularAcumuladoPendiente(mesoneroId) {
        const { data, error } = await window.supabaseClient
            .from('propinas')
            .select('monto_bs')
            .eq('mesonero_id', mesoneroId)
            .eq('entregado', false);
        
        if (error) {
            console.error('Error calculando acumulado:', error);
            return 0;
        }
        
        let total = 0;
        (data || []).forEach(function(p) {
            total += (p.monto_bs || 0);
        });
        return total;
    }

    // ════════════════════════════════════════
    // MODAL DE PAGO (TOTAL O PARCIAL)
    // ════════════════════════════════════════
    window.abrirModalPago = async function(mesoneroId) {
        mesoneroParaPagoId = mesoneroId;
        const m = (window.mesoneros || []).find(x => x.id === mesoneroId);
        if (!m) return;

        const acumulado = await calcularAcumuladoPendiente(mesoneroId);
        const tasa = Number(window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400) || 400;
        const usd = tasa > 0 ? acumulado / tasa : 0;

        const modalContent = document.getElementById('pagoModalContent');
        if (!modalContent) return;

        modalContent.innerHTML = ''
            + '<div style="padding:1.5rem">'
            +   '<div style="text-align:center;margin-bottom:1.5rem">'
            +     '<div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,var(--propina),#7B1FA2);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">'
            +       '<i class="fas fa-hand-holding-heart" style="font-size:2rem;color:#fff"></i>'
            +     '</div>'
            +     '<h3 style="font-size:1.1rem;font-weight:700;margin-bottom:.5rem">Registrar Pago a ' + m.nombre + '</h3>'
            +     '<p style="color:var(--text-muted);font-size:.85rem">Monto pendiente actual</p>'
            +     '<div id="pagoMontoPendiente" style="font-size:1.5rem;font-weight:700;color:var(--propina);margin-top:.5rem">'
            +       window.formatUSD(usd) + ' / ' + window.formatBs(acumulado)
            +     '</div>'
            +   '</div>'
            +   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">'
            +     '<button id="btnPagoTotal" class="btn-primary" style="width:100%;padding:.75rem 1rem;font-weight:600" onclick="window.confirmarPagoTotal()">'
            +       '<i class="fas fa-check-double"></i> Pago Total'
            +     '</button>'
            +     '<button id="btnPagoParcialToggle" class="btn-secondary" style="width:100%;padding:.75rem 1rem;font-weight:600" onclick="window.togglePagoParcial()">'
            +       '<i class="fas fa-coins"></i> Pago Parcial'
            +     '</button>'
            +   '</div>'
            +   '<div id="pagoParcialSection" style="display:none;background:var(--secondary);padding:1rem;border-radius:8px;border:1px solid var(--border);margin-bottom:1.5rem">'
            +     '<label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:.5rem;color:var(--text-muted)">Monto a pagar (BS)</label>'
            +     '<input type="number" id="pagoParcialMonto" step="0.01" min="0.01" max="' + acumulado + '" style="width:100%;padding:.75rem;border:1px solid var(--border);border-radius:8px;font-size:1rem;font-family:Montserrat,sans-serif" placeholder="Ej: 50.00">'
            +     '<p style="font-size:.75rem;color:var(--text-muted);margin-top:.5rem"><i class="fas fa-info-circle"></i> El monto restante permanecerá como pendiente</p>'
            +   '</div>'
            +   '<div style="display:flex;gap:.75rem;justify-content:flex-end">'
            +     '<button class="btn-secondary" style="flex:1;padding:.75rem 1rem;font-weight:600" onclick="window.cerrarModalPago()">Cancelar</button>'
            +     '<button id="btnConfirmarPagoParcial" class="btn-success" style="flex:1;padding:.75rem 1rem;font-weight:600;display:none" onclick="window.confirmarPagoParcial()">'
            +       '<i class="fas fa-check"></i> Confirmar'
            +     '</button>'
            +   '</div>'
            + '</div>';

        const modal = document.getElementById('pagoModal');
        if (modal) modal.classList.add('active');
    };

    window.cerrarModalPago = function() {
        const modal = document.getElementById('pagoModal');
        if (modal) modal.classList.remove('active');
        mesoneroParaPagoId = null;
    };

    window.togglePagoParcial = function() {
        const section = document.getElementById('pagoParcialSection');
        const btnConfirmar = document.getElementById('btnConfirmarPagoParcial');
        const btnTotal = document.getElementById('btnPagoTotal');
        if (section && btnConfirmar && btnTotal) {
            const isHidden = section.style.display === 'none';
            section.style.display = isHidden ? 'block' : 'none';
            btnConfirmar.style.display = isHidden ? 'block' : 'none';
            btnTotal.style.opacity = isHidden ? '0.5' : '1';
            btnTotal.style.pointerEvents = isHidden ? 'none' : 'auto';
            if (isHidden) {
                document.getElementById('pagoParcialMonto')?.focus();
            }
        }
    };

    window.confirmarPagoTotal = async function() {
        if (!mesoneroParaPagoId) return;
        const btn = document.getElementById('btnPagoTotal');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        }
        try {
            // Marcar todas las propinas pendientes como entregadas (sin fecha_entrega)
            const { error } = await window.supabaseClient
                .from('propinas')
                .update({ entregado: true })
                .eq('mesonero_id', mesoneroParaPagoId)
                .eq('entregado', false);
            if (error) throw error;
            
            window.cerrarModalPago();
            // Refrescar acumulados y tabla de propinas
            await window.actualizarAcumuladosPendientes();
            // Forzar recarga explícita de la tabla de propinas
            await window.cargarPropinas();
            window.renderizarPropinas();
            window.mostrarToast('Pago total registrado', 'success');
        } catch(e) {
            console.error('Error pago total:', e);
            window.mostrarToast('Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-double"></i> Pago Total';
            }
        }
    };

    window.confirmarPagoParcial = async function() {
        if (!mesoneroParaPagoId) return;
        const input = document.getElementById('pagoParcialMonto');
        const monto = input ? parseFloat(input.value) : 0;
        
        if (!monto || monto <= 0) {
            window.mostrarToast('Ingresa un monto válido', 'error');
            return;
        }

        const acumulado = await calcularAcumuladoPendiente(mesoneroParaPagoId);
        if (monto > acumulado) {
            window.mostrarToast('El monto no puede superar el pendiente (' + window.formatBs(acumulado) + ')', 'error');
            return;
        }

        const btn = document.getElementById('btnConfirmarPagoParcial');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        }

        try {
            // 1. Obtener propinas pendientes en orden FIFO
            const { data: pendientes, error: errConsulta } = await window.supabaseClient
                .from('propinas')
                .select('id, monto_bs, mesa, metodo, monto_original, moneda_original, tasa_aplicada, referencia, cajero, fecha')
                .eq('mesonero_id', mesoneroParaPagoId)
                .eq('entregado', false)
                .order('fecha', { ascending: true });

            if (errConsulta) throw errConsulta;

            let restoPorPagar = monto;
            let pagoCompletado = false;

            for (const prop of pendientes || []) {
                if (restoPorPagar <= 0) break;
                
                const montoPropina = prop.monto_bs;
                if (restoPorPagar >= montoPropina) {
                    // Caso 1: Pagar la propina completa
                    const { error: errUpd } = await window.supabaseClient
                        .from('propinas')
                        .update({ entregado: true })
                        .eq('id', prop.id);
                    if (errUpd) throw errUpd;
                    restoPorPagar -= montoPropina;
                } else {
                    // Caso 2: Pago parcial sobre esta propina
                    const montoPagado = restoPorPagar;
                    const montoRestante = montoPropina - montoPagado;
                    
                    // 2a. Reducir la propina original al monto restante (sigue pendiente)
                    const { error: errUpdate } = await window.supabaseClient
                        .from('propinas')
                        .update({ monto_bs: montoRestante })
                        .eq('id', prop.id);
                    if (errUpdate) throw errUpdate;
                    
                    // 2b. Crear un NUEVO REGISTRO en la tabla 'propinas' con el monto pagado y marcado como entregado
                    const cajeroNombre = (window.usuarioActual && window.usuarioActual.nombre) || 'Administrador';
                    const ahora = new Date().toISOString();
                    
                    // Calcular monto_original proporcional si existe
                    let nuevoMontoOriginal = 0;
                    if (prop.monto_original && prop.monto_original > 0) {
                        nuevoMontoOriginal = (prop.monto_original * montoPagado) / montoPropina;
                    }
                    
                    const nuevaPropina = {
                        mesonero_id: mesoneroParaPagoId,
                        mesa: prop.mesa || 'General',
                        metodo: prop.metodo,
                        monto_original: parseFloat(nuevoMontoOriginal.toFixed(2)),
                        moneda_original: prop.moneda_original || 'Bs',
                        tasa_aplicada: prop.tasa_aplicada || null,
                        monto_bs: parseFloat(montoPagado.toFixed(2)),
                        referencia: prop.referencia || null,
                        cajero: cajeroNombre,
                        fecha: ahora,
                        entregado: true   // Importante: esta porción ya está pagada
                    };
                    
                    const { error: errInsert } = await window.supabaseClient
                        .from('propinas')
                        .insert([nuevaPropina]);
                    if (errInsert) throw errInsert;
                    
                    restoPorPagar = 0;
                    pagoCompletado = true;
                    break;
                }
            }

            // Si después del bucle aún queda resto por pagar (por error lógico), abortar
            if (restoPorPagar > 0) {
                throw new Error('No se pudo cubrir el monto total. Verifique los datos.');
            }

            window.cerrarModalPago();
            await window.actualizarAcumuladosPendientes();
            await window.cargarPropinas();
            window.renderizarPropinas();
            window.mostrarToast('Pago parcial registrado: ' + window.formatBs(monto), 'success');
            
        } catch(e) {
            console.error('Error pago parcial:', e);
            let msg = e.message || e;
            if (e.details) msg += ' - ' + e.details;
            if (e.hint) msg += ' (Sugerencia: ' + e.hint + ')';
            window.mostrarToast('Error: ' + msg, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Confirmar';
            }
        }
    };

    // ════════════════════════════════════════
    // PROPINAS — cargar + renderizar + historial
    // ════════════════════════════════════════
    window.cargarPropinas = async function() {
        try {
            const h = new Date(); h.setHours(0,0,0,0);
            const m = new Date(h); m.setDate(m.getDate()+1);
            const { data, error } = await window.supabaseClient
                .from('propinas').select('*, mesoneros(nombre)')
                .gte('fecha', h.toISOString()).lt('fecha', m.toISOString())
                .order('fecha', { ascending: false });
            if (error) throw error;
            window.propinas = data || [];
            window.renderizarPropinas();
        } catch(e) { 
            console.error('Error cargando propinas:', e); 
        }
    };

    window.renderizarPropinas = function() {
        const propinas = window.propinas || [];
        const total    = propinas.reduce(function(s,p){ return s+(p.monto_bs||0); }, 0);
        const cantidad = propinas.length;
        const promedio = cantidad > 0 ? total/cantidad : 0;
        const tasa     = Number(window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400) || 400;
        const totalUsd = tasa > 0 ? total / tasa : 0;
        const promUsd  = tasa > 0 ? promedio / tasa : 0;
        var el;
        el = document.getElementById('propinasTotal');    if(el) el.textContent = window.formatUSD(totalUsd) + ' / ' + window.formatBs(total);
        el = document.getElementById('propinasCantidad'); if(el) el.textContent = String(cantidad);
        el = document.getElementById('propinasPromedio'); if(el) el.textContent = window.formatUSD(promUsd) + ' / ' + window.formatBs(promedio);
        el = document.getElementById('propinasHoyDashboard'); if(el) el.textContent = window.formatUSD(totalUsd) + ' / ' + window.formatBs(total);
        const tbody = document.getElementById('propinasTableBody');
        if (tbody) {
            const ultimas5 = propinas.slice(0, 5);
            if (ultimas5.length) {
                tbody.innerHTML = ultimas5.map(function(p) {
                    var hora = new Date(p.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                    return '<tr><td>' + hora + '</td><td>' + (p.mesoneros ? p.mesoneros.nombre : 'N/A') + '</td><td>' + (p.mesa||'N/A') + '</td><td>' + (p.metodo||'N/A') + '</td><td>' + window.formatBs(p.monto_bs) + '</td><td>' + (p.cajero||'N/A') + '</td></tr>';
                }).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-muted)">Sin propinas hoy</td></tr>';
            }
        }
    };

    window.verHistorialPropinaHoy = async function() {
        try {
            const h   = new Date(); h.setHours(0,0,0,0);
            const m   = new Date(h); m.setDate(m.getDate()+1);
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const { data, error } = await window.supabaseClient
                .from('propinas').select('*, mesoneros(nombre)')
                .gte('fecha', h.toISOString()).lt('fecha', m.toISOString())
                .order('fecha', { ascending: false });
            if (error) throw error;
            const lista  = data || [];
            const totBs  = lista.reduce(function(s,p){ return s+(p.monto_bs||0); }, 0);
            const totUsd = tasa > 0 ? totBs/tasa : 0;
            const rows = lista.map(function(p) {
                var mUsd = tasa > 0 ? (p.monto_bs||0)/tasa : 0;
                var hora = new Date(p.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                return '<tr>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">' + hora + '</td>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">' + (p.mesoneros ? p.mesoneros.nombre : 'N/A') + '</td>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">' + (p.mesa||'N/A') + '</td>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem">' + (p.metodo||'N/A') + '</td>'
                    + '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:var(--propina)">' + window.formatUSD(mUsd) + ' | ' + window.formatBs(p.monto_bs||0) + '</td>'
                    + '</tr>';
            }).join('');
            var pl = lista.length;
            var totLine = pl + ' propina' + (pl!==1?'s':'') + ' · Total: ' + window.formatUSD(totUsd) + ' | ' + window.formatBs(totBs);
            var emptyRow = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sin propinas hoy</td></tr>';
            var ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
            ov.innerHTML = '<div style="background:var(--card-bg);border-radius:16px;max-width:680px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.4)">'
                + '<div style="background:linear-gradient(135deg,var(--propina),#7B1FA2);padding:1rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center">'
                +   '<div><div style="font-weight:700;font-size:1rem"><i class="fas fa-hand-holding-heart"></i> Historial de Propinas — Hoy</div>'
                +   '<div style="font-size:.75rem;opacity:.8;margin-top:2px">' + totLine + '</div></div>'
                +   '<button onclick="this.closest(\'[style*=position]\').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:1rem;font-weight:700;display:flex;align-items:center;justify-content:center">&#x2715;</button>'
                + '</div>'
                + '<div style="overflow-y:auto;flex:1"><table style="width:100%;border-collapse:collapse">'
                + '<thead><tr style="background:var(--secondary)">'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Hora</th>'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Mesonero</th>'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Mesa</th>'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Método</th>'
                + '<th style="padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Monto</th>'
                + '</tr></thead>'
                + '<tbody>' + (rows || emptyRow) + '</tbody></table></div>'
                + '<div style="padding:.85rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">'
                + '<button onclick="this.closest(\'[style*=position]\').remove()" style="background:var(--primary);color:#fff;border:none;padding:.55rem 1.25rem;border-radius:8px;cursor:pointer;font-family:Montserrat,sans-serif;font-weight:600;font-size:.85rem">Cerrar</button>'
                + '</div></div>';
            ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
            document.body.appendChild(ov);
        } catch(e) {
            console.error('Error historial propinas:', e);
            window.mostrarToast('Error al cargar historial', 'error');
        }
    };

    // ════════════════════════════════════════
    // FOTO MESONERO
    // ════════════════════════════════════════
    function handleMesoneroFotoFile() {
        var fi=document.getElementById('mesoneroFoto');
        var ui=document.getElementById('mesoneroFotoUrl');
        var pd=document.getElementById('mesoneroFotoPreview');
        var pi=document.getElementById('mesoneroPreviewImg');
        var rb=document.getElementById('mesoneroFotoRemoveBtn');
        if (!fi||!pd) return;
        if (fi.files && fi.files[0]) {
            currentMesoneroFotoFile=fi.files[0]; currentMesoneroFotoUrl='';
            if(ui){ui.value='';ui.disabled=true;}
            var reader=new FileReader();
            reader.onload=function(e){if(pi)pi.src=e.target.result;pd.style.display='flex';if(rb)rb.style.display='flex';};
            reader.readAsDataURL(fi.files[0]);
        } else { if(ui)ui.disabled=false; }
    }
    function handleMesoneroFotoUrl() {
        var ui=document.getElementById('mesoneroFotoUrl');
        var fi=document.getElementById('mesoneroFoto');
        var pd=document.getElementById('mesoneroFotoPreview');
        var pi=document.getElementById('mesoneroPreviewImg');
        var rb=document.getElementById('mesoneroFotoRemoveBtn');
        if(!ui||!pd) return;
        if(fi&&fi.files&&fi.files[0]) return;
        var url=ui.value.trim();
        if(url){currentMesoneroFotoUrl=url;currentMesoneroFotoFile=null;if(pi)pi.src=url;pd.style.display='flex';if(rb)rb.style.display='flex';}
        else{pd.style.display='none';if(rb)rb.style.display='none';if(pi)pi.src='';currentMesoneroFotoUrl='';}
    }
    function removeMesoneroFoto() {
        var fi=document.getElementById('mesoneroFoto');
        var ui=document.getElementById('mesoneroFotoUrl');
        var pd=document.getElementById('mesoneroFotoPreview');
        var pi=document.getElementById('mesoneroPreviewImg');
        var rb=document.getElementById('mesoneroFotoRemoveBtn');
        if(fi)fi.value=''; if(ui){ui.value='';ui.disabled=false;}
        if(pd)pd.style.display='none'; if(rb)rb.style.display='none';
        if(pi)pi.src=''; currentMesoneroFotoFile=null; currentMesoneroFotoUrl='';
    }

    // ════════════════════════════════════════
    // GUARDAR MESONERO
    // ════════════════════════════════════════
    var saveMesoneroBtn = document.getElementById('saveMesonero');
    if (saveMesoneroBtn) {
        saveMesoneroBtn.addEventListener('click', async function() {
            if (this.disabled) return;
            var id     = window.mesoneroEditandoId;
            var nombre = (document.getElementById('mesoneroNombre')||{}).value;
            if (nombre) nombre = nombre.trim();
            var activoEl = document.getElementById('mesoneroActivo');
            var activo = activoEl ? activoEl.value === 'true' : true;
            if (!nombre) { window.mostrarToast('Ingresa un nombre', 'error'); return; }
            var fotoUrl = '';
            var archivoFoto = (document.getElementById('mesoneroFoto')||{files:[]}).files[0];
            var fotoUrlInput = ((document.getElementById('mesoneroFotoUrl')||{}).value)||'';
            if (archivoFoto) {
                var res = await window.subirImagenPlatillo(archivoFoto, 'mesoneros');
                if (res.success) fotoUrl = res.url;
                else { window.mostrarToast('Error al subir foto: '+res.error,'error'); return; }
            } else if (fotoUrlInput) { fotoUrl = fotoUrlInput; }
            try {
                this.disabled=true; this.innerHTML='<i class="fas fa-spinner fa-spin"></i>';
                var dataObj = { nombre: nombre, activo: activo, foto: fotoUrl || null };
                var err;
                if (id) {
                    var r1 = await window.supabaseClient.from('mesoneros').update(dataObj).eq('id', id);
                    err = r1.error;
                } else {
                    dataObj.id = window.generarId('mes_');
                    var r2 = await window.supabaseClient.from('mesoneros').insert([dataObj]);
                    err = r2.error;
                }
                if (err) throw err;
                window.cerrarModal('mesoneroModal');
                await window.cargarMesoneros();
                window.mostrarToast('Mesonero guardado', 'success');
            } catch(e) { window.mostrarToast('Error: '+e.message,'error'); }
            finally { this.disabled=false; this.innerHTML='Guardar'; }
        });
    }

    var closeBtn = document.getElementById('closeMesoneroModal');
    if (closeBtn) closeBtn.addEventListener('click', function(){ window.cerrarModal('mesoneroModal'); });
    var cancelBtn = document.getElementById('cancelMesoneroEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', function(){ window.cerrarModal('mesoneroModal'); });
    var fotoInput = document.getElementById('mesoneroFoto');
    if (fotoInput) fotoInput.addEventListener('change', handleMesoneroFotoFile);
    var fotoUrlInp = document.getElementById('mesoneroFotoUrl');
    if (fotoUrlInp) fotoUrlInp.addEventListener('input', handleMesoneroFotoUrl);
    var removeBtn = document.getElementById('mesoneroFotoRemoveBtn');
    if (removeBtn) removeBtn.addEventListener('click', removeMesoneroFoto);

    // Inicializar al cargar el módulo
    if (window.supabaseClient) {
        window.cargarMesoneros();
    }
})();
