import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import Product from '../../models/Product';
import Sale from '../../models/Sale';
import Purchase from '../../models/Purchase';
import InventoryEvent from '../../models/InventoryEvent';
import { generateToken } from '../../utils/token';

describe('Phase 5: Sales API Suite (Real-Time Stock Reduction & Event Logging)', () => {
  const staffToken = generateToken({
    id: '507f1f77bcf86cd799439012',
    email: 'staff@inventory.ai',
    role: 'staff',
  });

  const fakeProductId = new mongoose.Types.ObjectId().toString();
  const fakeSaleId = new mongoose.Types.ObjectId().toString();

  describe('POST /api/sales (Create Sale Flow)', () => {
    it('should reject sale without authentication', async () => {
      const res = await request(app).post('/api/sales').send({
        product: fakeProductId,
        quantity: 2,
      });
      expect(res.status).toBe(401);
    });

    it('should reject sale if product is not found', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          product: fakeProductId,
          quantity: 2,
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Product not found');
    });

    it('should reject sale if product is discontinued', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValueOnce({
        _id: fakeProductId,
        name: 'Discontinued Item',
        status: 'discontinued',
        currentStock: 100,
      } as any);

      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          product: fakeProductId,
          quantity: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('is discontinued and cannot be sold');
    });

    it('should reject sale if quantity exceeds available stock', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValueOnce({
        _id: fakeProductId,
        name: 'Wireless Mouse',
        status: 'active',
        currentStock: 5,
      } as any);

      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          product: fakeProductId,
          quantity: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient stock');
    });

    it('should successfully complete sale, atomically decrease stock, log event, and return updated runway', async () => {
      const mockProduct = {
        _id: fakeProductId,
        name: 'Wireless Mouse',
        status: 'active',
        currentStock: 25,
        sellingPrice: 20,
        minimumStock: 10,
        reorderLevel: 15,
        leadTimeDays: 3,
      };

      const mockUpdatedProduct = {
        ...mockProduct,
        currentStock: 20, // 25 - 5
      };

      jest.spyOn(Product, 'findById').mockResolvedValueOnce(mockProduct as any);
      jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValueOnce(mockUpdatedProduct as any);

      jest.spyOn(Sale, 'create').mockResolvedValueOnce({
        _id: fakeSaleId,
        product: fakeProductId,
        quantity: 5,
        unitPrice: 20,
        totalAmount: 100,
        customer: 'Jane Doe',
        date: new Date(),
      } as any);

      jest.spyOn(InventoryEvent, 'create').mockResolvedValueOnce({
        _id: 'event-id',
        product: fakeProductId,
        type: 'SALE',
        quantity: -5,
        previousStock: 25,
        newStock: 20,
      } as any);

      jest.spyOn(Sale, 'aggregate').mockResolvedValueOnce([]);
      jest.spyOn(Purchase, 'aggregate').mockResolvedValueOnce([]);
      const mockPopulatedSale = {
        _id: fakeSaleId,
        product: { name: 'Wireless Mouse', sku: 'MOUSE001', category: 'Electronics', sellingPrice: 20 },
        createdBy: { name: 'Staff', email: 'staff@inventory.ai', role: 'staff' },
      };
      jest.spyOn(Sale, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((resolve) => resolve(mockPopulatedSale)),
      } as any);

      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          product: fakeProductId,
          quantity: 5,
          unitPrice: 20,
          customer: 'Jane Doe',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedStock).toBe(20);
      expect(res.body.data.inventoryMetrics).toBeDefined();
      expect(res.body.data.inventoryMetrics.reorderPoint).toBeDefined();
    });
  });

  describe('GET /api/sales (Query & Aggregation)', () => {
    it('should return sales list, summary totals, and pagination', async () => {
      jest.spyOn(Sale, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([
          { _id: fakeSaleId, quantity: 5, totalAmount: 100 },
        ]),
      } as any);

      jest.spyOn(Sale, 'countDocuments').mockResolvedValueOnce(1);
      jest.spyOn(Sale, 'aggregate').mockResolvedValueOnce([
        { _id: null, totalQuantitySold: 5, totalRevenue: 100 },
      ]);

      const res = await request(app)
        .get('/api/sales?page=1&limit=10')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sales.length).toBe(1);
      expect(res.body.data.summary.totalRevenue).toBe(100);
      expect(res.body.data.summary.totalQuantitySold).toBe(5);
    });
  });

  describe('GET /api/sales/:id', () => {
    it('should return 404 if sale not found', async () => {
      jest.spyOn(Sale, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((resolve) => resolve(null)),
      } as any);

      const res = await request(app)
        .get(`/api/sales/${fakeSaleId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
    });
  });
});
