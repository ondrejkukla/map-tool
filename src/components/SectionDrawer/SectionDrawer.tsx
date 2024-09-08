import { useContext, useState, useEffect } from 'react';
import { Draw } from 'ol/interaction';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import { getLength } from 'ol/sphere';
import { toLonLat, fromLonLat } from 'ol/proj'; // Import fromLonLat for reverse conversion
import MapContext from '../MapContext/MapContext';
import { Coordinate } from 'ol/coordinate';
import { Stroke, Style } from 'ol/style'; // Import styles

interface Section {
  coordinates: Coordinate[];
  length: number;
  azimuth: number;
}

const SectionDrawer = () => {
  const { map, isMapReady } = useContext(MapContext);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawInteraction, setDrawInteraction] = useState<Draw | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [vectorLayer, setVectorLayer] = useState<VectorLayer | null>(null);

  const [lengthUnit, setLengthUnit] = useState<'km' | 'miles'>('km');
  const [azimuthUnit, setAzimuthUnit] = useState<'degrees' | 'radians'>('degrees');

  const [manualCoordinates, setManualCoordinates] = useState({
    x1: '', y1: '', x2: '', y2: ''
  });

  useEffect(() => {
    if (map && !vectorLayer) {
      const source = new VectorSource();
      const layer = new VectorLayer({ source });
      map.addLayer(layer);
      setVectorLayer(layer);
    }
  }, [map, vectorLayer]);

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
          const lonLatCoords = coordinates.map((coord) =>
            toLonLat(coord).map((value) => parseFloat(value.toFixed(4)))
          );

          const length = getLength(geometry);
          const azimuthValue = calculateAzimuth(coordinates);

          const newSection: Section = {
            coordinates: lonLatCoords,
            length,
            azimuth: azimuthValue,
          };
          setSections((prevSections) => [...prevSections, newSection]);
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

    const newSection: Section = {
      coordinates: [start, end],
      length,
      azimuth: azimuthValue,
    };

    setSections((prevSections) => [...prevSections, newSection]);

    // Create a new feature with the LineString geometry and add it to the vector layer
    const feature = new Feature({
      geometry: new LineString(coordinates),
    });

    // Apply a style to the feature
    feature.setStyle(
      new Style({
        stroke: new Stroke({
          color: 'blue',
          width: 2,
        }),
      })
    );

    vectorLayer?.getSource()?.addFeature(feature); // Add the feature to the vector source
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 560, width: '660px' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        {!isDrawing ? (
          <button onClick={startDrawing}>
            Start Drawing
          </button>
        ) : (
          <button onClick={stopDrawing}>
            Stop Drawing
          </button>
        )}
        <button onClick={deleteAllLines}>
          Delete All Lines
        </button>

        <div>
          <label>Length Unit: </label>
          <select value={lengthUnit} onChange={(e) => setLengthUnit(e.target.value as 'km' | 'miles')}>
            <option value="km">Kilometers</option>
            <option value="miles">Miles</option>
          </select>
        </div>

        <div>
          <label>Azimuth Unit: </label>
          <select value={azimuthUnit} onChange={(e) => setAzimuthUnit(e.target.value as 'degrees' | 'radians')}>
            <option value="degrees">Degrees</option>
            <option value="radians">Radians</option>
          </select>
        </div>
      </div>

      {/* Manual Coordinate Input Form */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', height: '50px' }}>
        <input
          type="text"
          name="x1"
          placeholder="X1"
          value={manualCoordinates.x1}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="y1"
          placeholder="Y1"
          value={manualCoordinates.y1}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="x2"
          placeholder="X2"
          value={manualCoordinates.x2}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="y2"
          placeholder="Y2"
          value={manualCoordinates.y2}
          onChange={handleInputChange}
        />
        <button onClick={handleCreateSection} style={{textAlign: 'center', padding: '8px'}}>Create Section</button>
      </div>

      <div style={{ marginTop: '20px', overflowY: 'auto', flex: 1 }}>
        <h3>Current Sections</h3>

        {sections.length > 0 && (
          <div style={{ display: 'flex', fontWeight: 'bold', gap: '24px', marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>
            <div style={{ flex: 1 }}>Section</div>
            <div style={{ flex: 3 }}>Coordinates [x ,y] → [x, y]</div>
            <div style={{ flex: 1 }}>Length [{lengthUnit === 'km' ? 'km' : 'miles'}]</div>
            <div style={{ flex: 1 }}>Azimuth [{azimuthUnit === 'degrees' ? '°' : 'radians'}]</div>
          </div>
        )}

        <div>
          {sections.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic' }}>No sections available.</p>
          ) : (
            sections.map((section, index) => (
              <div key={index} style={{ display: 'flex', gap: '24px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>{index + 1}</div>
                <div style={{ flex: 3 }}>
                  [{section.coordinates[0].join(', ')}] → [{section.coordinates[1].join(', ')}]
                </div>
                <div style={{ flex: 1 }}>{convertLength(section.length).toFixed(2)}</div>
                <div style={{ flex: 1 }}>{convertAzimuth(section.azimuth).toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionDrawer;