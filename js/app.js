/**
 * Bus Tracker Chaitén - Main Application
 * 
 * Aplicación principal que maneja:
 * - Navegación entre pantallas
 * - GPS del conductor
 * - Mapa para pasajeros
 * - Comunicación con Supabase
 */

const app = {
    // Estado de la aplicación
    state: {
        currentScreen: 'role-selector',
        role: null, // 'driver' o 'passenger'
        supabase: null,
        gpsActive: false,
        watchId: null,
        gpsInterval: null,
        busMarker: null,
        stopMarkers: [],
        lastUpdate: null,
        connectionError: null
    },
    
    // Referencias a elementos del DOM
    elements: {},
    
    // Inicialización
    init() {
        this.cacheElements();
        this.checkConfig();
        
        // Si ya está configurado, inicializar Supabase
        if (CONFIG.isConfigured()) {
            this.initSupabase();
        }
        
        console.log('App inicializada');
    },
    
    // Cachear referencias a elementos del DOM
    cacheElements() {
        this.elements = {
            driverStatus: document.getElementById('driver-status'),
            driverInfo: document.getElementById('driver-info'),
            driverLat: document.getElementById('driver-lat'),
            driverLng: document.getElementById('driver-lng'),
            driverTime: document.getElementById('driver-time'),
            driverAccuracy: document.getElementById('driver-accuracy'),
            toggleGpsBtn: document.getElementById('toggle-gps-btn'),
            connectionStatus: document.getElementById('connection-status'),
            busStatusText: document.getElementById('bus-status-text'),
            busLastUpdate: document.getElementById('bus-last-update'),
            scheduleList: document.getElementById('schedule-list')
        };
    },
    
    // Verificar configuración
    checkConfig() {
        if (!CONFIG.isConfigured()) {
            // Mostrar mensaje en pantalla inicial
            const roleSelector = document.getElementById('role-selector');
            const warning = document.createElement('div');
            warning.className = 'error-message';
            warning.innerHTML = `
                ⚠️ <strong>Configuración requerida</strong><br>
                Presiona el botón ⚙️ para configurar Supabase
            `;
            roleSelector.appendChild(warning);
        }
    },
    
    // Inicializar conexión con Supabase
    initSupabase() {
        try {
            const supabaseUrl = CONFIG.getSupabaseUrl();
            const supabaseKey = CONFIG.getSupabaseKey();
            
            if (!supabaseUrl || !supabaseKey) {
                console.log('Supabase no configurado');
                return false;
            }
            
            // Crear cliente Supabase
            this.state.supabase = supabase.createClient(supabaseUrl, supabaseKey);
            
            console.log('Supabase inicializado');
            return true;
        } catch (error) {
            console.error('Error inicializando Supabase:', error);
            this.showError('Error conectando a Supabase');
            return false;
        }
    },
    
    // Navegación - Seleccionar rol
    selectRole(role) {
        if (!CONFIG.isConfigured() && role === 'passenger') {
            // Si no está configurado y es pasajero, mostrar error
            alert('Por favor configura Supabase primero (botón ⚙️)');
            return;
        }
        
        this.state.role = role;
        
        if (role === 'driver') {
            this.showScreen('driver-screen');
        } else {
            this.showScreen('passenger-screen');
            this.initMap();
            this.subscribeToBusLocation();
            this.renderSchedule();
        }
    },
    
    // Navegación - Volver atrás
    goBack() {
        // Detener GPS si está activo
        if (this.state.gpsActive) {
            this.stopGPS();
        }
        
        // Desuscribirse de Supabase
        if (this.state.supabase) {
            this.state.supabase.removeAllChannels();
        }
        
        this.state.role = null;
        this.showScreen('role-selector');
    },
    
    // Mostrar pantalla
    showScreen(screenId) {
        // Ocultar todas las pantallas
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Mostrar pantalla seleccionada
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.state.currentScreen = screenId;
        }
    },
    
    // Mostrar configuración
    showConfig() {
        // Cargar valores actuales
        document.getElementById('supabase-url').value = CONFIG.getSupabaseUrl();
        document.getElementById('supabase-key').value = CONFIG.getSupabaseKey();
        
        this.showScreen('config-screen');
    },
    
    // Guardar configuración
    saveConfig() {
        const url = document.getElementById('supabase-url').value.trim();
        const key = document.getElementById('supabase-key').value.trim();
        
        if (!url || !key) {
            alert('Por favor completa ambos campos');
            return;
        }
        
        // Validar URL
        if (!url.startsWith('https://') || !url.includes('supabase.co')) {
            alert('La URL debe ser de Supabase (https://xxxx.supabase.co)');
            return;
        }
        
        // Guardar
        CONFIG.setSupabaseUrl(url);
        CONFIG.setSupabaseKey(key);
        
        // Reinicializar Supabase
        this.initSupabase();
        
        alert('Configuración guardada correctamente');
        this.goBack();
    },
    
    // ============================================
    // MÓDULO DEL CONDUCTOR
    // ============================================
    
    // Alternar GPS
    toggleGPS() {
        if (this.state.gpsActive) {
            this.stopGPS();
        } else {
            this.startGPS();
        }
    },
    
    // Iniciar GPS
    startGPS() {
        if (!navigator.geolocation) {
            alert('Tu dispositivo no soporta geolocalización');
            return;
        }
        
        // Verificar permisos
        navigator.permissions?.query({ name: 'geolocation' }).then(result => {
            if (result.state === 'denied') {
                alert('Por favor permite el acceso a ubicación en la configuración de tu navegador');
                return;
            }
        });
        
        // Solicitar ubicación inmediata
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.onGPSUpdate(position);
                
                // Iniciar watching continuo (para mejor precisión)
                this.state.watchId = navigator.geolocation.watchPosition(
                    (pos) => this.onGPSUpdate(pos),
                    (err) => this.onGPSError(err),
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
                
                // Enviar a Supabase cada 30 segundos
                this.state.gpsInterval = setInterval(() => {
                    if (this.state.lastUpdate) {
                        this.sendLocationToSupabase(this.state.lastUpdate);
                    }
                }, CONFIG.app.updateInterval);
                
                this.state.gpsActive = true;
                this.updateDriverUI(true);
                
            },
            (error) => {
                this.onGPSError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    },
    
    // Detener GPS
    stopGPS() {
        // Detener watching
        if (this.state.watchId !== null) {
            navigator.geolocation.clearWatch(this.state.watchId);
            this.state.watchId = null;
        }
        
        // Detener intervalo
        if (this.state.gpsInterval) {
            clearInterval(this.state.gpsInterval);
            this.state.gpsInterval = null;
        }
        
        this.state.gpsActive = false;
        this.updateDriverUI(false);
    },
    
    // Callback de actualización GPS
    onGPSUpdate(position) {
        const data = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
        };
        
        this.state.lastUpdate = data;
        
        // Actualizar UI inmediatamente
        this.updateDriverGPSInfo(data);
        
        // Enviar a Supabase inmediatamente la primera vez
        if (!this.state.gpsActive) {
            this.sendLocationToSupabase(data);
        }
        
        // Actualizar indicador de señal
        this.updateSignalStrength(position.coords.accuracy);
        
        console.log('GPS actualizado:', data);
    },
    
    // Error de GPS
    onGPSError(error) {
        let message = 'Error obteniendo ubicación';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'Permiso de ubicación denegado';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Ubicación no disponible';
                break;
            case error.TIMEOUT:
                message = 'Tiempo de espera agotado';
                break;
        }
        
        console.error('Error GPS:', error);
        this.showError(message);
    },
    
    // Actualizar información del GPS en UI
    updateDriverGPSInfo(data) {
        this.elements.driverLat.textContent = data.lat.toFixed(6);
        this.elements.driverLng.textContent = data.lng.toFixed(6);
        this.elements.driverTime.textContent = new Date(data.timestamp).toLocaleTimeString();
        this.elements.driverAccuracy.textContent = `${Math.round(data.accuracy)}m`;
        
        this.elements.driverInfo.classList.remove('hidden');
    },
    
    // Actualizar UI del conductor
    updateDriverUI(active) {
        const statusBox = this.elements.driverStatus;
        const btn = this.elements.toggleGpsBtn;
        
        if (active) {
            statusBox.classList.remove('stopped');
            statusBox.classList.add('active');
            statusBox.querySelector('.status-icon').textContent = '📡';
            statusBox.querySelector('.status-text').textContent = 'GPS Activo';
            statusBox.querySelector('.status-detail').textContent = 'Compartiendo ubicación cada 30 segundos';
            
            btn.textContent = 'Detener GPS';
            btn.classList.remove('start');
            btn.classList.add('stop');
        } else {
            statusBox.classList.remove('active');
            statusBox.classList.add('stopped');
            statusBox.querySelector('.status-icon').textContent = '📍';
            statusBox.querySelector('.status-text').textContent = 'GPS Detenido';
            statusBox.querySelector('.status-detail').textContent = 'Presiona Iniciar para compartir ubicación';
            
            btn.textContent = 'Iniciar GPS';
            btn.classList.remove('stop');
            btn.classList.add('start');
            
            // Resetear barras de señal
            document.querySelectorAll('.signal-bar').forEach(bar => {
                bar.classList.remove('active');
            });
        }
    },
    
    // Actualizar indicador de señal
    updateSignalStrength(accuracy) {
        const bars = document.querySelectorAll('.signal-bar');
        let activeBars = 1;
        
        if (accuracy < 10) activeBars = 4;
        else if (accuracy < 20) activeBars = 3;
        else if (accuracy < 50) activeBars = 2;
        
        bars.forEach((bar, index) => {
            if (index < activeBars) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
    },
    
    // Enviar ubicación a Supabase
    async sendLocationToSupabase(data) {
        if (!this.state.supabase) {
            console.log('Supabase no inicializado, no se puede enviar');
            return;
        }
        
        try {
            const { error } = await this.state.supabase
                .from('bus_locations')
                .upsert({
                    bus_id: CONFIG.app.busId,
                    latitude: data.lat,
                    longitude: data.lng,
                    accuracy: data.accuracy,
                    updated_at: data.timestamp
                }, {
                    onConflict: 'bus_id'
                });
            
            if (error) {
                console.error('Error enviando a Supabase:', error);
                this.showError('Error de conexión con el servidor');
            } else {
                console.log('Ubicación enviada correctamente');
            }
        } catch (err) {
            console.error('Excepción enviando a Supabase:', err);
            this.showError('Error de red');
        }
    },
    
    // ============================================
    // MÓDULO DEL PASAJERO
    // ============================================
    
    // Inicializar mapa
    initMap() {
        // Esperar a que el DOM esté listo
        setTimeout(() => {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;
            
            // Crear mapa centrado en Chaitén
            this.state.map = L.map('map').setView(
                [CONFIG.app.defaultLocation.lat, CONFIG.app.defaultLocation.lng],
                15
            );
            
            // Añadir capa de OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.state.map);
            
            // Añadir marcadores de paradas
            this.addStopMarkers();
            
            // Intentar obtener ubicación actual del pasajero
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        
                        // Añadir marcador de ubicación del pasajero
                        L.marker([lat, lng], {
                            icon: L.divIcon({
                                className: 'passenger-location',
                                html: '📍',
                                iconSize: [30, 30],
                                iconAnchor: [15, 30]
                            })
                        }).addTo(this.state.map).bindPopup('Tu ubicación');
                    },
                    (error) => {
                        console.log('No se pudo obtener ubicación del pasajero:', error);
                    }
                );
            }
            
            // Forzar resize del mapa
            setTimeout(() => {
                this.state.map.invalidateSize();
            }, 100);
            
        }, 100);
    },
    
    // Añadir marcadores de paradas
    addStopMarkers() {
        CONFIG.stops.forEach(stop => {
            const marker = L.marker([stop.lat, stop.lng], {
                icon: L.divIcon({
                    className: 'stop-marker',
                    html: `<div style="
                        background: #dc3545;
                        border: 3px solid white;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    "></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(this.state.map);
            
            marker.bindPopup(`
                <b>${stop.name}</b><br>
                ${stop.description}
            `);
            
            this.state.stopMarkers.push(marker);
        });
    },
    
    // Suscribirse a actualizaciones del bus
    subscribeToBusLocation() {
        if (!this.state.supabase) {
            console.log('Supabase no configurado, usando modo demo');
            // Modo demo: mostrar bus en ubicación por defecto
            this.updateBusLocation(CONFIG.app.defaultLocation);
            this.elements.busStatusText.textContent = 'Modo Demo - Configure Supabase';
            this.elements.connectionStatus.textContent = '🟡 Demo';
            this.elements.connectionStatus.style.background = 'rgba(255, 193, 7, 0.3)';
            return;
        }
        
        // Obtener última ubicación
        this.fetchBusLocation();
        
        // Suscribirse a cambios en tiempo real
        const channel = this.state.supabase
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
                    console.log('Actualización recibida:', payload);
                    this.updateBusLocation({
                        lat: payload.new.latitude,
                        lng: payload.new.longitude,
                        timestamp: payload.new.updated_at
                    });
                }
            )
            .subscribe((status) => {
                console.log('Estado de suscripción:', status);
                if (status === 'SUBSCRIBED') {
                    this.elements.connectionStatus.textContent = '🟢 Conectado';
                    this.elements.connectionStatus.style.background = 'rgba(40, 167, 69, 0.3)';
                } else {
                    this.elements.connectionStatus.textContent = '🔴 Desconectado';
                    this.elements.connectionStatus.style.background = 'rgba(220, 53, 69, 0.3)';
                }
            });
    },
    
    // Obtener ubicación actual del bus
    async fetchBusLocation() {
        try {
            const { data, error } = await this.state.supabase
                .from('bus_locations')
                .select('*')
                .eq('bus_id', CONFIG.app.busId)
                .single();
            
            if (error) {
                console.log('No hay datos previos del bus:', error);
                return;
            }
            
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
    
    // Actualizar marcador del bus en el mapa
    updateBusLocation(location) {
        // Actualizar info
        this.elements.busStatusText.textContent = 'Bus en ruta';
        
        const timeDiff = new Date() - new Date(location.timestamp);
        const minutesAgo = Math.floor(timeDiff / 60000);
        
        if (minutesAgo < 1) {
            this.elements.busLastUpdate.textContent = 'Actualizado hace menos de 1 minuto';
        } else if (minutesAgo === 1) {
            this.elements.busLastUpdate.textContent = 'Actualizado hace 1 minuto';
        } else {
            this.elements.busLastUpdate.textContent = `Actualizado hace ${minutesAgo} minutos`;
        }
        
        // Actualizar o crear marcador
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
                        width: 30px;
                        height: 30px;
                        box-shadow: 0 0 0 3px #0066cc, 0 4px 10px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                    ">🚌</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(this.state.map);
            
            this.state.busMarker.bindPopup('<b>Bus Chaitén</b><br>En ruta');
        }
        
        // Efecto de actualización
        this.elements.busStatusText.parentElement.parentElement.classList.add('updating');
        setTimeout(() => {
            this.elements.busStatusText.parentElement.parentElement.classList.remove('updating');
        }, 1000);
    },
    
    // Centrar mapa en el bus
    centerOnBus() {
        if (this.state.map && this.state.busMarker) {
            const latLng = this.state.busMarker.getLatLng();
            this.state.map.setView(latLng, 17);
            this.state.busMarker.openPopup();
        }
    },
    
    // Renderizar horarios
    renderSchedule() {
        const html = CONFIG.schedule.map(item => `
            <div class="schedule-item">
                <span>${item.time}</span>
                <span>${item.route}</span>
            </div>
        `).join('');
        
        this.elements.scheduleList.innerHTML = html;
    },
    
    // ============================================
    // UTILIDADES
    // ============================================
    
    // Mostrar error temporal
    showError(message) {
        console.error(message);
        // Podríamos mostrar un toast notification aquí
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});