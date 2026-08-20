const STAFF_TOKEN_KEY = "vpn-platform.staff-token";
const CUSTOMER_TOKEN_KEY = "vpn-platform.customer-token";

function storage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export const sessionTokens = {
  getStaff: () => storage()?.getItem(STAFF_TOKEN_KEY) ?? null,
  setStaff: (token: string) => storage()?.setItem(STAFF_TOKEN_KEY, token),
  clearStaff: () => storage()?.removeItem(STAFF_TOKEN_KEY),
  getCustomer: () => storage()?.getItem(CUSTOMER_TOKEN_KEY) ?? null,
  setCustomer: (token: string) => storage()?.setItem(CUSTOMER_TOKEN_KEY, token),
  clearCustomer: () => storage()?.removeItem(CUSTOMER_TOKEN_KEY),
};
