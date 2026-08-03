import type { ReactNode } from 'react'

type Props = {
  aside: ReactNode
  children: ReactNode
}

export function AuthShell({ aside, children }: Props) {
  return (
    <section className="auth">
      <div className="auth__aside">{aside}</div>
      <div className="auth__card">{children}</div>
    </section>
  )
}
