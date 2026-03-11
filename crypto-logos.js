// ==================== CRYPTO LOGOS WITH FALLBACK SUPPORT ====================

// Logo data with multiple fallback sources
const cryptoLogos = {
    BTC: {
        symbol: 'BTC',
        name: 'Bitcoin',
        logos: [
            'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
            'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@d841b0e/128/color/btc.png',
            'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png',
            'https://cryptologos.cc/logos/bitcoin-btc-logo.png'
        ],
        fallback: '₿'
    },
    ETH: {
        symbol: 'ETH',
        name: 'Ethereum',
        logos: [
            'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
            'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@d841b0e/128/color/eth.png',
            'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png',
            'https://cryptologos.cc/logos/ethereum-eth-logo.png'
        ],
        fallback: 'Ξ'
    },
    USDT: {
        symbol: 'USDT',
        name: 'Tether',
        logos: [
            'https://assets.coingecko.com/coins/images/325/large/Tether.png',
            'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@d841b0e/128/color/usdt.png',
            'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png',
            'https://cryptologos.cc/logos/tether-usdt-logo.png'
        ],
        fallback: 'T'
    }
};

// All logo element IDs to load
const logoElementIds = {
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

// Load a single logo with retry mechanism
function loadCryptoLogo(elementId, cryptoSymbol) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`⚠️ Element not found: ${elementId}`);
        return;
    }

    const logoData = cryptoLogos[cryptoSymbol];
    if (!logoData) {
        console.warn(`⚠️ Logo data not found for: ${cryptoSymbol}`);
        return;
    }

    let logoIndex = 0;

    function tryLoadNextLogo() {
        if (logoIndex >= logoData.logos.length) {
            // All URLs failed, use fallback emoji
            console.warn(`⚠️ All logo URLs failed for ${cryptoSymbol}, using fallback emoji`);
            element.innerHTML = '';
            element.textContent = logoData.fallback;
            element.style.cssText = `
                font-size: 24px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
            `;
            return;
        }

        const logoUrl = logoData.logos[logoIndex];
        const img = document.createElement('img');
        
        // Add cache buster to prevent caching issues
        img.src = logoUrl + '?t=' + Date.now();
        img.alt = logoData.name;
        img.title = logoData.name;
        img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
        `;

        img.onload = function() {
            console.log(`✅ Logo loaded for ${cryptoSymbol} from: ${logoUrl}`);
            element.innerHTML = '';
            element.appendChild(img);
        };

        img.onerror = function() {
            console.warn(`❌ Failed to load ${cryptoSymbol} from: ${logoUrl}`);
            logoIndex++;
            tryLoadNextLogo();
        };

        // Set timeout for slow networks
        const timeout = setTimeout(() => {
            console.warn(`⏱️ Logo load timeout for ${cryptoSymbol}`);
            logoIndex++;
            tryLoadNextLogo();
        }, 5000);

        img.addEventListener('load', () => clearTimeout(timeout));
        img.addEventListener('error', () => clearTimeout(timeout));

        element.innerHTML = '';
        element.appendChild(img);
    }

    tryLoadNextLogo();
}

// Load all logos
function loadAllCryptoLogos() {
    console.log('📦 Starting to load crypto logos...');
    
    for (const [elementId, symbol] of Object.entries(logoElementIds)) {
        loadCryptoLogo(elementId, symbol);
    }
    
    console.log('✅ Logo loading initiated for all elements');
}

// Retry failed logos
function retryFailedLogos() {
    console.log('🔄 Retrying failed logos...');
    
    for (const [elementId, symbol] of Object.entries(logoElementIds)) {
        const element = document.getElementById(elementId);
        if (element && !element.querySelector('img')) {
            // No image found, retry loading
            console.log(`🔄 Retrying logo for: ${elementId}`);
            loadCryptoLogo(elementId, symbol);
        }
    }
}

// Reload a specific logo manually
function reloadLogo(elementId, symbol) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
        console.log(`🔄 Reloading logo: ${elementId}`);
        loadCryptoLogo(elementId, symbol);
    }
}

// Reload all logos manually
function reloadAllLogos() {
    console.log('🔄 Reloading all logos...');
    loadAllCryptoLogos();
}

// ==================== INITIALIZATION ====================

// Wait for DOM to be ready
function initializeLogos() {
    if (document.readyState === 'loading') {
        // DOM still loading, wait
        console.log('⏳ Waiting for DOM to be ready...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('✅ DOM ready, loading logos');
            loadAllCryptoLogos();
            
            // Retry after 2 seconds
            setTimeout(retryFailedLogos, 2000);
        });
    } else {
        // DOM already loaded
        console.log('✅ DOM already ready, loading logos');
        loadAllCryptoLogos();
        
        // Retry after 2 seconds
        setTimeout(retryFailedLogos, 2000);
    }
}

// Initialize on script load
initializeLogos();

// Also initialize when window loads
window.addEventListener('load', () => {
    console.log('🔄 Window load event, checking logos...');
    setTimeout(retryFailedLogos, 500);
});

// Retry on network restore
window.addEventListener('online', () => {
    console.log('🌐 Network restored, reloading logos...');
    reloadAllLogos();
});

// Handle network offline
window.addEventListener('offline', () => {
    console.log('❌ Network offline');
});

// Export functions for console access
window.loadAllCryptoLogos = loadAllCryptoLogos;
window.retryFailedLogos = retryFailedLogos;
window.reloadLogo = reloadLogo;
window.reloadAllLogos = reloadAllLogos;

// Log status
console.log('✅ Crypto Logos Script Loaded');
console.log('📊 Available cryptocurrencies:', Object.keys(cryptoLogos));
console.log('📍 Total logo containers to load:', Object.keys(logoElementIds).length);
console.log('💡 Use these commands in console:');
console.log('   - loadAllCryptoLogos()');
console.log('   - retryFailedLogos()');
console.log('   - reloadLogo(elementId, symbol)');
console.log('   - reloadAllLogos()');
