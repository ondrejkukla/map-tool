import React, { useEffect, useState, useRef } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import MapContext from '../MapContext/MapContext';
import SectionDrawer from '../SectionDrawer/SectionDrawer';
import PolygonDrawer from '../MultiSectionDrawer/MultiSectionDrawer';
import './MapView.css';

const MapView: React.FC = () => {
	const mapRef = useRef<HTMLDivElement>(null);
	const [mapInstance, setMapInstance] = useState<Map | null>(null);
	const [isMapReady, setIsMapReady] = useState(false);
	const [mode, setMode] = useState<'section' | 'polygon'>(
		(localStorage.getItem('drawingMode') as 'section' | 'polygon') ||
			'section'
	);

	useEffect(() => {
		if (mapRef.current && !mapInstance) {
			const olMap = new Map({
				target: mapRef.current,
				layers: [
					new TileLayer({
						source: new XYZ({
							url: 'https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',
							attributions: '© Google Maps',
						}),
					}),
				],
				view: new View({
					center: fromLonLat([16.5978, 49.2121]),
					zoom: 16,
				}),
			});

			setMapInstance(olMap);
			setIsMapReady(true);

			return () => {
				olMap.setTarget(undefined);
				setIsMapReady(false);
			};
		}
	}, []);

	const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setMode(e.target.value as 'section' | 'polygon');
	};

	const handleReset = () => {
		window.location.reload();
	};

	return (
		<MapContext.Provider value={{ map: mapInstance, isMapReady }}>
			<div className="map__container">
				<div className="mapView__controls">
					<div className="mapView__mode-selector">
						<button
							className="mapView__reset-button"
							onClick={handleReset}
						>
							Reset
						</button>
						<div className='mapView__label-container'>
						<label className="mapView__label">
							<input
								type="radio"
								value="section"
								checked={mode === 'section'}
								onChange={handleModeChange}
							/>
							Section Mode
						</label>
						<label className="mapView__label mapView__label--spaced">
							<input
								type="radio"
								value="polygon"
								checked={mode === 'polygon'}
								onChange={handleModeChange}
							/>
							Polyline Mode
						</label>
						</div>
					</div>
					<div id="map" ref={mapRef} className="mapView__map" />
				</div>

				{mode === 'section' && <SectionDrawer />}
				{mode === 'polygon' && <PolygonDrawer />}
			</div>
		</MapContext.Provider>
	);
};

export default MapView;
