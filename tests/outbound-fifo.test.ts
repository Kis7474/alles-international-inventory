import assert from 'assert'
import { allocateFifoLots } from '../lib/outbound-fifo'

function testAllocateFifoLotsBasic() {
  const allocations = allocateFifoLots(
    [
      { id: 1, quantityRemaining: 3, unitCost: 100, warehouseFee: 30 },
      { id: 2, quantityRemaining: 4, unitCost: 120, warehouseFee: 0 },
    ],
    5
  )

  assert.strictEqual(allocations.length, 2)
  assert.strictEqual(allocations[0].lotId, 1)
  assert.strictEqual(allocations[0].quantity, 3)
  assert.strictEqual(allocations[0].unitCostWithWarehouseFee, 110)
  assert.strictEqual(allocations[0].totalCost, 330)

  assert.strictEqual(allocations[1].lotId, 2)
  assert.strictEqual(allocations[1].quantity, 2)
  assert.strictEqual(allocations[1].unitCostWithWarehouseFee, 120)
  assert.strictEqual(allocations[1].totalCost, 240)
}

function testAllocateFifoLotsInsufficientStock() {
  assert.throws(() => {
    allocateFifoLots(
      [
        { id: 1, quantityRemaining: 1, unitCost: 100, warehouseFee: 0 },
      ],
      2
    )
  }, /재고가 부족합니다/)
}

function run() {
  testAllocateFifoLotsBasic()
  testAllocateFifoLotsInsufficientStock()
  console.log('outbound-fifo tests passed')
}

run()
