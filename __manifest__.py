{
    'name': 'Chatter Message Edit',
    'version': '18.0.1.0.0',
    'category': 'Discuss',
    'summary': 'Allows all internal users to edit chatter messages',
    'author': '19 Prince',
    'website': 'https://github.com/19prince/odoo-chatter-edit',
    'license': 'LGPL-3',
    'depends': ['mail'],
    'assets': {
        'web.assets_backend': [
            'mail_message_edit/static/src/js/message_edit_patch.js',
        ],
    },
    'installable': True,
    'auto_install': False,
    'application': False,
}
