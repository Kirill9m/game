/** Player-facing types for the Location tab of the World View. */

export interface LocationNpc {
  id: string;
  code: string;
  name: string;
  /** Centre position on the location image, as a percentage (0-100). */
  locationX: number;
  locationY: number;
  /**
   * When set, this NPC only appears when the player enters through this
   * specific building ID. Otherwise it appears location-wide.
   */
  buildingId: string | null;
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
  /**
   * URL to the building's own background image. When set and a player enters
   * this building, the Location tab shows this image instead of the target
   * location's image, giving each building its own visual identity.
   */
  backgroundImageUrl: string | null;
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
