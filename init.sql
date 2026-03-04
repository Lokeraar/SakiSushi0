-- ============================================
-- SCRIPT COMPLETO PARA SUPABASE - SAKI SUSHI
-- CON REALTIME HABILITADO PARA NOTIFICACIONES
-- ============================================

-- HABILITAR EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ELIMINAR TODO LO EXISTENTE (FUERZA BRUTA)
-- ============================================

-- Desconectar todos los usuarios de las tablas
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Eliminar funciones
DROP FUNCTION IF EXISTS crear_pedido_con_reserva CASCADE;
DROP FUNCTION IF EXISTS liberar_ingredientes CASCADE;
DROP FUNCTION IF EXISTS verificar_stock_critico CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Eliminar tablas (con CASCADE para eliminar dependencias)
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS entregas_delivery CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS propinas CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS menu CASCADE;
DROP TABLE IF EXISTS inventario CASCADE;
DROP TABLE IF EXISTS codigos_qr CASCADE;
DROP TABLE IF EXISTS deliverys CASCADE;
DROP TABLE IF EXISTS mesoneros CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS config CASCADE;

-- ============================================
-- CREAR TABLAS SIN RLS (FORZADO)
-- ============================================

-- Tabla: config
CREATE TABLE config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    tasa_cambio NUMERIC(10,2) DEFAULT 400.00,
    tasa_efectiva NUMERIC(10,2) DEFAULT 400.00,
    aumento_diario NUMERIC(5,2) DEFAULT 0,
    aumento_acumulado NUMERIC(5,2) DEFAULT 0,
    aumento_activo BOOLEAN DEFAULT FALSE,
    aumento_detenido BOOLEAN DEFAULT FALSE,
    fecha_ultimo_aumento TIMESTAMP WITH TIME ZONE,
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    admin_password TEXT DEFAULT '654321',
    recovery_email TEXT DEFAULT 'admin@sakisushi.com',
    alerta_stock_minimo INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT config_id_check CHECK (id = 1)
);

-- Insertar configuración inicial
INSERT INTO config (id, tasa_cambio, tasa_efectiva, admin_password, recovery_email, alerta_stock_minimo) 
VALUES (1, 400.00, 400.00, '654321', 'admin@sakisushi.com', 5)
ON CONFLICT (id) DO UPDATE SET
    tasa_cambio = EXCLUDED.tasa_cambio,
    tasa_efectiva = EXCLUDED.tasa_efectiva,
    admin_password = EXCLUDED.admin_password,
    recovery_email = EXCLUDED.recovery_email,
    alerta_stock_minimo = EXCLUDED.alerta_stock_minimo;

-- DESHABILITAR RLS INMEDIATAMENTE
ALTER TABLE config DISABLE ROW LEVEL SECURITY;
GRANT ALL ON config TO PUBLIC;
GRANT ALL ON config TO anon;
GRANT ALL ON config TO authenticated;

-- Tabla: usuarios
CREATE TABLE usuarios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT DEFAULT 'cajero',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
GRANT ALL ON usuarios TO PUBLIC;
GRANT ALL ON usuarios TO anon;
GRANT ALL ON usuarios TO authenticated;

-- Insertar usuarios de ejemplo
INSERT INTO usuarios (id, nombre, username, password, rol, activo) VALUES
    ('user_' || gen_random_uuid() || '_1', 'Cajero Principal', 'cajero1', '123456', 'cajero', true),
    ('user_' || gen_random_uuid() || '_2', 'Cajero Secundario', 'cajero2', '123456', 'cajero', true)
ON CONFLICT (username) DO NOTHING;

