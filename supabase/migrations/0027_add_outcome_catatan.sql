-- The Cash Out form has always exposed a Catatan field, but fin_outcome did
-- not have the corresponding database column. This caused PostgREST to reject
-- every Cash Out submission containing a note with a schema-cache error.
alter table fin_outcome add column if not exists catatan text;

-- Make the new column visible to PostgREST immediately after this migration.
notify pgrst, 'reload schema';
