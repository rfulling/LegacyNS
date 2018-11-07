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
*/

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       5 Oct 2015     rfulling          close requisitions on cash sale(storeroom inventory)
 *
 */

/**
 * @returns {Void} Any or no return value*/
function closeRequisition() {
    var requisitionNumber = nlapiGetFieldValue('custbody_bju_requisition_number')
    
    if (requisitionNumber) {
        var METHOD_NAME = 'close Requisition';
        
        // get the internal id of the requisition
        var reqInternal = getReqID(requisitionNumber)

        var requisition = nlapiLoadRecord('purchaserequisition', reqInternal);

        nlapiLogExecution('DEBUG', METHOD_NAME, ' - Entry - ');
        requisition.setFieldValue('approvalstatus', 2);

        for (var index = 1; index <= requisition.getLineItemCount('item') ; index++) {
            requisition.setLineItemValue('item', 'isclosed', index, 'T');
        }
        nlapiSubmitRecord(requisition);
    }
}

function getReqID(reqNumber) {
    var arrFilters = [];
    var arrColumns = [];

    arrFilters.push(new nlobjSearchFilter('recordType', null, 'is', 'purchaserequisition'));
    arrFilters.push(new nlobjSearchFilter('tranid', null, 'is', reqNumber));
    arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
    //arrFilters.push(new nlobjSearchFilter('accounttype', null, 'is', 'income'));

    //if (stItemId) arrFilters.push(new nlobjSearchFilter('internalid', 'item', 'is', stItemId));
    arrColumns.push(new nlobjSearchColumn('internalid'));
    //arrColumns.push(new nlobjSearchColumn('custbody_bju_requisition_number'));

    var arrREQ = nlapiSearchRecord('transaction', null, arrFilters, arrColumns);
    var myId = arrREQ[0].getId();
    return myId;
}
