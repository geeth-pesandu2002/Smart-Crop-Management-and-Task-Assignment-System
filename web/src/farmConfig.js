// web/src/farmConfig.js
//
// 🔧 Put the real farm center + bounds here (SW + NE).
// The values below are placeholders for Galle area.
// Ask the farm to give you the bounding rectangle corners (GPS),
// or draw it once and copy from the browser console if needed.

export const FARM = {
  name: "Labuduwa Farm, Galle",
  // Center of the farm
  center: [6.0535, 80.2460], // [lat, lng]

  // Map bounding box: [[southWestLat, southWestLng], [northEastLat, northEastLng]]
  // ⚠️ Replace with your actual farm rectangle.
  bounds: [
    [6.0400, 80.2300], // SW
    [6.0660, 80.2620], // NE
  ],
};
