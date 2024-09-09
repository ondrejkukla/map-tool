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
import './MultiSectionDrawer.css';

interface SectionData {
	id: string;
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
	]);

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
				const updatedSections = [...sectionsData];

				modifiedFeatures.forEach((feature: Feature) => {
					const geometry = feature.getGeometry() as LineString;
					const coordinates = geometry.getCoordinates();
					const lonLatCoordinates = coordinates.map((coord) =>
						toLonLat(coord)
					);
					const length = getLength(geometry);
					const id = feature.getId() as string;
					const sectionIndex = updatedSections.findIndex(
						(section) => section.id === id
					);
					if (sectionIndex !== -1) {
						updatedSections[sectionIndex] = {
							...updatedSections[sectionIndex],
							coordinates: lonLatCoordinates,
							length,
						};
					}
				});

				setSectionsData(updatedSections);
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
				const color = generateRandomColor();

				const newSectionData: SectionData = {
					id: Math.random().toString(36).substr(2, 9),
					coordinates: lonLatCoordinates,
					length,
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

				feature.setId(newSectionData.id);
				feature.set('color', color);

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
		const color = generateRandomColor();

		const newSection: SectionData = {
			id: Math.random().toString(36).substr(2, 9),
			coordinates: validCoordinates.map(
				(point) =>
					[parseFloat(point.x), parseFloat(point.y)] as Coordinate
			),
			length,
			color,
		};

		setSectionsData((prevSections) => [...prevSections, newSection]);

		const feature = new Feature({
			geometry,
		});

		feature.setStyle(
			new Style({
				stroke: new Stroke({
					color,
					width: 2,
				}),
			})
		);

		feature.setId(newSection.id);
		feature.set('color', color);

		vectorLayer?.getSource()?.addFeature(feature);

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
		<div className="multi-section-drawer">
			<div className="multi-section-drawer__controls">
				{!isDrawing ? (
					<button
						className="multi-section-drawer__button multi-section-drawer__button--start"
						onClick={startDrawing}
					>
						Start Drawing
					</button>
				) : (
					<button
						className="multi-section-drawer__button multi-section-drawer__button--stop"
						onClick={stopDrawing}
					>
						Stop Drawing
					</button>
				)}
				<button
					className="multi-section-drawer__button multi-section-drawer__button--delete"
					onClick={deleteAllSections}
				>
					Delete All Lines
				</button>

				<div className="multi-section-drawer__unit-selector">
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

			<div className="multi-section-drawer__input-form">
				{manualCoordinates.map((point, index) => (
					<div
						key={index}
						className="multi-section-drawer__input-row"
					>
						<input
							type="text"
							placeholder={`X${index + 1}`}
							value={point.x}
							onChange={(e) =>
								handleInputChange(index, 'x', e.target.value)
							}
							className="section-drawer__input"
						/>
						<input
							type="text"
							placeholder={`Y${index + 1}`}
							value={point.y}
							onChange={(e) =>
								handleInputChange(index, 'y', e.target.value)
							}
							className="section-drawer__input"
						/>
						{manualCoordinates.length > 2 && (
							<button
								className="multi-section-drawer__remove-button"
								onClick={() => handleRemovePoint(index)}
							>
								Remove
							</button>
						)}
					</div>
				))}
				<button
					className="multi-section-drawer__add-button"
					onClick={handleAddPoint}
				>
					Add Point
				</button>

				<button
					className="multi-section-drawer__create-button"
					onClick={handleCreateSection}
				>
					Create Section
				</button>
			</div>

			<div className="multi-section-drawer__sections-list">
				<h3>Current Sections</h3>

				{sectionsData.length > 0 && (
					<div className="multi-section-drawer__header">
						<div className="multi-section-drawer__header-item--color">
							Color
						</div>
						<div className="multi-section-drawer__header-item--coordinates">
							<span>Coordinates</span>
							<span>[x ,y] → [x, y]</span>{' '}
						</div>
						<div className="multi-section-drawer__header-item">
							<span>Length</span>
							<span>
								[{lengthUnit === 'km' ? 'km' : 'miles'}]
							</span>
						</div>
					</div>
				)}

				{sectionsData.length === 0 ? (
					<p className="multi-section-drawer__no-sections">
						No sections available.
					</p>
				) : (
					sectionsData.map((section, index) => (
						<div
							key={index}
							className="multi-section-drawer__section-row"
						>
							<div className="multi-section-drawer__color">
								<div
									className="multi-section-drawer__color-indicator"
									style={{ backgroundColor: section.color }}
								></div>
							</div>
							<div className="multi-section-drawer__coordinates">
								{section.coordinates
									.map(
										(coord) =>
											`[${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]`
									)
									.join(' → ')}
							</div>
							<div className="multi-section-drawer__length">
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
