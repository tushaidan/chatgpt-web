import dns from 'node:dns/promises'

export async function probeTarget(target = {}) {
  const entry_url = target.entry_url || target.url || ''
  const probed_at = new Date().toISOString()
  if (!entry_url) {
    return { reachable: false, error: 'missing_entry_url', probed_at }
  }

  let hostname = ''
  try {
    hostname = new URL(entry_url).hostname
  }
  catch (error) {
    return { reachable: false, error: `invalid_url: ${error.message}`, entry_url, probed_at }
  }

  try {
    const addr = await dns.lookup(hostname)
    const headers = { Accept: 'text/html,application/json', 'User-Agent': 'opsclaw-intelligibility-probe/1.0' }
    const cookie = process.env.OPSCLAW_COOKIE || process.env.OPSONE_COOKIE || ''
    if (cookie)
      headers.Cookie = cookie

    const response = await fetch(entry_url, {
      method: 'GET',
      redirect: 'manual',
      headers,
      signal: AbortSignal.timeout(10000),
    })

    return {
      reachable: response.status > 0 && response.status < 500,
      http_status: response.status,
      ip: addr.address,
      hostname,
      entry_url,
      probed_at,
      cookie_present: Boolean(cookie),
    }
  }
  catch (error) {
    return {
      reachable: false,
      error: error.code || error.cause?.code || error.message,
      hostname,
      entry_url,
      probed_at,
      cookie_present: Boolean(process.env.OPSCLAW_COOKIE || process.env.OPSONE_COOKIE),
    }
  }
}
