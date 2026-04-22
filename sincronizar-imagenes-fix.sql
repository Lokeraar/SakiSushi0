-- ============================================
-- SCRIPT DE SINCRONIZACIÓN FORZADA DE IMÁGENES
-- Ejecutar este script en el Editor SQL de Supabase
-- para corregir TODAS las imágenes en ventas_detalle
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
SELECT 
    vpe.platillo_id,
    vpe.platillo_nombre,
    vpe.imagen,
    vpe.total_cantidad,
    m.imagen as imagen_menu_original
FROM vista_platillo_estrella vpe
LEFT JOIN menu m ON vpe.platillo_id = m.id
ORDER BY vpe.posicion;

-- ============================================
-- INSTRUCCIONES:
-- 1. Copia y pega este script en el Editor SQL de Supabase
-- 2. Ejecútalo completamente
-- 3. Verifica que "registros_sin_imagen" sea 0
-- 4. Revisa la tabla vista_platillo_estrella para confirmar
-- ============================================
