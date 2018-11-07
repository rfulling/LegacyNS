// JavaScript source code
/**
 * Copyright (c) 1998-2015 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       20 Jan 2015     jburgos         
 * 2.00       23 Mar 2015     jburgos          Modified the whole script
 */


function beforeSubmit_otherCharges(type) {
    nlapiLogExecution('DEBUG', 'Context ', CONTEXT.getExecutionContext());
    //RF to run on ui Only


    if (type == 'create' || type == 'edit') {
        //before adding other charges update the last price sold
        //get the customer id,
        var custId = nlapiGetFieldValue('entity');
        var intLineCount = nlapiGetLineItemCount('item');
        var stToDate = nlapiGetFieldValue('trandate');
        //Go through each line and check the last price
        //if found update the line
        //if not create a new line on the custom record.
        for (var intLineCtr = 1; intLineCtr <= intLineCount; intLineCtr++) {
            var itemId = nlapiGetLineItemValue('item', 'item', intLineCtr);
            stLineItemType = nlapiLookupField('item', itemId, 'type');
            var itemP = nlapiGetLineItemValue('item', 'rate', intLineCtr);
            if ((stLineItemType == 'Assembly' || stLineItemType == 'InvtPart' || stLineItemType == 'NonInvtPart')) {
                //execute the searh function
                updateAddItemLastPrice(custId, itemId, stToDate, itemP);
            }
        }


    }
}