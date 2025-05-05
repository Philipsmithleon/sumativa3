INSERT INTO usuarios (nombre, email, contrasena, rol)
VALUES ('Juan Pérez', 'juan@mail.com', '123456', 'cliente');

INSERT INTO usuarios (nombre, email, contrasena, rol)
VALUES ('admin', 'admin@hotelreef.com', '123456', 'admin');

INSERT INTO habitaciones (tipo, precio, estado, descripcion)
VALUES ('Doble', 80.00, 'disponible', 'Habitación doble con baño privado');

INSERT INTO reservas (id_usuario, id_habitacion, fecha_inicio, fecha_fin)
VALUES (1, 1, TO_DATE('2025-05-10', 'YYYY-MM-DD'), TO_DATE('2025-05-12', 'YYYY-MM-DD'));

INSERT INTO pagos (id_reserva, monto, metodo)
VALUES (1, 160.00, 'tarjeta');

-- Select
SELECT * FROM habitaciones WHERE estado = 'disponible';

SELECT * FROM reservas WHERE id_usuario = 1;

-- Detalles de una reserva con usuario y habitación
SELECT r.id_reserva, u.nombre, h.tipo, r.fecha_inicio, r.fecha_fin
FROM reservas r
JOIN usuarios u ON r.id_usuario = u.id_usuario
JOIN habitaciones h ON r.id_habitacion = h.id_habitacion;

-- Update
UPDATE habitaciones SET estado = 'reservada' WHERE id_habitacion = 1;

UPDATE pagos SET estado = 'confirmado' WHERE id_pago = 1;

-- Delete

DELETE FROM reservas WHERE id_reserva = 1;

DELETE FROM habitaciones WHERE id_habitacion = 1 AND estado = 'disponible';