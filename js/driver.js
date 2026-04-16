/**
 * Bus Tracker Chaitén - Driver App
 * Sin login - Solo botón de iniciar
 */

const driverApp = {
    state: {
        isDriving: false,
        supabase: null,
        gpsActive: false,
        watchId: null,
        gpsInterval: null,
        lastUpdate: null,
        map: null,
        busMarker: null
    },
    
    init() {
        this.initSupabase();
    },
    
    initSupabase() {
        try {
            const supabaseUrl = CONFIG.getSupabaseUrl();
            const supabaseKey = CONFIG.getSupabaseKey();
            
            if (!supabaseUrl || !supabaseKey) {
                return false;
            }
            
            this.state.supabase = supabase.createClient(supabaseUrl, supabaseKey);
            return true;
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    },
    
    startDriving() {
        this.state.isDriving = true;
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('driver-main').classList.add('active');
        
        // Inicializar mapa
        setTimeout(() => this.initMap(), 100);
    },
    
    stopDriving() {
        this.stopGPS();
        
        this.state.isDriving = false;
        
        // Limpiar datos de ubicación en Supabase
        this.clearBusLocation();
        
        // Volver a pantalla de inicio
        document.getElementById('driver-main').classList.remove('active');
        document.getElementById('start-screen').classList.add('active');
        
        // Reset map
        this.state.map = null;
        this.state.busMarker = null;
    },
    
    async clearBusLocation() {
        if (!this.state.supabase) return;
        
        try {
            // Eliminar la ubicación del bus
            await this.state.supabase
                .from('bus_locations')
                .delete()
                .eq('bus_id', CONFIG.app.busId);
            
            console.log('🗑️ Ubicación limpiada');
        } catch (err) {
            console.error('Error limpiando:', err);
        }
    },
    
    initMap() {
        setTimeout(() => {
            const container = document.getElementById('driver-map');
            if (!container || this.state.map) return;
            
            this.state.map = L.map('driver-map', {
                zoomControl: false,
                minZoom: 10,
                maxZoom: 19,
                attributionControl: false
            }).setView([-42.9150, -72.7167], 15);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(this.state.map);
            
            // Plaza marker
            L.marker([-42.9150, -72.7167], {
                icon: L.divIcon({
                    className: 'plaza-marker',
                    html: '<div style="background:linear-gradient(135deg,#FFD700,#FFA500);border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px">⭐</div>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(this.state.map).bindPopup('<b>PLAZA PRINCIPAL</b>');
            
        }, 50);
    },
    
    toggleGPS() {
        if (this.state.gpsActive) {
            this.stopGPS();
        } else {
            this.startGPS();
        }
    },
    
    startGPS() {
        if (!navigator.geolocation) {
            alert('GPS no disponible');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.onGPSUpdate(position);
                
                this.state.watchId = navigator.geolocation.watchPosition(
                    (pos) => this.onGPSUpdate(pos),
                    (err) => this.onGPSError(err),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
                
                this.state.gpsInterval = setInterval(() => {
                    if (this.state.lastUpdate) {
                        this.sendLocationToSupabase(this.state.lastUpdate);
                    }
                }, CONFIG.app.updateInterval);
                
                this.state.gpsActive = true;
                this.updateUI(true);
            },
            (error) => this.onGPSError(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    },
    
    stopGPS() {
        if (this.state.watchId !== null) {
            navigator.geolocation.clearWatch(this.state.watchId);
            this.state.watchId = null;
        }
        
        if (this.state.gpsInterval) {
            clearInterval(this.state.gpsInterval);
            this.state.gpsInterval = null;
        }
        
        this.state.gpsActive = false;
        this.updateUI(false);
        
        // Limpiar ubicación
        this.clearBusLocation();
    },
    
    onGPSUpdate(position) {
        const data = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
        };
        
        this.state.lastUpdate = data;
        this.updateLocationInfo(data);
        
        if (!this.state.gpsActive) {
            this.sendLocationToSupabase(data);
        }
        
        // Update map
        if (this.state.map) {
            this.state.map.setView([data.lat, data.lng], 16);
            
            if (this.state.busMarker) {
                this.state.busMarker.setLatLng([data.lat, data.lng]);
            } else {
                this.state.busMarker = L.marker([data.lat, data.lng], {
                    icon: L.divIcon({
                        className: 'bus-marker',
                        html: '<div style="background:linear-gradient(135deg,#28a745,#1e7e34);border:3px solid #fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px">🚌</div>',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    })
                }).addTo(this.state.map).bindPopup('<b>TU BUS</b>');
            }
        }
    },
    
    onGPSError(error) {
        const messages = { 1: 'Permiso denegado', 2: 'GPS no disponible', 3: 'Tiempo agotado' };
        console.error('GPS:', messages[error.code] || 'Error');
    },
    
    updateLocationInfo(data) {
        document.getElementById('current-lat').textContent = data.lat.toFixed(5);
        document.getElementById('current-lng').textContent = data.lng.toFixed(5);
        document.getElementById('current-time').textContent = new Date(data.timestamp).toLocaleTimeString();
    },
    
    updateUI(active) {
        const statusBox = document.getElementById('gps-status');
        const btn = document.getElementById('toggle-gps');
        const statusText = document.querySelector('.driver-status');
        
        if (active) {
            statusBox.classList.remove('stopped');
            statusBox.classList.add('active');
            statusBox.querySelector('.status-icon').textContent = '📡';
            statusBox.querySelector('.status-text').textContent = 'GPS ACTIVO';
            statusBox.querySelector('.status-detail').textContent = 'Compartiendo ubicación';
            
            btn.textContent = 'DETENER GPS';
            btn.classList.remove('start');
            btn.classList.add('stop');
            
            if (statusText) {
                statusText.textContent = '● EN LÍNEA';
                statusText.className = 'driver-status connected';
            }
        } else {
            statusBox.classList.remove('active');
            statusBox.classList.add('stopped');
            statusBox.querySelector('.status-icon').textContent = '📍';
            statusBox.querySelector('.status-text').textContent = 'GPS DETENIDO';
            statusBox.querySelector('.status-detail').textContent = 'Presiona iniciar';
            
            btn.textContent = 'INICIAR GPS';
            btn.classList.remove('stop');
            btn.classList.add('start');
            
            if (statusText) {
                statusText.textContent = '● DETENIDO';
                statusText.className = 'driver-status stopped';
            }
            
            // Reset location info
            document.getElementById('current-lat').textContent = '--.-----';
            document.getElementById('current-lng').textContent = '--.-----';
            document.getElementById('current-time').textContent = '--:--:--';
        }
    },
    
    async sendLocationToSupabase(data) {
        if (!this.state.supabase) return;
        
        try {
            await this.state.supabase
                .from('bus_locations')
                .upsert({
                    bus_id: CONFIG.app.busId,
                    latitude: data.lat,
                    longitude: data.lng,
                    accuracy: data.accuracy,
                    updated_at: data.timestamp
                }, { onConflict: 'bus_id' });
            
            console.log('📍 Enviado');
        } catch (err) {
            console.error('Error:', err);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    driverApp.init();
});