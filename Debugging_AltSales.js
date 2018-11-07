/**
 * Copyright (c) 1998-2017 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 */

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Aug 2017     mbuenavides       Initial Version
 * 1.10       24 Aug 2017     rfulling         converted to before submit (for matrix items)
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NScriptName NS | UE | Auto Assign UPC Codes
 * @NScriptId customscript_auto_assign_upc
 */

define(['N/runtime', 'N/error', 'N/search', 'N/record', 'N/format'],
    function (runtime, error, search, record, format) {

        function beforeSubmit(context) {
            //function afterSubmit(context) {
            var stLoggerTitle = 'afterSubmit';
            try {
                log.debug(stLoggerTitle, '*Entry log | ' + context.type + '*');
                var recordObj = context.newRecord;

                log.debug(stLoggerTitle, 'Start processing ' + recordObj.type + ' id=' + recordObj.id);
                              

                var mySO = record.load({
                    type: record.Type.SALES_ORDER,
                    id: recordObj.id,
                    isDynamic: false,
                });

                var numLines = mySO.getLineCount({
                    sublistId: 'item'
                });
                for (var i = 1; i < numLines; i++) {

                    mySO.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: '10',
                        line: i
                    });

                  //  mySO.setSublistValue({
                  //      sublistId: 'item',
                  //      fieldId: 'custcol4',
                 //       value: '10.10',
                 //       line: i
                //    });

                    custcol4
                }
               // recordObj.commitLine({
             ////       sublistId: 'item'
            //    });
                
            }
            catch (err) {
                var message = stLoggerTitle;
                var stError = (err.getDetails != undefined) ? err.getCode() + ': ' + err.getDetails() : err.toString();
                var stLoggerTitle = (message) ? message : 'Error';
                var errorObj = error.create(
                    {
                        name: '9999',
                        message: stLoggerTitle + ' | Reason = ' + stError,
                        notifyOff: false
                    });

                throw errorObj.message;

                //log error
                log.debug(stLoggerTitle, stError);
            }
        }

        return {
            // afterSubmit: afterSubmit
            beforeSubmit: beforeSubmit
        };
    });
