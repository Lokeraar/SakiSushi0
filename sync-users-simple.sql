-- ============================================
-- SCRIPT ALTERNATIVO: SINCRONIZACIÓN SIMPLE
-- ============================================
-- Este script es una alternativa si el anterior falla por permisos.
-- Usa un enfoque más básico para crear usuarios en auth.users.
-- ============================================

-- PASO 1: Agregar columna email si no existe
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email TEXT;

-- Eliminar índices existentes
DROP INDEX IF EXISTS idx_usuarios_email;
DROP INDEX IF EXISTS idx_usuarios_email_recuperacion;

-- Migrar emails desde email_recuperacion
UPDATE usuarios 
SET email = email_recuperacion 
WHERE email IS NULL AND email_recuperacion IS NOT NULL;

-- Crear índice (NO único para permitir emails compartidos)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- PASO 2: Función simplificada de sincronización
CREATE OR REPLACE FUNCTION sincronizar_usuario_auth_simple()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        -- Intentar insertar directamente en auth.users
        -- Esto funcionará solo si tienes los permisos adecuados
        INSERT INTO auth.users (
            email,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            NEW.email,
            NOW(),
            NOW(),
            NOW(),
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
            jsonb_build_object('username', NEW.username, 'nombre', NEW.nombre, 'rol', NEW.rol),
            'authenticated',
            'authenticated'
        )
        ON CONFLICT (email) DO UPDATE SET
            raw_user_meta_data = jsonb_build_object('username', NEW.username, 'nombre', NEW.nombre, 'rol', NEW.rol),
            updated_at = NOW();
        
        RAISE NOTICE 'Usuario sincronizado: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Crear trigger
DROP TRIGGER IF EXISTS trigger_sincronizar_auth_simple ON usuarios;
CREATE TRIGGER trigger_sincronizar_auth_simple
    AFTER INSERT OR UPDATE OF email ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION sincronizar_usuario_auth_simple();

-- PASO 4: Sincronizar usuarios existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM usuarios WHERE email IS NOT NULL LOOP
        BEGIN
            INSERT INTO auth.users (
                email,
                email_confirmed_at,
                created_at,
                updated_at,
                raw_app_meta_data,
                raw_user_meta_data,
                aud,
                role
            ) VALUES (
                r.email,
                NOW(),
                NOW(),
                NOW(),
                jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
                jsonb_build_object('username', r.username, 'nombre', r.nombre, 'rol', r.rol),
                'authenticated',
                'authenticated'
            )
            ON CONFLICT (email) DO UPDATE SET
                raw_user_meta_data = jsonb_build_object('username', r.username, 'nombre', r.nombre, 'rol', r.rol),
                updated_at = NOW();
                
            RAISE NOTICE 'Sincronizado: %', r.email;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error con %: %', r.email, SQLERRM;
        END;
    END LOOP;
END $$;

-- VERIFICACIÓN
SELECT 
    u.username,
    u.email,
    CASE WHEN au.id IS NOT NULL THEN '✓ En auth.users' ELSE '✗ No en auth.users' END as estado
FROM usuarios u
LEFT JOIN auth.users au ON u.email = au.email
ORDER BY u.username;

SELECT 'Script alternativo completado' as resultado;
