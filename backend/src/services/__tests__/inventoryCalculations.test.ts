import { inventoryCalculationService } from '../inventoryCalculationService';

describe('Inventory Calculation Engine Unit Tests', () => {
  describe('Safety Stock Calculation', () => {
    it('should calculate statistical safety stock when sufficient data is present', () => {
      // Formula: ceil(Z * stdDev * sqrt(leadTime))
      // Z = 1.65, stdDev = 4, leadTime = 9 -> 1.65 * 4 * 3 = 19.8 -> ceil = 20
      const result = inventoryCalculationService.calculateSafetyStock(
        10, // daily demand
        4,  // stdDev
        9,  // leadTimeDays
        10, // minimumStock
        true // hasSufficientData
      );

      expect(result.isFallback).toBe(false);
      expect(result.safetyStock).toBe(20);
    });

    it('should use deterministic fallback when insufficient data is present', () => {
      // Fallback: max(1, ceil(minimumStock * 0.5)) -> ceil(15 * 0.5) = 8
      const result = inventoryCalculationService.calculateSafetyStock(
        10,
        0,
        7,
        15,
        false // insufficient data
      );

      expect(result.isFallback).toBe(true);
      expect(result.safetyStock).toBe(8);
    });

    it('should ensure safety stock is at least 1 even if stdDev is low', () => {
      const result = inventoryCalculationService.calculateSafetyStock(
        1,
        0.01,
        1,
        0,
        true
      );
      expect(result.safetyStock).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Reorder Point Calculation', () => {
    it('should calculate Reorder Point as Lead-Time Demand + Safety Stock', () => {
      // expectedLeadTimeDemand = 50, safetyStock = 15 -> reorderPoint = 65
      const reorderPoint = inventoryCalculationService.calculateReorderPoint(50, 15);
      expect(reorderPoint).toBe(65);
    });
  });

  describe('Recommended Order Quantity', () => {
    it('should recommend ordering when available inventory is below target requirement', () => {
      // Reorder Point = 60, expectedLeadTimeDemand = 40 -> Target = 100
      // Current Stock = 25, Pending Incoming = 15 -> Total Available = 40
      // Recommended = 100 - 40 = 60
      const recommended = inventoryCalculationService.calculateRecommendedOrderQuantity(
        60,
        40,
        25,
        15
      );
      expect(recommended).toBe(60);
    });

    it('should return 0 when current stock and pending orders cover the target requirement', () => {
      // Target = 60 + 40 = 100, Available = 80 + 30 = 110 -> max(0, -10) = 0
      const recommended = inventoryCalculationService.calculateRecommendedOrderQuantity(
        60,
        40,
        80,
        30
      );
      expect(recommended).toBe(0);
    });

    it('should never return a negative quantity', () => {
      const recommended = inventoryCalculationService.calculateRecommendedOrderQuantity(
        20,
        10,
        500,
        100
      );
      expect(recommended).toBe(0);
    });
  });

  describe('Stock-Out Risk Assessment', () => {
    it('should return CRITICAL if current stock is 0', () => {
      const risk = inventoryCalculationService.assessStockOutRisk(0, 10, 5, 0);
      expect(risk.riskLevel).toBe('CRITICAL');
      expect(risk.estimatedDaysUntilStockOut).toBe(0);
    });

    it('should return CRITICAL if days until stock-out is half of lead time', () => {
      // Current stock = 10, daily demand = 10 -> days = 1. Lead time = 5. (1 <= 2.5) -> CRITICAL
      const risk = inventoryCalculationService.assessStockOutRisk(10, 10, 5, 0);
      expect(risk.riskLevel).toBe('CRITICAL');
      expect(risk.estimatedDaysUntilStockOut).toBe(1);
    });

    it('should return HIGH if days until stock-out is within lead time', () => {
      // Current stock = 35, daily demand = 10 -> days = 3.5. Lead time = 5. (3.5 <= 5) -> HIGH
      const risk = inventoryCalculationService.assessStockOutRisk(35, 10, 5, 0);
      expect(risk.riskLevel).toBe('HIGH');
      expect(risk.estimatedDaysUntilStockOut).toBe(3.5);
    });

    it('should return MEDIUM if days until stock-out is within 1.5x lead time', () => {
      // Current stock = 60, daily demand = 10 -> days = 6. Lead time = 5. (6 <= 7.5) -> MEDIUM
      const risk = inventoryCalculationService.assessStockOutRisk(60, 10, 5, 0);
      expect(risk.riskLevel).toBe('MEDIUM');
      expect(risk.estimatedDaysUntilStockOut).toBe(6);
    });

    it('should return LOW if stock is sufficient beyond 1.5x lead time', () => {
      // Current stock = 150, daily demand = 10 -> days = 15. Lead time = 5. -> LOW
      const risk = inventoryCalculationService.assessStockOutRisk(150, 10, 5, 0);
      expect(risk.riskLevel).toBe('LOW');
      expect(risk.estimatedDaysUntilStockOut).toBe(15);
    });
  });

  describe('Inventory Status Categorization', () => {
    it('should categorize as Critical when stock is 0 or less than half of minimum', () => {
      const status = inventoryCalculationService.determineInventoryStatus(2, 10, 20, 'HIGH', 0);
      expect(status).toBe('Critical');
    });

    it('should categorize as Stock-out Risk when risk is CRITICAL or HIGH with no pending purchases', () => {
      const status = inventoryCalculationService.determineInventoryStatus(12, 10, 30, 'HIGH', 0);
      expect(status).toBe('Stock-out Risk');
    });

    it('should categorize as Low Stock when stock is at or below minimum stock', () => {
      const status = inventoryCalculationService.determineInventoryStatus(9, 10, 25, 'MEDIUM', 10);
      expect(status).toBe('Low Stock');
    });

    it('should categorize as Reorder Recommended when stock is at or below reorder point', () => {
      const status = inventoryCalculationService.determineInventoryStatus(20, 10, 25, 'MEDIUM', 10);
      expect(status).toBe('Reorder Recommended');
    });

    it('should categorize as Healthy when stock is above reorder point with low risk', () => {
      const status = inventoryCalculationService.determineInventoryStatus(50, 10, 25, 'LOW', 0);
      expect(status).toBe('Healthy');
    });
  });
});
