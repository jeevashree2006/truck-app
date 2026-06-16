# Gmail OTP relay via Google Apps Script (free, no SMTP needed)

Render (and most free hosts) block outbound SMTP, so Gmail's SMTP can't connect.
This relay sends OTP emails **from your own Gmail over HTTPS** — Google runs the script,
your API just makes an HTTPS call to it. Free, no credit card, no server. ~100 emails/day.

`→` = click in the browser.

## 1. Create the script
1. Make sure you're signed into Google as **truckapp02@gmail.com** (the sender).
2. → [script.google.com](https://script.google.com) → **New project**.
3. Delete the sample code, paste the contents of [`Code.gs`](./Code.gs).
4. Replace `REPLACE_WITH_YOUR_SECRET` with the secret you'll also put on the server
   (`GAS_SHARED_SECRET`). → **Save** (💾).

## 2. Deploy as a Web App
1. → **Deploy → New deployment**.
2. **Select type → Web app**.
3. Set:
   - **Execute as:** *Me (truckapp02@gmail.com)*
   - **Who has access:** *Anyone*
4. → **Deploy** → **Authorize access** → pick your account →
   "Google hasn't verified this app" → **Advanced → Go to … (unsafe)** → **Allow**.
   *(It's your own script; the warning is normal for personal scripts.)*
5. Copy the **Web app URL** — it ends in `/exec`.

## 3. Point the API at it (on Render → Environment)
```
GAS_WEBHOOK_URL    = https://script.google.com/macros/s/XXXX/exec
GAS_SHARED_SECRET  = (the same secret you put in Code.gs)
```
Save → Render redeploys. The API now sends OTP emails through your Gmail, over HTTPS.

## Test
```
curl -X POST "$GAS_WEBHOOK_URL" -H "Content-Type: application/json" \
  -d '{"to":"you@example.com","subject":"Test","html":"<b>hi</b>","secret":"YOUR_SECRET"}'
# -> OK   (and the email arrives from your Gmail)
```

## Notes
- If you change `Code.gs` later, you must **Deploy → Manage deployments → Edit → New version**
  for the change to take effect (the `/exec` URL stays the same).
- Quota: consumer Gmail allows ~100 emails/day via `MailApp` — plenty for OTPs.
