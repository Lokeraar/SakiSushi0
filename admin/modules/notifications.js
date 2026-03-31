import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';

export function notificationsComponent() {
  return {
    init() {
      subscribe('notificaciones', (payload) => {
        if (payload.eventType === 'INSERT') {
          const n = payload.new;
          showToast(`${n.titulo}: ${n.mensaje}`, 'info');
        }
      });
      subscribe('pedidos', (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.estado === 'pendiente') {
          showToast('📦 Nuevo pedido pendiente', 'warning');
        }
      });
      subscribe('inventario', (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.stock <= payload.new.minimo) {
          showToast(`⚠️ Stock crítico: ${payload.new.nombre}`, 'warning');
        }
      });
    }
  };
}