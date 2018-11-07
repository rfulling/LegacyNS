/**
 * Module Description
 * This script will be used to populate the time sheets
 * with the weighted average of the revenue allocated to the project
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Jan 2016     rfulling         Search to get the intercom company based on 
 *                                             performing subsidary, intercompany client and currency
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */

getIntercoInvoiceReqs();


function getIntercoInvoiceReqs() {
    var perFormingSub = 10;
    var interCoVendor = 1;
    var currendId =1;
    var amt = 1238.05;
    var amtLocal = 1206.13;
    var arrFilters = [];

    var arrColumns = [];
    arrFilters.push(new nlobjSearchFilter('subsidiary',null, 'is', perFormingSub));
    arrFilters.push(new nlobjSearchFilter('category', null, 'is', interCoVendor));
    arrFilters.push(new nlobjSearchFilter('currency', null, 'is', currendId));

    arrColumns.push(new nlobjSearchColumn('internalid', null, null));
    arrColumns.push(new nlobjSearchColumn('internalid', null, null));


    var interCoCust = nlapiSearchRecord('customer', null, arrFilters, arrColumns);
    var interCoCustmerid = interCoCust[0].getId();
    var stop = '';

    var recCustomer = nlapiLoadRecord('customer', interCoCustmerid);
  
    //var pLines = recCustomer.getLineItemCount('itempricing');
    for (var x = 1; x <= recCustomer.getLineItemCount('itempricing') ; x++) {
         var interoItm = recCustomer.getLineItemValue('itempricing', 'item', 1)
            break;
        }
    var stop1 = '';

    createICInvoice(interCoCustmerid, interoItm, amt);
}

function createICInvoice(companyid, itemnumber,amt) {
    var myInv = nlapiCreateRecord('invoice', { entity: companyid });

    myInv.selectNewLineItem('item');
    myInv.setCurrentLineItemValue('item', 'item', itemnumber);
    myInv.setCurrentLineItemValue('item', 'amount', amt);
    myInv.setCurrentLineItemValue('itme', 'quantity', 1);
    myInv.setCurrentLineItemValue('item', 'price', -1);
    myInv.commitLineItem('item');

    nlapiSubmitRecord(myInv);

}

function crateFXJE(sub, amtInv, amtLocal) {

}