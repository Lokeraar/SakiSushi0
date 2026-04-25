-- ============================================
-- SCRIPT COMPLETO PARA RECUPERACIÓN DE CONTRASEÑA
-- Saki Sushi - Todos los pasos en una sola ejecución
-- ============================================
-- Propósito: 
-- 1. Configurar tabla usuarios con columna email única
-- 2. Crear trigger para sincronización automática con auth.users
-- 3. Migrar usuarios existentes desde email_recuperacion
-- 4. Configurar políticas de seguridad (RLS)
-- 5. Verificar la sincronización
-- ============================================

-- ============================================
-- PASO 1: PREPARACIÓN DE LA TABLA USUARIOS
-- ============================================

-- 1.1 Agregar columna email si no existe
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email TEXT;

-- 1.2 Eliminar índices existentes para recrearlos limpiamente
DROP INDEX IF EXISTS idx_usuarios_email;
DROP INDEX IF EXISTS idx_usuarios_email_recuperacion;

-- 1.3 Migrar emails desde email_recuperacion hacia email
UPDATE usuarios 
SET email = email_recuperacion 
WHERE email IS NULL AND email_recuperacion IS NOT NULL;

-- 1.4 Eliminar emails duplicados (mantener el primero)
DELETE FROM usuarios u1 USING usuarios u2
WHERE u1.id > u2.id 
  AND u1.email = u2.email 
  AND u1.email IS NOT NULL;

-- 1.5 Crear índice único en email (esto fallará si hay duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- ============================================
-- PASO 2: FUNCIÓN DE SINCRONIZACIÓN CON AUTH.USERS
-- ============================================

-- 2.1 Crear o reemplazar función que sincroniza usuarios con auth.users
CREATE OR REPLACE FUNCTION sincronizar_usuario_auth()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_temp_password text;
BEGIN
    -- Solo procesar si email no es null y no está vacío
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
        
        -- Verificar si ya existe en auth.users
        IF EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
            
            -- Actualizar metadata del usuario existente
            UPDATE auth.users
            SET 
                raw_user_meta_data = jsonb_build_object(
                    'username', COALESCE(NEW.username, ''), 
                    'nombre', COALESCE(NEW.nombre, ''), 
                    'rol', COALESCE(NEW.rol, '')
                ),
                updated_at = NOW()
            WHERE email = NEW.email;
            
            RAISE NOTICE 'Usuario actualizado en auth.users: %', NEW.email;
            
        ELSE
            
            -- Generar contraseña temporal aleatoria
            v_temp_password := encode(gen_random_bytes(16), 'hex');
            
            -- Crear usuario en auth.users usando la función administrativa
            BEGIN
                SELECT id INTO v_user_id
                FROM auth.admin_create_user(
                    NEW.email,
                    v_temp_password,
                    jsonb_build_object(
                        'username', COALESCE(NEW.username, ''), 
                        'nombre', COALESCE(NEW.nombre, ''), 
                        'rol', COALESCE(NEW.rol, '')
                    )
                );
                
                RAISE NOTICE 'Usuario creado en auth.users: % (ID: %)', NEW.email, v_user_id;
                
            EXCEPTION WHEN OTHERS THEN
                -- Si admin_create_user falla, intentar inserción directa
                BEGIN
                    INSERT INTO auth.users (
                        instance_id,
                        id,
                        aud,
                        role,
                        email,
                        encrypted_password,
                        email_confirmed_at,
                        recovery_sent_at,
                        last_sign_in_at,
                        raw_app_meta_data,
                        raw_user_meta_data,
                        created_at,
                        updated_at,
                        confirmation_token,
                        email_change,
                        email_change_token_new,
                        recovery_token
                    ) VALUES (
                        '00000000-0000-0000-0000-000000000000',
                        gen_random_uuid(),
                        'authenticated',
                        'authenticated',
                        NEW.email,
                        crypt(v_temp_password, gen_salt('bf')),
                        NOW(),
                        NULL,
                        NULL,
                        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
                        jsonb_build_object(
                            'username', COALESCE(NEW.username, ''), 
                            'nombre', COALESCE(NEW.nombre, ''), 
                            'rol', COALESCE(NEW.rol, '')
                        ),
                        NOW(),
                        NOW(),
                        '',
                        '',
                        '',
                        ''
                    );
                    
                    RAISE NOTICE 'Usuario creado directamente en auth.users: %', NEW.email;
                    
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'No se pudo crear usuario en auth.users (%): %', NEW.email, SQLERRM;
                END;
            END;
            
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PASO 3: CREAR TRIGGER PARA SINCRONIZACIÓN AUTOMÁTICA
-- ============================================

-- 3.1 Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS trigger_sincronizar_auth ON usuarios;

-- 3.2 Crear nuevo trigger que se ejecuta después de INSERT o UPDATE
CREATE TRIGGER trigger_sincronizar_auth
    AFTER INSERT OR UPDATE OF email, username, nombre, rol ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION sincronizar_usuario_auth();

-- ============================================
-- PASO 4: SINCRONIZAR USUARIOS EXISTENTES
-- ============================================

-- 4.1 Ejecutar sincronización manual para todos los usuarios actuales
DO $$
DECLARE
    r RECORD;
    v_count integer := 0;
    v_error_count integer := 0;
BEGIN
    FOR r IN SELECT * FROM usuarios WHERE email IS NOT NULL AND email != '' LOOP
        BEGIN
            PERFORM sincronizar_usuario_auth();
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE WARNING 'Error sincronizando %: %', r.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Sincronización completada: % exitosos, % errores', v_count, v_error_count;
END $$;

-- ============================================
-- PASO 5: CONFIGURAR POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- 5.1 Habilitar RLS en la tabla usuarios si no está habilitado
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 5.2 Crear política para permitir lectura pública de emails (necesario para recuperación)
DROP POLICY IF EXISTS "Permitir lectura de emails para recuperación" ON usuarios;
CREATE POLICY "Permitir lectura de emails para recuperación"
    ON usuarios
    FOR SELECT
    USING (true);

-- 5.3 Política para que usuarios autenticados puedan ver su propio registro
DROP POLICY IF EXISTS "Usuarios ven su propio registro" ON usuarios;
CREATE POLICY "Usuarios ven su propio registro"
    ON usuarios
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = id::text OR email = auth.jwt()->>'email');

