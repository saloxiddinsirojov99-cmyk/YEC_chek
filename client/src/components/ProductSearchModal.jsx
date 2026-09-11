import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { getProducts } from '../services/api';
import './ProductSearchModal.css';

export default function ProductSearchModal({ products: initialProducts = [], onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [productList, setProductList] = useState(initialProducts || []);
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(!initialProducts || initialProducts.length === 0);
  const [fetchError, setFetchError] = useState('');
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Auto-fetch if products are not provided or empty
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      setLoading(true);
      getProducts()
        .then(data => {
          const prods = data || [];
          setProductList(prods);
          setFetchError('');
        })
        .catch(err => {
          console.error('Modal product fetch error:', err);
          setFetchError('Mahsulotlarni yuklab bo\'lmadi. Server ishlayotganini tekshiring.');
        })
        .finally(() => setLoading(false));
    } else {
      setProductList(initialProducts);
      setLoading(false);
    }
  }, [initialProducts]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const list = productList || [];
    const q = search.toLowerCase().trim();
    if (!q) {
      setResults(list.slice(0, 80));
      setSelectedIndex(-1);
      return;
    }

    const words = q.split(/\s+/).filter(Boolean);
    const filtered = list.filter(p => {
      if (!p) return false;
      const name = (p.name || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      const description = (p.description || '').toLowerCase();
      const textToSearch = `${name} ${code} ${description}`;

      return words.every(word => textToSearch.includes(word));
    });

    setResults(filtered.slice(0, 100));
    setSelectedIndex(-1);
  }, [search, productList]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (product) => {
    onSelect(product);
    onClose();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll('.product-item');
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        padding: '20px'
      }}
    >
      <div
        className="product-search-modal"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1000000
        }}
      >
        <div className="modal-header">
          <h3>Mahsulot qidirish</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mahsulot nomi yoki kodi bo'yicha qidirish..."
            className="search-input"
          />
          {search && (
            <button className="clear-btn" onClick={() => setSearch('')}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="results-count">
          {loading
            ? 'Mahsulotlar yuklanmoqda...'
            : search
              ? `${results.length} ta mahsulot topildi (${productList.length} tadan)`
              : `Jami ${productList.length} ta mahsulot — qidirish uchun yozing`}
        </div>

        <div className="results-list" ref={resultsRef}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#64748b', gap: '10px' }}>
              <Loader2 className="animate-spin" size={28} />
              <span>Mahsulotlar yuklanmoqda...</span>
            </div>
          ) : fetchError ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#ef4444' }}>
              <p>{fetchError}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  getProducts()
                    .then(data => { setProductList(data || []); setFetchError(''); })
                    .catch(err => setFetchError('Qayta urinishda xato: ' + err.message))
                    .finally(() => setLoading(false));
                }}
                style={{ marginTop: '10px', padding: '6px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Qayta yuklash
              </button>
            </div>
          ) : results.length === 0 && search ? (
            <div className="no-results">Mahsulot topilmadi</div>
          ) : results.length === 0 ? (
            <div className="no-results">Hozircha mahsulotlar mavjud emas</div>
          ) : (
            results.map((product, index) => {
              const designCode = product.name?.split(' ').pop() || '';
              const collection = product.name?.split(' ').slice(0, -1).join(' ') || product.name;
              return (
                <div
                  key={product.id}
                  className={`product-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSelect(product)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="product-image-placeholder">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} />
                    ) : (
                      <div className="placeholder-icon">🖼️</div>
                    )}
                  </div>
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-details">
                      <span className="product-collection">{collection}</span>
                      <span className="product-design-code">Gul kodi: {designCode}</span>
                    </div>
                    <div className="product-price">{product.price.toLocaleString()} so'm</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="modal-footer">
          <span className="hint">
            ↑↓ tanlash, Enter - tasdiqlash, Esc - yopish
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}