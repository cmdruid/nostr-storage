// Import our required packages.
const nostrEmitter = (typeof window !== 'undefined')
  ? window.NostrEmitter
  : require('nostr-emitter')

const now = () => Math.floor(Date.now() / 1000)

class NostrStore {

  static DEFAULT_OPT = {
    emitter: {}, 
    refreshInterval: 5000,
    commitTimeout: 5000
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
    this.data = new Map()
    this.init = false
    this.connected = false
    this.opt  = { ...NostrStore.DEFAULT_OPT, ...opt }
    this.log  = str => (opt.log) ? opt.log(str) : console.log(str)


    this.emitter = new nostrEmitter({
      kind: 10001,   // Replaceable events.
      since: null,   // We want all historical events.
      selfPub: true, // We want our own events.
      // Pass along options to the emitter.
      ...this.opt.emitter
    })
    
    // We need to borrow the hash util from NostrEmitter.
    this.utils = nostrEmitter.utils

    this.emitter.on('all', data => {
      // Check that we have data in the proper format.
      if (data && typeof data === 'string') {
        this.data = JSON.parse(data, NostrStore.decode)
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
    const { refreshInterval } = this.opt
    const expired = (now() - this.lastUpdate) > refreshInterval
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
    const commitId = this.utils.getRandomString(16)
    const encoded = JSON.stringify(this.data, NostrStore.encode)
    this.emitter.emit(commitId, encoded)
  //   return new Promise((res, rej) => {
  //     setTimeout(() => res(false), this.opt.commitTimeout)
  //     this.emitter.within(commitId, (data) => {
  //       console.log(data, encoded)
  //       return (data === encoded)
  //         ? res(true)
  //         : res(false)
  //     }, this.opt.commitTimeout) 
  //     this.emitter.emit(commitId, encoded)
  //   })
  }

  async has(key) {
    await this.refresh()
    return (this.data.get(key) === true)
  }

  async get(key) {
    await this.refresh()
    return this.data.get(key)
  }

  set(key, value) {
    if (this.data.get(key) === value) {
      return value
    }
    this.data.set(key, value)
    return this.commit()
  }

  delete() {
    this.data.delete(key, value)
    return this.commit()
  }

  clear() {
    this.data = new Map()
    return this.commit()
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
