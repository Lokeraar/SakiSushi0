-- ==========================================
-- SCRIPT DE ACTUALIZACIÓN: EMAIL RECUPERACIÓN
-- ==========================================
-- Propósito: Preparar la tabla 'usuarios' para el sistema de recuperación centralizada.
-- Permite que múltiples usuarios compartan el mismo correo (ej. el del Admin).
--
-- INSTRUCCIONES:
-- 1. Copia y pega este script en el SQL Editor de Supabase.
-- 2. Ejecútalo UNA SOLA VEZ.
-- 3. Este script es inteligente: detecta si la columna ya existe y la adapta.
--    Si ya ejecutaste el script anterior (add_email_column.sql), este lo corregirá automáticamente.
-- ==========================================

-- PASO 1: Limpieza previa (Si existe la columna 'email' antigua del plan inicial)
-- Si venimos de ejecutar el script anterior, eliminamos el índice único que bloquea correos repetidos.
DROP INDEX IF EXISTS idx_usuarios_email;

-- Si la columna se llamaba 'email', la renombramos a 'email_recuperacion' para estandarizar.
-- Si la columna ya se llama 'email_recuperacion', esto no hará nada.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'email') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'email_recuperacion') THEN
        ALTER TABLE usuarios RENAME COLUMN email TO email_recuperacion;
    END IF;
END $$;

-- PASO 2: Crear o adaptar la columna 'email_recuperacion'
-- Asegura que la columna exista. Si ya fue creada por el paso anterior, esto solo valida.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_recuperacion TEXT;

-- PASO 3: Indexación optimizada
-- Creamos un índice NORMAL (no único) para acelerar las búsquedas por correo.
-- Esto permite buscar rápido sin impedir que varios usuarios tengan el mismo correo.
CREATE INDEX IF NOT EXISTS idx_usuarios_email_recuperacion ON usuarios(email_recuperacion);

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================
-- Este mensaje confirma que el script terminó correctamente.
SELECT 'Tabla actualizada exitosamente. Ahora puedes asignar el mismo correo a múltiples usuarios.' AS estado;
