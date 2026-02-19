-- SCRIPT DE INICIALIZACIÓN PARA SUPABASE
-- Ejecutar esto en la consola SQL de Supabase

-- Habilitar pg_cron (si está disponible)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear bucket de almacenamiento (ejecutar en Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', true);

-- Tabla config
CREATE TABLE IF NOT EXISTS public.config (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    tasa_cambio numeric DEFAULT 400,
    tasa_efectiva numeric DEFAULT 400,
    aumento_diario numeric DEFAULT 0,
    aumento_acumulado numeric DEFAULT 0,
    aumento_activo boolean DEFAULT false,
    aumento_detenido boolean DEFAULT false,
    fecha_inicio_aumento timestamptz,
    fecha_ultimo_aumento timestamptz,
    ultima_actualizacion timestamptz DEFAULT now(),
    admin_password text DEFAULT '654321',
    recovery_email text DEFAULT 'admin@sakisushi.com'
);

-- Insertar configuración inicial
INSERT INTO public.config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Tabla inventario
CREATE TABLE IF NOT EXISTS public.inventario (
    id text PRIMARY KEY,
    nombre text NOT NULL,
    stock numeric DEFAULT 0,
    unidad_base text DEFAULT 'unidades',
    minimo numeric DEFAULT 0,
    precio_costo numeric DEFAULT 0,
    precio_unitario numeric DEFAULT 0,
    costo_bs numeric GENERATED ALWAYS AS (precio_costo * (SELECT tasa_efectiva FROM public.config WHERE id = 1)) STORED,
    precio_venta_bs numeric GENERATED ALWAYS AS (precio_unitario * (SELECT tasa_efectiva FROM public.config WHERE id = 1)) STORED
);

-- Tabla menu
CREATE TABLE IF NOT EXISTS public.menu (
    id text PRIMARY KEY,
    nombre text NOT NULL,
    categoria text,
    subcategoria text,
    precio numeric DEFAULT 0,
    descripcion text,
    imagen text,
    ingredientes jsonb DEFAULT '{}',
    stock integer DEFAULT 0,
    stock_maximo integer DEFAULT 0,
    disponible boolean DEFAULT true
);

-- Tabla usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
    id text PRIMARY KEY,
    nombre text NOT NULL,
    username text UNIQUE NOT NULL,
    password text NOT NULL,
    rol text DEFAULT 'cajero',
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Tabla pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
    id text PRIMARY KEY,
    timestamp timestamptz DEFAULT now(),
    estado text DEFAULT 'pendiente',
    tipo text,
    items jsonb DEFAULT '[]',
    metodo_pago text,
    pagos_mixtos jsonb,
    cajero text,
    fecha_cobro timestamptz,
    mesa text,
    parroquia text,
    direccion text,
    telefono text,
    referencia text,
    fecha_reserva date,
    cliente_nombre text,
    comprobante_url text,
    costo_delivery numeric DEFAULT 0,
    costo_delivery_usd numeric DEFAULT 0,
    vuelto_entregado numeric DEFAULT 0,
    condonado numeric DEFAULT 0,
    a_favor_caja numeric DEFAULT 0,
    monto_recibido numeric DEFAULT 0,
    monto_recibido_usd numeric DEFAULT 0,
    tasa_aplicada numeric,
    total numeric DEFAULT 0,
    session_id text
);

-- Tabla notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id bigserial PRIMARY KEY,
    pedido_id text,
    tipo text,
    titulo text,
    mensaje text,
    timestamp timestamptz DEFAULT now(),
    leida boolean DEFAULT false
);

-- Tabla codigos_qr
CREATE TABLE IF NOT EXISTS public.codigos_qr (
    id text PRIMARY KEY,
    nombre text,
    fecha timestamptz DEFAULT now()
);

-- Tabla ventas (opcional para históricos)
CREATE TABLE IF NOT EXISTS public.ventas (
    id bigserial PRIMARY KEY,
    fecha timestamptz DEFAULT now(),
    pedido_id text,
    total numeric DEFAULT 0,
    items integer DEFAULT 0,
    metodo_pago text,
    tipo text
);

