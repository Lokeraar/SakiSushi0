# 🔧 SOLUCIÓN ERROR 401 - LOGIN DE ADMINISTRADOR

## Problema Detectado

El error `{"message":"No API key found in request","hint":"No \`apikey\` request header or url param was found."}` al intentar iniciar sesión como administrador indica que:

1. **La Edge Function `login` NO está desplegada en tu proyecto de Supabase**, O
2. **Las variables de entorno no están configuradas correctamente**, O
3. **Los headers de autorización no se están enviando correctamente**

---

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Verificar que el archivo de la función existe

El archivo ya está creado en:
```
/workspace/supabase/functions/login/index.ts
```

Este archivo contiene la lógica para:
- Recibir username y password
- Verificar credenciales contra la tabla `usuarios`
- Generar un token JWT válido por 24 horas
- Retornar los datos del usuario autenticado

---

### Paso 2: Desplegar la Edge Function a Supabase

#### Opción A: Usando Supabase CLI (RECOMENDADO)

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```

2. **Iniciar sesión en Supabase**:
   ```bash
   supabase login
   ```
   Esto abrirá una ventana del navegador para autorizar.

3. **Vincular tu proyecto**:
   ```bash
   cd /workspace
   supabase link --project-ref iqwwoihiiyrtypyqzhgy
   ```

4. **Desplegar la función login**:
   ```bash
   supabase functions deploy login
   ```

5. **Establecer las variables de entorno**:
   ```bash
   supabase secrets set SUPABASE_URL="https://iqwwoihiiyrtypyqzhgy.supabase.co"
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY_AQUI"
   ```

   ⚠️ **IMPORTANTE**: Para obtener tu `SUPABASE_SERVICE_ROLE_KEY`:
   - Ve a https://supabase.com/dashboard/project/iqwwoihiiyrtypyqzhgy
   - Click en **Project Settings** (engranaje abajo a la izquierda)
   - Click en **API**
   - Copia la clave que dice **service_role** (NO la anon/public key)

#### Opción B: Usando el Dashboard de Supabase

1. Ve a https://supabase.com/dashboard/project/iqwwoihiiyrtypyqzhgy/functions

2. Haz clic en **"Create new function"** o **"New Function"**

3. Configura la función:
   - **Name**: `login`
   - **Slug**: `login`
   
4. En el editor de código, copia y pega el contenido completo de:
   `/workspace/supabase/functions/login/index.ts`

5. Haz clic en **"Deploy"** o **"Save & Deploy"**

6. Configura las variables de entorno:
   - Click en la pestaña **"Secrets"** de la función
   - Agrega estas dos variables:
     ```
     SUPABASE_URL = https://iqwwoihiiyrtypyqzhgy.supabase.co
     SUPABASE_SERVICE_ROLE_KEY = [tu service role key aquí]
     ```

---

### Paso 3: Verificar que la función esté funcionando

1. **Desde la línea de comandos**:
   ```bash
   supabase functions logs login --tail
   ```
   Esto mostrará los logs en tiempo real.

2. **Desde el Dashboard**:
   - Ve a Edge Functions → `login` → **Logs**
   - Observa los mensajes mientras intentas iniciar sesión

3. **Probar el login**:
   - Abre `/workspace/admin/index.html` en tu navegador
   - Selecciona un administrador
   - Ingresa la contraseña
   - Haz clic en "Ingresar"
   - Revisa la consola del navegador (F12) para ver si hay errores

---

### Paso 4: Verificar la base de datos

Asegúrate de que la tabla `usuarios` tenga la estructura correcta:

```sql
-- Verificar que exista la función RPC verify_user_credentials
SELECT * FROM verify_user_credentials('admin', 'admin123');

