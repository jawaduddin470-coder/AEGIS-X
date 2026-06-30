import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Incident, Resource, SimulationTick } from '../utils/api';
import { useTranslation } from '../utils/i18n';

interface DangerZone {
  name: string;
  color: string;
  radius_km: number;
  population: number;
  buildings: number;
}

interface MapComponentProps {
  incidents: Incident[];
  resources: Resource[];
  activeSimulation: SimulationTick | null;
  onMapClick?: (lat: number, lng: number) => void;
  selectedIncident?: Incident | null;
  dangerZones?: DangerZone[];
}

export const MapComponent: React.FC<MapComponentProps> = ({
  incidents,
  resources,
  activeSimulation,
  onMapClick,
  selectedIncident,
  dangerZones
}) => {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [key: string]: maplibregl.Marker }>({});
  
  // Digital Twin View Mode State
  const [viewMode, setViewMode] = useState<'normal' | 'traffic' | 'emergency' | 'heatmap'>('normal');

  // 1. Initialize Map centered on Hyderabad
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Hyderabad Madhapur IT Corridor default center
    const center: [number, number] = [78.3741, 17.4483];

    // Simple custom OSM style to avoid Mapbox token issues
    const styleSpec: any = {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleSpec,
      center: center,
      zoom: 14,
      pitch: 45, // 3D tilt
      bearing: -15
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: true }));

    // Click handler for reporting incidents
    map.current.on('click', (e) => {
      if (onMapClick) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    });

    // Add layers on load
    map.current.on('load', () => {
      addThreeJsLayer();
      setupSimulationLayers();
      setupDigitalTwinLayers();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 2. Adjust Map View when selected incident changes
  useEffect(() => {
    if (!map.current || !selectedIncident) return;
    map.current.flyTo({
      center: [selectedIncident.longitude, selectedIncident.latitude],
      zoom: 16,
      pitch: 60,
      essential: true
    });
  }, [selectedIncident]);

  // 3. Render Incidents and Resources Markers and Interpolate Movement
  useEffect(() => {
    if (!map.current) return;

    const activeIds = new Set<string>();

    // Animation helper for smooth marker transitions
    const animateMarker = (marker: maplibregl.Marker, startCoords: [number, number], endCoords: [number, number]) => {
      const duration = 950; // 950ms transition
      const startTime = performance.now();

      const frame = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad

        const lng = startCoords[0] + (endCoords[0] - startCoords[0]) * ease;
        const lat = startCoords[1] + (endCoords[1] - startCoords[1]) * ease;

        marker.setLngLat([lng, lat]);

        if (t < 1) {
          requestAnimationFrame(frame);
        }
      };

      requestAnimationFrame(frame);
    };
    
    // Render Incidents Markers
    incidents.forEach((inc) => {
      const markerId = `incident-${inc.id}`;
      activeIds.add(markerId);

      if (markers.current[markerId]) {
        const currentMarker = markers.current[markerId];
        const oldLngLat = currentMarker.getLngLat();
        const start: [number, number] = [oldLngLat.lng, oldLngLat.lat];
        const end: [number, number] = [inc.longitude, inc.latitude];

        if (start[0] !== end[0] || start[1] !== end[1]) {
          animateMarker(currentMarker, start, end);
        }
      } else {
        const el = document.createElement('div');
        el.className = 'relative flex items-center justify-center';
        
        let color = '#E63946'; // default
        if (inc.type === 'Flood') color = '#4A90E2';
        if (inc.type === 'Stampede') color = '#9D4EDD';
        if (inc.type === 'Building Collapse') color = '#F4A261';
        if (inc.type === 'Chemical Leak') color = '#20C997';

        el.innerHTML = `
          <div class="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-125" style="background-color: ${color}">
            <span class="text-white text-xs font-bold">${inc.type[0]}</span>
          </div>
          <div class="absolute -top-1 -right-1 h-3 w-3 rounded-full animate-ping" style="background-color: ${color}"></div>
        `;

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2 font-sans">
            <h3 class="font-bold text-[#1E3A5F] text-sm">${inc.type} Incident</h3>
            <p class="text-xs text-slate-600 mt-1">${inc.description}</p>
            <div class="mt-2 flex gap-1">
              <span class="px-1.5 py-0.5 text-[10px] font-bold rounded text-white" style="background-color: ${inc.severity === 'Critical' ? '#E63946' : '#F4A261'}">${inc.severity}</span>
              <span class="px-1.5 py-0.5 text-[10px] bg-slate-100 rounded text-slate-700 border">${inc.status}</span>
            </div>
          </div>
        `);

        markers.current[markerId] = new maplibregl.Marker({ element: el })
          .setLngLat([inc.longitude, inc.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });

    // Render Resources Markers
    resources.forEach((res) => {
      const markerId = `resource-${res.id}`;
      activeIds.add(markerId);

      if (markers.current[markerId]) {
        const currentMarker = markers.current[markerId];
        const oldLngLat = currentMarker.getLngLat();
        const start: [number, number] = [oldLngLat.lng, oldLngLat.lat];
        const end: [number, number] = [res.longitude, res.latitude];

        if (start[0] !== end[0] || start[1] !== end[1]) {
          animateMarker(currentMarker, start, end);
        }
      } else {
        const el = document.createElement('div');
        el.className = 'relative flex items-center justify-center';
        
        let bgColor = '#2E8B57'; // Hospital green
        let symbol = '🏥';
        if (res.type === 'Ambulance') { bgColor = '#E63946'; symbol = '🚑'; }
        if (res.type === 'Fire Truck') { bgColor = '#F4A261'; symbol = '🚒'; }
        if (res.type === 'Police Vehicle') { bgColor = '#0F2D52'; symbol = '🚓'; }
        if (res.type === 'Shelter') { bgColor = '#4A90E2'; symbol = '🏠'; }
        if (res.type === 'Fire Station') { bgColor = '#EE6B76'; symbol = '🚒'; }
        if (res.type === 'Police Station') { bgColor = '#226BBF'; symbol = '🚓'; }

        el.innerHTML = `
          <div class="h-7 w-7 rounded border border-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300" style="background-color: ${bgColor}">
            <span class="text-sm">${symbol}</span>
          </div>
          <div class="absolute -bottom-1 px-1 py-0.2 bg-white border rounded text-[8px] font-bold text-slate-800 shadow-sm whitespace-nowrap">
            ${res.status}
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2 font-sans">
            <h3 class="font-bold text-[#1E3A5F] text-sm">${res.name}</h3>
            <p class="text-xs text-slate-600">Type: ${res.type} | Status: ${res.status}</p>
            ${res.capacity ? `<p class="text-[10px] text-slate-500 mt-1">Capacity: ${res.capacity}/${res.max_capacity}</p>` : ''}
          </div>
        `);

        markers.current[markerId] = new maplibregl.Marker({ element: el })
          .setLngLat([res.longitude, res.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });

    // Remove obsolete markers
    Object.keys(markers.current).forEach((key) => {
      if (!activeIds.has(key)) {
        markers.current[key].remove();
        delete markers.current[key];
      }
    });

  }, [incidents, resources]);

  // 4. Draw Simulation Overlay
  const setupSimulationLayers = () => {
    if (!map.current) return;

    map.current.addSource('simulation-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Fill Layer
    map.current.addLayer({
      id: 'simulation-fill',
      type: 'fill',
      source: 'simulation-source',
      paint: {
        'fill-color': ['coalesce', ['get', 'fillColor'], '#E63946'],
        'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.3]
      },
      filter: ['==', '$type', 'Polygon']
    });

    // Stroke Layer
    map.current.addLayer({
      id: 'simulation-stroke',
      type: 'line',
      source: 'simulation-source',
      paint: {
        'line-color': ['coalesce', ['get', 'strokeColor'], '#D90429'],
        'line-width': ['coalesce', ['get', 'weight'], 2]
      }
    });
  };

  // 5. Setup Digital Twin Views (Traffic, Emergency Buffers, Heatmaps)
  const setupDigitalTwinLayers = () => {
    if (!map.current) return;

    // Traffic Source & Layer
    const trafficData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[78.3700, 17.4450], [78.3750, 17.4480], [78.3800, 17.4500]] },
          properties: { color: '#E63946', weight: 5, name: 'Hitec City Main Rd (HEAVY)' }
        },
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[78.4100, 17.4200], [78.4200, 17.4250], [78.4300, 17.4300]] },
          properties: { color: '#F4A261', weight: 4, name: 'Jubilee Hills Rd (MODERATE)' }
        },
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[78.4320, 17.3821], [78.4420, 17.3921], [78.4520, 17.4021]] },
          properties: { color: '#2E8B57', weight: 5, name: 'PVNR Expressway (CLEAR)' }
        },
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[78.4680, 17.4200], [78.4738, 17.4239], [78.4790, 17.4280]] },
          properties: { color: '#E63946', weight: 4, name: 'Hussain Sagar Ring Rd (HEAVY)' }
        }
      ]
    };

    map.current.addSource('traffic-source', {
      type: 'geojson',
      data: trafficData
    });

    map.current.addLayer({
      id: 'traffic-layer',
      type: 'line',
      source: 'traffic-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'weight'],
        'line-opacity': 0.85
      },
      layout: { visibility: 'none' }
    });

    // Emergency Service Buffers Source & Layer
    const bufferFeatures = [
      // Apollo Hospitals Jubilee Hills
      { type: 'Feature', properties: { color: '#4A90E2', fillColor: 'rgba(74, 144, 226, 0.15)' }, geometry: { type: 'Polygon', coordinates: [generateCirclePolygon(17.4262, 78.4116, 1500)] } },
      // NIMS Punjagutta
      { type: 'Feature', properties: { color: '#4A90E2', fillColor: 'rgba(74, 144, 226, 0.15)' }, geometry: { type: 'Polygon', coordinates: [generateCirclePolygon(17.4255, 78.4560, 1500)] } },
      // Madhapur Fire Station
      { type: 'Feature', properties: { color: '#E63946', fillColor: 'rgba(230, 57, 70, 0.15)' }, geometry: { type: 'Polygon', coordinates: [generateCirclePolygon(17.4423, 78.3842, 1500)] } }
    ];

    map.current.addSource('emergency-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: bufferFeatures
      }
    });

    map.current.addLayer({
      id: 'emergency-layer-fill',
      type: 'fill',
      source: 'emergency-source',
      paint: {
        'fill-color': ['get', 'fillColor'],
        'fill-opacity': 0.5
      },
      layout: { visibility: 'none' }
    });

    map.current.addLayer({
      id: 'emergency-layer-stroke',
      type: 'line',
      source: 'emergency-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.5,
        'line-dasharray': [3, 3]
      },
      layout: { visibility: 'none' }
    });

    // Heatmap Source & Layer
    map.current.addSource('heatmap-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    map.current.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'heatmap-source',
      maxzoom: 18,
      paint: {
        'heatmap-weight': ['coalesce', ['get', 'intensity'], 0.5],
        'heatmap-intensity': 2.5,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(30, 58, 95, 0)',
          0.2, 'rgba(93, 173, 226, 0.4)',
          0.4, 'rgba(46, 139, 87, 0.6)',
          0.6, 'rgba(244, 162, 97, 0.8)',
          0.8, '#F4A261',
          1, '#E63946'
        ],
        'heatmap-radius': 45,
        'heatmap-opacity': 0.75
      },
      layout: { visibility: 'none' }
    });
  };

  // Toggle View Layers visibility on viewMode change
  useEffect(() => {
    if (!map.current) return;
    
    if (map.current.getLayer('traffic-layer')) {
      map.current.setLayoutProperty('traffic-layer', 'visibility', viewMode === 'traffic' ? 'visible' : 'none');
    }
    
    if (map.current.getLayer('emergency-layer-fill') && map.current.getLayer('emergency-layer-stroke')) {
      map.current.setLayoutProperty('emergency-layer-fill', 'visibility', viewMode === 'emergency' ? 'visible' : 'none');
      map.current.setLayoutProperty('emergency-layer-stroke', 'visibility', viewMode === 'emergency' ? 'visible' : 'none');
    }
    
    if (map.current.getLayer('heatmap-layer')) {
      map.current.setLayoutProperty('heatmap-layer', 'visibility', viewMode === 'heatmap' ? 'visible' : 'none');
    }
  }, [viewMode]);

  // Update Heatmap points with latest incidents and hazard zones
  useEffect(() => {
    if (!map.current || !map.current.getSource('heatmap-source')) return;

    const features = incidents.map((inc) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [inc.longitude, inc.latitude]
      },
      properties: {
        intensity: inc.severity === 'Critical' ? 1.0 : inc.severity === 'High' ? 0.75 : 0.4
      }
    }));

    // Baseline Digital Twin high-risk industrial zones
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [78.4593, 17.5147] }, // Jeedimetla chemical zone
      properties: { intensity: 0.95 }
    });
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [78.4738, 17.4239] }, // Hussain Sagar flood basin
      properties: { intensity: 0.7 }
    });

    (map.current.getSource('heatmap-source') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: features
    });
  }, [incidents]);

  // Draw simulation ticks
  useEffect(() => {
    if (!map.current || !map.current.getSource('simulation-source')) return;

    if (!activeSimulation) {
      (map.current.getSource('simulation-source') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    const features: any[] = [];

    activeSimulation.zones.forEach((zone, index) => {
      if (zone.type === 'Polygon' && zone.coordinates) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [zone.coordinates.map(coord => [coord[1], coord[0]])] // swap to lng,lat
          },
          properties: {
            id: index,
            name: zone.name,
            fillColor: zone.style.fillColor,
            fillOpacity: zone.style.fillOpacity,
            strokeColor: zone.style.strokeColor,
            weight: zone.style.weight
          }
        });
      } else if (zone.type === 'Circle' && zone.center && zone.radius) {
        const polyCoords = generateCirclePolygon(zone.center[0], zone.center[1], zone.radius);
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [polyCoords]
          },
          properties: {
            id: index,
            name: zone.name,
            fillColor: zone.style.fillColor,
            fillOpacity: zone.style.fillOpacity,
            strokeColor: zone.style.strokeColor,
            weight: zone.style.weight
          }
        });
      }
    });

    (map.current.getSource('simulation-source') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: features
    });

  }, [activeSimulation]);

  // Draw Evacuation Danger Zones
  useEffect(() => {
    if (!map.current || !map.current.getSource('simulation-source')) return;

    // Active simulation overrides custom danger zones rendering
    if (activeSimulation) return;

    if (!dangerZones || dangerZones.length === 0 || !selectedIncident) {
      (map.current.getSource('simulation-source') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    const features: any[] = [];
    dangerZones.forEach((zone, index) => {
      const radiusMeters = zone.radius_km * 1000;
      const polyCoords = generateCirclePolygon(selectedIncident.latitude, selectedIncident.longitude, radiusMeters);
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [polyCoords]
        },
        properties: {
          id: index,
          name: zone.name,
          fillColor: zone.color,
          fillOpacity: 0.15,
          strokeColor: zone.color,
          weight: 2
        }
      });
    });

    (map.current.getSource('simulation-source') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: features
    });
  }, [dangerZones, selectedIncident, activeSimulation]);

  // Helper to generate polygon points representing a circle
  const generateCirclePolygon = (lat: number, lng: number, radiusMeters: number, points: number = 32) => {
    const coords = [];
    const km = radiusMeters / 1000.0;
    const latDegree = km / 111.0;
    const lngDegree = km / (111.0 * Math.cos(lat * Math.PI / 180));

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * 2 * Math.PI;
      const dx = lngDegree * Math.sin(theta);
      const dy = latDegree * Math.cos(theta);
      coords.push([lng + dx, lat + dy]);
    }
    coords.push(coords[0]); // Close polygon
    return coords;
  };

  // 6. Integrate Three.js 3D Custom Layer (Hyderabad Coordinates)
  const addThreeJsLayer = () => {
    if (!map.current) return;

    const landmarks = [
      { id: 'hq', name: 'AEGIS HQ Madhapur', lat: 17.4483, lng: 78.3741, color: 0x0F2D52, shape: 'cone' },
      { id: 'hospital', name: 'Apollo Jubilee Hills', lat: 17.4262, lng: 78.4116, color: 0x4A90E2, shape: 'cylinder' },
      { id: 'fire', name: 'Madhapur Fire Station', lat: 17.4423, lng: 78.3842, color: 0xE63946, shape: 'box' },
    ];

    const customLayer: maplibregl.CustomLayerInterface = {
      id: 'threejs-layer',
      type: 'custom',
      onAdd: function (map: any, gl: any) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(0, -70, 100).normalize();
        this.scene.add(dirLight);

        this.meshes = [];
        
        landmarks.forEach((lm) => {
          let geometry: THREE.BufferGeometry;
          if (lm.shape === 'cone') {
            geometry = new THREE.ConeGeometry(15, 45, 16);
          } else if (lm.shape === 'cylinder') {
            geometry = new THREE.CylinderGeometry(15, 15, 40, 16);
          } else {
            geometry = new THREE.BoxGeometry(25, 25, 25);
          }

          const material = new THREE.MeshPhongMaterial({
            color: lm.color,
            transparent: true,
            opacity: 0.85,
            shininess: 100,
          });

          const mesh = new THREE.Mesh(geometry, material);
          const mercator = maplibregl.MercatorCoordinate.fromLngLat([lm.lng, lm.lat], 30);
          
          mesh.position.set(mercator.x, mercator.y, mercator.z || 0);
          const scale = mercator.meterInMercatorCoordinateUnits();
          mesh.scale.set(scale, scale, scale);
          
          this.scene.add(mesh);
          this.meshes.push(mesh);
        });

        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
        });

        this.renderer.autoClear = false;
      },
      render: function (_gl: any, matrix: any) {
        if (this.meshes) {
          this.meshes.forEach((mesh: THREE.Mesh) => {
            mesh.rotation.z += 0.01;
            mesh.rotation.x += 0.005;
          });
        }

        const projectionMatrix = new THREE.Matrix4().fromArray(matrix);
        this.renderer.resetState();
        
        this.renderer.render(this.scene, this.camera);
        this.camera.projectionMatrix = projectionMatrix;
        
        map.current?.triggerRepaint();
      }
    } as any;

    map.current.addLayer(customLayer);
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-glass-md border border-white">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Control Mode Indicator */}
      <div className="absolute top-4 left-4 glass-card px-4 py-2 rounded-xl flex items-center gap-2 pointer-events-none z-10">
        <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
        <span className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">
          {activeSimulation ? `SIMULATION ACTIVE (${activeSimulation.type})` : t('twin_monitor_mode')}
        </span>
      </div>

      {/* Floating View Controller Selector */}
      <div className="absolute bottom-4 right-4 glass-card p-2 rounded-xl flex gap-1.5 z-10 shadow-glass-md border border-[#E6EEF5]">
        {[
          { mode: 'normal', label: `🌍 ${t('normal')}` },
          { mode: 'traffic', label: `🚦 ${t('traffic')}` },
          { mode: 'emergency', label: `🛡️ ${t('emergency')}` },
          { mode: 'heatmap', label: `🔥 ${t('heatmap')}` }
        ].map((btn) => (
          <button
            key={btn.mode}
            onClick={() => setViewMode(btn.mode as any)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 active:scale-95 ${
              viewMode === btn.mode
                ? 'bg-[#1E3A5F] text-white shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100 shadow-glass-sm'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};
export default MapComponent;
