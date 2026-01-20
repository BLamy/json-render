import { z } from "zod";

/**
 * Product entity for dashboard example
 */
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().min(0),
  category: z.string(),
  stock: z.number().min(0),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Product = z.infer<typeof ProductSchema>;

/**
 * Schema for creating a new Product
 */
export const CreateProductSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProduct = z.infer<typeof CreateProductSchema>;

/**
 * Schema for updating a Product
 */
export const UpdateProductSchema = ProductSchema.partial().required({
  id: true,
});

export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
