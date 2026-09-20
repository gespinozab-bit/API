-- Create one category for every distinct, non-empty legacy category name.
INSERT INTO "Category" ("name", "createdAt", "updatedAt")
SELECT DISTINCT
    TRIM("categoryName"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Product"
WHERE TRIM("categoryName") <> ''
ON CONFLICT ("name") DO NOTHING;

-- Link products that have not yet been related, preserving categoryName.
UPDATE "Product" AS product
SET "categoryId" = category."id"
FROM "Category" AS category
WHERE category."name" = TRIM(product."categoryName")
  AND product."categoryId" IS NULL;

-- Abort atomically if any product could not be related.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Product"
        WHERE "categoryId" IS NULL
    ) THEN
        RAISE EXCEPTION
            'Backfill incompleto: existen productos sin categoryId';
    END IF;
END
$$;
