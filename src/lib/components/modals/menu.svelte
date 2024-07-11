{#each [
    { name: "home", url: "/" }, 
    { name: "x", url: "https://x.com/soloexplorerxyz" },
    { name: "docs", url: "https://solo-docs.vercel.app/" },
    { name: "build", url: "https://github.com/ilovespectra/solo-explorer" }, 
    { name: "links", url: "https://linktr.ee/soloxyz" },
    { name: "helius", url: "https://helius.xyz" }] as { name, url }}
    <a
        href={url}
        data-sveltekit-reload
        class="btn btn-ghost w-full lowercase">{name}</a
    >
{/each}
