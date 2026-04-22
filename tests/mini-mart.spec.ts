import { test, expect } from '@playwright/test';

// ============================================
// CONFIGURATION
// ============================================
const BASE_URL = 'http://localhost:3000';

// Test users (use your actual database credentials)
const ADMIN = { username: 'admin', password: 'admin123' };
const CASHIER = { username: 'cashier', password: 'cashier123' };

// Helper function to login - USING CORRECT SELECTORS FROM YOUR APP
async function login(page: any, username: string, password: string) {
    await page.goto(BASE_URL);
    await page.fill('input[placeholder="Enter your username"]', username);
    await page.fill('input[placeholder="••••••••"]', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForSelector('text=Minit');
}

// Helper function for currency formatting
function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(value);
}

// ============================================
// TEST 1: LOGIN FUNCTIONALITY
// ============================================
test.describe('Login Functionality', () => {

    test('Admin can login successfully', async ({ page }) => {
        await login(page, ADMIN.username, ADMIN.password);

        // Verify admin sees admin-only features
        await expect(page.locator('text=Products')).toBeVisible();
        await expect(page.locator('text=Users')).toBeVisible();
        await expect(page.locator('text=Reports')).toBeVisible();
        await expect(page.locator('text=Checkout')).toBeVisible();

        await page.screenshot({ path: 'test-results/admin-dashboard.png' });
    });

    test('Cashier can login successfully', async ({ page }) => {
        await login(page, CASHIER.username, CASHIER.password);

        // Verify cashier sees only cashier features
        await expect(page.locator('text=Checkout')).toBeVisible();
        await expect(page.locator('text=Products')).not.toBeVisible();
        await expect(page.locator('text=Users')).not.toBeVisible();

        await page.screenshot({ path: 'test-results/cashier-dashboard.png' });
    });

    test('Invalid login shows error message', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.fill('input[placeholder="Enter your username"]', 'wronguser');
        await page.fill('input[placeholder="••••••••"]', 'wrongpass');
        await page.click('button:has-text("Sign In")');

        await page.waitForSelector('text=Invalid username or password');
        await page.screenshot({ path: 'test-results/invalid-login.png' });
    });
});

// ============================================
// TEST 2: PRODUCT MANAGEMENT (Admin only)
// ============================================
test.describe('Product Management - Admin', () => {

    test.beforeEach(async ({ page }) => {
        await login(page, ADMIN.username, ADMIN.password);
        await page.click('text=Products');
        await page.waitForSelector('button:has-text("Add Product")');
    });

    test('Admin can view products list', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible();
        await page.screenshot({ path: 'test-results/products-list.png' });
    });

    test('Admin can search products by name', async ({ page }) => {
        await page.fill('input[placeholder="Search by name..."]', 'Mechanical');
        await page.waitForTimeout(500);
        await expect(page.locator('text=Mechanical Keyboard')).toBeVisible();
        await page.screenshot({ path: 'test-results/search-by-name.png' });
    });

    test('Admin can search products by barcode', async ({ page }) => {
        await page.fill('input[placeholder="Search by barcode..."]', '123456789');
        await page.waitForTimeout(500);
        await expect(page.locator('text=Mechanical Keyboard')).toBeVisible();
        await page.screenshot({ path: 'test-results/search-by-barcode.png' });
    });

    test('Admin can filter by category', async ({ page }) => {
        await page.selectOption('select:has-text("All Categories")', 'Beverages');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/filter-by-category.png' });
    });

    test('Admin can add a new product', async ({ page }) => {
        const timestamp = Date.now();
        const productName = `Test Product ${timestamp}`;
        const barcode = `TEST${timestamp}`;

        await page.click('button:has-text("Add Product")');
        await page.waitForSelector('text=Add New Product');

        await page.fill('input[placeholder="Product Name"]', productName);
        await page.selectOption('select:has-text("Category")', 'Beverages');
        await page.fill('input[placeholder="Barcode"]', barcode);
        await page.fill('input[placeholder="Price"]', '99.99');
        await page.fill('input[placeholder="Stock"]', '50');

        await page.screenshot({ path: 'test-results/add-product-form.png' });
        await page.click('button:has-text("Add Product")');
        await page.waitForSelector('text=Product added successfully');
        await expect(page.locator(`text=${productName}`)).toBeVisible();
        await page.screenshot({ path: 'test-results/product-added.png' });
    });

    test('Admin can edit a product', async ({ page }) => {
        await page.hover('tr:first-child');
        await page.click('tr:first-child button[title="Edit"]');
        await page.waitForSelector('text=Update Product');

        const newName = `Updated ${Date.now()}`;
        await page.fill('input[placeholder="Product Name"]', newName);
        await page.click('button:has-text("Save Changes")');

        await page.waitForSelector('text=Product updated successfully');
        await page.screenshot({ path: 'test-results/edit-product.png' });
    });
});

