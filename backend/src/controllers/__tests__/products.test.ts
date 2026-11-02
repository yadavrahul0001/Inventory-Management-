import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import Product from '../../models/Product';
import Supplier from '../../models/Supplier';
import Sale from '../../models/Sale';
import Purchase from '../../models/Purchase';
import { generateToken } from '../../utils/token';

describe('Phase 4: Products API End-to-End Suite', () => {
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
  const fakeProductId = new mongoose.Types.ObjectId().toString();

  describe('GET /api/products', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });

    it('should return products with pagination for staff user', async () => {
      jest.spyOn(Product, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([
          { _id: fakeProductId, name: 'Mouse', sku: 'MOUSE001', category: 'Electronics' },
        ]),
      } as any);
      jest.spyOn(Product, 'countDocuments').mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/api/products/invalid-id')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid product ID format');
    });

    it('should return 404 if product is not found', async () => {
      jest.spyOn(Product, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(null),
      } as any);

      const res = await request(app)
        .get(`/api/products/${fakeProductId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Product not found');
    });

    it('should return product details when found', async () => {
      jest.spyOn(Product, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce({
          _id: fakeProductId,
          name: 'Mechanical Keyboard',
          sku: 'KEYB001',
          costPrice: 35,
          sellingPrice: 59.99,
        }),
      } as any);

      const res = await request(app)
        .get(`/api/products/${fakeProductId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Mechanical Keyboard');
    });
  });

  describe('POST /api/products (RBAC & Creation)', () => {
    it('should return 403 Forbidden when staff tries to create product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'New Product',
          sku: 'NEW001',
          category: 'Electronics',
          supplier: fakeSupplierId,
          costPrice: 10,
          sellingPrice: 20,
        });

      expect(res.status).toBe(403);
    });

    it('should reject creation if SKU already exists', async () => {
      jest.spyOn(Product, 'findOne').mockResolvedValueOnce({
        _id: 'existing-id',
        sku: 'EXIST001',
      } as any);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Existing Product',
          sku: 'EXIST001',
          category: 'Electronics',
          supplier: fakeSupplierId,
          costPrice: 10,
          sellingPrice: 20,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("SKU 'EXIST001' already exists");
    });

    it('should reject creation if supplier does not exist', async () => {
      jest.spyOn(Product, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(Supplier, 'findById').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product with Bad Supplier',
          sku: 'GOOD001',
          category: 'Electronics',
          supplier: fakeSupplierId,
          costPrice: 10,
          sellingPrice: 20,
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('specified supplier does not exist');
    });
  });

  describe('DELETE /api/products/:id (RBAC & Cascade Safety)', () => {
    it('should forbid staff and manager from deleting product', async () => {
      const managerToken = generateToken({
        id: '507f1f77bcf86cd799439013',
        email: 'manager@inventory.ai',
        role: 'manager',
      });

      const res = await request(app)
        .delete(`/api/products/${fakeProductId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
    });

    it('should block deletion if product has sales records', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValueOnce({
        _id: fakeProductId,
        name: 'Sold Product',
      } as any);
      jest.spyOn(Sale, 'countDocuments').mockResolvedValueOnce(5);
      jest.spyOn(Purchase, 'countDocuments').mockResolvedValueOnce(0);

      const res = await request(app)
        .delete(`/api/products/${fakeProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('linked transactions');
    });
  });
});
