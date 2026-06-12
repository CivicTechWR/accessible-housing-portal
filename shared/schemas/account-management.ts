import { z } from "zod";
import { positiveIntegerQueryParamSchema, positiveIntegerQueryParamWithMaxSchema } from "./common";

const nonEmptyString = z.string().trim().min(1);
const accountIdSchema = z.uuid("Invalid account id.");
const paginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const accountRoleSchema = z.enum(["admin", "partner", "user"]);
export const accountStatusSchema = z.enum(["invited", "active", "suspended", "deactivated"]);
const updateAccountFieldsSchema = z.object({
  name: nonEmptyString.optional(),
  role: accountRoleSchema.optional(),
  status: accountStatusSchema.optional(),
  organization: z.string().trim().nullable().optional(),
});

export const accountParamsSchema = z.object({
  id: accountIdSchema,
});

export const accountQuerySchema = z.object({
  page: positiveIntegerQueryParamSchema.optional(),
  limit: positiveIntegerQueryParamWithMaxSchema(100).optional(),
  role: accountRoleSchema.optional(),
  status: accountStatusSchema.optional(),
  search: nonEmptyString.optional(),
});

export const createAccountInviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email address.")),
  name: nonEmptyString,
  role: accountRoleSchema,
  organization: z.string().trim().nullable().optional(),
  sendInviteEmail: z.boolean().optional(),
});

export const updateAccountSchema = z
  .object(updateAccountFieldsSchema.shape)
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

const accountResponseDataSchema = z.object({
  id: accountIdSchema,
  email: z.email().nullable(),
  name: z.string().nullable(),
  role: accountRoleSchema.nullable(),
  organization: z.string().nullable(),
  status: accountStatusSchema.nullable(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const accountListResponseSchema = z.object({
  data: z.array(accountResponseDataSchema),
  pagination: paginationSchema,
});

export const accountByIdResponseSchema = z.object({
  data: accountResponseDataSchema,
});

export const createAccountResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    id: accountIdSchema,
    email: z.email(),
    name: nonEmptyString,
    role: accountRoleSchema,
    organization: z.string().nullable().optional(),
    inviteUrl: z.url(),
  }),
});

export const accountInviteQuerySchema = z.object({
  limit: positiveIntegerQueryParamWithMaxSchema(50).optional(),
});

export const accountInviteSchema = z.object({
  id: accountIdSchema,
  email: z.email(),
  name: nonEmptyString,
  role: accountRoleSchema,
  organization: z.string().nullable(),
  invitedAt: z.string(),
  /** "queued" until the email worker delivers the invite email. */
  status: z.enum(["queued", "sent"]),
});

export const accountInviteListResponseSchema = z.object({
  data: z.array(accountInviteSchema),
});

export const updateAccountResponseSchema = z.object({
  message: z.string(),
  data: z.object({ id: accountIdSchema }).and(updateAccountFieldsSchema),
});

export const deactivateAccountResponseSchema = z.object({
  message: z.string(),
  data: z.object({ id: accountIdSchema }),
});

export type AccountParams = z.infer<typeof accountParamsSchema>;
export type AccountQuery = z.infer<typeof accountQuerySchema>;
export type CreateAccountInviteInput = z.infer<typeof createAccountInviteSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountInviteQuery = z.infer<typeof accountInviteQuerySchema>;
export type AccountInvite = z.infer<typeof accountInviteSchema>;
export type AccountInviteListResponse = z.infer<typeof accountInviteListResponseSchema>;
export type AccountListResponse = z.infer<typeof accountListResponseSchema>;
export type AccountByIdResponse = z.infer<typeof accountByIdResponseSchema>;
export type CreateAccountResponse = z.infer<typeof createAccountResponseSchema>;
export type UpdateAccountResponse = z.infer<typeof updateAccountResponseSchema>;
export type DeactivateAccountResponse = z.infer<typeof deactivateAccountResponseSchema>;
