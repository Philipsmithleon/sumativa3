import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Home.css';

function Home() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeData, setTimeData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchTimeData();
  }, []);
  
  const fetchTimeData = async () => {
    setDataLoading(true);
    try {
      try {
        // -----------------TimeAPI.io----------------------
        const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=America/Mexico_City');
        
        if (response.ok) {
          const data = await response.json();
          setTimeData(data);
          setDataLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error con TimeAPI.io, intentando con API alternativa:', err);
      }

      const response = await fetch('https://worldclockapi.com/api/json/utc/now');
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      const date = new Date(data.currentDateTime);
      
      setTimeData({
        hour: date.getHours(),
        minute: String(date.getMinutes()).padStart(2, '0'),
        seconds: String(date.getSeconds()).padStart(2, '0'),
        day: date.getDate(),
        month: date.toLocaleString('es-MX', { month: 'long' }),
        year: date.getFullYear(),
        dayOfWeek: date.toLocaleString('es-MX', { weekday: 'long' }),
        timeZone: 'UTC (Convertido a hora local)',
        dayOfYear: Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000),
        weekOfYear: Math.ceil((((date - new Date(date.getFullYear(), 0, 0)) / 86400000) + 1) / 7)
      });
    } catch (err) {
      console.error('Error al cargar datos de hora:', err);
      
      const now = new Date();
      setTimeData({
        hour: now.getHours(),
        minute: String(now.getMinutes()).padStart(2, '0'),
        seconds: String(now.getSeconds()).padStart(2, '0'),
        day: now.getDate(),
        month: now.toLocaleString('es-MX', { month: 'long' }),
        year: now.getFullYear(),
        dayOfWeek: now.toLocaleString('es-MX', { weekday: 'long' }),
        timeZone: 'Hora Local (Generada en el navegador)',
        dayOfYear: Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000),
        weekOfYear: Math.ceil((((now - new Date(now.getFullYear(), 0, 0)) / 86400000) + 1) / 7)
      });
    } finally {
      setDataLoading(false);
    }
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Datos enviados:", { usuario: email, contrasena });
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: email, 
          contrasena: contrasena
        }),
      });

      console.log("Estado de respuesta:", response.status);
      const responseText = await response.text();
      console.log("Texto de respuesta:", responseText);
      
      // --------------------------------------------
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("La respuesta del servidor no es JSON válido");
      }

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP: ${response.status}`);
      }
      
      if (!data.id_usuario || !data.rol) {
        throw new Error('Respuesta inválida del servidor: faltan datos de usuario');
      }
      
      console.log("Datos de usuario recibidos:", data);
      
      localStorage.setItem('user', JSON.stringify(data));
      navigate(data.rol === 'admin' ? '/admin' : '/reservations');
      
    } catch (err) {
      console.error('Error completo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAccess = () => {
    navigate('/admin-login');
  };

  const handleRegister = () => {
    navigate('/registro');
  };

  return (
    <div className="home-container">
      <div className="login-form">
        <h1 className="hotel-title">HOTEL PACIFIC REEF</h1>
        
        <div className="form-content">
          <h2 className="login-title">INICIAR SESIÓN</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingrese su email"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
              />
            </div>
            
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </button>

            <button type="button" className="register-button" onClick={handleRegister}>
              Registrarse
            </button>
          </form>
        </div>
      </div>
      
      <div className="featured-section">
        <h2>Información de Tiempo Actual</h2>
        {dataLoading ? (
          <p>Cargando información del tiempo...</p>
        ) : timeData ? (
          <div className="time-info">
            <div className="time-card">
              <div className="time-main">
                <i className="time-icon fas fa-clock"></i>
                <h3 className="current-time">
                  {timeData.hour}:{timeData.minute}:{timeData.seconds} {timeData.hour >= 12 ? 'PM' : 'AM'}
                </h3>
              </div>
              <div className="time-details">
                <p><strong>Fecha:</strong> {timeData.dayOfWeek}, {timeData.day} de {timeData.month} de {timeData.year}</p>
                <p><strong>Zona Horaria:</strong> {timeData.timeZone}</p>
                <p><strong>Día del Año:</strong> {timeData.dayOfYear}</p>
                <p><strong>Semana del Año:</strong> {timeData.weekOfYear}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="error-message">No se pudo cargar la información del tiempo</p>
        )}
      </div>
    </div>
  );
}

export default Home;