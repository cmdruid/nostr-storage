window.global = { 
  isValidJSON: false 
}

const store = new NostrStore()

async function connect(str) {
  // Save the connection string to local storage.
  localStorage.setItem('connectString', str)

  // If no separator exists, try decoding the string.
  str = (!str.includes(':'))
    ? str = atob(str)
    : str
  
  // Split the decoded connection string.
  const [ relayUrl, secret ] = str.split(':')
  
  // Connect to the relay.
  await store.connect('wss://' + relayUrl, secret)
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

function setData(data) {
  // Setter function for the store.
  if (window.global.isValidJSON) {
    store.set('content', data)
  }
}

function clearData() {
  // Clear function for the store.
  store.set('content', '{}')
}
