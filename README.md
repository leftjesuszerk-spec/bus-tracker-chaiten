# 🚌 Bus Tracker Chaitén

Aplicación PWA para rastreo en vivo del bus municipal de Chaitén, Región de Los Lagos, Chile.

## 🎯 Características

- 📍 **Rastreo GPS en vivo** - Ubicación actual del bus en tiempo real
- 📱 **PWA (Progressive Web App)** - Funciona como app nativa, instalable en cualquier celular
- 🗺️ **Mapa interactivo** - Ver recorrido y paradas del bus
- 🔄 **Actualizaciones automáticas** - Cada 30 segundos sin recargar la página
- 📶 **Modo offline** - Funciona aunque haya intermitencias de señal
- ⚡ **Liviana y rápida** - Mínimo consumo de datos y batería

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Celular del   │────▶│    Supabase     │◀────│   Pasajeros   │
│    Conductor    │     │   (Realtime)    │     │  (Navegador)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                              ┌─────────▼─────────┐
                                              │      Vercel       │
                                              │   (Hosting PWA)   │
                                              └───────────────────┘
```

### Tecnologías

- **Frontend**: Vanilla JavaScript + Leaflet.js (mapas)
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Hosting**: Vercel (gratuito)
- **Base de datos**: PostgreSQL con WebSockets para tiempo real

## 🚀 Guía de Instalación

### Paso 1: Crear cuenta en GitHub

1. Ve a https://github.com/signup
2. Crea una cuenta con tu email
3. Verifica tu email

### Paso 2: Crear cuenta en Supabase

1. Ve a https://supabase.com
2. Haz clic en "Start your project"
3. Crea una cuenta (puedes usar tu cuenta de GitHub)
4. Crea un nuevo proyecto:
   - **Nombre**: `bus-chaiten`
   - **Contraseña de base de datos**: Crea una segura y guárdala
   - **Región**: Selecciona `South America (São Paulo)` o la más cercana a Chile
5. Espera a que se cree el proyecto (toma 1-2 minutos)

### Paso 3: Configurar Base de Datos

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Haz clic en **New query**
3. Copia y pega todo el contenido de `supabase_setup.sql`
4. Ejecuta el script (botón **Run**)

### Paso 4: Obtener credenciales de Supabase

1. En Supabase, ve a **Settings** → **API**
2. Copia estos valores:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public API key**: `eyJ...`
3. Guárdalos para el siguiente paso

### Paso 5: Subir código a GitHub

1. Ve a https://github.com/new
2. **Repository name**: `bus-tracker-chaiten`
3. Selecciona **Public**
4. Haz clic en **Create repository**
5. En la terminal de tu computadora (o usa GitHub Desktop):

```bash
# Clonar el repositorio (si lo tienes local)
cd bus-tracker-chaiten
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/bus-tracker-chaiten.git
git push -u origin main
```

### Paso 6: Deploy en Vercel

1. Ve a https://vercel.com
2. Crea una cuenta (usa "Continue with GitHub")
3. Haz clic en **Add New Project**
4. Importa tu repositorio `bus-tracker-chaiten`
5. Configuración:
   - **Framework**: Other (o deja en default)
   - **Root Directory**: `./` (raíz del proyecto)
   - **Build Command**: (dejar vacío)
   - **Output Directory**: (dejar vacío)
6. Haz clic en **Deploy**
7. Espera 1-2 minutos y obtendrás tu URL: `https://bus-tracker-chaiten.vercel.app`

### Paso 7: Configurar la App

1. Abre tu app en el navegador: `https://bus-tracker-chaiten.vercel.app`
2. Presiona el botón **⚙️** (Configuración)
3. Pega:
   - **Supabase URL**: Tu Project URL
   - **Supabase Key**: Tu anon key
4. Presiona **Guardar Configuración**

¡Listo! La app está funcionando.

## 📱 Uso

### Para Pasajeros

1. Escanea el código QR o visita la URL
2. Presiona **"Ver Ubicación del Bus"**
3. Verás el mapa con la ubicación actual del bus
4. Presiona 🎯 para centrar el mapa en el bus

### Para el Conductor

1. Abre la misma URL en tu celular
2. Presiona **"Soy el Conductor"**
3. Presiona **"Iniciar GPS"**
4. Permite el acceso a ubicación
5. ¡Listo! El bus aparecerá en el mapa de los pasajeros
6. **IMPORTANTE**: Mantén la app abierta mientras conduces

## 🗺️ Personalización

### Cambiar coordenadas de paradas

Edita el archivo `js/config.js`:

```javascript
stops: [
    {
        name: 'Nombre de la parada',
        lat: -42.9150,    // Cambiar por coordenadas reales
        lng: -72.7167,
        description: 'Descripción'
    },
    // Agregar más paradas...
]
```

### Cambiar horarios

```javascript
schedule: [
    { time: '07:00', route: 'Salida Terminal' },
    { time: '07:15', route: 'Plaza Principal' },
    // ...
]
```

### Cambiar centro del mapa

```javascript
defaultLocation: {
    lat: -42.9150,  // Latitud de Chaitén
    lng: -72.7167   // Longitud de Chaitén
}
```

## 🔧 Actualizar la App

Para subir cambios:

```bash
git add .
git commit -m "Descripción de los cambios"
git push
```

Vercel actualizará automáticamente la app en 1-2 minutos.

## 📊 Límites del Tier Gratuito

### Supabase (Gratis)
- ✅ 500MB de base de datos (para tu caso, años de uso)
- ✅ 2GB de transferencia mensual (imposible que lo agotes)
- ✅ 100,000 requests/mes (con 1 bus + 50 usuarios = ~50k/mes)
- ⚠️ Pausa después de 7 días sin actividad (el bus opera semanalmente, así que está OK)

### Vercel (Gratis)
- ✅ 100GB de ancho de banda/mes
- ✅ SSL/HTTPS incluido
- ✅ Dominio gratuito `.vercel.app`
- ✅ Deploys ilimitados

## 🐛 Solución de Problemas

### "Supabase no configurado"
- Ve al botón ⚙️ y pega tus credenciales

### "Error de conexión"
- Verifica que la URL y API key sean correctas
- Revisa que Realtime esté habilitado en Supabase

### No se ve el bus
- Asegúrate que el conductor tenga el GPS activado
- Verifica que la tabla `bus_locations` exista en Supabase

### La app se ve mal en mi celular
- Prueba recargar la página
- Asegúrate de tener buena conexión a internet

## 🔒 Seguridad

- **IMPORTANTE**: La API key de Supabase es pública (por eso es "anon")
- No compartas la contraseña de tu base de datos
- En producción, considerar agregar autenticación

## 📝 Licencia

Este proyecto es de código abierto para la comunidad de Chaitén.

## 🤝 Contribuir

Si quieres mejorar la app:
1. Haz fork del repositorio
2. Crea una rama para tus cambios
3. Envía un pull request

## 📞 Soporte

Para problemas o preguntas:
- Revisa esta documentación
- Crea un issue en GitHub
- Consulta la documentación de Supabase: https://supabase.com/docs

---

**Desarrollado con ❤️ para Chaitén**