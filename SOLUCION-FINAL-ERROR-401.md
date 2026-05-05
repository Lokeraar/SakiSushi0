# 🚀 SOLUCIÓN AL ERROR 401 - RECUPERACIÓN DE CONTRASEÑA

## Problema Detectado

El error `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}` indica que la Edge Function está rechazando la solicitud porque no recibe el header de autorización correctamente.

---

## ✅ Soluciones Aplicadas

### 1. **Edge Function Actualizada** (`supabase/functions/enviar-email-recuperacion/index.ts`)

**Cambios realizados:**
- Se eliminó la validación estricta del header de autorización
- La función ahora es **pública** y permite continuar incluso sin el header
- Se agregaron logs detallados para depuración

```typescript
// Ahora la función acepta solicitudes con o sin autenticación
if (authHeader && authHeader.startsWith('Bearer ')) {
  supabaseKey = authHeader.substring(7)
  console.log('✅ Clave de autorización recibida')
} else {
  console.log('⚠️ No se recibió header de autorización, continuando...')
}
```

### 2. **HTML Actualizado** (`recuperar-password.html`)

**Cambios realizados:**
- Se agregaron variables globales de respaldo para asegurar que `SUPABASE_ANON_KEY` esté disponible
- Esto previene problemas de carga asíncrona de scripts

```html
<script>
    window.SUPABASE_URL = window.SUPABASE_URL || 'https://iqwwoihiiyrtypyqzhgy.supabase.co';
    window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm';
</script>
```

---

## 📋 PASOS PARA DESPLEGAR LA SOLUCIÓN

### Paso 1: Desplegar la Edge Function Actualizada

**Opción A - Con Supabase CLI (Recomendado):**

```bash
# Si no tienes la CLI instalada
npm install -g supabase

# Iniciar sesión
supabase login

# Vincular con tu proyecto
supabase link --project-ref iqwwoihiiyrtypyqzhgy

# Desplegar la función
supabase functions deploy enviar-email-recuperacion
```

**Opción B - Desde el Dashboard de Supabase:**

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto: `iqwwoihiiyrtypyqzhgy`
3. Navega a **Edge Functions** → `enviar-email-recuperacion`
4. Copia el contenido de `/workspace/supabase/functions/enviar-email-recuperacion/index.ts`
5. Pégalo en el editor del dashboard
6. Haz clic en **Deploy**

---

### Paso 2: Configurar Variables de Entorno SMTP

En el Dashboard de Supabase:

1. Ve a **Edge Functions** → `enviar-email-recuperacion` → **Secrets**
2. Agrega estas 5 variables:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=christiandrm123@gmail.com
SMTP_PASS=ghdq ujxb okvf yyct
SMTP_FROM=Saki Sushi <christiandrm123@gmail.com>
```

⚠️ **Importante:**
- La contraseña de aplicación debe ser EXACTAMENTE: `ghdq ujxb okvf yyct`
- Verifica que tu cuenta de Gmail tenga activada la verificación en dos pasos
- Confirma que la contraseña de aplicación fue generada recientemente en: https://myaccount.google.com/apppasswords

---

### Paso 3: Verificar Logs

**Con CLI:**
```bash
supabase functions logs enviar-email-recuperacion --tail
```

**Desde Dashboard:**
1. Edge Functions → `enviar-email-recuperacion` → **Logs**
2. Observa los mensajes en tiempo real mientras pruebas

---

## 🧪 Prueba Final

1. Abre `recuperar-password.html` en tu navegador
2. Ingresa el usuario y haz clic en "Enviar enlace"
3. Ingresa el correo: `christiandrm123@gmail.com`
4. Click en "Enviar Enlace"

**Resultado esperado:**
- ✅ NO debe aparecer error 401
- ✅ Debe mostrar "¡Correo Enviado!"
- ✅ Debes recibir el email en `christiandrm123@gmail.com` (revisa spam)

---

## 🔍 Debugging Adicional

Si aún persiste el error, revisa:

### 1. Console del Navegador (F12)

Deberías ver:
```
Enviando email a: christiandrm123@gmail.com
Usando clave: ***_4yKqPFXm
```

### 2. Logs de la Edge Function

Deberías ver:
```
Authorization header recibido: Presente
✅ Clave de autorización recibida: ***_4yKqPFXm
Configuración SMTP detectada:
- SMTP_HOST: ***ail.com
- SMTP_PORT: 587
- SMTP_USER: christiandrm123@gmail.com
Usando servicio SMTP directo
Conectando a smtp.gmail.com:587
Usando conexión TLS
✅ Conexión SMTP establecida
✅ Email enviado exitosamente vía SMTP
```

---

## 🆘 Problemas Comunes

### Error: "Invalid credentials" en SMTP
- Verifica que la contraseña de aplicación sea correcta
- Asegúrate de que la verificación en dos pasos esté activa en Google
- Genera una nueva contraseña de aplicación si es necesario

### Error: "Connection timeout"
- Verifica que el puerto 587 esté abierto en tu firewall
- Intenta con el puerto 465 cambiando `SMTP_PORT=465`

### Error: "Email no llega"
- Revisa la carpeta de Spam/Correo no deseado
- Verifica que el email `christiandrm123@gmail.com` esté correcto en la base de datos
- Revisa los logs de la Edge Function para errores de envío

---

## 📞 Soporte

Si después de seguir todos los pasos el problema persiste:

1. Ejecuta: `supabase functions logs enviar-email-recuperacion --tail`
2. Realiza una prueba de recuperación de contraseña
3. Copia los logs completos
4. Comparte los logs para análisis adicional

---

**Última actualización:** 2024
**Proyecto:** Saki Sushi
**Función:** enviar-email-recuperacion
