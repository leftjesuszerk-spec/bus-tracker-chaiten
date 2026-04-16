-- =====================================================
-- Configuración de Base de Datos para Bus Tracker Chaitén
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- Crear tabla para ubicaciones de buses
CREATE TABLE IF NOT EXISTS bus_locations (
    id SERIAL PRIMARY KEY,
    bus_id VARCHAR(255) UNIQUE NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por bus_id
CREATE INDEX IF NOT EXISTS idx_bus_locations_bus_id ON bus_locations(bus_id);

-- Crear índice para búsquedas por timestamp
CREATE INDEX IF NOT EXISTS idx_bus_locations_updated_at ON bus_locations(updated_at);

-- =====================================================
-- Políticas de Seguridad (RLS - Row Level Security)
-- =====================================================

-- Habilitar RLS en la tabla
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;

-- Política: Permitir lectura anónima (cualquiera puede ver ubicación)
CREATE POLICY "Allow anonymous read access"
ON bus_locations FOR SELECT
TO anon
USING (true);

-- Política: Permitir inserción anónima (para el conductor)
-- NOTA: En producción, considerar usar autenticación
CREATE POLICY "Allow anonymous insert"
ON bus_locations FOR INSERT
TO anon
WITH CHECK (true);

-- Política: Permitir actualización anónima
CREATE POLICY "Allow anonymous update"
ON bus_locations FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Política: Permitir eliminación anónima
CREATE POLICY "Allow anonymous delete"
ON bus_locations FOR DELETE
TO anon
USING (true);

-- =====================================================
-- Configuración de Realtime
-- =====================================================

-- Asegurar que realtime está habilitado para la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE bus_locations;

-- =====================================================
-- Datos de Prueba (Opcional - eliminar en producción)
-- =====================================================

-- Insertar ubicación de prueba para Chaitén
INSERT INTO bus_locations (bus_id, latitude, longitude, accuracy, updated_at)
VALUES (
    'bus-chaiten-001',
    -42.9150,
    -72.7167,
    10.0,
    NOW()
)
ON CONFLICT (bus_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    accuracy = EXCLUDED.accuracy,
    updated_at = EXCLUDED.updated_at;

-- =====================================================
-- Notas de Configuración
-- =====================================================

-- 1. Ve a Authentication → Policies y verifica que las políticas estén activas
-- 2. Ve a Database → Replication → Supabase Realtime y asegúrate que esté ON
-- 3. Obtén tu Project URL y anon key en Settings → API
-- 4. Pega esos valores en la configuración de la app