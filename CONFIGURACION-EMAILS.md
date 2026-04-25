# 📧 GUÍA COMPLETA DE CONFIGURACIÓN - SISTEMA DE RECUPERACIÓN DE CONTRASEÑA

## Índice
1. [Introducción](#introducción)
2. [Instalación del Script SQL](#instalación-del-script-sql)
3. [Configuración del Servicio de Emails](#configuración-del-servicio-de-emails)
4. [Opción A: EmailJS (Recomendado para empezar)](#opción-a-emailjs-recomendado-para-empezar)
5. [Opción B: Edge Function de Supabase con SMTP](#opción-b-edge-function-de-supabase-con-smtp)
6. [Opción C: Resend (Alternativa moderna)](#opción-c-resend-alternativa-moderna)
7. [Pruebas de Seguridad](#pruebas-de-seguridad)
8. [Solución de Problemas](#solución-de-problemas)

---

## Introducción

Este sistema permite la recuperación de contraseñas para usuarios de Saki Sushi con las siguientes características:

✅ **Emails compartidos permitidos**: Múltiples usuarios pueden tener el mismo `email_recuperacion`  
✅ **Tokens únicos e irrepetibles**: Generados con `gen_random_bytes(32)`  
✅ **Expiración de tokens**: 1 hora de validez  
✅ **Reuso limitado**: Los tokens pueden usarse múltiples veces en una ventana de 10 minutos  
✅ **Contraseñas hasheadas**: bcrypt con salt de 8 rounds  
✅ **Independiente de Supabase Auth**: Usa tablas personalizadas  

---

## Instalación del Script SQL

### Paso 1: Ejecutar el script en Supabase

1. Ve al [Dashboard de Supabase](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Navega a **SQL Editor** en el menú lateral
4. Haz clic en **New Query**
5. Copia y pega TODO el contenido del archivo `recuperacion_tokens.sql`
6. Haz clic en **Run** o presiona `Ctrl/Cmd + Enter`

### Paso 2: Verificar instalación

Ejecuta estas consultas para verificar que todo se creó correctamente:

```sql
-- Verificar tabla
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'recuperacion_tokens';

-- Verificar funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%recuperacion%';

-- Verificar columna en usuarios
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'usuarios' AND column_name = 'email_recuperacion';
```

Deberías ver:
- ✅ Tabla `recuperacion_tokens`
- ✅ Funciones: `verificar_email_recuperacion`, `generar_token_recuperacion`, `validar_token_recuperacion`, `actualizar_contrasena_con_token`, `eliminar_tokens_expirados`
- ✅ Columna `email_recuperacion` en tabla `usuarios`

### Paso 3: Configurar emails de recuperación para usuarios existentes

```sql
-- Asignar emails de recuperación a usuarios existentes
UPDATE usuarios 
SET email_recuperacion = 'admin@sakisushi.com'
WHERE username = 'admin';

UPDATE usuarios 
SET email_recuperacion = 'cajero@sakisushi.com'
WHERE username IN ('cajero1', 'cajero2');

-- Verificar
SELECT id, username, nombre, email_recuperacion FROM usuarios;
```

---

## Configuración del Servicio de Emails

El sistema soporta múltiples métodos de envío de emails. Elige el que mejor se adapte a tus necesidades.

---

## Opción A: EmailJS (Recomendado para empezar)

**Ventajas:**
- ✅ Gratis hasta 200 emails/mes
- ✅ No requiere servidor backend
- ✅ Fácil configuración
- ✅ Plantillas personalizables

### Paso 1: Crear cuenta en EmailJS

1. Ve a [https://www.emailjs.com/](https://www.emailjs.com/)
2. Haz clic en **Sign Up Free**
3. Regístrate con tu correo electrónico
4. Confirma tu email

### Paso 2: Agregar Email Service

1. En el dashboard de EmailJS, ve a **Email Services**
2. Haz clic en **Add New Service**
3. Selecciona tu proveedor de email:
   - **Gmail** (recomendado para testing)
   - **Outlook**
   - **SMTP personalizado** (para dominio propio)

#### Para Gmail:
1. Selecciona **Gmail**
2. Haz clic en **Connect Account**
3. Inicia sesión con tu cuenta de Google
4. Haz clic en **Create Service**
5. Anota el **Service ID** (ej: `service_abc123`)

### Paso 3: Crear Email Template

1. Ve a **Email Templates** en el menú lateral
2. Haz clic en **Create New Template**
3. Usa esta plantilla:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #D32F2F, #b71c1c);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #333;
            margin-bottom: 20px;
        }
        .content p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #D32F2F, #b71c1c);
            color: white;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .link-text {
            word-break: break-all;
            color: #999;
            font-size: 12px;
            margin-top: 20px;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 12px;
        }
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
            
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón siguiente para establecer una nueva contraseña:</p>
            
            <a href="{{recovery_link}}" class="button">Restablecer Contraseña</a>
            
            <p>O copia y pega este enlace en tu navegador:</p>
            <p class="link-text">{{recovery_link}}</p>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul style="margin: 10px 0 0 0;">
                    <li>Este enlace expirará en {{expiry_hours}} hora(s)</li>
                    <li>Puedes usar este enlace múltiples veces durante 10 minutos</li>
                    <li>Si no solicitaste este cambio, ignora este email</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Este es un mensaje automático, por favor no respondas.</p>
            <p>&copy; 2024 Saki Sushi. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
```

4. En **Variables**, asegúrate de tener:
   - `{{username}}`
   - `{{recovery_link}}`
   - `{{expiry_hours}}`

5. Guarda la template y anota el **Template ID** (ej: `template_xyz789`)

### Paso 4: Obtener Public Key

1. Ve a **Account** (haz clic en tu nombre arriba a la derecha)
2. En **API Keys**, copia tu **Public Key**

### Paso 5: Configurar en recuperar-password.js

Abre el archivo `recuperar-password.js` y actualiza la configuración:

```javascript
const CONFIG = {
    // ... resto de configuración ...
    
    // EmailJS
    EMAILJS_PUBLIC_KEY: 'TU_PUBLIC_KEY_AQUI',      // Ej: 'user_abc123def456'
    EMAILJS_SERVICE_ID: 'TU_SERVICE_ID_AQUI',       // Ej: 'service_gmail01'
    EMAILJS_TEMPLATE_ID: 'TU_TEMPLATE_ID_AQUI',     // Ej: 'template_recovery01'
    
    // ... resto de configuración ...
};
```

### Paso 6: Probar el envío

1. Abre `recuperar-password.html` en tu navegador
2. Selecciona un usuario
3. Ingresa el email de recuperación configurado
4. Haz clic en "Enviar Enlace de Recuperación"
5. Revisa tu bandeja de entrada

---

## Opción B: Edge Function de Supabase con SMTP

**Ventajas:**
- ✅ Más control sobre el envío
- ✅ Usar dominio propio
- ✅ Sin límites de emails (depende del SMTP)

### Paso 1: Instalar Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref iqwwoihiiyrtypyqzhgy
```

### Paso 2: Crear Edge Function

```bash
supabase functions new enviar-email-recuperacion
```

### Paso 3: Editar la Edge Function

Abre `supabase/functions/enviar-email-recuperacion/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { destinatario, token, username, enlace } = await req.json()

    // Configurar Resend con tu API key
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    const { data, error } = await resend.emails.send({
      from: 'Saki Sushi <noreply@sakisushi.com>',
      to: [destinatario],
      subject: '🍣 Recuperación de Contraseña - Saki Sushi',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #D32F2F, #b71c1c); color: white; padding: 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: #D32F2F; color: white; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>🍣 Saki Sushi</h1></div>
            <div class="content">
              <h2>Hola ${username},</h2>
              <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
              <a href="${enlace}" class="button">Restablecer Contraseña</a>
              <div class="warning">
                <strong>⚠️ Este enlace expirará en 1 hora</strong><br>
                Si no solicitaste este cambio, ignora este email.
              </div>
            </div>
            <div class="footer">&copy; 2024 Saki Sushi</div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      throw new Error(error.message)
    }

    return new Response(JSON.stringify({ success: true, data }), {
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

### Paso 4: Configurar Variables de Entorno

En el Dashboard de Supabase:
1. Ve a **Edge Functions**
2. Haz clic en **Manage Secrets**
3. Agrega tu API key de Resend o SMTP:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

### Paso 5: Deploy

```bash
supabase functions deploy enviar-email-recuperacion
```

### Paso 6: Actualizar JavaScript

El código ya está configurado para llamar a esta función automáticamente si EmailJS no está configurado.

---

## Opción C: Resend (Alternativa moderna)

**Ventajas:**
- ✅ 100 emails/día gratis
- ✅ Fácil configuración
- ✅ Dominio personalizado
- ✅ Excelente deliverability

### Paso 1: Crear cuenta en Resend

1. Ve a [https://resend.com/](https://resend.com/)
2. Regístrate con GitHub o email
3. Obtén tu API Key del dashboard

### Paso 2: Configurar dominio (opcional pero recomendado)

1. En Resend, ve a **Domains**
2. Agrega tu dominio (ej: `sakisushi.com`)
3. Configura los registros DNS en tu hosting:

```
Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10

Type: TXT
Name: @
Value: v=spf1 include:amazonses.com ~all
```

### Paso 3: Usar con Edge Function

Sigue los pasos de la **Opción B** usando Resend como se muestra en el ejemplo.

---

## Pruebas de Seguridad

### 1. Test de Tokens Únicos

```sql
-- Generar múltiples tokens y verificar que son únicos
SELECT 
    COUNT(*) as total_tokens,
    COUNT(DISTINCT token) as tokens_unicos,
    COUNT(*) - COUNT(DISTINCT token) as duplicados
FROM recuperacion_tokens;

-- Debe mostrar 0 duplicados
```

### 2. Test de Expiración

```sql
-- Simular token expirado manualmente para testing
INSERT INTO recuperacion_tokens (usuario_id, token, email, expira_en, usado)
SELECT 
    id,
    'token_test_expirado_12345',
    email_recuperacion,
    NOW() - INTERVAL '2 hours',  -- Expirado hace 2 horas
    false
FROM usuarios 
WHERE username = 'admin'
LIMIT 1;

-- Intentar validar (debe fallar)
SELECT * FROM validar_token_recuperacion('token_test_expirado_12345');
```

### 3. Test de Ventana de Reuso

```sql
-- 1. Generar token válido
SELECT * FROM generar_token_recuperacion(
    (SELECT id FROM usuarios WHERE username = 'admin' LIMIT 1),
    'test@sakisushi.com',
    '127.0.0.1',
    'Test Browser'
);

-- Copiar el token generado y validar múltiples veces
-- Debe funcionar dentro de los 10 minutos posteriores al primer uso
```

### 4. Test de Fortalez de Contraseñas

```javascript
// En la consola del navegador
const passwords = [
    '123',           // Muy corta - DEBE FALLAR
    '123456',        // Mínima - DEBE PASAR
    'password',      // Sin números - DEBE FALLAR
    '12345678',      // Solo números - DEBE FALLAR (sin letras)
    'Pass123',       // Válida - DEBE PASAR
];

passwords.forEach(pass => {
    console.log(`Password: "${pass}" - Longitud: ${pass.length}`);
    console.log(`  Tiene letra: ${/[a-zA-Z]/.test(pass)}`);
    console.log(`  Tiene número: ${/\d/.test(pass)}`);
    console.log(`  Válida: ${pass.length >= 6 && /[a-zA-Z]/.test(pass) && /\d/.test(pass)}`);
});
```

### 5. Test de Hashing

```sql
-- Verificar que las contraseñas están hasheadas
SELECT username, password_hash FROM usuarios LIMIT 3;

-- Los password_hash deben verse como: $2a$08$xxxxxxxx...
-- NO deben ser texto plano
```

### 6. Test de Inyección SQL

```javascript
// Intentar inyección SQL en el email
const maliciousEmail = "test@test.com'; DROP TABLE usuarios; --";

// El sistema debe rechazarlo por validación de formato
```

### 7. Test de Rate Limiting (Recomendado implementar)

Agrega esta función para limitar intentos:

```sql
CREATE OR REPLACE FUNCTION verificar_rate_limit(p_email TEXT, p_max_intentos INTEGER DEFAULT 5)
RETURNS BOOLEAN AS $$
DECLARE
    v_intentos INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_intentos
    FROM recuperacion_tokens
    WHERE email = LOWER(TRIM(p_email))
      AND creado_en > NOW() - INTERVAL '1 hour';
    
    RETURN v_intentos < p_max_intentos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8. Checklist de Seguridad

- [ ] ✅ Tokens generados con `gen_random_bytes(32)` (256 bits de entropía)
- [ ] ✅ Expiración de 1 hora configurada
- [ ] ✅ Ventana de reuso de 10 minutos
- [ ] ✅ Contraseñas hasheadas con bcrypt (8 rounds)
- [ ] ✅ RLS habilitado en todas las tablas
- [ ] ✅ Funciones usan `SECURITY DEFINER`
- [ ] ✅ Validación de formato de email
- [ ] ✅ Invalidación de tokens anteriores al generar nuevo
- [ ] ✅ Limpieza automática de tokens expirados
- [ ] [ ] Rate limiting implementado (opcional)
- [ ] [ ] Logging de intentos sospechosos (opcional)

---

## Solución de Problemas

### Problema: "No se encontró ningún usuario con este email"

**Causa:** El campo `email_recuperacion` está vacío para ese usuario.

**Solución:**
```sql
UPDATE usuarios 
SET email_recuperacion = 'tu@email.com'
WHERE username = 'nombre_usuario';
```

### Problema: "Token inválido o expirado"

**Causas posibles:**
1. Token expiró (más de 1 hora)
2. Token ya fue usado fuera de la ventana de 10 minutos
3. Token mal copiado/pegado

**Solución:** Solicitar nuevo token

### Problema: Emails no llegan

**Verificar:**
1. Credenciales de EmailJS/SMTP correctas
2. Email no está en spam
3. Límites del servicio no excedidos
4. Consola del navegador para errores

### Problema: Error de permisos en funciones RPC

**Solución:**
```sql
-- Re-ejecutar grants
GRANT EXECUTE ON FUNCTION verificar_email_recuperacion TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generar_token_recuperacion TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validar_token_recuperacion TO anon, authenticated;
GRANT EXECUTE ON FUNCTION actualizar_contrasena_con_token TO anon, authenticated;
```

### Problema: La contraseña no se actualiza

**Verificar:**
1. Token es válido (no expirado)
2. Contraseña cumple requisitos mínimos (6+ caracteres, letra, número)
3. Usuario está activo

---

## URLs Importantes

- **Página de recuperación:** `https://sakisushi.com/recuperar-password.html`
- **Enlace con token:** `https://sakisushi.com/recuperar-password.html?token=XYZ123`
- **Login admin:** `https://sakisushi.com/admin/index.html`

---

## Contacto y Soporte

Para problemas específicos de implementación, revisa:
1. Logs de la consola del navegador (F12)
2. Logs de Supabase en el Dashboard
3. Logs de EmailJS/Resend en sus respectivos dashboards

---

**Última actualización:** Enero 2024  
**Versión del sistema:** 1.0.0
