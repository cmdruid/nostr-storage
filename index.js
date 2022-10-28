// Import our required packages.
const nostrEmitter = (typeof window !== 'undefined')
  ? window.NostrEmitter
  : require('@cmdcode/nostr-emitter')

const now = () => Math.floor(Date.now() / 1000)

class NostrStore {

  static DEFAULT_OPT = {
    emitter: {}, 
    refreshTimeout: 5000,
    commitTimeout: 5000
  }

  static DEFAULT_EMIT_OPT = {
    kind: 10001,   // Replaceable events.
    since: null,   // We want all historical events.
    selfPub: true, // We want our own events.
  }

  static utils = nostrEmitter.utils

  static encode(key, value) {
    // Convert non-standard javascript objects to json.
    if (value instanceof Map)
      return { type: 'Map', value: [ ...value ] }
    if (value instanceof Date)
      return { type: 'Date', value: value }
    return value;
  }

  static decode(key, value) {
    // Convert non-standard json objects to javascript.
    if (typeof value === 'object' && value !== null) {
      if (value.type === 'Map') return new Map(value.value)
      if (value.type === 'Date') return new Date(value.value)
    }
    return value;
  }

  constructor(opt = {}) {
    // Configure our store object.
    this.data = new Map()
    this.storeId = null
    this.init = false
    this.connected = false
    this.opt  = { ...NostrStore.DEFAULT_OPT, ...opt }
    this.log  = str => (opt.log) ? opt.log(str) : console.log(str)

    // Configure our underlying emitter object.
    this.emitter = new nostrEmitter({
      ...NostrStore.DEFAULT_EMIT_OPT,
      ...this.opt.emitter
    })
    
    // We need to borrow some utils from NostrEmitter.
    this.utils = nostrEmitter.utils

    // Our main event handler.
    this.emitter.on('all', (data, meta) => {
      // Check that we have data in the proper format.
      if (data && typeof data === 'string') {
        this.data = JSON.parse(data, NostrStore.decode)
        this.storeId = meta.id
      }
      // Else, check if we need to initialize.
      else if (!this.init) {
        this.data = new Map()
        this.init = true
      }
      // Else, something is wrong.
      else {
        this.log('Invalid data:', data)
      }
      // Update our internal timestamp.
      this.lastUpdate = now()
    })
  }

  async connect(relayUrl, secret) {
    // Pass the url to the emitter.
    this.emitter.relayUrl = relayUrl;
    // Use the secret for generating the signing key.
    this.emitter.signSecret = secret;
    // Use a hashed version of the secret to encrypt the data.
    this.emitter.secret = await new NostrStore.utils.hash(secret).hex()
    // Connect to the relay.
    return this.emitter.connect().then(() => this.connected = this.emitter.connected)
  }

  hasExpired() {
    // Check if our data store has expired.
    const { refreshTimeout } = this.opt
    const expired = (now() - this.lastUpdate) > refreshTimeout
    return expired
  }

  async refresh() {
    // If the data is stale, resub to the relay.
    if (this.hasExpired()) {
      this.emitter.subscribe()
    }
  }

  async commit() {
    // Commit our data to the relay.
    const { commitTimeout } = this.opt
    const commitId = this.utils.getRandomString(16)
    const encoded = JSON.stringify(this.data, NostrStore.encode)
    return new Promise((res, rej) => {
      setTimeout(() => res(null), commitTimeout)
      this.emitter.within(commitId, (data) => {
        return (data === encoded)
          ? res(this.data)
          : res(null)
      }, commitTimeout) 
      this.emitter.emit(commitId, encoded)
    })
  }

  async has(key) {
    await this.refresh()
    return (this.data.get(key) === true)
  }

  async get(key) {
    await this.refresh()
    return this.data.get(key)
  }

  async set(key, value) {
    if (this.data.get(key) === value) {
      return this.data
    }
    this.data.set(key, value)
    return this.commit()
  }

  async delete(key) {
    this.data.delete(key)
    return this.commit()
  }

  async clear() {
    this.data = new Map()
    return this.commit()
  }

  async destroy() {
    await this.refresh()
    await this.clear()
    if (this.storeId) {
      this.emitter.emit('destroy', '', {
        kind: 5,
        tags: [['e', this.storeId ]]
      })
    }
    return null
  }

  keys() {
    return this.data.keys()
  }
  
  values() {
    return this.data.values()
  }

  entries() {
    return this.data.entries()
  }

  toString() {
    return JSON.stringify(this.data, null, 2)
  }

  [Symbol.iterator]() {
    return this.data[Symbol.iterator]()
  }
}

// Handle exports between browser and node.
if (typeof window !== 'undefined') {
  window.NostrStore = NostrStore
} else {
  module.exports = NostrStore
}
