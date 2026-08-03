-- Migration script to rename existing Supabase tables to add the lowercase 'sd_' prefix
-- Run this in your Supabase SQL Editor to preserve all existing data

ALTER TABLE IF EXISTS employees RENAME TO sd_employees;
ALTER TABLE IF EXISTS SD_employees RENAME TO sd_employees;

ALTER TABLE IF EXISTS menu_items RENAME TO sd_menu_items;
ALTER TABLE IF EXISTS SD_menu_items RENAME TO sd_menu_items;

ALTER TABLE IF EXISTS notifications RENAME TO sd_notifications;
ALTER TABLE IF EXISTS SD_notifications RENAME TO sd_notifications;

ALTER TABLE IF EXISTS orders RENAME TO sd_orders;
ALTER TABLE IF EXISTS SD_orders RENAME TO sd_orders;

ALTER TABLE IF EXISTS purchase_orders RENAME TO sd_purchase_orders;
ALTER TABLE IF EXISTS SD_purchase_orders RENAME TO sd_purchase_orders;

-- Update Realtime publication tables for the 5 project tables
ALTER PUBLICATION supabase_realtime ADD TABLE sd_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE sd_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE sd_purchase_orders;
