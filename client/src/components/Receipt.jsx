import { useEffect, useRef, useState } from 'react';
import { getBranches } from '../services/api';
import { Printer, X, Eye } from 'lucide-react';
import QRCode from 'qrcode';
import './Receipt.css';

export default function Receipt({ order, onClose }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl] = useState('');
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const branchesData = await getBranches();
        setBranches(branchesData || []);
      } catch (err) {
        console.error('Error fetching branches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, 'https://yec.uz', {
        width: 120,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('QR code generation error:', err);
      });
    }
  }, [loading]);

  const branch = branches.find(b => b.id === order.branch_id);
  const items = order.order_items || order.items || [];
  const totalAmount = items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0) || order.total_amount;
  const balance = totalAmount - order.paid_amount;

  // Check if any item has a discount
  const hasDiscount = items.some(item => (parseFloat(item.discount_percent) || 0) > 0);
  
  // Calculate total discount amount
  const totalDiscountAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const discountPercent = parseFloat(item.discount_percent) || 0;
    return sum + (qty * price * discountPercent / 100);
  }, 0);

  // Calculate average discount percent for display
  const avgDiscountPercent = totalAmount > 0 && totalDiscountAmount > 0 
    ? Math.round((totalDiscountAmount / totalAmount) * 100) 
    : 0;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Current print date
  const printDate = formatDate(new Date().toISOString());

  const companyName = 'YEC GILAM';
  const website = 'https://yec.uz';
  const branchPhone = branch?.phone || '+998 (97) 707-77-77';

  if (loading) {
    return (
      <div className="receipt-container">
        <div className="receipt-header">
          <h2>Kvitansiya</h2>
          <button className="close-btn" onClick={onClose} title="Yopish">
            <X size={24} />
          </button>
        </div>
        <div className="receipt-loading">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Yuklanmoqda...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-container animate-fadeIn">
      <div className="receipt-header">
        <h2><Eye size={22} /> Kvitansiya - Oldindan ko'rish</h2>
        <div className="header-actions">
          <button className="print-header-btn" onClick={handlePrint}>
            <Printer size={20} />
            Chop Etish
          </button>
          <button className="close-btn" onClick={onClose} title="Yopish">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="receipt-preview-banner">
        <Eye size={18} />
        <span>Quyida kvitansiyaning chop etiladigan ko'rinishi ko'rsatilgan</span>
      </div>

      <div id="print-area" className="receipt">
        <div className="receipt-content">
          {/* Logo - centered at top */}
          <div className="receipt-logo-section">
            <img src="/logo.png" alt="YEC GILAM" className="receipt-logo" />
          </div>

          {/* Company info - centered below logo */}
          <div className="receipt-company-info">
            <div className="company-name">{companyName}</div>
            <div className="company-detail company-phone">📞 {branchPhone}</div>
            <div className="company-detail">{website}</div>
          </div>

          {/* Order Info - compact, left aligned */}
          <div className="receipt-info">
            <div className="info-row">
              <span className="label">Buyurtma:</span>
              <span className="value">#{order.order_number}</span>
            </div>
            <div className="info-row">
              <span className="label">Filial:</span>
              <span className="value">{branch?.name || order.branch_name}</span>
            </div>
            <div className="info-row">
              <span className="label">Sotuvchi:</span>
              <span className="value">{order.seller_name || '-'}</span>
            </div>
            <div className="info-row">
              <span className="label">Yetkazish sanasi:</span>
              <span className="value">{formatDate(order.delivery_date)}</span>
            </div>
            <div className="info-row">
              <span className="label">Buyurtma sanasi:</span>
              <span className="value">{formatDate(order.order_date)}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="customer-section">
            <h4>MIJOZ MA'LUMOTLARI</h4>
            <div className="customer-info">
              <p><strong>Ismi:</strong> {order.customer_name}</p>
              <p><strong>1-Telefon:</strong> {order.customer_phone}</p>
              <p><strong>2-Telefon:</strong> {order.customer_phone2 || '-'}</p>
              {order.customer_address && <p><strong>Manzil:</strong> {order.customer_address}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>№</th>
                <th style={{ width: '40%' }}>Mahsulot nomi / Kodi / O'lcham</th>
                <th style={{ width: '15%' }}>Kvadrat (m²)</th>
                <th style={{ width: '20%' }}>Narxi</th>
                <th style={{ width: '20%' }}>Summa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="item-name">{item.product_name}</div>
                    {item.product_code && <div className="item-code">Kod: {item.product_code}</div>}
                    {item.width > 0 && item.height > 0 && (
                      <div className="item-size">O'lcham: {item.width}×{item.height} m</div>
                    )}
                    {item.note && <div className="item-note">{item.note}</div>}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{item.price.toLocaleString()} so'm</td>
                  <td>{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toLocaleString()} so'm</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals-section">
            {hasDiscount && totalDiscountAmount > 0 ? (
              <>
                <div className="total-row original">
                  <span>ASL SUMMA:</span>
                  <span className="amount">{totalAmount.toLocaleString()} so'm</span>
                </div>
                <div className="total-row discount-line">
                  <span>Skidka: {avgDiscountPercent}%</span>
                  <span className="amount discount-amount">-{totalDiscountAmount.toLocaleString()} so'm</span>
                </div>
                <div className="total-row final">
                  <span>YAKUNIY SUMMA:</span>
                  <span className="amount">{Math.round(totalAmount - totalDiscountAmount).toLocaleString()} so'm</span>
                </div>
              </>
            ) : (
              <div className="total-row">
                <span>JAMI SUMMA:</span>
                <span className="amount">{totalAmount.toLocaleString()} so'm</span>
              </div>
            )}
            <div className="total-row">
              <span>TO'LOV:</span>
              <span className="amount">{order.paid_amount.toLocaleString()} so'm</span>
            </div>
            <div className="total-row balance">
              <span>QOLDIQ:</span>
              <span className="amount">{balance.toLocaleString()} so'm</span>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="terms-section">
            <h4>YEC GILAM — SOTUV SHARTLARI VA KELISHUV</h4>
            <div className="terms-content">
              <p><strong>Mahsulot haqida</strong></p>
              <p>1.1. Mahsulot o‘lchamlari ishlab chiqarish xususiyatlariga ko‘ra ko‘rsatilgan o‘lchamdan 3–5 sm farq qilishi mumkin.</p>
              <p><strong>Yetkazib berish va o‘rnatish</strong></p>
              <p>2.1. Toshkent shahri bo‘ylab 5 000 000 (besh million) so‘mdan yuqori xaridlar uchun yetkazib berish bepul.</p>
              <p>2.2. Yetkazib berish xizmati mahsulotni 4-qavatgacha olib chiqishni o‘z ichiga oladi.</p>
              <p>2.4. Kesib tikish talab etiladigan buyurtmalar uchun ushbu xizmat 5 000 000 so‘mdan yuqori xaridlarda bepul taqdim etiladi.</p>
              <p>2.5. Gilam kesilib va tikilib o‘rnatilgandan so‘ng mahsulot qaytarib olinmaydi va almashtirilmaydi.</p>
              <p>2.6. Kesish va tikish ishlari faqat ushbu yo‘nalishda tajribaga ega mutaxassislar tomonidan amalga oshirilishi tavsiya etiladi. Nomalakali shaxslar tomonidan bajarilgan ishlar natijasida yuzaga kelgan nuqsonlar uchun kompaniya javobgar emas.</p>
              <p><strong>Qabul qilish</strong></p>
              <p>3.1. Xaridor mahsulotni qabul qilish vaqtida uning holati, o‘lchami va sifatini tekshirishi lozim.</p>
              <p>3.2. Mahsulot qabul qilinganidan so‘ng aniqlangan tashqi nuqsonlar va mexanik shikastlanishlar bo‘yicha da’volar qabul qilinmaydi.</p>
              <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#333' }}>YEC GILAM — Sifat va ishonch kafolati.</p>
            </div>
          </div>

          {/* Bottom section: QR code (left) + Signature (right) + Date */}
          <div className="receipt-bottom-section">
            <div className="receipt-bottom-left">
              <div className="qr-code-container">
                <canvas ref={qrCanvasRef}></canvas>
              </div>
              <div className="print-date">
                Sana: {printDate}
              </div>
            </div>
            <div className="receipt-bottom-right">
              <div className="signature-section">
                <div className="signature-line">_____________________</div>
                <p className="signature-label">Mas'ul shaxs imzosi</p>
              </div>
              <div className="sana-text">
                Sana: {printDate}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="receipt-footer">
            <p>YEC GILAM kompaniyasiga xush kelibsiz!</p>
            <p>Bugun emas, keltirayotgan kunlarda ham biz bilan bo'ling</p>
          </div>
        </div>
      </div>
    </div>
  );
}