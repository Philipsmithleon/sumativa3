const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb');
const bcrypt = require('bcrypt');
const app = express();

// --------------Config-----------------
app.use(cors());
app.use(express.json());

const dbConfig = {
  user: 'C##C##ETMDY_FOL',
  password: 'abc12345',
  connectString: 'localhost:1521/xe'
};
//---------------------------------------
// Test
app.get('/api/test-connection', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    res.json({ success: true, message: 'Conexión exitosa a Oracle' });
  } catch (err) {
    console.error('Error al conectar a Oracle:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Endpoint login----------------
app.post('/api/login', async (req, res) => {
  let connection;
  try {
    const { usuario, contrasena } = req.body;
    
    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Credenciales requeridas' });
    }

    connection = await oracledb.getConnection(dbConfig);
    
    const result = await connection.execute(
      `SELECT id_usuario, nombre, email, contrasena, rol 
       FROM USUARIOS 
       WHERE UPPER(TRIM(email)) = UPPER(TRIM(:email))`,
      { email: usuario },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    
    if (contrasena.trim() !== user.CONTRASENA.trim()) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.json({
      id_usuario: user.ID_USUARIO,
      nombre: user.NOMBRE,
      email: user.EMAIL,
      rol: user.ROL
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

app.get('/api/habitaciones', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    const result = await connection.execute(
      `SELECT 
         ID_HABITACION,
         TIPO,
         PRECIO,
         ESTADO,
         DESCRIPCION
       FROM HABITACIONES`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const habitaciones = result.rows.map(room => ({
      id_habitacion: room.ID_HABITACION,
      tipo: room.TIPO || '',
      precio: Number(room.PRECIO) || 0,
      estado: (room.ESTADO || 'disponible').toLowerCase(),
      descripcion: room.DESCRIPCION || ''
    }));
    
    res.json(habitaciones);
    
  } catch (err) {
    console.error('Error en GET /habitaciones:', err);
    res.status(500).json({ 
      error: 'Error de base de datos',
      detalle: err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

app.get('/api/habitaciones/disponibles', async (req, res) => {
  let connection;
  try {
    const { inicio, fin } = req.query;
    console.log("Buscando habitaciones disponibles para:", { inicio, fin });

    if (!inicio || !fin) {
      connection = await oracledb.getConnection(dbConfig);
      
      const result = await connection.execute(
        `SELECT * FROM habitaciones WHERE estado = 'disponible'`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const habitaciones = result.rows.map(room => ({
        id_habitacion: room.ID_HABITACION,
        tipo: room.TIPO || '',
        precio: Number(room.PRECIO) || 0,
        estado: (room.ESTADO || 'disponible').toLowerCase(),
        descripcion: room.DESCRIPCION || ''
      }));

      return res.json(habitaciones);
    }

    let fechaInicio, fechaFin;
    try {
      fechaInicio = new Date(inicio);
      fechaFin = new Date(fin);
      
      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        throw new Error('Fechas inválidas');
      }
    } catch(dateError) {
      console.error("Error parseando fechas en JS:", dateError);
      return res.status(400).json({ error: 'Formato de fecha inválido.' });
    }

    connection = await oracledb.getConnection(dbConfig);

    const allRoomsResult = await connection.execute(
      `SELECT id_habitacion, tipo, precio, estado, descripcion FROM habitaciones`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log(`Total de habitaciones en la BD: ${allRoomsResult.rows.length}`);
    
    if (allRoomsResult.rows.length === 0) {
      console.warn("No hay habitaciones en la base de datos");
      return res.json([]);
    }

    const reservedRooms = await connection.execute(
      `SELECT id_habitacion 
       FROM reservas 
       WHERE estado != 'cancelada'
       AND fecha_inicio < TO_DATE(:fin_date, 'YYYY-MM-DD') 
       AND fecha_fin > TO_DATE(:inicio_date, 'YYYY-MM-DD')`,
      {
        inicio_date: fechaInicio.toISOString().split('T')[0],
        fin_date: fechaFin.toISOString().split('T')[0]
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log(`Habitaciones reservadas para ese período: ${reservedRooms.rows.length}`);
    
    const reservedRoomIds = new Set(reservedRooms.rows.map(row => row.ID_HABITACION));
    
    const availableRooms = allRoomsResult.rows.filter(room => 
      !reservedRoomIds.has(room.ID_HABITACION) && room.ESTADO === 'disponible'
    );
    
    console.log(`Habitaciones disponibles encontradas: ${availableRooms.length}`);
    
    const habitacionesDisponibles = availableRooms.map(room => ({
      id_habitacion: Number(room.ID_HABITACION),
      tipo: room.TIPO || 'Sin tipo',
      precio: Number(room.PRECIO) || 0,
      estado: (room.ESTADO || 'disponible').toLowerCase(),
      descripcion: room.DESCRIPCION || ''
    }));
    
    res.json(habitacionesDisponibles);

  } catch (err) {
    console.error('Error detallado al obtener habitaciones disponibles:', err);
    res.status(500).json({
      error: 'Error interno del servidor al buscar disponibilidad.',
      details: err.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error al cerrar conexión:", err);
      }
    }
  }
});

app.get('/api/habitaciones/:id', async (req, res) => {
  let connection;
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT * FROM habitaciones WHERE id_habitacion = :id`, 
      { id }, 
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });

    const habitacion = {
      id_habitacion: result.rows[0].ID_HABITACION,
      tipo: result.rows[0].TIPO || '',
      precio: Number(result.rows[0].PRECIO) || 0,
      estado: (result.rows[0].ESTADO || 'disponible').toLowerCase(),
      descripcion: result.rows[0].DESCRIPCION || ''
    };

    res.json(habitacion);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/api/habitaciones', async (req, res) => {
  let connection;
  try {
    const { tipo, precio, estado, descripcion } = req.body;
    
    if (!tipo || isNaN(parseFloat(precio))) {
      return res.status(400).json({ error: 'Datos inválidos. Tipo y precio son requeridos.' });
    }
    
    connection = await oracledb.getConnection(dbConfig);
    
    const result = await connection.execute(
      `INSERT INTO habitaciones 
       (tipo, precio, estado, descripcion) 
       VALUES (:tipo, :precio, :estado, :descripcion) 
       RETURNING id_habitacion INTO :id`,
      { 
        tipo, 
        precio: parseFloat(precio), 
        estado: estado || 'disponible', 
        descripcion: descripcion || '',
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );
    
    await connection.commit();
    
    const nuevaHabitacion = {
      id_habitacion: result.outBinds.id[0],
      tipo,
      precio: parseFloat(precio),
      estado: estado || 'disponible',
      descripcion: descripcion || ''
    };
    
    res.status(201).json(nuevaHabitacion);
  } catch (err) {
    console.error('Error al crear habitación:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

app.put('/api/habitaciones/:id', async (req, res) => {
  let connection;
  try {
    const id = parseInt(req.params.id);
    const { tipo, precio, estado, descripcion } = req.body;

    if (isNaN(id) || isNaN(parseFloat(precio))) {
      return res.status(400).json({ error: "Datos numéricos inválidos" });
    }

    connection = await oracledb.getConnection(dbConfig);

    const estadoNormalizado = (estado || '').toLowerCase();
    
    const updateSql = `
      UPDATE HABITACIONES 
      SET TIPO = :tipo, 
          PRECIO = :precio, 
          ESTADO = :estado, 
          DESCRIPCION = :descripcion 
      WHERE ID_HABITACION = :id
    `;
    
    await connection.execute(
      updateSql,
      {
        tipo: tipo || '',
        precio: parseFloat(precio),
        estado: estadoNormalizado,
        descripcion: descripcion || '',
        id
      },
      { autoCommit: true }
    );
    
    const result = await connection.execute(
      `SELECT * FROM HABITACIONES WHERE ID_HABITACION = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No se encontró la habitación después de actualizar" });
    }
    
    const updatedRoom = result.rows[0];
    
    const habitacionActualizada = {
      id_habitacion: updatedRoom.ID_HABITACION,
      tipo: updatedRoom.TIPO || '',
      precio: Number(updatedRoom.PRECIO) || 0,
      estado: (updatedRoom.ESTADO || 'disponible').toLowerCase(),
      descripcion: updatedRoom.DESCRIPCION || ''
    };
    
    res.json(habitacionActualizada);

  } catch (err) {
    console.error('Error actualizando:', err);
    res.status(500).json({ 
      error: 'Error interno',
      detalle: err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete('/api/habitaciones/:id', async (req, res) => {
  let connection;
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    connection = await oracledb.getConnection(dbConfig);

    const checkResult = await connection.execute(
      `SELECT ID_HABITACION FROM HABITACIONES WHERE ID_HABITACION = :id`,
      { id }
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Habitación no encontrada" });
    }

    await connection.execute(
      `DELETE FROM RESERVAS WHERE ID_HABITACION = :id`,
      { id }
    );

    await connection.execute(
      `DELETE FROM HABITACIONES WHERE ID_HABITACION = :id`,
      { id }
    );

    await connection.commit();
    res.json({ success: true, message: "Habitación eliminada completamente" });

  } catch (err) {
    console.error('Error eliminando:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/api/reservas', async (req, res) => {
  let connection;
  try {
    const { id_usuario, id_habitacion, fecha_inicio, fecha_fin } = req.body;
    console.log("Intentando crear reserva:", req.body);

    if (!id_usuario || !id_habitacion || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Faltan datos para la reserva (usuario, habitación, fechas).' });
    }
    const num_id_usuario = parseInt(id_usuario, 10);
    const num_id_habitacion = parseInt(id_habitacion, 10);
    if (isNaN(num_id_usuario) || isNaN(num_id_habitacion)) {
      return res.status(400).json({ error: 'ID de usuario o habitación inválido.' });
    }

    connection = await oracledb.getConnection(dbConfig);

    const checkSql = `
      SELECT COUNT(*) as count
      FROM reservas r
      WHERE r.id_habitacion = :id_hab
        AND r.estado != 'cancelada'
        AND (
            r.fecha_inicio < TO_TIMESTAMP_TZ(:fin_dt, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') AND
            r.fecha_fin > TO_TIMESTAMP_TZ(:inicio_dt, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"')
        )
    `;
    const checkParams = {
      id_hab: num_id_habitacion,
      inicio_dt: fecha_inicio,
      fin_dt: fecha_fin
    };

    console.log("Verificando disponibilidad con:", checkParams);
    const checkResult = await connection.execute(checkSql, checkParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    if (checkResult.rows[0].COUNT > 0) {
      console.warn(`Conflicto de reserva detectado para habitación ${num_id_habitacion} en fechas ${fecha_inicio} - ${fecha_fin}`);
      return res.status(409).json({ error: 'La habitación ya está reservada para las fechas seleccionadas.' });
    }

    const insertSql = `
      INSERT INTO reservas
      (id_usuario, id_habitacion, fecha_inicio, fecha_fin, estado)
      VALUES
      (:id_usr, :id_hab,
       TO_TIMESTAMP_TZ(:inicio_dt, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
       TO_TIMESTAMP_TZ(:fin_dt, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
       'confirmada')
      RETURNING id_reserva INTO :id_reserva_out
    `;
    const insertParams = {
      id_usr: num_id_usuario,
      id_hab: num_id_habitacion,
      inicio_dt: fecha_inicio,
      fin_dt: fecha_fin,
      id_reserva_out: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    console.log("Insertando reserva con:", insertParams);
    const result = await connection.execute(insertSql, insertParams);

    await connection.commit();
    const newReservaId = result.outBinds.id_reserva_out[0];
    console.log(`Reserva creada con éxito ID: ${newReservaId}`);

    res.status(201).json({
      id_reserva: newReservaId,
      id_usuario: num_id_usuario,
      id_habitacion: num_id_habitacion,
      fecha_inicio: fecha_inicio,
      fecha_fin: fecha_fin,
      estado: 'confirmada'
    });

  } catch (err) {
    console.error('Error al crear reserva:', err);
    if (connection) {
      try { await connection.rollback(); } catch (rbErr) { console.error('Error en rollback:', rbErr); }
    }
    res.status(500).json({ error: 'Error interno del servidor al crear la reserva: ' + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error al cerrar conexión:", err);
      }
    }
  }
});

app.get('/api/reservas', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    const result = await connection.execute(
      `SELECT r.*, u.nombre as nombre_usuario, h.tipo as tipo_habitacion 
       FROM reservas r
       JOIN usuarios u ON r.id_usuario = u.id_usuario
       JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
       ORDER BY r.fecha_inicio DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const reservas = result.rows.map(reserva => ({
      id_reserva: reserva.ID_RESERVA,
      id_usuario: reserva.ID_USUARIO,
      id_habitacion: reserva.ID_HABITACION,
      fecha_inicio: reserva.FECHA_INICIO,
      fecha_fin: reserva.FECHA_FIN,
      estado: reserva.ESTADO?.toLowerCase() || '',
      nombre_usuario: reserva.NOMBRE_USUARIO || '',
      tipo_habitacion: reserva.TIPO_HABITACION || ''
    }));
    
    res.json(reservas);
  } catch (err) {
    console.error('Error al obtener reservas:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Endpoint diagnostico
app.get('/api/debug/habitaciones', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    const result = await connection.execute(
      `SELECT * FROM habitaciones`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const debug_info = {
      total_habitaciones: result.rows.length,
      fecha_consulta: new Date().toISOString(),
      habitaciones: result.rows.map(room => ({
        id_habitacion: room.ID_HABITACION,
        tipo: room.TIPO || '',
        precio: Number(room.PRECIO) || 0,
        estado: room.ESTADO || '',
        descripcion: room.DESCRIPCION || '',
        raw_data: {...room}  // Incluir datos crudos para inspección
      }))
    };
    
    res.json(debug_info);
  } catch (err) {
    console.error('Error en endpoint de debug:', err);
    res.status(500).json({ 
      error: err.message,
      stack: err.stack
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Registro endpoint-----------------
app.post('/api/registro', async (req, res) => {
  let connection;
  try {
    const { nombre, email, contrasena } = req.body;
    
    // Valida-------------
    if (!nombre || !email || !contrasena) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (contrasena.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    connection = await oracledb.getConnection(dbConfig);

    // Verificar si el email ya existe
    const checkEmailQuery = `
      SELECT COUNT(*) as count 
      FROM USUARIOS 
      WHERE UPPER(TRIM(email)) = UPPER(TRIM(:email))
    `;
    
    const checkResult = await connection.execute(
      checkEmailQuery,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows[0].COUNT > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Crear un nuevo usuario
    // Por defecto, asignamos el rol 'cliente'
    const insertUserQuery = `
      INSERT INTO USUARIOS 
      (nombre, email, contrasena, rol) 
      VALUES 
      (:nombre, :email, :contrasena, 'cliente')
      RETURNING id_usuario INTO :id
    `;

    const result = await connection.execute(
      insertUserQuery,
      { 
        nombre, 
        email, 
        contrasena, 
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      id_usuario: result.outBinds.id[0]
    });

  } catch (err) {
    console.error('Error en registro de usuario:', err);
    
    if (connection) {
      try { 
        await connection.rollback(); 
      } catch (rbErr) { 
        console.error('Error en rollback:', rbErr); 
      }
    }
    
    res.status(500).json({ 
      error: 'Error en el servidor al registrar usuario', 
      details: err.message 
    });
    
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error al cerrar conexión:", err);
      }
    }
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Endpoint para diagnóstico: http://localhost:${PORT}/api/debug/habitaciones`);
});