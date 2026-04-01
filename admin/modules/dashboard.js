import { supabase } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';
import { formatBs, formatUSD, usdToBs } from '../utils/formatters.js';

export function dashboardComponent() {
  return {
    // Datos
    ventasHoy: { usd: 0, bs: 0 },
    deliverysHoy: 0,
    propinasHoy: 0,
    stockCritico: [],
    pedidosRecientes: [],
    // Tasa config
    tasaBase: 400,
    aumentoDiario: 0,
    aumentoActivo: false,
    aumentoSemanal: false,
    aumentoDesde: '',
    aumentoHasta: '',
    aumentoIndefinido: false,
    aumentoAcumulado: 0,
    tasaEfectiva: 400,
    loading: false,
    productosActivos: 0,

    async init() {
      console.log('🔧 Dashboard component iniciado');
      await this.cargarTodosLosDatos();

      // Suscripciones en tiempo real
      subscribe('config', (payload) => {
        if (payload.eventType === 'UPDATE') {
          this.tasaBase = payload.new.tasa_cambio || 400;
          this.aumentoDiario = payload.new.aumento_diario || 0;
          this.aumentoActivo = payload.new.aumento_activo || false;
          this.aumentoSemanal = payload.new.aumento_semanal || false;
          this.aumentoDesde = payload.new.aumento_desde || '';
          this.aumentoHasta = payload.new.aumento_hasta || '';
          this.aumentoIndefinido = payload.new.aumento_indefinido || false;
          this.recalcularTasaEfectiva();
          this.tasaEfectiva = payload.new.tasa_efectiva || 400;
        }
      });
      subscribe('ventas', () => this.actualizarVentasHoy());
      subscribe('pedidos', () => {
        this.actualizarVentasHoy();
        this.actualizarDeliverysHoy();
        this.actualizarPedidosRecientes();
      });
      subscribe('propinas', () => this.actualizarPropinasHoy());
      subscribe('inventario', () => this.actualizarStockCritico());
      subscribe('menu', () => this.actualizarProductosActivos());

      // Escuchar evento de actualización de token para recargar datos
      window.addEventListener('supabase-token-updated', () => {
        console.log('Token actualizado, recargando dashboard');
        this.cargarTodosLosDatos();
      });
    },

    async cargarTodosLosDatos() {
      await this.cargarConfiguracion();
      await this.actualizarVentasHoy();
      await this.actualizarDeliverysHoy();
      await this.actualizarPropinasHoy();
      await this.actualizarStockCritico();
      await this.actualizarPedidosRecientes();
      await this.actualizarProductosActivos();
    },

    async cargarConfiguracion() {
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) return;
      this.tasaBase = data.tasa_cambio || 400;
      this.aumentoDiario = data.aumento_diario || 0;
      this.aumentoActivo = data.aumento_activo || false;
      this.aumentoSemanal = data.aumento_semanal || false;
      this.aumentoDesde = data.aumento_desde || '';
      this.aumentoHasta = data.aumento_hasta || '';
      this.aumentoIndefinido = data.aumento_indefinido || false;
      this.recalcularTasaEfectiva();
      this.tasaEfectiva = data.tasa_efectiva || 400;
    },

    recalcularTasaEfectiva() {
      let periodos = 0;
      const activo = this.aumentoActivo || this.aumentoSemanal;
      if (activo && this.aumentoDesde) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const desde = new Date(this.aumentoDesde + 'T00:00:00');
        let hasta = null;
        if (!this.aumentoIndefinido && this.aumentoHasta) {
          hasta = new Date(this.aumentoHasta + 'T00:00:00');
        }
        if (desde <= hoy) {
          const fin = hasta && hasta < hoy ? hasta : hoy;
          const msDia = 24 * 60 * 60 * 1000;
          const msPeriodo = this.aumentoSemanal ? 7 * msDia : msDia;
          const diffMs = fin - desde;
          periodos = Math.max(0, Math.floor(diffMs / msPeriodo) + 1);
        }
      }
      const aumentoAcum = periodos * (this.aumentoDiario || 0);
      this.aumentoAcumulado = aumentoAcum;
      this.tasaEfectiva = this.tasaBase * (1 + aumentoAcum / 100);
    },

    async guardarConfiguracion() {
      this.loading = true;
      try {
        await supabase.from('config').update({
          tasa_cambio: this.tasaBase,
          aumento_diario: this.aumentoDiario,
          aumento_activo: this.aumentoActivo,
          aumento_semanal: this.aumentoSemanal,
          aumento_desde: this.aumentoDesde || null,
          aumento_hasta: (!this.aumentoIndefinido && this.aumentoHasta) || null,
          aumento_indefinido: this.aumentoIndefinido,
          aumento_acumulado: this.aumentoAcumulado,
          tasa_efectiva: this.tasaEfectiva,
          ultima_actualizacion: new Date().toISOString()
        }).eq('id', 1);
        showToast('Configuración guardada', 'success');
      } catch (err) {
        showToast('Error guardando configuración: ' + err.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    async actualizarVentasHoy() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      const { data: ventas, error } = await supabase
        .from('ventas')
        .select('pedido_id')
        .gte('fecha', hoy.toISOString())
        .lt('fecha', manana.toISOString());
      if (error) return;
      if (!ventas || ventas.length === 0) {
        this.ventasHoy = { usd: 0, bs: 0 };
        return;
      }
      const pedidoIds = ventas.map(v => v.pedido_id);
      const { data: pedidos, error: pedErr } = await supabase
        .from('pedidos')
        .select('*')
        .in('id', pedidoIds);
      if (pedErr) return;

      let netoBs = 0;
      pedidos.forEach(p => {
        netoBs += this._netoCobradoPedido(p);
      });
      const netoUSD = netoBs / this.tasaEfectiva;
      this.ventasHoy = { usd: netoUSD, bs: netoBs };
    },

    async actualizarDeliverysHoy() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      const { data, error } = await supabase
        .from('pedidos')
        .select('costo_delivery_bs')
        .eq('tipo', 'delivery')
        .eq('estado', 'enviado')
        .gte('fecha', hoy.toISOString())
        .lt('fecha', manana.toISOString());
      if (error) return;
      this.deliverysHoy = (data || []).reduce((s, p) => s + (p.costo_delivery_bs || 0), 0);
    },

    async actualizarPropinasHoy() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      const { data, error } = await supabase
        .from('propinas')
        .select('monto_bs')
        .gte('fecha', hoy.toISOString())
        .lt('fecha', manana.toISOString());
      if (error) return;
      this.propinasHoy = (data || []).reduce((s, p) => s + (p.monto_bs || 0), 0);
    },

    async actualizarStockCritico() {
      const { data, error } = await supabase
        .from('inventario')
        .select('id, nombre, stock, reservado, minimo');
      if (error) return;
      this.stockCritico = (data || []).filter(i => {
        const disponible = (i.stock || 0) - (i.reservado || 0);
        return disponible <= (i.minimo || 0) && i.minimo > 0;
      });
    },

    async actualizarPedidosRecientes() {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(5);
      if (error) return;
      this.pedidosRecientes = data || [];
    },

    async actualizarProductosActivos() {
      const { data, error } = await supabase
        .from('menu')
        .select('id, disponible');
      if (error) return;
      this.productosActivos = (data || []).filter(m => m.disponible === true).length;
    },

    _netoCobradoPedido(pedido) {
      if (!pedido) return 0;
      if (pedido.metodo_pago === 'invitacion') return 0;
      let recibido = 0;
      if (pedido.pagos_mixtos && pedido.pagos_mixtos.length) {
        pedido.pagos_mixtos.forEach(pg => {
          if (pg.metodo === 'invitacion') return;
          if (pg.metodo === 'efectivo_usd') {
            recibido += (pg.monto || 0) * this.tasaEfectiva;
          } else {
            recibido += (pg.montoBs || pg.monto || 0);
          }
        });
      } else {
        recibido = pedido.subtotal_bs || 0;
      }
      return Math.max(0, recibido - (pedido.vuelto_entregado || 0));
    },

    abrirDetalleVentas() {
      showToast('Detalle de ventas', 'info');
    },

    abrirDetallePropinas() {
      const tab = document.querySelector('.tab[data-tab="mesoneros"]');
      if (tab) tab.click();
    },

    abrirDetalleDeliverys() {
      const tab = document.querySelector('.tab[data-tab="deliverys"]');
      if (tab) tab.click();
    },

    irAIngrediente(id) {
      const tab = document.querySelector('.tab[data-tab="inventario"]');
      if (tab) tab.click();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('selectIngrediente', { detail: { id } }));
      }, 200);
    },

    abrirDetallePedido(pedidoId) {
      showToast('Pedido #' + pedidoId, 'info');
    },

    formatBs,
    formatUSD,
    usdToBs
  };
}
