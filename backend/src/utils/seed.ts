import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config';
import User from '../models/User';
import Product from '../models/Product';
import Supplier from '../models/Supplier';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import InventoryEvent from '../models/InventoryEvent';

/**
 * Database Seed Script
 * 
 * Generates realistic demo data including:
 * - 3 users (admin, manager, staff)
 * - 5 suppliers
 * - 15 products across 5 categories
 * - 90+ days of historical sales
 * - Purchase orders with various statuses
 * - Inventory events tracking all stock changes
 * 
 * Demo Credentials:
 *   Admin:   admin@inventory.ai    / admin123
 *   Manager: manager@inventory.ai  / manager123
 *   Staff:   staff@inventory.ai    / staff123
 */

// Seeded random number generator for reproducibility
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }

  intBetween(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  floatBetween(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const rng = new SeededRandom(42);

const seedUsers = async () => {
  console.log('  Seeding users...');
  const salt = await bcrypt.genSalt(10);

  const users = [
    {
      name: 'Admin User',
      email: 'admin@inventory.ai',
      password: await bcrypt.hash('admin123', salt),
      role: 'admin' as const,
    },
    {
      name: 'Inventory Manager',
      email: 'manager@inventory.ai',
      password: await bcrypt.hash('manager123', salt),
      role: 'manager' as const,
    },
    {
      name: 'Staff Member',
      email: 'staff@inventory.ai',
      password: await bcrypt.hash('staff123', salt),
      role: 'staff' as const,
    },
  ];

  const created = await User.insertMany(users);
  console.log(`  ✅ Created ${created.length} users`);
  return created;
};

const seedSuppliers = async () => {
  console.log('  Seeding suppliers...');

  const suppliers = [
    {
      name: 'TechVision Electronics',
      email: 'orders@techvision.com',
      phone: '+1-555-0101',
      address: '123 Tech Park, Silicon Valley, CA 95054',
      leadTimeDays: 3,
      status: 'active' as const,
    },
    {
      name: 'Global Peripherals Inc.',
      email: 'supply@globalperipherals.com',
      phone: '+1-555-0202',
      address: '456 Industrial Blvd, Austin, TX 73301',
      leadTimeDays: 5,
      status: 'active' as const,
    },
    {
      name: 'Premium Office Supplies',
      email: 'bulk@premiumoffice.com',
      phone: '+1-555-0303',
      address: '789 Commerce St, Chicago, IL 60601',
      leadTimeDays: 4,
      status: 'active' as const,
    },
    {
      name: 'NetGear Solutions',
      email: 'sales@netgearsolutions.com',
      phone: '+1-555-0404',
      address: '321 Network Ave, Seattle, WA 98101',
      leadTimeDays: 7,
      status: 'active' as const,
    },
    {
      name: 'Furniture World Ltd.',
      email: 'orders@furnitureworld.com',
      phone: '+1-555-0505',
      address: '654 Design District, Portland, OR 97201',
      leadTimeDays: 10,
      status: 'active' as const,
    },
  ];

  const created = await Supplier.insertMany(suppliers);
  console.log(`  ✅ Created ${created.length} suppliers`);
  return created;
};

interface SupplierDoc {
  _id: mongoose.Types.ObjectId;
}

const seedProducts = async (suppliers: SupplierDoc[]) => {
  console.log('  Seeding products...');

  const products = [
    // Electronics - Peripherals (supplier: TechVision)
    {
      name: 'Wireless Mouse',
      sku: 'MOUSE001',
      category: 'Electronics',
      supplier: suppliers[0]._id,
      description: 'Ergonomic wireless mouse with USB receiver, 1600 DPI',
      costPrice: 15.00,
      sellingPrice: 25.99,
      currentStock: 150,
      minimumStock: 20,
      reorderLevel: 40,
      leadTimeDays: 3,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    {
      name: 'Mechanical Keyboard',
      sku: 'KEYB001',
      category: 'Electronics',
      supplier: suppliers[0]._id,
      description: 'Cherry MX Blue switches, RGB backlit, full size',
      costPrice: 35.00,
      sellingPrice: 59.99,
      currentStock: 80,
      minimumStock: 15,
      reorderLevel: 30,
      leadTimeDays: 3,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    {
      name: '27" LED Monitor',
      sku: 'MON001',
      category: 'Electronics',
      supplier: suppliers[0]._id,
      description: '27 inch IPS LED Monitor, 4K UHD, 60Hz',
      costPrice: 180.00,
      sellingPrice: 299.99,
      currentStock: 35,
      minimumStock: 5,
      reorderLevel: 10,
      leadTimeDays: 5,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    // Accessories (supplier: Global Peripherals)
    {
      name: 'USB-C Hub',
      sku: 'HUB001',
      category: 'Accessories',
      supplier: suppliers[1]._id,
      description: '7-in-1 USB-C Hub with HDMI, USB 3.0, SD card reader',
      costPrice: 18.00,
      sellingPrice: 34.99,
      currentStock: 120,
      minimumStock: 25,
      reorderLevel: 50,
      leadTimeDays: 5,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    {
      name: 'Noise-Cancelling Headphones',
      sku: 'HEAD001',
      category: 'Accessories',
      supplier: suppliers[1]._id,
      description: 'Over-ear wireless headphones with ANC, 30hr battery',
      costPrice: 45.00,
      sellingPrice: 79.99,
      currentStock: 60,
      minimumStock: 10,
      reorderLevel: 25,
      leadTimeDays: 5,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    {
      name: 'Webcam HD 1080p',
      sku: 'WEBCAM001',
      category: 'Accessories',
      supplier: suppliers[1]._id,
      description: 'Full HD webcam with built-in microphone, autofocus',
      costPrice: 22.00,
      sellingPrice: 44.99,
      currentStock: 90,
      minimumStock: 15,
      reorderLevel: 30,
      leadTimeDays: 5,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    // Office Supplies (supplier: Premium Office)
    {
      name: 'A4 Copy Paper (Ream)',
      sku: 'PAPER001',
      category: 'Office Supplies',
      supplier: suppliers[2]._id,
      description: '500 sheets, 80 gsm, white A4 paper',
      costPrice: 3.50,
      sellingPrice: 6.99,
      currentStock: 500,
      minimumStock: 100,
      reorderLevel: 200,
      leadTimeDays: 4,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    {
      name: 'Whiteboard Markers (Pack of 12)',
      sku: 'MARKER001',
      category: 'Office Supplies',
      supplier: suppliers[2]._id,
      description: 'Assorted colors, dry erase markers, chisel tip',
      costPrice: 5.00,
      sellingPrice: 11.99,
      currentStock: 200,
      minimumStock: 30,
      reorderLevel: 60,
      leadTimeDays: 4,
      unit: 'boxes' as const,
      status: 'active' as const,
    },
    {
      name: 'Desk Organizer',
      sku: 'ORG001',
      category: 'Office Supplies',
      supplier: suppliers[2]._id,
      description: 'Multi-compartment desk organizer, bamboo',
      costPrice: 12.00,
      sellingPrice: 24.99,
      currentStock: 75,
      minimumStock: 10,
      reorderLevel: 20,
      leadTimeDays: 4,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    // Networking (supplier: NetGear Solutions)
    {
      name: 'Ethernet Cable Cat6 (3m)',
      sku: 'CABLE001',
      category: 'Networking',
      supplier: suppliers[3]._id,
      description: 'Cat6 ethernet cable, 3 meters, gold-plated connectors',
      costPrice: 3.00,
      sellingPrice: 7.99,
      currentStock: 300,
      minimumStock: 50,
      reorderLevel: 100,
      leadTimeDays: 7,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    {
      name: 'WiFi Range Extender',
      sku: 'WIFI001',
      category: 'Networking',
      supplier: suppliers[3]._id,
      description: 'Dual-band WiFi 6 range extender, 1800 Mbps',
      costPrice: 28.00,
      sellingPrice: 49.99,
      currentStock: 45,
      minimumStock: 8,
      reorderLevel: 15,
      leadTimeDays: 7,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    {
      name: '8-Port Gigabit Switch',
      sku: 'SWITCH001',
      category: 'Networking',
      supplier: suppliers[3]._id,
      description: 'Unmanaged 8-port Gigabit Ethernet switch, plug-and-play',
      costPrice: 15.00,
      sellingPrice: 29.99,
      currentStock: 55,
      minimumStock: 8,
      reorderLevel: 15,
      leadTimeDays: 7,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    // Furniture (supplier: Furniture World)
    {
      name: 'Ergonomic Office Chair',
      sku: 'CHAIR001',
      category: 'Furniture',
      supplier: suppliers[4]._id,
      description: 'Adjustable lumbar support, mesh back, armrests',
      costPrice: 120.00,
      sellingPrice: 249.99,
      currentStock: 20,
      minimumStock: 3,
      reorderLevel: 8,
      leadTimeDays: 10,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    {
      name: 'Standing Desk',
      sku: 'DESK001',
      category: 'Furniture',
      supplier: suppliers[4]._id,
      description: 'Electric sit-stand desk, 120cm x 60cm, memory presets',
      costPrice: 200.00,
      sellingPrice: 399.99,
      currentStock: 12,
      minimumStock: 2,
      reorderLevel: 5,
      leadTimeDays: 10,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
    {
      name: 'Monitor Arm',
      sku: 'ARM001',
      category: 'Furniture',
      supplier: suppliers[4]._id,
      description: 'Single monitor arm, gas spring, VESA 75/100mm',
      costPrice: 25.00,
      sellingPrice: 54.99,
      currentStock: 40,
      minimumStock: 5,
      reorderLevel: 12,
      leadTimeDays: 10,
      unit: 'pieces' as const,
      status: 'active' as const,
    },
  ];

  const created = await Product.insertMany(products);
  console.log(`  ✅ Created ${created.length} products`);
  return created;
};

interface ProductDoc {
  _id: mongoose.Types.ObjectId;
  sellingPrice: number;
  costPrice: number;
  sku: string;
  supplier: mongoose.Types.ObjectId;
  currentStock: number;
}

interface UserDoc {
  _id: mongoose.Types.ObjectId;
}

const seedHistoricalSales = async (products: ProductDoc[], users: UserDoc[]) => {
  console.log('  Seeding historical sales (90 days)...');

  const sales: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    customer: string;
    date: Date;
    createdBy: mongoose.Types.ObjectId;
  }> = [];

  const events: Array<{
    product: mongoose.Types.ObjectId;
    type: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    reference: string;
    createdBy: mongoose.Types.ObjectId;
    timestamp: Date;
  }> = [];

  const customers = [
    'Walk-in Customer', 'Tech Corp', 'StartupXYZ', 'University IT',
    'Creative Agency', 'Smith Consulting', 'DataWorks', 'Remote Solutions',
  ];

  // Product demand patterns (base daily demand)
  const demandPatterns: Record<string, { base: number; variance: number }> = {
    'MOUSE001': { base: 10, variance: 4 },
    'KEYB001': { base: 7, variance: 3 },
    'MON001': { base: 3, variance: 2 },
    'HUB001': { base: 8, variance: 3 },
    'HEAD001': { base: 5, variance: 3 },
    'WEBCAM001': { base: 6, variance: 2 },
    'PAPER001': { base: 20, variance: 8 },
    'MARKER001': { base: 8, variance: 4 },
    'ORG001': { base: 4, variance: 2 },
    'CABLE001': { base: 12, variance: 5 },
    'WIFI001': { base: 3, variance: 2 },
    'SWITCH001': { base: 4, variance: 2 },
    'CHAIR001': { base: 1, variance: 1 },
    'DESK001': { base: 1, variance: 1 },
    'ARM001': { base: 2, variance: 1 },
  };

  // Running stock trackers (start with high stock to allow selling)
  const stockTracker: Record<string, number> = {};
  for (const p of products) {
    stockTracker[p.sku] = 1000; // Assume initial large stock for historical period
  }

  const now = new Date();
  const daysOfHistory = 90;

  for (let dayOffset = daysOfHistory; dayOffset >= 1; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(10, 0, 0, 0);

    const dayOfWeek = date.getDay();
    // Reduced sales on weekends
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.5 : 1.0;

    for (const product of products) {
      const pattern = demandPatterns[product.sku];
      if (!pattern) continue;

      const dailyDemand = Math.max(0, Math.round(
        (pattern.base + rng.intBetween(-pattern.variance, pattern.variance)) * weekendFactor
      ));

      if (dailyDemand === 0) continue;

      // Split into 1-3 transactions per day
      const numTransactions = rng.intBetween(1, Math.min(3, dailyDemand));
      let remaining = dailyDemand;

      for (let t = 0; t < numTransactions && remaining > 0; t++) {
        const qty = t === numTransactions - 1
          ? remaining
          : rng.intBetween(1, remaining);
        remaining -= qty;

        const previousStock = stockTracker[product.sku];
        const newStock = previousStock - qty;
        stockTracker[product.sku] = newStock;

        const saleDate = new Date(date);
        saleDate.setHours(rng.intBetween(9, 18), rng.intBetween(0, 59));

        const creator = rng.pick(users);

        sales.push({
          product: product._id,
          quantity: qty,
          unitPrice: product.sellingPrice,
          totalAmount: qty * product.sellingPrice,
          customer: rng.pick(customers),
          date: saleDate,
          createdBy: creator._id,
        });

        events.push({
          product: product._id,
          type: 'SALE',
          quantity: -qty,
          previousStock,
          newStock,
          reference: `Historical sale`,
          createdBy: creator._id,
          timestamp: saleDate,
        });
      }
    }
  }

  // Insert in batches to avoid memory issues
  const batchSize = 500;
  for (let i = 0; i < sales.length; i += batchSize) {
    await Sale.insertMany(sales.slice(i, i + batchSize));
  }
  console.log(`  ✅ Created ${sales.length} sales records`);

  for (let i = 0; i < events.length; i += batchSize) {
    await InventoryEvent.insertMany(events.slice(i, i + batchSize));
  }
  console.log(`  ✅ Created ${events.length} inventory events`);

  // Update product current stock to reflect after-sales stock + some restocking
  for (const product of products) {
    // Set current stock to a realistic level (initial stock from product definition)
    await Product.findByIdAndUpdate(product._id, {
      currentStock: product.currentStock,
    });
  }

  return { salesCount: sales.length, eventsCount: events.length };
};

const seedPurchases = async (products: ProductDoc[], users: UserDoc[]) => {
  console.log('  Seeding purchases...');

  const purchases: Array<{
    product: mongoose.Types.ObjectId;
    supplier: mongoose.Types.ObjectId;
    quantity: number;
    unitCost: number;
    totalCost: number;
    date: Date;
    status: string;
    createdBy: mongoose.Types.ObjectId;
  }> = [];

  const now = new Date();

  // Create historical received purchases (restocking events)
  for (const product of products) {
    const numPurchases = rng.intBetween(2, 5);
    for (let i = 0; i < numPurchases; i++) {
      const daysAgo = rng.intBetween(5, 80);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      const qty = rng.intBetween(20, 100);
      const creator = users[rng.intBetween(0, 1)]; // admin or manager

      purchases.push({
        product: product._id,
        supplier: product.supplier,
        quantity: qty,
        unitCost: product.costPrice,
        totalCost: qty * product.costPrice,
        date,
        status: 'received',
        createdBy: creator._id,
      });
    }
  }

  // Create some pending purchases
  for (let i = 0; i < 5; i++) {
    const product = rng.pick(products);
    const qty = rng.intBetween(30, 80);
    const date = new Date(now);
    date.setDate(date.getDate() - rng.intBetween(0, 3));

    purchases.push({
      product: product._id,
      supplier: product.supplier,
      quantity: qty,
      unitCost: product.costPrice,
      totalCost: qty * product.costPrice,
      date,
      status: 'pending',
      createdBy: users[0]._id,
    });
  }

  const created = await Purchase.insertMany(purchases);
  console.log(`  ✅ Created ${created.length} purchases`);
  return created;
};

const seed = async () => {
  console.log('\n🌱 Starting database seed...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Supplier.deleteMany({}),
      Sale.deleteMany({}),
      Purchase.deleteMany({}),
      InventoryEvent.deleteMany({}),
    ]);
    console.log('  ✅ Database cleared\n');

    // Seed data
    const users = await seedUsers();
    const suppliers = await seedSuppliers();
    const products = await seedProducts(suppliers as unknown as SupplierDoc[]);
    await seedHistoricalSales(
      products as unknown as ProductDoc[],
      users as unknown as UserDoc[]
    );
    await seedPurchases(
      products as unknown as ProductDoc[],
      users as unknown as UserDoc[]
    );

    console.log('\n✅ Database seeding complete!\n');
    console.log('Demo Credentials:');
    console.log('  Admin:   admin@inventory.ai    / admin123');
    console.log('  Manager: manager@inventory.ai  / manager123');
    console.log('  Staff:   staff@inventory.ai    / staff123');
    console.log('');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB\n');
  }
};

seed();
