/** @odoo-module **/

import { Message } from "@mail/core/common/message_model";
import { messageActionsRegistry } from "@mail/core/common/message_actions";
import { patch } from "@web/core/utils/patch";

// Move the edit action from sequence 80 (overflow "..." menu) to sequence 25
// so it renders as an inline quick-action in the chatter bar.
// quickActionCount for chatter = 3, so sequences <= 30 show inline.
const editAction = messageActionsRegistry.get("edit");
if (editAction) {
    editAction.sequence = 25;

    // In saas-18.2 the onClick calls component.props.messageEdition.enterEditModeAsync(message).
    // When messageEdition is not in props (observed in chatter context), this throws silently.
    // Fallback: walk the OWL component tree to find the Thread or Chatter that owns a
    // messageEdition, then call enterEditModeAsync on it. Thread re-renders and passes
    // messageEdition back down to Message, making isEditing true and showing the Composer.
    const _originalOnClick = editAction.onClick;
    editAction.onClick = (component) => {
        if (component.props.messageEdition) {
            return _originalOnClick(component);
        }
        const edition = _findMessageEdition(component);
        if (edition) {
            edition.enterEditModeAsync(component.props.message);
        }
        component.optionsDropdown?.close();
    };
}

function _findMessageEdition(component) {
    let node = component.__owl__?.parent;
    while (node) {
        const comp = node.component;
        if (comp && comp.messageEdition) {
            return comp.messageEdition;
        }
        node = node.parent;
    }
    return null;
}

// Allow any internal user to edit comment-type messages on non-channel threads.
// discuss.channel threads keep original author-only behavior.
// editable controls whether the pencil icon shows; allowsEdition gates the onClick condition.
patch(Message.prototype, {
    get editable() {
        if (this.thread?.model === "discuss.channel") {
            return super.editable;
        }
        return this.store.self?.type === "partner" || super.editable;
    },
    get allowsEdition() {
        if (this.thread?.model === "discuss.channel") {
            return super.allowsEdition;
        }
        return this.store.self?.type === "partner" || super.allowsEdition;
    },
});
