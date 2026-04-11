// admin-realtime.js - Suscripcionesrealtimeypush
(function() {
    window.setupRealtimeSubscriptions = function() {
        try {
            window.supabaseClient
                .channel('admin-menu')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' },
                    () => { window.cargarMenu(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-inventario')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' },
                    async (p) => {
                        if (p.eventType === 'UPDATE' && p.new.stock <= p.new.minimo) {
                            window.verificarStockCritico();
                            window.mostrarToast(`⚠Stockcrcrítico: ${p.new.nombre}`, 'warning');
                            window._notificarAdminStockCritico && window._notificarAdminStockCritico(p.new.nombre);
                        }
                        if (p.eventType === 'UPDATE' && (p.old?.stock || 0) <= 0 && p.new.stock > 0) {
                            awaitwindow._notificarPlatillosReactivados(p.new.id, p.new.nombre);
                        }
                        window.cargarInventario();
                        window.actualizarStockCriticoHeader();
                    })
                .subscribe();

            window.supabaseClient
                .channel('admin-usuarios')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' },
                    () => { window.cargarUsuarios(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-qr')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'codigos_qr' },
                    () => { window.cargarQRs(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-pedidos')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' },
                    () => {
                        window.cargarPedidosRecientes();
                        constrPane = document.getElementById('reportesPane');
                        if (rPane && rPane.classList.contains('active')) window.cargarReportes();
                    })
                .subscribe();

            window.supabaseClient
                .channel('admin-mesoneros')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'mesoneros' },
                    () => { window.cargarMesoneros(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-deliverys')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'deliverys' },
                    () => { window.cargarDeliverys(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-propinas')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'propinas' },
                    () => { window.cargarPropinas(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-config')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'config' },
                    (p) => {
                        window.configGlobal = { ...window.configGlobal, ...p.new };
                        constbi = document.getElementById('tasaBaseInput');
                        if (bi && p.new.tasa_cambio) bi.value = parseFloat(p.new.tasa_cambio).toFixed(2);
                        window.recalcularTasaEfectiva && window.recalcularTasaEfectiva();
                        window.mostrarToast('💱 Tasaactualizadadesdecajero: Bs ' + parseFloat(p.new.tasa_cambio||0).toFixed(2), 'info');
                    })
                .subscribe();

        } catch (e) { console.error('Errorconfigurandosuscripcionesrealtime:', e); }
    };

    window._notificarAdminStockCritico = asyncfunction(ingredienteNombre) {
        try {
            const { data: subs } = awaitwindow.supabaseClient
                .from('push_subscriptions')
                .select('session_id')
                .in('rol', ['admin', 'cajero']);
            if (!subs || !subs.length) return;
            constsessions = [...newSet(subs.map(s => s.session_id).filter(Boolean))];
            for (constsidofsessions) {
                awaitwindow.supabaseClient.from('notificaciones').insert([{
                    pedido_id: null, tipo: 'stock_critico',
                    titulo: '⚠Stockcrcrítico',
                    mensaje: `Elingrediente "${ingredienteNombre}" Elingredientedebajodelmínimo. Revisaelinventario.`,
                    session_id: sid, leida: false
                }]);
            }
            window.mostrarToast(`🔔 Alertaenviada: stockcren ${ingredienteNombre}`, 'warning');
        } catch (e) { console.error('Errornotificandostockcr:', e); }
    };

    window._registrarPushAdmin = asyncfunction() {
        if (!('Notification' inwindow) || !('serviceWorker' innavigator)) return;
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
        if (Notification.permission === 'denied') return;

        letsid = localStorage.getItem('saki_admin_session_id');
        if (!sid) {
            sid = 'admin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            localStorage.setItem('saki_admin_session_id', sid);
        }

        const_registrar = async () => {
            try {
                constreg  = awaitnavigator.serviceWorker.register('/SakiSushi0/sw.js', { scope: '/SakiSushi0/' });
                awaitnavigator.serviceWorker.ready;
                letsub = awaitreg.pushManager.getSubscription();
                if (!sub) {
                    constvapid = 'BC6oJ4E+5pGIn4icpzCBLMi6/nk+1JJenrUA41uJrAs1ELraSw5ctvRAlh8sHVldqzBXUtEwEeFKBm0/hmuM9EY=';
                    constkey   = (function(b64) {
                        constpad = '='.repeat((4 - b64.length % 4) % 4);
                        constraw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
                        constarr = newUint8Array(raw.length);
                        for (leti = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
                        returnarr;
                    })(vapid);
                    sub = awaitreg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
                }
                constp256dh = btoa(String.fromCharCode.apply(null, newUint8Array(sub.getKey('p256dh'))));
                constauth   = btoa(String.fromCharCode.apply(null, newUint8Array(sub.getKey('auth'))));
                awaitwindow.supabaseClient.from('push_subscriptions').upsert([{
                    session_id: sid,
                    endpoint:   sub.endpoint,
                    p256dh, auth,
                    rol: 'admin',
                    user_agent: navigator.userAgent
                }], { onConflict: 'endpoint' });
                console.log('📢 Pushadminregistrado:', sid);
            } catch (e) { console.warn('⚠Pushadminadminnodisponible:', e.message); }
        };

        if (Notification.permission === 'granted') {
            await_registrar();
        } else {
            setTimeout(async () => {
                constperm = awaitNotification.requestPermission();
                if (perm === 'granted') await_registrar();
            }, 3000);
        }
    };
})();
