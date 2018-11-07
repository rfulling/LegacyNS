/**
 * Process Inventory Transfer from Warehouse API
 *
 * @NApiVersion 2.0
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

var modules = ['N/record', 'N/search', 'N/error'];

// fall-back: will try to load from the bundle. If it doesn’t find it,
// it will load from the file cabinet
try {
    // Live
    require(['/.bundle/180264/src/a1_lib_crud']);
    modules.push('/.bundle/180264/src/a1_lib_crud');

    require(['/.bundle/180264/src/a1_lib_helpers']);
    modules.push('/.bundle/180264/src/a1_lib_helpers');
} catch (error) {
    // Dev
    modules.push('SuiteScripts/A1Comms/includes/a1_lib_crud');
    modules.push('SuiteScripts/A1Comms/includes/a1_lib_helpers');
}

var context = 
    {
        "call": "transferOrderConfirmation",
        "issueDate": "2017-08-15",
        "orderId": "TXO-14",
        "memo": "Bulk To Virtual",
        "type": "B2V",
        "status": "Completed",
        "itemDetails": {
            "3573": {
                "receivedQuantity": "1",
                "originalQuantity": "1",
                "date": "2017-08-15 00:00:00.0",
                "serials": [
                    "111111111111111"
                ]
            }
        }
    }


require(modules,
    /**
     * @param {record} record
     * @param {search} search
     * @param {errorerror} error
     * @param {a1_lib_crud} a1_crud
     * @param {a1_lib_helpers} a1_helper
     */
   
    function (record, search, error, a1_crud, a1_helper) {
        /**
         * Create a NetSuite record from request params
         *
         * @param {Object} context
         *
         * @return {string}
         */
        post(context);
        function post(context) {
            var result = null;
            try {
                log.audit({
                    title: 'a1_wh_rl_inventory_transfer_confirmation@post:request',
                    details: context
                });

                // do Validation
                var orderId = (typeof context.orderId == 'undefined' || context.orderId === null) ? 0 : context.orderId;
                var memo = (typeof context.memo == 'undefined' || context.memo === null) ? '' : context.memo;
                var type = (typeof context.type == 'undefined' || context.type === null) ? 'undefined' : context.type;
                var status = (typeof context.status == 'undefined' || context.status === null) ? 'undefined' : context.status;
                var itemDetails = (typeof context.itemDetails == 'undefined' || context.itemDetails === null) ? 'undefined' : context.itemDetails;

                if (type == 'undefined' || itemDetails == 'undefined') {
                    throw error.create({
                        name: 'MISSING_REQ_ARG',
                        message: 'a1_wh_rl_inventory_transfer_confirmation@post:Missing required argument(s): [type, itemDetails]'
                    });
                }

                if (orderId) {
                    // Transfer Order
                    var transferOrder = search.global({
                        // TXO-30 to 30
                        keywords: 'transfer: ' + orderId.substring(4)
                    });

                    if (transferOrder == '') {
                        throw error.create({
                            name: 'NOT_FOUND_TXO',
                            message: 'a1_wh_rl_inventory_transfer_confirmation@post:Transfer Order Not Found.'
                        });
                    }

                    var id = transferOrder[0].id;
                    var objRecord = record.transform({
                        fromType: record.Type.TRANSFER_ORDER,
                        fromId: id,
                        toType: record.Type.ITEM_FULFILLMENT,
                        isDynamic: true
                    });

                    var itemCount = objRecord.getLineCount({
                        sublistId: 'item'
                    });

                    var receivedSKU = [];
                    for (var sku in itemDetails) {
                        if (itemDetails.hasOwnProperty(sku)) {
                            for (var i = 0; i < itemCount; i++) {
                                // check for item group
                                var itemtype = objRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'itemtype',
                                    line: i
                                });

                                if (itemtype == 'Group' || itemtype == 'EndGroup') {
                                    continue;
                                }

                                // load the Item Sublist value
                                var itemId = objRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                });

                                // Check if we've received the sku
                                var alreadyReceived = false;
                                for (var s in receivedSKU) {
                                    if (receivedSKU[s] == itemId) {
                                        alreadyReceived = true;
                                    }
                                }

                                if (alreadyReceived) {
                                    continue;
                                }

                                // assume partial order, so mark this item as not received
                                // Update Line
                                objRecord.selectLine({
                                    sublistId: 'item',
                                    line: i
                                });

                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'itemreceive',
                                    value: false
                                });

                                objRecord.commitLine({
                                    sublistId: 'item'
                                });

                                // item received
                                if (sku == itemId) {
                                    var receivedQuantity = itemDetails[sku].receivedQuantity;
                                    var serials = (a1_helper.set(itemDetails[sku].serials) && itemDetails[sku].serials.length) ? itemDetails[sku].serials : [];

                                    // Update Line
                                    objRecord.selectLine({
                                        sublistId: 'item',
                                        line: i
                                    });

                                    objRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'itemreceive',
                                        value: true
                                    });

                                    objRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        value: receivedQuantity
                                    });

                                    objRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'location',
                                        value: 23
                                    });

                                    objRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'tolocation',
                                        value: 24
                                    });

                                    // serial numbers
                                    for (var serial in serials) {
                                        log.audit({
                                            title: 'serial',
                                            details: serials[serial]
                                        });

                                        // Create the subrecord for that line.
                                        var subrecordInvDetail = objRecord.getCurrentSublistSubrecord({
                                            sublistId: 'item',
                                            fieldId: 'inventorydetail'
                                         

                                        });

                                        // subrecordInvDetail.selectNewLine({
                                        //     sublistId: 'inventoryassignment'
                                        // });

                                        // subrecordInvDetail.setCurrentSublistValue({
                                        //     sublistId: 'inventoryassignment',
                                        //     fieldId  : 'receiptinventorynumber',
                                        //     value    : serials[serial]
                                        // });

                                        // subrecordInvDetail.commitLine({
                                        //     sublistId: 'inventoryassignment'
                                        // });

                                        // Add a line to the subrecord's inventory assignment sublist.
                                      //  subrecordInvDetail.selectNewLine({
                                      //      sublistId: 'inventoryassignment'
                                      //  });

                                        subrecordInvDetail.setCurrentSublistValue({
                                            sublistId: 'inventoryassignment',
                                            fieldId: 'quantity',
                                            line: 0 ,
                                            value : 1
                                        });

                                        // get internalid from serial number
                                        var inventoryNumberSearch = search.create({
                                            type: search.Type.INVENTORY_NUMBER,
                                            columns: ['internalid'],
                                            filters: [
                                                ['inventorynumber', 'is', serials[serial]]
                                            ]
                                        });

                                        var inventoryNumberResult = inventoryNumberSearch.run().getRange({
                                            start: 0,
                                            end: 1
                                        });

                                        subrecordInvDetail.setCurrentSublistValue({
                                            sublistId: 'inventoryassignment',
                                            fieldId: 'issueinventorynumber',
                                            line: 0 ,
                                            value:  inventoryNumberResult[0].id
                                        });

                                        // Save the line in the subrecord's sublist.
                                        subrecordInvDetail.commitLine({
                                            sublistId: 'inventoryassignment'
                                        });
                                    }
                                    
                                    // 'C' - Shipped if you want to combine the steps to pick, pack and ship orders.
                                    objRecord.setValue({
                                        fieldId: 'shipstatus',
                                        value: 'C'
                                    });

                                    objRecord.commitLine({
                                        sublistId: 'item'
                                    });

                                    result = 'Success';
                                    receivedSKU.push(sku);
                                }
                            }
                        }
                    }

                    var historyMsg = 'Failed';
                    if (result == 'Success') {
                        objRecord.save();

                        // Create Item Receipt
                        var billRecord = record.transform({
                            fromType: record.Type.TRANSFER_ORDER,
                            fromId: id,
                            toType: record.Type.ITEM_RECEIPT,
                            isDynamic: true
                        });

                        billRecord.save();
                        historyMsg = status;
                    }
                } else {
                    // Inventory Transfer
                    var objRecord = record.create({
                        type: record.Type.INVENTORY_TRANSFER,
                        isDynamic: true
                    });

                    objRecord.setValue({
                        fieldId: 'subsidiary',
                        value: 1
                    });

                    if (type == 'V2B') {
                        objRecord.setValue({
                            fieldId: 'location',
                            value: 24
                        });

                        objRecord.setValue({
                            fieldId: 'transferlocation',
                            value: 23
                        });
                    } else if (type == 'B2V') {
                        objRecord.setValue({
                            fieldId: 'location',
                            value: 23
                        });

                        objRecord.setValue({
                            fieldId: 'transferlocation',
                            value: 24
                        });
                    } else if (type == 'B2Q') {
                        objRecord.setValue({
                            fieldId: 'location',
                            value: 23
                        });

                        objRecord.setValue({
                            fieldId: 'transferlocation',
                            value: 25
                        });
                    } else if (type == 'V2Q') {
                        objRecord.setValue({
                            fieldId: 'location',
                            value: 24
                        });

                        objRecord.setValue({
                            fieldId: 'transferlocation',
                            value: 25
                        });
                    } else if (type == 'Q2B') {
                        objRecord.setValue({
                            fieldId: 'location',
                            value: 25
                        });

                        objRecord.setValue({
                            fieldId: 'transferlocation',
                            value: 23
                        });
                    }

                    if (a1_helper.set(memo)) {
                        objRecord.setValue({
                            fieldId: 'memo',
                            value: memo
                        });
                    }

                    for (var sku in itemDetails) {
                        if (itemDetails.hasOwnProperty(sku)) {
                            var quantity = a1_helper.set(itemDetails[sku].receivedQuantity) ? parseInt(itemDetails[sku].receivedQuantity, 10) : parseInt('1', 10);

                            objRecord.selectNewLine({
                                sublistId: 'inventory',
                            });

                            if (a1_helper.set(sku)) {
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'inventory',
                                    fieldId: 'item',
                                    value: sku
                                });
                            }

                            objRecord.setCurrentSublistValue({
                                sublistId: 'inventory',
                                fieldId: 'adjustqtyby',
                                value: quantity
                            });

                            objRecord.commitLine({
                                sublistId: 'inventory'
                            });
                        }
                    }

                    var historyMsg = 'Failed';
                    var id = objRecord.save();
                    if (id) {
                        result = 'Success';
                        historyMsg = result;
                    }
                }

                log.audit({
                    title: 'a1_wh_rl_inventory_transfer_confirmation@post:response',
                    details: result
                });

                // create custom record - history
                var historyRecordData = {
                    custrecord_a1_wh_po_ref: id,
                    custrecord_a1_wh_po_request: JSON.stringify(context),
                    custrecord_a1_wh_po_response: historyMsg
                };

                a1_crud.saveRecord('customrecord_a1_wh_po_history', historyRecordData);

                return result;
            } catch (error) {
                log.error({
                    title: 'a1_wh_rl_inventory_transfer_confirmation@post:exception',
                    details: error.toString()
                });

                throw error.create({
                    name: 'EXCEPTION',
                    message: error.toString()
                });
            }
        }

        return {
            post: post
        };
    });
