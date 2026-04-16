/**
 * Bus Tracker Chaitén - Driver App
 * Minimal dark theme - Estilo CLI
 */

const driverApp = {
    state: {
        isLoggedIn: false,
        driverName: '',
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
        this.checkLogin();
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
    
    checkLogin() {
        const storedName = localStorage.getItem('driver_name');
        const isLoggedIn = localStorage.getItem('driver_logged_in');
        
        if (storedName && isLoggedIn === 'true') {
            this.state.isLoggedIn = true;
            this.state.driverName = storedName;
            this.showMainScreen();
        }
    },
    
    login() {
        const nameInput = document.getElementById('driver-name');
        const passwordInput = document.getElementById('driver-password');
        
        const name = nameInput.value.trim();
        const password = passwordInput.value.trim();
        
        const validCredentials = {
            'carlos': 'bus2024',
            'conductor': 'bus2024',
            'admin': 'admin123'
        };
        
        if (!name || !password) {
            this.showError('Complete todos los campos');
            return;
        }
        
        if (validCredentials[name.toLowerCase()] === password) {
            localStorage.setItem('driver_name', name);
            localStorage.setItem('driver_logged_in', 'true');
            
            this.state.isLoggedIn = true;
            this.state.driverName = name;
            
            this.showMainScreen();
        } else {
            this.showError('Credenciales incorrectas');
        }
    },
    
    logout() {
        this.stopGPS();
        
        localStorage.removeItem('driver_name');
        localStorage.removeItem('driver_logged_in');
        
        this.state.isLoggedIn = false;
        this.state.driverName = '';
        
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('driver-main').classList.remove('active');
        
        document.getElementById('driver-name').value = '';
        document.getElementById('driver-password').value = '';
        
        // Reset map
        this.state.map = null;
        this.state.busMarker = null;
    },
    
    showError(message) {
        const existing = document.querySelector('.error-message');
        if (existing) existing.remove();
        
        const form = document.querySelector('.login-form');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        form.insertBefore(errorDiv, form.firstChild);
    },
    
    showMainScreen() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('driver-main').classList.add('active');
        document.getElementById('display-driver-name').textContent = this.state.driverName.toUpperCase();
        
        setTimeout(() => this.initMap(), 100);
    },
    
    initMap() {
        setTimeout(() => {
            const container = document.getElementById('driver-map');
            if (!container || this.state.map) return;
            
            this.state.map = L.map('driver-map', {
                zoomControl: false,
                minZoom: CONFIG.app.minZoom,
                maxZoom: CONFIG.app.maxZoom,
                maxBounds: CONFIG.app.mapBounds,
                attributionControl: false
            }).setView([CONFIG.app.defaultLocation.lat, CONFIG.app.defaultLocation.lng], 15);
            
            this.state.map.setMaxBounds(CONFIG.app.mapBounds);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: CONFIG.app.maxZoom
            }).addTo(this.state.map);
            
            // Plaza marker
            if (CONFIG.plazaPrincipal) {
                L.marker([CONFIG.plazaPrincipal.lat, CONFIG.plazaPrincipal.lng], {
                    icon: L.divIcon({
                        className: 'plaza-marker',
                        html: '<div style="background:linear-gradient(135deg,#FFD700,#FFA500);border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px">⭐</div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                }).addTo(this.state.map).bindPopup('<b>PLAZA PRINCIPAL</b>');
            }
            
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
        
        if (active) {
            statusBox.classList.remove('stopped');
            statusBox.classList.add('active');
            statusBox.querySelector('.status-icon').textContent = '📡';
            statusBox.querySelector('.status-text').textContent = 'GPS ACTIVO';
            statusBox.querySelector('.status-detail').textContent = 'Compartiendo ubicación';
            
            btn.textContent = 'DETENER GPS';
            btn.classList.remove('start');
            btn.classList.add('stop');
        } else {
            statusBox.classList.remove('active');
            statusBox.classList.add('stopped');
            statusBox.querySelector('.status-icon').textContent = '📍';
            statusBox.querySelector('.status-text').textContent = 'GPS DETENIDO';
            statusBox.querySelector('.status-detail').textContent = 'Presiona iniciar';
            
            btn.textContent = 'INICIAR GPS';
            btn.classList.remove('stop');
            btn.classList.add('start');
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
                    driver_name: this.state.driverName,
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