import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

const MapView: React.FC = () => {
	const mapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		console.log('mapRef.current inside useEffect:', mapRef.current);

		if (mapRef.current) {
			const map = new Map({
				target: mapRef.current,
				layers: [
					new TileLayer({
						source: new OSM(), // Use OpenStreetMap as a test layer
					}),
				],
				view: new View({
					center: [0, 0],
					zoom: 2, // Adjust zoom level
				}),
			});

			return () => map.setTarget(undefined);
		}
	}, []);

	return (
		<div id="map" ref={mapRef} style={{ width: '100%', height: '100vh', border: '1px solid black' }} />
	);
};

export default MapView;
