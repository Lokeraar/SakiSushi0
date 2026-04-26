# 🍣 SISTEMA DE RECUPERACIÓN DE CONTRASEÑA - SAKI SUSHI

## 📋 Descripción

Sistema personalizado de recuperación de contraseña que permite **emails compartidos** entre múltiples usuarios, independiente de Supabase Auth.

### ✨ Características Principales

- ✅ **Emails compartidos permitidos**: Múltiples usuarios pueden tener el mismo `email_recuperacion`
- ✅ **Tokens únicos e irrepetibles**: Generados con `gen_random_bytes(32)` (256 bits de entropía)
- ✅ **Expiración de tokens**: 1 hora de validez
- ✅ **Reuso limitado**: Los tokens pueden usarse múltiples veces en una ventana de 10 minutos
- ✅ **Contraseñas hasheadas**: bcrypt con 8 rounds de salt
- ✅ **Independiente de Supabase Auth**: Usa tablas personalizadas
- ✅ **Envío de emails flexible**: Soporta EmailJS, Resend, o SMTP directo

---

## 📁 Archivos del Sistema

```
/workspace/
├── recuperacion_tokens.sql              # Script SQL para crear tabla y funciones
├── recuperar-password.html              # Página de recuperación (formulario + nueva contraseña)
├── recuperar-password.js                # Lógica JavaScript del flujo
├── CONFIGURACION-EMAILS.md              # Guía detallada de configuración de emails
├── IMPLEMENTACION-COMPLETA.md           # Este archivo - Instrucciones paso a paso
└── supabase/
    └── functions/
        └── enviar-email-recuperacion/
            ├── index.ts                 # Edge Function para envío de emails
            └── .env.example             # Ejemplo de variables de entorno
```

---

## 🚀 INSTALACIÓN PASO A PASO

### Paso 1: Ejecutar Script SQL en Supabase

1. **Accede al Dashboard de Supabase:**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto: `iqwwoihiiyrtypyqzhgy`

2. **Abre el SQL Editor:**
   - Navega a **SQL Editor** en el menú lateral
   - Haz clic en **New Query**

3. **Ejecuta el script:**
   - Copia TODO el contenido de `/workspace/recuperacion_tokens.sql`
   - Pégalo en el editor SQL
   - Haz clic en **Run** o presiona `Ctrl/Cmd + Enter`

4. **Verifica la instalación:**
   
   Ejecuta estas consultas para confirmar que todo se creó correctamente:

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

   **Deberías ver:**
   - ✅ Tabla `recuperacion_tokens`
   - ✅ Funciones: `verificar_email_recuperacion`, `generar_token_recuperacion`, `validar_token_recuperacion`, `actualizar_contrasena_con_token`, `eliminar_tokens_expirados`
   - ✅ Columna `email_recuperacion` en tabla `usuarios`

5. **Configura emails de recuperación para usuarios existentes:**

   ```sql
   -- Asignar emails de recuperación a usuarios existentes
   UPDATE usuarios
   SET email_recuperacion = 'admin@sakisushi.com'
   WHERE username = 'admin';

   UPDATE usuarios
   SET email_recuperacion = 'cajero@sakisushi.com'
   WHERE username IN ('cajero1', 'cajero2');

   -- Verificar configuración
   SELECT id, username, nombre, email_recuperacion FROM usuarios;
   ```

---

### Paso 2: Configurar Servicio de Emails

El sistema soporta **3 métodos** de envío de emails. Elige el que prefieras:

#### Opción A: EmailJS (Más fácil - Recomendado para empezar)

**Ventajas:** Gratis hasta 200 emails/mes, sin servidor backend

1. **Crea cuenta en EmailJS:**
   - Ve a https://www.emailjs.com/
   - Regístrate gratuitamente

2. **Configura Email Service:**
   - Ve a **Email Services** > **Add New Service**
   - Selecciona Gmail (u otro proveedor)
   - Conecta tu cuenta
   - Anota el **Service ID**

3. **Crea Email Template:**
   - Ve a **Email Templates** > **Create New Template**
   - Usa esta plantilla:

   ```html
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
           <div class="header">
               <h1>🍣 Saki Sushi</h1>
               <p>Recuperación de Contraseña</p>
           </div>
           <div class="content">
               <h2>Hola {{username}},</h2>
               <p>Hemos recibido una solicitud para restablecer tu contraseña:</p>
               <a href="{{recovery_link}}" class="button">Restablecer Contraseña</a>
               <div class="warning">
                   <strong>⚠️ Importante:</strong>
                   <ul>
                       <li>Este enlace expirará en {{expiry_hours}} hora(s)</li>
                       <li>Si no solicitaste este cambio, ignora este email</li>
                   </ul>
               </div>
           </div>
           <div class="footer">
               <p>&copy; 2024 Saki Sushi</p>
           </div>
       </div>
   </body>
   </html>
   ```

   - Agrega las variables: `{{username}}`, `{{recovery_link}}`, `{{expiry_hours}}`
   - Anota el **Template ID**

4. **Obtén tu Public Key:**
   - Ve a **Account** > **API Keys**
   - Copia tu **Public Key**

