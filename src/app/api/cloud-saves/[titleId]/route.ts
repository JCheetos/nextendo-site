import { fetchMe, fetchSaveBinary, isCloudSavesEligible } from '@/lib/api'
import { titleIdSchema } from '@/lib/saves'
import { getRequestCookieHeader } from '@/server/request'
import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ titleId: string }> }) {
  const { titleId } = await params
  const parsedTitleId = titleIdSchema.safeParse(titleId)
  if (!parsedTitleId.success)
    return NextResponse.json({ error: 'invalid_title_id' }, { status: 400 })
  const cookie = await getRequestCookieHeader()
  if (!isCloudSavesEligible(await fetchMe({ cookie })))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const upstream = await fetchSaveBinary(parsedTitleId.data, { cookie })
  if (!upstream) return NextResponse.json({ error: 'upstream_unavailable' }, { status: 502 })
  if (!upstream.ok)
    return NextResponse.json({ error: 'download_failed' }, { status: upstream.status })
  const headers = new Headers()
  headers.set('Content-Type', 'application/octet-stream')
  headers.set('Content-Disposition', `attachment; filename="${parsedTitleId.data}.bin"`)
  headers.set('Cache-Control', 'private, no-store')
  if (!upstream.body) return NextResponse.json({ error: 'download_failed' }, { status: 502 })
  return new NextResponse(upstream.body, { headers })
}
