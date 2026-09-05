import { Location } from "@/types/location";
import { MoveResponse } from "@/types/game";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const locationApi = {
  async getLocations(): Promise<Location[]> {
    const res = await fetch(`${API_URL}/api/v1/locations`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load locations");
    return res.json();
  },

  /**
   * Enters a location (building). The server sets currentLocationId on the
   * player so they can only see other players inside the same building.
   * Pass an empty string to exit the current location.
   */
  async enterLocation(playerId: string, locationId: string): Promise<MoveResponse> {
    const params = new URLSearchParams({
      playerId: playerId,
      locationId: locationId,
    });
    const res = await fetch(
      `${API_URL}/api/v1/locations/enter?${params}`,
      { method: "POST" },
    );
    if (!res.ok) {
      let message = "Failed to enter location";
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        // ignore body parse errors
      }
      throw new Error(message);
    }
    return res.json();
  },
};
