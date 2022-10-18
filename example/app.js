window.global = { 
  isValidJSON: false 
}

const store = new NostrStore()

async function connect(str) {
  // Try decoding the string.
  str = (str.includes('@'))
    ? str
    : str = atob(str)

  // Split the decoded connection string.
  const [ secret, relayUrl ] = str.split('@')
  
  // Connect to the relay.
  await store.connect(relayUrl, secret)
}

function isValidJSON(data) {
  // Check if the data is valid JSON.
  try {
    JSON.parse(data)
    return Boolean(true)
  } catch(err) {
    return Boolean(false)
  }
}

function getEmitter() {
  return store.emitter
}

async function getData() {
  // Getter function for the store.
  return await store.get('content')
}

async function setData(data) {
  // Setter function for the store.
  if (window.global.isValidJSON) {
    return store.set('content', data)
      .then(res => console.log('setData:', res))
  }
}

function clearData() {
  // Clear function for the store.
  store.destroy()
}
