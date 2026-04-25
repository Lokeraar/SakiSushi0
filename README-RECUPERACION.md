# SISTEMA DE RECUPERACIÓN DE CONTRASEÑA - SAKI SUSHI

## 📋 ÍNDICE

1. [Descripción General](#descripción-general)
2. [Archivos Entregados](#archivos-entregados)
3. [Instalación Paso a Paso](#instalación-paso-a-paso)
4. [Configuración de Envío de Emails](#configuración-de-envío-de-emails)
5. [Integración con el Login Existente](#integración-con-el-login-existente)
6. [Pruebas de Seguridad](#pruebas-de-seguridad)
7. [Solución de Problemas](#solución-de-problemas)

---

## 📖 DESCRIPCIÓN GENERAL

Este sistema permite la recuperación de contraseñas para usuarios de Saki Sushi con las siguientes características:

### ✅ Características Principales

- **Email compartido permitido**: Múltiples usuarios pueden tener el MISMO `email_recuperacion`
- **Tokens únicos e irrepetibles**: Generados con `gen_random_bytes(32)` en formato hexadecimal
- **Expiración de tokens**: 1 hora desde su creación
- **Reutilización limitada**: Los tokens pueden usarse múltiples veces dentro de los primeros 10 minutos
- **Contraseñas hasheadas**: Usando bcrypt con salt de 10 rondas
- **No depende de Supabase Auth**: Todo se maneja en tablas personalizadas

### 🔐 Medidas de Seguridad

1. Tokens criptográficamente seguros (64 caracteres hexadecimales = 256 bits de entropía)
2. Expiración automática de tokens (1 hora)
3. Invalidación de tokens anteriores al generar uno nuevo
4. Marcado de token como "usado" después del cambio de contraseña
5. Row Level Security (RLS) configurado apropiadamente
6. Funciones SECURITY DEFINER para operaciones sensibles

---

## 📁 ARCHIVOS ENTREGADOS

| Archivo | Descripción |
|---------|-------------|
| `recuperacion-password.sql` | Script SQL para crear tabla y funciones en Supabase |
| `recuperar-password.html` | Página web con formularios de recuperación |
| `recuperar-password.js` | Lógica JavaScript del flujo completo |
| `README-RECUPERACION.md` | Este archivo de documentación |

---

## 🚀 INSTALACIÓN PASO A PASO

### PASO 1: Ejecutar Script SQL en Supabase

1. **Accede al Dashboard de Supabase**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New Query"

3. **Ejecuta el Script**
   - Copia TODO el contenido de `recuperacion-password.sql`
   - Pégalo en el editor SQL
   - Haz clic en "Run" o presiona Ctrl+Enter

4. **Verifica la Instalación**
   
   Ejecuta estas consultas para verificar que todo se creó correctamente:

   ```sql
   -- Verificar tabla recuperacion_tokens
   SELECT * FROM recuperacion_tokens LIMIT 1;
   
   -- Verificar funciones
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE '%recuperacion%';
   
   -- Verificar columna email_recuperacion en usuarios
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'usuarios' 
   AND column_name = 'email_recuperacion';
   ```

### PASO 2: Actualizar Emails de Recuperación

Actualiza los emails de recuperación para tus usuarios existentes:

```sql
-- Para administradores
UPDATE usuarios 
SET email_recuperacion = 'tu-email-admin@ejemplo.com'
WHERE rol = 'admin';

-- Para cajeros
UPDATE usuarios 
SET email_recuperacion = 'cajeros@sakisushi.com'
WHERE rol = 'cajero';

-- O individualmente por usuario
UPDATE usuarios 
SET email_recuperacion = 'usuario@ejemplo.com'
WHERE username = 'nombre_usuario';
```

### PASO 3: Subir Archivos al Servidor

1. **Sube los archivos HTML y JS** a tu servidor web:
   - `recuperar-password.html` → `/recuperar-password.html`
   - `recuperar-password.js` → `/recuperar-password.js`

2. **Verifica las rutas** en el archivo JS:
   ```javascript
   const CONFIG = {
       SUPABASE_URL: 'https://iqwwoihiiyrtypyqzhgy.supabase.co',
       SUPABASE_ANON_KEY: 'TU_ANON_KEY',
       BASE_URL: window.location.origin,
       RECOVERY_PAGE_PATH: '/recuperar-password.html',
       // ... más configuración
   };
   ```

---

## 📧 CONFIGURACIÓN DE ENVÍO DE EMAILS

El sistema soporta múltiples métodos de envío de emails. Elige el que mejor se adapte a tus necesidades:

### OPCIÓN 1: EmailJS (Recomendado para empezar)

EmailJS es un servicio gratuito (hasta 200 emails/mes) que permite enviar emails directamente desde el navegador.

#### Paso 1: Crear Cuenta en EmailJS

1. Ve a https://www.emailjs.com/
2. Haz clic en "Sign Up Free"
3. Regístrate con tu cuenta de Google, GitHub o email

#### Paso 2: Configurar Email Service

1. En el dashboard de EmailJS, haz clic en **"Add New Service"**
2. Selecciona tu proveedor de email:
   - **Gmail** (recomendado)
   - Outlook
   - SMTP personalizado

3. **Si usas Gmail:**
   - Conecta tu cuenta de Google
   - Autoriza el acceso
   - Haz clic en "Create Service"

4. **Si usas SMTP:**
   - Ingresa los datos de tu servidor SMTP:
     ```
     Host: smtp.tu-dominio.com
     Port: 587 (TLS) o 465 (SSL)
     Username: tu@dominio.com
     Password: tu_contraseña
     ```

5. Anota el **Service ID** (ej: `service_abc123`)

#### Paso 3: Crear Email Template

1. Ve a **"Email Templates"** → **"Create New Template"**

2. Usa esta plantilla:

   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <style>
           body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
           .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
           .header { background: linear-gradient(135deg, #D32F2F, #B71C1C); color: #fff; padding: 30px; text-align: center; }
           .header h1 { margin: 0; font-size: 24px; }
           .content { padding: 40px 30px; }
           .button { display: inline-block; background: #D32F2F; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
           .button:hover { background: #B71C1C; }
           .warning { background: #FFF3CD; border-left: 4px solid #FFC107; padding: 15px; margin: 20px 0; }
           .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
       </style>
   </head>
   <body>
       <div class="container">
           <div class="header">
               <h1>🍣 Saki Sushi</h1>
               <p>Recuperación de Contraseña</p>
           </div>
           <div class="content">
               <h2>Hola {{username}},</h2>
               <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón siguiente para crear una nueva contraseña:</p>
               
               <p style="text-align: center;">
                   <a href="{{recovery_link}}" class="button">Restablecer Contraseña</a>
               </p>
               
               <p>O copia y pega este enlace en tu navegador:</p>
               <p style="word-break: break-all; color: #666;">{{recovery_link}}</p>
               
               <div class="warning">
                   <strong>⚠️ Importante:</strong>
                   <ul>
                       <li>Este enlace expirará en {{expiry_hours}} hora(s)</li>
                       <li>Si no solicitaste este cambio, ignora este email</li>
                       <li>No compartas este enlace con nadie</li>
                   </ul>
               </div>
           </div>
           <div class="footer">
               <p>© 2024 Saki Sushi. Todos los derechos reservados.</p>
               <p>Este es un mensaje automático, por favor no respondas.</p>
           </div>
       </div>
   </body>
   </html>
   ```

3. Guarda la plantilla y anota el **Template ID** (ej: `template_xyz789`)

#### Paso 4: Obtener Public Key

1. Ve a **"Account"** → **"API Keys"**
2. Copia tu **Public Key**

#### Paso 5: Configurar en el Código

Edita `recuperar-password.js` y actualiza la configuración:

```javascript
const CONFIG = {
    // ... otras configuraciones ...
    
    // EmailJS
    EMAILJS_PUBLIC_KEY: 'TU_PUBLIC_KEY_AQUI',
    EMAILJS_SERVICE_ID: 'TU_SERVICE_ID_AQUI',
    EMAILJS_TEMPLATE_ID: 'TU_TEMPLATE_ID_AQUI',
};
```

---

### OPCIÓN 2: Edge Function de Supabase (Producción)

Para un entorno de producción más robusto, crea una Edge Function:

#### Paso 1: Instalar Supabase CLI

```bash
npm install -g supabase
```

#### Paso 2: Inicializar Proyecto

```bash
cd /workspace
supabase init
supabase link --project-ref iqwwoihiiyrtypyqzhgy
```

#### Paso 3: Crear Edge Function

```bash
supabase functions new enviar-email-recuperacion
```

#### Paso 4: Implementar Función

Edita `supabase/functions/enviar-email-recuperacion/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { destinatario, token, username, enlace } = await req.json()

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    const { data, error } = await resend.emails.send({
      from: 'Saki Sushi <noreply@sakisushi.com>',
      to: [destinatario],
      subject: 'Recuperación de Contraseña - Saki Sushi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #D32F2F;">🍣 Saki Sushi</h1>
          <p>Hola ${username},</p>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
          <p><a href="${enlace}" style="background: #D32F2F; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a></p>
          <p>O copia este enlace: ${enlace}</p>
          <p style="color: #666; font-size: 12px;">Este enlace expira en 1 hora.</p>
        </div>
      `,
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

#### Paso 5: Configurar Variables de Entorno

En el dashboard de Supabase:
1. Ve a **"Edge Functions"** → **"Settings"**
2. Agrega el secret: `RESEND_API_KEY` con tu clave de Resend (https://resend.com)

#### Paso 6: Deploy

```bash
supabase functions deploy enviar-email-recuperacion
```

---

### OPCIÓN 3: Servicio SMTP Propio

Si tienes tu propio servidor de correo, configura el backend para que envíe emails:

```javascript
// Ejemplo con Node.js + Nodemailer
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.tu-dominio.com',
  port: 587,
  secure: false,
  auth: {
    user: 'tu@dominio.com',
    pass: 'tu_contraseña'
  }
});

async function enviarEmail(destinatario, token, username) {
  const enlace = `https://sakisushi.com/recuperar-password.html?token=${token}`;
  
  await transporter.sendMail({
    from: '"Saki Sushi" <noreply@sakisushi.com>',
    to: destinatario,
    subject: 'Recuperación de Contraseña',
    html: `
      <p>Hola ${username}</p>
      <p>Enlace de recuperación: <a href="${enlace}">${enlace}</a></p>
      <p>Expira en 1 hora.</p>
    `
  });
}
```

---

## 🔗 INTEGRACIÓN CON EL LOGIN EXISTENTE

### Modificar el Login de Admin

En `admin/index.html` o donde tengas el login, agrega el botón de recuperación:

```html
<!-- Después del formulario de login -->
<div class="forgot-password-link" style="text-align: center; margin-top: 20px;">
    <a href="/recuperar-password.html" style="color: var(--accent); text-decoration: none; font-size: 0.9rem;">
        <i class="fas fa-key"></i> ¿Olvidaste tu contraseña?
    </a>
</div>
```

### Modificar `admin-auth.js`

Agrega esta función para redirigir a recuperación:

```javascript
// En admin-auth.js, después de cargar la lista de admins
window.irARecuperacion = function() {
    // Guardar información del usuario seleccionado si existe
    if (selectedAdmin) {
        sessionStorage.setItem('recuperacion_usuario', JSON.stringify(selectedAdmin));
    }
    window.location.href = '/recuperar-password.html';
};
```

---

## 🧪 PRUEBAS DE SEGURIDAD

### Test 1: Verificar Generación de Tokens Únicos

```sql
-- Generar múltiples tokens y verificar unicidad
SELECT 
    COUNT(*) as total_tokens,
    COUNT(DISTINCT token) as tokens_unicos,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT token) THEN '✅ PASS: Todos los tokens son únicos'
        ELSE '❌ FAIL: Hay tokens duplicados'
    END as resultado
FROM recuperacion_tokens;
```

### Test 2: Verificar Expiración

```sql
-- Verificar tokens expirados
SELECT 
    id,
    creado_en,
    expira_en,
    NOW() as ahora,
    CASE 
        WHEN expira_en < NOW() THEN 'Expirado'
        ELSE 'Válido'
    END as estado
FROM recuperacion_tokens
ORDER BY creado_en DESC
LIMIT 10;
```

### Test 3: Verificar Hash de Contraseñas

```sql
-- Actualizar contraseña de prueba y verificar hash
SELECT 
    username,
    password_hash,
    LENGTH(password_hash) as longitud_hash,
    CASE 
        WHEN password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' THEN '✅ bcrypt válido'
        ELSE '❌ Hash inválido'
    END as validacion
FROM usuarios
LIMIT 5;
```

### Test 4: Prueba de Penetración Básica

1. **Token Reutilizado después de usado:**
   - Recupera contraseña exitosamente
   - Intenta usar el mismo token nuevamente
   - Debe fallar con mensaje "Token ya utilizado"

2. **Token Expirado:**
   - Espera 1 hora después de generar token
   - Intenta usarlo
   - Debe fallar con mensaje "Token expirado"

3. **Token Inválido:**
   - Intenta acceder con token falso
   - Debe fallar con mensaje "Token inválido"

4. **SQL Injection:**
   - Intenta inyectar código SQL en el campo de email
   - Debe ser sanitizado apropiadamente

### Test 5: Rate Limiting (Recomendado implementar)

Agrega esta función para limitar solicitudes:

```sql
CREATE OR REPLACE FUNCTION verificar_rate_limit(p_email TEXT, p_max_intentos INTEGER DEFAULT 5)
RETURNS BOOLEAN AS $$
DECLARE
    v_intentos INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_intentos
    FROM recuperacion_tokens
    WHERE email = p_email
    AND creado_en > NOW() - INTERVAL '1 hour';
    
    RETURN v_intentos < p_max_intentos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Problema: "Función no existe"

**Síntoma:** Error `function generar_token_recuperacion does not exist`

**Solución:**
```sql
-- Verificar que las funciones existen
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%recuperacion%';

-- Si no existen, re-ejecuta el script SQL
```

### Problema: "Permisos insuficientes"

**Síntoma:** Error `permission denied for table recuperacion_tokens`

**Solución:**
```sql
-- Re-ejecutar grants
GRANT ALL ON recuperacion_tokens TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generar_token_recuperacion TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validar_token_recuperacion TO anon, authenticated;
GRANT EXECUTE ON FUNCTION actualizar_contrasena_con_token TO anon, authenticated;
```

### Problema: "Email no se envía"

**Síntoma:** El token se genera pero no llega el email

**Solución:**
1. Verifica consola del navegador para errores
2. Confirma que EmailJS está configurado correctamente
3. Revisa spam/correo no deseado
4. Prueba con el método alternativo (consola muestra el enlace)

### Problema: "Token inválido siempre"

**Síntoma:** Al hacer clic en el enlace, dice "Token inválido"

**Solución:**
1. Verifica que la URL esté bien formada: `?token=XYZ123`
2. Asegúrate de que el token no tenga espacios
3. Verifica que el token no haya expirado (1 hora)
4. Revisa RLS policies en Supabase

---

## 📊 MONITOREO Y MANTENIMIENTO

### Limpieza Automática de Tokens

Ejecuta periódicamente (diariamente recomendado):

```sql
-- Limpia tokens expirados hace más de 24 horas
-- y tokens usados hace más de 7 días
SELECT limpiar_tokens_expirados();
```

### Métricas de Uso

```sql
-- Tokens generados hoy
SELECT COUNT(*) FROM recuperacion_tokens 
WHERE DATE(creado_en) = CURRENT_DATE;

-- Tokens usados exitosamente
SELECT COUNT(*) FROM recuperacion_tokens 
WHERE usado = true;

-- Tokens expirados sin usar
SELECT COUNT(*) FROM recuperacion_tokens 
WHERE expira_en < NOW() AND usado = false;
```

---

## 📞 SOPORTE

Si encuentras problemas:

1. Revisa la consola del navegador (F12)
2. Verifica logs de Supabase en el dashboard
3. Confirma que todos los archivos estén subidos correctamente
4. Asegúrate de que las URLs en la configuración sean correctas

---

**Versión:** 1.0.0  
**Última actualización:** 2024  
**Autor:** Sistema Personalizado para Saki Sushi
