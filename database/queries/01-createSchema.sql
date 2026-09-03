-- =============================================================================
-- 01-createSchema.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- Crea las 26 tablas del esquema (columnas, tipos, PK, UNIQUE, NOT NULL).
-- Las FOREIGN KEY se agregan aparte en 02-addForeignKeys.sql, para no
-- depender del orden de creación de las tablas.
--
-- Referencia: database/docs/DER.md (fuente de verdad de este script) y
-- requirements/Analisis_Requerimientos.md sección 9.
--
-- Requiere MySQL 8. Se asume que el script corre contra una base de datos
-- ya seleccionada/creada (docker-compose crea "opc_inventario" vía
-- MYSQL_DATABASE) — este script no emite CREATE DATABASE ni USE.
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- El esquema real de la aplicación lo maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V1__create_schema.sql.
-- Si el esquema cambia, el cambio va PRIMERO como una migración Flyway nueva
-- (V4__..., nunca editando V1/V2/V3 ya aplicadas) — y opcionalmente se
-- refleja aquí después, a mano, solo como documentación de consulta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Dominio: Identidad y acceso (MA_, SY_)
-- -----------------------------------------------------------------------------

CREATE TABLE ma_roles (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ma_roles_code UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ma_branches (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code       VARCHAR(30)  NOT NULL,
    name       VARCHAR(150) NOT NULL,
    address    VARCHAR(255) NULL,
    city       VARCHAR(100) NULL,
    phone      VARCHAR(30)  NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_ma_branches_code UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ma_users (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id       BIGINT UNSIGNED NOT NULL,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_ma_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ma_user_branch (
    id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id   BIGINT UNSIGNED NOT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    CONSTRAINT uq_ma_user_branch UNIQUE (user_id, branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sy_refresh_tokens (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME     NOT NULL,
    revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_agent VARCHAR(255) NULL,
    CONSTRAINT uq_sy_refresh_tokens_hash UNIQUE (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Dominio: Catálogo de producto (MA_)
-- -----------------------------------------------------------------------------

CREATE TABLE ma_categories (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ma_units (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    active       BOOLEAN     NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ma_products (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku             VARCHAR(50)  NOT NULL,
    name            VARCHAR(150) NOT NULL,
    description     TEXT         NULL,
    category_id     BIGINT UNSIGNED NOT NULL,
    base_unit_id    BIGINT UNSIGNED NOT NULL,
    reference_price DECIMAL(15,4) NOT NULL DEFAULT 0,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_ma_products_sku UNIQUE (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ma_product_units (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id         BIGINT UNSIGNED NOT NULL,
    unit_id            BIGINT UNSIGNED NOT NULL,
    conversion_factor  DECIMAL(15,4) NOT NULL,
    is_purchase_unit   BOOLEAN NOT NULL DEFAULT FALSE,
    is_sale_unit       BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Dominio: Inventario (TR_)
-- -----------------------------------------------------------------------------

CREATE TABLE tr_inventory (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    branch_id          BIGINT UNSIGNED NOT NULL,
    product_id         BIGINT UNSIGNED NOT NULL,
    current_quantity   DECIMAL(15,4) NOT NULL DEFAULT 0,
    min_stock          DECIMAL(15,4) NOT NULL DEFAULT 0,
    max_stock          DECIMAL(15,4) NOT NULL DEFAULT 0,
    weighted_avg_cost  DECIMAL(15,4) NOT NULL DEFAULT 0,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_tr_inventory_branch_product UNIQUE (branch_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tr_inventory_movements (
    id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    branch_id            BIGINT UNSIGNED NOT NULL,
    product_id           BIGINT UNSIGNED NOT NULL,
    movement_type        ENUM('PURCHASE','SALE','RETURN','POSITIVE_ADJUSTMENT','NEGATIVE_ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT') NOT NULL,
    quantity             DECIMAL(15,4) NOT NULL,
    unit_cost            DECIMAL(15,4) NOT NULL DEFAULT 0,
    reason               VARCHAR(100) NOT NULL,
    responsible_user_id  BIGINT UNSIGNED NOT NULL,
    reference_type       VARCHAR(40) NOT NULL,
    reference_id         BIGINT UNSIGNED NOT NULL,
    movement_date        DATETIME NOT NULL,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Dominio: Compras (MA_, TR_)
-- -----------------------------------------------------------------------------

CREATE TABLE ma_suppliers (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    tax_id     VARCHAR(50)  NULL,
    contact    VARCHAR(150) NULL,
    phone      VARCHAR(30)  NULL,
    email      VARCHAR(150) NULL,
    address    VARCHAR(255) NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tr_purchase_orders (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id    BIGINT UNSIGNED NOT NULL,
    branch_id      BIGINT UNSIGNED NOT NULL,
    user_id        BIGINT UNSIGNED NOT NULL,
    order_number   VARCHAR(50) NOT NULL,
    order_date     DATETIME NOT NULL,
    payment_terms  VARCHAR(100) NULL,
    status         ENUM('DRAFT','SENT','PARTIALLY_RECEIVED','FULLY_RECEIVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
    subtotal       DECIMAL(15,4) NOT NULL DEFAULT 0,
    total_discount DECIMAL(15,4) NOT NULL DEFAULT 0,
    total          DECIMAL(15,4) NOT NULL DEFAULT 0,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tr_purchase_orders_number UNIQUE (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tr_purchase_order_items (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id  BIGINT UNSIGNED NOT NULL,
    product_id         BIGINT UNSIGNED NOT NULL,
    quantity           DECIMAL(15,4) NOT NULL,
    unit_price         DECIMAL(15,4) NOT NULL,
    discount           DECIMAL(15,4) NOT NULL DEFAULT 0,
    subtotal           DECIMAL(15,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tr_purchase_receipts (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id  BIGINT UNSIGNED NOT NULL,
    user_id            BIGINT UNSIGNED NOT NULL,
    receipt_date       DATETIME NOT NULL,
    receipt_type       ENUM('FULL','PARTIAL') NOT NULL,
    notes              VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tr_purchase_receipt_items (
    id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receipt_id               BIGINT UNSIGNED NOT NULL,
    purchase_order_item_id   BIGINT UNSIGNED NOT NULL,
    received_quantity        DECIMAL(15,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Dominio: Ventas (MA_, TR_)
-- -----------------------------------------------------------------------------

CREATE TABLE ma_customers (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    document_type    VARCHAR(20)  NULL,
    document_number  VARCHAR(50)  NULL,
    phone            VARCHAR(30)  NULL,
    email            VARCHAR(150) NULL,
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ma_price_lists (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    start_date  DATE NULL,
    end_date    DATE NULL,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ma_price_list_items (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    price_list_id  BIGINT UNSIGNED NOT NULL,
    product_id     BIGINT UNSIGNED NOT NULL,
    price          DECIMAL(15,4) NOT NULL,
    CONSTRAINT uq_ma_price_list_items UNIQUE (price_list_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tr_sales (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    branch_id      BIGINT UNSIGNED NOT NULL,
    price_list_id  BIGINT UNSIGNED NOT NULL,
    seller_id      BIGINT UNSIGNED NOT NULL,
    customer_id    BIGINT UNSIGNED NULL,
    sale_number    VARCHAR(50) NOT NULL,
    sale_date      DATETIME NOT NULL,
    subtotal       DECIMAL(15,4) NOT NULL DEFAULT 0,
    total_discount DECIMAL(15,4) NOT NULL DEFAULT 0,
    total          DECIMAL(15,4) NOT NULL DEFAULT 0,
    status         ENUM('CONFIRMED','VOIDED') NOT NULL DEFAULT 'CONFIRMED',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tr_sales_number UNIQUE (sale_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tr_sale_items (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id       BIGINT UNSIGNED NOT NULL,
    product_id    BIGINT UNSIGNED NOT NULL,
    quantity      DECIMAL(15,4) NOT NULL,
    unit_price    DECIMAL(15,4) NOT NULL,
    discount_pct  DECIMAL(7,4) NOT NULL DEFAULT 0,
    subtotal      DECIMAL(15,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Dominio: Transferencias (TR_)
-- -----------------------------------------------------------------------------

CREATE TABLE tr_transfers (
    id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transfer_number           VARCHAR(50) NOT NULL,
    origin_branch_id          BIGINT UNSIGNED NOT NULL,
    destination_branch_id     BIGINT UNSIGNED NOT NULL,
    requested_by              BIGINT UNSIGNED NOT NULL,
    status                    ENUM('REQUESTED','IN_PREPARATION','IN_TRANSIT','FULLY_RECEIVED','PARTIALLY_RECEIVED','CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    urgency                   ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    route_priority            ENUM('HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'MEDIUM',
    carrier                   VARCHAR(150) NULL,
    shipping_cost             DECIMAL(15,4) NULL,
    request_date              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estimated_dispatch_date   DATETIME NULL,
    actual_dispatch_date      DATETIME NULL,
    estimated_arrival_date    DATETIME NULL,
    actual_arrival_date       DATETIME NULL,
    created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tr_transfers_number UNIQUE (transfer_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tr_transfer_items (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transfer_id         BIGINT UNSIGNED NOT NULL,
    product_id          BIGINT UNSIGNED NOT NULL,
    requested_quantity  DECIMAL(15,4) NOT NULL,
    shipped_quantity    DECIMAL(15,4) NULL,
    received_quantity   DECIMAL(15,4) NULL,
    difference          DECIMAL(15,4) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tr_transfer_events (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transfer_id  BIGINT UNSIGNED NOT NULL,
    status       ENUM('REQUESTED','IN_PREPARATION','IN_TRANSIT','FULLY_RECEIVED','PARTIALLY_RECEIVED','CANCELLED') NOT NULL,
    event_date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes        VARCHAR(500) NULL,
    recorded_by  BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Dominio: Sistema — alertas y auditoría (SY_)
-- -----------------------------------------------------------------------------

CREATE TABLE sy_notifications (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type                ENUM('LOW_STOCK','HIGH_STOCK','TRANSFER_SHORTAGE','OUT_OF_STOCK') NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    product_id          BIGINT UNSIGNED NULL,
    message             VARCHAR(255) NOT NULL,
    channel             ENUM('IN_APP','EMAIL') NOT NULL DEFAULT 'IN_APP',
    status               ENUM('PENDING','SENT','READ') NOT NULL DEFAULT 'PENDING',
    recipient_user_id   BIGINT UNSIGNED NULL,
    generated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at             DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sy_audit_log (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity      VARCHAR(60) NOT NULL,
    entity_id   BIGINT UNSIGNED NOT NULL,
    action      ENUM('CREATE','UPDATE','DELETE','LOGIN') NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    old_values  JSON NULL,
    new_values  JSON NULL,
    event_date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
