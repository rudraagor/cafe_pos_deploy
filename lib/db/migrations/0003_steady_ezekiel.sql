ALTER TABLE "order_items" ADD COLUMN "modifiers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "supported_modifiers" jsonb DEFAULT '[]'::jsonb NOT NULL;