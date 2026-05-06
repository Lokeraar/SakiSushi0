import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password } = await req.json()

    // Validar datos requeridos
    if (!username || !password) {
      throw new Error('Username y password son requeridos')
    }

    // Obtener variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuración del servidor inválida')
    }

    // Crear cliente Supabase con la clave de servicio
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar el usuario en la base de datos
    const { data: user, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .eq('rol', 'admin')
      .eq('activo', true)
      .maybeSingle()

    if (userError) {
      console.error('Error consultando usuario:', userError)
      throw new Error('Error al consultar el usuario')
    }

    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Usuario no encontrado o no es administrador' 
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Verificar contraseña usando bcrypt
    const textEncoder = new TextEncoder()
    const keyData = textEncoder.encode(password)
    const hashData = textEncoder.encode(user.password_hash)
    
    // Comparar hashes usando Web Crypto API para bcrypt
    // Nota: Supabase auth usa bcrypt, necesitamos verificar el hash
    const passwordMatch = await verifyPassword(password, user.password_hash)
    
    if (!passwordMatch) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Contraseña incorrecta' 
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Generar token JWT personalizado
    const jwtSecret = Deno.env.get('JWT_SECRET') || supabaseServiceKey
    
    // Crear payload del token
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: user.id.toString(),
      role: user.rol,
      username: user.username,
      nombre: user.nombre,
      email: user.email,
      iat: now,
      exp: now + (24 * 60 * 60), // 24 horas
    }

    // Firmar JWT usando Web Crypto API
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const header = { alg: 'HS256', typ: 'JWT' }
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '')
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '')
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(`${encodedHeader}.${encodedPayload}`)
    )
    
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '')
    const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`

    // Retornar respuesta exitosa sin la contraseña
    const { password_hash, ...userWithoutPassword } = user
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userWithoutPassword,
        token: token
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error en Edge Function login:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Función para verificar contraseña con bcrypt
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Importar bcrypt dinámicamente
    const bcrypt = await import('npm:bcryptjs@2.4.3')
    return bcrypt.compare(password, hash)
  } catch (error) {
    console.error('Error verificando password:', error)
    return false
  }
}
