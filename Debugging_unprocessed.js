var INT_GOVERNANCE_THRESHOLD = 500;

function udpateATG() {
    var arrFilters = [];
    var arrColumns = [];

    // arrColumns.push(new nlobjSearchColumn('internalid'));
    // arrColumns.push(new nlobjSearchColumn('custrecord_rtf_so_internalid'));
    // arrColumns.push(new nlobjSearchColumn('custrecord_so_text_id'));

   arrColumns.push(new nlobjSearchColumn('custrecord_csi_atg_setlmnt_order_id'));

    //arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_processed', null, 'is', 'T'));
    // arrFilters.push(new nlobjSearchFilter('custrecord_so_text_id', null, 'is', 'ORD286155667'));
    //arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_error_msg', null, 'isempty'));
    //search: function (stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
   var arrREQ = nlapiSearchRecord('salesorders', 'customsearch_rtf_del_salesorders', arrFilters, arrColumns);
   // var arrREQ = NSUtils.search('customrecord_csi_atg_settlement', 'customsearch_rtf_delete_atg', arrFilters, arrColumns);

    //var arrREQ = nlapiSearchRecord('customrecord_csi_atg_settlement', 'customsearchatg_not_proc_no_insuf', arrFilters, arrColumns);
    //for each row in the result set get the set the internal id of thd custom record with the running total of the budget

    for (var i = 0; i < arrREQ.length; i++) {
        //var soID = arrREQ[i].getId();
        var trantype = '';
        var atgID = arrREQ[i].getValue('custrecord_so_text_id');
        var salesOrderId = arrREQ[i].getId();
        var myInv = nlapiLoadRecord('salesorder', salesOrderId);
        //first delete payment
        var linkLines = myInv.getLineItemCount('links');
        for (var y = 1; y < linkLines; y++) {

            var tranType = myInv.getLineItemValue('links', 'type', y);
            switch (tranType) {
                case 'Payment': trantype = 'customerpayment'; break;
                case 'Item Receipt': trantype = 'itemreceipt'; break;
                case 'Item Fulfillment': trantype = 'itemfulfillment'; break;
                case 'Purchase Order': trantype = 'purchaseorder'; break;
                case 'Invoice': trantype = 'invoice'; break;
                case 'Return Authorization': trantype = 'returnauthorization'; break;
            }
            if (trantype != '') {
                nlapiDeleteRecord(trantype, myInv.getLineItemValue('links', 'id', y));
            }
        }


    }
}

function deletePayment() {

}

function deleteInvoice(invId) {
    var myInv = nlapiLoadRecord('invoice', invId);
    var linkLines = myInv.getLineItemCount('links');
    for (var y = 1; y < linkLines; y++) {

        var tranType = myInv.getLineItemValue('links', 'type', y);
        switch (tranType) {
            case 'Item Receipt': trantype = 'itemreceipt'; break;
            case 'Purchase Order': trantype = 'purchaseorder'; break;
            case 'Item Fulfillment': trantype = 'itemfulfillment'; break;
            case 'Payment': trantype = 'customerpayment'; break;
        }
        nlapiDeleteRecord(trantype, myInv.getLineItemValue('links', 'id', y));
    }

    nlapiDeleteRecord('invoice', invId);
  
}

function getATGId(soid) {
    // NSUtils.checkGovernance();
    var soInernalId = 0;
    var soFilters = [];
    var soColumns = [];
    soFilters.push(new nlobjSearchFilter('tranid', null, 'contains', soid));
    soFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));

    soColumns.push(new nlobjSearchColumn('status'));


    var recOpenATG = nlapiSearchRecord('salesorder', null, soFilters, soColumns);
    if (recOpenATG) {
        var soInernalId = recOpenATG[0].getValue('status');

    }
    return soInernalId;

}


function deletePurchaseOrder(poid){
    var myInv = nlapiLoadRecord('purchaseorder', poid);
    var linkLines = myInv.getLineItemCount('links');
    for (var y = 1; y < linkLines; y++) {

        var tranType = myInv.getLineItemValue('links', 'type', y);
        switch (tranType) {
            case 'Item Receipt': trantype = 'itemreceipt'; break;
            case 'Purchase Order': trantype = 'purchaseorder'; break;
            case 'Item Fulfillment': trantype = 'itemfulfillment'; break;
            case 'Payment': trantype = 'customerpayment'; break;
            case 'Item Receipt': trantype = 'itemreceipt'; break;
        }
        nlapiDeleteRecord(trantype, myInv.getLineItemValue('links', 'id', y));
    }

    nlapiDeleteRecord('purchaseorder', poid);
}
// arrFilters.push(new nlobjSearchFilter('custrecord_rename', null, 'is', "F"));
//  arrColumns.push(new nlobjSearchColumn('custrecord_tran_number').setSort(false));

