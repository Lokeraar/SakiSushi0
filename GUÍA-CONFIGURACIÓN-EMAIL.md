# 📧 Guía Completa de Configuración de Email para Recuperación de Contraseña

## ✅ Cambios Realizados en el Código

### 1. Archivo `recuperar-password.js` - CORREGIDO

**Problemas solucionados:**
- ❌ Antes: Usaba credenciales hardcoded (`TU_SUPABASE_URL`, `TU_SUPABASE_ANON_KEY`)
- ✅ Ahora: Usa `window.supabaseClient` desde `supabase-config.js`

- ❌ Antes: Llamaba a función RPC inexistente `solicitar_recuperacion()`
- ✅ Ahora: 
  1. Llama a `generar_token_recuperacion()` (que SÍ existe en SQL)
  2. Construye el enlace de recuperación
  3. Invoca la Edge Function `enviar-email-recuperacion`

- ❌ Antes: Usaba nombre incorrecto `actualizar_password_con_token`
- ✅ Ahora: Usa `actualizar_contrasena_con_token` (nombre correcto del SQL)

---

## 🔧 CONFIGURACIÓN MANUAL REQUERIDA

### PASO 1: Ejecutar el Script SQL en Supabase

1. Ve al [Dashboard de Supabase](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (en el menú lateral)
4. Copia y pega TODO el contenido del archivo `recuperacion_tokens.sql`
5. Haz clic en **Run** para ejecutar

**Verifica que aparezcan estos mensajes:**
```
✅ Tabla recuperacion_tokens creada
✅ Funciones RPC creadas
✅ Columna email_recuperacion agregada
✅ Permisos configurados
```

---

### PASO 2: Configurar Variables de Entorno para la Edge Function

La Edge Function `enviar-email-recuperacion` necesita variables de entorno para enviar emails con SMTP.

#### Opción A: Desde la CLI de Supabase (Recomendado)

1. Abre tu terminal en la carpeta del proyecto
2. Ejecuta estos comandos (reemplaza con TUS datos de Gmail):

```bash
# Navega al directorio de funciones
cd supabase/functions/enviar-email-recuperacion

# Configura las variables de entorno
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=tu_correo@gmail.com
supabase secrets set SMTP_PASS=tu_app_password_de_gmail
supabase secrets set SMTP_FROM="Saki Sushi <tu_correo@gmail.com>"
```

#### Opción B: Desde el Dashboard de Supabase

1. Ve a tu proyecto en Supabase
2. Navega a **Edge Functions** → **Secrets**
3. Agrega estas variables UNA POR UNA:

| Nombre | Valor | Ejemplo |
|--------|-------|---------|
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Tu email Gmail | `tu_correo@gmail.com` |
| `SMTP_PASS` | App Password de Gmail | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | Remitente | `Saki Sushi <tu_correo@gmail.com>` |

---

### PASO 3: Obtener App Password de Gmail

Si usas Gmail, necesitas un "App Password" porque Google no permite contraseñas normales en apps externas:

1. Ve a tu [Cuenta de Google](https://myaccount.google.com/)
2. Selecciona **Seguridad** en el menú izquierdo
3. Activa la **Verificación en 2 pasos** (si no está activa)
4. Ve a **Contraseñas de aplicaciones**: https://myaccount.google.com/apppasswords
5. Selecciona:
   - Aplicación: `Correo`
   - Dispositivo: `Otro (Nombre personalizado)` → pon "Saki Sushi"
6. Haz clic en **Generar**
7. Copia la contraseña de 16 caracteres (ej: `abcd efgh ijkl mnop`)
8. **IMPORTANTE:** Guarda esta contraseña, solo la verás una vez

---

### PASO 4: Actualizar Emails de los Usuarios

Necesitas agregar el campo `email_recuperacion` a tus usuarios en la base de datos:

#### Opción A: Desde el Dashboard de Supabase

1. Ve a **Table Editor**
2. Selecciona la tabla `usuarios`
3. Agrega/EDITA la columna `email_recuperacion` para cada usuario
4. Ejemplo:
   - Usuario `admin` → `admin@sakisushi.com`
   - Usuario `cajero1` → `cajero@sakisushi.com`

#### Opción B: Con SQL

Ejecuta este SQL en el **SQL Editor**:

```sql
-- Actualizar emails de recuperación (AJUSTA CON TUS DATOS REALES)
UPDATE usuarios 
SET email_recuperacion = 'tu_email@gmail.com'
WHERE username = 'admin';

UPDATE usuarios 
SET email_recuperacion = 'tu_email@gmail.com'
WHERE username IN ('cajero1', 'cajero2');

-- Verificar que se actualizó
SELECT username, email_recuperacion FROM usuarios;
```

---

### PASO 5: Desplegar la Edge Function

Después de configurar las variables de entorno, despliega la función:

```bash
# Desde la raíz del proyecto
supabase functions deploy enviar-email-recuperacion
```

O desde el Dashboard:
1. Ve a **Edge Functions**
2. Busca `enviar-email-recuperacion`
3. Haz clic en **Deploy**

---

### PASO 6: Verificar la URL de la Edge Function

La URL de tu Edge Function será:
```
https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/enviar-email-recuperacion
```

Tu código JS ya la llama automáticamente usando:
```javascript
supabase.functions.invoke('enviar-email-recuperacion', {...})
```

---

## 🧪 PRUEBAS

### Test 1: Envío de Email

1. Abre `http://localhost:8000/recuperar-password.html?usuario=admin`
2. Ingresa el email de recuperación que configuraste
3. Haz clic en "Enviar Enlace"
4. **Deberías ver:**
   - Spinner de carga
   - Mensaje "¡Correo Enviado!"
   - Email en tu bandeja de entrada (o Spam)

### Test 2: Reset de Contraseña

1. Abre el email recibido
2. Haz clic en el botón "🔐 Restablecer Contraseña"
3. Ingresa nueva contraseña (mínimo 6 caracteres)
4. Confirma la contraseña
5. Haz clic en "Actualizar Contraseña"
6. **Deberías ver:**
   - Spinner de carga
   - Mensaje "¡Contraseña actualizada! Redirigiendo..."
   - Redirección al login

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: "No aparece animación ni mensaje de enviado"

**Causa:** Error en JavaScript antes de llegar al éxito

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que `supabase-config.js` se cargue ANTES que `recuperar-password.js`

### Problema: "No llega el email"

**Causa 1:** Variables de entorno no configuradas

**Solución:**
```bash
# Verifica las variables
supabase secrets list
```

**Causa 2:** Edge Function no desplegada

**Solución:**
```bash
supabase functions deploy enviar-email-recuperacion
```

**Causa 3:** Error en logs de la función

**Solución:**
1. Ve a Dashboard → Edge Functions → `enviar-email-recuperacion`
2. Haz clic en **Logs**
3. Busca errores recientes

**Causa 4:** Gmail bloquea el envío

**Solución:**
- Verifica que usas App Password, NO tu contraseña normal
- Revisa que la verificación en 2 pasos esté activa
- Intenta desde otra cuenta de email temporalmente

### Problema: "Token inválido o error al generar"

**Causa:** Script SQL no ejecutado

**Solución:**
1. Ve a SQL Editor en Supabase
2. Ejecuta TODO el archivo `recuperacion_tokens.sql`
3. Verifica que aparecen las funciones:
   - `generar_token_recuperacion`
   - `validar_token_recuperacion`
   - `actualizar_contrasena_con_token`

### Problema: "El correo no coincide con el usuario"

**Causa:** Campo `email_recuperacion` vacío o incorrecto

**Solución:**
```sql
-- Verificar emails actuales
SELECT username, email_recuperacion FROM usuarios;

-- Actualizar si es necesario
UPDATE usuarios 
SET email_recuperacion = 'tu_email@gmail.com'
WHERE username = 'admin';
```

---

## 📋 CHECKLIST FINAL

- [ ] Ejecutar `recuperacion_tokens.sql` en Supabase
- [ ] Configurar variables de entorno SMTP en Edge Function
- [ ] Obtener y configurar App Password de Gmail
- [ ] Actualizar campo `email_recuperacion` en usuarios
- [ ] Desplegar Edge Function `enviar-email-recuperacion`
- [ ] Probar flujo completo de recuperación
- [ ] Verificar que llega el email
- [ ] Probar reset de contraseña con el enlace

---

## 🔗 Archivos Modificados

1. `/workspace/recuperar-password.js` - Lógica corregida
2. `/workspace/recuperacion_tokens.sql` - Ya estaba correcto
3. `/workspace/supabase/functions/enviar-email-recuperacion/index.ts` - Ya estaba correcto

**NO necesitas modificar:**
- `supabase-config.js` - Ya tiene las credenciales correctas
- `recuperar-password.html` - La interfaz está bien

---

## ⚠️ NOTAS IMPORTANTES

1. **Seguridad:** Nunca compartas tu App Password de Gmail
2. **Límites:** Gmail tiene límite de ~500 emails/día
3. **Spam:** Los primeros emails pueden ir a Spam, revisa esa carpeta
4. **Expiración:** El token expira en 1 hora, úsalo rápido
5. **Reuso:** El token puede usarse múltiples veces en los primeros 10 minutos

---

## 📞 SOPORTE

Si después de seguir esta guía el problema persiste:

1. Revisa los logs de la Edge Function en el Dashboard
2. Abre la consola del navegador (F12) y busca errores
3. Verifica que TODOS los pasos del checklist estén completados
4. Prueba con un email diferente (outlook, yahoo, etc.)
