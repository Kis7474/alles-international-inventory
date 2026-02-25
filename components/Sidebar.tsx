'use client'

import Link from 'next/link'
<<<<<<< HEAD
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type UserRole = 'ADMIN' | 'STAFF'
=======
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { canAccessMenu, type UserRole } from '@/lib/access-control'
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930

interface MenuItem {
  href?: string
  label: string
  icon: string
<<<<<<< HEAD
  allowedRoles?: UserRole[]
=======
  adminOnly?: boolean
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
  submenu?: MenuItem[]
}

const menuItems: MenuItem[] = [
  { href: '/', label: '대시보드', icon: '📊' },
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
<<<<<<< HEAD
      { href: '/settings/unipass', label: '유니패스 설정', icon: '🔐', allowedRoles: ['ADMIN'] },
      { href: '/master/upload', label: '엑셀 업로드', icon: '📤' },
      { href: '/account/password', label: '비밀번호 변경', icon: '🔑' },
=======
      { href: '/settings/unipass', label: '유니패스 설정', icon: '🔐', adminOnly: true },
      { href: '/master/upload', label: '엑셀 업로드', icon: '📤', adminOnly: true },
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
    ],
  },
]

function filterMenuByRole(items: MenuItem[], role: UserRole | null): MenuItem[] {
  return items
    .filter((item) => !item.allowedRoles || (role !== null && item.allowedRoles.includes(role)))
    .map((item) => {
      if (!item.submenu) return item
      const submenu = filterMenuByRole(item.submenu, role)
      return { ...item, submenu }
    })
    .filter((item) => !item.submenu || item.submenu.length > 0)
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
<<<<<<< HEAD
  const [salesOpen, setSalesOpen] = useState(pathname.startsWith('/sales'))
  const [importExportOpen, setImportExportOpen] = useState(
    pathname.startsWith('/import-export') || pathname.startsWith('/exchange-rates') || pathname.startsWith('/customs')
  )
  const [warehouseOpen, setWarehouseOpen] = useState(pathname.startsWith('/warehouse'))
  const [projectsOpen, setProjectsOpen] = useState(pathname.startsWith('/projects'))
  const [documentsOpen, setDocumentsOpen] = useState(pathname.startsWith('/documents'))
  const [masterOpen, setMasterOpen] = useState(
    pathname.startsWith('/sales/vendors') || pathname.startsWith('/salesperson') || pathname.startsWith('/categories') || pathname.startsWith('/master/') || pathname.startsWith('/settings/') || pathname.startsWith('/account/')
  )
  const [role, setRole] = useState<UserRole | null>(null)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (!response.ok) return
        const data = await response.json()
        setRole(data.user?.role || null)
        setDisplayName(data.user?.name || '')
      } catch {
        setRole(null)
      }
    }

    loadSession()
=======
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    '매입/매출': pathname.startsWith('/sales'),
    '수입/수출': pathname.startsWith('/import-export') || pathname.startsWith('/exchange-rates') || pathname.startsWith('/customs'),
    '재고 관리': pathname.startsWith('/warehouse'),
    '서비스': pathname.startsWith('/services') || pathname.startsWith('/projects'),
    '문서 관리': pathname.startsWith('/documents'),
    '설정': pathname.startsWith('/sales/vendors') || pathname.startsWith('/salesperson') || pathname.startsWith('/categories') || pathname.startsWith('/master/') || pathname.startsWith('/settings/'),
  })
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        setUserRole(data?.user?.role ?? null)
      } catch {
        setUserRole(null)
      }
    }

    loadUserRole()
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved) setCollapsed(saved === 'true')
    } catch {
      // noop
    }
  }, [])

  const toggleCollapse = () => {
<<<<<<< HEAD
    const nextState = !collapsed
    setCollapsed(nextState)
    try {
      localStorage.setItem('sidebar-collapsed', String(nextState))
=======
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem('sidebar-collapsed', String(next))
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
    } catch {
      // noop
    }
  }

<<<<<<< HEAD
  const scopedMenuItems = useMemo(() => filterMenuByRole(menuItems, role), [role])

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }
=======
  const isVisible = (item: MenuItem) => canAccessMenu(userRole, item.adminOnly)
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-blue-600 p-3 text-white shadow-lg transition-colors hover:bg-blue-700 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
      >
        <span className="text-xl">{isOpen ? '✕' : '☰'}</span>
      </button>

      <aside