-- Tabla: mesoneros
CREATE TABLE mesoneros (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE mesoneros DISABLE ROW LEVEL SECURITY;
GRANT ALL ON mesoneros TO PUBLIC;
GRANT ALL ON mesoneros TO anon;
GRANT ALL ON mesoneros TO authenticated;

-- Insertar mesoneros de ejemplo
INSERT INTO mesoneros (id, nombre, activo) VALUES
    ('mes_' || gen_random_uuid() || '_1', 'Carlos Méndez', true),
    ('mes_' || gen_random_uuid() || '_2', 'María González', true),
    ('mes_' || gen_random_uuid() || '_3', 'José Rodríguez', true),
    ('mes_' || gen_random_uuid() || '_4', 'Ana Pérez', true),
    ('mes_' || gen_random_uuid() || '_5', 'Luis Martínez', true)
ON CONFLICT DO NOTHING;

-- Tabla: deliverys
CREATE TABLE deliverys (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE deliverys DISABLE ROW LEVEL SECURITY;
GRANT ALL ON deliverys TO PUBLIC;
GRANT ALL ON deliverys TO anon;
GRANT ALL ON deliverys TO authenticated;

-- Insertar motorizados de ejemplo
INSERT INTO deliverys (id, nombre, activo) VALUES
    ('del_' || gen_random_uuid() || '_1', 'Pedro Castillo', true),
    ('del_' || gen_random_uuid() || '_2', 'Juan Flores', true),
    ('del_' || gen_random_uuid() || '_3', 'Miguel Rojas', true),
    ('del_' || gen_random_uuid() || '_4', 'Alejandro Toro', true),
    ('del_' || gen_random_uuid() || '_5', 'David Silva', true)
ON CONFLICT DO NOTHING;

-- Tabla: inventario
CREATE TABLE inventario (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    stock NUMERIC(10,2) DEFAULT 0,
    reservado NUMERIC(10,2) DEFAULT 0,
    unidad_base TEXT DEFAULT 'unidades',
    minimo NUMERIC(10,2) DEFAULT 0,
    precio_costo NUMERIC(10,2) DEFAULT 0,
    precio_unitario NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE inventario DISABLE ROW LEVEL SECURITY;
GRANT ALL ON inventario TO PUBLIC;
GRANT ALL ON inventario TO anon;
GRANT ALL ON inventario TO authenticated;

-- Insertar ingredientes
INSERT INTO inventario (id, nombre, stock, reservado, unidad_base, minimo, precio_costo, precio_unitario) VALUES
    ('ing_' || gen_random_uuid() || '_1', 'Arroz para sushi', 50, 0, 'kilogramos', 10, 3.50, 5.00),
    ('ing_' || gen_random_uuid() || '_2', 'Alga nori', 200, 0, 'unidades', 50, 0.30, 0.60),
    ('ing_' || gen_random_uuid() || '_3', 'Salmón fresco', 30, 0, 'kilogramos', 5, 12.00, 18.00),
    ('ing_' || gen_random_uuid() || '_4', 'Atún fresco', 25, 0, 'kilogramos', 5, 14.00, 20.00),
    ('ing_' || gen_random_uuid() || '_5', 'Pepino', 40, 0, 'unidades', 10, 0.50, 0.90),
    ('ing_' || gen_random_uuid() || '_6', 'Aguacate', 35, 0, 'unidades', 10, 0.80, 1.50),
    ('ing_' || gen_random_uuid() || '_7', 'Queso crema', 20, 0, 'kilogramos', 5, 4.00, 6.50),
    ('ing_' || gen_random_uuid() || '_8', 'Salsa de soya', 15, 0, 'litros', 3, 2.50, 4.00),
    ('ing_' || gen_random_uuid() || '_9', 'Wasabi', 10, 0, 'kilogramos', 2, 8.00, 12.00),
    ('ing_' || gen_random_uuid() || '_10', 'Jengibre encurtido', 12, 0, 'kilogramos', 3, 3.00, 5.00),
    ('ing_' || gen_random_uuid() || '_11', 'Sésamo', 8, 0, 'kilogramos', 2, 2.50, 4.00),
    ('ing_' || gen_random_uuid() || '_12', 'Cangrejo (imitación)', 18, 0, 'kilogramos', 5, 5.00, 8.00),
    ('ing_' || gen_random_uuid() || '_13', 'Anguila', 10, 0, 'kilogramos', 2, 15.00, 22.00),
    ('ing_' || gen_random_uuid() || '_14', 'Huevas de pez volador', 5, 0, 'kilogramos', 1, 25.00, 35.00),
    ('ing_' || gen_random_uuid() || '_15', 'Mayonesa japonesa', 12, 0, 'litros', 3, 3.50, 6.00)
ON CONFLICT DO NOTHING;

-- Tabla: menu
CREATE TABLE menu (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria TEXT,
    subcategoria TEXT,
    precio NUMERIC(10,2) DEFAULT 0,
    descripcion TEXT,
    imagen TEXT,
    ingredientes JSONB DEFAULT '{}',
    disponible BOOLEAN DEFAULT TRUE,
    stock INTEGER DEFAULT 0,
    stock_maximo INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE menu DISABLE ROW LEVEL SECURITY;
GRANT ALL ON menu TO PUBLIC;
GRANT ALL ON menu TO anon;
GRANT ALL ON menu TO authenticated;

-- Insertar platillos (usando los IDs de ingredientes)
DO $$
DECLARE
    arroz_id TEXT;
    alga_id TEXT;
    salmon_id TEXT;
    atun_id TEXT;
    pepino_id TEXT;
    aguacate_id TEXT;
    queso_id TEXT;
    cangrejo_id TEXT;
    sesamo_id TEXT;
    anguila_id TEXT;
    huevas_id TEXT;
BEGIN
    -- Obtener IDs de ingredientes
    SELECT id INTO arroz_id FROM inventario WHERE nombre = 'Arroz para sushi' LIMIT 1;
    SELECT id INTO alga_id FROM inventario WHERE nombre = 'Alga nori' LIMIT 1;
    SELECT id INTO salmon_id FROM inventario WHERE nombre = 'Salmón fresco' LIMIT 1;
    SELECT id INTO atun_id FROM inventario WHERE nombre = 'Atún fresco' LIMIT 1;
    SELECT id INTO pepino_id FROM inventario WHERE nombre = 'Pepino' LIMIT 1;
    SELECT id INTO aguacate_id FROM inventario WHERE nombre = 'Aguacate' LIMIT 1;
    SELECT id INTO queso_id FROM inventario WHERE nombre = 'Queso crema' LIMIT 1;
    SELECT id INTO cangrejo_id FROM inventario WHERE nombre = 'Cangrejo (imitación)' LIMIT 1;
    SELECT id INTO sesamo_id FROM inventario WHERE nombre = 'Sésamo' LIMIT 1;
    SELECT id INTO anguila_id FROM inventario WHERE nombre = 'Anguila' LIMIT 1;
    SELECT id INTO huevas_id FROM inventario WHERE nombre = 'Huevas de pez volador' LIMIT 1;

    -- Insertar platillos
    INSERT INTO menu (id, nombre, categoria, subcategoria, precio, descripcion, imagen, ingredientes, disponible, stock_maximo) VALUES
        ('plat_' || gen_random_uuid() || '_1', 'California Roll', 'Rolls', 'Rolls Fríos de 10 piezas', 8.99, 'Rollo de cangrejo, pepino y aguacate', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351', 
         jsonb_build_object(
             arroz_id, jsonb_build_object('cantidad', 0.15, 'nombre', 'Arroz para sushi', 'unidad', 'kilogramos'),
             alga_id, jsonb_build_object('cantidad', 1, 'nombre', 'Alga nori', 'unidad', 'unidades'),
             cangrejo_id, jsonb_build_object('cantidad', 0.1, 'nombre', 'Cangrejo (imitación)', 'unidad', 'kilogramos'),
             pepino_id, jsonb_build_object('cantidad', 0.2, 'nombre', 'Pepino', 'unidad', 'unidades'),
             aguacate_id, jsonb_build_object('cantidad', 0.3, 'nombre', 'Aguacate', 'unidad', 'unidades'),
             sesamo_id, jsonb_build_object('cantidad', 0.01, 'nombre', 'Sésamo', 'unidad', 'kilogramos')
         ), true, 50),

        ('plat_' || gen_random_uuid() || '_2', 'Philadelphia Roll', 'Rolls', 'Rolls Fríos de 10 piezas', 9.99, 'Salmón y queso crema', 'https://images.unsplash.com/photo-1617196035154-1e7e6e28b0db',
         jsonb_build_object(
             arroz_id, jsonb_build_object('cantidad', 0.15, 'nombre', 'Arroz para sushi', 'unidad', 'kilogramos'),
             alga_id, jsonb_build_object('cantidad', 1, 'nombre', 'Alga nori', 'unidad', 'unidades'),
             salmon_id, jsonb_build_object('cantidad', 0.12, 'nombre', 'Salmón fresco', 'unidad', 'kilogramos'),
             queso_id, jsonb_build_object('cantidad', 0.05, 'nombre', 'Queso crema', 'unidad', 'kilogramos'),
             pepino_id, jsonb_build_object('cantidad', 0.1, 'nombre', 'Pepino', 'unidad', 'unidades')
         ), true, 40),

        ('plat_' || gen_random_uuid() || '_3', 'Spicy Tuna Roll', 'Rolls', 'Rolls Fríos de 10 piezas', 10.99, 'Atún picante', 'https://images.unsplash.com/photo-1617196035154-1e7e6e28b0db',
         jsonb_build_object(
             arroz_id, jsonb_build_object('cantidad', 0.15, 'nombre', 'Arroz para sushi', 'unidad', 'kilogramos'),
             alga_id, jsonb_build_object('cantidad', 1, 'nombre', 'Alga nori', 'unidad', 'unidades'),
             atun_id, jsonb_build_object('cantidad', 0.12, 'nombre', 'Atún fresco', 'unidad', 'kilogramos'),
             pepino_id, jsonb_build_object('cantidad', 0.1, 'nombre', 'Pepino', 'unidad', 'unidades'),
             aguacate_id, jsonb_build_object('cantidad', 0.2, 'nombre', 'Aguacate', 'unidad', 'unidades')
         ), true, 35),

        ('plat_' || gen_random_uuid() || '_4', 'Dragon Roll', 'Rolls', 'Rolls Tempura de 12 piezas', 12.99, 'Rollo de anguila y aguacate', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c',
         jsonb_build_object(
             arroz_id, jsonb_build_object('cantidad', 0.18, 'nombre', 'Arroz para sushi', 'unidad', 'kilogramos'),
             alga_id, jsonb_build_object('cantidad', 1, 'nombre', 'Alga nori', 'unidad', 'unidades'),
             anguila_id, jsonb_build_object('cantidad', 0.1, 'nombre', 'Anguila', 'unidad', 'kilogramos'),
             aguacate_id, jsonb_build_object('cantidad', 0.4, 'nombre', 'Aguacate', 'unidad', 'unidades'),
             huevas_id, jsonb_build_object('cantidad', 0.02, 'nombre', 'Huevas de pez volador', 'unidad', 'kilogramos')
         ), true, 30),

        ('plat_' || gen_random_uuid() || '_5', 'Sashimi de Salmón (5 pcs)', 'Sushi', NULL, 8.50, '5 piezas de salmón fresco', 'https://images.unsplash.com/photo-1553621042-f6e147245754',
         jsonb_build_object(
             salmon_id, jsonb_build_object('cantidad', 0.15, 'nombre', 'Salmón fresco', 'unidad', 'kilogramos')
         ), true, 60),

        ('plat_' || gen_random_uuid() || '_6', 'Nigiri de Atún (2 pcs)', 'Sushi', NULL, 6.50, '2 piezas de atún sobre arroz', 'https://images.unsplash.com/photo-1617196035154-1e7e6e28b0db',
         jsonb_build_object(
             arroz_id, jsonb_build_object('cantidad', 0.06, 'nombre', 'Arroz para sushi', 'unidad', 'kilogramos'),
             atun_id, jsonb_build_object('cantidad', 0.06, 'nombre', 'Atún fresco', 'unidad', 'kilogramos')
         ), true, 45)
    ON CONFLICT DO NOTHING;
END $$;

-- Tabla: pedidos
CREATE TABLE pedidos (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado TEXT DEFAULT 'pendiente',
    tipo TEXT,
    total NUMERIC(10,2) DEFAULT 0,
    session_id TEXT,
    mesa TEXT,
    cliente_nombre TEXT,
    parroquia TEXT,
    direccion TEXT,
    telefono TEXT,
    referencia TEXT,
    fecha_reserva TIMESTAMP WITH TIME ZONE,
    comprobante_url TEXT,
    costo_delivery NUMERIC(10,2) DEFAULT 0,
    costo_delivery_usd NUMERIC(10,2) DEFAULT 0,
    costo_delivery_bs NUMERIC(10,2) DEFAULT 0,
    tasa_aplicada NUMERIC(10,2) DEFAULT 400,
    items JSONB DEFAULT '[]',
    pagos_mixtos JSONB,
    metodo_pago TEXT,
    cajero TEXT,
    fecha_cobro TIMESTAMP WITH TIME ZONE,
    condonado NUMERIC(10,2) DEFAULT 0,
    a_favor_caja NUMERIC(10,2) DEFAULT 0,
    vuelto_entregado NUMERIC(10,2) DEFAULT 0,
    monto_recibido NUMERIC(10,2) DEFAULT 0,
    delivery_id TEXT,
    delivery_nombre TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
GRANT ALL ON pedidos TO PUBLIC;
GRANT ALL ON pedidos TO anon;
GRANT ALL ON pedidos TO authenticated;

CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_timestamp ON pedidos(timestamp);
CREATE INDEX IF NOT EXISTS idx_pedidos_session_id ON pedidos(session_id);

-- Tabla: ventas
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    pedido_id TEXT REFERENCES pedidos(id) ON DELETE CASCADE,
    total NUMERIC(10,2) DEFAULT 0,
    subtotal_platillos NUMERIC(10,2) DEFAULT 0,
    items INTEGER DEFAULT 0,
    metodo_pago TEXT,
    tipo TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ventas DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ventas TO PUBLIC;
GRANT ALL ON ventas TO anon;
GRANT ALL ON ventas TO authenticated;

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);

-- Tabla: entregas_delivery
CREATE TABLE entregas_delivery (
    id SERIAL PRIMARY KEY,
    pedido_id TEXT REFERENCES pedidos(id) ON DELETE CASCADE,
    delivery_id TEXT REFERENCES deliverys(id) ON DELETE SET NULL,
    monto_bs NUMERIC(10,2) DEFAULT 0,
    fecha_entrega TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE entregas_delivery DISABLE ROW LEVEL SECURITY;
GRANT ALL ON entregas_delivery TO PUBLIC;
GRANT ALL ON entregas_delivery TO anon;
GRANT ALL ON entregas_delivery TO authenticated;

CREATE INDEX IF NOT EXISTS idx_entregas_delivery_id ON entregas_delivery(delivery_id);
CREATE INDEX IF NOT EXISTS idx_entregas_fecha ON entregas_delivery(fecha_entrega);

-- Tabla: propinas
CREATE TABLE propinas (
    id SERIAL PRIMARY KEY,
    mesonero_id TEXT REFERENCES mesoneros(id) ON DELETE SET NULL,
    mesa TEXT,
    metodo TEXT,
    monto_original NUMERIC(10,2) DEFAULT 0,
    moneda_original TEXT DEFAULT 'Bs',
    tasa_aplicada NUMERIC(10,2),
    monto_bs NUMERIC(10,2) DEFAULT 0,
    referencia TEXT,
    cajero TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    entregado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE propinas DISABLE ROW LEVEL SECURITY;
GRANT ALL ON propinas TO PUBLIC;
GRANT ALL ON propinas TO anon;
GRANT ALL ON propinas TO authenticated;

CREATE INDEX IF NOT EXISTS idx_propinas_fecha ON propinas(fecha);
CREATE INDEX IF NOT EXISTS idx_propinas_mesonero ON propinas(mesonero_id);

-- ============================================
-- TABLA: notificaciones (CONFIGURADA PARA REALTIME)
-- ============================================
CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    pedido_id TEXT REFERENCES pedidos(id) ON DELETE CASCADE,
    tipo TEXT,
    titulo TEXT,
    mensaje TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id TEXT,
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notificaciones DISABLE ROW LEVEL SECURITY;
GRANT ALL ON notificaciones TO PUBLIC;
GRANT ALL ON notificaciones TO anon;
GRANT ALL ON notificaciones TO authenticated;

CREATE INDEX IF NOT EXISTS idx_notificaciones_session ON notificaciones(session_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_timestamp ON notificaciones(timestamp);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);

-- HABILITAR REPLICACIÓN PARA REALTIME (CRÍTICO PARA NOTIFICACIONES)
ALTER TABLE notificaciones REPLICA IDENTITY FULL;

-- Tabla: codigos_qr
CREATE TABLE codigos_qr (
    id TEXT PRIMARY KEY,
    nombre TEXT,
    tipo TEXT DEFAULT 'mesa',
    ssid TEXT,
    password TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE codigos_qr DISABLE ROW LEVEL SECURITY;
GRANT ALL ON codigos_qr TO PUBLIC;
GRANT ALL ON codigos_qr TO anon;
GRANT ALL ON codigos_qr TO authenticated;

-- Insertar QR de ejemplo
INSERT INTO codigos_qr (id, nombre, tipo) VALUES
    ('QR_' || gen_random_uuid() || '_1', 'Mesa 1', 'mesa'),
    ('QR_' || gen_random_uuid() || '_2', 'Mesa 2', 'mesa'),
    ('QR_' || gen_random_uuid() || '_3', 'Mesa 3', 'mesa'),
    ('QR_' || gen_random_uuid() || '_4', 'Mesa 4', 'mesa'),
    ('QR_' || gen_random_uuid() || '_5', 'Mesa 5', 'mesa'),
    ('QR_' || gen_random_uuid() || '_6', 'WiFi Clientes', 'wifi')
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCIONES
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_config_updated_at ON config;
CREATE TRIGGER update_config_updated_at
    BEFORE UPDATE ON config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mesoneros_updated_at ON mesoneros;
CREATE TRIGGER update_mesoneros_updated_at
    BEFORE UPDATE ON mesoneros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliverys_updated_at ON deliverys;
CREATE TRIGGER update_deliverys_updated_at
    BEFORE UPDATE ON deliverys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventario_updated_at ON inventario;
CREATE TRIGGER update_inventario_updated_at
    BEFORE UPDATE ON inventario
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_updated_at ON menu;
CREATE TRIGGER update_menu_updated_at
    BEFORE UPDATE ON menu
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pedidos_updated_at ON pedidos;
CREATE TRIGGER update_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIÓN: crear_pedido_con_reserva (MEJORADA)
-- ============================================
CREATE OR REPLACE FUNCTION crear_pedido_con_reserva(
    p_pedido JSONB,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_pedido_id TEXT;
    v_item JSONB;
    v_ingrediente_id TEXT;
    v_cantidad NUMERIC;
    v_ingrediente_info JSONB;
    v_result JSONB;
BEGIN
    -- Insertar el pedido
    INSERT INTO pedidos (
        id, timestamp, estado, tipo, total, session_id, mesa, cliente_nombre,
        parroquia, direccion, telefono, referencia, fecha_reserva, comprobante_url,
        costo_delivery, costo_delivery_usd, costo_delivery_bs, tasa_aplicada, items
    ) VALUES (
        p_pedido->>'id',
        (p_pedido->>'timestamp')::TIMESTAMP WITH TIME ZONE,
        p_pedido->>'estado',
        p_pedido->>'tipo',
        (p_pedido->>'total')::NUMERIC,
        p_pedido->>'session_id',
        p_pedido->>'mesa',
        p_pedido->>'cliente_nombre',
        p_pedido->>'parroquia',
        p_pedido->>'direccion',
        p_pedido->>'telefono',
        p_pedido->>'referencia',
        (p_pedido->>'fecha_reserva')::TIMESTAMP WITH TIME ZONE,
        p_pedido->>'comprobante_url',
        (p_pedido->>'costo_delivery')::NUMERIC,
        (p_pedido->>'costo_delivery_usd')::NUMERIC,
        (p_pedido->>'costo_delivery_bs')::NUMERIC,
        (p_pedido->>'tasa_aplicada')::NUMERIC,
        p_items
    ) RETURNING id INTO v_pedido_id;

    -- Actualizar reserva de ingredientes si el pedido es pendiente
    IF p_pedido->>'estado' = 'pendiente' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            -- Obtener ingredientes del platillo
            SELECT ingredientes INTO v_ingrediente_info
            FROM menu
            WHERE id = v_item->>'platilloId';

            IF v_ingrediente_info IS NOT NULL THEN
                FOR v_ingrediente_id, v_cantidad IN
                    SELECT key, (value->>'cantidad')::NUMERIC
                    FROM jsonb_each(v_ingrediente_info)
                LOOP
                    -- Actualizar reservado en inventario
                    UPDATE inventario
                    SET reservado = reservado + (v_cantidad * (v_item->>'cantidad')::NUMERIC)
                    WHERE id = v_ingrediente_id;
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'pedido_id', v_pedido_id
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para liberar ingredientes
CREATE OR REPLACE FUNCTION liberar_ingredientes(
    p_pedido_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_pedido RECORD;
    v_item JSONB;
    v_ingrediente_id TEXT;
    v_cantidad NUMERIC;
    v_ingrediente_info JSONB;
    v_result JSONB;
BEGIN
    SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido_id;

    IF v_pedido.estado = 'pendiente' AND v_pedido.items IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_pedido.items)
        LOOP
            SELECT ingredientes INTO v_ingrediente_info
            FROM menu
            WHERE id = v_item->>'platilloId';

            IF v_ingrediente_info IS NOT NULL THEN
                FOR v_ingrediente_id, v_cantidad IN
                    SELECT key, (value->>'cantidad')::NUMERIC
                    FROM jsonb_each(v_ingrediente_info)
                LOOP
                    UPDATE inventario
                    SET reservado = GREATEST(0, reservado - (v_cantidad * (v_item->>'cantidad')::NUMERIC))
                    WHERE id = v_ingrediente_id;
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    v_result := jsonb_build_object('success', true);
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar stock crítico
CREATE OR REPLACE FUNCTION verificar_stock_critico()
RETURNS TABLE (
    ingrediente_id TEXT,
    nombre TEXT,
    stock_actual NUMERIC,
    stock_minimo NUMERIC,
    unidades_faltantes NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.nombre,
        i.stock - i.reservado AS stock_actual,
        i.minimo,
        GREATEST(0, i.minimo - (i.stock - i.reservado)) AS unidades_faltantes
    FROM inventario i
    WHERE (i.stock - i.reservado) <= i.minimo
    ORDER BY (i.stock - i.reservado) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CONFIGURACIÓN DE ALMACENAMIENTO (Storage)
-- ============================================

-- Crear buckets
INSERT INTO storage.buckets (id, name, public) VALUES
    ('imagenes-platillos', 'imagenes-platillos', true),
    ('comprobantes', 'comprobantes', true),
    ('alarma', 'alarma', true)
ON CONFLICT (id) DO NOTHING;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Permitir todo en imagenes-platillos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir todo en comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir todo en alarma" ON storage.objects;

-- Crear políticas de acceso total
CREATE POLICY "Permitir todo en imagenes-platillos"
    ON storage.objects FOR ALL
    USING (bucket_id = 'imagenes-platillos')
    WITH CHECK (bucket_id = 'imagenes-platillos');

CREATE POLICY "Permitir todo en comprobantes"
    ON storage.objects FOR ALL
    USING (bucket_id = 'comprobantes')
    WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Permitir todo en alarma"
    ON storage.objects FOR ALL
    USING (bucket_id = 'alarma')
    WITH CHECK (bucket_id = 'alarma');

-- ============================================
-- DATOS DE EJEMPLO
-- ============================================

-- Insertar pedido de ejemplo
DO $$
DECLARE
    v_pedido_id TEXT;
    v_session_id TEXT;
BEGIN
    v_session_id := 'session_' || gen_random_uuid() || '_1';
    v_pedido_id := 'PED-' || gen_random_uuid();

    INSERT INTO pedidos (
        id, timestamp, estado, tipo, total, session_id, mesa, cliente_nombre,
        items, tasa_aplicada
    ) VALUES (
        v_pedido_id,
        NOW(),
        'pendiente',
        'mesa',
        25.97,
        v_session_id,
        'Mesa 1',
        'Cliente Ejemplo',
        '[{"platilloId": "plat_1", "nombre": "California Roll", "cantidad": 2, "personalizacion": [], "precioUnitarioUSD": 8.99, "subtotal": 17.98}, {"platilloId": "plat_5", "nombre": "Sashimi de Salmón", "cantidad": 1, "personalizacion": [], "precioUnitarioUSD": 8.50, "subtotal": 8.50}]'::JSONB,
        400
    );

    -- Insertar notificación de ejemplo
    INSERT INTO notificaciones (pedido_id, tipo, titulo, mensaje, session_id)
    VALUES (v_pedido_id, 'pending', '⏳ Pedido pendiente', 'Tu pedido está pendiente de confirmación', v_session_id);
END $$;

-- Insertar algunas propinas de ejemplo
DO $$
DECLARE
    v_mesonero_id TEXT;
BEGIN
    SELECT id INTO v_mesonero_id FROM mesoneros WHERE nombre = 'Carlos Méndez' LIMIT 1;

    INSERT INTO propinas (mesonero_id, mesa, metodo, monto_bs, cajero, fecha)
    VALUES
        (v_mesonero_id, 'Mesa 1', 'efectivo_bs', 5.00, 'Cajero Principal', NOW() - INTERVAL '1 hour'),
        (v_mesonero_id, 'Mesa 3', 'pago_movil', 8.50, 'Cajero Principal', NOW() - INTERVAL '2 hours'),
        (v_mesonero_id, 'Mesa 2', 'efectivo_usd', 10.00, 'Cajero Secundario', NOW() - INTERVAL '3 hours')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- *** HABILITAR REALTIME PARA NOTIFICACIONES ***
-- ============================================

-- IMPORTANTE: Estas líneas habilitan Realtime para la tabla notificaciones
-- Esto permite que los clientes reciban notificaciones en tiempo real

-- 1. Publicar la tabla en el esquema realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 2. Agregar la tabla notificaciones a la publicación
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;

-- 3. Asegurar que la replicación esté habilitada
ALTER TABLE notificaciones REPLICA IDENTITY FULL;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Verificar que las tablas existen
SELECT 
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;

-- Verificar que Realtime está configurado
SELECT 
    tablename,
    identity
FROM pg_replication_identity 
WHERE relid IN (SELECT oid FROM pg_class WHERE relname = 'notificaciones');

-- Mensajes de éxito
SELECT '✅ SCRIPT COMPLETADO EXITOSAMENTE' as mensaje;
SELECT '✅ RLS DESHABILITADO PARA TODAS LAS TABLAS' as resultado;
SELECT '✅ REALTIME HABILITADO PARA NOTIFICACIONES' as realtime_info;
SELECT '✅ Usuario admin: contraseña 654321' as admin_info;
SELECT '✅ Usuarios cajero: cajero1/123456, cajero2/123456' as cajero_info;
