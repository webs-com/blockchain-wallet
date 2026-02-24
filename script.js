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

// ==================== ADMIN BALANCE MANAGER (EDITABLE/CUSTOMIZABLE) ====================
// USE THIS BLOCK TO ASSIGN/LOAD ANY USER'S BALANCE BY EMAIL
const AdminBalanceManager = {
    // Set a specific user's balance by email
    setUserBalance(userEmail, btcAmount = 0, usdtAmount = 0, ethAmount = 0) {
        const balanceData = {
            BTC: btcAmount,
            USDT: usdtAmount,
            ETH: ethAmount,
            lastUpdated: new Date().toISOString()
        };

        localStorage.setItem(`neuroWallet_balance_${userEmail.toLowerCase()}`, JSON.stringify(balanceData));
        console.log(`✅ Balance set for ${userEmail}:`, balanceData);
        return balanceData;
    },

    // Get a specific user's balance by email
    getUserBalance(userEmail) {
        const storedData = localStorage.getItem(`neuroWallet_balance_${userEmail.toLowerCase()}`);
        
        if (storedData) {
            try {
                const balanceData = JSON.parse(storedData);
                console.log(`✅ Balance retrieved for ${userEmail}:`, balanceData);
                return balanceData;
            } catch (error) {
                console.error('❌ Error parsing balance:', error);
                return null;
            }
        }
        
        console.warn(`⚠️ No balance found for ${userEmail}`);
        return null;
    },

    // Reset a user's balance to default
    resetUserBalance(userEmail, defaultUSDT = 0) {
        return this.setUserBalance(userEmail, 0, defaultUSDT, 0);
    },

    // Get all users with their balances
    getAllUsersBalances() {
        const users = JSON.parse(localStorage.getItem('neuroWalletUsers') || '[]');
        const balances = {};

        users.forEach(user => {
            const balance = this.getUserBalance(user.email);
            balances[user.email] = balance || { BTC: 0, USDT: 0, ETH: 0 };
        });

        console.log('📊 All users balances:', balances);
        return balances;
    },

    // Bulk set balance for multiple users
    setMultipleUsersBalance(balanceUpdates) {
        // balanceUpdates format: { 'email@example.com': { BTC: 1, USDT: 500, ETH: 2 }, ... }
        Object.entries(balanceUpdates).forEach(([email, amounts]) => {
            this.setUserBalance(email, amounts.BTC || 0, amounts.USDT || 0, amounts.ETH || 0);
        });
        console.log('✅ Multiple users balance updated');
    },

    // Add amount to existing user balance
    addToUserBalance(userEmail, btcAdd = 0, usdtAdd = 0, ethAdd = 0) {
        const existing = this.getUserBalance(userEmail) || { BTC: 0, USDT: 0, ETH: 0 };
        return this.setUserBalance(
            userEmail,
            existing.BTC + btcAdd,
            existing.USDT + usdtAdd,
            existing.ETH + ethAdd
        );
    }
};

// ==================== USAGE EXAMPLES (COPY & PASTE THESE IN BROWSER CONSOLE) ====================
/*
// SET BALANCE FOR A SPECIFIC USER BY EMAIL
AdminBalanceManager.setUserBalance('user@example.com', 1, 5000, 2);
// Result: Sets BTC=1, USDT=5000, ETH=2 for user@example.com

// GET BALANCE FOR A SPECIFIC USER
AdminBalanceManager.getUserBalance('user@example.com');

// RESET A USER'S BALANCE
AdminBalanceManager.resetUserBalance('user@example.com', 500);
// Result: Sets BTC=0, USDT=500, ETH=0

// GET ALL USERS AND THEIR BALANCES
AdminBalanceManager.getAllUsersBalances();

// ADD AMOUNT TO EXISTING USER BALANCE
AdminBalanceManager.addToUserBalance('user@example.com', 0.5, 1000, 0);
// Result: Adds 0.5 BTC, 1000 USDT, 0 ETH to existing balance

// SET MULTIPLE USERS AT ONCE
AdminBalanceManager.setMultipleUsersBalance({
    'user1@example.com': { BTC: 1, USDT: 5000, ETH: 2 },
    'user2@example.com': { BTC: 0.5, USDT: 2500, ETH: 1 },
    'user3@example.com': { BTC: 2, USDT: 10000, ETH: 5 }
});
*/

