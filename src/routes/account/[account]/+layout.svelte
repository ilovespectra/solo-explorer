<script lang="ts">
    import { page } from "$app/stores";
    import { onMount, onDestroy, afterUpdate } from "svelte";
    import AccountHeader from "$lib/components/account-header.svelte";
    import { showModal } from "$lib/state/stores/modals";
    import { trpcWithQuery } from "$lib/trpc/client";
    import { PROGRAM_ID as ACCOUNT_COMPRESSION_ID } from "@solana/spl-account-compression";
    import { walletStore } from "@svelte-on-solana/wallet-adapter-core";
    import Icon from "$lib/components/icon.svelte";
    const client = trpcWithQuery($page);

    const account = $page.params.account;
    const accountInfo = client.accountInfo.createQuery(account);
    // Access publicKey from walletStore
    const publicKey = $walletStore.publicKey;

    // Pass publicKey as a prop to AccountHeader component
    const props = { account, link: $page.url.href, publicKey };
    const params = new URLSearchParams(window.location.search);
    const network = params.get("network");
    const isMainnetValue = network === "mainnet";

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

    const comments = writable<{ comment: string }[]>([]);
    const sentiment = writable('');

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
    let fetchCommentsInterval: number;
    const signature = $page.params.account;
    let fetchPublicKeyInterval: NodeJS.Timer;
    let isWalletConnected = $walletStore.publicKey !== null;
    $: isWalletConnected = publicKey !== null;
    const fetchPublicKey = () => {
        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }
    
    };
    
    afterUpdate(() => {
        // Update isWalletConnected after each update
        isWalletConnected = $walletStore.publicKey !== null;
    });
    // Wallet and comment-related variables
    const comment = writable('');
    let displayedComments: { comment: string }[] = [];

    const fetchAndMapComments = async () => {
        const db = getFirestore(app);
        const commentsRef = collection(db, 'actcomment');
        
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

    const fetchComments = async () => {
        const db = getFirestore(app);
        const commentsRef = collection(db, 'actcomment');

        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }

        if (!account) {
            return;
        }
        const commentsQuery = query(
            commentsRef,
            where('walletPublicKey', '==', publicKey.toBase58()),
            where('account', '==', account)  
        );
        try {
            const querySnapshot = await getDocs(commentsQuery);

            const newComments: { comment: string, walletPublicKey: string }[] = querySnapshot.docs
                .map((doc) => doc.data() as { comment: string, walletPublicKey: string })
                .filter((comment) => {
                    
                    return comment.walletPublicKey === publicKey.toBase58() &&
                        !displayedComments.some(
                            (displayedComment) => displayedComment.comment === comment.comment
                        );
                });

            displayedComments = displayedComments.concat(newComments);

            // Update the comments store
            comments.update((currentComments) => [...currentComments, ...newComments]);
        } catch (error) {
            // Handle any errors if necessary
            // console.error("Error fetching comments:", error);
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

        // startCommentFetchTimer();
        // startPublicKeyFetchTimer();
        // Cleanup function
        return () => {
            clearInterval(fetchCommentsInterval);
        };
    });

    onDestroy(() => {
        clearInterval(fetchCommentsInterval);
        clearInterval(fetchPublicKeyInterval);
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
            const commentsRef = collection(db, 'actcomment');

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
                    sentiment: selectedSentiment, // Include sentiment in the Firestore doc
                    timestamp: serverTimestamp(),
                    walletPublicKey: publicKey.toBase58(),
                });
                comment.set('');
                // Fetch updated comments
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
            const commentsRef = collection(db, 'actcomment');

            const querySnapshot = await getDocs(commentsRef);
            const docs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

            const commentToDelete = docs.find((doc) => doc.comment === comment.comment);

            if (commentToDelete) {
                await deleteDoc(doc(db, 'actcomment', commentToDelete.id));
                
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
<div class="relative mx-auto w-full max-w-2xl pb-32">
    <AccountHeader {...props} />
    <div class="mt-3 mb-5grid mb-3 items-center ml-3 mr-3 gap-3 rounded-lg border p-1 py-3">
        <h2 class="text-lg font-semibold md:text-sm ml-10 lowercase"><b>add account comment</b></h2>
        
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
</div>
    <div>
        <div
            class="mx-3 mb-5 mt-3 flex items-center justify-between rounded-lg border"
        >
            <div class="tabs w-full pt-1 lowercase md:w-auto">
                <div />
                <a
                    href={`/account/${account}`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith(`${account}`)}
                    >transactions</a
                >
                <a
                    href={`/account/${account}/tokens`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith("/tokens")}
                    >tokens</a
                >
                <!-- <a
                    href={`/account/${account}/assets?network=${
                        isMainnetValue ? "mainnet" : "devnet"
                    }`}
                    class="tab-bordered tab"
                    class:tab-active={$page.url.pathname.endsWith("/assets")}
                    >Assets</a
                > -->
                <a
                    href={`/account/${account}/journal`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith("/journal")}
                    >journal</a
                >
                <a
                    href={`/account/${account}/view`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith("/view")}
                    >comments</a
                >
                
                {#if $accountInfo?.data?.value?.owner === ACCOUNT_COMPRESSION_ID.toBase58()}
                    <a
                        href={`/account/${account}/concurrent-merkle-tree`}
                        class="tab tab-bordered"
                        class:tab-active={$page.url.pathname.endsWith(
                            "concurrent-merkle-tree"
                        )}>Concurrent Merkle Tree</a
                    >
                {/if}
            </div>
            {#if !$page.url.pathname.endsWith("/tokens") && !$page.url.pathname.endsWith("/assets")}
                <button
                    class="btn-ghost btn-sm btn"
                    on:click={() => showModal("TRANSACTION_FILTER")}
                >
                    <Icon id="settings" />
                </button>
            {/if}
        </div>
    </div>

    <div class="content px-3">
        <slot />
    </div>
</div>
