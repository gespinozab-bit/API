BEGIN;

-- Keep Product_stock_nonnegative from the initial migration.
-- Together, both checks enforce the inclusive range 0..1000.
-- PostgreSQL validates existing rows; incompatible data aborts the transaction
-- without changing or deleting products.
ALTER TABLE "Product"
ADD CONSTRAINT "Product_stock_maximum" CHECK ("stock" <= 1000);

COMMIT;
