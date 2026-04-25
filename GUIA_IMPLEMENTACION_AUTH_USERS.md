# Guía Completa: Implementar auth.users para Recuperación de Contraseña

## Problema Actual

El sistema de recuperación de contraseña falla porque `resetPasswordForEmail()` de Supabase solo funciona con usuarios registrados en la tabla `auth.users`, pero tu aplicación usa una tabla personalizada `usuarios` que no está sincronizada con el sistema de autenticación de Supabase.

## Solución: Sincronizar usuarios entre tablas

Esta guía te mostrará cómo:
1. Agregar emails únicos a tu tabla `usuarios`
2. Crear un trigger automático que sincronice con `auth.users`
3. Configurar el envío de correos de recuperación
4. Verificar que todo funcione correctamente

---

## PASO 1: Preparación en Supabase Dashboard

### 1.1 Habilitar Email Authentication

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com)
2. Navega a **Authentication** → **Providers**
3. Asegúrate de que **Email** esté habilitado
4. Configura los ajustes de email:
   - **Enable Email Signup**: ✅ Activado
   - **Enable Email Confirmations**: ❌ Desactivado (para simplificar)
   - **Secure email change**: ❌ Desactivado inicialmente

### 1.2 Configurar SMTP (IMPORTANTE)

Para que los correos se envíen correctamente:

**Opción A: Usar el servicio de correo de Supabase (Recomendado para desarrollo)**
- Supabase incluye 100 emails/mes gratis
- Los correos se envían desde `no-reply@tu-proyecto.supabase.co`

**Opción B: Configurar SMTP personalizado (Producción)**
1. Ve a **Project Settings** → **Auth** → **SMTP Settings**
2. Configura tu proveedor de correo:
   ```
   Sender email: noreply@tudominio.com
   Sender name: Saki Sushi
   Host: smtp.tu-proveedor.com
   Port: 587
   Username: tu-usuario
   Password: tu-contraseña
   ```

---

## PASO 2: Ejecutar Script de Sincronización

### 2.1 Abrir SQL Editor

1. En Supabase Dashboard, ve a **SQL Editor**
2. Haz clic en **New Query**

### 2.2 Copiar y Ejecutar el Script

Copia TODO el contenido del archivo `/workspace/sync-users-with-auth.sql` y pégalo en el editor SQL.

**ANTES DE EJECUTAR:** Lee las siguientes advertencias:

⚠️ **ADVERTENCIAS IMPORTANTES:**

1. **Emails Duplicados**: Si múltiples usuarios tienen el mismo `email_recuperacion`, el script fallará al crear el índice único. Debes decidir:
   - ¿Cada usuario tendrá un email único? (Recomendado)
   - ¿O todos compartirán el mismo email del administrador?

2. **Si hay emails duplicados**, ejecuta primero este script para identificarlos:
   ```sql
   SELECT email_recuperacion, COUNT(*) as cantidad
   FROM usuarios
   WHERE email_recuperacion IS NOT NULL
   GROUP BY email_recuperacion
   HAVING COUNT(*) > 1;
   ```

3. **Para corregir duplicados**, asigna emails únicos o usa el mismo para todos:
   ```sql
   -- Opción A: Mismo email para todos (ej. admin)
   UPDATE usuarios 
   SET email_recuperacion = 'admin@sakisushi.com'
   WHERE email_recuperacion IS NOT NULL;
   
   -- Opción B: Emails únicos por usuario
   UPDATE usuarios 
   SET email_recuperacion = CONCAT(username, '@sakisushi.com')
   WHERE email_recuperacion IS NULL OR email_recuperacion = '';
   ```

### 2.3 Ejecutar el Script

1. Pega el script completo en el SQL Editor
2. Haz clic en **Run** (o Ctrl/Cmd + Enter)
3. Verifica la salida:
   - Deberías ver mensajes como: `"Usuario creado en auth.users: xxx"`
   - La tabla final mostrará el estado de cada usuario

**Resultado esperado:**
```
username  | email                    | email_recuperacion     | estado
----------|--------------------------|------------------------|----------------------
admin     | admin@sakisushi.com      | admin@sakisushi.com    | ✓ En auth.users
cajero1   | cajero1@sakisushi.com    | admin@sakisushi.com    | ✓ En auth.users
cajero2   | cajero2@sakisushi.com    | admin@sakisushi.com    | ✓ En auth.users
```

---

## PASO 3: Verificar la Sincronización

### 3.1 Verificar en Auth Dashboard

1. Ve a **Authentication** → **Users**
2. Deberías ver los usuarios sincronizados con sus emails

### 3.2 Verificar con SQL

Ejecuta esta consulta para confirmar:
```sql
SELECT 
    u.username,
    u.email,
    au.email as auth_email,
    au.created_at as auth_created
FROM usuarios u
LEFT JOIN auth.users au ON u.email = au.email
ORDER BY u.username;
```

---

## PASO 4: Probar la Recuperación de Contraseña

### 4.1 Prueba Inicial

1. Abre tu aplicación web
2. Ve a la página de login
3. Haz clic en "¿Olvidaste tu contraseña?"
4. Ingresa el email de recuperación (ej. `admin@sakisushi.com`)
5. Haz clic en "ENVIAR ENLACE DE RECUPERACIÓN"

### 4.2 Verificar el Correo

1. Revisa la bandeja de entrada del email
2. También revisa la carpeta de **Spam/Correo no deseado**
3. Deberías recibir un email con asunto similar a: "Reset your password"

### 4.3 Probar el Enlace

1. Haz clic en el enlace del correo
2. Debería llevarte a `nueva-password.html`
3. Ingresa tu nueva contraseña
4. Confirma el cambio

