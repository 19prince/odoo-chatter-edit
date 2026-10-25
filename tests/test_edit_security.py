from odoo.tests import HttpCase, tagged, new_test_user
from odoo.tests.common import JsonRpcException
from odoo.tools import mute_logger


@tagged('post_install', '-at_install', 'mail_message_edit_security')
class TestMailMessageEditSecurity(HttpCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        if 'crm.lead' not in cls.env:
            cls.skipTest(cls, 'needs crm for record-rule-restricted threads')
        sales = 'base.group_user,sales_team.group_sale_salesman'
        cls.user_a = new_test_user(cls.env, 'edit_a', groups=sales)
        cls.user_b = new_test_user(cls.env, 'edit_b', groups=sales)
        new_test_user(cls.env, 'edit_portal', groups='base.group_portal')
        company2 = cls.env['res.company'].create({'name': 'Other Co'})
        cls.user_b.write({'company_ids': [(4, company2.id)]})
        Lead = cls.env['crm.lead']
        cls.shared = Lead.create({'name': 'shared', 'user_id': False})
        cls.private_b = Lead.create({'name': 'private B', 'user_id': cls.user_b.id})
        cls.other_co = Lead.create({'name': 'other co', 'user_id': False, 'company_id': company2.id})
        post = lambda rec: rec.with_user(cls.user_b).message_post(
            body='original', message_type='comment', subtype_xmlid='mail.mt_note')
        cls.msg_shared = post(cls.shared)
        cls.msg_private = post(cls.private_b)
        cls.msg_other_co = post(cls.other_co)
        cls.msg_notification = cls.shared.message_post(body='original', message_type='notification')
        field = cls.env['ir.model.fields']._get('crm.lead', 'name')
        cls.msg_tracking = cls.env['mail.message'].create({
            'model': 'crm.lead', 'res_id': cls.shared.id, 'body': 'original', 'message_type': 'notification',
            'tracking_value_ids': [(0, 0, {'field_id': field.id, 'old_value_char': 'a', 'new_value_char': 'b'})],
        })
        cls.channel = cls.env['discuss.channel'].with_user(cls.user_b).channel_create(name='team', group_id=None)
        cls.channel.add_members(partner_ids=cls.user_a.partner_id.ids)
        cls.msg_channel = cls.channel.with_user(cls.user_b).message_post(body='original', message_type='comment')

    def _core(self, message):
        return self.make_jsonrpc_request('/mail/message/update_content',
                                         {'message_id': message.id, 'body': '<p>edited</p>', 'attachment_ids': []})

    def _assert_denied(self, call, message):
        with mute_logger('odoo.http'), self.assertRaises(JsonRpcException):
            call(message)
        message.invalidate_recordset()
        self.assertIn('original', str(message.body))

    def test_core_endpoint_denies_portal_and_public(self):
        self.authenticate('edit_portal', 'edit_portal')
        self._assert_denied(self._core, self.msg_shared)
        self.authenticate(None, None)
        self._assert_denied(self._core, self.msg_shared)

    def test_core_endpoint_channel_comment_stays_author_only(self):
        self.authenticate('edit_a', 'edit_a')
        self._assert_denied(self._core, self.msg_channel)
        self.authenticate('edit_b', 'edit_b')
        self._core(self.msg_channel)
        self.msg_channel.invalidate_recordset()
        self.assertIn('edited', str(self.msg_channel.body))

    def test_core_endpoint_non_channel_edit_by_other_internal_user(self):
        self.authenticate('edit_a', 'edit_a')
        for msg in (self.msg_private, self.msg_other_co, self.msg_notification, self.msg_tracking):
            with self.subTest(msg=msg.id):
                self._assert_denied(self._core, msg)
        self._core(self.msg_shared)
        self.msg_shared.invalidate_recordset()
        self.assertIn('edited', str(self.msg_shared.body))

    def test_author_flag_is_real(self):
        self.assertFalse(self.msg_shared.with_user(self.user_a).is_current_user_or_guest_author)
        self.assertTrue(self.msg_shared.with_user(self.user_b).is_current_user_or_guest_author)
