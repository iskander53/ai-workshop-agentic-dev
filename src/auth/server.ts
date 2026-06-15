// Thin HTTP API over AuthService — the transport that lets the browser UI reach
// the node-only auth logic (node:sqlite / node:crypto). Zero web framework: node:http.
import { createServer, type IncomingMessage } from 'node:http'
import { AuthService } from './authService'
import { SqliteAccountStore } from './sqliteAccountStore'

let store = new SqliteAccountStore(':memory:')
let service = new AuthService(store)

// What the storage inspector shows — proves no plaintext password is persisted.
function storedView() {
  return store.all().map((a) => ({
    name: a.name,
    surname: a.surname,
    country: a.country,
    login: a.login,
    salt: a.credential.salt,
    passHash: a.credential.hash,
  }))
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const url = req.url ?? ''
  const method = req.method ?? 'GET'
  res.setHeader('content-type', 'application/json')

  try {
    if (method === 'POST' && url === '/api/register') {
      const body = (await readJson(req)) as Parameters<AuthService['register']>[0]
      res.end(JSON.stringify(service.register(body)))
      return
    }
    if (method === 'POST' && url === '/api/login') {
      const body = (await readJson(req)) as Parameters<AuthService['login']>[0]
      res.end(JSON.stringify(service.login(body)))
      return
    }
    if (method === 'GET' && url === '/api/accounts') {
      res.end(JSON.stringify(storedView()))
      return
    }
    if (method === 'POST' && url === '/api/seed') {
      // Idempotent demo account (mirrors the handoff's "+ Seed demo account").
      service.register({
        name: 'Bob',
        surname: 'Stone',
        country: 'Canada',
        login: 'bob',
        password: 'secret-pw',
      })
      res.end(JSON.stringify(storedView()))
      return
    }
    if (method === 'POST' && url === '/api/clear') {
      store = new SqliteAccountStore(':memory:')
      service = new AuthService(store)
      res.end(JSON.stringify(storedView()))
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not found' }))
  } catch {
    res.statusCode = 400
    res.end(JSON.stringify({ ok: false, error: 'bad request' }))
  }
})

const PORT = Number(process.env.PORT) || 8787
server.listen(PORT, () => {
  console.log(`auth api listening on http://localhost:${PORT}`)
})
