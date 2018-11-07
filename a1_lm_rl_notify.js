/**
 * a1_lm_rl_notify
 *
 * Notify NetSuite when legacy event completed
 *
 * @NApiVersion 2.0
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

var modules = ['N/record', 'N/search', 'N/error'];

modules.push('SuiteScripts/A1Comms/includes/a1_lib_crud');
modules.push('SuiteScripts/A1Comms/includes/a1_lib_helpers');

define(modules,
    /**
     * @param {record} record
     * @param {search} search
     * @param {error} error
     * @param {a1_lib_crud} a1_crud
     * @param {a1_lib_helpers} a1_helper
     */
    function (record, search, error, a1_crud, a1_helper) {

        /**
         * Create a NetSuite record from request params - as a POST request
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function post(requestBody) {

            var status = 'fail',
                result = false,
                response = { data: {} };

            try {
                log.audit({
                    title: 'a1_lm_rl_notify@post:requestBody',
                    details: requestBody
                });

                if (requestBody.type === 'stkmain') {
                    // prepare a saved search
                    // 1. find where the legacy sku (stkmain) id matches
                    // 2. find where legacy sku created checkbox is false
                    var itemDetailsSearch = search.create({
                        type: search.Type.ITEM,
                        columns: ['internalid', 'custitem_a1_legacy_sku'],
                        filters: [
                            {
                                'name': 'custitem_a1_legacy_sku',
                                'operator': 'equalto',
                                'values': [requestBody.details.id]
                            },
                            {
                                'name': 'custitem_a1_legacy_sku_created',
                                'operator': 'is',
                                'values': ["F"]
                            }
                        ]
                    });

                    var itemDetails = itemDetailsSearch.run().getRange({
                        start: 0,
                        end: 1
                    });

                    // check that we have a result returned from the saved search
                    if (typeof itemDetails[0] != 'undefined' && itemDetails[0] !== null) {
                        // update the record
                        var itemData = {
                            'custitem_a1_legacy_sku_created': true
                        };

                        if (a1_crud.updateRecord(itemDetails[0].recordType, itemData, itemDetails[0].id)) {
                            // if the record is successfully updated return Success
                            // clears the task from the queue in the callee service
                            status = 'Success';
                            result = true;
                        }
                    } else {
                        // if we don't find a record from the saved search return success
                        // clears the task from the queue in the callee service
                        status = 'Success';
                        result = true;
                    }
                } else if (requestBody.type === 'stkorders') {

                    // prepare a saved search
                    // 1. find where the tranid matches
                    var poDetailsSearch = search.create({
                        type: search.Type.PURCHASE_ORDER,
                        columns: ['internalid'],
                        filters: [
                            {
                                'name': 'tranid',
                                'operator': 'is',
                                'values': [requestBody.details.orderref]
                            }
                        ]
                    });

                    var poDetails = poDetailsSearch.run().getRange({
                        start: 0,
                        end: 1
                    });

                    // check that we have a result returned from the saved search
                    if (typeof poDetails[0] != 'undefined' && poDetails[0] !== null) {
                        // update the record
                        var poData = {
                            'custbody_a1_legacy_po_id': requestBody.details.legacyOrderId
                        };

                        // if the record is successfully updated return Success
                        // clears the task from the queue in the callee service
                        if (a1_crud.updateRecord(poDetails[0].recordType, poData, poDetails[0].id)) {
                            status = 'Success';
                            result = true;
                        }
                    } else {
                        // if we don't find a record from the saved search return success
                        // clears the task from the queue in the callee service
                        status = 'Success';
                        result = true;
                    }
                } else {

                    // do Validation
                    var grnDetails = (typeof requestBody.grnDetails == 'undefined' || requestBody.grnDetails === null) ? 'undefined' : requestBody.grnDetails;
                    var despatchDetails = (typeof requestBody.despatchDetails == 'undefined' || requestBody.despatchDetails === null) ? 'undefined' : requestBody.despatchDetails;

                    if (grnDetails == 'undefined' && despatchDetails == 'undefined') {
                        throw error.create({
                            name: 'MISSING_REQ_ARG',
                            message: 'a1_lm_rl_notify@post:Missing required argument(s): [grnDetails OR despatchDetails]'
                        });
                    }

                    if (grnDetails != 'undefined') {
                        var orderId = (typeof grnDetails.orderId == 'undefined' || grnDetails.orderId === null) ? 0 : grnDetails.orderId;
                        var type = (typeof grnDetails.type == 'undefined' || grnDetails.type === null) ? 'A1PURCHASE' : grnDetails.type;
                        var itemDetails = (typeof grnDetails.itemDetails == 'undefined' || grnDetails.itemDetails === null) ? 'undefined' : grnDetails.itemDetails;

                        if (itemDetails != 'undefined' && type == 'A1PURCHASE') {

                            // Adjusting Inventory
                            var objRecord = record.create({
                                type: record.Type.INVENTORY_ADJUSTMENT,
                                isDynamic: true
                            });

                            var subsidiarySearch = search.create({
                                type: search.Type.SUBSIDIARY,
                                columns: ['internalid'],
                                filters: [
                                    ['name', 'is', 'A1 Comms Group : A1 Comms Ltd (UK)']
                                ]
                            });

                            var subsidiaryResult = subsidiarySearch.run().getRange({
                                start: 0,
                                end: 1
                            });

                            objRecord.setValue({
                                fieldId: 'subsidiary',
                                value: subsidiaryResult[0].id
                            });

                            objRecord.setValue({
                                fieldId: 'account',
                                value: 252 // 003000 Fixed Asset : Intangible Fixed Assets : Other Intangibles
                            });

                            objRecord.setValue({
                                fieldId: 'memo',
                                value: orderId
                            });

                            objRecord.setValue({
                                fieldId: 'department',
                                value: 30 // N/A
                            });

                            objRecord.setValue({
                                fieldId: 'class',
                                value: 58 // N/A
                            });

                            var locationSearch = search.create({
                                type: search.Type.LOCATION,
                                columns: ['internalid'],
                                filters: [
                                    ['name', 'is', 'DataSelect : Bulk Legacy']
                                ]
                            });

                            var locationResult = locationSearch.run().getRange({
                                start: 0,
                                end: 1
                            });

                            objRecord.setValue({
                                fieldId: 'adjlocation',
                                value: locationResult[0].id
                            });

                            for (var sku in itemDetails) {
                                // A1-1234 to 1234
                                var searchSKU = sku.substring(3);

                                var skuSearch = search.create({
                                    type: search.Type.ITEM,
                                    columns: ['internalid', 'custitem_a1_legacy_sku'],
                                    filters: [
                                        {
                                            'name': 'custitem_a1_legacy_sku',
                                            'operator': 'equalto',
                                            'values': [/*"12015"*//*"12016"*/searchSKU]
                                        }
                                    ]
                                });

                                var legacySKU = skuSearch.run().getRange({
                                    start: 0,
                                    end: 1
                                });

                                if (typeof legacySKU[0] != 'undefined' && legacySKU[0] !== null) {
                                    var newSKU = legacySKU[0].id;
                                } else {
                                    // temp
                                    response.result = result;
                                    response.data.message = 'ITEM_NOT_FOUND';

                                    log.audit({
                                        title: 'a1_lm_rl_notify@post:response',
                                        details: JSON.stringify(response)
                                    });

                                    return response;

                                    throw error.create({
                                        name: 'ITEM_NOT_FOUND',
                                        message: 'a1_lm_rl_notify@post:Item Not Found'
                                    });
                                }

                                if (itemDetails.hasOwnProperty(sku)) {
                                    var quantity = a1_helper.set(itemDetails[sku].receivedQuantity) ? parseInt(itemDetails[sku].receivedQuantity, 10) : parseInt('1', 10);
                                    var IMEIserials = (a1_helper.set(itemDetails[sku].IMEI) && itemDetails[sku].IMEI.length) ? itemDetails[sku].IMEI : [];
                                    var SIMserials = (a1_helper.set(itemDetails[sku].SIM) && itemDetails[sku].SIM.length) ? itemDetails[sku].SIM : [];
                                    var serials = (a1_helper.set(itemDetails[sku].SERIAL) && itemDetails[sku].SERIAL.length) ? itemDetails[sku].SERIAL : [];

                                    if (a1_helper.set(sku)) {
                                        // Create one line in the inventory sublist.
                                        objRecord.selectNewLine({
                                            sublistId: 'inventory'
                                        });

                                        objRecord.setCurrentSublistValue({
                                            sublistId: 'inventory',
                                            fieldId: 'item',
                                            value: newSKU
                                        });

                                        objRecord.setCurrentSublistValue({
                                            sublistId: 'inventory',
                                            fieldId: 'location',
                                            value: locationResult[0].id
                                        });

                                        objRecord.setCurrentSublistValue({
                                            sublistId: 'inventory',
                                            fieldId: 'adjustqtyby',
                                            value: quantity
                                        });

                                        // imei serial numbers
                                        if (IMEIserials != 'undefined') {
                                            for (var serial in IMEIserials) {
                                                // Create the subrecord for that line.
                                                var subrec = objRecord.getCurrentSublistSubrecord({
                                                    sublistId: 'inventory',
                                                    fieldId: 'inventorydetail'
                                                });

                                                // Add a line to the subrecord's inventory assignment sublist.
                                                subrec.selectNewLine({
                                                    sublistId: 'inventoryassignment'
                                                });

                                                subrec.setCurrentSublistValue({
                                                    sublistId: 'inventoryassignment',
                                                    fieldId: 'quantity',
                                                    value: 1
                                                });

                                                subrec.setCurrentSublistValue({
                                                    sublistId: 'inventoryassignment',
                                                    fieldId: 'receiptinventorynumber',
                                                    value: IMEIserials[serial]
                                                });

                                                // Save the line in the subrecord's sublist.
                                                subrec.commitLine({
                                                    sublistId: 'inventoryassignment'
                                                });
                                            }
                                        }

                                        // sim serial numbers and not sim-pair
                                        if (IMEIserials == 'undefined' && SIMserials != 'undefined') {
                                            for (var serial in SIMserials) {
                                                // Create the subrecord for that line.
                                                var subrec = objRecord.getCurrentSublistSubrecord({
                                                    sublistId: 'inventory',
                                                    fieldId: 'inventorydetail'
                                                });

                                                // Add a line to the subrecord's inventory assignment sublist.
                                                subrec.selectNewLine({
                                                    sublistId: 'inventoryassignment'
                                                });

                                                subrec.setCurrentSublistValue({
                                                    sublistId: 'inventoryassignment',
                                                    fieldId: 'quantity',
                                                    value: 1
                                                });

                                                subrec.setCurrentSublistValue({
                                                    sublistId: 'inventoryassignment',
                                                    fieldId: 'receiptinventorynumber',
                                                    value: SIMserials[serial]
                                                });

                                                // Save the line in the subrecord's sublist.
                                                subrec.commitLine({
                                                    sublistId: 'inventoryassignment'
                                                });
                                            }
                                        }

                                        // serial numbers
                                        if (serials != 'undefined') {
                                            for (var serial in serials) {
                                                // Create the subrecord for that line.
                                                var subrec = objRecord.getCurrentSublistSubrecord({
                                                    sublistId: 'inventory',
                                                    fieldId: 'inventorydetail'
                                                });

                                                // Add a line to the subrecord's inventory assignment sublist.
                                                subrec.selectNewLine({
                                                    sublistId: 'inventoryassignment'
                                                });

                                                subrec.setCurrentSublistValue({
                                                    sublistId: 'inventoryassignment',
                                                    fieldId: 'quantity',
                                                    value: 1
                                                });

                                                subrec.setCurrentSublistValue({
                                                    sublistId: 'inventoryassignment',
                                                    fieldId: 'receiptinventorynumber',
                                                    value: serials[serial]
                                                });

                                                // Save the line in the subrecord's sublist.
                                                subrec.commitLine({
                                                    sublistId: 'inventoryassignment'
                                                });
                                            }
                                        }

                                        // Save the line in the record's sublist
                                        objRecord.commitLine({
                                            sublistId: 'inventory'
                                        });
                                    }
                                }
                            }

                            var id = objRecord.save();
                            if (id) {
                                if (itemDetails != 'undefined' && type == 'A1PURCHASE') {
                                    for (var sku in itemDetails) {
                                        if (itemDetails.hasOwnProperty(sku)) {
                                            var IMEIserials = (a1_helper.set(itemDetails[sku].IMEI) && itemDetails[sku].IMEI.length) ? itemDetails[sku].IMEI : [];
                                            var SIMserials = (a1_helper.set(itemDetails[sku].SIM) && itemDetails[sku].SIM.length) ? itemDetails[sku].SIM : [];
                                            var PhoneNoserials = (a1_helper.set(itemDetails[sku].PhoneNo) && itemDetails[sku].PhoneNo.length) ? itemDetails[sku].PhoneNo : [];

                                            // imei serial numbers
                                            if (IMEIserials != 'undefined') {
                                                for (var serial in IMEIserials) {
                                                    // get internalid from serial number
                                                    var inventoryNumberSearch = search.create({
                                                        type: search.Type.INVENTORY_NUMBER,
                                                        columns: ['internalid'],
                                                        filters: [
                                                            ['inventorynumber', 'is', IMEIserials[serial]]
                                                        ]
                                                    });

                                                    var inventoryNumberResult = inventoryNumberSearch.run().getRange({
                                                        start: 0,
                                                        end: 1
                                                    });

                                                    if (typeof inventoryNumberResult[0] != 'undefined' && inventoryNumberResult[0] !== null) {
                                                        var invRec = record.load({
                                                            type: record.Type.INVENTORY_NUMBER,
                                                            id: inventoryNumberResult[0].id,
                                                            isDynamic: true
                                                        });

                                                        invRec.setValue({
                                                            fieldId: 'custitemnumber_a1_imei',
                                                            value: IMEIserials[serial]
                                                        });

                                                        if (SIMserials != 'undefined') {
                                                            invRec.setValue({
                                                                fieldId: 'custitemnumber_a1_sim_no',
                                                                value: SIMserials[serial]
                                                            });

                                                            if (PhoneNoserials != 'undefined') {
                                                                invRec.setValue({
                                                                    fieldId: 'custitemnumber_a1_mob_phone_no',
                                                                    value: PhoneNoserials[serial]
                                                                });
                                                            }
                                                        }

                                                        invRec.save();
                                                    } else {
                                                        throw error.create({
                                                            name: 'NOT_FOUND_SERIAL',
                                                            message: 'a1_lm_rl_notify@post:Serial Not Found'
                                                        });
                                                    }
                                                }
                                            }

                                            // sim serial numbers and not sim-pair
                                            if (IMEIserials == 'undefined' && SIMserials != 'undefined') {
                                                for (var serial in SIMserials) {
                                                    // get internalid from serial number
                                                    var inventoryNumberSearch = search.create({
                                                        type: search.Type.INVENTORY_NUMBER,
                                                        columns: ['internalid'],
                                                        filters: [
                                                            ['inventorynumber', 'is', SIMserials[serial]]
                                                        ]
                                                    });

                                                    var inventoryNumberResult = inventoryNumberSearch.run().getRange({
                                                        start: 0,
                                                        end: 1
                                                    });

                                                    if (typeof inventoryNumberResult[0] != 'undefined' && inventoryNumberResult[0] !== null) {
                                                        var invRec = record.load({
                                                            type: record.Type.INVENTORY_NUMBER,
                                                            id: inventoryNumberResult[0].id,
                                                            isDynamic: true
                                                        });

                                                        invRec.setValue({
                                                            fieldId: 'custitemnumber_a1_sim_no',
                                                            value: SIMserials[serial]
                                                        });

                                                        if (PhoneNoserials != 'undefined') {
                                                            invRec.setValue({
                                                                fieldId: 'custitemnumber_a1_mob_phone_no',
                                                                value: PhoneNoserials[serial]
                                                            });
                                                        }

                                                        invRec.save();
                                                    } else {
                                                        throw error.create({
                                                            name: 'NOT_FOUND_SERIAL',
                                                            message: 'a1_lm_rl_notify@post:Serial Not Found'
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                status = 'Success';
                                result = true;
                            }
                        }
                    }

                    if (despatchDetails != 'undefined') {
                        var orderId = (typeof despatchDetails.orderId == 'undefined' || despatchDetails.orderId === null) ? 0 : despatchDetails.orderId;
                        var type = (typeof despatchDetails.type == 'undefined' || despatchDetails.type === null) ? 'Despatched' : despatchDetails.type;
                        var couriersRef = (typeof despatchDetails.couriersRef == 'undefined' || despatchDetails.couriersRef === null) ? 'undefined' : despatchDetails.couriersRef;
                        var itemDetails = (typeof despatchDetails.itemDetails == 'undefined' || despatchDetails.itemDetails === null) ? 'undefined' : despatchDetails.itemDetails;

                        if (itemDetails != 'undefined') {

                            // Adjusting Inventory
                            var objRecord = record.create({
                                type: record.Type.INVENTORY_ADJUSTMENT,
                                isDynamic: true
                            });

                            var subsidiarySearch = search.create({
                                type: search.Type.SUBSIDIARY,
                                columns: ['internalid'],
                                filters: [
                                    ['name', 'is', 'A1 Comms Group : A1 Comms Ltd (UK)']
                                ]
                            });

                            var subsidiaryResult = subsidiarySearch.run().getRange({
                                start: 0,
                                end: 1
                            });

                            objRecord.setValue({
                                fieldId: 'subsidiary',
                                value: subsidiaryResult[0].id
                            });

                            objRecord.setValue({
                                fieldId: 'account',
                                value: 252 // 003000 Fixed Asset : Intangible Fixed Assets : Other Intangibles
                            });

                            objRecord.setValue({
                                fieldId: 'memo',
                                value: orderId + ' ' + couriersRef
                            });

                            objRecord.setValue({
                                fieldId: 'department',
                                value: 30 // N/A
                            });

                            objRecord.setValue({
                                fieldId: 'class',
                                value: 58 // N/A
                            });

                            for (var sku in itemDetails) {
                                // A1-1234 to 1234
                                var searchSKU = sku.substring(3);

                                var skuSearch = search.create({
                                    type: search.Type.ITEM,
                                    columns: ['internalid', 'custitem_a1_legacy_sku'],
                                    filters: [
                                        {
                                            'name': 'custitem_a1_legacy_sku',
                                            'operator': 'equalto',
                                            'values': [/*"12015"*//*"12016"*/searchSKU]
                                        }
                                    ]
                                });

                                var legacySKU = skuSearch.run().getRange({
                                    start: 0,
                                    end: 1
                                });

                                if (typeof legacySKU[0] != 'undefined' && legacySKU[0] !== null) {
                                    var newSKU = legacySKU[0].id;
                                } else {
                                    // temp
                                    response.result = result;
                                    response.data.message = 'ITEM_NOT_FOUND';

                                    log.audit({
                                        title: 'a1_lm_rl_notify@post:response',
                                        details: JSON.stringify(response)
                                    });

                                    return response;

                                    throw error.create({
                                        name: 'ITEM_NOT_FOUND',
                                        message: 'a1_lm_rl_notify@post:Item Not Found'
                                    });
                                }

                                if (itemDetails.hasOwnProperty(sku)) {
                                    var quantity = a1_helper.set(itemDetails[sku].receivedQuantity) ? parseInt('-' + itemDetails[sku].receivedQuantity, 10) : parseInt('-1', 10);
                                    var IMEIserials = (a1_helper.set(itemDetails[sku].IMEI) && itemDetails[sku].IMEI.length) ? itemDetails[sku].IMEI : [];
                                    var SIMserials = (a1_helper.set(itemDetails[sku].SIM) && itemDetails[sku].SIM.length) ? itemDetails[sku].SIM : [];
                                    var serials = (a1_helper.set(itemDetails[sku].SERIAL) && itemDetails[sku].SERIAL.length) ? itemDetails[sku].SERIAL : [];

                                    if (a1_helper.set(sku)) {
                                        // Create one line in the inventory sublist.
                                        objRecord.selectNewLine({
                                            sublistId: 'inventory'
                                        });

                                        objRecord.setCurrentSublistValue({
                                            sublistId: 'inventory',
                                            fieldId: 'item',
                                            value: newSKU
                                        });


                                        objRecord.setCurrentSublistValue({
                                            sublistId: 'inventory',
                                            fieldId: 'adjustqtyby',
                                            value: quantity
                                        });

                                        var inventoryLocation = '';

                                        // imei serial numbers
                                        if (IMEIserials != 'undefined') {
                                            for (var serial in IMEIserials) {

                                                // get internalid from serial number
                                                var inventoryNumberSearch = search.create({
                                                    type: search.Type.INVENTORY_NUMBER,
                                                    columns: ['internalid', 'location'],
                                                    filters: [
                                                        ['inventorynumber', 'is', IMEIserials[serial]]
                                                    ]
                                                });

                                                var inventoryNumberResult = inventoryNumberSearch.run().getRange({
                                                    start: 0,
                                                    end: 1
                                                });

                                                if (typeof inventoryNumberResult[0] != 'undefined' && inventoryNumberResult[0] !== null) {
                                                    var inventoryLocation = inventoryNumberResult[0].getValue({
                                                        name: 'location'
                                                    });

                                                    // Create the subrecord for that line.
                                                    var subrec = objRecord.getCurrentSublistSubrecord({
                                                        sublistId: 'inventory',
                                                        fieldId: 'inventorydetail'
                                                    });

                                                    // Add a line to the subrecord's inventory assignment sublist.
                                                    subrec.selectNewLine({
                                                        sublistId: 'inventoryassignment'
                                                    });

                                                    subrec.setCurrentSublistValue({
                                                        sublistId: 'inventoryassignment',
                                                        fieldId: 'quantity',
                                                        value: '-1'
                                                    });

                                                    subrec.setCurrentSublistValue({
                                                        sublistId: 'inventoryassignment',
                                                        fieldId: 'issueinventorynumber',
                                                        value: inventoryNumberResult[0].id
                                                    });

                                                    // Save the line in the subrecord's sublist.
                                                    subrec.commitLine({
                                                        sublistId: 'inventoryassignment'
                                                    });
                                                } else {
                                                    throw error.create({
                                                        name: 'NOT_FOUND_SERIAL',
                                                        message: 'a1_lm_rl_notify@post:Serial Not Found'
                                                    });
                                                }
                                            }
                                        }

                                        // sim serial numbers and not sim-pair
                                        if (IMEIserials == 'undefined' && SIMserials != 'undefined') {
                                            for (var serial in SIMserials) {

                                                // get internalid from serial number
                                                var inventoryNumberSearch = search.create({
                                                    type: search.Type.INVENTORY_NUMBER,
                                                    columns: ['internalid', 'location'],
                                                    filters: [
                                                        ['inventorynumber', 'is', SIMserials[serial]]
                                                    ]
                                                });

                                                var inventoryNumberResult = inventoryNumberSearch.run().getRange({
                                                    start: 0,
                                                    end: 1
                                                });

                                                if (typeof inventoryNumberResult[0] != 'undefined' && inventoryNumberResult[0] !== null) {
                                                    var inventoryLocation = inventoryNumberResult[0].getValue({
                                                        name: 'location'
                                                    });

                                                    // Create the subrecord for that line.
                                                    var subrec = objRecord.getCurrentSublistSubrecord({
                                                        sublistId: 'inventory',
                                                        fieldId: 'inventorydetail'
                                                    });

                                                    // Add a line to the subrecord's inventory assignment sublist.
                                                    subrec.selectNewLine({
                                                        sublistId: 'inventoryassignment'
                                                    });

                                                    subrec.setCurrentSublistValue({
                                                        sublistId: 'inventoryassignment',
                                                        fieldId: 'quantity',
                                                        value: '-1'
                                                    });

                                                    subrec.setCurrentSublistValue({
                                                        sublistId: 'inventoryassignment',
                                                        fieldId: 'issueinventorynumber',
                                                        value: inventoryNumberResult[0].id
                                                    });

                                                    // Save the line in the subrecord's sublist.
                                                    subrec.commitLine({
                                                        sublistId: 'inventoryassignment'
                                                    });
                                                } else {
                                                    throw error.create({
                                                        name: 'NOT_FOUND_SERIAL',
                                                        message: 'a1_lm_rl_notify@post:Serial Not Found'
                                                    });
                                                }
                                            }
                                        }

                                        // serial numbers
                                        if (serials != 'undefined') {
                                            for (var serial in serials) {

                                                // get internalid from serial number
                                                var inventoryNumberSearch = search.create({
                                                    type: search.Type.INVENTORY_NUMBER,
                                                    columns: ['internalid', 'location'],
                                                    filters: [
                                                        ['inventorynumber', 'is', serials[serial]]
                                                    ]
                                                });

                                                var inventoryNumberResult = inventoryNumberSearch.run().getRange({
                                                    start: 0,
                                                    end: 1
                                                });

                                                if (typeof inventoryNumberResult[0] != 'undefined' && inventoryNumberResult[0] !== null) {
                                                    var inventoryLocation = inventoryNumberResult[0].getValue({
                                                        name: 'location'
                                                    });

                                                    // Create the subrecord for that line.
                                                    var subrec = objRecord.getCurrentSublistSubrecord({
                                                        sublistId: 'inventory',
                                                        fieldId: 'inventorydetail'
                                                    });

                                                    // Add a line to the subrecord's inventory assignment sublist.
                                                    subrec.selectNewLine({
                                                        sublistId: 'inventoryassignment'
                                                    });

                                                    subrec.setCurrentSublistValue({
                                                        sublistId: 'inventoryassignment',
                                                        fieldId: 'quantity',
                                                        value: '-1'
                                                    });

                                                    subrec.setCurrentSublistValue({
                                                        sublistId: 'inventoryassignment',
                                                        fieldId: 'issueinventorynumber',
                                                        value: inventoryNumberResult[0].id
                                                    });

                                                    // Save the line in the subrecord's sublist.
                                                    subrec.commitLine({
                                                        sublistId: 'inventoryassignment'
                                                    });
                                                } else {
                                                    throw error.create({
                                                        name: 'NOT_FOUND_SERIAL',
                                                        message: 'a1_lm_rl_notify@post:Serial Not Found'
                                                    });
                                                }
                                            }
                                        }

                                        objRecord.setCurrentSublistValue({
                                            sublistId: 'inventory',
                                            fieldId: 'location',
                                            value: inventoryLocation
                                        });

                                        // Save the line in the record's sublist
                                        objRecord.commitLine({
                                            sublistId: 'inventory'
                                        });
                                    }
                                }
                            }

                            var locationSearch = search.create({
                                type: search.Type.LOCATION,
                                columns: ['internalid'],
                                filters: [
                                    ['name', 'is', 'DataSelect : Bulk Legacy']
                                ]
                            });

                            var locationResult = locationSearch.run().getRange({
                                start: 0,
                                end: 1
                            });

                            objRecord.setValue({
                                fieldId: 'adjlocation',
                                value: locationResult[0].id
                            });

                            var id = objRecord.save();
                            if (id) {
                                status = 'Success';
                                result = true;
                            }
                        }
                    }
                }

                response.result = result;
                response.data.message = status;

                log.audit({
                    title: 'a1_lm_rl_notify@post:response',
                    details: JSON.stringify(response)
                });

                return response;

            } catch (error) {
                log.error({
                    title: 'a1_lm_rl_notify@post:exception',
                    details: error.toString()
                });

                throw error.create({
                    name: 'EXCEPTION',
                    message: error.toString()
                });
            }
        }

        /**
         * Create a NetSuite record from request params - as a GET request (FOR TESTING ONLY)
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function get(requestBody) {

            requestBody = {
                "type": "stkorders",
                "details": {
                    "orderref": "PO-10000032",
                    "legacyOrderId": 2
                }
            };
            var status = 'fail',
                result = false,
                response = { data: {} };

            try {
                log.audit({
                    title: 'a1_lm_rl_notify@post:requestBody',
                    details: requestBody
                });

                if (requestBody.type === 'stkmain') {
                    // prepare a saved search
                    // 1. find where the legacy sku (stkmain) id matches
                    // 2. find where legacy sku created checkbox is false
                    var itemDetailsSearch = search.create({
                        type: search.Type.ITEM,
                        columns: ['internalid', 'custitem_a1_legacy_sku'],
                        filters: [
                            {
                                'name': 'custitem_a1_legacy_sku',
                                'operator': 'equalto',
                                'values': [requestBody.details.id]
                            },
                            {
                                'name': 'custitem_a1_legacy_sku_created',
                                'operator': 'is',
                                'values': ["F"]
                            }
                        ]
                    });

                    var itemDetails = itemDetailsSearch.run().getRange({
                        start: 0,
                        end: 1
                    });

                    // check that we have a result returned from the saved search
                    if (typeof itemDetails[0] != 'undefined' && itemDetails[0] !== null) {
                        // update the record
                        var itemData = {
                            'custitem_a1_legacy_sku_created': true
                        };

                        if (a1_crud.updateRecord(itemDetails[0].recordType, itemData, itemDetails[0].id)) {
                            // if the record is successfully updated return Success
                            // clears the task from the queue in the callee service
                            status = 'Success';
                            result = true;
                        }
                    } else {
                        // if we don't find a record from the saved search return success
                        // clears the task from the queue in the callee service
                        status = 'Success';
                        result = true;
                    }
                } else if (requestBody.type === 'stkorders') {

                    // prepare a saved search
                    // 1. find where the tranid matches
                    var poDetailsSearch = search.create({
                        type: search.Type.PURCHASE_ORDER,
                        columns: ['internalid'],
                        filters: [
                            {
                                'name': 'tranid',
                                'operator': 'is',
                                'values': [requestBody.details.orderref]
                            }
                        ]
                    });

                    var poDetails = poDetailsSearch.run().getRange({
                        start: 0,
                        end: 1
                    });

                    // check that we have a result returned from the saved search
                    if (typeof poDetails[0] != 'undefined' && poDetails[0] !== null) {
                        // update the record
                        var poData = {
                            'custbody_a1_legacy_po_id': requestBody.details.legacyOrderId
                        };

                        // if the record is successfully updated return Success
                        // clears the task from the queue in the callee service
                        if (a1_crud.updateRecord(poDetails[0].recordType, poData, poDetails[0].id)) {
                            status = 'Success';
                            result = true;
                        }
                    } else {
                        // if we don't find a record from the saved search return success
                        // clears the task from the queue in the callee service
                        status = 'Success';
                        result = true;
                    }
                }
                response.result = result;
                response.data.message = status;
                return JSON.stringify(response);

            } catch (error) {
                log.error({
                    title: 'a1_lm_rl_notify@post:exception',
                    details: error.toString()
                });

                throw error.create({
                    name: 'EXCEPTION',
                    message: error.toString()
                });
            }
        }

        return {
            post: post,
            get: get
        };
    });