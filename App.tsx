import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { IGDBGameResult, GOTYEntry } from "./types";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";

const START_YEAR = 1991;
const END_YEAR = 2026;
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

export default function App() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [gotyData, setGotyData] = useState<Record<number, GOTYEntry>>({});
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("my_goty_data");
    if (saved) {
      try {
        setGotyData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
  }, []);

  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      setIsExporting(true);
      
      // Temporarily remove selection effect for export
      const originalSelectedYear = selectedYear;
      setSelectedYear(null);
      
      // Wait for React to render without selection state
      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: "#09090b", // Matches zinc-950
        style: {
          background: "#09090b",
        }
      });

      setSelectedYear(originalSelectedYear); // Restore selection

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "minha-lista-goty.png";
      a.click();
    } catch (err) {
      console.error("Failed to export image", err);
      alert("Não foi possível exportar a imagem. Por favor, tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectGame = (game: IGDBGameResult) => {
    if (!selectedYear) {
      alert("Por favor, selecione um ano primeiro clicando em um card do ano.");
      return;
    }

    const newGotyData = {
      ...gotyData,
      [selectedYear]: {
        year: selectedYear,
        gameId: game.id,
        gameName: game.name,
        coverId: game.cover?.image_id || null,
      },
    };

    setGotyData(newGotyData);
    localStorage.setItem("my_goty_data", JSON.stringify(newGotyData));
    // setSelectedYear(null); // Keep the year selected as requested
  };

  return (
    <div className="flex bg-zinc-950 min-h-screen text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Backdrop for mobile drawer */}
      {selectedYear !== null && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-350"
          onClick={() => setSelectedYear(null)}
        />
      )}

      <Sidebar 
        onSelectGame={handleSelectGame} 
        selectedYear={selectedYear} 
        onClose={() => setSelectedYear(null)} 
      />
      
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 xl:p-12 relative custom-scrollbar">
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2.5 rounded-lg border border-zinc-800 transition-all shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {isExporting ? "Exportando..." : "Exportar como PNG"}
          </button>
        </div>

        <div className="max-w-7xl mx-auto" ref={exportRef}>
          <header className="mb-12 text-center space-y-3 pt-8 sm:pt-4">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 font-display tracking-tight">
              Meu Jogo do Ano
            </h1>
            <p className="text-zinc-500 font-medium tracking-wide text-sm font-display uppercase letter-spacing-2">
              {START_YEAR} — {END_YEAR}
            </p>
          </header>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {YEARS.map((year) => {
              const entry = gotyData[year];
              const isSelected = selectedYear === year;
              
              return (
                <div key={year} className="flex flex-col space-y-3">
                  <div className={`text-center font-display font-medium text-lg tracking-wide transition-colors ${isSelected ? "text-indigo-400 font-bold" : entry ? "text-zinc-100" : "text-zinc-500"}`}>
                    {year}
                  </div>
                  <div 
                    className={`aspect-[3/4] flex flex-col justify-between items-center relative cursor-pointer group transition-all duration-300 rounded-xl border overflow-hidden ${
                      isSelected 
                        ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02] z-10" 
                        : entry 
                          ? "border-zinc-800/80 hover:border-zinc-500 shadow-md hover:shadow-xl" 
                          : "bg-zinc-900/30 border-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800/50"
                    }`}
                    onClick={() => setSelectedYear(year)}
                  >
                    {entry && entry.coverId && (
                      <div className="absolute inset-0 z-0 bg-zinc-900">
                        <img 
                          src={`https://images.igdb.com/igdb/image/upload/t_cover_big/${entry.coverId}.jpg`}
                          alt={entry.gameName || "Game"}
                          className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? "scale-105" : "group-hover:scale-105"}`}
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none transition-opacity duration-300 ${isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`} />
                        {isSelected && <div className="absolute inset-0 bg-indigo-500/20 mix-blend-overlay pointer-events-none" />}
                      </div>
                    )}

                    <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative z-10 p-3">
                      {!entry ? (
                        <div className="flex flex-col items-center justify-center space-y-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <div className={`w-8 h-8 rounded-full border border-dashed flex items-center justify-center ${isSelected ? "border-indigo-400 text-indigo-400 bg-indigo-500/10" : "border-zinc-600 text-zinc-600"}`}>
                            +
                          </div>
                          <span className={`text-xs font-medium ${isSelected ? "text-indigo-400" : "text-zinc-500"}`}>
                            {isSelected ? "Selecionar..." : "Adicionar"}
                          </span>
                        </div>
                      ) : !entry.coverId && entry.gameName ? (
                        <div className="text-center font-medium text-sm px-3 text-zinc-100 w-full drop-shadow-md">
                          {entry.gameName}
                        </div>
                      ) : null}
                    </div>
                    
                    {isSelected && (
                      <div className="absolute inset-0 ring-2 ring-inset ring-indigo-500 rounded-xl z-30 pointer-events-none" />
                    )}
                    
                    {entry && !isSelected && (
                       <div className="absolute bottom-4 left-0 right-0 px-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 text-center z-20">
                         <p className="text-[11px] leading-tight font-medium text-zinc-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                           {entry.gameName}
                         </p>
                       </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
