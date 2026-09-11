import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getOrders, getOrderById, updateOrder, deleteOrder, getBranches, getUsers } from '../../services/api';
import { Eye, Edit3, Trash2, X, Search, Calendar, Phone, User, Filter, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import Receipt from '../../components/Receipt';
import { useAuth } from '../../context/AuthContext';
import '../seller/OrderList.css';

export default function AdminOrderManagement() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', paid_amount: 0 });
  const [editItems, setEditItems] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [deliveryDialog, setDeliveryDialog] = useState(null);

  // Filter fields
  const [filters, setFilters] = useState({
    customer: '',
    phone: '',
    date_from: '',
    date_to: '',
    delivery_from: '',
    delivery_to: '',
  });

  useEffect(() => {
    Promise.all([fetchOrders({}), fetchBranches(), fetchUsers()]);
  }, []);

  const fetchOrders = async (filterParams = {}) => {
    try {
      const response = await getOrders(filterParams);
      setOrders(response || []);
      setLoading(false);
    } catch (err) {
      setError('Buyurtmalarni yuklashda xato: ' + err.message);
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await getBranches();
      setBranches(data || []);
    } catch (err) {
      console.error('Filiallarni yuklashda xato:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Foydalanuvchilarni yuklashda xato:', err);
    }
  };

  const handleSearch = () => {
    const params = {};
    if (filter !== 'all') params.status = filter;
    if (branchFilter) params.branch_id = branchFilter;
    if (sellerFilter) params.seller_id = sellerFilter;
    if (filters.customer) params.customer = filters.customer;
    if (filters.phone) params.phone = filters.phone;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.delivery_from) params.delivery_from = filters.delivery_from;
    if (filters.delivery_to) params.delivery_to = filters.delivery_to;
    setLoading(true);
    fetchOrders(params);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Delivery confirmation
  useEffect(() => {
    if (orders.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const pendingDelivery = orders.find(o => o.status === 'pending' && o.delivery_date <= today);
      if (pendingDelivery) {
        setDeliveryDialog(pendingDelivery);
      }
    }
  }, [orders]);

  const handleDeliveryConfirm = async (delivered) => {
    if (!deliveryDialog) return;
    try {
      if (delivered) {
        await updateOrder(deliveryDialog.id, { status: 'completed' });
        setSuccessMsg(`Buyurtma #${deliveryDialog.order_number} yetkazildi va yakunlandi!`);
      } else {
        const newDate = prompt('Yangi yetkazish sanasini kiriting (YYYY-MM-DD):', deliveryDialog.delivery_date);
        if (newDate) {
          await updateOrder(deliveryDialog.id, { delivery_date: newDate });
          setSuccessMsg(`Buyurtma #${deliveryDialog.order_number} uchun yangi yetkazish sanasi: ${newDate}`);
        }
      }
      setDeliveryDialog(null);
      await fetchOrders({});
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleEdit = async (order) => {
    try {
      const fullOrder = await getOrderById(order.id);
      setEditForm({
        status: fullOrder.status,
        paid_amount: fullOrder.paid_amount || 0,
        customer_name: fullOrder.customer_name,
        customer_phone: fullOrder.customer_phone,
        customer_phone2: fullOrder.customer_phone2,
        customer_address: fullOrder.customer_address || '',
        delivery_date: fullOrder.delivery_date,
        note: fullOrder.note || '',
        branch_id: fullOrder.branch_id || ''
      });
      setEditItems((fullOrder.items || fullOrder.order_items || []).map(item => ({
        ...item,
        _tempId: Date.now() + Math.random()
      })));
      setEditModal(fullOrder);
    } catch (err) {
      setError('Buyurtma ma\'lumotlarini yuklashda xato: ' + err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        status: editForm.status,
        paid_amount: parseFloat(editForm.paid_amount) || 0,
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        customer_phone2: editForm.customer_phone2,
        customer_address: editForm.customer_address,
        delivery_date: editForm.delivery_date,
        note: editForm.note,
        branch_id: editForm.branch_id ? parseInt(editForm.branch_id) : undefined,
        items: editItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: parseFloat(item.quantity) || 0,
          price: parseFloat(item.price) || 0,
          note: item.note || ''
        }))
      };

      await updateOrder(editModal.id, updateData);
      setSuccessMsg('Buyurtma yangilandi!');
      setEditModal(null);
      await fetchOrders({});
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Buyurtmani yangilashda xato: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu buyurtmani o\'chirishni xohlaysizmi?')) return;
    try {
      await deleteOrder(id);
      setSuccessMsg('Buyurtma o\'chirildi!');
      await fetchOrders({});
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Buyurtmani o\'chirishda xato: ' + err.message);
    }
  };

  const handleViewReceipt = async (order) => {
    try {
      const fullOrder = await getOrderById(order.id);
      setReceiptOrder(fullOrder);
    } catch (err) {
      setError('Buyurtmani yuklashda xato: ' + err.message);
    }
  };

  const addEditItem = () => {
    setEditItems([...editItems, {
      product_id: null,
      product_name: '',
      quantity: 1,
      price: 0,
      note: '',
      _tempId: Date.now() + Math.random()
    }]);
  };

  const removeEditItem = (tempId) => {
    setEditItems(editItems.filter(item => item._tempId !== tempId));
  };

  const updateEditItem = (tempId, field, value) => {
    setEditItems(editItems.map(item =>
      item._tempId === tempId ? { ...item, [field]: value } : item
    ));
  };

  const filteredOrders = orders.filter(order => {
    if (filter !== 'all' && order.status !== filter) return false;
    if (branchFilter && order.branch_id !== parseInt(branchFilter)) return false;
    if (sellerFilter && order.seller_id !== parseInt(sellerFilter)) return false;
    return true;
  });

  const navItems = [
    { path: '/admin/dashboard', label: 'Asosiy' },
    { path: '/admin/products', label: 'Mahsulotlar' },
    { path: '/admin/branches', label: 'Filiallar' },
    { path: '/admin/users', label: 'Foydalanuvchilar' },
    { path: '/admin/orders', label: 'Buyurtmalar' },
    { path: '/admin/statistics', label: 'Statistika' }
  ];

  if (loading) {
    return <Layout navItems={navItems}><p>Yuklanmoqda...</p></Layout>;
  }

  if (receiptOrder) {
    return <Receipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />;
  }

  const calculateEditTotal = () => {
    return editItems.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.price || 0)), 0);
  };

  return (
    <Layout navItems={navItems}>
      <div className="order-list full-width">
        <h2 className="page-title">Buyurtmalar (Admin)</h2>

        {error && <div className="error-message">{error}</div>}
        {successMsg && <div className="success-message">{successMsg}</div>}

        {/* Delivery Confirmation Dialog */}
        {deliveryDialog && (
          <div className="modal-overlay">
            <div className="modal-content delivery-dialog" onClick={e => e.stopPropagation()}>
              <div className="delivery-dialog-icon">
                <Calendar size={48} />
              </div>
              <h3>Yetkazish kuni keldi!</h3>
              <p>Buyurtma №{deliveryDialog.order_number}</p>
              <p><strong>Mijoz:</strong> {deliveryDialog.customer_name}</p>
              <p><strong>Yetkazish sanasi:</strong> {deliveryDialog.delivery_date}</p>
              <p>Mahsulot yetkazildimi?</p>
              <div className="delivery-dialog-actions">
                <button className="btn btn-success" onClick={() => handleDeliveryConfirm(true)}>
                  <CheckCircle size={20} /> Ha, yetkazildi
                </button>
                <button className="btn btn-warning" onClick={() => handleDeliveryConfirm(false)}>
                  <XCircle size={20} /> Yo'q, sanani o'zgartirish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Accordion Filter */}
        <div className="filter-accordion">
          <button className="filter-accordion-header" onClick={() => setShowFilter(!showFilter)}>
            <Filter size={18} />
            <span>Qidirish va filtrlash</span>
            {showFilter ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showFilter && (
            <div className="filter-accordion-content">
              <div className="filter-grid">
                <div className="filter-group">
                  <label><User size={14} /> Mijoz ismi/familiyasi</label>
                  <input type="text" value={filters.customer} onChange={(e) => handleFilterChange('customer', e.target.value)} placeholder="Mijoz nomi" />
                </div>
                <div className="filter-group">
                  <label><Phone size={14} /> Telefon raqam</label>
                  <input type="text" value={filters.phone} onChange={(e) => handleFilterChange('phone', e.target.value)} placeholder="Telefon qismi" />
                </div>
                <div className="filter-group">
                  <label><User size={14} /> Sotuvchi</label>
                  <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}>
                    <option value="">Barcha sotuvchilar</option>
                    {users.filter(u => u.role === 'seller').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label><Filter size={14} /> Filial</label>
                  <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                    <option value="">Barcha filiallar</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label><Calendar size={14} /> Buyurtma sanasidan</label>
                  <input type="date" value={filters.date_from} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
                </div>
                <div className="filter-group">
                  <label><Calendar size={14} /> Buyurtma sanasigacha</label>
                  <input type="date" value={filters.date_to} onChange={(e) => handleFilterChange('date_to', e.target.value)} />
                </div>
                <div className="filter-group">
                  <label><Calendar size={14} /> Yetkazish sanasidan</label>
                  <input type="date" value={filters.delivery_from} onChange={(e) => handleFilterChange('delivery_from', e.target.value)} />
                </div>
                <div className="filter-group">
                  <label><Calendar size={14} /> Yetkazish sanasigacha</label>
                  <input type="date" value={filters.delivery_to} onChange={(e) => handleFilterChange('delivery_to', e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary filter-search-btn" onClick={handleSearch}>
                <Search size={16} /> Qidirish
              </button>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="filter-section">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => { setFilter('all'); handleSearch(); }}>Barcha ({orders.length})</button>
          <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => { setFilter('pending'); handleSearch(); }}>Kutilmoqda ({orders.filter(o => o.status === 'pending').length})</button>
          <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => { setFilter('completed'); handleSearch(); }}>Yakunlangan ({orders.filter(o => o.status === 'completed').length})</button>
        </div>

        {/* Edit Modal */}
        {editModal && (
          <div className="modal-overlay" onClick={() => setEditModal(null)}>
            <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Edit3 size={20} /> Buyurtma #{editModal.order_number}</h3>
                <button className="close-btn" onClick={() => setEditModal(null)}><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="edit-grid">
                  <div className="edit-column">
                    <h4>Mijoz ma'lumotlari</h4>
                    <div className="form-group"><label>Mijoz ismi</label><input type="text" value={editForm.customer_name || ''} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} /></div>
                    <div className="form-group"><label>1-telefon</label><input type="text" value={editForm.customer_phone || ''} onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })} /></div>
                    <div className="form-group"><label>2-telefon</label><input type="text" value={editForm.customer_phone2 || ''} onChange={(e) => setEditForm({ ...editForm, customer_phone2: e.target.value })} /></div>
                    <div className="form-group"><label>Manzil</label><input type="text" value={editForm.customer_address || ''} onChange={(e) => setEditForm({ ...editForm, customer_address: e.target.value })} /></div>
                    <div className="form-group"><label>Filial</label><select value={editForm.branch_id} onChange={(e) => setEditForm({ ...editForm, branch_id: e.target.value })}>{branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}</select></div>
                  </div>
                  <div className="edit-column">
                    <h4>Buyurtma holati</h4>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                        <option value="pending">Kutilmoqda</option>
                        <option value="completed">Yakunlangan</option>
                        <option value="cancelled">Bekor qilindi</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Yetkazish sanasi</label><input type="date" value={editForm.delivery_date || ''} onChange={(e) => setEditForm({ ...editForm, delivery_date: e.target.value })} /></div>
                    <div className="form-group"><label>To'langan summa (so'm)</label><input type="number" value={editForm.paid_amount} onChange={(e) => setEditForm({ ...editForm, paid_amount: parseFloat(e.target.value) || 0 })} min="0" /></div>
                    <div className="form-group"><label>Izoh</label><textarea value={editForm.note || ''} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} rows="2" /></div>
                  </div>
                </div>

                <div className="edit-items-section">
                  <h4>Mahsulotlar</h4>
                  {editItems.map((item) => (
                    <div key={item._tempId} className="edit-item-row">
                      <input type="text" value={item.product_name} onChange={(e) => updateEditItem(item._tempId, 'product_name', e.target.value)} placeholder="Mahsulot nomi" className="item-name-input" />
                      <input type="number" value={item.quantity} onChange={(e) => updateEditItem(item._tempId, 'quantity', parseFloat(e.target.value) || 0)} min="0" step="0.01" placeholder="Kvadrat" className="item-qty-input" />
                      <input type="number" value={item.price} onChange={(e) => updateEditItem(item._tempId, 'price', parseFloat(e.target.value) || 0)} min="0" placeholder="Narx" className="item-price-input" required />
                      <span className="item-sum">{(parseFloat(item.quantity || 0) * parseFloat(item.price || 0)).toLocaleString()} so'm</span>
                      <button type="button" className="remove-item-btn" onClick={() => removeEditItem(item._tempId)}><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button type="button" className="add-item-btn-small" onClick={addEditItem}>+ Mahsulot qo'shish</button>
                  <div className="edit-total">Jami: <strong>{calculateEditTotal().toLocaleString()} so'm</strong></div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Saqlash</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Bekor qilish</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="empty-state"><p>Buyurtmalar topilmadi</p></div>
        ) : (
          <div className="orders-table">
            <div className="table-header">
              <div className="col-order-num">Buyurtma №</div>
              <div className="col-customer">Mijoz</div>
              <div className="col-date">Buyurtma sanasi</div>
              <div className="col-delivery">Yetkazish sanasi</div>
              <div className="col-amount">Summa</div>
              <div className="col-paid">To'lov</div>
              <div className="col-status">Status</div>
              <div className="col-actions">Amallar</div>
            </div>

            {filteredOrders.map(order => {
              const isDeliveryDue = order.status === 'pending' && order.delivery_date <= new Date().toISOString().split('T')[0];
              return (
                <div key={order.id} className={`table-row ${isDeliveryDue ? 'delivery-due' : ''}`}>
                  <div className="col-order-num">
                    <strong>{order.order_number}</strong>
                    <span className="branch-label">{order.branch_name} / {order.seller_name}</span>
                  </div>
                  <div className="col-customer">
                    <div className="customer-info">
                      <p className="customer-name">{order.customer_name}</p>
                      <p className="customer-phone">{order.customer_phone}</p>
                    </div>
                  </div>
                  <div className="col-date">{new Date(order.order_date).toLocaleDateString('uz-UZ')}</div>
                  <div className="col-delivery">
                    {new Date(order.delivery_date).toLocaleDateString('uz-UZ')}
                    {isDeliveryDue && <span className="delivery-badge">Kechikkan</span>}
                  </div>
                  <div className="col-amount"><span className="amount">{order.total_amount?.toLocaleString()} so'm</span></div>
                  <div className="col-paid">
                    <span className="paid-amount">{order.paid_amount?.toLocaleString()} so'm</span>
                    <span className="balance">Qoldiq: {((order.total_amount || 0) - (order.paid_amount || 0)).toLocaleString()} so'm</span>
                  </div>
                  <div className="col-status">
                    <span className={`status-badge status-${order.status}`}>
                      {order.status === 'pending' && 'Kutilmoqda'}
                      {order.status === 'completed' && 'Yakunlangan'}
                      {order.status === 'cancelled' && 'Bekor qilindi'}
                    </span>
                  </div>
                  <div className="col-actions">
                    <button className="action-btn view" onClick={() => handleViewReceipt(order)} title="Chekni ko'rish"><Eye size={18} /></button>
                    <button className="action-btn edit" onClick={() => handleEdit(order)} title="Tahrirlash"><Edit3 size={18} /></button>
                    <button className="action-btn delete" onClick={() => handleDelete(order.id)} title="O'chirish"><Trash2 size={18} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}