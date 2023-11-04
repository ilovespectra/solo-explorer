<script lang="ts">
    import type { ProtonTransaction } from "$lib/xray";
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { fly } from "svelte/transition";
    import { trpcWithQuery } from "$lib/trpc/client";
    import Account from "$lib/components/account-data.svelte";
    import shortenAddress from "$lib/util/shorten-string";
    import CopyButton from "$lib/components/copy-button.svelte";
    import IconCard from "$lib/components/icon-card.svelte";
    import Icon from "$lib/components/icon.svelte";
    import JSON from "$lib/components/json.svelte";
    import LogMessages from "$lib/components/log-messages.svelte";
    import Transaction from "$lib/components/transaction.svelte";
    import Collapse from "$lib/components/collapse.svelte";
    import { writable } from 'svelte/store';
    import { initializeApp } from 'firebase/app';
    import {
        getFirestore,
        collection,
        doc,
        setDoc,
        serverTimestamp,
        query,
        where,
        getDocs,
    } from 'firebase/firestore';

    const comments = writable<{ comment: string }[]>([]);


    // Firebase configuration
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    };
    const app = initializeApp(firebaseConfig);

    let animate = false;

    const signature = $page.params.tx;

    const client = trpcWithQuery($page);

    const transaction = client.transaction.createQuery({
        account: $page.url.searchParams
            .get("ref")
            ?.split("@")
            .reduce(
                (acc, ref) =>
                    ref.startsWith("wallet") ? ref.split(":")[1] : acc,
                ""
            ),
        transaction: signature || "",
    });

    const rawTransaction = client.rawTransaction.createQuery(signature || "");

    onMount(() => {
        animate = true;
    });

    $: data = $transaction?.data
        ? ($transaction.data as ProtonTransaction)
        : null;

    $: rawData = $rawTransaction?.data;

    $: ({ raw, ...rest } = data || { raw: null });

    // Wallet and comment-related variables
    // const { publicKey } = useWallet();
    const comment = writable('');
    let displayedComments: { comment: string }[] = [];

    const fetchComments = async () => {
        const db = getFirestore(app);
        const commentsRef = collection(db, 'txcomment');
        const commentsQuery = query(commentsRef, where('tx', '==', signature));
        
        try {
            const querySnapshot = await getDocs(commentsQuery);

            const newComments: { comment: string }[] = querySnapshot.docs
                .map((doc) => doc.data() as { comment: string })
                .filter((comment) => {
                    const isDisplayed = displayedComments.some(
                        (displayedComment) => displayedComment.comment === comment.comment
                    );
                    return !isDisplayed;
                });

            // Add the new comments to the displayed comments list
            displayedComments = displayedComments.concat(newComments);

            // Update the comments store
            comments.update((currentComments) => [...currentComments, ...newComments]);
        } catch (error) {
            // Handle any errors if necessary
        }
    };

onMount(() => {
        fetchComments(); // Fetch comments when the component is mounted
});

const submitComment = async () => {
        const commentText = $comment;
        if (commentText) {
            const db = getFirestore(app);
            const commentsRef = collection(db, 'txcomment');
            const docRef = doc(commentsRef); // Create a new document reference

            try {
                await setDoc(docRef, {
                    comment: commentText,
                    timestamp: serverTimestamp(),
                    tx: signature,
                });
                comment.set('');
                fetchComments(); // Fetch comments to update the list
            } catch (error) {
                // Handle the error if necessary
            }
        }
};

</script>

<div class="content mb-4 mt-4 flex justify-between px-3">
    <h1 class="text-xl font-bold lowercase">Transaction</h1>
    <div
        class="flex"
        on:click|preventDefault
        on:keydown|preventDefault
    >
        <CopyButton
            success=""
            text={$page.params.search}
        />
        <CopyButton
            icon="link"
            success=""
            text={$page.url.href}
        />
    </div>
</div>

