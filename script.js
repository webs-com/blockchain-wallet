// ==================== GOOGLE SHEETS API CONFIGURATION ====================
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxCGmc6pxkBDUFQBKcIB7nk0sf0AhyfCxosT_WFY91dSe73gfL7Czk_Pty7B-w22X0BSQ/exec"; // Replace with your Google Apps Script URL

// ==================== NEURO WALLET CONSTANTS ====================
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

// ==================== CRYPTO DISPLAY SYSTEM ====================
const CryptoDisplay = {
    symbols: {
        BTC: '₿',
        ETH: 'Ξ',
        USDT: '₮'
    },
    
    colors: {
        BTC: '#F7931A',
        ETH: '#627EEA',
        USDT: '#26A17B'
    },
    
    names: {
        BTC: 'Bitcoin',
        ETH: 'Ethereum',
        USDT: 'Tether'
    },
    
    getSymbol(coin) {
        return this.symbols[coin] || '💱';
    },
    
    getColor(coin) {
        return this.colors[coin] || '#00d4ff';
    },
    
    getName(coin) {
        return this.names[coin] || coin;
    }
};

// ==================== GOOGLE SHEETS API WRAPPER ====================
const GoogleSheetsAPI = {
    async call(action, data = {}) {
        try {
            const payload = {
                action: action,
                ...data
            };

            const response = await fetch(SHEET_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log(`✅ ${action}:`, result);
            return result;
        } catch (error) {
            console.error(`❌ ${action} failed:`, error);
            return { success: false, error: error.message };
        }
    }
};

// ==================== USER MANAGER ====================
const UserManager = {
    async registerUser(fullName, email, password) {
        return await GoogleSheetsAPI.call('registerUser', {
            fullName: fullName,
            email: email.toLowerCase(),
            password: password
        });
    },

    async loginUser(email, password) {
        return await GoogleSheetsAPI.call('loginUser', {
            email: email.toLowerCase(),
            password: password
        });
    },

    async getAllUsers() {
        return await GoogleSheetsAPI.call('getAllUsers');
    }
};

// ==================== BALANCE MANAGER ====================
const BalanceManager = {
    async getUserBalance(email) {
        return await GoogleSheetsAPI.call('getUserBalance', {
            email: email.toLowerCase()
        });
    },

    async saveUserBalance(email, balance) {
        return await GoogleSheetsAPI.call('saveUserBalance', {
            email: email.toLowerCase(),
            balance: balance
        });
    },

    async addToBalance(email, btcAdd = 0, usdtAdd = 0, ethAdd = 0) {
        const result = await this.getUserBalance(email);
        if (result.success) {
            const newBalance = {
                BTC: (result.balance.BTC || 0) + btcAdd,
                USDT: (result.balance.USDT || 0) + usdtAdd,
                ETH: (result.balance.ETH || 0) + ethAdd
            };
            return await this.saveUserBalance(email, newBalance);
        }
        return result;
    },

    async setBalance(email, btc = 0, usdt = 0, eth = 0) {
        return await this.saveUserBalance(email, {
            BTC: btc,
            USDT: usdt,
            ETH: eth
        });
    }
};

// ==================== TRANSACTION MANAGER ====================
const TransactionManager = {
    async getUserTransactions(email) {
        return await GoogleSheetsAPI.call('getUserTransactions', {
            email: email.toLowerCase()
        });
    },

    async addTransaction(email, description, type) {
        return await GoogleSheetsAPI.call('addTransaction', {
            email: email.toLowerCase(),
            description: description,
            type: type
        });
    }
};

// ==================== PROMO MANAGER ====================
const PromoManager = {
    async isPromoUsed(email) {
        return await GoogleSheetsAPI.call('isPromoUsed', {
            email: email.toLowerCase()
        });
    },

    async markPromoUsed(email) {
        return await GoogleSheetsAPI.call('markPromoUsed', {
            email: email.toLowerCase()
        });
    }
};

// ==================== ADMIN CONSOLE ====================
window.AdminDashboard = {
    async showAllUsers() {
        const result = await UserManager.getAllUsers();
        if (result.success) {
            console.table(result.users);
            return result.users;
        }
    },

    async setUserBalance(email, btc, usdt, eth) {
        const result = await BalanceManager.setBalance(email, btc, usdt, eth);
        console.log(`✅ Balance set for ${email}:`, result);
        if (currentUser && currentUser.email === email.toLowerCase()) {
            userBalance = { BTC: btc, USDT: usdt, ETH: eth };
            updateAllBalances();
        }
        return result;
    },

    async addToUserBalance(email, btc, usdt, eth) {
        const result = await BalanceManager.addToBalance(email, btc, usdt, eth);
        console.log(`✅ Balance updated for ${email}:`, result);
        if (currentUser && currentUser.email === email.toLowerCase()) {
            userBalance = result.balance;
            updateAllBalances();
        }
        return result;
    },

    async viewTransactions(email) {
        const result = await TransactionManager.getUserTransactions(email);
        if (result.success) {
            console.table(result.transactions);
            return result.transactions;
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('🚀 Initializing NeuroWallet Application...');
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('neuroWalletUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('✅ User session found:', currentUser);
            
            // Restore balance from Google Sheets
            const balanceResult = await BalanceManager.getUserBalance(currentUser.email);
            if (balanceResult.success) {
                userBalance = balanceResult.balance;
                console.log('✅ Balance restored:', userBalance);
            }
            
            // Restore transactions from Google Sheets
            const transactionsResult = await TransactionManager.getUserTransactions(currentUser.email);
            if (transactionsResult.success) {
                transactions = transactionsResult.transactions || [];
                console.log('✅ Transactions restored:', transactions);
            }
            
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

    // Toggle sidebar
    const toggleBtn = document.getElementById('toggleSidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Close sidebar when clicking outside
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

    console.log('✅ Initialization complete');
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

async function handleLogin(e) {
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

    showNotification('⏳ Logging in...', 'info');

    // Login user
    const result = await UserManager.loginUser(email, password);

    if (!result.success) {
        if (result.message.includes('not found')) {
            if (emailError) emailError.textContent = result.message;
        } else {
            if (passwordError) passwordError.textContent = result.message;
        }
        return;
    }

    // Set current user
    currentUser = { fullName: result.user.fullName, email: result.user.email };
    localStorage.setItem('neuroWalletUser', JSON.stringify(currentUser));
    
    // Restore balance from Google Sheets
    const balanceResult = await BalanceManager.getUserBalance(email);
    if (balanceResult.success) {
        userBalance = balanceResult.balance;
    }
    
    // Restore transactions from Google Sheets
    const transactionsResult = await TransactionManager.getUserTransactions(email);
    if (transactionsResult.success) {
        transactions = transactionsResult.transactions || [];
    }
    
    showDashboard();
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    showNotification(`✅ Welcome back, ${currentUser.fullName}!`, 'success');
}

async function handleSignup(e) {
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

    showNotification('⏳ Creating account...', 'info');

    // Register user
    const result = await UserManager.registerUser(fullName, email, password);

    if (!result.success) {
        if (signupEmailError) signupEmailError.textContent = result.message;
        return;
    }

    // Auto-login
    currentUser = { fullName, email };
    localStorage.setItem('neuroWalletUser', JSON.stringify(currentUser));
    
    userBalance = { BTC: 0, USDT: 0, ETH: 0 };
    transactions = [];
    
    showDashboard();
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.reset();
    showNotification(`✅ Account created! Welcome, ${fullName}!`, 'success');
}

async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Save data before logout
        if (currentUser) {
            await BalanceManager.saveUserBalance(currentUser.email, userBalance);
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
        showNotification('✅ You have been logged out', 'info');
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
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    e.currentTarget.classList.add('active');

    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 640 && sidebar) {
        sidebar.classList.remove('open');
    }
    
    navigateToPage(page);
}

function navigateToPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

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
    if (btcDisplay) btcDisplay.textContent = (userBalance.BTC || 0).toFixed(2) + ' BTC';
    if (btcUsdDisplay) btcUsdDisplay.textContent = '$' + ((userBalance.BTC || 0) * btcPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    const usdtDisplay = document.getElementById('usdtDisplay');
    const usdtUsdDisplay = document.getElementById('usdtUsdDisplay');
    if (usdtDisplay) usdtDisplay.textContent = (userBalance.USDT || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (usdtUsdDisplay) usdtUsdDisplay.textContent = '$' + ((userBalance.USDT || 0) * usdtPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    const ethDisplay = document.getElementById('ethDisplay');
    const ethUsdDisplay = document.getElementById('ethUsdDisplay');
    if (ethDisplay) ethDisplay.textContent = (userBalance.ETH || 0).toFixed(2) + ' ETH';
    if (ethUsdDisplay) ethUsdDisplay.textContent = '$' + ((userBalance.ETH || 0) * ethPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    // Total
    const totalUSD = ((userBalance.BTC || 0) * btcPrice) + ((userBalance.USDT || 0) * usdtPrice) + ((userBalance.ETH || 0) * ethPrice);
    const totalUsdDisplay = document.getElementById('totalUsdDisplay');
    if (totalUsdDisplay) totalUsdDisplay.textContent = '$' + totalUSD.toLocaleString('en-US', {maximumFractionDigits: 2});

    // Table balances
    const btcSpot = document.getElementById('btcSpot');
    const btcAvail = document.getElementById('btcAvail');
    const btcVal = document.getElementById('btcVal');
    if (btcSpot) btcSpot.textContent = (userBalance.BTC || 0).toFixed(2) + ' BTC';
    if (btcAvail) btcAvail.textContent = (userBalance.BTC || 0).toFixed(2) + ' BTC';
    if (btcVal) btcVal.textContent = '$' + ((userBalance.BTC || 0) * btcPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    const usdtSpot = document.getElementById('usdtSpot');
    const usdtAvail = document.getElementById('usdtAvail');
    const usdtVal = document.getElementById('usdtVal');
    if (usdtSpot) usdtSpot.textContent = (userBalance.USDT || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (usdtAvail) usdtAvail.textContent = (userBalance.USDT || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (usdtVal) usdtVal.textContent = '$' + ((userBalance.USDT || 0) * usdtPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    const ethSpot = document.getElementById('ethSpot');
    const ethAvail = document.getElementById('ethAvail');
    const ethVal = document.getElementById('ethVal');
    if (ethSpot) ethSpot.textContent = (userBalance.ETH || 0).toFixed(2) + ' ETH';
    if (ethAvail) ethAvail.textContent = (userBalance.ETH || 0).toFixed(2) + ' ETH';
    if (ethVal) ethVal.textContent = '$' + ((userBalance.ETH || 0) * ethPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    // Staking page
    const btcStakingAmount = document.getElementById('btcStakingAmount');
    const usdtStakingAmount = document.getElementById('usdtStakingAmount');
    const ethStakingAmount = document.getElementById('ethStakingAmount');
    if (btcStakingAmount) btcStakingAmount.textContent = 'Your Balance: ' + (userBalance.BTC || 0).toFixed(2) + ' BTC';
    if (usdtStakingAmount) usdtStakingAmount.textContent = 'Your Balance: ' + (userBalance.USDT || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (ethStakingAmount) ethStakingAmount.textContent = 'Your Balance: ' + (userBalance.ETH || 0).toFixed(2) + ' ETH';

    // Withdraw coin balances
    const coinBalanceBTC = document.getElementById('coinBalanceBTC');
    const coinBalanceUSDT = document.getElementById('coinBalanceUSDT');
    const coinBalanceETH = document.getElementById('coinBalanceETH');
    if (coinBalanceBTC) coinBalanceBTC.textContent = (userBalance.BTC || 0).toFixed(8) + ' BTC';
    if (coinBalanceUSDT) coinBalanceUSDT.textContent = (userBalance.USDT || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    if (coinBalanceETH) coinBalanceETH.textContent = (userBalance.ETH || 0).toFixed(8) + ' ETH';
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
            showNotification('📋 Address copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy address', 'error');
        });
    }
}

// ==================== WITHDRAW FUNCTIONS ====================
function openWithdrawModal() {
    console.log('🔓 Opening withdraw modal');
    closeAllModals();
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.style.display = 'flex';
        goToWithdrawStep(1);
    }
}

function closeWithdrawModal() {
    console.log('🔒 Closing withdraw modal');
    const modal = document.getElementById('withdrawModal');
    if (modal) modal.style.display = 'none';
}

function goToWithdrawStep(step) {
    console.log(`📍 Going to withdraw step ${step}`);
    
    // Hide all steps
    const steps = document.querySelectorAll('.withdraw-step');
    steps.forEach(s => s.classList.remove('active'));
    
    // Show current step
    const currentStep = document.getElementById(`withdrawStep${step}`);
    if (currentStep) {
        currentStep.classList.add('active');
    }

    // Update title
    const titles = {
        1: 'Select Withdrawal Method',
        2: 'Select Cryptocurrency',
        3: 'Enter Wallet Address',
        4: 'Withdrawal Complete'
    };
    
    const titleEl = document.getElementById('withdrawModalTitle');
    if (titleEl) titleEl.textContent = titles[step];
}

function selectWithdrawMethod(method) {
    console.log(`✅ Selected method: ${method}`);
    selectedWithdrawMethod = method;
    
    if (method === 'crypto') {
        console.log('🔗 Crypto wallet selected');
        goToWithdrawStep(2);
    } else if (method === 'card') {
        console.log('💳 Card selected');
        closeWithdrawModal();
        showActivationModal();
    } else if (method === 'bank') {
        console.log('🏦 Bank transfer selected');
        closeWithdrawModal();
        showActivationModal();
    }
}

function selectWithdrawCoin(coin) {
    console.log(`💰 Selected coin: ${coin}`);
    selectedWithdrawCoin = coin;
    
    // Update title
    const titleEl = document.getElementById('selectedCoinTitle');
    if (titleEl) titleEl.textContent = `${coin} WALLET ADDRESS`;
    
    // Update currency display
    const currencyEl = document.getElementById('withdrawCurrency');
    if (currencyEl) currencyEl.textContent = coin;
    
    // Clear inputs
    const amountInput = document.getElementById('withdrawAmount');
    const addressInput = document.getElementById('walletAddress');
    if (amountInput) amountInput.value = '';
    if (addressInput) addressInput.value = '';
    
    // Clear fees
    updateWithdrawDisplay();
    
    goToWithdrawStep(3);
}

function setMaxAmount() {
    console.log(`📊 Setting max amount for ${selectedWithdrawCoin}`);
    
    const balances = {
        'BTC': userBalance.BTC || 0,
        'USDT': userBalance.USDT || 0,
        'ETH': userBalance.ETH || 0
    };
    
    const maxAmount = balances[selectedWithdrawCoin] || 0;
    const amountInput = document.getElementById('withdrawAmount');
    
    if (amountInput) {
        amountInput.value = maxAmount.toFixed(8);
        updateWithdrawDisplay();
    }
}

function updateWithdrawDisplay() {
    const amountInput = document.getElementById('withdrawAmount');
    if (!amountInput) return;
    
    const amount = parseFloat(amountInput.value) || 0;
    
    // Calculate 0.1% network fee
    const networkFeePercent = 0.001;
    const fee = amount * networkFeePercent;
    const receive = Math.max(0, amount - fee);

    // Update display
    const feeEl = document.getElementById('networkFee');
    const receiveEl = document.getElementById('finalReceiveAmount');
    
    if (feeEl) feeEl.textContent = `${fee.toFixed(8)} ${selectedWithdrawCoin}`;
    if (receiveEl) receiveEl.textContent = `${receive.toFixed(8)} ${selectedWithdrawCoin}`;
}

async function processWithdraw() {
    console.log('🚀 Processing withdrawal');
    
    const amountInput = document.getElementById('withdrawAmount');
    const addressInput = document.getElementById('walletAddress');
    const networkSelect = document.getElementById('networkSelectWithdraw');

    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    const address = addressInput ? addressInput.value.trim() : '';
    const network = networkSelect ? networkSelect.value : '';

    // Validation
    if (!amount || amount <= 0) {
        showNotification('❌ Please enter a valid amount', 'error');
        return;
    }

    if (!address) {
        showNotification('❌ Please enter a wallet address', 'error');
        return;
    }

    if (!network) {
        showNotification('❌ Please select a network', 'error');
        return;
    }

    // Check balance
    const currentBalance = userBalance[selectedWithdrawCoin] || 0;
    if (currentBalance < amount) {
        showNotification(`❌ Insufficient balance. You have ${currentBalance.toFixed(8)} ${selectedWithdrawCoin}`, 'error');
        return;
    }

    showNotification('⏳ Processing withdrawal...', 'info');

    try {
        // Deduct from balance
        userBalance[selectedWithdrawCoin] -= amount;
        
        // Save to Google Sheets
        await BalanceManager.saveUserBalance(currentUser.email, userBalance);
        updateAllBalances();
        
        // Add transaction
        await TransactionManager.addTransaction(
            currentUser.email, 
            `Withdrew ${amount.toFixed(8)} ${selectedWithdrawCoin} to ${address.substring(0, 15)}... (${network})`, 
            'withdraw'
        );
        
        // Reload transactions
        const transactionsResult = await TransactionManager.getUserTransactions(currentUser.email);
        if (transactionsResult.success) {
            transactions = transactionsResult.transactions || [];
            updateTransactionsList();
        }
        
        // Show success
        goToWithdrawStep(4);
        showNotification(`✅ Withdrawal of ${amount.toFixed(8)} ${selectedWithdrawCoin} completed!`, 'success');
        
        // Close after 3 seconds
        setTimeout(() => {
            closeWithdrawModal();
            goToWithdrawStep(1);
        }, 3000);
        
    } catch (error) {
        console.error('❌ Withdrawal error:', error);
        showNotification('❌ Withdrawal failed. Please try again.', 'error');
    }
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

async function handleConvert() {
    const fromCryptoSelect = document.getElementById('fromCrypto');
    const toCryptoSelect = document.getElementById('toCrypto');
    const convertAmountInput = document.getElementById('convertAmount');

    const fromCrypto = fromCryptoSelect ? fromCryptoSelect.value : 'BTC';
    const toCrypto = toCryptoSelect ? toCryptoSelect.value : 'USDT';
    const amount = convertAmountInput ? parseFloat(convertAmountInput.value) : 0;

    if (!amount) {
        showNotification('❌ Please enter an amount', 'error');
        return;
    }

    if (userBalance[fromCrypto] < amount) {
        showNotification(`❌ Insufficient ${fromCrypto} balance`, 'error');
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
    await BalanceManager.saveUserBalance(currentUser.email, userBalance);
    updateAllBalances();
    
    await TransactionManager.addTransaction(currentUser.email, `Converted ${amount.toFixed(6)} ${fromCrypto} to ${convertedAmount.toFixed(6)} ${toCrypto}`, 'convert');
    
    // Reload transactions
    const transactionsResult = await TransactionManager.getUserTransactions(currentUser.email);
    if (transactionsResult.success) {
        transactions = transactionsResult.transactions || [];
        updateTransactionsList();
    }

    showNotification(`✅ Successfully converted ${amount.toFixed(6)} ${fromCrypto} to ${convertedAmount.toFixed(6)} ${toCrypto}`, 'success');
    
    // Reset form
    if (convertAmountInput) convertAmountInput.value = '';
    const convertReceiveInput = document.getElementById('convertReceive');
    if (convertReceiveInput) convertReceiveInput.value = '';
}

// ==================== STAKING FUNCTIONS ====================
function openStakingModal(coin) {
    closeAllModals();
    showNotification(`📈 Staking for ${coin} is coming soon!`, 'info');
}

// ==================== TRANSFER FUNCTIONS ====================
function handleTransferSubmit(e) {
    e.preventDefault();
    closeAllModals();
    showNotification('⏳ Transfer will be processed after KYC verification (56 hours)', 'warning');
    const transferForm = document.getElementById('transferForm');
    if (transferForm) transferForm.reset();
}

// ==================== PROMO CODE ====================
async function applyPromoCode() {
    const promoInput = document.getElementById('promoCodeInput');
    const promoError = document.getElementById('promoError');
    
    if (!promoInput) return;
    
    const code = promoInput.value.trim().toUpperCase();
    if (promoError) promoError.textContent = '';

    if (!code) {
        if (promoError) promoError.textContent = 'Please enter a promo code';
        return;
    }

    // Check if promo already used
    const promoCheck = await PromoManager.isPromoUsed(currentUser.email);
    if (promoCheck.success && promoCheck.used) {
        if (promoError) promoError.textContent = '⚠️ This promo code has already been used';
        return;
    }

    if (code === PROMO_CODE) {
        // Apply reward
        userBalance.USDT += PROMO_REWARD_USDT;
        await BalanceManager.saveUserBalance(currentUser.email, userBalance);
        updateAllBalances();
        await PromoManager.markPromoUsed(currentUser.email);
        
        await TransactionManager.addTransaction(currentUser.email, `Promo code applied: ${PROMO_REWARD_USDT.toLocaleString()} USDT`, 'promo');
        
        // Reload transactions
        const transactionsResult = await TransactionManager.getUserTransactions(currentUser.email);
        if (transactionsResult.success) {
            transactions = transactionsResult.transactions || [];
            updateTransactionsList();
        }
        
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
        if (promoError) promoError.textContent = '❌ Invalid promo code';
    }
}

// ==================== TRANSACTION HISTORY ====================
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