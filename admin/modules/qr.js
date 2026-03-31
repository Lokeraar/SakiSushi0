import { supabase } from '../services/supabaseClient.js';
import { subscribe } from '../services/realtimeManager.js';
import { showToast } from '../utils/toast.js';
import { debounce } from '../utils/debounce.js';

export function qrComponent() {
  return {
    qrs: [],
    nuevaMesa: '',
    wifiSsid: '',
    wifiPassword: '',
    isLoading: false,
    qrModalVisible: false,
    qrModalUrl: '',
    qrModalNombre: '',

    async init() {
      await this.cargarQRs();
      subscribe('codigos_qr', () => this.cargarQRs());
      this.wifiSsid = localStorage.getItem('saki_wifi_ssid') || '';
      this.wifiPassword = localStorage.getItem('saki_wifi_pwd') || '';
    },

    async cargarQRs() {
      this.isLoading = true;
      try {
        const { data, error } = await supabase
          .from('codigos_qr')
          .select('*')
          .order('fecha', { ascending: false });
        if (error) throw error;
        this.qrs = data || [];
      } catch (err) {
        showToast('Error cargando QRs: ' + err.message, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    async generarQR() {
      if (!this.nuevaMesa.trim()) {
        showToast('Ingrese el nombre de la mesa', 'error');
        return;
      }
      if (this.wifiSsid && !this.wifiPassword) {
        showToast('Si agregas WiFi, también debes poner la contraseña', 'error');
        return;
      }
      // Guardar WiFi en localStorage
      localStorage.setItem('saki_wifi_ssid', this.wifiSsid);
      localStorage.setItem('saki_wifi_pwd', this.wifiPassword);
      try {
        const newId = crypto.randomUUID ? crypto.randomUUID() : 'QR_' + Date.now();
        const { error } = await supabase
          .from('codigos_qr')
          .insert([{
            id: newId,
            nombre: this.nuevaMesa.trim(),
            fecha: new Date().toISOString()
          }]);
        if (error) throw error;
        showToast('QR generado', 'success');
        this.nuevaMesa = '';
        await this.cargarQRs();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    async eliminarQR(id) {
      if (!confirm('¿Eliminar este código QR?')) return;
      try {
        await supabase.from('codigos_qr').delete().eq('id', id);
        showToast('QR eliminado', 'success');
        await this.cargarQRs();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    },

    abrirQR(qr) {
      const params = new URLSearchParams({ mesa: qr.nombre });
      if (this.wifiSsid) params.set('wifi_ssid', this.wifiSsid);
      if (this.wifiPassword) params.set('wifi_pwd', this.wifiPassword);
      this.qrModalUrl = window.location.origin + '/SakiSushi0/Cliente/index.html?' + params.toString();
      this.qrModalNombre = qr.nombre;
      this.qrModalVisible = true;
      setTimeout(() => {
        const container = document.getElementById('qrAmpliado');
        if (container && window.QRCode) {
          container.innerHTML = '';
          new QRCode(container, { text: this.qrModalUrl, width: 300, height: 300 });
        }
      }, 100);
    },

    cerrarModal() {
      this.qrModalVisible = false;
    },

    guardarWifi() {
      localStorage.setItem('saki_wifi_ssid', this.wifiSsid);
      localStorage.setItem('saki_wifi_pwd', this.wifiPassword);
      showToast('Datos WiFi guardados', 'success');
    },

    debouncedSearch: debounce(function() {}, 300)
  };
}