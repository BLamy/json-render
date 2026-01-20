import {
  createSlice,
  createSelector,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { RootState } from "../index";

/**
 * Filter state for dashboard views
 */
export interface FiltersState {
  // User filters
  userSearch: string;
  selectedDepartment: string | null;
  selectedRoles: string[];
  showActiveUsersOnly: boolean;

  // Product filters
  productSearch: string;
  selectedCategory: string | null;
  showActiveProductsOnly: boolean;

  // Order filters
  selectedOrderStatus: string | null;
  selectedUserId: string | null;

  // Global
  dateRange: {
    start: string | null;
    end: string | null;
  };
}

const initialState: FiltersState = {
  userSearch: "",
  selectedDepartment: null,
  selectedRoles: [],
  showActiveUsersOnly: false,

  productSearch: "",
  selectedCategory: null,
  showActiveProductsOnly: false,

  selectedOrderStatus: null,
  selectedUserId: null,

  dateRange: {
    start: null,
    end: null,
  },
};

export const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    // User filter actions
    setUserSearch: (state, action: PayloadAction<string>) => {
      state.userSearch = action.payload;
    },
    setSelectedDepartment: (state, action: PayloadAction<string | null>) => {
      state.selectedDepartment = action.payload;
    },
    toggleRole: (state, action: PayloadAction<string>) => {
      const role = action.payload;
      const index = state.selectedRoles.indexOf(role);
      if (index === -1) {
        state.selectedRoles.push(role);
      } else {
        state.selectedRoles.splice(index, 1);
      }
    },
    setShowActiveUsersOnly: (state, action: PayloadAction<boolean>) => {
      state.showActiveUsersOnly = action.payload;
    },

    // Product filter actions
    setProductSearch: (state, action: PayloadAction<string>) => {
      state.productSearch = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },
    setShowActiveProductsOnly: (state, action: PayloadAction<boolean>) => {
      state.showActiveProductsOnly = action.payload;
    },

    // Order filter actions
    setSelectedOrderStatus: (state, action: PayloadAction<string | null>) => {
      state.selectedOrderStatus = action.payload;
    },
    setSelectedUserId: (state, action: PayloadAction<string | null>) => {
      state.selectedUserId = action.payload;
    },

    // Date range actions
    setDateRange: (
      state,
      action: PayloadAction<{ start: string | null; end: string | null }>,
    ) => {
      state.dateRange = action.payload;
    },

    // Reset actions
    resetUserFilters: (state) => {
      state.userSearch = "";
      state.selectedDepartment = null;
      state.selectedRoles = [];
      state.showActiveUsersOnly = false;
    },
    resetProductFilters: (state) => {
      state.productSearch = "";
      state.selectedCategory = null;
      state.showActiveProductsOnly = false;
    },
    resetOrderFilters: (state) => {
      state.selectedOrderStatus = null;
      state.selectedUserId = null;
    },
    resetAllFilters: () => initialState,
  },
});

// Actions
export const {
  setUserSearch,
  setSelectedDepartment,
  toggleRole,
  setShowActiveUsersOnly,
  setProductSearch,
  setSelectedCategory,
  setShowActiveProductsOnly,
  setSelectedOrderStatus,
  setSelectedUserId,
  setDateRange,
  resetUserFilters,
  resetProductFilters,
  resetOrderFilters,
  resetAllFilters,
} = filtersSlice.actions;

// Simple selectors
export const selectUserSearch = (state: RootState) => state.filters.userSearch;
export const selectSelectedDepartment = (state: RootState) =>
  state.filters.selectedDepartment;
export const selectSelectedRoles = (state: RootState) =>
  state.filters.selectedRoles;
export const selectShowActiveUsersOnly = (state: RootState) =>
  state.filters.showActiveUsersOnly;
export const selectProductSearch = (state: RootState) =>
  state.filters.productSearch;
export const selectSelectedCategory = (state: RootState) =>
  state.filters.selectedCategory;
export const selectShowActiveProductsOnly = (state: RootState) =>
  state.filters.showActiveProductsOnly;
export const selectSelectedOrderStatus = (state: RootState) =>
  state.filters.selectedOrderStatus;
export const selectSelectedUserId = (state: RootState) =>
  state.filters.selectedUserId;
export const selectDateRange = (state: RootState) => state.filters.dateRange;

// Derived selectors
export const selectHasActiveUserFilters = createSelector(
  [
    selectUserSearch,
    selectSelectedDepartment,
    selectSelectedRoles,
    selectShowActiveUsersOnly,
  ],
  (search, department, roles, activeOnly) =>
    search.length > 0 || department !== null || roles.length > 0 || activeOnly,
);

export const selectHasActiveProductFilters = createSelector(
  [selectProductSearch, selectSelectedCategory, selectShowActiveProductsOnly],
  (search, category, activeOnly) =>
    search.length > 0 || category !== null || activeOnly,
);

export const selectHasActiveOrderFilters = createSelector(
  [selectSelectedOrderStatus, selectSelectedUserId],
  (status, userId) => status !== null || userId !== null,
);

// Parameterized selector
export const selectIsRoleSelected = (role: string) =>
  createSelector([selectSelectedRoles], (roles) => roles.includes(role));

export default filtersSlice.reducer;
