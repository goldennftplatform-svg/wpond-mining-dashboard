#!/usr/bin/env node
/** Probe where live wPOND claim drips actually go. */
const key = process.env.HELIUS_API_KEY;
if (!key) {
  console.error('NO_KEY');
  process.exit(1);
}
const rpc = `https://mainnet.helius-rpc.com/?api-key=${key}`;
const MINT = '3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq';
const HOUSE = new Set([
  'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT',
  '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL',
  '5KXZCyUaqHJ1T2wbcMXvLt9jYR87tDJS2Bf71gxYSZNt',
  'HdM9481g5mXApUUsMSMxwVcRVcTde7nqLjGsgqMMf4P2',
  '2aC1XMPKr9yj9RdK6fPrGZ9QhC6b3zbn5aKfZQnUrWeP',
  '2Ag1QgyyJj2nS6nD6SLbpAUFaWPhaDrmHwrGwWpMqV9K',
]);

async function enhanced(sig) {
  const er = await fetch(`https://api.helius.xyz/v0/transactions/?api-key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transactions: [sig] }),
  });
  const j = await er.json();
  return j[0];
}

async function sigs(addr, limit = 30) {
  const r = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [addr, { limit }],
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result || [];
}

async function scan(label, addr) {
  const list = await sigs(addr, 25);
  console.log(`\n=== ${label} ${addr.slice(0, 6)}...${addr.slice(-4)} n=${list.length} ===`);
  if (list[0]) console.log('newest', new Date(list[0].blockTime * 1000).toISOString());
  let miners = 0;
  const samples = [];
  for (const s of list.slice(0, 15)) {
    const t = await enhanced(s.signature);
    const transfers = (t?.tokenTransfers || []).filter((x) => x.mint === MINT && x.tokenAmount > 0);
    for (const x of transfers) {
      const to = x.toUserAccount;
      const from = x.fromUserAccount;
      if (!to || HOUSE.has(to)) continue;
      miners += 1;
      samples.push({
        when: new Date((t.timestamp || s.blockTime) * 1000).toISOString(),
        amount: x.tokenAmount,
        from: (from || '').slice(0, 6),
        to: `${to.slice(0, 6)}...${to.slice(-4)}`,
        sig: s.signature.slice(0, 12),
      });
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  console.log('non-house receives in sample:', miners);
  console.log(samples.slice(0, 12));
}

(async () => {
  await scan('payout', 'AYg4dKoZJudVkD7Eu3ZaJjkzfoaATUqfiv8w8pS53opT');
  await scan('sister', '1orFCnFfgwPzSgUaoK6Wr3MjgXZ7mtk8NGz9Hh4iWWL');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
