debuggerME();


function debuggerME() {
    var stLoggerTitle = 'afterSubmit_createReverseJournalEntry';
    var funcMisc = new misc();
    var context = nlapiGetContext();
    var intRecordId = 3377327;//nlapiGetRecordId();

    var credit_if_fulfilled = 215;//context.getSetting('SCRIPT', 'custscript_dwr_credit_if_fulfilled_2');
    var credit_if_not_fulfilled = 315;//context.getSetting('SCRIPT', 'custscript_dwr_credit_if_not_fulfilled_2');
    var debit = 124;//COGS context.getSetting('SCRIPT', 'custscript_dwr_debit_ir_2');

    try {

       

    var recItemRecript = nlapiLoadRecord('itemreceipt', intRecordId);
    // var stCreatedFrom = recItemRecript.getFieldValue('createdfrom');
    var intCreatedFrom = recItemRecript.getFieldValue('createdfrom');
    var stDepartment = recItemRecript.getFieldValue('department');

    nlapiLogExecution('DEBUG', stLoggerTitle, 'intRecordId: ' + intRecordId
            + '; intCreatedFrom: ' + intCreatedFrom + '; stDepartment: '
            + stDepartment);

    if (funcMisc.isEmpty(intCreatedFrom)) {
        nlapiLogExecution('DEBUG', stLoggerTitle, '>> End Script Execution: Item receipt is standalone <<');
        return true;
    }

    var stCreatedFromType = nlapiLookupField('transaction', intCreatedFrom, 'recordtype');

    nlapiLogExecution('DEBUG', stLoggerTitle, 'stCreatedFromType: ' + stCreatedFromType);

    // if (stCreatedFrom.indexOf('Return Authorization') == -1)
    if (stCreatedFromType != 'returnauthorization') {
        nlapiLogExecution('DEBUG', stLoggerTitle, '>> End Script Execution: Item receipt is not created from RMA. <<');
        return;
    }

    var recReturnAuthorization = nlapiLoadRecord('returnauthorization', intCreatedFrom);
    // var stRACreatedFrom =
    // recReturnAuthorization.getFieldText('createdfrom');
    var intRACreatedFrom = recReturnAuthorization.getFieldValue('createdfrom');
    var stTranid = recReturnAuthorization.getFieldValue('tranid');
    var intExchangeOrder = 3382953; //hard coding mine as ther are many  recReturnAuthorization.getFieldValue('custbody_dwr_created_from_ra');
    var intRAItemCount = recReturnAuthorization.getLineItemCount('item');
    var intIRItemCount = parseInt(recItemRecript.getLineItemCount('item'));

    nlapiLogExecution('DEBUG', stLoggerTitle, 'intRACreatedFrom: '
            + intRACreatedFrom + '; intRAItemCount: ' + intRAItemCount
            + ', intIRItemCount: ' + intIRItemCount);

    if (funcMisc.isEmpty(intRACreatedFrom)) {
        nlapiLogExecution('DEBUG', stLoggerTitle,
                '>> End Script Execution: RMA is standalone <<');
        return;
    }

    // Check for exchange order
    if (funcMisc.isEmpty(intExchangeOrder)) {
        nlapiLogExecution('DEBUG', stLoggerTitle,
                '>> End Script Execution: Exchange Order is not yet created. <<');
        return;
    }

    // var bolItemIsFulfilled = true;
    var recSalesOrder = nlapiLoadRecord('salesorder', intExchangeOrder);
    var stOrderTranId = recSalesOrder.getFieldValue('tranid');
    var intItemCount = parseInt(recSalesOrder.getLineItemCount('item'));

    /***********************************************************************
     * 
     * 
     * @Gil: Removed exit of script when some or all items are not fulfilled
     *       for exchange order
     * 
     * 
     * nlapiLogExecution('DEBUG', stLoggerTitle, 'bolItemIsFulfilled: ' +
     * bolItemIsFulfilled + '; intItemCount: ' + intItemCount); // Loop
     * through item for (var intItemCtr = 1; intItemCtr <= intItemCount;
     * intItemCtr++) { var bolFulfilled =
     * recSalesOrder.getLineItemValue('item', 'itemisfulfilled',
     * intItemCtr);
     * 
     * if (bolFulfilled == 'F') { bolItemIsFulfilled = false; break; } }
     * 
     * nlapiLogExecution('DEBUG', stLoggerTitle, 'bolItemIsFulfilled: ' +
     * bolItemIsFulfilled);
     * 
     * if (!bolItemIsFulfilled) { nlapiLogExecution('DEBUG', stLoggerTitle,
     * '>> End Script Execution: All items are not yet fulfilled. <<');
     * return; }
     * 
     **********************************************************************/

    // Create Reverse Journal Entry
  //  var recJournalEntry = nlapiCreateRecord('journalentry');
 //   recJournalEntry.setFieldValue('custbody_dwr_comment', 'RA Automation '+ stTranid + ', Exchange Order ' + stOrderTranId);
    // recJournalEntry.setFieldValue('custbody_dwr_item_fulfillment',
    // script_variables.itemFulfillmentNumber);

    var flAveCostTotal = 0.0;
    var flAveCostCredit_if_Fulfilled = 0.0;
    var flAveCostCredit_if_not_Fulfilled = 0.0;

    // Loop throug RA item
    for (var intIRItemCtr = 1; intIRItemCtr <= intIRItemCount; intIRItemCtr++) {

        var cbItemReceive = recItemRecript.getLineItemValue('item', 'itemreceive', intIRItemCtr);

        if (cbItemReceive == 'F') {
            var stItemName = recItemRecript.getLineItemValue('item', 'item', intIRItemCtr);
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Item ' + stItemName+ ' is not processed for JE creation');
            continue;
        }

        var iIROrderLine =recItemRecript.getLineItemValue('item', 'orderline',intIRItemCtr);
        var iRALineIndex = recReturnAuthorization.findLineItemValue('item','line', iIROrderLine);

        if (iRALineIndex < 1) {
            nlapiLogExecution('DEBUG', stLoggerTitle,
                    'Item being fulfilled cannot be found in Sales Order. Review script logic');
            continue;
        }

        var iRAPreviousQuantityReceived = recReturnAuthorization.getLineItemValue('item', 'quantityreceived', iRALineIndex);

        var iItemReceiptQuantity =recItemRecript.getLineItemValue('item', 'quantity', intIRItemCtr);

        //rf
        var soQty = recSalesOrder.getLineItemValue('item', 'quantity', iRALineIndex);

        var flItemAveCost = recSalesOrder.getLineItemValue('item', 'custcol_dwr_average_cost_for_exchange', iRALineIndex);

        var iESOFulfilledItemsQuantity = recSalesOrder.getLineItemValue('item', 'quantityfulfilled', iRALineIndex);
        //rf
        var soUnfilfilled = parseInt(soQty) - parseInt(iESOFulfilledItemsQuantity);

        iRAPreviousQuantityReceived = +funcMisc.forceParseInt(iRAPreviousQuantityReceived);
        iItemReceiptQuantity = +funcMisc.forceParseInt(iItemReceiptQuantity);
        flItemAveCost = +funcMisc.forceParseFloat(flItemAveCost).toFixed(2);
        iESOFulfilledItemsQuantity = +funcMisc.forceParseInt(iESOFulfilledItemsQuantity);

        //If If the receipt quantity =1 and the fulfilled quantity = 1 then I need to offset the JE created 
        //by the fullfillment.
        //so if the soUnfulfilled = 0 then create teh offset debit cogs and credit 1238
        //if fullfilled then offsest the amount already fulfilled.

        if (iESOFulfilledItemsQuantity > 0) {
            //fulfilled item offset
            createOffsetJE(iESOFulfilledItemsQuantity, flItemAveCost, stDepartment, debit, credit_if_not_fulfilled);
        }

        if (iESOFulfilledItemsQuantity <= 0) {
            //receitp of non fulfilled 
            receivedNotFullfilled(soUnfilfilled, flItemAveCost, stDepartment, debit, credit_if_fulfilled);
        }



        iRAPreviousQuantityReceived = iRAPreviousQuantityReceived - iItemReceiptQuantity;

        nlapiLogExecution('DEBUG', stLoggerTitle,'iRAPreviousQuantityReceived: '
                        + iRAPreviousQuantityReceived
                        + ', iItemReceiptQuantity: ' + iItemReceiptQuantity
                        + ', flItemAveCost:' + flItemAveCost
                        + ', iESOFulfilledItemsQuantity: '
                        + iESOFulfilledItemsQuantity);

        // if returned quantity of RMA is greater than or equals to
        // items fulfilled
        if (iRAPreviousQuantityReceived >= iESOFulfilledItemsQuantity) {
            // Credit unfulfilled items
            flAveCostCredit_if_not_Fulfilled = flAveCostCredit_if_not_Fulfilled + (iItemReceiptQuantity * flItemAveCost);
        }
            // If items fulfilled is greater than returned quantity
        else {
            // If items fulfilled minus returned quantity is greater than or
            // equal to currently received items
            if ((iESOFulfilledItemsQuantity - iRAPreviousQuantityReceived) >= iItemReceiptQuantity) {
                // Credit fulfilled quantity
                flAveCostCredit_if_Fulfilled = flAveCostCredit_if_Fulfilled + (iItemReceiptQuantity * flItemAveCost);
            }
                // If currently received items greater than items fulfilled
                // quantity minus returned quantity
            else {
                var flFulfilledAmount = (iESOFulfilledItemsQuantity - iRAPreviousQuantityReceived)* flItemAveCost;
                var flUnfulfilledAmount = (iItemReceiptQuantity - (iESOFulfilledItemsQuantity - iRAPreviousQuantityReceived))* flItemAveCost;

                // credit fulfilled quantity
                // credit unfulfilled quantity
                var flAveCostCredit_if_Fulfilled = flAveCostCredit_if_Fulfilled+ flFulfilledAmount;
                var flAveCostCredit_if_not_Fulfilled = flAveCostCredit_if_not_Fulfilled+ flUnfulfilledAmount;
            }
        }

        flAveCostTotal = flAveCostTotal+ (iItemReceiptQuantity * flItemAveCost);

        // var flRAAmount =
        // recReturnAuthorization.getLineItemValue('item',
        // 'amount', intRAItemCtr);

        // var flItemAveCost = recSalesOrder.getLineItemValue('item',
        // 'averagecost', intRAItemCtr);
        // var iItemQuantity = recSalesOrder.getLineItemValue('item',
        // 'quantity', intRAItemCtr);
        // var flItemCost;
        // var isItemFulfilled = recSalesOrder.getLineItemValue('item',
        // 'itemisfulfilled', intRAItemCtr);
        //
        // flItemAveCost = +funcMisc.forceParseFloat(flItemAveCost);
        // iItemQuantity = +funcMisc.forceParseInt(iItemQuantity);
        // flItemCost = flItemAveCost * iItemQuantity;
        // flAveCostTotal = flAveCostTotal + flItemCost;
        //
        // if (isItemFulfilled == 'T')
        // {
        // flAveCostCredit_if_Fulfilled = flAveCostCredit_if_Fulfilled
        // + flItemCost;
        // } else
        // {
        // flAveCostCredit_if_not_Fulfilled = flAveCostCredit_if_Fulfilled
        // + flItemCost;
        // }

    }
/*
    if (flAveCostCredit_if_Fulfilled > 0) {

        // Credit Fulfilled Items
        recJournalEntry.selectNewLineItem('line');
        recJournalEntry.setCurrentLineItemValue('line', 'account',credit_if_fulfilled);
        // recJournalEntry.setCurrentLineItemValue('line', 'credit',
        // flRAAmount);
        recJournalEntry.setCurrentLineItemValue('line', 'credit',flAveCostCredit_if_Fulfilled.toFixed(2));
        recJournalEntry.setCurrentLineItemValue('line', 'department',stDepartment);
        recJournalEntry.commitLineItem('line');

        nlapiLogExecution('DEBUG', stLoggerTitle, '[CREDIT] credit: '
                + credit_if_fulfilled + '; flAveCostCredit_if_Fulfilled: '
                + flAveCostCredit_if_Fulfilled + '; stDepartment: '
                + stDepartment);
    }

    if (flAveCostCredit_if_not_Fulfilled > 0) {

        // Credit Fulfilled Items
        recJournalEntry.selectNewLineItem('line');
        recJournalEntry.setCurrentLineItemValue('line', 'account',credit_if_not_fulfilled);
        // recJournalEntry.setCurrentLineItemValue('line', 'credit',
        // flRAAmount);
        recJournalEntry.setCurrentLineItemValue('line', 'credit',flAveCostCredit_if_not_Fulfilled.toFixed(2));
        recJournalEntry.setCurrentLineItemValue('line', 'department',stDepartment);
        recJournalEntry.commitLineItem('line');

        nlapiLogExecution('DEBUG', stLoggerTitle, '[CREDIT] credit: '
                + credit_if_not_fulfilled
                + '; flAveCostCredit_if_not_Fulfilled: '
                + flAveCostCredit_if_not_Fulfilled + '; stDepartment: '
                + stDepartment);
    }

    // Debit
    recJournalEntry.selectNewLineItem('line');
    recJournalEntry.setCurrentLineItemValue('line', 'account', debit);
    // recJournalEntry.setCurrentLineItemValue('line', 'debit',
    // flRAAmount);
    recJournalEntry.setCurrentLineItemValue('line', 'debit', flAveCostTotal.toFixed(2));
    recJournalEntry.setCurrentLineItemValue('line', 'department',stDepartment);
    recJournalEntry.commitLineItem('line');

    nlapiLogExecution('DEBUG', stLoggerTitle, '[DEBIT] debit: ' + debit
            + '; flAveCost: ' + flAveCostTotal + '; stDepartment: '
            + stDepartment);

 //   var intJournalId = nlapiSubmitRecord(recJournalEntry);
  //  nlapiLogExecution('DEBUG', stLoggerTitle, 'Created Journal Entry: '+ intJournalId);

   // nlapiLogExecution('DEBUG', stLoggerTitle, '>> End Script Execution <<');
   */
    } catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error: ' + stLoggerTitle, error
                    .getCode()
                    + ': ' + error.getDetails());
            throw error;
        } else {
            nlapiLogExecution('ERROR', 'Unexpected Error: ' + stLoggerTitle,
                    error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }

}


