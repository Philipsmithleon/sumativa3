import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminPanel.css';

function AdminPanel() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [formData, setFormData] = useState({
    tipo: '',
    precio: '',
    estado: 'disponible',
    descripcion: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [duplicateIdWarning, setDuplicateIdWarning] = useState(false);
  const navigate = useNavigate();
  
  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');
      setDuplicateIdWarning(false);
      
      const response = await axios.get('http://localhost:5000/api/habitaciones');
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Formato de respuesta inválido');
      }
      
      const idCounts = {};
      response.data.forEach(room => {
        const roomId = Number(room.id_habitacion);
        if (roomId in idCounts) {
          idCounts[roomId]++;
        } else {
          idCounts[roomId] = 1;
        }
      });
      
      const duplicateIds = Object.entries(idCounts)
        .filter(([id, count]) => count > 1 || id === '0' || isNaN(parseInt(id)))
        .map(([id]) => id);
      
      if (duplicateIds.length > 0) {
        console.error('IDs problemáticos detectados:', duplicateIds);
        setDuplicateIdWarning(true);
      }
      
      const normalizedRooms = response.data.map((room, index) => {
        const roomId = Number(room.id_habitacion);
        const hasValidId = roomId > 0 && !isNaN(roomId) && idCounts[roomId] === 1;
        
        return {
          id_habitacion: hasValidId ? roomId : roomId + `-temp-${index}`,
          original_id: roomId,
          tipo: room.tipo || 'Sin tipo',
          precio: Number(room.precio) || 0,
          estado: room.estado?.toLowerCase() || 'disponible',
          descripcion: room.descripcion || '',
          has_id_issue: !hasValidId
        };
      });
      
      setRooms(normalizedRooms);
      
    } catch (err) {
      setError('Error cargando habitaciones: ' + (err.message || 'Error de conexión'));
      console.error('Error en fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  const getSelectedRoom = () => {
    if (selectedRoomId === null) return null;
    return rooms.find(room => room.id_habitacion === selectedRoomId) || null;
  };

  const handleRoomSelect = (room) => {
    const isSameRoom = selectedRoomId !== null && 
      String(selectedRoomId) === String(room.id_habitacion);
    
    if (isSameRoom) {
      setSelectedRoomId(null);
      resetForm();
    } else {
      setSelectedRoomId(room.id_habitacion);
      
      setFormData({
        tipo: room.tipo,
        precio: String(room.precio),
        estado: room.estado,
        descripcion: room.descripcion || ''
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'precio' ? value.replace(/[^0-9.]/g, '') : value
    }));
  };

  const handleStatusChange = async (newStatus) => {
    const selectedRoom = getSelectedRoom();
    if (!selectedRoom) return;
  
    try {
      const payload = {
        ...formData,
        estado: newStatus.toLowerCase(),
        precio: parseFloat(formData.precio)
      };
      
      // Usar el ID original para operaciones con la API si existe
      const roomApiId = selectedRoom.original_id || selectedRoom.id_habitacion;
      
      const response = await axios.put(
        `http://localhost:5000/api/habitaciones/${roomApiId}`,
        payload
      );
  
      // Actualización inmediata en la UI
      setRooms(prev => prev.map(room => 
        room.id_habitacion === selectedRoomId 
          ? { ...room, ...payload } 
          : room
      ));
      
      setFormData(prev => ({...prev, estado: newStatus.toLowerCase()}));
      setError('');
  
    } catch (err) {
      console.error('Error actualizando estado:', err.response?.data || err);
      setError(`Error: ${err.response?.data?.error || 'Verifique los datos'}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación mejorada de precio
    const precio = parseFloat(formData.precio);
    if (isNaN(precio) || precio <= 0) {
      setError('Ingrese un precio válido mayor que 0');
      return;
    }
  
    try {
      const payload = {
        ...formData,
        precio: precio
      };
      
      const selectedRoom = getSelectedRoom();
  
      if (selectedRoomId !== null) {
        const roomApiId = selectedRoom.original_id || selectedRoom.id_habitacion;
        
        await axios.put(
          `http://localhost:5000/api/habitaciones/${roomApiId}`,
          payload
        );
      } else {
        await axios.post('http://localhost:5000/api/habitaciones', payload);
      }
      
      await fetchRooms();
      resetForm();
      setError('');
    } catch (err) {
      console.error('Error guardando habitación:', err);
      setError(`Error: ${err.response?.data?.error || 'Verifique la conexión'}`);
    }
  };

  const resetForm = () => {
    setSelectedRoomId(null);
    setFormData({
      tipo: '',
      precio: '',
      estado: 'disponible',
      descripcion: ''
    });
  };

  const deleteRoom = async () => {
    if (selectedRoomId === null) return;
    
    const selectedRoom = getSelectedRoom();
    if (!selectedRoom) return;
    
    const displayId = selectedRoom.original_id || selectedRoom.id_habitacion;
    
    if (!window.confirm(`¿Está seguro de eliminar la habitación #${displayId}? Esta acción eliminará también todas sus reservas asociadas.`)) {
      return;
    }
  
    try {
      const roomApiId = selectedRoom.original_id || selectedRoom.id_habitacion;
      
      await axios.delete(`http://localhost:5000/api/habitaciones/${roomApiId}`);
      

      setRooms(prev => prev.filter(room => room.id_habitacion !== selectedRoomId));
      
      resetForm();
      setError('');
  
    } catch (err) {
      console.error('Error eliminando:', err);
      setError('Error eliminando habitación. Intente nuevamente o contacte soporte.');
    }
  };

  const selectedRoom = getSelectedRoom();

  return (
    <div className="admin-container">
      <h1>PANEL ADMINISTRATIVO</h1>
      
      {duplicateIdWarning && (
        <div className="warning-banner">
          ⚠️ Se detectaron habitaciones con IDs duplicados o inválidos en la base de datos.
          Esto puede causar problemas al seleccionar o editar habitaciones.
          Contacte al administrador del sistema para resolver este problema.
        </div>
      )}
      
      <div className="admin-content">
        <div className="rooms-list">
          <h2>Habitaciones</h2>
          {loading && <p className="loading">Cargando habitaciones...</p>}
          {error && <p className="error">{error}</p>}
          
          <div className="room-grid">
            {rooms.map(room => {
              const isSelected = selectedRoomId !== null && 
                String(selectedRoomId) === String(room.id_habitacion);
              
              const displayId = room.original_id || room.id_habitacion;
              
              return (
                <div 
                  key={`room-${room.id_habitacion}`}
                  className={`room-card ${isSelected ? 'selected' : ''} ${room.has_id_issue ? 'id-issue' : ''}`}
                  onClick={() => handleRoomSelect(room)}
                  data-id={room.id_habitacion}
                >
                  <div className="room-header">
                    <h3>Habitación #{displayId}</h3>
                    <span className={`status-indicator ${room.estado}`}>
                      {room.estado.toUpperCase()}
                    </span>
                  </div>
                  <div className="room-info">
                    <p>Tipo: {room.tipo}</p>
                    <p>Precio: {formatPrice(room.precio)}</p>
                    {room.has_id_issue && (
                      <p className="id-warning">⚠️ ID Problemático</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="room-form">
          <h2>
            {selectedRoom 
              ? `Editar Habitación #${selectedRoom.original_id || selectedRoom.id_habitacion}` 
              : 'Nueva Habitación'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tipo de Habitación</label>
              <input
                type="text"
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Precio por Noche (CLP)</label>
              <input
                type="number"
                name="precio"
                value={formData.precio}
                onChange={handleInputChange}
                min="1"
                step="0.01"
                required
              />
            </div>

            <div className="form-group status-group">
              <label>Estado Actual</label>
              <div className="status-buttons">
                <button
                  type="button"
                  className={`status-btn disponible ${formData.estado === 'disponible' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('disponible')}
                >
                  Disponible
                </button>
                <button
                  type="button"
                  className={`status-btn reservada ${formData.estado === 'reservada' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('reservada')}
                >
                  Reservada
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save">
                {selectedRoom ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" className="btn-cancel" onClick={resetForm}>
                Cancelar
              </button>
              {selectedRoom && (
                <button type="button" className="btn-delete" onClick={deleteRoom}>
                  Eliminar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <button className="btn-volver" onClick={() => navigate('/')}>
        Volver al Inicio
      </button>
    </div>
  );
}

export default AdminPanel;