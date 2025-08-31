Content Types Overview

Template Support on API Vs. Console

All template types will appear on the Content Templates. Template types that are supported on API only will display the following pop-up when opened in the console.

Template types supported on API.
Expand image
Support
Content Type Console API
twilio/text Yes Yes
twilio/media Yes Yes
twilio/location No Yes
twilio/list-picker Yes Yes
twilio/call-to-action Yes Yes
twilio/quick-reply Yes Yes
twilio/card Yes Yes
twilio/carousel No Yes
twilio/catalog Yes Yes
twilio/flows No Yes
whatsapp/authentication Yes Yes
whatsapp/card Yes Yes
Channel Support and Priority Order

Twilio supports the content types provided in the following table. This table lists the content types in order of content complexity. This ranges from the least complex content (twilio/text) to the most content (whatsapp/authentication). When message handles multiple content types, Twilio sends the most complex translation that the chosen channel supports.

Channel Support
Content Type SMS MMS RCS WhatsApp
Messenger
twilio/text Yes Yes Yes Yes
twilio/media Yes Yes Yes Yes
twilio/location Yes
twilio/quick-replies Yes Yes
twilio/call-to-action Yes Yes
twilio/list-picker Yes
twilio/card Yes Yes Yes
twilio/carousel Yes Yes No
twilio/catalog Yes No
twilio/flows Yes
whatsapp/card Yes
whatsapp/authentication Yes
Channel Media Type Support

Twilio supports the following media types
.

Channel Support
Content Type SMS MMS RCS WhatsApp Messenger
Images Yes Yes Yes Yes
Video Yes Yes Yes Yes
Document Yes Yes Yes Yes
Audio Yes Yes In session only Yes
WhatsApp Approval Requirements

To send messages to WhatApp users, WhatsApp must approve your template. Another API request handles this approval. WhatsApp allows replies to inbound messages without a template for some content types.

WhatsApp Session Type
Twilio Content Type User Initiated: 24 hour Session (initiated by inbound message) Business Initiated: Out of Session (initiated by a business - no inbound message)
twilio/text ✅ Can reply to inbound messages ⚠️ Template approval required to send outbound messages
twilio/media ✅ Can reply to inbound messages ⚠️ Template approval required to send outbound messages
twilio/location ✅ Can reply to inbound messages ❌ Not supported
twilio/call-to-action ⚠️ Template approval may be required to reply to inbound messages based on buttons types present ⚠️ Template approval required to send outbound messages
twilio/quick-reply ✅ Can reply to inbound messages ⚠️ Template approval required to send outbound messages
twilio/list-picker ✅ Can reply to inbound messages ❌ Not supported
twilio/card ⚠️ Template approval may be required to reply to inbound messages based on buttons types present ⚠️ Template approval required to send outbound messages
twilio/carousel ⚠️ Template approval required to reply to inbound messages ⚠️ Template Approval Required to send outbound messages
twilio/catalog ✅ Can reply to inbound messages ⚠️ Template Approval Required to send outbound messages
twilio/flows ⚠️ Template approval required to reply to inbound messages ⚠️ Template Approval Required to send outbound messages
whatsapp/card ⚠️ Template approval may be required to reply to inbound messages based on buttons types present ⚠️ Template approval required to send outbound messages
whatsapp/authentication ⚠️ Template approval required to reply to inbound messages ⚠️ Template approval required to send outbound messages
WhatsApp Template Approval Statuses

Templates can have the following statuses:

Unsubmitted: Indicates that the template has not been submitted to Twilio or WhatsApp for any sort of approval. These templates may still be used in session for some channels and in some WA sessions subject to the WhatsApp approval requirements listed above.
Received: Indicates that your template approval request has been received by Twilio. It is not yet in review by WhatsApp.
Pending: Indicates that the template is now under review by WhatsApp. Review can take up to 24 hours.
Approved: The template was approved by WhatsApp and can be used to notify customers.
Rejected: The template has been rejected by WhatsApp during the review process.
Paused: The template has been paused by WhatsApp due to recurring negative feedback from end users, typically resulting from "block" and "report spam" actions associated with the template. Message templates with this status cannot be sent to end users.
Disabled: The template has been disabled by WhatsApp due to recurring negative feedback from end users or for violating one or more of WhatsApp's policies. Message templates with this status cannot be sent to end users.
Common Components

The following parameters are used as an array in the "Actions" parameter of twilio/quick-reply, twilio/call-to-action, and twilio/card content types.

Actions

Parameter: type

Type: string (enum)

Required: yes

Variable Support: no

Description: The type of action.

Call to Action Values: URL, PHONE_NUMBER
Quick Reply Value: QUICK_REPLY
Card Values: URL, PHONE_NUMBER, QUICK_REPLY
whatsapp/authentication: COPY_CODE
Parameter: title

Type: string

Required:

no - whatsapp/authentication
yes - all others
Variable Support: no - quick_reply buttons on templates for WA business initiated messages. yes - everywhere else

Description: Display value for the action. For type QUICK_REPLY, this is the message that will be sent back when the user taps on the button.

Maximum 25 characters (WhatsApp)
Maximum 20 characters (Facebook)
Parameter: url

Type: string
Required:
yes - URL
no - others
Variable Support: yes
Description: URL to direct to when the recipient taps the button.
Parameter: phone

Type: string (enum)

Required:

yes - PHONE_NUMBER
no - others
Variable Support: no

Description: Phone number to call when the recipient taps the button.

E.164 formatted
Parameter: id

Type: string (enum)

Required: no

Variable Support: yes

Description: Postback payload. This field is not visible to the end user.

Maximum: 128 characters

For unapproved WA templates in session the max is 256 characters
Parameter: copy_code_text

Type: string
Required:
yes - whatsapp/authentication
no - all other templates
Variable Support: no
Description: Display value for the Copy Code button.
