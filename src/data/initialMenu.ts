import type { MenuItem } from '../types';

export const LEGACY_MENU_IDS = [
  'bn-panggang-crispy',
  'bn-nasi-campur',
  'bn-sate-babi',
  'bn-iga-bakar',
  'bn-paket-keluarga',
  'bn-es-jeruk-pandan',
];

export const MENU_IMAGE_PRESETS: Array<{ label: string; url: string }> = [
  {
    label: 'Babi Kecap',
    url: '/src/assets/images/menu_babi_kecap_1795666125306.jpg',
  },
  {
    label: 'Babi Rica',
    url: '/src/assets/images/menu_babi_rica_1795666125959.jpg',
  },
  {
    label: 'Paket Babi Kecap + Nasi',
    url: '/src/assets/images/menu_paket_kecap_nasi_1795666125400.jpg',
  },
  {
    label: 'Paket Babi Rica + Nasi',
    url: '/src/assets/images/menu_paket_rica_nasi_1795666126474.jpg',
  },
  {
    label: 'Babi Kecap Kiloan',
    url: '/src/assets/images/menu_kecap_kiloan_1795666126975.jpg',
  },
  {
    label: 'Babi Rica Kiloan',
    url: '/src/assets/images/menu_rica_kiloan_1795666127575.jpg',
  },
  {
    label: 'Minuman Segar',
    url: '/src/assets/images/menu_minuman_segar_1795660826358.jpg',
  },
];

export const INITIAL_MENU: MenuItem[] = [
  {
    id: 'bn-babi-kecap',
    name: 'Babi Kecap',
    category: 'Lauk Satuan',
    price: 25000,
    description:
      'Daging babi pilihan dimasak perlahan dengan kecap manis kental, bawang putih, cengkih, dan bunga lawang hingga meresap.',
    portionInfo: '1 Porsi Lauk · Gurih Manis',
    imageUrl: '/src/assets/images/menu_babi_kecap_1795666125306.jpg',
    available: true,
    featured: true,
  },
  {
    id: 'bn-babi-rica',
    name: 'Babi Rica',
    category: 'Lauk Satuan',
    price: 25000,
    description:
      'Olahan babi tumis bumbu rica-rica pedas khas Nusantara dengan serai, daun jeruk, dan kemangi segar.',
    portionInfo: '1 Porsi Lauk · Pedas Mantap',
    imageUrl: '/src/assets/images/menu_babi_rica_1795666125959.jpg',
    available: true,
    featured: true,
  },
  {
    id: 'bn-paket-babi-rica-nasi',
    name: 'Paket Babi Rica + Nasi',
    category: 'Paket Nasi',
    price: 27000,
    description:
      'Paket hemat praktis berisi nasi putih hangat pulen, seporsi Babi Rica pedas gurih, lalapan timun, dan kerupuk.',
    portionInfo: '1 Porsi + Nasi · Pedas Mantap',
    imageUrl: '/src/assets/images/menu_paket_rica_nasi_1795666126474.jpg',
    available: true,
    featured: true,
  },
  {
    id: 'bn-paket-babi-kecap-nasi',
    name: 'Paket Babi Kecap + Nasi',
    category: 'Paket Nasi',
    price: 27000,
    description:
      'Nasi putih hangat dengan lauk Babi Kecap bumbu rempah, telur kecap, irisan timun, dan sambal pendamping.',
    portionInfo: '1 Porsi + Nasi · Gurih Manis',
    imageUrl: '/src/assets/images/menu_paket_kecap_nasi_1795666125400.jpg',
    available: true,
    featured: true,
  },
  {
    id: 'bn-babi-kecap-kiloan',
    name: 'Babi Kecap Kiloan',
    category: 'Menu Kiloan',
    price: 210000,
    description:
      'Porsi jumbo 1 Kg Babi Kecap empuk berkuah karamel rempah untuk acara keluarga, arisan, atau stok lauk di rumah.',
    portionInfo: '1 Kg · Untuk 5–6 Orang',
    imageUrl: '/src/assets/images/menu_kecap_kiloan_1795666126975.jpg',
    available: true,
    featured: false,
  },
  {
    id: 'bn-babi-rica-kiloan',
    name: 'Babi Rica Kiloan',
    category: 'Menu Kiloan',
    price: 210000,
    description:
      'Porsi jumbo 1 Kg Babi Rica bumbu cabai merah melimpah, wangi daun jeruk dan kemangi, siap santap bersama keluarga.',
    portionInfo: '1 Kg · Untuk 5–6 Orang',
    imageUrl: '/src/assets/images/menu_rica_kiloan_1795666127575.jpg',
    available: true,
    featured: false,
  },
];
