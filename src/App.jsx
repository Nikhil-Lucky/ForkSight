import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Analyze from './pages/Analyze'
import Analysis from './pages/Analysis'
import Graveyard from './pages/Graveyard'
import ScanHistory from './pages/ScanHistory'

export default function App() {
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/analyze" element={<Analyze />} />
    <Route path="/analysis" element={<Analysis />} />
    <Route path="/graveyard" element={<Graveyard />} />
    <Route path="/history" element={<ScanHistory />} />
  </Routes>
}
