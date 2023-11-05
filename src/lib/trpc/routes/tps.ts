import { Helius } from "helius-sdk";
import { t } from "$lib/trpc/t";

export const tps = t.procedure.query(async () => {
    const heliusApiKey = process.env.HELIUS_API_KEY;

    if (heliusApiKey) {
        const helius = new Helius(heliusApiKey);
        const tps = await helius.rpc.getCurrentTPS();
        return tps;
    } else {
        throw new Error("HELIUS_API_KEY environment variable is not defined.");
    }
});
