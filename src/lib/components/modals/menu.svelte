{#each [
    { name: "home", url: "/" }, 
{ name: "docs", url: "https://solo-docs.vercel.app/" },
{ name: "contribute", url: "https://github.com/ilovespectra/solo-explorer" }, 
{ name: "follow us on solarplex", url: "https://www.solarplex.xyz/profile/solo.live.solarplex.xyz" },
{ name: "About Helius APIs", url: "https://helius.xyz" }] as { name, url }}
    <a
        href={url}
        data-sveltekit-reload
        class="btn btn-ghost w-full lowercase">{name}</a
    >
{/each}
