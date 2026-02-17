// Crypto Logo URLs (Using reliable public APIs)
const cryptoLogos = {
    BTC: {
        symbol: 'BTC',
        name: 'Bitcoin',
        logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
        fallback: '₿'
    },
    ETH: {
        symbol: 'ETH',
        name: 'Ethereum',
        logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        fallback: 'Ξ'
    },
    USDT: {
        symbol: 'USDT',
        name: 'Tether',
        logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
        fallback: 'T'
    }
};

// Function to insert logo to a specific element
function insertLogoToElement(elementId, cryptoSymbol) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (!cryptoLogos[cryptoSymbol]) return;

    const logo = cryptoLogos[cryptoSymbol];
    
    // Create image element
    const img = document.createElement('img');
    img.src = logo.logo;
    img.alt = logo.name;
    img.title = logo.name;
    img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
    `;

    // Handle image load error - fallback to emoji
    img.onerror = function() {
        element.textContent = logo.fallback;
        element.style.cssText = `
            font-size: 20px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
    };

    // Handle image load success
    img.onload = function() {
        // Image loaded successfully, do nothing special
    };

    // Clear previous content and append image
    element.innerHTML = '';
    element.appendChild(img);
}

// Function to insert logos into all balance cards
function insertBalanceCardLogos() {
    insertLogoToElement('btc-balance-icon', 'BTC');
    insertLogoToElement('usdt-balance-icon', 'USDT');
    insertLogoToElement('eth-balance-icon', 'ETH');
}

// Function to insert logos into asset table
function insertAssetTableLogos() {
    insertLogoToElement('asset-btc-icon', 'BTC');
    insertLogoToElement('asset-usdt-icon', 'USDT');
    insertLogoToElement('asset-eth-icon', 'ETH');
}

// Function to insert logos into withdraw modal
function insertWithdrawModalLogos() {
    insertLogoToElement('withdraw-btc-icon', 'BTC');
    insertLogoToElement('withdraw-usdt-icon', 'USDT');
    insertLogoToElement('withdraw-eth-icon', 'ETH');
}

// Function to insert logos into staking cards
function insertStakingCardLogos() {
    insertLogoToElement('staking-btc-icon', 'BTC');
    insertLogoToElement('staking-usdt-icon', 'USDT');
    insertLogoToElement('staking-eth-icon', 'ETH');
}

// Main function to load all crypto logos
function loadAllCryptoLogos() {
    // Use a small delay to ensure DOM is fully ready
    if (document.readyState === 'loading') {
        // DOM is still loading
        setTimeout(loadAllCryptoLogos, 100);
        return;
    }

    // Load all logo categories
    insertBalanceCardLogos();
    insertAssetTableLogos();
    insertWithdrawModalLogos();
    insertStakingCardLogos();
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllCryptoLogos);
} else {
    // DOM is already loaded
    loadAllCryptoLogos();
}

// Alternative: Load logos when window is fully loaded (images, etc.)
window.addEventListener('load', loadAllCryptoLogos);

// Retry mechanism for failed image loads
function retryFailedLogos() {
    const logoElements = {
        'btc-balance-icon': 'BTC',
        'eth-balance-icon': 'ETH',
        'usdt-balance-icon': 'USDT',
        'asset-btc-icon': 'BTC',
        'asset-eth-icon': 'ETH',
        'asset-usdt-icon': 'USDT',
        'withdraw-btc-icon': 'BTC',
        'withdraw-eth-icon': 'ETH',
        'withdraw-usdt-icon': 'USDT',
        'staking-btc-icon': 'BTC',
        'staking-eth-icon': 'ETH',
        'staking-usdt-icon': 'USDT'
    };

    // Check if any element is still showing fallback text instead of image
    for (const [elementId, symbol] of Object.entries(logoElements)) {
        const element = document.getElementById(elementId);
        if (element && !element.querySelector('img')) {
            // Re-insert logo if image not found
            insertLogoToElement(elementId, symbol);
        }
    }
}

// Retry failed logos after 3 seconds
setTimeout(retryFailedLogos, 3000);

// Fallback API endpoints in case main API fails
const fallbackLogos = {
    BTC: {
        symbol: 'BTC',
        name: 'Bitcoin',
        logos: [
            'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
            'https://raw.githubusercontent.com/ErikThiart/cryptocurrency-icons/master/32/icon/btc.png',
            'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
        ],
        fallback: '₿'
    },
    ETH: {
        symbol: 'ETH',
        name: 'Ethereum',
        logos: [
            'https://cryptologos.cc/logos/ethereum-eth-logo.png',
            'https://raw.githubusercontent.com/ErikThiart/cryptocurrency-icons/master/32/icon/eth.png',
            'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
        ],
        fallback: 'Ξ'
    },
    USDT: {
        symbol: 'USDT',
        name: 'Tether',
        logos: [
            'https://cryptologos.cc/logos/tether-usdt-logo.png',
            'https://raw.githubusercontent.com/ErikThiart/cryptocurrency-icons/master/32/icon/usdt.png',
            'https://assets.coingecko.com/coins/images/325/large/Tether.png'
        ],
        fallback: 'T'
    }
};

