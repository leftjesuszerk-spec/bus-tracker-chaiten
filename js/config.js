/**
 * Bus Tracker Chaitén - Configuration
 * 
 * IMPORTANTE: Reemplaza estos valores con tu propia configuración de Supabase
 * Obtén estos valores en: https://app.supabase.com
 * 
 * 1. Crea un proyecto nuevo
 * 2. Ve a Settings → API
 * 3. Copia el Project URL y la anon/public API key
 */

const CONFIG = {
    // Credenciales pre-configuradas de Supabase
    DEFAULT_SUPABASE_URL: 'https://xgpfmiuqvbqjybgtkram.supabase.co',
    DEFAULT_SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncGZtaXVxdmJxanliZ3RrcmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjIwNDksImV4cCI6MjA5MTkzODA0OX0.ZGllzvqLNax3irblipz12NCQKRPDaFVgNtScajfIHao',
    
    // Por defecto usa valores de localStorage si existen, sino usa las pre-configuradas
    getSupabaseUrl() {
        return localStorage.getItem('supabase_url') || this.DEFAULT_SUPABASE_URL;
    },
    
    getSupabaseKey() {
        return localStorage.getItem('supabase_key') || this.DEFAULT_SUPABASE_KEY;
    },
    
    // Guardar configuración
    setSupabaseUrl(url) {
        localStorage.setItem('supabase_url', url);
    },
    
    setSupabaseKey(key) {
        localStorage.setItem('supabase_key', key);
    },
    
    // Verificar si está configurado
    isConfigured() {
        return !!(this.getSupabaseUrl() && this.getSupabaseKey());
    },
    
    // Configuración de la aplicación
    app: {
        name: 'Bus Chaitén',
        version: '1.0.0',
        updateInterval: 30000, // 30 segundos
        busId: 'bus-chaiten-001', // ID único del bus
        defaultLocation: {
            lat: -42.9150,  // Chaitén, Chile
            lng: -72.7167
        }
    },
    
    // Configuración de Supabase (se rellena dinámicamente)
    supabase: null,
    
    // Paradas del recorrido (coordenadas aproximadas de Chaitén)
    // AJUSTAR según el recorrido real del bus
    stops: [
        {
            name: 'Terminal de Buses',
            lat: -42.9150,
            lng: -72.7167,
            description: 'Punto de partida'
        },
        {
            name: 'Plaza Principal',
            lat: -42.9160,
            lng: -72.7150,
            description: 'Centro del pueblo'
        },
        {
            name: 'Hospital',
            lat: -42.9180,
            lng: -72.7140,
            description: 'Hospital de Chaitén'
        },
        {
            name: 'Escuela',
            lat: -42.9140,
            lng: -72.7180,
            description: 'Colegio local'
        },
        {
            name: 'Sector Industrial',
            lat: -42.9120,
            lng: -72.7200,
            description: 'Zona industrial'
        }
    ],
    
    // Horarios aproximados (ajustar según horarios reales)
    schedule: [
        { time: '07:00', route: 'Salida Terminal' },
        { time: '07:15', route: 'Plaza Principal' },
        { time: '07:30', route: 'Hospital' },
        { time: '07:45', route: 'Escuela' },
        { time: '08:00', route: 'Sector Industrial' },
        { time: '09:00', route: 'Vuelta Completa' },
        { time: '12:00', route: 'Mediodía' },
        { time: '17:00', route: 'Tarde' },
        { time: '18:00', route: 'Último recorrido' }
    ]
};

// Exportar para uso en otros archivos
window.CONFIG = CONFIG;