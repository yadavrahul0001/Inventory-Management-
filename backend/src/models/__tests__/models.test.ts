import mongoose from 'mongoose';
import {
  User,
  Product,
  Supplier,
  Sale,
  Purchase,
  InventoryEvent,
  Forecast,
} from '../index';

describe('Database Models Schema Validation', () => {
  describe('User Model', () => {
    it('should fail validation if required fields are missing', () => {
      const user = new User({});
      const error = user.validateSync();
      expect(error?.errors.name).toBeDefined();
      expect(error?.errors.email).toBeDefined();
      expect(error?.errors.password).toBeDefined();
    });

    it('should fail validation for invalid email format', () => {
      const user = new User({
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
      });
      const error = user.validateSync();
      expect(error?.errors.email).toBeDefined();
    });

    it('should fail validation for invalid role', () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'superadmin' as any,
      });
      const error = user.validateSync();
      expect(error?.errors.role).toBeDefined();
    });

    it('should pass validation with valid user data', () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'admin',
      });
      const error = user.validateSync();
      expect(error).toBeUndefined();
    });
  });

  describe('Product Model', () => {
    it('should fail validation when required fields are missing', () => {
      const product = new Product({});
      const error = product.validateSync();
      expect(error?.errors.name).toBeDefined();
      expect(error?.errors.sku).toBeDefined();
      expect(error?.errors.category).toBeDefined();
      expect(error?.errors.supplier).toBeDefined();
      expect(error?.errors.costPrice).toBeDefined();
      expect(error?.errors.sellingPrice).toBeDefined();
    });

    it('should reject negative prices and stock', () => {
      const product = new Product({
        name: 'Test Product',
        sku: 'TEST001',
        category: 'Electronics',
        supplier: new mongoose.Types.ObjectId(),
        costPrice: -10,
        sellingPrice: -20,
        currentStock: -5,
      });
      const error = product.validateSync();
      expect(error?.errors.costPrice).toBeDefined();
      expect(error?.errors.sellingPrice).toBeDefined();
      expect(error?.errors.currentStock).toBeDefined();
    });

    it('should pass validation with valid product data', () => {
      const product = new Product({
        name: 'Wireless Mouse',
        sku: 'MOUSE001',
        category: 'Electronics',
        supplier: new mongoose.Types.ObjectId(),
        description: 'Ergonomic mouse',
        costPrice: 15,
        sellingPrice: 25,
        currentStock: 100,
        minimumStock: 10,
        reorderLevel: 20,
        leadTimeDays: 5,
        unit: 'pieces',
        status: 'active',
      });
      const error = product.validateSync();
      expect(error).toBeUndefined();
    });
  });

  describe('Supplier Model', () => {
    it('should fail validation if leadTimeDays is less than 1', () => {
      const supplier = new Supplier({
        name: 'Acme Corp',
        email: 'acme@example.com',
        phone: '1234567890',
        leadTimeDays: 0,
      });
      const error = supplier.validateSync();
      expect(error?.errors.leadTimeDays).toBeDefined();
    });

    it('should pass validation with valid supplier data', () => {
      const supplier = new Supplier({
        name: 'Acme Corp',
        email: 'acme@example.com',
        phone: '1234567890',
        address: '123 Tech Way',
        leadTimeDays: 5,
        status: 'active',
      });
      const error = supplier.validateSync();
      expect(error).toBeUndefined();
    });
  });

  describe('Sale Model', () => {
    it('should fail validation if required fields are missing', () => {
      const sale = new Sale({});
      const error = sale.validateSync();
      expect(error?.errors.product).toBeDefined();
      expect(error?.errors.quantity).toBeDefined();
      expect(error?.errors.unitPrice).toBeDefined();
      expect(error?.errors.totalAmount).toBeDefined();
      expect(error?.errors.createdBy).toBeDefined();
    });

    it('should reject zero or negative quantity', () => {
      const sale = new Sale({
        product: new mongoose.Types.ObjectId(),
        quantity: 0,
        unitPrice: 10,
        totalAmount: 0,
        createdBy: new mongoose.Types.ObjectId(),
      });
      const error = sale.validateSync();
      expect(error?.errors.quantity).toBeDefined();
    });
  });

  describe('Purchase Model', () => {
    it('should fail validation for invalid purchase status', () => {
      const purchase = new Purchase({
        product: new mongoose.Types.ObjectId(),
        supplier: new mongoose.Types.ObjectId(),
        quantity: 5,
        unitCost: 10,
        totalCost: 50,
        status: 'unknown_status' as any,
        createdBy: new mongoose.Types.ObjectId(),
      });
      const error = purchase.validateSync();
      expect(error?.errors.status).toBeDefined();
    });
  });

  describe('InventoryEvent Model', () => {
    it('should fail validation for invalid event type', () => {
      const event = new InventoryEvent({
        product: new mongoose.Types.ObjectId(),
        type: 'INVALID_EVENT' as any,
        quantity: 10,
        previousStock: 20,
        newStock: 30,
        createdBy: new mongoose.Types.ObjectId(),
      });
      const error = event.validateSync();
      expect(error?.errors.type).toBeDefined();
    });

    it('should accept valid event types', () => {
      const event = new InventoryEvent({
        product: new mongoose.Types.ObjectId(),
        type: 'SALE',
        quantity: -5,
        previousStock: 20,
        newStock: 15,
        createdBy: new mongoose.Types.ObjectId(),
      });
      const error = event.validateSync();
      expect(error).toBeUndefined();
    });
  });

  describe('Forecast Model', () => {
    it('should reject confidence outside [0, 1]', () => {
      const forecast = new Forecast({
        product: new mongoose.Types.ObjectId(),
        forecastDate: new Date(),
        predictedDemand: 50,
        confidence: 1.5,
        modelVersion: 'xgb-v1',
      });
      const error = forecast.validateSync();
      expect(error?.errors.confidence).toBeDefined();
    });

    it('should pass validation with valid forecast data', () => {
      const forecast = new Forecast({
        product: new mongoose.Types.ObjectId(),
        forecastDate: new Date(),
        predictedDemand: 25,
        confidence: 0.92,
        modelVersion: 'xgb-v1',
      });
      const error = forecast.validateSync();
      expect(error).toBeUndefined();
    });
  });
});
