/** Player-facing types for the Location tab of the World View. */

export interface LocationNpc {
  id: string;
  code: string;
  name: string;
  /** Centre position on the location image, as a percentage (0-100). */
  locationX: number;
  locationY: number;
}

export interface LocationBuilding {
  id: string;
  name: string;
  /** Centre position on the location image, as a percentage (0-100). */
  x: number;
  y: number;
  /** Size on the location image, as a percentage (0-100). */
  width: number;
  height: number;
  emoji: string | null;
  /** Location opened when the building is entered (null = decorative). */
  targetLocationId: string | null;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  /** World-map cell this location is anchored to. */
  positionX: number;
  positionY: number;
  backgroundImageUrl: string | null;
  /** The location shown first when the Location tab opens. */
  isStart: boolean;
  buildings: LocationBuilding[];
  npcs: LocationNpc[];
}
