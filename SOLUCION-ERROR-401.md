# 🔧 SOLUCIÓN ERROR 401 - Recuperación de Contraseña

## Diagnóstico del Problema

El error 401 que ves en la consola indica que la Edge Function `enviar-email-recuperacion` no está funcionando correctamente. Esto generalmente se debe a que:

1. ❌ Las variables de entorno SMTP NO están configuradas en Supabase
2. ❌ La función no fue desplegada después de configurar las variables
3. ❌ Las credenciales SMTP son incorrectas

---

## ✅ PASOS PARA SOLUCIONARLO

### Paso 1: Configurar Variables de Entorno en Supabase

1. Ve al Dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto: `iqwwoihiiyrtypyqzhgy`
3. Navega a: **Edge Functions** → **enviar-email-recuperacion**
4. Haz clic en **"Secrets"** o **"Variables de Entorno"**
5. Agrega las siguientes variables EXACTAMENTE así:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=christiandrm123@gmail.com
SMTP_PASS=ghdq ujxb okvf yyct
SMTP_FROM=Saki Sushi <christiandrm123@gmail.com>
```

**⚠️ IMPORTANTE:** 
- Asegúrate de copiar la contraseña de aplicación SIN espacios adicionales al inicio o final
- No uses tu contraseña normal de Gmail, solo la contraseña de aplicación
- Verifica que la verificación en dos pasos esté activada en tu cuenta de Google

### Paso 2: Verificar la Configuración de la Cuenta Google

1. Ve a: https://myaccount.google.com/security
2. Confirma que la **Verificación en dos pasos** esté ACTIVADA
3. Ve a: https://myaccount.google.com/apppasswords
4. Verifica que la contraseña de aplicación exista y sea correcta
5. Si es necesario, genera una NUEVA contraseña de aplicación y actualiza `SMTP_PASS`

### Paso 3: Desplegar la Edge Function

Después de configurar las variables, debes asegurar que la función esté desplegada:

#### Opción A: Usando Supabase CLI (Recomendado)

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

#### Opción B: Desde el Dashboard

1. Ve a Edge Functions → `enviar-email-recuperacion`
2. Si hay cambios pendientes, haz clic en **"Deploy"**
3. Espera a que el deployment termine exitosamente

### Paso 4: Verificar Logs en Tiempo Real

Para ver qué está pasando:

```bash
supabase functions logs enviar-email-recuperacion
```

O desde el Dashboard:
1. Edge Functions → `enviar-email-recuperacion` → **Logs**
2. Intenta enviar un email de recuperación
3. Observa los logs para ver errores específicos

---

## 🧪 PROBAR LA FUNCIÓN

1. Abre tu página: `recuperar-password.html`
2. Ingresa el correo: `christiandrm123@gmail.com`
3. Haz clic en "Enviar enlace"
4. Abre la consola del navegador (F12) y verifica:
   - Que NO aparezca el error 401
   - Que aparezca el mensaje de éxito
5. Revisa tu bandeja de entrada (y spam) para el email de recuperación

---

## 🔍 ERRORES COMUNES Y SOLUCIONES

### Error: "Authentication failed"
**Causa:** Contraseña incorrecta o necesitas contraseña de aplicación
**Solución:** 
- Genera una nueva contraseña de aplicación en Google
- Actualiza `SMTP_PASS` en las variables de entorno
- Redeploya la función

### Error: "No hay ningún servicio de email configurado"
**Causa:** Las variables SMTP no están configuradas
**Solución:** 
- Agrega las 5 variables listadas arriba
- Verifica que estén guardadas en Secrets
- Redeploya la función

### Error: "Connection timeout"
**Causa:** Puerto incorrecto o firewall
**Solución:** 
- Usa puerto 587 para Gmail (TLS)
- Verifica que tu hosting permita conexiones SMTP salientes

### Error 401 persistente
**Causa:** La clave anónima no tiene permisos para invocar funciones
**Solución:**
1. Ve a Project Settings → API en Supabase
2. Verifica que la clave anónima (`sb_publishable_...`) tenga permisos
3. Si es necesario, regenera la clave y actualiza `supabase-config.js`

---

## 📋 VERIFICACIÓN FINAL

Antes de probar, confirma:

- [ ] Variables SMTP configuradas en Supabase Secrets
- [ ] Función desplegada después de configurar variables
- [ ] Contraseña de aplicación generada (no contraseña normal)
- [ ] Verificación en dos pasos activada en Google
- [ ] Logs mostrando "Configuración SMTP detectada"
- [ ] `supabase-config.js` tiene la URL y clave correctas

---

## 🆘 SI EL PROBLEMA PERSISTE

1. **Revisa los logs completos** en el Dashboard de Supabase
2. **Prueba con Resend** como alternativa:
   - Regístrate en https://resend.com
   - Obtén tu API key
   - Agrega `RESEND_API_KEY=tu_api_key` a las variables
   - La función usará Resend automáticamente si está disponible

3. **Contacta soporte** con:
   - Captura de pantalla del error 401
   - Logs de la Edge Function
   - Confirmación de que las variables están configuradas

---

**Fecha:** $(date +%Y-%m-%d)
**Proyecto:** iqwwoihiiyrtypyqzhgy
**Email configurado:** christiandrm123@gmail.com
**Estado:** Pendiente de configuración SMTP
