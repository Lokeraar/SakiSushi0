-- ============================================
-- SCRIPT COMPLETO DE INICIALIZACIÓN - VERSIÓN MEJORADA
-- SISTEMA SAKI SUSHI CON RESERVAS DE INGREDIENTES
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

-- Tabla config (mejorada con umbral de alertas)
CREATE TABLE IF NOT EXISTS public.config (
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

-- Insertar configuración inicial
INSERT INTO public.config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Tabla inventario (con índices para búsqueda rápida)
CREATE TABLE IF NOT EXISTS public.inventario (
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

CREATE INDEX IF NOT EXISTS idx_menu_disponible ON public.menu(disponible);
CREATE INDEX IF NOT EXISTS idx_menu_categoria ON public.menu(categoria);

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

-- Tabla pedidos (con índices mejorados)
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
    session_id text,
    reservas_confirmadas boolean DEFAULT false
);

-- Índices compuestos para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_timestamp ON public.pedidos(estado, timestamp);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo_estado ON public.pedidos(tipo, estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_session ON public.pedidos(session_id);

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

CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON public.notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_timestamp ON public.notificaciones(timestamp);

-- Tabla codigos_qr
CREATE TABLE IF NOT EXISTS public.codigos_qr (
    id text PRIMARY KEY,
    nombre text,
    fecha timestamptz DEFAULT now()
);

-- Tabla ventas
CREATE TABLE IF NOT EXISTS public.ventas (
    id bigserial PRIMARY KEY,
    fecha timestamptz DEFAULT now(),
    pedido_id text,
    total numeric DEFAULT 0,
    items integer DEFAULT 0,
    metodo_pago text,
    tipo text
);

-- ============================================
-- TABLA DE RESERVAS DE INGREDIENTES (MEJORADA)
-- ============================================
CREATE TABLE IF NOT EXISTS public.reservas_ingredientes (
    id text PRIMARY KEY,
    pedido_id text NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    ingrediente_id text NOT NULL REFERENCES public.inventario(id) ON DELETE CASCADE,
    cantidad numeric NOT NULL,
    fecha_reserva timestamptz DEFAULT now(),
    estado text DEFAULT 'activa', -- 'activa', 'descontada', 'liberada'
    UNIQUE(pedido_id, ingrediente_id)
);

CREATE INDEX IF NOT EXISTS idx_reservas_pedido ON public.reservas_ingredientes(pedido_id);
CREATE INDEX IF NOT EXISTS idx_reservas_ingrediente ON public.reservas_ingredientes(ingrediente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON public.reservas_ingredientes(estado);

-- ============================================
-- FUNCIONES RPC MEJORADAS
-- ============================================

-- Función: crear_pedido_con_reserva (NUEVA - TRANSACCIONAL)
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
    v_platillo record;
    v_ingredientes jsonb;
    v_ing_record record;
    v_cantidad_necesaria numeric;
    v_stock_disponible numeric;
    v_resultado jsonb;
BEGIN
    -- Iniciar transacción
    BEGIN
        -- Extraer ID del pedido
        v_pedido_id := p_pedido->>'id';
        
        -- Verificar stock de todos los ingredientes primero
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            -- Obtener ingredientes del platillo
            SELECT ingredientes INTO v_ingredientes 
            FROM public.menu 
            WHERE id = (v_item->>'platilloId');
            
            -- Recorrer ingredientes del platillo
            FOR v_ing_record IN 
                SELECT key, value 
                FROM jsonb_each(v_ingredientes)
            LOOP
                -- Verificar si el ingrediente fue quitado en personalización
                IF NOT (v_item->'personalizacion' ? v_ing_record.key) THEN
                    v_cantidad_necesaria = (v_ing_record.value->>'cantidad')::numeric;
                    
                    -- Obtener stock disponible actual
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
        
        -- Si llegamos aquí, hay stock suficiente. Insertar pedido
        INSERT INTO public.pedidos (
            id, timestamp, estado, tipo, items, total, 
            session_id, mesa, cliente_nombre, parroquia, direccion,
            telefono, referencia, fecha_reserva, comprobante_url,
            costo_delivery, costo_delivery_usd
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
        
        -- Ahora crear las reservas
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            SELECT ingredientes INTO v_ingredientes 
            FROM public.menu 
            WHERE id = (v_item->>'platilloId');
            
            FOR v_ing_record IN 
                SELECT key, value 
                FROM jsonb_each(v_ingredientes)
            LOOP
                IF NOT (v_item->'personalizacion' ? v_ing_record.key) THEN
                    v_cantidad_necesaria = (v_ing_record.value->>'cantidad')::numeric;
                    
                    -- Insertar reserva
                    INSERT INTO public.reservas_ingredientes (
                        id, pedido_id, ingrediente_id, cantidad, estado
                    ) VALUES (
                        'res_' || gen_random_uuid()::text,
                        v_pedido_id,
                        v_ing_record.key,
                        v_cantidad_necesaria,
                        'activa'
                    );
                    
                    -- Actualizar reservado en inventario
                    UPDATE public.inventario 
                    SET reservado = reservado + v_cantidad_necesaria
                    WHERE id = v_ing_record.key;
                END IF;
            END LOOP;
        END LOOP;
        
        -- Crear notificación
        INSERT INTO public.notificaciones (pedido_id, tipo, titulo, mensaje)
        VALUES (
            v_pedido_id,
            'pending',
            '📋 Pedido recibido',
            CASE 
                WHEN p_pedido->>'tipo' = 'mesa' THEN 'Por favor, pasa a caja a cancelar'
                ELSE 'Tu pedido está pendiente de confirmación'
            END
        );
        
        -- Todo OK
        v_resultado := jsonb_build_object(
            'success', true,
            'pedido_id', v_pedido_id
        );
        
        RETURN v_resultado;
        
    EXCEPTION WHEN OTHERS THEN
        -- Algo falló, hacer rollback automático
        v_resultado := jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
        RETURN v_resultado;
    END;
END;
$$;

-- Función: reservar_ingredientes (optimizada)
CREATE OR REPLACE FUNCTION public.reservar_ingredientes(
    p_pedido_id text,
    p_items jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item jsonb;
    v_platillo record;
    v_ingredientes jsonb;
    v_ing_record record;
    v_cantidad_necesaria numeric;
    v_stock_disponible numeric;
BEGIN
    -- Verificar que el pedido existe y está en estado pendiente
    IF NOT EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id AND estado = 'pendiente') THEN
        RAISE EXCEPTION 'Pedido no encontrado o no está pendiente';
    END IF;

    -- Procesar cada item del pedido
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT ingredientes INTO v_ingredientes 
        FROM public.menu 
        WHERE id = (v_item->>'platilloId');
        
        FOR v_ing_record IN 
            SELECT key, value 
            FROM jsonb_each(v_ingredientes)
        LOOP
            IF NOT (v_item->'personalizacion' ? v_ing_record.key) THEN
                v_cantidad_necesaria = (v_ing_record.value->>'cantidad')::numeric;
                
                -- Verificar stock disponible con bloqueo
                SELECT (stock - reservado) INTO v_stock_disponible
                FROM public.inventario
                WHERE id = v_ing_record.key
                FOR UPDATE;
                
                IF v_stock_disponible < v_cantidad_necesaria THEN
                    RAISE EXCEPTION 'Stock insuficiente para el ingrediente %', v_ing_record.key;
                END IF;
                
                -- Insertar o actualizar reserva
                INSERT INTO public.reservas_ingredientes (id, pedido_id, ingrediente_id, cantidad, estado)
                VALUES (
                    'res_' || gen_random_uuid()::text,
                    p_pedido_id,
                    v_ing_record.key,
                    v_cantidad_necesaria,
                    'activa'
                )
                ON CONFLICT (pedido_id, ingrediente_id) 
                DO UPDATE SET cantidad = EXCLUDED.cantidad, fecha_reserva = now();
                
                -- Actualizar reservado en inventario
                UPDATE public.inventario 
                SET reservado = reservado + v_cantidad_necesaria
                WHERE id = v_ing_record.key;
            END IF;
        END LOOP;
    END LOOP;
    
    -- Marcar pedido como con reservas confirmadas
    UPDATE public.pedidos SET reservas_confirmadas = true WHERE id = p_pedido_id;
    
    RETURN true;
END;
$$;

-- Función: liberar_ingredientes (mejorada con verificación)
CREATE OR REPLACE FUNCTION public.liberar_ingredientes(
    p_pedido_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reserva record;
    v_contador integer := 0;
BEGIN
    -- Verificar que el pedido existe
    IF NOT EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id) THEN
        RAISE EXCEPTION 'Pedido no encontrado';
    END IF;
    
    -- Liberar todas las reservas activas del pedido
    FOR v_reserva IN 
        SELECT ingrediente_id, cantidad 
        FROM public.reservas_ingredientes 
        WHERE pedido_id = p_pedido_id AND estado = 'activa'
        FOR UPDATE
    LOOP
        -- Devolver al stock disponible (restar de reservado)
        UPDATE public.inventario 
        SET reservado = reservado - v_reserva.cantidad
        WHERE id = v_reserva.ingrediente_id;
        
        -- Marcar reserva como liberada
        UPDATE public.reservas_ingredientes 
        SET estado = 'liberada' 
        WHERE pedido_id = p_pedido_id AND ingrediente_id = v_reserva.ingrediente_id;
        
        v_contador := v_contador + 1;
    END LOOP;
    
    -- Si había reservas, actualizar pedido
    IF v_contador > 0 THEN
        UPDATE public.pedidos 
        SET reservas_confirmadas = false 
        WHERE id = p_pedido_id;
    END IF;
    
    RETURN true;
END;
$$;

-- Función: procesar_cobro (versión mejorada)
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
    v_cantidad_necesaria numeric;
    v_metodo_principal text;
    v_ingredientes jsonb;
    v_ing_record record;
    v_reserva record;
    v_total_recibido numeric := 0;
BEGIN
    -- Bloquear el pedido
    SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido no encontrado';
    END IF;
    
    IF v_pedido.estado != 'pendiente' THEN
        RAISE EXCEPTION 'El pedido no está pendiente';
    END IF;
    
    -- Calcular total recibido de los pagos mixtos
    SELECT SUM(
        CASE 
            WHEN value->>'metodo' = 'efectivo_usd' 
            THEN (value->>'monto')::numeric * v_pedido.tasa_aplicada
            ELSE (value->>'monto')::numeric
        END
    ) INTO v_total_recibido
    FROM jsonb_array_elements(p_pagos_mixtos) AS value;
    
    -- Verificar que hay reservas activas
    IF EXISTS (SELECT 1 FROM public.reservas_ingredientes WHERE pedido_id = p_pedido_id AND estado = 'activa') THEN
        -- Convertir reservas en descuentos definitivos
        FOR v_reserva IN 
            SELECT ingrediente_id, cantidad 
            FROM public.reservas_ingredientes 
            WHERE pedido_id = p_pedido_id AND estado = 'activa'
            FOR UPDATE
        LOOP
            -- Descontar definitivamente del stock
            UPDATE public.inventario 
            SET stock = stock - v_reserva.cantidad,
                reservado = reservado - v_reserva.cantidad
            WHERE id = v_reserva.ingrediente_id;
            
            -- Marcar reserva como descontada
            UPDATE public.reservas_ingredientes 
            SET estado = 'descontada' 
            WHERE pedido_id = p_pedido_id AND ingrediente_id = v_reserva.ingrediente_id;
        END LOOP;
    ELSE
        -- Si no hay reservas, descontar directamente
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_pedido.items)
        LOOP
            SELECT ingredientes INTO v_ingredientes 
            FROM public.menu 
            WHERE id = (v_item->>'platilloId');
            
            FOR v_ing_record IN 
                SELECT key, value 
                FROM jsonb_each(v_ingredientes)
            LOOP
                IF NOT (v_item->'personalizacion' ? v_ing_record.key) THEN
                    v_cantidad_necesaria = (v_ing_record.value->>'cantidad')::numeric;
                    
                    UPDATE public.inventario 
                    SET stock = stock - v_cantidad_necesaria
                    WHERE id = v_ing_record.key;
                END IF;
            END LOOP;
        END LOOP;
    END IF;
    
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
        vuelto_entregado = p_vuelto_entregado,
        monto_recibido = v_total_recibido
    WHERE id = p_pedido_id;
    
    -- Insertar notificación
    INSERT INTO public.notificaciones (pedido_id, tipo, titulo, mensaje)
    VALUES (
        p_pedido_id,
        'approved',
        '✅ Pago confirmado',
        'Tu pedido ha sido pagado y está en preparación'
    );
    
    -- Insertar en ventas
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

-- Función: cancelar_pedidos_timeout (mejorada)
CREATE OR REPLACE FUNCTION public.cancelar_pedidos_timeout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pedido record;
    v_count integer := 0;
BEGIN
    -- Cancelar pedidos de delivery y reserva con más de 20 minutos
    FOR v_pedido IN 
        SELECT id FROM public.pedidos
        WHERE estado = 'pendiente' 
          AND tipo IN ('delivery', 'reserva')
          AND EXTRACT(EPOCH FROM (now() - timestamp)) / 60 > 20
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            -- Liberar ingredientes reservados
            PERFORM public.liberar_ingredientes(v_pedido.id);
            
            -- Actualizar estado del pedido
            UPDATE public.pedidos
            SET estado = 'cancelado_timeout'
            WHERE id = v_pedido.id;
            
            -- Insertar notificación
            INSERT INTO public.notificaciones (pedido_id, tipo, titulo, mensaje)
            VALUES (
                v_pedido.id,
                'rejected',
                '⏰ Pedido cancelado',
                'El tiempo para pagar ha expirado (20 minutos)'
            );
            
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Si falla un pedido, continuar con el siguiente
            CONTINUE;
        END;
    END LOOP;
    
    -- Registrar en logs si se cancelaron pedidos
    IF v_count > 0 THEN
        RAISE NOTICE 'Se cancelaron % pedidos por timeout', v_count;
    END IF;
END;
$$;

-- Función: verificar_stock_critico (NUEVA)
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
        GREATEST(0, i.minimo - i.stock) as unidades_faltantes
    FROM public.inventario i
    WHERE i.stock <= i.minimo
    ORDER BY (i.stock / NULLIF(i.minimo, 0)) ASC;
END;
$$;

-- Programar job con pg_cron (si está disponible)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'cancelar-pedidos-timeout',
            '* * * * *',  -- cada minuto
            'SELECT public.cancelar_pedidos_timeout()'
        );
        
        PERFORM cron.schedule(
            'verificar-stock-critico',
            '*/5 * * * *',  -- cada 5 minutos
            'SELECT public.verificar_stock_critico()'
        );
    END IF;
END;
$$;

-- ============================================
-- DATOS INICIALES DE EJEMPLO
-- ============================================

-- Insertar usuario cajero de ejemplo
INSERT INTO public.usuarios (id, nombre, username, password, rol, activo)
VALUES 
    ('user_ejemplo1', 'Cajero Principal', 'cajero1', '123456', 'cajero', true),
    ('user_ejemplo2', 'Cajero Secundario', 'cajero2', '123456', 'cajero', true)
ON CONFLICT (username) DO NOTHING;

-- Insertar algunos ingredientes de ejemplo
INSERT INTO public.inventario (id, nombre, stock, minimo, unidad_base, precio_costo, precio_unitario)
VALUES 
    ('ing_arroz', 'Arroz para sushi', 5000, 1000, 'gramos', 0.002, 0.01),
    ('ing_salmon', 'Salmón fresco', 2000, 500, 'gramos', 0.015, 0.05),
    ('ing_aguacate', 'Aguacate', 10, 5, 'unidades', 0.5, 1.5),
    ('ing_alga', 'Alga nori', 100, 20, 'unidades', 0.1, 0.3)
ON CONFLICT (id) DO NOTHING;

-- Insertar algunos platillos de ejemplo
INSERT INTO public.menu (id, nombre, categoria, precio, descripcion, ingredientes, disponible)
VALUES 
    ('plat_001', 'Roll de Salmón', 'Rolls', 8.50, 'Delicioso roll con salmón fresco', 
     '{"ing_salmon": {"cantidad": 50, "nombre": "Salmón fresco"}, "ing_arroz": {"cantidad": 100, "nombre": "Arroz"}, "ing_alga": {"cantidad": 1, "nombre": "Alga nori"}}'::jsonb,
     true),
    ('plat_002', 'Sashimi de Salmón', 'Sushi', 12.00, 'Finas láminas de salmón',
     '{"ing_salmon": {"cantidad": 100, "nombre": "Salmón fresco"}}'::jsonb,
     true)
ON CONFLICT (id) DO NOTHING;

-- Mensaje de confirmación
SELECT 'Base de datos inicializada correctamente con sistema de reservas mejorado' as mensaje;