ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_out_of_stock" boolean DEFAULT false NOT NULL;