// Enhanced function with fallback URLs
function insertLogoWithFallback(elementId, cryptoSymbol) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const cryptoData = fallbackLogos[cryptoSymbol];
    if (!cryptoData) return;

    let logoIndex = 0;

    function tryLoadLogo() {
        if (logoIndex >= cryptoData.logos.length) {
            // All URLs failed, use fallback
            element.textContent = cryptoData.fallback;
            element.style.cssText = `
                font-size: 20px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            return;
        }

        const logoUrl = cryptoData.logos[logoIndex];
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = cryptoData.name;
        img.title = cryptoData.name;
        img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
        `;

        img.onload = function() {
            // Image loaded successfully
            element.innerHTML = '';
            element.appendChild(img);
        };

        img.onerror = function() {
            // Try next URL
            logoIndex++;
            tryLoadLogo();
        };

        element.innerHTML = '';
        element.appendChild(img);
    }

    tryLoadLogo();
}

// Function to load all logos with fallback support
function loadAllLogosWithFallback() {
    if (document.readyState === 'loading') {
        setTimeout(loadAllLogosWithFallback, 100);
        return;
    }

    const logoElements = {
        'btc-balance-icon': 'BTC',
        'eth-balance-icon': 'ETH',
        'usdt-balance-icon': 'USDT',
        'asset-btc-icon': 'BTC',
        'asset-eth-icon': 'ETH',
        'asset-usdt-icon': 'USDT',
        'withdraw-btc-icon': 'BTC',
        'withdraw-eth-icon': 'ETH',
        'withdraw-usdt-icon': 'USDT',
        'staking-btc-icon': 'BTC',
        'staking-eth-icon': 'ETH',
        'staking-usdt-icon': 'USDT'
    };

    for (const [elementId, symbol] of Object.entries(logoElements)) {
        insertLogoWithFallback(elementId, symbol);
    }
}

// Initialize with fallback support
loadAllLogosWithFallback();

// Prevent re-initialization
let logosInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    if (!logosInitialized) {
        logosInitialized = true;
        loadAllLogosWithFallback();
    }
});

window.addEventListener('load', () => {
    if (!logosInitialized) {
        logosInitialized = true;
        loadAllLogosWithFallback();
    }
});

// Export functions for manual use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cryptoLogos,
        fallbackLogos,
        insertLogoToElement,
        insertLogoWithFallback,
        loadAllCryptoLogos,
        loadAllLogosWithFallback,
        insertBalanceCardLogos,
        insertAssetTableLogos,
        insertWithdrawModalLogos,
        insertStakingCardLogos,
        retryFailedLogos
    };
}

// Observer for dynamically added elements
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            // Check if any new logo containers were added
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Re-initialize logos for new elements
                    setTimeout(retryFailedLogos, 100);
                }
            });
        }
    });
});

// Start observing the document for changes
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Utility function to get logo data
function getLogoCryptoData(symbol) {
    return cryptoLogos[symbol] || null;
}

// Utility function to check if logo is loaded
function isLogoLoaded(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return false;
    return element.querySelector('img') !== null;
}

// Utility function to reload a specific logo
function reloadLogo(elementId, symbol) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
        insertLogoWithFallback(elementId, symbol);
    }
}

// Utility function to reload all logos
function reloadAllLogos() {
    const logoElements = {
        'btc-balance-icon': 'BTC',
        'eth-balance-icon': 'ETH',
        'usdt-balance-icon': 'USDT',
        'asset-btc-icon': 'BTC',
        'asset-eth-icon': 'ETH',
        'asset-usdt-icon': 'USDT',
        'withdraw-btc-icon': 'BTC',
        'withdraw-eth-icon': 'ETH',
        'withdraw-usdt-icon': 'USDT',
        'staking-btc-icon': 'BTC',
        'staking-eth-icon': 'ETH',
        'staking-usdt-icon': 'USDT'
    };

    for (const [elementId, symbol] of Object.entries(logoElements)) {
        reloadLogo(elementId, symbol);
    }
}

// Add error handler for network issues
window.addEventListener('online', () => {
    console.log('Network connection restored, reloading logos...');
    reloadAllLogos();
});

window.addEventListener('offline', () => {
    console.log('Network connection lost');
});

// Log initialization status
console.log('NeuroWallet Crypto Logos Script Loaded');
console.log('Available cryptocurrencies:', Object.keys(cryptoLogos));
console.log('Total logo containers to load:', 12);