function createOffsetJE(quantity, avgCost, stDepartment, debit, credit_if_not_fulfilled) {

    var amt = parseFloat(quantity) * parseFloat(avgCost).toFixed(2);
    var rf = nlapiCreateRecord('journalentry');
      rf.setFieldValue('custbody_dwr_comment', 'RA Automation ');

    // Credit Fulfilled Items
            rf.selectNewLineItem('line');
            rf.setCurrentLineItemValue('line', 'account', debit);
            // recJournalEntry.setCurrentLineItemValue('line', 'credit',
            // flRAAmount);
            rf.setCurrentLineItemValue('line', 'debit', amt);
            rf.setCurrentLineItemValue('line', 'department',stDepartment);
            rf.commitLineItem('line');

         //   nlapiLogExecution('DEBUG', stLoggerTitle, '[CREDIT] credit: '
        //            + credit_if_not_fulfilled
          //          + '; flAveCostCredit_if_not_Fulfilled: '
          //          + flAveCostCredit_if_not_Fulfilled + '; stDepartment: '
          //          + stDepartment);
        

    // Debit
        rf.selectNewLineItem('line');
        rf.setCurrentLineItemValue('line', 'account', credit_if_not_fulfilled);
        // recJournalEntry.setCurrentLineItemValue('line', 'debit',
        // flRAAmount);
        rf.setCurrentLineItemValue('line', 'credit', amt);
        rf.setCurrentLineItemValue('line', 'department',stDepartment);
        rf.commitLineItem('line');

    //    nlapiLogExecution('DEBUG', stLoggerTitle, '[DEBIT] debit: ' + debit
         //       + '; flAveCost: ' + flAveCostTotal + '; stDepartment: '
         //       + stDepartment);

        var intJournalId = nlapiSubmitRecord(rf);
     //   nlapiLogExecution('DEBUG', stLoggerTitle, 'Created Journal Entry: '+ intJournalId);


}

