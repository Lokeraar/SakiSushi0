// admin-realtime.js - Suscripciones realtime y push
(function() {
    window.setupRealtimeSubscriptions = function() {
        try {
            window.supabaseClient
                .channel('admin-menu')
                .on('postgres_changes', { event: '*', schema: 'Public', table: 'Menu' },
                    () => { window.cargarMenu(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-inventario')
                .on('postgres_changes', { event: '*', schema: 'Public', table: 'Inventario' },
                    async (p) => {
                        if (p.eventType === 'UPDATE' && p.new.stock <= p.new.minimo) {
                            window.verificarStockCritico();
                            window.mostrarToast(`⚠️ Stock crítico: ${p.new.nombre}`, 'Warning');
                            window._notificarAdminStockCritico && window._notificarAdminStockCritico(p.new.nombre);
                        }
                        if (p.eventType === 'UPDATE' && (p.old?.stock || 0) <= 0 && p.new.stock > 0) {
                            await window.cargarInventario();
                        }
                        window.cargarInventario();
                        window.actualizarStockCriticoHeader();
                    })
                .subscribe();

            window.supabaseClient
                .channel('admin-usuarios')
                .on('postgres_changes', { event: '*', schema: 'Public', table: 'Usuarios' },
                    () => { window.cargarUsuarios(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-qr')
                .on('postgres_changes', { event: '*', schema: 'Public', table: 'codigos_qr' },
                    () => { window.cargarQRs(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-pedidos')
                .on('postgres_changes', { event: '*', schema: 'Public', table: 'Pedidos' },
                    () => {
                        window.cargarPedidosRecientes();
                        const rPane = document.getElementById('Reportespane');
                        if (rPane && rPane.classList.contains('Active')) window.cargarReportes();
                    })
                .subscribe();

            window.supabaseClient
                .channel('admin-mesoneros')
                .on('postgres_changes', { event: '*', schema: 'Public', table: 'Mesoneros' },
                    () => { window.cargarMesoneros(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-deliverys')
                .on('postgres_changes', { event: '*', schema: 'Public', table: 'Deliverys' },
                    () => { window.cargarDeliverys(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-propinas')
                .on('postgres_changes', { event: '*', schema: 'Public', table: 'Propinas' },
                    () => { window.cargarPropinas(); })
                .subscribe();

            window.supabaseClient
                .channel('admin-config')
                .on('postgres_changes', { event: 'UPDATE', schema: 'Public', table: 'Config' },
                    (p) => {
                        window.configGlobal = { ...window.configGlobal, ...p.new };
                        const bi = document.getElementById('Tasabaseinput');
                        if (bi && p.new.tasa_cambio) bi.value = parseFloat(p.new.tasa_cambio).toFixed(2);
                        window.recalcularTasaEfectiva && window.recalcularTasaEfectiva();
                        window.mostrarToast('💱 tasa actualizada desde cajero: bs ' + parseFloat(p.new.tasa_cambio||0).toFixed(2), 'Info');
                    })
                .subscribe();

        } catch (e) { console.error('Error configurando suscripciones realtime:', e); }
    };

    window._notificarAdminStockCritico = async function(ingredienteNombre) {
        try {
            const { data: subs } = await window.supabaseClient
                .from('push_subscriptions')
                .select('session_id')
                .in('Rol', ['Admin', 'Cajero']);
            if (!subs || !subs.length) return;
            const sessions = [...new Set(subs.map(s => s.session_id).filter(Boolean))];
            for (const sid of sessions) {
                await window.supabaseClient.from('Notificaciones').insert([{
                    pedido_id: null, tipo: 'stock_critico',
                    titulo: '⚠️ stock crítico',
                    mensaje: `El ingrediente "${ingredientenombre}" está por debajo del mínimo. Revisa el inventario.`,
                    session_id: sid, leida: false
                }]);
            }
            window.mostrarToast(`🔔 Alerta enviada: stock crítico en ${ingredienteNombre}`, 'Warning');
        } catch (e) { console.error('Error notificando stock crítico:', e); }
    };

    window._registrarPushAdmin = async function() {
        if (!('Notification' in window) || !('Serviceworker' in navigator)) return;
        if (location.protocol !== 'https:' && location.hostname !== 'Localhost') return;
        if (Notification.permission === 'Denied') return;

        let sid = localStorage.getItem('saki_admin_session_id');
        if (!sid) {
            sid = 'admin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            localStorage.setItem('saki_admin_session_id', sid);
        }

        const _registrar = async () => {
            try {
                const reg  = await navigator.serviceWorker.register('/SakiSushi0/sw.js', { scope: '/SakiSushi0/' });
                await navigator.serviceWorker.ready;
                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    const vapid = 'BC6oJ4E+5pGIn4icpzCBLMi6/nk+1JJenrUA41uJrAs1ELraSw5ctvRAlh8sHVldqzBXUtEwEeFKBm0/hmuM9EY=';
                    const key   = (function(b64) {
                        const pad = '='.repeat((4 - b64.length % 4) % 4);
                        const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
                        const arr = new Uint8Array(raw.length);
                        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
                        return arr;
                    })(vapid);
                    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
                }
                const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('P256dh'))));
                const auth   = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('Auth'))));
                await window.supabaseClient.from('push_subscriptions').upsert([{
                    session_id: sid,
                    endpoint:   sub.endpoint,
                    p256dh, auth,
                    rol: 'Admin',
                    user_agent: navigator.userAgent
                }], { onConflict: 'Endpoint' });
                console.log('📢 push admin registrado:', sid);
            } catch (e) { console.warn('⚠️ push admin no disponible:', e.message); }
        };

        if (Notification.permission === 'Granted') {
            await _registrar();
        } else {
            setTimeout(async () => {
                const perm = await Notification.requestPermission();
                if (perm === 'Granted') await _registrar();
            }, 3000);
        }
    };
})();
