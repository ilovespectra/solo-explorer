<script lang="ts">
    import type { Icon as IconType } from "src/lib/types";
    import Icon from "$lib/components/icon.svelte";
    const supportedSearches: Array<[IconType, string]> = [
        ["backpack", "xNFT Backpack usernames like @username"],
        ["globe", ".sol, .abc, .poor, .bonk domains"],
        ["person", "Wallet/Account addresses"],
        ["coins", "Token addresses"],
        ["lightning", "Transaction signatures"],
    ];
</script>

        <p>make comments on accounts, transactions, and tokens, that only you can see (works on Devnet)</p><br>
        <p><i>not intended for sensitive data!</i></p><br>

<p class="mb-3 lowercase">
    Use the search bar to look up any of the following.
</p>

<strong class="lowercase">Supported Searches</strong>

{#each supportedSearches as [icon, text]}
    <div class="my-2 grid grid-cols-6 items-center lowercase">
        <div class="center col-span-1">
            <Icon
                id={icon}
                size="md"
            />
        </div>
        <div class="col-span-5 lowercase">
            <p>{text}</p>
        </div>
    </div>
{/each}
