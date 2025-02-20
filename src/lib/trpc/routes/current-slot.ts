import { t } from "$lib/trpc/t";
import process from "process";

const { HELIUS_API_KEY } = process.env;

export const currentSlot = t.procedure.query(async () => {
    if (!HELIUS_API_KEY) {
        throw new Error("HELIUS_API_KEY environment variable is not defined.");
    }

    const HELIUS_RPC_URL = `https://optimistic-daisy-fast-mainnet.helius-rpc.com`;

    try {
        const response = await fetch(HELIUS_RPC_URL, {
            body: JSON.stringify({
                id: 1,
                jsonrpc: "2.0",
                method: "getSlot",
                params: [
                    {
                        commitment: "finalized",
                    },
                ],
            }),
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST",
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch slot: ${response.statusText}`);
        }

        const { result } = await response.json();

        if (result === undefined || result === null) {
            throw new Error("No slot data found in the response.");
        }

        return result;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error fetching current slot: ${error.message}`);
        } else {
            throw new Error(`Error fetching current slot: ${String(error)}`);
        }
    }
});
