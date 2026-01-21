import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects - 프로젝트 목록 조회 또는 단일 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    
    // 단일 프로젝트 조회
    if (id) {
      const project = await prisma.project.findUnique({
        where: { id: parseInt(id) },
        include: {
          items: {
            include: {
              material: true,
              part: true,
              service: true,
            },
          },
        },
      })
      
      if (!project) {
        return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
      }
      
      return NextResponse.json(project)
    }
    
    // 목록 조회
    interface WhereClause {
      status?: string
    }
    
    const where: WhereClause = {}
    if (status) {
      where.status = status
    }
    
    const projects = await prisma.project.findMany({
      where,
      include: {
        items: {
          include: {
            material: true,
            part: true,
            service: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST /api/projects - 프로젝트 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      code,
      name,
      customer,
      startDate,
      endDate,
      status,
      currency,
      exchangeRate,
      partsCost,
      laborCost,
      customsCost,
      shippingCost,
      otherCost,
      salesPrice,
      memo,
      items,
    } = body

    // Validation
    if (!name) {
      return NextResponse.json({ error: '프로젝트명을 입력해주세요.' }, { status: 400 })
    }
    if (!startDate) {
      return NextResponse.json({ error: '시작월을 입력해주세요.' }, { status: 400 })
    }

    // Convert YYYY-MM format to Date (first day of the month)
    const startDateObj = new Date(startDate + '-01')
    const endDateObj = endDate ? new Date(endDate + '-01') : null

    // Calculate total cost and margin
    const totalCost = (parseFloat(partsCost) || 0) + 
                     (parseFloat(laborCost) || 0) + 
                     (parseFloat(customsCost) || 0) + 
                     (parseFloat(shippingCost) || 0) + 
                     (parseFloat(otherCost) || 0)
    
    const sPrice = parseFloat(salesPrice) || 0
    const margin = sPrice - totalCost
    const marginRate = sPrice > 0 ? (margin / sPrice) * 100 : 0

    const project = await prisma.project.create({
      data: {
        code: code || null,
        name,
        customer,
        startDate: startDateObj,
        endDate: endDateObj,
        status: status || 'IN_PROGRESS',
        currency: currency || 'KRW',
        exchangeRate: parseFloat(exchangeRate) || 1,
        partsCost: parseFloat(partsCost) || 0,
        laborCost: parseFloat(laborCost) || 0,
        customsCost: parseFloat(customsCost) || 0,
        shippingCost: parseFloat(shippingCost) || 0,
        otherCost: parseFloat(otherCost) || 0,
        totalCost,
        salesPrice: sPrice,
        margin,
        marginRate,
        memo,
      },
    })

    // Create project items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await prisma.projectItem.create({
          data: {
            projectId: project.id,
            itemType: item.itemType,
            materialId: item.materialId ? parseInt(item.materialId) : null,
            partId: item.partId ? parseInt(item.partId) : null,
            serviceId: item.serviceId ? parseInt(item.serviceId) : null,
            itemName: item.itemName,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
            workDate: item.workDate ? new Date(item.workDate) : null,
            workHours: item.workHours ? parseFloat(item.workHours) : null,
            engineer: item.engineer,
            memo: item.memo,
          },
        })
      }
    }

    const createdProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        items: {
          include: {
            material: true,
            part: true,
            service: true,
          },
        },
      },
    })

    return NextResponse.json(createdProject, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

// PUT /api/projects - 프로젝트 수정
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      id,
      code,
      name,
      customer,
      startDate,
      endDate,
      status,
      currency,
      exchangeRate,
      partsCost,
      laborCost,
      customsCost,
      shippingCost,
      otherCost,
      salesPrice,
      memo,
      items,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    // Convert YYYY-MM format to Date (first day of the month)
    const startDateObj = new Date(startDate + '-01')
    const endDateObj = endDate ? new Date(endDate + '-01') : null

    // Calculate total cost and margin
    const totalCost = (parseFloat(partsCost) || 0) + 
                     (parseFloat(laborCost) || 0) + 
                     (parseFloat(customsCost) || 0) + 
                     (parseFloat(shippingCost) || 0) + 
                     (parseFloat(otherCost) || 0)
    
    const sPrice = parseFloat(salesPrice) || 0
    const margin = sPrice - totalCost
    const marginRate = sPrice > 0 ? (margin / sPrice) * 100 : 0

    // Update project
    await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        code: code || null,
        name,
        customer,
        startDate: startDateObj,
        endDate: endDateObj,
        status,
        currency,
        exchangeRate: parseFloat(exchangeRate) || 1,
        partsCost: parseFloat(partsCost) || 0,
        laborCost: parseFloat(laborCost) || 0,
        customsCost: parseFloat(customsCost) || 0,
        shippingCost: parseFloat(shippingCost) || 0,
        otherCost: parseFloat(otherCost) || 0,
        totalCost,
        salesPrice: sPrice,
        margin,
        marginRate,
        memo,
      },
    })

    // Update project items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await prisma.projectItem.deleteMany({
        where: { projectId: parseInt(id) },
      })

      // Create new items
      for (const item of items) {
        await prisma.projectItem.create({
          data: {
            projectId: parseInt(id),
            itemType: item.itemType,
            materialId: item.materialId ? parseInt(item.materialId) : null,
            partId: item.partId ? parseInt(item.partId) : null,
            serviceId: item.serviceId ? parseInt(item.serviceId) : null,
            itemName: item.itemName,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
            workDate: item.workDate ? new Date(item.workDate) : null,
            workHours: item.workHours ? parseFloat(item.workHours) : null,
            engineer: item.engineer,
            memo: item.memo,
          },
        })
      }
    }

    const updatedProject = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            material: true,
            part: true,
            service: true,
          },
        },
      },
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

// DELETE /api/projects - 프로젝트 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    await prisma.project.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
