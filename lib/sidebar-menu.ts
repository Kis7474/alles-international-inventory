export interface SidebarMenuItem {
  href?: string
  label: string
  icon: string
  adminOnly?: boolean
  submenu?: SidebarMenuItem[]
}

export const sidebarMenuItems: SidebarMenuItem[] = [
  { href: '/', label: '대시보드', icon: '📊' },
  {
    label: '매입/매출',
    icon: '💰',
    submenu: [
      { href: '/sales', label: '상세내역', icon: '📝' },
      {
        label: '리포트',
        icon: '📈',
        submenu: [
          { href: '/sales/report/monthly', label: '월별 리포트', icon: '📅' },
          { href: '/sales/report/yearly', label: '연도별 리포트', icon: '📆' },
        ],
      },
    ],
  },
  {
    label: '수입/수출',
    icon: '🌐',
    submenu: [
      { href: '/import-export', label: '수입/수출 내역', icon: '📋' },
      { href: '/import-export/new', label: '수입/수출 등록', icon: '➕' },
      { href: '/customs/tracking', label: '통관 내역', icon: '📦' },
      { href: '/exchange-rates', label: '환율 관리', icon: '💱' },
    ],
  },
  {
    label: '재고 관리',
    icon: '📦',
    submenu: [
      { href: '/warehouse/lots', label: '입고 관리', icon: '📥' },
      { href: '/warehouse/outbound', label: '출고 관리', icon: '📤' },
      { href: '/warehouse/inventory', label: '재고 조회', icon: '📊' },
      { href: '/warehouse/flow', label: '입출고 흐름', icon: '🔄' },
      { href: '/warehouse/warehouse-fee', label: '창고료 관리', icon: '💰' },
    ],
  },
  {
    label: '서비스',
    icon: '🛠️',
    submenu: [
      { href: '/services', label: '서비스', icon: '🔧' },
      { href: '/projects', label: '프로젝트 목록', icon: '📋' },
      { href: '/projects/report', label: '프로젝트 리포트', icon: '📊' },
    ],
  },
  {
    label: '문서 관리',
    icon: '📄',
    submenu: [
      { href: '/documents', label: '문서 대시보드', icon: '📊' },
      { href: '/documents/quotation', label: '견적서', icon: '📝' },
      { href: '/documents/transaction-statement', label: '거래명세서', icon: '📋' },
      { href: '/documents/monthly-vendor', label: '거래처 월합명세서', icon: '🗓️' },
    ],
  },
  {
    label: '설정',
    icon: '⚙️',
    submenu: [
      { href: '/sales/vendors', label: '거래처', icon: '🏢' },
      { href: '/master/products', label: '품목관리', icon: '📦' },
      { href: '/categories', label: '카테고리', icon: '📋' },
      { href: '/salesperson', label: '담당자', icon: '👤' },
      { href: '/master/vendor-prices', label: '가격', icon: '💰' },
      { href: '/settings/unipass', label: '유니패스 설정', icon: '🔐', adminOnly: true },
      { href: '/master/upload', label: '엑셀 업로드', icon: '📤', adminOnly: true },
    ],
  },
]

export function createInitialOpenGroups(pathname: string): Record<string, boolean> {
  return {
    '매입/매출': pathname.startsWith('/sales'),
    '수입/수출': pathname.startsWith('/import-export') || pathname.startsWith('/exchange-rates') || pathname.startsWith('/customs'),
    '재고 관리': pathname.startsWith('/warehouse'),
    '서비스': pathname.startsWith('/services') || pathname.startsWith('/projects'),
    '문서 관리': pathname.startsWith('/documents'),
    '설정':
      pathname.startsWith('/sales/vendors') ||
      pathname.startsWith('/salesperson') ||
      pathname.startsWith('/categories') ||
      pathname.startsWith('/master/') ||
      pathname.startsWith('/settings/'),
  }
}
