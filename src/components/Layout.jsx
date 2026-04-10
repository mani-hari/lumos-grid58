import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="h-screen overflow-hidden" style={{ background: '#fff' }}>
      <Outlet />
    </div>
  )
}
