/**
 * Workflow Action to Create Transfer Order with Warehouse API
 *
 * @NApiVersion 2.0
 * @NScriptType workflowactionscript
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/A1Comms/includes/config.json
 */

var modules = ['N/record'];

// fall-back: will try to load from the bundle. If it doesn’t find it,
// it will load from the file cabinet
try {
    // Live
    require(['/.bundle/180264/src/a1_lib_request']);
    modules.push('/.bundle/180264/src/a1_lib_request');
} catch (error) {
    // Dev
    modules.push('SuiteScripts/A1Comms/includes/a1_lib_request');
}

try {
    // Live
    require(['/.bundle/180264/src/a1_lib_crud']);
    modules.push('/.bundle/180264/src/a1_lib_crud');
} catch (error) {
    // Dev
    modules.push('SuiteScripts/A1Comms/includes/a1_lib_crud');
}

define(modules,
    /**
     * @param {record} record
     * @param {a1_lib_request} a1_request
     * @param {a1_lib_crud} a1_crud
     */
    function (record, a1_request, a1_crud) {
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         *
         * @return {string}
         */
        function onAction(context) {
            var status = 'Fail';
            try {
                var newRecord = context.newRecord;
                var itemCount = newRecord.getLineCount({
                    sublistId: 'item'
                });

                var type = '';
                var fromLocation = newRecord.getValue({ fieldId: 'location' });
                var transferLocation = newRecord.getValue({ fieldId: 'transferlocation' });
                if (fromLocation == 24 && transferLocation == 23) {
                    type = 'V2B';
                } else if (fromLocation == 23 && transferLocation == 24) {
                    type = 'B2V';
                } else if (fromLocation == 23 && transferLocation == 25) {
                    type = 'B2Q';
                } else if (fromLocation == 24 && transferLocation == 25) {
                    type = 'V2Q';
                }

                var items = [];
                for (var i = 0; i < itemCount; i++) {
                    // check for item group
                    var itemtype = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemtype',
                        line: i
                    });

                    if (itemtype == 'Group' || itemtype == 'EndGroup') {
                        continue;
                    }

                    var quantity = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });

                    var itemId = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });

                    var inventoryDetailId = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'inventorydetail',
                        line: i
                    });

                    var serials = [];
                    if (inventoryDetailId) {
                        var inventoryDetailSubrecord = record.load({
                            type: record.Type.INVENTORY_DETAIL,
                            id: inventoryDetailId,
                            isDynamic: true
                        });

                        inventoryDetailSubrecord.selectLine({
                            sublistId: 'inventoryassignment',
                            line: 0
                        });

                        var inventoryNumber = inventoryDetailSubrecord.getCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber'
                        });

                        var inventoryNumberRecord = record.load({
                            type: record.Type.INVENTORY_NUMBER,
                            id: inventoryNumber,
                            isDynamic: true
                        });

                        serials = [
                            inventoryNumberRecord.getValue({ fieldId: 'inventorynumber' })
                        ];
                    }

                    items.push({
                        'quantity': quantity,
                        'sku': itemId,
                        'serials': serials
                    });
                }

                // load the Transfer Order record
                var txo = record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: newRecord.id,
                    isDynamic: true
                });

                var data = {
                    "themeCode": "default",
                    "orderId": 'TXO-' + newRecord.getValue({ fieldId: 'tranid' }),
                    "type": type,
                    "memo": newRecord.getValue({ fieldId: 'memo' }),
                    "items": items
                };

                // send external request
                var response = a1_request.call('warehouse/stock/v1/transfer', data);

                // get response body
                var responseBody = (typeof response == 'undefined' || response === null) ? false : JSON.parse(response.body);
                if (responseBody && responseBody.result) {
                    if (typeof responseBody.data != 'undefined') {
                        txo.setValue({
                            fieldId: 'custbody_a1_wh_status',
                            value: responseBody.data
                        });
                    } else {
                        log.error({
                            title: 'a1_wh_wf_create_transfer_order@onAction:error-1002',
                            details: 'responseBody.data is undefined'
                        });
                    }

                    txo.save();
                    status = 'Success';
                } else {
                    log.error({
                        title: 'a1_wh_wf_create_transfer_order@onAction:error-1003',
                        details: responseBody
                    });

                    if (typeof responseBody.error.errors.reason != 'undefined') {
                        txo.setValue({
                            fieldId: 'custbody_a1_wh_status',
                            value: responseBody.error.errors.reason
                        });
                        txo.save();
                    } else {
                        log.error({
                            title: 'a1_wh_wf_create_transfer_order@onAction:error-1004',
                            details: 'responseBody.error.errors.reason is undefined'
                        });
                    }
                }

                // create custom record - history
                var historyRecordData = {
                    custrecord_a1_wh_po_ref: txo.id,
                    custrecord_a1_wh_po_request: JSON.stringify(data),
                    custrecord_a1_wh_po_response: JSON.stringify(responseBody)
                };

                a1_crud.saveRecord('customrecord_a1_wh_po_history', historyRecordData);

                return status;
            } catch (error) {
                log.error({
                    title: 'a1_wh_wf_create_transfer_order@onAction:error-1005',
                    details: error.toString()
                });

                return status;
            }
        }

        return {
            onAction: onAction
        };
    });
