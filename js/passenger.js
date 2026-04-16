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
        connectionStatus: 'connecting'
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
        setTimeout(() => {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;
            
            this.state.map = L.map('map', {
                zoomControl: false,
                minZoom: CONFIG.app.minZoom,
                maxZoom: CONFIG.app.maxZoom,
                maxBounds: CONFIG.app.mapBounds,
                maxBoundsViscosity: 1.0,
                attributionControl: false
            }).setView(
                [CONFIG.app.defaultLocation.lat, CONFIG.app.defaultLocation.lng],
                16
            );
            
            this.state.map.setMaxBounds(CONFIG.app.mapBounds);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: CONFIG.app.maxZoom,
                attribution: ''
            }).addTo(this.state.map);
            
            // Add plaza marker
            this.addPlazaMarker();
            
            setTimeout(() => {
                if (this.state.map) this.state.map.invalidateSize();
            }, 100);
            
        }, 50);
    },
    
    addPlazaMarker() {
        if (!this.state.map || !CONFIG.plazaPrincipal) return;
        
        const plaza = CONFIG.plazaPrincipal;
        
        L.marker([plaza.lat, plaza.lng], {
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
                    this.updateBusLocation({
                        lat: payload.new.latitude,
                        lng: payload.new.longitude,
                        timestamp: payload.new.updated_at
                    });
                }
            )
            .subscribe((status) => {
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
        this.state.hasBusLocation = true;
        
        this.setBusStatus('🚌 En ruta', this.formatTime(location.timestamp));
        this.showCenterButton();
        
        if (this.state.busMarker) {
            this.state.busMarker.setLatLng([location.lat, location.lng]);
            this.state.busMarker.setPopupContent(this.getBusPopup(location.timestamp));
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
        }
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
            const latLng = this.state.busMarker.getLatLng();
            this.state.map.setView(latLng, 17, { animate: true, duration: 0.5 });
            this.state.busMarker.openPopup();
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

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});