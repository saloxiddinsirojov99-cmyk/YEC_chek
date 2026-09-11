import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { getProducts, createOrder } from '../../services/api';
import ProductSearchModal from '../../components/ProductSearchModal';
import PhoneInput from '../../components/PhoneInput';
import Receipt from '../../components/Receipt';
import { Trash2, Printer, Search, Phone, User, MapPin, ShoppingCart, CreditCard, StickyNote, Calendar } from 'lucide-react';
import './CreateOrder.css';

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function cleanName(str) {
  return str.replace(/\s+/g, ' ').trim();
}
function parseDateInput(value) {
  return value || '';
}

function isValidPhone(phone) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  const afterPrefix = phone.substring(5).replace(/\s/g, '');
  return afterPrefix.length === 9;
}

function formatNumberWithSpaces(num) {
  if (num === '' || num === null || num === undefined) return '';
  const numStr = String(num).replace(/\s/g, '');
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function parseSpacedNumber(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\s/g, '')) || 0;
}

/**
 * Normalize dimension string:
 * - Replace commas with dots (European decimal separator)
 * - Standardize separators: "×", "*", "X", "x" all become "x"
 * - Remove spaces around separator
 * - Result like: "1.2x3.3"
 */
function normalizeRazmer(value) {
  // First replace comma with dot for decimal
  let s = value.replace(/,/g, '.');
  // Normalize all dimension separators to "x"
  s = s.replace(/[×*]/g, 'x');
  s = s.replace(/\s*[xX]\s*/g, 'x');
  // Remove any remaining spaces
  s = s.replace(/\s/g, '');
  // Remove any characters that aren't digits, dots, or 'x'/'ga'
  s = s.replace(/[^0-9.xga]/g, '');
  // Fix cases like "1.2.3" → keep only first dot in each number
  // Split by 'x' or 'ga', fix each part
  const sep = s.includes('ga') ? 'ga' : s.includes('x') ? 'x' : null;
  if (sep) {
    const parts = s.split(sep);
    if (parts.length === 2) {
      const fixDot = (str) => {
        const dotIdx = str.indexOf('.');
        if (dotIdx >= 0) {
          return str.substring(0, dotIdx + 1) + str.substring(dotIdx + 1).replace(/\./g, '');
        }
        return str;
      };
      return fixDot(parts[0]) + 'x' + fixDot(parts[1]);
    }
  }
  return s;
}

function parseRazmer(value) {
  let cleaned = value.replace(/\s/g, '');
  let parts = null;
  
  if (cleaned.includes('x')) parts = cleaned.split('x');
  else if (cleaned.includes('X')) parts = cleaned.split('X');
  else if (cleaned.includes('ga')) parts = cleaned.split('ga');
  else if (cleaned.includes('*')) parts = cleaned.split('*');
  else if (cleaned.includes('×')) parts = cleaned.split('×');

  if (parts && parts.length === 2) {
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }
  return null;
}

