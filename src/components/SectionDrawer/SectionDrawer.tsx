import { useContext, useState, useEffect } from 'react';
import { Draw, Modify } from 'ol/interaction'; // Import Modify interaction
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import { getLength } from 'ol/sphere';
import { toLonLat, fromLonLat } from 'ol/proj'; // Ensure fromLonLat is imported
import MapContext from '../MapContext/MapContext';
import { Coordinate } from 'ol/coordinate';
import { Stroke, Style } from 'ol/style'; // Import styles

interface Section {
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

      // Enable modification interaction after the vectorLayer is created
      enableModifyInteraction();
    }
  }, [map, vectorLayer]);

  const enableModifyInteraction = () => {
    if (map && vectorLayer) {
      const modify = new Modify({ source: vectorLayer.getSource()! });
      map.addInteraction(modify);

      // Listen for modifications and update the section data
      modify.on('modifyend', (event) => {
        const modifiedFeatures = event.features.getArray();
        const updatedSections = modifiedFeatures.map((feature: Feature) => {
          const geometry = feature.getGeometry() as LineString;
          const coordinates = geometry.getCoordinates();
          const lonLatCoordinates = coordinates.map(coord => {
            const lonLat = toLonLat(coord);
            return lonLat.map(value => parseFloat(value.toFixed(4))) as Coordinate; // Ensure 4 decimal places
          });
          const length = getLength(geometry);

          return {
            coordinates: lonLatCoordinates,
            length,
            azimuth: calculateAzimuth(coordinates),
            color: feature.get('color'),
          };
        });

        setSections(updatedSections); // Update the section array
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
            toLonLat(coord).map((value) => parseFloat(value.toFixed(4))) as Coordinate
          );

          const length = getLength(geometry);
          const azimuthValue = calculateAzimuth(coordinates);
          const color = generateRandomColor(); // Generate a random color

          const newSection: Section = {
            coordinates: lonLatCoords,
            length,
            azimuth: azimuthValue,
            color,
          };

          // Style the drawn feature with a random color
          feature.setStyle(
            new Style({
              stroke: new Stroke({
                color, // Apply the random color
                width: 2,
              }),
            })
          );

          feature.set('color', color); // Save the color in the feature's properties

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

      // Enable modify interaction again after drawing stops
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
    const color = generateRandomColor(); // Generate a random color

    const newSection: Section = {
      coordinates: [start, end],
      length,
      azimuth: azimuthValue,
      color,
    };

    setSections((prevSections) => [...prevSections, newSection]);

    // Create a new feature with the LineString geometry and add it to the vector layer
    const feature = new Feature({
      geometry: new LineString(coordinates),
    });

    // Apply a style to the feature with the random color
    feature.setStyle(
      new Style({
        stroke: new Stroke({
          color, // Apply the random color
          width: 2,
        }),
      })
    );

    feature.set('color', color); // Save the color in the feature's properties

    vectorLayer?.getSource()?.addFeature(feature); // Add the feature to the vector source
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 560, width: '700px' }}>
      <div style={{ display: 'flex',justifyContent: 'space-between' , gap: '16px', border: '1px solid #666666', borderRadius: '8px', padding: '8px', marginTop: '65px' }}>
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

        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '0.6em 1.2em', gap: '4px'}}>
          <label>Length Unit: </label>
          <select style={{ borderRadius: '8px', backgroundColor: '#444444', padding: '0.1em 0.2em' }} value={lengthUnit} onChange={(e) => setLengthUnit(e.target.value as 'km' | 'miles')}>
            <option value="km">Kilometers</option>
            <option value="miles">Miles</option>
          </select>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '0.6em 1.2em', gap: '4px'}}>
          <label>Azimuth Unit: </label>
          <select style={{ borderRadius: '8px', backgroundColor: '#444444', padding: '0.1em 0.2em' }} value={azimuthUnit} onChange={(e) => setAzimuthUnit(e.target.value as 'degrees' | 'radians')}>
            <option value="degrees">Degrees</option>
            <option value="radians">Radians</option>
          </select>
        </div>
      </div>

      {/* Manual Coordinate Input Form */}
      <div style={{ padding: '0.4em 0.6em', marginTop: '20px', display: 'flex', gap: '8px', border: '1px solid #666666', borderRadius: '8px' }}>
        <input
          type="text"
          name="x1"
          placeholder="X1"
          value={manualCoordinates.x1}
          onChange={handleInputChange}
          style={{ flex: '1', minWidth: '100px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}
        />
        <input
          type="text"
          name="y1"
          placeholder="Y1"
          value={manualCoordinates.y1}
          onChange={handleInputChange}
          style={{ flex: '1', minWidth: '130px', backgroundColor: '#1a1a1a', borderRadius: '8px'  }}
        />
        <input
          type="text"
          name="x2"
          placeholder="X2"
          value={manualCoordinates.x2}
          onChange={handleInputChange}
          style={{ flex: '1', minWidth: '130px', backgroundColor: '#1a1a1a', borderRadius: '8px'  }}
        />
        <input
          type="text"
          name="y2"
          placeholder="Y2"
          value={manualCoordinates.y2}
          onChange={handleInputChange}
          style={{ flex: '1', minWidth: '130px', backgroundColor: '#1a1a1a', borderRadius: '8px'  }}
        />
        <button onClick={handleCreateSection} style={{display: 'flex', alignItems: 'center', padding: '12px'}}>Create Section</button>
      </div>

      <div style={{ marginTop: '20px', overflowY: 'auto', flex: 1 }}>
        <h3>Current Sections</h3>

        {sections.length > 0 && (
          <div style={{ display: 'flex', fontWeight: 'bold', gap: '24px', marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>
            <div style={{ flex: 1 }}>Color</div>
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
                <div style={{ flex: 1 }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: section.color,
                    border: '1px solid #ccc',
                    borderRadius: '50%',
                    margin: 'auto'
                  }}></div>
                </div>
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
