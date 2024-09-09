import { useContext, useState, useEffect } from 'react';
import { Draw, Modify } from 'ol/interaction';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import { getLength } from 'ol/sphere';
import { toLonLat, fromLonLat } from 'ol/proj';
import MapContext from '../MapContext/MapContext';
import { Coordinate } from 'ol/coordinate';
import { Stroke, Style } from 'ol/style';
import './SectionDrawer.css';

interface Section {
	id: string;
	coordinates: Coordinate[];
	length: number;
	azimuth: number;
	color: string;
}

const SectionDrawer = () => {
	const { map, isMapReady } = useContext(MapContext);
	const [isDrawing, setIsDrawing] = useState(false);
	const [drawInteraction, setDrawInteraction] = useState<Draw | null>(null);
	const [vectorLayer, setVectorLayer] = useState<VectorLayer | null>(null);
	const [sections, setSections] = useState<Section[]>([]);

	const [lengthUnit, setLengthUnit] = useState<'km' | 'miles'>('km');
	const [azimuthUnit, setAzimuthUnit] = useState<'degrees' | 'radians'>(
		'degrees'
	);

	const [manualCoordinates, setManualCoordinates] = useState({
		x1: '',
		y1: '',
		x2: '',
		y2: '',
	});

	useEffect(() => {
		if (map && !vectorLayer) {
			const source = new VectorSource();
			const layer = new VectorLayer({ source });
			map.addLayer(layer);
			setVectorLayer(layer);

			enableModifyInteraction();
		}
	}, [map, vectorLayer]);

	const enableModifyInteraction = () => {
		if (map && vectorLayer) {
			const modify = new Modify({ source: vectorLayer.getSource()! });
			map.addInteraction(modify);

			modify.on('modifyend', (event) => {
				const modifiedFeatures = event.features.getArray();
				const updatedSections = [...sections];

				modifiedFeatures.forEach((feature: Feature) => {
					const geometry = feature.getGeometry() as LineString;
					const coordinates = geometry.getCoordinates();
					const lonLatCoordinates = coordinates.map((coord) => {
						const lonLat = toLonLat(coord);
						return lonLat.map((value) =>
							parseFloat(value.toFixed(4))
						) as Coordinate;
					});
					const length = getLength(geometry);

					const updatedSection = {
						id: feature.getId() as string,
						coordinates: lonLatCoordinates,
						length,
						azimuth: calculateAzimuth(coordinates),
						color: feature.get('color'),
					};

					const sectionIndex = updatedSections.findIndex(
						(section) => section.id === updatedSection.id
					);
					if (sectionIndex !== -1) {
						updatedSections[sectionIndex] = updatedSection;
					}
				});

				setSections(updatedSections);
			});
		}
	};

	const generateRandomColor = () => {
		const letters = '0123456789ABCDEF';
		let color = '#';
		for (let i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	};

	const startDrawing = () => {
		if (!map || !isMapReady || !vectorLayer) {
			console.error('Map is not initialized or not ready yet.');
			return;
		}

		if (!isDrawing) {
			const draw = new Draw({
				source: vectorLayer.getSource()!,
				type: 'LineString',
				maxPoints: 2,
			});

			map.addInteraction(draw);
			setDrawInteraction(draw);
			setIsDrawing(true);

			draw.on('drawend', (event) => {
				const feature = event.feature as Feature;
				const geometry = feature.getGeometry() as LineString;
				const coordinates = geometry.getCoordinates() as Coordinate[];

				if (coordinates.length === 2) {
					const lonLatCoords = coordinates.map(
						(coord) =>
							toLonLat(coord).map((value) =>
								parseFloat(value.toFixed(4))
							) as Coordinate
					);

					const length = getLength(geometry);
					const azimuthValue = calculateAzimuth(coordinates);
					const color = generateRandomColor();

					const uniqueId = `${Date.now()}-${Math.random()}`;

					const newSection: Section = {
						id: uniqueId,
						coordinates: lonLatCoords,
						length,
						azimuth: azimuthValue,
						color,
					};

					feature.setStyle(
						new Style({
							stroke: new Stroke({
								color,
								width: 2,
							}),
						})
					);

					feature.set('color', color);
					feature.setId(uniqueId);

					setSections((prevSections) => [
						...prevSections,
						newSection,
					]);
				}

				stopDrawing();
			});
		}
	};

	const calculateAzimuth = (coordinates: Coordinate[]) => {
		const [lon1, lat1] = coordinates[0].slice(0, 2);
		const [lon2, lat2] = coordinates[1].slice(0, 2);

		const deltaLon = lon2 - lon1;
		const deltaLat = lat2 - lat1;

		const angleRad = Math.atan2(deltaLon, deltaLat);
		const angleDeg = (angleRad * 180) / Math.PI;

		return (angleDeg + 360) % 360;
	};

	const stopDrawing = () => {
		if (map && drawInteraction) {
			map.removeInteraction(drawInteraction);
			setIsDrawing(false);
			setDrawInteraction(null);

			enableModifyInteraction();
		}
	};

	const deleteAllLines = () => {
		if (vectorLayer) {
			vectorLayer.getSource()?.clear();
			setSections([]);
		}
	};

	const convertLength = (length: number) => {
		return lengthUnit === 'km' ? length / 1000 : length / 1609.34;
	};

	const convertAzimuth = (azimuth: number) => {
		return azimuthUnit === 'degrees' ? azimuth : (azimuth * Math.PI) / 180;
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setManualCoordinates((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleCreateSection = () => {
		const { x1, y1, x2, y2 } = manualCoordinates;

		if (!x1 || !y1 || !x2 || !y2) {
			alert('Please provide valid coordinates.');
			return;
		}

		const start = [parseFloat(x1), parseFloat(y1)] as Coordinate;
		const end = [parseFloat(x2), parseFloat(y2)] as Coordinate;
		const coordinates = [fromLonLat(start), fromLonLat(end)];
		const geometry = new LineString(coordinates);
		const length = getLength(geometry);
		const azimuthValue = calculateAzimuth(coordinates);
		const color = generateRandomColor();
		const uniqueId = `${Date.now()}-${Math.random()}`;
		const newSection: Section = {
			id: uniqueId,
			coordinates: [start, end],
			length,
			azimuth: azimuthValue,
			color,
		};

		setSections((prevSections) => [...prevSections, newSection]);

		const feature = new Feature({
			geometry: new LineString(coordinates),
		});

		feature.setStyle(
			new Style({
				stroke: new Stroke({
					color,
					width: 2,
				}),
			})
		);

		feature.set('color', color);
		feature.setId(uniqueId);

		vectorLayer?.getSource()?.addFeature(feature);
	};

	return (
		<div className="section-drawer">
			<div className="section-drawer__controls">
				{!isDrawing ? (
					<button
						className="section-drawer__button"
						onClick={startDrawing}
					>
						Start Drawing
					</button>
				) : (
					<button
						className="section-drawer__button"
						onClick={stopDrawing}
					>
						Stop Drawing
					</button>
				)}
				<button
					className="section-drawer__button--delete"
					onClick={deleteAllLines}
				>
					Delete All Lines
				</button>

				<div className="section-drawer__options">
					<div className="section-drawer__unit-selector">
						<label>Length Unit: </label>
						<select
							className="section-drawer__select"
							value={lengthUnit}
							onChange={(e) =>
								setLengthUnit(e.target.value as 'km' | 'miles')
							}
						>
							<option value="km">Kilometers</option>
							<option value="miles">Miles</option>
						</select>
					</div>

					<div className="section-drawer__unit-selector">
						<label>Azimuth Unit: </label>
						<select
							className="section-drawer__select"
							value={azimuthUnit}
							onChange={(e) =>
								setAzimuthUnit(
									e.target.value as 'degrees' | 'radians'
								)
							}
						>
							<option value="degrees">Degrees</option>
							<option value="radians">Radians</option>
						</select>
					</div>
				</div>
			</div>
			<div className="section-drawer__coordinates">
				<div className="section-drawer__coordinates--point">
					<input
						type="text"
						name="x1"
						placeholder="X1"
						value={manualCoordinates.x1}
						onChange={handleInputChange}
						className="section-drawer__input"
					/>
					<input
						type="text"
						name="y1"
						placeholder="Y1"
						value={manualCoordinates.y1}
						onChange={handleInputChange}
						className="section-drawer__input"
					/>
				</div>
				<div className="section-drawer__coordinates--point">
					<input
						type="text"
						name="x2"
						placeholder="X2"
						value={manualCoordinates.x2}
						onChange={handleInputChange}
						className="section-drawer__input"
					/>
					<input
						type="text"
						name="y2"
						placeholder="Y2"
						value={manualCoordinates.y2}
						onChange={handleInputChange}
						className="section-drawer__input"
					/>
				</div>
				<button
					className="section-drawer__button"
					onClick={handleCreateSection}
				>
					Create Section
				</button>
			</div>

			<div className="section-drawer__sections">
				<h3>Current Sections</h3>

				{sections.length > 0 ? (
					<div className="section-drawer__header">
						<div className="section-drawer__column">Color</div>
						<div className="section-drawer__column">
							<span>Coordinates</span>
							<span>[x ,y] → [x, y]</span>
						</div>
						<div className="section-drawer__column">
							<span>Length</span>
							<span>
								[{lengthUnit === 'km' ? 'km' : 'miles'}]
							</span>
						</div>
						<div className="section-drawer__column">
							<span>Azimuth</span>
							<span className="section-drawer__column--azimuth">
								[{azimuthUnit === 'degrees' ? '°' : 'radians'}]
							</span>
						</div>
					</div>
				) : (
					<p className="section-drawer__no-sections">
						No sections available.
					</p>
				)}

				<div>
					{sections.map((section, index) => (
						<div key={index} className="section-drawer__row">
							<div className="section-drawer__cell">
								<div
									className="section-drawer__color"
									style={{ backgroundColor: section.color }}
								></div>
							</div>
							<div className="section-drawer__cell--coordinates">
								[{section.coordinates[0].join(',')}] [
								{section.coordinates[1].join(',')}]
							</div>
							<div className="section-drawer__cell">
								{convertLength(section.length).toFixed(2)}
							</div>
							<div className="section-drawer__cell">
								{convertAzimuth(section.azimuth).toFixed(2)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default SectionDrawer;