// ============================================
// TEST 3: CHECKOUT & SALES (Cashier)
// ============================================
test.describe('Checkout & Sales - Cashier', () => {

    test.beforeEach(async ({ page }) => {
        await login(page, CASHIER.username, CASHIER.password);
        await page.click('text=Checkout');
        await page.waitForSelector('input[placeholder="Scan barcode or enter product barcode"]');
    });

    test('Cashier can add product by barcode', async ({ page }) => {
        await page.fill('input[placeholder="Scan barcode or enter product barcode"]', '123456789');
        await page.click('button:has-text("Add Item")');

        await expect(page.locator('text=Mechanical Keyboard')).toBeVisible();
        await page.screenshot({ path: 'test-results/cart-with-item.png' });
    });

    test('Cashier can adjust quantity in cart', async ({ page }) => {
        await page.fill('input[placeholder="Scan barcode or enter product barcode"]', '123456789');
        await page.click('button:has-text("Add Item")');

        // Click the plus button to increase quantity
        await page.click('button:has-text("+")');
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'test-results/quantity-adjusted.png' });
    });

    test('Cashier can remove item from cart', async ({ page }) => {
        await page.fill('input[placeholder="Scan barcode or enter product barcode"]', '123456789');
        await page.click('button:has-text("Add Item")');

        // Hover to show delete button, then click
        await page.hover('tr:first-child');
        await page.click('button[aria-label="Remove item"]');

        await expect(page.locator('text=No items added yet')).toBeVisible();
        await page.screenshot({ path: 'test-results/empty-cart.png' });
    });

    test('Cashier can apply PWD discount', async ({ page }) => {
        await page.fill('input[placeholder="Scan barcode or enter product barcode"]', '123456789');
        await page.click('button:has-text("Add Item")');

        await page.selectOption('select:has-text("Discount Type")', 'PWD');
        await page.waitForTimeout(500);

        const discountText = await page.locator('text=Discount:').textContent();
        expect(discountText).toContain('-₱');

        await page.screenshot({ path: 'test-results/pwd-discount.png' });
    });

    test('Cashier can change payment method', async ({ page }) => {
        await page.selectOption('select:has-text("Payment Method")', 'GCASH');
        const selectedValue = await page.locator('select:has-text("Payment Method")').inputValue();
        expect(selectedValue).toBe('GCASH');

        await page.screenshot({ path: 'test-results/payment-method.png' });
    });

    test('Cashier can complete a sale', async ({ page }) => {
        await page.fill('input[placeholder="Scan barcode or enter product barcode"]', '123456789');
        await page.click('button:has-text("Add Item")');
        await page.click('button:has-text("Complete Sale")');

        await page.waitForSelector('text=Sale completed');
        await page.screenshot({ path: 'test-results/sale-completed.png' });
    });
});

// ============================================
// TEST 4: REPORTS (Admin only)
// ============================================
test.describe('Reports - Admin', () => {

    test.beforeEach(async ({ page }) => {
        await login(page, ADMIN.username, ADMIN.password);
        await page.click('text=Reports');
        await page.waitForSelector('text=Sales Reports');
    });

    test('Admin can view sales reports', async ({ page }) => {
        await expect(page.locator('text=Total Sales Amount:')).toBeVisible();
        await expect(page.locator('table')).toBeVisible();
        await page.screenshot({ path: 'test-results/reports-view.png' });
    });

    test('Admin can filter by date range', async ({ page }) => {
        await page.fill('input[type="date"]:first-child', '2024-01-01');
        await page.fill('input[type="date"]:last-child', '2024-12-31');
        await page.click('button:has-text("Apply Filters")');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/reports-date-filter.png' });
    });

    test('Admin can expand sale to see details', async ({ page }) => {
        await page.click('button:has-text("▼ Show Items")');
        await page.waitForTimeout(500);
        await expect(page.locator('text=Product')).toBeVisible();
        await page.screenshot({ path: 'test-results/reports-expanded.png' });
    });
});

