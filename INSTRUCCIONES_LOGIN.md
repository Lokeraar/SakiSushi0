# Solución al Error de Login - "Error de configuración del servidor"

## Problema
El error 500 al intentar iniciar sesión como administrador ocurre porque **la Edge Function `login` no existe en tu proyecto de Supabase**.

## Solución

### Paso 1: Verificar que el archivo existe
El archivo de la Edge Function ya ha sido creado en:
```
/workspace/supabase/functions/login/index.ts
```

### Paso 2: Desplegar la Edge Function a Supabase

Necesitas desplegar esta función a tu proyecto de Supabase. Sigue estos pasos:

#### Opción A: Usando Supabase CLI (Recomendado)

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   # o
   brew install supabase/tap/supabase
   ```

2. **Iniciar sesión en Supabase**:
   ```bash
   supabase login
   ```

3. **Vincular tu proyecto** (si no está vinculado):
   ```bash
   cd /workspace
   supabase link --project-ref iqwwoihiiyrtypyqzhgy
   ```

4. **Desplegar la función login**:
   ```bash
   supabase functions deploy login
   ```

#### Opción B: Usando el Dashboard de Supabase

1. Ve a https://supabase.com/dashboard/project/iqwwoihiiyrtypyqzhgy
2. Navega a **Edge Functions** en el menú lateral
3. Haz clic en **New Function**
4. Nombre: `login`
5. Copia y pega el contenido del archivo `/workspace/supabase/functions/login/index.ts`
6. Haz clic en **Deploy**

### Paso 3: Configurar Variables de Entorno

La función necesita las siguientes variables de entorno en Supabase:

1. Ve a **Project Settings** → **API** en el dashboard de Supabase
2. Copia los siguientes valores:
   - `SUPABASE_URL`: Tu URL del proyecto (ej: https://iqwwoihiiyrtypyqzhgy.supabase.co)
   - `SUPABASE_SERVICE_ROLE_KEY`: Tu clave de servicio (secreta)

3. Para establecer las variables en la Edge Function:
   ```bash
   supabase secrets set SUPABASE_URL="https://iqwwoihiiyrtypyqzhgy.supabase.co"
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key-aqui"
   ```

O desde el dashboard:
1. Ve a **Edge Functions** → **login**
2. Haz clic en **Manage Secrets**
3. Agrega las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

### Paso 4: Verificar la Función

Después de desplegar, verifica que la función esté accesible:

1. Abre la consola del navegador (F12)
2. Intenta iniciar sesión nuevamente
3. Deberías ver una respuesta exitosa en lugar del error 500

## Estructura de la Función

La Edge Function `login`:
- Recibe `username` y `password` en el body de la petición
- Busca el usuario en la tabla `usuarios` con rol `admin` y estado `activo`
- Verifica la contraseña usando bcrypt
- Genera un token JWT válido por 24 horas
- Retorna los datos del usuario (sin la contraseña) y el token

## Notas Importantes

1. **Contraseñas**: La función asume que las contraseñas están almacenadas como hashes bcrypt en el campo `password_hash` de la tabla `usuarios`.

2. **JWT Secret**: Si quieres usar un secreto JWT personalizado, configura la variable de entorno `JWT_SECRET`. Si no, usará automáticamente la `SUPABASE_SERVICE_ROLE_KEY`.

3. **CORS**: La función ya incluye headers CORS para permitir peticiones desde cualquier origen (necesario para desarrollo).

## Troubleshooting

Si aún ves errores:

1. **Verifica los logs de la función**:
   ```bash
   supabase functions logs login
   ```

2. **Verifica que la tabla `usuarios` tenga**:
   - Campo `username` (texto)
   - Campo `password_hash` (texto)
   - Campo `rol` (texto)
   - Campo `activo` (booleano)
   - Campo `nombre` (texto)
   - Campo `email` (texto)

3. **Verifica que haya al menos un admin activo** en la base de datos.

