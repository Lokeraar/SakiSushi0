-- ============================================
-- SCRIPT DE SINCRONIZACIÓN FORZADA DE IMÁGENES
-- Ejecutar este script en el Editor SQL de Supabase
-- para corregir TODAS las imágenes en ventas_detalle
-- ACTUALIZADO: Ahora también actualiza la vista vista_platillo_estrella
-- ============================================

-- 1. Actualizar TODOS los registros de ventas_detalle con la imagen del menú
-- Esto corrige cualquier registro que tenga imagen NULL o incorrecta
UPDATE ventas_detalle vd
SET imagen = m.imagen
FROM menu m
WHERE vd.platillo_id = m.id
  AND m.imagen IS NOT NULL
  AND (vd.imagen IS NULL OR vd.imagen != m.imagen);

-- 2. Verificar cuántos registros fueron actualizados
SELECT
    COUNT(*) as total_registros,
    COUNT(imagen) as registros_con_imagen,
    COUNT(*) - COUNT(imagen) as registros_sin_imagen
FROM ventas_detalle;

-- 3. Verificar platillos estrella actuales con sus imágenes
-- Esta consulta muestra la imagen que debería aparecer en la tarjeta
SELECT
    vpe.platillo_id,
    vpe.platillo_nombre,
    vpe.imagen,
    vpe.total_cantidad,
    m.imagen as imagen_menu_original
FROM vista_platillo_estrella vpe
LEFT JOIN menu m ON vpe.platillo_id = m.id
ORDER BY vpe.posicion;

-- 4. IMPORTANTE: Recrear la vista vista_platillo_estrella para aplicar el fix
-- El problema era que la vista agrupaba por vd.imagen y m.imagen, lo que causaba
-- que si vd.imagen era NULL, la vista devolvía NULL aunque m.imagen tuviera valor.
-- La solución es usar MAX(COALESCE(m.imagen, vd.imagen)) y eliminar esas columnas del GROUP BY
CREATE OR REPLACE VIEW vista_platillo_estrella AS
WITH semana_actual AS (
    SELECT
        -- Inicio de semana: lunes de la semana actual
        (CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6) % 7))::DATE AS inicio_semana,
        -- Fin de semana: domingo a las 23:59:59
        ((CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6) % 7) + 6)::DATE + INTERVAL '23 hours 59 minutes 59 seconds') AS fin_semana
),
platillos_vendidos AS (
    SELECT 
        vd.platillo_id,
        vd.platillo_nombre,
        MAX(COALESCE(m.imagen, vd.imagen)) AS imagen,
        SUM(vd.cantidad) AS total_cantidad,
        SUM(vd.subtotal_usd) AS total_usd,
        SUM(vd.subtotal_bs) AS total_bs,
        sa.inicio_semana AS fecha_inicio,
        sa.fin_semana AS fecha_fin
    FROM ventas_detalle vd
    CROSS JOIN semana_actual sa
    LEFT JOIN menu m ON vd.platillo_id = m.id
    WHERE vd.fecha >= sa.inicio_semana AND vd.fecha <= sa.fin_semana
    GROUP BY vd.platillo_id, vd.platillo_nombre, sa.inicio_semana, sa.fin_semana
)
SELECT 
    platillo_id,
    platillo_nombre,
    imagen,
    total_cantidad,
    total_usd,
    total_bs,
    fecha_inicio,
    fecha_fin,
    ROW_NUMBER() OVER (ORDER BY total_cantidad DESC, total_usd DESC) AS posicion
FROM platillos_vendidos
ORDER BY total_cantidad DESC, total_usd DESC
LIMIT 5;

-- 5. Verificar que la vista ahora devuelve imágenes correctamente
SELECT
    vpe.platillo_id,
    vpe.platillo_nombre,
    vpe.imagen,
    vpe.total_cantidad,
    vpe.posicion,
    m.imagen as imagen_menu_original
FROM vista_platillo_estrella vpe
LEFT JOIN menu m ON vpe.platillo_id = m.id
ORDER BY vpe.posicion;

-- ============================================
-- INSTRUCCIONES:
-- 1. Copia y pega este script en el Editor SQL de Supabase
-- 2. Ejecútalo completamente
-- 3. Verifica que "registros_sin_imagen" sea 0
-- 4. Revisa la tabla vista_platillo_estrella para confirmar que las imágenes aparecen
-- 5. Refresca la página del módulo Inicio en el admin para ver los cambios
-- ============================================
