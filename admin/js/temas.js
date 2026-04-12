/**
 * SAKI SUSHI — Sistema de Gestión de Temas
 * Controla el cambio entre tema claro y oscuro
 */

(function() {
  'use strict';

  const THEME_KEY = 'saki-theme-preference';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';

  /**
   * Obtiene el tema guardado o el preferido del sistema
   */
  function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? DARK_THEME 
      : LIGHT_THEME;
  }

  /**
   * Aplica el tema al documento HTML
   */
  function applyTheme(theme) {
    if (theme === DARK_THEME) {
      document.documentElement.setAttribute('data-theme', DARK_THEME);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    updateThemeButtons(theme);
  }

  /**
   * Actualiza el icono de todos los botones de tema
   */
  function updateThemeButtons(theme) {
    const themeButtons = document.querySelectorAll('.theme-toggle, .theme-toggle-simple');
    themeButtons.forEach(button => {
      if (theme === DARK_THEME) {
        button.innerHTML = '<i class="fas fa-sun"></i>';
        button.setAttribute('aria-label', 'Cambiar a tema claro');
      } else {
        button.innerHTML = '<i class="fas fa-moon"></i>';
        button.setAttribute('aria-label', 'Cambiar a tema oscuro');
      }
    });
  }

  /**
   * Alterna entre tema claro y oscuro
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    setTheme(newTheme);
  }

  /**
   * Establece el tema y lo guarda en localStorage
   */
  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    showToast(`Tema ${theme === DARK_THEME ? 'oscuro' : 'claro'} activado`);
  }

  /**
   * Muestra una notificación toast temporal
   */
  function showToast(message) {
    // Si existe un sistema de toasts, úsalo
    if (typeof showSuccessToast === 'function') {
      showSuccessToast(message);
    } else {
      // Fallback básico
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--bg-modal, #1a1a1a);
        color: var(--text-primary, #fff);
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease;
      `;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
  }

  /**
   * Inicializa el sistema de temas
   */
  function initTheme() {
    const theme = getPreferredTheme();
    applyTheme(theme);

    // Escuchar cambios en la preferencia del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? DARK_THEME : LIGHT_THEME);
      }
    });

    // Agregar event listeners a los botones de tema
    document.addEventListener('DOMContentLoaded', () => {
      const themeButtons = document.querySelectorAll('.theme-toggle, .theme-toggle-simple');
      themeButtons.forEach(button => {
        button.addEventListener('click', toggleTheme);
      });
    });
  }

  // Iniciar inmediatamente
  initTheme();

  // Exponer funciones globalmente si se necesitan
  window.SakiTheme = {
    toggle: toggleTheme,
    set: setTheme,
    get: getPreferredTheme
  };

})();
