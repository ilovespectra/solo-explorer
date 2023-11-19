<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { initializeApp } from 'firebase/app';
    import { getFirestore, collection, addDoc, doc, deleteDoc, getDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
    import { walletStore } from "@svelte-on-solana/wallet-adapter-core";
    
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    };
    interface JournalEntry {
    id: string;
    freeWrite: string;
    // Add other fields if present in your journal entry
  }

    // Use the defined interface to type journalEntries
    let journalEntries: JournalEntry[] = [];
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const publicKey = $walletStore.publicKey;
    let isSuccessMessageVisible = false;
    let formData = {
        freeWrite: '',
        publicKey: '',
    };
  
    $: {
        const wallet = $walletStore;
        if (wallet && wallet.connected) {
            fetchJournalEntries();
        }
}

    onMount(() => {
        fetchJournalEntries();
    });

    onDestroy(() => {
        //
    })
  
    const formatDate = (timestamp) => {
        const date = new Date(timestamp.toDate()); // Convert Firestore timestamp to JavaScript Date object
        const options = {
            day: 'numeric',
            hour: 'numeric',
            hour12: true,
            minute: 'numeric',
            month: 'numeric',
            year: '2-digit', 
        };
        return date.toLocaleString('en-US', options).replace(',', ' -');
};

$: sortedEntries = journalEntries.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

    const handleSubmit = async () => {
        const { freeWrite } = formData;
        const walletPublicKey = $walletStore.publicKey; // Access the user's wallet pubkey

        if (!walletPublicKey) {
            // Handle the case where walletPublicKey is null or undefined
            // console.error('Wallet public key is null or undefined');
            return;
        }

        try {
            await addDoc(collection(db, 'FreewriteEntries'), {
                freeWrite,
                publicKey: walletPublicKey.toBase58(), // Log the user's wallet pubkey
                timestamp: serverTimestamp(),
            });

            formData = {
                freeWrite: '',
                publicKey: '',
            };
            isSuccessMessageVisible = true; // Show the success message

            fetchJournalEntries(); // Fetch comments again after adding a new entry
        } catch (error) {
            // Handle error if needed
        }
};


  
const fetchJournalEntries = async () => {
        const wallet = $walletStore;
        const publicKey = wallet ? wallet.publicKey : null;

        if (!publicKey) return;

        try {
            const querySnapshot = await getDocs(
                query(collection(db, 'FreewriteEntries'), where('publicKey', '==', publicKey.toBase58()))
            );
            journalEntries = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        } catch (error) {
            // console.error('Error fetching journal entries:', error);
        }
};



    const handleChange = (event) => {
        const { name, value } = event.target;
        formData = {
            ...formData,
            [name]: value,
        };
    };

    $: {
        if (isSuccessMessageVisible) {
            // Re-fetch comments when isSuccessMessageVisible changes (after submitting a comment)
            fetchJournalEntries();
        }
}

const removeJournalEntry = async (entryId) => {
        try {
            const db = getFirestore(app);
            const entriesRef = collection(db, 'FreewriteEntries');

            // Get the document reference using the entryId
            const entryDocRef = doc(entriesRef, entryId);

            // Delete the journal entry document
            await deleteDoc(entryDocRef);

            // Update the displayed journal entries after successful deletion
            journalEntries = journalEntries.filter((entry) => entry.id !== entryId);
        } catch (error) {
            // Handle the error if needed
            // console.error('Error removing journal entry:', error);
        }
};

  </script>
  
  <style>
    /* Your retro-inspired minimal styles */
    .container {
      font-family: Courier, monospace;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  
    .input-label {
      margin-bottom: 10px;
    }
  
    .text-input {
      width: 100%;
      padding: 10px;
      margin-bottom: 20px;
      border: 1px solid #ccc;
      border-radius: 4px;
      resize: vertical;
      font-family: Courier, monospace;
    }
  
    .btn {
  padding: 10px 20px;
  background-color: #000;
  color: #fff;
  border: 1px solid #fff; /* Adding a white border */
  border-radius: 8px;
  cursor: pointer;
  font-family: Courier, monospace;
  transition: background-color 0.3s, color 0.3s; /* Adding a transition for smoother color change */
}

.btn:hover {
  background-color: #989898;
  color: #000;
}

    .journal-entry {
    background-color: #4e4e4e;
    border: 1px solid #ccc;
    color: #fff;
    border-radius: 6px;
    padding: 10px;
    margin-top: 20px;
    width: 80vh;
    font-family: Courier, monospace;
  }
  .journal-entry-item {
  position: relative;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  width: 70vh;
  background-color: #393939;
}

.delete-button {
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 5px;
  background-color: transparent;
  border: none;
  color: grey;
  transition: color 0.3s;
}

.delete-button:hover {
  color: rgb(255, 255, 255);
}

  </style>
  
  <div class="container lowercase mb-3">
    {#if $walletStore && !$walletStore.connected}
      <p>Connect Wallet to Journal</p>
    {:else}
      <!-- Form for adding journal entries -->
      <form on:submit|preventDefault={handleSubmit} id="FreewriteEntryForm">
        <div>
          <label class="text-input mt-3" for="freeWrite">
            Write whatever is on your mind...
          </label><br>
          <textarea
            id="freeWrite"
            class="journal-entry"
            required
            rows={3}
            name="freeWrite"
            bind:value={formData.freeWrite}
            on:input={handleChange}
          ></textarea>
        </div>
        <button class="btn lowercase" type="submit">submit</button>
      </form>
      
      <!-- Success message -->
      {#if isSuccessMessageVisible}
        <p><i>your freewrite journal entry has been logged successfully!</i></p>
      {/if}
  
      <div class="container lowercase journal-entries">
        {#if sortedEntries.length > 0}
          {#each sortedEntries as entry}
            <div class="journal-entry-item">
              <p><i>{formatDate(entry.timestamp)}</i></p>
              <p>{entry.freeWrite}</p>
              <button class="delete-button" on:click={() => removeJournalEntry(entry.id)}>X</button>
            </div>
          {/each}
        {:else}
          <p>No journal entries yet.</p>
        {/if}
      </div>
    {/if}
  </div>
  