5. **Configura en recuperar-password.js:**

   Abre `/workspace/recuperar-password.js` y actualiza:

   ```javascript
   const CONFIG = {
       // ... resto de configuración ...
       
       EMAILJS_PUBLIC_KEY: 'TU_PUBLIC_KEY_AQUI',      // Ej: 'user_abc123'
       EMAILJS_SERVICE_ID: 'TU_SERVICE_ID_AQUI',       // Ej: 'service_gmail01'
       EMAILJS_TEMPLATE_ID: 'TU_TEMPLATE_ID_AQUI',     // Ej: 'template_recovery01'
       
       // ... resto de configuración ...
   };
   ```

#### Opción B: Edge Function con Resend (Recomendado para producción)

**Ventajas:** 100 emails/día gratis, dominio personalizado, mejor deliverability

1. **Crea cuenta en Resend:**
   - Ve a https://resend.com/
   - Regístrate (puedes usar GitHub)
   - Obtén tu API Key del dashboard

2. **Configura en Supabase:**
   - En el Dashboard de Supabase, ve a **Edge Functions** > **Manage Secrets**
   - Agrega: `RESEND_API_KEY` = `re_xxxxxxxxxxxxxxxx`

3. **Deploy de la Edge Function:**

   ```bash
   # Instala Supabase CLI si no lo tienes
   npm install -g supabase
   
   # Inicia sesión
   supabase login
   
   # Link a tu proyecto
   supabase link --project-ref iqwwoihiiyrtypyqzhgy
   
   # Deploy
   supabase functions deploy enviar-email-recuperacion
   ```

4. **Verifica el deploy:**
   - La función ya está configurada para llamarse automáticamente desde el JS

#### Opción C: SMTP Directo

**Ventajas:** Usar tu propio servidor de emails

1. **Configura variables en Supabase:**
   
   En **Edge Functions** > **Manage Secrets**, agrega:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_email@gmail.com
   SMTP_PASS=tu_app_password
   SMTP_FROM=Saki Sushi <tu_email@gmail.com>
   ```

2. **Para Gmail, genera App Password:**
   - Ve a tu Cuenta de Google > Seguridad
   - Activa verificación en 2 pasos
   - Genera App Password
   - Usa ese password de 16 caracteres

---

### Paso 3: Integración con Login de Admin

El sistema ya está integrado con la página de login de admin. El flujo es:

1. **Desde el login de admin (`/admin/index.html`):**
   - El usuario selecciona su usuario
   - Hace clic en "¿Olvidaste la contraseña?"
   - Es redirigido a `/recuperar-password.html`

2. **En `/recuperar-password.html`:**
   - Se muestran todos los usuarios activos para seleccionar
   - El usuario selecciona SU usuario específico
   - Ingresa el email de recuperación asociado
   - Recibe el token por email

3. **Desde el email:**
   - El usuario hace clic en el enlace con token
   - Valida automáticamente el token
   - Establece nueva contraseña
   - Es redirigido al login

**El enlace de recuperación ya está configurado en el login:**
```html
<a href="../recuperar-password.html" id="recoveryLink">¿Olvidaste la contraseña?</a>
```

---

## 🔒 SEGURIDAD

### Tokens

- **Generación:** `gen_random_bytes(32)` = 256 bits de entropía
- **Expiración:** 1 hora desde creación
- **Reuso:** Permitido por 10 minutos después del primer uso
- **Invalidación:** Automática al cambiar contraseña

### Contraseñas

- **Hashing:** bcrypt con 8 rounds
- **Requisitos mínimos:** 6 caracteres, 1 letra, 1 número
- **Almacenamiento:** Campo `password_hash` en tabla `usuarios`

### Protección RLS

- Row Level Security habilitado en `recuperacion_tokens`
- Funciones usan `SECURITY DEFINER`
- Grants limitados a operaciones necesarias

### Rate Limiting (Recomendado implementar)

Agrega esta función para limitar intentos por hora:

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

---

## 🧪 PRUEBAS

### Test 1: Flujo Completo

1. Abre `/recuperar-password.html` en tu navegador
2. Selecciona un usuario (ej: admin)
3. Ingresa el email de recuperación configurado
4. Haz clic en "Enviar Enlace de Recuperación"
5. Revisa tu email (revisa spam si no llega)
6. Haz clic en el enlace del email
7. Establece una nueva contraseña
8. Intenta iniciar sesión con la nueva contraseña

### Test 2: Validación de Token Expirado

```sql
-- Insertar token expirado manualmente
INSERT INTO recuperacion_tokens (usuario_id, token, email, expira_en, usado)
SELECT
    id,
    'token_test_expirado_12345',
    email_recuperacion,
    NOW() - INTERVAL '2 hours',
    false
FROM usuarios
WHERE username = 'admin'
LIMIT 1;

-- Intentar validar (debe fallar)
SELECT * FROM validar_token_recuperacion('token_test_expirado_12345');
-- Resultado esperado: success = false, error = 'Token expirado'
```

### Test 3: Tokens Únicos

```sql
-- Verificar unicidad de tokens
SELECT
    COUNT(*) as total_tokens,
    COUNT(DISTINCT token) as tokens_unicos,
    COUNT(*) - COUNT(DISTINCT token) as duplicados