//var arrREQ = nlapiSearchRecord('customrecord_rtf_temp', null, arrFilters, arrColumns);

//for each row in the result set get the set the internal id of thd custom record with the running total of the budget

//for (var i = 0; i < arrREQ.length; i++) {
// try {
//   nlapiDeleteRecord('customerpayment', //parseInt(arrREQ[i].getValue('custrecord_tran_number')));
//    nlapiDeleteRecord('customrecord_rtf_temp', arrREQ[i].getId());
// } catch (e) {
// }
// }



/*
arrFilters.push(new nlobjSearchFilter('custrecord_rename', null, 'is', "F"));
arrColumns.push(new nlobjSearchColumn('custrecord_temp_inv_id').setSort(false));
var arrREQ = nlapiSearchRecord('customrecord_temp_invoices', null, arrFilters, arrColumns);
//for each row in the result set get the set the internal id of thd custom record with the running total of the budget

for (var i = 0; i < arrREQ.length; i++) {
    //var myp = nlapiLoadRecord('customerpayment',arrREQ[i].getValue('custrecord_tranid'));
    try{
        //var soid=nlapiLookupField('invoice',arrREQ[i].getValue('custrecord_temp_inv_id'),'createdfrom');
        nlapiSubmitField('invoice', arrREQ[i].getValue('custrecord_temp_inv_id'), 'entity', 1287303);
        nlapiSubmitField('customrecord_temp_invoices', arrREQ[i].getId(), 'custrecord_rename', "T");
    } catch (e) {

    }
}
*/



// var arrREQ = nlapiSearchRecord('customrecord_rtf_temp', null, arrFilters, arrColumns);
//for each row in the result set get the set the internal id of thd custom record with the running total of the budget

//  for (var i = 0; i < arrREQ.length; i++) {
//     var myp = nlapiLoadRecord('customerpayment', arrREQ[i].getValue('custrecord_tranid'));
//     var apLineCt = myp.getLineItemCount('apply');
//     for (ap = 0; ap < apLineCt; ap++) {
//create a custom record with the invoice id 
//         var mytempInv = nlapiCreateRecord('customrecord_temp_invoices');
//         mytempInv.setFieldValue('custrecord_temp_inv_id', myp.getLineItemValue('apply', 'internalid', ap + 1));
//         nlapiSubmitRecord(mytempInv);
//         nlapiSubmitField('customrecord_rtf_temp', arrREQ[i].getId(), 'custrecord_inv_proc', 'T');

//}
//}





/*
    var batch1 = 'SETTLEMSinglePayment-Payment CC-No (2)ENTS'
    var arrFilters = [];


    arrFilters.push(new nlobjSearchFilter('custrecord_rtf_upload_bin', null, 'is', batch1));
    arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_processed', null, 'is', "F"));
    arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_error_msg', null, 'isempty'));
    //arrFilters.push(new nlobjSearchFilter('internalid', null, 'is', 480470));

    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('custrecord_csi_atg_setlmnt_order_id', null, null));
    // arrColumns.push(new nlobjSearchColumn('internalid', null, null));


    var unProc = nlapiSearchRecord('customrecord_csi_atg_settlement', null, arrFilters, arrColumns);
    if (unProc) {
        var uncount = unProc.length;
        var myStat1 = "not found"
        for (var x = 0; x < uncount; x++) {

            var interoItm = unProc[x].getValue('custrecord_csi_atg_setlmnt_order_id');
            var atgId = unProc[x].getId();
            myStat1 = getSO(interoItm);
            if (myStat1 == 'fullyBilled') {
                nlapiSubmitField('customrecord_csi_atg_settlement', atgId, 'custrecord_csi_atg_setlmnt_processed', "T");
                 }
            //else if (myStat1=='NotFound'){
            //    nlapiSubmitField('customrecord_csi_atg_settlement', atgId, 'custrecord_csi_atg_setlmnt_error_msg', "Sales order not Found");
           // }
        }
        */


function getSO(soid) {
    NSUtils.checkGovernance();
    var myStatus = "NotFound";
    var soFilters = [];
    var soColumns = [];
    soFilters.push(new nlobjSearchFilter('tranid', null, 'anyof', soid));
    soFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));

   // soColumns.push(new nlobjSearchColumn('statusRef', null, null));

    var recOpenATG = nlapiSearchRecord('salesorder', null, soFilters, soColumns);

    // if line lumber is one delete delete the sales order 
    //if you find a record
    if (recOpenATG) {
        
        var soId = recOpenATG[0].getId();

    }
    return soId;
}