// ============================================
// TEST 5: USER MANAGEMENT (Admin only)
// ============================================
test.describe('User Management - Admin', () => {

    test.beforeEach(async ({ page }) => {
        await login(page, ADMIN.username, ADMIN.password);
        await page.click('text=Users');
        await page.waitForSelector('button:has-text("Register Staff")');
    });

    test('Admin can view staff list', async ({ page }) => {
        await expect(page.locator('text=Staff Directory')).toBeVisible();
        await page.screenshot({ path: 'test-results/users-list.png' });
    });

    test('Admin can search staff by name', async ({ page }) => {
        await page.fill('input[placeholder="Search by name or ID..."]', 'admin');
        await page.waitForTimeout(500);
        await expect(page.locator('text=Admin')).toBeVisible();
        await page.screenshot({ path: 'test-results/search-staff.png' });
    });

    test('Admin can filter by role', async ({ page }) => {
        await page.selectOption('select:has-text("All Roles")', 'CASHIER');
        await page.waitForTimeout(500);
        await expect(page.locator('text=CASHIER')).toBeVisible();
        await page.screenshot({ path: 'test-results/filter-by-role.png' });
    });

    test('Admin can register a new staff member', async ({ page }) => {
        const timestamp = Date.now();
        const email = `test${timestamp}@example.com`;

        await page.click('button:has-text("Register Staff")');
        await page.waitForSelector('text=Register New Staff');

        await page.fill('input[placeholder="First Name"]', 'Test');
        await page.fill('input[placeholder="Last Name"]', 'User');
        await page.fill('input[placeholder="Email Address"]', email);
        await page.fill('input[placeholder="Phone Number"]', '09123456789');
        await page.fill('input[placeholder="Age"]', '25');
        await page.fill('input[placeholder="Address"]', 'Test Address');
        await page.selectOption('select:has-text("Role")', 'CASHIER');
        await page.fill('input[placeholder="Username"]', `testuser${timestamp}`);
        await page.fill('input[placeholder="Password"]', 'password123');

        await page.screenshot({ path: 'test-results/register-user-form.png' });
        await page.click('button:has-text("Register Staff")');
        await page.waitForSelector('text=User registered');
        await page.screenshot({ path: 'test-results/user-registered.png' });
    });
});

