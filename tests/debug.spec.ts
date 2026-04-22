import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Helper function to login
async function login(page, username: string, password: string) {
    await page.goto(BASE_URL);

    // YOUR ACTUAL SELECTORS from App.tsx
    await page.fill('input[placeholder="Enter your username"]', username);
    await page.fill('input[placeholder="••••••••"]', password);
    await page.click('button:has-text("Sign In")');

    // Wait for navigation - look for sidebar or main content
    await page.waitForSelector('text=Minit', { timeout: 10000 });
}

test('Admin can login successfully', async ({ page }) => {
    await page.goto(BASE_URL);

    // Take screenshot before login
    await page.screenshot({ path: 'before-login.png' });

    // Use YOUR actual placeholder text
    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'admin123');

    await page.screenshot({ path: 'filled-form.png' });

    // Click sign in button
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load (look for sidebar text)
    await page.waitForSelector('text=Minit', { timeout: 10000 });

    await page.screenshot({ path: 'after-login.png' });

    // Verify admin sees admin features
    await expect(page.locator('text=Products')).toBeVisible();
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=Reports')).toBeVisible();
});

test('Cashier can login successfully', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.fill('input[placeholder="Enter your username"]', 'cashier');
    await page.fill('input[placeholder="••••••••"]', 'cashier123');
    await page.click('button:has-text("Sign In")');

    await page.waitForSelector('text=Minit', { timeout: 10000 });

    // Cashier should see Checkout but NOT Products/Users
    await expect(page.locator('text=Checkout')).toBeVisible();

    await page.screenshot({ path: 'cashier-login.png' });
});

test('Invalid login shows error message', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.fill('input[placeholder="Enter your username"]', 'wronguser');
    await page.fill('input[placeholder="••••••••"]', 'wrongpass');
    await page.click('button:has-text("Sign In")');

    // Wait for error message (your App.tsx shows error messages)
    await page.waitForSelector('text=Invalid username or password', { timeout: 5000 });

    await page.screenshot({ path: 'invalid-login.png' });
});

test('Checkout - Add product by barcode', async ({ page }) => {
    // Login as cashier first
    await page.goto(BASE_URL);
    await page.fill('input[placeholder="Enter your username"]', 'cashier');
    await page.fill('input[placeholder="••••••••"]', 'cashier123');
    await page.click('button:has-text("Sign In")');
    await page.waitForSelector('text=Checkout', { timeout: 10000 });

    // Click Checkout tab (if not already active)
    await page.click('text=Checkout');

    // Your checkout page has barcode input
    await page.fill('input[placeholder="Scan barcode or enter product barcode"]', '123456789');
    await page.click('button:has-text("Add Item")');

    // Wait for product to appear in cart
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'cart-with-item.png' });
});

test('Admin can view products', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'admin123');
    await page.click('button:has-text("Sign In")');
    await page.waitForSelector('text=Products', { timeout: 10000 });

    // Click Products tab
    await page.click('text=Products');

    // Wait for products table
    await page.waitForSelector('table', { timeout: 10000 });
    await page.screenshot({ path: 'products-list.png' });
});

test('Admin can logout', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'admin123');
    await page.click('button:has-text("Sign In")');
    await page.waitForSelector('text=Log out', { timeout: 10000 });

    // Click logout button
    await page.click('text=Log out');

    // Should go back to login page
    await page.waitForSelector('text=Sign In', { timeout: 10000 });
    await page.screenshot({ path: 'after-logout.png' });
});