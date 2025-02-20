<style>
    .username-block {
        opacity: 90%;
    }

    .username-block:nth-child(3n + 2) {
        background-color: #aac3e4;
        color: #1f54c7;
    }

    .username-block:nth-child(3n + 1) {
        background-color: #ece18e;
        color: #906508;
    }

    .username-block:nth-child(3n + 3) {
        background-color: #93cfa8;
        color: #31774b;
    }

    .domain-abc {
        background-color: #93c5fd !important;
        color: #1d4ed8 !important;
    }

    .domain-sol {
        background-color: #86efac !important;
        color: #14532d !important;
    }

    .domain-ser {
        background-color: #fb7185 !important;
        color: #881337 !important;
    }

    .domain-blink {
        background-color: #c084fc !important;
        color: #4c1d95 !important;
    }

    .domain-poor {
        background-color: #fafafa !important;
        color: #525252 !important;
    }

    .domain-bonk {
        background-color: #fdba74 !important;
        color: #7c2d12 !important;
    }
</style>

<script lang="ts">
    import { page } from "$app/stores";
    import { trpcWithQuery } from "$lib/trpc/client";
    import { SOL } from "$lib/xray";
    import { onMount } from "svelte";
    import { tweened } from "svelte/motion";
    import formatMoney from "$lib/util/format-money";
    import CopyButton from "$lib/components/copy-button.svelte";
    import Icon from "$lib/components/icon.svelte";
    import Username from "$lib/components/providers/username-provider.svelte";
    import ShortenAddress from "./shorten-address.svelte";

    const client = trpcWithQuery($page);

    export let account: string = "";
    export let link: string = "";

    const accountInfo = client.accountInfo.createQuery(account);
    const price = client.price.createQuery(SOL);

    const balance = tweened(0, {
        duration: 1000,
    });

    let animate = false;
    let isExpanded = false;

    onMount(() => {
        animate = true;
    });

    $: if ($accountInfo?.data?.balance) {
        balance.set($accountInfo.data.balance);
    }

    $: worth = totalTokensBalance + $balance * $price?.data;

    const url = import.meta.env.VITE_HELIUS_URL;

    let totalTokensBalance = 0;

    const getAssetsWithNativeBalance = async () => {
        try {
            const response = await fetch(url, {
                body: JSON.stringify({
                    id: "my-id",
                    jsonrpc: "2.0",
                    method: "searchAssets",
                    params: {
                        displayOptions: {
                            showNativeBalance: true,
                        },
                        ownerAddress: account,
                        tokenType: "fungible",
                    },
                }),
                headers: {
                    "Content-Type": "application/json",
                },
                method: "POST",
            });

            const { result } = await response.json();

            if (result && result.items && Array.isArray(result.items)) {
                const pricedAssets = result.items.filter(
                    (asset) => asset.token_info && asset.token_info.price_info
                );

                if (pricedAssets.length > 0) {
                    pricedAssets.forEach((asset) => {
                        const { symbol, price_info } = asset.token_info;
                        const { total_price } = price_info;
                        const formattedPrice = `$${total_price.toFixed(2)}`;
                    });
                } else {
                    // console.log('No assets with price information found');
                }

                totalTokensBalance = calculateTotalTokens(pricedAssets);
                return totalTokensBalance;
            } else {
                // console.log('No assets or invalid asset data');
            }
        } catch (error) {
            // console.error('Error fetching assets:', error);
        }
    };
    const calculateTotalTokens = (pricedAssets) => {
        if (pricedAssets && pricedAssets.length > 0) {
            return pricedAssets.reduce((total, asset) => {
                const { price_info } = asset.token_info;
                const { total_price } = price_info;
                return total + total_price;
            }, 0);
        }
        return 0;
    };
    getAssetsWithNativeBalance();

    const sortUsernames = (usernames) => {
        const domainPriority = {
            abc: 5,
            blink: 3,
            bonk: 2,
            default: 6,
            poor: 4,
            sol: 1,
        };

        return usernames.sort((a, b) => {
            const aDomain = a.username.split(".").pop() || "default";
            const bDomain = b.username.split(".").pop() || "default";
            return (
                (domainPriority[aDomain] || domainPriority["default"]) -
                (domainPriority[bDomain] || domainPriority["default"])
            );
        });
    };
</script>

<Username
    address={account}
    let:usernames
    let:usernameIsLoading
>
    <div class="nav sticky top-16 z-30 gap-2 bg-base-100 px-3 pt-2">
        <div class="flex flex-col bg-base-100">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <h3 class="md:text-l relative m-0 text-lg font-bold">
                        {account}
                    </h3>
                    <div class="relative flex items-center">
                        <div class="my-2">
                            <CopyButton text={account} />
                            <CopyButton
                                text={link}
                                icon="link"
                            />
                        </div>
                    </div>
                </div>
                <div class="relative text-right">
                    {#if !$price?.isLoading}
                        <h1 class="text-md md:block">
                            <span class="">{formatMoney(worth)}</span>
                            <span class="opacity-50">usd</span>
                        </h1>
                    {/if}
                </div>
            </div>
            {#if usernameIsLoading}
                <div class="flex flex-wrap gap-2 pt-2">
                    {#each [1, 2, 3] as _}
                        <div
                            class="username-block inline-block h-6 w-[72px] animate-pulse rounded-full px-3 py-1 text-xs font-extrabold"
                        />
                    {/each}
                </div>
            {:else if usernames && usernames?.length > 0}
                <div class="flex flex-wrap gap-2 pt-2">
                    {#each sortUsernames(usernames) as username, index}
                        {#if isExpanded || index < 3}
                            <div
                                class={`username-block mb-2 inline-block rounded-full px-3 py-1 text-xs font-extrabold ${
                                    "domain-" + username.username.split(".")[1]
                                }`}
                            >
                                {username.username}
                            </div>
                        {/if}
                    {/each}
                    {#if usernames.length > 3}
                        <button
                            class="text-white-500 ml-5 text-sm"
                            on:click={() => (isExpanded = !isExpanded)}
                        >
                            {isExpanded ? " ▲" : ` ▼ (${usernames.length - 3})`}
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</Username>
