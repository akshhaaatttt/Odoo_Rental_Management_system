import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true 
      }),
      
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
      },
      
      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData }
      })),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Search/Filter Store
export const useFilterStore = create(
  persist(
    (set) => ({
      searchDates: {
        startDate: null,
        endDate: null,
      },
      filters: {
        category: '',
        priceMin: '',
        priceMax: '',
        brand: '',
      },
      
      setSearchDates: (startDate, endDate) => set({
        searchDates: { startDate, endDate }
      }),
      
      setFilters: (filters) => set({ filters }),
      
      clearFilters: () => set({
        searchDates: { startDate: null, endDate: null },
        filters: { category: '', priceMin: '', priceMax: '', brand: '' }
      }),
    }),
    {
      name: 'filter-storage',
    }
  )
);

// Cart Store
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity, rentalStart, rentalEnd, unitPrice) => {
        const items = get().items;
        const existingItemIndex = items.findIndex(
          item => item.productId === product.id &&
                  item.rentalStart === rentalStart &&
                  item.rentalEnd === rentalEnd
        );

        if (existingItemIndex > -1) {
          // Update quantity
          const newItems = [...items];
          newItems[existingItemIndex].quantity += quantity;
          set({ items: newItems });
        } else {
          // Add new item
          set({
            items: [
              ...items,
              {
                productId: product.id,
                product,
                quantity,
                rentalStart,
                rentalEnd,
                unitPrice: unitPrice || parseFloat(product.rentPrice),
              },
            ],
          });
        }
      },
      
      removeItem: (productId, rentalStart) => {
        set({ 
          items: get().items.filter(item => 
            !(item.productId === productId && item.rentalStart === rentalStart)
          ) 
        });
      },
      
      updateItem: (productId, rentalStart, updates) => {
        const items = get().items;
        const itemIndex = items.findIndex(
          item => item.productId === productId && item.rentalStart === rentalStart
        );
        
        if (itemIndex > -1) {
          const newItems = [...items];
          newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
          set({ items: newItems });
        }
      },
      
      updateQuantity: (productId, quantity) => {
        const items = get().items;
        const itemIndex = items.findIndex(item => item.productId === productId);
        
        if (itemIndex > -1) {
          const newItems = [...items];
          newItems[itemIndex].quantity = quantity;
          set({ items: newItems });
        }
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        const items = get().items;
        return items.reduce((total, item) => {
          return total + (parseFloat(item.unitPrice) * item.quantity);
        }, 0);
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
