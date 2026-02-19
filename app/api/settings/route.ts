import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// GET /api/settings - Get a system setting by key
export async function GET(request: NextRequest) {
  const { error } = await requireRole(request, ['ADMIN'])
  if (error) return error

  try {
    const searchParams = request.nextUrl.searchParams
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      )
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    })

    if (!setting) {
      return NextResponse.json(null)
    }

    // Parse JSON value if possible
    try {
      const value = JSON.parse(setting.value)
      return NextResponse.json({ ...setting, value })
    } catch {
      return NextResponse.json(setting)
    }
  } catch (error) {
    console.error('Error fetching setting:', error)
    return NextResponse.json(
      { error: 'Failed to fetch setting' },
      { status: 500 }
    )
  }
}

// POST /api/settings - Create or update a system setting
export async function POST(request: NextRequest) {
  const { error } = await requireRole(request, ['ADMIN'])
  if (error) return error

  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      )
    }

    // Convert value to JSON string if it's an object
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: stringValue },
      create: { key, value: stringValue },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error saving setting:', error)
    return NextResponse.json(
      { error: 'Failed to save setting' },
      { status: 500 }
    )
  }
}
