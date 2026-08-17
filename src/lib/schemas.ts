import { isCountryCode } from '@/lib/countries'
import { z } from 'zod'

// Password rules — must stay aligned with the Go backend's
// validatePassword(): ≥ 8 chars, at least one digit, at least one special.
const PW_SPECIALS = '!@#$%^&*()-_=+[]{};:\'",.<>/?\\|`~'

export function pwChecks(pw: string) {
  return {
    len: pw.length >= 8,
    digit: /[0-9]/.test(pw),
    special: [...pw].some((c) => PW_SPECIALS.includes(c)),
  }
}

export type PasswordChecks = ReturnType<typeof pwChecks>

// Username rule (matches the Go regex `^[A-Za-z0-9_\-]{3,16}$`).
const USERNAME_RE = /^[A-Za-z0-9_\-]{3,16}$/

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'email.required' })
  .regex(/.+@.+\..+/, { message: 'email.invalid' })

export const usernameSchema = z
  .string()
  .trim()
  .min(3, { message: 'username.tooShort' })
  .max(16, { message: 'username.tooLong' })
  .regex(USERNAME_RE, { message: 'username.badChars' })

export const countrySchema = z
  .string()
  .trim()
  .length(2, { message: 'country.required' })
  .refine(isCountryCode, { message: 'country.invalid' })
  .transform((value) => value.toUpperCase())

export const passwordSchema = z
  .string()
  .min(1, { message: 'password.required' })
  .refine((v) => pwChecks(v).len, { message: 'password.tooShort' })
  .refine((v) => pwChecks(v).digit, { message: 'password.noDigit' })
  .refine((v) => pwChecks(v).special, { message: 'password.noSpecial' })

export const loginSchema = z.object({
  login: z.string().trim().min(1, { message: 'login.required' }),
  password: z.string().min(1, { message: 'password.required' }),
})

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    password2: z.string().min(1, { message: 'password.required' }),
    country: countrySchema,
  })
  .refine((d) => d.password === d.password2, {
    message: 'password.noMatch',
    path: ['password2'],
  })

export const forgotSchema = z.object({
  email: emailSchema,
})

export const resetSchema = z
  .object({
    password: passwordSchema,
    password2: z.string().min(1, { message: 'password.required' }),
    token: z.string().min(1, { message: 'reset.noToken' }),
  })
  .refine((d) => d.password === d.password2, {
    message: 'password.noMatch',
    path: ['password2'],
  })

// Change-email confirmation (used by `/compte` → EmailModal).
// The user must confirm with their current password.
export const changeEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'password.required' }),
})

// Delete-account confirmation (used by `/compte` → DeleteModal).
// Requires the password to confirm.
export const deleteAccountSchema = z.object({
  password: z.string().min(1, { message: 'password.required' }),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotInput = z.infer<typeof forgotSchema>
export type ResetInput = z.infer<typeof resetSchema>
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
