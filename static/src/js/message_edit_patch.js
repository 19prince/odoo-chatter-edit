/** @odoo-module **/

import { Message } from "@mail/core/common/message_model";
import { messageActionsRegistry } from "@mail/core/common/message_actions";
import { patch } from "@web/core/utils/patch";

// Move the edit action from sequence 80 (overflow "..." menu) to sequence 25
// so it renders as a visible quick-action in the chatter bar.
// quickActionCount for chatter = 3, so sequences ≤ 30 show inline.
const editAction = messageActionsRegistry.get("edit");
if (editAction) {
    editAction.sequence = 25;
}

// Allow any internal user to edit comment-type messages on non-channel threads.
// discuss.channel threads keep original author-only behavior.
patch(Message.prototype, {
    get allowsEdition() {
        if (this.thread?.model === "discuss.channel") {
            return super.allowsEdition;
        }
        return this.store.self.isInternalUser ?? super.allowsEdition;
    },
});
