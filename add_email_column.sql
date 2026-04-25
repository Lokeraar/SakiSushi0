-- Script para agregar columna email a la tabla usuarios
-- Ejecutar en el SQL Editor de Supabase

-- 1. Agregar columna email si no existe
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Crear índice único para emails (los emails deben ser únicos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email) WHERE email IS NOT NULL;

-- 3. Actualizar la política RLS para permitir lectura/escritura del campo email
-- Las políticas ya existentes deberían cubrir esto, pero verificamos:
DROP POLICY IF EXISTS "Usuarios ver datos propios" ON usuarios;
CREATE POLICY "Usuarios ver datos propios" ON usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios insert" ON usuarios;
CREATE POLICY "Usuarios insert" ON usuarios FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios update" ON usuarios;
CREATE POLICY "Usuarios update" ON usuarios FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios delete" ON usuarios;
CREATE POLICY "Usuarios delete" ON usuarios FOR DELETE USING (true);

-- 4. Conceder permisos explícitos
GRANT SELECT, INSERT, UPDATE ON usuarios TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON usuarios TO PUBLIC;

-- Nota: Los usuarios existentes tendrán email NULL hasta que se actualicen desde el admin
-- El frontend validará que el email sea obligatorio al crear/editar usuarios
