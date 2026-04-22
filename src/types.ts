// Product types
export interface Product {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stockQuantity: number;
  category: string;
  createdDateTime: string;
  imageUrl?: string; // optional if backend supports file uploads
}

export type ProductInput = Omit<Product, 'id' | 'createdDateTime'>;

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// User types
export interface User {
  id: number;
  createdDateTime: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  gender: string;
  phoneNumber: string;
  address: string;
  age: string;
  username: string;
  role: "ADMIN" | "CASHIER" | "CUSTODIAL";
  // Only keep these if you actually add them to the backend
  photoUrl?: string;
  resumeUrl?: string;
  barangayClearanceUrl?: string;
  active: boolean;
}

export interface UserRegistrationRequest {
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phoneNumber: string;
  gender: string;
  address: string;
  age: string;
  username: string;
  password: string;          // required
  role: string;
}

// Sale types
export interface SaleItemRequest {
  productId: number;
  quantity: number;
}

export type PaymentMethod = "CASH" | "CARD" | "GCASH";

export interface SaleRequest {
  items: SaleItemRequest[];
  discountType: "NONE" | "PWD";
  paymentMethod: PaymentMethod;
  cashierId?: number;
}

export interface SaleItemResponse {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaleResponse {
  id: number;
  items: SaleItemResponse[];
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  discountType: string;
  paymentMethod?: PaymentMethod;
  saleDate: string;     // backend renamed from createdDateTime
  cashierName: string;  // backend renamed from cashierId
  cashierActive: boolean;
  status: "COMPLETED" | "VOIDED";
}

export interface SaleCalculationRequest {
  items: SaleItemRequest[];
  discountType: "NONE" | "PWD";
}

export interface SaleCalculationResponse {
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  discountType: string;
  items: SaleItemResponse[];
}

// Auth types
export interface LoginResponse {
  id: number;
  token: string;
  username: string;
  role: "ADMIN" | "CASHIER" | "CUSTODIAL";
}

