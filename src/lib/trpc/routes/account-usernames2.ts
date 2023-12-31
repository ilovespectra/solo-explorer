import { t } from "$lib/trpc/t";
import { z } from "zod";

interface Username {
    type: "bonfida" | "backpack";
    username: string;
}

const getBackpackUsername = async (usernames: Username[], address = "") => {
    const response = await fetch(
        `https://xnft-api-server.xnfts.dev/v1/users/fromPubkey?publicKey=${address}&blockchain=solana`
    );
    const data = await response.json();

    if (data?.user?.username) {
        usernames.push({
            type: "backpack",
            username: data.user.username,
        });
    }
};

const getSolanaDomain = async (usernames: Username[], address = "") => {
    const url = `https://rpc-proxy.denverhnt.workers.dev/v0/addresses/${address}/names`;
    const response = await fetch(url);
    const data = await response.json();

    if (data?.domainNames) {
        for (const domain of data.domainNames) {
            usernames.push({
                type: "bonfida",
                username: `${domain}.sol`,
            });
        }
    }
};

export const accountUsernames = t.procedure
    .input(z.string())
    .output(
        z.array(
            z.object({
                type: z.string(),
                username: z.string(),
            })
        )
    )
    .query(async ({ input: address }) => {
        const usernames: Username[] = [];
        await getBackpackUsername(usernames, address);
        await getSolanaDomain(usernames, address);

        return usernames || [];
    });
// please replace the api key with this api proxy url

// https://rpc-proxy.denverhnt.workers.dev
