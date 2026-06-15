const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/stats/dashboard
// Admin: returns overall data (all branches, all time)
// Seller: returns today-only data for their branch
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const branchId = req.user.branch_id;

    if (isAdmin) {
      // ── ADMIN: Overall data ──
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Daily count (today)
      const dailyCount = await prisma.order.count({
        where: {
          order_date: todayStr,
          status: { not: 'cancelled' }
        }
      });

      // 2. Weekly count (last 7 days)
      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
      const sixDaysAgoStr = sixDaysAgo.toISOString().split('T')[0];
      const weeklyCount = await prisma.order.count({
        where: {
          order_date: { gte: sixDaysAgoStr },
          status: { not: 'cancelled' }
        }
      });

      // 3. Monthly count (last 30 days)
      const twentyNineDaysAgo = new Date();
      twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
      const twentyNineDaysAgoStr = twentyNineDaysAgo.toISOString().split('T')[0];
      const monthlyCount = await prisma.order.count({
        where: {
          order_date: { gte: twentyNineDaysAgoStr },
          status: { not: 'cancelled' }
        }
      });

      // 4. Total sales volume
      const totalSalesAgg = await prisma.order.aggregate({
        _sum: {
          total_amount: true
        },
        where: {
          status: { not: 'cancelled' }
        }
      });
      const totalSales = totalSalesAgg._sum.total_amount || 0;

      // 5. Sales by branch showroom
      const branches = await prisma.branch.findMany({
        include: {
          orders: {
            where: { status: { not: 'cancelled' } },
            select: { total_amount: true }
          }
        }
      });

      const branchSales = branches.map(b => {
        const sales_sum = b.orders.reduce((sum, o) => sum + o.total_amount, 0);
        const order_count = b.orders.length;
        return {
          id: b.id,
          branch_name: b.name,
          sales_sum,
          order_count
        };
      });

      // 6. Top selling products
      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: { not: 'cancelled' }
          }
        },
        select: {
          product_name: true,
          quantity: true,
          price: true
        }
      });

      const productGroups = {};
      orderItems.forEach(item => {
        if (!productGroups[item.product_name]) {
          productGroups[item.product_name] = { product_name: item.product_name, total_qty: 0, revenue: 0 };
        }
        productGroups[item.product_name].total_qty += item.quantity;
        productGroups[item.product_name].revenue += item.quantity * item.price;
      });

      const topProducts = Object.values(productGroups)
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, 5);

      // 7. Unpaid orders list
      const unpaidOrdersRaw = await prisma.order.findMany({
        where: {
          status: { not: 'cancelled' }
        },
        include: {
          branch: { select: { name: true } }
        }
      });

      const unpaidOrders = unpaidOrdersRaw
        .map(o => ({
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          total_amount: o.total_amount,
          paid_amount: o.paid_amount,
          debt_amount: o.total_amount - o.paid_amount,
          order_date: o.order_date,
          branch_name: o.branch?.name || null
        }))
        .filter(o => o.paid_amount < o.total_amount)
        .sort((a, b) => b.debt_amount - a.debt_amount);

      res.json({
        success: true,
        data: {
          role: 'admin',
          counts: {
            daily: dailyCount,
            weekly: weeklyCount,
            monthly: monthlyCount
          },
          total_sales: totalSales,
          branch_sales: branchSales,
          top_products: topProducts,
          unpaid_orders: unpaidOrders
        }
      });

    } else {
      // ── SELLER: Today-only, own branch ──
      const todayStr = new Date().toISOString().split('T')[0];
      const sellerWhere = {
        order_date: todayStr,
        status: { not: 'cancelled' }
      };

      if (branchId) {
        sellerWhere.branch_id = parseInt(branchId);
      }

      // 1. Today's order count
      const todayCount = await prisma.order.count({
        where: sellerWhere
      });

      // 2. Today's total sales
      const todaySalesAgg = await prisma.order.aggregate({
        _sum: {
          total_amount: true
        },
        where: sellerWhere
      });
      const todaySales = todaySalesAgg._sum.total_amount || 0;

      // 3. Today's unpaid orders & debt
      const todayOrdersList = await prisma.order.findMany({
        where: sellerWhere
      });

      const todayDebt = todayOrdersList
        .filter(o => o.paid_amount < o.total_amount)
        .reduce((sum, o) => sum + (o.total_amount - o.paid_amount), 0);

      const todayUnpaidOrders = todayOrdersList
        .filter(o => o.paid_amount < o.total_amount)
        .map(o => ({
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          total_amount: o.total_amount,
          paid_amount: o.paid_amount,
          debt_amount: o.total_amount - o.paid_amount,
          order_date: o.order_date
        }))
        .sort((a, b) => b.debt_amount - a.debt_amount);

      res.json({
        success: true,
        data: {
          role: 'seller',
          today: {
            orders_count: todayCount,
            sales_amount: todaySales,
            debt_amount: todayDebt
          },
          today_unpaid_orders: todayUnpaidOrders
        }
      });
    }
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ success: false, message: 'Tizim xatoligi yuz berdi.' });
  }
});

module.exports = router;