import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";

interface ProgramItem {
  id: string;
  workout_id: string;
  program_id: string;
  order_index: number;
  day_label: string;
  item_type: string;
  workouts: any; // Nested workout data
}

interface ProgramStore {
  // State
  items: ProgramItem[];
  isSidebarOpen: boolean;
  
  // Actions
  setItems: (items: ProgramItem[]) => void;
  toggleSidebar: () => void;
  
  addItem: (item: ProgramItem) => void;
  removeItem: (itemId: string) => void;
  moveItem: (oldIndex: number, newIndex: number) => void;
  updateItemOrder: (id: string, newIndex: number) => void; // For DB sync logic helper
}

export const useProgramStore = create<ProgramStore>((set) => ({
  items: [],
  isSidebarOpen: true,

  setItems: (items) => set({ items }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  addItem: (item) => set((state) => ({ 
    items: [...state.items, item] 
  })),

  removeItem: (itemId) => set((state) => ({
    items: state.items.filter((i) => i.id !== itemId)
  })),

  moveItem: (oldIndex, newIndex) => set((state) => ({
    items: arrayMove(state.items, oldIndex, newIndex)
  })),

  updateItemOrder: (id, newIndex) => {
    // Helper if we needed granular updates, usually moveItem is enough
  }
}));