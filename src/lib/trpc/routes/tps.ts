import { t } from "$lib/trpc/t";
import process from "process";

const { HELIUS_API_KEY } = process.env;

export const tps = t.procedure.query(async () => {
    if (!HELIUS_API_KEY) {
        throw new Error("HELIUS_API_KEY environment variable is not defined.");
    }

    const HELIUS_RPC_URL = `https://optimistic-daisy-fast-mainnet.helius-rpc.com`;

    try {
        const response = await fetch(HELIUS_RPC_URL, {
            body: JSON.stringify({
                id: 1,
                jsonrpc: "2.0",
                method: "getRecentPerformanceSamples",
                params: [5],
            }),
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST",
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch performance samples: ${response.statusText}`
            );
        }

        const { result } = await response.json();

        if (!result || result.length === 0) {
            throw new Error("No performance samples found.");
        }
        interface PerformanceSample {
            numTransactions: number;
            samplePeriodSecs: number;
        }
        const totalTransactions = result.reduce(
            (sum: number, sample: PerformanceSample) =>
                sum + sample.numTransactions,
            0
        );
        const totalSeconds = result.reduce(
            (sum: number, sample: PerformanceSample) =>
                sum + sample.samplePeriodSecs,
            0
        );
        const averageTPS = totalTransactions / totalSeconds;

        return averageTPS.toFixed(2);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error fetching TPS: ${error.message}`);
        } else {
            throw new Error(`Error fetching TPS: ${String(error)}`);
        }
    }
});
