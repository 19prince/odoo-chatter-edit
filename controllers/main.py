from odoo.http import request
from odoo.addons.mail.controllers.thread import ThreadController


class MailMessageEditThreadController(ThreadController):
    def _is_message_editable(self, message, **kwargs):
        # Core /mail/message/update_content calls this after _get_with_access(message, "create"),
        # and its strict update still allows comment-type messages only.
        # Authorship stays real; Discuss channel messages stay author/admin only.
        return super()._is_message_editable(message, **kwargs) or (
            request.env.user._is_internal()
            and message.model
            and message.model != "discuss.channel"
            and message.res_id
        )
