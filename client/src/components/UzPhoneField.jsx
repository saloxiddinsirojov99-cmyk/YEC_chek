import React, { useRef, useState } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { Phone as PhoneIcon } from '@mui/icons-material';

const PREFIX = '+998 ';
const PREFIX_LEN = 5;

/**
 * Format raw local digits (up to 9) into "XX XXX XX XX"
 */
export function formatUzbekDigits(digits) {
  const clean = (digits || '').replace(/\D/g, '').slice(0, 9);
  let res = '';
  if (clean.length > 0) res += clean.slice(0, 2);
  if (clean.length > 2) res += ' ' + clean.slice(2, 5);
  if (clean.length > 5) res += ' ' + clean.slice(5, 7);
  if (clean.length > 7) res += ' ' + clean.slice(7, 9);
  return res;
}

/**
 * Extract just the 9 local digits from any Uzbek phone number string representation
 */
export function getLocalDigits(phone) {
  if (!phone) return '';
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');
  
  if (str.startsWith('+998') || (digits.startsWith('998') && digits.length > 9)) {
    return digits.slice(3, 12);
  }
  if (digits.length === 12 && digits.startsWith('998')) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

/**
 * Clean phone number for backend storage: "+998901234567" or empty string ""
 */
export function toBackendPhone(phone) {
  if (!phone) return '';
  const local = getLocalDigits(phone);
  if (local.length === 9) {
    return `+998${local}`;
  }
  return local.length > 0 ? `+998${local}` : '';
}

/**
 * Helper to compute cursor index given count of digits before cursor
 */
export function getCursorPosForDigitCount(digitCount) {
  if (digitCount <= 0) return PREFIX_LEN;
  if (digitCount <= 2) return PREFIX_LEN + digitCount;
  if (digitCount <= 5) return PREFIX_LEN + digitCount + 1; // 1 space
  if (digitCount <= 7) return PREFIX_LEN + digitCount + 2; // 2 spaces
  return Math.min(PREFIX_LEN + 12, PREFIX_LEN + digitCount + 3); // 3 spaces (max 17)
}

/**
 * UzPhoneField - Operatorlar uchun maksimal qulay, o'chirilmaydigan +998 prefiksli telefon inputi
 */
export default function UzPhoneField({
  label = 'Telefon raqam',
  value = '',
  onChange,
  onKeyDown,
  error = false,
  helperText = '',
  required = false,
  inputRef,
  placeholder = '+998 90 123 45 67',
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);
  const internalRef = useRef(null);
  const resolvedRef = inputRef || internalRef;

  const localDigits = getLocalDigits(value);

  // Compute display value
  let displayValue = '';
  if (localDigits.length > 0) {
    displayValue = PREFIX + formatUzbekDigits(localDigits);
  } else if (isFocused || required || (value && value.trim().length > 0)) {
    displayValue = PREFIX;
  } else {
    displayValue = '';
  }

  // Ensure cursor never stays inside prefix
  const clampCursor = (input) => {
    if (!input) return;
    if (input.selectionStart < PREFIX_LEN) {
      const targetEnd = Math.max(PREFIX_LEN, input.selectionEnd ?? PREFIX_LEN);
      input.setSelectionRange(PREFIX_LEN, targetEnd);
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (!value || getLocalDigits(value).length === 0) {
      onChange(PREFIX, '');
      setTimeout(() => {
        if (resolvedRef.current) {
          resolvedRef.current.setSelectionRange(PREFIX_LEN, PREFIX_LEN);
        }
      }, 10);
    } else {
      setTimeout(() => {
        if (resolvedRef.current) {
          clampCursor(resolvedRef.current);
        }
      }, 10);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    // If optional and no digits entered, clear out display
    if (!required && localDigits.length === 0) {
      onChange('', '');
    }
  };

  const handleClick = (e) => {
    clampCursor(e.target);
  };

  const handleSelect = (e) => {
    clampCursor(e.target);
  };

  const handleKeyUp = (e) => {
    clampCursor(e.target);
  };

  const handleKeyDownInternal = (e) => {
    const input = e.target;
    const start = input.selectionStart ?? PREFIX_LEN;
    const end = input.selectionEnd ?? PREFIX_LEN;

    // Ctrl+A / Cmd+A: Select only the digits part, keeping +998 intact
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      input.setSelectionRange(PREFIX_LEN, input.value.length);
      return;
    }

    // Ctrl+X / Cmd+X: Cut only the editable digits
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      if (start < PREFIX_LEN) {
        e.preventDefault();
        const textToCut = input.value.slice(PREFIX_LEN, end);
        navigator.clipboard?.writeText?.(textToCut);
        onChange(required ? PREFIX : '', '');
        setTimeout(() => {
          input.setSelectionRange(PREFIX_LEN, PREFIX_LEN);
        }, 0);
        return;
      }
    }

    // Backspace handling
    if (e.key === 'Backspace') {
      // Trying to backspace inside prefix
      if (start <= PREFIX_LEN && end <= PREFIX_LEN) {
        e.preventDefault();
        return;
      }

      // Selection covers part of prefix and digits
      if (start < PREFIX_LEN && end > PREFIX_LEN) {
        e.preventDefault();
        onChange(required ? PREFIX : '', '');
        setTimeout(() => {
          input.setSelectionRange(PREFIX_LEN, PREFIX_LEN);
        }, 0);
        return;
      }

      // If cursor is right after a space (e.g. "+998 90 |"), backspace should delete the preceding digit
      if (start === end && start > PREFIX_LEN && input.value[start - 1] === ' ') {
        e.preventDefault();
        const digitsBefore = getLocalDigits(input.value.slice(0, start - 1));
        const allLocal = getLocalDigits(input.value);
        const updatedLocal = digitsBefore.slice(0, -1) + allLocal.slice(digitsBefore.length);
        const formatted = updatedLocal.length > 0 ? PREFIX + formatUzbekDigits(updatedLocal) : (required ? PREFIX : '');
        onChange(formatted, updatedLocal);
        const newPos = getCursorPosForDigitCount(Math.max(0, digitsBefore.length - 1));
        setTimeout(() => {
          input.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }
    }

    // Delete handling: prevent deleting into prefix
    if (e.key === 'Delete' && start < PREFIX_LEN) {
      e.preventDefault();
      input.setSelectionRange(PREFIX_LEN, PREFIX_LEN);
      return;
    }

    // Prevent cursor navigation left of prefix
    if (e.key === 'ArrowLeft' && start <= PREFIX_LEN && end <= PREFIX_LEN) {
      e.preventDefault();
      return;
    }

    // Home key jumps to start of editable digits (index 5)
    if (e.key === 'Home') {
      e.preventDefault();
      input.setSelectionRange(PREFIX_LEN, PREFIX_LEN);
      return;
    }

    // Pass event to parent handler (e.g. for Enter key navigation)
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    const input = e.target;
    const cursorPos = input.selectionStart ?? raw.length;

    // Count how many local digits were before current cursor
    const rawBeforeCursor = raw.slice(0, cursorPos);
    const digitsBeforeCursor = getLocalDigits(rawBeforeCursor).length;

    const cleaned = getLocalDigits(raw);
    const formatted = cleaned.length > 0 ? PREFIX + formatUzbekDigits(cleaned) : (required || isFocused ? PREFIX : '');

    onChange(formatted, cleaned);

    // Calculate new cursor position
    const newPos = getCursorPosForDigitCount(digitsBeforeCursor);
    setTimeout(() => {
      if (resolvedRef.current) {
        resolvedRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <TextField
      {...rest}
      inputRef={resolvedRef}
      label={label}
      value={displayValue}
      placeholder={placeholder}
      onChange={handleChange}
      onKeyDown={handleKeyDownInternal}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onSelect={handleSelect}
      onKeyUp={handleKeyUp}
      error={error}
      helperText={helperText}
      required={required}
      size="small"
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <PhoneIcon sx={{ color: error ? 'error.main' : 'text.secondary', fontSize: 18 }} />
          </InputAdornment>
        ),
      }}
    />
  );
}
