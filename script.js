// Função fetchUserDeals
async function fetchUserDeals(id) {
    try {
        const response = await fetch(`https://camposmpinheiro.pythonanywhere.com/fetch-user-deals/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ3MTM3OTIwMTU3LCJzdWIiOiI3NWUzNTU3OS0zNTUzLTRlMzktYTVmYi1lM2Q3ZTc4ZWNjODYifQ.BnBIQc77RWhwAMrKWZU7d3pdOP_p_S5ppg87EigR_XQ'
            }
        });
        const data = await response.json();
        console.log(`Deals for ID ${id}:`, data);
        return data.deal; // Retorna o objeto "deal"
    } catch (error) {
        console.error(`Error fetching user deals for ID ${id}:`, error);
        return null; // Retorna null em caso de erro
    }
}

// Função loadLootBoxes
async function loadLootBoxes() {
    try {
        const response = await fetch('https://camposmpinheiro.pythonanywhere.com/fetch-deals', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ3MTM3OTIwMTU3LCJzdWIiOiI3NWUzNTU3OS0zNTUzLTRlMzktYTVmYi1lM2Q3ZTc4ZWNjODYifQ.BnBIQc77RWhwAMrKWZU7d3pdOP_p_S5ppg87EigR_XQ'
            }
        });
        const data = await response.json();
        const container = document.getElementById('loot-container');
        container.innerHTML = ''; // Limpa o container antes de adicionar novos elementos

        // Coleta todas as promessas de fetchUserDeals
        const fetchPromises = data.deals.map(async (deal) => {
            // Criar a loot box e adicioná-la ao container
            const lootBox = document.createElement('div');
            lootBox.classList.add('loot-box');

            const progressPercentage = (deal.percent_prizes_claimed).toFixed(1);
            let progressColor;

            if (progressPercentage < 40) {
                progressColor = '#28a745'; // Verde
            } else if (progressPercentage < 100) {
                progressColor = '#fd7e14'; // Laranja
            } else {
                progressColor = '#dc3545'; // Vermelho
            }

            lootBox.innerHTML = `
                <img class="loot-image" src="${deal.image_url}" alt="${deal.title}">
                <div class="loot-details">
                    <h2 class="loot-title">${deal.title}</h2>
                    <p class="loot-cost">Cost: ${deal.cost_gold} Gold</p>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${progressPercentage}%; background-color: ${progressColor};"></div>
                    </div>
                    <p class="progress-text">${progressPercentage}% claimed</p>
                    <p class="loot-cost" style="margin-top:15px" id="first-p-${deal.id}">Loading...</p>
                    <p class="loot-cost" id="second-p-${deal.id}">Loading...</p>
                    <p class="loot-cost" id="profit-${deal.id}"></p>
                </div>
            `;

            container.appendChild(lootBox);

            // Fetch user deals for the current deal id and atualizar a data criada
            let profit = 0;
            const userDeal = await fetchUserDeals(deal.id);
            if (userDeal && userDeal.loot_box_asset_quantity_low && userDeal.loot_box_asset.price_usd) {
                profit = ((userDeal.loot_box_asset_quantity_low * userDeal.loot_box_asset.price_usd) - (2.45 * userDeal.cost_gold)).toFixed(2);
                document.getElementById(`first-p-${deal.id}`).textContent = 
                `Min: ${userDeal.loot_box_asset_quantity_low} ($ ${(userDeal.loot_box_asset_quantity_low * userDeal.loot_box_asset.price_usd).toFixed(2)})`;
            } 
            else if (userDeal && userDeal.asset_quantity && userDeal.asset && userDeal.asset.price_usd) {
                profit = ((userDeal.asset_quantity * userDeal.asset.price_usd) - (2.45 * userDeal.cost_gold)).toFixed(2);
                document.getElementById(`first-p-${deal.id}`).textContent = 
                `Est Value: ${userDeal.asset_quantity} ($ ${(userDeal.asset_quantity * userDeal.asset.price_usd).toFixed(2)})`;
            } else {
                document.getElementById(`first-p-${deal.id}`).textContent = "";
            }

            if (userDeal && userDeal.loot_box_asset_quantity_high && userDeal.loot_box_asset.price_usd) {
                document.getElementById(`second-p-${deal.id}`).textContent = 
                `Max: ${userDeal.loot_box_asset_quantity_high} ($ ${(userDeal.loot_box_asset_quantity_high * userDeal.loot_box_asset.price_usd).toFixed(2)})`;
            } else {
                document.getElementById(`second-p-${deal.id}`).textContent = "";
            }

            if (profit) {
                const profitElement = document.getElementById(`profit-${deal.id}`);
                profitElement.textContent = ` Min Profit: $ ${profit}`;
                
                // Definir a classe com base no valor do lucro
                if (parseFloat(profit) > 0) {
                    profitElement.classList.add('profit-positive');
                    profitElement.classList.remove('profit-negative');
                } else if (parseFloat(profit) < 0) {
                    profitElement.classList.add('profit-negative');
                    profitElement.classList.remove('profit-positive');
                } else {
                    profitElement.classList.remove('profit-positive', 'profit-negative');
                }
            } else {
                document.getElementById(`profit-${deal.id}`).textContent = "";
            }
            
            return {
                id: deal.id,
                profit: parseFloat(profit) || 0, // Adiciona o lucro para ordenação
                element: lootBox
            };
        });

        // Aguarda todas as promessas de fetchUserDeals serem concluídas
        const dealsWithProfit = await Promise.all(fetchPromises);

        // Ordena os loot boxes por profit
        const sortedDeals = dealsWithProfit
            .filter(deal => deal) // Remove qualquer valor nulo ou indefinido
            .sort((a, b) => b.profit - a.profit); // Ordena do maior para o menor profit

        // Recria os elementos de loot box com a ordem correta
        container.innerHTML = '';
        sortedDeals.forEach(deal => {
            container.appendChild(deal.element);
        });
    } catch (error) {
        console.error('Erro:', error);
    }
}



window.onload = loadLootBoxes;

document.getElementById('amount').addEventListener('input', saveAmount);
document.getElementById('elementsBoost').addEventListener('input', saveElementsBoost);
document.getElementById('boostPack').addEventListener('input', saveBoostPack);

setInterval(readTokensAndFetchPrices, 30000);
document.addEventListener('DOMContentLoaded', () => {
    const printAmountBtn = document.getElementById('printAmountBtn');
    printAmountBtn.addEventListener('click', printAmount);
    loadAmount();
    loadElementsBoost();
    loadBoostPack();
    readTokensAndFetchPrices();
});
