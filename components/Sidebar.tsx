'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface MenuItem {
  href?: string
  label: string
  icon: string
  submenu?: MenuItem[]
}

const menuItems: MenuItem[] = [
  // 대시보드 - 최상위 독립 메뉴 (서브메뉴 없음)
  { href: '/', label: '대시보드', icon: '📊' },
  
  // 매입/매출 - 대시보드 제거됨
  {
    label: '매입/매출',
    icon: '💰',
    submenu: [
      { href: '/sales', label: '상세내역', icon: '📝' },
      { href: '/sales/flow', label: '매입매출 흐름', icon: '🔄' },
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
      { href: '/warehouse/warehouse-fee', label: '창고료 관리', icon: '💰' },
    ],
  },
  {
    label: '프로젝트',
    icon: '🚀',
    submenu: [
      { href: '/projects', label: '프로젝트 목록', icon: '📋' },
      { href: '/projects/new', label: '프로젝트 등록', icon: '➕' },
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
    ],
  },
  {
    label: '설정',
    icon: '⚙️',
    submenu: [
      { href: '/sales/vendors', label: '거래처', icon: '🏢' },
      { href: '/master/products', label: '품목관리', icon: '📦' },
      { href: '/master/services', label: '서비스', icon: '🔧' },
      { href: '/categories', label: '카테고리', icon: '📋' },
      { href: '/salesperson', label: '담당자', icon: '👤' },
      { href: '/master/vendor-prices', label: '가격', icon: '💰' },
      { href: '/settings/unipass', label: '유니패스 설정', icon: '🔐' },
      { href: '/master/upload', label: '엑셀 업로드', icon: '📤' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [salesOpen, setSalesOpen] = useState(
    pathname.startsWith('/sales')
  )
  const [importExportOpen, setImportExportOpen] = useState(
    pathname.startsWith('/import-export') || pathname.startsWith('/exchange-rates') || pathname.startsWith('/customs')
  )
  const [warehouseOpen, setWarehouseOpen] = useState(
    pathname.startsWith('/warehouse')
  )
  const [projectsOpen, setProjectsOpen] = useState(
    pathname.startsWith('/projects')
  )
  const [documentsOpen, setDocumentsOpen] = useState(
    pathname.startsWith('/documents')
  )
  const [masterOpen, setMasterOpen] = useState(
    pathname.startsWith('/sales/vendors') || pathname.startsWith('/sales/product-status') ||
    pathname.startsWith('/salesperson') || pathname.startsWith('/categories') ||
    pathname.startsWith('/master/') || pathname.startsWith('/settings/')
  )

  // localStorage에서 상태 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved) setCollapsed(saved === 'true')
    } catch (error) {
      // localStorage not available (SSR) or disabled
      console.warn('localStorage not available:', error)
    }
  }, [])

  const toggleCollapse = () => {
    const newState = !collapsed
    setCollapsed(newState)
    try {
      localStorage.setItem('sidebar-collapsed', String(newState))
    } catch (error) {
      // localStorage not available or disabled
      console.warn('Failed to save sidebar state:', error)
    }
  }

  return (
    <>
      {/* 모바일 햄버거 메뉴 버튼 */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
      >
        <span className="text-xl">{isOpen ? '✕' : '☰'}</span>
      </button>

      {/* 사이드바 */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          ${collapsed ? 'w-16' : 'w-64'} bg-gray-800 text-white overflow-y-auto
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 md:p-6">
          <div className="mb-6 md:mb-8">
            {collapsed ? (
              <div className="text-center" title="알레스인터네셔날 ERP 시스템">
                <h1 className="text-xl font-bold text-white">알</h1>
              </div>
            ) : (
              <>
                <h1 className="text-xl md:text-2xl font-bold text-white">알레스인터네셔날</h1>
                <p className="text-xs text-gray-400 mt-1">ERP 시스템</p>
              </>
            )}
          </div>
          <nav>
            <ul className="space-y-2">
              {menuItems.map((item) => {
                if (item.submenu) {
                  // 서브메뉴가 있는 경우
                  const isSales = item.label === '매입/매출'
                  const isImportExport = item.label === '수입/수출'
                  const isWarehouse = item.label === '재고 관리'
                  const isProjects = item.label === '프로젝트'
                  const isDocuments = item.label === '문서 관리'
                  const isMaster = item.label === '설정'
                  const isExpanded = isSales ? salesOpen : isImportExport ? importExportOpen : isWarehouse ? warehouseOpen : isProjects ? projectsOpen : isDocuments ? documentsOpen : isMaster ? masterOpen : false
                  const toggleFunc = isSales
                    ? () => setSalesOpen(!salesOpen)
                    : isImportExport
                    ? () => setImportExportOpen(!importExportOpen)
                    : isWarehouse 
                    ? () => setWarehouseOpen(!warehouseOpen)
                    : isProjects
                    ? () => setProjectsOpen(!projectsOpen)
                    : isDocuments
                    ? () => setDocumentsOpen(!documentsOpen)
                    : isMaster
                    ? () => setMasterOpen(!masterOpen)
                    : () => {}

                  return (
                    <li key={item.label}>
                      <button
                        onClick={toggleFunc}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors duration-150 text-white"
                        title={collapsed ? item.label : undefined}
                      >
                        {collapsed ? (
                          <span className="text-xl mx-auto">{item.icon}</span>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{item.icon}</span>
                              <span>{item.label}</span>
                            </div>
                            <span className="text-sm">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </>
                        )}
                      </button>
                      {isExpanded && !collapsed && (
                        <ul className="ml-4 mt-2 space-y-1">
                          {item.submenu.map((subItem) => {
                            // Check if this submenu item has its own submenu (nested)
                            if (subItem.submenu) {
                              return (
                                <li key={subItem.label} className="mt-2">
                                  <div className="text-xs font-semibold text-gray-400 px-4 py-1 uppercase tracking-wider">
                                    {subItem.label} {subItem.icon}
                                  </div>
                                  <ul className="ml-2 mt-1 space-y-1">
                                    {subItem.submenu.map((nestedItem) => {
                                      if (!nestedItem.href) return null
                                      const isActive = pathname === nestedItem.href
                                      return (
                                        <li key={nestedItem.href}>
                                          <Link
                                            href={nestedItem.href}
                                            className={`
                                              flex items-center gap-3 px-4 py-2 rounded-lg
                                              transition-colors duration-150 text-sm
                                              ${
                                                isActive
                                                  ? 'bg-blue-600 text-white'
                                                  : 'hover:bg-gray-700 text-gray-300'
                                              }
                                            `}
                                            onClick={() => setIsOpen(false)}
                                          >
                                            <span>{nestedItem.icon}</span>
                                            <span>{nestedItem.label}</span>
                                          </Link>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                </li>
                              )
                            }
                            
                            // Regular submenu item with href
                            if (!subItem.href) return null
                            const isActive = pathname === subItem.href
                            return (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  className={`
                                    flex items-center gap-3 px-4 py-2 rounded-lg
                                    transition-colors duration-150 text-sm
                                    ${
                                      isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'hover:bg-gray-700 text-gray-300'
                                    }
                                  `}
                                  onClick={() => setIsOpen(false)}
                                >
                                  <span>{subItem.icon}</span>
                                  <span>{subItem.label}</span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </li>
                  )
                } else {
                  // 일반 메뉴 아이템 (href가 있는 경우만)
                  if (!item.href) return null
                  const isActive = pathname === item.href
                  return (
                    <>
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`
                            flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg
                            transition-colors duration-150
                            ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-700 text-white'
                            }
                          `}
                          onClick={() => setIsOpen(false)}
                          title={collapsed ? item.label : undefined}
                        >
                          {collapsed ? (
                            <span className="text-xl">{item.icon}</span>
                          ) : (
                            <>
                              <span className="text-xl">{item.icon}</span>
                              <span>{item.label}</span>
                            </>
                          )}
                        </Link>
                      </li>
                      {/* 대시보드 뒤에 구분선 */}
                      {item.href === '/' && !collapsed && (
                        <li><hr className="my-2 border-gray-600" /></li>
                      )}
                    </>
                  )
                }
              })}
            </ul>
          </nav>
        </div>
        
        {/* 접기/펼치기 버튼 */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex w-full items-center justify-center px-4 py-3 hover:bg-gray-700 text-gray-400 border-t border-gray-700"
          title={collapsed ? '펼치기' : '접기'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </aside>

      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
