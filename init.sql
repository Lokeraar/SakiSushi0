-- init.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Tabla config
CREATE TABLE IF NOT EXISTS public.config(
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    tasa_cambio numeric DEFAULT 400,
    tasa_efectiva numeric DEFAULT 400,
    aumento_diario numeric DEFAULT 0,
    aumento_acumulado numeric DEFAULT 0,
    aumento_activo boolean DEFAULT false,
    aumento_detenido boolean DEFAULT false,
    fecha_ultimo_aumento timestamptz,
    ultima_actualizacion timestamptz DEFAULT now(),
    admin_password text DEFAULT '654321',
    recovery_email text DEFAULT 'admin@sakisushi.com',
    alerta_stock_minimo integer DEFAULT 5
);
INSERT INTO public.config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Tabla inventario
CREATE TABLE IF NOT EXISTS public.inventario(
    id text PRIMARY KEY,
    nombre text NOT NULL,
    stock numeric DEFAULT 0,
    reservado numeric DEFAULT 0,
    disponible numeric GENERATED ALWAYS AS (stock - reservado) STORED,
    unidad_base text DEFAULT 'unidades',
    minimo numeric DEFAULT 0,
    precio_costo numeric DEFAULT 0,
    precio_unitario numeric DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_inventario_stock ON public.inventario(stock);
CREATE INDEX IF NOT EXISTS idx_inventario_disponible ON public.inventario(disponible);

-- Tabla menu
CREATE TABLE IF NOT EXISTS public.menu(
    id text PRIMARY KEY,
    nombre text NOT NULL,
    categoria text,
    subcategoria text,
    precio numeric DEFAULT 0,
    descripcion text,
    imagen text,
    ingredientes jsonb DEFAULT '{}'::jsonb,
    stock integer DEFAULT 0,
    stock_maximo integer DEFAULT 0,
    disponible boolean DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_menu_disponible ON public.menu(disponible);
CREATE INDEX IF NOT EXISTS idx_menu_categoria ON public.menu(categoria);

-- Tabla usuarios
CREATE TABLE IF NOT EXISTS public.usuarios(
    id text PRIMARY KEY,
    nombre text NOT NULL,
    username text UNIQUE NOT NULL,
    password text NOT NULL,
    rol text DEFAULT 'cajero',
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Tabla pedidos
CREATE TABLE IF NOT EXISTS public.pedidos(
    id text PRIMARY KEY,
    timestamp timestamptz DEFAULT now(),
    estado text DEFAULT 'pendiente',
    tipo text,
    items jsonb DEFAULT '[]'::jsonb,
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
    session_id text,
    reservas_confirmadas boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_timestamp ON public.pedidos(estado, timestamp);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo_estado ON public.pedidos(tipo, estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_session ON public.pedidos(session_id);

-- Tabla notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones(
    id bigserial PRIMARY KEY,
    pedido_id text,
    tipo text,
    titulo text,
    mensaje text,
    timestamp timestamptz DEFAULT now(),
    leida boolean DEFAULT false,
    session_id text
);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON public.notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_timestamp ON public.notificaciones(timestamp);
CREATE INDEX IF NOT EXISTS idx_notificaciones_session ON public.notificaciones(session_id);

-- Tabla codigos_qr
CREATE TABLE IF NOT EXISTS public.codigos_qr(
    id text PRIMARY KEY,
    nombre text,
    tipo text DEFAULT 'mesa',
    ssid text,
    password text,
    fecha timestamptz DEFAULT now()
);

-- Tabla ventas
CREATE TABLE IF NOT EXISTS public.ventas(
    id bigserial PRIMARY KEY,
    fecha timestamptz DEFAULT now(),
    pedido_id text,
    total numeric DEFAULT 0,
    items integer DEFAULT 0,
    metodo_pago text,
    tipo text
);

-- Tabla reservas_ingredientes
CREATE TABLE IF NOT EXISTS public.reservas_ingredientes(
    id text PRIMARY KEY,
    pedido_id text NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    ingrediente_id text NOT NULL REFERENCES public.inventario(id) ON DELETE CASCADE,
    cantidad numeric NOT NULL,
    fecha_reserva timestamptz DEFAULT now(),
    estado text DEFAULT 'activa',
    UNIQUE (pedido_id, ingrediente_id)
);
CREATE INDEX IF NOT EXISTS idx_reservas_pedido ON public.reservas_ingredientes(pedido_id);
CREATE INDEX IF NOT EXISTS idx_reservas_ingrediente ON public.reservas_ingredientes(ingrediente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON public.reservas_ingredientes(estado);

-- Tabla mesoneros
CREATE TABLE IF NOT EXISTS public.mesoneros(
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla propinas
CREATE TABLE IF NOT EXISTS public.propinas(
    id SERIAL PRIMARY KEY,
    pedido_id TEXT,
    mesonero_id INTEGER REFERENCES public.mesoneros(id),
    mesa TEXT NOT NULL,
    metodo TEXT NOT NULL,
    monto_original NUMERIC NOT NULL,
    moneda_original TEXT NOT NULL,
    tasa_aplicada NUMERIC,
    monto_bs NUMERIC NOT NULL,
    referencia TEXT,
    cajero TEXT,
    fecha TIMESTAMP DEFAULT NOW(),
    entregado BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_propinas_mesonero ON public.propinas(mesonero_id);
CREATE INDEX IF NOT EXISTS idx_propinas_entregado ON public.propinas(entregado);
CREATE INDEX IF NOT EXISTS idx_propinas_fecha ON public.propinas(fecha);

-- Tabla entregas_propinas
CREATE TABLE IF NOT EXISTS public.entregas_propinas(
    id SERIAL PRIMARY KEY,
    mesonero_id INTEGER REFERENCES public.mesoneros(id),
    monto_total NUMERIC NOT NULL,
    fecha_entrega TIMESTAMP DEFAULT NOW(),
    confirmado_por TEXT,
    propinas_incluidas JSONB
);

-- Tabla eventos_sistema
CREATE TABLE IF NOT EXISTS public.eventos_sistema(
    id bigserial PRIMARY KEY,
    tipo text NOT NULL,
    timestamp timestamptz DEFAULT now(),
    procesado boolean DEFAULT false
);

-- Función crear_pedido_con_reserva
CREATE OR REPLACE FUNCTION public.crear_pedido_con_reserva(
    p_pedido jsonb,
    p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido_id text;
    v_item jsonb;
    v_ingredientes jsonb;
    v_ing_record record;
    v_cantidad_necesaria numeric;
    v_stock_disponible numeric;
    v_resultado jsonb;
BEGIN
    v_pedido_id := p_pedido->>'id';

    -- Verificar stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT ingredientes INTO v_ingredientes FROM public.menu WHERE id = (v_item->>'platilloId');

        FOR v_ing_record IN SELECT key, value FROM jsonb_each(v_ingredientes) LOOP
            IF NOT (v_item->'personalizacion' ? v_ing_record.key) THEN
                v_cantidad_necesaria := (v_ing_record.value->>'cantidad')::numeric;

                SELECT (stock - reservado) INTO v_stock_disponible
                FROM public.inventario
                WHERE id = v_ing_record.key
                FOR UPDATE;

                IF v_stock_disponible < v_cantidad_necesaria THEN
                    RAISE EXCEPTION 'Stock insuficiente para el ingrediente %', v_ing_record.key;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- Insertar pedido
    INSERT INTO public.pedidos (
        id, timestamp, estado, tipo, items, total, session_id, mesa,
        cliente_nombre, parroquia, direccion, telefono, referencia,
        fecha_reserva, comprobante_url, costo_delivery, costo_delivery_usd
    ) VALUES (
        v_pedido_id,
        (p_pedido->>'timestamp')::timestamptz,
        p_pedido->>'estado',
        p_pedido->>'tipo',
        p_items,
        (p_pedido->>'total')::numeric,
        p_pedido->>'session_id',
        p_pedido->>'mesa',
        p_pedido->>'cliente_nombre',
        p_pedido->>'parroquia',
        p_pedido->>'direccion',
        p_pedido->>'telefono',
        p_pedido->>'referencia',
        (p_pedido->>'fecha_reserva')::date,
        p_pedido->>'comprobante_url',
        (p_pedido->>'costo_delivery')::numeric,
        (p_pedido->>'costo_delivery_usd')::numeric
    );

    -- Reservar ingredientes
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT ingredientes INTO v_ingredientes FROM public.menu WHERE id = (v_item->>'platilloId');

        FOR v_ing_record IN SELECT key, value FROM jsonb_each(v_ingredientes) LOOP
            IF NOT (v_item->'personalizacion' ? v_ing_record.key) THEN
                v_cantidad_necesaria := (v_ing_record.value->>'cantidad')::numeric;

                INSERT INTO public.reservas_ingredientes (
                    id, pedido_id, ingrediente_id, cantidad, estado
                ) VALUES (
                    'res_' || gen_random_uuid()::text,
                    v_pedido_id,
                    v_ing_record.key,
                    v_cantidad_necesaria,
                    'activa'
                );

                UPDATE public.inventario
                SET reservado = reservado + v_cantidad_necesaria
                WHERE id = v_ing_record.key;
            END IF;
        END LOOP;
    END LOOP;

    -- Notificación inicial
    INSERT INTO public.notificaciones (pedido_id, tipo, titulo, mensaje, session_id)
    VALUES (
        v_pedido_id,
        'pending',
        CASE
            WHEN p_pedido->>'tipo' = 'mesa' THEN '✅ Pedido recibido'
            WHEN p_pedido->>'tipo' = 'delivery' THEN '✅ Pedido recibido'
            WHEN p_pedido->>'tipo' = 'reserva' THEN '✅ Reserva recibida'
            ELSE '✅ Pedido recibido'
        END,
        CASE
            WHEN p_pedido->>'tipo' = 'mesa' THEN 'Por favor, pasa a caja a cancelar'
            WHEN p_pedido->>'tipo' = 'delivery' THEN 'Tu pago está siendo confirmado...'
            WHEN p_pedido->>'tipo' = 'reserva' THEN 'Confirmando pago...'
            ELSE 'Tu pedido ha sido registrado'
        END,
        p_pedido->>'session_id'
    );

    -- Evento de sistema
    INSERT INTO public.eventos_sistema (tipo) VALUES ('nuevo_pedido');

    v_resultado := jsonb_build_object('success', true, 'pedido_id', v_pedido_id);
    RETURN v_resultado;

EXCEPTION
    WHEN OTHERS THEN
        v_resultado := jsonb_build_object('success', false, 'error', SQLERRM);
        RETURN v_resultado;
END;
$$;

-- Función liberar_ingredientes
CREATE OR REPLACE FUNCTION public.liberar_ingredientes(p_pedido_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reserva record;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id) THEN
        RAISE EXCEPTION 'Pedido no encontrado';
    END IF;

    FOR v_reserva IN
        SELECT ingrediente_id, cantidad
        FROM public.reservas_ingredientes
        WHERE pedido_id = p_pedido_id AND estado = 'activa'
        FOR UPDATE
    LOOP
        UPDATE public.inventario
        SET reservado = reservado - v_reserva.cantidad
        WHERE id = v_reserva.ingrediente_id;

        UPDATE public.reservas_ingredientes
        SET estado = 'liberada'
        WHERE pedido_id = p_pedido_id AND ingrediente_id = v_reserva.ingrediente_id;
    END LOOP;

    INSERT INTO public.eventos_sistema (tipo) VALUES ('stock_actualizado');
    RETURN true;
END;
$$;

-- Función procesar_cobro
CREATE OR REPLACE FUNCTION public.procesar_cobro(
    p_pedido_id text,
    p_pagos_mixtos jsonb,
    p_cajero text,
    p_condonacion float8 DEFAULT 0,
    p_a_favor_caja float8 DEFAULT 0,
    p_vuelto_entregado float8 DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido record;
    v_reserva record;
    v_metodo_principal text;
    v_total_recibido numeric := 0;
BEGIN
    SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido no encontrado';
    END IF;
    IF v_pedido.estado != 'pendiente' THEN
        RAISE EXCEPTION 'El pedido no está pendiente';
    END IF;

    SELECT SUM(
        CASE
            WHEN value->>'metodo' = 'efectivo_usd' THEN (value->>'monto')::numeric * v_pedido.tasa_aplicada
            ELSE (value->>'monto')::numeric
        END
    ) INTO v_total_recibido
    FROM jsonb_array_elements(p_pagos_mixtos) AS value;

    FOR v_reserva IN
        SELECT ingrediente_id, cantidad
        FROM public.reservas_ingredientes
        WHERE pedido_id = p_pedido_id AND estado = 'activa'
        FOR UPDATE
    LOOP
        UPDATE public.inventario
        SET stock = stock - v_reserva.cantidad,
            reservado = reservado - v_reserva.cantidad
        WHERE id = v_reserva.ingrediente_id;

        UPDATE public.reservas_ingredientes
        SET estado = 'descontada'
        WHERE pedido_id = p_pedido_id AND ingrediente_id = v_reserva.ingrediente_id;
    END LOOP;

    IF jsonb_array_length(p_pagos_mixtos) = 1 THEN
        v_metodo_principal := p_pagos_mixtos->0->>'metodo';
    ELSE
        v_metodo_principal := 'mixto';
    END IF;

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
        vuelto_entregado = p_vuelto_entregado,
        monto_recibido = v_total_recibido
    WHERE id = p_pedido_id;

    INSERT INTO public.notificaciones (pedido_id, tipo, titulo, mensaje, session_id)
    VALUES (
        p_pedido_id,
        'approved',
        '✅ Pago confirmado',
        'Tu pedido ha sido pagado y está en preparación',
        v_pedido.session_id
    );

    INSERT INTO public.ventas (fecha, pedido_id, total, items, metodo_pago, tipo)
    VALUES (
        now(),
        p_pedido_id,
        v_pedido.total,
        (SELECT SUM((item->>'cantidad')::integer) FROM jsonb_array_elements(v_pedido.items) AS item),
        v_metodo_principal,
        v_pedido.tipo
    );

    INSERT INTO public.eventos_sistema (tipo) VALUES ('pedido_actualizado');
END;
$$;

-- Función cancelar_pedidos_timeout
CREATE OR REPLACE FUNCTION public.cancelar_pedidos_timeout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido record;
BEGIN
    FOR v_pedido IN
        SELECT id, session_id
        FROM public.pedidos
        WHERE
            estado = 'pendiente'
            AND tipo IN ('delivery', 'reserva')
            AND EXTRACT(EPOCH FROM (now() - timestamp)) / 60 > 20
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            PERFORM public.liberar_ingredientes(v_pedido.id);
            UPDATE public.pedidos SET estado = 'cancelado_timeout' WHERE id = v_pedido.id;
            INSERT INTO public.notificaciones (pedido_id, tipo, titulo, mensaje, session_id)
            VALUES (
                v_pedido.id,
                'rejected',
                '⏰ Pedido cancelado',
                'El tiempo para pagar ha expirado (20 minutos)',
                v_pedido.session_id
            );
            INSERT INTO public.eventos_sistema (tipo) VALUES ('pedido_cancelado');
        EXCEPTION
            WHEN OTHERS THEN
                CONTINUE;
        END;
    END LOOP;
END;
$$;

-- Función verificar_stock_critico
CREATE OR REPLACE FUNCTION public.verificar_stock_critico()
RETURNS TABLE(
    ingrediente_id text,
    nombre text,
    stock_actual numeric,
    stock_minimo numeric,
    unidades_faltantes numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.nombre,
        i.stock,
        i.minimo,
        GREATEST(0, i.minimo - i.stock) AS unidades_faltantes
    FROM public.inventario i
    WHERE i.stock <= i.minimo
    ORDER BY (i.stock / NULLIF(i.minimo, 0)) ASC;
END;
$$;

-- Programar trabajos cron
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('cancelar-pedidos-timeout', '* * * * *', 'SELECT public.cancelar_pedidos_timeout()');
        PERFORM cron.schedule('verificar-stock-critico', '*/5 * * * *', 'SELECT public.verificar_stock_critico()');
    END IF;
END;
$$;

-- Datos de ejemplo
INSERT INTO public.usuarios (id, nombre, username, password, rol, activo)
VALUES
    ('user_ejemplo1', 'Cajero Principal', 'cajero1', '123456', 'cajero', true),
    ('user_ejemplo2', 'Cajero Secundario', 'cajero2', '123456', 'cajero', true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.inventario (id, nombre, stock, minimo, unidad_base, precio_costo, precio_unitario)
VALUES
    ('ing_arroz', 'Arroz para sushi', 5000, 1000, 'gramos', 0.002, 0.01),
    ('ing_salmon', 'Salmón fresco', 2000, 500, 'gramos', 0.015, 0.05),
    ('ing_aguacate', 'Aguacate', 10, 5, 'unidades', 0.5, 1.5),
    ('ing_alga', 'Alga nori', 100, 20, 'unidades', 0.1, 0.3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu (id, nombre, categoria, precio, descripcion, ingredientes, disponible)
VALUES
    (
        'plat_001',
        'Roll de Salmón',
        'Rolls',
        8.50,
        'Delicioso roll con salmón fresco',
        '{"ing_salmon": {"cantidad": 50, "nombre": "Salmón fresco"}, "ing_arroz": {"cantidad": 100, "nombre": "Arroz"}, "ing_alga": {"cantidad": 1, "nombre": "Alga nori"}}'::jsonb,
        true
    ),
    (
        'plat_002',
        'Sashimi de Salmón',
        'Sushi',
        12.00,
        'Finas láminas de salmón',
        '{"ing_salmon": {"cantidad": 100, "nombre": "Salmón fresco"}}'::jsonb,
        true
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.mesoneros (nombre)
VALUES
    ('Juan Pérez'),
    ('María García'),
    ('Carlos López')
ON CONFLICT DO NOTHING;

-- Configurar bucket de almacenamiento
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('imagenes-platillos', 'imagenes-platillos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Comprobantes insert público" ON storage.objects;
DROP POLICY IF EXISTS "Comprobantes select público" ON storage.objects;
DROP POLICY IF EXISTS "Comprobantes update público" ON storage.objects;
DROP POLICY IF EXISTS "Comprobantes delete público" ON storage.objects;
DROP POLICY IF EXISTS "Comprobantes insert autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Comprobantes select autenticado" ON storage.objects;

-- Crear nuevas políticas
CREATE POLICY "Comprobantes insert público" ON storage.objects
    FOR INSERT TO anon WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Comprobantes select público" ON storage.objects
    FOR SELECT TO anon USING (bucket_id = 'comprobantes');

CREATE POLICY "Comprobantes update público" ON storage.objects
    FOR UPDATE TO anon USING (bucket_id = 'comprobantes');

CREATE POLICY "Comprobantes delete público" ON storage.objects
    FOR DELETE TO anon USING (bucket_id = 'comprobantes');

CREATE POLICY "Comprobantes insert autenticado" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Comprobantes select autenticado" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'comprobantes');

-- Políticas para imagenes-platillos
DROP POLICY IF EXISTS "Imagenes platillos insert público" ON storage.objects;
DROP POLICY IF EXISTS "Imagenes platillos select público" ON storage.objects;

CREATE POLICY "Imagenes platillos insert público" ON storage.objects
    FOR INSERT TO anon WITH CHECK (bucket_id = 'imagenes-platillos');

CREATE POLICY "Imagenes platillos select público" ON storage.objects
    FOR SELECT TO anon USING (bucket_id = 'imagenes-platillos');

SELECT 'Base de datos inicializada correctamente' AS mensaje;

-- init.sql (Modificaciones para Deliverys)

-- 1. Crear tabla para motorizados (deliverys)
CREATE TABLE IF NOT EXISTS public.deliverys(
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
);

-- 2. Crear tabla para registrar las entregas de delivery (acumulado diario)
CREATE TABLE IF NOT EXISTS public.entregas_delivery(
    id SERIAL PRIMARY KEY,
    pedido_id TEXT REFERENCES public.pedidos(id) ON DELETE CASCADE,
    delivery_id INTEGER REFERENCES public.deliverys(id) ON DELETE CASCADE,
    monto_bs NUMERIC NOT NULL,
    fecha_entrega TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_entregas_delivery_fecha ON public.entregas_delivery(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_entregas_delivery_delivery ON public.entregas_delivery(delivery_id);

-- 3. Modificar tabla ventas para guardar el subtotal de platillos (sin delivery)
-- Nota: Si la tabla ya existe, agregamos la columna. Si no, se creará con el insert.
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS subtotal_platillos NUMERIC DEFAULT 0;

-- 4. Insertar algunos motorizados de ejemplo (opcional)
INSERT INTO public.deliverys (nombre) VALUES
    ('Carlos Moto'),
    ('Luis Pérez'),
    ('Ana Rodríguez')
ON CONFLICT DO NOTHING;

-- 5. Políticas de seguridad (opcional, si usas RLS)
ALTER TABLE public.deliverys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deliverys acceso público" ON public.deliverys
    FOR ALL USING (true);

CREATE POLICY "Entregas delivery acceso público" ON public.entregas_delivery
    FOR ALL USING (true);

SELECT '✅ Tablas de deliverys creadas/actualizadas correctamente' AS mensaje;