<<<<<<< HEAD
        className={`
          fixed inset-y-0 left-0 z-40 overflow-y-auto bg-gray-800 text-white transition-all duration-300 ease-in-out md:static
          ${collapsed ? 'w-16' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
=======
        className={`fixed md:static inset-y-0 left-0 z-40 ${collapsed ? 'w-16' : 'w-64'} bg-gray-800 text-white overflow-y-auto transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
      >
        <div className="p-4 md:p-6">
          <div className="mb-6 md:mb-8">
            {collapsed ? (
              <div className="text-center" title="알레스인터네셔날 ERP 시스템">
                <h1 className="text-xl font-bold text-white">알</h1>
              </div>
            ) : (
              <>
<<<<<<< HEAD
                <h1 className="text-xl font-bold text-white md:text-2xl">알레스인터네셔날</h1>
                <p className="mt-1 text-xs text-gray-400">ERP 시스템</p>
                {displayName && <p className="mt-2 text-xs text-blue-200">로그인: {displayName} ({role})</p>}
=======
                <h1 className="text-xl md:text-2xl font-bold text-white">알레스인터네셔날</h1>
                <p className="text-xs text-gray-400 mt-1">ERP 시스템</p>
                <p className="text-[11px] mt-1 text-blue-300">권한: {userRole ?? 'GUEST'}</p>
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
              </>
            )}
          </div>

          <nav>
            <ul className="space-y-2">
<<<<<<< HEAD
              {scopedMenuItems.map((item) => {
                if (item.submenu) {
                  const isSales = item.label === '매입/매출'
                  const isImportExport = item.label === '수입/수출'
                  const isWarehouse = item.label === '재고 관리'
                  const isProjects = item.label === '프로젝트'
                  const isDocuments = item.label === '문서 관리'
                  const isMaster = item.label === '설정'
                  const isExpanded = isSales
                    ? salesOpen
                    : isImportExport
                      ? importExportOpen
                      : isWarehouse
                        ? warehouseOpen
                        : isProjects
                          ? projectsOpen
                          : isDocuments
                            ? documentsOpen
                            : isMaster
                              ? masterOpen
                              : false

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
                        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-white transition-colors duration-150 hover:bg-gray-700"
=======
              {menuItems.filter(isVisible).map((item) => {
                if (item.submenu) {
                  const expanded = !!openGroups[item.label]
                  return (
                    <li key={item.label}>
                      <button
                        onClick={() => setOpenGroups((prev) => ({ ...prev, [item.label]: !expanded }))}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors duration-150 text-white"
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
                        title={collapsed ? item.label : undefined}
                      >
                        {collapsed ? (
                          <span className="mx-auto text-xl">{item.icon}</span>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{item.icon}</span>
                              <span>{item.label}</span>
                            </div>
<<<<<<< HEAD
                            <span className="text-sm">{isExpanded ? '▼' : '▶'}</span>
=======
                            <span className="text-sm">{expanded ? '▼' : '▶'}</span>
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
                          </>
                        )}
                      </button>

                      {expanded && !collapsed && (
                        <ul className="ml-4 mt-2 space-y-1">
<<<<<<< HEAD
                          {item.submenu.map((subItem) => {
=======
                          {item.submenu.filter(isVisible).map((subItem) => {
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
                            if (subItem.submenu) {
                              return (
                                <li key={subItem.label} className="mt-2">
                                  <div className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    {subItem.label} {subItem.icon}
                                  </div>
                                  <ul className="ml-2 mt-1 space-y-1">
                                    {subItem.submenu.filter(isVisible).map((nestedItem) => {
                                      if (!nestedItem.href) return null
                                      const active = pathname === nestedItem.href
                                      return (
                                        <li key={nestedItem.href}>
                                          <Link
                                            href={nestedItem.href}
<<<<<<< HEAD
                                            className={`
                                              flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-colors duration-150
                                              ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}
                                            `}
=======
                                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-150 text-sm ${active ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
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

                            if (!subItem.href) return null
                            const active = pathname === subItem.href
                            return (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
<<<<<<< HEAD
                                  className={`
                                    flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-colors duration-150
                                    ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}
                                  `}
=======
                                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-150 text-sm ${active ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
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
                }

                if (!item.href) return null
<<<<<<< HEAD
                const isActive = pathname === item.href
=======
                const active = pathname === item.href
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
<<<<<<< HEAD
                      className={`
                        flex items-center rounded-lg px-4 py-3 transition-colors duration-150
                        ${collapsed ? 'justify-center' : 'gap-3'}
                        ${isActive ? 'bg-blue-600 text-white' : 'text-white hover:bg-gray-700'}
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
                    {item.href === '/' && !collapsed && <hr className="my-2 border-gray-600" />}
=======
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 ${active ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="text-xl">{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
                  </li>
                )
              })}
            </ul>
          </nav>
<<<<<<< HEAD
        </div>

        <div className="border-t border-gray-700 p-3">
          <button
            onClick={onLogout}
            className="mb-2 w-full rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
          >
            로그아웃
          </button>
          <button
            onClick={toggleCollapse}
            className="hidden w-full items-center justify-center rounded-md px-3 py-2 text-gray-400 hover:bg-gray-700 md:flex"
            title={collapsed ? '펼치기' : '접기'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setIsOpen(false)} aria-hidden="true" />}
=======

          <div className="mt-6 hidden md:block">
            <button
              onClick={toggleCollapse}
              className="w-full text-xs text-gray-300 hover:text-white border border-gray-600 rounded px-2 py-1"
            >
              {collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            </button>
          </div>
        </div>
      </aside>
>>>>>>> b9c362aca80a27619e8a3efd45531a38a11ee930
    </>
  )
}