/*get so by shipgroup and linnum
function getSO(soid, shipGroup, linNum) {
    NSUtils.checkGovernance();
    var myStatus = "NotFound";
    var soFilters = [];
    var soColumns = [];
    soFilters.push(new nlobjSearchFilter('tranid', null, 'is', soid));
    soFilters.push(new nlobjSearchFilter('mainline', null, 'is', "T"));

    var recOpenATG = nlapiSearchRecord('salesorder', null, soFilters, null);

    // if line lumber is one delete delete the sales order 
    //if you find a record
    if (recOpenATG) {
        if (linNum == 1) {
            try {
                nlapiDeleteRecord('salesorder', recOpenATG[0].getId());
            } catch (e) {
                return false;
            }

            return false;
        }
        else if (linNum > 1) {
            var soInernalId = recOpenATG[0].getId();
            var myOrd = nlapiLoadRecord('salesorder', soInernalId);
            var linCnt = myOrd.getLineItemCount('item');
            //loop Through the lines and take out the line.
            for (var x = 1; x <= linCnt; x++) {
                //nlapiLogExecution('DEBUG', 'processing :', soid + ' shipgroup ' + shipGroup);

                soShipGroup = myOrd.getLineItemValue('item', 'custcol_si_shipping_group', x);
                soLinNum = myOrd.getLineItemValue('item', 'line', x);
                soQty = myOrd.getLineItemValue('item', 'quantity', x);
                if (soShipGroup == shipGroup && soLinNum == linNum && soQty == 0) {
                    try {
                        nlapiLogExecution('DEBUG', 'processing :', soid + ' shipgroup ' + shipGroup);
                        myOrd.removeLineItem('item', x);
                    } catch (e) {
                        continue;
                    }

                    //  myOrd.commitLine('item');
                }
            }
            nlapiSubmitRecord(myOrd);
        }
        return myStatus;
    }
}
*/

/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * Compilation of utility functions that utilizes SuiteScript API
 * 
 */

var NSUtils =
{
    /**
	 * Get all of the results from the search even if the results are more than 1000. 
	 * @param {String} stRecordType - the record type where the search will be executed.
	 * @param {String} stSearchId - the search id of the saved search that will be used.
	 * @param {Array} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
	 * @param {Array} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
	 * @returns {Array} - an array of nlobjSearchResult objects
	 * @author memeremilla - initial version
	 * @author gmanarang - used concat when combining the search result
	 */
    search: function (stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
        var arrReturnSearchResults = new Array();
        var nlobjSavedSearch;

        if (stSearchId != null) {
            nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

            // add search filter if one is passed
            if (arrSearchFilter != null) {
                nlobjSavedSearch.addFilters(arrSearchFilter);
            }

            // add search column if one is passed
            if (arrSearchColumn != null) {
                nlobjSavedSearch.addColumns(arrSearchColumn);
            }
        }
        else {
            nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
        }

        var nlobjResultset = nlobjSavedSearch.runSearch();
        var intSearchIndex = 0;
        var nlobjResultSlice = null;
        do {
            if ((nlapiGetContext().getExecutionContext() === 'scheduled')) {
                try {
                    this.rescheduleScript(1000);
                }
                catch (e)
                { }
            }

            nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
            if (!(nlobjResultSlice)) {
                break;
            }

            arrReturnSearchResults = arrReturnSearchResults.concat(nlobjResultSlice);
            intSearchIndex = arrReturnSearchResults.length;
        }

        while (nlobjResultSlice.length >= 1000);

        return arrReturnSearchResults;
    },

    /**  
	 * Checks governance then calls yield (mcabading 05272016 - modified)
	 * @param 	{Integer} myGovernanceThreshold 	 * 
	 * @returns {Void} 
	 * @author memeremilla
	 */
    checkGovernance: function () {
        var context = nlapiGetContext();

        if (context.getRemainingUsage() < INT_GOVERNANCE_THRESHOLD) {

            var state = nlapiYieldScript();
            if (state.status == 'FAILURE') {
                nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size);
                throw "Failed to yield script";
            }
            else if (state.status == 'RESUME') {
                nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason + ".  Size = " + state.size);
            }
        }
    }
};

/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * Compilation of common utility functions used for:
 * - Parsing objects
 */
var Parse =
{
    /**
	 * Converts string to integer. If value is infinity or can't be converted to a number, 0 will be returned.
	 * @param {String} stValue - any string
	 * @returns {Number} - an integer
	 * @author jsalcedo
	 */
    forceInt: function (stValue) {
        var intValue = parseInt(stValue);

        if (isNaN(intValue) || (stValue == Infinity)) {
            return 0;
        }

        return intValue;
    },
};


