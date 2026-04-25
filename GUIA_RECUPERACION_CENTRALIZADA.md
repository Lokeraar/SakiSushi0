# 📧 Sistema de Recuperación de Contraseña Centralizada

## ✅ Cambios Implementados

### 1. **Campo `email_recuperacion` en lugar de `email` único**
- **Antes**: Cada usuario debía tener un email único (limitación de Supabase)
- **Ahora**: Múltiples usuarios pueden compartir el mismo correo de recuperación
- **Ventaja**: El admin puede usar un solo correo (ej: `admin@sakisushi.com`) para todos los usuarios

### 2. **Modificación en la UI del Admin**
- Campo renombrado a **"Correo de recuperación *"**
- ID cambiado de `usuarioEmail` a `usuarioEmailRecuperacion`
- Placeholder actualizado: `"ej: admin@sakisushi.com"`
- Tooltip: *"Puede ser compartido entre varios usuarios (recomendado: correo del administrador principal)"*

### 3. **Lógica de Recuperación Mejorada**
El archivo `recuperar-password.html` ahora:
1. Busca en la tabla `usuarios` por `email_recuperacion`
2. Si encuentra coincidencia, envía el enlace de recuperación
3. Si no encuentra, muestra mensaje genérico (por seguridad)
4. Permite correos compartidos sin revelar qué usuarios existen

---

## 🔧 PASOS DE CONFIGURACIÓN EN SUPABASE

### Paso 1: Ejecutar Script SQL

Ve al **Dashboard de Supabase** → **SQL Editor** y ejecuta:

```sql
-- Agregar columna email_recuperacion (permite duplicados)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS email_recuperacion TEXT;

-- Comentario explicativo
COMMENT ON COLUMN usuarios.email_recuperacion IS 
'Correo de contacto para recuperación asistida. Puede ser compartido entre múltiples usuarios.';
```

**Nota**: A diferencia de una columna `email` con restricción UNIQUE, esta columna permite valores duplicados.

---

### Paso 2: Configurar Email Provider

1. Ve a **Supabase Dashboard** → **Authentication** → **Providers**
2. Asegúrate de que **Email** esté habilitado
3. En el plan gratuito tienes límite de **4 correos/día**
   - Para producción, considera usar un proveedor externo como **Resend** o **SendGrid**

---

### Paso 3: Actualizar Usuarios Existentes

1. Inicia sesión como admin en el panel
2. Ve al módulo **Usuarios**
3. Edita cada usuario existente y agrega el campo **"Correo de recuperación"**
   - **Recomendación**: Usa el mismo correo para todos (ej: `admin@sakisushi.com`)
   - O usa correos individuales si lo prefieres

---

## 📋 FLUJO DE RECUPERACIÓN

### Para el Usuario Final:

1. **Clic en "¿Olvidaste tu contraseña?"** en el login
2. **Ingresa el correo de recuperación** (el que configuró el admin)
3. **Clic en "Enviar Enlace de Recuperación"**
4. **Recibe el correo** con el enlace mágico
5. **Clic en el enlace** → Redirige a `nueva-password.html`
6. **Introduce nueva contraseña** → Se actualiza en Supabase Auth

### Para el Administrador:

1. **Crear/Editar usuario** en el módulo de Usuarios
2. **Completar campo "Correo de recuperación"** (obligatorio)
   - Puede ser el mismo para múltiples usuarios
   - Ejemplo: `admin@sakisushi.com` para todos los cajeros
3. **Guardar** → Se sincroniza con la tabla `usuarios`

---

## 🔐 Consideraciones de Seguridad

### ✅ Lo que está protegido:
- **No se revela si un email existe**: El sistema siempre muestra mensaje de éxito
- **Validación de formato**: Solo emails válidos son procesados
- **Búsqueda en tabla usuarios**: Verifica existencia antes de enviar email de Supabase

### ⚠️ Limitaciones del Plan Gratuito:
- **4 correos/día** desde Supabase
- **Solución recomendada**: Usar un solo correo compartido reduce el uso
- **Alternativa**: Integrar Resend/SendGrid para más envíos

### 🔒 Buenas Prácticas:
1. Usa un correo corporativo real (no temporal)
2. Monitorea la bandeja de entrada del correo de recuperación
3. Cambia contraseñas periódicamente
4. Si un admin sale de la empresa, cambia su contraseña inmediatamente

---

## 🛠️ Solución de Problemas

### ❌ "No llega el correo"
**Posibles causas:**
1. **Límite de 4 correos diarios alcanzado** → Espera 24h o configura Resend
2. **Correo en spam** → Revisa la carpeta de spam/correo no deseado
3. **Email mal escrito** → Verifica en el admin que el `email_recuperacion` sea correcto
4. **Usuario sin email_recuperacion** → Edita el usuario y agrégalo

### ❌ "El enlace no funciona"
**Verifica:**
1. `detectSessionInUrl: true` en `supabase-config.js` ✅ (ya está configurado)
2. La URL en el correo coincide con tu dominio real
3. No has modificado manualmente la URL del enlace

### ❌ "Error al guardar usuario"
**Revisa:**
1. Que el script SQL se haya ejecutado correctamente
2. Que la columna `email_recuperacion` exista en la tabla `usuarios`
3. Los permisos RLS (Row Level Security) permitan INSERT/UPDATE

---

## 📊 Estructura de Datos

### Tabla `usuarios`:
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `nombre` | TEXT | Nombre completo |
| `username` | TEXT | Nombre de usuario (único) |
| `email_recuperacion` | TEXT | **Correo compartido para recuperación** (admite duplicados) |
| `password_hash` | TEXT | Hash de contraseña |
| `rol` | TEXT | 'admin' o 'cajero' |
| `activo` | BOOLEAN | Estado del usuario |
| `foto` | TEXT | URL de foto de perfil |

### Tabla `auth.users` (interna de Supabase):
- Contiene el email técnico único generado automáticamente
- No es visible ni editable desde la UI del admin
- Se usa internamente para autenticación

---

## 🎯 Escenario de Uso Recomendado

### Configuración Ideal para Restaurantes:

```
Correo de recuperación para TODOS: admin@sakisushi.com

Usuarios:
├─ Admin Principal → email_recuperacion: admin@sakisushi.com
├─ Cajero 1 → email_recuperacion: admin@sakisushi.com
├─ Cajero 2 → email_recuperacion: admin@sakisushi.com
└─ Cajero 3 → email_recuperacion: admin@sakisushi.com
```

**Ventajas:**
- ✅ Solo 1 correo que monitorear
- ✅ El admin controla todas las recuperaciones
- ✅ No se gastan los 4 correos diarios rápidamente
- ✅ Si un cajero olvida su contraseña, el admin recibe el enlace y puede ayudarlo

---

## 📞 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12) para errores
2. Verifica en Supabase Dashboard → Logs
3. Asegúrate de que todos los archivos estén actualizados:
   - `/admin/index.html`
   - `/admin/js/admin-usuarios.js`
   - `/recuperar-password.html`
   - `/supabase-config.js`

---

**Última actualización**: 2025
**Versión del sistema**: 2.0 con recuperación centralizada
