/**
 * a1_library_message_handler.js
 * Part of the A1 Library for displaying a message on screen.
 *  
 * @NApiVersion 2.0
 * @NModuleScope Public
 */
define(['N/ui/serverWidget'],

    /**
     * @param {serverWidget} ui
     */
    function (ui) {

        /**
         * Call the ui to display a message.
         *
         * @param {object} scriptContext
         * @param {string} msgTitle - the title of the message.
         * @param {string} msgMessage - the message to display.
         * @param {string} msgType - the type of message to display.
         * 
         * @return {void}
         */
        function showMessage(scriptContext, msgTitle, msgMessage, msgType) {

            // set defaults for undefined/null values
            var title = (typeof msgTitle == 'undefined' || msgTitle === null) ? 'Default' : msgTitle,
                message = (typeof msgMessage == 'undefined' || msgMessage === null) ? 'Default' : msgMessage,
                type = (typeof msgType == 'undefined' || msgType === null) ? 'CONFIRMATION' : msgType;

            // append script to form
            var inline = scriptContext.form.addField({
                id: 'custpage_trigger_it',
                label: 'not shown',
                type: ui.FieldType.INLINEHTML,
            });
            inline.defaultValue = "<script>jQuery(function($){ require(['/SuiteScripts/A1Comms/includes/ui/a1_lib_ui_message_handler'], function(mod){ mod.showMessage('" + title + "', '" + message + "', '" + type + "');});});</script>";
        }
        return {
            showMessage: showMessage
        };

    });