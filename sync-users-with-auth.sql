-- ============================================
-- SCRIPT PARA SINCRONIZAR USUARIOS CON AUTH.USERS
-- VERSIÓN CORREGIDA Y SIMPLIFICADA
-- ============================================
-- Propósito: 
-- 1. Agregar columna 'email' única a la tabla usuarios
-- 2. Crear trigger que automaticamente crea usuario en auth.users cuando se inserta en usuarios
-- 3. Migrar usuarios existentes (si tienen email_recuperacion)
-- ============================================

-- PASO 1: Agregar columna email UNIQUE si no existe
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email TEXT;

-- Primero eliminamos índices existentes
DROP INDEX IF EXISTS idx_usuarios_email;
DROP INDEX IF EXISTS idx_usuarios_email_recuperacion;

-- NOTA IMPORTANTE: Si hay emails duplicados, este CREATE UNIQUE INDEX fallará
-- En ese caso, primero debes eliminar los duplicados manualmente
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- PASO 2: Migrar emails desde email_recuperacion si email está vacío
UPDATE usuarios 
SET email = email_recuperacion 
WHERE email IS NULL AND email_recuperacion IS NOT NULL;

-- PASO 3: Crear función que sincroniza usuarios con auth.users
-- Esta función usa auth.admin_create_user() que es más seguro
CREATE OR REPLACE FUNCTION sincronizar_usuario_auth()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Solo procesar si email no es null
    IF NEW.email IS NOT NULL THEN
        -- Intentar crear el usuario en auth.users usando la función administrativa
        BEGIN
            -- Verificar primero si ya existe
            IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
                -- Crear usuario en auth.users con contraseña temporal
                -- La contraseña será generada aleatoriamente y el usuario deberá cambiarla
                v_user_id := (
                    SELECT id FROM auth.admin_create_user(
                        NEW.email,
                        md5(random()::text || clock_timestamp()::text), -- Contraseña temporal aleatoria
                        jsonb_build_object('username', NEW.username, 'nombre', NEW.nombre, 'rol', NEW.rol)
                    )
                );
                RAISE NOTICE 'Usuario creado en auth.users: % (ID: %)', NEW.email, v_user_id;
            ELSE
                -- Actualizar metadata del usuario existente
                UPDATE auth.users
                SET 
                    raw_user_meta_data = jsonb_build_object('username', NEW.username, 'nombre', NEW.nombre, 'rol', NEW.rol),
                    updated_at = NOW()
                WHERE email = NEW.email;
                
                RAISE NOTICE 'Usuario actualizado en auth.users: %', NEW.email;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Si falla la creación (ej. permisos insuficientes), solo registrar warning
            RAISE WARNING 'No se pudo sincronizar usuario % con auth.users: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: Crear trigger para INSERT y UPDATE
DROP TRIGGER IF EXISTS trigger_sincronizar_auth ON usuarios;
CREATE TRIGGER trigger_sincronizar_auth
    AFTER INSERT OR UPDATE OF email, username, nombre, rol ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION sincronizar_usuario_auth();

-- PASO 5: Sincronizar usuarios existentes manualmente
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM usuarios WHERE email IS NOT NULL LOOP
        PERFORM sincronizar_usuario_auth();
    END LOOP;
END $$;

-- VERIFICACIÓN
SELECT 
    u.username,
    u.email,
    u.email_recuperacion,
    CASE WHEN au.id IS NOT NULL THEN '✓ En auth.users' ELSE '✗ No en auth.users' END as estado
FROM usuarios u
LEFT JOIN auth.users au ON u.email = au.email
ORDER BY u.username;

SELECT 'Script completado exitosamente' as resultado;
