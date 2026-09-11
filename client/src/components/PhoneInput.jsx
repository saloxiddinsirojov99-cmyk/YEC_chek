import { useState } from 'react';

const PREFIX = '+998';

function formatPhone(value) {
  const digits = value.replace(/\D/g, '');
  let formatted = '';
  for (let i = 0; i < digits.length && i < 9; i++) {
    if (i === 2 || i === 5 || i === 7) formatted += ' ';
    formatted += digits[i];
  }
  return formatted;
}

export default function PhoneInput({ value, onChange, required, placeholder, error }) {
  const handleChange = (e) => {
    const raw = e.target.value;
    // Remove prefix so user can type digits after +998
    let inputDigits = raw;
    if (raw.startsWith(PREFIX)) {
      inputDigits = raw.substring(PREFIX.length);
    }
    const cleaned = inputDigits.replace(/\D/g, '').substring(0, 9);
    onChange(PREFIX + ' ' + formatPhone(cleaned));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const val = value.substring(PREFIX.length).replace(/\s/g, '');
      if (val.length === 0) {
        e.preventDefault();
      }
    }
  };

  const getFullDigits = () => {
    return value.substring(PREFIX.length).replace(/\s/g, '');
  };

  const isValid = !required || getFullDigits().length === 9;

  return (
    <div className="phone-input-wrapper">
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || '+998 XX XXX XX XX'}
        style={{ paddingLeft: '0.5rem' }}
        required={required}
        className={`phone-input ${!isValid && value !== PREFIX ? 'phone-input-error' : ''}`}
      />
      {required && value !== PREFIX && getFullDigits().length > 0 && getFullDigits().length < 9 && (
        <span className="phone-input-hint">
          Raqam to'liq emas ({getFullDigits().length}/9)
        </span>
      )}
      {error && <span className="phone-input-error-text">{error}</span>}
    </div>
  );
}