/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       4 Oct 2015     rfulling
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
   To do here let us try and look up the item.  If it needs a license then see if the Customer has the same license if no then do not sell 
   If we go item by item then there is no need to compare arrays just look for each individual license.
 * @returns {Void}
 */


function testFieldChange(type, name, linenum) {
    //Now this routing should return just check for licenses it will 
    //be incorporated with the last item sold script
    if (name == 'item' && type == 'item') {
        var hasCustlic = false;
        var licNeeded = [];
        var needsLic = false;
        // this should not run on matrix items added from the suitlet the itme is null when this happens
        //run next returns true if the item needs a license and it is on the customer license and is valid.

        //This will return a list of the item master primary keys for this itme
        needsLic = itemLicense(nlapiGetCurrentLineItemValue(type, name));
        if (needsLic) {
            for (res in needsLic) {
                licNeeded[res] = needsLic[res].getValue('custrecord_lcb_item_lic_master');
            }
        } else {
            return false;

        }
       //pass the list it item license primary keys to the customer license table
        //if items are found in the license master check the customer liceses for 
        //those internal ids
        if (licNeeded.length > 0) {
            var customerLicenses = custLicenses(nlapiGetFieldValue('entity'), licNeeded);
        }
        //Here if the query returned a list of licenses I should not need state because i'm using the 
        //internal id of the master
        if (customerLicenses) {
            hasCustlic = true;
        }
        if (hasCustlic == false) {
            nlapiCancelLineItem('item');
            alert('Customer does not have active license for this item ');
            return false;
        }
    }
}

function itemLicense(itemid) {
    var arrFilters = [];
    var aSearchColumns = [];
    arrFilters.push(new nlobjSearchFilter('custrecord_lcb_lic_item', null, 'is', itemid));
    aSearchColumns.push(new nlobjSearchColumn('custrecord_lcb_item_lic_master'));

    // arrFilters.push(new nlobjSearchFilter('custrecord_lcb_lic_item', null, 'is', shipstate));
    var arrFoundLic = nlapiSearchRecord('customrecord_lcb_lic_items', null, arrFilters, aSearchColumns);
    //This will return a list of items that require licenses
    //We could send the array of internal ids in a search of teh  Customer license record to see if the customer has the lic.

    if (arrFoundLic) {
        nlapiLogExecution('DEBUG', 'Item Needs License', 'ITEM =' + ': ' + 'length' + " : " + arrFoundLic.length);
        return arrFoundLic;
    } else {
        return false;
    }
}

function custLicenses(customerId, items) {
    var arrFilters = [];
    var aSearchColumns = [];
    arrFilters.push(new nlobjSearchFilter('custrecord_lcb_lic_customer_master', null, 'anyof', items));
    arrFilters.push(new nlobjSearchFilter('custrecord_lcb_lic_customer', null, 'is', customerId));
    arrFilters.push(new nlobjSearchFilter('custrecord_lcb_cust_lic_ex_date', null, 'onorafter', nlapiDateToString(new Date(), 'date')));

    aSearchColumns.push(new nlobjSearchColumn('custrecord_lcb_lic_customer_master'));
    aSearchColumns.push(new nlobjSearchColumn('custrecord_lcb_lic_customer'));

    // arrFilters.push(new nlobjSearchFilter('custrecord_lcb_lic_item', null, 'is', shipstate));
    var arrCustLic = nlapiSearchRecord('customrecord_lcb_lic_customer', null, arrFilters, aSearchColumns);
    //This will return a list of items that require licenses
    //We could send the array of internal ids in a search of teh  Customer license record to see if the customer has the lic.

    if (arrCustLic) {
        nlapiLogExecution('DEBUG', 'Item Needs License', 'ITEM =' + ': ' + 'length' + " : " + arrCustLic.length);
        return arrCustLic;
    } else {
        return false;
    }

}