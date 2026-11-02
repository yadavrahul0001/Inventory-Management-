import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import Product from '../../models/Product';
import InventoryEvent from '../../models/InventoryEvent';
import Sale from '../../models/Sale';
import Purchase from '../../models/Purchase';
import { generateToken } from '../../utils/token';

describe('Phase 4: Inventory API Suite', () => {
  const adminToken = generateToken({
    id: '507f1f77bcf86cd799439011',
    email: 'admin@inventory.ai',
    role: 'admin',
  });

  const managerToken = generateToken({
    id: '507f1f77bcf86cd799439013',
    email: 'manager@inventory.ai',
    role: 'manager',
  });

  const staffToken = generateToken({
    id: '507f1f77bcf86cd799439012',
    email: 'staff@inventory.ai',
    role: 'staff',
  });

  const fakeProductId = new mongoose.Types.ObjectId().toString();

  describe('GET /api/inventory', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.status).toBe(401);
    });

    it('should return live calculated inventory list and summary', async () => {
      const mockProduct = {
        _id: fakeProductId,
        name: 'Wireless Mouse',
        sku: 'MOUSE001',
        category: 'Electronics',
        currentStock: 15,
        minimumStock: 20,
        reorderLevel: 40,
        leadTimeDays: 3,
        status: 'active',
      };

      jest.spyOn(Product, 'find').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce([mockProduct]),
      } as any);

      jest.spyOn(Sale, 'aggregate').mockResolvedValueOnce([]);
      jest.spyOn(Purchase, 'aggregate').mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.totalProducts).toBe(1);
      expect(res.body.data.items[0].reorderPoint).toBeDefined();
      expect(res.body.data.items[0].stockRisk).toBeDefined();
    });
  });

  describe('GET /api/inventory/alerts', () => {
    it('should return products requiring attention', async () => {
      const lowStockProduct = {
        _id: fakeProductId,
        name: 'Low Stock Item',
        sku: 'LOW001',
        category: 'Electronics',
        currentStock: 5,
        minimumStock: 20,
        reorderLevel: 40,
        leadTimeDays: 7,
        status: 'active',
      };

      jest.spyOn(Product, 'find').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce([lowStockProduct]),
      } as any);

      jest.spyOn(Sale, 'aggregate').mockResolvedValueOnce([]);
      jest.spyOn(Purchase, 'aggregate').mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/inventory/alerts')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/inventory/:productId', () => {
    it('should return detailed inventory runway and recommendation', async () => {
      const mockProduct = {
        _id: fakeProductId,
        name: 'Desk Lamp',
        sku: 'LAMP001',
        category: 'Lighting',
        currentStock: 25,
        minimumStock: 10,
        reorderLevel: 20,
        leadTimeDays: 4,
        status: 'active',
      };

      jest.spyOn(Product, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockProduct),
      } as any);

      jest.spyOn(Sale, 'aggregate').mockResolvedValueOnce([]);
      jest.spyOn(Purchase, 'aggregate').mockResolvedValueOnce([]);
      jest.spyOn(InventoryEvent, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      } as any);
      jest.spyOn(Sale, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      } as any);
      jest.spyOn(Purchase, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValueOnce([]),
      } as any);

      const res = await request(app)
        .get(`/api/inventory/${fakeProductId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.recommendation).toBeDefined();
      expect(res.body.data.recommendation.explanation).toBeDefined();
      expect(res.body.data.recommendation.explanation.formula).toContain('Recommended Order Quantity');
    });
  });

  describe('POST /api/inventory/adjust (Stock Adjustment Audit)', () => {
    it('should forbid staff from manually adjusting stock', async () => {
      const res = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          productId: fakeProductId,
          newStock: 50,
          reason: 'Count variance',
        });

      expect(res.status).toBe(403);
    });

    it('should adjust stock and create an ADJUSTMENT inventory event', async () => {
      const mockProduct = {
        _id: fakeProductId,
        name: 'Adjusted Product',
        currentStock: 30,
        minimumStock: 10,
        reorderLevel: 20,
        leadTimeDays: 5,
        save: jest.fn().mockResolvedValueOnce(true),
      };

      jest.spyOn(Product, 'findById').mockResolvedValueOnce(mockProduct as any);
      jest.spyOn(InventoryEvent, 'create').mockResolvedValueOnce({
        _id: 'event-id',
        type: 'ADJUSTMENT',
        quantity: 15,
        previousStock: 30,
        newStock: 45,
      } as any);
      jest.spyOn(Sale, 'aggregate').mockResolvedValueOnce([]);
      jest.spyOn(Purchase, 'aggregate').mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          productId: fakeProductId,
          newStock: 45,
          reason: 'Physical count discrepancy correction',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event).toBeDefined();
      expect(mockProduct.save).toHaveBeenCalled();
    });

    it('should allow admin to adjust stock', async () => {
      const mockProduct = {
        _id: fakeProductId,
        name: 'Admin Adjusted Product',
        currentStock: 10,
        minimumStock: 10,
        reorderLevel: 20,
        leadTimeDays: 5,
        save: jest.fn().mockResolvedValueOnce(true),
      };

      jest.spyOn(Product, 'findById').mockResolvedValueOnce(mockProduct as any);
      jest.spyOn(InventoryEvent, 'create').mockResolvedValueOnce({
        _id: 'event-id-admin',
        type: 'ADJUSTMENT',
        quantity: 10,
        previousStock: 10,
        newStock: 20,
      } as any);
      jest.spyOn(Sale, 'aggregate').mockResolvedValueOnce([]);
      jest.spyOn(Purchase, 'aggregate').mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: fakeProductId,
          newStock: 20,
          reason: 'Admin restocking adjustment',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
