<style>
    .input {
        background: rgba(0, 0, 0, 0.95);
    }
</style>

<script lang="ts">
    import { type SearchResult, search, connect } from "$lib/xray";

    type SearchResultType =
        | "token"
        | "account"
        | "transaction"
        | "bonfida-domain"
        | "ans-domain"
        | "backpack-username"
        | null;

    interface SearchResult {
        url: string;
        address: string;
        type: SearchResultType;
        valid: boolean;
        search: string;
    }

    import { onMount, createEventDispatcher } from "svelte";

    import { walletStore } from "@svelte-on-solana/wallet-adapter-core";

    import { showConnectWallet } from "$lib/state/stores/connect-wallet";

    import { showModal } from "$lib/state/stores/modals";

    import Icon from "$lib/components/icon.svelte";

    import { recentSearchesKey } from "$lib/config";

    import shortenString from "../util/shorten-string";

    export let inputEl: HTMLInputElement | null = null;
    export let searchError = "";
    export let size = "sm" as "sm" | "lg";

    export const focusInput = () => {
        inputEl?.focus();
    };

    export const clearSearch = () => {
        inputValue = "";

        inputEl?.focus();
    };

    let inputValue: string = "";
    let isSearching = false;
    let connected = false;
    let isBackpack = false;
    let recent = [] as SearchResult[];

    const dispatch = createEventDispatcher();

    const connectWallet = () => {
        connected = false;

        showConnectWallet();
    };

    const searchFailed = () => {
        isSearching = false;

        showModal("HELP");
    };

    const getRecentSearches = () =>
        JSON.parse(
            localStorage.getItem(recentSearchesKey) || "[]"
        ) as SearchResult[];

    const addRecent = (value: SearchResult) => {
        if (!value.search) {
            return;
        }

        const stored = getRecentSearches();

        // Already exists
        const exists = stored.find(({ url }) => {
            return url === value.url;
        });

        if (exists) {
            return;
        }

        localStorage.setItem(
            recentSearchesKey,
            JSON.stringify([value, ...getRecentSearches()].slice(0, 3))
        );
    };

    const clearRecents = () => {
        window.localStorage.setItem(recentSearchesKey, JSON.stringify([]));
        recent = [];
    };

    const loadSearch = ({ url }: SearchResult) =>
        (window.location.href = url || "/");

    const selectSearch = (data: SearchResult) => {
        addRecent(data);
        loadSearch(data);
    };

    const newSearch = async () => {
        searchError = "";
        isSearching = true;

        if (inputValue) {
            try {
                const response = await fetch(`/api/search/${inputValue}`);
                const data = await response.json();

                if (!data.valid) {
                    searchFailed();
                    return;
                }

                selectSearch(data);
            } catch (error) {
                searchFailed();
            }
        }
    };

    onMount(() => {
        recent = getRecentSearches();

        isBackpack =
            window?.localStorage?.getItem("walletAdapter") === '"Backpack"';
    });

    $: if ($walletStore.connected && !connected) {
        focusInput();

        // inputValue = $walletStore.publicKey?.toBase58() || "";

        addRecent({
            address: inputValue,
            search: inputValue,
            type: "account",
            url: `/account/${inputValue}`,
            valid: true,
        });

        // window.location.href = `/account/${inputValue}`;

        connected = true;
    }
</script>

<div class="relative z-30 my-2 w-full">
    <div class="dropdown w-full">
        <input
            bind:this={inputEl}
            class="input input-bordered h-10 w-full rounded-lg lowercase focus:input-primary"
            class:h-14={size === "lg"}
            placeholder="Search Solana"
            tabindex="0"
            type="text"
            on:focusin={() => dispatch("focusin")}
            on:focusout={() => dispatch("focusout")}
            on:keydown={(e) => {
                if (e.key === "Enter") {
                    newSearch();
                }
            }}
            bind:value={inputValue}
        />
        {#if recent.length > 0 && size !== "sm"}
            <ul
                class="dropdown-content relative my-3 w-full rounded-lg border bg-base-100 p-2 px-4 shadow"
            >
                <div class="flex flex-wrap items-center justify-between">
                    <p class="text-md mb-1 mt-2">recents</p>
                    <button
                        class="btn btn-xs border-none bg-transparent"
                        on:click={clearRecents}
                    >
                        <span class="my-1 lowercase">clear all</span>
                    </button>
                </div>
                {#if recent.length}
                    {#each recent as recentSearch}
                        {#if recentSearch}
                            <li
                                class="m1-ds2 relative z-30 w-full truncate px-0 hover:opacity-60"
                            >
                                <a
                                    class="block w-full max-w-full text-ellipsis rounded-lg px-1 py-2 text-left hover:bg-secondary"
                                    data-sveltekit-reload
                                    href={recentSearch.url}
                                >
                                    <div class="flex">
                                        <div />
                                        <div>
                                            <p
                                                class="text-micro text-xs opacity-50"
                                            >
                                                {shortenString(
                                                    recentSearch?.address
                                                )}
                                            </p>
                                            <p class="text-micro text-xs">
                                                {recentSearch?.search}
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            </li>
                        {/if}
                    {/each}
                {:else}
                    <i class="pt-2 text-xs lowercase opacity-50"
                        >Paste an address or connect a wallet to get started.</i
                    >
                {/if}
            </ul>
        {/if}
    </div>

    <button
        class="btn btn-ghost btn-sm absolute bottom-1/2 right-4 translate-y-1/2 px-2"
        class:loading={isSearching}
    >
        {#if !isSearching}
            <Icon id="search" />
        {/if}
    </button>
</div>

{#if size === "lg"}
    <div
        class="relative z-10 grid grid-flow-dense grid-cols-1 py-2 md:grid-cols-4"
    >
        <button
            class="bg-faint btn btn-outline col-span-4 mb-4 md:ml-2"
            on:click|preventDefault={newSearch}
        >
            <span class="text-sm lowercase">go</span>
        </button>
        <!-- <button
            class="bg-faint btn-outline btn col-span-3 mb-4 md:order-first"
            on:click|preventDefault={connectWallet}
        >
            <span class="text-sm lowercase">{isBackpack ? "🎒" : ""}connect wallet</span>
        </button> -->
    </div>
{/if}
