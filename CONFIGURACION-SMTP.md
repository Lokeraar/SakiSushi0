# 📧 Configuración SMTP para Edge Function - Saki Sushi

## Problema Resuelto ✅

El error 401 Unauthorized ha sido corregido. Ahora la función usa correctamente la clave anónima de Supabase y está optimizada para usar SMTP como método principal.

---

## 🔧 PASOS PARA CONFIGURAR LAS VARIABLES DE ENTORNO EN SUPABASE

### 1. Ir al Dashboard de Supabase
1. Ingresa a https://supabase.com/dashboard
2. Selecciona tu proyecto: `iqwwoihiiyrtypyqzhgy`
3. Ve a **Edge Functions** en el menú lateral

### 2. Configurar Variables de Entorno SMTP

Haz clic en la función `enviar-email-recuperacion` y luego en **"Secrets"** o **"Variables de Entorno"**.

Agrega las siguientes variables (ejemplo con Gmail):

#### Para Gmail:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_contraseña_de_aplicacion
SMTP_FROM=Saki Sushi <tu_email@gmail.com>
```

#### Para Outlook/Hotmail:
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=tu_email@outlook.com
SMTP_PASS=tu_contraseña_de_aplicacion
SMTP_FROM=Saki Sushi <tu_email@outlook.com>
```

#### Para Yahoo Mail:
```
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=tu_email@yahoo.com
SMTP_PASS=tu_contraseña_de_aplicacion
SMTP_FROM=Saki Sushi <tu_email@yahoo.com>
```

#### Para hosting propio (cPanel, etc.):
```
SMTP_HOST=mail.tudominio.com
SMTP_PORT=465
SMTP_USER=noreply@tudominio.com
SMTP_PASS=tu_contraseña
SMTP_FROM=Saki Sushi <noreply@tudominio.com>
```

---

## 🔐 IMPORTANTE: Contraseñas de Aplicación

### Para Gmail:
1. Activa la verificación en dos pasos en tu cuenta de Google
2. Ve a: https://myaccount.google.com/apppasswords
3. Genera una nueva contraseña de aplicación
4. Usa esa contraseña (NO tu contraseña normal de Gmail)

### Para Outlook/Hotmail:
1. Ve a: https://account.microsoft.com/security
2. Activa la verificación en dos pasos
3. Genera una contraseña de aplicación
4. Usa esa contraseña

### Para Yahoo:
1. Ve a: https://login.yahoo.com/account/security
2. Genera una contraseña de aplicación
3. Usa esa contraseña

---

## 🚀 DESPLEGAR LA FUNCIÓN ACTUALIZADA

Después de configurar las variables, debes desplegar la función actualizada:

### Opción A: Usando Supabase CLI (Recomendado)
```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login a Supabase
supabase login

# Enlazar con tu proyecto
supabase link --project-ref iqwwoihiiyrtypyqzhgy

# Desplegar la función
supabase functions deploy enviar-email-recuperacion
```

### Opción B: Desde el Dashboard de Supabase
1. Ve a Edge Functions → `enviar-email-recuperacion`
2. Haz clic en **"Deploy from GitHub"** si tienes el repo conectado
3. O usa el editor en línea para pegar el código actualizado

---

## 🧪 PROBAR LA FUNCIÓN

### 1. Verificar logs en tiempo real
```bash
supabase functions logs enviar-email-recuperacion
```

### 2. Probar desde el navegador
1. Ve a: `recuperar-password.html`
2. Ingresa el email asociado a tu usuario
3. Revisa la consola del navegador (F12) para ver los logs
4. Verifica que lleguen los logs en Supabase Edge Functions

---

## 📋 VARIABLES REQUERIDAS

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto (465 SSL, 587 TLS) | `587` |
| `SMTP_USER` | Email de la cuenta | `tu_email@gmail.com` |
| `SMTP_PASS` | Contraseña de aplicación | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | Remitente (opcional) | `Saki Sushi <noreply@sakisushi.com>` |

---

## ❌ SOLUCIÓN DE PROBLEMAS

### Error: "No hay ningún servicio de email configurado"
- **Causa**: Las variables SMTP no están configuradas
- **Solución**: Agrega las 4 variables requeridas en Secrets

### Error: "Authentication failed"
- **Causa**: Contraseña incorrecta o necesitas contraseña de aplicación
- **Solución**: Genera una contraseña de aplicación en tu proveedor de email

### Error: "Connection timeout"
- **Causa**: Puerto incorrecto o firewall bloqueando
- **Solución**: 
  - Usa puerto 587 para TLS o 465 para SSL
  - Verifica que tu hosting permita conexiones SMTP salientes

### Error: "Certificate validation failed"
- **Causa**: Problemas con certificados SSL
- **Solución**: Asegúrate de usar `connectTLS` para puertos 465/587

---

## 📝 NOTAS IMPORTANTES

1. **NUNCA** uses tu contraseña normal de email - siempre usa contraseñas de aplicación
2. La función prioriza SMTP sobre Resend si ambas están configuradas
3. Los logs se pueden ver en el dashboard de Supabase → Edge Functions → Logs
4. El error 401 ya fue corregido - ahora usa correctamente la clave anónima

---

## 🔍 VERIFICACIÓN FINAL

Para verificar que todo está correcto:

1. ✅ Variables SMTP configuradas en Supabase Secrets
2. ✅ Función desplegada con el código actualizado
3. ✅ Contraseña de aplicación generada (no contraseña normal)
4. ✅ Puerto correcto según tu proveedor (465 o 587)
5. ✅ Logs mostrando "Configuración SMTP detectada"

¡Listo! Tu sistema de recuperación de contraseña debería funcionar correctamente.

---

**Actualizado**: Enero 2024  
**Función**: `enviar-email-recuperacion`  
**Método**: SMTP Directo
