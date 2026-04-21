// admin-platillo-estrella.js - Lógica dinámica del Platillo Estrella con Supabase
(function() {
    // Estado de carga
    let isLoading = false;
    let currentData = null;

    // Función principal para cargar el platillo estrella desde Supabase
    window.cargarPlatilloEstrella = async function() {
        if (isLoading) return;
        
        isLoading = true;
        mostrarEstadoCarga(true);
        
        try {
            // Consultar la vista vista_platillo_estrella
            const { data, error } = await window.supabaseClient
                .from('vista_platillo_estrella')
                .select('*')
                .maybeSingle();
            
            if (error) {
                console.error('Error cargando platillo estrella:', error);
                mostrarEstadoVacio('Error al cargar datos');
                return;
            }
            
            if (!data || !data.id) {
                // No hay ventas esta semana
                mostrarEstadoVacio();
                return;
            }
            
            currentData = data;
            actualizarUIPlatilloEstrella(data);
            
        } catch (e) {
            console.error('Excepción cargando platillo estrella:', e);
            mostrarEstadoVacio('Error de conexión');
        } finally {
            isLoading = false;
            mostrarEstadoCarga(false);
        }
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
        const imgEl = document.getElementById('platilloEstrellaImg');
        const tituloEl = document.getElementById('platilloEstrellaTitulo');
        const descEl = document.getElementById('platilloEstrellaDesc');
        const ordenesEl = document.getElementById('platilloEstrellaOrdenes');
        const usdEl = document.getElementById('platilloEstrellaPrecioUsd');
        const bsEl = document.getElementById('platilloEstrellaPrecioBs');
        
        currentData = null;
        
        if (imgEl) {
            imgEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect width="80" height="80" fill="%232a2a3e"/%3E%3Ctext x="40" y="45" font-size="30" text-anchor="middle" fill="%23666" font-family="Arial"%3E🍽️%3C/text%3E%3C/svg%3E';
            imgEl.alt = 'Sin ventas';
        }
        if (tituloEl) {
            tituloEl.textContent = mensajePersonalizado || 'Sin ventas aún esta semana';
            tituloEl.style.color = 'var(--text-muted)';
        }
        if (descEl) descEl.textContent = 'Los datos se actualizan automáticamente cada lunes';
        if (ordenesEl) ordenesEl.textContent = '0';
        if (usdEl) usdEl.textContent = '0.00';
        if (bsEl) bsEl.textContent = '0,00';
    }

    // Actualizar UI con datos del platillo
    function actualizarUIPlatilloEstrella(data) {
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
            }
        }, 500);
    });

    // Función para recargar después de una venta (puede ser llamada desde其他地方)
    window.recargarPlatilloEstrella = function() {
        window.cargarPlatilloEstrella();
    };

})();
