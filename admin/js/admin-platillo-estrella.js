// admin-platillo-estrella.js - Carrusel visual del Top 5 de platillos más vendidos
(function() {
    // Variables globales para el carrusel
    window.platillosTop5 = [];
    window.platilloCarouselIndex = 0;
    window.platilloCarouselInterval = null;
    window.CAROUSEL_INTERVAL_MS = 4000; // 4 segundos por platillo
    window.isHoveringPlatillo = false;
    window.isTouchingPlatillo = false;
    
    // Función principal para cargar datos del Platillo Estrella (alias: cargarTopVentasCliente)
    window.cargarPlatilloEstrella = async function() {
        return window.cargarTopVentasCliente();
    };
    
    window.cargarTopVentasCliente = async function() {
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
            actualizarIndicadores();
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
        const badgeEl = document.getElementById('platilloBadgePosicion');
        const ordenesEl = document.getElementById('platilloEstrellaOrdenes');
        const totalUsdEl = document.getElementById('platilloEstrellaTotalUsd');
        const totalBsEl = document.getElementById('platilloEstrellaTotalBs');

        if (imgEl) {
            imgEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="70" viewBox="0 0 200 70"%3E%3Crect width="200" height="70" fill="%232a2a3e"/%3E%3Ctext x="100" y="40" font-size="14" text-anchor="middle" fill="%23888" font-family="Arial"%3ESin ventas esta semana%3C/text%3E%3C/svg%3E';
            imgEl.onerror = function() {
                this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="70" viewBox="0 0 200 70"%3E%3Crect width="200" height="70" fill="%232a2a3e"/%3E%3Ctext x="100" y="40" font-size="14" text-anchor="middle" fill="%23888" font-family="Arial"%3ESin imagen%3C/text%3E%3C/svg%3E';
            };
        }
        if (tituloEl) tituloEl.textContent = 'Sin actividad';
        if (descEl) descEl.textContent = 'No hay ventas registradas esta semana';
        if (badgeEl) badgeEl.textContent = '-';
        if (ordenesEl) ordenesEl.textContent = '0 unidades';
        if (totalUsdEl) totalUsdEl.textContent = '0.00';
        if (totalBsEl) totalBsEl.textContent = window.formatBs(0);

        actualizarIndicadores();
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
        const badgeEl = document.getElementById('platilloBadgePosicion');
        const ordenesEl = document.getElementById('platilloEstrellaOrdenes');
        const totalUsdEl = document.getElementById('platilloEstrellaTotalUsd');
        const totalBsEl = document.getElementById('platilloEstrellaTotalBs');

        if (imgEl) {
            // Usar imagen del menú (mismo campo que usa admin-menu.js)
            // Esta imagen puede ser una URL externa o una URL del storage de Supabase
            const imagenUrl = platillo.imagen || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="70" viewBox="0 0 200 70"%3E%3Crect width="200" height="70" fill="%232a2a3e"/%3E%3Ctext x="100" y="40" font-size="14" text-anchor="middle" fill="%23888" font-family="Arial"%3ESin imagen%3C/text%3E%3C/svg%3E';
            imgEl.src = imagenUrl;
            imgEl.alt = platillo.platillo_nombre || 'Platillo Estrella';
            imgEl.onerror = function() {
                this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="70" viewBox="0 0 200 70"%3E%3Crect width="200" height="70" fill="%232a2a3e"/%3E%3Ctext x="100" y="40" font-size="14" text-anchor="middle" fill="%23888" font-family="Arial"%3ESin imagen%3C/text%3E%3C/svg%3E';
            };
        }
        if (tituloEl) {
            tituloEl.textContent = platillo.platillo_nombre || 'Sin nombre';
        }
        if (descEl) {
            // Mostrar fechas de la semana actual usando las fechas de la vista
            const fechaInicio = platillo.fecha_inicio || new Date().toISOString();
            const fechaFin = platillo.fecha_fin || new Date().toISOString();
            descEl.textContent = `Top Ventas - ${window.formatFechaGMT4(fechaInicio)} - ${window.formatFechaGMT4(fechaFin)}`;
        }
        if (badgeEl) {
            badgeEl.textContent = `#${platillo.posicion}`;
        }
        if (ordenesEl) {
            ordenesEl.textContent = `${platillo.total_cantidad || 0} unidades`;
        }
        if (totalUsdEl) {
            // Normalizar el valor USD: reemplazar coma por punto si viene en formato venezolano
            const totalUsdStr = String(platillo.total_usd || '0').replace(',', '.');
            const totalUsd = parseFloat(totalUsdStr) || 0;
            totalUsdEl.textContent = totalUsd.toFixed(2);
        }
        if (totalBsEl) {
            // Calcular Bs usando SIEMPRE la tasa efectiva actual multiplicada por el total en USD
            // Esto asegura consistencia: $6.50 * 516.50 = Bs 3.357,25 (no usar total_bs de BD que puede ser histórico)
            const tasaEfectiva = window.obtenerTasaEfectivaActual ? window.obtenerTasaEfectivaActual() : (window.configGlobal?.tasa_efectiva || 400);
            // Normalizar el valor USD: reemplazar coma por punto si viene en formato venezolano
            const totalUsdStr = String(platillo.total_usd || '0').replace(',', '.');
            const totalUsd = parseFloat(totalUsdStr) || 0;
            const totalBsCalculado = totalUsd * tasaEfectiva;
            
            totalBsEl.textContent = window.formatBs(totalBsCalculado);
        }

        // Actualizar indicadores
        actualizarIndicadores();
        
        // Animación de deslizamiento suave
        aplicarAnimacionDeslizamiento();
    }
    
    // Actualizar indicadores de progreso (5 puntos)
    function actualizarIndicadores() {
        const indicatorsContainer = document.getElementById('platilloCarouselIndicators');
        if (!indicatorsContainer) return;
        
        const indicators = indicatorsContainer.querySelectorAll('.platillo-indicator');
        const totalSlides = Math.min(window.platillosTop5.length, 5);
        
        indicators.forEach((indicator, index) => {
            if (index < totalSlides) {
                indicator.style.display = 'block';
                if (index === window.platilloCarouselIndex) {
                    indicator.classList.add('active');
                } else {
                    indicator.classList.remove('active');
                }
            } else {
                indicator.style.display = 'none';
            }
        });
    }

    // Aplicar animación CSS de deslizamiento con cubic-bezier
    function aplicarAnimacionDeslizamiento() {
        const card = document.getElementById('platilloEstrellaCard');
        const imgEl = document.getElementById('platilloEstrellaImg');
        if (!card) return;

        // Remover clase de animación previa
        card.classList.remove('platillo-slide-animation');
        if (imgEl) imgEl.classList.remove('platillo-slide-animation');
        
        // Forzar reflow
        void card.offsetWidth;
        
        // Agregar clase de animación
        card.classList.add('platillo-slide-animation');
        if (imgEl) imgEl.classList.add('platillo-slide-animation');
    }

    // Iniciar carrusel automático
    function iniciarCarruselAutomatico() {
        detenerCarruselAutomatico(); // Limpiar intervalo existente si hay
        
        if (window.platillosTop5.length <= 1) return; // No necesita carrusel si solo hay 1

        window.platilloCarouselInterval = setInterval(() => {
            // Verificar si está en hover o touch para pausar
            if (!window.isHoveringPlatillo && !window.isTouchingPlatillo) {
                window.platilloCarouselIndex = (window.platilloCarouselIndex + 1) % window.platillosTop5.length;
                actualizarCardPlatilloEstrella();
            }
        }, window.CAROUSEL_INTERVAL_MS);
    }

    // Detener carrusel automático
    function detenerCarruselAutomatico() {
        if (window.platilloCarouselInterval) {
            clearInterval(window.platilloCarouselInterval);
            window.platilloCarouselInterval = null;
        }
    }

    // Navegación manual - siguiente platillo
    window.siguientePlatillo = function() {
        if (!window.platillosTop5 || window.platillosTop5.length === 0) return;
        window.platilloCarouselIndex = (window.platilloCarouselIndex + 1) % window.platillosTop5.length;
        actualizarCardPlatilloEstrella();
        reiniciarCarruselTrasInteraccion();
    };

    // Navegación manual - platillo anterior
    window.anteriorPlatillo = function() {
        if (!window.platillosTop5 || window.platillosTop5.length === 0) return;
        window.platilloCarouselIndex = (window.platilloCarouselIndex - 1 + window.platillosTop5.length) % window.platillosTop5.length;
        actualizarCardPlatilloEstrella();
        reiniciarCarruselTrasInteraccion();
    };
    
    // Ir a un índice específico (para clicks en indicadores)
    window.irAPlatilloIndex = function(index) {
        if (!window.platillosTop5 || index < 0 || index >= window.platillosTop5.length) return;
        window.platilloCarouselIndex = index;
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
    window.verAnaliticaPlatilloEstrella = function(event) {
        if (event) event.stopPropagation();
        // Cambiar a la pestaña de Reportes
        const tabReportes = document.querySelector('.tab[data-tab="reportes"]');
        if (tabReportes) {
            // Simular click en la pestaña
            tabReportes.click();
        }
        
        // Mostrar toast informativo
        window.mostrarToast('Viendo analítica completa en Reportes', 'info');
    };
    
    // Helper para formatear fecha en GMT-4
    window.formatFechaGMT4 = function(fechaStr) {
        if (!fechaStr) return '';
        const date = new Date(fechaStr);
        // Ajustar a GMT-4 (Venezuela)
        const offset = -4 * 60 * 60 * 1000;
        const gmt4Date = new Date(date.getTime() + offset);
        return gmt4Date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };
    
    // Helper para obtener tasa efectiva actual
    window.obtenerTasaEfectivaActual = function() {
        const tasaDisplay = document.getElementById('tasaEfectivaDisplay');
        if (tasaDisplay) {
            // El formato es "400.00" o "500,00" - normalizar a número float
            const texto = tasaDisplay.textContent.trim();
            // Reemplazar punto de miles (si existe) y convertir coma decimal a punto
            const normalized = texto.replace(/\./g, '').replace(',', '.');
            return parseFloat(normalized) || null;
        }
        // Fallback a configGlobal si no hay display
        return window.configGlobal?.tasa_efectiva || 400;
    };

    // Setup de event listeners
    document.addEventListener('DOMContentLoaded', function() {
        const card = document.getElementById('platilloEstrellaCard');
        if (!card) return;
        
        // Pausa en hover (desktop)
        card.addEventListener('mouseenter', () => {
            window.isHoveringPlatillo = true;
        });
        
        card.addEventListener('mouseleave', () => {
            window.isHoveringPlatillo = false;
        });
        
        // Pausa en touch (móvil/tablet)
        card.addEventListener('touchstart', () => {
            window.isTouchingPlatillo = true;
        }, { passive: true });
        
        card.addEventListener('touchend', () => {
            window.isTouchingPlatillo = false;
        }, { passive: true });
        
        // Click en indicadores
        const indicatorsContainer = document.getElementById('platilloCarouselIndicators');
        if (indicatorsContainer) {
            indicatorsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('platillo-indicator')) {
                    const index = Array.from(indicatorsContainer.querySelectorAll('.platillo-indicator')).indexOf(e.target);
                    if (index >= 0) {
                        window.irAPlatilloIndex(index);
                    }
                }
            });
        }
        
        // Swipe touch para navegación
        let touchStartX = 0;
        let touchEndX = 0;
        
        card.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        card.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
        
        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe izquierda - siguiente
                    window.siguientePlatillo();
                } else {
                    // Swipe derecha - anterior
                    window.anteriorPlatillo();
                }
            }
        }
        
        // Cargar datos al iniciar
        setTimeout(() => {
            if (window.supabaseClient) {
                window.cargarTopVentasCliente();
            }
        }, 1000);
    });

    // Re-cargar cuando se cambia a la pestaña dashboard
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('tab') && e.target.dataset.tab === 'dashboard') {
            setTimeout(() => {
                window.cargarTopVentasCliente();
            }, 300);
        }
    });

})();
