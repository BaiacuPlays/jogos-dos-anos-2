import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { IGDBGameResult, GameEntry, POKEMON_CATEGORIES, ListCategory, CustomList } from "./types";
import { toPng } from "html-to-image";
import { Download, Plus, Trash2, RotateCcw, X, FolderPlus, Trash, Share2, Copy, Pencil } from "lucide-react";

const START_YEAR = 1991;
const END_YEAR = 2026;
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

const DEFAULT_LISTS: CustomList[] = [
  {
    id: "goty",
    title: "Jogo do Ano",
    subtitle: "Meu Jogo do Ano",
    isSystem: true,
    categories: YEARS.map(year => ({
      id: String(year),
      label: String(year),
      searchYear: year
    }))
  },
  {
    id: "pokemon",
    title: "Pokémon do Ano",
    subtitle: "Pokémon Mainline Games - Favoritos em Português",
    isSystem: true,
    categories: POKEMON_CATEGORIES.map(cat => ({
      id: cat.id,
      label: cat.label,
      searchKeyword: "pokemon"
    }))
  }
];

export default function App() {
  const [lists, setLists] = useState<CustomList[]>([]);
  const [activeListId, setActiveListId] = useState<string>("goty");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [allListsData, setAllListsData] = useState<Record<string, Record<string, GameEntry>>>({});
  
  // State for copying & pasting cards (categories)
  const [copiedCard, setCopiedCard] = useState<{
    category: Omit<ListCategory, "id">;
    game?: GameEntry;
  } | null>(null);

  // Custom Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Custom Toast Notification state
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "info"
  });

  // Helper functions for notification & confirmation
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({
      isOpen: true,
      message,
      type
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Auto-dismiss toast effect
  useEffect(() => {
    if (toast.isOpen) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, isOpen: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.isOpen]);
  
  // Custom Card/Card Add Modal State
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [newCardLabel, setNewCardLabel] = useState("");
  const [newCardSearchType, setNewCardSearchType] = useState<"none" | "keyword" | "year">("none");
  const [newCardKeyword, setNewCardKeyword] = useState("");
  const [newCardYear, setNewCardYear] = useState("");

  // Custom Card/Card Rename Modal State
  const [isRenameCardModalOpen, setIsRenameCardModalOpen] = useState(false);
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renameCardLabel, setRenameCardLabel] = useState("");
  const [renameCardSearchType, setRenameCardSearchType] = useState<"none" | "keyword" | "year">("none");
  const [renameCardKeyword, setRenameCardKeyword] = useState("");
  const [renameCardYear, setRenameCardYear] = useState("");

  // Custom List Create Modal State
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [newListSubtitle, setNewListSubtitle] = useState("");

  // Sharing & Importing Modals State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCode, setShareCode] = useState("");
  const [isCopyingSuccess, setIsCopyingSuccess] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Load configuration and data from LocalStorage
  useEffect(() => {
    // 1. Initial config load
    const savedConfigs = localStorage.getItem("my_custom_lists_configs");
    let activeLists = DEFAULT_LISTS;
    if (savedConfigs) {
      try {
        activeLists = JSON.parse(savedConfigs);
      } catch (e) {
        console.error("Failed to parse dynamic list configs", e);
      }
    }
    setLists(activeLists);

    // 2. Initial saved game data load
    const initialData: Record<string, Record<string, GameEntry>> = {};
    
    // Legacy support for GOTY
    const savedGoty = localStorage.getItem("my_goty_data");
    if (savedGoty) {
      try {
        initialData["goty"] = JSON.parse(savedGoty);
      } catch (e) {
        console.error("Failed to load goty legacy data", e);
      }
    } else {
      initialData["goty"] = {};
    }

    // Legacy support for Pokémon
    const savedPokemon = localStorage.getItem("my_pokemon_data");
    if (savedPokemon) {
      try {
        initialData["pokemon"] = JSON.parse(savedPokemon);
      } catch (e) {
        console.error("Failed to load pokemon legacy data", e);
      }
    } else {
      initialData["pokemon"] = {};
    }

    // Dynamic lists data load
    activeLists.forEach(list => {
      if (list.id !== "goty" && list.id !== "pokemon") {
        const savedListData = localStorage.getItem(`my_list_data_${list.id}`);
        if (savedListData) {
          try {
            initialData[list.id] = JSON.parse(savedListData);
          } catch (e) {
            initialData[list.id] = {};
          }
        } else {
          initialData[list.id] = {};
        }
      }
    });

    setAllListsData(initialData);
  }, []);

  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      setIsExporting(true);
      
      // Temporarily remove selection effect for export
      const originalSelectedKey = selectedKey;
      setSelectedKey(null);
      
      // Wait for React to render without selection state
      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: "#09090b", // Matches zinc-950
        style: {
          background: "#09090b",
        },
        filter: (node) => {
          // Ensure node has classList to avoid Error on text, comment or pseudo nodes
          const el = node as HTMLElement;
          if (el && el.classList) {
            return el.id !== "tabs-switcher" && !el.classList.contains("non-exportable");
          }
          return true;
        }
      });

      setSelectedKey(originalSelectedKey); // Restore selection

      const activeList = lists.find(l => l.id === activeListId) || DEFAULT_LISTS[0];
      const cleanTitle = activeList.title.toLowerCase().replace(/\s+/g, "-");
      
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `minha-lista-${cleanTitle}.png`;
      a.click();
    } catch (err) {
      console.error("Failed to export image", err);
      showToast("Não foi possível exportar a imagem. Por favor, tente novamente.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectGame = (game: IGDBGameResult) => {
    if (!selectedKey) {
      showToast("Por favor, selecione um card primeiro.", "info");
      return;
    }

    const newEntry: GameEntry = {
      key: selectedKey,
      gameId: game.id,
      gameName: game.name,
      coverId: game.cover?.image_id || null,
    };

    const currentListId = activeListId;
    const updatedListData = {
      ...(allListsData[currentListId] || {}),
      [selectedKey]: newEntry,
    };

    const updatedAllData = {
      ...allListsData,
      [currentListId]: updatedListData,
    };

    setAllListsData(updatedAllData);

    // Persist
    if (currentListId === "goty") {
      localStorage.setItem("my_goty_data", JSON.stringify(updatedListData));
    } else if (currentListId === "pokemon") {
      localStorage.setItem("my_pokemon_data", JSON.stringify(updatedListData));
    } else {
      localStorage.setItem(`my_list_data_${currentListId}`, JSON.stringify(updatedListData));
    }
  };

  const handleRemoveGame = (categoryId: string) => {
    const currentListId = activeListId;
    const currentListData = { ...(allListsData[currentListId] || {}) };
    delete currentListData[categoryId];
    
    const updatedAllData = {
      ...allListsData,
      [currentListId]: currentListData,
    };
    setAllListsData(updatedAllData);

    // Persist
    if (currentListId === "goty") {
      localStorage.setItem("my_goty_data", JSON.stringify(currentListData));
    } else if (currentListId === "pokemon") {
      localStorage.setItem("my_pokemon_data", JSON.stringify(currentListData));
    } else {
      localStorage.setItem(`my_list_data_${currentListId}`, JSON.stringify(currentListData));
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    const updatedLists = lists.map(l => {
      if (l.id === activeListId) {
        return {
          ...l,
          categories: l.categories.filter(c => c.id !== categoryId)
        };
      }
      return l;
    });

    setLists(updatedLists);
    localStorage.setItem("my_custom_lists_configs", JSON.stringify(updatedLists));

    // Remove associated game from data if any
    const currentListId = activeListId;
    const currentListData = { ...(allListsData[currentListId] || {}) };
    delete currentListData[categoryId];
    
    const updatedAllData = {
      ...allListsData,
      [currentListId]: currentListData,
    };
    setAllListsData(updatedAllData);

    if (selectedKey === categoryId) {
      setSelectedKey(null);
    }
  };

  const handleRestoreDefaults = () => {
    triggerConfirm(
      "Restaurar Cards Padrões",
      "Isso redefinirá os cards desta lista padrão para as configurações originais. Continuar?",
      () => {
        const original = DEFAULT_LISTS.find(l => l.id === activeListId);
        if (!original) return;

        const updatedLists = lists.map(l => {
          if (l.id === activeListId) {
            return {
              ...l,
              categories: [...original.categories]
            };
          }
          return l;
        });

        setLists(updatedLists);
        localStorage.setItem("my_custom_lists_configs", JSON.stringify(updatedLists));
        setSelectedKey(null);
        showToast("Cards originais restaurados!", "success");
      }
    );
  };

  const handleDeleteList = (listId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      "Excluir Lista",
      "Tem certeza de que deseja excluir esta lista inteira e todas as seleções de jogos contidas nela?",
      () => {
        const updatedLists = lists.filter(l => l.id !== listId);
        setLists(updatedLists);
        localStorage.setItem("my_custom_lists_configs", JSON.stringify(updatedLists));

        localStorage.removeItem(`my_list_data_${listId}`);
        
        const updatedAllData = { ...allListsData };
        delete updatedAllData[listId];
        setAllListsData(updatedAllData);

        setActiveListId("goty");
        setSelectedKey(null);
        showToast("Lista excluída com sucesso!", "success");
      }
    );
  };

  const handleCopyCard = (category: ListCategory) => {
    const entry = allListsData[activeListId]?.[category.id];
    setCopiedCard({
      category: {
        label: category.label,
        searchKeyword: category.searchKeyword || null,
        searchYear: category.searchYear || null,
      },
      game: entry ? { ...entry } : undefined
    });
    showToast(`Card "${category.label}" copiado!`, "success");
  };

  const handlePasteCard = () => {
    if (!copiedCard) return;

    const newCatId = "custom_cat_" + Date.now();
    const newCat: ListCategory = {
      id: newCatId,
      ...copiedCard.category
    };

    const updatedLists = lists.map(l => {
      if (l.id === activeListId) {
        return {
          ...l,
          categories: [...l.categories, newCat]
        };
      }
      return l;
    });

    setLists(updatedLists);
    localStorage.setItem("my_custom_lists_configs", JSON.stringify(updatedLists));

    if (copiedCard.game) {
      const currentListId = activeListId;
      const updatedListData = {
        ...(allListsData[currentListId] || {}),
        [newCatId]: {
          ...copiedCard.game,
          key: newCatId
        }
      };

      const updatedAllData = {
        ...allListsData,
        [currentListId]: updatedListData,
      };

      setAllListsData(updatedAllData);

      if (currentListId === "goty") {
        localStorage.setItem("my_goty_data", JSON.stringify(updatedListData));
      } else if (currentListId === "pokemon") {
        localStorage.setItem("my_pokemon_data", JSON.stringify(updatedListData));
      } else {
        localStorage.setItem(`my_list_data_${currentListId}`, JSON.stringify(updatedListData));
      }
    }

    showToast(`Card "${copiedCard.category.label}" duplicado/colado nesta lista!`, "success");
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardLabel.trim()) {
      showToast("Escreva um nome para o card.", "error");
      return;
    }

    const newCatId = "custom_cat_" + Date.now();
    const newCat: ListCategory = {
      id: newCatId,
      label: newCardLabel.trim(),
      searchKeyword: newCardKeyword.trim() ? newCardKeyword.trim() : null,
      searchYear: newCardYear.trim() ? newCardYear.trim() : null
    };

    const updatedLists = lists.map(l => {
      if (l.id === activeListId) {
        return {
          ...l,
          categories: [...l.categories, newCat]
        };
      }
      return l;
    });

    setLists(updatedLists);
    localStorage.setItem("my_custom_lists_configs", JSON.stringify(updatedLists));

    // Reset fields & close
    setNewCardLabel("");
    setNewCardKeyword("");
    setNewCardYear("");
    setIsAddCardModalOpen(false);
  };

  const handleOpenRenameCardModal = (category: ListCategory) => {
    setRenamingCategoryId(category.id);
    setRenameCardLabel(category.label);
    setRenameCardKeyword(category.searchKeyword ? String(category.searchKeyword) : "");
    setRenameCardYear(category.searchYear ? String(category.searchYear) : "");
    setIsRenameCardModalOpen(true);
  };

  const handleRenameCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameCardLabel.trim()) {
      showToast("Escreva um nome para o card.", "error");
      return;
    }

    if (!renamingCategoryId) return;

    const updatedLists = lists.map(l => {
      if (l.id === activeListId) {
        return {
          ...l,
          categories: l.categories.map(c => {
            if (c.id === renamingCategoryId) {
              return {
                ...c,
                label: renameCardLabel.trim(),
                searchKeyword: renameCardKeyword.trim() ? renameCardKeyword.trim() : null,
                searchYear: renameCardYear.trim() ? renameCardYear.trim() : null
              };
            }
            return c;
          })
        };
      }
      return l;
    });

    setLists(updatedLists);
    localStorage.setItem("my_custom_lists_configs", JSON.stringify(updatedLists));
    showToast("Card atualizado com sucesso!", "success");

    // Close and reset
    setIsRenameCardModalOpen(false);
    setRenamingCategoryId(null);
    setRenameCardLabel("");
    setRenameCardKeyword("");
    setRenameCardYear("");
  };

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) {
      showToast("Escreva um título para a sua lista.", "error");
      return;
    }

    const newListId = "list_" + Date.now();
    const newList: CustomList = {
      id: newListId,
      title: newListTitle.trim(),
      subtitle: newListSubtitle.trim() || "Coleção Personalizada",
      categories: [] // Starts empty so they can build it card-by-card in real time!
    };

    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    localStorage.setItem("my_custom_lists_configs", JSON.stringify(updatedLists));

    // Automatically highlight & show the new list
    setActiveListId(newListId);
    setSelectedKey(null);

    // Reset & close
    setNewListTitle("");
    setNewListSubtitle("");
    setIsCreateListModalOpen(false);
  };

  const handleGenerateShareCode = () => {
    const activeList = lists.find(l => l.id === activeListId);
    if (!activeList) return;

    // Export payload including both config schema + selections
    const payload = {
      type: "game-vibe-list-v1",
      title: activeList.title,
      subtitle: activeList.subtitle,
      categories: activeList.categories,
      games: allListsData[activeListId] || {}
    };

    try {
      const jsonStr = JSON.stringify(payload);
      // Encode securely handling UTF-8 Portuguese strings cleanly
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
      setShareCode(encoded);
      setIsCopyingSuccess(false);
      setIsShareModalOpen(true);
    } catch (e) {
      console.error("Failed to generate share code", e);
      showToast("Não foi possível gerar o código de compartilhamento.", "error");
    }
  };

  const handleCopyCode = () => {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode).then(() => {
      setIsCopyingSuccess(true);
      setTimeout(() => setIsCopyingSuccess(false), 2000);
    }).catch(err => {
      console.error("Clipboard copy failed", err);
    });
  };

  const handleImportListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    const cleanedCode = importCodeInput.trim();
    if (!cleanedCode) {
      setImportError("Insira um código de lista válido.");
      return;
    }

    try {
      // Decode accurately preserving UTF-8 Portuguese text
      const decodedStr = decodeURIComponent(escape(atob(cleanedCode)));
      const payload = JSON.parse(decodedStr);

      if (payload.type !== "game-vibe-list-v1") {
        setImportError("Formato de código inválido ou incompatível.");
        return;
      }

      const importedListId = "list_imported_" + Date.now();
      const newImportedList: CustomList = {
        id: importedListId,
        title: payload.title || "Lista Importada",
        subtitle: payload.subtitle || "Compartilhada via Código",
        categories: Array.isArray(payload.categories) ? payload.categories : []
      };

      // Merge config with state and persist it
      const updatedLists = [...lists, newImportedList];
      setLists(updatedLists);
      localStorage.setItem("my_custom_lists_configs", JSON.stringify(updatedLists));

      // Import associated selected game entries
      const importedGames = payload.games || {};
      const updatedAllData = {
        ...allListsData,
        [importedListId]: importedGames
      };
      setAllListsData(updatedAllData);
      localStorage.setItem(`my_list_data_${importedListId}`, JSON.stringify(importedGames));

      // Success sequence
      setActiveListId(importedListId);
      setSelectedKey(null);
      setImportCodeInput("");
      setIsImportModalOpen(false);
      showToast(`Lista "${newImportedList.title}" importada com sucesso!`, "success");
    } catch (e) {
      console.error("Failed to parse or save imported list", e);
      setImportError("Falha ao decodificar a lista. Certifique-se de que copiou o código completo e correto.");
    }
  };

  const activeList = lists.find(l => l.id === activeListId) || DEFAULT_LISTS[0];
  const listData = allListsData[activeListId] || {};
  const activeCategory = activeList?.categories.find(c => c.id === selectedKey);

  return (
    <div className="flex bg-zinc-950 min-h-screen text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Backdrop for mobile drawer */}
      {selectedKey !== null && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-350"
          onClick={() => setSelectedKey(null)}
        />
      )}

      <Sidebar 
        onSelectGame={handleSelectGame} 
        selectedKey={selectedKey} 
        onClose={() => setSelectedKey(null)} 
        isPokemonMode={activeListId === "pokemon"}
        searchKeyword={activeCategory?.searchKeyword}
        searchYear={activeCategory?.searchYear}
        selectedLabel={activeCategory?.label}
      />
      
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 xl:p-12 relative custom-scrollbar">
        {/* Action Panel: Share Code & Image Download */}
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-30 flex items-center gap-2 non-exportable">
          <button
            onClick={handleGenerateShareCode}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-4 py-2.5 rounded-lg border border-indigo-500/30 transition-all shadow-md shadow-indigo-600/10 font-semibold text-sm group"
            title="Compartilhar lista com amigos via código copiado"
          >
            <Share2 className="w-4 h-4 group-hover:scale-105 transition-transform" />
            <span>Compartilhar</span>
          </button>
          
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-4 py-2.5 rounded-lg border border-zinc-800/80 transition-all shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Baixar imagem/quadro decorativo de seus favoritos"
          >
            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {isExporting ? "Exportando..." : "Exportar como PNG"}
          </button>
        </div>

        <div className="max-w-7xl mx-auto" ref={exportRef}>
          <header className="mb-8 text-center space-y-3 pt-14 sm:pt-4">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 font-display tracking-tight leading-tight">
              {activeList?.title}
            </h1>
            <p className="text-zinc-500 font-medium tracking-wide text-sm font-display uppercase letter-spacing-2">
              {activeList?.subtitle}
            </p>
          </header>

          {/* Tab Switcher - Excluded in PNG Export */}
          <div id="tabs-switcher" className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <div className="bg-zinc-900/90 border border-zinc-800/80 p-1 rounded-xl flex flex-wrap gap-1 shadow-lg max-w-full">
              {lists.map((list) => {
                const isActive = activeListId === list.id;
                return (
                  <div
                    key={list.id}
                    className={`relative flex items-center rounded-lg overflow-hidden transition-all duration-200 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActiveListId(list.id);
                        setSelectedKey(null);
                      }}
                      className={`px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all outline-none focus:outline-none ${
                        !list.isSystem ? "pr-9" : ""
                      }`}
                    >
                      <span>
                        {list.id === "goty" ? "🏆" : list.id === "pokemon" ? "✨" : "🎮"}
                        <span className="ml-1.5">{list.title}</span>
                      </span>
                    </button>

                    {/* Delete icon/button for custom lists placed safely as a sibling */}
                    {!list.isSystem && (
                      <button
                        onClick={(e) => handleDeleteList(list.id, e)}
                        className={`absolute right-1.5 p-1 hover:bg-rose-600/20 hover:text-rose-400 rounded transition-colors flex items-center justify-center cursor-pointer ${
                          isActive ? "text-indigo-200 hover:text-white" : "text-zinc-500"
                        }`}
                        title="Excluir Lista"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ➕ Criar Lista Button */}
            <button
              onClick={() => setIsCreateListModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-dashed border-zinc-800 hover:border-indigo-500 text-zinc-400 hover:text-indigo-400 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:bg-zinc-900/40"
              title="Criar uma nova lista personalizada"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Criar Lista</span>
            </button>

            {/* 📥 Importar Lista Button */}
            <button
              onClick={() => {
                setImportError(null);
                setImportCodeInput("");
                setIsImportModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-dashed border-zinc-800 hover:border-emerald-500 text-zinc-400 hover:text-emerald-400 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:bg-zinc-900/40"
              title="Importar uma lista de outro usuário via código copiado"
            >
              <Download className="w-4 h-4 rotate-180" />
              <span>Importar Lista</span>
            </button>
          </div>

          {/* Quick interactive utility action */}
          {activeList?.isSystem && !isExporting && (
            <div className="flex justify-end mb-6 -mt-4 non-exportable">
              <button
                onClick={handleRestoreDefaults}
                className="text-xs font-semibold text-zinc-500 hover:text-indigo-400 transition flex items-center gap-1.5 p-1 px-2.5 rounded hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800"
                title="Restaurar cards padrões desta lista original"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Padrões da Lista
              </button>
            </div>
          )}
          
          {/* Main Collection Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {activeList?.categories.map((category) => {
              const entry = listData[category.id];
              const isSelected = selectedKey === category.id;
              
              return (
                <div key={category.id} className="flex flex-col space-y-3">
                  {/* Category Card Representational Wrapper */}
                  <div 
                    className={`aspect-[3/4] flex flex-col justify-between items-center relative cursor-pointer group transition-all duration-300 rounded-xl border overflow-hidden ${
                      isSelected 
                        ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02] z-10" 
                        : entry 
                          ? "border-zinc-800 hover:border-zinc-500 shadow-md hover:shadow-xl" 
                          : "bg-zinc-900/30 border-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800/50"
                    }`}
                    onClick={() => setSelectedKey(category.id)}
                  >
                    {entry && entry.coverId ? (
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
                        
                        {/* Remove selected game from card trigger (on hover) */}
                        {!isExporting && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveGame(category.id);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-zinc-950/90 text-zinc-400 hover:text-rose-400 border border-zinc-800/80 rounded-full transition-all duration-150 hover:scale-105 active:scale-95 shadow-lg opacity-0 group-hover:opacity-100 z-20 non-exportable"
                            title="Remover jogo deste card"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : null}

                    {/* Overlay Label for empty search status */}
                    <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative z-10 p-3">
                      {!entry ? (
                        <div className="flex flex-col items-center justify-center space-y-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <div className={`w-8 h-8 rounded-full border border-dashed flex items-center justify-center ${isSelected ? "border-indigo-400 text-indigo-400 bg-indigo-500/10" : "border-zinc-650 text-zinc-650"}`}>
                            +
                          </div>
                          <span className={`text-[11px] font-medium tracking-wide ${isSelected ? "text-indigo-400" : "text-zinc-500"}`}>
                            {isSelected ? "Selecionar..." : "Adicionar"}
                          </span>
                        </div>
                      ) : !entry.coverId && entry.gameName ? (
                        <div className="text-center font-medium text-xs sm:text-sm px-2 text-zinc-100 w-full drop-shadow-md">
                          {entry.gameName}
                        </div>
                      ) : null}
                    </div>
                    
                    {isSelected && (
                      <div className="absolute inset-0 ring-2 ring-inset ring-indigo-500 rounded-xl z-20 pointer-events-none" />
                    )}
                    
                    {entry && !isSelected && (
                       <div className="absolute bottom-4 left-0 right-0 px-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 text-center z-20">
                         <p className="text-[10px] sm:text-[11px] leading-snug font-medium text-zinc-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-2">
                           {entry.gameName}
                         </p>
                       </div>
                    )}
                  </div>

                  {/* Card Description & Meta labels underneath */}
                  <div className="flex flex-col w-full self-stretch bg-zinc-900 border border-zinc-800/40 p-1.5 rounded-lg gap-1.5 transition-all">
                    <span 
                      className={`text-center font-display font-medium text-[10px] sm:text-xs uppercase tracking-wider block py-0.5 px-0.5 break-words line-clamp-2 min-h-[1.5rem] flex items-center justify-center leading-tight ${
                        isSelected ? "text-indigo-400 font-bold" : entry ? "text-zinc-100" : "text-zinc-400"
                      }`} 
                      title={category.label}
                    >
                      {category.label}
                    </span>
                    
                    {/* Actions Panel - Only visible when not exporting */}
                    {!isExporting && (
                      <div className="flex items-center justify-center gap-1 bg-zinc-950/40 border border-zinc-800/80 rounded p-0.5 non-exportable">
                        {/* Rename card configuration */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRenameCardModal(category);
                          }}
                          className={`p-1.5 rounded hover:bg-zinc-800/80 transition-colors flex items-center justify-center cursor-pointer ${
                            isSelected ? "text-indigo-300 hover:text-white" : "text-zinc-400 hover:text-amber-400"
                          }`}
                          title="Editar / Renomear Card"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy card configuration */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCard(category);
                          }}
                          className={`p-1.5 rounded hover:bg-zinc-800/80 transition-colors flex items-center justify-center cursor-pointer ${
                            isSelected ? "text-indigo-300 hover:text-white" : "text-zinc-400 hover:text-indigo-400"
                          }`}
                          title="Copiar Card"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Delete dynamic card completely option */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                          className={`p-1.5 rounded hover:bg-zinc-800/80 transition-colors flex items-center justify-center cursor-pointer ${
                            isSelected ? "text-indigo-300 hover:text-white" : "text-zinc-400 hover:text-rose-400"
                          }`}
                          title="Excluir Card"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Dash placeholder to trigger Adding cards inline */}
            {!isExporting && (
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => setIsAddCardModalOpen(true)}
                  className="aspect-[3/4] flex flex-col justify-center items-center cursor-pointer group transition-all duration-300 rounded-xl border border-dashed border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900/40 p-4 text-center space-y-2 non-exportable focus:outline-none"
                  title="Clique para adicionar um card de categoria personalizado"
                >
                  <Plus className="w-7 h-7 text-zinc-600 group-hover:text-indigo-400 group-hover:scale-110 transition-all pointer-events-none" />
                  <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-500 group-hover:text-indigo-400 transition-colors">
                    Adicionar Card
                  </span>
                </button>
                <div className="h-6 opacity-0" /> {/* aligned spacer */}
              </div>
            )}

            {/* Dash placeholder to Paste Copied Card inline */}
            {!isExporting && copiedCard && (
              <div className="flex flex-col space-y-3 animate-in fade-in zoom-in-95 duration-250">
                <button
                  onClick={handlePasteCard}
                  className="aspect-[3/4] flex flex-col justify-center items-center cursor-pointer group transition-all duration-300 rounded-xl border border-dashed border-emerald-800 bg-emerald-950/5 hover:border-emerald-500/50 hover:bg-emerald-950/15 p-4 text-center space-y-1 non-exportable focus:outline-none"
                  title={`Clique para colar/duplicar o card "${copiedCard.category.label}"`}
                >
                  <Copy className="w-7 h-7 text-emerald-600 group-hover:text-emerald-400 group-hover:scale-110 transition-all pointer-events-none" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-500 group-hover:text-emerald-400 transition-colors">
                    Colar Card
                  </span>
                  <span className="text-[9px] text-zinc-500 line-clamp-1 max-w-full px-1">
                    ({copiedCard.category.label})
                  </span>
                </button>
                <div className="h-6 opacity-0" /> {/* aligned spacer */}
              </div>
            )}
          </div>

          {/* Empty dynamic custom list guidance block */}
          {activeList?.categories.length === 0 && !isExporting && (
            <div className="py-16 flex flex-col items-center justify-center p-8 bg-zinc-900/10 border border-dashed border-zinc-800/80 rounded-2xl text-center max-w-lg mx-auto my-6">
              <Plus className="w-8 h-8 text-indigo-500/50 mb-3 animate-pulse" />
              <h3 className="font-semibold text-zinc-300 text-base mb-1">Sua lista está vazia!</h3>
              <p className="text-xs sm:text-sm text-zinc-500 mb-5 leading-relaxed">
                Essa lista dinâmica não possui cards configurados ainda. Adicione itens e defina como deseja pesquisar cada um deles!
              </p>
              <button
                onClick={() => setIsAddCardModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs sm:text-sm font-semibold transition shadow-md active:scale-95"
              >
                Criar Primeiro Card
              </button>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ADD CATEGORY CARD */}
      {isAddCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 text-zinc-100 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setIsAddCardModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                <span>➕</span> Adicionar Card Personalizado
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Crie um novo slot de jogo e defina filtros específicos de busca que auxiliam a encontrá-lo.
              </p>
            </div>

            <form onSubmit={handleAddCardSubmit} className="space-y-4 pt-1">
              {/* Field Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block uppercase tracking-wider">
                  Nome do Card / Categoria
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Melhor Spin-off, 2027, Pior Jogo..."
                  value={newCardLabel}
                  onChange={(e) => setNewCardLabel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm placeholder-zinc-650 transition"
                />
              </div>

              {/* Optional Search Rules - Can choose both and input multiple keywords */}
              <div className="space-y-4 p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚙️</span> Filtros de Busca (Opcionais)
                  </h4>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Associe filtros de franquia e/ou ano de lançamento para esse card. Ambos podem ser usados juntos ou deixados em branco para busca geral.
                  </p>
                </div>

                {/* Keyword(s) Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
                    Personagens / Franquias / Palavras-chave
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: mario, zelda, pokemon (separe por vírgula)"
                    value={newCardKeyword}
                    onChange={(e) => setNewCardKeyword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Você pode digitar <span className="font-semibold text-zinc-400">vários termos</span> separados por vírgula (Ex: <code className="text-indigo-400">mario, crash, sonic</code>) para o card listar jogos de qualquer uma dessas franquias.
                  </p>
                </div>

                {/* Year Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
                    Ano(s) de Lançamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2004, 2011, 2026 (separe por vírgula)"
                    value={newCardYear}
                    onChange={(e) => setNewCardYear(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Opcional. Você pode digitar <span className="font-semibold text-zinc-400">vários anos</span> separados por vírgula (Ex: <code className="text-indigo-400">2004, 2011, 2026</code>) para o card agrupar jogos dessas safras.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddCardModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow shadow-indigo-600/30"
                >
                  Adicionar Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RENAME / EDIT CARD */}
      {isRenameCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 text-zinc-100 shadow-2xl relative space-y-4">
            <button 
              onClick={() => {
                setIsRenameCardModalOpen(false);
                setRenamingCategoryId(null);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                <span>✏️</span> Editar Card de Categoria
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Altere o nome e modifique filtros de busca rápidos para este card de categoria.
              </p>
            </div>

            <form onSubmit={handleRenameCardSubmit} className="space-y-4 pt-1">
              {/* Field Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block uppercase tracking-wider">
                  Nome do Card / Categoria
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Melhor RPG, 2029..."
                  value={renameCardLabel}
                  onChange={(e) => setRenameCardLabel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm placeholder-zinc-650 transition"
                />
              </div>

              {/* Optional Search Rules */}
              <div className="space-y-4 p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚙️</span> Filtros de Busca (Opcionais)
                  </h4>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Filtros de pesquisa rápidos para orientar buscas neste card.
                  </p>
                </div>

                {/* Keyword Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
                    Franquias / Palavras-chave
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: final fantasy, gta (separe por vírgula)"
                    value={renameCardKeyword}
                    onChange={(e) => setRenameCardKeyword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Year Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
                    Ano(s) de Lançamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1997, 2026"
                    value={renameCardYear}
                    onChange={(e) => setRenameCardYear(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsRenameCardModalOpen(false);
                    setRenamingCategoryId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow shadow-indigo-600/30"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE LIST */}
      {isCreateListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 text-zinc-100 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setIsCreateListModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                <span>📁</span> Criar Nova Lista
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Crie um novo quadro/tabuleiro temático de favoritos no seu perfil local.
              </p>
            </div>

            <form onSubmit={handleCreateListSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block uppercase tracking-wider">
                  Título da Lista
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Favoritos do Nintendo DS, Meus RPGs..."
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm placeholder-zinc-650 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block uppercase tracking-wider">
                  Legenda / Subtítulo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Os meus consoles e aventuras favoritas"
                  value={newListSubtitle}
                  onChange={(e) => setNewListSubtitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm placeholder-zinc-650 transition"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateListModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow shadow-indigo-600/30"
                >
                  Criar Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXPORT/SHARE CODE DISPLAY */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 text-zinc-100 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                <span>🔗</span> Compartilhar Lista
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Copie o código gerado abaixo e envie para outra pessoa. Ela poderá importar a lista inteira, incluindo todas as regras dos seus cards e os jogos selecionados!
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Código da Coleção</label>
              <div className="relative">
                <textarea
                  readOnly
                  value={shareCode}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-350 rounded-lg p-3 text-[11px] font-mono h-32 focus:outline-none focus:border-zinc-750 resize-hidden custom-scrollbar"
                />
                <button
                  onClick={handleCopyCode}
                  className="absolute bottom-3 right-3 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-2.5 py-1.5 rounded transition shadow shadow-indigo-600/40"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopyingSuccess ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-100 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: IMPORT LIST FROM CODE */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 text-zinc-100 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                <span>📥</span> Importar Lista
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Cole o código de compartilhamento da lista gerada de outro usuário e adicione ela instantaneamente ao seu acervo local.
              </p>
            </div>

            <form onSubmit={handleImportListSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block uppercase tracking-wider">
                  Código de Compartilhamento
                </label>
                <textarea
                  required
                  placeholder="Cole aqui o código super longo que você recebeu..."
                  value={importCodeInput}
                  onChange={(e) => setImportCodeInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs font-mono h-28 placeholder-zinc-700 transition"
                />
              </div>

              {importError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-400 font-medium text-xs leading-normal">
                  ⚠️ {importError}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow shadow-emerald-600/30"
                >
                  Importar e Mostrar Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 text-zinc-100 shadow-2xl relative space-y-4">
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                <span>⚠️</span> {confirmModal.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition shadow shadow-rose-600/30"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM TOAST NOTIFICATION */}
      {toast.isOpen && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-1.5 rounded-lg text-xs leading-none shrink-0 ${
            toast.type === "success" 
              ? "bg-emerald-500/10 text-emerald-400" 
              : toast.type === "error" 
                ? "bg-rose-500/10 text-rose-400" 
                : "bg-indigo-500/10 text-indigo-400"
          }`}>
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "i"}
          </div>
          <div className="flex-1 text-xs font-medium text-zinc-200">
            {toast.message}
          </div>
          <button 
            type="button"
            onClick={() => setToast(prev => ({ ...prev, isOpen: false }))}
            className="text-zinc-500 hover:text-zinc-300 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
