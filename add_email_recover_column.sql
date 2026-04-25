-- SCRIPT PARA ACTUALIZAR TABLA DE USUARIOS - RECUPERACIÓN CENTRALIZADA
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- 1. Agregar columna para el correo de contacto/recuperación.
-- A DIFERENCIA del email de auth, esta columna SÍ permite valores duplicados.
-- Esto permite que varios usuarios tengan el mismo correo del "Admin Maestro".
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS email_recuperacion TEXT;

-- 2. Limpiar datos si es necesario (opcional, solo si ya tenías una columna email con restricción única)
-- Si ya tienes una columna 'email' con UNIQUE y quieres migrarla a esta nueva sin restricción:
-- UPDATE usuarios SET email_recuperacion = email WHERE email IS NOT NULL;

-- 3. Comentario explicativo
COMMENT ON COLUMN usuarios.email_recuperacion IS 'Correo de contacto para recuperación asistida. Puede ser compartido entre múltiples usuarios (ej: admin@sakisushi.com).';

-- NOTA DE SEGURIDAD:
-- La columna 'email' interna de supabase.auth.users SE MANTENDRÁ ÚNICA.
-- El sistema generará automáticamente emails técnicos únicos (ej: user_id@local) para cumplir con Supabase.
-- El usuario final solo verá y gestionará el campo 'email_recuperacion' en la UI.
