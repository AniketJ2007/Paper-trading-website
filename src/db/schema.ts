import { integer, pgTable, varchar,numeric, timestamp, text } from "drizzle-orm/pg-core";
import {InferSelectModel,InferInsertModel} from "drizzle-orm"

export const Users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({length:255}).notNull(),
  balance: numeric({ precision: 12, scale: 2 }).notNull().default("100000.00"),
});
export const Holdings=pgTable('holdings',{
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().references(()=>Users.id),
  stock_name: varchar().notNull(),
  quantity: integer(),
  buy_price: numeric({ precision: 12, scale: 2 }).notNull()
})

export const Watchlists = pgTable('watchlists', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().references(() => Users.id).notNull(),
  symbol: varchar({ length: 10 }).notNull(), 
  notes: text(), // optional user notes
  added_at: timestamp().notNull().defaultNow(),
});

export const Transactions = pgTable('transactions', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().references(() => Users.id).notNull(),
  symbol: varchar({ length: 10 }).notNull(),
  type: varchar({ length: 10 }).notNull(), 
  quantity: integer().notNull(),
  price: numeric({ precision: 12, scale: 2 }).notNull(), 
  timestamp: timestamp().notNull().defaultNow(),
});
export const Orders = pgTable('orders', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().references(() => Users.id).notNull(),
  symbol: varchar({ length: 10 }).notNull(),
  order_type: varchar({ length: 20 }).notNull(), 
  status: varchar({ length: 20 }).notNull().default("PENDING"), 
  quantity: integer().notNull(),
  price: numeric({ precision: 12, scale: 2 }), 
  created_at: timestamp().notNull().defaultNow(),
  filled_at: timestamp(), 
});
