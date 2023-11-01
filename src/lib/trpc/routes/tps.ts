import { Helius } from "helius-sdk";
import { t } from "$lib/trpc/t";

export const tps = t.procedure.query(async () => {
    const helius = new Helius("16710b5a-e940-4f85-811d-250e26a2c258");

    const tps = await helius.rpc.getCurrentTPS();

    return tps;
});
