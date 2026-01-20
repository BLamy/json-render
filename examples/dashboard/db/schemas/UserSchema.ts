import { z } from "zod";

/**
 * User entity for dashboard example
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]),
  department: z.string(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Schema for creating a new User
 */
export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

/**
 * Schema for updating a User
 */
export const UpdateUserSchema = UserSchema.partial().required({
  id: true,
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
