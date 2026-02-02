import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/import-export/[id]/warehouse - 수입/수출 데이터를 창고로 입고
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const importExportId = parseInt(params.id)
    
    // 수입/수출 기록 조회
    const importExport = await prisma.importExport.findUnique({
      where: { id: importExportId },
      include: {
        items: true,
        inventoryLots: true,
      },
    })
    
    if (!importExport) {
      return NextResponse.json(
        { error: '수입/수출 기록을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 이미 입고되었는지 확인
    if (importExport.inventoryLots && importExport.inventoryLots.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyStored: true,
        lotIds: importExport.inventoryLots.map(lot => lot.id),
        message: '이미 창고에 입고되었습니다.',
      })
    }
    
    // 수입 건만 입고 가능
    if (importExport.type !== 'IMPORT') {
      return NextResponse.json(
        { error: '수입 건만 창고에 입고할 수 있습니다.' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { storageLocation } = body // 'WAREHOUSE' 또는 'OFFICE'
    
    if (!storageLocation || (storageLocation !== 'WAREHOUSE' && storageLocation !== 'OFFICE')) {
      return NextResponse.json(
        { error: '보관 위치를 선택해주세요. (WAREHOUSE 또는 OFFICE)' },
        { status: 400 }
      )
    }
    
    // 다중 품목인 경우
    if (importExport.items && importExport.items.length > 0) {
      // 각 품목별로 LOT 생성
      const itemCount = importExport.items.length
      const lots = await Promise.all(
        importExport.items.map((item, index) => {
          const goodsAmount = importExport.goodsAmount 
            ? (importExport.goodsAmount * importExport.exchangeRate) / itemCount
            : 0
          const dutyAmount = importExport.dutyAmount 
            ? importExport.dutyAmount / itemCount
            : 0
          const domesticFreight = importExport.shippingCost 
            ? importExport.shippingCost / itemCount
            : 0
          const otherCost = importExport.otherCost 
            ? importExport.otherCost / itemCount
            : 0
          
          const totalCost = goodsAmount + dutyAmount + domesticFreight + otherCost
          const unitCost = item.quantity > 0 ? totalCost / item.quantity : 0
          
          return prisma.inventoryLot.create({
            data: {
              productId: item.productId,
              vendorId: importExport.vendorId,
              salespersonId: importExport.salespersonId,
              lotCode: `IE-${importExportId}-${index + 1}-${Date.now().toString().slice(-4)}`,
              receivedDate: importExport.date,
              quantityReceived: item.quantity,
              quantityRemaining: item.quantity,
              goodsAmount,
              dutyAmount,
              domesticFreight,
              otherCost,
              unitCost,
              storageLocation,
            },
          })
        })
      )
      
      // 첫 번째 LOT을 수입/수출과 연결
      await prisma.importExport.update({
        where: { id: importExportId },
        data: {
          storageType: storageLocation,
        },
      })
      
      return NextResponse.json({
        success: true,
        lotIds: lots.map(l => l.id),
        message: `${lots.length}개 품목이 ${storageLocation === 'WAREHOUSE' ? '창고' : '사무실'}에 입고되었습니다.`,
      })
    } 
    // 단일 품목인 경우
    else if (importExport.productId && importExport.quantity) {
      const goodsAmount = importExport.goodsAmount 
        ? importExport.goodsAmount * importExport.exchangeRate 
        : 0
      const dutyAmount = importExport.dutyAmount || 0
      const domesticFreight = importExport.shippingCost || 0
      const otherCost = importExport.otherCost || 0
      
      const totalCost = goodsAmount + dutyAmount + domesticFreight + otherCost
      const unitCost = importExport.quantity > 0 ? totalCost / importExport.quantity : 0
      
      const lot = await prisma.inventoryLot.create({
        data: {
          productId: importExport.productId,
          vendorId: importExport.vendorId,
          salespersonId: importExport.salespersonId,
          lotCode: `IE-${importExportId}-${Date.now().toString().slice(-4)}`,
          receivedDate: importExport.date,
          quantityReceived: importExport.quantity,
          quantityRemaining: importExport.quantity,
          goodsAmount,
          dutyAmount,
          domesticFreight,
          otherCost,
          unitCost,
          storageLocation,
          importExportId,
        },
      })
      
      // 수입/수출 기록에 보관 위치 업데이트
      await prisma.importExport.update({
        where: { id: importExportId },
        data: {
          storageType: storageLocation,
        },
      })
      
      return NextResponse.json({
        success: true,
        lotId: lot.id,
        message: `${storageLocation === 'WAREHOUSE' ? '창고' : '사무실'}에 입고되었습니다.`,
      })
    } else {
      return NextResponse.json(
        { error: '품목 정보가 없습니다. 먼저 품목을 등록해주세요.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error transferring to warehouse:', error)
    return NextResponse.json(
      { error: '창고 입고 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
