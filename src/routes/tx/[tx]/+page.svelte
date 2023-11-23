<script lang="ts">
    import type { ProtonTransaction } from "$lib/xray";
    import { onMount, onDestroy, afterUpdate } from "svelte";
    import { page } from "$app/stores";
    import { fly } from "svelte/transition";
    import { trpcWithQuery } from "$lib/trpc/client";
    import Account from "$lib/components/account-data.svelte";
    import shortenAddress from "$lib/util/shorten-string";
    import CopyButton from "$lib/components/copy-button.svelte";
    import IconCard from "$lib/components/icon-card.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { PROGRAM_ID as ACCOUNT_COMPRESSION_ID } from "@solana/spl-account-compression";
    import { showModal } from "$lib/state/stores/modals";
    import JSON from "$lib/components/json.svelte";
    import LogMessages from "$lib/components/log-messages.svelte";
    import Transaction from "$lib/components/transaction.svelte";
    import Collapse from "$lib/components/collapse.svelte";
    import { writable } from 'svelte/store';
    import { initializeApp } from 'firebase/app';
    import {
        getFirestore,
        collection,
        deleteDoc,
        doc,
        setDoc,
        serverTimestamp,
        query,
        where,
        getDocs,
    } from 'firebase/firestore';
    
    import { walletStore } from "@svelte-on-solana/wallet-adapter-core";
    const comments = writable<{ comment: string }[]>([]);
    const publicKey = $walletStore.publicKey;

    // Firebase configuration
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
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
    let fetchPublicKeyInterval: NodeJS.Timer;
    let fetchCommentsInterval: number;
    let isWalletConnected = $walletStore.publicKey !== null;
    $: isWalletConnected = publicKey !== null;
    const sentiment = writable('');
    const fetchPublicKey = () => {
        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }
    
    };
    const rawTransaction = client.rawTransaction.createQuery(signature || "");
    const account = $page.params.account;
    const accountInfo = client.accountInfo.createQuery(account);
    afterUpdate(() => {
        // Update isWalletConnected after each update
        isWalletConnected = $walletStore.publicKey !== null;
    });

    onMount(() => {
        animate = true;
    });

    $: data = $transaction?.data
        ? ($transaction.data as ProtonTransaction)
        : null;

    $: rawData = $rawTransaction?.data;

    $: ({ raw, ...rest } = data || { raw: null });
    const startPublicKeyFetchTimer = () => {
        fetchPublicKeyInterval = setInterval(() => {
            fetchPublicKey();
        }, 2000); // Fetch every 2 seconds (2000 milliseconds)
    };
    // Wallet and comment-related variables
    // const { publicKey } = useWallet();
    const comment = writable('');
    let displayedComments: { comment: string }[] = [];
    
    const fetchComments = async () => {
        const db = getFirestore(app);
        const commentsRef = collection(db, 'txcomment');

        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }

        try {
            // Use the transaction signature as part of the query
            const commentsQuery = query(
                commentsRef,
                where('walletPublicKey', '==', publicKey.toBase58()),
                where('account', '==', signature)
            );

            const querySnapshot = await getDocs(commentsQuery);

            const newComments: { comment: string, walletPublicKey: string }[] = querySnapshot.docs
                .map((doc) => doc.data() as { comment: string, walletPublicKey: string })
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

            await fetchAndMapComments(); // Fetch and map comments on wallet connection

        } catch (error) {
            // Handle any errors if necessary
            // console.error("Error fetching comments:", error);
        }
};

const fetchAndMapComments = async () => {
        const db = getFirestore(app);
        const commentsRef = collection(db, 'txcomment');
        
        try {
            const querySnapshot = await getDocs(commentsRef);
            const fetchedComments = querySnapshot.docs.map(doc => ({
                data: doc.data(),
                id: doc.id
            }));
            
            // Compare fetched comments with displayed comments and assign IDs
            displayedComments = displayedComments.map(displayedComment => {
                const matchingComment = fetchedComments.find(fetchedComment =>
                    fetchedComment.data.comment === displayedComment.comment
                );
                
                if (matchingComment) {
                    return {
                        ...displayedComment,
                        id: matchingComment.id
                    };
                }
                
                return displayedComment;
            });
        } catch (error) {
            // console.error("Error fetching and mapping comments:", error);
        }
};