{#if animate}
    <div
        in:fly={{
            delay: 500,
            duration: 1000,
            opacity: 0,
            y: 50,
        }}
        class="content pl-2 md:pl-0"
    >
    <h2>add comment</h2>
        <!-- <p>Logged in as: {publicKey?.toBase58()}</p> -->
        <textarea
            class="text-input"
            placeholder="write your comment here"
            bind:value={$comment} 
        ></textarea><br>
        <button class="btn lowercase mb-10" on:click={submitComment}>Submit Comment</button>
        {#if $comments.length > 0}
    <!-- ... -->
    {#each $comments as comment (comment.timestamp)}
        <div class="mb-3">
            <p>{comment.comment}</p>
        </div>
    {/each}
{/if}

        {#if $transaction.isLoading}
            {#each Array(3) as _}
                <div class="py-2">
                    <IconCard />
                </div>
            {/each}
        {:else if data}
            <div class="px-3">
                <Transaction transaction={data} />
            </div>

            {#if data.accounts}
                <div class="px-3 pt-3">
                    <Collapse
                        sectionTitle="account changes"
                        showDetails={Boolean(
                            $transaction?.data?.type === "UNKNOWN"
                        )}
                        hideIcon={true}
                    >
                        {#each data.accounts as account}
                            <Account data={account} />
                        {/each}
                    </Collapse>
                </div>
            {/if}

            <div class="mb-3 px-3">
                <div
                    class="mt-3 grid grid-cols-12 items-center gap-3 rounded-lg border p-1 py-3"
                >
                    {#if rawData?.transaction?.meta?.err}
                        <div class="col-span-2 p-1 md:col-span-1">
                            <div
                                class="center ml-1 h-10 w-10 rounded-full bg-error"
                            >
                                <Icon
                                    id="close"
                                    fill="black"
                                    size="sm"
                                />
                            </div>
                        </div>
                        <div
                            class="col-span-10 flex items-center justify-between md:col-span-11"
                        >
                            <div>
                                <h4 class="text-lg font-semibold md:text-sm lowercase">
                                    Status
                                </h4>
                                <h3 class="mr-2 text-xs opacity-50">
                                    This transaction has failed.
                                </h3>
                            </div>
                            <div class="badge-error badge mr-1">Error</div>
                        </div>
                    {:else}
                        <div class="col-span-2 p-1 md:col-span-1">
                            <div
                                class="center ml-1 h-10 w-10 rounded-full bg-success"
                            >
                                <Icon
                                    id="check"
                                    fill="black"
                                    size="sm"
                                />
                            </div>
                        </div>
                        <div
                            class="col-span-10 flex items-center justify-between md:col-span-11"
                        >
                            <div>
                                <h4 class="text-lg font-semibold md:text-sm lowercase">
                                    Status
                                </h4>
                                <h3 class="mr-2 text-xs opacity-50 lowercase">
                                    This transaction has successfully processed.
                                </h3>
                            </div>
                            <div class="badge-success badge mr-1 lowercase">Success</div>
                        </div>
                    {/if}
                </div>
            </div>
            <div class="mb-3 px-3">
                <div
                    class="mt-3 grid grid-cols-12 items-center gap-3 rounded-lg border p-1 py-3"
                >
                    <div class="col-span-2 p-1 md:col-span-1">
                        <div
                            class="center ml-1 h-10 w-10 rounded-full bg-secondary"
                        >
                            <Icon
                                id="network"
                                size="sm"
                            />
                        </div>
                    </div>
                    <div
                        class="col-span-10 flex items-center justify-between pr-1 md:col-span-11"
                    >
                        <div>
                            <h4 class="text-lg font-semibold md:text-sm lowercase">
                                Network Fee
                            </h4>
                            <h3 class="mr-2 text-xs opacity-50 lowercase">
                                Cost for processing this transaction.
                            </h3>
                        </div>
                        <p class="text-xs md:text-sm lowercase">{data.fee} sol</p>
                    </div>
                </div>
            </div>

            <div class="mb-3 px-3">
                <div
                    class="mt-3 grid grid-cols-12 items-center gap-3 rounded-lg border p-1 py-3"
                >
                    <div class="col-span-2 p-1 md:col-span-1">
                        <div
                            class="center ml-1 h-10 w-10 rounded-full bg-secondary"
                        >
                            <Icon
                                id="box"
                                size="sm"
                            />
                        </div>
                    </div>
                    <div
                        class="col-span-10 flex items-center justify-between pr-1 md:col-span-11"
                    >
                        <div>
                            <h4 class="text-lg font-semibold md:text-sm lowercase">
                                Slot
                            </h4>
                            <h3 class="mr-2 text-xs opacity-50 lowercase">
                                The slot this transaction happened on.
                            </h3>
                        </div>
                        <a
                            data-sveltekit-reload
                            href="/block/{data?.raw?.slot}"
                            class="pointer-events-auto text-xs hover:link-success md:text-sm"
                        >
                            {data?.raw?.slot?.toLocaleString()}
                        </a>
                    </div>
                </div>
            </div>

            {#if data?.raw?.description && !data?.raw?.description
                    .toLowerCase()
                    .includes("unknown")}
                <div class="mb-3 px-3">
                    <div
                        class="mt-3 grid grid-cols-12 items-center gap-3 rounded-lg border p-1"
                    >
                        <div class="col-span-2 p-1 md:col-span-1">
                            <div
                                class="center ml-1 h-10 w-10 rounded-full bg-secondary"
                            >
                                <Icon
                                    id="info"
                                    size="md"
                                />
                            </div>
                        </div>
                        <div
                            class="col-span-10 flex items-center justify-between pr-1 md:col-span-11"
                        >
                            <div class="py-1">
                                <h4 class="text-lg font-semibold md:text-sm lowercase">
                                    Helius Description
                                </h4>
                                <p class="break-all text-xs opacity-50">
                                    {data?.raw?.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <div class="px-3">
                <Collapse
                    sectionTitle="transaction data"
                    showDetails={true}
                    hideIcon={true}
                >
                    <div class="mb-3">
                        <JSON
                            data={rest}
                            label="proton"
                        />
                        <div class="mb-3 mt-1 border border-x-0 border-t-0" />
                    </div>
                    {#if data?.raw}
                        <div class="mb-3">
                            <JSON
                                data={data?.raw}
                                label="enriched"
                            />
                            <div
                                class="mb-3 mt-1 border border-x-0 border-t-0"
                            />
                        </div>
                    {/if}
                    <div>
                        <JSON
                            data={rawData}
                            label="raw"
                        />
                    </div>
                </Collapse>
            </div>

            

            {#if rawData}
                <div class="px-3 pt-3">
                    <Collapse
                        sectionTitle="Log Messages"
                        showDetails={Boolean(
                            $transaction?.data?.type === "UNKNOWN"
                        )}
                        hideIcon={true}
                    >
                        <LogMessages
                            logs={rawData?.transaction?.meta?.logMessages || []}
                        />
                    </Collapse>
                </div>
            {/if}
        {/if}
    </div>
{/if}
