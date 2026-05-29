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

export interface GameEntry {
  key: string; // can be a year (e.g. "1995") or a pokemon category id (e.g. "fav")
  gameId: number | null;
  gameName: string | null;
  coverId: string | null;
}

// Keep GOTYEntry for backwards compatibility/alias
export interface GOTYEntry extends GameEntry {}

export interface PokemonCategory {
  id: string;
  label: string;
}

export interface ListCategory {
  id: string;
  label: string;
  searchKeyword?: string | null;
  searchYear?: string | number | null;
}

export interface CustomList {
  id: string;
  title: string;
  subtitle: string;
  categories: ListCategory[];
  isSystem?: boolean;
}

export const POKEMON_CATEGORIES: PokemonCategory[] = [
  { id: "fav", label: "Favorito" },
  { id: "fav2", label: "2º Favorito" },
  { id: "first_played", label: "Primeiro que Joguei" },
  { id: "last_played", label: "Último que Joguei" },
  { id: "best_story", label: "Melhor História" },
  { id: "overrated", label: "Superestimado" },
  { id: "underrated", label: "Subestimado" },
  { id: "overhated", label: "Injustiçado" },
  { id: "best_remake", label: "Melhor Remake" },
  { id: "needs_remake", label: "Precisa de Remake" },
  { id: "best_region", label: "Melhor Região" },
  { id: "fav_rival", label: "Rival Favorito" },
  { id: "fav_champion", label: "Campeão Favorito" },
  { id: "fav_starters", label: "Iniciais Favoritos" },
  { id: "fav_legendaries", label: "Lendários Favoritos" }
];
