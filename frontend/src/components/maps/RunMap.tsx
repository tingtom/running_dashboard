import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import polyline from 'polyline';
import { cn } from '@/lib/utils';

// Fix for default markers in webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RunMapProps {
  polyline: string;
  startLat?: number;
  startLng?: number;
  className?: string;
}

// Component to automatically fit bounds
function FitBounds({ positions }: { positions: L.LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, positions]);
  return null;
}

export default function RunMap({ polyline: encodedPoly, startLat, startLng, className }: RunMapProps) {
  const [points, setPoints] = useState<L.LatLngExpression[]>([]);

  useEffect(() => {
    if (encodedPoly) {
      try {
        const decoded = polyline.decode(encodedPoly); // Array of [lat, lng] but polyline decodes to [lat, lng] ?
        // polyline.decode returns array of [lat, lng] pairs, but typical polyline format is [lat, lng]
        const latLngs = decoded.map(([lat, lng]) => [lat, lng] as [number, number]);
        setPoints(latLngs);
      } catch (error) {
        console.error('Failed to decode polyline:', error);
        setPoints([]);
      }
    } else if (startLat !== undefined && startLng !== undefined) {
      setPoints([[startLat, startLng]]);
    }
  }, [encodedPoly, startLat, startLng]);

  const center: L.LatLngExpression = points.length > 0 ? points[0] : [0, 0];

  return (
    <div className={cn('h-[500px] w-full', className)}>
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length > 0 && (
          <>
            <Polyline positions={points} color="#3b82f6" weight={4} />
            {startLat !== undefined && startLng !== undefined && (
              <Marker position={[startLat, startLng]}>
                <Popup>Start</Popup>
              </Marker>
            )}
            {points.length > 1 && (
              <Marker position={points[points.length - 1]}>
                <Popup>Finish</Popup>
              </Marker>
            )}
          </>
        )}
        {points.length > 0 && <FitBounds positions={points} />}
      </MapContainer>
    </div>
  );
}
