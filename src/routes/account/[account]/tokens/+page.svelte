<script>
    import { trpcWithQuery } from "$lib/trpc/client";
    import { page } from "$app/stores";
    import TokenProvider from "$lib/components/providers/token-provider.svelte";
    import { onMount, afterUpdate, onDestroy } from "svelte";
    import Chart from 'chart.js/auto';
    import { SOL } from "$lib/xray";
    import { LAMPORTS_PER_SOL } from "@solana/web3.js";
    import formatMoney from "$lib/util/format-money";
    import { writable } from 'svelte/store';
    import { get } from 'svelte/store';

    const account = $page.params.account;
    const client = trpcWithQuery($page);
    const balances = client.balances.createQuery(account);
    const token2022 = client.token2022.createQuery(account);
    const sol = client.price.createQuery(SOL);

    $: sorted = $balances?.data?.tokens
        ?.filter(({ decimals, amount }) => decimals && amount)
        .sort(({ amount: a, decimals: ad }, { amount: b, decimals: bd }) =>
            a / 10 ** ad < b / 10 ** bd ? 1 : -1
        );

    const solBalance = $sol.data || 0;
    const queryParams = new URLSearchParams(window.location.search);
    const url = import.meta.env.VITE_HELIUS_URL;

    let totalTokensBalance = 0;
    const tokenPricesArray = [];
    export const tokenPrices = writable([]);

    const getAssetsWithNativeBalance = async () => {
        try {
            const response = await fetch(url, {
                body: JSON.stringify({
                    id: 'my-id',
                    jsonrpc: '2.0',
                    method: 'searchAssets',
                    params: {
                        displayOptions: {
                            showNativeBalance: true,
                        },
                        ownerAddress: account,
                        tokenType: 'fungible',
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            });

            const { result } = await response.json();

            if (result && result.items && Array.isArray(result.items)) {
                result.items.forEach((asset) => {
                    const { token_info } = asset;
                });

                const pricedAssets = result.items.filter(
                    (asset) => asset.token_info && asset.token_info.price_info
                );

                if (pricedAssets.length > 0) {
                    pricedAssets.forEach((asset) => {
                        const { symbol, price_info } = asset.token_info;
                        const { total_price } = price_info;
                        const formattedPrice = `$${total_price.toFixed(2)}`;
                    });

                    totalTokensBalance = calculateTotalTokens(pricedAssets);
                    return totalTokensBalance;
                } else {
                }
            } else {
            }
        } catch (error) {
        }
    };

    const generatePortfolioText = (tokenPricesArray, totalTokensBalance) => {
        tokenPricesArray.sort((a, b) => b.totalPrice - a.totalPrice);

        let textContent = 'Token List and portfolio allocation, sans Solana:\n\n';
        tokenPricesArray.forEach(token => {
            const { symbol, totalPrice } = token;
            const percentage = (totalPrice / totalTokensBalance * 100).toFixed(2);
            const tokensRequired = (totalTokensBalance * 100) / totalPrice;
            textContent += `${symbol}\nTotal Value: ${formatMoney(totalPrice)}\nPortfolio Allocation: ${percentage}%\n\n\n`;
        });
        return textContent;
    };

    const downloadPortfolio = () => {
        const options = {
            day: '2-digit',
            hour: '2-digit',
            hour12: true,
            minute: '2-digit',
            month: '2-digit',
            second: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short',
            year: 'numeric'
        };

        const timestamp = new Date().toLocaleString('en-US', options).replace(/\//g, '-');
        const fileName = `Portfolio_${timestamp}.txt`;
        const textContent = generatePortfolioText(get(tokenPrices), totalTokensBalance);
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const calculateTotalTokens = (pricedAssets) => {
        const tokenPricesArray = [];

        if (pricedAssets && pricedAssets.length > 0) {
            const totalTokensBalance = pricedAssets.reduce((total, asset) => {
                const { symbol, associated_token_address, price_info } = asset.token_info;
                const { total_price } = price_info;
                const { id } = asset;

                tokenPricesArray.push({ associated_token_address, id, symbol, totalPrice: total_price });

                return total + total_price;
            }, 0);

            tokenPrices.set(tokenPricesArray);
            return totalTokensBalance;
        }

        tokenPrices.set([]);
        return 0;
    };

    getAssetsWithNativeBalance();

    export { tokenPricesArray };

    const calculateWalletBalance = async () => {
        const sol = solBalance / LAMPORTS_PER_SOL;
        const tokens = await getAssetsWithNativeBalance();
        const totalBalance = sol + tokens;

        return totalBalance;
    };

    const calculateTokenPortions = (tokenAmount, tokenValue, totalPortfolioValue) => {
        const percentageOfPortfolio = tokenValue / totalPortfolioValue;
        const portionOfToken = tokenAmount * percentageOfPortfolio;
        return portionOfToken;
    };

    function copyTokenQuantity(amount) {
        const textarea = document.createElement('textarea');
        textarea.value = amount.toLocaleString();
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';

        document.body.appendChild(textarea);

        textarea.select();
        document.execCommand('copy');

        document.body.removeChild(textarea);
    }

    let chart;

    const createChart = () => {
        const ctx = document.getElementById('myPieChart').getContext('2d');

        // Sort tokens by total price in descending order
        const sortedTokens = get(tokenPrices).slice().sort((a, b) => b.totalPrice - a.totalPrice);
        
        // Extract labels and data from sorted tokens
        const labels = sortedTokens.map(token => token.symbol);
        const data = sortedTokens.map(token => ((token.totalPrice / totalTokensBalance) * 100).toFixed(2));

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            data: {
                datasets: [{
                    backgroundColor: [
                        '#7E57C2', // Light Purple
                        '#42A5F5', // Light Blue
                        '#66BB6A', // Light Green
                        '#9575CD', // Light Purple
                        '#81C784', // Light Green
                        '#64B5F6', // Light Blue
                        '#9CCC65', // Light Green
                        '#90CAF9', // Light Blue
                        '#C5E1A5', // Light Green
                        '#FFAB91', // Light Orange
                        '#B0BEC5', // Blue Grey
                        '#BCAAA4', // Light Brown
                        '#F48FB1', // Light Pink
                        '#66BB6A', // Light Green
                        '#FFF176', // Light Yellow
                        '#81C784', // Light Green
                        '#80CBC4', // Light Cyan
                        '#90A4AE', // Blue Grey
                        '#F48FB1', // Light Pink
                        '#64B5F6', // Light Blue
                        '#FFB74D', // Light Orange
                        '#90A4AE', // Blue Grey
                    ]


                    ,

                    data
                }],
                labels
            },
            options: {
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                return `${tooltipItem.label}: ${tooltipItem.raw}%`;
                            }
                        }
                    }
                },
                responsive: true
            },
            type: 'pie'
        });
    };

    let fetchInterval;

    onMount(async () => {
        await getAssetsWithNativeBalance();
        createChart();
});


    onDestroy(() => {
        clearInterval(fetchInterval);
    });

    afterUpdate(() => {
        createChart();
    });