-- Función RPC: procesar_cobro
CREATE OR REPLACE FUNCTION public.procesar_cobro(
    p_pedido_id text,
    p_pagos_mixtos jsonb,
    p_cajero text,
    p_condonacion float8 DEFAULT 0,
    p_a_favor_caja float8 DEFAULT 0,
    p_vuelto_entregado float8 DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido record;
    v_item jsonb;
    v_ingrediente record;
    v_cantidad_necesaria numeric;
    v_metodo_principal text;
BEGIN
    -- Bloquear el pedido
    SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido no encontrado';
    END IF;
    
    IF v_pedido.estado != 'pendiente' THEN
        RAISE EXCEPTION 'El pedido no está pendiente';
    END IF;
    
    -- Descontar inventario
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_pedido.items)
    LOOP
        -- Obtener ingredientes del platillo
        DECLARE
            v_ingredientes jsonb;
            v_ing_record record;
        BEGIN
            SELECT ingredientes INTO v_ingredientes 
            FROM public.menu 
            WHERE id = (v_item->>'platilloId');
            
            -- Recorrer ingredientes
            FOR v_ing_record IN 
                SELECT key, value 
                FROM jsonb_each(v_ingredientes)
            LOOP
                -- Verificar si el ingrediente fue quitado en personalización
                IF NOT (v_item->'personalizacion' ? v_ing_record.key) THEN
                    v_cantidad_necesaria = (v_ing_record.value->>'cantidad')::numeric * (v_item->>'cantidad')::numeric;
                    
                    -- Actualizar inventario
                    UPDATE public.inventario 
                    SET stock = stock - v_cantidad_necesaria
                    WHERE id = v_ing_record.key;
                END IF;
            END LOOP;
        END;
    END LOOP;
    
    -- Determinar método principal
    IF jsonb_array_length(p_pagos_mixtos) = 1 THEN
        v_metodo_principal = p_pagos_mixtos->0->>'metodo';
    ELSE
        v_metodo_principal = 'mixto';
    END IF;
    
    -- Actualizar pedido
    UPDATE public.pedidos SET
        estado = CASE 
            WHEN v_pedido.tipo = 'delivery' THEN 'en_camino'
            WHEN v_pedido.tipo = 'reserva' THEN 'reserva_pendiente'
            ELSE 'en_cocina'
        END,
        metodo_pago = v_metodo_principal,
        pagos_mixtos = p_pagos_mixtos,
        cajero = p_cajero,
        fecha_cobro = now(),
        condonado = p_condonacion,
        a_favor_caja = p_a_favor_caja,
        vuelto_entregado = p_vuelto_entregado
    WHERE id = p_pedido_id;
    
    -- Insertar notificación
    INSERT INTO public.notificaciones (pedido_id, tipo, titulo, mensaje, timestamp)
    VALUES (
        p_pedido_id,
        'approved',
        '✅ Pago confirmado',
        'Tu pedido ha sido pagado y está en preparación',
        now()
    );
    
    -- Insertar en ventas (opcional)
    INSERT INTO public.ventas (fecha, pedido_id, total, items, metodo_pago, tipo)
    VALUES (
        now(),
        p_pedido_id,
        v_pedido.total,
        (SELECT SUM((item->>'cantidad')::integer) FROM jsonb_array_elements(v_pedido.items) AS item),
        v_metodo_principal,
        v_pedido.tipo
    );
END;
$$;

-- Función RPC: cancelar_pedidos_timeout
CREATE OR REPLACE FUNCTION public.cancelar_pedidos_timeout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Cancelar pedidos de delivery y reserva con más de 20 minutos
    UPDATE public.pedidos
    SET estado = 'cancelado_timeout'
    WHERE estado = 'pendiente' 
      AND tipo IN ('delivery', 'reserva')
      AND EXTRACT(EPOCH FROM (now() - timestamp)) / 60 > 20;
    
    -- Insertar notificaciones para los cancelados
    INSERT INTO public.notificaciones (pedido_id, tipo, titulo, mensaje, timestamp)
    SELECT 
        id,
        'rejected',
        '⏰ Pedido cancelado',
        'El tiempo para pagar ha expirado',
        now()
    FROM public.pedidos
    WHERE estado = 'cancelado_timeout'
      AND NOT EXISTS (
          SELECT 1 FROM public.notificaciones 
          WHERE pedido_id = public.pedidos.id AND tipo = 'rejected'
      );
END;
$$;

-- Programar job con pg_cron (ejecutar si pg_cron está disponible)
-- SELECT cron.schedule(
--    'cancelar-pedidos-timeout',
--    '*/5 * * * *',
--    'SELECT public.cancelar_pedidos_timeout()'
-- );

-- Políticas RLS (ejecutar después de habilitar RLS)
-- ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.codigos_qr ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para menú e inventario
-- CREATE POLICY "Lectura pública menú" ON public.menu FOR SELECT USING (true);
-- CREATE POLICY "Lectura pública inventario" ON public.inventario FOR SELECT USING (true);
-- CREATE POLICY "Lectura pública config (tasa)" ON public.config FOR SELECT USING (true);

-- Políticas para pedidos (clientes pueden insertar)
-- CREATE POLICY "Clientes pueden insertar pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);

-- Políticas para notificaciones (lectura basada en pedido_id)
-- CREATE POLICY "Lectura notificaciones" ON public.notificaciones FOR SELECT USING (true);

-- Políticas para usuarios (solo admin/cajeros autenticados)
-- CREATE POLICY "Acceso usuarios autenticados" ON public.usuarios FOR ALL USING (auth.role() = 'authenticated');

-- Insertar usuario cajero de ejemplo
INSERT INTO public.usuarios (id, nombre, username, password, rol, activo)
VALUES 
    ('user_ejemplo1', 'Cajero Principal', 'cajero1', '123456', 'cajero', true),
    ('user_ejemplo2', 'Cajero Secundario', 'cajero2', '123456', 'cajero', true)
ON CONFLICT (username) DO NOTHING;