BEGIN;

-- Abort before contracting if any product lacks a valid category relation.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Product"
        WHERE "categoryId" IS NULL
    ) THEN
        RAISE EXCEPTION
            'No se puede contraer: existen productos sin categoryId';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "Product" AS product
        LEFT JOIN "Category" AS category
            ON category."id" = product."categoryId"
        WHERE category."id" IS NULL
    ) THEN
        RAISE EXCEPTION
            'No se puede contraer: existen relaciones de categoría inválidas';
    END IF;
END
$$;

-- Remove the legacy index before dropping its column.
DROP INDEX "Product_categoryName_idx";

-- categoryName is intentionally removed because Category.name now owns the value.
ALTER TABLE "Product"
DROP COLUMN "categoryName",
ALTER COLUMN "categoryId" SET NOT NULL;

COMMIT;
