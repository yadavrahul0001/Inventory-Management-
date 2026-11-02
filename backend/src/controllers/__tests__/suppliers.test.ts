import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import Supplier from '../../models/Supplier';
import Product from '../../models/Product';
import { generateToken } from '../../utils/token';

describe('Phase 4: Suppliers API End-to-End Suite', () => {
  const adminToken = generateToken({
    id: '507f1f77bcf86cd799439011',
    email: 'admin@inventory.ai',
    role: 'admin',
  });

  const staffToken = generateToken({
    id: '507f1f77bcf86cd799439012',
    email: 'staff@inventory.ai',
    role: 'staff',
  });

  const fakeSupplierId = new mongoose.Types.ObjectId().toString();

  describe('GET /api/suppliers', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/suppliers');
      expect(res.status).toBe(401);
    });

    it('should return suppliers list for authenticated staff', async () => {
      jest.spyOn(Supplier, 'find').mockReturnValueOnce({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([
          { _id: fakeSupplierId, name: 'Tech Supplies', email: 'tech@supplies.com', leadTimeDays: 5 },
        ]),
      } as any);
      jest.spyOn(Supplier, 'countDocuments').mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/suppliers/:id', () => {
    it('should return 404 for nonexistent supplier', async () => {
      jest.spyOn(Supplier, 'findById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/api/suppliers/${fakeSupplierId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
    });

    it('should return supplier and linked products count when found', async () => {
      jest.spyOn(Supplier, 'findById').mockResolvedValueOnce({
        _id: fakeSupplierId,
        name: 'Tech Supplies',
        email: 'tech@supplies.com',
      } as any);
      jest.spyOn(Product, 'countDocuments').mockResolvedValueOnce(8);

      const res = await request(app)
        .get(`/api/suppliers/${fakeSupplierId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.supplier.name).toBe('Tech Supplies');
      expect(res.body.data.productsCount).toBe(8);
    });
  });

  describe('POST /api/suppliers', () => {
    it('should forbid staff from creating supplier', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'New Supplier',
          email: 'new@supplier.com',
          phone: '1234567890',
        });

      expect(res.status).toBe(403);
    });

    it('should reject creation if email already exists', async () => {
      jest.spyOn(Supplier, 'findOne').mockResolvedValueOnce({
        _id: 'existing',
        email: 'exists@supplier.com',
      } as any);

      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Supplier',
          email: 'exists@supplier.com',
          phone: '1234567890',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('should reject invalid lead time (< 1)', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Supplier',
          email: 'valid@supplier.com',
          phone: '1234567890',
          leadTimeDays: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Lead time must be at least 1 day');
    });
  });

  describe('DELETE /api/suppliers/:id', () => {
    it('should block deletion if supplier has linked products', async () => {
      jest.spyOn(Supplier, 'findById').mockResolvedValueOnce({
        _id: fakeSupplierId,
        name: 'Linked Supplier',
      } as any);
      jest.spyOn(Product, 'countDocuments').mockResolvedValueOnce(3);

      const res = await request(app)
        .delete(`/api/suppliers/${fakeSupplierId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('product(s) are associated with it');
    });
  });
});
