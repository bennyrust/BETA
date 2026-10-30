# Coins and collection

Completed ten-frame bowling games earn two coins per point. Completed ten-round shooting sessions earn one coin per 100 points (rounded down). Each game session has one reward receipt; restarting before completing a session does not earn coins.

Blind boxes cost 100 coins and vapes cost 75 coins at the initial S&P 500 baseline of 7743.98. Prices use `round(base price × daily close / baseline close)`, minimum one coin. `data/market.json` contains the quote date and source. The inventory displays the last available quote date, including when stale. Prices do not update from a browser-side external API.

Run `python3 scripts/update-market.py` to refresh from the FRED SP500 daily series. Failed/invalid downloads leave the previous quote intact. The prepared GitHub Actions workflow runs on weekday evenings once installed in the repository. It respects the existing publication block. After this workflow is pushed to the default branch, it refreshes the quote on weekday evenings. A changed quote triggers the existing pages.yml publication workflow, including its required checks.

Wallets are stored locally in IndexedDB, shared across same-origin tabs. Read/write transactions atomically save coins, ownership, and receipts. Existing Buddyologies collection counts migrate once. Purchased toys are granted before animation, so interruption doesn't lose the purchase. Clearing browser site data clears the wallet; this is a local game economy, not a server-verified account system.

Inventory uses 27 storage slots, nine hotbar slots, equipment and crafting silhouettes, stack counts, and a single lazy 3D inspection renderer. Crafting/equipment silhouettes are decorative. Select owned items to inspect; drag to rotate.
