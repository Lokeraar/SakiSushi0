import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Manejar solicitudes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ SOLUCIÓN: Leer y validar explícitamente los headers de API Key
    const apiKey = req.headers.get('apikey') || req.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!apiKey) {
      console.error('❌ No API key found in request headers')
      return new Response(
        JSON.stringify({ error: 'No API key found in request' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ API Key recibida correctamente (longitud: ${apiKey.length})`)

    const { username, password } = await req.json()
    
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Usuario y contraseña requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Usar SERVICE ROLE KEY para operaciones internas (seguro en el servidor)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .rpc('verify_user_credentials', {
        p_username: username,
        p_password: password
      })

    if (error) {
      console.error('Error en RPC:', error)
      return new Response(
        JSON.stringify({ error: 'Error interno del servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = data && data[0]

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Error en la respuesta del servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || 'Usuario o contraseña incorrectos' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jwtSecret = Deno.env.get('JWT_SECRET')
    if (!jwtSecret) {
      console.error('JWT_SECRET no configurado')
      return new Response(
        JSON.stringify({ error: 'Error de configuración del servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = {
      user_id: result.user_id,
      username: result.user_username,
      rol: result.user_rol,
      aud: 'authenticated'
    }

    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(jwtSecret))

    const user = {
      id: result.user_id,
      nombre: result.user_nombre,
      username: result.user_username,
      rol: result.user_rol
    }

    console.log(`✅ Login exitoso: ${username} (${result.user_rol})`)

    return new Response(
      JSON.stringify({
        success: true,
        token: token,
        user: user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en login:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
