---
name: viem writeContract chain param
description: Fix for TS error "Property 'chain' is missing" when calling wc.writeContract()
---

When the wallet client is created with `createWalletClient({ transport: custom(window.ethereum) })`, viem requires either a `chain` or `chain: null` in `writeContract` calls.

Pass `chain: null` explicitly:

```ts
await wc.writeContract({ address, abi, functionName: 'mine', account, chain: null })
```

**Why:** viem's type system requires `chain` to be explicit when the wallet client might not have a static chain attached (injected providers can switch networks).