// ==================== PERSISTENT BALANCE MANAGER ====================
const BalanceManager = {
    // Save balance to localStorage for current user
    saveBalance(balance) {
        if (!currentUser || !currentUser.email) {
            console.warn('⚠️ No user logged in. Cannot save balance.');
            return;
        }

        const balanceData = {
            BTC: balance.BTC,
            USDT: balance.USDT,
            ETH: balance.ETH,
            lastUpdated: new Date().toISOString()
        };

        localStorage.setItem(`neuroWallet_balance_${currentUser.email}`, JSON.stringify(balanceData));
        console.log('✅ Balance saved to localStorage:', balanceData);
    },

    // Restore balance from localStorage
    restoreBalance() {
        if (!currentUser || !currentUser.email) {
            console.warn('⚠️ No user logged in. Cannot restore balance.');
            return null;
        }

        const storedData = localStorage.getItem(`neuroWallet_balance_${currentUser.email}`);
        
        if (storedData) {
            try {
                const balanceData = JSON.parse(storedData);
                console.log('✅ Balance restored from localStorage:', balanceData);
                return {
                    BTC: balanceData.BTC || 0,
                    USDT: balanceData.USDT || 0,
                    ETH: balanceData.ETH || 0
                };
            } catch (error) {
                console.error('❌ Error parsing stored balance:', error);
                return null;
            }
        }

        return null;
    },

    // Clear balance from localStorage (on logout)
    clearBalance() {
        if (currentUser && currentUser.email) {
            localStorage.removeItem(`neuroWallet_balance_${currentUser.email}`);
            console.log('✅ Balance cleared from localStorage');
        }
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
    // Check if user is logged in
    const savedUser = localStorage.getItem('neuroWalletUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        // RESTORE BALANCE FROM STORAGE
        const restoredBalance = BalanceManager.restoreBalance();
        if (restoredBalance) {
            userBalance = restoredBalance;
        }
        
        showDashboard();
    } else {
        showLandingPage();
    }

    // Event Listeners
    document.getElementById('signInBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('signUpBtn').addEventListener('click', () => openModal('signupModal'));
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('logoutBtnHeader').addEventListener('click', handleLogout);

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
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
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
    document.getElementById('landingPage').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
    closeAllModals();
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
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
    
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    // Clear errors
    document.getElementById('loginEmailError').textContent = '';
    document.getElementById('loginPasswordError').textContent = '';

    if (!email) {
        document.getElementById('loginEmailError').textContent = 'Email is required';
        return;
    }

    if (!password) {
        document.getElementById('loginPasswordError').textContent = 'Password is required';
        return;
    }

    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('neuroWalletUsers') || '[]');
    const user = users.find(u => u.email === email);

    if (!user) {
        document.getElementById('loginEmailError').textContent = 'User not found';
        return;
    }

    if (user.password !== password) {
        document.getElementById('loginPasswordError').textContent = 'Invalid password';
        return;
    }

    // Success
    currentUser = { fullName: user.fullName, email: user.email };
    localStorage.setItem('neuroWalletUser', JSON.stringify(currentUser));
    
    // RESTORE BALANCE FROM STORAGE OR SET DEFAULT
    const restoredBalance = BalanceManager.restoreBalance();
    if (restoredBalance) {
        userBalance = restoredBalance;
        console.log('✅ Restored balance for returning user:', userBalance);
    } else {
        // First time login - set default balance
        userBalance = { BTC: 0, USDT: 0, ETH: 0 };
        BalanceManager.saveBalance(userBalance);
        console.log('✅ New user balance initialized and saved');
    }
    
    // Restore transactions
    const savedTransactions = localStorage.getItem(`neuroWallet_transactions_${currentUser.email}`);
    transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
    
    showDashboard();
    document.getElementById('loginForm').reset();
    showNotification(`Welcome back, ${currentUser.fullName}!`, 'success');
}

function handleSignup(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Clear errors
    document.getElementById('fullNameError').textContent = '';
    document.getElementById('signupEmailError').textContent = '';
    document.getElementById('signupPasswordError').textContent = '';
    document.getElementById('confirmPasswordError').textContent = '';

    // Validation
    if (!fullName) {
        document.getElementById('fullNameError').textContent = 'Full name is required';
        return;
    }

    if (!email) {
        document.getElementById('signupEmailError').textContent = 'Email is required';
        return;
    }

    if (!password || password.length < 6) {
        document.getElementById('signupPasswordError').textContent = 'Password must be at least 6 characters';
        return;
    }

    if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
        return;
    }

    // Check if email exists
    const users = JSON.parse(localStorage.getItem('neuroWalletUsers') || '[]');
    if (users.find(u => u.email === email)) {
        document.getElementById('signupEmailError').textContent = 'Email already registered';
        return;
    }

    // Create user
    const newUser = { fullName, email, password };
    users.push(newUser);
    localStorage.setItem('neuroWalletUsers', JSON.stringify(users));

    // Auto-login
    currentUser = { fullName, email };
    localStorage.setItem('neuroWalletUser', JSON.stringify(currentUser));
    
    // Initialize and save balance
    userBalance = { BTC: 0, USDT: 0, ETH: 0 };
    BalanceManager.saveBalance(userBalance);
    
    transactions = [];
    
    showDashboard();
    document.getElementById('signupForm').reset();
    showNotification(`Account created! Welcome, ${fullName}!`, 'success');
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Save balance before logout
        if (currentUser) {
            BalanceManager.saveBalance(userBalance);
            // Save transactions
            localStorage.setItem(`neuroWallet_transactions_${currentUser.email}`, JSON.stringify(transactions));
        }
        
        localStorage.removeItem('neuroWalletUser');
        currentUser = null;
        userBalance = { BTC: 0, USDT: 0, ETH: 0 };
        transactions = [];
        document.getElementById('loginForm').reset();
        document.getElementById('signupForm').reset();
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
    document.getElementById('btcDisplay').textContent = userBalance.BTC.toFixed(2) + ' BTC';
    document.getElementById('btcUsdDisplay').textContent = '$' + (userBalance.BTC * btcPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    document.getElementById('usdtDisplay').textContent = userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    document.getElementById('usdtUsdDisplay').textContent = '$' + (userBalance.USDT * usdtPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    document.getElementById('ethDisplay').textContent = userBalance.ETH.toFixed(2) + ' ETH';
    document.getElementById('ethUsdDisplay').textContent = '$' + (userBalance.ETH * ethPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    // Total
    const totalUSD = (userBalance.BTC * btcPrice) + (userBalance.USDT * usdtPrice) + (userBalance.ETH * ethPrice);
    document.getElementById('totalUsdDisplay').textContent = '$' + totalUSD.toLocaleString('en-US', {maximumFractionDigits: 2});

    // Table balances
    document.getElementById('btcSpot').textContent = userBalance.BTC.toFixed(2) + ' BTC';
    document.getElementById('btcAvail').textContent = userBalance.BTC.toFixed(2) + ' BTC';
    document.getElementById('btcVal').textContent = '$' + (userBalance.BTC * btcPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    document.getElementById('usdtSpot').textContent = userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    document.getElementById('usdtAvail').textContent = userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    document.getElementById('usdtVal').textContent = '$' + (userBalance.USDT * usdtPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    document.getElementById('ethSpot').textContent = userBalance.ETH.toFixed(2) + ' ETH';
    document.getElementById('ethAvail').textContent = userBalance.ETH.toFixed(2) + ' ETH';
    document.getElementById('ethVal').textContent = '$' + (userBalance.ETH * ethPrice).toLocaleString('en-US', {maximumFractionDigits: 2});

    // Staking page
    document.getElementById('btcStakingAmount').textContent = 'Your Balance: ' + userBalance.BTC.toFixed(2) + ' BTC';
    document.getElementById('usdtStakingAmount').textContent = 'Your Balance: ' + userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    document.getElementById('ethStakingAmount').textContent = 'Your Balance: ' + userBalance.ETH.toFixed(2) + ' ETH';

    // Withdraw coin balances
    document.getElementById('coinBalanceBTC').textContent = userBalance.BTC.toFixed(2) + ' BTC';
    document.getElementById('coinBalanceUSDT').textContent = userBalance.USDT.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDT';
    document.getElementById('coinBalanceETH').textContent = userBalance.ETH.toFixed(2) + ' ETH';
}

// ==================== DEPOSIT FUNCTIONS ====================
function openDepositModal() {
    closeAllModals();
    document.getElementById('depositModal').style.display = 'flex';
}

function closeDepositModal() {
    document.getElementById('depositModal').style.display = 'none';
}

function copyAddress() {
    const addressText = document.getElementById('depositAddressText');
    if (addressText) {
        const address = addressText.textContent;
        navigator.clipboard.writeText(address);
        showNotification('Address copied to clipboard!', 'success');
    }
}

// ==================== WITHDRAW FUNCTIONS ====================
function openWithdrawModal() {
    closeAllModals();
    document.getElementById('withdrawModal').style.display = 'flex';
    goToWithdrawStep(1);
}

function closeWithdrawModal() {
    document.getElementById('withdrawModal').style.display = 'none';
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
    if (titleEl) titleEl.textContent = `${coin} WALLET ADDRESS`;
    
    const currencyEl = document.getElementById('withdrawCurrency');
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
    if (feeEl) feeEl.textContent = `${(fee / price).toFixed(6)} ${selectedWithdrawCoin}`;
    
    const totalFeeEl = document.getElementById('totalFee');
    if (totalFeeEl) totalFeeEl.textContent = `${(fee / price).toFixed(6)} ${selectedWithdrawCoin}`;
    
    const receiveEl = document.getElementById('finalReceiveAmount');
    if (receiveEl) receiveEl.textContent = `${receive.toFixed(6)} ${selectedWithdrawCoin}`;
}

function processWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
    const address = document.getElementById('walletAddress').value.trim();
    const network = document.getElementById('networkSelectWithdraw').value;

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
    const fromCrypto = document.getElementById('fromCrypto').value;
    const toCrypto = document.getElementById('toCrypto').value;
    const amount = parseFloat(document.getElementById('convertAmount').value) || 0;

    const prices = {
        'BTC': btcPrice,
        'ETH': ethPrice,
        'USDT': usdtPrice
    };

    const fromPrice = prices[fromCrypto];
    const toPrice = prices[toCrypto];
    const convertedAmount = (amount * fromPrice) / toPrice;

    document.getElementById('convertReceive').value = convertedAmount.toFixed(8);
}

function handleConvert() {
    const fromCrypto = document.getElementById('fromCrypto').value;
    const toCrypto = document.getElementById('toCrypto').value;
    const amount = parseFloat(document.getElementById('convertAmount').value) || 0;

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
    document.getElementById('convertAmount').value = '';
    document.getElementById('convertReceive').value = '';
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
    document.getElementById('transferForm').reset();
}

// ==================== PROMO CODE ====================
function applyPromoCode() {
    const promoInput = document.getElementById('promoCodeInput');
    const promoError = document.getElementById('promoError');
    
    if (!promoInput) return;
    
    const code = promoInput.value.trim().toUpperCase();
    promoError.textContent = '';

    if (!code) {
        promoError.textContent = 'Please enter a promo code';
        return;
    }

    if (code === PROMO_CODE) {
        // Apply reward
        userBalance.USDT += PROMO_REWARD_USDT;
        BalanceManager.saveBalance(userBalance);
        updateAllBalances();
        addTransaction(`Promo code applied: ${PROMO_REWARD_USDT.toLocaleString()} USDT`, 'promo');
        
        // Clear and close
        promoInput.value = '';
        promoError.textContent = '';
        showNotification(`✨ Promo code applied! You received $${PROMO_REWARD_USDT.toLocaleString()} USDT`, 'success');
        
        // Auto navigate to home
        setTimeout(() => {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('.nav-item[data-page="home"]').classList.add('active');
            navigateToPage('home');
        }, 1500);
    } else {
        promoError.textContent = 'Invalid promo code';
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

    // Save transactions to localStorage
    if (currentUser && currentUser.email) {
        localStorage.setItem(`neuroWallet_transactions_${currentUser.email}`, JSON.stringify(transactions));
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
document.head.appendChild(style);a