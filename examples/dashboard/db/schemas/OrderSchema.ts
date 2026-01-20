import { z } from "zod";

/**
 * Order entity for dashboard example
 */
export const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().min(1),
  total: z.number(),
  status: z.enum([
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Order = z.infer<typeof OrderSchema>;

/**
 * Schema for creating a new Order
 */
export const CreateOrderSchema = OrderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateOrder = z.infer<typeof CreateOrderSchema>;

/**
 * Schema for updating an Order
 */
export const UpdateOrderSchema = OrderSchema.partial().required({
  id: true,
});

export type UpdateOrder = z.infer<typeof UpdateOrderSchema>;
