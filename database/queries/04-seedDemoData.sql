-- =============================================================================
-- 04-seedDemoData.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- Datos mínimos de demostración: se aplican siempre al levantar el proyecto
-- (docker compose up), para poder probar los 6 módulos sin cargar nada a
-- mano. Password de demo documentado en README.md, nunca en código fuente.
--
-- Contraseña compartida por todos los usuarios de demo: OpcDemo#2026
-- (hash BCrypt real, $2a$ / costo 10 — formato por defecto de
-- BCryptPasswordEncoder de Spring Security).
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- El seed real de la aplicación lo maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V4__seed_demo_data.sql.
-- Si estos datos cambian, el cambio va PRIMERO como una migración Flyway
-- nueva (V5__..., nunca editando V1/V2/V3/V4 ya aplicadas) — y opcionalmente
-- se refleja aquí después, a mano, solo como documentación de consulta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Roles (ma_roles estaba vacía hasta ahora — sin esto no se puede crear
-- ningún usuario, ya que ma_users.role_id es NOT NULL)
-- -----------------------------------------------------------------------------

INSERT INTO ma_roles (code, name, description) VALUES
    ('GENERAL_ADMIN', 'Administrador general', 'Gestiona configuración, usuarios y sucursales; visibilidad total del sistema'),
    ('BRANCH_MANAGER', 'Gerente de sucursal', 'Supervisa su(s) sucursal(es), aprueba transferencias y consulta reportes'),
    ('INVENTORY_OPERATOR', 'Operador de inventario', 'Realiza ingresos/retiros, solicita transferencias y registra ventas/compras');

-- -----------------------------------------------------------------------------
-- Sucursales
-- -----------------------------------------------------------------------------

INSERT INTO ma_branches (code, name, address, city, phone, active) VALUES
    ('BOG-01', 'Sucursal Bogotá Centro', 'Cra 7 # 32-16', 'Bogotá', '6013456789', TRUE),
    ('MED-01', 'Sucursal Medellín Poblado', 'Cl 10 # 43-50', 'Medellín', '6044567890', TRUE),
    ('CAL-01', 'Sucursal Cali Norte', 'Av 6N # 28-10', 'Cali', '6025678901', TRUE);

-- -----------------------------------------------------------------------------
-- Usuarios (todos con la misma contraseña de demo, ver cabecera del archivo)
-- -----------------------------------------------------------------------------

INSERT INTO ma_users (role_id, name, email, password_hash, active) VALUES
    ((SELECT id FROM ma_roles WHERE code = 'GENERAL_ADMIN'), 'Admin General', 'admin@opc.com', '$2a$10$G9/zvCXFeu98N2mU2AIwduCzpu9g2KhCPtFP1APB1kWinjMBO4Ap6', TRUE),
    ((SELECT id FROM ma_roles WHERE code = 'BRANCH_MANAGER'), 'Gerente Bogotá', 'gerente.bogota@opc.com', '$2a$10$G9/zvCXFeu98N2mU2AIwduCzpu9g2KhCPtFP1APB1kWinjMBO4Ap6', TRUE),
    ((SELECT id FROM ma_roles WHERE code = 'BRANCH_MANAGER'), 'Gerente Medellín', 'gerente.medellin@opc.com', '$2a$10$G9/zvCXFeu98N2mU2AIwduCzpu9g2KhCPtFP1APB1kWinjMBO4Ap6', TRUE),
    ((SELECT id FROM ma_roles WHERE code = 'INVENTORY_OPERATOR'), 'Operador Bogotá', 'operador.bogota@opc.com', '$2a$10$G9/zvCXFeu98N2mU2AIwduCzpu9g2KhCPtFP1APB1kWinjMBO4Ap6', TRUE),
    ((SELECT id FROM ma_roles WHERE code = 'INVENTORY_OPERATOR'), 'Operador Medellín', 'operador.medellin@opc.com', '$2a$10$G9/zvCXFeu98N2mU2AIwduCzpu9g2KhCPtFP1APB1kWinjMBO4Ap6', TRUE),
    ((SELECT id FROM ma_roles WHERE code = 'INVENTORY_OPERATOR'), 'Operador Cali', 'operador.cali@opc.com', '$2a$10$G9/zvCXFeu98N2mU2AIwduCzpu9g2KhCPtFP1APB1kWinjMBO4Ap6', TRUE);

