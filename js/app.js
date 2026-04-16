/**
 * Bus Tracker Chaitén - Main Application
 * Mapa fullscreen al abrir, modo conductor accesible
 */

const app = {
    state: {
        currentScreen: 'map-screen',
        supabase: null,
        gpsActive: false,
        watchId: null,
        gpsInterval: null,
        busMarker: null,
        stopMarkers: [],
        lastUpdate: null,
        driverMode: false
    },
    
    elements: {},
    
    init() {
        this.cacheElements();
        this.initSupabase();
        this.initMap();
        this.subscribeToBusLocation();
        
        console.log('✅ App inicializada - Mapa fullscreen activo');
    },
    
    cacheElements() {
        this.elements = {
            driverStatus: document.getElementById('driver-status'),
            driverLat: document.getElementById('driver-lat'),
            driverLng: document.getElementById('driver-lng'),
            toggleGpsBtn: document.getElementById('toggle-gps-btn'),
            connectionStatus: document.getElementById('connection-status'),
            busStatusText: document.getElementById('bus-status-text'),
            busLastUpdate: document.getElementById('bus-last-update'),
            driverModal: document.getElementById('driver-modal'),
            driverMapPreview: document.getElementById('driver-map-preview')
        };
    },
    
    initSupabase() {
        try {
            const supabaseUrl = CONFIG.getSupabaseUrl();
            const supabaseKey = CONFIG.getSupabaseKey();
            
            if (!supabaseUrl || !supabaseKey) {
                console.log('⚠️  Supabase no configurado');
                return false;
            }
            
            this.state.supabase = supabase.createClient(supabaseUrl, supabaseKey);
            console.log('✅ Supabase conectado');
            return true;
        } catch (error) {
            console.error('❌ Error Supabase:', error);
            return false;
        }
    },
    
    // ============================================
    // MAPA PRINCIPAL
    // ============================================
    
    initMap() {
        setTimeout(() => {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;
            
            this.state.map = L.map('map', {
                zoomControl: false  // Ocultar controles de zoom por defecto
            }).setView(
                [CONFIG.app.defaultLocation.lat, CONFIG.app.defaultLocation.lng],
                15
            );
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: false,
                maxZoom: 19
            }).addTo(this.state.map);
            
            L.control.zoom({
                position: 'bottomright'
            }).addTo(this.state.map);
            
            this.addStopMarkers();
            
            setTimeout(() => {
                this.state.map.invalidateSize();
            }, 100);
            
        }, 50);
    },
    
    addStopMarkers() {
        if (!this.state.map) return;
        
        CONFIG.stops.forEach(stop => {
            const marker = L.marker([stop.lat, stop.lng], {
                icon: L.divIcon({
                    className: 'stop-marker',
                    html: `<div style="
                        background: #dc3545;
                        border: 3px solid white;
                        border-radius: 50%;
                        width: 18px;
                        height: 18px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    "></div>`,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            }).addTo(this.state.map);
            
            marker.bindPopup(`<b>${stop.name}</b>`);
            this.state.stopMarkers.push(marker);
        });
    },
    
    // ============================================
    // SUSCRIPCIÓN AL BUS
    // ============================================
    
    subscribeToBusLocation() {
        if (!this.state.supabase) {
            console.log('🔧 Modo Demo activo');
            this.updateBusLocation(CONFIG.app.defaultLocation);
            this.elements.busStatusText.textContent = 'Esperando ubicación...';
            return;
        }
        
        this.fetchBusLocation();
        
        this.state.supabase
            .channel('bus-location')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bus_locations',
                    filter: `bus_id=eq.${CONFIG.app.busId}`
                },
                (payload) => {
                    this.updateBusLocation({
                        lat: payload.new.latitude,
                        lng: payload.new.longitude,
                        timestamp: payload.new.updated_at
                    });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.elements.connectionStatus.textContent = '🟢';
                    this.elements.connectionStatus.title = 'Conectado';
                } else {
                    this.elements.connectionStatus.textContent = '🟡';
                    this.elements.connectionStatus.title = 'Reconectando...';
                }
            });
    },
    
    async fetchBusLocation() {
        try {
            const { data, error } = await this.state.supabase
                .from('bus_locations')
                .select('*')
                .eq('bus_id', CONFIG.app.busId)
                .single();
            
            if (data) {
                this.updateBusLocation({
                    lat: data.latitude,
                    lng: data.longitude,
                    timestamp: data.updated_at
                });
            }
        } catch (err) {
            console.error('Error obteniendo ubicación:', err);
        }
    },
    
    updateBusLocation(location) {
        this.elements.busStatusText.textContent = 'Bus en ruta';
        
        const timeDiff = new Date() - new Date(location.timestamp);
        const minutesAgo = Math.floor(timeDiff / 60000);
        
        if (minutesAgo < 1) {
            this.elements.busLastUpdate.textContent = 'Actualizado: ahora';
        } else if (minutesAgo === 1) {
            this.elements.busLastUpdate.textContent = 'Actualizado: 1 min atrás';
        } else {
            this.elements.busLastUpdate.textContent = `Actualizado: ${minutesAgo} min atrás`;
        }
        
        if (this.state.busMarker) {
            this.state.busMarker.setLatLng([location.lat, location.lng]);
        } else if (this.state.map) {
            this.state.busMarker = L.marker([location.lat, location.lng], {
                icon: L.divIcon({
                    className: 'bus-marker',
                    html: `<div style="
                        background: #0066cc;
                        border: 4px solid white;
                        border-radius: 50%;
                        width: 32px;
                        height: 32px;
                        box-shadow: 0 0 0 3px #0066cc, 0 4px 12px rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                    ">🚌</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            }).addTo(this.state.map);
            
            this.state.busMarker.bindPopup('<b>Bus Chaitén</b>');
        }
    },
    
    centerOnBus() {
        if (this.state.map && this.state.busMarker) {
            const latLng = this.state.busMarker.getLatLng();
            this.state.map.setView(latLng, 17);
            this.state.busMarker.openPopup();
        }
    },
    
    // ============================================
    // MODAL Y MODO CONDUCTOR
    // ============================================
    
    showDriverModal() {
        const modal = document.getElementById('driver-modal');
        modal.classList.add('show');
    },
    
    hideDriverModal() {
        const modal = document.getElementById('driver-modal');
        modal.classList.remove('show');
    },
    
    enterDriverMode() {
        this.hideDriverModal();
        this.state.driverMode = true;
        this.showScreen('driver-screen');
        this.initDriverMap();
    },
    
    exitDriverMode() {
        this.stopGPS();
        this.state.driverMode = false;
        this.showScreen('map-screen');
        setTimeout(() => {
            if (this.state.map) this.state.map.invalidateSize();
        }, 100);
    },
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.state.currentScreen = screenId;
        }
    },
    
    initDriverMap() {
        setTimeout(() => {
            const container = document.getElementById('driver-map-preview');
            if (!container || this.state.driverMap) return;
            
            this.state.driverMap = L.map('driver-map-preview', {
                zoomControl: false,
                attributionControl: false
            }).setView([CONFIG.app.defaultLocation.lat, CONFIG.app.defaultLocation.lng], 14);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(this.state.driverMap);
            
        }, 100);
    },
    
    // ============================================
    // GPS CONDUCTOR
    // ============================================
    
    toggleGPS() {
        if (this.state.gpsActive) {
            this.stopGPS();
        } else {
            this.startGPS();
        }
    },
    
    startGPS() {
        if (!navigator.geolocation) {
            alert('Tu dispositivo no soporta GPS');
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
                this.updateDriverUI(true);
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
        this.updateDriverUI(false);
    },
    
    onGPSUpdate(position) {
        const data = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
        };
        
        this.state.lastUpdate = data;
        this.updateDriverGPSInfo(data);
        
        if (!this.state.gpsActive) {
            this.sendLocationToSupabase(data);
        }
        
        // Actualizar mapa del conductor
        if (this.state.driverMap) {
            const center = [data.lat, data.lng];
            this.state.driverMap.setView(center, 16);
        }
    },
    
    onGPSError(error) {
        const messages = {
            1: 'Permiso de GPS denegado',
            2: 'GPS no disponible',
            3: 'Tiempo agotado'
        };
        console.error('❌ GPS Error:', messages[error.code] || 'Error desconocido');
    },
    
    updateDriverGPSInfo(data) {
        this.elements.driverLat.textContent = data.lat.toFixed(5);
        this.elements.driverLng.textContent = data.lng.toFixed(5);
    },
    
    updateDriverUI(active) {
        const statusBox = this.elements.driverStatus;
        const btn = this.elements.toggleGpsBtn;
        
        if (active) {
            statusBox.classList.remove('stopped');
            statusBox.classList.add('active');
            statusBox.querySelector('.status-icon').textContent = '📡';
            statusBox.querySelector('.status-text').textContent = 'GPS Activo';
            statusBox.querySelector('.status-detail').textContent = 'Compartiendo ubicación';
            
            btn.textContent = 'Detener GPS';
            btn.classList.remove('start');
            btn.classList.add('stop');
        } else {
            statusBox.classList.remove('active');
            statusBox.classList.add('stopped');
            statusBox.querySelector('.status-icon').textContent = '📍';
            statusBox.querySelector('.status-text').textContent = 'GPS Detenido';
            statusBox.querySelector('.status-detail').textContent = 'Presiona iniciar';
            
            btn.textContent = 'Iniciar GPS';
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
                    updated_at: data.timestamp
                }, { onConflict: 'bus_id' });
            
            console.log('✅ Ubicación enviada');
        } catch (err) {
            console.error('❌ Error enviando:', err);
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});