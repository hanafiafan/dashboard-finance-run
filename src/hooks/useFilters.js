import { useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';

/**
 * Cascading Filters Hook
 * - Company → Brand chaining
 * - Category filter from data
 * - Date range and year filter
 * - URL synchronization
 */
export function useFilters() {
  const { app, setFilters } = useApp();
  const state = app.state;
  const filters = app.filters || {};

  // Extract brand → company mapping
  const allBrands = state?.brands || [];
  
  const companies = useMemo(() => {
    const set = new Set(allBrands.map(b => b.Company).filter(Boolean));
    return ['', ...Array.from(set).sort()];
  }, [allBrands]);

  // Cascading: brands filtered by selected company
  const filteredBrands = useMemo(() => {
    if (!filters.company) return allBrands;
    return allBrands.filter(b => b.Company === filters.company);
  }, [allBrands, filters.company]);

  // Company -> available brand keys
  const brandOptions = useMemo(() => {
    return filteredBrands.map(b => ({
      value: b['Brand Key'],
      label: b.Brand || b['Brand Key'],
    }));
  }, [filteredBrands]);

  // Categories from data
  const categories = useMemo(() => {
    return state?.options?.categories || [];
  }, [state]);

  const setFilter = useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    
    // If company changes, reset brand if current brand not in new company
    if (key === 'company' && value) {
      const brandsInNewCompany = allBrands.filter(b => b.Company === value);
      const currentBrandStillValid = brandsInNewCompany.some(b => b['Brand Key'] === newFilters.brandKey);
      if (!currentBrandStillValid) newFilters.brandKey = '';
    }
    
    setFilters(newFilters);
  }, [filters, setFilters, allBrands]);

  const clearFilters = useCallback(() => {
    setFilters({ company: '', brandKey: '', startDate: '', endDate: '', year: '', category: '' });
  }, [setFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.company) count++;
    if (filters.brandKey) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.year) count++;
    if (filters.category) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    companies,
    allBrands,
    filteredBrands,
    brandOptions,
    categories,
    selectedCompany: filters.company || '',
    selectedBrand: filters.brandKey || '',
  };
}
