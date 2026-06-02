# Chatter Message Edit — Odoo 18 Module

Allows **all internal users** to edit any comment-type chatter message — not just the original author.

By default in Odoo 18, the edit button exists but is buried in the `...` overflow menu and only appears for the message author. This module:

1. **Makes the edit button visible** as an inline quick-action (moves it from the overflow menu to the action bar)
2. **Removes the author restriction** so any internal user can edit chatter comments on any record

Portal and public users are unaffected. Discuss channel messages keep their original author-only behavior.

---

## Compatibility

- Odoo **18.0** (Community or Enterprise)
- Depends on: `mail`

---

## Installation

1. Copy the `mail_message_edit/` folder into your custom addons directory
2. Add the path to `addons_path` in your `odoo.conf` if needed
3. Restart Odoo
4. Go to **Settings → Apps → Update Apps List**
5. Search for **"Chatter Message Edit"** and click **Install**

Or via CLI:

```bash
./odoo-bin -u mail_message_edit -d your_database
```

---

## How It Works

### Backend (`models/mail_message.py`)

Overrides `_compute_is_current_user_or_guest_author` on `mail.message`. Any internal user gets `is_current_user_or_guest_author = True` for comment-type messages, which is the field checked by the `/mail/message/update_content` HTTP controller.

### Frontend (`static/src/js/message_edit_patch.js`)

Two OWL patches:

- **Registry patch**: Sets the `edit` action's sequence from `80` → `25`, moving it inside the `quickActionCount = 3` threshold and making it a visible inline button
- **Model patch**: Overrides the `allowsEdition` getter on `Message` to return `true` for any internal user on non-channel chatter threads

---

## Usage

1. Open any record with a chatter (CRM lead, sale order, project task, etc.)
2. Hover over any comment — a pencil (✏️) icon appears in the message action bar
3. Click it — the message body becomes an inline editor
4. Edit and save — the message updates with an "edited" indicator

---

## License

LGPL-3 — free to use and modify.

Made by [19 Prince](https://19prince.com) — Odoo implementation consultancy.
