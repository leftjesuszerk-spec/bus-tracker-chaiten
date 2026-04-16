/**
 * Bus Tracker Chaitén - Passenger App (Solo Mapa)
 */

const app = {
    state: {
        supabase: null,
        map: null,
        busMarker: null,
        connectionStatus: 'desconectado'
    },
    
    elements: {},
    
    init() {
        this.cacheElements();
        this.initSupabase();
        this.initMap();
        this.subscribeToBusLocation();
        
        console.log('App乘客 - Mapa activo');
    },
    
    cacheElements() {
        this.elements = {
            connectionStatus: document.getElementById('connection-status'),
            busStatusText: document.getElementById('bus-status-text'),
            busLastUpdate: document.getElementById('bus-last-update')
        };
    },
    
    initSupabase() {
        try {
            const supabaseUrl = CONFIG.getSupabaseUrl();
            const supabaseKey = CONFIG.getSupabaseKey();
            
            if (!supabaseUrl || !supabaseKey) {
                console.log('Supabase no configurado');
                return false;
            }
            
            this.state.supabase = supabase.createClient(supabaseUrl, supabaseKey);
            console.log('Supabase conectado');
            return true;
        } catch (error) {
            console.error('Error:', error);
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
                maxBoundsViscosity: 1.0
            }).setView(
                [CONFIG.app.defaultLocation.lat, CONFIG.app.defaultLocation.lng],
                15
            );
            
            this.state.map.setMaxBounds(CONFIG.app.mapBounds);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: false,
                maxZoom: CONFIG.app.maxZoom
            }).addTo(this.state.map);
            
            L.control.zoom({
                position: 'bottomright'
            }).addTo(this.state.map);
            
            // Mostrar Plaza Principal
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
                        background: #FFD700;
                        border: 4px solid #FF6B35;
                        border-radius: 50%;
                        width: 60px;
                        height: 60px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 9px;
                        color: #333;
                        text-align: center;
                        line-height: 1.1;
                        font-family: Arial, sans-serif;
                        text-transform: uppercase;
                    ">
                        ⭐<br>PLAZA
                    </div>
                `,
                iconSize: [60, 60],
                iconAnchor: [30, 30]
            })
        }).addTo(this.state.map).bindPopup(`<b>${plaza.name}</b><br>${plaza.description}`);
    },
    
    subscribeToBusLocation() {
        if (!this.state.supabase) {
            console.log('Modo Demo');
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
                    this.state.connectionStatus = 'conectado';
                } else {
                    this.elements.connectionStatus.textContent = '🟡';
                    this.state.connectionStatus = 'reconectando';
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
            }
        } catch (err) {
            console.error('Error:', err);
        }
    },
    
    updateBusLocation(location) {
        this.elements.busStatusText.textContent = '🚌 Bus en ruta';
        
        const timeDiff = new Date() - new Date(location.timestamp);
        const minutesAgo = Math.floor(timeDiff / 60000);
        
        if (minutesAgo < 1) {
            this.elements.busLastUpdate.textContent = 'Actualizado: ahora';
        } else if (minutesAgo === 1) {
            this.elements.busLastUpdate.textContent = 'Actualizado: 1 min';
        } else {
            this.elements.busLastUpdate.textContent = `Actualizado: ${minutesAgo} min`;
        }
        
        if (this.state.busMarker) {
            this.state.busMarker.setLatLng([location.lat, location.lng]);
        } else if (this.state.map) {
            this.state.busMarker = L.marker([location.lat, location.lng], {
                icon: L.divIcon({
                    className: 'bus-marker',
                    html: `
                        <div style="
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
                        ">🚌</div>
                    `,
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
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});