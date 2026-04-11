// admin-reportes.js - Reportesygráficos (conlazyloadingdeChart.js)
(function() {
window.cargarReportes = asyncfunction() {
    if (typeofChart === 'undefined') {
        awaitnewPromise((resolve, reject) => {
            constscript = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    try {
        constdesde = document.getElementById('reporteDesde').value;
        consthasta = document.getElementById('reporteHasta').value;
        letquery = window.supabaseClient.from('pedidos').select('*').in('estado', ['cobrado', 'entregado', 'enviado', 'reserva_completada']);
        if (desde) query = query.gte('fecha', newDate(desde).toISOString());
        if (hasta) { consth = newDate(hasta); h.setDate(h.getDate() + 1); query = query.lt('fecha', h.toISOString()); }
        const { data, error } = awaitquery.order('fecha', { ascending: false });
        if (error) throwerror;
        window.actualizarEstadisticasReportes(data || []);
        window.actualizarGraficos(data || []);
        window.actualizarTablaVentas(data || []);
    } catch (e) { console.error('Errorcargandoreportes:', e); window.mostrarToast('Errorcargandoreportes', 'error'); }
};

// admin-reportes.js - ncorregida
window.actualizarEstadisticasReportes = function(pedidos) {
    consthoy = newDate(); hoy.setHours(0, 0, 0, 0);
    constventasHoy = pedidos.filter(p => newDate(p.fecha) >= hoy).reduce((s, p) => s + (p.total || 0), 0);
    constsemana = newDate(); semana.setDate(semana.getDate() - 7);
    constventasSemana = pedidos.filter(p => newDate(p.fecha) >= semana).reduce((s, p) => s + (p.total || 0), 0);
    constticketPromedio = pedidos.length > 0 ? pedidos.reduce((s, p) => s + (p.total || 0), 0) / pedidos.length : 0;
    
    constplatillosCount = {};
    pedidos.forEach(p => { if (p.items) p.items.forEach(item => { platillosCount[item.nombre] = (platillosCount[item.nombre] || 0) + (item.cantidad || 0); }); });
    letplatilloTop = '-', maxCount = 0;
    for (const [n, c] ofObject.entries(platillosCount)) { if (c > maxCount) { maxCount = c; platilloTop = n; } }
    
    consttasa = window.configGlobal?.tasa_efectiva || 400;
    const_s = (id, v) => { constel = document.getElementById(id); if (el) el.textContent = v; };
    _s('ventasDia', `${window.formatUSD(ventasHoy)} / ${window.formatBs(ventasHoy * tasa)}`);
    _s('ventasSemana', `${window.formatUSD(ventasSemana)} / ${window.formatBs(ventasSemana * tasa)}`);
    _s('ticketPromedio', `${window.formatUSD(ticketPromedio)} / ${window.formatBs(ticketPromedio * tasa)}`);
    _s('platilloTop', platilloTop);
    _s('cantidadPedidos', pedidos.length);
};

window.actualizarGraficos = function(pedidos) {
    if (typeofChart === 'undefined') return;
    constventasPorDia = {};
    for (leti = 6; i >= 0; i--) { constf = newDate(); f.setDate(f.getDate() - i); ventasPorDia[f.toISOString().split('T')[0]] = 0; }
    pedidos.forEach(p => { constf = newDate(p.fecha).toISOString().split('T')[0]; if (ventasPorDia.hasOwnProperty(f)) ventasPorDia[f] += p.total || 0; });
    if (window.charts.ventas) window.charts.ventas.destroy();
    // ficodeVentas (línea 56aprox)
window.charts.ventas = newChart(document.getElementById('ventasChart'), {
    type: 'line',
    data: {  // ✅ AÑADIR "data:"
        labels: Object.keys(ventasPorDia), 
        datasets: [{ 
            label: 'Ventas (USD)', 
            data: Object.values(ventasPorDia),  // ✅ AÑADIR "data:"
            borderColor: 'var(--primary)', 
            backgroundColor: 'rgba(211,47,47,0.1)', 
            tension: 0.1 
        }] 
    }
});

// ficodeCategorías (doughnut)
window.charts.categorias = newChart(document.getElementById('categoriasChart'), {
    type: 'doughnut',
    data: {  // ✅ AÑADIR "data:"
        labels: Object.keys(categorias), 
        datasets: [{ 
            data: Object.values(categorias),  // ✅ AÑADIR "data:"
            backgroundColor: ['#D32F2F', '#FF9800', '#1976D2', '#388E3C', '#F57C00', '#6c757d'] 
        }] 
    }
});

// ficodetodosdePago (bar)
window.charts.pagos = newChart(document.getElementById('pagosChart'), {
    type: 'bar',
    data: {  // ✅ AÑADIR "data:"
        labels: Object.keys(metodos).map(m => { 
            constn = { efectivo_bs: 'EfectivoBs', efectivo_usd: 'EfectivoUSD', pago_movil: 'PagoM', punto_venta: 'PuntodeVenta', mixto: 'Mixto', invitacion: 'Invitación' }; 
            returnn[m] || m; 
        }), 
        datasets: [{ 
            label: 'Monto (USD)', 
            data: Object.values(metodos).map(v => v / (window.configGlobal?.tasa_efectiva || 400)), 
            backgroundColor: 'var(--info)' 
        }] 
    }
});

// ficodeVentasporHora (bar)
window.charts.hora = newChart(document.getElementById('horaChart'), {
    type: 'bar',
    data: {  // ✅ AÑADIR "data:"
        labels: Object.keys(horas).map(h => `${h}:00`), 
        datasets: [{ 
            label: 'Ventas (USD)', 
            data: Object.values(horas),  // ✅ AÑADIR "data:"
            backgroundColor: 'var(--accent)' 
        }] 
    }
});
window.actualizarTablaVentas = function(pedidos) {
     consttbody = document.getElementById('ventasTableBody');
    consttasa = (window.configGlobal && window.configGlobal.tasa_efectiva) || window.configGlobal?.tasa_cambio || 400;
    tbody.innerHTML = pedidos.slice(0, 50).map(p => {
        constitems = p.items || [];
        consttotalItems = items.reduce((s, i) => s + (i.cantidad || 0), 0);
        constresumen = items.length ? items.slice(0, 2).map(i => `${i.cantidad || 1}× ${i.nombre}`).join(', ') + (items.length > 2 ? ` +${items.length - 2} más` : '') : 'Sindetalle';
        consttotalUSD = p.total || 0;
        consttotalBs = window.formatBs(totalUSD * tasa);
        return `<tr>
             <td>${newDate(p.fecha).toLocaleDateString('es-VE', { timeZone: 'America/Caracas'})}</td>
             <tdstyle="max-width:200px;font-size:.82rem">${resumen}</td>
             <td>${window.formatUSD(totalUSD)} <br><spanstyle="font-size:.75rem;color:var(--text-muted)">${totalBs}</span></td>
             <td>${totalItems}</td>
             <tdstyle="font-size:.78rem">${(function(){
                if (p.pagos_mixtos && p.pagos_mixtos.length > 1) {
                    constlabels = { efectivo_bs:'Ef.Bs', efectivo_usd:'Ef.USD', pago_movil:'P.Móvil', punto_venta:'Pto.Venta', invitacion:'Invitación' };
                    returnp.pagos_mixtos.map(pg => labels[pg.metodo] || pg.metodo).join(' + ');
                }
                constlabels2 = { efectivo_bs:'Ef. Bs', efectivo_usd:'Ef. USD', pago_movil:'PagoM', punto_venta:'PuntoVenta', invitacion:'Invitación' };
                returnlabels2[p.metodo_pago] || p.metodo_pago || 'N/A';
            })()}</td>
             <td>${p.tipo || 'N/A'}</td>
         </tr>`;
    }).join('');
};

window.cargarPedidosRecientes = asyncfunction() {
    try {
        const { data, error } = awaitwindow.supabaseClient.from('pedidos').select('*').order('fecha', { ascending: false }).limit(5);
        if (error) throwerror;
        constpedidosCount = document.getElementById('pedidosCountBadge');
        if (pedidosCount) pedidosCount.textContent = (data || []).length;
        document.getElementById('pedidosRecientes').innerHTML = (data || []).map(p => {
            consthora = newDate(p.fecha).toLocaleTimeString('es-VE', {hour:'2-digit',minute:'2-digit'});
            constfecha = newDate(p.fecha).toLocaleDateString('es-VE', {day:'2-digit',month:'2-digit'});
            constitems = (p.items || []).slice(0,2).map(i => `${i.cantidad||1}x ${i.nombre}`).join(', ');
            constmasItems = (p.items||[]).length > 2 ? ` +${(p.items||[]).length-2} más` : '';
            consttipoIcon = p.tipo==='delivery' ? '🛵' : p.tipo==='reserva' ? '📅' : '🍽️';
            consttipoColor = p.tipo==='delivery' ? 'var(--delivery)' : p.tipo==='reserva' ? 'var(--propina)' : 'var(--info)';
            consttotalBs = window.formatBs(window.usdToBs(p.total||0));
            constestadoText = p.estado ? p.estado.replace(/_/g,' ') : '';
            constestadoColor = p.estado === 'entregado' ? 'var(--success)' : p.estado === 'en_camino' ? 'var(--delivery)' : p.estado === 'en_cocina' ? 'var(--warning)' : 'var(--text-muted)';
            return `<divclass="pedido-item-modern" style="background:var(--card-bg); border-radius:12px; padding:.8rem 1rem; border:1pxsolidvar(--border); transition:all .2s; cursor:pointer" onclick="window._abrirDetallePedidoAdmin('${p.id}')">
                 <divstyle="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:.5rem; margin-bottom:.5rem">
                     <divstyle="display:flex; align-items:center; gap:.6rem; flex-wrap:wrap">
                         <spanstyle="font-size:1.1rem">${tipoIcon}</span>
                         <spanstyle="font-weight:700; color:${tipoColor}">${p.tipo || 'mesa'} ${p.mesa ? `· Mesa ${p.mesa}` : ''}</span>
                         <spanstyle="font-size:.7rem; background:${estadoColor}20; color:${estadoColor}; padding:.2rem .6rem; border-radius:20px; font-weight:600">${estadoText || 'pendiente'}</span>
                     </div>
                     <divstyle="display:flex; align-items:center; gap:.5rem">
                         <spanstyle="font-size:.7rem; color:var(--text-muted)">${fecha} ${hora}</span>
                         <spanstyle="font-weight:800; color:var(--accent); font-size:.9rem">${totalBs}</span>
                     </div>
                 </div>
                 <divstyle="font-size:.75rem; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:.3rem">
                     <span><iclass="fasfa-receipt" style="width:14px; margin-right:.3rem"></i> ${items || 'Sinitems'}</span>
                    ${masItems ? `<spanstyle="color:var(--accent)">${masItems}</span>` : ''}
                 </div>
             </div>`;
        }).join('') || '<divstyle="text-align:center; padding:1rem; color:var(--text-muted)"><iclass="fasfa-inbox"></i><pstyle="margin-top:.5rem">Nohaypedidosrecientes</p></div>';
    } catch (e) { console.error('Errorcargandopedidosrecientes:', e); }
};

window._abrirDetallePedidoAdmin = asyncfunction(pedidoId) {
    letpedido = (window.pedidos||[]).find(p=>p.id===pedidoId);
    if (!pedido) {
        try {
            const {data,error}=awaitwindow.supabaseClient.from('pedidos').select('*').eq('id',pedidoId).maybeSingle();
            if(error) throwerror; pedido=data;
        } catch(e){ window.mostrarToast('Erroralcargarpedido','error'); return; }
    }
    if (!pedido){ window.mostrarToast('Pedidonoencontrado','error'); return; }
    consttasa=(window.configGlobal?.tasa_efectiva||window.configGlobal?.tasa_cambio||400);
    consttipoIcon=pedido.tipo==='delivery'?'🛵':pedido.tipo==='reserva'?'📅':'🍽️';
    consttipoLabel=pedido.tipo==='delivery'?'Delivery':pedido.tipo==='reserva'?'Reserva':('Mesa '+(pedido.mesa||''));
    constecols={entregado:'var(--success)',cobrado:'var(--success)',en_camino:'var(--delivery)',enviado:'var(--delivery)',en_cocina:'var(--warning)'};
    constsc=ecols[pedido.estado]||'var(--text-muted)';
    constmap={};
    (pedido.items||[]).forEach(it=>{if(map[it.nombre])map[it.nombre].cantidad+=(it.cantidad||1);elsemap[it.nombre]={...it,cantidad:it.cantidad||1};});
    constiHtml=Object.values(map).map(it=>{
        constpu=it.precioUnitarioUSD||it.precio||0; constsu=pu*(it.cantidad||1);
        constqty=it.cantidad>1?`<spanstyle="background:var(--primary);color:#fff;border-radius:12px;padding:1px 7px;font-size:.7rem;font-weight:700;margin-left:.3rem">×${it.cantidad}</span>`:'';
        return `<divstyle="display:flex;justify-content:space-between;align-items:center;padding:.45rem 0;border-bottom:1pxsolidvar(--border)"><spanstyle="font-size:.85rem;font-weight:500;color:var(--text-dark)">${it.nombre}${qty}</span><spanstyle="font-size:.82rem;font-weight:700;color:var(--accent);white-space:nowrap;margin-left:.5rem">${window.formatUSD(su)} / ${window.formatBs(su*tasa)}</span></div>`;
    }).join('')||'<pstyle="color:var(--text-muted);font-size:.82rem;text-align:center;padding:.75rem">Sinitems</p>';
    constmetLbl={efectivo_bs:'EfectivoBs',efectivo_usd:'EfectivoUSD',pago_movil:'PagoM',punto_venta:'PuntodeVenta',invitacion:'Invitación'};
    letmetodo='N/A';
    if(pedido.pagos_mixtos?.length) metodo=pedido.pagos_mixtos.map(pg=>metLbl[pg.metodo]||pg.metodo).join(' + ');
    elseif(pedido.metodo_pago) metodo=metLbl[pedido.metodo_pago]||pedido.metodo_pago;
    constfechaStr=newDate(pedido.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    constov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
    ov.innerHTML=`<divstyle="background:var(--card-bg);border-radius:16px;max-width:480px;width:100%;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 40pxrgba(0,0,0,.4)"><divstyle="background:linear-gradient(135deg,#1a1a2e,#2d2d4e);padding:1rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:flex-start"><div><divstyle="font-size:1rem;font-weight:700">${tipoIcon} ${tipoLabel}</div><divstyle="font-size:.72rem;opacity:.75;margin-top:3px">${fechaStr}</div></div><divstyle="display:flex;align-items:center;gap:.75rem"><spanstyle="font-size:.7rem;background:${sc}30;color:${sc};padding:.2rem .7rem;border-radius:20px;font-weight:600">${(pedido.estado||'').replace(/_/g,' ')}</span><buttononclick="this.closest('[style*=position]').remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:.9rem;font-weight:700;display:flex;align-items:center;justify-content:center">✕</button></div></div><divstyle="overflow-y:auto;flex:1;padding:1rem 1.5rem"><divstyle="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:.6rem"><iclass="fasfa-receipt" style="margin-right:.3rem"></i>Items</div>${iHtml}</div><divstyle="padding:.85rem 1.5rem;border-top:1pxsolidvar(--border)"><divstyle="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.82rem"><spanstyle="color:var(--text-muted)">tododepago</span><spanstyle="font-weight:600">${metodo}</span></div><divstyle="display:flex;justify-content:space-between;align-items:center"><spanstyle="font-size:.82rem;color:var(--text-muted)">Total</span><spanstyle="font-size:1rem;font-weight:800;color:var(--accent)">${window.formatUSD(pedido.total||0)} / ${window.formatBs((pedido.total||0)*tasa)}</span></div></div></div>`;
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
    document.body.appendChild(ov);
};

window._actualizarVentasHoyNeto = asyncfunction() {
    try {
        consthoy = newDate(); hoy.setHours(0, 0, 0, 0);
        constmanana = newDate(hoy); manana.setDate(manana.getDate() + 1);
        const {  ventasHoy } = awaitwindow.supabaseClient.from('ventas').select('pedido_id').gte('fecha', hoy.toISOString()).lt('fecha', manana.toISOString());
        if (!ventasHoy || ventasHoy.length === 0) { document.getElementById('ventasHoy').textContent = '$0.00 / Bs 0.00'; return; }
        constpedidoIds = ventasHoy.map(v => v.pedido_id);
        const { data: pedidosData } = awaitwindow.supabaseClient.from('pedidos').select('*').in('id', pedidoIds);
        const_netoCobradoPedido = (pedido) => {
            if (!pedido) return 0;
            if (pedido.metodo_pago === 'invitacion') return 0;
            consttasa = window.configGlobal?.tasa_cambio || window.configGlobal?.tasa_efectiva || 400;
            letrecibido = 0;
            if (pedido.pagos_mixtos && pedido.pagos_mixtos.length) {
                pedido.pagos_mixtos.forEach(pg => {
                    if (pg.metodo === 'invitacion') return;
                    recibido += pg.metodo === 'efectivo_usd' ? (pg.monto || 0) * tasa : (pg.montoBs || pg.monto || 0);
                });
            } else { recibido = pedido.subtotal_bs || 0; }
            returnMath.max(0, recibido - (pedido.vuelto_entregado || 0));
        };
        letnetoBs = 0;
        pedidosData.forEach(pedido => { netoBs += _netoCobradoPedido(pedido); });
        consttasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
        constnetoUSD = netoBs / tasa;
        constel = document.getElementById('ventasHoy');
        if (el) el.textContent = `${window.formatUSD(netoUSD)} / Bs ${netoBs.toFixed(2)}`;
        window._ventasHoyNeto = { netoBs, netoUSD, ventasHoy, pedidosData };
    } catch (e) { console.error('Errorcalculandonetocobrado:', e); constel = document.getElementById('ventasHoy'); if (el) el.textContent = '$0.00 / Bs 0.00'; }
};

window._actualizarDeliverysHoy = asyncfunction() {
    try {
        consthoy = newDate(); hoy.setHours(0, 0, 0, 0);
        constmanana = newDate(hoy); manana.setDate(manana.getDate() + 1);
        const { data: pedidosDelivery } = awaitwindow.supabaseClient.from('pedidos').select('*').eq('tipo', 'delivery').eq('estado', 'enviado').gte('fecha', hoy.toISOString()).lt('fecha', manana.toISOString());
        lettotalDeliverys = 0;
        (pedidosDelivery || []).forEach(p => { totalDeliverys += p.costo_delivery_bs || p.costoDelivery || 0; });
        constel = document.getElementById('deliverysHoyDashboard');
        if (el) el.textContent = window.formatBs(totalDeliverys);
        window._deliverysHoyData = { totalDeliverys, pedidosDelivery };
    } catch (e) { console.error('Errorcalculandodeliveryshoy:', e); constel = document.getElementById('deliverysHoyDashboard'); if (el) el.textContent = 'Bs 0.00'; }
};

window._abrirDetalleDeliverysAdmin = asyncfunction() {
    try {
        consthoy = newDate(); hoy.setHours(0, 0, 0, 0);
        constmanana = newDate(hoy); manana.setDate(manana.getDate() + 1);
        const { data: entregas } = awaitwindow.supabaseClient.from('entregas_delivery').select('*, deliverys(*)').gte('fecha_entrega', hoy.toISOString()).lt('fecha_entrega', manana.toISOString());
        const {  motorizados } = awaitwindow.supabaseClient.from('deliverys').select('*').order('nombre');
        constacumulado = {};
        (entregas || []).forEach(e => { acumulado[e.delivery_id] = (acumulado[e.delivery_id] || 0) + (e.monto_bs || 0); });
        consttotalAcumulado = Object.values(acumulado).reduce((s, v) => s + v, 0);
        letmotorizadosHtml = '';
        if (!motorizados || motorizados.length === 0) motorizadosHtml = '<divclass="empty-state"><iclass="fasfa-motorcycle"></i><p>Nohaymotorizadosregistrados</p></div>';
        else {
            motorizadosHtml = '<divclass="motorizados-list" style="display:flex;flex-direction:column;gap:8px">';
            motorizados.forEach(m => {
                constmonto = acumulado[m.id] || 0;
                consthayE = monto > 0;
                constdetalleId = 'det_del_' + String(m.id).replace(/[^a-z0-9]/gi, '_');
                motorizadosHtml += `<divstyle="margin-bottom:8px">
                     <divclass="motorizado-item" style="background:rgba(0,0,0,.25);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;border-left:4pxsolidvar(--delivery);cursor:${hayE ? 'pointer' : 'default'};opacity:${hayE ? '1' : '0.6'}" onclick="${hayE ? `window._toggleDeliveryDetalle('${detalleId}')` : ''}">
                         <spanclass="motorizado-nombre"><iclass="fasfa-motorcycle" style="color:var(--delivery);margin-right:8px"></i>${m.nombre}</span>
                         <spanclass="motorizado-monto" style="color:${hayE ? 'var(--accent)' : 'var(--text-secondary)'};font-weight:700;display:flex;align-items:center;gap:6px">
                            ${window.formatBs(monto)}
                            ${hayE ? `<iclass="fasfa-chevron-down" style="font-size:.7rem;transition:transform .2s" id="icon_${detalleId}"></i>` : ''}
                         </span>
                     </div>`;
                if (hayE) {
                    constpedidosDelDia = (window.pedidos || []).filter(p => p.delivery_id === m.id && p.estado === 'enviado' && newDate(p.fecha).toDateString() === hoy.toDateString());
                    motorizadosHtml += `<divid="${detalleId}" style="display:none;padding:8px 12px;background:rgba(0,0,0,.2);border-radius:0 0 8px 8px;margin-top:-4px;border:1pxsolidvar(--border-color);border-top:none">
                        ${pedidosDelDia.length > 0 ? pedidosDelDia.map(p => {
                            consthora = newDate(p.fecha).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
                            return `<divstyle="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1pxsolidrgba(255,255,255,.08);font-size:.78rem">
                                 <span><iclass="fasfa-map-marker-alt" style="color:var(--delivery);margin-right:6px"></i>${p.parroquia || 'Sinparroquia'}<spanstyle="color:var(--text-secondary);margin-left:8px">${hora}</span></span>
                                 <spanstyle="color:var(--accent);font-weight:700">${window.formatBs(p.costo_delivery_bs || 0)}</span>
                             </div>`;
                        }).join('') : '<divstyle="padding:6px 0;color:var(--text-secondary);font-size:.78rem">Nohayentregasregistradas</div>'}
                         <divstyle="padding:6px 0;margin-top:4px;font-size:.75rem;font-weight:600;border-top:1pxsolidrgba(255,255,255,.1);color:var(--text-secondary)">Total: ${pedidosDelDia.length} entrega${pedidosDelDia.length !== 1 ? 's' : ''}</div>
                     </div>`;
                }
                motorizadosHtml += `</div>`;
            });
            motorizadosHtml += '</div>';
        }
        constmodal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem';
        modal.innerHTML = `<divstyle="background:var(--card-bg);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32pxrgba(0,0,0,.4)">
             <divstyle="background:linear-gradient(135deg, var(--delivery), #00838F);color:#fff;padding:1rem 1.2rem;display:flex;justify-content:space-between;align-items:center;border-radius:16px 16px 0 0">
                 <h3style="font-size:1rem;font-weight:700;display:flex;align-items:center;gap:.5rem"><iclass="fasfa-motorcycle"></i> AcumuladoDeliverys (Hoy)</h3>
                 <buttononclick="this.closest('[style*=fixed]').remove()" style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;font-size:1rem;display:flex;align-items:center;justify-content:center">✕</button>
             </div>
             <divstyle="padding:1.25rem">
                 <divstyle="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2pxsolidvar(--border-color)">
                     <spanstyle="font-weight:700;font-size:1rem">Totalacumuladohoy</span>
                     <spanstyle="font-weight:800;color:var(--delivery);font-size:1.2rem">${window.formatBs(totalAcumulado)}</span>
                 </div>
                 <h4style="margin-bottom:12px;color:var(--text-secondary);font-size:.85rem;font-weight:600">Desglosepormotorizado:</h4>
                ${motorizadosHtml}
             </div>
             <divstyle="padding:1rem 1.2rem;border-top:1pxsolidvar(--border);display:flex;justify-content:flex-end">
                 <buttononclick="this.closest('[style*=fixed]').remove()" class="btn-primary" style="padding:.5rem 1.2rem;font-size:.85rem;background:linear-gradient(135deg, var(--delivery), #00838F)">Cerrar</button>
             </div>
         </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    } catch (e) { console.error('Errorabriendodetalledeliverysadmin:', e); window.mostrarToast('❌ Erroralcargardatosdedeliverys', 'error'); }
};

window._toggleDeliveryDetalle = function(detalleId) {
    constdetalleEl = document.getElementById(detalleId);
    consticonEl = document.getElementById('icon_' + detalleId);
    if (detalleEl) {
        if (detalleEl.style.display === 'none' || detalleEl.style.display === '') {
            detalleEl.style.display = 'block';
            if (iconEl) iconEl.style.transform = 'rotate(180deg)';
        } else {
            detalleEl.style.display = 'none';
            if (iconEl) iconEl.style.transform = 'rotate(0deg)';
        }
    }
};

window._abrirDetalleVentasAdmin = asyncfunction() {
    try {
        consthoy = newDate(); hoy.setHours(0, 0, 0, 0);
        constmanana = newDate(hoy); manana.setDate(manana.getDate() + 1);
        const { data: ventasHoy } = awaitwindow.supabaseClient.from('ventas').select('*').gte('fecha', hoy.toISOString()).lt('fecha', manana.toISOString());
        if (!ventasHoy || ventasHoy.length === 0) { window.mostrarToast('Nohayventasregistradashoy', 'info'); return; }
        constpedidoIds = ventasHoy.map(v => v.pedido_id);
        const {  pedidosHoy } = awaitwindow.supabaseClient.from('pedidos').select('*').in('id', pedidoIds);
        consttasa = window.configGlobal?.tasa_cambio || window.configGlobal?.tasa_efectiva || 400;
        constfmtBs = window.formatBs;
        const_netoCobradoPedido = (pedido) => {
            if (!pedido) return 0;
            if (pedido.metodo_pago === 'invitacion') return 0;
            letrecibido = 0;
            if (pedido.pagos_mixtos && pedido.pagos_mixtos.length) {
                pedido.pagos_mixtos.forEach(pg => {
                    if (pg.metodo === 'invitacion') return;
                    recibido += pg.metodo === 'efectivo_usd' ? (pg.monto || 0) * tasa : (pg.montoBs || pg.monto || 0);
                });
            } else { recibido = pedido.subtotal_bs || 0; }
            returnMath.max(0, recibido - (pedido.vuelto_entregado || 0));
        };
        lettotalNeto = 0, vt_ebs = 0, vt_eusd = 0, vt_pm = 0, vt_pv = 0, vt_cond = 0, vt_favor = 0, vt_delivery = 0, vt_inv_count = 0, vt_inv_acum = 0;
        ventasHoy.forEach(v => {
            constp = pedidosHoy.find(pd => pd.id === v.pedido_id);
            if (!p) return;
            constneto = _netoCobradoPedido(p);
            totalNeto += neto;
            if (p.condonado > 0) vt_cond += p.condonado;
            if (p.a_favor_caja > 0) vt_favor += p.a_favor_caja;
            if (p.tipo === 'delivery' && (p.costo_delivery_bs || 0) > 0) vt_delivery += p.costo_delivery_bs;
            constpagos = p.pagos_mixtos;
            if (pagos && pagos.length) {
                letvueltoR = p.vuelto_entregado || 0;
                pagos.forEach(pg => {
                    constmbs = pg.metodo === 'efectivo_usd' ? (pg.monto || 0) * tasa : (pg.montoBs || pg.monto || 0);
                    if (pg.metodo === 'efectivo_bs') { constn = Math.max(0, mbs - vueltoR); vueltoR = Math.max(0, vueltoR - mbs); vt_ebs += n; }
                    elseif (pg.metodo === 'efectivo_usd') { constn = Math.max(0, mbs - vueltoR); vueltoR = Math.max(0, vueltoR - mbs); vt_eusd += n; }
                    elseif (pg.metodo === 'pago_movil') vt_pm += mbs;
                    elseif (pg.metodo === 'punto_venta') vt_pv += mbs;
                    elseif (pg.metodo === 'invitacion') { vt_inv_count++; constsubtotalInv = (p.items || []).reduce((s, i) => s + window.usdToBs((i.precioUnitarioUSD || 0) * (i.cantidad || 1)), 0); vt_inv_acum += subtotalInv + (p.costo_delivery_bs || 0); }
                });
            } else {
                constmetodo = p.metodo_pago || v.metodo_pago || '';
                constbs = neto;
                if (metodo === 'efectivo_bs') vt_ebs += bs;
                elseif (metodo === 'efectivo_usd') vt_eusd += bs;
                elseif (metodo === 'pago_movil') vt_pm += bs;
                elseif (metodo === 'punto_venta') vt_pv += bs;
                elseif (metodo === 'invitacion') { vt_inv_count++; constsubtotalInv = (p.items || []).reduce((s, i) => s + window.usdToBs((i.precioUnitarioUSD || 0) * (i.cantidad || 1)), 0); vt_inv_acum += subtotalInv + (p.costo_delivery_bs || 0); }
            }
        });
        constvcol = (ico, label, val, color) => val > 0 ? `<divstyle="display:flex;align-items:center;gap:6px;padding:8px;background:rgba(0,0,0,.08);border-radius:8px;border-left:3pxsolid ${color}">
             <iclass="${ico}" style="color:${color};width:14px;text-align:center"></i>
             <divstyle="flex:1"><divstyle="font-size:.72rem;color:var(--text-muted)">${label}</div><divstyle="font-weight:700;color:${color};font-size:.9rem">${fmtBs(val)}</div></div>
         </div>` : '';
        constdetallesCobros = ventasHoy.map(v => {
            constp = pedidosHoy.find(pd => pd.id === v.pedido_id);
            if (!p) return '';
            consthora = newDate(p.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' });
            constitems = (p.items || []).slice(0, 2).map(i => `${i.cantidad || 1}× ${i.nombre}`).join(', ');
            constmasItems = (p.items || []).length > 2 ? ` +${(p.items || []).length - 2} más` : '';
            constneto = _netoCobradoPedido(p);
            constmetodoLabel = { efectivo_bs: 'Ef.Bs', efectivo_usd: 'Ef.USD', pago_movil: 'P.Móvil', punto_venta: 'Pto.Venta', invitacion: 'Invitación' };
            letmetodoStr = p.metodo_pago || 'N/A';
            if (p.pagos_mixtos && p.pagos_mixtos.length > 1) metodoStr = p.pagos_mixtos.map(pg => metodoLabel[pg.metodo] || pg.metodo).join(' + ');
            elsemetodoStr = metodoLabel[p.metodo_pago] || p.metodo_pago || 'N/A';
            return `<divstyle="padding:.6rem .75rem;border-radius:8px;background:var(--table-header);margin-bottom:.4rem;font-size:.82rem">
                 <divstyle="display:flex;justify-content:space-between;align-items:center;margin-bottom:.2rem">
                     <spanstyle="font-weight:700;color:var(--text-dark)">${hora} · ${p.tipo || 'mesa'}</span>
                     <spanstyle="font-weight:800;color:var(--success)">${fmtBs(neto)}</span>
                 </div>
                 <divstyle="color:var(--text-muted);font-size:.75rem">${items}${masItems}</div>
                 <divstyle="font-size:.72rem;color:var(--text-muted);margin-top:.15rem">${metodoStr}</div>
             </div>`;
        }).join('');
        constcontenido = `
    <divstyle="margin-bottom:1rem;padding:.85rem;background:var(--table-header);border-radius:10px">
        <divstyle="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
            <spanstyle="font-weight:700;color:var(--text-dark)">Netocobradohoy</span>
            <spanstyle="font-weight:800;color:var(--success);font-size:1.15rem">${fmtBs(totalNeto)}</span>
        </div>
        <divstyle="display:flex;justify-content:space-between;color:var(--text-muted);font-size:.82rem">
            <span>Pedidoscobrados</span><spanstyle="font-weight:600">${ventasHoy.length}</span>
        </div>
    </div>
    ${detallesCobros ? `<divstyle="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:.6rem">Detalleporcobro</div>${detallesCobros}` : ''}
`;
        constmodal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
        modal.innerHTML = `<divstyle="background:var(--card-bg);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32pxrgba(0,0,0,.35)">
             <divstyle="display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;border-bottom:2pxsolidvar(--border);position:sticky;top:0;background:var(--card-bg);z-index:1">
                 <h3style="font-size:1rem;font-weight:700;color:var(--text-dark)"><iclass="fasfa-chart-line" style="color:var(--accent);margin-right:.5rem"></i>VentasHoy — NetoCobrado</h3>
                 <buttononclick="this.closest('[style*=fixed]').remove()" style="background:var(--table-header);border:none;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:.9rem;color:var(--text-muted)">✕</button>
             </div>
             <divstyle="padding:1.25rem">${contenido}</div>
             <divclass="modal-footer" style="padding:1rem 1.5rem;border-top:1pxsolidvar(--border);display:flex;justify-content:flex-end">
                 <buttononclick="this.closest('[style*=fixed]').remove()" class="btn-primary" style="padding:.5rem 1.2rem;font-size:.85rem">Cerrar</button>
             </div>
         </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    } catch (e) { console.error('Errorabriendodetalleventasadmin:', e); window.mostrarToast('❌ Erroralcargareldetalledeventas', 'error'); }
};
})();
