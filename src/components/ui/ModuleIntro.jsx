import { ArrowDownLeft, ArrowUpRight, Wallet, CalendarClock, ReceiptText, Landmark, TrendingUp, Building2, HandCoins, Layers3 } from 'lucide-react';
export const OPERATION_GROUPS = [
  {id:'cash',label:'Transaksi & kas',description:'Uang masuk, keluar, dan rekening',icon:Wallet,entities:['income','outcome','bank']},
  {id:'planning',label:'Anggaran & rencana',description:'Pengajuan, forecast, dan omzet',icon:CalendarClock,entities:['budget','forecast','forecastOut','omzet']},
  {id:'obligations',label:'Kewajiban & tagihan',description:'Hutang, piutang, dan biaya layanan',icon:ReceiptText,entities:['payables','receivables','service']},
];
const META = {
  income:{icon:ArrowDownLeft,label:'Pemasukan aktual',note:'Catat dana yang sudah diterima. Pilih rekening tujuan untuk memperbarui saldo.',tone:'sage'},
  outcome:{icon:ArrowUpRight,label:'Pengeluaran aktual',note:'Catat pengeluaran beserta biaya tambahan dan rekening sumber dana.',tone:'peach'},
  bank:{icon:Landmark,label:'Rekening & kas',note:'Pantau saldo setiap rekening dan catat perpindahan dana antar rekening.',tone:'olive'},
  budget:{icon:Wallet,label:'Pengajuan dana',note:'Ajukan kebutuhan dana, tentukan prioritas, lalu pantau proses persetujuan.',tone:'peach'},
  forecast:{icon:CalendarClock,label:'Rencana pemasukan',note:'Perkirakan nominal dan tanggal pencairan untuk membantu proyeksi kas.',tone:'lavender'},
  forecastOut:{icon:CalendarClock,label:'Rencana pengeluaran',note:'Susun estimasi pembayaran agar kebutuhan kas dapat disiapkan lebih awal.',tone:'lavender'},
  omzet:{icon:TrendingUp,label:'Target & realisasi omzet',note:'Bandingkan hasil penjualan setiap bulan dengan target yang telah ditetapkan.',tone:'sage'},
  payables:{icon:ReceiptText,label:'Hutang usaha',note:'Pantau kewajiban kepada pemasok dan sisa pembayaran yang belum diselesaikan.',tone:'peach'},
  receivables:{icon:HandCoins,label:'Piutang usaha',note:'Lihat tagihan pelanggan dan sisa penerimaan yang masih perlu ditindaklanjuti.',tone:'sage'},
  service:{icon:Building2,label:'Biaya layanan',note:'Kelola pencatatan jasa dan layanan yang mendukung kegiatan perusahaan.',tone:'lavender'},
};
export default function ModuleIntro({entity,count,loading}) {
  const {icon:Icon=Layers3,label,note,tone='sage'}=META[entity] || {};
  return <div className={`module-intro tone-${tone}`}><span className="module-icon"><Icon size={25}/></span><div><span className="overline">OPERASIONAL / {entity?.toUpperCase()}</span><h3>{label}</h3><p>{note}</p></div><div className="module-count"><strong>{loading?'…':count}</strong><span>data ditemukan</span></div></div>;
}
