import type { APIRequestContext, BrowserContext } from '@playwright/test'

const MOCK_LOGIN = {
  login: 'yosoycheetos@outlook.com',
  password: 'Test123!',
}

export async function loginAndShareCookie(request: APIRequestContext, context: BrowserContext) {
  const response = await request.post('http://localhost:8080/api/login', {
    headers: { 'Content-Type': 'application/json' },
    data: MOCK_LOGIN,
  })

  if (!response.ok()) {
    throw new Error(`Mock login failed with status ${response.status()}`)
  }

  const setCookie = response
    .headersArray()
    .find((header) => header.name.toLowerCase() === 'set-cookie')?.value
  const session = setCookie?.match(/(?:^|,\s*)nx_session=([^;]+)/)?.[1]
  if (!session) {
    throw new Error('Mock login did not return an nx_session cookie')
  }

  await context.addCookies([
    {
      name: 'nx_session',
      value: session,
      url: 'http://localhost:3000/',
      httpOnly: true,
    },
  ])
}
