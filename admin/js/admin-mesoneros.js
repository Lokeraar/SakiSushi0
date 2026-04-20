// admin-mesoneros.js — Gestión de Mesoneros y Propinas con Realtime
(function() {
    'Use strict';

    // Variables globales de estado
    let currentMesoneroFotoFile = null;
    let currentMesoneroFotoUrl  = '';
    let mesoneroparapagoid      = null;

    // ════════════════════════════════════════
    // actualizar acumulados pendientes
    // ════════════════════════════════════════
    window.actualizaracumuladospendientes = async function() {
        try {
            // consulta todas las propinas pendientes (sin filtrar fecha)
            const { data, error } = await window.supabaseClient
                .from('propinas')
                .select('mesonero_id, monto_bs, moneda_original, monto_original')
                .eq('entregado', false);

            if (error) throw error;

            // sumar monto_bs por mesonero_id, separando usd y bs
            const acumuladobs = {};
            const acumuladousdcrudo = {}; // monto original en usd
            const tasabase = number(window.configglobal?.tasa_cambio || 400);
            
            (data || []).forEach(function(p) {
                const mid = p.mesonero_id;
                if (p.moneda_original === 'USD' && p.monto_original) {
                    acumuladousdcrudo[mid] = (acumuladousdcrudo[mid] || 0) + p.monto_original;
                } else {
                    acumuladobs[mid] = (acumuladobs[mid] || 0) + (p.monto_bs || 0);
                }
            });

            // actualizar en dom: selector [data-mesonero-id] → elemento .mesonero-pendiente
            const tarjetas = document.querySelectorAll('[data-mesonero-id]');
            tarjetas.forEach(function(card) {
                const mesoneroid = card.getattribute('data-mesonero-id');
                const pendienteel = card.querySelector('.mesonero-pendiente');
                
                const tasaefectiva = number(window.configglobal?.tasa_efectiva || window.configglobal?.tasa_cambio || 400);
                const tasabaseactual = number(window.configglobal?.tasa_cambio || 400);
                const usdcrudo = acumuladousdcrudo[mesoneroid] || 0;
                const bstotal = acumuladobs[mesoneroid] || 0;
                const usdenbs = usdcrudo * tasabaseactual;
                const pendientetotal = bstotal + usdenbs;
                const usdtotal = tasaefectiva > 0 ? pendientetotal / tasaefectiva : 0;

                if (pendienteel) {
                    let htmlpendiente = '<span style="Font-size:.75rem;color:var(--text-muted);margin-right:.35rem">Pendiente:</span>' + '<span style="Font-weight:700;color:var(--propina)">' + window.formatusd(usdtotal) + ' / ' + window.formatbs(pendientetotal) + '</span>';
                    
                    if (usdcrudo > 0) {
                        htmlpendiente += '<div style="Font-size:.7rem;color:var(--usd-color);margin-top:2px">' + '<i class="Fas fa-dollar-sign"></i> ' + usdcrudo.toFixed(2) + ' / ' + window.formatbs(usdenbs) + '</div>';
                    }
                    if (bstotal > 0) {
                        htmlpendiente += '<div style="Font-size:.7rem;color:var(--bs-color);margin-top:2px">' + 'Bs: ' + window.formatbs(bstotal) + '</div>';
                    }
                    pendienteel.innerHTML = htmlpendiente;

                    if (pendientetotal > 0) {
                        pendienteel.style.color = 'var(--propina)';
                        pendienteel.style.fontweight = '700';
                    } else {
                        pendienteel.style.color = 'var(--success)';
                        pendienteel.style.fontweight = '600';
                    }
                }

                // actualizar botón pagado
                const btnpagado = card.querySelector('.btn-pagado-mesonero');
                if (btnpagado) {
                    btnpagado.disabled = pendientetotal <= 0;
                    btnpagado.style.opacity = pendientetotal <= 0 ? '0.5' : '1';
                    btnpagado.style.cursor = pendientetotal <= 0 ? 'not-allowed' : 'pointer';
                }
            });

            // llamar a cargarpropinas para actualizar totales generales
            await window.cargarpropinas();
        } catch (e) {
            console.error('Error actualizando acumulados:', e);
        }
    };

    // ════════════════════════════════════════
    // inicialización de realtime
    // ════════════════════════════════════════
    function iniciarrealtimepropinas() {
        // limpiar canal previo si existe
        if (window.propinaschannel) {
            window.supabaseClient.removeChannel(window.propinaschannel);
        }

        // crear nuevo canal para cambios en propinas
        window.propinaschannel = window.supabaseClient.channel('propinas-mesoneros-realtime')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'propinas' },
                async function(payload) {
                    console.log('Cambio en propinas:', payload);
                    // actualizar acumulados inmediatamente sin delay
                    window.actualizaracumuladospendientes();
                }
            )
            .subscribe();
    }

    // ════════════════════════════════════════
    // cargar / renderizar mesoneros
    // ════════════════════════════════════════
    window.cargarmesoneros = async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('mesoneros').select('*').order('nombre');
            if (error) throw error;
            window.mesoneros = data || [];
            await renderizarmesonerosconacumulados();
            await cargarpropinas();
            iniciarrealtimepropinas();
        } catch(e) { 
            console.error('Error cargando mesoneros:', e); 
            window.mostrartoast('Error al cargar mesoneros', 'error');
        }
    };

    async function renderizarmesonerosconacumulados() {
        const container = document.getElementById('mesonerosList');
        if (!container) return;
        
        const mesoneros = window.mesoneros || [];
        if (!mesoneros.length) {
            container.innerHTML = '<p style="Color:var(--text-muted);font-size:.88rem;text-align:center;padding:2rem">No hay mesoneros registrados.</p>';
            return;
        }

        const sorted = [...mesoneros].sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        let html = '';
        for (const m of sorted) {
            const inicial = m.nombre.charAt(0).toUpperCase();
            const avatar = m.foto
                ? '<div class="Ucard-avatar"><img src="' + m.foto + '" Style="width:100%;height:100%;object-fit:cover;border-radius:8px;cursor:pointer" Onclick="window.expandirImagen(this.src)"></div>': '<div class="Ucard-avatar"><div style="Width:100%;height:100%;font-size:1.4rem;border-radius:8px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--propina),#7b1fa2);color:#fff">' + inicial + '</div></div>';
            
            const badge = m.activo
                ? '<span class="Ucard-status-inline" style="Color:var(--success);margin-left:auto"><i class="Fas fa-check-circle"></i> ACTIVO</span>': '<span class="Ucard-status-inline" style="Color:var(--text-muted);margin-left:auto"><i class="Fas fa-circle"></i> INACTIVO</span>';
            
            const toggleclass = m.activo ? 'btn-toggle-on' : 'btn-toggle-off';
            const toggletxt   = m.activo ? 'Inhabilitar' : 'Activar';
            const toggleval   = String(!m.activo);

            html += '<div class="Card-standard mesonero-card" data-mesonero-id="' + m.id + '" Id="mesonero-card-' + m.id + '" Style="border-left-color:var(--propina)">'+ avatar
                + '<div class="Ucard-body">'+ '<div class="Ucard-top">'+ '<div class="Ucard-names">'+ '<div class="Ucard-line1"><span class="Mesonero-nombre">' + m.nombre + '</span>' + badge + '</div>'+ '<div class="Ucard-line2" style="Margin-top:.35rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">'+ '<span class="Mesonero-pendiente" style="Font-size:.9rem;font-weight:600">Calculando...</span>'+ '</div>'+ '<div class="Ucard-line3" style="Margin-top:.5rem;display:flex;align-items:center;gap:.4rem">'+ '<button class="Btn-primary btn-pagado-mesonero" style="Font-size:.7rem;padding:.3rem .5rem" onclick="window.abrirModalPago(\'' + m.id + '\')" Title="Registrar pago">'+ '<i class="Fas fa-hand-holding-usd"></i> Pagar'+ '</button>'+ '<button class="btn-toggle ' + toggleclass + '" Style="font-size:.7rem;padding:.3rem .5rem" Onclick="window.toggleMesoneroActivo(\'' + m.id + '\',' + toggleVal + ')">' + toggletxt + '</button>'+ '<div class="Ucard-actions-right">'+ '<button class="Btn-icon edit" onclick="window.editarMesonero(\'' + m.id + '\')" Title="Editar"><i class="fas fa-edit"></i></button>'+ '<button class="Btn-icon delete" onclick="window.eliminarMesonero(\'' + m.id + '\')" Title="Eliminar"><i class="fas fa-trash"></i></button>'+ '</div>'+ '</div>'+ '</div>'+ '</div>'+ '</div>'+ '</div>';
        }
        container.innerHTML = html;

        // actualizar acumulados pendientes usando await para esperar la consulta
        await window.actualizaracumuladospendientes();
    }

    // ════════════════════════════════════════
    // gestión de mesoneros (crud)
    // ════════════════════════════════════════
    window.editarmesonero = function(id) {
        const m = (window.mesoneros || []).find(x => x.id === id);
        if (!m) return;
        window.mesoneroeditandoid = id;
        const mt = document.getElementById('mesoneroModalTitle');
        if (mt) mt.textContent = 'Editar Mesonero';
        const ni = document.getElementById('mesoneroNombre'); if (ni) ni.value = m.nombre || '';
        const as = document.getElementById('mesoneroActivo'); if (as) as.value = m.activo ? 'true' : 'false';
        if (m.foto) {
            const ui = document.getElementById('mesoneroFotoUrl'); if (ui) ui.value = m.foto;
            const pi = document.getElementById('mesoneroPreviewImg'); if (pi) pi.src = m.foto;
            const pd = document.getElementById('mesoneroFotoPreview'); if (pd) pd.style.display = 'flex';
            currentmesonerofotourl = m.foto;
        } else {
            const ui = document.getElementById('mesoneroFotoUrl'); if (ui) ui.value = '';
            const pd = document.getElementById('mesoneroFotoPreview'); if (pd) pd.style.display = 'none';
            currentmesonerofotourl = '';
        }
        const modal = document.getElementById('mesoneroModal');
        if (modal) modal.classList.add('active');
    };

    window.togglemesoneroactivo = async function(id, activo) {
        try {
            await window.supabaseClient.from('mesoneros').update({ activo }).eq('id', id);
            await window.cargarmesoneros();
            window.mostrartoast('Estado actualizado', 'success');
        } catch(e) { 
            console.error('Error toggle mesonero:', e); 
            window.mostrartoast('Error al actualizar estado', 'error');
        }
    };

    window.eliminarmesonero = async function(id) {
        const m = (window.mesoneros || []).find(x => x.id === id);
        if (!m) return;
        window.mostrarconfirmacionpremium( 'Eliminar Mesonero', 'Eliminar al mesonero "' + m.nombre + '"? Esta acción no se puede deshacer.',
            async function() {
                try {
                    await window.supabaseClient.from('mesoneros').delete().eq('id', id);
                    await window.cargarmesoneros();
                    window.mostrartoast('Mesonero eliminado', 'success');
                } catch(e) { 
                    window.mostrartoast('Error: ' + (e.message || e), 'error'); 
                }
            }
        );
    };

    window.agregarmesonero = async function() {
        const inp = document.getElementById('nuevoMesonero');
        const nombre = inp ? inp.value.trim() : '';
        if (!nombre) { window.mostrartoast('Ingresa un nombre', 'error'); return; }
        const btn = document.querySelector('[onclick="window.agregarmesonero()"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="Fas fa-spinner fa-spin"></i>'; }
        try {
            const { error } = await window.supabaseClient.from('mesoneros')
                .insert([{ id: window.generarid('mes_'), nombre, activo: true }]);
            if (error) throw error;
            if (inp) inp.value = '';
            await window.cargarmesoneros();
            window.mostrartoast('Mesonero agregado', 'success');
        } catch(e) {
            window.mostrartoast('Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="Fas fa-plus"></i> Agregar'; }
        }
    };

    // ════════════════════════════════════════
    // calcular acumulado pendiente por mesonero
    // ════════════════════════════════════════
    async function calcularacumuladopendiente(mesoneroid) {
        const { data, error } = await window.supabaseClient
            .from('propinas')
            .select('monto_bs, monto_original, moneda_original')
            .eq('mesonero_id', mesoneroid)
            .eq('entregado', false);
        
        if (error) {
            console.error('Error calculando acumulado:', error);
            return 0;
        }
        
        let totalbs = 0;
        let totalusdcrudo = 0;
        const tasabase = number(window.configglobal?.tasa_cambio || 400);
        
        (data || []).forEach(function(p) {
            if (p.moneda_original === 'USD' && p.monto_original) {
                totalusdcrudo += p.monto_original;
            } else {
                totalbs += (p.monto_bs || 0);
            }
        });
        
        // retornar el total en bs (usd convertido a tasa base)
        return totalbs + (totalusdcrudo * tasabase);
    }

    // ════════════════════════════════════════
    // modal de pago (total o parcial)
    // ════════════════════════════════════════
    window.abrirmodalpago = async function(mesoneroid) {
        mesoneroparapagoid = mesoneroid;
        const m = (window.mesoneros || []).find(x => x.id === mesoneroid);
        if (!m) return;

        const acumulado = await calcularacumuladopendiente(mesoneroid);
        const tasa = number(window.configglobal?.tasa_efectiva || window.configglobal?.tasa_cambio || 400) || 400;
        const usd = tasa > 0 ? acumulado / tasa : 0;

        const modalcontent = document.getElementById('pagoModalContent');
        if (!modalcontent) return;

        modalcontent.innerHTML = ''+ '<div style="Padding:1.5rem">'+ '<div style="Text-align:center;margin-bottom:1.5rem">'+ '<div style="Width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,var(--propina),#7b1fa2);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">'+ '<i class="Fas fa-hand-holding-heart" style="Font-size:2rem;color:#fff"></i>'+ '</div>'+ '<h3 style="Font-size:1.1rem;font-weight:700;margin-bottom:.5rem">Registrar Pago a ' + m.nombre + '</h3>'+ '<p style="Color:var(--text-muted);font-size:.85rem">El monto acumulado actual equivale a:</p>'+ '<div id="Pagomontopendiente" style="Font-size:1.5rem;font-weight:700;color:var(--propina);margin-top:.5rem">'+       window.formatusd(usd) + ' / ' + window.formatbs(acumulado)
            + '</div>'+ '</div>'+ '<div class="Form-group" style="Margin-bottom:1rem;text-align:left">'+ '<label style="Display:block;font-size:.85rem;font-weight:600;margin-bottom:.5rem">Método de pago al mesonero</label>'+ '<select id="Pagometodo" class="Tcb-input" style="Width:100%;padding:.6rem;border-radius:8px;border:1px solid var(--border);background:var(--card-bg);color:var(--text)" onchange="window.actualizarlabelmontopago()">'+ '<option value="efectivo_bs">Efectivo Bs</option>'+ '<option value="efectivo_usd">Efectivo USD</option>'+ '<option value="pago_movil">Pago Móvil</option>'+ '<option value="punto_venta">Punto de Venta</option>'+ '</select>'+ '</div>'+ '<div style="Display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">'+ '<button id="Btnpagototal" class="Btn-primary" style="Width:100%;padding:.75rem 1rem;font-weight:600" onclick="window.confirmarpagototal()">'+ '<i class="Fas fa-check-double"></i> Pago Total'+ '</button>'+ '<button id="Btnpagoparcialtoggle" class="Btn-secondary" style="Width:100%;padding:.75rem 1rem;font-weight:600" onclick="window.togglepagoparcial()">'+ '<i class="Fas fa-coins"></i> Pago Parcial'+ '</button>'+ '</div>'+ '<div id="Pagoparcialsection" style="Display:none;background:var(--secondary);padding:1rem;border-radius:8px;border:1px solid var(--border);margin-bottom:1.5rem">'+ '<label id="Pagoparciallabel" style="Display:block;font-size:.85rem;font-weight:600;margin-bottom:.5rem;color:var(--text-muted)">Monto a pagar (BS)</label>'+ '<input type="Number" id="Pagoparcialmonto" step="0.01" min="0.01" max="' + acumulado + '" Style="width:100%;padding:.75rem;border:1px solid var(--border);border-radius:8px;font-size:1rem;font-family:Montserrat,sans-serif" Placeholder="Ej: 50.00" Oninput="window.actualizarVistaPreviaPago()">'+ '<p style="Font-size:.75rem;color:var(--text-muted);margin-top:.5rem"><i class="Fas fa-info-circle"></i> El monto restante permanecerá como pendiente</p>'+ '<div id="Pagopreviewsection" style="Display:none"></div>'+ '</div>'+ '<div style="Display:flex;gap:.75rem;justify-content:flex-end">'+ '<button class="Btn-secondary" style="Flex:1;padding:.75rem 1rem;font-weight:600" onclick="window.cerrarmodalpago()">Cancelar</button>'+ '<button id="Btnconfirmarpagoparcial" class="Btn-success" style="Flex:1;padding:.75rem 1rem;font-weight:600;display:none" onclick="window.confirmarpagoparcial()">'+ '<i class="Fas fa-check"></i> Confirmar'+ '</button>'+ '</div>'+ '</div>';

        const modal = document.getElementById('pagoModal');
        if (modal) modal.classList.add('active');
        
        // inicializar label correcto inmediatamente sin settimeout
        window.actualizarlabelmontopago();
    };

    window.cerrarmodalpago = function() {
        const modal = document.getElementById('pagoModal');
        if (modal) modal.classList.remove('active');
        // limpiar la vista previa al cerrar
        const previewel = document.getElementById('pagoPreviewSection');
        if (previewel) {
            previewel.innerHTML = '';
            previewel.style.display = 'none';
        }
        mesoneroparapagoid = null;
    };

    // actualizar label del monto según método seleccionado
    window.actualizarlabelmontopago = function() {
        const metodo = document.getElementById('pagoMetodo')?.value;
        const label = document.getElementById('pagoParcialLabel');
        const input = document.getElementById('pagoParcialMonto');
        
        if (!label || !input) return;
        
        if (metodo === 'efectivo_usd') {
            label.textContent = 'Monto a pagar ($)';
            // actualizar placeholder y step para dólares
            input.placeholder = 'Ej: 10.00';
            input.step = '0.01';
        } else {
            label.textContent = 'Monto a pagar (BS)';
            input.placeholder = 'Ej: 50.00';
            input.step = '0.01';
        }
        
        // actualizar vista previa en tiempo real
        window.actualizarvistapreviapago();
    };

    // actualizar vista previa del pago en tiempo real
    window.actualizarvistapreviapago = async function() {
        const metodo = document.getElementById('pagoMetodo')?.value;
        const input = document.getElementById('pagoParcialMonto');
        const previewel = document.getElementById('pagoPreviewSection');
        
        if (!input || !previewel) return;
        
        const montoingresado = parseFloat(input.value) || 0;
        if (montoingresado <= 0) {
            previewel.style.display = 'none';
            previewel.innerHTML = '';
            return;
        }
        
        const tasabase = number(window.configglobal?.tasa_cambio || 400);
        const tasaefectiva = number(window.configglobal?.tasa_efectiva || window.configglobal?.tasa_cambio || 400);
        
        let montoenbs = montoingresado;
        let esusd = false;
        
        if (metodo === 'efectivo_usd') {
            esusd = true;
            montoenbs = montoingresado * tasabase;
        }
        
        // obtener acumulado desglosado
        if (!mesoneroparapagoid) {
            previewel.style.display = 'none';
            previewel.innerHTML = '';
            return;
        }
        
        try {
            const { data: pendientes, error } = await window.supabaseClient
                .from('propinas')
                .select('monto_bs, monto_original, moneda_original')
                .eq('mesonero_id', mesoneroparapagoid)
                .eq('entregado', false);
            
            if (error) throw error;
            
            let acumuladousdcrudo = 0;
            let acumuladobscrudo = 0;
            
            (pendientes || []).forEach(function(p) {
                if (p.moneda_original === 'USD' && p.monto_original) {
                    acumuladousdcrudo += p.monto_original;
                } else {
                    acumuladobscrudo += (p.monto_bs || 0);
                }
            });
            
            const acumuladousdenbs = acumuladousdcrudo * tasabase;
            const acumuladototal = acumuladobscrudo + acumuladousdenbs;
            
            // calcular cómo se distribuye el pago (misma lógica que confirmarpagoparcial)
            let restoporpagar = montoenbs;
            let pagadodeusd = 0;
            let pagadodebs = 0;
            
            // primero descontar de usd
            if (restoporpagar > 0 && acumuladousdenbs > 0) {
                if (restoporpagar >= acumuladousdenbs) {
                    pagadodeusd = acumuladousdenbs;
                    restoporpagar -= acumuladousdenbs;
                } else {
                    pagadodeusd = restoporpagar;
                    restoporpagar = 0;
                }
            }
            
            // luego descontar de bs
            if (restoporpagar > 0 && acumuladobscrudo > 0) {
                if (restoporpagar >= acumuladobscrudo) {
                    pagadodebs = acumuladobscrudo;
                } else {
                    pagadodebs = restoporpagar;
                }
            }
            
            // construir mensaje de vista previa (sin repetir el encabezado principal)
            let htmlpreview = '<div style="Margin-top:1rem;padding:1rem;background:var(--secondary);border-radius:8px;border:1px solid var(--border)">';
            
            htmlpreview += '<div style="Font-size:.85rem;font-weight:600;margin-bottom:.5rem;color:var(--text)">';
            if (esusd) {
                htmlpreview += 'Pagando $' + montoingresado.toFixed(2) + ' (equiv. a ' + window.formatbs(montoenbs) + ')';
            } else {
                htmlpreview += 'Pagando Bs ' + window.formatbs(montoenbs);
            }
            htmlpreview += '</div>';
            
            if (pagadodeusd > 0) {
                const usdpagado = pagadodeusd / tasabase;
                htmlpreview += '<div style="Font-size:.75rem;color:var(--usd-color);margin-top:.25rem">';
                htmlpreview += '<i class="Fas fa-dollar-sign"></i> Descuento: ' + window.formatbs(pagadodeusd);
                if (esusd) htmlpreview += ' ($' + usdpagado.toFixed(2) + ')';
                htmlpreview += '</div>';
            }
            
            if (pagadodebs > 0) {
                htmlpreview += '<div style="Font-size:.75rem;color:var(--bs-color);margin-top:.25rem">';
                htmlpreview += 'Bs: Descuento: ' + window.formatbs(pagadodebs);
                htmlpreview += '</div>';
            }
            
            // mostrar nuevo pendiente
            const nuevopendiente = acumuladototal - montoenbs;
            if (nuevopendiente >= 0) {
                htmlpreview += '<div style="Font-size:.75rem;color:var(--text-muted);margin-top:.5rem;padding-top:.5rem;border-top:1px solid var(--border)">';
                htmlpreview += 'Nuevo pendiente: ' + window.formatbs(nuevopendiente);
                if (tasaefectiva > 0) {
                    htmlpreview += ' (' + window.formatusd(nuevopendiente / tasaefectiva) + ')';
                }
                htmlpreview += '</div>';
            }
            
            htmlpreview += '</div>';
            
            previewel.innerHTML = htmlpreview;
            previewel.style.display = 'block';
            
        } catch(e) {
            console.error('Error actualizando vista previa:', e);
            previewel.style.display = 'none';
            previewel.innerHTML = '';
        }
    };

    window.togglepagoparcial = function() {
        const section = document.getElementById('pagoParcialSection');
        const btnconfirmar = document.getElementById('btnConfirmarPagoParcial');
        const btntotal = document.getElementById('btnPagoTotal');
        if (section && btnconfirmar && btntotal) {
            const ishidden = section.style.display === 'none';
            section.style.display = ishidden ? 'block' : 'none';
            btnconfirmar.style.display = ishidden ? 'block' : 'none';
            btntotal.style.opacity = ishidden ? '0.5' : '1';
            btntotal.style.pointerevents = ishidden ? 'none' : 'auto';
            if (ishidden) {
                const input = document.getElementById('pagoParcialMonto');
                if (input) {
                    input.focus();
                    // limpiar vista previa al abrir
                    const previewel = document.getElementById('pagoPreviewSection');
                    if (previewel) {
                        previewel.style.display = 'none';
                        previewel.innerHTML = '';
                    }
                }
            } else {
                // al cerrar, limpiar vista previa
                const previewel = document.getElementById('pagoPreviewSection');
                if (previewel) {
                    previewel.style.display = 'none';
                    previewel.innerHTML = '';
                }
            }
        }
    };

    window.confirmarpagototal = async function() {
        if (!mesoneroparapagoid) return;
        
        const metodopago = document.getElementById('pagoMetodo')?.value;
        if (!metodopago) {
            window.mostrartoast('Selecciona un método de pago', 'error');
            return;
        }
        
        const btn = document.getElementById('btnPagoTotal');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="Fas fa-spinner fa-spin"></i> Procesando...';
        }
        try {
            // obtener todas las propinas pendientes del mesonero con información completa
            // si paga en usd, solo marcar las propinas en usd; si paga en bs, solo las propinas en bs
            let query = window.supabaseClient
                .from('propinas')
                .select('id, monto_bs, monto_original, moneda_original')
                .eq('mesonero_id', mesoneroparapagoid)
                .eq('entregado', false);
            
            // filtrar por moneda según el método de pago
            if (metodopago === 'efectivo_usd') {
                query = query.eq('moneda_original', 'USD');
            } else {
                // para pagos en bs, filtrar solo las que no son usd
                query = query.neq('moneda_original', 'USD');
            }
            
            const { data: pendientes, error: errget } = await query;
            if (errget) throw errget;
            
            const totalpagar = (pendientes || []).reduce((sum, p) => sum + (p.monto_bs || 0), 0);
            if (totalpagar <= 0) {
                window.mostrartoast('No hay propinas pendientes en esta moneda', 'error');
                return;
            }
            
            // calcular totales separados de usd y bs
            const tasabase = number(window.configglobal?.tasa_cambio || 400);
            let totalusdcrudo = 0;
            let totalbscrudo = 0;
            
            (pendientes || []).forEach(function(p) {
                if (p.moneda_original === 'USD' && p.monto_original) {
                    totalusdcrudo += p.monto_original;
                } else {
                    totalbscrudo += (p.monto_bs || 0);
                }
            });
            
            // actualizar todas las propinas pendientes a entregado: true
            // no modificar monto_bs ni monto_original para preservar el historial
            for (const prop of pendientes) {
                let updatedata = { entregado: true };
                
                await window.supabaseClient.from('propinas').update(updatedata).eq('id', prop.id);
            }
            
            // crear una nueva propina que representa el pago total al mesonero
            const cajeronombre = (window.usuarioactual && window.usuarioactual.nombre) || 'Administrador';
            const ahora = new date().toisostring();
            
            // si el método es efectivo_usd, registrar el monto en usd
            let nuevomontooriginal = totalpagar;
            let nuevamonedaoriginal = 'Bs';
            let nuevatasaaplicada = null;
            
            if (metodopago === 'efectivo_usd') {
                // convertir el total pagado a usd usando tasa base
                nuevomontooriginal = totalpagar / tasabase;
                nuevamonedaoriginal = 'USD';
                nuevatasaaplicada = tasabase;
            }
            
            const nuevapropina = {
                mesonero_id: mesoneroparapagoid,
                mesa: 'Pago total a mesonero',
                metodo: metodopago,
                monto_original: parseFloat(nuevomontooriginal.toFixed(2)),
                moneda_original: nuevamonedaoriginal,
                tasa_aplicada: nuevatasaaplicada,
                monto_bs: totalpagar,
                referencia: 'EGRESO',
                cajero: cajeronombre,
                fecha: ahora,
                entregado: true
            };
            
            const { error: errinsert } = await window.supabaseClient.from('propinas').insert([nuevapropina]);
            if (errinsert) throw errinsert;
            
            window.cerrarmodalpago();
            // limpiar vista previa antes de actualizar
            const previeweltotal = document.getElementById('pagoPreviewSection');
            if (previeweltotal) {
                previeweltotal.innerHTML = '';
                previeweltotal.style.display = 'none';
            }
            await window.actualizaracumuladospendientes();
            await window.cargarmesoneros();
            await window.cargarpropinas();
            window.renderizarpropinas();
            
            const montomostrar = metodopago === 'efectivo_usd' ? '$' + nuevomontooriginal.toFixed(2) + ' (a tasa base ' + tasabase + ')': window.formatbs(totalpagar);
            window.mostrartoast('Pago total registrado: ' + montomostrar, 'success');
        } catch(e) {
            console.error('Error pago total:', e);
            window.mostrartoast('Error: ' + (e.message || e), 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="Fas fa-check-double"></i> Pago Total';
            }
        }
    };

    window.confirmarpagoparcial = async function() {
        if (!mesoneroparapagoid) return;
        
        // obtener el método de pago seleccionado
        const metodopago = document.getElementById('pagoMetodo')?.value;
        if (!metodopago) {
            window.mostrartoast('Selecciona un método de pago', 'error');
            return;
        }
        
        const input = document.getElementById('pagoParcialMonto');
        let monto = input ? parseFloat(input.value) : 0;
        
        if (!monto || monto <= 0) {
            window.mostrartoast('Ingresa un monto válido', 'error');
            return;
        }

        const tasabase = number(window.configglobal?.tasa_cambio || 400);
        let montoenmonedaseleccionada = monto; // monto en la moneda seleccionada (usd o bs)
        let montoesusd = false;
        
        if (metodopago === 'efectivo_usd') {
            montoesusd = true;
            // el usuario ingresa usd, lo trabajamos directamente en usd
        }

        // determinar qué bucket de moneda estamos pagando
        const pagarenusd = (metodopago === 'efectivo_usd');
        
        // calcular el acumulado pendiente solo del bucket correspondiente
        let acumuladodelbucket = 0;
        try {
            let queryacumulado = window.supabaseClient
                .from('propinas')
                .select('monto_bs, monto_original, moneda_original')
                .eq('mesonero_id', mesoneroparapagoid)
                .eq('entregado', false);
            
            if (pagarenusd) {
                queryacumulado = queryacumulado.eq('moneda_original', 'USD');
            } else {
                queryacumulado = queryacumulado.neq('moneda_original', 'USD');
            }
            
            const { data: datosacumulado } = await queryacumulado;
            
            if (pagarenusd) {
                // sumar monto_original de las propinas usd
                acumuladodelbucket = (datosacumulado || []).reduce((sum, p) => sum + (p.monto_original || 0), 0);
            } else {
                // sumar monto_bs de las propinas en bs
                acumuladodelbucket = (datosacumulado || []).reduce((sum, p) => sum + (p.monto_bs || 0), 0);
            }
        } catch(e) {
            console.error('Error calculando acumulado del bucket:', e);
        }
        
        // validar que el monto no exceda el acumulado del bucket correspondiente
        if (montoenmonedaseleccionada > acumuladodelbucket + 0.01) {
            const limitemostrar = pagarenusd ? '$' + acumuladodelbucket.toFixed(2) : window.formatbs(acumuladodelbucket);
            window.mostrartoast('El monto no puede superar el pendiente de este bucket (' + limitemostrar + ')', 'error');
            return;
        }

        const btn = document.getElementById('btnConfirmarPagoParcial');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="Fas fa-spinner fa-spin"></i> Procesando...';
        }

        try {
            // 1. obtener propinas pendientes solo del bucket correspondiente, en orden fifo
            let querypendientes = window.supabaseClient
                .from('propinas')
                .select('id, monto_bs, mesa, metodo, monto_original, moneda_original, tasa_aplicada, referencia, cajero, fecha')
                .eq('mesonero_id', mesoneroparapagoid)
                .eq('entregado', false)
                .order('fecha', { ascending: true });
            
            if (pagarenusd) {
                querypendientes = querypendientes.eq('moneda_original', 'USD');
            } else {
                querypendientes = querypendientes.neq('moneda_original', 'USD');
            }
            
            const { data: pendientes, error: errconsulta } = await querypendientes;
            if (errconsulta) throw errconsulta;

            let restoporpagar = montoenmonedaseleccionada; // trabajar en la moneda seleccionada
            let pagocompletado = false;

            for (const prop of pendientes || []) {
                if (restoporpagar <= 0.01) break;
                
                // obtener el monto en la moneda correcta según el bucket
                const montopropinaenmoneda = pagarenusd ? (prop.monto_original || 0) : (prop.monto_bs || 0);
                
                // usar epsilon check para comparar montos
                if (restoporpagar >= montopropinaenmoneda - 0.01) {
                    // caso 1: pagar la propina completa
                    // marcar la propina original como entregada (no modificar montos para preservar historial)
                    let updatedataoriginal = { entregado: true };
                    await window.supabaseClient.from('propinas').update(updatedataoriginal).eq('id', prop.id);
                    
                    // crear nueva propina que representa el pago (egreso)
                    const cajeronombre = (window.usuarioactual && window.usuarioactual.nombre) || 'Administrador';
                    const ahora = new date().toisostring();
                    
                    // calcular los valores para el registro de pago
                    let nuevomontooriginal = 0;
                    let nuevamonedaoriginal = 'Bs';
                    let nuevomontobs = 0;
                    
                    if (pagarenusd) {
                        // pagando en usd: el monto_original es el monto pagado en usd
                        nuevomontooriginal = restoporpagar >= montopropinaenmoneda ? montopropinaenmoneda : restoporpagar;
                        nuevamonedaoriginal = 'USD';
                        nuevomontobs = nuevomontooriginal * tasabase;
                        restoporpagar -= montopropinaenmoneda;
                    } else {
                        // pagando en bs
                        nuevomontobs = restoporpagar >= montopropinaenmoneda ? montopropinaenmoneda : restoporpagar;
                        nuevomontooriginal = nuevomontobs;
                        nuevamonedaoriginal = 'Bs';
                        restoporpagar -= montopropinaenmoneda;
                    }
                    
                    const nuevapropinacompleta = {
                        mesonero_id: mesoneroparapagoid,
                        mesa: prop.mesa || 'General',
                        metodo: metodopago,
                        monto_original: parseFloat(nuevomontooriginal.toFixed(2)),
                        moneda_original: nuevamonedaoriginal,
                        tasa_aplicada: pagarenusd ? tasabase : null,
                        monto_bs: parseFloat(nuevomontobs.toFixed(2)),
                        referencia: 'EGRESO',
                        cajero: cajeronombre,
                        fecha: ahora,
                        entregado: true
                    };
                    
                    const { error: errinsert } = await window.supabaseClient
                        .from('propinas')
                        .insert([nuevapropinacompleta]);
                    if (errinsert) throw errinsert;
                    
                } else {
                    // caso 2: pago parcial sobre esta propina
                    const montopagadoenmoneda = restoporpagar;
                    const montorestanteenmoneda = montopropinaenmoneda - montopagadoenmoneda;
                    
                    // 2a. marcar la propina original como entregada (no modificar montos para preservar historial)
                    await window.supabaseClient.from('propinas').update({ entregado: true }).eq('id', prop.id);
                    
                    // 2b. crear un nuevo registro con el monto pagado (egreso)
                    const cajeronombre = (window.usuarioactual && window.usuarioactual.nombre) || 'Administrador';
                    const ahora = new date().toisostring();
                    
                    let nuevomontooriginalpago = 0;
                    let nuevamonedaoriginalpago = 'Bs';
                    let nuevomontobspago = 0;
                    
                    if (pagarenusd) {
                        nuevomontooriginalpago = montopagadoenmoneda;
                        nuevamonedaoriginalpago = 'USD';
                        nuevomontobspago = montopagadoenmoneda * tasabase;
                    } else {
                        nuevomontobspago = montopagadoenmoneda;
                        nuevomontooriginalpago = montopagadoenmoneda;
                        nuevamonedaoriginalpago = 'Bs';
                    }
                    
                    const nuevapropinapago = {
                        mesonero_id: mesoneroparapagoid,
                        mesa: prop.mesa || 'General',
                        metodo: metodopago,
                        monto_original: parseFloat(nuevomontooriginalpago.toFixed(2)),
                        moneda_original: nuevamonedaoriginalpago,
                        tasa_aplicada: pagarenusd ? tasabase : null,
                        monto_bs: parseFloat(nuevomontobspago.toFixed(2)),
                        referencia: 'EGRESO',
                        cajero: cajeronombre,
                        fecha: ahora,
                        entregado: true
                    };
                    
                    const { error: errinsertpago } = await window.supabaseClient
                        .from('propinas')
                        .insert([nuevapropinapago]);
                    if (errinsertpago) throw errinsertpago;
                    
                    // 2c. crear otro nuevo registro con el monto restante (pendiente, entregado: false)
                    let nuevomontooriginalrestante = 0;
                    let nuevamonedaoriginalrestante = 'Bs';
                    let nuevomontobsrestante = 0;
                    
                    if (pagarenusd) {
                        nuevomontooriginalrestante = montorestanteenmoneda;
                        nuevamonedaoriginalrestante = 'USD';
                        nuevomontobsrestante = montorestanteenmoneda * tasabase;
                    } else {
                        nuevomontobsrestante = montorestanteenmoneda;
                        nuevomontooriginalrestante = montorestanteenmoneda;
                        nuevamonedaoriginalrestante = 'Bs';
                    }
                    
                    const nuevapropinarestante = {
                        mesonero_id: mesoneroparapagoid,
                        mesa: prop.mesa || 'General',
                        metodo: prop.metodo,
                        monto_original: parseFloat(nuevomontooriginalrestante.toFixed(2)),
                        moneda_original: nuevamonedaoriginalrestante,
                        tasa_aplicada: prop.tasa_aplicada,
                        monto_bs: parseFloat(nuevomontobsrestante.toFixed(2)),
                        referencia: prop.referencia,
                        cajero: prop.cajero,
                        fecha: prop.fecha,
                        entregado: false
                    };
                    
                    const { error: errinsertrestante } = await window.supabaseClient
                        .from('propinas')
                        .insert([nuevapropinarestante]);
                    if (errinsertrestante) throw errinsertrestante;
                    
                    restoporpagar = 0;
                    pagocompletado = true;
                    break;
                }
            }

            // si después del bucle aún queda resto por pagar (por error lógico), abortar
            // usar epsilon check para evitar errores de punto flotante
            if (restoporpagar > 0.01) {
                throw new error('No se pudo cubrir el monto total. Verifique los datos.');
            }

            window.cerrarmodalpago();
            // limpiar vista previa antes de actualizar
            const previewelparcial = document.getElementById('pagoPreviewSection');
            if (previewelparcial) {
                previewelparcial.innerHTML = '';
                previewelparcial.style.display = 'none';
            }
            await window.actualizaracumuladospendientes();
            await window.cargarmesoneros();
            await window.cargarpropinas();
            window.renderizarpropinas();
            
            const montomostrar = montoesusd ? '$' + monto.toFixed(2) : window.formatbs(montoenmonedaseleccionada);
            window.mostrartoast('Pago parcial registrado: ' + montomostrar, 'success');
            
        } catch(e) {
            console.error('Error pago parcial:', e);
            let msg = e.message || e;
            if (e.details) msg += ' - ' + e.details;
            if (e.hint) msg += ' (Sugerencia: ' + e.hint + ')';
            window.mostrartoast('Error: ' + msg, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="Fas fa-check"></i> Confirmar';
            }
        }
    };

    // ════════════════════════════════════════
    // propinas — cargar + renderizar + historial
    // ════════════════════════════════════════
    window.cargarpropinas = async function() {
        try {
            const h = new date(); h.sethours(0,0,0,0);
            const m = new date(h); m.setdate(m.getdate()+1);
            const { data, error } = await window.supabaseClient
                .from('propinas').select('*, mesoneros(nombre)')
                .gte('fecha', h.toisostring()).lt('fecha', m.toisostring())
                .order('fecha', { ascending: false });
            if (error) throw error;
            window.propinas = data || [];
            window.renderizarpropinas();
        } catch(e) { 
            console.error('Error cargando propinas:', e); 
        }
    };

    window.renderizarpropinas = function() {
        const propinas = window.propinas || [];
        const total    = propinas.reduce(function(s,p){ return s+(p.monto_bs||0); }, 0);
        const cantidad = propinas.length;
        const promedio = cantidad > 0 ? total/cantidad : 0;
        const tasa     = number(window.configglobal?.tasa_efectiva || window.configglobal?.tasa_cambio || 400) || 400;
        const totalusd = tasa > 0 ? total / tasa : 0;
        const promusd  = tasa > 0 ? promedio / tasa : 0;
        var el;
        el = document.getElementById('propinasTotal');    if(el) el.textContent = window.formatusd(totalusd) + ' / ' + window.formatbs(total);
        el = document.getElementById('propinasCantidad'); if(el) el.textContent = String(cantidad);
        el = document.getElementById('propinasPromedio'); if(el) el.textContent = window.formatusd(promusd) + ' / ' + window.formatbs(promedio);
        el = document.getElementById('propinasHoyDashboard'); if(el) el.textContent = window.formatusd(totalusd) + ' / ' + window.formatbs(total);
        const tbody = document.getElementById('propinasTableBody');
        if (tbody) {
            const ultimas5 = propinas.slice(0, 5);
            if (ultimas5.length) {
                tbody.innerHTML = ultimas5.map(function(p) {
                    var hora = new date(p.fecha).tolocalestring('es-VE',{timezone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                    // determinar si es pago usando referencia === 'EGRESO'Var ispago = p.referencia === 'EGRESO';
                    var signo = ispago ? '-' : '+';
                    var colormonto = ispago ? 'var(--text-dark)' : 'var(--success)';
                    
                    // formato especial para efectivo_usd: mostrar monto_original y monto_bs
                    var displaymonto = '';
                    if (p.metodo === 'efectivo_usd' && p.monto_original) {
                        if (ispago) {
                            // pago en usd: [-$ {monto_original} (-bs. {monto_bs})]
                            displaymonto = '$' + p.monto_original.toFixed(2) + ' (-Bs. ' + p.monto_bs.toFixed(2) + ')';
                        } else {
                            // ingreso en usd: [+$ {monto_original} (bs. {monto_bs})]
                            displaymonto = '$' + p.monto_original.toFixed(2) + ' (Bs. ' + p.monto_bs.toFixed(2) + ')';
                        }
                    } else {
                        displaymonto = window.formatbs(p.monto_bs);
                    }
                    
                    return '<tr><td>' + hora + '</td><td>' + (p.mesoneros ? p.mesoneros.nombre : 'N/A') + '</td><td>' + (p.mesa||'N/A') + '</td><td>' + (p.metodo||'N/A') + '</td><td style="color:' + colormonto + '">' + signo + ' ' + displaymonto + '</td><td>' + (p.cajero||'N/A') + '</td></tr>';
                }).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="Text-align:center;padding:1rem;color:var(--text-muted)">Sin propinas hoy</td></tr>';
            }
        }
    };

    window.verhistorialpropinahoy = async function() {
        try {
            const h   = new date(); h.sethours(0,0,0,0);
            const m   = new date(h); m.setdate(m.getdate()+1);
            const tasa = window.configglobal?.tasa_efectiva || window.configglobal?.tasa_cambio || 400;
            // mostrar todos los registros (sin filtrar por entregado) para historial completo
            const { data, error } = await window.supabaseClient
                .from('propinas').select('*, mesoneros(nombre)')
                .gte('fecha', h.toisostring()).lt('fecha', m.toisostring())
                .order('fecha', { ascending: false });
            if (error) throw error;
            const lista  = data || [];
            const totbs  = lista.reduce(function(s,p){ return s+(p.monto_bs||0); }, 0);
            const totusd = tasa > 0 ? totbs/tasa : 0;
            const rows = lista.map(function(p) {
                var musd = tasa > 0 ? (p.monto_bs||0)/tasa : 0;
                var hora = new date(p.fecha).tolocalestring('es-VE',{timezone:'America/Caracas',hour:'2-digit',minute:'2-digit'});
                // determinar si es pago usando referencia === 'EGRESO'Var ispago = p.referencia === 'EGRESO';
                var signo = ispago ? '-' : '+';
                var colormonto = ispago ? 'var(--text-dark)' : 'var(--success)';
                
                // formato especial para efectivo_usd: mostrar monto_original y monto_bs
                var displaymonto = '';
                if (p.metodo === 'efectivo_usd' && p.monto_original) {
                    if (ispago) {
                        // pago en usd: [-$ {monto_original} (-bs. {monto_bs})]
                        displaymonto = '$' + p.monto_original.toFixed(2) + ' (-Bs. ' + p.monto_bs.toFixed(2) + ')';
                    } else {
                        // ingreso en usd: [+$ {monto_original} (bs. {monto_bs})]
                        displaymonto = '$' + p.monto_original.toFixed(2) + ' (Bs. ' + p.monto_bs.toFixed(2) + ')';
                    }
                } else {
                    displaymonto = window.formatusd(musd) + ' | ' + window.formatbs(p.monto_bs||0);
                }
                
                var badgetipo = ispago 
                    ? '<span style="Display:inline-block;padding:2px 6px;border-radius:4px;font-size:.65rem;background:rgba(244,67,54,.15);color:var(--text-dark);font-weight:700;margin-left:.35rem">PAGO</span>': '<span style="Display:inline-block;padding:2px 6px;border-radius:4px;font-size:.65rem;background:rgba(76,175,80,.15);color:var(--success);font-weight:700;margin-left:.35rem">INGRESO</span>';
                return '<tr>'+ '<td style="Padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">' + hora + '</td>'+ '<td style="Padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:600">' + (p.mesoneros ? p.mesoneros.nombre : 'N/A') + '</td>'+ '<td style="Padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">' + (p.mesa||'N/A') + '</td>'+ '<td style="Padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem">' + (p.metodo||'N/A') + '</td>'+ '<td style="padding:.55rem .85rem;border-bottom:1px solid var(--border);font-size:.82rem;font-weight:700;color:' + colormonto + '">' + signo + ' ' + displaymonto + badgetipo + '</td>'+ '</tr>';
            }).join('');
            var pl = lista.length;
            var totline = pl + ' propina' + (pl!==1?'s':'') + ' · Total: ' + window.formatusd(totusd) + ' | ' + window.formatbs(totbs);
            var emptyrow = '<tr><td colspan="5" style="Text-align:center;padding:1.5rem;color:var(--text-muted)">Sin propinas hoy</td></tr>';
            var ov = document.createelement('div');
            ov.style.csstext = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
            ov.innerHTML = '<div style="Background:var(--card-bg);border-radius:16px;max-width:680px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.4)">'+ '<div style="Background:linear-gradient(135deg,var(--propina),#7b1fa2);padding:1rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center">'+ '<div><div style="Font-weight:700;font-size:1rem"><i class="Fas fa-hand-holding-heart"></i> Registro</div>'+ '<div style="Font-size:.75rem;opacity:.8;margin-top:2px">' + totline + '</div></div>'+ '<button onclick="this.closest(\'[style*=position]\').remove()" Style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:1rem;font-weight:700;display:flex;align-items:center;justify-content:center">&#x2715;</button>'+ '</div>'+ '<div style="Overflow-y:auto;flex:1"><table style="Width:100%;border-collapse:collapse">'+ '<thead><tr style="Background:var(--secondary)">'+ '<th style="Padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Hora</th>'+ '<th style="Padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Mesonero</th>'+ '<th style="Padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Mesa</th>'+ '<th style="Padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Método</th>'+ '<th style="Padding:.6rem .85rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700">Registro</th>'+ '</tr></thead>'+ '<tbody>' + (rows || emptyrow) + '</tbody></table></div>'+ '<div style="Padding:.85rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">'+ '<button onclick="this.closest(\'[style*=position]\').remove()" Style="background:var(--primary);color:#fff;border:none;padding:.55rem 1.25rem;border-radius:8px;cursor:pointer;font-family:Montserrat,sans-serif;font-weight:600;font-size:.85rem">Cerrar</button>'+ '</div></div>';
            ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
            document.body.appendchild(ov);
        } catch(e) {
            console.error('Error historial propinas:', e);
            window.mostrartoast('Error al cargar historial', 'error');
        }
    };

    // ════════════════════════════════════════
    // foto mesonero
    // ════════════════════════════════════════
    function handlemesonerofotofile() {
        var fi=document.getElementById('mesoneroFoto');
        var ui=document.getElementById('mesoneroFotoUrl');
        var pd=document.getElementById('mesoneroFotoPreview');
        var pi=document.getElementById('mesoneroPreviewImg');
        var rb=document.getElementById('mesoneroFotoRemoveBtn');
        if (!fi||!pd) return;
        if (fi.files && fi.files[0]) {
            currentmesonerofotofile=fi.files[0]; currentmesonerofotourl='';
            if(ui){ui.value='';ui.disabled=true;}
            var reader=new FileReader();
            reader.onload=function(e){if(pi)pi.src=e.target.result;pd.style.display='flex';if(rb)rb.style.display='flex';};
            reader.readasdataurl(fi.files[0]);
        } else { if(ui)ui.disabled=false; }
    }
    function handlemesonerofotourl() {
        var ui=document.getElementById('mesoneroFotoUrl');
        var fi=document.getElementById('mesoneroFoto');
        var pd=document.getElementById('mesoneroFotoPreview');
        var pi=document.getElementById('mesoneroPreviewImg');
        var rb=document.getElementById('mesoneroFotoRemoveBtn');
        if(!ui||!pd) return;
        if(fi&&fi.files&&fi.files[0]) return;
        var url=ui.value.trim();
        if(url){currentmesonerofotourl=url;currentmesonerofotofile=null;if(pi)pi.src=url;pd.style.display='flex';if(rb)rb.style.display='flex';}
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
        if(pi)pi.src=''; currentmesonerofotofile=null; currentmesonerofotourl='';
    }

    // ════════════════════════════════════════
    // guardar mesonero
    // ════════════════════════════════════════
    var savemesonerobtn = document.getElementById('saveMesonero');
    if (savemesonerobtn) {
        savemesonerobtn.addEventListener('click', async function() {
            if (this.disabled) return;
            var id     = window.mesoneroeditandoid;
            var nombre = (document.getElementById('mesoneroNombre')||{}).value;
            if (nombre) nombre = nombre.trim();
            var activoel = document.getElementById('mesoneroActivo');
            var activo = activoel ? activoel.value === 'true' : true;
            if (!nombre) { window.mostrartoast('Ingresa un nombre', 'error'); return; }
            var fotourl = '';
            var archivofoto = (document.getElementById('mesoneroFoto')||{files:[]}).files[0];
            var fotourlinput = ((document.getElementById('mesoneroFotoUrl')||{}).value)||'';
            if (archivofoto) {
                var res = await window.subirimagenplatillo(archivofoto, 'mesoneros');
                if (res.success) fotourl = res.url;
                else { window.mostrartoast('Error al subir foto: '+res.error,'error'); return; }
            } else if (fotourlinput) { fotourl = fotourlinput; }
            try {
                this.disabled=true; this.innerHTML='<i class="Fas fa-spinner fa-spin"></i>';
                var dataobj = { nombre: nombre, activo: activo, foto: fotourl || null };
                var err;
                if (id) {
                    var r1 = await window.supabaseClient.from('mesoneros').update(dataobj).eq('id', id);
                    err = r1.error;
                } else {
                    dataobj.id = window.generarid('mes_');
                    var r2 = await window.supabaseClient.from('mesoneros').insert([dataobj]);
                    err = r2.error;
                }
                if (err) throw err;
                window.cerrarmodal('mesoneroModal');
                await window.cargarmesoneros();
                window.mostrartoast('Mesonero guardado', 'success');
            } catch(e) { window.mostrartoast('Error: '+e.message,'error'); }
            finally { this.disabled=false; this.innerHTML='Guardar'; }
        });
    }

    var closebtn = document.getElementById('closeMesoneroModal');
    if (closebtn) closebtn.addEventListener('click', function(){ window.cerrarmodal('mesoneroModal'); });
    var cancelbtn = document.getElementById('cancelMesoneroEdit');
    if (cancelbtn) cancelbtn.addEventListener('click', function(){ window.cerrarmodal('mesoneroModal'); });
    var fotoinput = document.getElementById('mesoneroFoto');
    if (fotoinput) fotoinput.addEventListener('change', handlemesonerofotofile);
    var fotourlinp = document.getElementById('mesoneroFotoUrl');
    if (fotourlinp) fotourlinp.addEventListener('input', handlemesonerofotourl);
    var removebtn = document.getElementById('mesoneroFotoRemoveBtn');
    if (removebtn) removebtn.addEventListener('click', removeMesoneroFoto);

    // Inicializar al cargar el módulo
    if (window.supabaseClient) {
        window.cargarmesoneros();
    }
})();
