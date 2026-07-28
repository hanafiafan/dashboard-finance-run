import { X, SlidersHorizontal } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useApp } from '../../contexts/AppContext';

// Which filter controls actually do something for a given view/entity — driven
// by the same date/category/brand rules financeApi.js uses to build queries
// (ENTITY_DATE_COL, ENTITY_CATEGORY_COL, and the vendors/customers/users
// brand-filter exclusion), so a control never shows unless it can affect the
// data on screen.
const OPERATIONS_FILTERS = {
  budget: ['company', 'brand', 'category', 'date'],
  income: ['company', 'brand', 'date'],
  forecast: ['company', 'brand', 'date'],
  forecastOut: ['company', 'brand', 'category', 'date'],
  outcome: ['company', 'brand', 'category', 'date'],
  omzet: ['company', 'brand', 'year'],
  bank: ['company', 'brand'],
  service: ['company', 'brand', 'date'],
  payables: ['company', 'brand'],
  receivables: ['company', 'brand'],
};

const MASTER_FILTERS = {
  users: [],
  brands: ['company', 'brand'],
  sources: ['company', 'brand'],
  vendors: [],
  customers: [],
};

function visibleFiltersFor(app) {
  switch (app.view) {
    case 'command':
    case 'analytics':
      return ['company', 'brand', 'category', 'date', 'year'];
    case 'approval':
      return ['company', 'brand', 'category', 'date'];
    case 'operations':
      return OPERATIONS_FILTERS[app.entity] || [];
    case 'master':
      return MASTER_FILTERS[app.master] || [];
    default:
      return [];
  }
}

export default function FilterBar() {
  const { app } = useApp();
  const {
    filters, setFilter, clearFilters,
    companies, brandOptions, categories,
    selectedCompany, selectedBrand,
  } = useFilters();

  const visible = visibleFiltersFor(app);
  if (!visible.length) return null;

  const show = (key) => visible.includes(key);

  const activePills = [];
  if (show('company') && filters.company) activePills.push({ key: 'company', label: `Company: ${filters.company}` });
  if (show('brand') && filters.brandKey) activePills.push({ key: 'brandKey', label: `Brand: ${filters.brandKey}` });
  if (show('category') && filters.category) activePills.push({ key: 'category', label: `Kategori: ${filters.category}` });
  if (show('date') && (filters.startDate || filters.endDate)) {
    activePills.push({ key: 'period', label: `${filters.startDate || '…'} → ${filters.endDate || '…'}` });
  }
  if (show('year') && filters.year) activePills.push({ key: 'year', label: `Tahun: ${filters.year}` });

  return (
    <section className="filter-band">
      {show('company') && (
        <div className="field">
          <label htmlFor="companyFilter">Company</label>
          <select
            id="companyFilter"
            value={selectedCompany}
            onChange={e => setFilter('company', e.target.value)}
          >
            <option value="">All Companies ({companies.length - 1})</option>
            {companies.filter(Boolean).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {show('brand') && (
        <div className="field">
          <label htmlFor="brandFilter">Brand</label>
          <select
            id="brandFilter"
            value={selectedBrand}
            onChange={e => setFilter('brandKey', e.target.value)}
            style={{ minWidth: 150 }}
          >
            <option value="">
              {selectedCompany ? `All ${selectedCompany} brands` : 'All Brands'}
            </option>
            {brandOptions.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
      )}

      {show('category') && (
        <div className="field">
          <label htmlFor="categoryFilter">Kategori</label>
          <select
            id="categoryFilter"
            value={filters.category || ''}
            onChange={e => setFilter('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {show('date') && (
        <>
          <div className="field">
            <label htmlFor="startDate">From</label>
            <input
              id="startDate"
              type="date"
              value={filters.startDate || ''}
              onChange={e => setFilter('startDate', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="endDate">To</label>
            <input
              id="endDate"
              type="date"
              value={filters.endDate || ''}
              onChange={e => setFilter('endDate', e.target.value)}
            />
          </div>
        </>
      )}

      {show('year') && (
        <div className="field">
          <label htmlFor="yearFilter">Year</label>
          <input
            id="yearFilter"
            type="number"
            min="2020"
            max="2100"
            placeholder="2026"
            value={filters.year || ''}
            onChange={e => setFilter('year', e.target.value)}
            style={{ minWidth: 80 }}
          />
        </div>
      )}

      {activePills.length > 0 && (
        <>
          {activePills.map(pill => (
            <span
              key={pill.key}
              className="filter-pill"
              onClick={() => {
                if (pill.key === 'period') { setFilter('startDate', ''); setFilter('endDate', ''); }
                else setFilter(pill.key, '');
              }}
              title="Klik untuk hapus filter"
            >
              {pill.label}
              <X size={12} />
            </span>
          ))}
          <span className="filter-pill clear" onClick={clearFilters}>
            <SlidersHorizontal size={12} />
            Clear ({activePills.length})
          </span>
        </>
      )}
    </section>
  );
}
