-- Mengisi fin_vendors.brand_key untuk 63 vendor yang ada saat 0016 dijalankan
-- (semuanya NULL, sehingga filter per brand belum terasa efeknya).
--
-- Dua lapis, dari yang paling bisa dipercaya:
--   1. Riwayat pemakaian — vendor yang selama ini hanya dipakai satu brand di
--      fin_budget/fin_payables jelas milik brand itu. Ini bukti, bukan tebakan.
--   2. Prefix ID vendor, hanya untuk sisa yang belum pernah dipakai sama sekali.
--      NG→LBP diambil dari hasil lapis 1: 15 dari 15 vendor NG* yang pernah
--      dipakai ternyata milik LBP.
--
-- 12 vendor sengaja dibiarkan NULL karena tidak bisa ditentukan: yang memang
-- dipakai lintas brand (000011 Supplier Umum, C001 Ads Tiktok, A002, A003,
-- C002, D002) dan yang belum pernah dipakai serta ID-nya tanpa kode brand
-- (A001, A004-A007, D003). Isi manual lewat Master Data → Vendor.

-- Lapis 1: dari riwayat pemakaian nyata.
with usage as (
  select vendor_id, brand_key from fin_budget where coalesce(vendor_id, '') <> ''
  union all
  select id_pemasok, brand_key from fin_payables where coalesce(id_pemasok, '') <> ''
), single_brand as (
  select vendor_id, min(brand_key) as brand_key
  from usage group by vendor_id having count(distinct brand_key) = 1
)
update fin_vendors v set brand_key = s.brand_key
from single_brand s
where s.vendor_id = v.vendor_id and v.brand_key is null;

-- Lapis 2: prefix ID. Prefix terpanjang menang, supaya BSSM002 jatuh ke BSSM
-- bukan ke BSS.
update fin_vendors v
set brand_key = (
  select m.bk from (values
    ('BSSM','BSSM'), ('BSS','BSS'), ('MBN','MBN'), ('HAN','HAN'),
    ('PGK','PG'), ('NG','LBP'), ('NS','NUSASEED'), ('JT','BSJT')
  ) as m(prefix, bk)
  where v.vendor_id like m.prefix || '%'
  order by length(m.prefix) desc limit 1
)
where v.brand_key is null
  and exists (
    select 1 from (values
      ('BSSM','BSSM'), ('BSS','BSS'), ('MBN','MBN'), ('HAN','HAN'),
      ('PGK','PG'), ('NG','LBP'), ('NS','NUSASEED'), ('JT','BSJT')
    ) as m(prefix, bk)
    where v.vendor_id like m.prefix || '%'
  );
