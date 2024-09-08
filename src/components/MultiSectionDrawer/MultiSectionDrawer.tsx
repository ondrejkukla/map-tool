import React, { useContext, useState, useEffect } from 'react';
import { Draw } from 'ol/interaction';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { LineString } from 'ol/geom';
import { Feature } from 'ol';
import { getLength } from 'ol/sphere';
import { toLonLat } from 'ol/proj';
import MapContext from '../MapContext/MapContext';
import { Stroke, Style } from 'ol/style';
import { Coordinate } from 'ol/coordinate';

interface SectionData {
  coordinates: Coordinate[];
  length: number;
}

const MultiSectionDrawer: React.FC = () => {
  const { map, isMapReady } = useContext(MapContext);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawInteraction, setDrawInteraction] = useState<Draw | null>(null);
  const [vectorLayer, setVectorLayer] = useState<VectorLayer | null>(null);
  const [sectionsData, setSectionsData] = useState<SectionData[]>([]); // Array to store section data

  useEffect(() => {
    if (map && !vectorLayer) {
      const source = new VectorSource();
      const layer = new VectorLayer({ source });
      map.addLayer(layer);
      setVectorLayer(layer);
    }
  }, [map, vectorLayer]);

  // Function to start the drawing interaction
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

      // Handle drawing end
      draw.on('drawend', (event) => {
        const feature = event.feature as Feature;
        const geometry = feature.getGeometry() as LineString; // Cast geometry to LineString

        const coordinates = geometry.getCoordinates(); // Now getCoordinates will work

        // Convert to lon/lat coordinates and calculate length
        const lonLatCoordinates = coordinates.map(coord => toLonLat(coord));
        const length = getLength(geometry); // Length in meters

        // Store section data (coordinates and length)
        const newSectionData: SectionData = {
          coordinates: lonLatCoordinates,
          length,
        };
        setSectionsData((prev) => [...prev, newSectionData]);

        // Style the drawn feature
        feature.setStyle(
          new Style({
            stroke: new Stroke({
              color: 'blue',
              width: 2,
            }),
          })
        );
      });

      // Add right-click event listener to stop drawing
      map.getViewport().addEventListener('contextmenu', stopDrawingOnRightClick);
    }
  };

  // Function to stop drawing when right-click is detected
  const stopDrawingOnRightClick = (event: MouseEvent) => {
    event.preventDefault(); // Prevent the default right-click menu

    // Finish the drawing (simulate a double-click to complete it)
    if (drawInteraction) {
      drawInteraction.finishDrawing();
    }

    stopDrawing(); // Stop the interaction after finishing the drawing
  };

  // Function to stop drawing interaction and remove event listeners
  const stopDrawing = () => {
    if (map && drawInteraction) {
      map.removeInteraction(drawInteraction);
      setIsDrawing(false);
      setDrawInteraction(null);

      // Remove right-click listener
      map.getViewport().removeEventListener('contextmenu', stopDrawingOnRightClick);
    }
  };

  const deleteAllSections = () => {
    if (vectorLayer) {
      vectorLayer.getSource()?.clear();
      setSectionsData([]); // Clear the section data array
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 560, width: '700px' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Start and stop drawing buttons */}
        {!isDrawing ? (
          <button onClick={startDrawing}>Start Drawing Sections</button>
        ) : (
          <button onClick={stopDrawing}>Stop Drawing</button>
        )}
        <button onClick={deleteAllSections}>Delete All Sections</button>
      </div>
  
      {/* Display section data */}
      <div style={{ marginTop: '20px', overflowY: 'auto', flex: 1 }}>
        <h3>Current Sections</h3>
        {sectionsData.length > 0 ? (
          sectionsData.map((section, index) => (
            <div key={index}>
              Section {index + 1}: Length = {section.length.toFixed(2)} meters <br />
              Coordinates: {section.coordinates.map(coord => `[${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]`).join(' → ')}
            </div>
          ))
        ) : (
          <p>No sections available.</p>
        )}
      </div>
    </div>
  );
  
};

export default MultiSectionDrawer;