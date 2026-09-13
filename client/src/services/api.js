// =====================================================
// API URL - Same-origin (/api)
// Barcha so'rovlar bevosita yec-chek.vercel.app/api orqali ketadi.
// Eski backend domenlariga ulanish butunlay to'xtatildi.
// =====================================================
const API_URL = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

async function handleResponse(response) {
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Sessiya muddati tugagan yoki ruxsat etilmagan.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Tizim xatoligi yuz berdi.');
  }
  const json = await response.json();
  if (json && json.success !== undefined) {
    if (!json.success) {
      throw new Error(json.message || 'Xatolik yuz berdi.');
    }
    return json.data !== undefined ? json.data : json;
  }
  return json;
}

function handleFetchError(err) {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    throw new Error('Serverga ulanishda xatolik. Server ishlayotganligini tekshiring.');
  }
  throw err;
}

// Authentication
export async function logoutUser() {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function loginUser(emailOrName, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrName, email: emailOrName, password })
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMsg = 'Login yoki parol noto\'g\'ri.';
      try { 
        const errJson = JSON.parse(errorText); 
        errorMsg = errJson.message || errJson.error || errorMsg; 
      } catch {}
      throw new Error(errorMsg);
    }

    const resJson = await response.json();
    if (resJson && resJson.data && resJson.data.token) {
      return resJson.data;
    }
    return resJson;
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Serverga ulanishda xatolik. Iltimos, server holatini tekshiring.');
    }
    throw err;
  }
}

// Products
export async function getProducts() {
  try {
    const response = await fetch(`${API_URL}/products`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function createProduct(data) {
  try {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function updateProduct(id, data) {
  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function deleteProduct(id) {
  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function getCollections() {
  try {
    const response = await fetch(`${API_URL}/products/collections`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function previewBulkPrice(data) {
  try {
    const response = await fetch(`${API_URL}/products/bulk-preview`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function bulkUpdatePrice(data) {
  try {
    const response = await fetch(`${API_URL}/products/bulk-price-update`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

// Branches
export async function getBranches() {
  try {
    const response = await fetch(`${API_URL}/branches`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function createBranch(data) {
  try {
    const response = await fetch(`${API_URL}/branches`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function updateBranch(id, data) {
  try {
    const response = await fetch(`${API_URL}/branches/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function deleteBranch(id) {
  try {
    const response = await fetch(`${API_URL}/branches/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

// Orders
export async function getOrders(filters = {}) {
  try {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/orders?${params}`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function getOrderById(id) {
  try {
    const response = await fetch(`${API_URL}/orders/${id}`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function createOrder(data) {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function updateOrder(id, data) {
  try {
    const response = await fetch(`${API_URL}/orders/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function deleteOrder(id) {
  try {
    const response = await fetch(`${API_URL}/orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

// Users
export async function getUsers() {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function createUser(data) {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function updateUser(id, data) {
  try {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

export async function deleteUser(id) {
  try {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}

// Statistics
export async function getStatistics() {
  try {
    const response = await fetch(`${API_URL}/stats/dashboard`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  } catch (err) {
    handleFetchError(err);
  }
}