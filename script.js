async function fetchTokenAddress(symbol) {
    try {
        const response = await fetch('tokens.txt');
        const text = await response.text();
        const tokens = text.split('\n').map(line => line.trim()).filter(line => line);

        for (const token of tokens) {
            const [tokenSymbol, tokenAddress] = token.split(';');
            if (tokenSymbol.toUpperCase() === symbol.toUpperCase()) {
                return tokenAddress;
            }
        }
        throw new Error(`Token address for symbol ${symbol} not found.`);
    } catch (error) {
        console.error('Error fetching token addresses:', error);
        return null;
    }
}

async function fetchPrices(tokenAddress) {
    const url = `https://birdeye-proxy.jup.ag/defi/multi_price?list_address=${tokenAddress},EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const value = data.data[tokenAddress]?.value;
        return value ? parseFloat(value).toFixed(10) : 'Error';
    } catch (error) {
        console.error(`Error fetching prices for token ${tokenAddress}:`, error);
        return 'Error';
    }
}

async function readTokensAndFetchPrices() {
    const amount = document.getElementById('amount').value.trim();
    const elementsBoost = parseFloat(document.getElementById('elementsBoost').value.trim()) || 0;
    const boostPack = parseFloat(document.getElementById('boostPack').value.trim()) || 0;

    if (!amount) {
        return;
    }

    const apiUrl = `https://corsproxy.io/?https://swap-api.assetdash.com/api/api_v4/swap/v2_quote?network_id=13af0d45-4b0f-4208-9953-c6e33ddc7b42&send_token_address=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&receive_token_address=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB&amount=${amount}&direct_routes_only=false&slippage_bps=10`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.rewards && Array.isArray(data.rewards)) {

            // Extrair símbolos necessários para buscar os endereços
            const symbols = data.rewards.map(reward => reward.symbol);

            // Buscar endereços para todos os símbolos em paralelo
            const tokenAddresses = await Promise.all(symbols.map(symbol => fetchTokenAddress(symbol)));

            // Mapear símbolos para endereços
            const tokenMap = symbols.reduce((map, symbol, index) => {
                map[symbol] = tokenAddresses[index];
                return map;
            }, {});

            // Obter preços para todos os tokens em paralelo
            const pricesPromises = data.rewards.map(async (reward) => {
                const address = tokenMap[reward.symbol];
                if (address) {
                    const price = await fetchPrices(address);
                    const quantity = reward.amount * ((elementsBoost / 100) + 1) * ((boostPack / 100) + 1);
                    return {
                        tokenName: reward.symbol,
                        value: price,
                        amount: quantity,
                        boosted: reward.boosted // Inclui a flag boosted
                    };
                }
                return null;
            });

            // Aguarda todas as promessas de preços serem resolvidas
            const prices = (await Promise.all(pricesPromises)).filter(price => price !== null);

            // Ordenar os tokens para que os boostados venham primeiro
            prices.sort((a, b) => b.boosted - a.boosted);

            updateTable(prices);
        }
    } catch (error) {
        console.error('Error fetching API data:', error);
    }
}

function updateTable(prices) {
    const tbody = document.querySelector('#pricesTable tbody');
    tbody.innerHTML = ''; // Limpa a tabela antes de atualizar

    prices.forEach(({ tokenName, value, amount, boosted }, index) => {
        const row = document.createElement('tr');
        
        // Coluna do contador
        const indexCell = document.createElement('td');
        indexCell.textContent = index + 1; // Começa de 1
        row.appendChild(indexCell);

        const nameCell = document.createElement('td');
        const valueCell = document.createElement('td');
        const quantityCell = document.createElement('td');
        const totalCell = document.createElement('td');

        // Adiciona o nome do token e o ícone SVG se o token estiver boostado
        nameCell.innerHTML = tokenName + " " + (boosted ? 
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#21CE99" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>' 
            : '');

        // Aplica a cor verde ao texto se o token estiver boostado
        if (boosted) {
            nameCell.style.color = '#21CE99'; // Verde
        }

        valueCell.textContent = value;
        
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.step = '0.01';
        quantityInput.min = '0';
        quantityInput.value = amount;
        
        quantityInput.addEventListener('input', () => {
            updateTotal(row, value);
        });

        quantityCell.appendChild(quantityInput);
        row.appendChild(indexCell);
        row.appendChild(nameCell);
        row.appendChild(valueCell);
        row.appendChild(quantityCell);
        row.appendChild(totalCell);
        
        tbody.appendChild(row);

        updateTotal(row, value);
    });

    updateTotalValue();
}

function updateTotal(row, price) {
    const quantityInput = row.cells[3].querySelector('input');
    const totalCell = row.cells[4];

    const quantity = parseFloat(quantityInput.value) || 0;
    const priceValue = parseFloat(price) || 0;

    totalCell.textContent = (quantity * priceValue).toFixed(3);
    updateTotalValue();
}

function updateTotalValue() {
    const tbody = document.querySelector('#pricesTable tbody');
    let totalValue = 0;

    Array.from(tbody.rows).forEach(row => {
        const totalCell = row.cells[4];
        const value = parseFloat(totalCell.textContent) || 0;
        totalValue += value;
    });
    totalValue = totalValue * 2;

    const totalElement1 = document.getElementById('totalValue1');
    totalElement1.textContent = `Total Value: ${totalValue.toFixed(2)}`;

    const totalElement2 = document.getElementById('totalValue2');
    totalElement2.textContent = `Total Value: ${totalValue.toFixed(2)}`;
}

function saveAmount() {
    const amountInput = document.getElementById('amount');
    const amount = amountInput.value.trim();
    localStorage.setItem('amount', amount);
}

function saveElementsBoost() {
    const elementsBoostInput = document.getElementById('elementsBoost');
    const elementsBoost = elementsBoostInput.value.trim();
    localStorage.setItem('elementsBoost', elementsBoost);
}

function saveBoostPack() {
    const boostPackInput = document.getElementById('boostPack');
    const boostPack = boostPackInput.value.trim();
    localStorage.setItem('boostPack', boostPack);
}

function loadAmount() {
    const amount = localStorage.getItem('amount') || '';
    document.getElementById('amount').value = amount;
}

function loadElementsBoost() {
    const elementsBoost = localStorage.getItem('elementsBoost') || '';
    document.getElementById('elementsBoost').value = elementsBoost;
}

function loadBoostPack() {
    const boostPack = localStorage.getItem('boostPack') || '';
    document.getElementById('boostPack').value = boostPack;
}

document.getElementById('amount').addEventListener('input', saveAmount);
document.getElementById('elementsBoost').addEventListener('input', saveElementsBoost);
document.getElementById('boostPack').addEventListener('input', saveBoostPack);

setInterval(readTokensAndFetchPrices, 30000);
document.addEventListener('DOMContentLoaded', () => {
    loadAmount();
    loadElementsBoost();
    loadBoostPack();
    readTokensAndFetchPrices();
});
