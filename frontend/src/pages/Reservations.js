import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Reservations.css';

function formatDateForInput(date) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}

function formatDateForAPI(date) {
  return date.toISOString().split('T')[0];
}

function Reservations() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 1)));
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchAvailableRooms = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/habitaciones/disponibles');
        setRooms(response.data);
      } catch (err) {
        setError(`Error: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailableRooms();
  }, []);


  const handleReservation = async () => {
    if (!selectedRoom) return alert('Seleccione una habitación');
    try {
      await axios.post('http://localhost:5000/api/reservas', {
        id_usuario: user.id_usuario,
        id_habitacion: selectedRoom,
        fecha_inicio: formatDateForAPI(startDate),
        fecha_fin: formatDateForAPI(endDate)
      });
      alert('Reserva exitosa');
      navigate(`/room/${selectedRoom}`);
    } catch (err) { alert(`Error: ${err.response?.data?.error || err.message}`); }
  };

  return (
    <div className="reservations-container">
      <h1>RESERVAS</h1>
      <div className="date-selection">
        <div className="date-group">
          <label>Desde</label>
          <input type="date" value={formatDateForInput(startDate)} 
            onChange={(e) => setStartDate(new Date(e.target.value))} />
        </div>
        <div className="date-group">
          <label>Hasta</label>
          <input type="date" value={formatDateForInput(endDate)} 
            min={formatDateForInput(startDate)} 
            onChange={(e) => setEndDate(new Date(e.target.value))} />
        </div>
      </div>

      <div className="room-selection">
        <h2>Seleccionar Habitación</h2>
        {loading && <p>Cargando...</p>}
        {error && <p className="error">{error}</p>}
        <div className="room-list">
          {rooms.map(room => (
            <div key={room.id_habitacion} 
              className={`room-option ${selectedRoom === room.id_habitacion ? 'selected' : ''}`}
              onClick={() => setSelectedRoom(room.id_habitacion)}>
              <h3>Cuarto {room.id_habitacion}</h3>
              <p>{room.tipo}</p>
              <p>${room.precio}/noche</p>
              <div className="room-arrow">›</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleReservation} disabled={!selectedRoom}>Reservar</button>
      <button onClick={() => navigate('/')}>Volver</button>
    </div>
  );
}

export default Reservations;