-- ============================================
-- PASO 6: VERIFICACIÓN Y REPORTES
-- ============================================

-- 6.1 Reporte de sincronización
SELECT 
    u.id as id_usuario,
    u.username,
    u.nombre,
    u.email,
    u.email_recuperacion,
    CASE 
        WHEN au.id IS NOT NULL THEN '✓ Sincronizado' 
        ELSE '✗ No sincronizado' 
    END as estado_auth,
    au.created_at as fecha_creacion_auth
FROM usuarios u
LEFT JOIN auth.users au ON u.email = au.email
ORDER BY 
    CASE WHEN au.id IS NULL THEN 1 ELSE 0 END,
    u.username;

-- 6.2 Resumen estadístico
SELECT 
    'Resumen de Sincronización' as informe,
    (SELECT COUNT(*) FROM usuarios) as total_usuarios,
    (SELECT COUNT(*) FROM usuarios WHERE email IS NOT NULL) as con_email,
    (SELECT COUNT(*) FROM usuarios u INNER JOIN auth.users au ON u.email = au.email) as sincronizados,
    (SELECT COUNT(*) FROM usuarios u LEFT JOIN auth.users au ON u.email = au.email WHERE au.id IS NULL) as pendientes;

-- 6.3 Verificar triggers activos
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'usuarios'
  AND trigger_name LIKE '%sincronizar%';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
SELECT '✅ Script de recuperación de contraseña completado exitosamente' as resultado;
