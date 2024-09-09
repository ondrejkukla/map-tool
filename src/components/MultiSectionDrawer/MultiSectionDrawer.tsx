import React, { useContext, useState, useEffect } from 'react';
import { Draw, Modify } from 'ol/interaction';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { LineString } from 'ol/geom';
import { Feature } from 'ol';
import { getLength } from 'ol/sphere';
import { fromLonLat, toLonLat } from 'ol/proj';
import MapContext from '../MapContext/MapContext';
import { Stroke, Style } from 'ol/style';
import { Coordinate } from 'ol/coordinate';

interface SectionData {
	coordinates: Coordinate[];
	length: number;
	color: string;
}

const MultiSectionDrawer: React.FC = () => {
	const { map, isMapReady } = useContext(MapContext);
	const [isDrawing, setIsDrawing] = useState(false);
	const [drawInteraction, setDrawInteraction] = useState<Draw | null>(null);
	const [vectorLayer, setVectorLayer] = useState<VectorLayer | null>(null);
	const [sectionsData, setSectionsData] = useState<SectionData[]>([]);
	const [manualCoordinates, setManualCoordinates] = useState<
		{ x: string; y: string }[]
	>([
		{ x: '', y: '' },
		{ x: '', y: '' },
	]); // Initialize with two default points

	const [lengthUnit, setLengthUnit] = useState<'km' | 'miles'>('km');

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
				const updatedSections = modifiedFeatures.map(
					(feature: Feature) => {
						const geometry = feature.getGeometry() as LineString;
						const coordinates = geometry.getCoordinates();
						const lonLatCoordinates = coordinates.map((coord) =>
							toLonLat(coord)
						);
						const length = getLength(geometry);

						return {
							coordinates: lonLatCoordinates,
							length,
							color: feature.get('color'), // Keep the color of the section
						};
					}
				);

				setSectionsData(updatedSections);
			});
		}
	};

	// Generate a random color
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
				source: vectorLayer!.getSource()!,
				type: 'LineString',
			});

			map.addInteraction(draw);
			setDrawInteraction(draw);
			setIsDrawing(true);

			draw.on('drawend', (event) => {
				const feature = event.feature as Feature;
				const geometry = feature.getGeometry() as LineString;
				const coordinates = geometry.getCoordinates();
				const lonLatCoordinates = coordinates.map((coord) =>
					toLonLat(coord)
				);
				const length = getLength(geometry);
				const color = generateRandomColor(); // Generate random color

				const newSectionData: SectionData = {
					coordinates: lonLatCoordinates,
					length,
					color, // Store the random color
				};

				// Style the feature with the random color
				feature.setStyle(
					new Style({
						stroke: new Stroke({
							color, // Apply the random color
							width: 2,
						}),
					})
				);

				feature.set('color', color); // Save color in the feature's properties

				setSectionsData((prev) => [...prev, newSectionData]);
				stopDrawing();
			});
		}
	};

	const convertLength = (length: number) => {
		return lengthUnit === 'km' ? length / 1000 : length / 1609.34;
	};

	const handleAddPoint = () => {
		setManualCoordinates((prev) => [...prev, { x: '', y: '' }]);
	};

	const handleRemovePoint = (index: number) => {
		setManualCoordinates((prev) => prev.filter((_, i) => i !== index));
	};

	const handleInputChange = (
		index: number,
		field: 'x' | 'y',
		value: string
	) => {
		const updatedCoordinates = [...manualCoordinates];
		updatedCoordinates[index][field] = value;
		setManualCoordinates(updatedCoordinates);
	};

	const handleCreateSection = () => {
		const validCoordinates = manualCoordinates.filter(
			(point) => point.x && point.y
		);

		if (validCoordinates.length < 2) {
			alert('Please provide at least two valid coordinates.');
			return;
		}

		const coordinates: Coordinate[] = validCoordinates.map((point) =>
			fromLonLat([parseFloat(point.x), parseFloat(point.y)])
		);

		const geometry = new LineString(coordinates);
		const length = getLength(geometry);
		const color = generateRandomColor(); // Generate random color

		const newSection: SectionData = {
			coordinates: validCoordinates.map(
				(point) =>
					[parseFloat(point.x), parseFloat(point.y)] as Coordinate
			),
			length,
			color, // Store the random color
		};

		setSectionsData((prevSections) => [...prevSections, newSection]);

		const feature = new Feature({
			geometry,
		});

		// Apply random color to the drawn feature
		feature.setStyle(
			new Style({
				stroke: new Stroke({
					color, // Apply the random color
					width: 2,
				}),
			})
		);

		feature.set('color', color); // Save the color in the feature's properties

		vectorLayer?.getSource()?.addFeature(feature);

		// Reset the coordinates input fields
		setManualCoordinates([
			{ x: '', y: '' },
			{ x: '', y: '' },
		]);
	};

	const stopDrawing = () => {
		if (map && drawInteraction) {
			map.removeInteraction(drawInteraction);
			setIsDrawing(false);
			setDrawInteraction(null);
			enableModifyInteraction();
		}
	};

	const deleteAllSections = () => {
		if (vectorLayer) {
			vectorLayer.getSource()?.clear();
			setSectionsData([]);
		}
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: 560,
				width: '700px',
			}}
		>
			<div style={{ display: 'flex', gap: '16px' }}>
				{!isDrawing ? (
					<button onClick={startDrawing}>
						Start Drawing Sections
					</button>
				) : (
					<button onClick={stopDrawing}>Stop Drawing</button>
				)}
				<button onClick={deleteAllSections}>Delete All Sections</button>

				<div>
					<label>Length Unit: </label>
					<select
						value={lengthUnit}
						onChange={(e) =>
							setLengthUnit(e.target.value as 'km' | 'miles')
						}
					>
						<option value="km">Kilometers</option>
						<option value="miles">Miles</option>
					</select>
				</div>
			</div>

			{/* Manual Coordinate Input Form */}
			<div style={{ marginTop: '20px' }}>
				{manualCoordinates.map((point, index) => (
					<div
						key={index}
						style={{
							display: 'flex',
							gap: '8px',
							marginBottom: '10px',
						}}
					>
						<input
							type="text"
							placeholder={`X${index + 1}`}
							value={point.x}
							onChange={(e) =>
								handleInputChange(index, 'x', e.target.value)
							}
						/>
						<input
							type="text"
							placeholder={`Y${index + 1}`}
							value={point.y}
							onChange={(e) =>
								handleInputChange(index, 'y', e.target.value)
							}
						/>
						{manualCoordinates.length > 2 && (
							<button onClick={() => handleRemovePoint(index)}>
								Remove
							</button>
						)}
					</div>
				))}
				<button onClick={handleAddPoint}>Add Point</button>
			</div>

			<button onClick={handleCreateSection} style={{ marginTop: '20px' }}>
				Create Section
			</button>

			{/* Display section data */}
			<div style={{ marginTop: '20px', overflowY: 'auto', flex: 1 }}>
				<h3>Current Sections</h3>

				{sectionsData.length > 0 && (
					<div
						style={{
							display: 'flex',
							fontWeight: 'bold',
							gap: '24px',
							marginBottom: '10px',
							borderBottom: '1px solid #ccc',
							paddingBottom: '8px',
						}}
					>
						<div style={{ flex: 1 }}>Color</div>
						<div style={{ flex: 3 }}>
							Coordinates [x ,y] → [x, y]
						</div>
						<div style={{ flex: 1 }}>
							Length [{lengthUnit === 'km' ? 'km' : 'miles'}]
						</div>
					</div>
				)}

				{sectionsData.length === 0 ? (
					<p style={{ color: '#888', fontStyle: 'italic' }}>
						No sections available.
					</p>
				) : (
					sectionsData.map((section, index) => (
						<div
							key={index}
							style={{
								display: 'flex',
								gap: '24px',
								marginBottom: '10px',
							}}
						>
							<div style={{ flex: 1 }}>
								<div
									style={{
										width: '20px',
										height: '20px',
										backgroundColor: section.color,
										border: '1px solid #ccc',
										borderRadius: '50%',
										margin: 'auto',
									}}
								></div>
							</div>
							<div style={{ flex: 3 }}>
								{section.coordinates
									.map(
										(coord) =>
											`[${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]`
									)
									.join(' → ')}
							</div>
							<div style={{ flex: 1 }}>
								{convertLength(section.length).toFixed(2)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};

export default MultiSectionDrawer;
