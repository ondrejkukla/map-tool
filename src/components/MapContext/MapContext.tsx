import { createContext } from 'react';
import { Map } from 'ol';

interface MapContextType {
    map: Map | null;
    isMapReady: boolean;
}

// Define the context type to be either a Map instance or null
const MapContext = createContext<MapContextType>({ map: null, isMapReady: false });

export default MapContext;
