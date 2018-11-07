var stFromDate = '01/01/2014';
var stToDate = '01/01/2017';


var arrFilters = [];
arrFilters.push(new nlobjSearchFilter('trandate', null, 'within', [stFromDate, stToDate]));
//arrFilters.push(new nlobjSearchFilter('location', null, 'anyof', stLocation));
//arrFilters.push(new nlobjSearchFilter('type', 'item', 'anyof', 'InvtPart'));
//arrFilters.push(new nlobjSearchFilter('type', null, 'anyof', SEARCHFILTER_INVOICE));

var arrColumns = [];
//arrColumns.push(new nlobjSearchColumn('item', null, 'group').setSort());
//arrColumns.push(new nlobjSearchColumn('quantity', null, 'sum'));

//nlapiLogExecution('DEBUG', 'search Criteria', 'Start date ' + stFromDate + 'endDate ' + stToDate);
//nlapiLogExecution('DEBUG', 'search Criteria', 'location  ' + stLocation + 'tranType  ' + SEARCHFILTER_INVOICE);
var arrProjected = [{ 'accounttype': 'ProjectedCF' }];
    
var arrBank = nlapiSearchRecord('transaction', 'customsearch85', arrFilters, arrColumns);
var arrTransactions = nlapiSearchRecord('transaction', 'customsearch83', arrFilters, arrColumns);
var payables = nlapiSearchRecord('transaction', 'customsearch84', arrFilters, arrColumns);
var arrNet =nlapiSearchRecord('transaction', 'customsearch87', arrFilters, arrColumns);
 
arrBank=arrBank.concat(arrTransactions);
arrBank=arrBank.concat(payables); 
arrBank=arrBank.concat(arrNet);
if (arrBank) {
    //assign values to line fields
    for (var i = 0; i < arrBank.length; i++) {
        //nlapiLogExecution('DEBUG', LOG_TITLE, 'Item: ' + arrBank[i]);

        //sl_items.setLineItemValue('custpage_chkbox', (i + 1), 'F');
        if (!isEmpty(arrBank[i].getText('accounttype', null, 'group'))) {
            var myTest = arrBank[i].getText('accounttype', null, 'group');
        }
        else {
            myTest = arrBank[i].getValue('formulatext', null, 'group');
        }
        //next get  alist of columns loop through the colums an of the result set and 
        //put them on the grid.
        var cols = arrBank[i].getAllColumns();
        for (var c = 0; c < cols.length; c++) {
            var colab = cols[c].label;
            switch (colab) {
                case 'ww1': //label: PaymentAmountLeft
                    //sl_items.setLineItemValue('custpage_thisweek', (i + 1), arrBank[i].getValue(cols[c]));
                    break;
                case 'ww2':
                    //  sl_items.setLineItemValue('custpage_nextweek', (i + 1), arrBank[i].getValue(cols[c]));
                    break;
            }
        }
			
    }
}

//var cols = arrTransactions.getColumns()

var stop = '';

function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}