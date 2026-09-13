import React, { useRef } from 'react';
import { TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import { CalendarToday } from '@mui/icons-material';

/**
 * Format raw digits into DD/MM/YYYY
 */
export function formatDigitsToDate(digits) {
  const clean = (digits || '').replace(/\D/g, '').slice(0, 8);
  let res = '';
  if (clean.length > 0) res += clean.slice(0, 2);
  if (clean.length > 2) res += '/' + clean.slice(2, 4);
  if (clean.length > 4) res += '/' + clean.slice(4, 8);
  return res;
}

/**
 * Validate DD/MM/YYYY strictly checking real calendar days and leap years
 */
export function isValidDateDDMMYYYY(str) {
  if (!str || typeof str !== 'string') return false;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return false;
  if (parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) return false;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD for backend storage
 */
export function toBackendDate(str) {
  if (!str) return '';
  const trimmed = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

/**
 * Convert YYYY-MM-DD or Date to DD/MM/YYYY for UI display
 */
export function toDisplayDate(isoOrYmd) {
  if (!isoOrYmd) return '';
  const str = String(isoOrYmd).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [year, month, day] = str.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
}

/**
 * Get today's date in DD/MM/YYYY format
 */
export function getTodayDisplayDate() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function UzDateField({
  label = 'Yetkazish kuni',
  value = '',
  onChange,
  onKeyDown,
  error = false,
  helperText = '',
  required = false,
  inputRef,
  placeholder = 'KK/OO/YYYY (Mas: 13/09/2026)',
  ...rest
}) {
  const internalRef = useRef(null);
  const resolvedRef = inputRef || internalRef;
  const hiddenPickerRef = useRef(null);

  const handleChange = (e) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 8);
    const formatted = formatDigitsToDate(digitsOnly);
    onChange(formatted);
  };

  const handleKeyDownInternal = (e) => {
    const input = e.target;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    // Backspace handling when cursor is immediately after '/'
    if (e.key === 'Backspace' && start === end && start > 0) {
      if (input.value[start - 1] === '/') {
        e.preventDefault();
        const digits = input.value.replace(/\D/g, '');
        // Delete the digit before the slash
        // Position 3 is after first '/', position 6 is after second '/'
        const digitIndexToDelete = start === 3 ? 1 : (start === 6 ? 3 : digits.length - 1);
        const updatedDigits = digits.slice(0, digitIndexToDelete) + digits.slice(digitIndexToDelete + 1);
        const formatted = formatDigitsToDate(updatedDigits);
        onChange(formatted);
        setTimeout(() => {
          const newPos = Math.max(0, start - 2);
          input.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handlePickerChange = (e) => {
    const ymd = e.target.value; // "YYYY-MM-DD"
    if (ymd) {
      const display = toDisplayDate(ymd);
      onChange(display);
      if (resolvedRef.current) {
        resolvedRef.current.focus();
      }
    }
  };

  const openNativePicker = () => {
    if (hiddenPickerRef.current) {
      try {
        if (hiddenPickerRef.current.showPicker) {
          hiddenPickerRef.current.showPicker();
        } else {
          hiddenPickerRef.current.focus();
          hiddenPickerRef.current.click();
        }
      } catch (err) {
        hiddenPickerRef.current.focus();
        hiddenPickerRef.current.click();
      }
    }
  };

  const currentYmd = toBackendDate(value);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <TextField
        {...rest}
        inputRef={resolvedRef}
        label={label}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        error={error}
        helperText={helperText}
        required={required}
        size="small"
        fullWidth
        InputLabelProps={{ shrink: true }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Kalendardan tanlash">
                <IconButton
                  edge="end"
                  size="small"
                  onClick={openNativePicker}
                  tabIndex={-1}
                  sx={{ color: 'primary.main' }}
                >
                  <CalendarToday sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
      {/* Hidden native date input for the calendar popup */}
      <input
        ref={hiddenPickerRef}
        type="date"
        value={/^\d{4}-\d{2}-\d{2}$/.test(currentYmd) ? currentYmd : ''}
        onChange={handlePickerChange}
        tabIndex={-1}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          border: 'none',
          margin: 0,
          padding: 0
        }}
      />
    </div>
  );
}
