import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Monitor from './pages/Monitor'
import MonitorHistory from './pages/MonitorHistory'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Monitor />} />
        <Route path="/monitor/:id" element={<MonitorHistory />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
