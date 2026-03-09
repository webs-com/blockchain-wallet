// NeuroWallet Constants
const PROMO_CODE = 'WELCOME500';
const PROMO_REWARD_USDT = 500000;

// Crypto Prices
const btcPrice = 40000;
const ethPrice = 2000;
const usdtPrice = 1;

// User Balance
let userBalance = {
    BTC: 0,
    USDT: 0,
    ETH: 0
};

let currentUser = null;
let selectedWithdrawMethod = null;
let selectedWithdrawCoin = null;
let transactions = [];

// ==================== IMPROVED PERSISTENT STORAGE MANAGER ====================
// This system simulates a backend by using localStorage with JSON storage
const PersistentStorageManager = {
    // Initialize storage with sample data if empty
    initializeStorage() {
        if (!localStorage.getItem('neuroWalletUsers')) {
            // Create a storage structure for users
            localStorage.setItem('neuroWalletUsers', JSON.stringify([]));
        }
        if (!localStorage.getItem('neuroWalletUserBalances')) {
            // Master balance storage (simulates backend database)
            localStorage.setItem('neuroWalletUserBalances', JSON.stringify({}));
        }
        console.log('✅ Storage initialized');
    },

    // Register a new user with credentials
    registerUser(fullName, email, password) {
        const users = JSON.parse(localStorage.getItem('neuroWalletUsers') || '[]');
        const emailLower = email.toLowerCase();

        // Check if user already exists
        if (users.find(u => u.email === emailLower)) {
            return { success: false, message: 'Email already registered' };
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            fullName: fullName,
            email: emailLower,
            password: password, // In production, this should be hashed
            createdAt: new Date().toISOString(),
            verified: false
        };

        users.push(newUser);
        localStorage.setItem('neuroWalletUsers', JSON.stringify(users));

        // Initialize balance for new user
        const balances = JSON.parse(localStorage.getItem('neuroWalletUserBalances') || '{}');
        balances[emailLower] = {
            BTC: 0,
            USDT: 0,
            ETH: 0,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('neuroWalletUserBalances', JSON.stringify(balances));

        // Initialize transactions storage
        localStorage.setItem(`neuroWallet_transactions_${emailLower}`, JSON.stringify([]));
        localStorage.setItem(`neuroWallet_promo_${emailLower}`, JSON.stringify({ used: false }));

        console.log('✅ User registered:', newUser);
        return { success: true, message: 'User registered successfully', user: newUser };
    },

    // Authenticate user
    authenticateUser(email, password) {
        const users = JSON.parse(localStorage.getItem('neuroWalletUsers') || '[]');
        const emailLower = email.toLowerCase();

        const user = users.find(u => u.email === emailLower);
        
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        if (user.password !== password) {
            return { success: false, message: 'Invalid password' };
        }

        return { success: true, message: 'Authentication successful', user: user };
    },

    // Get user balance from persistent storage
    getUserBalance(email) {
        const emailLower = email.toLowerCase();
        const balances = JSON.parse(localStorage.getItem('neuroWalletUserBalances') || '{}');
        
        if (balances[emailLower]) {
            console.log(`✅ Balance retrieved for ${emailLower}:`, balances[emailLower]);
            return balances[emailLower];
        }

        console.warn(`⚠️ No balance found for ${emailLower}`);
        return null;
    },

    // Save user balance to persistent storage
    saveUserBalance(email, balance) {
        const emailLower = email.toLowerCase();
        const balances = JSON.parse(localStorage.getItem('neuroWalletUserBalances') || '{}');

        balances[emailLower] = {
            BTC: balance.BTC || 0,
            USDT: balance.USDT || 0,
            ETH: balance.ETH || 0,
            lastUpdated: new Date().toISOString()
        };

        localStorage.setItem('neuroWalletUserBalances', JSON.stringify(balances));
        console.log(`✅ Balance saved for ${emailLower}:`, balances[emailLower]);
    },

    // Set custom balance for a user (Admin function)
    setUserBalance(email, btcAmount = 0, usdtAmount = 0, ethAmount = 0) {
        const emailLower = email.toLowerCase();
        const balances = JSON.parse(localStorage.getItem('neuroWalletUserBalances') || '{}');

        balances[emailLower] = {
            BTC: btcAmount,
            USDT: usdtAmount,
            ETH: ethAmount,
            lastUpdated: new Date().toISOString()
        };

        localStorage.setItem('neuroWalletUserBalances', JSON.stringify(balances));
        console.log(`✅ Balance set for ${emailLower}:`, balances[emailLower]);
        return balances[emailLower];
    },

    // Add amount to existing user balance
    addToUserBalance(email, btcAdd = 0, usdtAdd = 0, ethAdd = 0) {
        const emailLower = email.toLowerCase();
        const existing = this.getUserBalance(emailLower) || { BTC: 0, USDT: 0, ETH: 0 };
        
        return this.setUserBalance(
            emailLower,
            existing.BTC + btcAdd,
            existing.USDT + usdtAdd,
            existing.ETH + ethAdd
        );
    },

    // Get all users and their balances
    getAllUsersWithBalances() {
        const users = JSON.parse(localStorage.getItem('neuroWalletUsers') || '[]');
        const balances = JSON.parse(localStorage.getItem('neuroWalletUserBalances') || '{}');

        return users.map(user => ({
            ...user,
            balance: balances[user.email] || { BTC: 0, USDT: 0, ETH: 0 }
        }));
    },

    // Get transactions for a user
    getUserTransactions(email) {
        const emailLower = email.toLowerCase();
        const transactions = localStorage.getItem(`neuroWallet_transactions_${emailLower}`);
        return transactions ? JSON.parse(transactions) : [];
    },

    // Save transactions for a user
    saveUserTransactions(email, transactions) {
        const emailLower = email.toLowerCase();
        localStorage.setItem(`neuroWallet_transactions_${emailLower}`, JSON.stringify(transactions));
    },

    // Check if promo code was used
    isPromoCodeUsed(email) {
        const emailLower = email.toLowerCase();
        const promoData = localStorage.getItem(`neuroWallet_promo_${emailLower}`);
        return promoData ? JSON.parse(promoData).used : false;
    },

    // Mark promo code as used
    markPromoCodeUsed(email) {
        const emailLower = email.toLowerCase();
        localStorage.setItem(`neuroWallet_promo_${emailLower}`, JSON.stringify({ used: true, usedAt: new Date().toISOString() }));
    }
};

// ==================== ADMIN BALANCE MANAGER (EDITABLE/CUSTOMIZABLE) ====================
const AdminBalanceManager = {
    // Set a specific user's balance by email
    setUserBalance(userEmail, btcAmount = 0, usdtAmount = 0, ethAmount = 0) {
        return PersistentStorageManager.setUserBalance(userEmail, btcAmount, usdtAmount, ethAmount);
    },

    // Get a specific user's balance by email
    getUserBalance(userEmail) {
        return PersistentStorageManager.getUserBalance(userEmail);
    },

    // Reset a user's balance to default
    resetUserBalance(userEmail, defaultUSDT = 0) {
        return this.setUserBalance(userEmail, 0, defaultUSDT, 0);
    },

    // Get all users with their balances
    getAllUsersBalances() {
        const users = PersistentStorageManager.getAllUsersWithBalances();
        const balances = {};
        users.forEach(user => {
            balances[user.email] = user.balance;
        });
        console.log('📊 All users balances:', balances);
        return balances;
    },

    // Bulk set balance for multiple users
    setMultipleUsersBalance(balanceUpdates) {
        Object.entries(balanceUpdates).forEach(([email, amounts]) => {
            this.setUserBalance(email, amounts.BTC || 0, amounts.USDT || 0, amounts.ETH || 0);
        });
        console.log('✅ Multiple users balance updated');
    },

    // Add amount to existing user balance
    addToUserBalance(userEmail, btcAdd = 0, usdtAdd = 0, ethAdd = 0) {
        return PersistentStorageManager.addToUserBalance(userEmail, btcAdd, usdtAdd, ethAdd);
    }
};

// ==================== USAGE EXAMPLES (COPY & PASTE IN BROWSER CONSOLE) ====================
/*
// SET BALANCE FOR A SPECIFIC USER BY EMAIL
AdminBalanceManager.setUserBalance('user@example.com', 1, 5000, 2);

// GET BALANCE FOR A SPECIFIC USER
AdminBalanceManager.getUserBalance('user@example.com');

// RESET A USER'S BALANCE
AdminBalanceManager.resetUserBalance('user@example.com', 500);

// GET ALL USERS AND THEIR BALANCES
AdminBalanceManager.getAllUsersBalances();

// ADD AMOUNT TO EXISTING USER BALANCE
AdminBalanceManager.addToUserBalance('user@example.com', 0.5, 1000, 0);

// SET MULTIPLE USERS AT ONCE
AdminBalanceManager.setMultipleUsersBalance({
    'user1@example.com': { BTC: 1, USDT: 5000, ETH: 2 },
    'user2@example.com': { BTC: 0.5, USDT: 2500, ETH: 1 },
    'user3@example.com': { BTC: 2, USDT: 10000, ETH: 5 }
});

// VIEW ALL USERS
AdminBalanceManager.getAllUsersBalances();
*/

// ==================== PERSISTENT BALANCE MANAGER ====================
const BalanceManager = {
    // Save balance to persistent storage for current user
    saveBalance(balance) {
        if (!currentUser || !currentUser.email) {
            console.warn('⚠️ No user logged in. Cannot save balance.');
            return;
        }

        PersistentStorageManager.saveUserBalance(currentUser.email, balance);
    },

    // Restore balance from persistent storage
    restoreBalance() {
        if (!currentUser || !currentUser.email) {
            console.warn('⚠️ No user logged in. Cannot restore balance.');
            return null;
        }

        const balanceData = PersistentStorageManager.getUserBalance(currentUser.email);
        
        if (balanceData) {
            console.log('✅ Balance restored from storage:', balanceData);
            return {
                BTC: balanceData.BTC || 0,
                USDT: balanceData.USDT || 0,
                ETH: balanceData.ETH || 0
            };
        }

        return null;
    },

    // Update balance and save automatically
    updateAndSave(newBalance) {
        userBalance = { ...newBalance };
        this.saveBalance(userBalance);
        updateAllBalances();
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Initialize persistent storage
    PersistentStorageManager.initializeStorage();

    // Check if user is logged in
    const savedUser = localStorage.getItem('neuroWalletUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            
            // RESTORE BALANCE FROM PERSISTENT STORAGE
            const restoredBalance = BalanceManager.restoreBalance();
            if (restoredBalance) {
                userBalance = restoredBalance;
                console.log('✅ Balance restored for returning user:', userBalance);
            }
            
            // Restore transactions
            const savedTransactions = PersistentStorageManager.getUserTransactions(currentUser.email);
            transactions = savedTransactions || [];
            
            showDashboard();
        } catch (error) {
            console.error('❌ Error restoring user session:', error);
            localStorage.removeItem('neuroWalletUser');
            showLandingPage();
        }
    } else {
        showLandingPage();
    }

    // Event Listeners
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    if (signInBtn) signInBtn.addEventListener('click', () => openModal('loginModal'));
    if (signUpBtn) signUpBtn.addEventListener('click', () => openModal('signupModal'));
    
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnHeader = document.getElementById('logoutBtnHeader');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (logoutBtnHeader) logoutBtnHeader.addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Toggle sidebar on menu button click only
    const toggleBtn = document.getElementById('toggleSidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.getElementById('toggleSidebar');
        if (window.innerWidth <= 640) {
            if (sidebar && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Modal close on background click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// ==================== MODAL FUNCTIONS ====================
function openModal(modalId) {
    closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function switchModal(fromModal, toModal, e) {
    e.preventDefault();
    closeModal(fromModal);
    openModal(toModal);
}

// ==================== PAGE VISIBILITY ====================
function showLandingPage() {
    const landing = document.getElementById('landingPage');
    const dashboard = document.getElementById('dashboard');
    if (landing) landing.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
}

function showDashboard() {
    closeAllModals();
    const landing = document.getElementById('landingPage');
    const dashboard = document.getElementById('dashboard');
    if (landing) landing.style.display = 'none';
    if (dashboard) dashboard.style.display = 'flex';
    updateUserWelcome();
    updateAllBalances();
    navigateToPage('home');
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// ==================== AUTHENTICATION ====================
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.type = field.type === 'password' ? 'text' : 'password';
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const password = passwordInput ? passwordInput.value : '';

    // Clear errors
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');
    if (emailError) emailError.textContent = '';
    if (passwordError) passwordError.textContent = '';

    if (!email) {
        if (emailError) emailError.textContent = 'Email is required';
        return;
    }

    if (!password) {
        if (passwordError) passwordError.textContent = 'Password is required';
        return;
    }

    // Authenticate user using persistent storage
    const result = PersistentStorageManager.authenticateUser(email, password);

    if (!result.success) {
        if (result.message.includes('not found')) {
            if (emailError) emailError.textContent = result.message;
        } else {
            if (passwordError) passwordError.textContent = result.message;
        }
        return;
    }

    // Success - Login user
    currentUser = { fullName: result.user.fullName, email: result.user.email };
    localStorage.setItem('neuroWalletUser', JSON.stringify(currentUser));
    
    // RESTORE BALANCE FROM PERSISTENT STORAGE
    const restoredBalance = BalanceManager.restoreBalance();
    if (restoredBalance) {
        userBalance = restoredBalance;
        console.log('✅ Restored balance for existing user:', userBalance);
    } else {
        // First time login - set default balance
        userBalance = { BTC: 0, USDT: 0, ETH: 0 };
        BalanceManager.saveBalance(userBalance);
        console.log('✅ New balance initialized and saved');
    }
    
    // Restore transactions
    const savedTransactions = PersistentStorageManager.getUserTransactions(currentUser.email);
    transactions = savedTransactions || [];
    
    showDashboard();
    if (loginForm) loginForm.reset();
    showNotification(`Welcome back, ${currentUser.fullName}!`, 'success');
}

function handleSignup(e) {
    e.preventDefault();
    
    const fullNameInput = document.getElementById('fullName');
    const signupEmailInput = document.getElementById('signupEmail');
    const signupPasswordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    const fullName = fullNameInput ? fullNameInput.value.trim() : '';
    const email = signupEmailInput ? signupEmailInput.value.trim().toLowerCase() : '';
    const password = signupPasswordInput ? signupPasswordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

    // Clear errors
    const fullNameError = document.getElementById('fullNameError');
    const signupEmailError = document.getElementById('signupEmailError');
    const signupPasswordError = document.getElementById('signupPasswordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');

    if (fullNameError) fullNameError.textContent = '';
    if (signupEmailError) signupEmailError.textContent = '';
    if (signupPasswordError) signupPasswordError.textContent = '';
    if (confirmPasswordError) confirmPasswordError.textContent = '';

    // Validation
    if (!fullName) {
        if (fullNameError) fullNameError.textContent = 'Full name is required';
        return;
    }

    if (!email) {
        if (signupEmailError) signupEmailError.textContent = 'Email is required';
        return;
    }

    if (!password || password.length < 6) {
        if (signupPasswordError) signupPasswordError.textContent = 'Password must be at least 6 characters';
        return;
    }

    if (password !== confirmPassword) {
        if (confirmPasswordError) confirmPasswordError.textContent = 'Passwords do not match';
        return;
    }

    // Register user using persistent storage
    const result = PersistentStorageManager.registerUser(fullName, email, password);

    if (!result.success) {
        if (signupEmailError) signupEmailError.textContent = result.message;
        return;
    }

    // Auto-login
    currentUser = { fullName, email };
    localStorage.setItem('neuroWalletUser', JSON.stringify(currentUser));
    
    // Initialize and save balance
    userBalance = { BTC: 0, USDT: 0, ETH: 0 };
    BalanceManager.saveBalance(userBalance);
    
    transactions = [];
    PersistentStorageManager.saveUserTransactions(currentUser.email, transactions);
    
    showDashboard();
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.reset();
    showNotification(`Account created! Welcome, ${fullName}!`, 'success');
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Save balance and transactions before logout
        if (currentUser) {
            BalanceManager.saveBalance(userBalance);
            PersistentStorageManager.saveUserTransactions(currentUser.email, transactions);
        }
        
        localStorage.removeItem('neuroWalletUser');
        currentUser = null;
        userBalance = { BTC: 0, USDT: 0, ETH: 0 };
        transactions = [];
        
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
        
        showLandingPage();
        showNotification('You have been logged out', 'info');
    }
}

// ==================== DASHBOARD FUNCTIONS ====================
function updateUserWelcome() {
    const welcome = document.getElementById('userWelcome');
    if (welcome && currentUser) {
        welcome.textContent = `Hello, ${currentUser.fullName}`;
    }
}

function handleNavigation(e) {
    closeAllModals();
    const page = e.currentTarget.getAttribute('data-page');
    
    // Remove active from all
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active to clicked
    e.currentTarget.classList.add('active');

    // Close sidebar on mobile
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 640 && sidebar) {
        sidebar.classList.remove('open');
    }
    
    navigateToPage(page);
}

function navigateToPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Map page names to IDs
    const pageMap = {
        'home': 'homePage',
        'convert': 'convertPage',
        'staking': 'stakingPage',
        'transactions': 'transactionsPage',
        'transfer': 'transferPage',
        'promo': 'promoPage'
    };

    const pageId = pageMap[pageName];
    if (pageId) {
        const page = document.getElementById(pageId);
        if (page) page.classList.add('active');
    }

    // Update title
    const titleMap = {
        'home': 'Home',
        'convert': 'Convert Crypto',
        'staking': 'Staking',
        'transactions': 'Transactions',
        'transfer': 'Send Crypto',
        'promo': 'Promo Code'
    };

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titleMap[pageName] || 'Dashboard';
    }
}

function updateAllBalances() {
    // Card balances
    const btcDisplay = document.getElementById('btcDisplay');
    const btcUsdDisplay = document.getElementById('btcUsdDisplay');
    if (btcDisplay) btcDisplay.textContent = userBalance.BTC.toFixed(2) + ' BTC';
    if (btcUsdDisplay) btcUsdDisplay.textContent = '$' + (userBalance.BTC * btcPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    const usdtDisplay = document.getElementById('usdtDisplay');
    const usdtUsdDisplay = document.getElementById('usdtUsdDisplay');
    if (usdtDisplay) usdtDisplay.textContent = userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (usdtUsdDisplay) usdtUsdDisplay.textContent = '$' + (userBalance.USDT * usdtPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    const ethDisplay = document.getElementById('ethDisplay');
    const ethUsdDisplay = document.getElementById('ethUsdDisplay');
    if (ethDisplay) ethDisplay.textContent = userBalance.ETH.toFixed(2) + ' ETH';
    if (ethUsdDisplay) ethUsdDisplay.textContent = '$' + (userBalance.ETH * ethPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    // Total
    const totalUSD = (userBalance.BTC * btcPrice) + (userBalance.USDT * usdtPrice) + (userBalance.ETH * ethPrice);
    const totalUsdDisplay = document.getElementById('totalUsdDisplay');
    if (totalUsdDisplay) totalUsdDisplay.textContent = '$' + totalUSD.toLocaleString('en-US', {maximumFractionDigits: 2});

    // Table balances
    const btcSpot = document.getElementById('btcSpot');
    const btcAvail = document.getElementById('btcAvail');
    const btcVal = document.getElementById('btcVal');
    if (btcSpot) btcSpot.textContent = userBalance.BTC.toFixed(2) + ' BTC';
    if (btcAvail) btcAvail.textContent = userBalance.BTC.toFixed(2) + ' BTC';
    if (btcVal) btcVal.textContent = '$' + (userBalance.BTC * btcPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    const usdtSpot = document.getElementById('usdtSpot');
    const usdtAvail = document.getElementById('usdtAvail');
    const usdtVal = document.getElementById('usdtVal');
    if (usdtSpot) usdtSpot.textContent = userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (usdtAvail) usdtAvail.textContent = userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (usdtVal) usdtVal.textContent = '$' + (userBalance.USDT * usdtPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    const ethSpot = document.getElementById('ethSpot');
    const ethAvail = document.getElementById('ethAvail');
    const ethVal = document.getElementById('ethVal');
    if (ethSpot) ethSpot.textContent = userBalance.ETH.toFixed(2) + ' ETH';
    if (ethAvail) ethAvail.textContent = userBalance.ETH.toFixed(2) + ' ETH';
    if (ethVal) ethVal.textContent = '$' + (userBalance.ETH * ethPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    // Staking page
    const btcStakingAmount = document.getElementById('btcStakingAmount');
    const usdtStakingAmount = document.getElementById('usdtStakingAmount');
    const ethStakingAmount = document.getElementById('ethStakingAmount');
    if (btcStakingAmount) btcStakingAmount.textContent = 'Your Balance: ' + userBalance.BTC.toFixed(2) + ' BTC';
    if (usdtStakingAmount) usdtStakingAmount.textContent = 'Your Balance: ' + userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (ethStakingAmount) ethStakingAmount.textContent = 'Your Balance: ' + userBalance.ETH.toFixed(2) + ' ETH';

    // Withdraw coin balances
    const coinBalanceBTC = document.getElementById('coinBalanceBTC');
    const coinBalanceUSDT = document.getElementById('coinBalanceUSDT');
    const coinBalanceETH = document.getElementById('coinBalanceETH');
    if (coinBalanceBTC) coinBalanceBTC.textContent = userBalance.BTC.toFixed(2) + ' BTC';
    if (coinBalanceUSDT) coinBalanceUSDT.textContent = userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (coinBalanceETH) coinBalanceETH.textContent = userBalance.ETH.toFixed(2) + ' ETH';
}

// ==================== DEPOSIT FUNCTIONS ====================
function openDepositModal() {
    closeAllModals();
    const modal = document.getElementById('depositModal');
    if (modal) modal.style.display = 'flex';
}

function closeDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) modal.style.display = 'none';
}

function copyAddress() {
    const addressText = document.getElementById('depositAddressText');
    if (addressText) {
        const address = addressText.textContent;
        navigator.clipboard.writeText(address).then(() => {
            showNotification('Address copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy address', 'error');
        });
    }
}

// ==================== WITHDRAW FUNCTIONS ====================
function openWithdrawModal() {
    closeAllModals();
    const modal = document.getElementById('withdrawModal');
    if (modal) modal.style.display = 'flex';
    goToWithdrawStep(1);
}

function closeWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    if (modal) modal.style.display = 'none';
}

function goToWithdrawStep(step) {
    document.querySelectorAll('.withdraw-step').forEach(s => s.classList.remove('active'));
    const stepEl = document.getElementById(`withdrawStep${step}`);
    if (stepEl) stepEl.classList.add('active');

    const titles = {
        1: 'Select Withdrawal Method',
        2: 'Select Cryptocurrency',
        3: 'Enter Wallet Address',
        4: 'Confirm Withdrawal'
    };
    
    const titleEl = document.getElementById('withdrawModalTitle');
    if (titleEl) titleEl.textContent = titles[step];
}

function selectWithdrawMethod(method) {
    selectedWithdrawMethod = method;
    if (method === 'crypto') {
        goToWithdrawStep(2);
    } else {
        closeAllModals();
        showNotification('This withdrawal method is coming soon', 'info');
    }
}

function selectWithdrawCoin(coin) {
    selectedWithdrawCoin = coin;
    const titleEl = document.getElementById('selectedCoinTitle');
    const currencyEl = document.getElementById('withdrawCurrency');
    if (titleEl) titleEl.textContent = `${coin} WALLET ADDRESS`;
    if (currencyEl) currencyEl.textContent = coin;
    
    goToWithdrawStep(3);
}

function setMaxAmount() {
    const balances = {
        'BTC': userBalance.BTC,
        'USDT': userBalance.USDT,
        'ETH': userBalance.ETH
    };
    
    const maxAmount = balances[selectedWithdrawCoin] || 0;
    const amountInput = document.getElementById('withdrawAmount');
    if (amountInput) {
        amountInput.value = maxAmount;
        updateWithdrawDisplay();
    }
}

function updateWithdrawDisplay() {
    const amountInput = document.getElementById('withdrawAmount');
    if (!amountInput) return;
    
    const amount = parseFloat(amountInput.value) || 0;
    const prices = { 'BTC': btcPrice, 'USDT': usdtPrice, 'ETH': ethPrice };
    const price = prices[selectedWithdrawCoin] || 1;
    const fee = 0.001 * price;
    const receive = Math.max(0, amount - (fee / price));

    const feeEl = document.getElementById('networkFee');
    const totalFeeEl = document.getElementById('totalFee');
    const receiveEl = document.getElementById('finalReceiveAmount');
    
    if (feeEl) feeEl.textContent = `${(fee / price).toFixed(6)} ${selectedWithdrawCoin}`;
    if (totalFeeEl) totalFeeEl.textContent = `${(fee / price).toFixed(6)} ${selectedWithdrawCoin}`;
    if (receiveEl) receiveEl.textContent = `${receive.toFixed(6)} ${selectedWithdrawCoin}`;
}

function processWithdraw() {
    const amountInput = document.getElementById('withdrawAmount');
    const addressInput = document.getElementById('walletAddress');
    const networkSelect = document.getElementById('networkSelectWithdraw');

    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    const address = addressInput ? addressInput.value.trim() : '';
    const network = networkSelect ? networkSelect.value : '';

    if (!amount || !address || !network) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (userBalance[selectedWithdrawCoin] < amount) {
        showNotification('Insufficient balance', 'error');
        return;
    }

    // Process withdrawal
    userBalance[selectedWithdrawCoin] -= amount;
    BalanceManager.saveBalance(userBalance);
    updateAllBalances();
    addTransaction(`Withdrew ${amount.toFixed(6)} ${selectedWithdrawCoin}`, 'withdraw');
    
    closeAllModals();
    showNotification(`Successfully withdrew ${amount.toFixed(6)} ${selectedWithdrawCoin}`, 'success');
}

// ==================== ACTIVATION FUNCTIONS ====================
function showActivationModal() {
    closeAllModals();
    const modal = document.getElementById('activationModal');
    if (modal) modal.style.display = 'flex';
}

// ==================== CONVERT FUNCTIONS ====================
function updateConvertRate() {
    const fromCryptoSelect = document.getElementById('fromCrypto');
    const toCryptoSelect = document.getElementById('toCrypto');
    const convertAmountInput = document.getElementById('convertAmount');

    const fromCrypto = fromCryptoSelect ? fromCryptoSelect.value : 'BTC';
    const toCrypto = toCryptoSelect ? toCryptoSelect.value : 'USDT';
    const amount = convertAmountInput ? parseFloat(convertAmountInput.value) : 0;

    const prices = {
        'BTC': btcPrice,
        'ETH': ethPrice,
        'USDT': usdtPrice
    };

    const fromPrice = prices[fromCrypto];
    const toPrice = prices[toCrypto];
    const convertedAmount = (amount * fromPrice) / toPrice;

    const convertReceiveInput = document.getElementById('convertReceive');
    if (convertReceiveInput) convertReceiveInput.value = convertedAmount.toFixed(8);
}

function handleConvert() {
    const fromCryptoSelect = document.getElementById('fromCrypto');
    const toCryptoSelect = document.getElementById('toCrypto');
    const convertAmountInput = document.getElementById('convertAmount');

    const fromCrypto = fromCryptoSelect ? fromCryptoSelect.value : 'BTC';
    const toCrypto = toCryptoSelect ? toCryptoSelect.value : 'USDT';
    const amount = convertAmountInput ? parseFloat(convertAmountInput.value) : 0;

    if (!amount) {
        showNotification('Please enter an amount', 'error');
        return;
    }

    if (userBalance[fromCrypto] < amount) {
        showNotification(`Insufficient ${fromCrypto} balance`, 'error');
        return;
    }

    const prices = {
        'BTC': btcPrice,
        'ETH': ethPrice,
        'USDT': usdtPrice
    };

    const fromPrice = prices[fromCrypto];
    const toPrice = prices[toCrypto];
    const convertedAmount = (amount * fromPrice) / toPrice;

    // Process conversion
    userBalance[fromCrypto] -= amount;
    userBalance[toCrypto] += convertedAmount;
    BalanceManager.saveBalance(userBalance);
    updateAllBalances();
    addTransaction(`Converted ${amount.toFixed(6)} ${fromCrypto} to ${convertedAmount.toFixed(6)} ${toCrypto}`, 'convert');

    showNotification(`Successfully converted ${amount.toFixed(6)} ${fromCrypto} to ${convertedAmount.toFixed(6)} ${toCrypto}`, 'success');
    
    // Reset form
    if (convertAmountInput) convertAmountInput.value = '';
    const convertReceiveInput = document.getElementById('convertReceive');
    if (convertReceiveInput) convertReceiveInput.value = '';
}

// ==================== STAKING FUNCTIONS ====================
function openStakingModal(coin) {
    closeAllModals();
    showNotification(`Staking for ${coin} is coming soon!`, 'info');
}

// ==================== TRANSFER FUNCTIONS ====================
function handleTransferSubmit(e) {
    e.preventDefault();
    closeAllModals();
    showNotification('Transfer will be processed after KYC verification (56 hours)', 'warning');
    const transferForm = document.getElementById('transferForm');
    if (transferForm) transferForm.reset();
}

// ==================== PROMO CODE ====================
function applyPromoCode() {
    const promoInput = document.getElementById('promoCodeInput');
    const promoError = document.getElementById('promoError');
    
    if (!promoInput) return;
    
    const code = promoInput.value.trim().toUpperCase();
    if (promoError) promoError.textContent = '';

    if (!code) {
        if (promoError) promoError.textContent = 'Please enter a promo code';
        return;
    }

    // Check if promo code was already used
    if (PersistentStorageManager.isPromoCodeUsed(currentUser.email)) {
        if (promoError) promoError.textContent = 'This promo code has already been used';
        return;
    }

    if (code === PROMO_CODE) {
        // Apply reward
        userBalance.USDT += PROMO_REWARD_USDT;
        BalanceManager.saveBalance(userBalance);
        updateAllBalances();
        PersistentStorageManager.markPromoCodeUsed(currentUser.email);
        addTransaction(`Promo code applied: ${PROMO_REWARD_USDT.toLocaleString()} USDT`, 'promo');
        
        // Clear and close
        promoInput.value = '';
        if (promoError) promoError.textContent = '';
        showNotification(`✨ Promo code applied! You received $${PROMO_REWARD_USDT.toLocaleString()} USDT`, 'success');
        
        // Auto navigate to home
        setTimeout(() => {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            const homeNav = document.querySelector('.nav-item[data-page="home"]');
            if (homeNav) homeNav.classList.add('active');
            navigateToPage('home');
        }, 1500);
    } else {
        if (promoError) promoError.textContent = 'Invalid promo code';
    }
}

// ==================== TRANSACTION HISTORY ====================
function addTransaction(description, type) {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    transactions.push({
        description,
        type,
        time: timeString,
        date: now.toLocaleDateString()
    });

    // Save transactions to persistent storage
    if (currentUser && currentUser.email) {
        PersistentStorageManager.saveUserTransactions(currentUser.email, transactions);
    }

    updateTransactionsList();
}

function updateTransactionsList() {
    const listEl = document.getElementById('transactionsList');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (transactions.length === 0) {
        listEl.innerHTML = `
            <div class="transaction-item">
                <div class="transaction-icon">📝</div>
                <div class="transaction-details">
                    <p class="transaction-name">Account Created</p>
                    <p class="transaction-date">Today</p>
                </div>
                <div class="transaction-amount">Welcome</div>
            </div>
        `;
        return;
    }

    transactions.forEach((tx) => {
        const icon = tx.type === 'deposit' ? '📥' : tx.type === 'withdraw' ? '📤' : tx.type === 'convert' ? '🔄' : '🎁';
        const html = `
            <div class="transaction-item">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <p class="transaction-name">${tx.description}</p>
                    <p class="transaction-date">${tx.date} at ${tx.time}</p>
                </div>
                <div class="transaction-amount">${tx.type}</div>
            </div>
        `;
        listEl.innerHTML += html;
    });
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
        max-width: 400px;
        word-wrap: break-word;
    `;

    if (type === 'success') {
        notification.style.backgroundColor = '#10b981';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#ef4444';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#f59e0b';
    } else {
        notification.style.backgroundColor = '#00d4ff';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
