-- ============================================
-- SCRIPT DE VERIFICACIÓN Y CORRECCIÓN
-- Tabla: propinas
-- ============================================

-- 1. Verificar estructura actual de la tabla
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'propinas' 
ORDER BY ordinal_position;

-- 2. Verificar si existe la columna cajero_id
-- Si NO existe, ejecutar:
-- ALTER TABLE propinas ADD COLUMN cajero_id UUID REFERENCES auth.users(id);

-- 3. Verificar si existe la columna entregado
-- Si NO existe, ejecutar:
-- ALTER TABLE propinas ADD COLUMN entregado BOOLEAN DEFAULT false;

-- 4. Actualizar registros antiguos que tengan entregado=NULL a false
-- UPDATE propinas SET entregado = false WHERE entregado IS NULL;

-- 5. Verificar Row Level Security (RLS)
-- SELECT * FROM pg_policies WHERE tablename = 'propinas';

-- 6. Si RLS está activo, asegurar políticas correctas:
-- DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar propinas" ON propinas;
-- CREATE POLICY "Usuarios autenticados pueden insertar propinas" 
--     ON propinas FOR INSERT 
--     TO authenticated 
--     WITH CHECK (true);

-- DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar propinas" ON propinas;
-- CREATE POLICY "Usuarios autenticados pueden actualizar propinas" 
--     ON propinas FOR UPDATE 
--     TO authenticated 
--     USING (true);

-- DROP POLICY IF EXISTS "Usuarios autenticados pueden leer propinas" ON propinas;
-- CREATE POLICY "Usuarios autenticados pueden leer propinas" 
--     ON propinas FOR SELECT 
--     TO authenticated 
--     USING (true);

-- 7. Verificar índices para mejor rendimiento
-- CREATE INDEX IF NOT EXISTS idx_propinas_mesonero_entregado 
--     ON propinas(mesonero_id, entregado);

-- CREATE INDEX IF NOT EXISTS idx_propinas_fecha 
--     ON propinas(fecha);