-- Debería retornar algo como:
-- success: true/false
-- user_id, user_username, user_nombre, user_rol
```

Si la función RPC no existe, ejecuta este SQL en el Editor SQL de Supabase:

```sql
CREATE OR REPLACE FUNCTION verify_user_credentials(p_username TEXT, p_password TEXT)
RETURNS TABLE(
    success BOOLEAN,
    error TEXT,
    user_id INTEGER,
    user_username TEXT,
    user_nombre TEXT,
    user_rol TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_password_match BOOLEAN;
BEGIN
    -- Buscar usuario activo con rol admin
    SELECT * INTO v_user
    FROM usuarios
    WHERE username = p_username
      AND rol = 'admin'
      AND activo = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false, 
            'Usuario no encontrado o no tiene permisos de administrador',
            NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Verificar contraseña (asumiendo bcrypt en password_hash)
    -- Si usas texto plano, cambia la comparación
    BEGIN
        -- Intentar verificar con bcrypt si está disponible
        SELECT crypt(p_password, v_user.password_hash) = v_user.password_hash INTO v_password_match;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback a comparación directa si no hay bcrypt
        v_password_match := (v_user.password_hash = p_password);
    END;
    
    IF NOT v_password_match THEN
        RETURN QUERY SELECT 
            false, 
            'Contraseña incorrecta',
            NULL::INTEGER, v_user.username, v_user.nombre, v_user.rol;
        RETURN;
    END IF;
    
    -- Credenciales correctas
    RETURN QUERY SELECT 
        true, 
        NULL::TEXT,
        v_user.id, v_user.username, v_user.nombre, v_user.rol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Paso 5: Verificar los headers en el frontend

El archivo `/workspace/admin/js/admin-auth.js` ya incluye los headers correctos:

```javascript
const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ username: selectedAdmin.username, password: password })
});
```

⚠️ **Importante**: Asegúrate de que `window.SUPABASE_ANON_KEY` esté definido ANTES de llamar a `hacerLogin()`.

Para verificar, abre la consola del navegador y escribe:
```javascript
console.log(window.SUPABASE_ANON_KEY);
```
Debería mostrar: `sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm`

---

## 🔍 TROUBLESHOOTING

### Error: "Function not found" o 404
**Solución**: La función no está desplegada. Sigue el Paso 2 nuevamente.

### Error: "JWT_SECRET no configurado"
**Solución**: Agrega esta variable de entorno:
```bash
supabase secrets set JWT_SECRET="tu_jwt_secreto_o_usa_service_role_key"
```

### Error: "Error en RPC: function verify_user_credentials does not exist"
**Solución**: Ejecuta el SQL del Paso 4 para crear la función RPC.

### Error: "Usuario o contraseña incorrectos"
**Solución**: 
1. Verifica que el usuario exista en la tabla `usuarios`
2. Verifica que `rol = 'admin'`
3. Verifica que `activo = true`
4. Verifica la contraseña (puede estar encriptada con bcrypt)

### Error persistente de API key
**Solución alternativa**: Modifica la URL para incluir la apikey como parámetro:

En `/workspace/admin/js/admin-auth.js`, línea 87, cambia:
```javascript
const response = await fetch('https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login', {
```

Por:
```javascript
const response = await fetch(`https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login?apikey=${window.SUPABASE_ANON_KEY}`, {
```

---

## 📋 CHECKLIST FINAL

Antes de probar, confirma:

- [ ] Archivo `/workspace/supabase/functions/login/index.ts` existe
- [ ] Función desplegada en Supabase (verifica en Dashboard → Edge Functions)
- [ ] Variables de entorno configuradas:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Función RPC `verify_user_credentials` existe en la BD
- [ ] Tabla `usuarios` tiene al menos un admin activo
- [ ] `window.SUPABASE_ANON_KEY` está definido en el navegador
- [ ] Logs de la función muestran actividad cuando intentas loguearte

---

## 🆘 SI EL PROBLEMA PERSISTE

1. **Recolecta información**:
   ```bash
   # Logs de la función
   supabase functions logs login --format json > logs_login.json
   
   # Estado del proyecto
   supabase projects list
   ```

2. **Verifica manualmente la función**:
   ```bash
   curl -X POST 'https://iqwwoihiiyrtypyqzhgy.supabase.co/functions/v1/login' \
     -H 'Content-Type: application/json' \
     -H 'apikey: sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm' \
     -H 'Authorization: Bearer sb_publishable_m4WcF4gmkj1olAj95HMLlA_4yKqPFXm' \
     -d '{"username":"admin","password":"admin123"}'
   ```

3. **Comparte**:
   - Captura de pantalla del error en el navegador
   - Logs de la Edge Function
   - Resultado del curl manual

---

**Fecha de creación:** 2024
**Proyecto:** Saki Sushi
**Función afectada:** login (Edge Function)
**URL del proyecto:** https://iqwwoihiiyrtypyqzhgy.supabase.co
