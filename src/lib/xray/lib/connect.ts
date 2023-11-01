import { Connection } from "@solana/web3.js";

const networks = {
    devnet: `https://rpc-devnet.helius.xyz/`,
    mainnet: `https://mainnet.helius-rpc.com`,
    solanaMainnet: "https://api.mainnet-beta.solana.com",
};

export type Network = keyof typeof networks;

const heliusKey = process.env.HELIUS_KEY;

export const connect = (network: Network = "mainnet", heliusKey?: string) => {
    let url = networks[network];

    if (heliusKey) {
        url += `?api-key=${heliusKey}`;
    }

    return new Connection(url, "confirmed");
};
