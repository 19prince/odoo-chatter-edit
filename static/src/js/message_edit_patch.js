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

    // In saas-18.2, onClick calls component.props.messageEdition.enterEditModeAsync(message).
    // messageEdition is not passed to Message in the chatter Thread, so this throws silently.
    // Fallback: set message.composer directly; paired with the XML template override below,
    // the Composer renders when message.composer is truthy even without messageEdition.
    const _originalOnClick = editAction.onClick;
    editAction.onClick = (component) => {
        if (component.props.messageEdition) {
            return _originalOnClick(component);
        }
        const message = component.props.message;
        const rawMsg = toRaw(message);
        const text = convertBrToLineBreak(rawMsg.body);
        // Set via reactive proxy so OWL detects the change and re-renders.
        message.composer = {
            mentionedPartners: rawMsg.recipients,
            text,
            selection: { start: text.length, end: text.length, direction: "none" },
        };
        component.optionsDropdown?.close();
    };
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

// Patch the Message COMPONENT so that:
// 1. isEditing is true when message.composer is set directly (fallback path)
// 2. exitEditMode clears message.composer when messageEdition is not available
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
