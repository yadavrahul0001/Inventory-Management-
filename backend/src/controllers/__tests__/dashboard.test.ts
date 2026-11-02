import request from 'supertest';
import app from '../../app';
import Product from '../../models/Product';
import Sale from '../../models/Sale';
import Purchase from '../../models/Purchase';
import InventoryEvent from '../../models/InventoryEvent';
import { generateToken } from '../../utils/token';

describe('Phase 6: Dashboard Backend & Analytics Suite', () => {
  const staffToken = generateToken({
    id: '507f1f77bcf86cd799439012',
    email: 'staff@inventory.ai',
    role: 'staff',
  });

  describe('GET /api/dashboard/summary', () => {
    it('should reject request without authentication', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      expect(res.status).toBe(401);
    });

    it('should return complete KPI summary, asset valuations, and health counts', async () => {
      jest.spyOn(Product, 'countDocuments').mockResolvedValueOnce(15);
      jest.spyOn(Product, 'aggregate').mockResolvedValueOnce([
        { _id: null, totalCostValue: 12500, totalRetailValue: 24000 },
      ]);
      jest.spyOn(Sale, 'aggregate')
        .mockResolvedValueOnce([
          { _id: null, revenue: 350, quantitySold: 12, orderCount: 4 }, // today
        ])
        .mockResolvedValueOnce([
          { _id: null, revenue: 11200, quantitySold: 380, orderCount: 95 }, // monthly
        ])
        .mockResolvedValueOnce([]); // sales for inventory metric calculation
      jest.spyOn(Purchase, 'aggregate')
        .mockResolvedValueOnce([
          { _id: null, orderCount: 3, totalUnits: 150, totalCost: 3200 }, // pending
        ])
        .mockResolvedValueOnce([]); // purchases for inventory metric calculation
      jest.spyOn(Sale, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      } as any);
      jest.spyOn(InventoryEvent, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      } as any);
      jest.spyOn(Product, 'find').mockResolvedValueOnce([
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Keyboard',
          currentStock: 25,
          minimumStock: 10,
          reorderLevel: 20,
          leadTimeDays: 5,
          status: 'active',
        },
      ] as any);

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const kpis = res.body.data.kpis;
      expect(kpis.totalProducts).toBe(15);
      expect(kpis.inventoryValueCost).toBe(12500);
      expect(kpis.inventoryValueRetail).toBe(24000);
      expect(kpis.todaySales.revenue).toBe(350);
      expect(kpis.monthlySales.revenue).toBe(11200);
      expect(kpis.pendingPurchases.orderCount).toBe(3);

      const health = res.body.data.inventoryHealth;
      expect(health).toBeDefined();
      expect(typeof health.healthy).toBe('number');
      expect(typeof health.critical).toBe('number');

      const activities = res.body.data.recentActivities;
      expect(activities.recentSales).toBeDefined();
      expect(activities.recentInventoryEvents).toBeDefined();
    });
  });

  describe('GET /api/dashboard/charts', () => {
    it('should reject invalid period query parameter', async () => {
      const res = await request(app)
        .get('/api/dashboard/charts?period=invalid')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid query parameters');
    });

    it('should return time-series sales, category distribution, and top products', async () => {
      jest.spyOn(Sale, 'aggregate')
        .mockResolvedValueOnce([
          { _id: '2026-09-20', revenue: 450, quantitySold: 15, orderCount: 5 },
          { _id: '2026-09-22', revenue: 600, quantitySold: 20, orderCount: 8 },
        ]) // daily sales
        .mockResolvedValueOnce([
          {
            _id: '507f1f77bcf86cd799439011',
            quantitySold: 50,
            totalRevenue: 1500,
            productDetails: {
              name: 'Mouse',
              sku: 'MOUSE001',
              category: 'Electronics',
              currentStock: 30,
            },
          },
        ]) // top selling products
        .mockResolvedValueOnce([]); // mock for product metric demand stats
      jest.spyOn(Product, 'aggregate').mockResolvedValueOnce([
        {
          _id: 'Electronics',
          productCount: 5,
          totalStock: 120,
          totalCostValue: 2000,
          totalRetailValue: 4000,
        },
      ]);
      jest.spyOn(Product, 'find').mockResolvedValueOnce([
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Mouse',
          currentStock: 30,
          minimumStock: 10,
          reorderLevel: 20,
          leadTimeDays: 3,
          status: 'active',
        },
      ] as any);
      jest.spyOn(Purchase, 'aggregate').mockResolvedValueOnce([]);
      jest.spyOn(InventoryEvent, 'aggregate').mockResolvedValueOnce([
        { _id: '2026-09-21', added: 50, deducted: 10 },
      ]);

      const res = await request(app)
        .get('/api/dashboard/charts?period=7d')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.salesOverTime.length).toBeGreaterThanOrEqual(7);
      expect(data.categoryDistribution.length).toBe(1);
      expect(data.categoryDistribution[0].category).toBe('Electronics');
      expect(data.topSellingProducts.length).toBe(1);
      expect(data.topSellingProducts[0].productName).toBe('Mouse');
      expect(data.stockStatusDistribution).toBeDefined();
      expect(data.stockMovementTrend).toBeDefined();
    });
  });
});
