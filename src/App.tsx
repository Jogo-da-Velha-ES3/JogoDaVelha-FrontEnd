import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { LandscapeShell } from './components/layout/LandscapeShell'
import { routes } from './routes/routes'

const router = createBrowserRouter(routes)

function App() {
  return (
    <LandscapeShell>
      <RouterProvider router={router} />
    </LandscapeShell>
  )
}

export default App