FROM recuperacion_tokens;

-- Resultado esperado: duplicados = 0
```

### Test 4: Hashing de Contraseñas

```sql
-- Verificar que las contraseñas están hasheadas
SELECT username, password_hash FROM usuarios LIMIT 3;

-- Deben verse como: $2a$08$xxxxxxxx... (NO texto plano)
```

### Test 5: Ventana de Reuso

1. Genera un token válido
2. Úsalo para establecer nueva contraseña
3. Inmediatamente intenta usarlo de nuevo (dentro de 10 min)
4. Debería funcionar dentro de la ventana de 10 minutos

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Problema: "No se encontró ningún usuario con este email"

**Causa:** El campo `email_recuperacion` está vacío

**Solución:**
```sql
UPDATE usuarios
SET email_recuperacion = 'tu@email.com'
WHERE username = 'nombre_usuario';
```

### Problema: Emails no llegan

**Verificar:**
1. Credenciales de EmailJS/Resend/SMTP correctas
2. Email no está en carpeta de spam
3. Límites del servicio no excedidos
4. Consola del navegador (F12) para errores

**Debug en consola:**
```javascript
// En recuperar-password.js, el token se loguea para testing
console.log('ENLACE DE RECUPERACIÓN:', enlaceRecuperacion);
```

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
2. Contraseña cumple requisitos (6+ caracteres, letra, número)
3. Usuario está activo (`activo = true`)

---

## 📊 ESTRUCTURA DE BASE DE DATOS

### Tabla: `recuperacion_tokens`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Primary key |
| usuario_id | TEXT | FK a usuarios.id |
| token | TEXT | Token único (hex 64 chars) |
| email | TEXT | Email al que se envió |
| ip_origen | TEXT | IP del solicitante |
| user_agent | TEXT | Browser del solicitante |
| creado_en | TIMESTAMP | Fecha de creación |
| expira_en | TIMESTAMP | Fecha de expiración |
| usado | BOOLEAN | Si fue usado |
| usado_en | TIMESTAMP | Cuándo se usó |
| intentos_fallidos | INTEGER | Intentos inválidos |
| ultima_intento | TIMESTAMP | Último intento |

### Funciones RPC

| Función | Propósito |
|---------|-----------|
| `verificar_email_recuperacion(email)` | Busca usuarios por email |
| `generar_token_recuperacion(usuario_id, email)` | Crea token único |
| `validar_token_recuperacion(token)` | Valida token y retorna info |
| `actualizar_contrasena_con_token(token, password)` | Cambia password |
| `eliminar_tokens_expirados()` | Limpieza automática |

---

## 📈 MONITOREO

### Logs de Supabase

1. Ve a **Database** > **Function Logs** en el Dashboard
2. Filtra por nombre de función
3. Revisa errores y tiempos de ejecución

### Métricas Recomendadas

```sql
-- Tokens generados en las últimas 24 horas
SELECT COUNT(*) FROM recuperacion_tokens 
WHERE creado_en > NOW() - INTERVAL '24 hours';

-- Tokens usados exitosamente
SELECT COUNT(*) FROM recuperacion_tokens 
WHERE usado = true AND usado_en > NOW() - INTERVAL '24 hours';

-- Tokens expirados sin usar
SELECT COUNT(*) FROM recuperacion_tokens 
WHERE expira_en < NOW() AND usado = false;

-- Intentos fallidos por email (posible ataque)
SELECT email, COUNT(*) as intentos
FROM recuperacion_tokens
WHERE creado_en > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) > 5;
```

---

## 🎯 URLs IMPORTANTES

| Página | URL |
|--------|-----|
| Login Admin | `https://sakisushi.com/admin/index.html` |
| Recuperación | `https://sakisushi.com/recuperar-password.html` |
| Enlace con Token | `https://sakisushi.com/recuperar-password.html?token=XYZ123` |

---

## 📞 SOPORTE

Para problemas específicos:

1. **Revisa logs del navegador:** F12 > Console
2. **Revisa logs de Supabase:** Dashboard > Function Logs
3. **Revisa logs de EmailJS/Resend:** Sus respectivos dashboards
4. **Verifica configuración SQL:** Ejecuta queries de verificación

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Ejecutar script SQL en Supabase
- [ ] Verificar creación de tabla y funciones
- [ ] Configurar `email_recuperacion` para usuarios existentes
- [ ] Elegir método de envío de emails (EmailJS/Resend/SMTP)
- [ ] Configurar credenciales del servicio elegido
- [ ] Actualizar `recuperar-password.js` con credenciales
- [ ] Deploy de Edge Function (si usa Resend/SMTP)
- [ ] Probar flujo completo de recuperación
- [ ] Verificar que emails llegan correctamente
- [ ] Probar validación de tokens
- [ ] Probar actualización de contraseña
- [ ] Verificar hashing de contraseñas en BD
- [ ] Documentar emails de recuperación configurados

---

**Versión:** 1.0.0  
**Última actualización:** Enero 2024  
**Autor:** Sistema Saki Sushi
