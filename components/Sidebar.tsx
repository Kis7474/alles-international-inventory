'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const menuItems = [
  { href: '/', label: '매입매출장부', icon: '📊' },
  { href: '/sales', label: '매입매출 내역', icon: '📝' },
  {
    label: '리포트',
    icon: '📈',
    submenu: [
      { href: '/sales/report/monthly', label: '월별 리포트', icon: '📅' },
      { href: '/sales/report/yearly', label: '연도별 리포트', icon: '📆' },
    ],
  },
  {
    label: '창고관리',
    icon: '🏢',
    submenu: [
      { href: '/warehouse/items', label: '품목 관리', icon: '📦' },
      { href: '/warehouse/lots', label: '입고 관리', icon: '📥' },
      { href: '/warehouse/outbound', label: '출고 관리', icon: '📤' },
      { href: '/warehouse/inventory', label: '재고 조회', icon: '📊' },
      { href: '/warehouse/storage-expenses', label: '창고료 관리', icon: '💰' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [warehouseOpen, setWarehouseOpen] = useState(
    pathname.startsWith('/warehouse') || pathname.startsWith('/items') || 
    pathname.startsWith('/lots') || pathname.startsWith('/outbound') || 
    pathname.startsWith('/inventory') || pathname.startsWith('/storage-expenses')
  )
  const [reportOpen, setReportOpen] = useState(
    pathname.startsWith('/sales/report')
  )

  return (
    <>
      {/* 모바일 햄버거 메뉴 버튼 */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* 사이드바 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-gray-800 text-white
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-8 text-white">
            알레스인터네셔날
          </h1>
          <nav>
            <ul className="space-y-2">
              {menuItems.map((item) => {
                if (item.submenu) {
                  // 서브메뉴가 있는 경우
                  const isWarehouse = item.label === '창고관리'
                  const isReport = item.label === '리포트'
                  const isExpanded = isWarehouse ? warehouseOpen : isReport ? reportOpen : false
                  const toggleFunc = isWarehouse 
                    ? () => setWarehouseOpen(!warehouseOpen) 
                    : isReport 
                    ? () => setReportOpen(!reportOpen) 
                    : () => {}

                  return (
                    <li key={item.label}>
                      <button
                        onClick={toggleFunc}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors duration-150 text-white"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        <span className="text-sm">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </button>
                      {isExpanded && (
                        <ul className="ml-4 mt-2 space-y-1">
                          {item.submenu.map((subItem) => {
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
                  // 일반 메뉴 아이템
                  const isActive = pathname === item.href
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href!}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-lg
                          transition-colors duration-150
                          ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-700 text-white'
                          }
                        `}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                }
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
