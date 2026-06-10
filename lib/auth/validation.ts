import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Invalid email address."));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.")
  .regex(/[a-z]/i, "Password must include at least one letter.")
  .regex(/[0-9]/, "Password must include at least one number.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const acceptInviteSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from your current password.",
    path: ["newPassword"],
  });

export const resetPasswordWithTokenSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  });
