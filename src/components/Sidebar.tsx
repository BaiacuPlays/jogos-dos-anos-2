import { Search, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { IGDBGameResult } from "../types";

interface SidebarProps {
  onSelectGame: (game: IGDBGameResult) => void;
  selectedYear: number | null;
}

export function Sidebar({ onSelectGame, selectedYear }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IGDBGameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGames = async (searchQuery: string, yearFilter: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/igdb/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, year: yearFilter }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to search games");
      }
      
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Refetch when selected year changes or on mount
    searchGames(query, selectedYear);
  }, [selectedYear]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGames(query, selectedYear);
  };

  return (
    <div className="w-80 bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-900 flex flex-col h-screen overflow-hidden shadow-2xl relative z-50">
      <div className="p-6 border-b border-zinc-800/50">
        <h2 className="text-xl font-bold mb-4 text-zinc-100 flex items-center font-display tracking-tight">
          {selectedYear ? (
            <span className="flex items-center gap-2">
              <span className="text-indigo-400">●</span>
              Selecionando for {selectedYear}
            </span>
          ) : (
            "Selecione um ano primeiro"
          )}
        </h2>
        
        <form onSubmit={handleSearch} className="relative mt-2">
          <input
            type="text"
            className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-zinc-500 text-sm transition-all"
            placeholder="Procure por um jogo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!selectedYear}
          />
          <button 
            type="submit" 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-indigo-400 transition-colors"
            disabled={!selectedYear}
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
        {!selectedYear ? (
           <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4 px-6 text-center">
             <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-900/50">
                <Search className="w-5 h-5 text-zinc-600" />
             </div>
             <p className="text-sm">Clique em um cartão de ano para pesquisar pelo seu jogo do ano.</p>
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
                 Nenhum jogo encontrado. Tente um termo de pesquisa diferente.
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
