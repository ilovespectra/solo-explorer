<script lang="ts">
    import { page } from "$app/stores";
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import Icon from "$lib/components/icon.svelte";
    import Search from "$lib/components/search.svelte";
    import Stats from "$lib/components/stats.svelte";
    import { walletStore } from "@svelte-on-solana/wallet-adapter-core";
    import { showModal } from "$lib/state/stores/modals";
    import { showConnectWallet } from "$lib/state/stores/connect-wallet";

    let isBackpack = false;

    const connectWallet = async (event: Event) => {
        event.preventDefault();

        try {
            // Trigger the wallet connection
            await showConnectWallet();

            // No need to track connected status here
        } catch (error) {
            // Handle errors during wallet connection if needed
            // console.error("Error connecting wallet:", error);
        }
    };

    onMount(() => {
        isBackpack =
            window?.localStorage?.getItem("walletAdapter") === '"Backpack"';
    });
</script>

<Stats />
<nav
    class="sticky left-0 top-0 z-40 grid h-full grid-cols-6 items-center justify-between border bg-black p-1 px-0"
>
    <div class="col-span-4 flex items-center md:col-span-2">
        <div
            class="mx-2 flex items-center"
            in:fly={{ duration: 750, x: -50 }}
        >
            <a
                class="btn btn-ghost flex items-center px-2"
                href="/"
                rel="noreferrer"
            >
                <img
                    src="https://github.com/ilovespectra/solo-explorer/blob/main/src/public/helius-icon.png?raw=true"
                    alt="Helius Icon"
                    class="mr-2 h-8 w-auto"
                />
                <span class="text-3xl lowercase">solo:</span>
            </a>
        </div>

        <div class="ml-2" />
    </div>
    <div class="col-span-2 hidden items-center justify-end md:block">
        {#if $page.url.pathname !== "/"}
            <!-- Add the Search component only if the wallet is not connected -->
            <Search />
        {/if}
    </div>
    <div class="col-span-2 flex items-center justify-end">
        <div class="flex justify-end pr-2">
            <button
                class="btn btn-ghost"
                on:click={() => showModal("HELP")}
            >
                <Icon
                    id="question"
                    size="md"
                />
            </button>
            <button
                class="btn btn-ghost"
                on:click={() => showModal("MENU")}
            >
                <Icon
                    id="hamburger"
                    size="lg"
                />
            </button>
        </div>
        <button
            class="bg-faint md:order-second btn btn-outline mr-3"
            on:click={connectWallet}
        >
            {#if $walletStore.connected}
                <!-- If wallet is connected, display abbreviated public key -->
                <span class="text-sm capitalize">
                    {$walletStore.publicKey?.toBase58()?.slice(0, 8) || ""}...
                </span>
            {:else}
                <!-- If wallet is not connected, display default text -->
                <span class="text-sm lowercase"
                    >{isBackpack ? "🎒" : ""}Connect Wallet</span
                >
            {/if}
        </button>
    </div>
</nav>

{#if $page.url.pathname !== "/"}
    <button
        class="btn btn-secondary btn-sm fixed bottom-4 right-3 z-10 cursor-pointer rounded-full"
        on:click={() => window.scrollTo({ behavior: "smooth", top: 0 })}
    >
        <Icon
            id="arrowUp"
            size="sm"
        />
    </button>
{/if}