$: {
        if (isWalletConnected) {
            fetchComments();
            fetchPublicKey();
        }
}

    onMount(() => {
        fetchComments(); 
        fetchPublicKey();

        return () => {

            clearInterval(fetchCommentsInterval);
        };
});
let checkboxSentiment = '';
$: {
        if (checkboxSentiment === '') {
            sentiment.set('neutral');
        } else {
            sentiment.set(checkboxSentiment);
        }
}
    
    const submitComment = async () => {
        const commentText = $comment;
        let selectedSentiment = checkboxSentiment;
        // If no sentiment checkbox is selected, set it to 'neutral'
        if (selectedSentiment === '') {
            selectedSentiment = 'neutral';
        }
        if (commentText) {
            const db = getFirestore(app);
            const commentsRef = collection(db, 'txcomment');
            
            const wallet = $walletStore;
            const publicKey = wallet.publicKey;

            if (!publicKey) {
               
                return;
            }

            const docRef = doc(commentsRef);

            try {
                await setDoc(docRef, {
                    account: signature,
                    comment: commentText,
                    sentiment: selectedSentiment,
                    timestamp: serverTimestamp(),
                    walletPublicKey: publicKey.toBase58(), 
                });
                comment.set('');
                fetchComments(); 
            } catch (error) {
                // Handle the error if necessary
                // console.error("Error submitting comment:", error);
            }
        }
    };
    const handleCheckbox = (value) => {
        if (checkboxSentiment === value) {
            checkboxSentiment = ''; // If the same checkbox is clicked again, unselect it
            sentiment.set('neutral'); // Set sentiment to neutral when unselecting the checkbox
        } else {
            checkboxSentiment = value; // Select the clicked checkbox
            sentiment.set(value); // Set sentiment to the clicked value
        }
};
// Update the sentiment value when checkbox changes
const updateSentiment = (value) => {
        checkboxSentiment = value === checkboxSentiment ? '' : value;
        sentiment.set(checkboxSentiment === '' ? 'neutral' : checkboxSentiment);
};

    const removeComment = async (comment: { comment: string }, index: number) => {
        try {
            // console.log(`Deleting comment: ${comment.comment}`);
            
            const db = getFirestore(app);
            const commentsRef = collection(db, 'txcomment');

            const querySnapshot = await getDocs(commentsRef);
            const docs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

            const commentToDelete = docs.find((doc) => doc.comment === comment.comment);

            if (commentToDelete) {
                await deleteDoc(doc(db, 'txcomment', commentToDelete.id));
                
                // Update displayedComments after successful deletion
                displayedComments = displayedComments.filter(
                    (displayedComment) => displayedComment.comment !== comment.comment
                );

                // Update the comments store
                comments.update((currentComments) =>
                    currentComments.filter(
                        (currentComment) => currentComment.comment !== comment.comment
                    )
                );
            }
        } catch (error) {
            // console.error('Error removing comment:', error);
        }
};

</script>
<style>
    input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        width: 16px;
        height: 16px;
        border: 1px solid #A0AEC0;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        position: relative;
        transition: background-color 0.3s;
    }
    input[type="checkbox"]:checked {
        background-color: #A0AEC0;
    }
    input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        width: 20px;
        height: 20px;
        border: 2px solid #ccc;
        border-radius: 4px;
        outline: none;
        cursor: pointer;
    }
    input[type="checkbox"]:checked {
        background-color: grey;
    }
</style>
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
    <div class="mt-3 mb-5grid mb-3 items-center ml-3 mr-3 gap-3 rounded-lg border p-1 py-3">
        <h2 class="text-lg font-semibold md:text-sm ml-10 lowercase"><b>add tx comment</b></h2>
        
        {#if isWalletConnected}
        <textarea
        class="text-input mt-5 ml-10"
        placeholder="Type your comment here"
        bind:value={$comment}
        style="background-color: #696969"
      ></textarea>
      <br />

      <!-- Checkboxes for bullish and bearish sentiments -->
      <div class="mt-5 ml-10 flex items-center">
          <label class="mr-5 flex items-center">
              <input
                  type="checkbox"
                  checked={checkboxSentiment === 'bullish'}
                  value="bullish"
                  on:change={() => handleCheckbox('bullish')}
              />
              <span class="text-green-500 mr-2">&#8593;</span>
          </label>
          <label class="flex items-center">
              <input
                  type="checkbox"
                  checked={checkboxSentiment === 'bearish'}
                  value="bearish"
                  on:change={() => handleCheckbox('bearish')}
              />
              <span class="text-red-500 mr-2">&#8595;</span>
          </label>
        </div>
      <button class="btn lowercase mb-10 mt-5 ml-10" on:click={submitComment}>
        Submit Comment
      </button>
    {:else}
      <p class="ml-10 text-gray-500">
        Connect your wallet to comment on this account.
      </p>
    {/if}

    {#if $comments.length > 0}
    {#each $comments as comment, index}
      <div class="mb-3 ml-5 px-3 badge mr-5 flex items-center">
        {#if comment.sentiment === 'bullish'}
          <span class="text-green-500 mr-2">&#8593;</span>
        {:else if comment.sentiment === 'bearish'}
          <span class="text-red-500 mr-2">&#8595;</span>
        {/if}
        <p class="text-base">{comment.comment}</p>
        <button
          on:click={() => removeComment(comment, index)}
          class="ml-2 text-gray-500 hover:text-black transition-colors"
    >
        X
    </button>
</div>
{/each}
{:else}
<div class="ml-5 mt-5">
  <p>no comments available.</p>
</div>
{/if}

<div class="content px-3">
    <slot />
</div>
</div>
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
                                    solo: description
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
                        sectionTitle="log messages"
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
