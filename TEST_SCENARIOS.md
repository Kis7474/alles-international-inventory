# Test Scenarios for SalesRecord.cost Fix

## Test Case 1: Create New Sales Record with Product

**Setup:**
- Product: "Test Product" with currentCost = 1000 won
- Quantity: 5 units
- Unit Price: 1500 won

**Expected Results:**

### Frontend Calculation:
- `formData.cost` = 1000 (unit cost from product)
- `amount` = 5 × 1500 = 7500 won
- `totalCost` = 1000 × 5 = 5000 won
- `margin` = 7500 - 5000 = 2500 won
- `marginRate` = (2500 / 7500) × 100 = 33.3%

### Backend Storage:
```json
{
  "quantity": 5,
  "unitPrice": 1500,
  "amount": 7500,
  "cost": 1000,        // Unit cost, NOT 5000
  "margin": 2500,
  "marginRate": 33.33,
  "costSource": "PRODUCT_CURRENT"
}
```

### Verification Query:
```sql
SELECT quantity, unitPrice, amount, cost, margin, marginRate, costSource
FROM SalesRecord 
WHERE id = [new_record_id];
```

**Verify:**
- `cost` should be **1000** (unit cost), not 5000
- `margin` should be **2500**
- `marginRate` should be **33.3%**

---

## Test Case 2: Edit Existing Sales Record - Change Quantity

**Setup:**
- Existing record from Test Case 1
- Change quantity from 5 to 10

**Expected Results:**

### Frontend Recalculation:
- `formData.cost` = 1000 (unchanged, still unit cost)
- `amount` = 10 × 1500 = 15000 won
- `totalCost` = 1000 × 10 = 10000 won
- `margin` = 15000 - 10000 = 5000 won
- `marginRate` = (5000 / 15000) × 100 = 33.3%

### Backend Storage (after update):
```json
{
  "quantity": 10,
  "unitPrice": 1500,
  "amount": 15000,
  "cost": 1000,        // Still unit cost
  "margin": 5000,
  "marginRate": 33.33,
  "costSource": "PRODUCT_CURRENT"
}
```

**Verify:**
- `cost` remains **1000** (unit cost)
- `margin` should be **5000** (doubled because quantity doubled)
- `marginRate` should remain **33.3%** (same percentage)

---

## Test Case 3: Manual Cost Entry (No Product)

**Setup:**
- No product selected
- Manual entry: cost = 800 won (user enters unit cost)
- Quantity: 3 units
- Unit Price: 1200 won

**Expected Results:**

### Frontend:
- `formData.cost` = 800 (manually entered unit cost)
- `amount` = 3 × 1200 = 3600 won
- `totalCost` = 800 × 3 = 2400 won
- `margin` = 3600 - 2400 = 1200 won

### Backend Storage:
```json
{
  "quantity": 3,
  "unitPrice": 1200,
  "amount": 3600,
  "cost": 800,         // Unit cost as entered
  "margin": 1200,
  "marginRate": 33.33,
  "costSource": "MANUAL"
}
```

**Verify:**
- `cost` should be **800** (user's unit cost input)
- `costSource` should be **"MANUAL"**

---

## Test Case 4: Migration Script Test

**Setup:**
- Old record with total cost stored in cost field:
```json
{
  "id": 123,
  "quantity": 5,
  "unitPrice": 1500,
  "amount": 7500,
  "cost": 5000,        // OLD: Total cost (1000 × 5)
  "margin": 2500,
  "marginRate": 33.33
}
```

**Run Migration:**
```bash
npx ts-node scripts/migrate-cost-to-unit-cost.ts
```

**Expected Result:**
```json
{
  "id": 123,
  "quantity": 5,
  "unitPrice": 1500,
  "amount": 7500,
  "cost": 1000,        // NEW: Unit cost (5000 / 5)
  "margin": 2500,      // Recalculated but same value
  "marginRate": 33.33  // Recalculated but same value
}
```

**Verify:**
- `cost` changed from **5000** to **1000**
- `margin` and `marginRate` remain correct

---

## Test Case 5: Already Migrated Record (Skip Test)

**Setup:**
- Record already has unit cost:
```json
{
  "id": 456,
  "quantity": 5,
  "unitPrice": 1500,
  "amount": 7500,
  "cost": 1000,        // Already unit cost
  "margin": 2500,
  "marginRate": 33.33
}
```

**Run Migration:**
```bash
npx ts-node scripts/migrate-cost-to-unit-cost.ts
```

**Expected Result:**
- Record should be **skipped** (detected as already having unit cost)
- Values should remain unchanged
- Console output: "Skipped (already unit cost): 1"

---

## Automated Test Query

Run this query to check consistency across all sales records:

```sql
SELECT 
  id,
  quantity,
  cost,
  unitPrice,
  amount,
  margin,
  -- Check if margin = amount - (cost × quantity)
  ROUND(amount - (cost * quantity), 2) as calculated_margin,
  -- Check if they match
  CASE 
    WHEN ABS(margin - (amount - (cost * quantity))) < 0.01 THEN 'OK'
    ELSE 'MISMATCH'
  END as status
FROM SalesRecord
WHERE type = 'SALES'
ORDER BY id DESC
LIMIT 20;
```

**Expected:** All records should show status = 'OK'

---

## Edge Cases to Test

### Edge Case 1: Zero Quantity (Should Not Happen)
- Backend should prevent division by zero in migration
- Migration script filters: `quantity: { gt: 0 }`

### Edge Case 2: Negative Margin
- Product cost > selling price
- Should work correctly with unit cost
- Margin will be negative, which is expected

### Edge Case 3: Zero Cost
- Free items or promotional sales
- Should store `cost = 0` (unit cost)
- Margin equals full amount

---

## Success Criteria

✅ All new sales records store unit cost in `cost` field  
✅ Margin calculations are consistent between frontend and backend  
✅ Migration script correctly identifies and converts old records  
✅ Migration script skips already-converted records  
✅ No division by zero errors  
✅ Reports and exports show correct values  
✅ Edit functionality preserves unit cost