export default function CreateOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [phoneErrors, setPhoneErrors] = useState({});
  const [paidAmountDisplay, setPaidAmountDisplay] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    customer_phone: '+998 ',
    customer_phone2: '+998 ',
    customer_address: '',
    delivery_date: '',
    paid_amount: 0,
    note: ''
  });

  const [items, setItems] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [savedOrder, setSavedOrder] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsData = await getProducts();
        setProducts(productsData || []);
      } catch (err) {
        setError('Ma\'lumotlarni yuklashda xato: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const openProductSearch = (index) => {
    setEditingItemIndex(index);
    setShowProductSearch(true);
  };

  const handleProductSelect = (product) => {
    if (editingItemIndex === null) return;
    const newItems = [...items];
    newItems[editingItemIndex] = {
      ...newItems[editingItemIndex],
      product_id: product.id,
      price: product.price,
      product_name: product.name,
      product_code: product.code || ''
    };
    setItems(newItems);
    setEditingItemIndex(null);
  };

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: '',
      price: 0,
      note: '',
      product_name: '',
      product_code: '',
      width: '',
      height: '',
      razmer: '',
      discount_amount: 0
    }]);
    openProductSearch(items.length);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'razmer') {
      // Normalize: allow decimals, commas, various separators
      const normalized = normalizeRazmer(value);
      newItems[index].razmer = normalized;
      
      const parsed = parseRazmer(normalized);
      if (parsed) {
        newItems[index].width = parsed.width;
        newItems[index].height = parsed.height;
        // Calculate area with 2 decimal precision
        newItems[index].quantity = Math.round(parsed.width * parsed.height * 100) / 100;
      } else {
        newItems[index].width = '';
        newItems[index].height = '';
        newItems[index].quantity = '';
      }
    }

    setItems(newItems);
  };

  const calculateItemSum = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const prc = parseFloat(item.price) || 0;
    const disc = parseFloat(item.discount_amount) || 0;
    const total = qty * prc - disc;
    return total > 0 ? total : 0;
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateItemSum(item), 0);
  };

  const validatePhones = () => {
    const errors = {};
    const phone1Valid = isValidPhone(formData.customer_phone);
    const phone2Valid = isValidPhone(formData.customer_phone2);

    if (!phone1Valid) {
      errors.customer_phone = '1-telefon raqam to\'liq kiritilishi shart';
    }
    if (!phone2Valid) {
      errors.customer_phone2 = '2-telefon raqam to\'liq kiritilishi shart';
    }

    setPhoneErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePhones()) {
      return;
    }

    if (items.length === 0) {
      setError('Iltimos, kamida bitta mahsulot qo\'shing');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].price || parseFloat(items[i].price) <= 0) {
        setError(`Mahsulot #${i + 1} narxi kiritilishi shart`);
        return;
      }
    }

    try {
      const total = calculateTotal();
      const deliveryDateISO = parseDateInput(formData.delivery_date);
      const customerName = cleanName(
        `${capitalizeFirstLetter(formData.first_name.replace(/\s/g, ''))} ${capitalizeFirstLetter(formData.last_name.replace(/\s/g, ''))}`
      ).trim();

      if (!customerName) {
        setError('Mijoz ismi va familiyasi kiritilishi shart.');
        return;
      }

      const orderData = {
        branch_id: user?.branch_id,
        seller_id: user.id,
        customer_name: customerName,
        customer_phone: formData.customer_phone,
        customer_phone2: formData.customer_phone2,
        customer_address: formData.customer_address,
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: deliveryDateISO,
        total_amount: total,
        paid_amount: parseSpacedNumber(paidAmountDisplay),
        note: formData.note,
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
          discount_amount: parseFloat(item.discount_amount) || 0,
          note: item.note,
          product_name: item.product_name,
          product_code: item.product_code || '',
          width: parseFloat(item.width) || 0,
          height: parseFloat(item.height) || 0
        }))
      };

      const orderResponse = await createOrder(orderData);
      setSavedOrder(orderResponse);
      setShowReceipt(true);
    } catch (err) {
      setError('Buyurtmani saqlashda xato: ' + err.message);
    }
  };

  const navItems = [
    { path: '/seller/create-order', label: 'Yangi Buyurtma' },
    { path: '/seller/orders', label: 'Buyurtmalar' }
  ];

  if (loading) {
    return (
      <Layout navItems={navItems}>
        <div className="create-order">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Ma'lumotlar yuklanmoqda...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (showReceipt && savedOrder) {
    return <Receipt order={savedOrder} onClose={() => {
      setShowReceipt(false);
      navigate('/seller/orders');
    }} />;
  }

  return (
    <Layout navItems={navItems}>
      <div className="create-order animate-fadeIn">
        <h2 className="page-title">Yangi Buyurtma Yaratish</h2>

        {error && <div className="error-message animate-shake">{error}</div>}

        <form onSubmit={handleSubmit} className="order-form">
          {/* Customer Info */}
          <section className="form-section animate-fadeInUp">
            <h3><User size={20} /> Buyurtma Ma'lumotlari</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label><Calendar size={16} /> Yetkazish sanasi *</label>
                <input
                  type="date"
                  className="date-input"
                  value={formData.delivery_date}
                  onChange={(e) => {
                    setFormData({ ...formData, delivery_date: e.target.value });
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><User size={16} /> Mijoz ismi *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\s/g, '');
                    setFormData({
                      ...formData,
                      first_name: val ? capitalizeFirstLetter(val) : val
                    });
                  }}
                  placeholder="Ismi"
                  required
                />
              </div>

              <div className="form-group">
                <label><User size={16} /> Mijoz familiyasi *</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\s/g, '');
                    setFormData({
                      ...formData,
                      last_name: val ? capitalizeFirstLetter(val) : val
                    });
                  }}
                  placeholder="Familiyasi"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><Phone size={16} /> 1-telefon raqami *</label>
                <PhoneInput
                  value={formData.customer_phone}
                  onChange={(val) => {
                    setFormData({ ...formData, customer_phone: val });
                    setPhoneErrors(prev => ({ ...prev, customer_phone: '' }));
                  }}
                  required
                  placeholder="XX XXX XX XX"
                  error={phoneErrors.customer_phone}
                />
              </div>

              <div className="form-group">
                <label><Phone size={16} /> 2-telefon raqami *</label>
                <PhoneInput
                  value={formData.customer_phone2}
                  onChange={(val) => {
                    setFormData({ ...formData, customer_phone2: val });
                    setPhoneErrors(prev => ({ ...prev, customer_phone2: '' }));
                  }}
                  required
                  placeholder="XX XXX XX XX"
                  error={phoneErrors.customer_phone2}
                />
              </div>
            </div>

            {phoneErrors.customer_phone && (
              <div className="field-error">{phoneErrors.customer_phone}</div>
            )}
            {phoneErrors.customer_phone2 && (
              <div className="field-error">{phoneErrors.customer_phone2}</div>
            )}

            <div className="form-group">
              <label><MapPin size={16} /> Manzil</label>
              <input
                type="text"
                value={formData.customer_address}
                onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                placeholder="Yetkazish manzili"
              />
            </div>
          </section>

          {/* Products */}
          <section className="form-section products-section animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <h3><ShoppingCart size={20} /> Mahsulotlar</h3>
            
            <div className="items-table">
              <div className="table-header">
                <div className="col-product-name">Mahsulot nomi</div>
                <div className="col-product-code">Gilam kodi</div>
                <div className="col-razmer">Razmer</div>
                <div className="col-kv">Kv.m</div>
                <div className="col-price">Narx (1 m²)</div>
                <div className="col-discount">Skidka (so'm)</div>
                <div className="col-sum">Summa</div>
                <div className="col-note">Izoh</div>
                <div className="col-action"></div>
              </div>

              {items.map((item, index) => (
                <div key={index} className={`table-row animate-fadeInLeft`} style={{ animationDelay: `${index * 0.05}s` }}>
                  {/* Mahsulot tanlash tugmasi */}
                  <div className="product-select-cell">
                    <button
                      type="button"
                      className={`product-select-btn${item.product_name ? ' has-product' : ''}`}
                      onClick={() => openProductSearch(index)}
                      title="Mahsulot tanlash (qidiruv oynasini ochadi)"
                    >
                      {item.product_name ? (
                        <>
                          <span className="selected-product-name">{item.product_name}</span>
                          <Search size={13} className="btn-search-icon" />
                        </>
                      ) : (
                        <>
                          <Search size={14} className="btn-search-icon" />
                          <span>Mahsulot tanlash</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Gilam kodi */}
                  <input
                    type="text"
                    className="product-code-input"
                    value={item.product_code || ''}
                    onChange={(e) => updateItem(index, 'product_code', e.target.value)}
                    placeholder="Gilam kodi"
                  />

                  {/* Razmer */}
                  <input
                    type="text"
                    className="razmer-input"
                    value={item.razmer || ''}
                    onChange={(e) => updateItem(index, 'razmer', e.target.value)}
                    placeholder="Mas: 1.2x3.3"
                  />

                  {/* Kv.m */}
                  <div className="kv-cell">
                    {item.quantity > 0 ? item.quantity.toFixed(2) : '—'}
                  </div>

                  {/* Narx (1 m²) */}
                  <input
                    type="text"
                    inputMode="decimal"
                    className="price-input"
                    value={item.price > 0 ? formatNumberWithSpaces(item.price) : (item.price === '' ? '' : '0')}
                    onChange={(e) => {
                      const raw = e.target.value;
                      updateItem(index, 'price', raw === '' ? '' : parseSpacedNumber(raw));
                    }}
                    placeholder="Narx"
                    required
                  />

                  {/* Skidka (so'm) */}
                  <input
                    type="text"
                    inputMode="numeric"
                    className="discount-input"
                    value={item.discount_amount > 0 ? formatNumberWithSpaces(item.discount_amount) : (item.discount_amount === '' ? '' : '0')}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        updateItem(index, 'discount_amount', '');
                      } else {
                        updateItem(index, 'discount_amount', parseSpacedNumber(raw));
                      }
                    }}
                    placeholder="0 so'm"
                  />

                  {/* Summa */}
                  <div className="sum-cell">
                    {calculateItemSum(item).toLocaleString()} so'm
                  </div>

                  {/* Izoh */}
                  <input
                    type="text"
                    className="note-input"
                    value={item.note}
                    onChange={(e) => updateItem(index, 'note', e.target.value)}
                    placeholder="Izoh"
                  />

                  {/* Amal - o'chirish */}
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeItem(index)}
                    title="O'chirish"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="add-item-btn"
              onClick={addItem}
            >
              + Mahsulot qo'shish
            </button>
          </section>

          {/* Payment */}
          <section className="form-section animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <h3><CreditCard size={20} /> To'lov</h3>
            <div className="form-row">
              <div className="form-group">
                <label>To'lov *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberWithSpaces(paidAmountDisplay)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setPaidAmountDisplay('');
                    } else {
                      const cleaned = raw.replace(/[^\d\s]/g, '');
                      setPaidAmountDisplay(cleaned.replace(/\s/g, ''));
                    }
                  }}
                  placeholder="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Qoldiq</label>
                <div className="readonly-value">
                  {(calculateTotal() - parseSpacedNumber(paidAmountDisplay)).toLocaleString()} so'm
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><StickyNote size={16} /> Izoh</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Qo'shimcha ma'lumot"
                rows="3"
              ></textarea>
            </div>
          </section>

          {/* Summary */}
          <div className="order-summary animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <div className="summary-row">
              <span>Jami summa:</span>
              <span className="amount">{calculateTotal().toLocaleString()} so'm</span>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              <Printer size={18} />
              Saqlash va Chop Etish
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/seller/orders')}
            >
              Bekor qilish
            </button>
          </div>
        </form>
      </div>

      {showProductSearch && (
        <ProductSearchModal
          products={products}
          onSelect={handleProductSelect}
          onClose={() => {
            setShowProductSearch(false);
            setEditingItemIndex(null);
          }}
        />
      )}
    </Layout>
  );
}