---

## PASO 5: Automatización para Futuros Usuarios

El trigger creado automáticamente sincronizará cualquier nuevo usuario. Pero debes asegurarte de que tu código de creación de usuarios incluya el campo `email`.

### 5.1 Actualizar Código de Creación de Usuarios

En tu archivo de administración donde creas usuarios (probablemente `admin-usuarios.js`), asegúrate de incluir el email:

```javascript
// Ejemplo de cómo crear un usuario con email
const nuevoUsuario = {
    id: generarId('user_'),
    nombre: nombreInput.value,
    username: usernameInput.value,
    password_hash: await hashPassword(passwordInput.value),
    rol: rolSelect.value,
    activo: true,
    email: emailInput.value.trim(), // ← IMPORTANTE: Incluir email
    email_recuperacion: emailInput.value.trim() // ← Para compatibilidad
};

const { error } = await supabaseClient
    .from('usuarios')
    .insert([nuevoUsuario]);
```

### 5.2 Formulario de Creación de Usuarios

Agrega un campo de email en tu formulario de creación de usuarios:

```html
<div class="form-group">
    <label for="email">Correo Electrónico</label>
    <input type="email" id="email" required placeholder="usuario@ejemplo.com">
</div>
```

---

## PASO 6: Configuraciones Adicionales Recomendadas

### 6.1 Políticas de Seguridad (RLS)

Verifica que las políticas de Row Level Security permitan la sincronización:

```sql
-- Ver políticas actuales
SELECT * FROM pg_policies WHERE tablename = 'usuarios';

-- Si es necesario, agregar política para el trigger
CREATE POLICY "Trigger puede actualizar usuarios" 
ON usuarios 
FOR ALL 
USING (true) 
WITH CHECK (true);
```

### 6.2 URLs de Redirección

Configura las URLs permitidas para redirección después del reset:

1. Ve a **Authentication** → **URL Configuration**
2. En **Site URL**, pon: `https://tudominio.com`
3. En **Redirect URLs**, agrega:
   - `https://tudominio.com/nueva-password.html`
   - `http://localhost:*/nueva-password.html` (para desarrollo)

### 6.3 Personalizar Plantillas de Email

Para personalizar los correos de recuperación:

1. Ve a **Authentication** → **Email Templates**
2. Selecciona **Reset Password**
3. Edita el HTML del correo (opcional)

Ejemplo de plantilla personalizada:
```html
<h2>Saki Sushi - Recuperación de Contraseña</h2>
<p>Hola,</p>
<p>Has solicitado restablecer tu contraseña.</p>
<p>Haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer Contraseña</a></p>
<p>Este enlace expira en 1 hora.</p>
<p>Si no solicitaste este cambio, ignora este correo.</p>
```

---

## Solución de Problemas Comunes

### Problema 1: "Error: User already registered"

**Causa**: El email ya existe en `auth.users` pero con diferente ID.

**Solución**:
```sql
-- Eliminar usuario duplicado de auth.users (con cuidado)
DELETE FROM auth.users 
WHERE email = 'el@email.com' 
AND id NOT IN (
    SELECT id FROM auth.users 
    WHERE email = 'el@email.com' 
    ORDER BY created_at DESC 
    LIMIT 1
);
```

### Problema 2: Los correos no llegan

**Causas posibles**:
1. SMTP no configurado correctamente
2. Correos en spam
3. Límite de emails alcanzado

**Soluciones**:
- Verifica **Project Settings** → **Auth** → **SMTP Settings**
- Revisa la carpeta de Spam
- Considera usar un servicio externo como SendGrid, Mailgun, etc.

### Problema 3: "Invalid token" al hacer clic en el enlace

**Causa**: El token expiró (duran 1 hora por defecto).

**Solución**: Solicita un nuevo enlace de recuperación.

### Problema 4: Error de permisos al ejecutar el script

**Causa**: Necesitas privilegios de superusuario para acceder a `auth.users`.

**Solución**: Ejecuta el script como usuario con rol `postgres` o `supabase_admin`.

---

## Mantenimiento Periódico

### Verificación Semanal

Ejecuta esta consulta para verificar el estado de sincronización:
```sql
SELECT 
    CASE WHEN au.id IS NULL THEN '❌ No sincronizado' ELSE '✅ Sincronizado' END as estado,
    COUNT(*) as cantidad
FROM usuarios u
LEFT JOIN auth.users au ON u.email = au.email
GROUP BY estado;
```

### Limpieza de Usuarios Inactivos

Si necesitas eliminar usuarios:
```sql
-- Primero eliminar de auth.users
DELETE FROM auth.users WHERE email = 'usuario@eliminar.com';

-- Luego eliminar de usuarios
DELETE FROM usuarios WHERE email = 'usuario@eliminar.com';
```

---

## Resumen Final

✅ **Completado cuando:**
1. Todos los usuarios tienen email único en la tabla `usuarios`
2. Cada usuario existe en `auth.users` con el mismo email
3. El trigger está activo y funciona para nuevos usuarios
4. La recuperación de contraseña envía correos correctamente
5. Los enlaces de recuperación permiten cambiar la contraseña

## Archivos Relacionados

- `/workspace/sync-users-with-auth.sql` - Script de sincronización
- `/workspace/recuperar-password.html` - Página de recuperación
- `/workspace/nueva-password.html` - Página de nueva contraseña
- `/workspace/add_email_recover_column.sql` - Script anterior de email

## Soporte

Si encuentras problemas:
1. Revisa los logs en **Database** → **Logs**
2. Verifica la consola del navegador (F12)
3. Consulta la documentación de [Supabase Auth](https://supabase.com/docs/guides/auth)
