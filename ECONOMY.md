# Coins and collection

Completed ten-frame bowling games earn two coins per point. Completed ten-round shooting sessions earn one coin per 100 points (rounded down). Each game session has one reward receipt; restarting before completing a session does not earn coins.

Blind boxes cost 100 coins and vapes cost 75 coins at the initial S&P 500 baseline of 7743.98. Prices use `round(base price × daily close / baseline close)`, minimum one coin. `data/market.json` contains the quote date and source. The inventory displays the last available quote date, including when stale. Prices do not update from a browser-side external API.

Run `python3 scripts/update-market.py` to refresh from the FRED SP500 daily series. Failed/invalid downloads leave the previous quote intact. The prepared GitHub Actions workflow runs on weekday evenings once installed in the repository. It respects the existing publication block. It is not active on the live site until these changes are published. If Pages is built from Actions rather than a branch, connect the quote commit to the repository's Pages deployment workflow.

Wallets are stored locally in IndexedDB, shared across same-origin tabs. Read/write transactions atomically save coins, ownership, and receipts. Existing Buddyologies collection counts migrate once. Purchased toys are granted before animation, so interruption doesn't lose the purchase. Clearing browser site data clears the wallet; this is a local game economy, not a server-verified account system.

Inventory uses 27 storage slots, nine hotbar slots, equipment and crafting silhouettes, stack counts, and a single lazy 3D inspection renderer. Crafting/equipment silhouettes are decorative. Select owned items to inspect; drag to rotate.

## Inventory HUD

Press I or click (I) Inventory to open/close the inventory. The HUD has nine hotbar slots; keys 1–9 select a slot. Drag a whole item stack to any storage or hotbar slot, including the HUD hotbar while the inventory is open. Occupied slots swap. Drops outside slots and cancelled drags do not remove items. Keyboard users can pick up a stack with Enter/Space, Tab to a destination, and press Enter/Space again. Positions and selected hotbar slot persist in the same transactional wallet and synchronize across tabs. New purchases reuse their existing item stack or take the first empty slot. S&P daily close is displayed at the HUD’s top right; no currency, collection totals, or shopping links appear inside the inventory.
