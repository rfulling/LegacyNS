/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.0        12 Dec 2017     Rfulling
 *
 *
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define([
    'N/search',
    'N/record',
    'N/error',
    'N/runtime',
    'N/email',
    'N/file'
], function (search, record, error, runtime, email, file) {

    /*
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function handleErrorAndSendNotification(e, stage) {
        log.error('Stage: ' + stage + ' failed', e);

        var author = -5;
        var recipients = 'russell@totalwarehouse.com';
        var subject = 'Mass Update Script   ' + runtime.getCurrentScript().id + ' failed for stage: ' + stage;
        var body = 'An error occurred with the following information:\n' +
            'Error code: ' + e.name + '\n' +
            'Error msg: ' + e.message;

        email.send({
            author: author,
            recipients: recipients,
            subject: subject,
            body: body
        });
    }

    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        if (inputSummary.error) {
            var e = error.create({
                name: 'INPUT_STAGE_FAILED',
                message: inputSummary.error
            });
            handleErrorAndSendNotification(e, 'getInputData');
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(function (key, value) {
            var msg = 'Failure to update Transaction id: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
            errorMsg.push(msg);
            return true;
        });
        if (errorMsg.length > 0) {
            var e = error.create({
                name: 'RECORD_UPDATE_FAILED',
                message: JSON.stringify(errorMsg)
            });
            handleErrorAndSendNotification(e, stage);
        }
    }

    function createSummaryRecord(summary) {
        var reduceSummary = summary.reduceSummary;
        var contents = '';
        summary.output.iterator().each(function (key, value) {
            contents += (key + ' ' + value + '\n');
            log.debug('in the each ', contents);
            //return true;
        });


        try {
            var seconds = summary.seconds;
            var usage = summary.usage;
            var yields = summary.yields;

        }

        catch (e) {
            handleErrorAndSendNotification(e, 'summarize');
        }
    }

    function getInputData() {
        //get a list of projects to update
        var scriptObj = runtime.getCurrentScript();
        var myIn = {};

        //log.debug("Script parameter of params: " , scriptObj.getParameter({name: 'custscriptrtf'}));
        var arrAsset = [];
        arrAsset = JSON.parse(scriptObj.getParameter({ name: 'custscriptrtf' }));
        //log.debug('asset id = ', arrAsset[0].id);


        arrAsset = JSON.parse(scriptObj.getParameter({ name: 'custscriptrtf' }));
        var soId = scriptObj.getParameter({ name: 'custscriptsoid' });
        // log.debug('soid  = ', soId);
        //here get the length
        //get an array of the child assets
        var recType = arrAsset[0].recordType;
        var recId = arrAsset[0].id;

        var assetChildSearch = search.create({
            type: recType,
            filters: [

                ['custrecord_bsg_asset_parent', 'anyof', recId]
            ],
            columns: ['custrecord_bsg_asset_item',
                'custrecord_bsg_asset_sell_price',
                'custrecord_bsg_asset_serial'
            ]
        });

        return assetChildSearch;
    }

    /*
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */

    function map(context) {
        // var searchResult = JSON.parse(context.value);
        var data = JSON.parse(context.value);
        // var recId = context.salesId;
        var serialNumber = data.values.custrecord_bsg_asset_serial;
        var itemId = data.values.custrecord_bsg_asset_item;      //var amt = searchResult.values.amount;
        //var quantity = searchResult.values.quantity;
        //var soId = searchResult.values['createdfrom.createdFrom']['value'];
        //var amt = parseFloat(amt / parseInt(quantity));
        // log.debug('data serial   ', serialNumber );
        //context.write({ key: context.key });
        //  log.debug('map context key = ' , context.key);

        context.write({ key: context.key, value: data });
        //write all these variables to the context for use in reduce.
    }

    /*
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
        // log.debug('reduce context  ', context);
        // log.debug('reduce contex.values  ', context.values);
        var arrContext = [];

        var contextValues = JSON.stringify(context.values);


        contextValues = contextValues.replace(/(\r\n\t|\n|\r\t)/gm, "");


        arrContext = JSON.parse(contextValues);
        // log.debug('arrContextparsed  ' , arrContext);
        // log.debug('arrContext parsed ' ,JSON.parse(arrContext));

        arrContext = JSON.parse(arrContext);

        var myLines = context.values.length;
        //log.debug('value serial ', context.values['custrecord_bsg_asset_serial']);
        var serialNumber = (arrContext.values.custrecord_bsg_asset_serial).toString();
        var searchRelatedItem = (arrContext.values.custrecord_bsg_asset_item.text).trim();
        var insertItemId = parseInt(arrContext.values.custrecord_bsg_asset_item.value);

        log.debug('Serial is  ', serialNumber);
        log.debug('Item is  ', searchRelatedItem);

        //here we need an item search to get the serial mathching serial number and item number 
        //



        var serialNumberSearch = search.create({
            type: record.Type.INVENTORY_NUMBER,
            filters: [

                ['inventorynumber', 'is', serialNumber, 'and', 'item', 'is', searchRelatedItem]
            ],
            columns: ['internalid']
        });

        var arrSerial = serialNumberSearch.run().getRange({ start: 0, end: 10 });

        var serialId = parseInt(arrSerial[0].getValue('internalid'));

        log.debug('internalid of the serial number to update ', serialId);


        var scriptObj = runtime.getCurrentScript();
        var soId = scriptObj.getParameter({ name: 'custscriptsoid' });

        //add the line to the sales order by editing it.
        var soRec = record.load({
            type: record.Type.SALES_ORDER,
            id: parseInt(soId),
            isDynamic: true

        });
        //  log.debug('opensalesorder ', soRec);
        var lineNum = soRec.selectNewLine({ sublistId: 'item' });

        soRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            value: parseInt(insertItemId)

        });
        soRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'price',
            value: -1

        });
        soRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            value: 1

        });
        soRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            value: 0

        });
        soRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'location',
            value: 1

        });

        var subrec = soRec.getCurrentSublistSubrecord({
            sublistId: 'item',
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
            fieldId: 'issueinventorynumber',
            value: parseInt(serialId)
        });


        // Save the line in the subrecord's sublist.

        subrec.commitLine({
            sublistId: 'inventoryassignment'
        });


        // Save the line in the record's sublist
        soRec.commitLine({ sublistId: 'item' });

        //here enter the inventory detail on the line



        soRec.save();
        //   var objRecord = record.transform({
        //	    fromType: record.Type.SALES_ORDER,
        //	    fromId: parseInt(soId),
        //	    toType: record.Type.ITEM_FULFILLMENT,
        //	    isDynamic: true,
        //	});


        //    objRecord.save();

        var invId = context.key;

    }
    function myNewIR(contextKEY, itemId) { }

    function getCorrectAmt(soid, itemsku) { }

    function updateIR(irID, sku, amt) { }

    /*
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        handleErrorIfAny(summary);
        createSummaryRecord(summary);
    }

    /*
 * Helper Function
 * @param {string} itemDisp condition of item being returned
 * @returns {bool} true or false based on if field is empty
 */
    function isEmpty(stValue) {
        if ((stValue == ' ') || (stValue == null) || (stValue == undefined)) {
            return true;
        }
        else {
            if (typeof stValue == 'string') {
                if ((stValue == '')) {
                    return true;
                }
            }
            else if (typeof stValue == 'array') {
                if (stValue.length == 0 || stValue.length == 'undefined') {
                    return true;
                }
            }
            else if (typeof stValue == 'object') {
                if (stValue == null) {
                    return true;
                }
                else {

                    for (var key in stValue) {
                        if (stValue.hasOwnProperty(key)) {
                            return false;
                        }
                    }

                    return true;
                }
            }

            return false;
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});
