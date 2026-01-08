import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandinPage from './app/LandinPage'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandinPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