function receivedNotFullfilled(quantity, avgCost, stDepartment, debit, credit_if_fulfilled) {

    var amt = parseFloat(quantity) * parseFloat(avgCost).toFixed(2);
    var rf1 = nlapiCreateRecord('journalentry');
    rf1.setFieldValue('custbody_dwr_comment', 'RA Automation ');

    // Credit Fulfilled Items
    rf1.selectNewLineItem('line');
    rf1.setCurrentLineItemValue('line', 'account', debit);
    // recJournalEntry.setCurrentLineItemValue('line', 'credit',
    // flRAAmount);
    rf1.setCurrentLineItemValue('line', 'debit', amt);
    rf1.setCurrentLineItemValue('line', 'department', stDepartment);
    rf1.commitLineItem('line');

    //   nlapiLogExecution('DEBUG', stLoggerTitle, '[CREDIT] credit: '
    //            + credit_if_not_fulfilled
    //          + '; flAveCostCredit_if_not_Fulfilled: '
    //          + flAveCostCredit_if_not_Fulfilled + '; stDepartment: '
    //          + stDepartment);


    // Debit
    rf1.selectNewLineItem('line');
    rf1.setCurrentLineItemValue('line', 'account', credit_if_fulfilled);
    // recJournalEntry.setCurrentLineItemValue('line', 'debit',
    // flRAAmount);
    rf1.setCurrentLineItemValue('line', 'credit', amt);
    rf1.setCurrentLineItemValue('line', 'department', stDepartment);
    rf1.commitLineItem('line');

    //    nlapiLogExecution('DEBUG', stLoggerTitle, '[DEBIT] debit: ' + debit
    //       + '; flAveCost: ' + flAveCostTotal + '; stDepartment: '
    //       + stDepartment);

    var intJournalId = nlapiSubmitRecord(rf1);
   // nlapiLogExecution('DEBUG', stLoggerTitle, 'Created Journal Entry: ' + intJournalId);


}



function misc() {

    this.isEmpty = function (stValue) {

        if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
            return true;
        }

        return false;
    }

    this.forceParseFloat = function (stValue) {
        var flValue = parseFloat(stValue);

        if (isNaN(flValue)) {
            return 0.00;
        }

        return flValue;
    }

    this.forceParseInt = function (stValue) {
        var iValue = parseInt(stValue);

        if (isNaN(iValue)) {
            return 0;
        }

        return iValue;
    }

}