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
   * Enters a named location ("room"): the server teleports the player to that
   * location's world coordinates and returns the new world state (including the
   * other players now sharing the same tile). Passing the previous location's
   * id teleports the player back to it.
   */
  async enterLocation(playerId: string, locationId: string): Promise<MoveResponse> {
    const res = await fetch(
      `${API_URL}/api/v1/locations/${encodeURIComponent(locationId)}/enter?playerId=${encodeURIComponent(playerId)}`,
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
