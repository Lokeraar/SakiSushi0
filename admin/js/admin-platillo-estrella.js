// admin-platillo-estrella.js - Lógica dinámica del Platillo Estrella con Supabase
// Implementa carrusel automático con rotación cada 4 segundos y navegación manual
(function() {
    // Estado de carga
    let isLoading = false;
    let currentData = null;
    let platillosData = []; // Array para almacenar el TOP 5
    let currentIndex = 0;   // Índice actual del carrusel
    let carouselInterval = null; // Intervalo para rotación automática
    const ROTATION_INTERVAL = 4000; // 4 segundos

    // Función principal para cargar el platillo estrella desde Supabase
    window.cargarPlatilloEstrella = async function() {
        if (isLoading) return;
        
        isLoading = true;
        mostrarEstadoCarga(true);
        
        try {
            // Consultar la vista vista_platillo_estrella (ahora devuelve TOP 5)
            const { data, error } = await window.supabaseClient
                .from('vista_platillo_estrella')
                .select('*');
            
            if (error) {
                console.error('Error cargando platillo estrella:', error);
                mostrarEstadoVacio('Error al cargar datos');
                return;
            }
            
            if (!data || data.length === 0) {
                // No hay ventas esta semana
                platillosData = [];
                mostrarEstadoVacio();
                return;
            }
            
            // Guardar todos los platillos del TOP 5
            platillosData = data;
            currentIndex = 0;
            
            // Actualizar UI con el primer platillo
            actualizarUIPlatilloEstrella(platillosData[0]);
            
            // Iniciar carrusel si hay más de un platillo
            iniciarCarrusel();
            
        } catch (e) {
            console.error('Excepción cargando platillo estrella:', e);
            platillosData = [];
            mostrarEstadoVacio('Error de conexión');
        } finally {
            isLoading = false;
            mostrarEstadoCarga(false);
        }
    };

    // Iniciar rotación automática del carrusel
    function iniciarCarrusel() {
        // Limpiar intervalo anterior si existe
        if (carouselInterval) {
            clearInterval(carouselInterval);
        }
        
        // Solo iniciar si hay más de un platillo
        if (platillosData.length > 1) {
            carouselInterval = setInterval(function() {
                currentIndex = (currentIndex + 1) % platillosData.length;
                actualizarUIPlatilloEstrella(platillosData[currentIndex], true);
            }, ROTATION_INTERVAL);
        }
    }

    // Detener rotación automática
    function detenerCarrusel() {
        if (carouselInterval) {
            clearInterval(carouselInterval);
            carouselInterval = null;
        }
    }

    // Navegar manualmente en el carrusel
    window.navegarCarrusel = function(direccion) {
        if (platillosData.length <= 1) return;
        
        detenerCarrusel();
        
        if (direccion === 'next') {
            currentIndex = (currentIndex + 1) % platillosData.length;
        } else if (direccion === 'prev') {
            currentIndex = (currentIndex - 1 + platillosData.length) % platillosData.length;
        } else if (direccion >= 0 && direccion < platillosData.length) {
            currentIndex = direccion;
        }
        
        actualizarUIPlatilloEstrella(platillosData[currentIndex], true);
        
        // Reiniciar rotación después de navegación manual (después de 8 segundos)
        setTimeout(iniciarCarrusel, 8000);
    };

    // Mostrar skeleton de carga
    function mostrarEstadoCarga(cargando) {
        const card = document.getElementById('platilloEstrellaCard');
        if (!card) return;
        
        const imgEl = document.getElementById('platilloEstrellaImg');
        const tituloEl = document.getElementById('platilloEstrellaTitulo');
        const descEl = document.getElementById('platilloEstrellaDesc');
        const ordenesEl = document.getElementById('platilloEstrellaOrdenes');
        const usdEl = document.getElementById('platilloEstrellaPrecioUsd');
        const bsEl = document.getElementById('platilloEstrellaPrecioBs');
        
        if (cargando) {
            card.classList.add('loading');
            if (imgEl) {
                imgEl.style.opacity = '0.3';
                imgEl.src = '';
            }
            if (tituloEl) {
                tituloEl.textContent = 'Cargando...';
                tituloEl.classList.add('skeleton-text');
            }
            if (descEl) {
                descEl.textContent = '-';
                descEl.classList.add('skeleton-text');
            }
            if (ordenesEl) ordenesEl.textContent = '0';
            if (usdEl) usdEl.textContent = '0.00';
            if (bsEl) bsEl.textContent = '0,00';
        } else {
            card.classList.remove('loading');
            if (imgEl) imgEl.style.opacity = '1';
            if (tituloEl) tituloEl.classList.remove('skeleton-text');
            if (descEl) descEl.classList.remove('skeleton-text');
        }
    }

    // Mostrar estado vacío (sin ventas)
    function mostrarEstadoVacio(mensajePersonalizado) {
        detenerCarrusel();
        
        const imgEl = document.getElementById('platilloEstrellaImg');
        const tituloEl = document.getElementById('platilloEstrellaTitulo');
        const descEl = document.getElementById('platilloEstrellaDesc');
        const ordenesEl = document.getElementById('platilloEstrellaOrdenes');
        const usdEl = document.getElementById('platilloEstrellaPrecioUsd');
        const bsEl = document.getElementById('platilloEstrellaPrecioBs');
        const navContainer = document.getElementById('platilloEstrellaNav');
        
        currentData = null;
        platillosData = [];
        currentIndex = 0;
        
        if (imgEl) {
            imgEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect width="80" height="80" fill="%232a2a3e"/%3E%3Ctext x="40" y="45" font-size="30" text-anchor="middle" fill="%23666" font-family="Arial"%3E🍽️%3C/text%3E%3C/svg%3E';
            imgEl.alt = 'Sin ventas';
        }
        if (tituloEl) {
            tituloEl.textContent = mensajePersonalizado || 'Esperando ventas de la semana';
            tituloEl.style.color = 'var(--text-muted)';
        }
        if (descEl) descEl.textContent = 'Los datos se actualizan automáticamente cada lunes';
        if (ordenesEl) ordenesEl.textContent = '0';
        if (usdEl) usdEl.textContent = '0.00';
        if (bsEl) bsEl.textContent = '0,00';
        
        // Ocultar navegación
        if (navContainer) navContainer.style.display = 'none';
    }

    // Actualizar UI con datos del platillo (con transición fade opcional)
    function actualizarUIPlatilloEstrella(data, conTransicion = false) {
        const card = document.getElementById('platilloEstrellaCard');
        const imgEl = document.getElementById('platilloEstrellaImg');
        const tituloEl = document.getElementById('platilloEstrellaTitulo');
        const descEl = document.getElementById('platilloEstrellaDesc');
        const ordenesEl = document.getElementById('platilloEstrellaOrdenes');
        const usdEl = document.getElementById('platilloEstrellaPrecioUsd');
        const bsEl = document.getElementById('platilloEstrellaPrecioBs');
        
        if (!data) return;
        
        // Aplicar transición fade si se solicita
        if (conTransicion && card) {
            card.style.transition = 'opacity 0.4s ease-in-out';
            card.style.opacity = '0';
            
            setTimeout(function() {
                aplicarDatosUI(data);
                card.style.opacity = '1';
            }, 200);
        } else {
            aplicarDatosUI(data);
        }
        
        // Actualizar indicadores de navegación (dots)
        actualizarIndicadores();
    }

    // Aplicar datos a la UI
    function aplicarDatosUI(data) {
        const imgEl = document.getElementById('platilloEstrellaImg');
        const tituloEl = document.getElementById('platilloEstrellaTitulo');
        const descEl = document.getElementById('platilloEstrellaDesc');
        const ordenesEl = document.getElementById('platilloEstrellaOrdenes');
        const usdEl = document.getElementById('platilloEstrellaPrecioUsd');
        const bsEl = document.getElementById('platilloEstrellaPrecioBs');
        
        // Imagen dinámica desde la tabla menu
        if (imgEl) {
            const imagenUrl = data.imagen_url || data.imagen;
            if (imagenUrl && imagenUrl.trim() !== '') {
                imgEl.src = imagenUrl;
                imgEl.alt = data.nombre || 'Platillo Estrella';
            } else {
                // Placeholder si no hay imagen
                imgEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect width="80" height="80" fill="%232a2a3e"/%3E%3Ctext x="40" y="45" font-size="30" text-anchor="middle" fill="%23D32F2F" font-family="Arial"%3E🍣%3C/text%3E%3C/svg%3E';
                imgEl.alt = data.nombre || 'Platillo Estrella';
            }
        }
        
        // Nombre del platillo
        if (tituloEl) {
            tituloEl.textContent = data.nombre || 'Platillo Estrella';
            tituloEl.style.color = 'var(--gold)';
        }
        
        // Descripción
        if (descEl) {
            descEl.textContent = data.descripcion || '-';
        }
        
        // Total de órdenes (contador de unidades vendidas)
        if (ordenesEl) {
            ordenesEl.textContent = data.contador_ventas || 0;
        }
        
        // Acumulado en USD
        if (usdEl) {
            const totalUsd = parseFloat(data.acumulado_usd) || 0;
            usdEl.textContent = totalUsd.toFixed(2);
        }
        
        // Acumulado en Bs
        if (bsEl) {
            const totalBs = parseFloat(data.acumulado_bs) || 0;
            bsEl.textContent = totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }

    // Actualizar indicadores de navegación (dots)
    function actualizarIndicadores() {
        let navContainer = document.getElementById('platilloEstrellaNav');
        
        // Crear contenedor de navegación si no existe
        if (!navContainer) {
            const card = document.getElementById('platilloEstrellaCard');
            if (!card) return;
            
            navContainer = document.createElement('div');
            navContainer.id = 'platilloEstrellaNav';
            navContainer.className = 'platillo-estrella-nav';
            navContainer.style.cssText = 'display:flex;justify-content:center;gap:8px;margin-top:12px;';
            card.appendChild(navContainer);
        }
        
        // Si solo hay 0 o 1 platillo, ocultar navegación
        if (platillosData.length <= 1) {
            navContainer.style.display = 'none';
            return;
        }
        
        navContainer.style.display = 'flex';
        navContainer.innerHTML = '';
        
        // Crear dots para cada platillo
        platillosData.forEach(function(_, index) {
            const dot = document.createElement('button');
            dot.className = 'platillo-nav-dot' + (index === currentIndex ? ' active' : '');
            dot.setAttribute('aria-label', 'Ver platillo ' + (index + 1));
            dot.onclick = function() { window.navegarCarrusel(index); };
            dot.style.cssText = 'width:10px;height:10px;border-radius:50%;border:2px solid var(--gold);background:' + 
                (index === currentIndex ? 'var(--gold)' : 'transparent') + 
                ';cursor:pointer;padding:0;transition:all 0.3s ease;';
            navContainer.appendChild(dot);
        });
    }

    // Agregar flechas de navegación a la tarjeta
    function agregarFlechasNavegacion() {
        let navArrows = document.getElementById('platilloEstrellaArrows');
        
        if (!navArrows) {
            const card = document.getElementById('platilloEstrellaCard');
            if (!card) return;
            
            navArrows = document.createElement('div');
            navArrows.id = 'platilloEstrellaArrows';
            navArrows.className = 'platillo-estrella-arrows';
            navArrows.style.cssText = 'position:absolute;top:50%;left:0;right:0;display:flex;justify-content:space-between;pointer-events:none;transform:translateY(-50%);';
            navArrows.innerHTML = '<button onclick="window.navegarCarrusel(\'prev\')" style="pointer-events:auto;background:rgba(0,0,0,0.5);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all 0.3s ease;" onmouseover="this.style.background=\'rgba(211,47,47,0.8)\'" onmouseout="this.style.background=\'rgba(0,0,0,0.5)\'"><i class="fas fa-chevron-left"></i></button><button onclick="window.navegarCarrusel(\'next\')" style="pointer-events:auto;background:rgba(0,0,0,0.5);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all 0.3s ease;" onmouseover="this.style.background=\'rgba(211,47,47,0.8)\'" onmouseout="this.style.background=\'rgba(0,0,0,0.5)\'"><i class="fas fa-chevron-right"></i></button>';
            card.style.position = 'relative';
            card.appendChild(navArrows);
        }
    }

    // Navegar a la página de reportes
    window.verAnaliticaPlatilloEstrella = function() {
        // Usar el router o navegación directa al módulo de reportes
        const tabReportes = document.querySelector('.tab[data-tab="reportes"]');
        if (tabReportes) {
            tabReportes.click();
        } else {
            // Fallback: scroll directo al pane de reportes
            const reportesPane = document.getElementById('reportesPane');
            if (reportesPane) {
                reportesPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
        // Mostrar toast informativo
        window.mostrarToast('📊 Viendo analítica completa de platillos', 'info');
    };

    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        // Esperar a que Supabase esté disponible
        setTimeout(function() {
            if (window.supabaseClient) {
                window.cargarPlatilloEstrella();
                agregarFlechasNavegacion();
            }
        }, 500);
    });

    // Función para recargar después de una venta (puede ser llamada desde其他地方)
    window.recargarPlatilloEstrella = function() {
        detenerCarrusel();
        window.cargarPlatilloEstrella();
    };

    // Limpiar intervalo al cerrar la página
    window.addEventListener('beforeunload', function() {
        detenerCarrusel();
    });

})();
