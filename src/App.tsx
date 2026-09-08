import StepUpModal from '@/components/StepUpModal'
import Toaster from '@/components/shared/Toaster'
import AppRouter from '@/router/AppRouter'

function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
      <StepUpModal />
    </>
  )
}

export default App
