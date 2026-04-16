/**
 * Bus Tracker Chaitén - Passenger App
 * Minimal dark theme - Estilo CLI
 */

const app = {
    state: {
        supabase: null,
        map: null,
        busMarker: null,
        hasBusLocation: false,
        connectionStatus: 'connecting',
        // Estado de movimiento
        isMoving: false,
        lastPosition: null,
        lastMoveTime: null,
        stillThreshold: 5000, // 5 segundos para considerar que está detenido
        distanceThreshold: 0.0001 // ~10 metros en coordenadas
    },
    
    init() {
        this.initSupabase();
        this.initMap();
        this.subscribeToBusLocation();
        console.log('🚌 Bus Chaitén - Passenger App');
    },
    
    initSupabase() {
        try {
            const supabaseUrl = CONFIG.getSupabaseUrl();
            const supabaseKey = CONFIG.getSupabaseKey();
            
            if (!supabaseUrl || !supabaseKey) {
                this.setConnectionStatus('disconnected');
                return false;
            }
            
            this.state.supabase = supabase.createClient(supabaseUrl, supabaseKey);
            return true;
        } catch (error) {
            console.error('Error:', error);
            this.setConnectionStatus('disconnected');
            return false;
        }
    },
    
    initMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }
        
        // Coordenadas de Chaitén (plaza central)
        const chaitenCenter = [-42.9150, -72.7167];
        
        console.log('Inicializando mapa en Chaitén:', chaitenCenter);
        
        // Crear el mapa con límites definidos
        this.state.map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            minZoom: CONFIG.app.minZoom,
            maxZoom: CONFIG.app.maxZoom
        });
        
        // Establecer límites del área (aprox 15 km alrededor de Chaitén)
        this.state.map.setMaxBounds(CONFIG.app.maxBounds);
        
        // Establecer vista inicial
        this.state.map.setView(chaitenCenter, 15);
        
        // Agregar tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: ''
        }).addTo(this.state.map);
        
        // Agregar marcador de plaza
        this.addPlazaMarker();
        
        // Forzar actualización de tamaño
        setTimeout(() => {
            this.state.map.invalidateSize();
            console.log('Mapa inicializado en:', this.state.map.getCenter());
        }, 100);
    },
    
    addPlazaMarker() {
        // Plaza de Chaitén
        const plazaLat = -42.9150;
        const plazaLng = -72.7167;
        
        L.marker([plazaLat, plazaLng], {
            icon: L.divIcon({
                className: 'plaza-marker',
                html: `
                    <div style="
                        background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                        border: 2px solid #fff;
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                    ">⭐</div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(this.state.map).bindPopup(`<b>PLAZA PRINCIPAL</b><br>Centro de Chaitén`);
    },
    
    subscribeToBusLocation() {
        if (!this.state.supabase) {
            this.setBusStatus('Sin conexión', '-');
            this.setConnectionStatus('disconnected');
            return;
        }
        
        this.setConnectionStatus('connecting');
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
                    console.log('Ubicación actualizada:', payload.new);
                    this.updateBusLocation({
                        lat: payload.new.latitude,
                        lng: payload.new.longitude,
                        timestamp: payload.new.updated_at
                    });
                }
            )
            .subscribe((status) => {
                console.log('Estado de conexión:', status);
                if (status === 'SUBSCRIBED') {
                    this.setConnectionStatus('connected');
                } else {
                    this.setConnectionStatus('connecting');
                }
            });
    },
    
    async fetchBusLocation() {
        try {
            const { data } = await this.state.supabase
                .from('bus_locations')
                .select('*')
                .eq('bus_id', CONFIG.app.busId)
                .single();
            
            if (data) {
                console.log('Datos del bus obtenidos:', data);
                this.updateBusLocation({
                    lat: data.latitude,
                    lng: data.longitude,
                    timestamp: data.updated_at
                });
            } else {
                this.setBusStatus('Sin datos', 'Esperando...');
            }
        } catch (err) {
            console.error('Error:', err);
            this.setBusStatus('Sin señal', '-');
        }
    },
    
    updateBusLocation(location) {
        const wasFirstUpdate = !this.state.hasBusLocation;
        this.state.hasBusLocation = true;
        
        // Detectar estado de movimiento
        this.detectMovement(location);
        
        // Mostrar estado
        const statusText = this.state.isMoving ? '🚌 En movimiento' : '⏹️ Detenido';
        this.setBusStatus(statusText, this.formatTime(location.timestamp));
        this.showCenterButton();
        
        if (this.state.busMarker) {
            this.state.busMarker.setLatLng([location.lat, location.lng]);
            this.state.busMarker.setPopupContent(this.getBusPopup(location.timestamp));
            
            // Actualizar color del marcador según estado
            this.updateBusMarkerStyle(this.state.isMoving);
        } else if (this.state.map) {
            this.state.busMarker = L.marker([location.lat, location.lng], {
                icon: L.divIcon({
                    className: 'bus-marker',
                    html: `
                        <div style="
                            background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                            border: 3px solid #fff;
                            border-radius: 50%;
                            width: 36px;
                            height: 36px;
                            box-shadow: 0 4px 16px rgba(0, 102, 204, 0.5);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 18px;
                        ">🚌</div>
                    `,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18]
                })
            }).addTo(this.state.map);
            
            this.state.busMarker.bindPopup(this.getBusPopup(location.timestamp));
            
            // Si es la primera vez que se recibe ubicación, centrar automáticamente
            if (wasFirstUpdate) {
                setTimeout(() => {
                    this.state.map.setView([location.lat, location.lng], 16, {
                        animate: true,
                        duration: 0.5
                    });
                }, 300);
            }
        }
    },
    
    // Detectar si el bus está en movimiento o detenido
    detectMovement(location) {
        const now = Date.now();
        
        if (this.state.lastPosition) {
            // Calcular distancia desde última posición
            const latDiff = Math.abs(location.lat - this.state.lastPosition.lat);
            const lngDiff = Math.abs(location.lng - this.state.lastPosition.lng);
            const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
            
            // Si se movió más allá del umbral, está en movimiento
            if (distance > this.state.distanceThreshold) {
                this.state.isMoving = true;
                this.state.lastMoveTime = now;
            } else {
                // Verificar si ha estado sin moverse por más de X segundos
                if (this.state.lastMoveTime && (now - this.state.lastMoveTime) > this.state.stillThreshold) {
                    this.state.isMoving = false;
                }
            }
        }
        
        // Actualizar última posición
        this.state.lastPosition = { lat: location.lat, lng: location.lng };
        
        if (!this.state.lastMoveTime) {
            this.state.lastMoveTime = now;
        }
    },
    
    // Actualizar estilo del marcador según estado
    updateBusMarkerStyle(isMoving) {
        if (!this.state.busMarker) return;
        
        const color = isMoving ? '#0066cc' : '#ffaa00';
        const shadow = isMoving ? 'rgba(0, 102, 204, 0.5)' : 'rgba(255, 170, 0, 0.5)';
        
        this.state.busMarker.setIcon(L.divIcon({
            className: 'bus-marker',
            html: `
                <div style="
                    background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
                    border: 3px solid #fff;
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    box-shadow: 0 4px 16px ${shadow};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                ">🚌</div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        }));
    },
    
    getBusPopup(timestamp) {
        const time = this.formatTime(timestamp);
        return `<b>Bus Chaitén</b><br><span style="color:#888">Actualizado: ${time}</span>`;
    },
    
    formatTime(timestamp) {
        if (!timestamp) return '-';
        const diff = new Date() - new Date(timestamp);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'ahora';
        if (mins === 1) return '1 min';
        if (mins < 60) return `${mins} min`;
        return 'hace tiempo';
    },
    
    setBusStatus(status, time) {
        const statusEl = document.getElementById('bus-status-text');
        const timeEl = document.getElementById('bus-last-update');
        if (statusEl) statusEl.textContent = status;
        if (timeEl) timeEl.textContent = time;
    },
    
    setConnectionStatus(status) {
        this.state.connectionStatus = status;
        const pill = document.getElementById('connection-status');
        if (pill) {
            pill.className = `status-pill ${status}`;
            const text = pill.querySelector('.status-text');
            if (text) {
                const labels = {
                    'connected': 'EN LÍNEA',
                    'disconnected': 'OFFLINE',
                    'connecting': 'CONECTANDO'
                };
                text.textContent = labels[status] || status;
            }
        }
    },
    
    showCenterButton() {
        const btn = document.getElementById('center-btn');
        if (btn) btn.classList.remove('hidden');
    },
    
    centerOnBus() {
        if (this.state.map && this.state.busMarker) {
            const busLatLng = this.state.busMarker.getLatLng();
            
            // Obtener el centro actual de la vista del usuario
            const currentCenter = this.state.map.getCenter();
            
            // Calcular el desplazamiento necesario para centrar el bus
            const latDiff = busLatLng.lat - currentCenter.lat;
            const lngDiff = busLatLng.lng - currentCenter.lng;
            
            console.log('Centrando bus - Bus:', busLatLng, 'Centro actual:', currentCenter);
            
            // Centrar el mapa en el bus con animación
            this.state.map.setView([busLatLng.lat, busLatLng.lng], 17, {
                animate: true,
                duration: 0.5
            });
            
            // Abrir popup después de un pequeño delay para que centrarse complete
            setTimeout(() => {
                if (this.state.busMarker) {
                    this.state.busMarker.openPopup();
                }
            }, 600);
        } else {
            console.log('No hay bus para centrar');
        }
    },
    
    zoomIn() {
        if (this.state.map) {
            this.state.map.zoomIn(1, { animate: true });
        }
    },
    
    zoomOut() {
        if (this.state.map) {
            this.state.map.zoomOut(1, { animate: true });
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});