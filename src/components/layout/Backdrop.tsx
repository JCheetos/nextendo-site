export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <canvas id="nx-mesh" className="backdrop__mesh" />
      <div className="field field--a" />
      <div className="field field--b" />
      <div className="grid-veil" />
    </div>
  )
}
