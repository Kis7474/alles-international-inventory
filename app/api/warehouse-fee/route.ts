import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/warehouse-fee - 창고료 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const yearMonth = searchParams.get('yearMonth')
    
    // 단일 창고료 조회
    if (yearMonth) {
      const fee = await prisma.warehouseFee.findUnique({
        where: { yearMonth },
        include: {
          distributions: {
            include: {
              lot: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      })
      
      if (!fee) {
        return NextResponse.json(
          { error: '해당 창고료를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(fee)
    }
    
    // 전체 목록 조회 (최신순)
    const fees = await prisma.warehouseFee.findMany({
      include: {
        distributions: {
          include: {
            lot: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { yearMonth: 'desc' },
    })
    
    // LOT 수 계산
    const feesWithLotCount = fees.map(fee => ({
      ...fee,
      lotCount: fee.distributions.length,
    }))
    
    return NextResponse.json(feesWithLotCount)
  } catch (error) {
    console.error('Error fetching warehouse fees:', error)
    return NextResponse.json(
      { error: '창고료 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/warehouse-fee - 월별 창고료 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { yearMonth, totalFee, memo } = body
    
    if (!yearMonth || !totalFee) {
      return NextResponse.json(
        { error: '년월과 총 창고료는 필수입니다.' },
        { status: 400 }
      )
    }
    
    // 중복 체크
    const existing = await prisma.warehouseFee.findUnique({
      where: { yearMonth },
    })
    
    if (existing) {
      return NextResponse.json(
        { error: '해당 월의 창고료가 이미 등록되어 있습니다.' },
        { status: 400 }
      )
    }
    
    const fee = await prisma.warehouseFee.create({
      data: {
        yearMonth,
        totalFee: parseFloat(totalFee),
        memo: memo || null,
      },
    })
    
    return NextResponse.json(fee, { status: 201 })
  } catch (error) {
    console.error('Error creating warehouse fee:', error)
    return NextResponse.json(
      { error: '창고료 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/warehouse-fee - 창고료 배분 실행 또는 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { yearMonth, action, totalFee, memo } = body
    
    if (!yearMonth) {
      return NextResponse.json(
        { error: '년월은 필수입니다.' },
        { status: 400 }
      )
    }
    
    const fee = await prisma.warehouseFee.findUnique({
      where: { yearMonth },
      include: {
        distributions: true,
      },
    })
    
    if (!fee) {
      return NextResponse.json(
        { error: '해당 창고료를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 창고료 배분 실행
    if (action === 'distribute') {
      if (fee.distributedAt) {
        return NextResponse.json(
          { error: '이미 배분된 창고료입니다.' },
          { status: 400 }
        )
      }
      
      // WAREHOUSE에 보관중인 LOT들 조회 (잔량 > 0)
      const lots = await prisma.inventoryLot.findMany({
        where: {
          storageLocation: 'WAREHOUSE',
          quantityRemaining: { gt: 0 },
        },
      })
      
      if (lots.length === 0) {
        return NextResponse.json(
          { error: '배분 대상 LOT이 없습니다.' },
          { status: 400 }
        )
      }
      
      // 배분 기준일 계산
      // new Date(year, month, 0)은 해당 월의 마지막 날을 반환
      // 예: new Date(2026, 1, 0) = 2026년 1월 31일 00:00:00
      const [year, month] = yearMonth.split('-').map(Number)
      const distributionDate = new Date(year, month, 0) // 해당 월의 마지막 날 자정
      const now = new Date()
      const baseDate = distributionDate > now ? now : distributionDate
      
      // 밀리초를 일수로 변환하기 위한 상수
      const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24
      
      // 배분 기준일 이전에 입고된 LOT만 필터링하고 가중치 계산 (잔량 × 보관일수)
      const lotsWithWeight = lots
        .filter(lot => {
          const receivedDate = new Date(lot.receivedDate)
          return receivedDate <= baseDate
        })
        .map(lot => {
          const receivedDate = new Date(lot.receivedDate)
          // 최소 1일로 계산 (당일 입고도 1일 창고료 부과)
          const storageDays = Math.max(1, Math.ceil((baseDate.getTime() - receivedDate.getTime()) / MILLISECONDS_PER_DAY))
          const weight = lot.quantityRemaining * storageDays
          return { ...lot, storageDays, weight }
        })
      
      if (lotsWithWeight.length === 0) {
        return NextResponse.json(
          { error: '배분 대상 LOT이 없습니다. (배분 기준일 이전 또는 당일에 입고된 LOT 없음)' },
          { status: 400 }
        )
      }
      
      // 전체 가중치 합계
      const totalWeight = lotsWithWeight.reduce((sum, lot) => sum + lot.weight, 0)
      
      // 트랜잭션으로 배분 처리
      const result = await prisma.$transaction(async (tx) => {
        // 각 LOT에 창고료 배분
        await Promise.all(
          lotsWithWeight.map(async (lot) => {
            const ratio = lot.weight / totalWeight
            const distributedFee = fee.totalFee * ratio
            
            // 배분 내역 생성
            await tx.warehouseFeeDistribution.create({
              data: {
                warehouseFeeId: fee.id,
                lotId: lot.id,
                distributedFee,
                quantityAtTime: lot.quantityRemaining,
              },
            })
            
            // LOT의 warehouseFee 필드 업데이트 (누적)
            await tx.inventoryLot.update({
              where: { id: lot.id },
              data: {
                warehouseFee: {
                  increment: distributedFee,
                },
              },
            })
          })
        )
        
        // 창고료 배분 완료 시각 업데이트
        const updatedFee = await tx.warehouseFee.update({
          where: { id: fee.id },
          data: {
            distributedAt: new Date(),
          },
          include: {
            distributions: {
              include: {
                lot: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        })
        
        return updatedFee
      })
      
      return NextResponse.json(result)
    }
    
    // 창고료 정보 수정 (배분 전만 가능)
    if (action === 'update') {
      if (fee.distributedAt) {
        return NextResponse.json(
          { error: '배분된 창고료는 수정할 수 없습니다.' },
          { status: 400 }
        )
      }
      
      const updated = await prisma.warehouseFee.update({
        where: { id: fee.id },
        data: {
          totalFee: totalFee ? parseFloat(totalFee) : undefined,
          memo: memo !== undefined ? memo : undefined,
        },
      })
      
      return NextResponse.json(updated)
    }
    
    return NextResponse.json(
      { error: 'action 파라미터가 필요합니다. (distribute 또는 update)' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating warehouse fee:', error)
    return NextResponse.json(
      { error: '창고료 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/warehouse-fee - 창고료 삭제 (배분 전만 가능)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const yearMonth = searchParams.get('yearMonth')
    
    if (!yearMonth) {
      return NextResponse.json(
        { error: '년월은 필수입니다.' },
        { status: 400 }
      )
    }
    
    const fee = await prisma.warehouseFee.findUnique({
      where: { yearMonth },
    })
    
    if (!fee) {
      return NextResponse.json(
        { error: '해당 창고료를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    if (fee.distributedAt) {
      return NextResponse.json(
        { error: '배분된 창고료는 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }
    
    await prisma.warehouseFee.delete({
      where: { id: fee.id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting warehouse fee:', error)
    return NextResponse.json(
      { error: '창고료 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
