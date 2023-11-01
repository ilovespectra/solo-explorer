import { t } from "$lib/trpc/t";
import { z } from "zod";

// Remove the API key since we're using a proxy URL
// const { HELIUS_API_KEY } = process.env;

import { connect } from "$lib/xray";

// TODO: add output validation once this merges with the token endpoint
export const asset = t.procedure.input(z.string()).query(async ({ input }) => {
    const url = `https://rpc-proxy.denverhnt.workers.dev/?api-key=${input}`;

    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
        },
        method: "GET", // Change the method to GET since we're using a URL parameter
    });

    const data = await response.json();
    let metadata = {
        address: "",
        assetHash: "",
        attributes: [],
        collectionKey: "",
        compressed: false,
        creatorHash: "",
        creators: [],
        dataHash: "",
        delegate: "",
        description: "",
        frozen: false,
        image: "",
        leafId: 0,
        mutable: false,
        name: "",
        owner: "",
        sellerFeeBasisPoints: 0,
        seq: 0,
        tree: "",
    };

    if (data?.result?.compression?.compressed === true) {
        const assetData = await fetch(data.result.content.json_uri);
        const returnAssetData = await assetData.json();

        metadata = {
            address: data?.result?.id || "",
            assetHash: data?.result?.compression?.asset_hash,
            attributes: returnAssetData?.attributes || [],
            collectionKey: data?.result?.grouping[0]?.group_value || "",
            compressed: true,
            creatorHash: data?.result?.compression?.creator_hash,
            creators: data?.result?.creators || [],
            dataHash: data?.result?.compression?.data_hash,
            delegate: data?.result?.ownership?.delegated
                ? data?.result?.ownership?.delegate
                : "",
            description: returnAssetData?.description || "",
            frozen: data?.result?.ownership?.frozen,
            image: returnAssetData?.image || "",
            leafId: data?.result?.compression?.leaf_id,
            mutable: data?.result?.mutable,
            name: returnAssetData?.name || "",
            owner: data?.result?.ownership?.owner || "",
            sellerFeeBasisPoints: data?.result?.sellerFeeBasisPoints || 0,
            seq: data?.result?.compression?.seq,
            tree: data?.result?.compression?.tree,
        };
    }
    return metadata;
});
