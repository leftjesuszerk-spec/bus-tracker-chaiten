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
        updateInterval: 15000, // 15 segundos (mínimo viable)
        busId: 'bus-chaiten-001', // ID único del bus
        defaultLocation: {
            lat: -42.9150,  // Chaitén, Chile
            lng: -72.7167
        },
        // Límites del mapa: área alrededor de Chaitén (aprox 15 km radius)
        // [sudoeste, noreste]
        maxBounds: [
            [-43.0650, -72.9167], // sudoeste
            [-42.7650, -72.5167]  // noreste
        ],
        // Zoom mínimo y máximo para mantener foco en el pueblo
        minZoom: 12,
        maxZoom: 18
    },
    
    // Configuración de Supabase (se rellena dinámicamente)
    supabase: null,
    
    // Solo Plaza Principal destacada (punto central del pueblo)
    plazaPrincipal: {
        name: 'PLAZA PRINCIPAL',
        lat: -42.9150,
        lng: -72.7167,
        description: 'Centro de Chaitén'
    }
};

// Notas sobre el intervalo de actualización:
// - 15 segundos: Muy responsivo, buena experiencia de usuario
// - Consumo: ~240 requests/hora por usuario activo
// - Supabase Free: Soporta 100,000 requests/mes (~400 usuarios activos)
// - Batería: Consumo moderado, recomendado usar con cargador

// Exportar para uso en otros archivos
window.CONFIG = CONFIG;