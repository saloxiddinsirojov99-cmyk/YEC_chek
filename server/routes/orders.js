const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/orders - List orders with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, branch_id, status, unpaid, seller_id, date_from, date_to, delivery_from, delivery_to, phone, customer } = req.query;
    
    const where = {};

    // Role-based scoping: Seller only sees their own branch orders
    if (req.user.role !== 'admin') {
      where.branch_id = req.user.branch_id || 0;
    } else if (branch_id) {
      where.branch_id = parseInt(branch_id);
    }

    if (status) {
      where.status = status;
    }

    if (seller_id) {
      where.seller_id = parseInt(seller_id);
    }

    if (customer) {
      where.customer_name = { contains: customer, mode: 'insensitive' };
    }

    if (phone) {
      where.OR = [
        { customer_phone: { contains: phone, mode: 'insensitive' } },
        { customer_phone2: { contains: phone, mode: 'insensitive' } }
      ];
    }

    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date.gte = date_from;
      if (date_to) where.order_date.lte = date_to;
    }

    if (delivery_from || delivery_to) {
      where.delivery_date = {};
      if (delivery_from) where.delivery_date.gte = delivery_from;
      if (delivery_to) where.delivery_date.lte = delivery_to;
    }

    if (search) {
      where.OR = [
        { customer_name: { contains: search, mode: 'insensitive' } },
        { customer_phone: { contains: search, mode: 'insensitive' } },
        { order_number: { contains: search, mode: 'insensitive' } }
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        branch: { select: { name: true } },
        seller: { select: { name: true } }
      },
      orderBy: { id: 'desc' }
    });

    let formattedOrders = orders.map(order => ({
      ...order,
      branch_name: order.branch?.name || null,
      seller_name: order.seller?.name || null
    }));

    if (unpaid === '1') {
      formattedOrders = formattedOrders.filter(o => o.paid_amount < o.total_amount);
    }

    res.json({
      success: true,
      data: formattedOrders,
      message: 'Buyurtmalar ro\'yxati muvaffaqiyatli yuklandi.'
    });
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// GET /api/orders/:id - Get detailed order with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: true,
        branch: true,
        seller: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi.' });
    }

    if (req.user.role !== 'admin' && order.branch_id !== req.user.branch_id) {
      return res.status(403).json({ success: false, message: 'Ushbu buyurtmani ko\'rishga huquqingiz yo\'q.' });
    }

    const formattedOrder = {
      ...order,
      branch_name: order.branch?.name || null,
      branch_address: order.branch?.address || null,
      branch_phone: order.branch?.phone || null,
      seller_name: order.seller?.name || null,
      order_items: order.items
    };

    res.json({
      success: true,
      data: formattedOrder,
      message: 'Buyurtma tafsilotlari muvaffaqiyatli yuklandi.'
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// POST /api/orders - Create new order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_phone2,
      customer_address,
      delivery_date,
      paid_amount,
      note,
      items
    } = req.body;

    if (!customer_name || !customer_phone || !delivery_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Mijoz ma\'lumotlari, yetkazish sanasi va mahsulotlar kiritilishi shart.' });
    }

    let total_amount = 0;
    for (const item of items) {
      if (!item.product_name || item.quantity <= 0 || item.price < 0) {
        return res.status(400).json({ success: false, message: 'Mahsulot ma\'lumotlari to\'g\'ri kiritilmagan.' });
      }
      total_amount += item.quantity * item.price;
    }

    // Auto-generate order number
    const maxOrder = await prisma.order.findFirst({
      orderBy: { id: 'desc' }
    });
    
    let nextNum = 1;
    if (maxOrder && maxOrder.order_number) {
      const match = maxOrder.order_number.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0]) + 1;
      }
    }
    const finalOrderNumber = String(nextNum).padStart(3, '0');

    // Insert Order with items in transaction
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          order_number: finalOrderNumber,
          branch_id: req.user.branch_id ? parseInt(req.user.branch_id) : null,
          seller_id: req.user.id,
          customer_name: customer_name.trim(),
          customer_phone: customer_phone.trim(),
          customer_phone2: customer_phone2 ? customer_phone2.trim() : '',
          customer_address: customer_address ? customer_address.trim() : '',
          order_date: new Date().toISOString().split('T')[0],
          delivery_date: delivery_date,
          total_amount: total_amount,
          paid_amount: parseFloat(paid_amount) || 0,
          note: note ? note.trim() : '',
          status: 'pending',
          items: {
            create: items.map(item => {
              const itemQty = item.width && item.height ? (parseFloat(item.width) * parseFloat(item.height)) : (parseFloat(item.quantity) || 1);
              return {
                product_id: item.product_id ? parseInt(item.product_id) : null,
                product_name: item.product_name,
                product_code: item.product_code || '',
                width: item.width ? parseFloat(item.width) : 0,
                height: item.height ? parseFloat(item.height) : 0,
                quantity: itemQty,
                price: parseFloat(item.price),
                discount_percent: item.discount_percent ? parseFloat(item.discount_percent) : 0,
                note: item.note ? item.note.trim() : ''
              };
            })
          }
        },
        include: {
          items: true,
          branch: true,
          seller: true
        }
      });
      return created;
    });

    const responseData = {
      ...result,
      branch_name: result.branch?.name || null,
      seller_name: result.seller?.name || null,
      items: result.items,
      order_items: result.items
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'Buyurtma muvaffaqiyatli yaratildi.'
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Buyurtma yaratishda xatolik yuz berdi: ' + err.message });
  }
});

