<script lang="ts">
    export let addresses: Array<string>;

    import shortenString from "$lib/util/shorten-string";

    import { hideModal } from "$lib/state/stores/modals";
</script>

{#each addresses as address}
    <a
        href="/account/{address}"
        data-sveltekit-reload
        class="btn btn-ghost w-full lowercase">{shortenString(address, 8)}</a
    >
{/each}
