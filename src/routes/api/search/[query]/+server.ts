import { json, type RequestEvent } from "@sveltejs/kit";
import fetch from "node-fetch"; // Import the 'node-fetch' library

import { search, connect } from "$lib/xray";

// Update the proxy URL
const PROXY_URL = "https://rpc-proxy.denverhnt.workers.dev";

// Consume a search, return what to do with it
export async function GET({ params }: RequestEvent) {
    const conection = connect("mainnet", ""); // Remove the HELIUS_API_KEY parameter

    const query = params?.query || "";

    try {
        // Make an HTTP request to the proxy URL
        const response = await fetch(`${PROXY_URL}/?query=${query}`, {
            headers: {
                "Content-Type": "application/json",
            },
            method: "GET",
        });

        if (response.ok) {
            // Parse the response JSON
            const result = await response.json();
            return json(result);
        } else {
            throw new Error(
                `Failed to fetch data from proxy: ${response.status}`
            );
        }
    } catch (error) {
        // console.error("Error fetching data from proxy:", error);
        return json({ error: "Failed to fetch data from the proxy." });
    }
}
