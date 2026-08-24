-- =============================================================================
-- 02-addForeignKeys.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- Agrega todas las FOREIGN KEY documentadas en database/docs/DER.md, después
-- de que 01-createSchema.sql ya creó las 26 tablas. Separar en dos scripts
-- evita depender del orden de creación (no hay que ordenar 26 tablas por
-- dependencia); InnoDB crea el índice de cada FK automáticamente si no existe.
--
-- Convención de ON DELETE aplicada:
--   - FK hacia una tabla MA_ (maestro)                    -> RESTRICT
--     No se puede borrar un dato maestro (sucursal, producto, usuario...)
--     mientras algo lo esté referenciando.
--   - FK de una tabla *_ITEMS / *_EVENTS hacia su padre    -> CASCADE
--     El detalle no tiene sentido sin su transacción padre.
--   - Excepción: tr_purchase_receipt_items.purchase_order_item_id -> RESTRICT
--     (protege la trazabilidad de recepciones, es dato de auditoría).
-- ON UPDATE CASCADE en todas (las PK son auto_increment y no cambian en la
-- práctica, pero es la convención correcta si alguna vez cambiaran).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Identidad y acceso
-- -----------------------------------------------------------------------------

ALTER TABLE ma_users
    ADD CONSTRAINT fk_ma_users_role
        FOREIGN KEY (role_id) REFERENCES ma_roles (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE ma_user_branch
    ADD CONSTRAINT fk_ma_user_branch_user
        FOREIGN KEY (user_id) REFERENCES ma_users (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_ma_user_branch_branch
        FOREIGN KEY (branch_id) REFERENCES ma_branches (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE sy_refresh_tokens
    ADD CONSTRAINT fk_sy_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES ma_users (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Catálogo de producto
-- -----------------------------------------------------------------------------

ALTER TABLE ma_products
    ADD CONSTRAINT fk_ma_products_category
        FOREIGN KEY (category_id) REFERENCES ma_categories (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_ma_products_base_unit
        FOREIGN KEY (base_unit_id) REFERENCES ma_units (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE ma_product_units
    ADD CONSTRAINT fk_ma_product_units_product
        FOREIGN KEY (product_id) REFERENCES ma_products (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_ma_product_units_unit
        FOREIGN KEY (unit_id) REFERENCES ma_units (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Inventario
-- -----------------------------------------------------------------------------

ALTER TABLE tr_inventory
    ADD CONSTRAINT fk_tr_inventory_branch
        FOREIGN KEY (branch_id) REFERENCES ma_branches (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_inventory_product
        FOREIGN KEY (product_id) REFERENCES ma_products (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tr_inventory_movements
    ADD CONSTRAINT fk_tr_inventory_movements_branch
        FOREIGN KEY (branch_id) REFERENCES ma_branches (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_inventory_movements_product
        FOREIGN KEY (product_id) REFERENCES ma_products (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_inventory_movements_user
        FOREIGN KEY (responsible_user_id) REFERENCES ma_users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Compras
-- -----------------------------------------------------------------------------

ALTER TABLE tr_purchase_orders
    ADD CONSTRAINT fk_tr_purchase_orders_supplier
        FOREIGN KEY (supplier_id) REFERENCES ma_suppliers (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_purchase_orders_branch
        FOREIGN KEY (branch_id) REFERENCES ma_branches (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_purchase_orders_user
        FOREIGN KEY (user_id) REFERENCES ma_users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tr_purchase_order_items
    ADD CONSTRAINT fk_tr_purchase_order_items_order
        FOREIGN KEY (purchase_order_id) REFERENCES tr_purchase_orders (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_purchase_order_items_product
        FOREIGN KEY (product_id) REFERENCES ma_products (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tr_purchase_receipts
    ADD CONSTRAINT fk_tr_purchase_receipts_order
        FOREIGN KEY (purchase_order_id) REFERENCES tr_purchase_orders (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_purchase_receipts_user
        FOREIGN KEY (user_id) REFERENCES ma_users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tr_purchase_receipt_items
    ADD CONSTRAINT fk_tr_purchase_receipt_items_receipt
        FOREIGN KEY (receipt_id) REFERENCES tr_purchase_receipts (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_purchase_receipt_items_order_item
        FOREIGN KEY (purchase_order_item_id) REFERENCES tr_purchase_order_items (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Ventas
-- -----------------------------------------------------------------------------

ALTER TABLE ma_price_list_items
    ADD CONSTRAINT fk_ma_price_list_items_list
        FOREIGN KEY (price_list_id) REFERENCES ma_price_lists (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_ma_price_list_items_product
        FOREIGN KEY (product_id) REFERENCES ma_products (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tr_sales
    ADD CONSTRAINT fk_tr_sales_branch
        FOREIGN KEY (branch_id) REFERENCES ma_branches (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_sales_price_list
        FOREIGN KEY (price_list_id) REFERENCES ma_price_lists (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_sales_seller
        FOREIGN KEY (seller_id) REFERENCES ma_users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_sales_customer
        FOREIGN KEY (customer_id) REFERENCES ma_customers (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tr_sale_items
    ADD CONSTRAINT fk_tr_sale_items_sale
        FOREIGN KEY (sale_id) REFERENCES tr_sales (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_sale_items_product
        FOREIGN KEY (product_id) REFERENCES ma_products (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Transferencias
-- -----------------------------------------------------------------------------

ALTER TABLE tr_transfers
    ADD CONSTRAINT fk_tr_transfers_origin_branch
        FOREIGN KEY (origin_branch_id) REFERENCES ma_branches (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_transfers_destination_branch
        FOREIGN KEY (destination_branch_id) REFERENCES ma_branches (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_transfers_requested_by
        FOREIGN KEY (requested_by) REFERENCES ma_users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tr_transfer_items
    ADD CONSTRAINT fk_tr_transfer_items_transfer
        FOREIGN KEY (transfer_id) REFERENCES tr_transfers (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_transfer_items_product
        FOREIGN KEY (product_id) REFERENCES ma_products (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tr_transfer_events
    ADD CONSTRAINT fk_tr_transfer_events_transfer
        FOREIGN KEY (transfer_id) REFERENCES tr_transfers (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_transfer_events_user
        FOREIGN KEY (recorded_by) REFERENCES ma_users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Sistema — alertas y auditoría
-- -----------------------------------------------------------------------------

ALTER TABLE sy_notifications
    ADD CONSTRAINT fk_sy_notifications_branch
        FOREIGN KEY (branch_id) REFERENCES ma_branches (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_sy_notifications_product
        FOREIGN KEY (product_id) REFERENCES ma_products (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_sy_notifications_recipient
        FOREIGN KEY (recipient_user_id) REFERENCES ma_users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE sy_audit_log
    ADD CONSTRAINT fk_sy_audit_log_user
        FOREIGN KEY (user_id) REFERENCES ma_users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;