// PUT /api/orders/:id - Update order
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid_amount, items, customer_name, customer_phone, customer_phone2, customer_address, delivery_date, note, branch_id } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi.' });
    }

    if (req.user.role !== 'admin' && order.branch_id !== req.user.branch_id) {
      return res.status(403).json({ success: false, message: 'Ushbu buyurtmani o\'zgartirishga huquqingiz yo\'q.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (paid_amount !== undefined) updateData.paid_amount = parseFloat(paid_amount);
      if (customer_name !== undefined) updateData.customer_name = customer_name;
      if (customer_phone !== undefined) updateData.customer_phone = customer_phone;
      if (customer_phone2 !== undefined) updateData.customer_phone2 = customer_phone2;
      if (customer_address !== undefined) updateData.customer_address = customer_address;
      if (delivery_date !== undefined) updateData.delivery_date = delivery_date;
      if (note !== undefined) updateData.note = note;
      if (branch_id !== undefined) updateData.branch_id = branch_id ? parseInt(branch_id) : null;

      // If items provided, recreate them and update total_amount
      if (items && Array.isArray(items) && items.length > 0) {
        let total_amount = 0;
        for (const item of items) {
          const qty = item.width && item.height ? (parseFloat(item.width) * parseFloat(item.height)) : (parseFloat(item.quantity) || 1);
          total_amount += qty * parseFloat(item.price || 0);
        }
        updateData.total_amount = total_amount;

        // Delete old items
        await tx.orderItem.deleteMany({
          where: { order_id: parseInt(id) }
        });

        // Recreate new items
        updateData.items = {
          create: items.map(item => {
            const itemQty = item.width && item.height ? (parseFloat(item.width) * parseFloat(item.height)) : (parseFloat(item.quantity) || 1);
            return {
              product_id: item.product_id ? parseInt(item.product_id) : null,
              product_name: item.product_name,
              product_code: item.product_code || '',
              width: item.width ? parseFloat(item.width) : 0,
              height: item.height ? parseFloat(item.height) : 0,
              quantity: itemQty,
              price: parseFloat(item.price || 0),
              discount_percent: item.discount_percent ? parseFloat(item.discount_percent) : 0,
              note: item.note ? item.note.trim() : ''
            };
          })
        };
      }

      return await tx.order.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          items: true,
          branch: true,
          seller: true
        }
      });
    });

    const responseData = {
      ...updated,
      branch_name: updated.branch?.name || null,
      seller_name: updated.seller?.name || null,
      items: updated.items,
      order_items: updated.items
    };

    res.json({
      success: true,
      data: responseData,
      message: 'Buyurtma muvaffaqiyatli yangilandi.'
    });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

// DELETE /api/orders/:id - Delete order
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi.' });
    }

    if (req.user.role !== 'admin' && order.branch_id !== req.user.branch_id) {
      return res.status(403).json({ success: false, message: 'Ushbu buyurtmani o\'chirishga huquqingiz yo\'q.' });
    }

    await prisma.order.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, message: 'Buyurtma o\'chirildi.' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ success: false, message: 'Buyurtmani o\'chirishda xatolik yuz berdi.' });
  }
});

module.exports = router;