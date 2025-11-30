<style>
    .text-sky {
        @apply text-cyan-600; /* FIXED: replaced text-info-content */
    }

    .text-tangerine {
        @apply text-[#e8a034];
    }
</style>

<script lang="ts">
    import { parseProgramLogs } from "$lib/util/program-logs";

    export let logs: string[];

    const parsedLogs = parseProgramLogs(logs);

    const totalComputeUnits = parsedLogs.reduce(
        (sum, log) => sum + log.computeUnits,
        0
    );

    // Helper function to get safe CSS classes
    function getLogClass(style: string) {
        const styleMap: Record<string, string> = {
            error: "text-red-600",
            info: "text-cyan-600",
            sky: "text-cyan-600",
            success: "text-green-600",
            tangerine: "text-[#e8a034]",
            warning: "text-yellow-600",
        };
        return styleMap[style] || "text-gray-600";
    }
</script>

<div class="pt-0">
    {#each parsedLogs as instruction, idx}
        {#if idx === 0}
            <p class="px-3">
                <span class="mb-1">
                    {`#${idx + 1} - `}
                </span>

                <span>
                    {`${instruction.invokedProgram} Instruction`}
                </span>
            </p>
        {:else}
            <p class="px-3 pb-1 pt-3">
                <span class="mb-1">
                    {`#${idx + 1} - `}
                </span>

                <span>
                    {`${instruction.invokedProgram} Instruction`}
                </span>
            </p>
        {/if}
        {#each instruction.logs as log}
            <p class="px-3 pb-1 text-sm {getLogClass(log.style)}">
                <span class="mr-1 {getLogClass(log.style)}">{log.prefix}</span>
                <span>{log.text}</span>
            </p>
        {/each}
    {/each}
</div>

{#if totalComputeUnits > 0}
    <hr class="mx-3 my-1 border border-neutral-400 opacity-80" />
    <div class="px-3 pt-1 text-sm">
        {`${totalComputeUnits} compute units consumed`}
    </div>
{/if}
