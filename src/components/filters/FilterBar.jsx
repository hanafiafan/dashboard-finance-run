import { X, SlidersHorizontal } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';

export default function FilterBar() {
  const {
    filters, setFilter, clearFilters, activeFilterCount,
    companies, brandOptions, categories,
    selectedCompany, selectedBrand,
  } = useFilters();

  const activePills = [];
  if (filters.company) activePills.push({ key: 'company', label: `Company: ${filters.company}` });
  if (filters.brandKey) activePills.push({ key: 'brandKey', label: `Brand: ${filters.brandKey}` });
  if (filters.category) activePills.push({ key: 'category', label: `Kategori: ${filters.category}` });
  if (filters.startDate || filters.endDate) {
    activePills.push({ key: 'period', label: `${filters.startDate || '…'} → ${filters.endDate || '…'}` });
  }
  if (filters.year) activePills.push({ key: 'year', label: `Tahun: ${filters.year}` });

  return (
    <section className="filter-band">
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

      {activeFilterCount > 0 && (
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
            Clear ({activeFilterCount})
          </span>
        </>
      )}
    </section>
  );
}
