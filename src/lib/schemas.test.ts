import { describe, expect, it } from 'vitest'
import {
  changeEmailSchema,
  deleteAccountSchema,
  emailSchema,
  forgotSchema,
  loginSchema,
  passwordSchema,
  pwChecks,
  registerSchema,
  resetSchema,
  usernameSchema,
} from './schemas'

describe('pwChecks', () => {
  it('flags short, no-digit, no-special as failing all rules', () => {
    expect(pwChecks('abc')).toEqual({ len: false, digit: false, special: false })
  })

  it('flags length only when ≥ 8', () => {
    expect(pwChecks('abc123!').len).toBe(false)
    expect(pwChecks('abcdefg1!').len).toBe(true)
  })

  it('detects digits', () => {
    expect(pwChecks('abcdefgh').digit).toBe(false)
    expect(pwChecks('abc1efgh').digit).toBe(true)
  })

  it('detects special characters', () => {
    expect(pwChecks('abc1efgh').special).toBe(false)
    expect(pwChecks('abc1efgh!').special).toBe(true)
    expect(pwChecks('abc1efgh#').special).toBe(true)
    expect(pwChecks('abc1efgh[').special).toBe(true)
  })
})

describe('loginSchema', () => {
  it('rejects empty fields', () => {
    const r = loginSchema.safeParse({ login: '', password: '' })
    expect(r.success).toBe(false)
  })

  it('accepts a non-empty login/password pair', () => {
    expect(
      loginSchema.safeParse({ login: 'someone@example.com', password: 'p4ssw0rd!' }).success,
    ).toBe(true)
  })
})

describe('registerSchema', () => {
  const ok = {
    username: 'Inkling_Pro',
    email: 'inkling@example.com',
    password: 'Password1!',
    password2: 'Password1!',
  }

  it('accepts valid input', () => {
    expect(registerSchema.safeParse(ok).success).toBe(true)
  })

  it('rejects short usernames', () => {
    const r = registerSchema.safeParse({ ...ok, username: 'ab' })
    expect(r.success).toBe(false)
  })

  it('rejects usernames with bad characters', () => {
    const r = registerSchema.safeParse({ ...ok, username: 'has space!' })
    expect(r.success).toBe(false)
  })

  it('rejects weak passwords (no digit)', () => {
    const r = registerSchema.safeParse({ ...ok, password: 'NoDigits!!', password2: 'NoDigits!!' })
    expect(r.success).toBe(false)
  })

  it('rejects weak passwords (no special)', () => {
    const r = registerSchema.safeParse({
      ...ok,
      password: 'Password11',
      password2: 'Password11',
    })
    expect(r.success).toBe(false)
  })

  it('rejects mismatched password confirmation', () => {
    const r = registerSchema.safeParse({ ...ok, password2: 'Different1!' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid emails', () => {
    const r = registerSchema.safeParse({ ...ok, email: 'not-an-email' })
    expect(r.success).toBe(false)
  })
})

describe('forgotSchema', () => {
  it('requires an email', () => {
    expect(forgotSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
    expect(forgotSchema.safeParse({ email: '' }).success).toBe(false)
    expect(forgotSchema.safeParse({ email: 'nope' }).success).toBe(false)
  })
})

describe('resetSchema', () => {
  const ok = {
    password: 'Password1!',
    password2: 'Password1!',
    token: 'abc',
  }

  it('accepts valid input with matching passwords', () => {
    expect(resetSchema.safeParse(ok).success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    expect(resetSchema.safeParse({ ...ok, password2: 'Other1!' }).success).toBe(false)
  })

  it('rejects empty token', () => {
    expect(resetSchema.safeParse({ ...ok, token: '' }).success).toBe(false)
  })
})

describe('changeEmailSchema', () => {
  it('accepts a valid email + non-empty password', () => {
    expect(
      changeEmailSchema.safeParse({ email: 'new@example.com', password: 'p4ssw0rd!' }).success,
    ).toBe(true)
  })

  it('rejects empty email', () => {
    expect(changeEmailSchema.safeParse({ email: '', password: 'p4ssw0rd!' }).success).toBe(false)
  })

  it('rejects malformed email', () => {
    expect(
      changeEmailSchema.safeParse({ email: 'no-at-sign', password: 'p4ssw0rd!' }).success,
    ).toBe(false)
  })

  it('rejects empty password', () => {
    expect(changeEmailSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false)
  })
})

describe('deleteAccountSchema', () => {
  it('accepts a non-empty password', () => {
    expect(deleteAccountSchema.safeParse({ password: 'p4ssw0rd!' }).success).toBe(true)
  })

  it('rejects empty password', () => {
    expect(deleteAccountSchema.safeParse({ password: '' }).success).toBe(false)
  })
})

describe('emailSchema', () => {
  it('accepts simple addresses', () => {
    expect(emailSchema.safeParse('a@b.co').success).toBe(true)
  })

  it('rejects missing domain dot', () => {
    expect(emailSchema.safeParse('a@b').success).toBe(false)
  })

  it('trims whitespace', () => {
    expect(emailSchema.safeParse('  a@b.co  ').success).toBe(true)
  })

  it('rejects empty string', () => {
    const r = emailSchema.safeParse('')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toBe('email.required')
    }
  })
})

describe('usernameSchema', () => {
  it('accepts the minimum length (3)', () => {
    expect(usernameSchema.safeParse('abc').success).toBe(true)
  })

  it('accepts the maximum length (16)', () => {
    expect(usernameSchema.safeParse('a'.repeat(16)).success).toBe(true)
  })

  it('rejects 2-character names', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false)
  })

  it('rejects 17-character names', () => {
    expect(usernameSchema.safeParse('a'.repeat(17)).success).toBe(false)
  })

  it('accepts underscores and hyphens', () => {
    expect(usernameSchema.safeParse('Inkling_Pro-X').success).toBe(true)
  })

  it('rejects special characters', () => {
    expect(usernameSchema.safeParse('hello!').success).toBe(false)
  })

  it('rejects accented characters (per Go regex)', () => {
    expect(usernameSchema.safeParse('café').success).toBe(false)
  })
})

describe('passwordSchema', () => {
  it('accepts a strong password', () => {
    expect(passwordSchema.safeParse('Hunter2!').success).toBe(true)
  })

  it('rejects an empty password', () => {
    const r = passwordSchema.safeParse('')
    expect(r.success).toBe(false)
  })

  it('rejects a password shorter than 8 chars', () => {
    expect(passwordSchema.safeParse('Pw1!').success).toBe(false)
  })

  it('rejects a password with no digit', () => {
    expect(passwordSchema.safeParse('Password!').success).toBe(false)
  })

  it('rejects a password with no special character', () => {
    expect(passwordSchema.safeParse('Password11').success).toBe(false)
  })

  it('accepts each special character in PW_SPECIALS', () => {
    for (const ch of ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')']) {
      expect(passwordSchema.safeParse(`Password1${ch}`).success).toBe(true)
    }
  })
})