</script>

<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<style>
    .tooltiptext {
        visibility: hidden;
        width: auto;
        background-color: rgb(0, 255, 115);
        color: white;
        text-align: center;
        border-radius: 6px;
        padding: 5px;
        position: absolute;
        z-index: 1;
        bottom: 125%;
        left: 50%;
        margin-left: -60px;
        opacity: 0;
        transition: opacity 0.3s;
    }

    .button:hover .tooltiptext {
        visibility: visible;
        opacity: 1;
    }
</style>

<div>
    <canvas id="myPieChart"></canvas>
    <div class="flex justify-left mb-4">
        <button on:click={downloadPortfolio} class="mr-2 px-4 py-2 rounded bg-gray-800 text-white lowercase">download portfolio</button>
        <button on:click={() => window.location.reload()} class="px-4 py-2 rounded bg-gray-800 text-white">
            <span class="material-icons">refresh</span>
        </button>
    </div>
    <a class="mb-4 grid grid-cols-12 items-center gap-3 rounded-lg border px-3 py-2 lowercase hover:border-primary" href="/token/sol">
        <div class="col-span-2 p-1 md:col-span-1">
            <div class="aspect-square w-full rounded-lg bg-cover lowercase"></div>
        </div>
        <div class="col-span-10 flex items-center justify-between text-right lowercase md:col-span-11">
            <div>
                <h4 class="font-semibold lowercase md:text-sm">
                    Solana
                </h4>
            </div>
            <div>
                <h4 class="font-semibold lowercase md:text-sm">
                    {($balances.data?.nativeBalance / LAMPORTS_PER_SOL).toLocaleString()}
                </h4>
                <h4 class="text-xs lowercase opacity-50">
                    {#if $sol.data}
                        {formatMoney(($sol.data * $balances.data?.nativeBalance) / LAMPORTS_PER_SOL)}
                    {/if}
                </h4>
            </div>
        </div>
    </a>

    {#if $token2022.data}
    {#each $token2022.data.filter(token => token.decimals > 0 && token.mint !== SOL)
    .sort((a, b) => {
        const tokenAPrice = $tokenPrices.find(price => price.id === a.mint)?.totalPrice || 0;
        const tokenBPrice = $tokenPrices.find(price => price.id === b.mint)?.totalPrice || 0;
        return tokenBPrice - tokenAPrice;
    }) as token}
    
    <TokenProvider address={token.mint} let:metadata>
        <a class="mb-4 grid grid-cols-12 items-center gap-3 rounded-lg border px-3 py-2 lowercase hover:border-primary" href="/token/{token.mint}">
            <div class="col-span-2 p-1 md:col-span-1">
                <div style="background-image: url('{metadata.image}')" class="aspect-square w-full rounded-lg bg-cover lowercase"></div>
            </div>
            <div class="col-span-10 flex items-center justify-between text-right lowercase md:col-span-11">
                <div>
                    <h4 class="font-semibold lowercase md:text-sm">
                        {metadata.name || ""}
                    </h4>
                </div>
                <div>
                    <h4 class="font-semibold lowercase md:text-sm">
                        {token.amount.toLocaleString()}
                    </h4>
                    <h4 class="text-xs lowercase opacity-50">
                        {#each $tokenPrices.filter(price => price.id === token.mint) as price}
                            {formatMoney(price.totalPrice)}
                            <br />
                            {(price.totalPrice / totalTokensBalance * 100).toFixed(2)}%
                        {/each}
                    </h4>
                    <div class="text-xs lowercase opacity-50">
                        Token Quantity: {token.amount.toLocaleString()}
                        <button on:click={() => copyTokenQuantity(token.amount)} class="ml-2 px-2 py-1 rounded bg-primary text-white text-xs relative">
                            <span class="material-icons text-xs mr-1">content_copy</span>Copy
                            <span class="tooltiptext" id="tooltip">Copy {token} quantity</span>
                        </button>
                    </div>
                </div>
            </div>
        </a>
    </TokenProvider>
    {/each}
    {/if}

    {#if sorted}
    {#each sorted.filter(token => token.decimals > 0 && token.mint !== SOL)
        .sort((a, b) => {
            const tokenAPrice = $tokenPrices.find(price => price.id === a.mint)?.totalPrice || 0;
            const tokenBPrice = $tokenPrices.find(price => price.id === b.mint)?.totalPrice || 0;
            return tokenBPrice - tokenAPrice;
        }) as token (token.mint)}
        
        <TokenProvider address={token.mint} let:metadata>
            <a class="mb-4 grid grid-cols-12 items-center gap-3 rounded-lg border px-3 py-2 lowercase hover:border-primary" href="/token/{token.mint}">
                <div class="col-span-2 p-1 lowercase md:col-span-1">
                    <div style="background-image: url('{metadata.image}')" class="aspect-square w-full rounded-lg bg-cover lowercase"></div>
                </div>
                <div class="col-span-10 flex items-center justify-between text-right lowercase md:col-span-11">
                    <div>
                        <h4 class="font-semibold lowercase md:text-sm">{metadata?.name || ""}</h4>
                    </div>
                    <div>
                        <h4 class="font-semibold lowercase md:text-sm">{(token.amount / 10 ** token.decimals).toLocaleString()}</h4>
                        <h4 class="text-xs lowercase opacity-50">
                            {#each $tokenPrices as price}
                                {#if price.id === token.mint}
                                    <h4>{formatMoney(price.totalPrice)}</h4>
                                    <br />
                                    {(price.totalPrice / totalTokensBalance * 100).toFixed(2)}%
                                {/if}
                            {/each}
                        </h4>
                    </div>
                </div>
            </a>
        </TokenProvider>
    {/each}
    {/if}

    {#each Array(3) as _}
    <div class="mb-3 grid animate-pulse grid-cols-12 items-center gap-3 rounded-lg">
        <div class="col-span-2 p-1 md:col-span-1">
            <div class="aspect-square w-full rounded-full bg-secondary"></div>
        </div>
        <div class="col-span-10 flex items-center justify-between md:col-span-11">
            <div>
                <div class="mb-2 h-3 w-32 animate-pulse rounded-full bg-secondary"></div>
                <div class="h-2 w-20 animate-pulse rounded-full bg-secondary"></div>
            </div>
            <div class="h-2 w-5 animate-pulse rounded-full bg-secondary"></div>
        </div>
    </div>
    {/each}
</div>
