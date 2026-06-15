const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param {string} password 
 * @returns {string} - bcrypt hash string
 */
function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Verify a password against a stored bcrypt hash
 * @param {string} password 
 * @param {string} storedHash - bcrypt hash string
 * @returns {boolean}
 */
function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return false;
  }
  return bcrypt.compareSync(password, storedHash);
}

module.exports = {
  hashPassword,
  verifyPassword
};