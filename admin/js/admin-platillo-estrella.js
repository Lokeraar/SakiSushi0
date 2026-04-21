// admin-platillo-estrella.js - Carrusel visual del Top 5 de platillos más vendidos
(function() {
    // Variables globales para el carrusel
    window.platillosTop5 = [];
    window.platilloCarouselIndex = 0;
    window.platilloCarouselInterval = null;
    window.CAROUSEL_INTERVAL_MS = 4000; // 4 segundos por platillo

    // Función principal para cargar datos del Platillo Estrella
    window.cargarPlatilloEstrella = async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('vista_platillo_estrella')
                .select('*')
                .order('posicion', { ascending: true });

            if (error) throw error;

            window.platillosTop5 = data || [];
            
            if (window.platillosTop5.length === 0) {
                mostrarSinVentas();
                return;
            }

            // Iniciar el carrusel con el primer platillo
            window.platilloCarouselIndex = 0;
            actualizarCardPlatilloEstrella();
            iniciarCarruselAutomatico();

        } catch (e) {
            console.error('Error cargando Platillo Estrella:', e);
            mostrarSinVentas();
        }
    };

    // Mostrar mensaje cuando no hay ventas
    function mostrarSinVentas() {
        const imgEl = document.getElementById('platilloEstrellaImg');
        const tituloEl = document.getElementById('platilloEstrellaTitulo');
        const descEl = document.getElementById('platilloEstrellaDesc');
        const ordenesEl = document.getElementById('platilloEstrellaOrdenes');
        const precioUsdEl = document.getElementById('platilloEstrellaPrecioUsd');
        const precioBsEl = document.getElementById('platilloEstrellaPrecioBs');

        if (imgEl) imgEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="70" viewBox="0 0 200 70"%3E%3Crect width="200" height="70" fill="%232a2a3e"/%3E%3Ctext x="100" y="40" font-size="14" text-anchor="middle" fill="%23888" font-family="Arial"%3ESin ventas esta semana%3C/text%3E%3C/svg%3E';
        if (tituloEl) tituloEl.textContent = 'Sin actividad';
        if (descEl) descEl.textContent = 'No hay ventas registradas esta semana';
        if (ordenesEl) ordenesEl.textContent = '0';
        if (precioUsdEl) precioUsdEl.textContent = '0.00';
        if (precioBsEl) precioBsEl.textContent = '0,00';

        detenerCarruselAutomatico();
    }

    // Actualizar la tarjeta con los datos del platillo actual
    function actualizarCardPlatilloEstrella() {
        if (!window.platillosTop5 || window.platillosTop5.length === 0) {
            mostrarSinVentas();
            return;
        }

        const platillo = window.platillosTop5[window.platilloCarouselIndex];
        
        const imgEl = document.getElementById('platilloEstrellaImg');
        const tituloEl = document.getElementById('platilloEstrellaTitulo');
        const descEl = document.getElementById('platilloEstrellaDesc');
        const ordenesEl = document.getElementById('platilloEstrellaOrdenes');
        const precioUsdEl = document.getElementById('platilloEstrellaPrecioUsd');
        const precioBsEl = document.getElementById('platilloEstrellaPrecioBs');

        if (imgEl) {
            imgEl.src = platillo.imagen || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="70" viewBox="0 0 200 70"%3E%3Crect width="200" height="70" fill="%232a2a3e"/%3E%3Ctext x="100" y="40" font-size="14" text-anchor="middle" fill="%23888" font-family="Arial"%3ESin imagen%3C/text%3E%3C/svg%3E';
        }
        if (tituloEl) {
            tituloEl.textContent = platillo.platillo_nombre || 'Sin nombre';
        }
        if (descEl) {
            descEl.textContent = `#${platillo.posicion} - Top Ventas Semanales`;
        }
        if (ordenesEl) {
            ordenesEl.textContent = platillo.total_cantidad || 0;
        }
        if (precioUsdEl) {
            precioUsdEl.textContent = (parseFloat(platillo.total_usd) || 0).toFixed(2);
        }
        if (precioBsEl) {
            precioBsEl.textContent = window.formatBs(parseFloat(platillo.total_bs) || 0);
        }

        // Animación de deslizamiento suave
        aplicarAnimacionDeslizamiento();
    }

    // Aplicar animación CSS de deslizamiento
    function aplicarAnimacionDeslizamiento() {
        const card = document.getElementById('platilloEstrellaCard');
        if (!card) return;

        // Remover y re-agregar clase para reiniciar animación
        card.style.opacity = '0.7';
        card.style.transform = 'scale(0.98)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }, 50);
    }

    // Iniciar carrusel automático
    function iniciarCarruselAutomatico() {
        detenerCarruselAutomatico(); // Limpiar intervalo existente si hay
        
        if (window.platillosTop5.length <= 1) return; // No necesita carrusel si solo hay 1

        window.platilloCarouselInterval = setInterval(() => {
            window.platilloCarouselIndex = (window.platilloCarouselIndex + 1) % window.platillosTop5.length;
            actualizarCardPlatilloEstrella();
        }, window.CAROUSEL_INTERVAL_MS);
    }

    // Detener carrusel automático
    function detenerCarruselAutomatico() {
        if (window.platilloCarouselInterval) {
            clearInterval(window.platilloCarouselInterval);
            window.platilloCarouselInterval = null;
        }
    }

    // Navegación manual (opcional - se puede activar con clicks laterales)
    window.siguientePlatillo = function() {
        if (!window.platillosTop5 || window.platillosTop5.length === 0) return;
        window.platilloCarouselIndex = (window.platilloCarouselIndex + 1) % window.platillosTop5.length;
        actualizarCardPlatilloEstrella();
        reiniciarCarruselTrasInteraccion();
    };

    window.anteriorPlatillo = function() {
        if (!window.platillosTop5 || window.platillosTop5.length === 0) return;
        window.platilloCarouselIndex = (window.platilloCarouselIndex - 1 + window.platillosTop5.length) % window.platillosTop5.length;
        actualizarCardPlatilloEstrella();
        reiniciarCarruselTrasInteraccion();
    };

    // Reiniciar el temporizador tras interacción manual
    function reiniciarCarruselTrasInteraccion() {
        detenerCarruselAutomatico();
        setTimeout(() => {
            iniciarCarruselAutomatico();
        }, window.CAROUSEL_INTERVAL_MS);
    }

    // Función para redirigir a Reportes
    window.verAnaliticaPlatilloEstrella = function() {
        // Cambiar a la pestaña de Reportes
        const tabReportes = document.querySelector('.tab[data-tab="reportes"]');
        if (tabReportes) {
            // Simular click en la pestaña
            tabReportes.click();
        }
        
        // Mostrar toast informativo
        window.mostrarToast('Viendo analítica completa en Reportes', 'info');
    };

    // Event listeners para navegación manual (si se agregan botones en el futuro)
    document.addEventListener('DOMContentLoaded', function() {
        // Cargar datos al iniciar
        setTimeout(() => {
            if (window.supabaseClient) {
                window.cargarPlatilloEstrella();
            }
        }, 1000);
    });

    // Re-cargar cuando se cambia a la pestaña dashboard
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('tab') && e.target.dataset.tab === 'dashboard') {
            setTimeout(() => {
                window.cargarPlatilloEstrella();
            }, 300);
        }
    });

})();
