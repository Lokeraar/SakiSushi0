// admin-reportes.js - Reportes y gráficos (con lazy loading de Chart.js)
(function() {
    window.cargarReportes = async function() {
        if (typeof Chart === 'Undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('Script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        try {
            const desde = document.getElementById('Reportedesde').value;
            const hasta = document.getElementById('Reportehasta').value;
            let query = window.supabaseClient.from('Pedidos').select('*').in('Estado', ['Cobrado', 'Entregado', 'Enviado', 'reserva_completada']);
            if (desde) query = query.gte('Fecha', new Date(desde).toISOString());
            if (hasta) { const h = new Date(hasta); h.setDate(h.getDate() + 1); query = query.lt('Fecha', h.toISOString()); }
            const { data, error } = await query.order('Fecha', { ascending: false });
            if (error) throw error;
            window.actualizarEstadisticasReportes(data || []);
            window.actualizarGraficos(data || []);
            window.actualizarTablaVentas(data || []);
        } catch (e) { console.error('Error cargando reportes:', e); window.mostrarToast('Error cargando reportes', 'Error'); }
    };

    window.actualizarEstadisticasReportes = function(pedidos) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const ventasHoy = pedidos.filter(p => new Date(p.fecha) >= hoy).reduce((s, p) => s + (p.total || 0), 0);
        const semana = new Date(); semana.setDate(semana.getDate() - 7);
        const ventasSemana = pedidos.filter(p => new Date(p.fecha) >= semana).reduce((s, p) => s + (p.total || 0), 0);
        const ticketPromedio = pedidos.length > 0 ? pedidos.reduce((s, p) => s + (p.total || 0), 0) / pedidos.length : 0;
        
        const platillosCount = {};
        pedidos.forEach(p => { if (p.items) p.items.forEach(item => { platillosCount[item.nombre] = (platillosCount[item.nombre] || 0) + (item.cantidad || 0); }); });
        let platilloTop = '-', maxCount = 0;
        for (const [n, c] of Object.entries(platillosCount)) { if (c > maxCount) { maxCount = c; platilloTop = n; } }
        
        const tasa = window.configGlobal?.tasa_efectiva || 400;
        const _s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
        _s('Ventasdia',      `${window.formatUSD(ventasHoy)} / ${window.formatBs(ventasHoy * tasa)}`);
        _s('Ventassemana',   `${window.formatUSD(ventasSemana)} / ${window.formatBs(ventasSemana * tasa)}`);
        _s('Ticketpromedio', `${window.formatUSD(ticketPromedio)} / ${window.formatBs(ticketPromedio * tasa)}`);
        _s('Platillotop',    platilloTop);
    };

    window.actualizarGraficos = function(pedidos) {
        if (typeof Chart === 'Undefined') return;
        const ventasPorDia = {};
        for (let i = 6; i >= 0; i--) { const f = new Date(); f.setDate(f.getDate() - i); ventasPorDia[f.toISOString().split('T')[0]] = 0; }
        pedidos.forEach(p => { const f = new Date(p.fecha).toISOString().split('T')[0]; if (ventasPorDia.hasOwnProperty(f)) ventasPorDia[f] += p.total || 0; });
        if (window.charts.ventas) window.charts.ventas.destroy();
        window.charts.ventas = new Chart(document.getElementById('Ventaschart'), {
            type: 'Line',
            data: { labels: Object.keys(ventasPorDia), datasets: [{ label: 'Ventas (usd)', data: Object.values(ventasPorDia), borderColor: 'Var(--primary)', backgroundColor: 'Rgba(211,47,47,0.1)', tension: 0.1 }] }
        });
        
        const categorias = {};
        pedidos.forEach(p => { if (p.items) p.items.forEach(item => { const platillo = window.menuItems.find(m => m.nombre === item.nombre); const cat = platillo?.categoria || 'Otros'; categorias[cat] = (categorias[cat] || 0) + ((item.precioUnitarioUSD || 0) * (item.cantidad || 0)); }); });
        if (window.charts.categorias) window.charts.categorias.destroy();
        window.charts.categorias = new Chart(document.getElementById('Categoriaschart'), {
            type: 'Doughnut',
            data: { labels: Object.keys(categorias), datasets: [{ data: Object.values(categorias), backgroundColor: ['#D32F2F', '#FF9800', '#1976D2', '#388E3C', '#F57C00', '#6c757d'] }] }
        });
        
        const metodos = {};
        pedidos.forEach(p => {
            if (p.pagos_mixtos) p.pagos_mixtos.forEach(pago => { metodos[pago.metodo] = (metodos[pago.metodo] || 0) + (pago.monto || 0); });
            else if (p.metodo_pago) metodos[p.metodo_pago] = (metodos[p.metodo_pago] || 0) + (p.total || 0);
        });
        if (window.charts.pagos) window.charts.pagos.destroy();
        window.charts.pagos = new Chart(document.getElementById('Pagoschart'), {
            type: 'Bar',
            data: { labels: Object.keys(metodos).map(m => { const n = { efectivo_bs: 'Efectivo bs', efectivo_usd: 'Efectivo usd', pago_movil: 'Pago móvil', punto_venta: 'Punto de venta', mixto: 'Mixto', invitacion: 'Invitación' }; return n[m] || m; }), datasets: [{ label: 'Monto (usd)', data: Object.values(metodos).map(v => v / (window.configGlobal?.tasa_efectiva || 400)), backgroundColor: 'Var(--info)' }] }
        });
        
        const horas = {}; for (let i = 0; i < 24; i++) horas[i] = 0;
        pedidos.forEach(p => { const h = new Date(p.fecha).getHours(); horas[h] += p.total || 0; });
        if (window.charts.hora) window.charts.hora.destroy();
        window.charts.hora = new Chart(document.getElementById('Horachart'), {
            type: 'Bar',
            data: { labels: Object.keys(horas).map(h => `${h}:00`), datasets: [{ label: 'Ventas (usd)', data: Object.values(horas), backgroundColor: 'Var(--accent)' }] }
        });
    };

    window.actualizarTablaVentas = function(pedidos) {
        const tbody = document.getElementById('Ventastablebody');
        const tasa = (window.configGlobal && window.configGlobal.tasa_efectiva) || window.configGlobal?.tasa_cambio || 400;
        tbody.innerHTML = pedidos.slice(0, 50).map(p => {
            const items = p.items || [];
            const totalItems = items.reduce((s, i) => s + (i.cantidad || 0), 0);
            const resumen = items.length ? items.slice(0, 2).map(i => `${i.cantidad || 1}× ${i.nombre}`).join(', ') + (items.length > 2 ? ` +${items.length - 2} más` : '') : 'Sin detalle';
            const totalusd = p.total || 0;
            const totalbs = window.formatbs(totalusd * tasa);
            return `<tr>
                <td>${new date(p.fecha).tolocaledatestring('es-VE', { timezone: 'America/Caracas'})}</td>
                <td style="Max-width:200px;font-size:.82rem">${resumen}</td>
                <td>${window.formatUSD(totalUSD)}<br><span style="Font-size:.75rem;color:var(--text-muted)">${totalBs}</span></td>
                <td>${totalItems}</td>
                <td style="Font-size:.78rem">${(function(){
                    if (p.pagos_mixtos && p.pagos_mixtos.length > 1) {
                        const labels = { efectivo_bs:'Ef.bs', efectivo_usd:'Ef.usd', pago_movil:'P.móvil', punto_venta:'Pto.venta', invitacion:'Invitación' };
                        return p.pagos_mixtos.map(pg => labels[pg.metodo] || pg.metodo).join(' + ');
                    }
                    const labels2 = { efectivo_bs:'Ef. bs', efectivo_usd:'Ef. usd', pago_movil:'Pago móvil', punto_venta:'Punto venta', invitacion:'Invitación' };
                    return labels2[p.metodo_pago] || p.metodo_pago || 'N/A';
                })()}</td>
                <td>${p.tipo || 'N/A'}</td>
            </tr>`;
        }).join('');
    };

    window.cargarpedidosrecientes = async function() {
        try {
            const { data, error } = await window.supabaseclient.from('pedidos').select('*').order('fecha', { ascending: false }).limit(5);
            if (error) throw error;
            const pedidoscount = document.getElementById('pedidosCountBadge');
            if (pedidoscount) pedidoscount.textContent = (data || []).length;
            document.getElementById('pedidosRecientes').innerHTML = (data || []).map(p => {
                const hora = new date(p.fecha).tolocaletimestring('es-VE', {hour:'2-digit',minute:'2-digit'});
                const fecha = new date(p.fecha).tolocaledatestring('es-VE', {day:'2-digit',month:'2-digit'});
                const items = (p.items || []).slice(0,2).map(i => `${i.cantidad||1}x ${i.nombre}`).join(', ');
                const masitems = (p.items||[]).length > 2 ? ` +${(p.items||[]).length-2} más` : '';
                const tipoicon = p.tipo==='delivery' ? '🛵' : p.tipo==='reserva' ? '📅' : '🍽️';
                const tipocolor = p.tipo==='delivery' ? 'var(--delivery)' : p.tipo==='reserva' ? 'var(--propina)' : 'var(--info)';
                const totalbs = window.formatbs(window.usdtobs(p.total||0));
                const estadotext = p.estado ? p.estado.replace(/_/g,' ') : '';
                const estadocolor = p.estado === 'entregado' ? 'var(--success)' : p.estado === 'en_camino' ? 'var(--delivery)' : p.estado === 'en_cocina' ? 'var(--warning)' : 'var(--text-muted)';
                return `<div class="Pedido-item-modern" style="Background:var(--card-bg); border-radius:12px; padding:.8rem 1rem; border:1px solid var(--border); transition:all .2s; cursor:pointer" onclick="window._abrirDetallePedidoAdmin('${p.id}')">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:.5rem; margin-bottom:.5rem">
                        <div style="display:flex; align-items:center; gap:.6rem; flex-wrap:wrap">
                            <span style="font-size:1.1rem">${tipoicon}</span>
                            <span style="font-weight:700; color:${tipoColor}">${p.tipo || 'Mesa'} ${p.mesa ? `· Mesa ${p.mesa}` : ''}</span>
                            <span style="Font-size:.7rem; background:${estadocolor}20; color:${estadocolor}; padding:.2rem .6rem; border-radius:20px; font-weight:600">${estadoText || 'Pendiente'}</span>
                        </div>
                        <div style="Display:flex; align-items:center; gap:.5rem">
                            <span style="Font-size:.7rem; color:var(--text-muted)">${fecha} ${hora}</span>
                            <span style="Font-weight:800; color:var(--accent); font-size:.9rem">${totalBs}</span>
                        </div>
                    </div>
                    <div style="Font-size:.75rem; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:.3rem">
                        <span><i class="Fas fa-receipt" style="Width:14px; margin-right:.3rem"></i> ${items || 'Sin items'}</span>
                        ${masItems ? `<span style="Color:var(--accent)">${masItems}</span>` : ''}
                    </div>
                </div>`;
            }).join('') || '<div style="Text-align:center; padding:1rem; color:var(--text-muted)"><i class="Fas fa-inbox"></i><p style="Margin-top:.5rem">No hay pedidos recientes</p></div>';
        } catch (e) { console.error('Error cargando pedidos recientes:', e); }
    };

    window._abrirdetallepedidoadmin = async function(pedidoid) {
        let pedido = (window.pedidos||[]).find(p=>p.id===pedidoid);
        if (!pedido) {
            try {
                const {data,error}=await window.supabaseclient.from('pedidos').select('*').eq('id',pedidoid).maybesingle();
                if(error) throw error; pedido=data;
            } catch(e){ window.mostrartoast('Error al cargar pedido','error'); return; }
        }
        if (!pedido){ window.mostrartoast('Pedido no encontrado','error'); return; }
        const tasa=(window.configglobal?.tasa_efectiva||window.configglobal?.tasa_cambio||400);
        const tipoicon=pedido.tipo==='delivery'?'🛵':pedido.tipo==='reserva'?'📅':'🍽️';
        const tipolabel=pedido.tipo==='delivery'?'Delivery':pedido.tipo==='reserva'?'Reserva':('Mesa '+(pedido.mesa||''));
        const ecols={entregado:'var(--success)',cobrado:'var(--success)',en_camino:'var(--delivery)',enviado:'var(--delivery)',en_cocina:'var(--warning)'};
        const sc=ecols[pedido.estado]||'var(--text-muted)';
        const map={};
        (pedido.items||[]).forEach(it=>{if(map[it.nombre])map[it.nombre].cantidad+=(it.cantidad||1);else map[it.nombre]={...it,cantidad:it.cantidad||1};});
        const iHtml=Object.values(map).map(it=>{
            const pu=it.precioUnitarioUSD||it.precio||0; const su=pu*(it.cantidad||1);
            const qty=it.cantidad>1?`<span style="Background:var(--primary);color:#fff;border-radius:12px;padding:1px 7px;font-size:.7rem;font-weight:700;margin-left:.3rem">×${it.cantidad}</span>`:'';
            return `<div style="Display:flex;justify-content:space-between;align-items:center;padding:.45rem 0;border-bottom:1px solid var(--border)"><span style="Font-size:.85rem;font-weight:500;color:var(--text-dark)">${it.nombre}${qty}</span><span style="Font-size:.82rem;font-weight:700;color:var(--accent);white-space:nowrap;margin-left:.5rem">${window.formatUSD(su)} / ${window.formatBs(su*tasa)}</span></div>`;
        }).join('')||'<p style="Color:var(--text-muted);font-size:.82rem;text-align:center;padding:.75rem">Sin items</p>';
        const metlbl={efectivo_bs:'Efectivo Bs',efectivo_usd:'Efectivo USD',pago_movil:'Pago Móvil',punto_venta:'Punto de Venta',invitacion:'Invitación'};
        let metodo='N/A';
        if(pedido.pagos_mixtos?.length) metodo=pedido.pagos_mixtos.map(pg=>metlbl[pg.metodo]||pg.metodo).join(' + ');
        else if(pedido.metodo_pago) metodo=metlbl[pedido.metodo_pago]||pedido.metodo_pago;
        const fechastr=new date(pedido.fecha).tolocalestring('es-VE',{timezone:'America/Caracas',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
        const ov=document.createelement('div');
        ov.style.csstext='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)';
        ov.innerHTML=`<div style="Background:var(--card-bg);border-radius:16px;max-width:480px;width:100%;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.4)"><div style="Background:linear-gradient(135deg,#1a1a2e,#2d2d4e);padding:1rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:flex-start"><div><div style="Font-size:1rem;font-weight:700">${tipoIcon} ${tipoLabel}</div><div style="Font-size:.72rem;opacity:.75;margin-top:3px">${fechaStr}</div></div><div style="Display:flex;align-items:center;gap:.75rem"><span style="Font-size:.7rem;background:${sc}30;color:${sc};padding:.2rem .7rem;border-radius:20px;font-weight:600">${(pedido.estado||'').replace(/_/g,' ')}</span><button onclick="this.closest('[style*=position]').remove()" Style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:.9rem;font-weight:700;display:flex;align-items:center;justify-content:center">✕</button></div></div><div style="overflow-y:auto;flex:1;padding:1rem 1.5rem"><div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:.6rem"><i class="fas fa-receipt" Style="margin-right:.3rem"></i>items</div>${ihtml}</div><div style="padding:.85rem 1.5rem;border-top:1px solid var(--border)"><div style="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.82rem"><span style="color:var(--text-muted)">método de pago</span><span style="font-weight:600">${metodo}</span></div><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:.82rem;color:var(--text-muted)">total</span><span style="font-size:1rem;font-weight:800;color:var(--accent)">${window.formatUSD(pedido.total||0)} / ${window.formatBs((pedido.total||0)*tasa)}</span></div></div></div>`;
        ov.addEventListener('Click',e=>{if(e.target===ov)ov.remove();});
        document.body.appendChild(ov);
    };

    window._actualizarVentasHoyNeto = async function() {
        try {
            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
            const { data: ventasHoy } = await window.supabaseClient.from('Ventas').select('pedido_id').gte('Fecha', hoy.toISOString()).lt('Fecha', manana.toISOString());
            if (!ventasHoy || ventasHoy.length === 0) { document.getElementById('Ventashoy').textContent = '$0.00 / bs 0.00'; return; }
            const pedidoIds = ventasHoy.map(v => v.pedido_id);
            const { data: pedidosData } = await window.supabaseClient.from('Pedidos').select('*').in('Id', pedidoIds);
            const _netoCobradoPedido = (pedido) => {
                if (!pedido) return 0;
                if (pedido.metodo_pago === 'Invitacion') return 0;
                const tasa = window.configGlobal?.tasa_cambio || window.configGlobal?.tasa_efectiva || 400;
                let recibido = 0;
                if (pedido.pagos_mixtos && pedido.pagos_mixtos.length) {
                    pedido.pagos_mixtos.forEach(pg => {
                        if (pg.metodo === 'Invitacion') return;
                        recibido += pg.metodo === 'efectivo_usd' ? (pg.monto || 0) * tasa : (pg.montoBs || pg.monto || 0);
                    });
                } else { recibido = pedido.subtotal_bs || 0; }
                return Math.max(0, recibido - (pedido.vuelto_entregado || 0));
            };
            let netoBs = 0;
            pedidosData.forEach(pedido => { netoBs += _netoCobradoPedido(pedido); });
            const tasa = window.configGlobal?.tasa_efectiva || window.configGlobal?.tasa_cambio || 400;
            const netoUSD = netoBs / tasa;
            const el = document.getElementById('Ventashoy');
            if (el) el.textContent = `${window.formatUSD(netoUSD)} / Bs ${netoBs.toFixed(2)}`;
            window._ventasHoyNeto = { netoBs, netoUSD, ventasHoy, pedidosData };
        } catch (e) { console.error('Error calculando neto cobrado:', e); const el = document.getElementById('Ventashoy'); if (el) el.textContent = '$0.00 / bs 0.00'; }
    };

    window._actualizarDeliverysHoy = async function() {
        try {
            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
            const { data: pedidosDelivery } = await window.supabaseClient.from('Pedidos').select('*').eq('Tipo', 'Delivery').eq('Estado', 'Enviado').gte('Fecha', hoy.toISOString()).lt('Fecha', manana.toISOString());
            let totalDeliverys = 0;
            (pedidosDelivery || []).forEach(p => { totalDeliverys += p.costo_delivery_bs || p.costoDelivery || 0; });
            const el = document.getElementById('Deliveryshoydashboard');
            if (el) el.textContent = window.formatBs(totalDeliverys);
            window._deliverysHoyData = { totalDeliverys, pedidosDelivery };
        } catch (e) { console.error('Error calculando deliverys hoy:', e); const el = document.getElementById('Deliveryshoydashboard'); if (el) el.textContent = 'Bs 0.00'; }
    };

    window._abrirDetalleDeliverysAdmin = async function() {
        try {
            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
            const { data: entregas } = await window.supabaseClient.from('entregas_delivery').select('*, deliverys(*)').gte('fecha_entrega', hoy.toISOString()).lt('fecha_entrega', manana.toISOString());
            const { data: motorizados } = await window.supabaseClient.from('Deliverys').select('*').order('Nombre');
            const acumulado = {};
            (entregas || []).forEach(e => { acumulado[e.delivery_id] = (acumulado[e.delivery_id] || 0) + (e.monto_bs || 0); });
            const totalAcumulado = Object.values(acumulado).reduce((s, v) => s + v, 0);
            let motorizadosHtml = '';
            if (!motorizados || motorizados.length === 0) motorizadoshtml = '<div class="Empty-state"><i class="Fas fa-motorcycle"></i><p>No hay motorizados registrados</p></div>';
            else {
                motorizadoshtml = '<div class="Motorizados-list" style="Display:flex;flex-direction:column;gap:8px">';
                motorizados.foreach(m => {
                    const monto = acumulado[m.id] || 0;
                    const haye = monto > 0;
                    const detalleid = 'det_del_' + string(m.id).replace(/[^a-z0-9]/gi, '_');
                    motorizadosHtml += `<div style="Margin-bottom:8px">
                        <div class="Motorizado-item" style="background:rgba(0,0,0,.25);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid var(--delivery);cursor:${hayE ? 'Pointer' : 'Default'};opacity:${hayE ? '1' : '0.6'}" Onclick="${hayE ? `window._toggleDeliveryDetalle('${detalleid}')` : ''}">
                            <span class="motorizado-nombre"><i class="fas fa-motorcycle" Style="color:var(--delivery);margin-right:8px"></i>${m.nombre}</span>
                            <span class="motorizado-monto" Style="color:${hayE ? 'Var(--accent)' : 'Var(--text-secondary)'};font-weight:700;display:flex;align-items:center;gap:6px">
                                ${window.formatBs(monto)}
                                ${hayE ? '<i class="Fas fa-chevron-down" style="Font-size:.7rem;transition:transform .2s" id="icon_' + detalleid + '"></i>' : ''}
                            </span>
                        </div>`;
                    if (haye) {
                        const pedidosdeldia = (window.pedidos || []).filter(p => p.delivery_id === m.id && p.estado === 'enviado' && new Date(p.fecha).toDateString() === hoy.toDateString());
                        motorizadosHtml += `<div id="${detalleid}" style="Display:none;padding:8px 12px;background:rgba(0,0,0,.2);border-radius:0 0 8px 8px;margin-top:-4px;border:1px solid var(--border-color);border-top:none">
                            ${pedidosDelDia.length > 0 ? pedidosDelDia.map(p => {
                                const hora = new Date(p.fecha).toLocaleTimeString('Es-ve', { hour: 'Numeric', minute: '2-digit', hour12: true }).toLowerCase();
                                return `<div style="Display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:.78rem">
                                    <span><i class="Fas fa-map-marker-alt" style="Color:var(--delivery);margin-right:6px"></i>${p.parroquia || 'Sin parroquia'}<span style="Color:var(--text-secondary);margin-left:8px">${hora}</span></span>
                                    <span style="Color:var(--accent);font-weight:700">${window.formatBs(p.costo_delivery_bs || 0)}</span>
                                </div>`;
                            }).join('') : '<div style="Padding:6px 0;color:var(--text-secondary);font-size:.78rem">No hay entregas registradas</div>'}
                            <div style="Padding:6px 0;margin-top:4px;font-size:.75rem;font-weight:600;border-top:1px solid rgba(255,255,255,.1);color:var(--text-secondary)">Total: ${pedidosDelDia.length} entrega${pedidosDelDia.length !== 1 ? 'S' : ''}</div>
                        </div>`;
                    }
                    motorizadoshtml += `</div>`;
                });
                motorizadoshtml += '</div>';
            }
            const modal = document.createelement('div');
            modal.style.csstext = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem';
            modal.innerHTML = `<div style="Background:var(--card-bg);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.4)">
                <div style="Background:linear-gradient(135deg, var(--delivery), #00838f);color:#fff;padding:1rem 1.2rem;display:flex;justify-content:space-between;align-items:center;border-radius:16px 16px 0 0">
                    <h3 style="Font-size:1rem;font-weight:700;display:flex;align-items:center;gap:.5rem"><i class="Fas fa-motorcycle"></i> Acumulado Deliverys (Hoy)</h3>
                    <button onclick="this.closest('[style*=fixed]').remove()" Style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;font-size:1rem;display:flex;align-items:center;justify-content:center">✕</button>
                </div>
                <div style="padding:1.25rem">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--border-color)">
                        <span style="font-weight:700;font-size:1rem">total acumulado hoy</span>
                        <span style="font-weight:800;color:var(--delivery);font-size:1.2rem">${window.formatbs(totalacumulado)}</span>
                    </div>
                    <h4 style="margin-bottom:12px;color:var(--text-secondary);font-size:.85rem;font-weight:600">desglose por motorizado:</h4>
                    ${motorizadoshtml}
                </div>
                <div style="padding:1rem 1.2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
                    <button onclick="this.closest('[style*=fixed]').remove()" Class="btn-primary" Style="padding:.5rem 1.2rem;font-size:.85rem;background:linear-gradient(135deg, var(--delivery), #00838F)">Cerrar</button>
                </div>
            </div>`;
            modal.addEventListener('Click', e => { if (e.target === modal) modal.remove(); });
            document.body.appendChild(modal);
        } catch (e) { console.error('Error abriendo detalle deliverys admin:', e); window.mostrarToast('❌ error al cargar datos de deliverys', 'Error'); }
    };

    window._toggleDeliveryDetalle = function(detalleId) {
        const detalleEl = document.getElementById(detalleId);
        const iconEl = document.getElementById('icon_' + detalleId);
        if (detalleEl) {
            if (detalleEl.style.display === 'None' || detalleEl.style.display === '') {
                detalleel.style.display = 'block';
                if (iconel) iconel.style.transform = 'rotate(180deg)';
            } else {
                detalleel.style.display = 'none';
                if (iconel) iconel.style.transform = 'rotate(0deg)';
            }
        }
    };

    window._abrirdetalleventasadmin = async function() {
        try {
            const hoy = new date(); hoy.sethours(0, 0, 0, 0);
            const manana = new date(hoy); manana.setdate(manana.getdate() + 1);
            const { data: ventashoy } = await window.supabaseclient.from('ventas').select('*').gte('fecha', hoy.toisostring()).lt('fecha', manana.toisostring());
            if (!ventashoy || ventashoy.length === 0) { window.mostrartoast('No hay ventas registradas hoy', 'info'); return; }
            const pedidoids = ventashoy.map(v => v.pedido_id);
            const { data: pedidoshoy } = await window.supabaseclient.from('pedidos').select('*').in('id', pedidoids);
            const tasa = window.configglobal?.tasa_cambio || window.configglobal?.tasa_efectiva || 400;
            const fmtbs = window.formatbs;
            const _netocobradopedido = (pedido) => {
                if (!pedido) return 0;
                if (pedido.metodo_pago === 'invitacion') return 0;
                let recibido = 0;
                if (pedido.pagos_mixtos && pedido.pagos_mixtos.length) {
                    pedido.pagos_mixtos.foreach(pg => {
                        if (pg.metodo === 'invitacion') return;
                        recibido += pg.metodo === 'efectivo_usd' ? (pg.monto || 0) * tasa : (pg.montobs || pg.monto || 0);
                    });
                } else { recibido = pedido.subtotal_bs || 0; }
                return math.max(0, recibido - (pedido.vuelto_entregado || 0));
            };
            let totalneto = 0, vt_ebs = 0, vt_eusd = 0, vt_pm = 0, vt_pv = 0, vt_cond = 0, vt_favor = 0, vt_delivery = 0, vt_inv_count = 0, vt_inv_acum = 0;
            ventashoy.foreach(v => {
                const p = pedidoshoy.find(pd => pd.id === v.pedido_id);
                if (!p) return;
                const neto = _netocobradopedido(p);
                totalneto += neto;
                if (p.condonado > 0) vt_cond += p.condonado;
                if (p.a_favor_caja > 0) vt_favor += p.a_favor_caja;
                if (p.tipo === 'delivery' && (p.costo_delivery_bs || 0) > 0) vt_delivery += p.costo_delivery_bs;
                const pagos = p.pagos_mixtos;
                if (pagos && pagos.length) {
                    let vueltor = p.vuelto_entregado || 0;
                    pagos.foreach(pg => {
                        const mbs = pg.metodo === 'efectivo_usd' ? (pg.monto || 0) * tasa : (pg.montobs || pg.monto || 0);
                        if (pg.metodo === 'efectivo_bs') { const n = math.max(0, mbs - vueltor); vueltor = math.max(0, vueltor - mbs); vt_ebs += n; }
                        else if (pg.metodo === 'efectivo_usd') { const n = math.max(0, mbs - vueltor); vueltor = math.max(0, vueltor - mbs); vt_eusd += n; }
                        else if (pg.metodo === 'pago_movil') vt_pm += mbs;
                        else if (pg.metodo === 'punto_venta') vt_pv += mbs;
                        else if (pg.metodo === 'invitacion') { vt_inv_count++; const subtotalinv = (p.items || []).reduce((s, i) => s + window.usdtobs((i.preciounitariousd || 0) * (i.cantidad || 1)), 0); vt_inv_acum += subtotalinv + (p.costo_delivery_bs || 0); }
                    });
                } else {
                    const metodo = p.metodo_pago || v.metodo_pago || '';
                    const bs = neto;
                    if (metodo === 'efectivo_bs') vt_ebs += bs;
                    else if (metodo === 'efectivo_usd') vt_eusd += bs;
                    else if (metodo === 'pago_movil') vt_pm += bs;
                    else if (metodo === 'punto_venta') vt_pv += bs;
                    else if (metodo === 'invitacion') { vt_inv_count++; const subtotalInv = (p.items || []).reduce((s, i) => s + window.usdToBs((i.precioUnitarioUSD || 0) * (i.cantidad || 1)), 0); vt_inv_acum += subtotalInv + (p.costo_delivery_bs || 0); }
                }
            });
            const vcol = (ico, label, val, color) => val > 0 ? `<div style="Display:flex;align-items:center;gap:6px;padding:8px;background:rgba(0,0,0,.08);border-radius:8px;border-left:3px solid ${color}">
                <i class="${ico}" style="Color:${color};width:14px;text-align:center"></i>
                <div style="Flex:1"><div style="Font-size:.72rem;color:var(--text-muted)">${label}</div><div style="Font-weight:700;color:${color};font-size:.9rem">${fmtBs(val)}</div></div>
            </div>` : '';
            const detallescobros = ventashoy.map(v => {
                const p = pedidoshoy.find(pd => pd.id === v.pedido_id);
                if (!p) return '';
                const hora = new date(p.fecha).tolocaletimestring('es-VE', { hour: '2-digit', minute: '2-digit', timezone: 'America/Caracas' });
                const items = (p.items || []).slice(0, 2).map(i => `${i.cantidad || 1}× ${i.nombre}`).join(', ');
                const masitems = (p.items || []).length > 2 ? ` +${(p.items || []).length - 2} más` : '';
                const neto = _netocobradopedido(p);
                const metodolabel = { efectivo_bs: 'Ef.Bs', efectivo_usd: 'Ef.USD', pago_movil: 'P.Móvil', punto_venta: 'Pto.Venta', invitacion: 'Invitación' };
                let metodostr = p.metodo_pago || 'N/A';
                if (p.pagos_mixtos && p.pagos_mixtos.length > 1) metodostr = p.pagos_mixtos.map(pg => metodolabel[pg.metodo] || pg.metodo).join(' + ');
                else metodostr = metodolabel[p.metodo_pago] || p.metodo_pago || 'N/A';
                return `<div style="Padding:.6rem .75rem;border-radius:8px;background:var(--table-header);margin-bottom:.4rem;font-size:.82rem">
                    <div style="Display:flex;justify-content:space-between;align-items:center;margin-bottom:.2rem">
                        <span style="Font-weight:700;color:var(--text-dark)">${hora} · ${p.tipo || 'Mesa'}</span>
                        <span style="Font-weight:800;color:var(--success)">${fmtBs(neto)}</span>
                    </div>
                    <div style="Color:var(--text-muted);font-size:.75rem">${items}${masItems}</div>
                    <div style="Font-size:.72rem;color:var(--text-muted);margin-top:.15rem">${metodoStr}</div>
                </div>`;
            }).join('');
            const contenido = `
                <div style="Margin-bottom:1rem;padding:.85rem;background:var(--table-header);border-radius:10px">
                    <div style="Display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
                        <span style="Font-weight:700;color:var(--text-dark)">Neto cobrado hoy</span>
                        <span style="Font-weight:800;color:var(--success);font-size:1.15rem">${fmtBs(totalNeto)}</span>
                    </div>
                    <div style="Display:flex;justify-content:space-between;color:var(--text-muted);font-size:.82rem">
                        <span>Pedidos cobrados</span><span style="Font-weight:600">${ventasHoy.length}</span>
                    </div>
                </div>
                <div style="Font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:.6rem">Desglose por método de pago</div>
                <div style="Display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1rem">
                    ${vcol('Fas fa-money-bill-wave', 'Efectivo bs', vt_ebs, 'Var(--success)')}
                    ${vcol('Fas fa-dollar-sign', 'Efectivo usd', vt_eusd, '#4CAF50')}
                    ${vcol('Fas fa-mobile-alt', 'Pago móvil', vt_pm, 'Var(--info)')}
                    ${vcol('Fas fa-credit-card', 'Punto de venta', vt_pv, 'Var(--warning)')}
                    ${vcol('Fas fa-motorcycle', 'Deliverys', vt_delivery, 'Var(--delivery)')}
                    ${vt_inv_count > 0 ? `<div style="Grid-column:1/-1;padding:8px;background:rgba(0,0,0,.06);border-radius:8px;border-left:3px solid var(--propina);font-size:.82rem">
                        <span style="Color:var(--propina);font-weight:700">🎁 Invitaciones: ${vt_inv_count}</span>
                        <span style="Color:var(--text-muted);font-size:.75rem;margin-left:.5rem">Valor real: ${fmtBs(vt_inv_acum)}</span>
                    </div>` : ''}
                    ${vcol('fas fa-hand-holding-heart', 'Condonado', vt_cond, '#E91E63')}
                    ${vcol('fas fa-piggy-bank', 'A favor de caja', vt_favor, 'var(--accent)')}
                </div>
                ${detallesCobros ? `<div style="Font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:.6rem">Detalle por cobro</div>${detallesCobros}` : ''}`;
            const modal = document.createelement('div');
            modal.style.csstext = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
            modal.innerHTML = `<div style="Background:var(--card-bg);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.35)">
                <div style="Display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;border-bottom:2px solid var(--border);position:sticky;top:0;background:var(--card-bg);z-index:1">
                    <h3 style="Font-size:1rem;font-weight:700;color:var(--text-dark)"><i class="Fas fa-chart-line" style="Color:var(--accent);margin-right:.5rem"></i>Ventas Hoy — Neto Cobrado</h3>
                    <button onclick="this.closest('[style*=fixed]').remove()" Style="background:var(--table-header);border:none;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:.9rem;color:var(--text-muted)">✕</button>
                </div>
                <div style="padding:1.25rem">${contenido}</div>
                <div class="modal-footer" Style="padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
                    <button onclick="this.closest('[style*=fixed]').remove()" Class="btn-primary" Style="padding:.5rem 1.2rem;font-size:.85rem">Cerrar</button>
                </div>
            </div>`;
            modal.addEventListener('Click', e => { if (e.target === modal) modal.remove(); });
            document.body.appendChild(modal);
        } catch (e) { console.error('Error abriendo detalle ventas admin:', e); window.mostrarToast('❌ error al cargar el detalle de ventas', 'Error'); }
    };
})();