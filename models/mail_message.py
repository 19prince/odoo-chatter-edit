from odoo import models, api


class MailMessage(models.Model):
    _inherit = 'mail.message'

    @api.depends('author_id')
    def _compute_is_current_user_or_guest_author(self):
        for message in self:
            if (
                self.env.user.has_group('base.group_user')
                and message.message_type == 'comment'
            ):
                message.is_current_user_or_guest_author = True
            else:
                super(MailMessage, message)._compute_is_current_user_or_guest_author()
