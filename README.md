# nostr-storage
A shared, encrypted cloud storage using Nostr.

## Installation
This package is designed to work in both the browser and nodejs.

```html
<!-- Browser import -->
<script src='https://bundle.run/noble-secp256k1@1.2.14'></script>
<script src="https://unpkg.com/nostr-emitter"></script>
<script src="https://unpkg.com/nostr-storage"></script>
```

```js
// Commonjs import.
const NostrStorage = require('nostr-storage')
// ES6 import.
import NostrStorage from 'nostr-storage'
```

## How to Use
To get started, simply provide a relay server and shared secret to use, then run `store.connect()`.

Once connected, the store behaves like a typical localStorage object.
```js
// Declare a new store object.
const store = new NostrStore()

// Connect your store to the relay.
await store.connect(
  'wss://nostr-relay.wlvs.space',
  'secret-string'
)

// NostrStore exposes a typical Map / localStorage API.
store
  .has('key') => Promise(true || false)
  .get('key') => Promise('value')
  .keys()     => [ 'key1', 'key2' ... ]
  .values()   => [ 'val1', 'val2' ... ]
  .entries()  => [ ['key1', 'val1'], ['key2', 'val2'] ... ]

// You can also use NostrStore in an iterator.
for (let [ key, val ] of store) {
  console.log(key, val)
}

// These methods will return whether the data operation suceeded.
store
  .set('key', 'value') => Promise(true || false)
  .delete('key')       => Promise(true || false)
  .clear()             => Promise(true || false)

// These methods assist with data fetching under the hood.
store
  .refresh()  // Fetch the latest copy from the relay.
  .commit()   // Commit the current store to the relay.

// NostrStore is configurable with some basic options.
const store = new NostrStore({
  refreshInterval: 5000,
  commitTimeout: 5000,
  emitter: { /* You can also configure the emitter here. */ }
})
```

## How it Works
Nostr Storage uses replace-able events in order to store a serialized (and encrypted) copy of the data store. The shared secret is hashed multiple times, with each round used to generate the signature keys, encryption keys, and finally a label for filtering the events.

It is safe to reveal the encryption key, without revealing the signature key.

This project uses nostr-emitter. To fully understand how it all works, see this link: https://github.com/cmdruid/nostr-emitter


## Resources

**Nostr Emitter**  
Used under-the-hood for talking to relays.  
https://github.com/cmdruid/nostr-emitter

**Nostr Implementation Possibilities**  
https://github.com/nostr-protocol/nips

**Nostr-tools**  
https://github.com/fiatjaf/nostr-tools

## Contributions
All contributions are welcome!