-- Accesos por sucursal (GENERAL_ADMIN no necesita fila aquí, ve todas por rol)
INSERT INTO ma_user_branch (user_id, branch_id) VALUES
    ((SELECT id FROM ma_users WHERE email = 'gerente.bogota@opc.com'), (SELECT id FROM ma_branches WHERE code = 'BOG-01')),
    ((SELECT id FROM ma_users WHERE email = 'gerente.medellin@opc.com'), (SELECT id FROM ma_branches WHERE code = 'MED-01')),
    ((SELECT id FROM ma_users WHERE email = 'operador.bogota@opc.com'), (SELECT id FROM ma_branches WHERE code = 'BOG-01')),
    ((SELECT id FROM ma_users WHERE email = 'operador.medellin@opc.com'), (SELECT id FROM ma_branches WHERE code = 'MED-01')),
    ((SELECT id FROM ma_users WHERE email = 'operador.cali@opc.com'), (SELECT id FROM ma_branches WHERE code = 'CAL-01'));

-- -----------------------------------------------------------------------------
-- Catálogo: categorías, unidades, productos
-- -----------------------------------------------------------------------------

INSERT INTO ma_categories (name, description, active) VALUES
    ('Bebidas', 'Bebidas embotelladas y enlatadas', TRUE),
    ('Abarrotes', 'Productos secos de despensa', TRUE),
    ('Aseo', 'Productos de limpieza e higiene', TRUE),
    ('Papelería', 'Artículos de oficina y papelería', TRUE);

INSERT INTO ma_units (name, abbreviation) VALUES
    ('Unidad', 'UN'),
    ('Caja', 'CJ'),
    ('Kilogramo', 'KG'),
    ('Litro', 'LT');

INSERT INTO ma_products (sku, name, description, category_id, base_unit_id, reference_price, active) VALUES
    ('BEB-001', 'Agua Mineral 600ml', 'Botella de agua mineral', (SELECT id FROM ma_categories WHERE name = 'Bebidas'), (SELECT id FROM ma_units WHERE abbreviation = 'UN'), 2500, TRUE),
    ('BEB-002', 'Gaseosa Cola 1.5L', 'Botella de gaseosa sabor cola', (SELECT id FROM ma_categories WHERE name = 'Bebidas'), (SELECT id FROM ma_units WHERE abbreviation = 'UN'), 6500, TRUE),
    ('BEB-003', 'Jugo de Naranja 1L', 'Jugo de naranja natural', (SELECT id FROM ma_categories WHERE name = 'Bebidas'), (SELECT id FROM ma_units WHERE abbreviation = 'UN'), 7200, TRUE),
    ('ABA-001', 'Arroz Premium 1KG', 'Arroz blanco premium', (SELECT id FROM ma_categories WHERE name = 'Abarrotes'), (SELECT id FROM ma_units WHERE abbreviation = 'KG'), 4800, TRUE),
    ('ABA-002', 'Aceite Vegetal 1L', 'Aceite vegetal para cocina', (SELECT id FROM ma_categories WHERE name = 'Abarrotes'), (SELECT id FROM ma_units WHERE abbreviation = 'LT'), 9800, TRUE),
    ('ABA-003', 'Azúcar Blanca 1KG', 'Azúcar refinada', (SELECT id FROM ma_categories WHERE name = 'Abarrotes'), (SELECT id FROM ma_units WHERE abbreviation = 'KG'), 4200, TRUE),
    ('ASE-001', 'Detergente en Polvo 3KG', 'Detergente para ropa', (SELECT id FROM ma_categories WHERE name = 'Aseo'), (SELECT id FROM ma_units WHERE abbreviation = 'UN'), 18500, TRUE),
    ('ASE-002', 'Jabón Líquido de Manos 500ml', 'Jabón líquido antibacterial', (SELECT id FROM ma_categories WHERE name = 'Aseo'), (SELECT id FROM ma_units WHERE abbreviation = 'UN'), 8900, TRUE),
    ('PAP-001', 'Resma de Papel Carta', 'Resma de 500 hojas tamaño carta', (SELECT id FROM ma_categories WHERE name = 'Papelería'), (SELECT id FROM ma_units WHERE abbreviation = 'UN'), 15900, TRUE),
    ('PAP-002', 'Cuaderno Cuadriculado 100H', 'Cuaderno universitario', (SELECT id FROM ma_categories WHERE name = 'Papelería'), (SELECT id FROM ma_units WHERE abbreviation = 'UN'), 5300, TRUE);

