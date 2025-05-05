import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
import Reservations from './pages/Reservations';
import RoomDetails from './pages/RoomDetails';
import ProtectedRoute from './components/ProtectedRoute';
import Registro from './pages/Registro';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/admin" element={
          <ProtectedRoute role="admin">
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="/reservations" element={
          <ProtectedRoute role="cliente">
            <Reservations />
          </ProtectedRoute>
        } />
        <Route path="/room/:id" element={<RoomDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
