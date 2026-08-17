import { Routes, Route } from 'react-router-dom'

// TODO S1: Replace placeholder routes with actual page components
function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-primary">PRODO</h1>
              <p className="mt-2 text-muted-foreground">
                Enterprise Task Management Platform
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Frontend scaffold ready — S0 complete
              </p>
            </div>
          </div>
        }
      />
      {/* TODO S1: /login, /dashboard, /tasks, /projects, /settings */}
    </Routes>
  )
}

// H2 CI verification: confirms ci-web.yml triggers on PR to develop.
export default App
