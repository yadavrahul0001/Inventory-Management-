import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import Product from '../../models/Product';
import Supplier from '../../models/Supplier';
import Purchase from '../../models/Purchase';
import InventoryEvent from '../../models/InventoryEvent';
import Sale from '../../models/Sale';
import { generateToken } from '../../utils/token';

describe('Phase 5: Purchases API Suite (Receiving Workflow & Duplicate Prevention)', () => {
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
  const fakeSupplierId = new mongoose.Types.ObjectId().toString();
  const fakePurchaseId = new mongoose.Types.ObjectId().toString();

  describe('POST /api/purchases (Create Purchase Order)', () => {
    it('should forbid staff from creating purchase order', async () => {
      const res = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          product: fakeProductId,
          quantity: 50,
        });

      expect(res.status).toBe(403);
    });

    it('should create purchase order in pending status', async () => {
      const mockProduct = {
        _id: fakeProductId,
        name: 'Wireless Mouse',
        supplier: fakeSupplierId,
        costPrice: 15,
      };

      jest.spyOn(Product, 'findById').mockResolvedValueOnce(mockProduct as any);
      jest.spyOn(Supplier, 'findById').mockResolvedValueOnce({
        _id: fakeSupplierId,
        name: 'Tech Supplier',
      } as any);

      jest.spyOn(Purchase, 'create').mockResolvedValueOnce({
        _id: fakePurchaseId,
        product: fakeProductId,
        supplier: fakeSupplierId,
        quantity: 50,
        unitCost: 15,
        totalCost: 750,
        status: 'pending',
      } as any);

      jest.spyOn(Purchase, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      } as any);

      const res = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          product: fakeProductId,
          quantity: 50,
          unitCost: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('status pending');
    });
  });

  describe('PUT /api/purchases/:id (Receiving Stock Flow)', () => {
    it('should forbid staff from receiving purchase order', async () => {
      const res = await request(app)
        .put(`/api/purchases/${fakePurchaseId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'received',
        });

      expect(res.status).toBe(403);
    });

    it('should receive purchase order, increment stock, log PURCHASE event, and mark received', async () => {
      const mockPurchase = {
        _id: fakePurchaseId,
        product: fakeProductId,
        quantity: 40,
        status: 'pending',
        save: jest.fn().mockResolvedValueOnce(true),
      };

      const mockProduct = {
        _id: fakeProductId,
        name: 'USB-C Cable',
        currentStock: 10,
        minimumStock: 5,
        reorderLevel: 15,
        leadTimeDays: 4,
      };

      const mockUpdatedProduct = {
        ...mockProduct,
        currentStock: 50, // 10 + 40
      };

      jest.spyOn(Purchase, 'findById').mockResolvedValueOnce(mockPurchase as any);
      jest.spyOn(Product, 'findById').mockResolvedValueOnce(mockProduct as any);
      jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValueOnce(mockUpdatedProduct as any);

      jest.spyOn(InventoryEvent, 'create').mockResolvedValueOnce({
        _id: 'event-id',
        type: 'PURCHASE',
        quantity: 40,
        previousStock: 10,
        newStock: 50,
      } as any);

      jest.spyOn(Sale, 'aggregate').mockResolvedValueOnce([]);
      jest.spyOn(Purchase, 'aggregate').mockResolvedValueOnce([]);

      jest.spyOn(Purchase, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      } as any);

      const res = await request(app)
        .put(`/api/purchases/${fakePurchaseId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: 'received',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedStock).toBe(50);
      expect(mockPurchase.save).toHaveBeenCalled();
    });

    it('should block duplicate receiving if purchase is already received', async () => {
      const alreadyReceivedPurchase = {
        _id: fakePurchaseId,
        product: fakeProductId,
        quantity: 40,
        status: 'received',
      };

      jest.spyOn(Purchase, 'findById').mockResolvedValueOnce(alreadyReceivedPurchase as any);

      const res = await request(app)
        .put(`/api/purchases/${fakePurchaseId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: 'received',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Duplicate receipt prevented');
    });

    it('should block cancelling a purchase that has already been received', async () => {
      const alreadyReceivedPurchase = {
        _id: fakePurchaseId,
        product: fakeProductId,
        quantity: 40,
        status: 'received',
      };

      jest.spyOn(Purchase, 'findById').mockResolvedValueOnce(alreadyReceivedPurchase as any);

      const res = await request(app)
        .put(`/api/purchases/${fakePurchaseId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: 'cancelled',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot cancel a purchase order that has already been received');
    });
  });

  describe('GET /api/purchases (Query & Aggregation)', () => {
    it('should return purchases list and status summary', async () => {
      jest.spyOn(Purchase, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([
          { _id: fakePurchaseId, quantity: 50, totalCost: 750, status: 'pending' },
        ]),
      } as any);

      jest.spyOn(Purchase, 'countDocuments')
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1) // pending
        .mockResolvedValueOnce(0); // received

      jest.spyOn(Purchase, 'aggregate').mockResolvedValueOnce([
        { _id: null, totalQuantityOrdered: 50, totalCost: 750 },
      ]);

      const res = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.purchases.length).toBe(1);
      expect(res.body.data.summary.totalCost).toBe(750);
      expect(res.body.data.summary.pendingCount).toBe(1);
    });
  });
});