-- Multi-unidad: agua y detergente se compran por caja, se venden por unidad
INSERT INTO ma_product_units (product_id, unit_id, conversion_factor, is_purchase_unit, is_sale_unit) VALUES
    ((SELECT id FROM ma_products WHERE sku = 'BEB-001'), (SELECT id FROM ma_units WHERE abbreviation = 'UN'), 1, FALSE, TRUE),
    ((SELECT id FROM ma_products WHERE sku = 'BEB-001'), (SELECT id FROM ma_units WHERE abbreviation = 'CJ'), 24, TRUE, FALSE),
    ((SELECT id FROM ma_products WHERE sku = 'ASE-001'), (SELECT id FROM ma_units WHERE abbreviation = 'UN'), 1, FALSE, TRUE),
    ((SELECT id FROM ma_products WHERE sku = 'ASE-001'), (SELECT id FROM ma_units WHERE abbreviation = 'CJ'), 12, TRUE, FALSE);

-- -----------------------------------------------------------------------------
-- Proveedores (mínimo indispensable: tr_purchase_orders.supplier_id es NOT NULL)
-- -----------------------------------------------------------------------------

INSERT INTO ma_suppliers (name, tax_id, contact, phone, email, address, active) VALUES
    ('Distribuidora Andina S.A.S.', '900123456-1', 'Laura Gómez', '6017001122', 'ventas@distandina.com', 'Cra 15 # 100-20, Bogotá', TRUE),
    ('Comercializadora del Valle Ltda.', '900654321-2', 'Andrés Ríos', '6023004455', 'contacto@comvalle.com', 'Av 3N # 45-12, Cali', TRUE);

-- -----------------------------------------------------------------------------
-- Lista de precios (mínimo indispensable: tr_sales.price_list_id es NOT NULL)
-- -----------------------------------------------------------------------------

INSERT INTO ma_price_lists (name, description, active, start_date) VALUES
    ('Lista General', 'Lista de precios estándar para todas las sucursales', TRUE, CURRENT_DATE());

INSERT INTO ma_price_list_items (price_list_id, product_id, price)
SELECT (SELECT id FROM ma_price_lists WHERE name = 'Lista General'), id, reference_price
FROM ma_products;

-- -----------------------------------------------------------------------------
-- Inventario inicial (10 productos x 3 sucursales = 30 filas)
-- Algunas cantidades quedan a propósito por debajo de min_stock o por encima
-- de max_stock, para que las Alertas Inteligentes tengan algo que mostrar.
-- -----------------------------------------------------------------------------

INSERT INTO tr_inventory (branch_id, product_id, current_quantity, min_stock, max_stock, weighted_avg_cost)
SELECT b.id, p.id,
    CASE (b.id + p.id) % 5
        WHEN 0 THEN 5    -- por debajo de min_stock (20) a propósito: alerta de stock bajo
        WHEN 1 THEN 450  -- por encima de max_stock (300) a propósito: alerta de sobre-stock
        WHEN 2 THEN 80
        WHEN 3 THEN 150
        ELSE 60
    END,
    20,
    300,
    p.reference_price * 0.7
FROM ma_branches b
CROSS JOIN ma_products p;
