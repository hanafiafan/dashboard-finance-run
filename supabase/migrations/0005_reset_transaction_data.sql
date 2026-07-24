-- Resets all transactional/operational data so the system can be filled in
-- from zero. Keeps reference/master data intact: fin_brands, fin_sources,
-- fin_vendors, fin_customers, and profiles (login accounts) are NOT touched.
truncate table
  fin_budget,
  fin_income,
  fin_outcome,
  fin_forecast_cashin,
  fin_forecast_cashout,
  fin_omzet,
  fin_bank,
  fin_service,
  fin_payables,
  fin_receivables
restart identity;
