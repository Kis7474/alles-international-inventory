# SalesRecord.cost Field Fix - Implementation Summary

## Problem

There was an inconsistency in how the `SalesRecord.cost` field was being stored between frontend and backend:

### Frontend (Correct)
- `app/sales/new/page.tsx` sets `formData.cost` to `product.currentCost` (unit cost)
- Margin preview calculation: `margin = amount - (cost × quantity)` ✅

### Backend (Incorrect - Before Fix)
- `app/api/sales/route.ts` was calculating: `finalCost = quantity × costData.cost` (total cost)
- Stored this total cost in `SalesRecord.cost` field ❌

### Impact
This inconsistency meant that `SalesRecord.cost` contained **total cost** instead of **unit cost**, which could cause issues when the value is used in calculations or reports.

## Solution

Changed the backend to store **unit cost** consistently in `SalesRecord.cost`:

### Code Changes

#### 1. POST Handler (`app/api/sales/route.ts`, lines 127-161)
**Before:**
```typescript
const serverCalculatedCost = quantity * costData.cost
finalCost = serverCalculatedCost  // Total cost
const margin = type === 'SALES' ? amount - finalCost : 0
```

**After:**
```typescript
finalCost = costData.cost  // Unit cost only
const totalCost = finalCost * quantity
const margin = type === 'SALES' ? amount - totalCost : 0
```

#### 2. PUT Handler (`app/api/sales/route.ts`, lines 258-294)
Applied the same fix as POST handler.

### Consistency Achieved

Now all cost-related fields follow a consistent pattern:

- `SalesRecord.cost` = **unit cost** (per item)
- `SalesRecord.unitPrice` = **unit price** (per item)
- `SalesRecord.amount` = `quantity × unitPrice` (total revenue)
- `SalesRecord.margin` = `amount - (cost × quantity)` (total margin)
- `SalesRecord.marginRate` = `(margin / amount) × 100`

Both `unitPrice` and `cost` are now "per unit" values, making the data model consistent and predictable.

## Data Migration

### Background
Existing records created with the old backend logic have `cost` stored as **total cost**. These records need to be migrated to store **unit cost** instead.

### Migration Script
A migration script has been provided: `scripts/migrate-cost-to-unit-cost.ts`

#### How It Works
1. Queries all SALES records (cost only applies to sales)
2. For each record:
   - Calculates what the unit cost would be: `unitCost = cost / quantity`
   - Checks if the record already has unit cost by comparing the stored margin with the expected margin for unit cost
   - If already unit cost: skips the record
   - If total cost: converts to unit cost and recalculates margin and marginRate

#### Running the Migration

**Prerequisites:**
- Backup your database before running the migration
- Ensure you have Node.js and ts-node installed

**Command:**
```bash
npx ts-node scripts/migrate-cost-to-unit-cost.ts
```

**Expected Output:**
```
Starting migration: Convert SalesRecord.cost from total cost to unit cost
Found X sales records to process
Progress: Updated 100 records...
Progress: Updated 200 records...

Migration completed successfully!
Total records processed: X
Updated: Y
Skipped (already unit cost): Z
```

#### When to Run
- Run this migration **after** deploying the code changes
- Run it **once** on your production database
- Monitor the output to ensure it processes records correctly

### Verification

After running the migration, you can verify the data by:

1. Checking a few sales records manually:
   ```sql
   SELECT id, quantity, cost, amount, margin, marginRate 
   FROM SalesRecord 
   WHERE type = 'SALES' 
   LIMIT 10;
   ```

2. Verify that `margin ≈ amount - (cost × quantity)` for each record

## Testing

### Manual Testing Checklist

1. **Create New Sales Record:**
   - Go to `/sales/new`
   - Select a product with known currentCost
   - Enter quantity
   - Verify that the margin preview is correct
   - Save the record
   - Verify in the database that `cost` equals the unit cost (not quantity × cost)

2. **Edit Existing Sales Record:**
   - Go to `/sales/[id]`
   - Change the quantity
   - Verify margin recalculation is correct
   - Save
   - Verify `cost` is still unit cost

3. **View Sales List:**
   - Go to `/sales`
   - Verify margins are displayed correctly
   - Sort by margin rate
   - Export to Excel and verify calculations

4. **Reports:**
   - Check monthly report (`/sales/report/monthly`)
   - Check yearly report (`/sales/report/yearly`)
   - Verify totals and margins are correct

## Files Changed

1. `app/api/sales/route.ts` - Fixed POST and PUT handlers
2. `scripts/migrate-cost-to-unit-cost.ts` - New migration script

## Deployment Notes

### Deployment Order
1. Deploy code changes
2. Run migration script on production database
3. Verify data integrity
4. Monitor for any issues

### Rollback Plan
If issues are detected:
1. Revert code deployment
2. The migration script does not support automatic rollback
3. Restore from database backup if needed

## Additional Notes

- The fix only affects **new** sales records created after the code deployment
- Existing records require the migration script to be run
- The migration is safe to run multiple times (it will skip already-migrated records)
- Always test in a staging environment first
- Keep database backups before running migrations
