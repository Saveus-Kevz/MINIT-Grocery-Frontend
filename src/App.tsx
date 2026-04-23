import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Package,
  X,
  FileText,
  Barcode,
  DollarSign,
  Layers,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Home,
  ShoppingBag,
  LogOut,
  Sparkles,
  Users as UsersIcon,
  Clock,
  CheckCircle,
  UserCircle,
  ChevronRight,
  Upload,
  CreditCard,
  Minus,
  Plus as PlusIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatCurrency, formatDate } from "./lib/utils";
import { Product, ProductInput, User, SaleItemRequest, SaleCalculationResponse, SaleResponse, LoginResponse } from "./types";
import { generateProductImage } from "./services/geminiService";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { Lock } from "lucide-react";

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:8086/api'  // For local dev outside Docker
    : '/api';  // For Docker (uses the proxy)

// Helper to get full image URL
const BACKEND_URL = "http://localhost:8086";

const getImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('/uploads')) return `${BACKEND_URL}${imageUrl}`;
  return `${BACKEND_URL}/uploads/${imageUrl}`;
};


export function App() {
  const [currentUser, setCurrentUser] = useState<LoginResponse | null>(() => {
    const saved = localStorage.getItem("minit_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loginData, setLoginData] = useState({username: "", password: ""});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<"home" | "products" | "users" | "checkout" | "reports">(() => {
    const sessionId = sessionStorage.getItem("minit_session_id");
    if (!sessionId) {
      // New browser session – generate a new ID and start with default
      sessionStorage.setItem("minit_session_id", Date.now().toString());
      return "checkout"; // default before login
    }
    const savedTab = sessionStorage.getItem("minit_active_tab");
    return (savedTab as any) || "checkout";
  });

  useEffect(() => {
    sessionStorage.setItem("minit_active_tab", activeTab);
  }, [activeTab]);

  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nameSearchQuery, setNameSearchQuery] = useState("");
  const [barcodeSearchQuery, setBarcodeSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newResumeFile, setNewResumeFile] = useState<File | null>(null);
  const [newBarangayFile, setNewBarangayFile] = useState<File | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);



  const [editUserForm, setEditUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    age: "",
    role: "CASHIER" as "ADMIN" | "CASHIER" | "CUSTODIAL",
    active: true,
    photo: null as string | null,          // new
    resume: null as string | null,         // new
    barangayClearance: null as string | null, // new
    gender: "MALE" as string
  });

  const formatGender = (gender?: string) => {
    if (!gender) return "Not specified";
    switch (gender) {
      case "MALE":
        return "Male";
      case "FEMALE":
        return "Female";
      case "OTHER":
        return "Other";
      default:
        return gender;
    }
  };

  const [emailExists, setEmailExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailCheckMessage, setEmailCheckMessage] = useState("");

  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [shakeModal, setShakeModal] = useState(false);

  const [resumeFileName, setResumeFileName] = useState("");
  const [barangayFileName, setBarangayFileName] = useState("");

  const openDocumentPreview = (base64DataUrl: string) => {
    if (!base64DataUrl) return;
    try {
      // Convert base64 data URL to blob and open in new tab
      const fetchBlob = async () => {
        const res = await fetch(base64DataUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      };
      fetchBlob();
    } catch (err) {
      console.error("Failed to open document", err);
    }
  };

  const [nameExists, setNameExists] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameCheckMessage, setNameCheckMessage] = useState("");

  const checkNameExists = useCallback(async (name: string) => {
    if (editingProduct && name === editingProduct.name) {
      setNameExists(false);
      setNameCheckMessage("");
      return;
    }
    if (!name || name.trim() === "") {
      setNameExists(false);
      return;
    }
    setIsCheckingName(true);
    try {
      const res = await fetch(`${API_BASE}/products/search?name=${encodeURIComponent(name)}`, {
        headers: {Authorization: `Bearer ${currentUser?.token}`}
      });
      if (res.ok) {
        const products = await res.json();
        if (products.length > 0) {
          setNameExists(true);
          setNameCheckMessage(`Product name already exists: ${products[0].name}`);
        } else {
          setNameExists(false);
          setNameCheckMessage("");
        }
      } else {
        setNameExists(false);
      }
    } catch (err) {
      console.error("Name check failed", err);
      setNameExists(false);
    } finally {
      setIsCheckingName(false);
    }
  }, [currentUser, editingProduct]);

  const checkEmailExists = useCallback(async (email: string) => {
    // Skip if no email or same as existing user's email during edit
    if (!email || email.trim() === "") {
      setEmailExists(false);
      setEmailCheckMessage("");
      return;
    }

    // If editing a user and email hasn't changed, skip check
    if (editingUser && email === editingUser.email) {
      setEmailExists(false);
      setEmailCheckMessage("");
      return;
    }

    setIsCheckingEmail(true);
    try {
      // Fetch all users and check if email exists
      const res = await fetch(`${API_BASE}/users`, {
        headers: {Authorization: `Bearer ${currentUser?.token}`}
      });
      if (res.ok) {
        const users = await res.json();
        const existingUser = users.find((u: User) => u.email === email);
        if (existingUser) {
          setEmailExists(true);
          setEmailCheckMessage(`Email already exists for user: ${existingUser.fullName}`);
        } else {
          setEmailExists(false);
          setEmailCheckMessage("");
        }
      } else {
        setEmailExists(false);
      }
    } catch (err) {
      console.error("Email check failed", err);
      setEmailExists(false);
    } finally {
      setIsCheckingEmail(false);
    }
  }, [currentUser, editingUser]);

  const [barcodeExists, setBarcodeExists] = useState(false);
  const [isCheckingBarcode, setIsCheckingBarcode] = useState(false);
  const [barcodeCheckMessage, setBarcodeCheckMessage] = useState("");
  const [formData, setFormData] = useState<ProductInput>({
    name: "",
    barcode: "",
    price: 0,
    stockQuantity: 0,
    category: "Household Essentials",
    imageUrl: ""
  });

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userFormData, setUserFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    gender: "MALE",
    role: "CASHIER" as "CASHIER" | "CUSTODIAL" | "ADMIN",
    username: "",
    password: "",
    phoneNumber: "",
    address: "",
    age: "",
    photoFile: null as File | null,
    resumeFile: null as File | null,
    barangayFile: null as File | null,
  });
  const [userSearch, setUserSearch] = useState({id: "", role: ""});
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Checkout State
  const [cart, setCart] = useState<SaleItemRequest[]>([]);
  const [discountType, setDiscountType] = useState<"NONE" | "PWD">("NONE");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "GCASH">("CASH");
  const [checkoutBarcode, setCheckoutBarcode] = useState("");
  const [calculation, setCalculation] = useState<SaleCalculationResponse | null>(null);
  const [lastSale, setLastSale] = useState<SaleResponse | null>(null);
  const [isCompletingSale, setIsCompletingSale] = useState(false);

  const [voidSaleId, setVoidSaleId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // Reports State
  const [reportSales, setReportSales] = useState<SaleResponse[]>([]);
  const [reportFilters, setReportFilters] = useState({
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    cashierId: ""
  });
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [isFetchingReports, setIsFetchingReports] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(loginData)
      });
      if (!res.ok) throw new Error("Invalid username or password");
      const data = await res.json();
      const userWithId = {
        token: data.token,
        username: data.username,
        role: data.role,
        id: data.id
      };
      setCurrentUser(userWithId);
      localStorage.setItem("minit_user", JSON.stringify(userWithId));
      setActiveTab(userWithId.role === "CASHIER" ? "checkout" : "home");
      setSuccess("Login successful!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const voidSale = async (saleId: number, reason: string) => {
    try {
      const res = await fetch(`${API_BASE}/sales/${saleId}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({reason})
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      setSuccess(text);
      fetchReports(); // refresh the reports list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void sale");
    }
  };

  const openVoidModal = (saleId: number) => {
    setVoidSaleId(saleId);
    setVoidReason("");
    setCustomReason("");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("minit_user");
    sessionStorage.removeItem("minit_active_tab");
    sessionStorage.removeItem("minit_session_id");
    setLoginData({username: "", password: ""});
  };
  const fetchProducts = useCallback(async (page: number = 0, category: string = "All", nameSearch: string = "", barcodeSearch: string = "") => {
    if (!currentUser) {
      console.warn("No current user, cannot fetch products");
      return;
    }
    if (!currentUser.token) {
      console.error("Missing token – user is not authenticated");
      setError("Session expired. Please log in again.");
      return;
    }
    setLoading(true);
    try {
      let url = `${API_BASE}/products`;
      let isBarcodeSearch = false;
      let isNameSearch = false;

      if (barcodeSearch) {
        url = `${API_BASE}/products/barcode/${encodeURIComponent(barcodeSearch)}`;
        isBarcodeSearch = true;
      } else if (nameSearch) {
        url = `${API_BASE}/products/search?name=${encodeURIComponent(nameSearch)}`;
        isNameSearch = true;
      } else if (category !== "All") {
        url = `${API_BASE}/products/category/${encodeURIComponent(category)}?page=${page}`;
      } else {
        url = `${API_BASE}/products?page=${page}`;
      }

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${currentUser.token}`
        }
      });

      if (isBarcodeSearch && res.status === 404) {
        setProducts([]);
        setTotalPages(0);
        setCurrentPage(0);
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();

      if (isBarcodeSearch) {
        setProducts([data]);
        setTotalPages(1);
        setCurrentPage(0);
      } else if (isNameSearch) {
        setProducts(data);
        setTotalPages(1);
        setCurrentPage(0);
      } else {
        setProducts(data.content);
        setTotalPages(data.totalPages);
        setCurrentPage(data.number);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!currentUser) return;
      try {
        const userRes = await fetch(`${API_BASE}/users`, {
          headers: {"Authorization": `Bearer ${currentUser.token}`}
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUsers(userData);
        }
      } catch (err) {
        console.error("Failed to fetch initial data", err);
      }
    };
    fetchInitialData();
  }, [currentUser]);

  useEffect(() => {
    fetchProducts(currentPage, selectedCategory, nameSearchQuery, barcodeSearchQuery);
  }, [fetchProducts, currentPage, selectedCategory, nameSearchQuery, barcodeSearchQuery]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    if (formData.name) {
      const name = formData.name.toLowerCase();
      let autoCategory = "";

      if (name.match(/milks?|eggs?|cheese|yogurts?|butters?|creams?/)) autoCategory = "Dairy & Eggs";
      else if (name.match(/rices?|grains?|pastas?|spaghettis?|pennes?|macaronis?|oats?|cereals?|cornflakes?/)) autoCategory = "Grains & Pasta";
      else if (name.match(/breads?|bagels?|muffins?|croissants?|wraps?|tortillas?|pitas?/)) autoCategory = "Bakery & Bread";
      else if (name.match(/canneds?|soups?|sauces?|oils?|vinegars?|spices?|salts?|sugars?|flours?|spam|tuna|sardines|beans|corned|pickles|jam|honey|preserves|tin|can/)) autoCategory = "Pantry & Canned Goods";
      else if (name.match(/chips?|cookies?|candies|chocolates?|snacks?|sweets?|biscuits?/)) autoCategory = "Snacks & Sweets";
      else if (name.match(/waters?|sodas?|juices?|teas?|coffees?|drinks?|beverages?/)) autoCategory = "Beverages";
      else if (name.match(/soaps?|detergents?|cleaners?|papers?|tissues?|trashs?|batteries?/)) autoCategory = "Household Essentials";

      if (autoCategory && autoCategory !== formData.category) {
        setFormData(prev => ({...prev, category: autoCategory}));
      }
    }
  }, [formData.name]);

  useEffect(() => {
    return () => {
      if (newPhotoFile) {
        URL.revokeObjectURL(URL.createObjectURL(newPhotoFile));
      }
    };
  }, [newPhotoFile]);

  useEffect(() => {
    return () => {
      if (editUserForm.photo && editUserForm.photo.startsWith('blob:')) {
        URL.revokeObjectURL(editUserForm.photo);
      }
    };
  }, [editUserForm.photo]);

  const checkBarcodeExists = useCallback(async (barcode: string) => {
    // Skip check when editing an existing product
    if (editingProduct) {
      setBarcodeExists(false);
      setBarcodeCheckMessage("");
      return;
    }

    if (!barcode || barcode.trim() === "") {
      setBarcodeExists(false);
      setBarcodeCheckMessage("");
      return;
    }
    if (!currentUser?.token) {
      setBarcodeExists(false);
      setBarcodeCheckMessage("");
      return;
    }
    setIsCheckingBarcode(true);
    try {
      const res = await fetch(`${API_BASE}/products/barcode/${encodeURIComponent(barcode)}`, {
        headers: {"Authorization": `Bearer ${currentUser.token}`}
      });
      if (res.ok) {
        const product = await res.json();
        setBarcodeExists(true);
        setBarcodeCheckMessage(`Barcode already exists for product: ${product.name}`);
      } else if (res.status === 404) {
        setBarcodeExists(false);
        setBarcodeCheckMessage("");
      } else {
        setBarcodeExists(false);
        setBarcodeCheckMessage("");
      }
    } catch (err) {
      console.error("Barcode check failed", err);
      setBarcodeExists(false);
      setBarcodeCheckMessage("");
    } finally {
      setIsCheckingBarcode(false);
    }
  }, [currentUser, editingProduct]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setModalError(null);

    try {
      // STEP 1: Create product WITHOUT image first
      const productPayload = {
        name: formData.name,
        barcode: formData.barcode,
        price: formData.price,
        stockQuantity: formData.stockQuantity,
        category: formData.category,
      };

      const createRes = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(productPayload)
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        throw new Error(errorText || `Server responded with ${createRes.status}`);
      }

      const newProduct = await createRes.json();
      console.log("New product created:", newProduct);

      // STEP 2: Handle AI-generated image URL (if exists)
      if (formData.imageUrl && formData.imageUrl.startsWith('/uploads')) {
        const updateRes = await fetch(`${API_BASE}/products/${newProduct.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({imageUrl: formData.imageUrl})
        });

        if (updateRes.ok) {
          console.log("AI image URL saved to product");
        } else {
          console.warn("Failed to save AI image URL");
        }
      }
      // STEP 3: Handle manual file upload
      else if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append("file", imageFile);

        const imageRes = await fetch(`${API_BASE}/products/${newProduct.id}/image`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${currentUser.token}`
          },
          body: imageFormData
        });

        if (!imageRes.ok) {
          console.warn("Product created but image upload failed");
        }
      }

      setSuccess("Product added successfully!");
      setIsAdding(false);
      setFormData({
        name: "",
        barcode: "",
        price: 0,
        stockQuantity: 0,
        category: "Household Essentials",
        imageUrl: ""
      });
      setImageFile(null);

      // Refresh the product list
      await fetchProducts(currentPage, selectedCategory, nameSearchQuery, barcodeSearchQuery);

    } catch (err) {
      console.error(err);
      setModalError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (barcode: string, quantity: number) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/products/restock?barcode=${encodeURIComponent(barcode)}&quantity=${quantity}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${currentUser.token}`
        }
      });
      if (!res.ok) throw new Error("Failed to restock product");
      setSuccess("Product restocked successfully");
      fetchProducts(currentPage, selectedCategory, nameSearchQuery, barcodeSearchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restock product");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setLoading(true);

    try {
      const dataToUpdate: any = {
        name: formData.name,
        barcode: formData.barcode,
        price: formData.price,
        stockQuantity: formData.stockQuantity,
        category: formData.category,
      };

      // CRITICAL: Handle image removal
      // If user clicked "Remove Image", formData.imageUrl will be ""
      if (formData.imageUrl === "") {
        dataToUpdate.imageUrl = "";  // Send empty string to trigger deletion
        console.log("Image removal requested");
      }
      // Handle new AI-generated image
      else if (formData.imageUrl && formData.imageUrl.startsWith('/uploads')) {
        dataToUpdate.imageUrl = formData.imageUrl;
        console.log("Updating with new image URL:", formData.imageUrl);
      }

      const updateRes = await fetch(`${API_BASE}/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(dataToUpdate),
      });

      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        throw new Error(errorText || "Failed to update product data");
      }

      // Handle manual file upload (takes precedence)
      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append("file", imageFile);

        const imgRes = await fetch(`${API_BASE}/products/${editingProduct.id}/image`, {
          method: "POST",
          headers: {"Authorization": `Bearer ${currentUser.token}`},
          body: imageFormData,
        });

        if (imgRes.ok) {
          const imageUrl = await imgRes.text();
          console.log("Manual upload returned:", imageUrl);
          setSuccess("Product updated successfully with new image!");
        } else {
          setSuccess("Product updated successfully!");
        }
      } else if (dataToUpdate.imageUrl === "") {
        setSuccess("Product updated! Image has been removed.");
      } else if (dataToUpdate.imageUrl) {
        setSuccess("Product updated successfully with new image!");
      } else {
        setSuccess("Product updated successfully!");
      }

      setEditingProduct(null);
      setIsAdding(false);
      setFormData({name: "", barcode: "", price: 0, stockQuantity: 0, category: "Household Essentials", imageUrl: ""});
      setImageFile(null);

      await fetchProducts(currentPage, selectedCategory, nameSearchQuery, barcodeSearchQuery);

    } catch (err) {
      console.error("Update error:", err);
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || !currentUser) return;
    setLoading(true);
    setDeleteModalError(null);

    try {
      const res = await fetch(`${API_BASE}/products/${productToDelete}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${currentUser.token}`
        }
      });

      if (!res.ok) {
        // Read the response body ONCE as text
        const errorText = await res.text();

        // Check if it's the foreign key constraint error
        if (errorText.includes("sales records") || errorText.includes("foreign key")) {
          setDeleteModalError("❌ Cannot delete product with existing sales records.");
        } else {
          setDeleteModalError(errorText || "Failed to delete product");
        }
        setShakeModal(true);
        setTimeout(() => setShakeModal(false), 500);
        return;
      }

      setSuccess("Product deleted successfully");
      setProductToDelete(null);
      setDeleteModalError(null);
      fetchProducts(currentPage, selectedCategory, nameSearchQuery, barcodeSearchQuery);

    } catch (err) {
      setDeleteModalError(err instanceof Error ? err.message : "Failed to delete product");
      setShakeModal(true);
      setTimeout(() => setShakeModal(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    if (!currentUser) return;
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create user without files
      const payload = {
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        email: userFormData.email,
        gender: userFormData.gender,
        phoneNumber: userFormData.phoneNumber,
        address: userFormData.address,
        age: userFormData.age,
        role: userFormData.role,
        username: userFormData.username,
        password: userFormData.password,
        // No file fields
      };

      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to register user");

      const newUser = await res.json();
      const newUserId = newUser.id;

      // 2. Upload files using the original File objects
      const uploadFile = async (file: File | null, endpoint: string) => {
        if (!file) return null;
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch(`${API_BASE}/users/${newUserId}/${endpoint}`, {
          method: "POST",
          headers: {"Authorization": `Bearer ${currentUser.token}`},
          body: formData,
        });
        if (!uploadRes.ok) throw new Error(`Failed to upload ${endpoint}`);
        return await uploadRes.text(); // returns the file URL
      };

      await uploadFile(userFormData.photoFile, "photo");
      await uploadFile(userFormData.resumeFile, "resume");
      await uploadFile(userFormData.barangayFile, "barangay");

      // 3. Refresh user list
      const userRes = await fetch(`${API_BASE}/users`, {
        headers: {"Authorization": `Bearer ${currentUser.token}`}
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }

      setIsAddingUser(false);
      setUserFormData({
        firstName: "",
        lastName: "",
        email: "",
        gender: "MALE",
        phoneNumber: "",
        address: "",
        age: "",
        role: "CASHIER",
        username: "",
        password: "",
        photoFile: null,
        resumeFile: null,
        barangayFile: null,
      });
      setSuccess(`User registered! Credentials sent to ${newUser.email}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register user");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
        headers: {"Authorization": `Bearer ${currentUser.token}`}
      });
      const responseText = await res.text();
      if (!res.ok) throw new Error(responseText);

      setSuccess(responseText); // Show the backend message

      // Refetch users to get the updated list (active/inactive status)
      const userRes = await fetch(`${API_BASE}/users`, {
        headers: {"Authorization": `Bearer ${currentUser.token}`}
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setUserToDelete(null);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      const payload: any = {
        firstName: editUserForm.firstName,
        lastName: editUserForm.lastName,
        email: editUserForm.email,
        phoneNumber: editUserForm.phoneNumber,
        address: editUserForm.address,
        age: editUserForm.age,
        role: editUserForm.role,
        active: editUserForm.active,
        gender: editUserForm.gender,
        // Photo: only send if it's a new base64 image
        ...(editUserForm.photo && !editUserForm.photo.startsWith('/uploads') && {photoUrl: editUserForm.photo}),
      };

      // If resume is explicitly set to empty string, send it to trigger deletion
      if (editUserForm.resume === "") {
        payload.resumeUrl = "";
      }
      // If barangay is explicitly set to empty string, send it to trigger deletion
      if (editUserForm.barangayClearance === "") {
        payload.barangayClearanceUrl = "";
      }

      const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to update user");

      // Safely parse JSON – some responses might be empty (e.g., after deletion)
      let updatedUser = null;
      try {
        updatedUser = await res.json();
      } catch (jsonError) {
        // Response body is not valid JSON (maybe empty). That's fine – update succeeded.
        console.log("Update succeeded, but no JSON returned.");
      }

      // Update users list only if we received a valid user object
      if (updatedUser && updatedUser.id) {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      }

      const userRes = await fetch(`${API_BASE}/users`, {
        headers: {"Authorization": `Bearer ${currentUser.token}`}
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }

      setIsEditingUser(false);
      setSuccess("User updated successfully");



    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'resume' | 'barangayClearance') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'photo') {
          setUserFormData(prev => ({...prev, photo: reader.result as string}));
        } else if (field === 'resume') {
          setUserFormData(prev => ({...prev, resume: reader.result as string}));
        } else if (field === 'barangayClearance') {
          setUserFormData(prev => ({...prev, barangayClearance: reader.result as string}));
        }
      };
      reader.readAsDataURL(file);
    }
  };


  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({...prev, imageUrl: reader.result as string}));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!formData.name) {
      setError("Please enter a product name first");
      return;
    }

    setIsGeneratingImage(true);
    setError(null);

    try {
      console.log("=== AI GENERATE DEBUG ===");
      console.log("Product name:", formData.name);
      console.log("Mode:", editingProduct ? "EDIT" : "ADD");

      const imageUrl = await generateProductImage(formData.name);
      console.log("Generated image URL:", imageUrl);

      // ✅ FIXED: Accept BOTH http URLs AND local /uploads/ paths
      if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('/uploads'))) {
        setFormData(prev => ({...prev, imageUrl}));
        setImageFile(null);
        console.log("Updated formData.imageUrl to:", imageUrl);
        setSuccess("Image generated successfully! Click Save Changes to apply it.");
      } else {
        throw new Error("Invalid image URL returned");
      }
    } catch (err) {
      console.error("AI generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate image. Please try again or upload manually.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const calculateTotals = useCallback(async (currentCart: SaleItemRequest[], currentDiscount: "NONE" | "PWD") => {
    if (currentCart.length === 0 || !currentUser) {
      setCalculation(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/sales/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({items: currentCart, discountType: currentDiscount})
      });
      if (res.ok) {
        const data = await res.json();
        setCalculation(data);
      }
    } catch (err) {
      console.error("Calculation failed", err);
    }
  }, [currentUser]);

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBarcode) return;

    try {
      const res = await fetch(`${API_BASE}/products/barcode/${encodeURIComponent(checkoutBarcode)}`, {
        headers: {"Authorization": `Bearer ${currentUser.token}`}
      });
      if (!res.ok) {
        setError("Product not found");
        return;
      }
      const product = await res.json();

      setCart(prev => {
        const existing = prev.find(item => item.productId === product.id);
        let newCart;
        if (existing) {
          newCart = prev.map(item =>
              item.productId === product.id ? {...item, quantity: item.quantity + 1} : item
          );
        } else {
          newCart = [...prev, {productId: product.id, quantity: 1}];
        }
        calculateTotals(newCart, discountType);
        return newCart;
      });
      setCheckoutBarcode("");
      setLastSale(null);
    } catch (err) {
      setError("Failed to find product");
    }
  };

  const updateCartItemQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => {
      const newCart = prev.map(item =>
          item.productId === productId ? {...item, quantity} : item
      );
      calculateTotals(newCart, discountType);
      return newCart;
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const newCart = prev.filter(item => item.productId !== productId);
      calculateTotals(newCart, discountType);
      return newCart;
    });
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0 || !currentUser) return;
    setIsCompletingSale(true);
    try {
      const res = await fetch(`${API_BASE}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          items: cart,
          discountType,
          paymentMethod,
          cashierId: currentUser.id
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to complete sale");
      }
      const sale = await res.json();
      setLastSale(sale);
      setCart([]);
      setCalculation(null);
      setSuccess(`Sale completed! Sale ID: ${sale.id}. Total: ${formatCurrency(sale.totalAmount)}`);
      fetchProducts(currentPage, selectedCategory, nameSearchQuery, barcodeSearchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete sale");
    } finally {
      setIsCompletingSale(false);
    }
  };

  const fetchReports = useCallback(async () => {
    if (!currentUser) return;
    setIsFetchingReports(true);
    try {
      const {from, to, cashierId} = reportFilters;
      let url = `${API_BASE}/sales?from=${from}&to=${to}`;
      if (cashierId) {
        url = `${API_BASE}/sales/cashier?cashierId=${cashierId}&from=${from}&to=${to}`;
      }

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${currentUser.token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReportSales(data);
      }
    } catch (err) {
      setError("Failed to fetch reports");
    } finally {
      setIsFetchingReports(false);
    }
  }, [reportFilters, currentUser]);

  useEffect(() => {
    if (activeTab === "reports") {
      fetchReports();
    }
  }, [activeTab, fetchReports]);


  if (!currentUser) {
    return (
        <div className="min-h-screen py-10 px-10 flex items-center justify-center bg-[#F2EDFF]/30">
          <motion.div
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-12 space-y-10"
          >
            <div className="text-center space-y-2">
              <div
                  className="w-20 h-20 bg-[#6C35D4] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#6C35D4]/20">
                <ShoppingBag className="w-10 h-10 text-white"/>
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Minit</h1>
              <p className="text-gray-400 font-medium">Mini-Mart Management System</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: "auto"}}
                        exit={{opacity: 0, height: 0}}
                        className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3"
                    >
                      <AlertCircle className="w-5 h-5"/>
                      {error}
                    </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Username</label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300"/>
                    <input
                        required
                        type="text"
                        className="w-full bg-[#F2F2F2] border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-[#6C35D4]/20 transition-all font-bold text-sm"
                        placeholder="Enter your username"
                        value={loginData.username}
                        onChange={(e) => setLoginData(prev => ({...prev, username: e.target.value}))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300"/>
                    <input
                        required
                        type="password"
                        className="w-full bg-[#F2F2F2] border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-[#6C35D4]/20 transition-all font-bold text-sm"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                    />
                  </div>
                </div>
              </div>

              <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-[#6C35D4] text-white py-5 rounded-2xl font-bold text-lg hover:bg-[#4B2491] transition-all shadow-xl shadow-[#6C35D4]/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isLoggingIn ? (
                    <Loader2 className="w-6 h-6 animate-spin"/>
                ) : (
                    <>
                      Sign In
                      <ChevronRight className="w-5 h-5"/>
                    </>
                )}
              </button>
            </form>

            <div className="text-center">
              <p className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">
                Authorized Personnel Only
              </p>
            </div>
          </motion.div>
        </div>
    );
  }

  return (
      <div className="min-h-screen py-10 px-10 flex items-center justify-center overflow-hidden">
        <div
            className="w-full max-w-[1400px] h-[850px] bg-white rounded-[3rem] shadow-2xl flex overflow-hidden relative">

          {/* Sidebar */}
          <aside className="w-[280px] bg-[#6C35D4] flex flex-col p-8 text-white">
            <div className="mb-12">
              <h1 className="text-2xl font-bold tracking-tight">Minit</h1>
            </div>

            <nav className="flex-1 space-y-2">
              {currentUser.role === "ADMIN" && (
                  <>
                    <NavItem
                        icon={<Home className="w-5 h-5"/>}
                        label="Home"
                        active={activeTab === "home"}
                        onClick={() => setActiveTab("home")}
                    />
                    <NavItem
                        icon={<ShoppingBag className="w-5 h-5"/>}
                        label="Products"
                        active={activeTab === "products"}
                        onClick={() => setActiveTab("products")}
                    />
                  </>
              )}
              <NavItem
                  icon={<CreditCard className="w-5 h-5"/>}
                  label="Checkout"
                  active={activeTab === "checkout"}
                  onClick={() => setActiveTab("checkout")}
              />
              {currentUser.role === "ADMIN" && (
                  <>
                    <NavItem
                        icon={<Layers className="w-5 h-5"/>}
                        label="Reports"
                        active={activeTab === "reports"}
                        onClick={() => setActiveTab("reports")}
                    />
                    <NavItem
                        icon={<UsersIcon className="w-5 h-5"/>}
                        label="Users"
                        active={activeTab === "users"}
                        onClick={() => setActiveTab("users")}
                    />
                  </>
              )}
            </nav>

            <div className="space-y-4 pt-8 border-t border-white/10">
              <div className="px-4 py-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-white/60"/>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">{currentUser.username}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{currentUser.role}</p>
                </div>
              </div>
              <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="flex items-center gap-3 px-4 py-2 w-full text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <Lock className="w-5 h-5" />
                <span className="font-medium text-sm">Change Password</span>
              </button>
              <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 w-full text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5"/>
                <span className="font-medium text-sm">Log out</span>
              </button>

            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Header */}
            <header className="px-10 py-8 flex items-center justify-end">
              {activeTab === "products" && (
                  <button
                      onClick={() => {
                        setIsAdding(true);
                        setEditingProduct(null);
                        setFormData({
                          name: "",
                          barcode: "",
                          price: 0,
                          stockQuantity: 0,
                          category: "Household Essentials",
                          imageUrl: ""
                        });
                        setModalError(null);
                        setBarcodeExists(false);
                        setBarcodeCheckMessage("");
                        setImageFile(null);
                      }}
                      className="bg-[#6C35D4] text-white px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-[#4B2491] transition-all"
                  >
                    <Plus className="w-4 h-4"/>
                    Add Product
                  </button>
              )}
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 px-10 pb-10 overflow-y-auto space-y-8">

              {/* Notifications */}
              <AnimatePresence>
                {(error || success) && (
                    <motion.div
                        initial={{opacity: 0, y: -10}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -10}}
                        className={cn(
                            "p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border",
                            error ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
                        )}
                    >
                      {error ? <AlertCircle className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
                      {error || success}
                      <button onClick={() => {
                        setError(null);
                        setSuccess(null);
                      }} className="ml-auto">
                        <X className="w-4 h-4"/>
                      </button>
                    </motion.div>
                )}
              </AnimatePresence>

              {activeTab === "checkout" && (
                  <div className="grid grid-cols-3 gap-8 h-full">
                    {/* Left: Cart */}
                    <div className="col-span-2 flex flex-col gap-6 overflow-hidden">
                      <div
                          className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-sm flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <ShoppingBag className="w-6 h-6 text-[#6C35D4]"/>
                            Current Sale
                          </h2>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {cart.length} Items in cart
                          </div>
                        </div>

                        <form onSubmit={handleBarcodeScan} className="flex gap-3">
                          <div className="relative flex-1">
                            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                            <input
                                type="text"
                                placeholder="Scan barcode or enter product barcode"
                                className="w-full bg-[#F2F2F2] border-none rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-[#6C35D4]/20 transition-all text-sm font-medium"
                                value={checkoutBarcode}
                                onChange={(e) => setCheckoutBarcode(e.target.value)}
                                autoFocus
                            />
                          </div>
                          <button
                              type="submit" disabled={loading}
                              className="bg-[#6C35D4] text-white px-8 rounded-2xl font-bold text-sm hover:bg-[#4B2491] transition-all flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4"/>
                            Add Item
                          </button>
                        </form>

                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
                          <table className="w-full text-left">
                            <thead>
                            <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                              <th className="pb-4">Product</th>
                              <th className="pb-4 text-center">Price</th>
                              <th className="pb-4 text-center">Qty</th>
                              <th className="pb-4 text-right">Subtotal</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {calculation?.items.map((item) => (
                                <tr key={item.productId} className="group">
                                  <td className="py-4">
                                    <div className="font-bold text-gray-900">{item.productName}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">ID: #{item.productId}</div>
                                  </td>
                                  <td className="py-4 text-center font-medium text-gray-600">{formatCurrency(item.unitPrice)}</td>
                                  <td className="py-4">
                                    <div className="flex items-center justify-center gap-3">
                                      <button
                                          onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#6C35D4] hover:text-white transition-all"
                                      >
                                        <Minus className="w-3 h-3"/>
                                      </button>
                                      <span
                                          className="font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                                      <button
                                          onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#6C35D4] hover:text-white transition-all"
                                      >
                                        <PlusIcon className="w-3 h-3"/>
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-4 text-right">
                                    <div className="flex items-center justify-end gap-4">
                                      <span className="font-bold text-[#6C35D4]">{formatCurrency(item.subtotal)}</span>
                                      <button
                                          onClick={() => removeFromCart(item.productId)}
                                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 className="w-4 h-4"/>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                            ))}
                            {(!calculation || calculation.items.length === 0) && (
                                <tr>
                                  <td colSpan={4} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 text-gray-300">
                                      <ShoppingBag className="w-12 h-12 opacity-20"/>
                                      <p className="text-sm font-medium">No items added yet.</p>
                                    </div>
                                  </td>
                                </tr>
                            )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right: Summary */}
                    <div className="flex flex-col gap-6">
                      <div
                          className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col gap-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                          <DollarSign className="w-6 h-6 text-[#6C35D4]"/>
                          Payment Summary
                        </h2>

                        <div className="space-y-4">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Discount
                            Type</label>
                          <select
                              className="w-full bg-[#F2F2F2] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#6C35D4]/20 transition-all text-sm font-bold appearance-none cursor-pointer"
                              value={discountType}
                              onChange={(e) => {
                                const newType = e.target.value as "NONE" | "PWD";
                                setDiscountType(newType);
                                calculateTotals(cart, newType);
                              }}
                          >
                            <option value="NONE">None</option>
                            <option value="PWD">PWD (20% off, VAT exempt)</option>
                          </select>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-4">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Payment Method
                          </label>
                          <select
                              className="w-full bg-[#F2F2F2] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#6C35D4]/20 transition-all text-sm font-bold appearance-none cursor-pointer"
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "CARD" | "GCASH")}
                          >
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                            <option value="GCASH">GCash</option>
                          </select>
                        </div>

                        <div className="bg-[#F2F2F2] rounded-3xl p-6 space-y-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Subtotal:</span>
                            <span
                                className="font-bold text-gray-900">{formatCurrency(calculation?.subtotal || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Discount:</span>
                            <span
                                className="font-bold text-emerald-600">-{formatCurrency(calculation?.discountAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">VAT (12%):</span>
                            <span
                                className="font-bold text-gray-900">{formatCurrency(calculation?.vatAmount || 0)}</span>
                          </div>
                          <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">Total:</span>
                            <span
                                className="text-2xl font-black text-[#6C35D4]">{formatCurrency(calculation?.total || 0)}</span>
                          </div>
                        </div>

                        <button
                            onClick={handleCompleteSale}
                            disabled={cart.length === 0 || isCompletingSale}
                            className="w-full bg-[#6C35D4] text-white py-5 rounded-2xl font-bold text-lg hover:bg-[#4B2491] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-[#6C35D4]/20"
                        >
                          {isCompletingSale ? (
                              <Loader2 className="w-6 h-6 animate-spin"/>
                          ) : (
                              <>
                                <CheckCircle className="w-6 h-6"/>
                                Complete Sale
                              </>
                          )}
                        </button>

                        {lastSale && (
                            <motion.div
                                initial={{opacity: 0, y: 10}}
                                animate={{opacity: 1, y: 0}}
                                className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-sm font-medium flex flex-col gap-1"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4"/>
                                Sale completed successfully!
                              </div>
                              <div className="pl-6 text-xs opacity-80">
                                Sale ID: #{lastSale.id} • {formatDate(lastSale.saleDate)}
                              </div>
                            </motion.div>
                        )}

                        <div className="pt-4 border-t border-gray-100">
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            Cashier ID is taken from the logged-in user. After sale, stock quantities are automatically
                            updated.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
              )}

              {activeTab === "reports" && (
                  <div className="flex flex-col gap-8 h-full overflow-hidden">
                    <div
                        className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col gap-8 shadow-sm flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                          <Layers className="w-6 h-6 text-[#6C35D4]"/>
                          Sales Reports
                        </h2>
                        <div className="flex items-center gap-3">
                          <button
                              onClick={() => {
                                const today = new Date().toISOString().slice(0, 10);
                                setReportFilters(prev => ({...prev, from: today, to: today}));
                              }}
                              className="px-4 py-2 bg-gray-100 rounded-full text-xs font-bold text-gray-600 hover:bg-[#6C35D4] hover:text-white transition-all"
                          >
                            Today
                          </button>
                          <button
                              onClick={() => {
                                const to = new Date();
                                const from = new Date();
                                from.setDate(to.getDate() - 7);
                                setReportFilters(prev => ({
                                  ...prev,
                                  from: from.toISOString().slice(0, 10),
                                  to: to.toISOString().slice(0, 10)
                                }));
                              }}
                              className="px-4 py-2 bg-gray-100 rounded-full text-xs font-bold text-gray-600 hover:bg-[#6C35D4] hover:text-white transition-all"
                          >
                            Last 7 Days
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-6 items-end">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date
                            From</label>
                          <input
                              type="date"
                              className="w-full bg-[#F2F2F2] border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#6C35D4]/20 transition-all"
                              value={reportFilters.from}
                              onChange={(e) => setReportFilters(prev => ({...prev, from: e.target.value}))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date
                            To</label>
                          <input
                              type="date"
                              className="w-full bg-[#F2F2F2] border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#6C35D4]/20 transition-all"
                              value={reportFilters.to}
                              onChange={(e) => setReportFilters(prev => ({...prev, to: e.target.value}))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cashier</label>
                          <select
                              className="w-full bg-[#F2F2F2] border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#6C35D4]/20 transition-all appearance-none"
                              value={reportFilters.cashierId}
                              onChange={(e) => setReportFilters(prev => ({...prev, cashierId: e.target.value}))}
                          >
                            <option value="">All Cashiers</option>
                            {users.filter(u => u.role === "CASHIER").map(u => (
                                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} (ID: {u.id})</option>
                            ))}
                          </select>
                        </div>
                        <button
                            onClick={fetchReports}
                            className="bg-[#6C35D4] text-white py-3 rounded-2xl font-bold text-sm hover:bg-[#4B2491] transition-all flex items-center justify-center gap-2"
                        >
                          {isFetchingReports ? <Loader2 className="w-4 h-4 animate-spin"/> :
                              <RefreshCw className="w-4 h-4"/>}
                          Apply Filters
                        </button>
                      </div>

                      <div className="bg-[#F2F2F2] rounded-3xl p-6 flex items-center justify-between">
                        <span
                            className="text-gray-500 font-bold uppercase text-xs tracking-widest">Total Sales Amount:</span>
                        <span className="text-3xl font-black text-[#6C35D4]">
                      {formatCurrency(
                          reportSales
                              .filter(sale => sale.status === "COMPLETED")
                              .reduce((sum, s) => sum + (s.totalAmount || 0), 0)
                      )}
                    </span>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <table className="w-full text-left">
                          <thead>
                          <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                            <th className="pb-4">Sale ID</th>
                            <th className="pb-4">Status</th>
                            <th className="pb-4">Date & Time</th>
                            <th className="pb-4">Cashier</th>
                            <th className="pb-4 text-right">Total Amount</th>
                            <th className="pb-4 text-right">Action</th>
                          </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                          {reportSales.map((sale) => {
                            return (
                                <React.Fragment key={sale.id}>
                                  {/* Main row */}
                                  <tr className="group hover:bg-gray-50/50 transition-all">
                                    <td className="py-4 font-bold text-gray-900">#{sale.id}</td>
                                    <td className="py-4">
                                            <span
                                                className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", sale.status === "COMPLETED" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                                              {sale.status}
                                             </span>
                                    </td>
                                    <td className="py-4 text-sm text-gray-600">{formatDate(sale.saleDate)}</td>
                                    <td className="py-4 text-sm text-gray-600">{sale.cashierName}</td>
                                    <td className={cn("py-4 text-right font-bold", sale.status === "VOIDED" ? "line-through text-gray-400" : "text-[#6C35D4]")}>
                                      {formatCurrency(sale.totalAmount)}
                                    </td>
                                    <td className="py-4 text-right whitespace-nowrap">
                                      <button
                                          onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                                          className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#6C35D4] transition-all"
                                      >
                                        {expandedSaleId === sale.id ? "▲ Hide Items" : "▼ Show Items"}
                                      </button>

                                    </td>

                                  </tr>
                                  {/* Expanded details row */}
                                  {expandedSaleId === sale.id && (
                                      <tr className="bg-gray-50/50">
                                        <td colSpan={6} className="py-4 px-8 rounded-2xl">
                                          <div className="space-y-4">
                                            {/* Header */}
                                            <div
                                                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sale
                                              Details
                                            </div>

                                            {/* Items table */}
                                            <table className="w-full">
                                              <thead>
                                              <tr className="text-[9px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                <th className="pb-2">Product</th>
                                                <th className="pb-2 text-center">Qty</th>
                                                <th className="pb-2 text-center">Unit Price</th>
                                                <th className="pb-2 text-right">Subtotal</th>
                                              </tr>
                                              </thead>
                                              <tbody>
                                              {sale.items.map((item, idx) => (
                                                  <tr key={idx} className="text-xs">
                                                    <td className={cn("py-2 font-medium", sale.status === "VOIDED" && "line-through text-gray-400")}>
                                                      {item.productName}
                                                    </td>
                                                    <td className={cn("py-2 text-center", sale.status === "VOIDED" && "line-through text-gray-400")}>
                                                      {item.quantity}
                                                    </td>
                                                    <td className={cn("py-2 text-center", sale.status === "VOIDED" && "line-through text-gray-400")}>
                                                      {formatCurrency(item.unitPrice)}
                                                    </td>
                                                    <td className={cn("py-2 text-right font-bold", sale.status === "VOIDED" && "line-through text-gray-400")}>
                                                      {formatCurrency(item.subtotal)}
                                                    </td>
                                                  </tr>
                                              ))}
                                              </tbody>
                                            </table>

                                            {/* Void button – placed right after the items table, before totals */}
                                            {currentUser?.role === "ADMIN" && sale.status === "COMPLETED" && (
                                                <div className="mt-2 flex justify-start">
                                                  <button
                                                      onClick={() => openVoidModal(sale.id)}
                                                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
                                                  >
                                                    Void Sale
                                                  </button>
                                                </div>
                                            )}

                                            {/* Totals section */}
                                            <div className="flex justify-end gap-8 pt-2 border-t border-gray-100">
                                              <div className="text-right">
                                                <div
                                                    className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Discount
                                                  ({sale.discountType})
                                                </div>
                                                <div
                                                    className="text-xs font-bold text-emerald-600">-{formatCurrency(sale.discountAmount)}</div>
                                              </div>
                                              <div className="text-right">
                                                <div
                                                    className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">VAT
                                                </div>
                                                <div
                                                    className="text-xs font-bold text-gray-900">{formatCurrency(sale.vatAmount)}</div>
                                              </div>
                                              <div className="text-right">
                                                <div
                                                    className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total
                                                </div>
                                                <div
                                                    className="text-sm font-black text-[#6C35D4]">{formatCurrency(sale.totalAmount)}</div>
                                              </div>
                                            </div>

                                            {/* Void reason (if any) */}
                                            {sale.status === "VOIDED" && sale.voidReason && (
                                                <div className="text-xs text-red-500 italic mt-2">
                                                  Voided: {sale.voidReason}
                                                </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                  )}
                                </React.Fragment>
                            );
                          })}
                          {reportSales.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-20 text-center">
                                  <div className="flex flex-col items-center gap-4 text-gray-300">
                                    <Layers className="w-12 h-12 opacity-20"/>
                                    <p className="text-sm font-medium">No sales found for the selected filters.</p>
                                  </div>
                                </td>
                              </tr>
                          )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
              )}
              {activeTab === "home" && (
                  <div className="space-y-8">
                    <section>
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-[#6C35D4]"/>
                        Recently Added Items
                      </h2>
                      <div className="grid grid-cols-4 gap-4">
                        {products.slice(0, 4).map(p => (
                            <div key={p.id}
                                 className="bg-[#F2F2F2] p-4 rounded-3xl flex flex-col items-center text-center">
                              <div
                                  className="w-16 h-16 rounded-2xl bg-white mb-3 overflow-hidden border border-gray-100 flex items-center justify-center cursor-zoom-in hover:scale-105 transition-transform"
                                  onClick={() => {
                                    if (p.imageUrl) {
                                      setSelectedImage(getImageUrl(p.imageUrl));
                                    }
                                  }}
                              >
                                {p.imageUrl ? (
                                    <img
                                        src={getImageUrl(p.imageUrl)}
                                        alt={p.name}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.onerror = null;
                                          target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E`;
                                        }}
                                    />
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-gray-200"/>
                                )}
                              </div>
                              <div className="font-bold text-sm text-gray-900 line-clamp-1">{p.name}</div>
                              <div
                                  className="text-[10px] font-bold text-[#6C35D4] uppercase tracking-widest mt-1">{formatCurrency(p.price)}</div>
                            </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <button
                          onClick={() => setActiveTab("users")}
                          className="w-full bg-[#6C35D4] text-white p-8 rounded-[3rem] flex items-center justify-between group hover:bg-[#4B2491] transition-all"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-white/20 rounded-[2rem] flex items-center justify-center">
                            <UsersIcon className="w-8 h-8"/>
                          </div>
                          <div className="text-left">
                            <h3 className="text-2xl font-bold">Staff Management</h3>
                            <p className="text-white/60 text-sm">View cashier users and custodial staff</p>
                          </div>
                        </div>
                        <ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-transform"/>
                      </button>
                    </section>
                  </div>
              )}

              {activeTab === "products" && (
                  <section className="space-y-6">
                    <div className="flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">Inventory List</h2>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                className="pl-11 pr-6 py-2.5 bg-white border border-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all w-56"
                                value={nameSearchQuery}
                                onChange={(e) => {
                                  setNameSearchQuery(e.target.value);
                                  setCurrentPage(0);
                                }}
                            />
                          </div>
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                            <input
                                type="text"
                                placeholder="Search by barcode..."
                                className="pl-11 pr-6 py-2.5 bg-white border border-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all w-56"
                                value={barcodeSearchQuery}
                                onChange={(e) => {
                                  setBarcodeSearchQuery(e.target.value);
                                  setCurrentPage(0);
                                }}
                            />
                          </div>
                          <select
                              className="px-6 py-2.5 bg-white border border-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all cursor-pointer appearance-none"
                              value={selectedCategory}
                              onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setCurrentPage(0);
                              }}
                          >
                            <option value="All">All Categories</option>
                            <option value="Dairy & Eggs">Dairy & Eggs</option>
                            <option value="Grains & Pasta">Grains & Pasta</option>
                            <option value="Bakery & Bread">Bakery & Bread</option>
                            <option value="Pantry & Canned Goods">Pantry & Canned Goods</option>
                            <option value="Snacks & Sweets">Snacks & Sweets</option>
                            <option value="Beverages">Beverages</option>
                            <option value="Household Essentials">Household Essentials</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">ID</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Image</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Product
                            Name
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Barcode</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Price</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stock</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                              <td colSpan={7} className="p-10 text-center text-gray-400">Loading...</td>
                            </tr>
                        ) : products.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-10 text-center text-gray-400">No products found.</td>
                            </tr>
                        ) : products.map(product => (
                            <tr key={product.id} className="hover:bg-[#F2EDFF]/30 transition-colors group">
                              <td className="px-6 py-4 font-mono text-xs text-gray-400">#{product.id}</td>
                              <td className="px-6 py-4">
                                <div
                                    className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden border border-gray-100 cursor-zoom-in hover:scale-110 transition-transform"
                                    onClick={() => product.imageUrl && setSelectedImage(getImageUrl(product.imageUrl))}
                                >
                                  {product.imageUrl ? (
                                      <img
                                          src={getImageUrl(product.imageUrl)}
                                          alt={product.name}
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            // Instead of placeholder.com, use a local fallback or data URL
                                            target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E`;
                                          }}
                                      />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <ImageIcon className="w-5 h-5"/></div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{product.name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div
                                    className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{product.barcode || "—"}</div>
                              </td>
                              <td className="px-6 py-4 font-bold text-[#6C35D4]">{formatCurrency(product.price)}</td>
                              <td className="px-6 py-4">
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                product.stockQuantity < 5 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                            )}>
                              {product.stockQuantity} Qty
                            </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div
                                    className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => {
                                    const qty = prompt("Enter quantity to add:", "10");
                                    if (qty && !isNaN(parseInt(qty))) {
                                      handleRestock(product.barcode, parseInt(qty));
                                    }
                                  }}
                                          className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                          title="Restock">
                                    <PlusIcon className="w-4 h-4"/>
                                  </button>
                                  <button onClick={() => {
                                    setEditingProduct(product);
                                    setFormData({
                                      name: product.name,
                                      barcode: product.barcode,
                                      price: product.price,
                                      stockQuantity: product.stockQuantity,
                                      category: product.category,
                                      imageUrl: product.imageUrl || ""
                                    });
                                    setIsAdding(true);
                                    setModalError(null);
                                    setBarcodeExists(false);
                                    setBarcodeCheckMessage("");
                                    setImageFile(null);
                                  }}
                                          className="p-2 text-gray-400 hover:text-[#6C35D4] hover:bg-[#F2EDFF] rounded-xl transition-all">
                                    <Edit3 className="w-4 h-4"/>
                                  </button>
                                  <button onClick={() => setProductToDelete(product.id)}
                                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 className="w-4 h-4"/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 pt-4">
                          <button
                              disabled={currentPage === 0}
                              onClick={() => setCurrentPage(prev => prev - 1)}
                              className="p-2 rounded-xl border border-gray-100 disabled:opacity-30 hover:bg-gray-50 transition-all"
                          >
                            <ChevronRight className="w-5 h-5 rotate-180"/>
                          </button>
                          <div className="flex gap-1">
                            {Array.from({length: totalPages}).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    className={cn(
                                        "w-10 h-10 rounded-xl text-xs font-bold transition-all",
                                        currentPage === i ? "bg-[#6C35D4] text-white" : "hover:bg-gray-50 text-gray-400"
                                    )}
                                >
                                  {i + 1}
                                </button>
                            ))}
                          </div>
                          <button
                              disabled={currentPage === totalPages - 1}
                              onClick={() => setCurrentPage(prev => prev + 1)}
                              className="p-2 rounded-xl border border-gray-100 disabled:opacity-30 hover:bg-gray-50 transition-all"
                          >
                            <ChevronRight className="w-5 h-5"/>
                          </button>
                        </div>
                    )}
                  </section>
              )}

              {activeTab === "users" && (
                  <section className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UserCircle className="w-6 h-6 text-[#6C35D4]"/>
                        Staff Directory
                      </h2>
                      <button
                          onClick={() => {
                            // Reset all form fields to initial empty state
                            setUserFormData({
                              firstName: "",
                              lastName: "",
                              email: "",
                              gender: "MALE",
                              role: "CASHIER",
                              username: "",
                              password: "",
                              photo: null,
                              resume: null,
                              barangayClearance: null,
                              phoneNumber: "",
                              address: "",
                              age: "",
                            });
                            setResumeFileName("");
                            setBarangayFileName("");
                            setIsAddingUser(true);
                          }}
                          className="bg-[#6C35D4] text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-[#6C35D4]/20 transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4"/>
                        Register Staff
                      </button>
                    </div>

                    {/* Search and Filter */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Search by name/ID */}
                      <div className="relative group">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#6C35D4] transition-colors"/>
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/10 focus:border-[#6C35D4] transition-all text-sm"
                            value={userSearch.id}
                            onChange={(e) => setUserSearch(prev => ({...prev, id: e.target.value}))}
                        />
                      </div>

                      {/* Role filter */}
                      <select
                          className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/10 focus:border-[#6C35D4] transition-all text-sm appearance-none cursor-pointer"
                          value={userSearch.role}
                          onChange={(e) => setUserSearch(prev => ({...prev, role: e.target.value}))}
                      >
                        <option value="">All Roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="CASHIER">Cashier</option>
                        <option value="CUSTODIAL">Custodial</option>
                      </select>

                      {/* Status filter */}
                      <select
                          className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/10 focus:border-[#6C35D4] transition-all text-sm appearance-none cursor-pointer"
                          value={userStatusFilter}
                          onChange={(e) => setUserStatusFilter(e.target.value as any)}
                      >
                        <option value="all">All Users</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {users
                          .filter(u => {
                            // 1. Status filter
                            if (userStatusFilter === "active") return u.active === true;
                            if (userStatusFilter === "inactive") return u.active === false;
                            return true;
                          })
                          .filter(u => {
                            // 2. Text search (ID or full name)
                            if (userSearch.id === "") return true;
                            return u.id.toString().includes(userSearch.id) ||
                                u.fullName.toLowerCase().includes(userSearch.id.toLowerCase());
                          })
                          .filter(u => {
                            // 3. Role filter
                            if (userSearch.role === "") return true;
                            return u.role === userSearch.role;
                          })
                          .map(user => {
                            // DEBUG: Check photo URLs
                            console.log("=== USER PHOTO DEBUG ===");
                            console.log("User:", user.fullName);
                            console.log("Raw photoUrl:", user.photoUrl);
                            console.log("Full image URL:", getImageUrl(user.photoUrl));

                            return (
                                <div
                                    key={user.id}
                                    onClick={() => setViewingUser(user)}
                                    className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm hover:border-[#6C35D4]/20 transition-all cursor-pointer group"
                                >
                                  <div className="flex items-start gap-6">
                                    {/* Photo - Fixed size and display */}
                                    <div className="flex-shrink-0">
                                      <div
                                          className="w-16 h-16 bg-[#F2EDFF] rounded-3xl flex items-center justify-center text-[#6C35D4] overflow-hidden cursor-zoom-in"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (user.photoUrl) {
                                              setSelectedImage(getImageUrl(user.photoUrl));
                                            }
                                          }}
                                      >
                                        {user.photoUrl ? (
                                            <img
                                                src={getImageUrl(user.photoUrl)}
                                                alt={user.fullName}
                                                className="w-full h-full object-cover"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <UserCircle className="w-8 h-8" />
                                        )}
                                      </div>
                                    </div>

                                    {/* User Info - Takes remaining space */}
                                    <div className="flex-1 min-w-0">
                                      {/* Header with name and badges */}
                                      <div className="flex justify-between items-start gap-4">
                                        <div className="min-w-0 flex-1">
                                          <h3 className="font-bold text-lg text-gray-900 truncate">{user.fullName}</h3>
                                          <p className="text-xs text-gray-400 uppercase tracking-widest truncate">@{user.username}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap",
                        user.role === "ADMIN" ? "bg-purple-100 text-purple-600" :
                            user.role === "CASHIER" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                    )}>
                        {user.role}
                    </span>
                                          <span className={cn(
                                              "px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap",
                                              user.active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                          )}>
                        {user.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                                          <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingUser(user);
                                                setEditUserForm({
                                                  firstName: user.firstName,
                                                  lastName: user.lastName,
                                                  email: user.email,
                                                  phoneNumber: user.phoneNumber || "",
                                                  address: user.address || "",
                                                  age: user.age || "",
                                                  role: user.role,
                                                  active: user.active,
                                                  photo: user.photoUrl || null,
                                                  resume: user.resumeUrl || null,
                                                  barangayClearance: user.barangayClearanceUrl || null,
                                                  gender: user.gender || "Male"
                                                });
                                                setIsEditingUser(true);
                                              }}
                                              className="p-2 text-gray-400 hover:text-[#6C35D4] hover:bg-[#F2EDFF] rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                          >
                                            <Edit3 className="w-4 h-4"/>
                                          </button>
                                          {user.active && (user.role !== "ADMIN" || (user.role === "ADMIN" && user.id !== currentUser?.id)) && (
                                              <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserToDelete(user.id);
                                                  }}
                                                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                              >
                                                <Trash2 className="w-4 h-4"/>
                                              </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Footer with ID and Join Date */}
                                      <div className="mt-4 flex justify-between items-center">
                                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                                          ID: {user.id} • Joined {formatDate(user.createdDateTime)}
                                        </div>
                                        <div className="flex gap-2">
                                          {user.resumeUrl && (
                                              <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(getImageUrl(user.resumeUrl), '_blank');
                                                  }}
                                                  className="w-2 h-2 rounded-full bg-green-400 hover:bg-green-500 transition-all"
                                                  title="View Resume"
                                              />
                                          )}
                                          {user.barangayClearanceUrl && (
                                              <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(getImageUrl(user.barangayClearanceUrl), '_blank');
                                                  }}
                                                  className="w-2 h-2 rounded-full bg-blue-400 hover:bg-blue-500 transition-all"
                                                  title="View Barangay Clearance"
                                              />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                            );
                          })}
                    </div>
                  </section>
              )}
            </main>
          </div>

          {/* Lightbox and modals */}
          <AnimatePresence>
            {selectedImage && (
                <motion.div
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    onClick={() => setSelectedImage(null)}
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-10 cursor-zoom-out"
                >
                  <motion.img
                      initial={{scale: 0.9, opacity: 0}}
                      animate={{scale: 1, opacity: 1}}
                      exit={{scale: 0.9, opacity: 0}}
                      src={selectedImage}
                      alt="Full screen view"
                      className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
                      referrerPolicy="no-referrer"
                  />
                  <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                  >
                    <X className="w-8 h-8"/>
                  </button>
                </motion.div>
            )}
          </AnimatePresence>

          {/* Add/Edit Product Modal */}
          <AnimatePresence>
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                  <motion.div
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                      onClick={() => setIsAdding(false)}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  />
                  <motion.div
                      initial={{scale: 0.9, opacity: 0}}
                      animate={{scale: 1, opacity: 1}}
                      exit={{scale: 0.9, opacity: 0}}
                      className="relative bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl"
                  >
                    <div className="p-10 border-b border-gray-50 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-[#6C35D4]">
                        {editingProduct ? "Update Product" : "Add New Product"}
                      </h2>
                      <button onClick={() => setIsAdding(false)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X className="w-6 h-6 text-gray-400"/>
                      </button>
                    </div>

                    <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="p-10 space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="col-span-2 space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Product
                            Name</label>
                          <input
                              required
                              type="text"
                              className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-5 py-3.5"
                              value={formData.name}
                              onChange={(e) => {
                                setFormData(prev => ({...prev, name: e.target.value}));
                                const timeout = setTimeout(() => checkNameExists(e.target.value), 300);
                                return () => clearTimeout(timeout);
                              }}
                              onBlur={(e) => checkNameExists(e.target.value)}
                          />
                          {isCheckingName && <p className="text-gray-400 text-xs mt-1">Checking name...</p>}
                          {nameExists && !editingProduct && (
                              <p className="text-red-500 text-xs mt-1">{nameCheckMessage}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                              className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                          <select
                              required
                              className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium appearance-none cursor-pointer"
                              value={formData.category}
                              onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))}
                          >
                            <option value="Dairy & Eggs">Dairy & Eggs</option>
                            <option value="Grains & Pasta">Grains & Pasta</option>
                            <option value="Bakery & Bread">Bakery & Bread</option>
                            <option value="Pantry & Canned Goods">Pantry & Canned Goods</option>
                            <option value="Snacks & Sweets">Snacks & Sweets</option>
                            <option value="Beverages">Beverages</option>
                            <option value="Household Essentials">Household Essentials</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label
                              className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Barcode</label>
                          <input
                              type="text"
                              className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-mono"
                              value={formData.barcode}
                              onChange={(e) => {
                                setFormData(prev => ({...prev, barcode: e.target.value}));
                                const timeout = setTimeout(() => checkBarcodeExists(e.target.value), 300);
                                return () => clearTimeout(timeout);
                              }}
                              onBlur={(e) => checkBarcodeExists(e.target.value)}
                          />
                          {isCheckingBarcode && (
                              <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin"/> Checking barcode...
                              </p>
                          )}
                          {barcodeExists && !editingProduct && (
                              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3"/> {barcodeCheckMessage}
                              </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                              className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Price</label>
                          <input
                              required
                              type="number"
                              step="0.01"
                              className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-mono"
                              value={formData.price}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                setFormData(prev => ({...prev, price: isNaN(val) ? 0 : val}));
                              }}
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                              className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Stock</label>
                          <input
                              required
                              type="number"
                              className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-mono"
                              value={formData.stockQuantity}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                setFormData(prev => ({...prev, stockQuantity: isNaN(val) ? 0 : val}));
                              }}
                          />
                        </div>

                        <div className="col-span-2 space-y-4">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Product
                            Image (Optional)</label>
                          <div
                              className="flex flex-col gap-4 p-6 bg-[#F2EDFF]/50 rounded-3xl border border-[#6C35D4]/10">
                            <div className="flex gap-6">
                              <div
                                  className="w-24 h-24 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-[#6C35D4]/10 cursor-zoom-in"
                                  onClick={() => formData.imageUrl && setSelectedImage(getImageUrl(formData.imageUrl))}
                              >
                                {formData.imageUrl ? (
                                    <img
                                        key={formData.imageUrl}
                                        src={getImageUrl(formData.imageUrl)}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.onerror = null;
                                          target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E`;
                                        }}
                                    />
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-[#6C35D4]/20"/>
                                )}
                              </div>
                              <div className="flex-1 flex flex-col justify-center gap-3">
                                <div className="flex gap-3">
                                  <button
                                      type="button"
                                      disabled={isGeneratingImage || !formData.name}
                                      onClick={handleGenerateImage}
                                      className="flex-1 bg-[#6C35D4] text-white px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#4B2491] disabled:opacity-30 transition-all shadow-lg shadow-[#6C35D4]/20"
                                  >
                                    {isGeneratingImage ? (
                                        <><Loader2 className="w-3 h-3 animate-spin"/> Generating...</>
                                    ) : (
                                        <><Sparkles className="w-3 h-3"/> AI Generate</>
                                    )}
                                  </button>
                                  <label
                                      className="flex-1 bg-white text-[#6C35D4] border border-[#6C35D4]/20 px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 cursor-pointer transition-all">
                                    <Upload className="w-3 h-3"/>
                                    Upload Photo
                                    <input type="file" accept="image/*" className="hidden"
                                           onChange={handleProductFileChange}/>
                                  </label>
                                </div>
                                {formData.imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                          setFormData(prev => ({...prev, imageUrl: ""}));
                                          setImageFile(null);
                                        }}
                                        className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-600 transition-all text-left ml-1"
                                    >
                                      Remove Image
                                    </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {modalError && (
                          <div
                              className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4"/>
                            {modalError}
                            <button onClick={() => setModalError(null)} className="ml-auto">
                              <X className="w-3 h-3"/>
                            </button>
                          </div>
                      )}
                      <div className="pt-4 flex gap-4">
                        <button
                            type="submit"
                            disabled={loading || (!editingProduct && (barcodeExists || nameExists))}
                            className="flex-1 bg-[#6C35D4] text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#4B2491] shadow-xl shadow-[#6C35D4]/20 transition-all disabled:opacity-50"
                        >
                          {editingProduct ? "Save Changes" : "Add Product"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                              setIsAdding(false);
                              setEmailExists(false);
                              setEmailCheckMessage("");
                              setFormData({
                                name: "",
                                barcode: "",
                                price: 0,
                                stockQuantity: 0,
                                category: "Household Essentials",
                                imageUrl: ""
                              });
                              setImageFile(null);
                              setModalError(null);
                              setBarcodeExists(false);
                              setBarcodeCheckMessage("");
                            }}
                            className="px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl..."
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
            )}
          </AnimatePresence>

          {/* Register User Modal (unchanged) */}
          <AnimatePresence>
            {isAddingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                  <motion.div
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                      onClick={() => setIsAddingUser(false)}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  />
                  <motion.div
                      initial={{scale: 0.9, opacity: 0}}
                      animate={{scale: 1, opacity: 1}}
                      exit={{scale: 0.9, opacity: 0}}
                      className="relative bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                  >
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center shrink-0">
                      <h2 className="text-2xl font-bold text-[#6C35D4]">Register New Staff</h2>
                      <button onClick={() => setIsAddingUser(false)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X className="w-6 h-6 text-gray-400"/>
                      </button>
                    </div>

                    <form onSubmit={handleRegisterUser} className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">First
                              Name</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium"
                                value={userFormData.firstName}
                                onChange={(e) => setUserFormData(prev => ({...prev, firstName: e.target.value}))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Last
                              Name</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium"
                                value={userFormData.lastName}
                                onChange={(e) => setUserFormData(prev => ({...prev, lastName: e.target.value}))}
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email
                              Address</label>
                            <input
                                required
                                type="email"
                                className={`w-full bg-[#F2EDFF]/30 border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 transition-all font-medium ${
                                    emailExists ? 'border-red-500' : 'border-[#6C35D4]/10'
                                }`}
                                value={userFormData.email}
                                onChange={(e) => {
                                  setUserFormData(prev => ({...prev, email: e.target.value}));
                                  const timeout = setTimeout(() => checkEmailExists(e.target.value), 300);
                                  return () => clearTimeout(timeout);
                                }}
                                onBlur={(e) => checkEmailExists(e.target.value)}
                            />
                            {isCheckingEmail && (
                                <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin"/> Checking email...
                                </p>
                            )}
                            {emailExists && !editingUser && (
                                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3"/> {emailCheckMessage}
                                </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Phone
                              Number</label>
                            <input
                                required
                                type="tel"
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium"
                                value={userFormData.phoneNumber}
                                onChange={(e) => setUserFormData(prev => ({...prev, phoneNumber: e.target.value}))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label
                                className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Age</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium"
                                value={userFormData.age}
                                onChange={(e) => setUserFormData(prev => ({...prev, age: e.target.value}))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label
                                className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Gender</label>
                            <select
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium appearance-none cursor-pointer"
                                value={userFormData.gender}
                                onChange={(e) => setUserFormData(prev => ({...prev, gender: e.target.value}))}
                            >
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div className="col-span-2 space-y-2">
                            <label
                                className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Address</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium"
                                value={userFormData.address}
                                onChange={(e) => setUserFormData(prev => ({...prev, address: e.target.value}))}
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <label
                                className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Role</label>
                            <select
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium appearance-none cursor-pointer"
                                value={userFormData.role}
                                onChange={(e) => setUserFormData(prev => ({...prev, role: e.target.value as any}))}
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="CASHIER">Cashier</option>
                              <option value="CUSTODIAL">Custodial</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label
                                className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Username</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium"
                                value={userFormData.username}
                                onChange={(e) => setUserFormData(prev => ({...prev, username: e.target.value}))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label
                                className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                            <input
                                required
                                type="password"
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 focus:border-[#6C35D4] transition-all font-medium"
                                value={userFormData.password}
                                onChange={(e) => setUserFormData(prev => ({...prev, password: e.target.value}))}
                            />
                          </div>

                          {/* File Uploads */}
                          <div className="space-y-2">
                            <label
                                className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Photo</label>
                            <input
                                type="file"
                                accept="image/*"
                                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#F2EDFF] file:text-[#6C35D4] hover:file:bg-[#E5DBFF]"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setUserFormData(prev => ({...prev, photoFile: file}));
                                    // Optional preview
                                    const previewUrl = URL.createObjectURL(file);
                                    // Store previewUrl in a separate state for display
                                  }
                                }}
                            />
                            {userFormData.photoFile && (
                                <div className="relative inline-block mt-2">
                                  <img
                                      src={URL.createObjectURL(userFormData.photoFile)}
                                      alt="Preview"
                                      className="w-16 h-16 rounded-lg object-cover cursor-zoom-in"
                                      onClick={() => setSelectedImage(URL.createObjectURL(userFormData.photoFile))}
                                  />
                                  <button
                                      type="button"
                                      onClick={() => setUserFormData(prev => ({...prev, photoFile: null}))}
                                      className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600 transition-all"
                                  >
                                    <X className="w-3 h-3"/>
                                  </button>
                                </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Resume
                              (PDF/DOC)</label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#F2EDFF] file:text-[#6C35D4] hover:file:bg-[#E5DBFF]"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setResumeFileName(file.name);
                                    setUserFormData(prev => ({...prev, resumeFile: file}));
                                  }
                                }}
                            />
                            {userFormData.resumeFile && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                          const url = URL.createObjectURL(userFormData.resumeFile);
                                          window.open(url, '_blank');
                                        }}
                                        className="bg-gray-100 rounded-lg p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-all"
                                    >
                                      <FileText className="w-5 h-5 text-[#6C35D4]"/>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                          setUserFormData(prev => ({...prev, resumeFile: null}));
                                          setResumeFileName("");
                                        }}
                                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600 transition-all"
                                    >
                                      <X className="w-2.5 h-2.5"/>
                                    </button>
                                  </div>
                                  <span className="text-xs text-gray-600 truncate max-w-[200px]">{resumeFileName}</span>
                                </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Barangay
                              Clearance</label>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#F2EDFF] file:text-[#6C35D4] hover:file:bg-[#E5DBFF]"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setBarangayFileName(file.name);
                                    setUserFormData(prev => ({...prev, barangayFile: file}));
                                  }
                                }}
                            />
                            {userFormData.barangayFile && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                          const url = URL.createObjectURL(userFormData.barangayFile);
                                          window.open(url, '_blank');
                                        }}
                                        className="bg-gray-100 rounded-lg p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-all"
                                    >
                                      <FileText className="w-5 h-5 text-[#6C35D4]"/>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                          setUserFormData(prev => ({...prev, barangayFile: null}));
                                          setBarangayFileName("");
                                        }}
                                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600 transition-all"
                                    >
                                      <X className="w-2.5 h-2.5"/>
                                    </button>
                                  </div>
                                  <span
                                      className="text-xs text-gray-600 truncate max-w-[200px]">{barangayFileName}</span>
                                </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex gap-4 shrink-0">
                        <button
                            type="submit"
                            disabled={loading || emailExists}
                            className="flex-1 bg-[#6C35D4] text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#4B2491] shadow-xl shadow-[#6C35D4]/20 transition-all disabled:opacity-50"
                        >
                          {loading ? "Registering..." : "Register Staff"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAddingUser(false)}
                            className="px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
            )}
          </AnimatePresence>

          {/* Delete User Confirmation */}
          <AnimatePresence>
            {userToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                  <motion.div
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                      onClick={() => setUserToDelete(null)}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  />
                  <motion.div
                      initial={{scale: 0.9, opacity: 0}}
                      animate={{scale: 1, opacity: 1}}
                      exit={{scale: 0.9, opacity: 0}}
                      className="relative bg-white rounded-[2.5rem] p-10 w-full max-w-sm text-center shadow-2xl"
                  >
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="w-10 h-10 text-red-500"/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Staff?</h3>
                    <p className="text-gray-400 text-sm mb-8">This action cannot be undone. Are you sure you want to
                      remove this staff member?</p>
                    <div className="flex gap-4">
                      <button
                          onClick={() => handleDeleteUser(userToDelete)}
                          className="flex-1 bg-red-500 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
                      >
                        Delete
                      </button>
                      <button
                          onClick={() => setUserToDelete(null)}
                          className="flex-1 bg-gray-50 text-gray-400 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </div>
            )}
          </AnimatePresence>

          {/* Edit User Modal */}
          <AnimatePresence>
            {isEditingUser && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                  <motion.div
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                      onClick={() => setIsEditingUser(false)}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  />
                  <motion.div
                      initial={{scale: 0.9, opacity: 0}}
                      animate={{scale: 1, opacity: 1}}
                      exit={{scale: 0.9, opacity: 0}}
                      className="relative bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
                  >
                    <div
                        className="sticky top-0 bg-white z-10 p-6 border-b border-gray-50 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-[#6C35D4]">Edit Staff</h2>
                      <button onClick={() => setIsEditingUser(false)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X className="w-6 h-6 text-gray-400"/>
                      </button>
                    </div>
                    <form onSubmit={handleUpdateUser} className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        {/* First Name */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">First
                            Name</label>
                          <input required type="text"
                                 className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-2.5 text-sm"
                                 value={editUserForm.firstName}
                                 onChange={(e) => setEditUserForm(prev => ({...prev, firstName: e.target.value}))}
                          />
                        </div>
                        {/* Last Name */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Last Name</label>
                          <input required type="text"
                                 className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-2.5 text-sm"
                                 value={editUserForm.lastName}
                                 onChange={(e) => setEditUserForm(prev => ({...prev, lastName: e.target.value}))}
                          />
                        </div>
                        {/* Email */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</label>
                          <input required type="email"
                                 className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-2.5 text-sm"
                                 value={editUserForm.email}
                                 onChange={(e) => setEditUserForm(prev => ({...prev, email: e.target.value}))}
                          />
                        </div>
                        {/* Gender */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gender</label>
                          <select
                              value={editUserForm.gender}
                              onChange={(e) => setEditUserForm(prev => ({...prev, gender: e.target.value}))}
                              className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-2.5 text-sm"
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        {/* Phone */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                          <input type="text"
                                 className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-2.5 text-sm"
                                 value={editUserForm.phoneNumber}
                                 onChange={(e) => setEditUserForm(prev => ({...prev, phoneNumber: e.target.value}))}
                          />
                        </div>
                        {/* Age */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Age</label>
                          <input type="text"
                                 className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-2.5 text-sm"
                                 value={editUserForm.age}
                                 onChange={(e) => setEditUserForm(prev => ({...prev, age: e.target.value}))}
                          />
                        </div>
                        {/* Address */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</label>
                          <input type="text"
                                 className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-2.5 text-sm"
                                 value={editUserForm.address}
                                 onChange={(e) => setEditUserForm(prev => ({...prev, address: e.target.value}))}
                          />
                        </div>
                        {/* Role */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Role</label>
                          <select
                              className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-2.5 text-sm"
                              value={editUserForm.role}
                              onChange={(e) => setEditUserForm(prev => ({...prev, role: e.target.value as any}))}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="CASHIER">Cashier</option>
                            <option value="CUSTODIAL">Custodial</option>
                          </select>
                        </div>
                        {/* Status */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</label>
                          <select
                              value={editUserForm.active ? "active" : "inactive"}
                              onChange={(e) => setEditUserForm(prev => ({
                                ...prev,
                                active: e.target.value === "active"
                              }))}
                              className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-2xl px-4 py-2.5 text-sm"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                        {/* Photo upload */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Photo</label>
                          {editUserForm.photo && (
                              <div className="mb-3">
                                <div
                                    className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 cursor-zoom-in hover:scale-105 transition-transform"
                                    onClick={() => setSelectedImage(getImageUrl(editUserForm.photo))}
                                >
                                  <img
                                      src={getImageUrl(editUserForm.photo)}
                                      alt="Current photo"
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                  />
                                </div>
                              </div>
                          )}
                          <input
                              type="file"
                              accept="image/*"
                              className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#F2EDFF] file:text-[#6C35D4] hover:file:bg-[#E5DBFF]"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file && editingUser) {
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  const res = await fetch(`${API_BASE}/users/${editingUser.id}/photo`, {
                                    method: "POST",
                                    headers: {"Authorization": `Bearer ${currentUser.token}`},
                                    body: formData,
                                  });
                                  if (res.ok) {
                                    const imageUrl = await res.text();
                                    setEditUserForm(prev => ({...prev, photo: imageUrl}));
                                    setSuccess("Photo uploaded successfully");

                                    // ✅ ADD THIS LINE - Refresh the users list
                                    const userRes = await fetch(`${API_BASE}/users`, {
                                      headers: {"Authorization": `Bearer ${currentUser.token}`}
                                    });
                                    if (userRes.ok) {
                                      const userData = await userRes.json();
                                      setUsers(userData);
                                    }
                                  } else {
                                    const error = await res.text();
                                    setError(error);
                                  }
                                }
                              }}
                          />
                          {editUserForm.photo && (
                              <button
                                  type="button"
                                  onClick={async () => {
                                    if (editingUser) {
                                      const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                          "Authorization": `Bearer ${currentUser.token}`
                                        },
                                        body: JSON.stringify({photoUrl: ""})  // Send empty string to trigger deletion
                                      });
                                      if (res.ok) {
                                        setEditUserForm(prev => ({...prev, photo: null}));
                                        setSuccess("Photo removed successfully");

                                        // Refresh users list
                                        const userRes = await fetch(`${API_BASE}/users`, {
                                          headers: {"Authorization": `Bearer ${currentUser.token}`}
                                        });
                                        if (userRes.ok) {
                                          const userData = await userRes.json();
                                          setUsers(userData);
                                        }
                                      } else {
                                        setError("Failed to remove photo");
                                      }
                                    }
                                  }}
                                  className="mt-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"
                              >
                                Remove Photo
                              </button>
                          )}
                        </div>
                        {/* Resume upload */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resume
                            (PDF/DOC)</label>
                          <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#F2EDFF] file:text-[#6C35D4] hover:file:bg-[#E5DBFF]"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file && editingUser) {
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  const res = await fetch(`${API_BASE}/users/${editingUser.id}/resume`, {
                                    method: "POST",
                                    headers: {"Authorization": `Bearer ${currentUser.token}`},
                                    body: formData,
                                  });
                                  if (res.ok) {
                                    const fileUrl = await res.text();
                                    setEditUserForm(prev => ({...prev, resume: fileUrl}));
                                    setSuccess("Resume uploaded successfully");
                                  } else {
                                    const error = await res.text();
                                    setError(error);
                                  }
                                }
                              }}
                          />
                          {editUserForm.resume && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="relative">
                                  <a
                                      href={getImageUrl(editUserForm.resume)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-gray-100 rounded-lg p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-all"
                                  >
                                    <FileText className="w-5 h-5 text-[#6C35D4]"/>
                                  </a>
                                  <button
                                      type="button"
                                      onClick={() => setEditUserForm(prev => ({...prev, resume: ""}))}
                                      className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600 transition-all"
                                  >
                                    <X className="w-2.5 h-2.5"/>
                                  </button>
                                </div>
                                <a
                                    href={getImageUrl(editUserForm.resume)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-600 truncate max-w-[200px] hover:underline"
                                >
                                  {editUserForm.resume.split('/').pop()}
                                </a>
                              </div>
                          )}
                        </div>
                        {/* Barangay Clearance upload */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Barangay
                            Clearance</label>
                          <input
                              type="file"
                              accept="image/*,.pdf"
                              className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#F2EDFF] file:text-[#6C35D4] hover:file:bg-[#E5DBFF]"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file && editingUser) {
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  const res = await fetch(`${API_BASE}/users/${editingUser.id}/barangay`, {
                                    method: "POST",
                                    headers: {"Authorization": `Bearer ${currentUser.token}`},
                                    body: formData,
                                  });
                                  if (res.ok) {
                                    const fileUrl = await res.text();
                                    setEditUserForm(prev => ({...prev, barangayClearance: fileUrl}));
                                    setSuccess("Barangay clearance uploaded successfully");
                                  } else {
                                    const error = await res.text();
                                    setError(error);
                                  }
                                }
                              }}
                          />
                          {editUserForm.barangayClearance && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="relative">
                                  <a
                                      href={getImageUrl(editUserForm.barangayClearance)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-gray-100 rounded-lg p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-all"
                                  >
                                    <FileText className="w-5 h-5 text-[#6C35D4]"/>
                                  </a>
                                  <button
                                      type="button"
                                      onClick={() => setEditUserForm(prev => ({...prev, barangayClearance: ""}))}
                                      className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600 transition-all"
                                  >
                                    <X className="w-2.5 h-2.5"/>
                                  </button>
                                </div>
                                <a
                                    href={getImageUrl(editUserForm.barangayClearance)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-600 truncate max-w-[200px] hover:underline"
                                >
                                  {editUserForm.barangayClearance.split('/').pop()}
                                </a>
                              </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 pt-2">
                        <button type="submit"
                                className="flex-1 bg-[#6C35D4] text-white py-3 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#4B2491]">
                          Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                              setIsEditingUser(false);
                              // Refresh users list when closing
                              const userRes = await fetch(`${API_BASE}/users`, {
                                headers: {"Authorization": `Bearer ${currentUser.token}`}
                              });
                              if (userRes.ok) {
                                const userData = await userRes.json();
                                setUsers(userData);
                              }
                            }}
                            className="px-6 py-3 bg-gray-50 text-gray-400 rounded-2xl text-xs font-bold uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
            )}
          </AnimatePresence>

          {/* Void Sale Reason Modal */}
          <AnimatePresence>
            {voidSaleId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                  <motion.div
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                      onClick={() => setVoidSaleId(null)}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  />
                  <motion.div
                      initial={{scale: 0.9, opacity: 0}}
                      animate={{scale: 1, opacity: 1}}
                      exit={{scale: 0.9, opacity: 0}}
                      className="relative bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
                  >
                    <div className="p-6 border-b border-gray-100">
                      <h2 className="text-xl font-bold text-[#6C35D4]">Void Sale</h2>
                      <p className="text-sm text-gray-500 mt-1">Please select a reason for voiding this sale.</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label
                            className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Reason</label>
                        <select
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20"
                        >
                          <option value="">Select a reason...</option>
                          <option value="Cashier mistake (wrong item)">Cashier mistake (wrong item)</option>
                          <option value="Customer requested refund">Customer requested refund</option>
                          <option value="Duplicate sale">Duplicate sale</option>
                          <option value="Price adjustment">Price adjustment</option>
                          <option value="Out of stock after sale">Out of stock after sale</option>
                          <option value="Other">Other (specify below)</option>
                        </select>
                      </div>
                      {voidReason === "Other" && (
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Custom
                              reason</label>
                            <input
                                type="text"
                                placeholder="Enter custom reason..."
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                className="w-full bg-[#F2EDFF]/30 border border-[#6C35D4]/10 rounded-xl px-4 py-2"
                            />
                          </div>
                      )}
                    </div>
                    <div className="p-6 pt-0 flex gap-3">
                      <button
                          onClick={async () => {
                            const finalReason = voidReason === "Other" ? customReason : voidReason;
                            if (!finalReason) {
                              setError("Please select or enter a reason");
                              return;
                            }
                            await voidSale(voidSaleId!, finalReason);
                            setVoidSaleId(null);
                          }}
                          className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-red-600"
                      >
                        Confirm Void
                      </button>
                      <button
                          onClick={() => setVoidSaleId(null)}
                          className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-bold hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </div>
            )}
          </AnimatePresence>

          {/* Delete Product Confirmation */}
          <AnimatePresence>
            {productToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                  <motion.div
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                      onClick={() => {
                        setProductToDelete(null);
                        setDeleteModalError(null);
                      }}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  />
                  <motion.div
                      initial={{scale: 0.9, opacity: 0}}
                      animate={{scale: 1, opacity: 1}}
                      exit={{scale: 0.9, opacity: 0}}
                      className={`relative bg-white rounded-[2.5rem] p-10 w-full max-w-sm text-center shadow-2xl ${shakeModal ? 'shake' : ''}`}
                  >
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="w-10 h-10 text-red-500"/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Product?</h3>
                    <p className="text-gray-400 text-sm mb-6">
                      This action cannot be undone. Are you sure you want to remove this product?
                    </p>

                    {/* Error message inside modal */}
                    {deleteModalError && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl">
                          <p className="text-red-600 text-sm font-medium flex items-center justify-center gap-2">
                            <AlertCircle className="w-4 h-4"/>
                            {deleteModalError}
                          </p>
                        </div>
                    )}

                    <div className="flex gap-4">
                      <button
                          onClick={handleDeleteProduct}
                          disabled={loading}
                          className="flex-1 bg-red-500 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : "Delete"}
                      </button>
                      <button
                          onClick={() => {
                            setProductToDelete(null);
                            setDeleteModalError(null);
                          }}
                          className="flex-1 bg-gray-50 text-gray-400 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </div>
            )}
          </AnimatePresence>

          {/* View User Details Modal */}
          <AnimatePresence>
            {viewingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                  <motion.div
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                      onClick={() => setViewingUser(null)}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  />
                  <motion.div
                      initial={{scale: 0.9, opacity: 0}}
                      animate={{scale: 1, opacity: 1}}
                      exit={{scale: 0.9, opacity: 0}}
                      className="relative bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl"
                  >
                    <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-[#F2EDFF]/30">
                      <div className="flex items-center gap-6">
                        <div
                            className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-[#6C35D4] overflow-hidden shadow-sm cursor-zoom-in"
                            onClick={() => {
                              if (viewingUser.photoUrl) {
                                setSelectedImage(getImageUrl(viewingUser.photoUrl));
                              }
                            }}
                        >
                          {viewingUser.photoUrl ? (
                              <img src={getImageUrl(viewingUser.photoUrl)} alt={viewingUser.fullName}
                                   className="w-full h-full object-cover"/>
                          ) : (
                              <UserCircle className="w-10 h-10"/>
                          )}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{viewingUser.fullName}</h2>
                          <p className="text-sm text-[#6C35D4] font-bold uppercase tracking-widest">{viewingUser.role}</p>
                        </div>
                      </div>
                      <button onClick={() => setViewingUser(null)}
                              className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
                        <X className="w-6 h-6 text-gray-400"/>
                      </button>
                    </div>

                    <div className="p-10 grid grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label
                              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Username</label>
                          <p className="text-gray-900 font-medium">@{viewingUser.username}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email
                            Address</label>
                          <p className="text-gray-900 font-medium">{viewingUser.email}</p>
                        </div>
                        <div>
                          <label
                              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Gender</label>
                          <p className="text-gray-900 font-medium">{formatGender(viewingUser.gender)}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Phone
                            Number</label>
                          <p className="text-gray-900 font-medium">{viewingUser.phoneNumber || "Not provided"}</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label
                              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Age</label>
                          <p className="text-gray-900 font-medium">{viewingUser.age || "Not provided"}</p>
                        </div>
                        <div>
                          <label
                              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Address</label>
                          <p className="text-gray-900 font-medium">{viewingUser.address || "Not provided"}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Joined
                            Date</label>
                          <p className="text-gray-900 font-medium">{formatDate(viewingUser.createdDateTime)}</p>
                        </div>
                      </div>

                      <div className="col-span-2 pt-6 border-t border-gray-50">
                        <label
                            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Documents</label>
                        <div className="flex gap-4">
                          {viewingUser.resumeUrl ? (
                              <button
                                  onClick={() => window.open(getImageUrl(viewingUser.resumeUrl), '_blank')}
                                  className="flex-1 bg-gray-50 p-4 rounded-2xl flex items-center gap-3 hover:bg-[#F2EDFF] transition-all group text-left"
                              >
                                <div
                                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-500 shadow-sm">
                                  <CheckCircle className="w-5 h-5"/>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">Resume</p>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">View Document</p>
                                </div>
                              </button>
                          ) : (
                              <div className="flex-1 bg-gray-50/50 p-4 rounded-2xl flex items-center gap-3 opacity-50">
                                <div
                                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-300">
                                  <X className="w-5 h-5"/>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">No Resume</p>
                                </div>
                              </div>
                          )}

                          {viewingUser.barangayClearanceUrl ? (
                              <button
                                  onClick={() => window.open(getImageUrl(viewingUser.barangayClearanceUrl), '_blank')}
                                  className="flex-1 bg-gray-50 p-4 rounded-2xl flex items-center gap-3 hover:bg-[#F2EDFF] transition-all group text-left"
                              >
                                <div
                                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                                  <CheckCircle className="w-5 h-5"/>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">Barangay Clearance</p>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">View Document</p>
                                </div>
                              </button>
                          ) : (
                              <div className="flex-1 bg-gray-50/50 p-4 rounded-2xl flex items-center gap-3 opacity-50">
                                <div
                                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-300">
                                  <X className="w-5 h-5"/>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">No Clearance</p>
                                </div>
                              </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
            )}
          </AnimatePresence>

          {/* CHANGE PASSWORD MODAL */}
          <ChangePasswordModal
              isOpen={showChangePasswordModal}
              onClose={() => setShowChangePasswordModal(false)}
              userId={currentUser.id}
              token={currentUser.token}
              onSuccess={(message) => {
                setSuccess(message);
                setTimeout(() => handleLogout(), 2000);
              }}
              onError={(message) => setError(message)}
          />
        </div>
      </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
      <button
          onClick={onClick}
          className={cn(
              "flex items-center gap-3 px-4 py-3 w-full rounded-2xl transition-all group text-left",
              active
                  ? "bg-[#4B2491] text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
          )}
      >
      <span className={cn(active ? "text-white" : "text-white/40 group-hover:text-white")}>
        {icon}
      </span>
        <span className="font-bold text-sm tracking-wide">{label}</span>
      </button>
  );
}