// ============================================
// TEST 6: CHANGE PASSWORD
// ============================================
test.describe('Change Password', () => {

    test('User can change their password', async ({ page }) => {
        // Login with admin
        await login(page, ADMIN.username, ADMIN.password);

        // Click Change Password button in sidebar
        await page.click('text=Change Password');
        await page.waitForSelector('text=Change Password');

        // Fill the password change form
        await page.fill('input[placeholder="Enter current password"]', ADMIN.password);
        await page.fill('input[placeholder="Enter new password (min. 6 characters)"]', 'newpass123');
        await page.fill('input[placeholder="Confirm your new password"]', 'newpass123');

        await page.screenshot({ path: 'test-results/change-password-form.png' });

        // Submit the form
        await page.click('button:has-text("Change Password")');

        // Verify success message and automatic logout
        await page.waitForSelector('text=Password changed successfully');
        await page.waitForSelector('text=Sign In');

        await page.screenshot({ path: 'test-results/password-changed.png' });

        // Try to login with OLD password (should fail)
        await page.fill('input[placeholder="Enter your username"]', ADMIN.username);
        await page.fill('input[placeholder="••••••••"]', ADMIN.password);
        await page.click('button:has-text("Sign In")');

        await page.waitForSelector('text=Invalid username or password');
        await page.screenshot({ path: 'test-results/old-password-fails.png' });

        // Login with NEW password (should succeed)
        await page.fill('input[placeholder="Enter your username"]', ADMIN.username);
        await page.fill('input[placeholder="••••••••"]', 'newpass123');
        await page.click('button:has-text("Sign In")');

        await page.waitForSelector('text=Products');
        await page.screenshot({ path: 'test-results/new-password-works.png' });

        // Clean up: Change password back to original
        await page.click('text=Change Password');
        await page.waitForSelector('text=Change Password');

        await page.fill('input[placeholder="Enter current password"]', 'newpass123');
        await page.fill('input[placeholder="Enter new password (min. 6 characters)"]', ADMIN.password);
        await page.fill('input[placeholder="Confirm your new password"]', ADMIN.password);
        await page.click('button:has-text("Change Password")');

        await page.waitForSelector('text=Password changed successfully');

        await page.screenshot({ path: 'test-results/password-restored.png' });
    });

    test('Password change fails with wrong current password', async ({ page }) => {
        await login(page, ADMIN.username, ADMIN.password);

        await page.click('text=Change Password');
        await page.waitForSelector('text=Change Password');

        // Try with wrong current password
        await page.fill('input[placeholder="Enter current password"]', 'wrongpassword');
        await page.fill('input[placeholder="Enter new password (min. 6 characters)"]', 'newpass123');
        await page.fill('input[placeholder="Confirm your new password"]', 'newpass123');
        await page.click('button:has-text("Change Password")');

        // Should show error
        await page.waitForSelector('text=Current password is incorrect');
        await page.screenshot({ path: 'test-results/wrong-current-password.png' });
    });

    test('Password change fails when new passwords do not match', async ({ page }) => {
        await login(page, ADMIN.username, ADMIN.password);

        await page.click('text=Change Password');
        await page.waitForSelector('text=Change Password');

        // Enter mismatched passwords
        await page.fill('input[placeholder="Enter current password"]', ADMIN.password);
        await page.fill('input[placeholder="Enter new password (min. 6 characters)"]', 'newpass123');
        await page.fill('input[placeholder="Confirm your new password"]', 'different123');
        await page.click('button:has-text("Change Password")');

        // Should show error
        await page.waitForSelector('text=Passwords do not match');
        await page.screenshot({ path: 'test-results/passwords-mismatch.png' });
    });

    test('Password change fails with password too short', async ({ page }) => {
        await login(page, ADMIN.username, ADMIN.password);

        await page.click('text=Change Password');
        await page.waitForSelector('text=Change Password');

        // Enter password shorter than 6 characters
        await page.fill('input[placeholder="Enter current password"]', ADMIN.password);
        await page.fill('input[placeholder="Enter new password (min. 6 characters)"]', '123');
        await page.fill('input[placeholder="Confirm your new password"]', '123');
        await page.click('button:has-text("Change Password")');

        // Should show error
        await page.waitForSelector('text=Password must be at least 6 characters');
        await page.screenshot({ path: 'test-results/password-too-short.png' });
    });
});

// ============================================
// TEST 7: AI IMAGE GENERATION
// ============================================
test.describe('AI Image Generation', () => {

    test('Admin can generate AI image for product', async ({ page }) => {
        await login(page, ADMIN.username, ADMIN.password);
        await page.click('text=Products');
        await page.click('button:has-text("Add Product")');
        await page.waitForSelector('text=Add New Product');

        await page.fill('input[placeholder="Product Name"]', 'Coca Cola');
        await page.click('button:has-text("AI Generate")');

        // Wait for generation (may take a few seconds)
        await page.waitForTimeout(5000);

        await expect(page.locator('img[alt="Preview"]')).toBeVisible();
        await page.screenshot({ path: 'test-results/ai-generated-image.png' });
    });
});

// ============================================
// TEST 8: LOGOUT
// ============================================
test.describe('Logout', () => {

    test('User can logout successfully', async ({ page }) => {
        await login(page, ADMIN.username, ADMIN.password);

        await page.click('text=Log out');
        await page.waitForSelector('text=Sign In');
        await page.screenshot({ path: 'test-results/logout.png' });
    });
});