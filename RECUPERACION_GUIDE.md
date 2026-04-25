# 📋 Guía de Implementación: Recuperación de Contraseña

## ✅ Cambios Realizados

### 1. **Corrección de rutas en archivos HTML**
- ✅ `recuperar-password.html`: Cambiado `../supabase-config.js` → `./supabase-config.js`
- ✅ `nueva-password.html`: Cambiado `../supabase-config.js` → `./supabase-config.js`
- ✅ `recuperar-password.html`: URL dinámica para `redirectTo` en lugar de hardcoded

### 2. **Habilitación de detección de sesión en URL**
- ✅ `supabase-config.js`: Cambiado `detectSessionInUrl: false` → `detectSessionInUrl: true`
- Esto permite que Supabase procese automáticamente el hash del enlace de recuperación

### 3. **Campo de email en gestión de usuarios**
- ✅ `admin/index.html`: Agregado campo "Correo de recuperación *" en el modal de usuario
- ✅ `admin/js/admin-usuarios.js`: 
  - Lectura del campo email en `abrirModalNuevoUsuario()`
  - Carga del email existente en `editarUsuario()`
  - Validación de formato de email
  - Inclusión del email en `userData` al guardar
  - El campo es obligatorio para nuevos usuarios y ediciones

### 4. **Script SQL para base de datos**
- ✅ `add_email_column.sql`: Script para agregar columna `email` a la tabla `usuarios`

---

## 🔧 Pasos para Completar la Implementación

### Paso 1: Ejecutar Script SQL en Supabase
1. Ve al Dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (en el menú izquierdo)
4. Copia y pega el contenido de `/workspace/add_email_column.sql`
5. Haz clic en **Run** para ejecutarlo

### Paso 2: Configurar Emails en Supabase Auth
1. En el Dashboard de Supabase, ve a **Authentication** → **Providers**
2. Asegúrate de que **Email** esté habilitado
3. Configura las plantillas de email:
   - Ve a **Authentication** → **Email Templates**
   - Selecciona **Reset Password**
   - Personaliza el asunto y cuerpo del mensaje si lo deseas
   - El enlace de recuperación usará automáticamente la URL configurada

### Paso 3: Actualizar Usuarios Existentes
1. Inicia sesión como administrador en `/admin/index.html`
2. Ve a la sección de **Usuarios**
3. Para cada usuario existente:
   - Haz clic en **Editar usuario**
   - Agrega un correo electrónico válido en el campo "Correo de recuperación"
   - Guarda los cambios

> ⚠️ **Importante**: Los usuarios sin email no podrán usar la recuperación de contraseña hasta que se les asigne uno.

### Paso 4: Probar el Flujo Completo
1. Ve a la página de login (`/Cajero/index.html` o `/admin/index.html`)
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa el correo electrónico de un usuario que tenga email registrado
4. Haz clic en "Enviar Enlace de Recuperación"
5. Revisa el correo electrónico (incluyendo la carpeta de spam)
6. Haz clic en el enlace recibido
7. Establece una nueva contraseña
8. Inicia sesión con la nueva contraseña

---

## 📁 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `/workspace/recuperar-password.html` | Ruta corregida + URL dinámica |
| `/workspace/nueva-password.html` | Ruta corregida |
| `/workspace/supabase-config.js` | `detectSessionInUrl: true` |
| `/workspace/admin/index.html` | Campo email agregado |
| `/workspace/admin/js/admin-usuarios.js` | Lógica de email implementada |
| `/workspace/add_email_column.sql` | **NUEVO** - Script SQL |
| `/workspace/RECUPERACION_GUIDE.md` | **NUEVO** - Esta guía |

---

## 🔍 Consideraciones Importantes

### Seguridad
- El campo email es obligatorio para todos los usuarios nuevos y existentes
- El email debe tener un formato válido (validado con regex)
- Por seguridad, el sistema no revela si un email existe o no al solicitar recuperación

### URLs y Despliegue
- La URL de recuperación ahora se construye dinámicamente según la ubicación actual
- Funciona correctamente en GitHub Pages y otros hosting
- No más URLs hardcodeadas como `https://lokeraar.github.io/SakiSushi0/...`

### Usuarios Existentes
- Los usuarios creados antes de este cambio tendrán `email = NULL`
- Deben ser actualizados manualmente desde el panel de administración
- Hasta que tengan email, no podrán usar la recuperación de contraseña

### Configuración de Correos en Supabase
- Supabase usa su servicio de emails por defecto (límite: 4 emails/día en plan free)
- Para producción, considera configurar SMTP propio en **Authentication** → **SMTP Settings**

---

## 🐛 Solución de Problemas Comunes

### "No llega el correo"
1. Verifica la carpeta de spam/correo no deseado
2. Confirma que el email está correctamente registrado en la tabla `usuarios`
3. Revisa los límites del plan free de Supabase (4 emails/día)
4. Verifica en **Authentication** → **Logs** si hay errores

### "El enlace no funciona"
1. Asegúrate de que `detectSessionInUrl: true` en `supabase-config.js`
2. Verifica que la URL en el correo coincida con el dominio donde está alojado el sitio
3. El enlace expira después de cierto tiempo (configurable en Supabase)

### "Error al guardar usuario con email"
1. Verifica que el email sea único (no puede estar repetido)
2. Asegúrate de haber ejecutado el script SQL `add_email_column.sql`
3. Revisa la consola del navegador para errores específicos

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa la consola del navegador (F12) para errores
2. Verifica los logs en Supabase Dashboard → Database → Logs
3. Confirma que todos los pasos de esta guía fueron completados
