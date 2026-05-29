import { Search, Loader2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { IGDBGameResult, POKEMON_CATEGORIES } from "../types";

interface SidebarProps {
  onSelectGame: (game: IGDBGameResult) => void;
  selectedKey: string | null;
  onClose?: () => void;
  isPokemonMode: boolean;
  searchKeyword?: string | null;
  searchYear?: string | number | null;
  selectedLabel?: string | null;
}

export function Sidebar({ 
  onSelectGame, 
  selectedKey, 
  onClose, 
  isPokemonMode,
  searchKeyword,
  searchYear,
  selectedLabel
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IGDBGameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGames = async (searchQuery: string, keyFilter: string | null) => {
    setLoading(true);
    setError(null);
    try {
      let yearFilter = searchYear;
      if (yearFilter === undefined || yearFilter === null) {
        if (!isPokemonMode && !searchKeyword && keyFilter) {
          const parsed = parseInt(keyFilter);
          if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2100) {
            yearFilter = parsed;
          }
        }
      }

      const response = await fetch("/api/igdb/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: searchQuery, 
          year: yearFilter, 
          isPokemonMode: isPokemonMode || (searchKeyword?.toLowerCase() === "pokemon" || searchKeyword?.toLowerCase() === "pokémon"),
          searchKeyword: searchKeyword 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Falha ao pesquisar jogos");
      }
      
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Refetch when selected key or search filters change, or on mount
    searchGames(query, selectedKey);
  }, [selectedKey, isPokemonMode, searchKeyword, searchYear]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGames(query, selectedKey);
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-full max-w-xs md:max-w-none md:w-80 bg-zinc-950 border-r border-zinc-900 flex flex-col h-screen overflow-hidden shadow-2xl transition-transform duration-300 md:sticky md:top-0 md:translate-x-0 ${
      selectedKey ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    }`}>
      <div className="p-6 border-b border-zinc-800/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center font-display tracking-tight">
            {selectedKey ? (
              <span className="flex items-center gap-2 text-sm sm:text-base">
                <span className="text-indigo-400 font-bold shrink-0">●</span>
                <span className="line-clamp-2">
                  {selectedLabel ? `Selecionando: ${selectedLabel}` : `Selecionando para ${selectedKey}`}
                </span>
              </span>
            ) : (
              "Selecione um card primeiro"
            )}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-zinc-400 hover:text-zinc-100 p-1.5 hover:bg-zinc-900 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <form onSubmit={handleSearch} className="relative mt-2">
          <input
            type="text"
            className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-zinc-500 text-sm transition-all"
            placeholder="Pesquisar um jogo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!selectedKey}
          />
          <button 
            type="submit" 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-indigo-400 transition-colors"
            disabled={!selectedKey}
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {error && (
          <div className="mt-4 text-xs text-rose-400 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {!selectedKey ? (
           <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4 px-6 text-center">
              <div className="w-12 h-12 rounded-full border border-dashed border-zinc-800 flex items-center justify-center bg-zinc-900/50">
                <Search className="w-5 h-5 text-zinc-650" />
              </div>
              <p className="text-sm">
                Selecione um dos cards ao lado para começar a pesquisar o jogo correspondente.
              </p>
           </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {results.map((game) => (
              <button
                key={game.id}
                onClick={() => onSelectGame(game)}
                className="flex flex-col items-center group text-left transition-all hover:scale-105"
              >
                <div className="w-full aspect-[3/4] bg-zinc-900 rounded-lg mb-3 overflow-hidden relative border border-zinc-800/50 group-hover:border-indigo-500/30 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                  {game.cover?.image_id ? (
                    <img
                      src={`https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`}
                      alt={game.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3 text-xs text-zinc-600 text-center bg-zinc-800/30">
                      Sem imagem
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="w-full relative px-1">
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-100 line-clamp-2 w-full font-medium leading-tight">
                    {game.name}
                  </span>
                  {game.first_release_date && (
                    <span className="text-[10px] text-zinc-600 block mt-1">
                      {new Date(game.first_release_date * 1000).getFullYear()}
                    </span>
                  )}
                </div>
              </button>
            ))}
            
            {results.length === 0 && query && (
               <div className="col-span-2 text-center text-zinc-500 py-10 text-sm">
                 Nenhum jogo encontrado. Tente um termo diferente.
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
