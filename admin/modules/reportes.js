import { supabase } from '../services/supabaseClient.js';
import { showToast } from '../utils/toast.js';
import { formatBs, formatUSD, usdToBs } from '../utils/formatters.js';

export function reportesComponent() {
  return {
    desde: '',
    hasta: '',
    pedidos: [],
    ventasDia: { usd: 0, bs: 0 },
    ventasSemana: { usd: 0, bs: 0 },
    ticketPromedio: { usd: 0, bs: 0 },
    platilloTop: '-',
    charts: {},
    isLoading: false,

    async init() {
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
      this.desde = primerDiaMes;
      this.hasta = hoy.toISOString().split('T')[0];
      await this.cargarReportes();
    },

    async cargarReportes() {
      if (!this.desde || !this.hasta) {
        showToast('Seleccione rango de fechas', 'error');
        return;
      }
      this.isLoading = true;
      try {
        const desdeDate = new Date(this.desde);
        desdeDate.setHours(0, 0, 0, 0);
        const hastaDate = new Date(this.hasta);
        hastaDate.setHours(23, 59, 59, 999);
        const { data, error } = await supabase
          .from('pedidos')
          .select('*')
          .in('estado', ['cobrado', 'entregado', 'enviado', 'reserva_completada'])
          .gte('fecha', desdeDate.toISOString())
          .lte('fecha', hastaDate.toISOString())
          .order('fecha', { ascending: false });
        if (error) throw error;
        this.pedidos = data || [];
        this.calcularEstadisticas();
        this.actualizarGraficos();
      } catch (err) {
        showToast('Error cargando reportes: ' + err.message, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    calcularEstadisticas() {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const semanaAtras = new Date(hoy);
      semanaAtras.setDate(semanaAtras.getDate() - 7);
      const ventasDia = this.pedidos.filter(p => new Date(p.fecha) >= hoy)
        .reduce((s, p) => s + (p.total || 0), 0);
      const ventasSemana = this.pedidos.filter(p => new Date(p.fecha) >= semanaAtras)
        .reduce((s, p) => s + (p.total || 0), 0);
      const ticketPromedio = this.pedidos.length ? this.pedidos.reduce((s, p) => s + (p.total || 0), 0) / this.pedidos.length : 0;
      const tasa = window.configGlobal?.tasa_efectiva || 400;
      this.ventasDia = { usd: ventasDia, bs: ventasDia * tasa };
      this.ventasSemana = { usd: ventasSemana, bs: ventasSemana * tasa };
      this.ticketPromedio = { usd: ticketPromedio, bs: ticketPromedio * tasa };
      // Platillo top
      const platillosCount = {};
      this.pedidos.forEach(p => {
        if (p.items) {
          p.items.forEach(item => {
            platillosCount[item.nombre] = (platillosCount[item.nombre] || 0) + (item.cantidad || 0);
          });
        }
      });
      let maxCount = 0;
      let topPlatillo = '-';
      for (const [nombre, count] of Object.entries(platillosCount)) {
        if (count > maxCount) {
          maxCount = count;
          topPlatillo = nombre;
        }
      }
      this.platilloTop = topPlatillo;
    },

    actualizarGraficos() {
      // Ventas por día últimos 7 días
      const ventasPorDia = {};
      for (let i = 6; i >= 0; i--) {
        const f = new Date();
        f.setDate(f.getDate() - i);
        ventasPorDia[f.toISOString().split('T')[0]] = 0;
      }
      this.pedidos.forEach(p => {
        const fecha = new Date(p.fecha).toISOString().split('T')[0];
        if (ventasPorDia.hasOwnProperty(fecha)) {
          ventasPorDia[fecha] += p.total || 0;
        }
      });
      this.destroyChart('ventasChart');
      const ctxVentas = document.getElementById('ventasChart')?.getContext('2d');
      if (ctxVentas) {
        this.charts.ventas = new Chart(ctxVentas, {
          type: 'line',
          data: {
            labels: Object.keys(ventasPorDia),
            datasets: [{ label: 'Ventas (USD)', data: Object.values(ventasPorDia), borderColor: '#D32F2F', backgroundColor: 'rgba(211,47,47,0.1)', tension: 0.1 }]
          }
        });
      }

      // Ventas por categoría
      const categorias = {};
      this.pedidos.forEach(p => {
        if (p.items) {
          p.items.forEach(item => {
            const platillo = window.menuItems?.find(m => m.nombre === item.nombre);
            const cat = platillo?.categoria || 'Otros';
            categorias[cat] = (categorias[cat] || 0) + ((item.precioUnitarioUSD || 0) * (item.cantidad || 0));
          });
        }
      });
      this.destroyChart('categoriasChart');
      const ctxCat = document.getElementById('categoriasChart')?.getContext('2d');
      if (ctxCat) {
        this.charts.categorias = new Chart(ctxCat, {
          type: 'doughnut',
          data: {
            labels: Object.keys(categorias),
            datasets: [{ data: Object.values(categorias), backgroundColor: ['#D32F2F', '#FF9800', '#1976D2', '#388E3C', '#F57C00', '#6c757d'] }]
          }
        });
      }

      // Métodos de pago
      const metodos = {};
      this.pedidos.forEach(p => {
        if (p.pagos_mixtos) {
          p.pagos_mixtos.forEach(pago => {
            metodos[pago.metodo] = (metodos[pago.metodo] || 0) + (pago.monto || 0);
          });
        } else if (p.metodo_pago) {
          metodos[p.metodo_pago] = (metodos[p.metodo_pago] || 0) + (p.total || 0);
        }
      });
      const labelsMetodos = Object.keys(metodos).map(m => {
        const n = { efectivo_bs: 'Efectivo Bs', efectivo_usd: 'Efectivo USD', pago_movil: 'Pago Móvil', punto_venta: 'Punto de Venta', mixto: 'Mixto', invitacion: 'Invitación' };
        return n[m] || m;
      });
      const dataMetodos = Object.values(metodos).map(v => v / (window.configGlobal?.tasa_efectiva || 400));
      this.destroyChart('pagosChart');
      const ctxPagos = document.getElementById('pagosChart')?.getContext('2d');
      if (ctxPagos) {
        this.charts.pagos = new Chart(ctxPagos, {
          type: 'bar',
          data: { labels: labelsMetodos, datasets: [{ label: 'Monto (USD)', data: dataMetodos, backgroundColor: '#1976D2' }] }
        });
      }

      // Ventas por hora
      const horas = {};
      for (let i = 0; i < 24; i++) horas[i] = 0;
      this.pedidos.forEach(p => {
        const h = new Date(p.fecha).getHours();
        horas[h] += p.total || 0;
      });
      this.destroyChart('horaChart');
      const ctxHora = document.getElementById('horaChart')?.getContext('2d');
      if (ctxHora) {
        this.charts.hora = new Chart(ctxHora, {
          type: 'bar',
          data: { labels: Object.keys(horas).map(h => `${h}:00`), datasets: [{ label: 'Ventas (USD)', data: Object.values(horas), backgroundColor: '#FF9800' }] }
        });
      }
    },

    destroyChart(id) {
      if (this.charts[id]) {
        this.charts[id].destroy();
        delete this.charts[id];
      }
    },

    formatBs,
    formatUSD,
    usdToBs
  };
}