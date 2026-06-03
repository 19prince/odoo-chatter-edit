/** @odoo-module **/

import { Message } from "@mail/core/common/message_model";
import { Message as MessageComponent } from "@mail/core/common/message";
import { messageActionsRegistry } from "@mail/core/common/message_actions";
import { convertBrToLineBreak } from "@mail/utils/common/format";
import { patch } from "@web/core/utils/patch";
import { toRaw } from "@odoo/owl";

// Move the edit action from sequence 80 (overflow "..." menu) to sequence 25
// so it renders as an inline quick-action in the chatter bar.
// quickActionCount for chatter = 3, so sequences <= 30 show inline.
const editAction = messageActionsRegistry.get("edit");
if (editAction) {
    editAction.sequence = 25;

    // In saas-18.2 the onClick calls component.props.messageEdition.enterEditModeAsync().
    // When messageEdition is not in props (chatter context), this throws silently.
    // Fix: try props.messageEdition first, then walk the OWL ComponentNode parent chain
    // to find Thread's own messageEdition. If found, enterEditModeAsync triggers a
    // reactive re-render that passes messageEdition back down to Message via the template.
    // If messageEdition cannot be found at all, fall back to directly setting
    // message.composer (requires the XML template patch to make the Composer visible).
    const _originalOnClick = editAction.onClick;
    editAction.onClick = (component) => {
        if (component.props.messageEdition) {
            return _originalOnClick(component);
        }
        const edition = _findMessageEdition(component);
        if (edition) {
            edition.enterEditModeAsync(component.props.message);
        } else {
            // Last-resort fallback: set message.composer directly.
            // Composer visibility is controlled by the XML template patch.
            const message = component.props.message;
            const rawMsg = toRaw(message);
            const text = convertBrToLineBreak(rawMsg.body);
            message.composer = {
                mentionedPartners: rawMsg.recipients,
                text,
                selection: { start: text.length, end: text.length, direction: "none" },
            };
        }
        component.optionsDropdown?.close();
    };
}

// Walk the OWL ComponentNode parent chain to find a component with messageEdition.
// In OWL 2, component.__owl__ is the ComponentNode; .parent is the parent ComponentNode
// (the Thread component's node), whose .component is the Thread instance.
function _findMessageEdition(component) {
    let node = component.__owl__?.parent;
    while (node) {
        if (node.component?.messageEdition) {
            return node.component.messageEdition;
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

// Patch the Message COMPONENT for the fallback case when messageEdition is absent:
// 1. isEditing returns true when message.composer is set directly
// 2. exitEditMode clears message.composer instead of calling messageEdition.exitEditMode()
// When messageEdition IS present (standard flow), both delegate to the original behavior.
patch(MessageComponent.prototype, {
    get isEditing() {
        return (
            this.props.message.eq(this.props.messageEdition?.editingMessage) ||
            !!this.props.message.composer
        );
    },
    exitEditMode() {
        if (this.props.messageEdition) {
            this.props.messageEdition.exitEditMode();
        } else {
            this.props.message.composer = undefined;
        }
    },
});
