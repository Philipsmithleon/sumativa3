import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css'; // Reutilizamos los estilos de Home.css

function Registro() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validación básica
    if (contrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          email,
          contrasena
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP: ${response.status}`);
      }

      setSuccess('Registro exitoso. Redirigiendo al inicio de sesión...');
      
      // Esperar 2 segundos antes de redirigir
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Error en registro:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="home-container">
      <div className="login-form">
        <h1 className="hotel-title">HOTEL PACIFIC REEF</h1>
        
        <div className="form-content">
          <h2 className="login-title">REGISTRO DE USUARIO</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingrese su nombre completo"
                required
              />
            </div>
            
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
                placeholder="Cree una contraseña"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Confirmar Contraseña</label>
              <input
                type="password"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                placeholder="Confirme su contraseña"
                required
              />
            </div>
            
            <button type="submit" className="register-button" disabled={loading}>
              {loading ? 'Procesando...' : 'Registrarse'}
            </button>
            
            <button type="button" className="back-button" onClick={handleBack}>
              Volver al Inicio
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Registro;