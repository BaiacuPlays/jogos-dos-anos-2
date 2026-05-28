export interface IGDBGame {
  id: number;
  name: string;
  cover?: {
    id: number;
    image_id: string;
  };
  first_release_date?: number;
}

export interface IGDBGameResult extends IGDBGame {}

export interface GOTYEntry {
  year: number;
  gameId: number | null;
  gameName: string | null;
  coverId: string | null;
}
