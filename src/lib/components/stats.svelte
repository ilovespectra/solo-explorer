<script>
    import formatMoney from "$lib/util/format-money";
    import { SOL } from "$lib/xray";
    import { page } from "$app/stores";
    import { trpcWithQuery } from "$lib/trpc/client";
    import { fade } from "svelte/transition";

    const client = trpcWithQuery($page);

    const tps = client.tps.createQuery();
    const price = client.price.createQuery(SOL);
    const slot = client.currentSlot.createQuery();
</script>

<div class="flex h-8 w-full items-center justify-center text-xs">
    <div class="mr-4">
        {#if !$tps.isLoading}
            <div in:fade={{ duration: 500 }}>
                <span class="font-bold lowercase">TPS </span>
                <span class="opacity-50">{$tps?.data}</span>
            </div>
        {:else}
            <div class="pulse my-2 h-2 w-16 rounded-lg bg-secondary" />
        {/if}
    </div>
    <div class="mr-4">
        {#if !$price.isLoading}
            <div in:fade={{ duration: 500 }}>
                <span class="font-bold lowercase">SOL/USD </span>
                <span class="opacity-50">{formatMoney($price?.data)}</span>
            </div>
        {:else}
            <div class="pulse my-2 h-2 w-20 rounded-lg bg-secondary" />
        {/if}
    </div>
    <div>
        {#if !$slot.isLoading}
            <div in:fade={{ duration: 500 }}>
                <span class="font-bold lowercase">Current Slot </span>
                <span class="opacity-50 hover:opacity-100">
                    <a
                        data-sveltekit-reload
                        href="/block/{$slot?.data}"
                        class="pointer-events-auto hover:link-success"
                    >
                        {$slot?.data?.toLocaleString()}
                    </a>
                </span>
            </div>
        {:else}
            <div class="pulse my-2 h-2 w-32 rounded-lg bg-secondary" />
        {/if}
    </div>
</div>
