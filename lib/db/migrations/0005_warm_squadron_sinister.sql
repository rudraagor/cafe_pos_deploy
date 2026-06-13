CREATE TYPE "public"."promotion_rule_type" AS ENUM('order_threshold', 'product_quantity', 'combo', 'daily_item');--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "stackable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "stackable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "rule_type" "promotion_rule_type" DEFAULT 'order_threshold' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "rule_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "days_of_week" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "start_time" text;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "end_time" text;
--> statement-breakpoint
UPDATE "promotions"
SET "rule_type" = CASE
  WHEN "scope" = 'product' THEN 'product_quantity'::"promotion_rule_type"
  ELSE 'order_threshold'::"promotion_rule_type"
END;
