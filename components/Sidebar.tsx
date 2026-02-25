'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { canAccessMenu, type UserRole } from '@/lib/access-control'
import { sidebarMenuItems, createInitialOpenGroups, type SidebarMenuItem } from '@/lib/sidebar-menu'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(createInitialOpenGroups(pathname))
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
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem('sidebar-collapsed', String(next))
    } catch {
      // noop
    }
  }

  const isVisible = (item: SidebarMenuItem) => canAccessMenu(userRole, item.adminOnly)

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
      >
        <span className="text-xl">{isOpen ? '✕' : '☰'}</span>
      </button>

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 ${collapsed ? 'w-16' : 'w-64'} bg-gray-800 text-white overflow-y-auto transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
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
                <p className="text-[11px] mt-1 text-blue-300">권한: {userRole ?? 'GUEST'}</p>
              </>
            )}
          </div>

          <nav>
            <ul className="space-y-2">
              {sidebarMenuItems.filter(isVisible).map((item) => {
                if (item.submenu) {
                  const expanded = !!openGroups[item.label]
                  return (
                    <li key={item.label}>
                      <button
                        onClick={() => setOpenGroups((prev) => ({ ...prev, [item.label]: !expanded }))}
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
                            <span className="text-sm">{expanded ? '▼' : '▶'}</span>
                          </>
                        )}
                      </button>

                      {expanded && !collapsed && (
                        <ul className="ml-4 mt-2 space-y-1">
                          {item.submenu.filter(isVisible).map((subItem) => {
                            if (subItem.submenu) {
                              return (
                                <li key={subItem.label} className="mt-2">
                                  <div className="text-xs font-semibold text-gray-400 px-4 py-1 uppercase tracking-wider">
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
                                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-150 text-sm ${active ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
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
                                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-150 text-sm ${active ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
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
                const active = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 ${active ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="text-xl">{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

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
    </>
  )
}
