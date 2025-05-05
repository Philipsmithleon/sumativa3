import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RoomDetails.css';

function RoomDetails() {
  const [room, setRoom] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchRoomDetails();
  }, [id]);
  
  const fetchRoomDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/habitaciones/${id}`); // Agregar URL completa
      setRoom(response.data);
    } catch (err) {
      console.error('Error fetching room details:', err);
      // Manejar error específico
      if (err.response?.status === 404) {
        navigate('/not-found');
      }
    }
  };
  
  if (!room) {
    return <div className="loading">Cargando...</div>;
  }
  
  return (
    <div className="room-details-container">
      <div className="room-image">
        <img src="https://media.istockphoto.com/id/1370825295/photo/modern-hotel-room-with-double-bed-night-tables-tv-set-and-cityscape-from-the-window.jpg?s=612x612&w=0&k=20&c=QMXz9HJVhU-8MtBYyeJxtqLz90j7r0SrR6FTWniPkgc=" alt={`Cuarto ${id}`} />
      </div>
      
      <div className="room-info">
        <h1>Cuarto {id}</h1>
        
        <div className="price-tag">
          <span className="currency">$</span>
          <span className="amount">{room.precio}</span>
          <span className="per-night">/noche</span>
        </div>
        
        <div className="amenities">
          <div className="amenity">
            <span className="icon">✓</span>
            <span>Cama doble</span>
          </div>
          <div className="amenity">
            <span className="icon">✓</span>
            <span>TV</span>
          </div>
          <div className="amenity">
            <span className="icon">✓</span>
            <span>WiFi</span>
          </div>
          <div className="amenity">
            <span className="icon">✓</span>
            <span>Vista Panorámica</span>
          </div>
        </div>
        
        <p className="room-description">{room.descripcion}</p>
        
      </div>
      
      <button className="btn-volver" onClick={() => navigate(-1)}>Volver</button>
    </div>
  );
}

export default RoomDetails;